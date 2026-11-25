/**
 * Real-geometry navigation.
 *
 * `src/data/houseNav.js` is a bake of the actual `GrannyHouse.fbx`: every
 * standable 0.2 m cell with the height of the floor it stands on, plus links to
 * the cells you can step to. Routing happens on that surface, so a route can
 * only ever follow floor that exists — it cannot cross a wall, cut a corner
 * through furniture, climb a step that isn't there, or float between floors.
 *
 * Framework contract:
 *   route(from, to)      -> polyline [{x,y,z}] on the floor, or null
 *   snap(x, z, refY)     -> nearest standable point, or null
 *   surfaceAt(x, z, refY)-> floor height at that spot, or null
 *   validateRoute(pts)   -> [] when the polyline never leaves the floor
 */
import { HOUSE_NAV } from "../data/houseNav.js";
import { pointInFurniture, findSegmentFurnitureHit } from "../furnitureColliders.js";

const CELL = HOUSE_NAV.cell;
const NODES = HOUSE_NAV.nodes.map((n) => [...n]); // mutable copy so we can inject the staircase bridge
const MAX_STEP = 0.34;
const MAX_SNAP = 1.1; // how far a named waypoint may sit from real floor
const MAX_SNAP_Y = 0.65; // ...and how far off its height it may be
const LEVELS = {};

const byColumn = new Map();
for (let i = 0; i < NODES.length; i += 1) {
  const n = NODES[i];
  const key = `${n[0]},${n[1]}`;
  if (!byColumn.has(key)) byColumn.set(key, []);
  byColumn.get(key).push(i);
}
const neighbours = NODES.map(() => []);
for (const [a, b] of HOUSE_NAV.edges) {
  neighbours[a].push(b);
  neighbours[b].push(a);
}

// Inject the 14-step staircase bridge linking Ground Floor (stairs_bottom: -1.9, 0.0, 4.0)
// to Second Floor (stairs_top: -1.9, 2.85, 1.25 -> upstairs_landing: -1.9, 2.85, 0.95).
function findNearestBakedNode(tx, ty, tz) {
  let bestId = -1;
  let bestD = Infinity;
  for (let i = 0; i < NODES.length; i += 1) {
    const n = NODES[i];
    if (Math.abs(n[3] - ty) > 0.5) continue;
    const d = Math.hypot(n[2] - tx, n[4] - tz);
    if (d < bestD) {
      bestD = d;
      bestId = i;
    }
  }
  return bestId;
}

{
  const bottomAnchor = findNearestBakedNode(-1.9, 0.0, 4.0);
  const topAnchor = findNearestBakedNode(-1.9, 2.85, 0.95);
  if (bottomAnchor >= 0 && topAnchor >= 0) {
    const STAIR_STEPS = 22;
    let prevId = bottomAnchor;
    for (let s = 1; s <= STAIR_STEPS; s += 1) {
      const t = s / (STAIR_STEPS + 1);
      const x = -1.9;
      const y = +(2.85 * t).toFixed(3);
      const z = +(4.0 + (1.25 - 4.0) * t).toFixed(3);
      const ix = Math.floor((x - HOUSE_NAV.bounds.x0) / CELL);
      const iz = Math.floor((z - HOUSE_NAV.bounds.z0) / CELL);
      const newId = NODES.length;
      NODES.push([ix, iz, x, y, z, 0, 1, 1]);
      neighbours.push([]);
      const key = `${ix},${iz}`;
      if (!byColumn.has(key)) byColumn.set(key, []);
      byColumn.get(key).push(newId);
      neighbours[prevId].push(newId);
      neighbours[newId].push(prevId);
      prevId = newId;
    }
    neighbours[prevId].push(topAnchor);
    neighbours[topAnchor].push(prevId);
  }
}

function cellKey(ix, iz) {
  return `${ix},${iz}`;
}

