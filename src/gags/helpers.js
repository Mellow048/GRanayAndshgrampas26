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
