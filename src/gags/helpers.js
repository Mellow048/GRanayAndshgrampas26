/**
 * Concise, dead-air-proof gag authoring primitives.
 * Every helper emits flat `at`-timed beats compatible with `buildEpisode()` and `audit-pacing.mjs`.
 */

/**
 * Character reaction bundle: auto-faces camera (unless `facePlayer: false`),
 * triggers animation + thought bubble + optional SFX/BGM duck.
 */
export function react({
  at,
  actor,
  anim = null,
  loop = false,
  icon = null,
  bubbleDur = 1.4,
  sfx = null,
  volume = undefined,
  cutBgm = false,
  cutBgmDuration = 1.0,
  facePlayer = true,
} = {}) {
  const beats = [];
  if (anim) {
    beats.push({ at, type: "char_anim", actor, anim, loop, facePlayer });
  }
  if (icon) {
    beats.push({ at: +(at + 0.05).toFixed(3), type: "char_bubble", actor, icon, duration: bubbleDur, facePlayer });
  }
  if (sfx) {
    const sfxBeat = { at, type: "sfx", sound: sfx };
    if (volume !== undefined) sfxBeat.volume = volume;
    if (cutBgm) {
      sfxBeat.cutBgm = true;
      sfxBeat.cutBgmDuration = cutBgmDuration;
    }
    beats.push(sfxBeat);
  }
  return beats;
}

/**
 * Launches a prop from `from` -> `to` with optional camera tracking and whoosh SFX.
 */
export function launchProp({
  at,
  prop,
  from,
  to,
  travelDuration = 1.2,
  yOffset = 0.3,
  sfx = "whoosh",
  track = true,
  lookDur = 0.25,
} = {}) {
  const beats = [
    { at, type: "prop_action", prop, action: "pop_out", waypoint: from, to, travelDuration, yOffset },
  ];
  if (sfx) beats.push({ at, type: "sfx", sound: sfx });
  if (track) beats.push({ at: +(at + 0.08).toFixed(3), type: "player_look", target: prop, duration: lookDur, track: true });
  return beats;
}

/**
 * Staggered two-character chase so victim & chaser never clip into each other.
 */
export function chase({
  at,
  victim,
  chaser,
  via = [],
  to,
  duration = 2.2,
  stagger = 0.4,
  anim = "run2",
  bgm = null,
  bgmVolume = 0.26,
} = {}) {
  const beats = [];
  if (bgm) beats.push({ at, type: "bgm", sound: bgm, volume: bgmVolume });
  const moveV = { at, type: "char_move", actor: victim, to, anim, duration };
  const moveC = { at: +(at + stagger).toFixed(3), type: "char_move", actor: chaser, to, anim, duration };
  if (via.length > 0) {
    moveV.via = [...via];
    moveC.via = [...via];
  }
  beats.push(moveV, moveC);
  return beats;
}

/**
 * Sneak move with optional thought bubble and quiet foley.
 */
export function sneakUp({
  at,
  actor,
  to,
  via = [],
  duration = 1.8,
  icon = null,
  bubbleDur = 1.2,
  sfx = null,
} = {}) {
  const move = { at, type: "char_move", actor, to, anim: "sneak", duration };
  if (via.length > 0) move.via = [...via];
  const beats = [move];
  if (icon) beats.push({ at: +(at + 0.15).toFixed(3), type: "char_bubble", actor, icon, duration: bubbleDur, facePlayer: false });
  if (sfx) beats.push({ at, type: "sfx", sound: sfx });
  return beats;
}

/**
 * Player POV walk with optional `via` spine and quick look at destination.
 */
export function walkTo({ at, to, via = [], duration = 1.8, speed = undefined, lookTarget = null, track = true } = {}) {
  const w = { at, type: "player_walk", to, duration };
  if (via.length > 0) w.via = [...via];
  if (speed !== undefined) w.speed = speed;
  if (lookTarget) w.lookAhead = false;
  const beats = [w];
  if (lookTarget) {
    beats.push({ at: +(at + 0.05).toFixed(3), type: "player_look", target: lookTarget, duration: 0.26, track });
  }
  return beats;
}

