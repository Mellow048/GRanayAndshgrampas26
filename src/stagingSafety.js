/**
 * stagingSafety — geometry-first staging rules for the POV studio.
 *
 * Everything in this module is deliberately dependency-free (plain `{x,y,z}`
 * objects, no THREE import) so the exact same code runs in the browser, in the
 * headless exporter, and in `node --test` against a synthetic house.
 *
 * The module owns the answers to four questions the old framework guessed at:
 *
 *   1. "Is this point inside a body?"        -> capsules + push-out
 *   2. "Where can the camera stand?"         -> ring search + sightline tests
 *   3. "Where does a prop actually rest?"    -> surface snap + overlap search
 *   4. "Does this route cross a wall?"       -> corridor traces + re-route
 *
 * A `world` adapter is injected by the caller. It only needs:
 *   world.castRay(origin, dir, far)   -> {distance, point, object}|null
 *   world.castDown(x, z, fromY, far)  -> {distance, point, object}|null  (optional)
 *   world.walkableAt(x, z)            -> boolean                        (optional)
 *   world.findPath(from, to)          -> [{x,y,z}, ...]                 (optional)
 */

export const BODY = Object.freeze({
  radius: 0.44,
  height: 1.78,
  /** Eye/lens height as a fraction of body height (matches PlayerCamera 1.55/1.78). */
  eyeFraction: 0.87,
  /** Nothing may enter this horizontal ring around a performer. */
  noGoPad: 0.30,
});

const EPS = 1e-6;

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function toVec(v, fallbackY = 0) {
  if (!v) return { x: 0, y: fallbackY, z: 0 };
  return { x: num(v.x), y: num(v.y, fallbackY), z: num(v.z) };
}

export function dist2D(a, b) {
  return Math.hypot(num(a.x) - num(b.x), num(a.z) - num(b.z));
}

export function dist3D(a, b) {
  return Math.hypot(num(a.x) - num(b.x), num(a.y) - num(b.y), num(a.z) - num(b.z));
}

/** Shortest 2D distance from point `p` to segment `a`->`b`. */
export function pointSegmentDistance2D(p, a, b) {
  const ax = num(a.x);
  const az = num(a.z);
  const bx = num(b.x);
  const bz = num(b.z);
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < EPS) return Math.hypot(num(p.x) - ax, num(p.z) - az);
  let t = ((num(p.x) - ax) * dx + (num(p.z) - az) * dz) / lenSq;
  t = clamp(t, 0, 1);
  return Math.hypot(num(p.x) - (ax + dx * t), num(p.z) - (az + dz * t));
}

/* ------------------------------------------------------------------ *
 * 1. Actor capsules
 * ------------------------------------------------------------------ */

/**
 * Builds the collision capsule for an actor-like record.
 * Accepts `{position, height, radius}` or a raw position object.
 */
export function makeCapsule(source, overrides = {}) {
  const pos = source?.position || source?.root?.position || source || {};
  const height = num(overrides.height ?? source?.height, BODY.height);
  return {
    id: overrides.id ?? source?.id ?? null,
    x: num(pos.x),
    y: num(pos.y),
    z: num(pos.z),
    radius: num(overrides.radius ?? source?.radius, BODY.radius),
    height,
    eyeY: num(pos.y) + height * BODY.eyeFraction,
  };
}

/** True when `p` is inside the vertical capsule (plus `pad`). */
export function pointInCapsule(p, cap, pad = 0) {
  const py = num(p.y);
  if (py < cap.y - 0.05 || py > cap.y + cap.height + pad) return false;
  return dist2D(p, cap) < cap.radius + pad;
}

/** True when the 2D segment `a`->`b` passes through the capsule (plus `pad`). */
export function segmentHitsCapsule(a, b, cap, pad = 0) {
  const loY = Math.min(num(a.y), num(b.y));
  const hiY = Math.max(num(a.y), num(b.y));
  if (hiY < cap.y - 0.05 || loY > cap.y + cap.height + pad) return false;
  return pointSegmentDistance2D(cap, a, b) < cap.radius + pad;
}

/**
 * Pushes `pos` out of every capsule it penetrates. Returns the corrected point
 * plus a list of the actors that had to be dodged, so callers can report it.
 */
