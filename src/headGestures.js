/**
 * Procedural head gestures.
 *
 * A gesture is a rotation of the head bone layered *on top of* whatever clip the
 * character is already playing, so `grandpa` can keep laughing while he nods.
 * Nothing here needs an FBX, a Blender round-trip or an importer: an episode just
 * asks for `{ anim: "nod" }` (or a `char_gesture` beat) and the neck moves.
 *
 * The samples are pure numbers so they can be unit-tested without three.js.
 */

const TAU = Math.PI * 2;

/**
 * The catalogue. `axis` is the head-bone axis the motion happens around:
 *   pitch → chin down/up (yes),  yaw → left/right (no),  roll → ear to shoulder.
 * `amplitude` is in radians. `cycles` is how many swings happen in the window.
 */
export const HEAD_GESTURES = {
  nod: {
    axis: "pitch",
    amplitude: 0.42,
    cycles: 2.5,
    label: "yes: clear crisp chin dips",
  },
  nod_yes: {
    axis: "pitch",
    amplitude: 0.42,
    cycles: 2.5,
    label: "alias of nod",
  },
  nod_once: {
    axis: "pitch",
    amplitude: 0.34,
    cycles: 1,
    label: "a single slow agreement dip",
  },
  shake: {
    axis: "yaw",
    amplitude: 0.54,
    cycles: 2.5,
    label: "no: clear crisp head swings side to side",
  },
  shake_no: {
    axis: "yaw",
    amplitude: 0.54,
    cycles: 2.5,
    label: "alias of shake",
  },
  tilt: {
    axis: "roll",
    amplitude: 0.32,
    cycles: 1,
    hold: true,
    label: "curious head tilt that stays put until the beat ends",
  },
  double_take: {
    axis: "pitch",
    amplitude: 0.42,
    cycles: 1.5,
    fadeIn: 0.08,
    label: "whip round and back: the classic double take",
  },
};

/** Names usable anywhere an `anim` is accepted. */
export const HEAD_GESTURE_NAMES = Object.keys(HEAD_GESTURES);

export function isHeadGesture(name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(HEAD_GESTURES, name);
}

/** Returns the (possibly overridden) spec for a gesture, or null. */
export function headGestureSpec(name, overrides = {}) {
  if (!isHeadGesture(name)) return null;
  const base = HEAD_GESTURES[name];
  const amplitude = Number.isFinite(overrides.amplitude) ? overrides.amplitude : base.amplitude;
  const cycles = Number.isFinite(overrides.cycles) ? overrides.cycles : base.cycles;
  return {
    ...base,
    ...overrides,
    name,
    // Keep the sign but never let an agent hand us an unusable amplitude.
    amplitude: Math.max(-1.2, Math.min(1.2, amplitude)),
    cycles: Math.max(0.25, Math.min(8, cycles)),
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/**
 * Envelope: eases the gesture in and out so it never pops the neck.
 * `hold` gestures ramp in and stay at full amplitude until the beat ends.
 */
export function gestureEnvelope(progress, spec = {}) {
  const p = clamp01(progress);
  const fadeIn = Number.isFinite(spec.fadeIn) ? Math.max(0.01, spec.fadeIn) : 0.18;
  const fadeOut = Number.isFinite(spec.fadeOut) ? Math.max(0.01, spec.fadeOut) : 0.18;
  if (spec.hold) return smoothstep(p / fadeIn);
  if (p < fadeIn) return smoothstep(p / fadeIn);
  if (p > 1 - fadeOut) return smoothstep((1 - p) / fadeOut);
  return 1;
}

/**
 * Samples a gesture at `elapsed` seconds into a `duration` second window.
 * Returns `{ yaw, pitch, roll }` in radians — small additive offsets.
 */
export function sampleHeadGesture(name, elapsed, duration, overrides = {}) {
  const spec = headGestureSpec(name, overrides);
  if (!spec) return { yaw: 0, pitch: 0, roll: 0 };

  const span = Math.max(0.05, Number.isFinite(duration) ? duration : 0.8);
  const progress = clamp01((Number.isFinite(elapsed) ? elapsed : 0) / span);
  const env = gestureEnvelope(progress, spec);
  const phase = Number.isFinite(spec.phase) ? spec.phase : 0;
  const value = spec.amplitude * env * Math.sin(TAU * spec.cycles * progress + phase);

  return {
    yaw: spec.axis === "yaw" ? value : 0,
    pitch: spec.axis === "pitch" ? value : 0,
    roll: spec.axis === "roll" ? value : 0,
  };
}

/**
 * Convenience for docs/tools: a compact list an agent can read to know what it
 * may write in a beat.
 */
export function describeHeadGestures() {
  return HEAD_GESTURE_NAMES.map((name) => ({
    name,
    axis: HEAD_GESTURES[name].axis,
    amplitude: HEAD_GESTURES[name].amplitude,
    cycles: HEAD_GESTURES[name].cycles,
    label: HEAD_GESTURES[name].label,
  }));
}
