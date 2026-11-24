/**
 * episodeSafety — the script-level guard rails for POV episodes.
 *
 * `validateEpisode()` inspects an episode JSON *before* a single frame renders
 * and reports (and, where it is deterministic, repairs) the seven classes of
 * failure that used to reach the encoder:
 *
 *   camera spawns inside a body ...... SPAWN_INSIDE_ACTOR / SPAWN_OVERLAP
 *   props float or interpenetrate ..... PROP_FLOATS / PROP_OVERLAP
 *   actors walk through doorframes .... PATH_THROUGH_WALL
 *   the lens passes through a head .... CAMERA_CLIPS_ACTOR / STANDOFF_TOO_CLOSE
 *   dead air / empty framing .......... DEAD_AIR / OFF_CENTER_FRAMING
 *   sound with no matching action ..... SOUND_WITHOUT_ANIM / PROP_STUCK_IN_HAND
 *   reactions facing away ............. REACTION_FACING_AWAY
 *
 * The module is dependency-free (no THREE, no DOM) so the very same rules run
 * in the browser studio, in the headless exporter and in `node --test`.
 */

import {
  BODY,
  dist2D,
  dist3D,
  pointSegmentDistance2D,
  resolvePropPlacement,
  isEmbedded,
} from "./stagingSafety.js";
import { route as planFloorRoute, validateRoute, snap as snapToFloor } from "./nav/houseNav.js";
import { PROP_TYPE_SET, BEAT_TYPE_SET } from "./schema.js";

/* ------------------------------------------------------------------ *
 * Tunables
 * ------------------------------------------------------------------ */

export const STAGING_RULES = Object.freeze({
  /** Minimum gap between two performers at spawn. */
  castSeparation: 1.05,
  /** Minimum gap between the player's eyes and any performer. */
  playerStandoff: 1.15,
  /** Camera may never come closer than this to a performer's head. */
  cameraStandoff: 1.15,
  /** A shot that holds nothing but a static pose for longer than this is dead air. */
  maxDeadAir: 2.5,
  /** A look/turn that swings more than this should be sold with a longer whip-pan. */
  maxSnapAngleDeg: 75,
  /** Vertical offsets above a floor-level waypoint larger than this are treated as floating. */
  floatTolerance: 0.06,
});

/** Prop footprints (metres, half extents) used for overlap checks. */
export const PROP_FOOTPRINTS = Object.freeze({
  cookie_jar: { x: 0.11, y: 0.13, z: 0.11 },
  soda_can: { x: 0.08, y: 0.12, z: 0.08 },
  golden_key: { x: 0.13, y: 0.03, z: 0.06 },
  padlock: { x: 0.09, y: 0.11, z: 0.05 },
  treasure_chest: { x: 0.36, y: 0.28, z: 0.28 },
  emoji_ball: { x: 0.16, y: 0.16, z: 0.16 },
  toy_blaster: { x: 0.1, y: 0.1, z: 0.22 },
  red_button: { x: 0.16, y: 0.07, z: 0.16 },
  delivery_box: { x: 0.34, y: 0.24, z: 0.3 },
  rising_lava: { x: 1.4, y: 0.02, z: 1.4 },
});
const DEFAULT_FOOTPRINT = { x: 0.14, y: 0.12, z: 0.14 };

/** Props that other props are *meant* to sit on / emerge from. */
const CONTAINER_TYPES = new Set(["treasure_chest", "delivery_box"]);

/** Animation cels the rig actually has. */
export const AVAILABLE_ANIMS = Object.freeze([
  "idle",
  "walk",
  "run",
  "run2",
  "sneak",
  "jump",
  "laugh",
  "punch",
  "sit",
  "terrified",
  "panic",
  "hit",
  "look",
  "granny_walk",
]);

/**
 * SFX that promise a visible action. If the cue plays and nobody does anything
 * the audience sees a disembodied noise — exactly the "eating sound, no eating"
 * complaint.
 */
export const CUE_ACTION_RULES = Object.freeze({
  eat: { anims: ["sit", "look", "laugh"], props: ["cookie_jar", "treasure_chest"], label: "an eating beat" },
  granny_laugh: { anims: ["laugh", "punch", "hit", "jump"], label: "a laugh" },
  laugh: { anims: ["laugh", "look"], label: "a laugh" },
  bonk: { anims: ["hit", "punch", "terrified", "panic", "jump"], label: "an impact reaction" },
  explode_meme: { anims: ["terrified", "panic", "jump", "hit", "laugh", "run2"], label: "a panic reaction" },
  vine_boom: { anyAnim: true, label: "a visible reaction" },
  rizz: { anims: ["laugh", "look", "sit", "jump", "punch"], label: "a charm beat" },
});

/** Reactions that must be sold facing the lens. */
const PLAYER_FACING_REACTIONS = new Set(["laugh", "punch", "terrified", "panic", "hit"]);

/** Hand props that should be stowed before a friendly/neutral beat. */
const HAND_WEAPONS = new Set(["shotgun", "bat"]);

const LOCOMOTION = new Set(["walk", "run", "run2", "sneak", "granny_walk", "jump"]);

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */

const round = (v, p = 2) => Math.round(v * 10 ** p) / 10 ** p;
const isDoorway = (name = "") => /doorway|door_|stairs|stair_|landing|hall_center|up_.*door/i.test(name);

