import test from "node:test";
import assert from "node:assert/strict";
import {
  ARM_GESTURES,
  ARM_GESTURE_NAMES,
  isArmGesture,
  sampleArmGesture,
} from "../src/armGestures.js";

test("arm gesture catalogue exposes cooking, offering, carrying, placing, waving, pointing, and sniffing", () => {
  for (const name of ["stir", "offer", "reach_out", "carry", "place_down", "wave", "point", "sniff"]) {
    assert.ok(isArmGesture(name), `${name} is registered`);
    assert.ok(ARM_GESTURES[name].label, `${name} has a description`);
  }
});

test("every arm gesture starts and ends at exact zero rest pose so shoulders never pop", () => {
  for (const name of ARM_GESTURE_NAMES) {
    const start = sampleArmGesture(name, 0, 1.5);
    const end = sampleArmGesture(name, 1.5, 1.5);
    assert.equal(start.envelope, 0, `${name} starts at rest`);
    assert.equal(end.envelope, 0, `${name} ends at rest`);
  }
});

test("stir moves the right arm in a cooking motion while sniff leans the upper spine forward", () => {
  const stir = sampleArmGesture("stir", 0.6, 1.5);
  assert.ok(Math.abs(stir.rUpper.x) > 0.3, "stir raises right upper arm");
  assert.ok(Math.abs(stir.rFore.x) > 0.2, "stir bends right forearm");

  const sniff = sampleArmGesture("sniff", 0.7, 1.5);
  assert.ok(sniff.spine.x > 0.2, "sniff leans spine forward toward food");

  const offer = sampleArmGesture("offer", 0.7, 1.5);
  assert.ok(offer.rUpper.x < -0.8, "offer extends right arm forward toward target face");
});

test("unknown arm gesture samples cleanly as silence without throwing", () => {
  const s = sampleArmGesture("backflip_tornado", 0.5, 1.0);
  assert.equal(s.envelope, 0);
  assert.equal(s.rUpper.x, 0);
});


test("v3.1: custom inline arm poses work out of the box without editing armGestures.js", () => {
  const s = sampleArmGesture("custom", 0.5, 1.0, {
    rUpper: [-1.2, 0.2, 0],
    rFore: [-0.4, 0, 0],
    spine: [0.18, 0, 0],
    oscillate: [0.2, 0, 0],
    cycles: 2,
  });
  assert.ok(s.envelope > 0.9);
  assert.ok(s.rUpper.x < -0.9, "custom rUpper pose applied");
  assert.ok(s.spine.x > 0.15, "custom spine lean applied");
});
