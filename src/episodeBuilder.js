// episodeBuilder.js — chains gag modules into one episode JSON (same format EpisodeRunner already loads).
// A gag = { name, duration, playerSpawn?, playerFacing?, cast:{actorId:{spawn,facing,anim?,prop?}}, props:[...], beats:[...] }
// Gag beats use LOCAL times (0 = gag start) and ONLY `at` (never `after`, never `await`).

import { SET_MAP, NAV_GRAPH } from "./setMap.js";
import { suggestedVia } from "./episodeSafety.js";

const CUT = 0.4; // black-frame "cut" between gags (hides repositioning)

/** Two performers may never be sent to the same spot at the same moment. */
export const MIN_CONCURRENT_TARGET_GAP = 1.05;
/** ...nor may the POV lens finish a walk inside somebody. */
export const MIN_PLAYER_TARGET_GAP = 1.15;

/**
 * Assembly-time staging separation.
 *
 * Gags are authored one at a time, so each one picks the exit waypoint that
 * suits it — and when two performers are told to walk out at the same instant
 * they both pick the same doorway. That is what produced the 0.00m clips in the
 * 2:30 episode: two bodies merging on `back_hall`, on `dining_table_front` and
 * on `back_hall_left`. Repairing it in the validator means shipping a broken
 * episode and hoping the repair holds; doing it here means no episode built
 * from this builder can contain the defect at all.
 *
 * Deterministic: moves are visited in beat order, and candidate waypoints are
 * sorted, so the same gags always produce the same schedule.
 */
