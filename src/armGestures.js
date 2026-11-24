/**
 * Procedural arm & upper-body acting gestures.
 *
 * Layered *on top of* whatever clip the character is playing (just like
 * `headGestures.js`), so Granny can visibly stir a frying pan, hold a hot
 * breakfast plate right up near Grandpa's nose, carry a tray, set food down,
 * wave, point, or Grandpa can lean in and sniff the food — without needing
 * custom FBX mocap for every single everyday action.
 *
 * Pure math (no three.js) so it is 100% unit-testable in Node.
 */

const TAU = Math.PI * 2;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const ARM_GESTURES = {
  stir: {
    label: "stirring a pan or pot in front of the body",
    cycles: 3,
    amplitude: 1.0,
    hold: false,
  },
  offer: {
    label: "extend right arm forward and slightly up to present food/item near someone's face",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  reach_out: {
    label: "alias of offer — reach right arm forward toward a target",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  carry: {
    label: "hold both arms forward at chest/waist height to carry a tray, plate, or box",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  place_down: {
    label: "extend arm forward, lower smoothly onto a table surface, and retract",
    cycles: 1,
    amplitude: 1.0,
    hold: false,
  },
  wave: {
    label: "raise right hand and wave side-to-side",
    cycles: 3,
    amplitude: 1.0,
    hold: false,
  },
  point: {
    label: "extend right arm straight forward to point at something",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  sniff: {
    label: "lean upper torso forward and take two clear sniffing dips toward food",
    cycles: 2,
    amplitude: 1.0,
    hold: false,
  },
  custom: {
    label: "inline agent-defined arm/spine pose via rUpper/rFore/lUpper/lFore/spine [x,y,z] + optional oscillate",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
};

export const ARM_GESTURE_NAMES = Object.keys(ARM_GESTURES);

export function isArmGesture(name) {
  return typeof name === "string" && Object.prototype.hasOwnProperty.call(ARM_GESTURES, name);
}

export function armGestureSpec(name, overrides = {}) {
  if (!isArmGesture(name)) return null;
  const base = ARM_GESTURES[name];
  const amplitude = Number.isFinite(overrides.amplitude) ? overrides.amplitude : base.amplitude;
  const cycles = Number.isFinite(overrides.cycles) ? overrides.cycles : base.cycles;
  return {
    ...base,
    ...overrides,
    name,
    amplitude: Math.max(0.1, Math.min(1.8, amplitude)),
    cycles: Math.max(0.5, Math.min(8, cycles)),
  };
}

export function armEnvelope(progress, hold = false) {
  const p = clamp01(progress);
  const fadeIn = 0.16;
  const fadeOut = 0.2;
  if (p <= 0 || p >= 1) return 0;
  if (p < fadeIn) return smoothstep(p / fadeIn);
  if (p > 1 - fadeOut) return smoothstep((1 - p) / fadeOut);
  return 1;
}

const ZERO_POSE = Object.freeze({
  rUpper: { x: 0, y: 0, z: 0 },
  rFore: { x: 0, y: 0, z: 0 },
  lUpper: { x: 0, y: 0, z: 0 },
  lFore: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  envelope: 0,
});

/**
 * Sample Euler radian offsets for right/left upper arm, forearm, and spine
 * at `elapsed` seconds inside a `duration` window.
 * Starts and ends at exact zero so bones never pop.
 */
export function sampleArmGesture(name, elapsed, duration, overrides = {}) {
  const spec = armGestureSpec(name, overrides);
  if (!spec || !(duration > 0)) return ZERO_POSE;
  const p = clamp01(elapsed / duration);
  const env = armEnvelope(p, spec.hold);
  if (env <= 1e-6) return ZERO_POSE;

  const amp = spec.amplitude * env;
  const phase = p * spec.cycles * TAU;
  const out = {
    rUpper: { x: 0, y: 0, z: 0 },
    rFore: { x: 0, y: 0, z: 0 },
    lUpper: { x: 0, y: 0, z: 0 },
    lFore: { x: 0, y: 0, z: 0 },
    spine: { x: 0, y: 0, z: 0 },
    envelope: env,
  };

  switch (spec.name) {
    case "stir":
      // Right arm lifted forward over counter + circular forearm stirring motion
      out.rUpper.x = (-0.75 + Math.sin(phase) * 0.16) * amp;
      out.rUpper.y = (0.2 + Math.cos(phase) * 0.22) * amp;
      out.rFore.x = (-0.55 + Math.cos(phase) * 0.18) * amp;
      out.lUpper.x = -0.35 * amp;
      out.spine.x = 0.12 * amp;
      break;

    case "offer":
    case "reach_out":
      // Right arm clearly extended forward and slightly raised (e.g. holding plate to nose)
      out.rUpper.x = -1.08 * amp;
      out.rUpper.y = 0.12 * amp;
      out.rFore.x = -0.22 * amp;
      out.spine.x = 0.1 * amp;
      break;

    case "carry":
      // Both arms bent forward at waist/chest level holding a tray or plate
      out.rUpper.x = -0.58 * amp;
      out.rFore.x = -0.78 * amp;
      out.lUpper.x = -0.58 * amp;
      out.lFore.x = -0.78 * amp;
      break;

    case "place_down": {
      // Extend forward, dip down toward table height in middle of window, then pull back
      const dip = Math.sin(p * Math.PI);
      out.rUpper.x = (-0.85 + dip * 0.35) * amp;
      out.rFore.x = (-0.25 - dip * 0.2) * amp;
      out.spine.x = (0.24 * dip) * amp;
      break;
    }

    case "wave":
      out.rUpper.x = -1.45 * amp;
      out.rUpper.z = (-0.35 + Math.sin(phase) * 0.28) * amp;
      out.rFore.z = Math.sin(phase + 0.4) * 0.42 * amp;
      break;

    case "point":
      out.rUpper.x = -1.32 * amp;
      out.rFore.x = -0.05 * amp;
      break;

    case "sniff": {
      // Torso leans forward with two clear sniffing dips toward the food
      const dip = Math.abs(Math.sin(phase * 0.5));
      out.spine.x = (0.26 + dip * 0.14) * amp;
      out.rUpper.x = -0.2 * amp;
      out.lUpper.x = -0.2 * amp;
      break;
    }

    case "custom": {
      const wave = Math.sin(phase);
      const osc = Array.isArray(spec.oscillate) ? spec.oscillate : [0, 0, 0];
      const applyVec = (target, arr, addOsc = false) => {
        if (!Array.isArray(arr)) return;
        const clampR = (v) => Math.max(-2.2, Math.min(2.2, Number(v) || 0));
        target.x = (clampR(arr[0]) + (addOsc ? clampR(osc[0]) * wave : 0)) * amp;
        target.y = (clampR(arr[1]) + (addOsc ? clampR(osc[1]) * wave : 0)) * amp;
        target.z = (clampR(arr[2]) + (addOsc ? clampR(osc[2]) * wave : 0)) * amp;
      };
      applyVec(out.rUpper, spec.rUpper, true);
      applyVec(out.rFore, spec.rFore, true);
      applyVec(out.lUpper, spec.lUpper, false);
      applyVec(out.lFore, spec.lFore, false);
      applyVec(out.spine, spec.spine, false);
      break;
    }

    default:
      break;
  }

  return out;
}
