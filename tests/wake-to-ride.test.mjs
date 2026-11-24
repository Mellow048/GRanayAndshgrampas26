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
  assert.ok(finalSpan >= 100 && finalSpan <= 120.1, `expected a brisk ~2-minute cut, got ${finalSpan}`);
});

test("the car carries the story through setup, transformation, drive and payoff", () => {
  const spine = validateStorySpine(WAKE_TO_RIDE_120S);
  assert.equal(spine.ok, true, JSON.stringify(spine.errors));
  assert.equal(spine.stats.goalPropScenes, 4);
  assert.deepEqual(WAKE_TO_RIDE_120S.props.map(({ id, type }) => [id, type]), [["car", "car"]]);
});

test("the wake uses the real upstairs bed and walks continuously down the staircase", () => {
  assert.equal(WAKE_TO_RIDE_120S.playerPosture, "lying");
  assert.equal(WAKE_TO_RIDE_120S.playerSpawn, "up_bed_side");
  assert.equal(WAKE_TO_RIDE_120S.cast.find(({ id }) => id === "grandpa").pose, "lying");
  assert.ok(!WAKE_TO_RIDE_120S.props.some(({ type }) => type === "bed"), "use the built-in bed, not a fake spawned bed");
  const beats = WAKE_TO_RIDE_120S.skits.flatMap((scene) => scene.beats);
  assert.ok(beats.some((beat) => beat.type === "player_pose" && beat.pose === "stand"));
  assert.equal(beats.filter((beat) => beat.type === "player_crouch").length, 0, "no fake crouch-to-stand cycle");
  assert.ok(beats.filter((beat) => beat.type === "player_walk").every((beat) => beat.speed >= 3.5));
  assert.ok(beats.some((beat) => beat.type === "player_walk" && beat.to === "hall_corner" && beat.via?.includes("stairs_middle")), "the player walks down the real staircase");
  assert.ok(beats.some((beat) => beat.type === "player_ride"), "camera follows the car from the driver seat");
  assert.ok(!beats.some((beat) => beat.type === "player_walk" && beat.at >= 44), "do not walk away from the driven car");
  assert.ok(!beats.some((beat) => beat.type === "cut"), "no hidden teleport");
});

test("Granny enters by walking from the doorway; the toss is visible and dialogue-free", () => {
  const granny = WAKE_TO_RIDE_120S.cast.find(({ id }) => id === "granny");
  assert.equal(granny.visible, false);
  const beats = WAKE_TO_RIDE_120S.skits.flatMap((scene) => scene.beats);
  const reveal = beats.findIndex((beat) => beat.type === "char_visibility" && beat.actor === "granny" && beat.visible);
  const entrance = beats.findIndex((beat) => beat.type === "char_move" && beat.actor === "granny" && beat.to === "doorway_dining");
  assert.ok(reveal >= 0 && entrance > reveal, "Granny must be revealed before her authored walk into the doorway");
  assert.ok(!beats.some((beat) => beat.type === "char_cut" && beat.actor === "granny"), "no abrupt Granny teleport");
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "place" && beat.waypoint === "living_room_entry"));
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "pop_out" && beat.waypoint === "living_room_entry" && beat.to === "living_room"));
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "grow" && beat.prop === "car"));
  assert.ok(beats.some((beat) => beat.type === "prop_action" && beat.action === "drive" && beat.path?.length > 8));
  assert.ok(beats.some((beat) => beat.type === "player_ride" && beat.prop === "car"));
  assert.ok(beats.every((beat) => beat.type !== "char_bubble"));
  assert.ok(beats.every((beat) => !(beat.type === "char_anim" && beat.anim === "talk")));
});
