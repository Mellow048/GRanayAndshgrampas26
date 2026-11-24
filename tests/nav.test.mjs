import test from "node:test";
import assert from "node:assert/strict";
import { route, validateRoute, snap, NAV_INFO } from "../src/nav/houseNav.js";
import { buildShow } from "../src/shows/index.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { validateAndRepair } from "../src/episodeSafety.js";

test("the nav bake covers the real house", () => {
  assert.ok(NAV_INFO.cells > 3000, "walkable cells were measured");
  assert.ok(NAV_INFO.links > NAV_INFO.cells, "cells are linked into a graph");
  assert.equal(NAV_INFO.cell, 0.2);
});

test("a ground-floor route only ever steps on floor", () => {
  const from = { x: -6.05, y: 0, z: 0.35 }; // in front of the kitchen fridge
  const to = { x: -4.0, y: 0, z: 2.6 }; // dining table
  const path = route(from, to);
  assert.ok(path && path.length >= 2, "a route exists");
  assert.deepEqual(validateRoute(path), [], "every sample is on real floor");
});

test("the built-in wooden staircase connects Floor 1 and the 2nd-floor Spawn Bedroom", () => {
  const downstairs = { x: -6.05, y: 0, z: 0.35 };
  const upstairs = { x: -6.5, y: 2.85, z: -2.4 }; // up_bed_side
  const path = route(downstairs, upstairs);
  assert.ok(path && path.length >= 4, "a continuous 2-floor route exists via the staircase");
  assert.deepEqual(validateRoute(path), [], "every stair & floor sample stays on walkable geometry");
});

test("every walk in the reference show has real floor under it", () => {
  const ep = buildShow("mountain_dew_run");
  const result = validateAndRepair(ep, { setMap: SET_MAP, navGraph: NAV_GRAPH });
  const floorIssues = result.issues.filter((i) =>
    ["NO_WALKABLE_ROUTE", "ROUTE_OFF_FLOOR", "WAYPOINT_OFF_FLOOR"].includes(i.code)
  );
  assert.deepEqual(floorIssues, []);
  assert.equal(result.stats.errorsAfter, 0);
});

test("waypoints used by the show sit on floor", () => {
  const ep = buildShow("mountain_dew_run");
  const used = new Set();
  for (const skit of ep.skits) {
    for (const beat of skit.beats) {
      if (beat.to && typeof beat.to === "string") used.add(beat.to);
      if (Array.isArray(beat.via)) beat.via.forEach((v) => used.add(v));
      if (typeof beat.spawn === "string") used.add(beat.spawn);
    }
    if (skit.playerSpawn) used.add(skit.playerSpawn);
  }
  for (const name of used) {
    const wp = SET_MAP[name];
    if (!wp) continue;
    if (wp.elevated) continue; // a surface, not a place to stand
    const snapped = snap(wp.x, wp.z, wp.y ?? 0);
    assert.ok(snapped, `${name} is reachable`);
    assert.ok(
      Math.hypot(snapped.x - wp.x, snapped.z - wp.z) <= 0.6,
      `${name} sits on floor (off by ${Math.hypot(snapped.x - wp.x, snapped.z - wp.z).toFixed(2)}m)`
    );
  }
});