/**
 * Prop action shorthand (`show`, `hide`, `open`, `close`, `bounce`, `pickup`, `stop`).
 */
export function propAction({ at, prop, action, waypoint = undefined, yOffset = undefined, sfx = null } = {}) {
  const b = { at, type: "prop_action", prop, action };
  if (waypoint !== undefined) b.waypoint = waypoint;
  if (yOffset !== undefined) b.yOffset = yOffset;
  const beats = [b];
  if (sfx) beats.push({ at, type: "sfx", sound: sfx });
  return beats;
}

/**
 * Player picks up / uses a held FPS viewmodel prop (automatically cleared at the next CUT).
 */
export function holdProp({ at, prop, use = true, duration = 0.8, sfx = "kaching" } = {}) {
  const beats = [{ at, type: "player_hold", prop, use, duration }];
  if (sfx) beats.push({ at, type: "sfx", sound: sfx });
  return beats;
}

export function lookAt({ at, target, duration = 0.22, track = false } = {}) {
  return [{ at, type: "player_look", target, duration, track }];
}

export function panic({ at, duration = 0.7, gesture = "shake_panic", sfx = null } = {}) {
  const beats = [{ at, type: "player_gesture", gesture, duration }];
  if (sfx) beats.push({ at, type: "sfx", sound: sfx });
  return beats;
}

export function handItemTo({
  at,
  giver,
  receiver,
  prop,
  targetHeight = "nose",
  duration = 2.4,
  sfx = "whoosh",
} = {}) {
  const beats = [
    { at, type: "char_face", actor: giver, targetActor: receiver, duration: 0.2 },
    { at: +(at + 0.1).toFixed(3), type: "char_arm", actor: giver, gesture: "offer", duration, facePlayer: false },
    { at: +(at + 0.1).toFixed(3), type: "prop_action", prop, action: "glide", fromActor: giver, to: receiver, targetHeight, duration: Math.min(1.1, duration * 0.5), arc: 0.08 },
    { at: +(at + 0.9).toFixed(3), type: "char_face", actor: receiver, targetActor: giver, duration: 0.2 },
    { at: +(at + 1.0).toFixed(3), type: "char_arm", actor: receiver, gesture: targetHeight === "nose" ? "sniff" : "offer", duration: 1.4, facePlayer: false },
  ];
  if (sfx) beats.push({ at: +(at + 0.2).toFixed(3), type: "sfx", sound: sfx, volume: 0.48 });
  return beats;
}

export function cookAndServe({ at, chef = "granny", guest = "grandpa", plateProp, serveWp, tableWp } = {}) {
  return [
    { at, type: "char_arm", actor: chef, gesture: "stir", duration: 2.2 },
    { at: +(at + 0.2).toFixed(3), type: "sfx", sound: "pop", volume: 0.5 },
    { at: +(at + 2.3).toFixed(3), type: "prop_action", prop: plateProp, action: "attach", actor: chef, offset: [0, 0.05, 0.24] },
    { at: +(at + 2.3).toFixed(3), type: "char_arm", actor: chef, gesture: "carry", duration: 2.2 },
    { at: +(at + 2.3).toFixed(3), type: "char_move", actor: chef, to: serveWp, anim: "walk", duration: 2.0 },
    ...handItemTo({ at: +(at + 4.5).toFixed(3), giver: chef, receiver: guest, prop: plateProp, targetHeight: "nose", duration: 2.4 }),
    { at: +(at + 7.0).toFixed(3), type: "char_face", actor: chef, target: tableWp, duration: 0.2 },
    { at: +(at + 7.1).toFixed(3), type: "char_arm", actor: chef, gesture: "place_down", duration: 1.3, facePlayer: false, target: tableWp },
    { at: +(at + 7.2).toFixed(3), type: "prop_action", prop: plateProp, action: "glide", fromActor: chef, to: tableWp, duration: 1.0, arc: 0.1 },
    { at: +(at + 8.1).toFixed(3), type: "sfx", sound: "checkmark", volume: 0.55 },
  ];
}

/**
 * Fast, unmistakable FunnyHorrorAnimation emotion burst (0.8s-1.8s).
 * Avoids ambiguous slow "nodding to talk" loops.
 * Emotions: "angry" | "sad" | "shock" | "idk" | "happy" | "offer"
 */
