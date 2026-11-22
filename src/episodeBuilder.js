// episodeBuilder.js — chains gag modules into one episode JSON (same format EpisodeRunner already loads).
// A gag = { name, duration, playerSpawn?, playerFacing?, cast:{actorId:{spawn,facing,anim?,prop?}}, props:[...], beats:[...] }
// Gag beats use LOCAL times (0 = gag start) and ONLY `at` (never `after`, never `await`).

const CUT = 0.4; // black-frame "cut" between gags (hides repositioning)

export function validateGag(gag, index = 0) {
  if (!gag || typeof gag !== "object") {
    throw new Error(`[episodeBuilder] Gag #${index} is not an object.`);
  }
  if (!gag.name) throw new Error(`[episodeBuilder] Gag #${index} is missing \`name\`.`);
  if (!(gag.duration > 0)) throw new Error(`[episodeBuilder] Gag "${gag.name}" needs positive \`duration\`.`);
  if (!gag.cast || Object.keys(gag.cast).length === 0) {
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
}) {
  const cast = new Map();
  const props = new Map();
  const skits = [];
  let t = 0;

  const resolvedGags = gags.map((g, idx) => validateGag(typeof g === "function" ? g() : g, idx));
  const rootSpawn = playerSpawn || resolvedGags[0]?.playerSpawn || "back_hall";
  const rootFacing = playerFacing || resolvedGags[0]?.playerFacing || "kitchen";

  resolvedGags.forEach((g, i) => {
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

      for (const [id, c] of Object.entries(g.cast)) {
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

    skits.push({ name: `${g.name} (${t.toFixed(1)}-${(t + g.duration).toFixed(1)}s)`, beats });
    t += g.duration;
  });

  // End on motion + clean fade to black
  if (skits.length > 0) {
    skits.at(-1).beats.push({ at: +Math.max(0, t - 0.6).toFixed(3), type: "fade", to: 1, duration: 0.6 });
  }

  const episode = {
    title,
    aspect,
    playerSpawn: rootSpawn,
    playerFacing: rootFacing,
    cast: [...cast.values()],
    props: [...props.values()],
    skits,
  };
  if (maxLookDuration !== undefined) episode.maxLookDuration = maxLookDuration;
  if (allowSlowScans !== undefined) episode.allowSlowScans = allowSlowScans;
  return episode;
}