export function pushOutOfCapsules(pos, capsules, { pad = BODY.noGoPad, world = null, iterations = 8 } = {}) {
  const out = { x: num(pos.x), y: num(pos.y), z: num(pos.z) };
  const dodged = [];
  if (!capsules || capsules.length === 0) return { pos: out, dodged };

  for (let i = 0; i < iterations; i += 1) {
    let moved = false;
    for (const cap of capsules) {
      if (!cap) continue;
      if (out.y > cap.y + cap.height + pad) continue;
      if (out.y < cap.y - 0.35) continue;
      const dx = out.x - cap.x;
      const dz = out.z - cap.z;
      const d = Math.hypot(dx, dz);
      const need = cap.radius + pad;
      if (d >= need - 1e-4) continue;

      // Degenerate case (exactly on the axis): back out along +Z, the way the actor faces.
      const nx = d > 1e-4 ? dx / d : 0;
      const nz = d > 1e-4 ? dz / d : 1;
      const push = need - d + 0.005;

      const candidates = [
        { x: out.x + nx * push, z: out.z + nz * push },
        { x: cap.x + nx * need, z: cap.z + nz * need },
      ];
      // If the straight push lands in a wall, slide around the body.
      for (const angle of [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, Math.PI]) {
        const ca = Math.cos(angle);
        const sa = Math.sin(angle);
        candidates.push({
          x: cap.x + (nx * ca - nz * sa) * need,
          z: cap.z + (nx * sa + nz * ca) * need,
        });
      }

      let chosen = null;
      for (const c of candidates) {
        if (world?.walkableAt && !world.walkableAt(c.x, c.z)) continue;
        chosen = c;
        break;
      }
      if (!chosen) chosen = candidates[0];

      out.x = chosen.x;
      out.z = chosen.z;
      if (!dodged.includes(cap.id ?? cap)) dodged.push(cap.id ?? cap);
      moved = true;
    }
    if (!moved) break;
  }
  return { pos: out, dodged };
}

/* ------------------------------------------------------------------ *
 * 2. Ray helpers / sightlines
 * ------------------------------------------------------------------ */

function normalize(dir) {
  const len = Math.hypot(num(dir.x), num(dir.y), num(dir.z));
  if (len < EPS) return null;
  return { x: num(dir.x) / len, y: num(dir.y) / len, z: num(dir.z) / len };
}

/** Single ray. Returns the hit distance or `null`. */
export function traceRay(world, origin, dir, far) {
  if (!world?.castRay) return null;
  const d = normalize(dir);
  if (!d) return null;
  const hit = world.castRay(origin, d, far);
  if (!hit) return null;
  const distance = num(hit.distance, Infinity);
  return distance <= far + 1e-3 ? { ...hit, distance } : null;
}

/**
 * True when nothing solid sits between `a` and `b`.
 *
 * The segment is traced at the endpoints' own heights plus `heights` offsets,
 * and again at +/- `radius` sideways, so slopes (stairs) and doorframes are
 * handled correctly instead of assuming a flat floor.
 */
export function segmentClear(world, a, b, { radius = 0.18, heights = [0] } = {}) {
  if (!world?.castRay) return true;
  const len = dist3D(a, b);
  if (len < 0.02) return true;
  const dx = num(b.x) - num(a.x);
  const dy = num(b.y) - num(a.y);
  const dz = num(b.z) - num(a.z);
  const horiz = Math.hypot(dx, dz) || 1;
  const nx = -dz / horiz;
  const nz = dx / horiz;
  const offsets = radius > 0.001 ? [-radius, 0, radius] : [0];

  for (const level of heights) {
    for (const offset of offsets) {
      const from = { x: num(a.x) + nx * offset, y: num(a.y) + level, z: num(a.z) + nz * offset };
      const to = { x: num(b.x) + nx * offset, y: num(b.y) + level, z: num(b.z) + nz * offset };
      const sx = to.x - from.x;
      const sy = to.y - from.y;
      const sz = to.z - from.z;
      const segLen = Math.hypot(sx, sy, sz);
      if (segLen < 0.02) continue;
      const hit = traceRay(world, from, { x: sx / segLen, y: sy / segLen, z: sz / segLen }, segLen - 0.04);
      if (hit) return false;
    }
  }
  return true;
}

