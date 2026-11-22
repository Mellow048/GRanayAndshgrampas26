// episodeBuilder.js — chains gag modules into one episode JSON (same format EpisodeRunner already loads).
// A gag = { name, duration, playerSpawn?, playerFacing?, cast:{actorId:{spawn,facing,anim?,prop?}}, props:[...], beats:[...] }
// Gag beats use LOCAL times (0 = gag start) and ONLY `at` (never `after`, never `await`).

const CUT = 0.4; // black-frame "cut" between gags (hides repositioning)

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
  maxLookDuration = undefined,
  allowSlowScans = undefined,
  gags = [],
  scenes = [],
  id = undefined,
  requireCast = true,
}) {
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

    if (i > 0) {
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
        cast.set(id, {
          id,
          asset: c.asset || id,
          spawn: c.spawn,
          facing: c.facing,
          anim: c.anim || "idle",
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
    cast: [...cast.values()],
    props: [...props.values()],
    skits,
    sceneMap,
    sceneCasts: Object.fromEntries(sceneMap.map((m, i) => [m.id, skits[i]?.castIds || []])),
  };
  if (id) episode.showId = id;
  if (maxLookDuration !== undefined) episode.maxLookDuration = maxLookDuration;
  if (allowSlowScans !== undefined) episode.allowSlowScans = allowSlowScans;
  return episode;
}