export function enforceStageSeparation(episode) {
  const moves = [];
  for (const skit of episode.skits || []) {
    for (const beat of skit.beats || []) {
      if (beat.type !== "char_move" && beat.type !== "player_walk") continue;
      if (typeof beat.to !== "string" || !SET_MAP[beat.to]) continue;
      const at = Number(beat.at) || 0;
      const duration = Number(beat.duration) || 1;
      moves.push({
        beat,
        actor: beat.type === "player_walk" ? "__player__" : beat.actor,
        at,
        end: at + duration,
        target: beat.to,
        from: typeof beat.from === "string" ? beat.from : null,
      });
    }
  }
  if (moves.length < 2) return { adjustments: 0, moves: moves.length };

  const floorOf = (name) => SET_MAP[name]?.y ?? 0;
  const pointOf = (name) => SET_MAP[name];
  const overlaps = (a, b) => a.actor !== b.actor && a.at < b.end + 0.15 && b.at < a.end + 0.15;

  // The POV stands still at the spawn until its first walk: an actor whose leg
  // runs through that spot pushes the lens aside, which is the "bumping you"
  // complaint. Treat the spawn as a permanent obstacle for the opening seconds.
  const playerSpawnPoint = SET_MAP[episode.playerSpawn] || null;
  const passesNearPlayerSpawn = (move) => {
    if (!playerSpawnPoint || move.actor === "__player__") return false;
    const origin = (move.from && SET_MAP[move.from]) || SET_MAP[move.target];
    if (!origin) return false;
    const ax = origin.x;
    const az = origin.z;
    const bx = SET_MAP[move.target].x;
    const bz = SET_MAP[move.target].z;
    const vx = bx - ax;
    const vz = bz - az;
    const vv = vx * vx + vz * vz || 1;
    let t = ((playerSpawnPoint.x - ax) * vx + (playerSpawnPoint.z - az) * vz) / vv;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(playerSpawnPoint.x - (ax + vx * t), playerSpawnPoint.z - (az + vz * t));
    return d < MIN_PLAYER_TARGET_GAP && move.at < 12;
  };

  // Where each actor actually is at time t: the target of their last completed
  // move, else their seat from the cast list. Standing bodies block routes just
  // as firmly as concurrent ones.
  const seats = new Map(
    (episode.cast || []).map((c) => [c.id, c.spawn && SET_MAP[c.spawn] ? SET_MAP[c.spawn] : null])
  );
  const positionAt = (actorId, t) => {
    let best = null;
    for (const mv of moves) {
      if (mv.actor !== actorId) continue;
      if (mv.at > t - 1e-6) continue;
      if (!best || mv.at >= best.at) best = mv;
    }
    return best ? SET_MAP[best.target] : seats.get(actorId) || null;
  };
  /** Closest approach between two 2D segments — used to catch crossing routes. */
  const segmentDistance = (a1, a2, b1, b2) => {
    const pointSegment = (p, s1, s2) => legDistance(s1, s2, p);
    const d1 = pointSegment(b1, a1, a2);
    const d2 = pointSegment(b2, a1, a2);
    const d3 = pointSegment(a1, b1, b2);
    const d4 = pointSegment(a2, b1, b2);
    return Math.min(d1, d2, d3, d4);
  };
  const legDistance = (fromPoint, toPoint, point) => {
    const vx = toPoint.x - fromPoint.x;
    const vz = toPoint.z - fromPoint.z;
    const vv = vx * vx + vz * vz || 1;
    let t = ((point.x - fromPoint.x) * vx + (point.z - fromPoint.z) * vz) / vv;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(point.x - (fromPoint.x + vx * t), point.z - (fromPoint.z + vz * t));
  };

  let adjustments = 0;
  for (let i = 0; i < moves.length; i += 1) {
    const m = moves[i];
    const rivals = moves.filter((o, j) => j !== i && overlaps(m, o));
    if (!rivals.length) continue;

    const gapFor = (other) => (m.actor === "__player__" || other.actor === "__player__" ? MIN_PLAYER_TARGET_GAP : MIN_CONCURRENT_TARGET_GAP);
    const clash = rivals.find(
      (o) => Math.hypot(pointOf(o.target).x - pointOf(m.target).x, pointOf(o.target).z - pointOf(m.target).z) < gapFor(o)
    );
    const spawnClash = !clash && passesNearPlayerSpawn(m) ? rivals[0] || { actor: "__player__", at: 0, end: 12 } : null;

    // Standing blockers: whoever is parked on this route while it is walked.
    const fromPoint = (m.from && SET_MAP[m.from]) || positionAt(m.actor, m.at) || pointOf(m.target);
    const toPoint = pointOf(m.target);
    const stander = !clash && !spawnClash
      ? [...seats.keys(), "__player__"].find((id) => {
          if (id === m.actor) return false;
          const p = id === "__player__"
            ? (SET_MAP[episode.playerSpawn] || null)
            : positionAt(id, m.at);
          if (!p) return false;
          const gap = id === "__player__" ? MIN_PLAYER_TARGET_GAP : MIN_CONCURRENT_TARGET_GAP;
          return legDistance(fromPoint, toPoint, p) < gap;
        })
      : null;
    // Route crossings are deliberately NOT "repaired" here: reshuffling a
    // crossing usually just moves the collision somewhere else (measured, twice).
    // The runtime steps the cast out of the lens's bubble, and `--probe` fails
    // the build if the lens still ends up close to a body.
    if (!clash && !spawnClash && !stander) continue;

    // Pull the move that starts later; if this one starts later, retarget it.
    if (clash && clash.at < m.at - 1e-6) continue;

    // A standing blocker also displaces the *destination* check below: every
    // candidate is measured against it via the `rivals` gap test.
    if (stander && !rivals.length) rivals.push({ actor: stander, at: m.at, end: m.end, target: m.target });

    const original = pointOf(m.target);
    const floor = floorOf(m.target);
    const candidates = Object.entries(SET_MAP)
      .filter(([, wp]) => Math.abs((wp.y ?? 0) - floor) < 0.5)
      .map(([name, wp]) => ({ name, wp, drift: Math.hypot(wp.x - original.x, wp.z - original.z) }))
      .filter(({ name, drift }) => name !== m.target && drift > 0.3 && drift < 3.2)
      .sort((a, b) => a.drift - b.drift || a.name.localeCompare(b.name));

    const free = candidates.find(({ name, wp }) => {
      // Far enough from everybody who is on stage at the same time...
      const clashFree = moves.every(
        (o) =>
          o === m ||
          !overlaps(m, o) ||
          Math.hypot(pointOf(o.target).x - wp.x, pointOf(o.target).z - wp.z) >= gapFor(o)
      );
      if (!clashFree) return false;
      // ...and reachable without the repair inventing a wall cut.
      // Keep a metre of air between the new leg and anyone standing on it.
      const fromPoint2 = (m.from && SET_MAP[m.from]) || positionAt(m.actor, m.at) || wp;
      return moves.every((o) => {
        if (o === m || !overlaps(m, o)) return true;
        const oFrom = (o.from && SET_MAP[o.from]) || positionAt(o.actor, o.at) || SET_MAP[o.target];
        const oTo = SET_MAP[o.target];
        if (!oFrom || !oTo) return true;
        return segmentDistance(fromPoint2, wp, oFrom, oTo) >= gapFor(o) * 0.5;
      });
    });

    if (free) {
      const chain = m.from ? suggestedVia(SET_MAP, NAV_GRAPH, m.from, free.name) : [];
      const existing = Array.isArray(m.beat.via) ? m.beat.via : [];
      m.beat.to = free.name;
      m.beat.target = free.name;
      if (chain.length) m.beat.via = [...existing, ...chain];
      m.target = free.name;
      adjustments += 1;
      continue;
    }

    // No free waypoint: stagger the two walks so they happen one after the other.
    const blocker = clash || stander;
    if (!blocker) continue;
    const shifted = +(blocker.end + 0.05).toFixed(3);
    if (shifted > m.at) {
      m.beat.at = shifted;
      m.at = shifted;
      m.end = shifted + (Number(m.beat.duration) || 1);
      adjustments += 1;
    }
  }

  return { adjustments, moves: moves.length };
}