/** True when the eye->subject line is unobstructed (the lens can actually see). */
export function sightlineClear(world, eye, subject, { radius = 0.1, actors = [], ignoreActorId = null } = {}) {
  if (!segmentClear(world, eye, subject, { radius, heights: [0] })) return false;
  for (const cap of actors) {
    if (!cap || cap.id === ignoreActorId) continue;
    if (segmentHitsCapsule(eye, subject, cap, 0.12)) return false;
  }
  return true;
}

/**
 * True when an opaque house wall/floor slab blocks the eye->target sightline
 * for active `player_look` tracking (leaves a 0.35m margin near `targetPos`
 * and retries +0.14m vertically so handrails/tabletops don't false-trigger).
 */
export function hasTargetLineOfSight(world, eye, targetPos) {
  if (!world?.castRay || !eye || !targetPos) return true;
  const dx = num(targetPos.x) - num(eye.x);
  const dy = num(targetPos.y) - num(eye.y);
  const dz = num(targetPos.z) - num(eye.z);
  const dist = Math.hypot(dx, dy, dz);
  if (dist < 0.45) return true;
  const checkDist = dist - 0.35;
  const dir = { x: dx / dist, y: dy / dist, z: dz / dist };
  const hit = traceRay(world, eye, dir, checkDist);
  if (!hit || hit.distance >= checkDist) return true;
  const hitHi = traceRay(world, { x: num(eye.x), y: num(eye.y) + 0.14, z: num(eye.z) }, dir, checkDist);
  return !hitHi || hitHi.distance >= checkDist;
}

/* ------------------------------------------------------------------ *
 * 3. Camera placement
 * ------------------------------------------------------------------ */

/**
 * Finds a camera point that (a) sits outside every body, (b) is inside the
 * walkable shell, and (c) has an unobstructed view of `eyeTarget`.
 *
 * Instead of one guessed offset it sweeps a ring around the subject and keeps
 * the best legal spot. This is what stops "camera spawns inside Grandpa's neck"
 * and "camera pans through his head".
 */
