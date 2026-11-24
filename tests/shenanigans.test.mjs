import test from "node:test";
import assert from "node:assert/strict";

import { EPISODE_PRESETS } from "../src/config.js";
import { SHENANIGANS_45S } from "../src/episodes.js";
import { GAG_REGISTRY } from "../src/gags/index.js";

test("Shenanigans is registered as a three-scene framework episode", () => {
  assert.equal(EPISODE_PRESETS.shenanigans_45s, SHENANIGANS_45S);
  assert.equal(SHENANIGANS_45S.skits.length, 3);
  assert.match(SHENANIGANS_45S.skits[0].name, /Tag Chase/);
  assert.match(SHENANIGANS_45S.skits[1].name, /Car Ride/);
  assert.match(SHENANIGANS_45S.skits[2].name, /Foot Race/);
  assert.ok(GAG_REGISTRY.tagChase && GAG_REGISTRY.carRide && GAG_REGISTRY.footRace);
});

test("Shenanigans tells the story with gestures and only the activity's needed prop", () => {
  assert.deepEqual(SHENANIGANS_45S.props.map(({ type }) => type), ["car"]);
  const beats = SHENANIGANS_45S.skits.flatMap((scene) => scene.beats);
  assert.ok(beats.some((beat) => beat.type === "char_gesture"));
  assert.ok(beats.some((beat) => beat.type === "player_gesture"));
  assert.ok(beats.every((beat) => beat.type !== "char_bubble"));
  assert.ok(beats.every((beat) => !(beat.type === "char_anim" && beat.anim === "talk")));
});
