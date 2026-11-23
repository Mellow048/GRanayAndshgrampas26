import test from "node:test";
import assert from "node:assert/strict";

import { buildShow, listShows, SHOWS, findScene } from "../src/shows/index.js";
import { defineScene, describeScene, argueBeats } from "../src/shows/sceneKit.js";
import { buildEpisode } from "../src/episodeBuilder.js";
import { validateAndRepair, formatStagingReport, checkSceneContinuity } from "../src/episodeSafety.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import {
  headAimAngles,
  headAimWeight,
  aimStep,
  segmentHitsBox,
  pushOutOfBoxes,
} from "../src/stagingSafety.js";

test("sceneKit rejects scenes that break the contract", () => {
  assert.throws(() => defineScene({ id: "Bad-ID", title: "x", duration: 5, playerSpawn: "kitchen" }));
  assert.throws(() => defineScene({ id: "ok", title: "x", duration: 0, playerSpawn: "kitchen" }));
  assert.throws(() => defineScene({ id: "ok", title: "x", duration: 5 }));
  assert.throws(() =>
    defineScene({ id: "ok", title: "x", duration: 5, playerSpawn: "kitchen", beats: [{ at: 9, type: "fade" }] })
  );
  const ok = defineScene({ id: "ok", title: "Fine", duration: 5, playerSpawn: "kitchen", beats: [] });
  assert.equal(ok.id, "ok");
  assert.match(describeScene(ok), /ok · Fine · 5s/);
});

test("buildShow welds scenes with cuts and a scene map", () => {
  const a = defineScene({
    id: "a",
    title: "First",
    duration: 4,
    playerSpawn: "dining_center",
    beats: [{ at: 0, type: "fade", to: 0, duration: 0.3 }],
  });
  const b = defineScene({
    id: "b",
    title: "Second",
    duration: 5,
    playerSpawn: "kitchen",
    beats: [{ at: 0, type: "fade", to: 0, duration: 0.3 }],
  });
  const ep = buildEpisode({ title: "T", scenes: [a, b], requireCast: false });

  assert.equal(ep.sceneMap.length, 2);
  assert.deepEqual(
    ep.sceneMap.map((s) => [s.id, s.index]),
    [["a", 0], ["b", 1]]
  );
  assert.equal(ep.sceneMap[0].start, 0);
  assert.equal(ep.sceneMap[1].start, 4);

  // The second scene opens with a black cut, a player teleport and a fade back.
  const secondBeats = ep.skits[1].beats;
  assert.ok(secondBeats.some((x) => x.type === "cut" && x.to === "kitchen"));
  assert.ok(secondBeats.some((x) => x.type === "fade" && x.to === 1));
  assert.ok(secondBeats.some((x) => x.type === "fade" && x.to === 0));

  // Every beat in scene 2 lives inside its scene window.
  for (const beat of secondBeats) {
    assert.ok(beat.at >= ep.sceneMap[1].start - 0.001, `${beat.type} at ${beat.at} is before scene 2`);
  }
});

test("a single scene can be built and previewed on its own", () => {
  const shows = listShows();
  assert.ok(shows.length >= 1);
  const show = shows[0];
  const sceneId = show.scenes[1].id;

  const full = buildShow(show.id);
  const one = buildShow(show.id, { onlyScene: sceneId });

  assert.equal(one.sceneMap.length, 1);
  assert.equal(one.sceneMap[0].id, sceneId);
  assert.ok(one.sceneMap[0].end < full.sceneMap[full.sceneMap.length - 1].end);
  assert.equal(one.skits.length, 1);
  assert.throws(() => buildShow(show.id, { onlyScene: "nope" }), /no scene/);
  assert.ok(findScene(show.id, sceneId));
  assert.ok(SHOWS[show.id]);
});