export function formatTime(t) {
  const s = Math.max(0, Number(t) || 0);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

function issue(code, severity, at, message, extra = {}) {
  return {
    code,
    severity,
    at: round(Math.max(0, Number(at) || 0), 2),
    time: formatTime(at),
    message,
    ...extra,
  };
}

/** Flattens skits/actions into the same `at` timeline the runner compiles. */
export function flattenBeats(episode) {
  const out = [];
  if (Array.isArray(episode?.skits)) {
    let skitCursor = 0;
    for (const skit of episode.skits) {
      let cursor = skit.startAt ?? skitCursor;
      let maxEnd = cursor;
      const sequential = skit.sync === "sequential";
      for (const beat of skit.beats || []) {
        let at = cursor;
        if (typeof beat.at === "number") at = beat.at;
        else if (typeof beat.after === "number") at = cursor + beat.after;
        const duration = Math.max(0, Number(beat.duration) || 0);
        const awaited = beat.await === true || beat.sync === "sequential" || sequential;
        out.push({ ...beat, at, duration, await: awaited, skit: skit.name || "", _src: beat });
        cursor = at;
        maxEnd = Math.max(maxEnd, at + (awaited ? 0 : duration));
      }
      skitCursor = maxEnd;
    }
  }
  if (Array.isArray(episode?.actions)) {
    for (const act of episode.actions) {
      out.push({ ...act, at: Number(act.at) || 0, duration: Math.max(0, Number(act.duration) || 0), skit: "actions", _src: act });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/* ------------------------------------------------------------------ *
 * Nav-graph doorway routing (geometry-free)
 * ------------------------------------------------------------------ */

function graphNeighbors(navGraph, id) {
  const node = navGraph?.[id];
  if (!node) return [];
  if (Array.isArray(node.neighbors)) return node.neighbors;
  return [];
}

/**
 * Shortest chain of waypoint ids between two named waypoints, computed on the
 * authored nav graph. Used to teach the author which `via` stops a room change
 * needs, and to auto-insert them.
 */
export function doorwayChain(setMap, navGraph, fromName, toName) {
  if (!setMap?.[fromName] || !setMap?.[toName]) return null;
  if (fromName === toName) return [];

  const dist = new Map([[fromName, 0]]);
  const prev = new Map();
  const open = new Set([fromName]);

  const nodeDist = (id) => {
    const n = navGraph?.[id] || setMap[id];
    return n ? { x: n.x, y: n.y ?? 0, z: n.z } : null;
  };

  while (open.size) {
    let u = null;
    let best = Infinity;
    for (const id of open) {
      const d = dist.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        u = id;
      }
    }
    if (!u || best === Infinity) break;
    open.delete(u);
    if (u === toName) break;

    for (const v of graphNeighbors(navGraph, u)) {
      const a = nodeDist(u);
      const b = nodeDist(v);
      if (!a || !b) continue;
      const alt = best + dist3D(a, b);
      if (alt < (dist.get(v) ?? Infinity)) {
        dist.set(v, alt);
        prev.set(v, u);
        open.add(v);
      }
    }
  }

  if (!dist.has(toName)) return null;
  const chain = [];
  let cur = toName;
  while (cur !== undefined) {
    chain.unshift(cur);
    cur = prev.get(cur);
  }
  return chain;
}

/** Intermediate waypoints worth naming in `via` (doorways, stairs, landings). */
export function suggestedVia(setMap, navGraph, fromName, toName) {
  const chain = doorwayChain(setMap, navGraph, fromName, toName);
  if (!chain || chain.length <= 2) return [];
  return chain.slice(1, -1);
}

/* ------------------------------------------------------------------ *
 * Validator
 * ------------------------------------------------------------------ */

/**
 * @param {object} episode  raw episode JSON
 * @param {object} options  { setMap, navGraph, autoFix, world?, supportProbe? }
 * @returns {{ issues: object[], episode: object, stats: object }}
 */
export function validateEpisode(episode, options = {}) {
  const {
    setMap = {},
    navGraph = {},
    autoFix = true,
    world = null,
    rules = STAGING_RULES,
  } = options;

  if (!episode || typeof episode !== "object") {
    return { issues: [], episode, stats: { errors: 0, warnings: 0, fixed: 0 } };
  }

  /** Deep clone so repairs never mutate the caller's JSON mid-flight. */
  const ep = JSON.parse(JSON.stringify(episode));
  const issues = [];
  const resolved = (name) => (name && setMap[name] ? setMap[name] : null);

  const cast = Array.isArray(ep.cast) ? ep.cast : [];
  const props = Array.isArray(ep.props) ? ep.props : [];
  const beats = flattenBeats(ep);

  const sourceOf = (beat) => beat?._src || beat;

  /** Writes a repair back onto both the compiled beat and the authored JSON. */
  function patchBeat(beat, changes) {
    Object.assign(beat, changes);
    const src = sourceOf(beat);
    if (src && src !== beat) Object.assign(src, changes);
  }

  /** Inserts a beat before `beat` in the authored array. */
  function insertBefore(beat, newBeat) {
    const anchor = sourceOf(beat);
    for (const skit of ep.skits || []) {
      const list = skit.beats || [];
      const idx = list.indexOf(anchor);
      if (idx >= 0) {
        list.splice(idx, 0, newBeat);
        return true;
      }
    }
    return false;
  }

  /**
   * Plans a lateral detour waypoint for a walk whose straight leg passes through
   * a performer. Prefers a real set waypoint, so the detour also stays inside the
   * collision-free spine — no teleporting, no walking through walls to dodge.
   */
  function detourVia(startPos, endWp, obstacle, legs, { lateral = 0.9, maxExtra = 2.6, clearance = 1.0 } = {}) {
    const dx = endWp.x - startPos.x;
    const dz = endWp.z - startPos.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.4) return null;
    const ux = dx / len;
    const uz = dz / len;

    // Closest point on the offending leg to the obstacle, then step sideways.
    let bestOnLeg = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const [a, b] of legs) {
      const vx = b.x - a.x;
      const vz = b.z - a.z;
      const vv = vx * vx + vz * vz || 1;
      let t = ((obstacle.x - a.x) * vx + (obstacle.z - a.z) * vz) / vv;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + vx * t;
      const pz = a.z + vz * t;
      const d = Math.hypot(obstacle.x - px, obstacle.z - pz);
      if (d < bestDist) {
        bestDist = d;
        bestOnLeg = { x: px, z: pz };
      }
    }
    if (!bestOnLeg) return null;

    // Sideways direction, on whichever side the obstacle is NOT.
    let sideX = -uz;
    let sideZ = ux;
    const awayX = bestOnLeg.x - obstacle.x;
    const awayZ = bestOnLeg.z - obstacle.z;
    if (sideX * awayX + sideZ * awayZ < 0) {
      sideX = -sideX;
      sideZ = -sideZ;
    }

    const ideal = { x: bestOnLeg.x + sideX * lateral, z: bestOnLeg.z + sideZ * lateral };
    const baseLen = Math.hypot(endWp.x - startPos.x, endWp.z - startPos.z);

    let best = null;
    let bestCost = Number.POSITIVE_INFINITY;
    for (const [name, wp] of Object.entries(setMap || {})) {
      if (!wp) continue;
      if (Math.abs((wp.y ?? 0) - (startPos.y ?? 0)) > 0.6) continue;
      const toIdeal = Math.hypot(wp.x - ideal.x, wp.z - ideal.z);
      if (toIdeal > 2.2) continue;
      if (Math.hypot(wp.x - obstacle.x, wp.z - obstacle.z) < clearance) continue;
      if (Math.hypot(wp.x - startPos.x, wp.z - startPos.z) < 0.5) continue;
      const extra =
        Math.hypot(wp.x - startPos.x, wp.z - startPos.z) + Math.hypot(endWp.x - wp.x, endWp.z - wp.z) - baseLen;
      if (extra > maxExtra || extra < -0.05) continue;
      const cost = toIdeal + extra * 0.5;
      if (cost < bestCost) {
        bestCost = cost;
        best = { name, wp };
      }
    }
    return best;
  }

  /**
   * Picks a waypoint that clears every leg of `legs` by `clearance` metres and is
   * on the same floor as `from`. Used to repair "a performer is standing in the
   * path of the lens": the performer steps aside instead of the camera dodging.
   */
  function clearStepAside(from, legs, { clearance = 1.15, maxHop = 4.5 } = {}) {
    let best = null;
    for (const [name, wp] of Object.entries(setMap || {})) {
      if (!wp) continue;
      if (Math.abs((wp.y ?? 0) - (from.y ?? 0)) > 0.6) continue;
      const hop = Math.hypot(wp.x - from.x, wp.z - from.z);
      if (hop < 0.45 || hop > maxHop) continue;
      if (!legs.every(([a, b]) => pointSegmentDistance2D(wp, a, b) >= clearance)) continue;
      if (!best || hop < best.hop) best = { name, wp, hop };
    }
    return best;
  }

  /** Inserts a beat right after `beat` in the authored array. */
  function insertAfter(beat, newBeat) {
    const anchor = sourceOf(beat);
    for (const skit of ep.skits || []) {
      const list = skit.beats || [];
      const idx = list.indexOf(anchor);
      if (idx >= 0) {
        list.splice(idx + 1, 0, newBeat);
        return true;
      }
    }
    return false;
  }

  /** Last actor that performed an animation before `time` (the cue's owner). */
  function lastPerformingActor(time) {
    const prior = beats
      .filter((b) => b.at <= time + 0.01 && (b.type === "char_anim" || b.type === "char_face") && b.actor)
      .sort((a, b) => b.at - a.at);
    if (prior[0]) return prior[0].actor;
    return cast[0]?.id || null;
  }

  function appendBeat(newBeat) {
    const skit = ep.skits?.[ep.skits.length - 1];
    if (!skit) return false;
    skit.beats = skit.beats || [];
    skit.beats.push(newBeat);
    return true;
  }

  const fixNote = (applied, description) => ({ applied: Boolean(applied), fix: description });

  /* ---------------- 1. Cast / player spawn safety ---------------- */

  const spawns = [];
  for (const entry of cast) {
    const wp = resolved(entry.spawn);
    if (!wp) {
      issues.push(
        issue("UNKNOWN_SPAWN", "error", 0, `Cast "${entry.id}" spawns at unknown waypoint "${entry.spawn}".`, {
          actor: entry.id,
          ...fixNote(false, "Use a name from SET_MAP."),
        })
      );
      continue;
    }
    spawns.push({ id: entry.id, x: wp.x, y: wp.y ?? 0, z: wp.z, name: entry.spawn });
  }

  const playerSpawnName = ep.playerSpawn || "back_hall";
  const playerSpawnWp = resolved(playerSpawnName);
  if (playerSpawnWp) {
    const eye = { x: playerSpawnWp.x, y: (playerSpawnWp.y ?? 0) + BODY.height * BODY.eyeFraction, z: playerSpawnWp.z };
    for (const s of spawns) {
      // Different floor = different room: an XZ-only distance is meaningless
      // (the upstairs bedroom sits directly above the dining table).
      if (Math.abs((s.y ?? 0) - (playerSpawnWp.y ?? 0)) > 1.2) continue;
      const gap = Math.hypot(s.x - eye.x, s.z - eye.z);
      const hardHit = gap < BODY.radius + 0.14;
      if (gap < rules.playerStandoff) {
        // Repair: choose the nearest waypoint that is clear of every cast spawn.
        let repair = null;
        if (autoFix && hardHit) {
          let best = Infinity;
          for (const [name, wp] of Object.entries(setMap)) {
            if (Math.abs((wp.y ?? 0) - (playerSpawnWp.y ?? 0)) > 0.4) continue;
            if (!Number.isFinite(wp.x) || !Number.isFinite(wp.z)) continue;
            if ((wp.y ?? 0) < -0.01 || (wp.y ?? 0) > 0.2) continue; // same floor only
            if (/lava|void|origin/i.test(name)) continue;            // never pick a gag/decor anchor
            const clear = spawns.every((c) => Math.hypot(c.x - wp.x, c.z - wp.z) >= rules.playerStandoff + 0.15);
            if (!clear) continue;
            const d = Math.hypot(wp.x - playerSpawnWp.x, wp.z - playerSpawnWp.z);
            if (d > 0.05 && d < best) {
              best = d;
              repair = name;
            }
          }
          if (repair) ep.playerSpawn = repair;
        }
        issues.push(
          issue(
            hardHit ? "SPAWN_INSIDE_ACTOR" : "SPAWN_TOO_CLOSE",
            hardHit ? "error" : "warn",
            0,
            hardHit
              ? `Player spawn "${playerSpawnName}" is ${gap.toFixed(2)}m from ${s.id} — the lens starts inside the body (minimum ${rules.playerStandoff}m).`
              : `Player spawn "${playerSpawnName}" is ${gap.toFixed(2)}m from ${s.id} — uncomfortably close (standoff ${rules.playerStandoff}m).`,
            {
              actor: s.id,
              ...fixNote(
                Boolean(repair),
                repair
                  ? `playerSpawn moved to "${repair}" (${dist2D(setMap[repair], playerSpawnWp).toFixed(2)}m away, clear of all cast).`
                  : "Move playerSpawn at least 1.15m away from every cast spawn."
              ),
            }
          )
        );
      }
    }
  }

  for (let i = 0; i < spawns.length; i += 1) {
    for (let j = i + 1; j < spawns.length; j += 1) {
      if (Math.abs((spawns[i].y ?? 0) - (spawns[j].y ?? 0)) > 1.2) continue;
      const gap = Math.hypot(spawns[i].x - spawns[j].x, spawns[i].z - spawns[j].z);
      if (gap < rules.castSeparation) {
        issues.push(
          issue(
            "SPAWN_OVERLAP",
            "warn",
            0,
            `${spawns[i].id} and ${spawns[j].id} spawn ${gap.toFixed(2)}m apart and will interpenetrate (separation ${rules.castSeparation}m).`,
            { ...fixNote(false, "Give one of them a different spawn waypoint.") }
          )
        );
      }
    }
  }

  /* ---------------- 2. Prop placement ---------------- */

  const placed = [];
  for (const def of props) {
    const wp = resolved(def.spawn);
    const half = PROP_FOOTPRINTS[def.type] || DEFAULT_FOOTPRINT;
    if (!wp) {
      issues.push(
        issue("UNKNOWN_PROP_SPAWN", "error", 0, `Prop "${def.id}" spawns at unknown waypoint "${def.spawn}".`, {
          prop: def.id,
          ...fixNote(false, "Use a name from SET_MAP."),
        })
      );
      continue;
    }

    const baseY = wp.y ?? 0;
    const yOffset = Number(def.yOffset) || 0;
    const floorLevel = baseY < 0.2;
    const isLava = def.type === "rising_lava";

    if (!isLava) {
      const floating = floorLevel && yOffset > rules.floatTolerance;
      const hovering = !floorLevel && Math.abs(yOffset) > 0.25;
      if (floating || hovering) {
        let applied = false;
        if (autoFix) {
          delete def.yOffset;
          applied = true;
        }
        issues.push(
          issue(
            "PROP_FLOATS",
            "error",
            0,
            floating
              ? `Prop "${def.id}" sits ${yOffset.toFixed(2)}m above the floor at "${def.spawn}" with nothing under it.`
              : `Prop "${def.id}" floats ${yOffset.toFixed(2)}m above the "${def.spawn}" surface.`,
            {
              prop: def.id,
              ...fixNote(
                applied,
                applied
                  ? "Removed yOffset; the prop now snaps to the real surface under it at runtime."
                  : "Spawn it on a surface waypoint (e.g. kitchen_counter_top) or drop yOffset so staging can snap it."
              ),
            }
          )
        );
      }
    }

    const desired = {
      x: wp.x + (Number(def.spawnOffset?.x) || 0),
      y: baseY + (Number(def.yOffset) || 0),
      z: wp.z + (Number(def.spawnOffset?.z) || 0),
    };
    let finalPos = desired;
    // `seat: false` props sit on something that is not house geometry (a fridge
    // shelf, a held hand) — their height is authored, do not probe the floor.
    if (def.seat === false) continue;

    if (world && !isLava) {
      // Second opinion with real geometry: the runtime pass is authoritative.
      const snap = resolvePropPlacement({
        world,
        desired,
        halfExtents: half,
        others: placed,
        isSpotFree: (pos, h) => !isEmbedded(world, pos, h),
      });
      finalPos = snap.pos;
      // NOTE: never write the snapped height back into `yOffset` — comedyProps
      // treats position.y as the mesh ORIGIN, while this pass works in centre
      // space, so persisting it lifted every table prop by its own half-height.
      if (autoFix && snap.nudged) {
        def.spawnOffset = {
          x: round(snap.pos.x - wp.x, 3),
          z: round(snap.pos.z - wp.z, 3),
        };
      }
      if (snap.embedded && !snap.nudged) {
        issues.push(
          issue(
            "PROP_INSIDE_GEOMETRY",
            "error",
            0,
            `Prop "${def.id}" is spawned inside solid furniture at "${def.spawn}" (microwave / cupboard / wall).`,
            {
              prop: def.id,
              ...fixNote(false, "Move it to an open surface waypoint, or add a spawnOffset away from the furniture."),
            }
          )
        );
      }
      if (snap.floating) {
        issues.push(
          issue("PROP_NO_SUPPORT", "error", 0, `No surface found under "${def.id}" at "${def.spawn}" — it hangs in mid-air.`, {
            prop: def.id,
            ...fixNote(false, "Place it on a counter/table waypoint (kitchen_counter_top, dining_table_top…)."),
          })
        );
      } else if (snap.snapped || snap.nudged) {
        issues.push(
          issue(
            "PROP_REPOSITIONED",
            "info",
            0,
            `${def.id} was re-seated ${snap.snapped ? `to y=${round(snap.pos.y)}` : "aside to clear another prop"}.`,
            { prop: def.id, ...fixNote(true, "Staging snapped it to the real support surface.") }
          )
        );
      }
    }

    let box = aabbFromSafe(finalPos, half);
    for (const other of placed) {
      // A padlock on a chest or a button inside a box is stacking, not clipping.
      if (CONTAINER_TYPES.has(def.type) || other.type === undefined || CONTAINER_TYPES.has(other.type)) continue;

      const overlaps = (a, b) =>
        a.min.x < b.max.x - 0.015 &&
        a.max.x > b.min.x + 0.015 &&
        a.min.y < b.max.y - 0.015 &&
        a.max.y > b.min.y + 0.015 &&
        a.min.z < b.max.z - 0.015 &&
        a.max.z > b.min.z + 0.015;

      if (!overlaps(box, other.aabb)) continue;

      let applied = false;
      let note = `Move "${def.id}" to a different surface or waypoint.`;
      if (autoFix) {
        // Slide it clear along the roomiest axis and remember the offset.
        const shiftX = half.x + other.half.x + 0.07;
        const shiftZ = half.z + other.half.z + 0.07;
        const useX = shiftX <= shiftZ;
        const off = useX ? { x: shiftX, z: 0 } : { x: 0, z: shiftZ };
        def.spawnOffset = off;
        finalPos = { x: finalPos.x + off.x, y: finalPos.y, z: finalPos.z + off.z };
        box = aabbFromSafe(finalPos, half);
        applied = !overlaps(box, other.aabb);
        note = `Offset "${def.id}" by ${useX ? "x" : "z"} ${(useX ? shiftX : shiftZ).toFixed(2)}m (spawnOffset) so it sits beside "${other.id}".`;
      }

      issues.push(
        issue(
          "PROP_OVERLAP",
          "error",
          0,
          `Props "${other.id}" and "${def.id}" occupy the same space at "${def.spawn}" — they will clip through each other.`,
          { prop: def.id, ...fixNote(applied, note) }
        )
      );
    }
    placed.push({ id: def.id, type: def.type, half, aabb: box });
  }

  /* ---------------- 3. Move routing ---------------- */

  const actorState = new Map();
  for (const entry of cast) {
    const wp = resolved(entry.spawn);
    if (wp) actorState.set(entry.id, { x: wp.x, y: wp.y ?? 0, z: wp.z, name: entry.spawn });
  }
  let playerState = playerSpawnWp ? { x: playerSpawnWp.x, y: playerSpawnWp.y ?? 0, z: playerSpawnWp.z, name: playerSpawnName } : null;

  const movesByActor = new Map();
  for (const beat of beats) {
    const type = beat.type;

    // Scene cuts teleport performers/player — keep the tracked positions honest
    // so later route checks do not compare against a room they already left.
    if (type === "char_cut" && beat.actor) {
      const wp = resolved(beat.to || beat.target);
      if (wp) actorState.set(beat.actor, { x: wp.x, y: wp.y ?? 0, z: wp.z });
      continue;
    }
    if (type === "cut" || type === "player_cut") {
      const wp = resolved(beat.to || beat.target || beat.spawn);
      if (wp) playerState = { x: wp.x, y: wp.y ?? 0, z: wp.z };
      continue;
    }

    const isMove = type === "char_move" || type === "move";
    const isWalk = type === "player_walk";
    const isRide = type === "player_ride";
    if (!isMove && !isWalk && !isRide) continue;

    if (isRide) {
      const route = Array.isArray(beat.path) ? beat.path : [];
      for (const ref of route) {
        if (typeof ref === "string" && !resolved(ref)) {
          issues.push(issue("UNKNOWN_MOVE_TARGET", "error", beat.at, `Player ride uses unknown waypoint "${ref}".`, { ...fixNote(false, "Use a name from SET_MAP.") }));
        }
      }
      const lastRef = route.at(-1);
      const last = resolved(lastRef);
      if (last) playerState = { x: last.x, y: last.y ?? 0, z: last.z, name: typeof lastRef === "string" ? lastRef : undefined };
      movesByActor.set("__player", beat);
      continue;
    }

    const key = isWalk ? "__player" : beat.actor;
    const prev = movesByActor.get(key);
    if (prev && beat.at < prev.at + prev.duration - 0.05) {
      issues.push(
        issue(
          "MOVE_CONFLICT",
          "warn",
          beat.at,
          `${isWalk ? "The player" : beat.actor} is given a new move at ${formatTime(beat.at)} while the previous one (${formatTime(prev.at)}) is still running.`,
          { actor: beat.actor, ...fixNote(false, "Space the moves apart or mark the first as instant.") }
        )
      );
    }
    movesByActor.set(key, beat);

    const fromName = beat.from || (isWalk ? playerState?.name : actorState.get(beat.actor)?.name);
    let toName = typeof beat.to === "string" ? beat.to : null;
    const startPos = resolved(fromName) || (isWalk ? playerState : actorState.get(beat.actor));
    let plannedRoute = null;
    let endWp = toName ? resolved(toName) : null;

    if (toName && !endWp && !actorState.has(toName)) {
      issues.push(
        issue("UNKNOWN_MOVE_TARGET", "error", beat.at, `${beat.actor || "Player"} is told to move to unknown waypoint "${toName}".`, {
          actor: beat.actor,
          ...fixNote(false, "Use a name from SET_MAP."),
        })
      );
    }

    // Player walks that aim at an actor: enforce a real standoff (this applies
    // whether the beat names a `to` waypoint or approaches the target directly).
    if (isWalk && beat.target && !beat.to) {
      const standoff = Number(beat.standoff ?? 0.8);
      if (standoff < rules.cameraStandoff) {
        let applied = false;
        if (autoFix) {
          patchBeat(beat, { standoff: rules.cameraStandoff });
          applied = true;
        }
        issues.push(
          issue(
            "STANDOFF_TOO_CLOSE",
            "error",
            beat.at,
            `player_walk standoff ${standoff.toFixed(2)}m from "${beat.target}" puts the lens inside the body (minimum ${rules.cameraStandoff}m).`,
            {
              ...fixNote(
                applied,
                applied ? `standoff raised to ${rules.cameraStandoff}m.` : `Use standoff: ${rules.cameraStandoff}.`
              ),
            }
          )
        );
      }
    }

    // Aiming a *walk* at furniture you are supposed to stand next to (a counter top,
    // a table top) can never succeed: there is no floor up there. Retarget the move
    // to the surface's authored `approach` waypoint instead of failing the episode.
    if (isWalk && endWp && endWp.elevated && endWp.approach && resolved(endWp.approach)) {
      const approachName = endWp.approach;
      const approachWp = resolved(approachName);
      let applied = false;
      if (autoFix) {
        patchBeat(beat, { to: approachName });
        applied = true;
        endWp = approachWp;
      }
      issues.push(
        issue(
          "SURFACE_NOT_WALKABLE",
          "error",
          beat.at,
          `${beat.actor || "Player"} is told to walk onto "${toName}", which is ${endWp.elevated ? "elevated furniture" : "not floor"} — nobody can stand there.`,
          {
            actor: beat.actor,
            ...fixNote(
              applied,
              applied
                ? `Walk target retargeted to its approach waypoint "${approachName}".`
                : `Walk to "${approachName}" and reach for the surface instead.`
            ),
            applied,
          }
        )
      );
    }

    if (startPos && endWp) {
      // ---- Real floor gate -------------------------------------------------
      // Every walk is planned on the baked surface of the actual house, so a
      // route can only follow floor that exists. If no such route exists the
      // character would have to fly, and that is an error, not a style note.
      if (isWalk) {
        // A player waking on a declared elevated surface may step to its
        // authored approach waypoint before joining the floor nav; validate
        // the traversable floor segment from that approach rather than
        // incorrectly demanding a floor polygon underneath the mattress.
        const authoredStart = fromName ? resolved(fromName) : null;
        const routeStart = authoredStart?.elevated && authoredStart.approach
          ? (resolved(authoredStart.approach) || startPos)
          : startPos;
        const planned = planFloorRoute(routeStart, endWp);
        plannedRoute = planned;
        if (!planned) {
          issues.push(
            issue(
              "NO_WALKABLE_ROUTE",
              "error",
              beat.at,
              `No floor route from "${fromName || "here"}" to "${toName}" — the only way there is through a wall, off a ledge or up a staircase this house does not have.`,
              { actor: beat.actor, ...fixNote(false, "Pick a target on the same floor, or add the missing geometry.") }
            )
          );
        } else {
          const problems = validateRoute(planned);
          if (problems.length) {
            const first = problems[0];
            issues.push(
              issue(
                "ROUTE_OFF_FLOOR",
                "error",
                beat.at,
                `The route to "${toName}" leaves the floor (${problems.length} samples, first at ${first.kind.toLowerCase()} near x=${first.x.toFixed(1)}, z=${first.z.toFixed(1)}).`,
                { actor: beat.actor, ...fixNote(false, "Re-bake the nav or move the waypoint onto real floor.") }
              )
            );
          }
          // The endpoint must actually sit on floor.
          const snapped = snapToFloor(endWp.x, endWp.z, endWp.y ?? 0);
          if (!snapped || Math.hypot(snapped.x - endWp.x, snapped.z - endWp.z) > 0.6) {
            issues.push(
              issue(
                "WAYPOINT_OFF_FLOOR",
                "warn",
                beat.at,
                `"${toName}" is ${snapped ? Math.hypot(snapped.x - endWp.x, snapped.z - endWp.z).toFixed(1) + "m" : "well"} away from any standable floor.`,
                { actor: beat.actor, ...fixNote(false, "Snap the waypoint to the baked floor.") }
              )
            );
          }
        }
      }

      const straight = Math.hypot(endWp.x - startPos.x, endWp.z - startPos.z);
      const chain = doorwayChain(setMap, navGraph, fromName, toName);
      let graphLen = 0;
      if (chain) {
        for (let i = 1; i < chain.length; i += 1) {
          const a = resolved(chain[i - 1]) || navGraph[chain[i - 1]];
          const b = resolved(chain[i]) || navGraph[chain[i]];
          if (a && b) graphLen += Math.hypot(b.x - a.x, b.z - a.z);
        }
      }
      const viaNames = Array.isArray(beat.via) ? beat.via : [];
      const missingDoorway =
        chain && chain.length > 2 && graphLen > straight * 1.12 && viaNames.length === 0;

      if (missingDoorway && !plannedRoute) {
        // Prefer the doorway-named stops (readable `via`), but fall back to the
        // whole inter-room chain when the path never passes a named doorway.
        const doorwayStops = chain.slice(1, -1).filter((n) => isDoorway(n));
        const needed = doorwayStops.length ? doorwayStops : chain.slice(1, -1);
        let applied = false;
        if (autoFix && needed.length) {
          patchBeat(beat, { via: needed });
          applied = true;
        }
        issues.push(
          issue(
            "PATH_THROUGH_WALL",
            "error",
            beat.at,
            `${beat.actor || "Player"} routes "${fromName}" → "${toName}" in a straight line (${straight.toFixed(1)}m) instead of the ${graphLen.toFixed(1)}m doorway chain — it will cut the wall/doorframe.`,
            {
              actor: beat.actor,
              ...fixNote(
                applied,
                applied
                  ? `Inserted via: [${needed.map((n) => `"${n}"`).join(", ")}].`
                  : `Add via: [${needed.map((n) => `"${n}"`).join(", ")}].`
              ),
            }
          )
        );
      }

      // Does any leg of the route pass through a performer standing on it?
      // Test the real via chain, not the straight line from start to finish —
      // a doorway detour is exactly how you avoid walking through somebody.
      const legs = [];
      if (plannedRoute && plannedRoute.length >= 2) {
        // Measure against the path the character will really walk.
        for (let i = 1; i < plannedRoute.length; i += 1) {
          legs.push([plannedRoute[i - 1], plannedRoute[i]]);
        }
      } else {
        let prev = startPos;
        for (const name of Array.isArray(beat.via) ? beat.via : []) {
          const wp = resolved(name);
          if (!wp) continue;
          legs.push([prev, wp]);
          prev = wp;
        }
        legs.push([prev, endWp]);
      }
      for (const [id, state] of actorState) {
        if (id === beat.actor) continue;
        if (Math.abs((state.y ?? 0) - (startPos.y ?? 0)) > 1.2) continue;
        const d = legs.reduce(
          (min, [a, b]) => Math.min(min, pointSegmentDistance2D(state, a, b)),
          Number.POSITIVE_INFINITY
        );
        const travelled = legs.some(([a, b]) => Math.hypot(b.x - a.x, b.z - a.z) > 0.3);
        if (d < BODY.radius + 0.12 && travelled) {
          // Severity is error, not warn: this is literally "a body walks into the
          // lens", which viewers read as being shoved. The 2:30 episode shipped
          // with eight of these as warnings and looked broken.
          // The runtime pushes the cast out of the lens's personal space
          // (episodeRunner step 4b), so repairs here are authoring advice: only a
          // deep overlap is unrecoverable, because by then the lens is already
          // inside a body on the frame it happens.
          // Advice, not a build failure: the runtime steps the cast out of the
          // lens's personal space, and `export-video.mjs --probe` measures the
          // result (lens-to-body distance per frame) and fails the build on it.
          // A static path check cannot model those yields, which is why trying
          // to "repair" crossings here just moved the collision elsewhere.
          const deep = d < 0.3;
          let applied = false;
          let note = deep
            ? "The lens ends up inside a body here: route the walker around this performer or move them first."
            : "Grazing distance; the runtime steps the performer aside, but staging the walk around them reads better.";
          if (autoFix && endWp && Math.hypot(endWp.x - state.x, endWp.z - state.z) < 0.5) {
            // The walk ENDS on top of the performer — no detour can fix that, the
            // destination itself is occupied. Stop a conversational distance
            // away instead: in POV, walking up to someone means standing in front
            // of them, not inside them.
            let target = null;
            let bestCost = Number.POSITIVE_INFINITY;
            for (const [name, wp] of Object.entries(setMap || {})) {
              if (!wp) continue;
              if (Math.abs((wp.y ?? 0) - (endWp.y ?? 0)) > 0.6) continue;
              if (Math.hypot(wp.x - state.x, wp.z - state.z) < 0.95) continue;
              const drift = Math.hypot(wp.x - endWp.x, wp.z - endWp.z);
              if (drift > 3.0 || drift < 0.2) continue;

              if (drift < bestCost) {
                bestCost = drift;
                target = { name, wp };
              }
            }
            if (target) {
              // Route legally to the new destination: if it is across a room
              // boundary, name the doorway chain in `via` so the repair cannot
              // introduce a PATH_THROUGH_WALL of its own.
              const chain = fromName ? suggestedVia(setMap, navGraph, fromName, target.name) : [];
              const existingVia = Array.isArray(beat.via) ? beat.via : [];
              const via = chain.length ? [...chain, ...existingVia] : existingVia;
              patchBeat(beat, {
                to: target.name,
                target: target.name,
                ...(via.length ? { via } : {}),
              });
              endWp = target.wp;
              toName = target.name;
              applied = true;
              note = `Retargeted this walk to "${target.name}" — it used to finish on top of ${id}.`;
            }
          }
          if (!applied && autoFix && endWp) {
            const detour = detourVia(startPos, endWp, state, legs);
            if (detour) {
              const existing = Array.isArray(beat.via) ? beat.via : [];
              if (!existing.includes(detour.name)) {
                // Insert by progress along the route so the detour happens in place.
                const route = [...existing, detour.name];
                patchBeat(beat, { via: route });
                applied = true;
                note = `Added via "${detour.name}" to walk around ${id}.`;
              }
            }
          }
          issues.push(
            issue(
              "CAMERA_CLIPS_ACTOR",
              "warn",
              beat.at,
              `${isWalk ? "The player's route" : `${beat.actor}'s route`} passes within ${d.toFixed(2)}m of ${id} — the lens can pass through the body.`,
              { actor: id, ...fixNote(applied, note) }
            )
          );
        }
      }
    }

    // Track state for the next leg.
    if (endWp) {
      const viaPositions = (beat.via || []).map((n) => resolved(n)).filter(Boolean);
      const lastVia = viaPositions[viaPositions.length - 1];
      const state = {
        x: endWp.x,
        y: endWp.y ?? 0,
        z: endWp.z,
        name: toName,
        lastViaX: lastVia?.x ?? startPos?.x,
        lastViaZ: lastVia?.z ?? startPos?.z,
      };
      if (isWalk) playerState = state;
      else actorState.set(beat.actor, state);
    }
  }

  /* ---------------- 4. Facing / reactions / hands ---------------- */

  const handState = new Map();
  for (const beat of beats) {
    if (beat.type === "char_prop" && beat.actor) {
      handState.set(beat.actor, beat.prop ?? null);
    }
    if (beat.type === "char_anim" && beat.actor) {
      if (PLAYER_FACING_REACTIONS.has(beat.anim)) {
        const priorFace = beats.find(
          (b) =>
            b.at <= beat.at + 0.01 &&
            (b.type === "char_face" || b.type === "face") &&
            b.actor === beat.actor &&
            (b.followPlayer === true || b.target === "player")
        );
        if (!priorFace) {
          let applied = false;
          if (autoFix) applied = insertBefore(beat, { at: beat.at, type: "char_face", actor: beat.actor, followPlayer: true, instant: true });
          issues.push(
            issue(
              "REACTION_FACING_AWAY",
              "error",
              beat.at,
              `${beat.actor} plays "${beat.anim}" facing wherever it happens to be — the reaction is not sold to the lens.`,
              {
                actor: beat.actor,
                ...fixNote(applied, applied ? "Inserted char_face followPlayer before the reaction." : "Add char_face { followPlayer: true, instant: true } first."),
              }
            )
          );
        }
      }

      const hand = handState.get(beat.actor);
      if (hand && HAND_WEAPONS.has(hand) && !["hit", "punch", "terrified", "panic", "jump", "walk", "run", "run2"].includes(beat.anim)) {
        let applied = false;
        if (autoFix) applied = insertBefore(beat, { at: beat.at, type: "char_prop", actor: beat.actor, prop: "none" });
        issues.push(
          issue(
            "PROP_STUCK_IN_HAND",
            "error",
            beat.at,
            `${beat.actor} is still holding the ${hand} while playing "${beat.anim}" — stow it or play a weapon beat.`,
            {
              actor: beat.actor,
              ...fixNote(applied, applied ? "Inserted char_prop prop:\"none\" before the beat." : "Add char_prop { prop: \"none\" } first."),
            }
          )
        );
      }
    }

    if (beat.type === "char_bubble" && beat.icon === "heart" && beat.actor) {
      const hand = handState.get(beat.actor);
      if (hand && HAND_WEAPONS.has(hand)) {
        let applied = false;
        if (autoFix) applied = insertBefore(beat, { at: beat.at, type: "char_prop", actor: beat.actor, prop: "none" });
        issues.push(
          issue(
            "PROP_STUCK_IN_HAND",
            "error",
            beat.at,
            `${beat.actor} shows a heart bubble while still holding the ${hand}.`,
            { actor: beat.actor, ...fixNote(applied, applied ? "Stowed the weapon before the bubble." : "Stow the weapon first.") }
          )
        );
      }
    }
  }

  /* ---------------- 5. Sound needs a matching action ---------------- */

  for (const beat of beats) {
    if (beat.type !== "sfx") continue;
    const rule = CUE_ACTION_RULES[beat.sound];
    if (!rule) continue;
    const windowStart = beat.at - 1.6;
    const windowEnd = beat.at + 1.25;
    const matched = beats.some((b) => {
      if (b.at < windowStart || b.at > windowEnd) return false;
      if (b.type === "char_anim" && (rule.anyAnim || rule.anims?.includes(b.anim))) return true;
      // A thought bubble is a visible reaction in its own right (this is a
      // kids' show: angry/exclamation bubbles *are* how people emote).
      if (b.type === "char_bubble") return true;
      if (b.type === "char_prop" && rule.props?.includes(b.prop)) return true;
      if (b.type === "player_hold" && rule.props?.includes(b.prop)) return true;
      // A meme sting can land on a prop slap or a camera gesture just as well as an anim.
      if (rule.anyAnim && (b.type === "prop_action" || b.type === "player_gesture")) return true;
      return false;
    });
    if (!matched) {
      let applied = false;
      let appliedNote = null;
      const candidates = (rule.anims || []).filter((a) => AVAILABLE_ANIMS.includes(a));
      const actorId = lastPerformingActor(beat.at);
      const beatScene = (ep.sceneMap || []).find(
        (m) => beat.at >= m.start - 1e-6 && beat.at < m.end
      );
      const sceneCast = beatScene ? ep.sceneCasts?.[beatScene.id] : null;
      const actorOnScreen =
        (ep.cast?.some((c) => c.id === actorId) ?? false) &&
        (!sceneCast || sceneCast.includes(actorId));
      if (autoFix && candidates.length && actorId && actorOnScreen) {
        // A reaction we invent ourselves must also be sold to the lens.
        if (PLAYER_FACING_REACTIONS.has(candidates[0])) {
          insertAfter(beat, {
            at: Math.round((beat.at + 0.01) * 100) / 100,
            type: "char_face",
            actor: actorId,
            followPlayer: true,
            instant: true,
          });
        }
        applied = insertAfter(beat, {
          at: Math.round((beat.at + 0.02) * 100) / 100,
          type: "char_anim",
          actor: actorId,
          anim: candidates[0],
          duration: 1.2,
          loop: true,
        });
        if (applied) appliedNote = `Inserted ${actorId} "${candidates[0]}" at ${formatTime(beat.at)} so the cue has a visible action.`;
      }
      issues.push(
        issue(
          "SOUND_WITHOUT_ANIM",
          // A cue for someone in another room is legitimate (you hear them
          // arguing downstairs) — only an on-screen promise must be visible.
          actorOnScreen ? "error" : "info",
          beat.at,
          actorOnScreen
            ? `SFX "${beat.sound}" promises ${rule.label} but no matching animation or prop fires around it.`
            : `SFX "${beat.sound}" is off-screen (${actorId || "the cast"} is not in this scene) — audio only.`,
          {
            ...fixNote(
              applied,
              appliedNote ||
                (candidates.length
                  ? `Add a matching beat (${candidates.slice(0, 3).map((a) => `"${a}"`).join(" / ")}) or drop the SFX.`
                  : "Drop the SFX or add the missing action.")
            ),
          }
        )
      );
    }
  }

  /* ---------------- 6. Dead air ---------------- */

  const activity = [];
  for (const beat of beats) {
    const moves = beat.type === "char_move" || beat.type === "move" || beat.type === "player_walk" || beat.type === "player_ride";
    const acts = ["char_anim", "anim", "player_look", "player_gesture", "char_gesture", "char_bubble", "prop_action", "player_hold", "player_pose", "char_face", "fade", "sfx", "char_prop"].includes(beat.type);
    if (moves || acts) activity.push({ at: beat.at, end: beat.at + Math.max(0.15, beat.duration || 0), type: beat.type, beat });
  }
  activity.sort((a, b) => a.at - b.at);

  const episodeEnd = activity.reduce((m, a) => Math.max(m, a.end), 0);
  let cursor = 0;
  const gaps = [];
  for (const a of activity) {
    if (a.at - cursor > rules.maxDeadAir && a.at > 0.5) gaps.push({ from: cursor, to: a.at });
    cursor = Math.max(cursor, a.end);
  }

  for (const gap of gaps) {
    const length = gap.to - gap.from;
    let applied = false;
    if (autoFix && ep.skits?.length) {
      // Insert a tiny reaction beat into the skit that owns the gap.
      const skit =
        ep.skits.find((s) => (s.beats || []).some((b) => b.at >= gap.from - 0.01 && b.at <= gap.to + 0.01)) ||
        ep.skits[ep.skits.length - 1];
      if (skit) {
        skit.beats = skit.beats || [];
        const insertAt = Math.round((gap.from + gap.to) * 50) / 100;
        const firstActor = (ep.cast || [])[0]?.id;
        if (firstActor) {
          skit.beats.push({ at: insertAt, type: "char_gesture", actor: firstActor, gesture: "nod_once", duration: 0.7 });
        } else {
          skit.beats.push({ at: insertAt, type: "player_gesture", gesture: "nod_yes", duration: 0.7 });
        }
        applied = true;
      }
    }
    issues.push(
      issue(
        "DEAD_AIR",
        "error",
        gap.from,
        `${length.toFixed(1)}s of dead air (${formatTime(gap.from)}–${formatTime(gap.to)}) with nothing moving.`,
        {
          ...fixNote(
            applied,
            applied
              ? "Inserted a subtle nod at the centre of the gap (never injects random peek_lean) — replace it with a real beat."
              : "Fill it with movement, a bubble, a look or an SFX (max 2.5s)."
          ),
        }
      )
    );
  }

  /* ---------------- 6b. Schema & Runtime Capability Guard ---------------- */
  for (const prop of ep.props || []) {
    if (prop?.type && !PROP_TYPE_SET.has(prop.type)) {
      issues.push(
        issue("UNKNOWN_PROP_TYPE", "error", 0, `Prop "${prop.id}" uses unknown type "${prop.type}" — runtime has no mesh for it.`, {
          ...fixNote(false, `Use a registered prop type from \`npm run catalogue\` (${[...PROP_TYPE_SET].join(", ")}).`),
        })
      );
    }
  }

  for (const beat of beats) {
    if (beat?.type && !BEAT_TYPE_SET.has(beat.type)) {
      issues.push(
        issue("UNKNOWN_BEAT_TYPE", "error", beat.at ?? 0, `Beat uses unknown type "${beat.type}" — runtime will ignore it.`, {
          ...fixNote(false, "Use a registered beat type from `npm run catalogue`."),
        })
      );
    }
  }

  /* ---------------- 7. Framing & Camera Discipline ---------------- */
  const propHidden = new Map((ep.props || []).map((p) => [p.id, p.visible === false]));
  let lastLookAt = -999;
  let lastCutAt = -999;

  for (const beat of beats) {
    if (beat.type === "cut") {
      lastCutAt = Number(beat.at) || 0;
      continue;
    }
    if (beat.type === "prop_action" && beat.prop) {
      if (beat.action === "hide" || beat.action === "pickup") propHidden.set(beat.prop, true);
      else if (beat.action === "show" || beat.action === "place" || beat.action === "pop_out" || beat.action === "reset") {
        propHidden.set(beat.prop, false);
      }
      continue;
    }
    if (beat.type !== "player_look" || !beat.target) continue;
    if (typeof beat.target !== "string") continue;

    const at = Number(beat.at) || 0;
    const dur = Number(beat.duration ?? 0.2);

    if (dur < 0.16) {
      issues.push(
        issue("SNAP_PAN", "warn", at, `player_look to "${beat.target}" runs ${dur.toFixed(2)}s — a snap that reads as a cut.`, {
          ...fixNote(false, "Use 0.18–0.35s for a readable look."),
        })
      );
    }

    if (at - lastLookAt < 0.45 && lastCutAt < lastLookAt) {
      issues.push(
        issue("RAPID_LOOK_FLICK", "warn", at, `player_look to "${beat.target}" fires ${(at - lastLookAt).toFixed(2)}s after the previous look — causes camera flicking.`, {
          ...fixNote(false, "Space player_look beats at least 0.5s apart unless separated by a cut."),
        })
      );
    }
    lastLookAt = at;

    if (propHidden.get(beat.target) === true) {
      issues.push(
        issue("LOOK_AT_HIDDEN_PROP", "warn", at, `player_look targets "${beat.target}" while it is hidden or picked up — camera stares at empty space.`, {
          ...fixNote(false, "Look at an active actor or a visible prop instead."),
        })
      );
    }

    if (beat.track === false) {
      const movingTarget = beats.some(
        (b) => (b.type === "char_move" || b.type === "move") && b.actor === beat.target && Math.abs(b.at - at) < 3
      );
      if (movingTarget) {
        issues.push(
          issue("OFF_CENTER_FRAMING", "warn", at, `"${beat.target}" moves within 3s but the look is untracked — they will drift off-centre.`, {
            ...fixNote(false, "Use track: true so the lens follows them."),
          })
        );
      }
    }
  }

  /* ---------------- 8. Ending on motion ---------------- */

  const lastBeat = beats[beats.length - 1];
  const fadeBeat = [...beats].reverse().find((b) => b.type === "fade" && Number(b.to) >= 0.99);
  if (fadeBeat) {
    const motionBefore = beats.some(
      (b) =>
        b.at >= fadeBeat.at - 2.6 &&
        b.at <= fadeBeat.at + 0.1 &&
        (b.type === "char_anim" ||
          b.type === "char_move" ||
          b.type === "move" ||
          b.type === "player_gesture" ||
          b.type === "char_gesture" ||
          b.type === "player_walk")
    );
    if (!motionBefore) {
      issues.push(
        issue("END_ON_STILL", "warn", fadeBeat.at, `The episode fades on a still pose at ${formatTime(fadeBeat.at)} — end on motion.`, {
          ...fixNote(false, "Add a run/jumpscare/gesture in the 2s before the fade."),
        })
      );
    }
  } else if (lastBeat && episodeEnd > 6) {
    issues.push(issue("NO_FADE", "warn", episodeEnd, "The episode never fades out.", { ...fixNote(false, "Close with fade { to: 1 }.") }));
  }

  /* ---------------- Report ---------------- */

  // Tag each issue with the scene it belongs to, so a 5-minute show reports
  // "scene 12 — fridge" instead of a timestamp nobody can place.
  const sceneMap = Array.isArray(ep.sceneMap) ? ep.sceneMap : [];
  if (sceneMap.length) {
    for (const item of issues) {
      const scene =
        sceneMap.find((m) => item.at >= m.start - 1e-6 && item.at < m.end) ||
        sceneMap[sceneMap.length - 1];
      if (scene) {
        item.scene = scene.id;
        item.sceneTitle = scene.title;
        item.sceneIndex = scene.index;
      }
    }
  }

  const errors = issues.filter((i) => i.severity === "error").length;
  const warnings = issues.filter((i) => i.severity === "warn").length;
  const fixed = issues.filter((i) => i.applied).length;

  return {
    issues: issues.sort((a, b) => a.at - b.at || (a.severity === "error" ? -1 : 1)),
    episode: ep,
    stats: {
      errors,
      warnings,
      fixed,
      beats: beats.length,
      scenes: sceneMap.length,
      duration: round(episodeEnd, 2),
    },
  };
}

function aabbFromSafe(pos, half) {
  return {
    min: { x: pos.x - half.x, y: pos.y - half.y, z: pos.z - half.z },
    max: { x: pos.x + half.x, y: pos.y + half.y, z: pos.z + half.z },
  };
}

/**
 * Validate, repair, then validate again so the report reflects the episode that
 * will actually render (not the broken input plus a pile of promises).
 */
/**
 * Long-form shows are continuous: a scene must open exactly where the previous
 * one closed. This walks the player route and flags any scene whose declared
 * start does not match the position the story actually arrives at — the author
 * "teleport" that the viewer would feel even without a fade.
 */
export function checkSceneContinuity(episode, { setMap } = {}) {
  const issues = [];
  const scenes = episode?.sceneMap || [];
  if (!setMap || scenes.length < 2 || episode.transitions !== "continuous") return issues;

  const where = { x: 0, z: 0 };
  const start = setMap[episode.playerSpawn];
  if (start) {
    where.x = start.x;
    where.z = start.z;
  }

  // Position of the player at any time, from walks and hops.
  const timeline = [];
  for (const beat of (episode.skits || []).flatMap((s) => s.beats || [])) {
    if (beat.type === "player_walk" || beat.type === "cut") {
      const ref = beat.to || beat.target || beat.spawn;
      const wp = typeof ref === "string" ? setMap[ref] : null;
      if (wp) timeline.push({ at: beat.at + Math.max(0, beat.duration || 0), x: wp.x, z: wp.z });
    }
  }
  timeline.sort((a, b) => a.at - b.at);
  let cursor = 0;

  for (let i = 1; i < scenes.length; i += 1) {
    const scene = scenes[i];
    while (cursor < timeline.length && timeline[cursor].at <= scene.start + 1e-6) {
      where.x = timeline[cursor].x;
      where.z = timeline[cursor].z;
      cursor += 1;
    }
    const declared = scene.playerSpawn ? setMap[scene.playerSpawn] : null;
    if (!declared) continue;
    const drift = Math.hypot(declared.x - where.x, declared.z - where.z);
    if (drift > 0.9) {
      issues.push({
        code: "SCENE_START_MISMATCH",
        severity: "warn",
        at: scene.start,
        scene: scene.id,
        sceneIndex: scene.index,
        sceneTitle: scene.title,
        message: `Scene "${scene.id}" says it starts at "${scene.playerSpawn}" but the previous scene leaves the player ${drift.toFixed(
          1
        )}m away — write the walk that closes the gap (or fix the spawn).`,
        fix: "End the previous scene on the waypoint this scene starts on.",
      });
    }
  }
  return issues;
}

export function validateAndRepair(episode, options = {}) {
  const continuity = checkSceneContinuity(episode, { setMap: options.setMap });
  if (continuity.length) episode.__continuityIssues = continuity;
  const first = validateEpisode(episode, { ...options, autoFix: options.autoFix !== false });
  const second = validateEpisode(first.episode, { ...options, autoFix: false });
  const applied = first.issues.filter((i) => i.applied);
  const stillOpen = second.issues;
  const seen = new Set();
  const continuityIssues = episode.__continuityIssues || [];
  delete episode.__continuityIssues;
  const issues = [...stillOpen, ...applied, ...continuityIssues].filter((i) => {
    const key = `${i.code}|${round(i.at, 2)}|${i.prop ?? i.actor ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    issues: issues.sort(
      (a, b) => a.at - b.at || (a.severity === "error" ? -1 : 1)
    ),
    episode: first.episode,
    repaired: applied.length > 0,
    stats: {
      ...second.stats,
      fixed: applied.length,
      errorsBefore: first.stats.errors,
      errorsAfter: second.stats.errors,
      warningsBefore: first.stats.warnings,
      warningsAfter: second.stats.warnings,
    },
  };
}

/** Human-readable report used by the CLI, the studio toast and CI. */
export function formatStagingReport(result) {
  const { issues, stats } = result;
  const grouped = issues.some((i) => i.sceneIndex !== undefined);
  const lines = [];
  const fixedCount = stats.fixed ?? issues.filter((i) => i.applied).length;
  const errors = stats.errorsAfter ?? issues.filter((i) => !i.applied && i.severity === "error").length;
  const warnings = stats.warningsAfter ?? issues.filter((i) => !i.applied && i.severity === "warn").length;

  lines.push(
    `Staging report — ${errors} error(s), ${warnings} warning(s) remaining · ${fixedCount} auto-fix(es)`
  );
  lines.push(`Beats: ${stats.beats} · runtime: ~${stats.duration.toFixed(1)}s`);

  const remaining = issues.filter((i) => !i.applied);
  const applied = issues.filter((i) => i.applied);
  const icon = { error: "✗", warn: "!", info: "·" };

  if (!remaining.length && !applied.length) {
    lines.push("✓ No staging issues found.");
    return lines.join("\n");
  }

  const sceneLabel = (i) =>
    i.sceneIndex !== undefined
      ? `Scene ${i.sceneIndex + 1}${i.sceneTitle ? ` — ${i.sceneTitle}` : i.scene ? ` — ${i.scene}` : ""}`
      : "Whole episode";

  const emit = (list, formatter) => {
    let currentScene = null;
    for (const i of list) {
      if (grouped) {
        const label = sceneLabel(i);
        if (label !== currentScene) {
          currentScene = label;
          lines.push(`\n${label}`);
        }
      }
      formatter(i);
    }
  };

  if (remaining.length) {
    lines.push("Remaining:");
    emit(remaining, (i) => {
      lines.push(`${icon[i.severity] || "·"} [${i.time}] ${i.code}: ${i.message}`);
      if (i.fix) lines.push(`    fix: ${i.fix}`);
    });
  } else {
    lines.push("✓ Nothing left to fix.");
  }

  if (applied.length) {
    lines.push("\nAuto-fixed:");
    emit(applied, (i) => {
      lines.push(`✔ [${i.time}] ${i.code}: ${i.fix || i.message}`);
    });
  }
  return lines.join("\n");
}

export const episodeSafety = { validateEpisode, validateAndRepair, formatStagingReport, suggestedVia, doorwayChain, flattenBeats };
export default episodeSafety;