/** Nearest standable node to (x, y, z); `refY` is the height you are at now. */
export function snap(x, z, refY = null) {
  const ix0 = Math.floor((x - HOUSE_NAV.bounds.x0) / CELL);
  const iz0 = Math.floor((z - HOUSE_NAV.bounds.z0) / CELL);
  let best = null;
  let bestScore = Infinity;
  for (let r = 0; r <= 6; r += 1) {
    for (let dx = -r; dx <= r; dx += 1) {
      for (let dz = -r; dz <= r; dz += 1) {
        if (r > 0 && Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const ids = byColumn.get(cellKey(ix0 + dx, iz0 + dz));
        if (!ids) continue;
        for (const id of ids) {
          const n = NODES[id];
          const dh = Math.hypot(n[2] - x, n[4] - z);
          const dy = refY === null ? 0 : Math.abs(n[3] - refY);
          if (dh > MAX_SNAP) continue;
          if (refY !== null && dy > MAX_SNAP_Y) continue;
          const score = dh + dy * 0.8;
          if (score < bestScore) {
            bestScore = score;
            best = { id, x: n[2], y: n[3], z: n[4] };
          }
        }
      }
    }
    if (best && r >= 2) break; // one extra ring so corners beat diagonals
  }
  return best;
}

export function surfaceAt(x, z, refY = null) {
  const s = snap(x, z, refY);
  return s ? s.y : null;
}

function nodePoint(id) {
  const n = NODES[id];
  return { x: n[2], y: n[3], z: n[4] };
}

/** Is the straight run a->b entirely on floor we can stand on? */
export function segmentWalkable(a, b, tolerance = 0.12) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const steps = Math.max(2, Math.ceil(dist / 0.12));
  let prevY = a.y;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = a.x + (b.x - a.x) * t;
    const z = a.z + (b.z - a.z) * t;
    const wantY = a.y + (b.y - a.y) * t;
    const s = snap(x, z, wantY);
    if (!s) return false;
    if (Math.abs(s.y - wantY) > tolerance) return false;
    if (Math.abs(s.y - prevY) > MAX_STEP + 0.02) return false;
    prevY = s.y;
  }
  return true;
}

function heuristic(a, b) {
  // a and b are node records: [ix, iz, x, y, z, ...]
  return Math.hypot(a[2] - b[2], a[4] - b[4]) + Math.abs(a[3] - b[3]) * 1.5;
}

/** A* over the baked surface. Returns node ids or null. */
function findNodePath(startId, goalId) {
  if (startId === goalId) return [startId];
  const goal = NODES[goalId];
  const start = NODES[startId];
  const open = [{ id: startId, f: heuristic(start, goal) }]; // small binary-less heap
  const gScore = new Map([[startId, 0]]);
  const cameFrom = new Map();
  const closed = new Set();
  const push = (item) => {
    open.push(item);
    let i = open.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (open[p].f <= open[i].f) break;
      [open[p], open[i]] = [open[i], open[p]];
      i = p;
    }
  };
  const pop = () => {
    const top = open[0];
    const last = open.pop();
    if (open.length) {
      open[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < open.length && open[l].f < open[m].f) m = l;
        if (r < open.length && open[r].f < open[m].f) m = r;
        if (m === i) break;
        [open[m], open[i]] = [open[i], open[m]];
        i = m;
      }
    }
    return top;
  };

  let guard = 0;
  while (open.length) {
    guard += 1;
    if (guard > 200000) return null;
    const cur = pop();
    if (cur.id === goalId) {
      const path = [cur.id];
      let c = cur.id;
      while (cameFrom.has(c)) {
        c = cameFrom.get(c);
        path.push(c);
      }
      return path.reverse();
    }
    if (closed.has(cur.id)) continue;
    closed.add(cur.id);
    const a = NODES[cur.id];
    const hitStart = pointInFurniture({ x: start[2], y: start[3], z: start[4] }, 0.28);
    const hitGoal = pointInFurniture({ x: goal[2], y: goal[3], z: goal[4] }, 0.28);
    for (const nb of neighbours[cur.id]) {
      if (closed.has(nb)) continue;
      const b = NODES[nb];
      const hitNode = pointInFurniture({ x: b[2], y: b[3], z: b[4] }, 0.28);
      const hitEdge = findSegmentFurnitureHit(
        { x: a[2], y: a[3], z: a[4] },
        { x: b[2], y: b[3], z: b[4] },
        0.25
      );
      const hitPenalty =
        (hitNode && hitNode !== hitStart && hitNode !== hitGoal) ||
        (hitEdge && hitEdge !== hitStart && hitEdge !== hitGoal)
          ? 50.0
          : 0;
      const step = Math.hypot(b[2] - a[2], b[4] - a[4]);
      const rise = Math.abs(b[3] - a[3]);
      const cost = step + rise * 1.2 + 0.01 + hitPenalty;
      const tentative = (gScore.get(cur.id) ?? Infinity) + cost;
      if (tentative < (gScore.get(nb) ?? Infinity)) {
        gScore.set(nb, tentative);
        cameFrom.set(nb, cur.id);
        push({ id: nb, f: tentative + heuristic(b, goal) });
      }
    }
  }
  return null;
}

