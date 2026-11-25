/**
 * furnitureColliders.js — zero-dependency 2D/3D AABB colliders for solid house
 * furniture (tables, kitchen counters, sofas, beds, desks) calibrated from
 * `GrannyHouse.fbx` (`SEMANTIC_OBJECT_REGIONS`).
 *
 * Used across:
 *   - `episodeRunner.js` (per-frame runtime push-out so actors/camera never phase into tables)
 *   - `episodeSafety.js` (pre-render static checks for routes/spawns inside furniture)
 *   - `assetLoader.js` (body-corridor obstacle avoidance)
 */

export const FURNITURE_COLLIDERS = Object.freeze([
  {
    id: "kitchen_west_counter",
    minX: -8.05,
    maxX: -6.79,
    minY: 0.0,
    maxY: 1.35,
    minZ: 0.4,
    maxZ: 3.07,
    label: "Kitchen West Counter",
  },
  {
    id: "kitchen_north_counter",
    minX: -7.95,
    maxX: -5.05,
    minY: 0.0,
    maxY: 1.35,
    minZ: -0.6,
    maxZ: -0.05,
    label: "Kitchen North Counter / Fridge Wall",
  },
  {
    id: "dining_table",
    minX: -5.8,
    maxX: -4.45,
    minY: 0.0,
    maxY: 1.25,
    minZ: 1.9,
    maxZ: 3.6,
    label: "Dining Room Table",
  },
  {
    id: "living_room_sofa",
    minX: 7.19,
    maxX: 8.57,
    minY: 0.0,
    maxY: 1.05,
    minZ: -0.58,
    maxZ: 0.9,
    label: "Living Room Sofa",
  },
  {
    id: "back_bed",
    minX: -6.05,
    maxX: -3.83,
    minY: 0.0,
    maxY: 1.35,
    minZ: -4.44,
    maxZ: -2.2,
    label: "Downstairs Back Bed",
  },
  {
    id: "up_bed",
    minX: -5.4,
    maxX: -3.3,
    minY: 2.7,
    maxY: 3.9,
    minZ: -2.0,
    maxZ: -0.8,
    label: "Upstairs High Bed",
  },
  {
    id: "upstairs_desk",
    minX: -7.55,
    maxX: -6.45,
    minY: 2.7,
    maxY: 3.7,
    minZ: -3.2,
    maxZ: -2.0,
    label: "Upstairs West Desk",
  },
  {
    id: "upstairs_east_bed",
    minX: 1.3,
    maxX: 2.7,
    minY: 2.7,
    maxY: 3.7,
    minZ: -4.9,
    maxZ: -3.7,
    label: "Upstairs East Bed",
  },
]);

function sameFloorBox(y, box) {
  const py = Number(y) || 0;
  return py + 1.55 > box.minY && py < box.maxY + 0.15;
}

/**
 * Returns the first furniture box overlapping `(pos.x, pos.y, pos.z)` within `radius`,
 * or null when clear.
 */
export function pointInFurniture(pos, radius = 0.28, colliders = FURNITURE_COLLIDERS) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) return null;
  const r = Math.max(0, Number(radius) || 0);
  for (const box of colliders) {
    if (!sameFloorBox(pos.y, box)) continue;
    if (
      pos.x >= box.minX - r &&
      pos.x <= box.maxX + r &&
      pos.z >= box.minZ - r &&
      pos.z <= box.maxZ + r
    ) {
      return box;
    }
  }
  return null;
}

/**
 * Pushes `(pos.x, pos.z)` along the shortest horizontal axis outside any
 * overlapping furniture box + `radius`, returning `{ x, y, z, pushed }`.
 */