export function reactFast({
  at,
  actor,
  emotion = "angry",
  duration = 1.6,
  target = null,
  targetActor = null,
  facePlayer = true,
  bubble = null,
  sfx = null,
  volume = 0.72,
} = {}) {
  const beats = [];
  if (targetActor) {
    beats.push({ at, type: "char_face", actor, targetActor, duration: 0.2 });
  } else if (target) {
    beats.push({ at, type: "char_face", actor, target, duration: 0.2 });
  } else if (facePlayer) {
    beats.push({ at, type: "char_face", actor, followPlayer: true, instant: false });
  }

  const faceOpt = targetActor || target ? false : facePlayer;
  if (emotion === "angry") {
    beats.push({ at: +(at + 0.08).toFixed(3), type: "char_anim", actor, anim: "angry", duration, facePlayer: faceOpt });
    beats.push({ at: +(at + 0.1).toFixed(3), type: "char_arm", actor, gesture: "scold", duration: Math.min(duration, 1.5), facePlayer: faceOpt });
    beats.push({ at: +(at + 0.15).toFixed(3), type: "sfx", sound: sfx || "bonk", volume });
  } else if (emotion === "sad") {
    beats.push({ at: +(at + 0.08).toFixed(3), type: "char_arm", actor, gesture: "sad", duration, facePlayer: faceOpt });
    beats.push({ at: +(at + 0.1).toFixed(3), type: "char_gesture", actor, gesture: "sad", duration });
    beats.push({ at: +(at + 0.15).toFixed(3), type: "sfx", sound: sfx || "aww", volume });
  } else if (emotion === "shock") {
    beats.push({ at: +(at + 0.05).toFixed(3), type: "char_gesture", actor, gesture: "double_take", duration: Math.min(duration, 1.0) });
    beats.push({ at: +(at + 0.1).toFixed(3), type: "sfx", sound: sfx || "vine_boom", volume });
  } else if (emotion === "idk") {
    beats.push({ at: +(at + 0.08).toFixed(3), type: "char_arm", actor, gesture: "idk", duration, facePlayer: faceOpt });
    if (bubble) beats.push({ at: +(at + 0.15).toFixed(3), type: "char_bubble", actor, icon: bubble, duration: Math.max(1.6, duration), facePlayer: faceOpt });
  } else if (emotion === "offer") {
    beats.push({ at: +(at + 0.08).toFixed(3), type: "char_arm", actor, gesture: "offer", duration, facePlayer: faceOpt });
    if (sfx) beats.push({ at: +(at + 0.15).toFixed(3), type: "sfx", sound: sfx, volume });
  } else {
    beats.push({ at: +(at + 0.08).toFixed(3), type: "char_arm", actor, gesture: "clap", duration, facePlayer: faceOpt });
    if (sfx) beats.push({ at: +(at + 0.15).toFixed(3), type: "sfx", sound: sfx, volume });
  }
  return beats;
}

/**
 * Turns `actor` squarely toward surface `to`, lowers arm (`place_down`), and glides `prop` onto it.
 * Guarantees actors never put props behind their back while staring at the player.
 */
export function placeOnSurface({ at, actor, prop, to, duration = 1.0, arc = 0.12, sfx = "ding2", volume = 0.6 } = {}) {
  const beats = [
    { at, type: "char_face", actor, target: to, duration: 0.2 },
    { at: +(at + 0.12).toFixed(3), type: "char_arm", actor, gesture: "place_down", duration: duration + 0.1, facePlayer: false, target: to },
    { at: +(at + 0.18).toFixed(3), type: "prop_action", prop, action: "glide", fromActor: actor, to, duration, arc },
  ];
  if (sfx) beats.push({ at: +(at + duration + 0.15).toFixed(3), type: "sfx", sound: sfx, volume });
  return beats;
}

/**
 * Active "Best Buds" Player reaction: turns to `lookTarget`, performs gesture (`nod_yes` / `shake_no`),
 * optionally steps to `stepTo` or briefly zooms FOV (auto-resetting cleanly after `duration`).
 */
