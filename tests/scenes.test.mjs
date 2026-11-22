import test from "node:test";
import assert from "node:assert/strict";

import { buildShow, listShows, SHOWS, findScene } from "../src/shows/index.js";
import { defineScene, describeScene } from "../src/shows/sceneKit.js";
import { buildEpisode } from "../src/episodeBuilder.js";
import { validateAndRepair, formatStagingReport } from "../src/episodeSafety.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { headAimAngles, segmentHitsBox, pushOutOfBoxes } from "../src/stagingSafety.js";

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
  const broken = buildShow("mountain_dew_run");
  const fridgeStart = broken.sceneMap.find((m) => m.id === "fridge").start;
  broken.skits
    .find((s) => s.sceneId === "fridge")
    .beats.push({ at: +(fridgeStart + 2).toFixed(3), type: "player_walk", to: "living_room", duration: 2 });

  const bad = validateAndRepair(broken, { setMap: SET_MAP, navGraph: NAV_GRAPH });
  const wallCut = bad.issues.find((i) => i.code === "PATH_THROUGH_WALL");
  assert.ok(wallCut, "the wall-cutting walk is reported");
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