export function findSafeCameraSpot({
  eyeTarget,
  world = null,
  actors = [],
  props = [],
  subjectId = null,
  preferredDir = null,
  minDist = 1.15,
  maxDist = 3.4,
  preferredDist = 1.85,
  lensHeight = 1.62,
  floorY = 0,
  yawSamples = 24,
  distSamples = [0.35, 0.6, 0.85, 1.0],
  angleWeight = 0.55,
} = {}) {
  if (!eyeTarget) return null;
  const subject = toVec(eyeTarget);
  const preferredYaw = preferredDir
    ? Math.atan2(num(preferredDir.x), num(preferredDir.z))
    : Math.atan2(subject.z === 0 ? 0 : 0, 1);

  const caps = actors.map((a) => (a?.radius ? a : makeCapsule(a)));
  const lenses = [lensHeight, lensHeight + 0.12, Math.max(1.25, lensHeight - 0.2)];
  const clampDist = Math.max(minDist, Math.min(maxDist, preferredDist));

  let best = null;
  const dists = (distSamples || [0.5, 0.75, 1]).map((t) =>
    clamp(clampDist + (maxDist - clampDist) * t - (maxDist - clampDist) * 0.5, minDist, maxDist)
  );

  for (let i = 0; i < yawSamples; i += 1) {
    const yaw = (i / yawSamples) * Math.PI * 2;
    const dx = Math.sin(yaw);
    const dz = Math.cos(yaw);
    for (const dist of dists) {
      for (const y of lenses) {
        const pos = { x: subject.x + dx * dist, y, z: subject.z + dz * dist };

        if (world?.walkableAt && !world.walkableAt(pos.x, pos.z)) continue;
        if (world?.eyeBlocked && world.eyeBlocked(pos)) continue;

        let blocked = false;
        for (const cap of caps) {
          if (cap.id && cap.id === subjectId) continue;
          if (pointInCapsule(pos, cap, 0.22)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;
        for (const p of props) {
          if (p && p.aabb && pointInAabb(pos, p.aabb, 0.08)) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        if (!sightlineClear(world, pos, subject, { radius: 0.08, actors: caps, ignoreActorId: subjectId })) {
          continue;
        }

        // Keep the lens at a sane height above the floor and below the ceiling.
        if (pos.y - floorY < 0.75) continue;
        if (world?.walkableAt && !world.walkableAt(pos.x, pos.z)) continue;

        let yawDiff = Math.abs(((yaw - preferredYaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        yawDiff = Math.abs(yawDiff);
        const distPenalty = Math.abs(dist - clampDist) / Math.max(0.001, maxDist - minDist);
        const heightPenalty = Math.abs(y - lensHeight) * 0.8;
        const score = yawDiff * angleWeight + distPenalty * 0.9 + heightPenalty;

        if (!best || score < best.score) {
          best = { pos, score, dist, yaw, yawDiff, height: y };
        }
      }
    }
  }

  if (best) return best;

  // Fallback: the old behaviour, but still pushed out of bodies.
  const dir = preferredDir || { x: 0, z: 1 };
  const fallback = {
    x: subject.x + num(dir.x) * clampDist,
    y: lensHeight,
    z: subject.z + num(dir.z) * clampDist,
  };
  const { pos, dodged } = pushOutOfCapsules(fallback, caps, { pad: 0.24, world });
  return { pos, score: Infinity, dist: clampDist, yaw: preferredYaw, fallback: true, dodged };
}

/* ------------------------------------------------------------------ *
 * 4. Prop support / overlap
 * ------------------------------------------------------------------ */

export function aabbFrom(position, halfExtents) {
  const p = toVec(position);
  const h = toVec(halfExtents);
  return {
    min: { x: p.x - Math.abs(h.x), y: p.y - Math.abs(h.y), z: p.z - Math.abs(h.z) },
    max: { x: p.x + Math.abs(h.x), y: p.y + Math.abs(h.y), z: p.z + Math.abs(h.z) },
  };
}

export function pointInAabb(p, box, pad = 0) {
  return (
    p.x >= box.min.x - pad &&
    p.x <= box.max.x + pad &&
    p.y >= box.min.y - pad &&
    p.y <= box.max.y + pad &&
    p.z >= box.min.z - pad &&
    p.z <= box.max.z + pad
  );
}

export function aabbOverlap(a, b, pad = 0) {
  return (
    a.min.x < b.max.x + pad &&
    a.max.x > b.min.x - pad &&
    a.min.y < b.max.y + pad &&
    a.max.y > b.min.y - pad &&
    a.min.z < b.max.z + pad &&
    a.max.z > b.min.z - pad
  );
}

/** Highest solid surface below `fromY` at (x,z). */
export function findSupport(world, x, z, fromY, maxDrop = 1.6) {
  if (!world) return null;
  if (typeof world.castDown === "function") {
    const hit = world.castDown(x, z, fromY, maxDrop);
    if (!hit) return null;
    const y = num(hit.point?.y, num(hit.y, num(hit.distance)));
    return Number.isFinite(y) ? { y, object: hit.object || null } : null;
  }
  if (world.castRay) {
    const hit = traceRay(world, { x, y: fromY, z }, { x: 0, y: -1, z: 0 }, maxDrop);
    if (!hit) return null;
    const y = hit.point ? hit.point.y : fromY - hit.distance;
    return { y, object: hit.object || null };
  }
  return null;
}

/**
 * True when a box is boxed in by geometry on all four horizontal sides — i.e.
 * it was spawned *inside* a microwave / cupboard / wall instead of on top of it.
 */
export function isEmbedded(world, center, halfExtents, { pad = 0.02 } = {}) {
  if (!world?.castRay) return false;
  const c = toVec(center);
  const h = toVec(halfExtents);
  const probes = [
    { dir: { x: 1, y: 0, z: 0 }, reach: Math.abs(h.x) + pad },
    { dir: { x: -1, y: 0, z: 0 }, reach: Math.abs(h.x) + pad },
    { dir: { x: 0, y: 0, z: 1 }, reach: Math.abs(h.z) + pad },
    { dir: { x: 0, y: 0, z: -1 }, reach: Math.abs(h.z) + pad },
  ];
  let hits = 0;
  for (const p of probes) {
    if (traceRay(world, c, p.dir, p.reach)) hits += 1;
  }
  return hits === probes.length;
}

/**
 * Resolves where a prop can legally rest:
 *  - snap to the real surface under it (no floating cookie jars),
 *  - refuse to sit inside another prop (no jar clipping through the red button),
 *  - fall back to a nearby free spot on the same surface.
 */
export function resolvePropPlacement({
  world = null,
  desired,
  halfExtents = { x: 0.12, y: 0.12, z: 0.12 },
  others = [],
  maxDrop = 1.6,
  supportTolerance = 0.02,
  searchRadii = [0, 0.12, 0.24, 0.38],
  searchAngles = 12,
  isSpotFree = null,
} = {}) {
  const target = toVec(desired);
  const h = toVec(halfExtents);
  const report = {
    snapped: false,
    supportY: null,
    floating: false,
    nudged: false,
    collisions: [],
    pos: { ...target },
  };

  const support = findSupport(world, target.x, target.z, target.y + Math.abs(h.y) + 0.06, maxDrop);
  let baseY = target.y;
  if (support) {
    baseY = support.y + Math.abs(h.y) + 0.002;
    report.supportY = support.y;
    report.snapped = Math.abs(baseY - target.y) > supportTolerance;
  } else {
    report.floating = true;
  }

  const candidates = [{ x: target.x, z: target.z }];
  for (const radius of searchRadii) {
    if (radius === 0) continue;
    for (let i = 0; i < searchAngles; i += 1) {
      const a = (i / searchAngles) * Math.PI * 2;
      candidates.push({ x: target.x + Math.cos(a) * radius, z: target.z + Math.sin(a) * radius });
    }
  }

  for (const c of candidates) {
    const pos = { x: c.x, y: baseY, z: c.z };
    let supportHere = support;
    if (c !== candidates[0]) {
      supportHere = findSupport(world, c.x, c.z, baseY + Math.abs(h.y) + 0.08, maxDrop);
      if (!supportHere) continue;
      pos.y = supportHere.y + Math.abs(h.y) + 0.002;
      if (Math.abs(pos.y - baseY) > 0.09) continue; // stay on the same shelf
    }
    if (world?.walkableAt && supportHere && !world.walkableAt(c.x, c.z)) continue;

    const box = aabbFrom(pos, h);
    let clash = null;
    for (const other of others) {
      if (!other?.aabb) continue;
      if (aabbOverlap(box, other.aabb, 0.03)) {
        clash = other.id || "prop";
        break;
      }
    }
    if (clash) {
      report.collisions.push(clash);
      continue;
    }
    if (isSpotFree && !isSpotFree(pos, h)) {
      report.collisions.push("geometry");
      report.embedded = true;
      continue;
    }
    report.pos = pos;
    report.nudged = c !== candidates[0];
    return report;
  }

  report.pos = { x: target.x, y: baseY, z: target.z };
  return report;
}

/* ------------------------------------------------------------------ *
 * 5. Route validity
 * ------------------------------------------------------------------ */

/**
 * Validates a polyline against the house. Returns the blocking leg, if any.
 * `radius` is the body half-width; the corridor trace uses it at hip + chest.
 */
export function findBlockedLeg(world, points, { radius = 0.16, ignoreShort = 0.05 } = {}) {
  if (!points || points.length < 2) return null;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    if (dist2D(a, b) < ignoreShort) continue;
    if (!segmentClear(world, a, b, { radius, heights: [0.45, 1.2] })) {
      return { index: i, from: a, to: b };
    }
  }
  return null;
}

/**
 * Returns a path that never crosses a wall.
 *
 * Preference order:
 *   1. the authored stops, if every leg is clear,
 *   2. the authored stops after inserting the house grid path around the first
 *      blocked leg (deterministic A* from assetLoader),
 *   3. straight line (last resort, reported as unresolved).
 */
export function ensureRoute(world, from, stops, { radius = 0.16 } = {}) {
  const start = toVec(from);
  const list = (stops || []).map((s) => toVec(s));
  if (list.length === 0) return { points: [start], inserted: false, unresolved: false };

  const straight = [start, ...list];
  if (!findBlockedLeg(world, straight, { radius })) {
    return { points: straight, inserted: false, unresolved: false };
  }

  if (!world?.findPath) {
    return { points: straight, inserted: false, unresolved: true };
  }

  const out = [start];
  let cursor = start;
  let inserted = false;
  let unresolved = false;

  for (const stop of list) {
    if (!findBlockedLeg(world, [cursor, stop], { radius })) {
      out.push(stop);
      cursor = stop;
      continue;
    }
    const detour = world.findPath(cursor, stop);
    if (!detour || detour.length < 2) {
      out.push(stop);
      unresolved = true;
      cursor = stop;
      continue;
    }
    const pts = detour.map((p) => toVec(p));
    // Skip the duplicated first point, keep the rest.
    for (let i = 1; i < pts.length; i += 1) {
      const prev = out[out.length - 1];
      if (dist2D(prev, pts[i]) < 0.02 && Math.abs(num(prev.y) - num(pts[i].y)) < 0.02) continue;
      out.push(pts[i]);
    }
    inserted = true;
    cursor = out[out.length - 1];
  }

  if (findBlockedLeg(world, out, { radius })) unresolved = true;
  return { points: out, inserted, unresolved };
}

/**
 * Splits a polyline into legs whose `via` stops can be surfaced in the report,
 * e.g. "your move cut the kitchen doorframe, the router added doorway_dining".
 */
export function describeRoute(points) {
  if (!points || points.length < 2) return "0m";
  let total = 0;
  for (let i = 1; i < points.length; i += 1) total += dist2D(points[i - 1], points[i]);
  return `${total.toFixed(2)}m over ${points.length - 1} legs`;
}

/* ------------------------------------------------------------------ *
 * 6. Framing
 * ------------------------------------------------------------------ */

/**
 * Horizontal angle (radians) between the camera forward vector and the vector
 * to the subject. 0 = dead centre.
 */
export function framingError(cameraPos, forward, subjectPos) {
  const dx = num(subjectPos.x) - num(cameraPos.x);
  const dz = num(subjectPos.z) - num(cameraPos.z);
  const len = Math.hypot(dx, dz);
  if (len < EPS) return 0;
  const flen = Math.hypot(num(forward.x), num(forward.z)) || 1;
  const dot = (num(forward.x) / flen) * (dx / len) + (num(forward.z) / flen) * (dz / len);
  return Math.acos(clamp(dot, -1, 1));
}

/** Converts a yaw (Three.js convention, +Z forward) into a unit forward vector. */
export function forwardFromYaw(yaw) {
  return { x: Math.sin(yaw), y: 0, z: Math.cos(yaw) };
}

/* ------------------------------------------------------------------ *
 * 7. Head aim (the "look at me" mechanic)
 * ------------------------------------------------------------------ */

/**
 * Angles that turn a performer's head toward the lens, expressed relative to
 * the body yaw so the neck never breaks: yaw is clamped to `maxYaw` and pitch
 * to `maxPitch`. Pure maths — the three.js layer applies the quaternion.
 *
 *   headPos   {x,y,z} world position of the head bone (or an eye estimate)
 *   targetPos {x,y,z} world position of the camera
 *   bodyYaw   the actor's root yaw in radians (+Z forward)
 */
export function headAimAngles(headPos, targetPos, bodyYaw = 0, { maxYaw = 0.95, maxPitch = 0.42 } = {}) {
  if (!headPos || !targetPos) return { yaw: 0, pitch: 0, distance: 0 };
  const dx = num(targetPos.x) - num(headPos.x);
  const dy = num(targetPos.y) - num(headPos.y);
  const dz = num(targetPos.z) - num(headPos.z);
  const flat = Math.hypot(dx, dz);
  const distance = Math.hypot(flat, dy);
  if (distance < 1e-4) return { yaw: 0, pitch: 0, distance: 0 };

  let yaw = Math.atan2(dx, dz) - num(bodyYaw);
  while (yaw > Math.PI) yaw -= Math.PI * 2;
  while (yaw < -Math.PI) yaw += Math.PI * 2;

  // Rotating about world +X by -atan2(dy, flat) lifts +Z toward the target.
  const pitch = -Math.atan2(dy, flat);

  return {
    yaw: Math.max(-maxYaw, Math.min(maxYaw, yaw)),
    pitch: Math.max(-maxPitch, Math.min(maxPitch, pitch)),
    distance,
    // True when the camera is close enough to the body axis that a head turn
    // alone reads as eye contact (otherwise the shoulders must turn too).
    inCone: Math.abs(yaw) <= maxYaw + 1e-3,
  };
}

/**
 * How much of the head aim to use given the lens distance. A camera inside the
 * head's personal space makes the facing direction pure noise, so the aim eases
 * out below ~0.9m and is fully off at 0.35m.
 */
export function headAimWeight(distance, { full = 0.9, zero = 0.35 } = {}) {
  const d = num(distance);
  if (!Number.isFinite(d)) return 0;
  if (d >= full) return 1;
  if (d <= zero) return 0;
  return (d - zero) / (full - zero);
}

/**
 * One smoothing step toward `goal`, hard-limited to `maxOmega` rad/s so a target
 * flip (or a camera pressed against the face) can never whip the neck.
 */
export function aimStep(current, goal, dt, { easeRate = 9, maxOmega = 4, minDt = 1 / 120 } = {}) {
  const from = num(current);
  const to = num(goal);
  const step = Math.max(num(dt), minDt);
  const next = from + (to - from) * Math.min(1, step * easeRate);
  const maxStep = maxOmega * step;
  return from + Math.max(-maxStep, Math.min(maxStep, next - from));
}

/* ------------------------------------------------------------------ *
 * 8. Prop boxes vs bodies
 * ------------------------------------------------------------------ */

/** True when a capsule-ish body at `from` → `to` would sweep through `box`. */
export function segmentHitsBox(from, to, box, { radius = 0.3 } = {}) {
  if (!box?.min || !box?.max) return false;
  const min = {
    x: box.min.x - radius,
    y: box.min.y,
    z: box.min.z - radius,
  };
  const max = {
    x: box.max.x + radius,
    y: box.max.y,
    z: box.max.z + radius,
  };
  // Slab test on the XZ span; ignore Y unless the body actually reaches it.
  const dx = num(to.x) - num(from.x);
  const dz = num(to.z) - num(from.z);
  let t0 = 0;
  let t1 = 1;
  for (const [origin, dir, lo, hi] of [
    [num(from.x), dx, min.x, max.x],
    [num(from.z), dz, min.z, max.z],
  ]) {
    if (Math.abs(dir) < 1e-6) {
      if (origin < lo || origin > hi) return false;
      continue;
    }
    let a = (lo - origin) / dir;
    let b = (hi - origin) / dir;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}

/** Pushes a standing position out of every prop box it overlaps (XZ only). */
export function pushOutOfBoxes(pos, boxes = [], { pad = 0.12 } = {}) {
  let x = num(pos.x);
  let z = num(pos.z);
  const dodged = [];
  for (let pass = 0; pass < 4; pass += 1) {
    let moved = false;
    for (const box of boxes) {
      if (!box?.min || !box?.max) continue;
      const minX = box.min.x - pad;
      const maxX = box.max.x + pad;
      const minZ = box.min.z - pad;
      const maxZ = box.max.z + pad;
      if (x <= minX || x >= maxX || z <= minZ || z >= maxZ) continue;
      const cx = (minX + maxX) / 2;
      const cz = (minZ + maxZ) / 2;
      const dx = x - cx;
      const dz = z - cz;
      const outX = maxX - cx;
      const outZ = maxZ - cz;
      if (Math.abs(dx) * outZ >= Math.abs(dz) * outX) {
        x = dx >= 0 ? maxX : minX;
      } else {
        z = dz >= 0 ? maxZ : minZ;
      }
      dodged.push(box.id ?? "prop");
      moved = true;
    }
    if (!moved) break;
  }
  return { pos: { x, y: num(pos.y), z }, dodged };
}

/** Unit vector from `from` to `to` in XZ, with a safe fallback. */
export function direction2D(from, to, fallback = { x: 0, z: 1 }) {
  const dx = num(to.x) - num(from.x);
  const dz = num(to.z) - num(from.z);
  const len = Math.hypot(dx, dz);
  if (len < EPS) return { ...fallback };
  return { x: dx / len, z: dz / len };
}

export const stagingSafety = {
  BODY,
  makeCapsule,
  pointInCapsule,
  segmentHitsCapsule,
  pushOutOfCapsules,
  traceRay,
  segmentClear,
  sightlineClear,
  hasTargetLineOfSight,
  findSafeCameraSpot,
  aabbFrom,
  pointInAabb,
  aabbOverlap,
  findSupport,
  isEmbedded,
  resolvePropPlacement,
  findBlockedLeg,
  ensureRoute,
  describeRoute,
  framingError,
  forwardFromYaw,
  direction2D,
  headAimAngles,
  headAimWeight,
  aimStep,
  segmentHitsBox,
  pushOutOfBoxes,
};

export default stagingSafety;
