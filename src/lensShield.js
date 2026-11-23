/**
 * lensShield.js — keeps the POV lens out of the set at runtime.
 *
 * Why this exists: `house.clampCameraPosition` only looks along the single line
 * from the look target to the desired eye position. A table edge 8 cm to the
 * side, or a camera standing inside a cabinet, is invisible to that test — which
 * is how the 2:30 episode ended up "phased inside a table". This module
 * sphere-casts around the finished lens position and pushes it back out, then
 * fades any surface that is still close enough to fill the frame.
 *
 * Deterministic: no randomness, no time-dependent behaviour, so a cloud render
 * and a local render produce identical frames.
 */
import { resolveClearance, sampleClearance, pickFadeTargets, LENS_CLEARANCE, LENS_FADE_DISTANCE, LENS_PROBE_DISTANCE } from "./lensClearance.js";

const _origin = { x: 0, y: 0, z: 0 };

export class LensShield {
  /**
   * @param {object} opts
   * @param {object} opts.house       house handle exposing `stagingWorld.castRay`
   * @param {object} [opts.scene]     THREE.Scene used for fading (optional)
   */
  constructor({ house = null, scene = null, clearance = LENS_CLEARANCE, fadeDistance = LENS_FADE_DISTANCE } = {}) {
    this.house = house;
    this.scene = scene;
    this.clearance = clearance;
    this.fadeDistance = fadeDistance;
    this.enabled = true;
    this._faded = new Map(); // object -> { material, opacity, transparent, depthWrite }
    this.last = { corrections: 0, minDist: Number.POSITIVE_INFINITY, faded: [], moved: 0 };
  }

  setHouse(house) {
    this.house = house;
    if (!house) this.restore();
  }

  _castRay(origin, dir, far) {
    const world = this.house?.stagingWorld;
    if (!world || typeof world.castRay !== "function") return null;
    const hit = world.castRay(origin, dir, far);
    if (!hit) return null;
    return {
      distance: hit.distance,
      point: hit.point,
      name: hit.object?.name || hit.object?.uuid || "",
      object: hit.object || null,
    };
  }

  /**
   * Push the lens out of geometry. Returns the corrected position; `camera` is
   * mutated only when a correction is actually needed.
   */
  resolve(camera) {
    if (!this.enabled || !this.house) {
      this.last = { corrections: 0, minDist: Number.POSITIVE_INFINITY, faded: [], moved: 0 };
      return camera.position;
    }
    _origin.x = camera.position.x;
    _origin.y = camera.position.y;
    _origin.z = camera.position.z;

    const result = resolveClearance(_origin, (o, d, far) => this._castRay(o, d, far), {
      clearance: this.clearance,
      maxStep: 0.2,
      iterations: 3,
      maxDist: LENS_PROBE_DISTANCE,
    });

    const moved = Math.hypot(result.pos.x - _origin.x, result.pos.y - _origin.y, result.pos.z - _origin.z);
    if (moved > 1e-4) {
      camera.position.set(result.pos.x, result.pos.y, result.pos.z);
    }
    this.last.corrections = result.corrections;
    this.last.minDist = result.minDist;
    this.last.moved = moved;
    return camera.position;
  }

  /**
   * Fade surfaces that are still too close after the push (a corner, or a prop
   * the camera cannot retreat from). Restores everything that moves away again.
   */
  updateFade(camera) {
    if (!this.enabled || !this.house || !camera) return [];
    const sample = sampleClearance(
      (o, d, far) => this._castRay(o, d, far),
      { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      { maxDist: this.fadeDistance + 0.08 }
    );
    const wanted = new Set();
    for (const { hit } of sample.intersections) {
      if (!hit.object || hit.distance > this.fadeDistance) continue;
      wanted.add(hit.object);
    }

    const faded = [];
    for (const obj of wanted) {
      if (!this._faded.has(obj)) this._fade(obj);
      faded.push(obj.name || obj.uuid || "mesh");
    }
    for (const [obj, saved] of [...this._faded.entries()]) {
      if (!wanted.has(obj)) this._restoreOne(obj, saved);
    }
    this.last.faded = faded;
    return faded;
  }

  _fade(object) {
    const mats = Array.isArray(object.material) ? object.material : [object.material];
    if (!mats.length || !mats[0]) return;
    const cloned = mats.map((m) => {
      const c = m.clone();
      c.transparent = true;
      c.opacity = Math.min(m.opacity ?? 1, 0.14);
      c.depthWrite = false;
      return c;
    });
    this._faded.set(object, { original: object.material });
    object.material = Array.isArray(object.material) ? cloned : cloned[0];
  }

  _restoreOne(object, saved) {
    object.material = saved.original;
    this._faded.delete(object);
  }

  /** Restore every faded mesh — call when the episode ends or the house changes. */
  restore() {
    for (const [object, saved] of [...this._faded.entries()]) {
      this._restoreOne(object, saved);
    }
  }
}