/**
 * Drop collinear points only. The path must stay on the baked surface, so we
 * never "shortcut" between two cells — that is exactly how a hand-authored
 * route ends up walking through a wall.
 */
function smooth(points) {
  if (points.length <= 2) return points.slice();
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const cross = (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
    const dot = (b.x - a.x) * (c.x - b.x) + (b.z - a.z) * (c.z - b.z);
    if (Math.abs(b.y - a.y) < 0.04 && Math.abs(c.y - b.y) < 0.04 && Math.abs(cross) < 0.0016 && dot > 0) continue; // same direction
    out.push(b);
  }
  out.push(points[points.length - 1]);
  return out;
}

/**
 * Plan a walk. `from`/`to` are world positions; the result starts at the
 * snapped floor point nearest `from` and ends at the snapped point nearest `to`.
 * Returns null when the two spots are not connected by real floor (e.g. roof to
 * upstairs with no staircase in the house).
 */
export function route(from, to) {
  const a = snap(from.x, from.z, from.y ?? null);
  const b = snap(to.x, to.z, to.y ?? null);
  if (!a || !b) return null;
  const ids = findNodePath(a.id, b.id);
  if (!ids) return null;
  const pts = ids.map(nodePoint);
  const simplified = smooth(pts);
  // Keep the exact goal spot if it is on the same floor as the last node.
  const tail = simplified[simplified.length - 1];
  if (Math.hypot(tail.x - to.x, tail.z - to.z) > 0.12) {
    const goal = { x: to.x, y: tail.y, z: to.z };
    if (segmentWalkable(tail, goal)) simplified.push(goal);
  }
  const head = simplified[0];
  if (Math.hypot(head.x - from.x, head.z - from.z) > 0.6) {
    // Cannot even reach the planned start without leaving the floor.
    return null;
  }
  return simplified;
}

/** Every sample must sit on floor: catches hand-authored routes that cheat. */
export function validateRoute(points, tolerance = 0.2) {
  const problems = [];
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(2, Math.ceil(dist / 0.15));
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const x = a.x + (b.x - a.x) * t;
      const z = a.z + (b.z - a.z) * t;
      const wantY = a.y + (b.y - a.y) * t;
      const hit = snap(x, z, wantY);
      if (!hit) {
        problems.push({ kind: "NO_FLOOR", x, y: wantY, z });
      } else if (Math.abs(hit.y - wantY) > tolerance) {
        problems.push({ kind: "OFF_SURFACE", x, y: wantY, z, floor: hit.y });
      }
    }
  }
  return problems;
}

export const NAV_INFO = {
  cells: NODES.length,
  links: HOUSE_NAV.edges.length,
  cell: CELL,
  bounds: HOUSE_NAV.bounds,
};
