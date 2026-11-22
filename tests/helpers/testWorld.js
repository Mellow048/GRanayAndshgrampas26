/**
 * A tiny analytic house used by the tests.
 *
 * It implements exactly the adapter surface `stagingSafety` expects
 * (`castRay`, `castDown`, `walkableAt`, `findPath`) — no WebGL, no THREE —
 * so the safety rules can be proven without loading the 40MB FBX.
 *
 * Layout (metres, top-down):
 *
 *      z=-3  +-------------------+  wall z=-1 with a 1.2m doorway at x in [-0.6, 0.6]
 *            |     KITCHEN       |
 *      z=-1  +-------[  ]--------+
 *            |     LIVING        |
 *      z=+3  +-------------------+
 *           x=-4                 x=+4
 *
 * A counter (`surfaces`) sits at x in [1.2, 2.6], z in [-2.6, -1.8], top y=1.0.
 */

const EPS = 1e-9;

function raySegmentT(ox, oz, dx, dz, x1, z1, x2, z2) {
  const sx = x2 - x1;
  const sz = z2 - z1;
  const denom = dx * sz - dz * sx;
  if (Math.abs(denom) < EPS) return null;
  const t = ((x1 - ox) * sz - (z1 - oz) * sx) / denom;
  const u = ((x1 - ox) * dz - (z1 - oz) * dx) / denom;
  if (t < 0 || u < 0 || u > 1) return null;
  return t;
}

export function makeTestWorld({
  walls = [
    // back wall, with a doorway gap between x = -0.6 and 0.6
    { x1: -4, z1: -1, x2: -0.6, z2: -1, y0: 0, y1: 2.6 },
    { x1: 0.6, z1: -1, x2: 4, z2: -1, y0: 0, y1: 2.6 },
    // outer shell
    { x1: -4, z1: -3, x2: 4, z2: -3, y0: 0, y1: 2.6 },
    { x1: -4, z1: 3, x2: 4, z2: 3, y0: 0, y1: 2.6 },
    { x1: -4, z1: -3, x2: -4, z2: 3, y0: 0, y1: 2.6 },
    { x1: 4, z1: -3, x2: 4, z2: 3, y0: 0, y1: 2.6 },
    // an interior pillar the router must dodge
    { x1: -2.6, z1: 0.6, x2: -1.9, z2: 1.3, y0: 0, y1: 2.6 },
  ],
  surfaces = [
    { x0: 1.2, x1: 2.6, z0: -2.6, z1: -1.8, y: 1.0, name: "counter" },
    { x0: -4, x1: 4, z0: -3, z1: 3, y: 0, name: "floor" },
  ],
  bounds = { x0: -3.9, x1: 3.9, z0: -2.9, z1: 2.9 },
  gridStep = 0.2,
} = {}) {
  const after = [];

  function castRay(origin, dir, far) {
    let best = null;
    for (const w of walls) {
      const t = raySegmentT(origin.x, origin.z, dir.x, dir.z, w.x1, w.z1, w.x2, w.z2);
      if (t == null || t > far) continue;
      const y = origin.y + dir.y * t;
      if (y < w.y0 || y > w.y1) continue;
      if (!best || t < best.distance) {
        best = { distance: t, point: { x: origin.x + dir.x * t, y, z: origin.z + dir.z * t } };
      }
    }
    return best;
  }

  function castDown(x, z, fromY, far) {
    let best = null;
    for (const s of surfaces) {
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      if (s.y > fromY + 1e-6) continue;
      const drop = fromY - s.y;
      if (drop > far) continue;
      if (!best || drop < best.distance) {
        best = { distance: drop, point: { x, y: s.y, z }, object: s.name };
      }
    }
    return best;
  }

  function walkableAt(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    return x > bounds.x0 && x < bounds.x1 && z > bounds.z0 && z < bounds.z1;
  }

  /** Coarse grid A* (0.2m) with per-step wall traces. */
  function findPath(from, to) {
    const step = gridStep;
    const cols = Math.round((bounds.x1 - bounds.x0) / step) + 1;
    const rows = Math.round((bounds.z1 - bounds.z0) / step) + 1;
    const key = (c, r) => r * cols + c;
    const cx = (c) => bounds.x0 + c * step;
    const cz = (r) => bounds.z0 + r * step;
    const toC = (x) => Math.max(0, Math.min(cols - 1, Math.round((x - bounds.x0) / step)));
    const toR = (z) => Math.max(0, Math.min(rows - 1, Math.round((z - bounds.z0) / step)));

    const start = key(toC(from.x), toR(from.z));
    const goal = key(toC(to.x), toR(to.z));
    const g = new Map([[start, 0]]);
    const prev = new Map();
    const open = [start];
    const closed = new Set();

    const h = (id) => {
      const c = id % cols;
      const r = Math.floor(id / cols);
      return Math.hypot(cx(c) - to.x, cz(r) - to.z);
    };

    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i += 1) {
        if (g.get(open[i]) + h(open[i]) < g.get(open[bi]) + h(open[bi])) bi = i;
      }
      const cur = open.splice(bi, 1)[0];
      if (cur === goal) break;
      closed.add(cur);
      const cc = cur % cols;
      const cr = Math.floor(cur / cols);

      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const nid = key(nc, nr);
        if (closed.has(nid)) continue;
        const nx = cx(nc);
        const nz = cz(nr);
        if (!walkableAt(nx, nz)) continue;
        const px = cx(cc);
        const pz = cz(cr);
        const dist = Math.hypot(nx - px, nz - pz);
        // Blocked if a wall sits inside the body corridor between the cells.
        const dx = (nx - px) / dist;
        const dz = (nz - pz) / dist;
        const nx2 = -dz;
        const nz2 = dx;
        let blocked = false;
        for (const off of [-0.18, 0, 0.18]) {
          const o = { x: px + nx2 * off, y: 0.9, z: pz + nz2 * off };
          if (castRay(o, { x: dx, y: 0, z: dz }, dist - 0.01)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        const tentative = g.get(cur) + dist;
        if (tentative < (g.get(nid) ?? Infinity)) {
          g.set(nid, tentative);
          prev.set(nid, cur);
          if (!open.includes(nid)) open.push(nid);
        }
      }
    }

    if (!g.has(goal)) return [from, to];
    const pts = [];
    let p = goal;
    while (p !== undefined) {
      pts.unshift({ x: cx(p % cols), y: from.y ?? 0, z: cz(Math.floor(p / cols)) });
      p = prev.get(p);
    }
    if (pts.length) pts[0] = { ...from };
    return pts;
  }

  return {
    castRay,
    castDown,
    walkableAt,
    findPath,
    walls,
    surfaces,
    bounds,
    after,
  };
}