test("the long-form show passes the staging gate and tags issues by scene", () => {
  const ep = buildShow("mountain_dew_run");
  assert.ok(ep.sceneMap.length >= 4);

  const result = validateAndRepair(ep, { setMap: SET_MAP, navGraph: NAV_GRAPH });
  assert.equal(result.stats.errorsAfter, 0, "the reference show must not need hand-fixing");

  // Force a fault inside scene 3 and make sure the report names scene 3.
  // The house has no staircase, so a walk to the second floor can only be
  // "walking on air" — the floor router must refuse it and say where.
  const broken = buildShow("mountain_dew_run");
  const fridgeStart = broken.sceneMap.find((m) => m.id === "fridge").start;
  broken.skits
    .find((s) => s.sceneId === "fridge")
    .beats.push({ at: +(fridgeStart + 2).toFixed(3), type: "player_walk", to: "up_bed_side", duration: 2 });

  const bad = validateAndRepair(broken, { setMap: SET_MAP, navGraph: NAV_GRAPH });
  const wallCut = bad.issues.find((i) => i.code === "NO_WALKABLE_ROUTE");
  assert.ok(wallCut, "the walk with no floor under it is reported");
  assert.equal(wallCut.scene, "fridge");
  assert.equal(wallCut.sceneTitle, "The Cold One");
  assert.match(formatStagingReport(bad), /Scene 3 — The Cold One/);
});

test("head aim turns the head toward the lens and clamps the neck", () => {
  const head = { x: 0, y: 1.6, z: 0 };

  // Camera straight ahead and slightly up.
  const front = headAimAngles(head, { x: 0, y: 1.75, z: 2 }, 0);
  assert.ok(Math.abs(front.yaw) < 1e-6);
  assert.ok(front.pitch < 0, "looking up is a negative X rotation");

  // Camera to the right.
  const right = headAimAngles(head, { x: 2, y: 1.6, z: 0 }, 0, { maxYaw: 2 });
  assert.ok(Math.abs(right.yaw - Math.PI / 2) < 1e-6);
  // ...and the default neck limit keeps a camera at 90° from snapping the head off.
  const clamped = headAimAngles(head, { x: 2, y: 1.6, z: 0 }, 0);
  assert.ok(clamped.yaw < Math.PI / 2 && clamped.yaw > 0.9);

  // Behind the actor: clamped instead of spinning the head around.
  const behind = headAimAngles(head, { x: 0, y: 1.6, z: -2 }, 0, { maxYaw: 0.9 });
  assert.equal(behind.yaw, 0.9);
  assert.equal(behind.inCone, false);

  // Body yaw already facing the camera → no extra turn.
  const already = headAimAngles(head, { x: 0, y: 1.6, z: 2 }, Math.PI, { maxYaw: 0.9 });
  assert.ok(Math.abs(already.yaw) <= 0.9);
});