export function validateGag(gag, index = 0, { requireCast = true } = {}) {
  if (!gag || typeof gag !== "object") {
    throw new Error(`[episodeBuilder] Gag #${index} is not an object.`);
  }
  if (!gag.name && !gag.title) {
    throw new Error(`[episodeBuilder] Gag #${index} is missing \`name\` (or \`title\`).`);
  }
  if (gag.name === undefined) gag.name = gag.title;
  if (!(gag.duration > 0)) throw new Error(`[episodeBuilder] Gag "${gag.name}" needs positive \`duration\`.`);
  if (requireCast && (!gag.cast || Object.keys(gag.cast).length === 0)) {
    throw new Error(`[episodeBuilder] Gag "${gag.name}" needs at least one actor in \`cast\`.`);
  }
  for (const [actorId, entry] of Object.entries(gag.cast || {})) {
    if (!entry || typeof entry !== "object") {
      throw new Error(`[episodeBuilder] Gag "${gag.name}" cast entry "${actorId}" must be an object.`);
    }
    // `spawn` is optional: a scene that picks up where the last one left off
    // simply says the actor is here (continuous shows never re-seat anyone).
    if (entry.spawn !== undefined && typeof entry.spawn !== "string") {
      throw new Error(`[episodeBuilder] Gag "${gag.name}" cast "${actorId}.spawn" must be a waypoint name.`);
    }
  }

  for (const [bi, b] of (gag.beats || []).entries()) {
    if (typeof b.at !== "number" || b.at < 0) {
      throw new Error(`[episodeBuilder] Gag "${gag.name}" beat #${bi} (${b.type}) must use numeric \`at >= 0\`.`);
    }
    if ("after" in b) {
      throw new Error(`[episodeBuilder] Gag "${gag.name}" beat #${bi} (${b.type}) uses forbidden \`after\` — use local \`at\`.`);
    }
    if ("await" in b) {
      throw new Error(`[episodeBuilder] Gag "${gag.name}" beat #${bi} (${b.type}) uses forbidden \`await\` — use local \`at\`.`);
    }
  }
  return gag;
}

