/**
 * lensClearance.js — geometric rules for "the camera is not allowed to be inside
 * the furniture", expressed as pure functions so the runtime shield, the CI probe
 * and the unit tests all share exactly one definition of "too close".
 *
 * The caller supplies `castRay(origin, dir, maxDist) -> hit|null`, where a hit is
 * `{ distance, point, normal, name }`. Nothing here imports three.js.
 */

/** A lens closer than this to any surface is treated as inside the set. */
export const LENS_CLEARANCE = 0.34;

/** Meshes closer than this get faded out of the way (last-resort readability fix). */
export const LENS_FADE_DISTANCE = 0.26;

/** How far to look for surfaces; past this the lens is comfortably in the open. */
export const LENS_PROBE_DISTANCE = 1.0;

/**
 * 14 probes: 8 around the horizon, 4 up/down, forward and back. Enough to catch a
 * table edge or a cabinet corner without 50 raycasts per frame on SwiftShader.
 */
export const LENS_RAY_DIRECTIONS = (() => {
  const dirs = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    dirs.push([Math.cos(a), 0, Math.sin(a)]);
  }
  dirs.push([0, 1, 0], [0, -1, 0]);
  const d = Math.SQRT1_2;
  dirs.push([d, -d, 0], [-d, -d, 0], [0, -d, d], [0, -d, -d]);
  return dirs.map(([x, y, z]) => ({ x, y, z: z === 0 && x === 0 && y === 0 ? 1 : z }));
})();

function norm(v) {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * Nearest surface around a lens position.
 * Returns `{ minDist, nearest, intersections }`; `minDist` is Infinity when clear.
 */
export function sampleClearance(castRay, position, { dirs = LENS_RAY_DIRECTIONS, maxDist = LENS_PROBE_DISTANCE } = {}) {
  let minDist = Number.POSITIVE_INFINITY;
  let nearest = null;
  const intersections = [];
  for (const rawDir of dirs) {
    const dir = norm(rawDir);
    const hit = castRay(position, dir, maxDist);
    if (!hit || !Number.isFinite(hit.distance)) continue;
    intersections.push({ dir, hit });
    if (hit.distance < minDist) {
      minDist = hit.distance;
      nearest = { dir, ...hit };
    }
  }
  return { minDist, nearest, intersections };
}

/**
 * Push a lens out of geometry until it has `clearance` room in every probe
 * direction. Falls back gracefully: if a push would not help (a dead-end corner),
 * it still returns the least-bad position rather than looping.
 */
export function resolveClearance(
  position,
  castRay,
  { clearance = LENS_CLEARANCE, maxStep = 0.22, iterations = 3, dirs, maxDist } = {}
) {
  const pos = { x: position.x, y: position.y, z: position.z };
  let corrections = 0;
  let minDist = Number.POSITIVE_INFINITY;
  let nearest = null;

  for (let i = 0; i < iterations; i += 1) {
    const sample = sampleClearance(castRay, pos, { dirs, maxDist });
    minDist = sample.minDist;
    nearest = sample.nearest;
    if (!sample.nearest || sample.minDist >= clearance) break;

    // Retreat along the offending ray: the surface is `minDist` away in `dir`,
    // so backing up by (clearance - minDist) opens exactly that much room.
    const push = Math.min(maxStep, clearance - sample.minDist + 0.01);
    pos.x -= sample.nearest.dir.x * push;
    pos.y -= sample.nearest.dir.y * push;
    pos.z -= sample.nearest.dir.z * push;
    corrections += 1;
  }

  return { pos, corrections, minDist, nearest };
}

/**
 * Which nearby meshes should be faded so the lens is not filled by a plane?
 * Pure decision function; the renderer owns the actual material writes.
 */
export function pickFadeTargets(sample, { distance = LENS_FADE_DISTANCE } = {}) {
  const names = new Set();
  for (const { hit } of sample.intersections) {
    if (hit.distance <= distance && hit.name) names.add(hit.name);
  }
  return [...names];
}

/** 2D distance helper used by the actor-bubble rules and their tests. */
export function planarDistance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Actors yield to the lens; the lens does not dodge actors.
 *
 * Returns per-actor displacement suggestions. `protectedIds` are never moved
 * (e.g. whoever the beat is currently framing). Candidate positions that fall
 * outside the walkable area are rejected by the caller via `isWalkable`.
 */
export function planActorYield(
  actors,
  lensPos,
  { bubble = 0.75, maxPush = 0.9, isWalkable = null, protectedIds = [], floorY = null } = {}
) {
  // The lens sits at eye height (~1.55m) while performers stand at floor level,
  // so comparing raw Y would exempt everybody. Compare floors instead.
  // Default: assume the lens is an eye at ~1.55m above the floor it stands on.
  const lensFloor = floorY === null ? (lensPos.y ?? 0) - 1.55 : floorY;
  const out = [];
  const skip = new Set(protectedIds);
  for (const actor of actors || []) {
    if (!actor || !actor.position) continue;
    if (actor.visible === false || skip.has(actor.id)) continue;
    if (Math.abs((actor.position.y ?? 0) - lensFloor) > 0.9) continue;
    const dx = actor.position.x - lensPos.x;
    const dz = actor.position.z - lensPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist >= bubble) continue;

    // Degenerate case: directly on the lens axis — step them to the lens's left,
    // which reads as "walking past you" rather than "a body appears in the lens".
    let nx = dist > 1e-3 ? dx / dist : 1;
    let nz = dist > 1e-3 ? dz / dist : 0;
    const need = Math.min(maxPush, bubble - dist + 0.02);
    let cand = {
      x: actor.position.x + nx * need,
      z: actor.position.z + nz * need,
    };
    if (isWalkable && !isWalkable(cand)) {
      // Try sidesteps before giving up, so a wall behind the actor does not pin them.
      let placed = false;
      for (const angle of [Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, Math.PI]) {
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        const sx = nx * ca - nz * sa;
        const sz = nx * sa + nz * ca;
        const alt = {
          x: actor.position.x + sx * need,
          z: actor.position.z + sz * need,
        };
        if (!isWalkable || isWalkable(alt)) {
          cand = alt;
          placed = true;
          break;
        }
      }
      if (!placed) continue;
    }
    out.push({ id: actor.id, from: { x: actor.position.x, z: actor.position.z }, to: cand, overlap: bubble - dist });
  }
  return out;
}
