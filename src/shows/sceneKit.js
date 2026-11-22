/**
 * sceneKit — the contract every scene file follows.
 *
 * A SHOW is a list of scenes. A SCENE is a self-contained chunk of story with
 * LOCAL timings (`at` starts at 0) that can be previewed, validated and fixed on
 * its own. `buildShow()` then welds the scenes together with 0.4s black CUTs
 * that reset the player, the cast and the props, so nothing leaks between them.
 *
 * Why this shape:
 *   - a 5-minute episode is 20-24 of these, not one 900-line JSON blob;
 *   - "scene 4, the can floats" is a bug report you can act on in seconds;
 *   - `node scripts/validate-episode.mjs --show mountain_dew_run --scene bed`
 *     renders only that scene's report.
 */

const ID_RE = /^[a-z][a-z0-9_]*$/;

export function defineScene({
  id,
  title,
  room = null,
  duration,
  playerSpawn,
  playerFacing,
  cast = {},
  props = [],
  beats = [],
  notes = "",
}) {
  if (!ID_RE.test(id || "")) {
    throw new Error(`[sceneKit] scene id "${id}" must be snake_case (a-z, 0-9, _).`);
  }
  if (!title) throw new Error(`[sceneKit] scene "${id}" needs a title.`);
  if (!(duration > 0)) throw new Error(`[sceneKit] scene "${id}" needs a positive duration.`);
  if (!playerSpawn) throw new Error(`[sceneKit] scene "${id}" needs a playerSpawn waypoint.`);
  for (const b of beats) {
    if (typeof b.at !== "number" || b.at < 0) {
      throw new Error(`[sceneKit] scene "${id}" has a beat without a numeric local \`at\`.`);
    }
    if (b.at > duration + 0.001) {
      throw new Error(
        `[sceneKit] scene "${id}" has a beat at ${b.at}s, past its ${duration}s duration.`
      );
    }
  }
  return { id, title, room, duration, playerSpawn, playerFacing, cast, props, beats, notes };
}

/** A scene cut line for the storyboard report. */
export function describeScene(scene) {
  const actors = Object.keys(scene.cast || {}).join(", ") || "solo";
  const props = (scene.props || []).map((p) => p.id).join(", ") || "—";
  return `${scene.id} · ${scene.title} · ${scene.duration}s · ${scene.room || "?"} · cast: ${actors} · props: ${props}`;
}

/**
 * Staging for a kids'-show argument: two people bicker at each other with angry
 * thought bubbles and mumble SFX. It is deliberately NOT a fight — no punch, no
 * terrified reactions, nobody gets hit.
 *
 * Returns beats with LOCAL `at` times starting at `from`.
 *
 *   ...argueBeats({ from: 2, until: 8, a: "granny", b: "grandpa" })
 */
export function argueBeats({
  from = 0,
  until = 6,
  a,
  b,
  interval = 1.15,
  sfx = ["discord", "bonk"],
  bubbles = ["angry", "exclamation", "question"],
} = {}) {
  const beats = [];
  const speakers = [a, b].filter(Boolean);
  if (!speakers.length) return beats;
  let t = from;
  let i = 0;
  while (t < until) {
    const who = speakers[i % speakers.length];
    const other = speakers[(i + 1) % speakers.length];
    beats.push({
      at: +t.toFixed(3),
      type: "char_bubble",
      actor: who,
      icon: bubbles[i % bubbles.length],
      duration: Math.min(1.6, Math.max(0.8, interval)),
      facePlayer: false,
    });
    // They keep talking to each other, not to us.
    if (other) {
      beats.push({ at: +t.toFixed(3), type: "char_face", actor: who, targetActor: other, duration: 0.25 });
    }
    if (i % 2 === 1) {
      beats.push({
        at: +(t + 0.1).toFixed(3),
        type: "sfx",
        sound: sfx[(i >> 1) % sfx.length],
        volume: 0.42,
      });
    }
    t += interval;
    i += 1;
  }
  return beats;
}