export function buildEpisode({
  title,
  aspect = "16:9",
  playerSpawn,
  playerFacing,
  playerFov = undefined,
  maxLookDuration = undefined,
  allowSlowScans = undefined,
  gags = [],
  scenes = [],
  id = undefined,
  requireCast = true,
  // "cut"         — legacy: fade to black, teleport everyone, reset props.
  // "continuous"  — long-form: nothing happens at the boundary. The player, the
  //                 cast and every prop simply carry on from where the last
  //                 scene left them, so a scene change is invisible.
  transitions = "cut",
  story = null,
}) {
  const continuous = transitions === "continuous";
  // `scenes` is the long-form name for a gag: a self-contained chunk of story
  // with local `at` timings. Both are chained identically.
  const blocks = scenes.length ? scenes : gags;
  const cast = new Map();
  const props = new Map();
  const skits = [];
  const sceneMap = [];
  let t = 0;

  const resolvedGags = blocks.map((g, idx) =>
    validateGag(typeof g === "function" ? g() : g, idx, { requireCast })
  );
  const rootSpawn = playerSpawn || resolvedGags[0]?.playerSpawn || "back_hall";
  const rootFacing = playerFacing || resolvedGags[0]?.playerFacing || "kitchen";

  resolvedGags.forEach((g, i) => {
    const sceneStart = t;
    const beats = [];
    const propRemap = new Map();
    const activePropIds = new Set();

    // Register props (namespace automatically if a later gag reuses an ID for a different mesh type)
    const resolvedProps = (g.props ?? []).map((p) => {
      let id = p.id;
      if (props.has(id) && props.get(id).type !== p.type) {
        id = `${p.id}_g${i}`;
        propRemap.set(p.id, id);
      }
      activePropIds.add(id);
      if (!props.has(id)) {
        props.set(id, { ...p, id });
      }
      return { ...p, id };
    });

    if (i > 0 && !continuous) {
      // Fade to black -> reset actors, player, held items & props -> fade back in
      beats.push({ at: +t.toFixed(3), type: "fade", to: 1, duration: CUT / 2 });
      const cutAt = +(t + CUT / 2).toFixed(3);

      for (const [id, c] of Object.entries(g.cast || {})) {
        beats.push({
          at: cutAt,
          type: "char_cut",
          actor: id,
          to: c.spawn,
          facing: c.facing,
          anim: c.anim || "idle",
          prop: c.prop ?? "cane",
        });
      }

      // Hide any existing props not belonging to this gag; reset props that belong to this gag
      for (const existingId of props.keys()) {
        if (!activePropIds.has(existingId)) {
          beats.push({ at: cutAt, type: "prop_action", prop: existingId, action: "hide" });
        }
      }
      for (const p of resolvedProps) {
        beats.push({
          at: cutAt,
          type: "prop_action",
          prop: p.id,
          action: "reset",
          waypoint: p.spawn,
          yOffset: p.yOffset ?? 0,
          rotationY: p.rotationY ?? 0,
          scale: p.scale ?? 1,
          visible: p.visible !== false,
          spin: Boolean(p.spin),
          float: Boolean(p.float),
        });
      }

      beats.push({
        at: cutAt,
        type: "cut",
        to: g.playerSpawn ?? rootSpawn,
        facing: g.playerFacing ?? rootFacing,
        clearHold: true,
      });
      beats.push({ at: +(t + CUT / 2 + 0.05).toFixed(3), type: "fade", to: 0, duration: CUT / 2 });
      t += CUT;
    }

    for (const [id, c] of Object.entries(g.cast)) {
      if (!cast.has(id)) {
        if (continuous && c.spawn === undefined) {
          throw new Error(
            `[episodeBuilder] Scene "${g.name}" introduces "${id}" without a \`spawn\` — the first scene that shows an actor must seat them.`
          );
        }
        cast.set(id, {
          id,
          asset: c.asset || id,
          spawn: c.spawn,
          facing: c.facing,
          anim: c.anim || "idle",
          ...(c.prop !== undefined ? { prop: c.prop } : {}),
          ...(c.scale !== undefined ? { scale: c.scale } : {}),
          ...(c.visible !== undefined ? { visible: c.visible } : {}),
          ...(c.headTrack !== undefined ? { headTrack: c.headTrack } : {}),
        });
      }
    }

    for (const b of g.beats) {
      const remapped = { ...b, at: +(b.at + t).toFixed(3) };
      if (remapped.prop && propRemap.has(remapped.prop)) {
        remapped.prop = propRemap.get(remapped.prop);
      }
      if (typeof remapped.target === "string" && propRemap.has(remapped.target)) {
        remapped.target = propRemap.get(remapped.target);
      }
      beats.push(remapped);
    }

    const sceneTitle = g.title || g.name;
    const sceneId = g.id || `scene_${i + 1}`;
    skits.push({
      name: `${sceneTitle} (${t.toFixed(1)}-${(t + g.duration).toFixed(1)}s)`,
      sceneId,
      castIds: Object.keys(g.cast || {}),
      beats,
    });
    t += g.duration;
    sceneMap.push({
      index: i,
      id: sceneId,
      title: sceneTitle,
      room: g.room || null,
      start: +sceneStart.toFixed(3),
      end: +t.toFixed(3),
      // What the scene says should be true when it opens. In continuous mode
      // these are only used for solo previews and for the continuity check.
      playerSpawn: g.playerSpawn ?? null,
      castSpawns: Object.fromEntries(
        Object.entries(g.cast || {}).map(([id, c]) => [id, c.spawn ?? null])
      ),
      transitions: continuous ? "continuous" : "cut",
    });
  });

  // End on motion + clean fade to black (skip it when the last scene already
  // fades out at the end — a second fade would bury the closing motion).
  if (skits.length > 0) {
    const lastBeats = skits.at(-1).beats;
    const alreadyFades = lastBeats.some(
      (b) => b.type === "fade" && (b.to ?? 0) >= 0.99 && b.at >= t - 3.2
    );
    if (!alreadyFades) {
      lastBeats.push({ at: +Math.max(0, t - 0.6).toFixed(3), type: "fade", to: 1, duration: 0.6 });
    }
  }

  const episode = {
    title,
    aspect,
    playerSpawn: rootSpawn,
    playerFacing: rootFacing,
    ...(Number.isFinite(playerFov) ? { playerFov } : {}),
    cast: [...cast.values()],
    props: [...props.values()],
    skits,
    sceneMap,
    sceneCasts: Object.fromEntries(sceneMap.map((m, i) => [m.id, skits[i]?.castIds || []])),
  };
  episode.transitions = continuous ? "continuous" : "cut";
  if (story) episode.story = story;
  episode.stageSeparation = enforceStageSeparation(episode);
  if (id) episode.showId = id;
  if (maxLookDuration !== undefined) episode.maxLookDuration = maxLookDuration;
  if (allowSlowScans !== undefined) episode.allowSlowScans = allowSlowScans;
  return episode;
}