export function pushOutOfFurniture(pos, radius = 0.34, colliders = FURNITURE_COLLIDERS) {
  if (!pos || !Number.isFinite(pos.x) || !Number.isFinite(pos.z)) {
    return { x: 0, y: 0, z: 0, pushed: false };
  }
  let x = pos.x;
  const y = Number(pos.y) || 0;
  let z = pos.z;
  let pushed = false;
  const r = Math.max(0.05, Number(radius) || 0.34);

  for (let pass = 0; pass < 3; pass += 1) {
    let movedThisPass = false;
    for (const box of colliders) {
      if (!sameFloorBox(y, box)) continue;
      const left = box.minX - r;
      const right = box.maxX + r;
      const top = box.minZ - r;
      const bottom = box.maxZ + r;
      if (x > left && x < right && z > top && z < bottom) {
        const dLeft = x - left;
        const dRight = right - x;
        const dTop = z - top;
        const dBottom = bottom - z;
        const minD = Math.min(dLeft, dRight, dTop, dBottom);
        if (minD === dLeft) x = left - 0.01;
        else if (minD === dRight) x = right + 0.01;
        else if (minD === dTop) z = top - 0.01;
        else z = bottom + 0.01;
        pushed = true;
        movedThisPass = true;
      }
    }
    if (!movedThisPass) break;
  }

  return { x, y, z, pushed };
}

/**
 * Liang-Barsky 2D segment vs AABB intersection test (inflated by `radius`).
 */
export function segmentHitsFurnitureBox(a, b, box, radius = 0.24) {
  if (!a || !b || !box) return false;
  const avgY = ((Number(a.y) || 0) + (Number(b.y) || 0)) * 0.5;
  if (!sameFloorBox(avgY, box)) return false;

  const r = Math.max(0, Number(radius) || 0);
  const minX = box.minX - r;
  const maxX = box.maxX + r;
  const minZ = box.minZ - r;
  const maxZ = box.maxZ + r;

  const dx = b.x - a.x;
  const dz = b.z - a.z;
  let t0 = 0;
  let t1 = 1;

  for (const [p, q] of [
    [-dx, a.x - minX],
    [dx, maxX - a.x],
    [-dz, a.z - minZ],
    [dz, maxZ - a.z],
  ]) {
    if (Math.abs(p) < 1e-8) {
      if (q < 0) return false;
    } else {
      const rVal = q / p;
      if (p < 0) {
        if (rVal > t1) return false;
        if (rVal > t0) t0 = rVal;
      } else {
        if (rVal < t0) return false;
        if (rVal < t1) t1 = rVal;
      }
    }
  }
  return t0 <= t1;
}

export function findSegmentFurnitureHit(a, b, radius = 0.24, colliders = FURNITURE_COLLIDERS) {
  for (const box of colliders) {
    if (segmentHitsFurnitureBox(a, b, box, radius)) return box;
  }
  return null;
}

/**
 * Inserts clean exterior corner detours whenever a polyline segment cuts across
 * a solid table/counter/bed box so routes smoothly hug the outside instead of phasing.
 */
export function detourAroundFurniture(points, radius = 0.36, colliders = FURNITURE_COLLIDERS) {
  if (!Array.isArray(points) || points.length < 2) return points || [];
  let current = points.map((p) => ({ x: p.x, y: p.y ?? 0, z: p.z }));

  for (let pass = 0; pass < 3; pass += 1) {
    const next = [current[0]];
    let splitAny = false;
    for (let i = 1; i < current.length; i += 1) {
      const a = next[next.length - 1];
      const b = current[i];
      const hit = findSegmentFurnitureHit(a, b, radius * 0.72, colliders);
      if (hit) {
        const pad = radius + 0.08;
        const corners = [
          { x: hit.minX - pad, y: a.y, z: hit.minZ - pad },
          { x: hit.maxX + pad, y: a.y, z: hit.minZ - pad },
          { x: hit.minX - pad, y: a.y, z: hit.maxZ + pad },
          { x: hit.maxX + pad, y: a.y, z: hit.maxZ + pad },
        ].filter((c) => !pointInFurniture(c, radius * 0.65, colliders));
        let bestCorner = null;
        let bestCost = Infinity;
        for (const c of corners) {
          if (findSegmentFurnitureHit(a, c, radius * 0.55, colliders)) continue;
          if (findSegmentFurnitureHit(c, b, radius * 0.55, colliders)) continue;
          const cost = Math.hypot(c.x - a.x, c.z - a.z) + Math.hypot(b.x - c.x, b.z - c.z);
          if (cost < bestCost) {
            bestCost = cost;
            bestCorner = c;
          }
        }
        if (bestCorner) {
          next.push(bestCorner);
          splitAny = true;
        }
      }
      next.push(b);
    }
    current = next;
    if (!splitAny) break;
  }
  return current;
}
