import test from "node:test";
import assert from "node:assert/strict";

import { EPISODE_PRESETS } from "../src/config.js";
import { WAKE_TO_RIDE_120S } from "../src/episodes.js";
import { validateStorySpine } from "../src/storySpine.js";

test("the two-minute wake-to-ride test is a continuous four-scene preset", () => {
  assert.equal(EPISODE_PRESETS.wake_to_ride_120s, WAKE_TO_RIDE_120S);
  assert.equal(WAKE_TO_RIDE_120S.transitions, "continuous");
  assert.equal(WAKE_TO_RIDE_120S.skits.length, 4);
  assert.match(WAKE_TO_RIDE_120S.skits[0].name, /Wake Up/);
  assert.match(WAKE_TO_RIDE_120S.skits[1].name, /Toy Car Becomes/);
  assert.match(WAKE_TO_RIDE_120S.skits[2].name, /Drive Around the House/);
  assert.match(WAKE_TO_RIDE_120S.skits[3].name, /Park It/);
  const finalSpan = Number(WAKE_TO_RIDE_120S.skits.at(-1).name.match(/-(\d+\.\d+)s\)/)?.[1]);
  assert.ok(finalSpan >= 119.9 && finalSpan <= 120.1, `expected ~120 seconds, got ${finalSpan}`);
});

test("the car carries the story through setup, transformation, drive and payoff", () => {
  const spine = validateStorySpine(WAKE_TO_RIDE_120S);
  assert.equal(spine.ok, true, JSON.stringify(spine.errors));
  assert.equal(spine.stats.goalPropScenes, 4);
  assert.deepEqual(WAKE_TO_RIDE_120S.props.map(({ id, type }) => [id, type]), [["car", "car"]]);
});

test("the episode hides Granny until the blind-corner reveal and uses no speech bubbles", () => {
  const granny = WAKE_TO_RIDE_120S.cast.find(({ id }) => id === "granny");
  assert.equal(granny.visible, false);
  const beats = WAKE_TO_RIDE_120S.skits.flatMap((scene) => scene.beats);
  assert.ok(beats.some((beat) => beat.type === "char_visibility" && beat.actor === "granny" && beat.visible));
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "grow" && beat.prop === "car"));
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "drive" && beat.path?.length > 8));
  assert.ok(beats.every((beat) => beat.type !== "char_bubble"));
  assert.ok(beats.every((beat) => !(beat.type === "char_anim" && beat.anim === "talk")));
});
