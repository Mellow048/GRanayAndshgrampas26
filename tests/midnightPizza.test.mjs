import test from "node:test";
import assert from "node:assert/strict";
import { MIDNIGHT_PIZZA_HEIST_2M } from "../src/episodes/midnightPizzaHeist2m.js";
import { validateAndRepair } from "../src/episodeSafety.js";
import { validateStorySpine } from "../src/storySpine.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { greetAndNod, dialogueExchange, handItemTo } from "../src/gags/helpers.js";
import { chunkEpisode } from "../scripts/chunk-episode.mjs";
import { pointInFurniture, pushOutOfFurniture, findSegmentFurnitureHit } from "../src/furnitureColliders.js";

test("midnight_pizza_heist_2m passes strict validation with zero warnings, zero furniture collisions, active player walking/gestures, strategic ??? portrait bubbles, and 4/4 story spine", () => {
  const res = validateAndRepair(MIDNIGHT_PIZZA_HEIST_2M, {
    setMap: SET_MAP,
    navGraph: NAV_GRAPH,
    autoFix: false,
  });
  assert.equal(res.stats.errorsBefore, 0, JSON.stringify(res.issues, null, 2));
  assert.equal(res.stats.warningsBefore, 0, JSON.stringify(res.issues, null, 2));

  const allBeats = (MIDNIGHT_PIZZA_HEIST_2M.skits || []).flatMap((s) => s.beats || []);
  const bubbles = allBeats.filter((b) => b.type === "char_bubble");
  assert.ok(bubbles.length >= 2 && bubbles.length <= 6, `expected 2..6 strategic thought bubbles, got ${bubbles.length}`);
  assert.ok(bubbles.some((b) => b.icon === "where_granny"), "uses where_granny ??? portrait bubble");
  assert.ok(bubbles.some((b) => b.icon === "where_grandpa"), "uses where_grandpa ??? portrait bubble");

  const playerWalks = allBeats.filter((b) => b.type === "player_walk");
  const playerGestures = allBeats.filter((b) => b.type === "player_gesture");
  assert.ok(playerWalks.length >= 5, `expected active room-to-room player walking, got ${playerWalks.length}`);
  assert.ok(playerGestures.length >= 4, "player actively nods/shakes/interacts with characters");

  const weirdAnims = allBeats.filter(
    (b) => b.type === "char_anim" && (b.anim === "laugh" || b.anim === "sit")
  );
  assert.equal(weirdAnims.length, 0, "episode must avoid unmotivated laugh/chairless sit animations");

  const spine = validateStorySpine(MIDNIGHT_PIZZA_HEIST_2M);
  assert.equal(spine.ok, true, JSON.stringify(spine.errors));
  assert.ok(spine.stats.goalPropScenes >= 3, `expected >=3 goalPropScenes, got ${spine.stats.goalPropScenes}`);
  assert.equal(spine.stats.scenes, 4);
});

test("furniture colliders reject routes inside dining table and push actors cleanly out", () => {
  assert.ok(pointInFurniture({ x: -5.1, y: 0, z: 2.75 }, 0.28));
  const out = pushOutOfFurniture({ x: -4.4, y: 0, z: 2.0 }, 0.34);
  assert.equal(out.pushed, true);
  assert.ok(!pointInFurniture(out, 0.28), `pushed point still inside table: ${JSON.stringify(out)}`);
  assert.ok(
    findSegmentFurnitureHit({ x: -6.4, y: 0, z: 1.4 }, { x: -4.0, y: 0, z: 3.5 }, 0.24),
    "detects diagonal walk cutting across dining_table"
  );
});

test("continuous chunking never injects black flash fades and preserves facing across chunks", () => {
  const chunks = chunkEpisode(MIDNIGHT_PIZZA_HEIST_2M, { maxChunkSec: 32 });
  assert.equal(chunks.length, 4);
  for (let i = 0; i < chunks.length - 1; i += 1) {
    const beats = chunks[i].episode.skits.flatMap((s) => s.beats || []);
    const flashFades = beats.filter((b) => b.type === "fade" && b.duration < 0.1);
    assert.equal(flashFades.length, 0, `chunk ${i} must not inject flash fade`);
    assert.equal(chunks[i].episode.transitions, "continuous");
  }
});

test("physical communication helpers keep actors facing each other instead of snapping to camera", () => {
  const beats = [
    ...greetAndNod({ at: 0, a: "granny", b: "grandpa" }),
    ...dialogueExchange({ at: 3, a: "granny", b: "grandpa", turns: 2 }),
    ...handItemTo({ at: 7, giver: "granny", receiver: "grandpa", prop: "golden_pizza" }),
  ];
  const arms = beats.filter((b) => b.type === "char_arm");
  assert.ok(arms.length >= 4);
  for (const arm of arms) {
    assert.equal(arm.facePlayer, false);
  }
});