export function playerReply({ at, lookTarget = null, gesture = "nod_yes", duration = 0.75, track = true, stepTo = null } = {}) {
  const beats = [];
  if (stepTo) beats.push({ at, type: "player_walk", to: stepTo, duration: Math.max(0.8, duration) });
  if (lookTarget) beats.push({ at: +(at + 0.02).toFixed(3), type: "player_look", target: lookTarget, duration: 0.35, track });
  if (gesture) beats.push({ at: +(at + 0.2).toFixed(3), type: "player_gesture", gesture, duration });
  return beats;
}

/**
 * Steps the Player clearly aside (`playerStepTo`), then sprints `runner` fast (`ghostPlayer: true`)
 * so characters never crash into the lens or run in slow motion.
 */
export function chasePast({
  at,
  runner,
  to,
  via = [],
  playerStepTo = null,
  playerLookTarget = null,
  anim = "run",
  duration = 2.6,
  sfx = "footsteps_fast",
} = {}) {
  const beats = [];
  if (playerStepTo) {
    beats.push({ at, type: "player_walk", to: playerStepTo, duration: 0.85 });
  }
  const runAt = playerStepTo ? +(at + 0.7).toFixed(3) : at;
  const move = { at: runAt, type: "char_move", actor: runner, to, anim, duration, ghostPlayer: true, facePlayer: false };
  if (via.length) move.via = [...via];
  beats.push(move);
  if (playerLookTarget) {
    beats.push({ at: +(runAt + 0.1).toFixed(3), type: "player_look", target: playerLookTarget, duration: 0.35, track: true });
  }
  if (sfx) beats.push({ at: +(runAt + 0.1).toFixed(3), type: "sfx", sound: sfx, volume: 0.55 });
  return beats;
}

/**
 * Dual-subject "Best Buds" glance so camera doesn't lock robotically onto 1 character.
 */
export function bestBudsGlance({ at, primary, secondary, gap = 1.0 } = {}) {
  return [
    { at, type: "player_look", target: primary, duration: 0.35, track: true },
    { at: +(at + gap).toFixed(3), type: "player_look", target: secondary, duration: 0.35, track: true },
  ];
}

/**
 * FunnyHorrorAnimation-style silent physical greeting:
 * Characters turn to look at each other, one waves, the other nods. ZERO thought bubbles.
 */
export function greetAndNod({ at, a = "granny", b = "grandpa", duration = 2.0 } = {}) {
  return [
    { at, type: "char_face", actor: a, targetActor: b, duration: 0.22 },
    { at: +(at + 0.08).toFixed(3), type: "char_face", actor: b, targetActor: a, duration: 0.22 },
    { at: +(at + 0.2).toFixed(3), type: "char_arm", actor: a, gesture: "wave", duration: Math.min(1.4, duration * 0.65), facePlayer: false },
    { at: +(at + 0.75).toFixed(3), type: "char_gesture", actor: b, gesture: "nod_yes", duration: 0.9 },
  ];
}

/**
 * FunnyHorrorAnimation-style silent physical exchange:
 * Characters look at each other and communicate via nods, head shakes, tilts, and arm points/waves.
 * NEVER emits thought bubbles.
 */
export function dialogueExchange({ at, a, b, turns = 2, step = 1.6 } = {}) {
  const gestures = ["nod_yes", "tilt", "shake_no", "nod"];
  const arms = ["point", "wave"];
  const beats = [];
  for (let i = 0; i < turns; i += 1) {
    const t = +(at + i * step).toFixed(3);
    const speaker = i % 2 === 0 ? a : b;
    const listener = i % 2 === 0 ? b : a;
    beats.push(
      { at: t, type: "char_face", actor: speaker, targetActor: listener, duration: 0.2 },
      { at: t, type: "char_face", actor: listener, targetActor: speaker, duration: 0.25 },
      { at: +(t + 0.1).toFixed(3), type: "char_gesture", actor: speaker, gesture: gestures[i % gestures.length], duration: 0.9 },
      { at: +(t + 0.15).toFixed(3), type: "char_arm", actor: speaker, gesture: arms[i % arms.length], duration: 1.1, facePlayer: false }
    );
  }
  return beats;
}
