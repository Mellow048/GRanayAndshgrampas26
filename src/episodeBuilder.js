// episodeBuilder.js — chains gag modules into one episode JSON (same format EpisodeRunner already loads).
// A gag = { name, duration, cast:{actorId:{spawn,facing}}, props:[...], beats:[...] }
// Gag beats use LOCAL times (0 = gag start) and ONLY `at` (never `after`, never `await`).

const CUT = 0.4; // black-frame "cut" between gags (hides repositioning)

export function buildEpisode({ title, aspect = "16:9", playerSpawn, playerFacing, gags }) {
  const cast = new Map();
  const props = new Map();
  const skits = [];
  let t = 0;

  gags.forEach((g, i) => {
    const beats = [];
    if (i > 0) {
      // fade to black -> teleport actors/player to this gag's start -> fade back in
      beats.push({ at: +t.toFixed(3), type: "fade", to: 1, duration: CUT / 2 });
      for (const [id, c] of Object.entries(g.cast)) {
        beats.push({
          at: +(t + CUT / 2).toFixed(3),
          type: "char_cut",
          actor: id,
          to: c.spawn,
          facing: c.facing,
          anim: c.anim || "idle",
        });
      }
      for (const p of g.props ?? []) {
        if (p.visible === false) {
          beats.push({ at: +(t + CUT / 2).toFixed(3), type: "prop_action", prop: p.id, action: "hide" });
        }
      }
      beats.push({
        at: +(t + CUT / 2).toFixed(3),
        type: "cut",
        to: g.playerSpawn ?? playerSpawn,
        facing: g.playerFacing ?? playerFacing,
      });
      beats.push({ at: +(t + CUT / 2 + 0.05).toFixed(3), type: "fade", to: 0, duration: CUT / 2 });
      t += CUT;
    }
    for (const [id, c] of Object.entries(g.cast)) {
      if (!cast.has(id)) {
        cast.set(id, { id, asset: c.asset || id, spawn: c.spawn, facing: c.facing });
      }
    }
    for (const p of g.props ?? []) {
      if (!props.has(p.id)) props.set(p.id, p);
    }

    for (const b of g.beats) {
      beats.push({ ...b, at: +(b.at + t).toFixed(3) });
    }
    skits.push({ name: `${g.name} (${t.toFixed(1)}-${(t + g.duration).toFixed(1)}s)`, beats });
    t += g.duration;
  });

  // end on motion: last gag should already end in a chase/lunge; add final fade
  if (skits.length > 0) {
    skits.at(-1).beats.push({ at: +Math.max(0, t - 0.6).toFixed(3), type: "fade", to: 1, duration: 0.6 });
  }

  return {
    title,
    aspect,
    playerSpawn,
    playerFacing,
    cast: [...cast.values()],
    props: [...props.values()],
    skits,
  };
}
