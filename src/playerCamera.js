import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CONFIG } from "./config.js";
import { createPropMesh } from "./comedyProps.js";
import { findTaggedObject, getObjectBounds } from "./assetLoader.js";
import {
  BODY,
  makeCapsule,
  pushOutOfCapsules,
  findSafeCameraSpot,
  ensureRoute,
  direction2D,
  dist2D,
} from "./stagingSafety.js";

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// Lock FPS pitch cleanly between -38 deg (down) and +28 deg (up) so the camera frames rooms comfortably.
const MIN_CAMERA_PITCH = (-38 * Math.PI) / 180;
const MAX_CAMERA_PITCH = (28 * Math.PI) / 180;
const PLAYER_EYE_HEIGHT = CONFIG.playerEyeHeight ?? 1.55;
const BASE_WALK_SPEED = CONFIG.baseWalkSpeed ?? 2.5;
const BASE_STAIR_SPEED = CONFIG.baseStairSpeed ?? 1.85;
const BASE_JUMP_SPEED = CONFIG.baseJumpSpeed ?? 2.35;

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function wrapAngleDiff(target, current) {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * First-Person Player POV Camera Controller + Free Orbit Inspector toggle.
 * Supports eye-level walking with head-bob, whip-pan double-takes,
 * nod/shake/peek gestures, crouch/under-bed hiding, bottom-right FPS held-item
 * viewmodel, fade-to-black overlay, and 16:9 / 9:16 aspect toggling.
 */
export class PlayerCamera {
  constructor(domElement, house = null, scene = null) {
    this.house = house;
    this.scene = scene;
    this.aspectKey = CONFIG.defaultAspect || "16:9";
    const aspectSpec = CONFIG.aspectModes[this.aspectKey];

    this.camera = new THREE.PerspectiveCamera(
      aspectSpec.fov,
      aspectSpec.aspect,
      0.06,
      120
    );
    this.camera.rotation.order = "YXZ";

    // Dedicated Viewmodel scene + camera rendered in a second depth-cleared pass
    // so held FPS props NEVER clip into counters, walls, or doorways.
    this.viewmodelScene = new THREE.Scene();
    this.viewmodelCamera = new THREE.PerspectiveCamera(
      aspectSpec.fov,
      aspectSpec.aspect,
      0.04,
      10
    );
    this.viewmodelScene.add(new THREE.HemisphereLight(0xfffbe6, 0x776655, 2.0));
    const vmKeyLight = new THREE.DirectionalLight(0xfff8e7, 1.5);
    vmKeyLight.position.set(1.5, 2.5, 2.0);
    this.viewmodelScene.add(vmKeyLight);

    this.heldItemMount = new THREE.Group();
    this.heldItemMount.name = "FPSHeldItemMount";
    this.heldItemMount.position.set(0.28, -0.22, -0.5);
    this.viewmodelScene.add(this.heldItemMount);
    this.heldPropMesh = null;
    this.heldPropType = null;
    this.heldEquipPop = 1;
    this.heldUseTimer = 0;
    this.vmBobTime = 0;

    this.orbitControls = new OrbitControls(this.camera, domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.08;
    this.orbitControls.target.set(0, 1.0, -2.0);
    this.orbitControls.enabled = false;

    this.mode = "pov"; // "pov" | "orbit"

    // Body-aware staging. The runner installs a provider so the lens can never
    // be placed inside a performer, and never walks through one.
    this.actorProvider = null;
    this.stagingReport = null;
    this._lastDodged = [];

    // Player spatial state
    this.playerPos = new THREE.Vector3(0, 0, -2.6); // Feet XZ on floor
    this.baseEyeHeight = CONFIG.playerEyeHeight;
    this.crouchStartHeight = CONFIG.playerEyeHeight;
    this.crouchTargetHeight = CONFIG.playerEyeHeight;
    this.crouchElapsed = 1;
    this.crouchDuration = 0.35;

    // Look yaw/pitch state
    this.yaw = 0;
    this.pitch = 0;
    this.lookStartYaw = 0;
    this.lookStartPitch = 0;
    this.lookTargetYaw = 0;
    this.lookTargetPitch = 0;
    this.lookElapsed = 1;
    this.lookDuration = 0.25;
    this.trackingRef = null;

    // Walk polyline state
    this.activeWalk = null;
    this.isWalking = false;
    this.bobPhase = 0;
    this.bobAmount = 0;

    // Gestures (nod_yes, shake_no, shake_panic, shake_earthquake, peek_lean)
    this.activeGesture = null;
    this.shakeIntensity = 0;
    this.shakePhase = 0;
    this.quakeTimer = 0;

    // Fade-to-black state
    this.fadeAlpha = 0;
    this.fadeStart = 0;
    this.fadeTarget = 0;
    this.fadeElapsed = 1;
    this.fadeDuration = 0.4;

    this._tmpTargetPos = new THREE.Vector3();
    this._tmpEyePos = new THREE.Vector3();
    this._tmpFinalPos = new THREE.Vector3();
    this._tmpBox = new THREE.Box3();
    this._tmpBoxCenter = new THREE.Vector3();
    this._tmpBoxSize = new THREE.Vector3();
  }

  setHouse(house) {
    this.house = house;
  }

  setScene(scene) {
    this.scene = scene;
  }

  setAspect(aspectKey) {
    const spec = CONFIG.aspectModes[aspectKey];
    if (!spec) return spec;
    this.aspectKey = aspectKey;
    this.camera.aspect = spec.aspect;
    this.camera.fov = spec.fov;
    this.camera.updateProjectionMatrix();
    this.viewmodelCamera.aspect = spec.aspect;
    this.viewmodelCamera.fov = spec.fov;
    this.viewmodelCamera.updateProjectionMatrix();
    // Adjust held viewmodel slightly for narrower 9:16 frame
    if (aspectKey === "9:16") {
      this.heldItemMount.position.set(0.18, -0.24, -0.5);
    } else {
      this.heldItemMount.position.set(0.28, -0.22, -0.5);
    }
    return spec;
  }

  hasHeldProp() {
    return Boolean(this.heldPropMesh);
  }

  setInspectionMode(isOrbit) {
    this.mode = isOrbit ? "orbit" : "pov";
    this.orbitControls.enabled = isOrbit;
    this.heldItemMount.visible = !isOrbit;
    if (isOrbit) {
      if (this.camera.position.y < 3.0) {
        this.camera.position.set(0, 9.5, 11.5);
        this.orbitControls.target.set(0, 0.5, 0.0);
      }
      this.orbitControls.update();
    }
  }

  reset(spawnPos = null, lookAtPos = null) {
    if (this.activeWalk?._resolve) this.activeWalk._resolve();
    if (this._lookResolve) {
      this._lookResolve();
      this._lookResolve = null;
    }
    if (this._crouchResolve) {
      this._crouchResolve();
      this._crouchResolve = null;
    }
    if (this._fadeResolve) {
      this._fadeResolve();
      this._fadeResolve = null;
    }
    if (this.activeGesture?._resolve) this.activeGesture._resolve();

    this.activeWalk = null;
    this.isWalking = false;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.activeGesture = null;
    this.shakeIntensity = 0;
    this.quakeTimer = 0;
    this.trackingRef = null;

    this.baseEyeHeight = PLAYER_EYE_HEIGHT;
    this.crouchStartHeight = PLAYER_EYE_HEIGHT;
    this.crouchTargetHeight = PLAYER_EYE_HEIGHT;
    this.crouchElapsed = 1;

    this.fadeAlpha = 0;
    this.fadeStart = 0;
    this.fadeTarget = 0;
    this.fadeElapsed = 1;

    this.holdProp(null);

    if (spawnPos) {
      this.playerPos.set(spawnPos.x, spawnPos.y || 0, spawnPos.z);
    } else {
      this.playerPos.set(0, 0, -2.6);
    }
    this._settleSpawn();

    if (lookAtPos) {
      const { yaw, pitch } = this._computeYawPitchTo(lookAtPos);
      this.yaw = yaw;
      this.pitch = pitch;
    } else {
      this.yaw = 0;
      this.pitch = -0.04;
    }
    this.lookStartYaw = this.yaw;
    this.lookTargetYaw = this.yaw;
    this.lookStartPitch = this.pitch;
    this.lookTargetPitch = this.pitch;
    this.lookElapsed = 1;
  }

  _resolveTaggedObject(ref, resolver) {
    const activeScene = this.scene || resolver?.getScene?.() || null;
    if (!activeScene || typeof ref !== "string") return null;
    return findTaggedObject(activeScene, ref);
  }

  /** Capsules for every visible performer (optionally excluding one). */
  _actorCapsules(excludeId = null) {
    const list = this.actorProvider ? this.actorProvider() : [];
    const caps = [];
    for (const actor of list) {
      if (!actor?.root || actor.root.visible === false) continue;
      if (excludeId && actor.id === excludeId) continue;
      caps.push(
        makeCapsule({
          id: actor.id,
          position: actor.root.position,
          height: actor.spec?.targetHeight ?? BODY.height,
        })
      );
    }
    return caps;
  }

  _stagingWorld() {
    return this.house?.stagingWorld || null;
  }

  /**
   * Pushes a floor position out of every performer and, if it ends up outside
   * the walkable shell, spirals back to the nearest legal spot.
   */
  _safeFloorPoint(pos, { pad = BODY.noGoPad, excludeId = null } = {}) {
    const world = this._stagingWorld();
    const caps = this._actorCapsules(excludeId);
    const pushed = pushOutOfCapsules({ x: pos.x, y: pos.y, z: pos.z }, caps, { pad, world });
    const out = { x: pushed.pos.x, y: pos.y, z: pushed.pos.z };

    if (world?.walkableAt && !world.walkableAt(out.x, out.z)) {
      const baseX = out.x;
      const baseZ = out.z;
      for (let ring = 1; ring <= 6; ring += 1) {
        let found = false;
        for (let i = 0; i < 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          const x = baseX + Math.cos(a) * ring * 0.22;
          const z = baseZ + Math.sin(a) * ring * 0.22;
          if (world.walkableAt(x, z)) {
            out.x = x;
            out.z = z;
            found = true;
            break;
          }
        }
        if (found) break;
      }
    }
    return { pos: out, dodged: pushed.dodged };
  }

  /** Called at reset so the episode never starts inside a body. */
  _settleSpawn() {
    const { pos, dodged } = this._safeFloorPoint(this.playerPos, { pad: 0.42 });
    this.playerPos.x = pos.x;
    this.playerPos.z = pos.z;
    this._lastDodged = dodged;
  }

  /**
   * Computes a world-space point `standoff` meters outside the bounding box
   * edge of a tagged mesh/object, preferring a walkable spot with clear
   * line-of-sight facing the object's center and *outside every other actor*.
   */
  resolveApproachPoint(tagOrName, { standoff = 0.8, fromPos = null, resolver = null } = {}) {
    const obj = this._resolveTaggedObject(tagOrName, resolver);
    if (!obj) return null;

    const box = getObjectBounds(obj, new THREE.Box3());
    if (box.isEmpty()) return null;

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const hx = Math.max(0.12, size.x * 0.5);
    const hz = Math.max(0.12, size.z * 0.5);

    const origin = fromPos
      ? new THREE.Vector3(fromPos.x, fromPos.y ?? 0, fromPos.z)
      : this.playerPos.clone();

    const floorY = center.y >= 2.1 && Math.abs(origin.y - 2.85) < 0.8 ? 2.85 : 0.0;
    const subjectId = obj.userData?.actorId || null;

    // Aim at the face for performers, at the object's middle otherwise.
    const eyeTarget = new THREE.Vector3(center.x, Math.max(floorY + 1.0, center.y), center.z);
    if (subjectId) {
      const actor = resolver?.getActor?.(subjectId);
      if (actor?.getHeadWorldPosition) {
        actor.getHeadWorldPosition(eyeTarget);
        eyeTarget.y -= 0.05;
      } else {
        eyeTarget.y = box.min.y + size.y * 0.72;
      }
    }

    const preferredDir = direction2D(center, origin, { x: 0, z: 1 });
    const dirX = Math.abs(preferredDir.x) > 1e-4 ? hx / Math.abs(preferredDir.x) : Infinity;
    const dirZ = Math.abs(preferredDir.z) > 1e-4 ? hz / Math.abs(preferredDir.z) : Infinity;
    const edgeDist = Number.isFinite(Math.min(dirX, dirZ)) ? Math.min(dirX, dirZ) : Math.max(hx, hz);
    const requested = Math.max(BODY.radius + 0.75, Number(standoff) || 0.8);
    const minDist = Math.max(1.15, edgeDist + requested);
    const preferredDist = Math.min(minDist + 0.75, 3.6);

    const spot = findSafeCameraSpot({
      eyeTarget,
      world: this._stagingWorld(),
      actors: this._actorCapsules(subjectId),
      subjectId,
      preferredDir,
      minDist,
      maxDist: Math.max(minDist + 1.4, 3.8),
      preferredDist,
      lensHeight: floorY + this.baseEyeHeight,
      floorY,
      yawSamples: 28,
    });

    if (!spot) return null;

    return {
      object: obj,
      box,
      center,
      standoffPos: new THREE.Vector3(spot.pos.x, floorY, spot.pos.z),
      safe: !spot.fallback,
      dodged: spot.dodged || [],
      distance: spot.dist,
    };
  }

  _resolveTargetPosition(ref, resolver, out, { liveTrack = false } = {}) {
    if (!ref) return false;
    if (typeof ref === "object" && "x" in ref && "z" in ref) {
      out.set(ref.x, ref.y ?? 1.35, ref.z);
      return true;
    }

    const taggedObj = this._resolveTaggedObject(ref, resolver);
    if (taggedObj) {
      if (liveTrack && taggedObj.userData?.actorId) {
        const actor = resolver?.getActor?.(taggedObj.userData.actorId);
        if (actor) {
          actor.getHeadWorldPosition(out);
          out.y -= 0.08;
          return true;
        }
        taggedObj.getWorldPosition(out);
        out.y += 1.25;
        return true;
      }

      const box = getObjectBounds(taggedObj, this._tmpBox);
      if (!box.isEmpty()) {
        box.getCenter(this._tmpBoxCenter);
        box.getSize(this._tmpBoxSize);
        out.copy(this._tmpBoxCenter);
        // For characters, bias framing slightly toward upper torso/face inside the bounding box.
        if (taggedObj.userData?.actorId) {
          out.y = box.min.y + this._tmpBoxSize.y * 0.72;
        }
        return true;
      }
    }

    if (!resolver) return false;
    const actor = resolver.getActor(ref);
    if (actor) {
      actor.getHeadWorldPosition(out);
      out.y -= 0.08;
      return true;
    }
    const prop = resolver.getProp ? resolver.getProp(ref) : null;
    if (prop) {
      out.copy(prop.mesh.position);
      out.y += 0.08;
      return true;
    }
    const wp = resolver.getWaypoint(ref);
    if (wp) {
      // Surface waypoints (e.g. counter top y=1.13) target just above the surface rather than adding +1.35m eye height.
      const yOff = (wp.y || 0) > 0.2 ? 0.12 : 1.35;
      out.set(wp.x, (wp.y || 0) + yOff, wp.z);
      return true;
    }
    return false;
  }

  _computeYawPitchTo(targetPos) {
    const eyeY = this.playerPos.y + this.baseEyeHeight;
    const dx = targetPos.x - this.playerPos.x;
    const dy = targetPos.y - eyeY;
    const dz = targetPos.z - this.playerPos.z;
    const horizDist = Math.max(1e-4, Math.hypot(dx, dz));
    // Three.js camera looks down -Z; yaw = atan2(-dx, -dz)
    const yaw = Math.atan2(-dx, -dz);
    const pitch = clamp(Math.atan2(dy, horizDist), MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
    return { yaw, pitch };
  }

  _sampleAlongWalk(walk, dist) {
    const out = new THREE.Vector3();
    if (!walk || !walk.points || walk.points.length === 0) return out;
    if (dist <= 0 || walk.totalLength < 1e-4) return out.copy(walk.points[0]);
    if (dist >= walk.totalLength) return out.copy(walk.points[walk.points.length - 1]);

    let seg = 0;
    while (seg < walk.cumDist.length - 2 && walk.cumDist[seg + 1] < dist) {
      seg += 1;
    }
    const segStart = walk.cumDist[seg];
    const segLen = Math.max(1e-5, walk.cumDist[seg + 1] - segStart);
    const alpha = clamp((dist - segStart) / segLen, 0, 1);
    return out.lerpVectors(walk.points[seg], walk.points[seg + 1], alpha);
  }

  startWalk({
    points = null,
    target = null,
    standoff = 0.8,
    duration = null,
    speed = null,
    autoLook = true,
    segments = null,
    maxVerticalSpeed = 1.55,
    faceTarget = null,
    resolver = null,
  }) {
    if (this.activeWalk?._resolve) {
      this.activeWalk._resolve();
    }

    let resolvedPoints = points;
    let resolvedFaceTarget = faceTarget;
    if ((!resolvedPoints || resolvedPoints.length < 2) && target) {
      const approach = this.resolveApproachPoint(target, {
        standoff,
        fromPos: this.playerPos,
        resolver,
      });
      if (approach) {
        resolvedFaceTarget = resolvedFaceTarget || target;
        if (this.house && typeof this.house.findPath === "function") {
          resolvedPoints = this.house.findPath(this.playerPos, approach.standoffPos);
        } else {
          resolvedPoints = [this.playerPos.clone(), approach.standoffPos];
        }
      }
    }

    if (!resolvedPoints || resolvedPoints.length < 2) return Promise.resolve();

    // ---- Staging gate: never walk through a body or a wall ----
    {
      const caps = this._actorCapsules();
      const last = resolvedPoints[resolvedPoints.length - 1];
      if (caps.length) {
        const clear = this._safeFloorPoint({ x: last.x, y: last.y, z: last.z }, { pad: 0.6 });
        if (dist2D(clear.pos, last) > 0.02) {
          resolvedPoints = [
            ...resolvedPoints.slice(0, -1),
            new THREE.Vector3(clear.pos.x, last.y, clear.pos.z),
          ];
          this._lastDodged = clear.dodged;
        }
      }

      const world = this._stagingWorld();
      const elevated = resolvedPoints.some((p) => Math.abs(p.y) > 0.35);
      const hasJump = Boolean(segments?.some((seg) => seg?.isJumpArc));
      if (world && !elevated && !hasJump) {
        const route = ensureRoute(world, resolvedPoints[0], resolvedPoints.slice(1));
        if (route.inserted || route.unresolved) {
          resolvedPoints = route.points.map((p) => new THREE.Vector3(p.x, p.y ?? 0, p.z));
          this.stagingReport = {
            ...(this.stagingReport || {}),
            routeInserted: route.inserted,
            routeUnresolved: route.unresolved,
          };
        }
      }
    }

    const walkSpeed = Math.max(0.4, Number(speed) || BASE_WALK_SPEED);
    const cumDist = [0];
    let totalLength = 0;
    let computedDuration = 0;
    const segMeta = [];

    for (let i = 1; i < resolvedPoints.length; i += 1) {
      const a = resolvedPoints[i - 1];
      const b = resolvedPoints[i];
      const segLen = a.distanceTo(b);
      const dy = Math.abs(b.y - a.y);
      const meta = segments?.[i - 1] || {};
      const isJumpArc = Boolean(meta.isJumpArc);
      const isStair = !isJumpArc && dy > 0.15;

      let segDur = 0;
      if (isJumpArc) {
        segDur = Math.max(0.55, segLen / Math.max(walkSpeed, BASE_JUMP_SPEED));
      } else if (isStair) {
        const stairSpd = Math.min(walkSpeed, BASE_STAIR_SPEED);
        segDur = Math.max(segLen / stairSpd, dy / maxVerticalSpeed);
      } else {
        segDur = segLen / walkSpeed;
      }

      const rawArc = meta.arcHeight || 0.44;
      const safeArc = Math.max(a.y, b.y) < 1.5 ? Math.min(rawArc, 0.18) : rawArc;

      computedDuration += segDur;
      segMeta.push({
        isJumpArc,
        isStair,
        arcHeight: safeArc,
        startY: a.y,
        endY: b.y,
      });
      totalLength += segLen;
      cumDist.push(totalLength);
    }

    // Dynamic distance-based timing: never teleport across long routes on short fixed durations.
    const requestedMin = Number(duration) > 0 ? Number(duration) : 0;
    const effectiveDuration = Math.max(0.18, computedDuration, requestedMin);

    let resolveWalk = null;
    const donePromise = new Promise((resolve) => {
      resolveWalk = resolve;
    });

    this.activeWalk = {
      points: resolvedPoints,
      cumDist,
      segMeta,
      totalLength,
      elapsed: 0,
      duration: effectiveDuration,
      maxVerticalSpeed,
      autoLook,
      faceTarget: resolvedFaceTarget,
      finalLookTriggered: false,
      _resolve: resolveWalk,
    };
    this.isWalking = true;

    if (autoLook && totalLength > 0.08) {
      const lookAhead = this._sampleAlongWalk(this.activeWalk, Math.min(totalLength, 1.25));
      lookAhead.y = this.playerPos.y + this.baseEyeHeight - 0.05;
      this.lookAtPosition(lookAhead, { duration: 0.35, trackRef: null });
    }
    return donePromise;
  }

  lookAtPosition(targetPos, { duration = 0.25, trackRef = null } = {}) {
    if (this._lookResolve) {
      this._lookResolve();
      this._lookResolve = null;
    }
    const { yaw, pitch } = this._computeYawPitchTo(targetPos);
    this.lookStartYaw = this.yaw;
    this.lookStartPitch = this.pitch;
    this.lookTargetYaw = this.yaw + wrapAngleDiff(yaw, this.yaw);
    this.lookTargetPitch = pitch;
    this.lookElapsed = 0;
    this.lookDuration = Math.max(0.01, duration);
    this.trackingRef = trackRef;
    return new Promise((resolve) => {
      this._lookResolve = resolve;
    });
  }

  lookAt(ref, { duration = 0.25, track = false } = {}, resolver) {
    if (this._resolveTargetPosition(ref, resolver, this._tmpTargetPos)) {
      return this.lookAtPosition(this._tmpTargetPos, {
        duration,
        trackRef: track ? ref : null,
      });
    }
    return Promise.resolve();
  }

  crouch({ crouched = true, duration = 0.35 } = {}) {
    if (this._crouchResolve) {
      this._crouchResolve();
      this._crouchResolve = null;
    }
    this.crouchStartHeight = this.baseEyeHeight;
    this.crouchTargetHeight = crouched
      ? CONFIG.playerCrouchHeight
      : PLAYER_EYE_HEIGHT;
    this.crouchElapsed = 0;
    this.crouchDuration = Math.max(0.05, duration);
    return new Promise((resolve) => {
      this._crouchResolve = resolve;
    });
  }

  triggerGesture(type = "nod_yes", duration = 0.7) {
    if (type === "shake_panic") {
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.4);
      return Promise.resolve();
    }
    if (type === "shake_earthquake") {
      this.quakeTimer = Math.max(this.quakeTimer, Math.max(0.5, duration));
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.72);
      return Promise.resolve();
    }
    if (this.activeGesture?._resolve) {
      this.activeGesture._resolve();
    }
    return new Promise((resolve) => {
      this.activeGesture = {
        type,
        elapsed: 0,
        duration: Math.max(0.2, duration),
        _resolve: resolve,
      };
    });
  }

  holdProp(propType = null) {
    if (this.heldPropMesh) {
      this.heldItemMount.remove(this.heldPropMesh);
      this.heldPropMesh.traverse((n) => {
        if (n.geometry) n.geometry.dispose();
        if (n.material) {
          const ms = Array.isArray(n.material) ? n.material : [n.material];
          for (const m of ms) {
            if (m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
      this.heldPropMesh = null;
    }

    this.heldPropType = propType || null;
    if (!propType) return;

    const mesh = createPropMesh(propType);
    // Scale cleanly for crisp FPS bottom-right framing
    mesh.scale.setScalar(propType === "emoji_ball" ? 0.45 : 0.72);
    if (propType === "golden_key") {
      mesh.rotation.set(0.3, -0.4, -0.35);
    } else if (propType === "toy_blaster") {
      mesh.rotation.set(0.05, -0.15, 0);
    } else if (propType === "red_button") {
      mesh.rotation.set(0.35, -0.25, 0);
    }
    this.heldItemMount.add(mesh);
    this.heldPropMesh = mesh;
    this.heldEquipPop = 0;
  }

  useHeldProp() {
    this.heldUseTimer = 0.32;
  }

  startFade({ to = 1, duration = 0.4 } = {}) {
    if (this._fadeResolve) {
      this._fadeResolve();
      this._fadeResolve = null;
    }
    this.fadeStart = this.fadeAlpha;
    this.fadeTarget = clamp(to, 0, 1);
    this.fadeElapsed = 0;
    this.fadeDuration = Math.max(0.02, duration);
    return new Promise((resolve) => {
      this._fadeResolve = resolve;
    });
  }

  getEyeWorldPosition(out = new THREE.Vector3()) {
    return out.set(
      this.playerPos.x,
      this.playerPos.y + this.baseEyeHeight,
      this.playerPos.z
    );
  }

  update(dt, resolver) {
    // Update fade even if in POV
    if (this.fadeElapsed < this.fadeDuration) {
      this.fadeElapsed = Math.min(this.fadeDuration, this.fadeElapsed + dt);
      const ft = easeInOutSine(this.fadeElapsed / this.fadeDuration);
      this.fadeAlpha = this.fadeStart + (this.fadeTarget - this.fadeStart) * ft;
      if (this.fadeElapsed >= this.fadeDuration && this._fadeResolve) {
        const res = this._fadeResolve;
        this._fadeResolve = null;
        res();
      }
    }

    if (this.mode === "orbit") {
      this.orbitControls.update();
      return;
    }

    // Crouch interpolation
    if (this.crouchElapsed < this.crouchDuration) {
      this.crouchElapsed = Math.min(this.crouchDuration, this.crouchElapsed + dt);
      const ct = easeInOutSine(this.crouchElapsed / this.crouchDuration);
      this.baseEyeHeight =
        this.crouchStartHeight + (this.crouchTargetHeight - this.crouchStartHeight) * ct;
      if (this.crouchElapsed >= this.crouchDuration && this._crouchResolve) {
        const res = this._crouchResolve;
        this._crouchResolve = null;
        res();
      }
    }

    // Walking along polyline
    if (this.activeWalk) {
      const prevY = this.playerPos.y;
      this.activeWalk.elapsed += dt;
      const rawT = clamp(this.activeWalk.elapsed / this.activeWalk.duration, 0, 1);
      const t = rawT * 0.9 + easeInOutSine(rawT) * 0.1;
      const targetDist = t * this.activeWalk.totalLength;

      if (this.activeWalk.totalLength < 1e-4 || this.activeWalk.points.length < 2) {
        this.playerPos.copy(this.activeWalk.points[this.activeWalk.points.length - 1]);
      } else {
        let seg = 0;
        while (
          seg < this.activeWalk.cumDist.length - 2 &&
          this.activeWalk.cumDist[seg + 1] < targetDist
        ) {
          seg += 1;
        }
        const segStart = this.activeWalk.cumDist[seg];
        const segLen = Math.max(1e-5, this.activeWalk.cumDist[seg + 1] - segStart);
        const alpha = clamp((targetDist - segStart) / segLen, 0, 1);
        const pA = this.activeWalk.points[seg];
        const pB = this.activeWalk.points[seg + 1];
        const meta = this.activeWalk.segMeta?.[seg] || {};

        this.playerPos.lerpVectors(pA, pB, alpha);

        if (meta.isJumpArc) {
          // Smooth parabolic jump onto/off elevated furniture
          this.playerPos.y += Math.sin(alpha * Math.PI) * (meta.arcHeight || 0.44);
        } else if (meta.isStair) {
          // Staircase traversal: smoothly clamp vertical speed to staircase slope
          const maxStepY = (this.activeWalk.maxVerticalSpeed || 1.55) * Math.max(dt, 1 / 120) * 1.35;
          const dyStep = this.playerPos.y - prevY;
          if (Math.abs(dyStep) > maxStepY) {
            this.playerPos.y = prevY + Math.sign(dyStep) * maxStepY;
          }
        } else {
          // Strict flat floor lock: keep player Y locked to floor node.y (eye = node.y + 1.55)
          this.playerPos.y = Math.abs(pB.y - pA.y) < 0.05 ? pA.y : pA.y + (pB.y - pA.y) * alpha;
        }

        // Slide around bodies instead of ghosting through them.
        if (this.actorProvider) {
          const caps = this._actorCapsules();
          if (caps.length) {
            const slid = pushOutOfCapsules(
              { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
              caps,
              { pad: 0.34, world: this._stagingWorld() }
            );
            if (slid.dodged.length) {
              this.playerPos.x = slid.pos.x;
              this.playerPos.z = slid.pos.z;
            }
          }
        }

        const lookDuringApproach =
          this.activeWalk.faceTarget &&
          (this.activeWalk.totalLength - targetDist <= 0.75 || rawT >= 0.82);

        if (lookDuringApproach && !this.activeWalk.finalLookTriggered && !this.trackingRef) {
          this.activeWalk.finalLookTriggered = true;
          this.lookAt(
            this.activeWalk.faceTarget,
            { duration: Math.max(0.22, this.activeWalk.duration - this.activeWalk.elapsed) },
            resolver
          );
        } else if (
          this.activeWalk.autoLook &&
          !this.activeWalk.finalLookTriggered &&
          !this.trackingRef &&
          this.lookElapsed >= this.lookDuration
        ) {
          const lookDist = Math.min(this.activeWalk.totalLength, targetDist + 1.15);
          const ahead = this._sampleAlongWalk(this.activeWalk, lookDist);
          const dx = ahead.x - this.playerPos.x;
          const dz = ahead.z - this.playerPos.z;
          const horiz = Math.hypot(dx, dz);
          if (horiz > 0.12) {
            const desiredYaw = Math.atan2(-dx, -dz);
            this.yaw += wrapAngleDiff(desiredYaw, this.yaw) * Math.min(1, dt * 5.2);
          }
          const desiredPitch = meta.isStair
            ? clamp(Math.atan2(pB.y - pA.y, Math.max(0.4, Math.hypot(pB.x - pA.x, pB.z - pA.z))) * 0.42, -0.26, 0.22)
            : -0.04;
          this.pitch += (desiredPitch - this.pitch) * Math.min(1, dt * 4.5);
        }
      }

      this.bobPhase += dt * 11.2;
      this.bobAmount += (1 - this.bobAmount) * Math.min(1, dt * 10);

      if (rawT >= 1) {
        const finished = this.activeWalk;
        this.playerPos.copy(finished.points[finished.points.length - 1]);
        this.activeWalk = null;
        this.isWalking = false;
        if (finished.faceTarget && !finished.finalLookTriggered) {
          this.lookAt(finished.faceTarget, { duration: 0.22 }, resolver);
        }
        if (finished._resolve) finished._resolve();
      }
    } else {
      this.bobAmount *= Math.exp(-10 * dt);
    }

    // Look tracking / whip-pan
    if (
      this.trackingRef &&
      this._resolveTargetPosition(this.trackingRef, resolver, this._tmpTargetPos, { liveTrack: true })
    ) {
      const { yaw, pitch } = this._computeYawPitchTo(this._tmpTargetPos);
      if (this.lookElapsed < this.lookDuration) {
        this.lookTargetYaw = this.lookStartYaw + wrapAngleDiff(yaw, this.lookStartYaw);
        this.lookTargetPitch = pitch;
      } else {
        this.yaw += wrapAngleDiff(yaw, this.yaw) * Math.min(1, dt * 10);
        this.pitch += (pitch - this.pitch) * Math.min(1, dt * 10);
      }
    }

    if (this.lookElapsed < this.lookDuration) {
      this.lookElapsed = Math.min(this.lookDuration, this.lookElapsed + dt);
      const lt = easeOutCubic(this.lookElapsed / this.lookDuration);
      this.yaw = this.lookStartYaw + (this.lookTargetYaw - this.lookStartYaw) * lt;
      this.pitch = this.lookStartPitch + (this.lookTargetPitch - this.lookStartPitch) * lt;
      if (this.lookElapsed >= this.lookDuration && this._lookResolve) {
        const res = this._lookResolve;
        this._lookResolve = null;
        res();
      }
    }

    // Gestures
    let gesturePitch = 0;
    let gestureYaw = 0;
    let gestureRoll = 0;
    let gestureLeanX = 0;
    if (this.activeGesture) {
      this.activeGesture.elapsed += dt;
      const gt = clamp(this.activeGesture.elapsed / this.activeGesture.duration, 0, 1);
      const envelope = Math.sin(gt * Math.PI);
      if (this.activeGesture.type === "nod_yes") {
        gesturePitch = Math.sin(gt * Math.PI * 4) * 0.18 * envelope;
      } else if (this.activeGesture.type === "shake_no") {
        gestureYaw = Math.sin(gt * Math.PI * 4) * 0.24 * envelope;
      } else if (this.activeGesture.type === "peek_lean") {
        gestureLeanX = Math.sin(gt * Math.PI) * 0.32;
        gestureRoll = -Math.sin(gt * Math.PI) * 0.12;
      }
      if (gt >= 1) {
        const doneGesture = this.activeGesture;
        this.activeGesture = null;
        if (doneGesture._resolve) doneGesture._resolve();
      }
    }

    // Subtle footsteps head-bob + damped handheld shake
    const bobY = Math.sin(this.bobPhase) * 0.028 * this.bobAmount;
    const bobX = Math.cos(this.bobPhase * 0.5) * 0.014 * this.bobAmount;

    let shakeX = 0;
    let shakeY = 0;
    let shakeRoll = 0;
    if (this.quakeTimer > 0) {
      this.quakeTimer = Math.max(0, this.quakeTimer - dt);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.72);
    }
    if (this.shakeIntensity > 0.002) {
      this.shakePhase += dt * 28;
      shakeX = Math.sin(this.shakePhase * 1.1) * this.shakeIntensity * 0.028;
      shakeY = Math.cos(this.shakePhase * 1.45) * this.shakeIntensity * 0.028;
      shakeRoll = Math.sin(this.shakePhase * 0.9) * this.shakeIntensity * 0.022;
      if (this.quakeTimer <= 0) {
        this.shakeIntensity *= Math.exp(-7.5 * dt);
      }
    } else {
      this.shakeIntensity = 0;
    }

    const finalYaw = this.yaw + gestureYaw;
    const finalPitch = clamp(this.pitch + gesturePitch, MIN_CAMERA_PITCH, MAX_CAMERA_PITCH);
    const rightX = Math.cos(finalYaw);
    const rightZ = -Math.sin(finalYaw);

    this._tmpEyePos.set(
      this.playerPos.x,
      this.playerPos.y + this.baseEyeHeight,
      this.playerPos.z
    );
    this._tmpFinalPos.set(
      this._tmpEyePos.x + rightX * (bobX + gestureLeanX + shakeX),
      this._tmpEyePos.y + bobY + shakeY,
      this._tmpEyePos.z + rightZ * (bobX + gestureLeanX + shakeX)
    );

    if (this.house && typeof this.house.clampCameraPosition === "function") {
      this.camera.position.copy(
        this.house.clampCameraPosition(this._tmpEyePos, this._tmpFinalPos, 0.05)
      );
    } else {
      this.camera.position.copy(this._tmpFinalPos);
    }

    // The lens itself may never sit inside a performer's body.
    if (this.actorProvider) {
      const caps = this._actorCapsules();
      if (caps.length) {
        const res = pushOutOfCapsules(this.camera.position, caps, {
          pad: 0.3,
          world: this._stagingWorld(),
        });
        if (res.dodged.length) {
          this.camera.position.set(res.pos.x, res.pos.y, res.pos.z);
        }
      }
    }

    this.camera.rotation.set(finalPitch, finalYaw, gestureRoll + shakeRoll, "YXZ");

    // Animate bottom-right FPS held prop (deterministic viewmodel pass)
    if (this.heldPropMesh) {
      this.vmBobTime += dt;
      this.heldEquipPop = Math.min(1, this.heldEquipPop + dt * 6);
      const popScale = easeOutCubic(this.heldEquipPop);
      const baseScale = this.heldPropType === "emoji_ball" ? 0.36 : 0.72;
      this.heldPropMesh.scale.setScalar(baseScale * popScale);

      const baseX = this.aspectKey === "9:16" ? 0.18 : 0.28;
      const baseY = this.aspectKey === "9:16" ? -0.24 : -0.22;
      let pokeZ = 0;
      let pokePitch = 0;
      if (this.heldUseTimer > 0) {
        this.heldUseTimer = Math.max(0, this.heldUseTimer - dt);
        const u = Math.sin((this.heldUseTimer / 0.32) * Math.PI);
        pokeZ = -u * 0.14;
        pokePitch = -u * 0.45;
      }
      this.heldItemMount.position.set(
        baseX + Math.cos(this.bobPhase * 0.5) * 0.012 * this.bobAmount,
        baseY + Math.sin(this.bobPhase) * 0.016 * this.bobAmount + Math.sin(this.vmBobTime * 3.0) * 0.005,
        -0.5 + pokeZ
      );
      this.heldItemMount.rotation.set(pokePitch, 0, 0);
    }
  }

  dispose() {
    this.holdProp(null);
    this.orbitControls.dispose();
  }
}