test("props block bodies: sweep test and push-out", () => {
  const box = { id: "jar", min: { x: -0.2, y: 1.1, z: -0.2 }, max: { x: 0.2, y: 1.5, z: 0.2 } };
  assert.equal(segmentHitsBox({ x: -2, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, box), true);
  assert.equal(segmentHitsBox({ x: -2, y: 0, z: 2 }, { x: 2, y: 0, z: 2 }, box), false);

  const pushed = pushOutOfBoxes({ x: 0.05, y: 0, z: 0.05 }, [box], { pad: 0.1 });
  assert.ok(pushed.dodged.includes("jar"));
  assert.ok(
    Math.abs(pushed.pos.x) > 0.2 || Math.abs(pushed.pos.z) > 0.2,
    "the body is pushed outside the prop footprint"
  );

  const clear = pushOutOfBoxes({ x: 3, y: 0, z: 3 }, [box], { pad: 0.1 });
  assert.deepEqual(clear.dodged, []);
});

test("head aim cannot spin: bounded step, eased out when the lens is in your face", () => {
  // A 180-degree target flip at 30fps may only move the neck ~4 rad/s worth.
  const step = aimStep(0, Math.PI, 1 / 30);
  assert.ok(step <= 4 / 30 + 1e-9, `moved ${step} rad in one frame`);

  // Over a second it converges, without overshoot.
  let yaw = 0;
  for (let i = 0; i < 30; i += 1) yaw = aimStep(yaw, Math.PI, 1 / 30);
  assert.ok(yaw > 1 && yaw < Math.PI);

  // Alternating noise (a camera jammed against the head) cannot accumulate.
  let noisy = 0;
  for (let i = 0; i < 120; i += 1) noisy = aimStep(noisy, i % 2 ? 1.5 : -1.5, 1 / 30);
  assert.ok(Math.abs(noisy) < 0.35, `noise accumulated to ${noisy}`);

  // Proximity: full aim from 0.9m out, nothing inside 0.35m.
  assert.equal(headAimWeight(1.6), 1);
  assert.equal(headAimWeight(0.2), 0);
  assert.ok(headAimWeight(0.6) > 0.3 && headAimWeight(0.6) < 0.7);
});

test("continuous scenes: nothing happens at the boundary", () => {
  const a = defineScene({
    id: "a",
    title: "First",
    duration: 4,
    playerSpawn: "dining_center",
    cast: { granny: { spawn: "dining_argue_west" } },
    props: [{ id: "can", type: "soda_can", spawn: "kitchen_fridge_shelf", seat: false }],
    beats: [{ at: 0.5, type: "player_walk", to: "kitchen_lane", duration: 2 }],
  });
  const b = defineScene({
    id: "b",
    title: "Second",
    duration: 5,
    playerSpawn: "kitchen_lane",
    // no spawn: she is still where scene A left her
    cast: { granny: {} },
    beats: [
      { at: 1.0, type: "player_look", target: "kitchen" },
      // The show ends here, so this scene owns the closing fade.
      { at: 4.6, type: "fade", to: 1, duration: 0.4 },
    ],
  });
  const ep = buildEpisode({ title: "T", scenes: [a, b], requireCast: false, transitions: "continuous" });

  const boundaries = ep.skits[1].beats.filter(
    (x) =>
      (x.type === "fade" && x.at < ep.sceneMap[1].end - 1) ||
      x.type === "cut" ||
      x.type === "char_cut" ||
      x.type === "prop_action"
  );
  assert.deepEqual(boundaries, [], "a continuous boundary must not fade, cut, teleport or reset props");
  assert.equal(ep.transitions, "continuous");
  // The very first frame is not black: the show starts on the action.
  assert.equal(ep.skits[0].beats.filter((x) => x.type === "fade" && x.to === 0).length, 0);
  // The prop declared in scene A is seated exactly where the author put it.
  assert.equal(ep.props[0].seat, false);
  // Introducing an actor without a spawn is allowed; introducing them *first* is not.
  assert.throws(
    () =>
      buildEpisode({
        title: "T",
        scenes: [defineScene({ id: "solo", title: "Solo", duration: 2, playerSpawn: "kitchen", cast: { granny: {} }, beats: [] })],
        requireCast: false,
        transitions: "continuous",
      }),
    /without a `spawn`/
  );
});

test("the continuity guard catches a scene that starts somewhere else", () => {
  const ep = buildShow("mountain_dew_run");
  assert.equal(checkSceneContinuity(ep, { setMap: SET_MAP }).length, 0, "the reference show is continuous");

  const broken = buildShow("mountain_dew_run");
  broken.sceneMap[3].playerSpawn = "up_bed_north_side";
  const issues = checkSceneContinuity(broken, { setMap: SET_MAP });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, "SCENE_START_MISMATCH");
  assert.equal(issues[0].scene, "bed");
});

test("argue staging is bubbles, not punches", () => {
  const beats = argueBeats({ from: 2, until: 6, a: "granny", b: "grandpa", interval: 1 });
  assert.ok(beats.length >= 6);
  const types = new Set(beats.map((b) => b.type));
  assert.ok(!types.has("char_anim"), "arguing must not play an attack animation");
  const bubbles = beats.filter((b) => b.type === "char_bubble");
  assert.deepEqual([...new Set(bubbles.map((b) => b.actor))].sort(), ["grandpa", "granny"]);
  assert.ok(bubbles.every((b) => b.facePlayer === false), "they argue with each other, not the lens");
  const faces = beats.filter((b) => b.type === "char_face");
  assert.ok(faces.every((f) => f.targetActor === "granny" || f.targetActor === "grandpa"));
  assert.ok(beats.every((b) => b.at >= 2 && b.at <= 6));
});
