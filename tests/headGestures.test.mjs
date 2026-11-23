import test from "node:test";
import assert from "node:assert/strict";
import {
  HEAD_GESTURES,
  HEAD_GESTURE_NAMES,
  isHeadGesture,
  headGestureSpec,
  sampleHeadGesture,
  gestureEnvelope,
} from "../src/headGestures.js";

const peakOf = (name, duration = 0.8, samples = 240, overrides = {}) => {
  let best = { yaw: 0, pitch: 0, roll: 0 };
  for (let i = 0; i <= samples; i += 1) {
    const s = sampleHeadGesture(name, (i / samples) * duration, duration, overrides);
    for (const axis of ["yaw", "pitch", "roll"]) {
      if (Math.abs(s[axis]) > Math.abs(best[axis])) best[axis] = s[axis];
    }
  }
  return best;
};

test("the catalogue exposes nodding and head-shaking by name", () => {
  for (const name of ["nod", "nod_yes", "shake", "shake_no", "tilt"]) {
    assert.ok(isHeadGesture(name), `${name} is a registered gesture`);
    assert.ok(HEAD_GESTURE_NAMES.includes(name));
  }
  assert.equal(isHeadGesture("walk"), false);
  assert.equal(isHeadGesture("definitely_not_a_gesture"), false);
});

test("nodding moves the head on pitch and nothing else", () => {
  const peak = peakOf("nod");
  assert.ok(Math.abs(peak.pitch) > 0.2, `pitch peaks at ${peak.pitch}`);
  assert.equal(peak.yaw, 0);
  assert.equal(peak.roll, 0);
});

test("shaking is the opposite axis: yaw only", () => {
  const peak = peakOf("shake");
  assert.ok(Math.abs(peak.yaw) > 0.3, `yaw peaks at ${peak.yaw}`);
  assert.equal(peak.pitch, 0);
  assert.equal(peak.roll, 0);
});

test("a nod and a shake are not the same motion", () => {
  const nod = sampleHeadGesture("nod", 0.2, 0.8);
  const shake = sampleHeadGesture("shake", 0.2, 0.8);
  assert.notEqual(nod.pitch, shake.pitch);
  assert.ok(Math.abs(nod.pitch) > 0);
});

test("gestures start and end at rest so the neck never pops", () => {
  for (const name of HEAD_GESTURE_NAMES) {
    const duration = 0.9;
    const first = sampleHeadGesture(name, 0, duration);
    const last = sampleHeadGesture(name, duration, duration);
    for (const axis of ["yaw", "pitch", "roll"]) {
      assert.ok(Math.abs(first[axis]) < 1e-9, `${name} starts at rest (${axis})`);
      assert.ok(Math.abs(last[axis]) < 1e-9, `${name} ends at rest (${axis})`);
    }
  }
});

test("the envelope rises, holds and falls inside the window", () => {
  assert.equal(gestureEnvelope(0, {}), 0);
  assert.equal(gestureEnvelope(1, {}), 0);
  assert.equal(gestureEnvelope(0.5, {}), 1);
  const held = gestureEnvelope(0.9, { hold: true });
  assert.ok(held > 0.99, "a hold gesture is still at full amplitude late in the beat");
});

test("tilt is a hold: it is still tilted most of the way through", () => {
  const late = sampleHeadGesture("tilt", 1.05, 1.2);
  assert.ok(Math.abs(late.roll) > 0.05, `tilt holds at ${late.roll}`);
});

test("overrides are clamped to sane values", () => {
  const wild = headGestureSpec("nod", { amplitude: 99, cycles: -4 });
  assert.ok(wild.amplitude <= 1.2);
  assert.ok(wild.cycles >= 0.25);
  const tiny = headGestureSpec("nod", { amplitude: -99, cycles: 500 });
  assert.ok(tiny.amplitude >= -1.2);
  assert.ok(tiny.cycles <= 8);
});

test("an unknown gesture samples as silence instead of throwing", () => {
  assert.deepEqual(sampleHeadGesture("moonwalk", 0.4, 0.8), { yaw: 0, pitch: 0, roll: 0 });
  assert.equal(headGestureSpec("moonwalk"), null);
});

test("a longer beat slows the nod down instead of adding beats", () => {
  const countCrossings = (duration) => {
    let crossings = 0;
    let prev = 0;
    for (let i = 0; i <= 400; i += 1) {
      const v = sampleHeadGesture("nod", (i / 400) * duration, duration).pitch;
      if (prev !== 0 && Math.sign(v) !== Math.sign(prev)) crossings += 1;
      prev = v;
    }
    return crossings;
  };
  assert.equal(countCrossings(0.8), countCrossings(1.6));
});

test("HEAD_GESTURES entries all carry the fields the rig needs", () => {
  for (const [name, spec] of Object.entries(HEAD_GESTURES)) {
    assert.ok(["yaw", "pitch", "roll"].includes(spec.axis), `${name} has a valid axis`);
    assert.ok(Number.isFinite(spec.amplitude) && spec.amplitude > 0, `${name} has amplitude`);
    assert.ok(Number.isFinite(spec.cycles) && spec.cycles > 0, `${name} has cycles`);
    assert.ok(typeof spec.label === "string" && spec.label.length > 3, `${name} is described`);
  }
});
