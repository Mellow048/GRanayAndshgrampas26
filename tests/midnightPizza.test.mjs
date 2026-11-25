import test from "node:test";
import assert from "node:assert/strict";
import { MIDNIGHT_PIZZA_HEIST_2M } from "../src/episodes/midnightPizzaHeist2m.js";
import { validateAndRepair } from "../src/episodeSafety.js";
import { validateStorySpine } from "../src/storySpine.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { greetAndNod, dialogueExchange, handItemTo } from "../src/gags/helpers.js";
import { chunkEpisode } from "../scripts/chunk-episode.mjs";
import { pointInFurniture, pushOutOfFurniture, findSegmentFurnitureHit } from "../src/furnitureColliders.js";
import { hasTargetLineOfSight } from "../src/stagingSafety.js";
import { stringPullRoute } from "../src/nav/houseNav.js";

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
    (b) => b.type === "char_anim" && ["laugh", "sit", "chicken_dance", "hip_hop_dance"].includes(b.anim)
  );
  assert.equal(weirdAnims.length, 0, "episode avoids unmotivated laugh, chairless sit, or out-of-tone dancing");

  const runMoves = allBeats.filter((b) => (b.type === "char_move" || b.type === "move") && (b.anim === "run" || b.anim === "run2"));
  assert.ok(runMoves.length >= 2, "uses fast sprint chases");
  assert.ok(res.issues.every((i) => i.code !== "SLOW_MOTION_RUN"), "no sluggish runs");

  const spine = validateStorySpine(MIDNIGHT_PIZZA_HEIST_2M);
  assert.equal(spine.ok, true, JSON.stringify(spine.errors));
  assert.ok(spine.stats.goalPropScenes >= 3, `expected >=3 goalPropScenes, got ${spine.stats.goalPropScenes}`);
  assert.equal(spine.stats.scenes, 4);
});

test("stringPullRoute eliminates zigzags cleanly on flat floor while guarding stairs and furniture", () => {
  const zig = [
    { x: -3.6, y: 0, z: 0.4 },
    { x: -3.8, y: 0, z: 0.2 },
    { x: -3.6, y: 0, z: 0.0 },
    { x: -3.8, y: 0, z: -0.4 },
    { x: -3.6, y: 0, z: -1.2 },
  ];
  const pulled = stringPullRoute(zig);
  assert.equal(pulled.length, 2, "collapses flat zigzag hallway walk into a clean direct segment");

  // Also detects SLOW_MOTION_RUN when a long run has excessive duration
  const slowEp = {
    title: "Slow Run Test",
    transitions: "continuous",
    playerSpawn: "dining_center",
    playerFacing: "kitchen",
    cast: [{ id: "granny", asset: "granny", spawn: "bed_side", facing: "kitchen" }],
    props: [],
    skits: [{
      name: "Slow",
      startAt: 0,
      duration: 15,
      beats: [
        { at: 0, type: "char_move", actor: "granny", via: ["bed_foot", "hall_mid", "hall_corner", "dining_pass", "kitchen_lane"], to: "kitchen", anim: "run", duration: 12.2 },
        { at: 13.8, type: "fade", to: 1, duration: 1.0 },
      ],
    }],
  };
  const check = validateAndRepair(slowEp, { setMap: SET_MAP, navGraph: NAV_GRAPH, autoFix: false });
  assert.ok(check.issues.some((i) => i.code === "SLOW_MOTION_RUN"), "flags slow-motion runs under 2.6 m/s");
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

test("single-pass full export and continuous chunking never inject black flash fades", () => {
  const full = chunkEpisode(MIDNIGHT_PIZZA_HEIST_2M, { maxChunkSec: 999 });
  assert.equal(full.length, 1, "single-pass mode keeps the entire episode in 1 unbroken file");
  const chunks = chunkEpisode(MIDNIGHT_PIZZA_HEIST_2M, { maxChunkSec: 32 });
  assert.equal(chunks.length, 3);
  for (let i = 0; i < chunks.length - 1; i += 1) {
    const beats = chunks[i].episode.skits.flatMap((s) => s.beats || []);
    const flashFades = beats.filter((b) => b.type === "fade" && b.duration < 0.1);
    assert.equal(flashFades.length, 0, `chunk ${i} must not inject flash fade`);
    assert.equal(chunks[i].episode.transitions, "continuous");
    assert.equal(chunks[i].episode.playerFov, 68);
  }
});

test("hasTargetLineOfSight releases lock when an opaque wall blocks both sight rays", () => {
  const clearWorld = { castRay: () => null };
  assert.equal(
    hasTargetLineOfSight(clearWorld, { x: -1.9, y: 2.2, z: 2.5 }, { x: -4.0, y: 1.5, z: 2.6 }),
    true
  );

  // Low railing only grazes eye ray -> upper ray clears -> still visible
  const railWorld = {
    castRay: (origin) => (origin.y < 2.25 ? { distance: 1.0 } : null),
  };
  assert.equal(
    hasTargetLineOfSight(railWorld, { x: -1.9, y: 2.2, z: 2.5 }, { x: -4.0, y: 1.5, z: 2.6 }),
    true
  );

  // Solid stairwell wall blocks both rays -> LOS lost, triggering natural camera release
  const wallWorld = {
    castRay: () => ({ distance: 1.1 }),
  };
  assert.equal(
    hasTargetLineOfSight(wallWorld, { x: -1.9, y: 2.2, z: 2.5 }, { x: -5.8, y: 1.5, z: 0.8 }),
    false
  );
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
