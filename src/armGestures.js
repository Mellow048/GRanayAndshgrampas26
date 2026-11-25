/**
 * Procedural arm & upper-body acting gestures.
 *
 * Layered *on top of* whatever clip the character is playing (just like
 * `headGestures.js`), using **character-local anatomical space**:
 *   +X = character left   (-X = character right)
 *   +Y = up               (-Y = down)
 *   +Z = character forward
 *
 * Right-hand rule convention on deltas applied in character space:
 *   - `x < 0` swings a hanging arm FORWARD & UP (`-1.35` ≈ straight forward)
 *   - `x > 0` leans spine FORWARD (`+0.25` ≈ lean in to sniff/look)
 *   - `z < 0` raises the RIGHT arm (`-X` side) OUT/UP laterally (`-1.85` ≈ overhead wave)
 *   - `z > 0` raises the LEFT arm (`+X` side) OUT/UP laterally
 *
 * `assetLoader.js` converts these character-space deltas through `root` and
 * each bone's `parent.getWorldQuaternion()` so Granny (`Bip01`) and Grandpa
 * (`grandpa_blender`) move identically with zero broken/twisted bones.
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
    label: "hold both arms bent forward at chest/waist height to carry a tray, plate, or pizza",
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
    label: "raise right hand overhead/side and wave side-to-side",
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
  shrug: {
    label: "hike both shoulders upward and splay forearms outward in an unmistakable idk shrug",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  idk: {
    label: "alias of shrug — raise shoulders and turn hands out",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  angry_hips: {
    label: "flare both elbows out onto hips in an impatient stance",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
  },
  clap: {
    label: "bring both hands together repeatedly in front of chest",
    cycles: 4,
    amplitude: 1.0,
    hold: false,
  },
  reach_both: {
    label: "extend both arms forward eagerly toward a target",
    cycles: 1,
    amplitude: 1.0,
    hold: true,
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
  const fadeIn = hold ? 0.16 : 0.18;
  const fadeOut = hold ? 0.2 : 0.22;
  if (p <= 0 || p >= 1) return 0;
  if (p < fadeIn) return smoothstep(p / fadeIn);
  if (p > 1 - fadeOut) return smoothstep((1 - p) / fadeOut);
  return 1;
}

const ZERO_POSE = Object.freeze({
  rShoulder: { x: 0, y: 0, z: 0 },
  lShoulder: { x: 0, y: 0, z: 0 },
  rUpper: { x: 0, y: 0, z: 0 },
  rFore: { x: 0, y: 0, z: 0 },
  lUpper: { x: 0, y: 0, z: 0 },
  lFore: { x: 0, y: 0, z: 0 },
  spine: { x: 0, y: 0, z: 0 },
  envelope: 0,
});

/**
 * Sample character-space Euler radian deltas for clavicles, upper arms,
 * forearms, and spine at `elapsed` seconds inside a `duration` window.
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
    rShoulder: { x: 0, y: 0, z: 0 },
    lShoulder: { x: 0, y: 0, z: 0 },
    rUpper: { x: 0, y: 0, z: 0 },
    rFore: { x: 0, y: 0, z: 0 },
    lUpper: { x: 0, y: 0, z: 0 },
    lFore: { x: 0, y: 0, z: 0 },
    spine: { x: 0, y: 0, z: 0 },
    envelope: env,
  };

  switch (spec.name) {
    case "stir":
      out.rUpper.x = (-0.7 + Math.sin(phase) * 0.14) * amp;
      out.rUpper.y = (0.18 + Math.cos(phase) * 0.18) * amp;
      out.rFore.x = (-0.52 + Math.cos(phase) * 0.16) * amp;
      out.lUpper.x = -0.25 * amp;
      out.spine.x = 0.12 * amp;
      break;

    case "offer":
    case "reach_out":
      out.rUpper.x = -1.05 * amp;
      out.rUpper.y = 0.12 * amp;
      out.rFore.x = -0.25 * amp;
      out.spine.x = 0.08 * amp;
      break;

    case "carry":
      out.rUpper.x = -0.58 * amp;
      out.rFore.x = -0.78 * amp;
      out.lUpper.x = -0.58 * amp;
      out.lFore.x = -0.78 * amp;
      break;

    case "place_down": {
      const dip = Math.sin(p * Math.PI);
      out.rUpper.x = (-0.75 + dip * 0.25) * amp;
      out.rFore.x = (-0.3 - dip * 0.2) * amp;
      out.spine.x = 0.2 * dip * amp;
      break;
    }

    case "wave":
      // Raise right arm clearly above shoulder (-Z rotates -Y through -X to +Y) and wave forearm overhead
      out.rUpper.x = -0.22 * amp;
      out.rUpper.z = -2.45 * amp;
      out.rFore.z = (-0.25 + Math.sin(phase) * 0.38) * amp;
      break;

    case "point":
      out.rUpper.x = -1.28 * amp;
      out.rFore.x = -0.08 * amp;
      break;

    case "sniff": {
      const dip = Math.abs(Math.sin(phase * 0.5));
      out.spine.x = (0.24 + dip * 0.14) * amp;
      out.rUpper.x = -0.18 * amp;
      out.lUpper.x = -0.18 * amp;
      break;
    }

    case "shrug":
    case "idk":
      // Hike clavicles UP (+Y), keep upper arms tucked near ribs (counter z slightly),
      // bend elbows forward/up ~75° (rFore.x) and splay forearms/palms outward (rFore.y) like ¯\_(ツ)_/¯
      out.rShoulder.z = -0.32 * amp;
      out.lShoulder.z = 0.32 * amp;
      out.rUpper.z = 0.14 * amp;
      out.lUpper.z = -0.14 * amp;
      out.rFore.x = -1.3 * amp;
      out.lFore.x = -1.3 * amp;
      out.rFore.y = -0.52 * amp;
      out.lFore.y = 0.52 * amp;
      break;

    case "angry_hips":
      out.rUpper.z = -0.55 * amp;
      out.lUpper.z = 0.55 * amp;
      out.rFore.z = 0.95 * amp;
      out.lFore.z = -0.95 * amp;
      out.spine.x = 0.08 * amp;
      break;

    case "clap": {
      const snap = Math.abs(Math.sin(phase));
      out.rUpper.x = -0.78 * amp;
      out.lUpper.x = -0.78 * amp;
      out.rUpper.y = (0.25 + snap * 0.22) * amp;
      out.lUpper.y = (-0.25 - snap * 0.22) * amp;
      out.rFore.x = -0.65 * amp;
      out.lFore.x = -0.65 * amp;
      break;
    }

    case "reach_both":
      out.rUpper.x = -1.08 * amp;
      out.lUpper.x = -1.08 * amp;
      out.rFore.x = -0.22 * amp;
      out.lFore.x = -0.22 * amp;
      out.spine.x = 0.1 * amp;
      break;

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
      applyVec(out.rShoulder, spec.rShoulder, false);
      applyVec(out.lShoulder, spec.lShoulder, false);
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
