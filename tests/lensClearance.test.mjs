import test from "node:test";
import assert from "node:assert/strict";
import {
  sampleClearance,
  resolveClearance,
  pickFadeTargets,
  planActorYield,
  LENS_CLEARANCE,
} from "../src/lensClearance.js";
import { summarizeProbe, PROBE_BUDGETS } from "../src/probeReport.js";

/** A single wall plane at x = wallX, hit only by rays travelling +x. */
function wallCaster(wallX, name = "table") {
  return (origin, dir, maxDist) => {
    if (dir.x <= 0.01) return null;
    const t = (wallX - origin.x) / dir.x;
    if (t < 0 || t > maxDist) return null;
    return { distance: t, name };
  };
}

test("open space reports no clearance problem", () => {
  const sample = sampleClearance(() => null, { x: 0, y: 1.5, z: 0 });
  assert.equal(sample.minDist, Number.POSITIVE_INFINITY);
  assert.equal(sample.nearest, null);
});

test("a wall 5cm away is detected and names the surface", () => {
  const cast = wallCaster(0.05);
  const sample = sampleClearance(cast, { x: 0, y: 1.5, z: 0 });
  assert.ok(sample.minDist < 0.1);
  assert.equal(sample.nearest.name, "table");
});

test("resolveClearance pushes the lens out of the wall", () => {
  const cast = wallCaster(0.05);
  const { pos, corrections } = resolveClearance(
    { x: 0, y: 1.5, z: 0 },
    cast,
    { clearance: LENS_CLEARANCE, iterations: 4 }
  );
  assert.ok(corrections > 0, "expected at least one correction");
  assert.ok(pos.x < -0.2, `expected to be pushed away from +x, got x=${pos.x}`);
  const after = sampleClearance(cast, pos);
  assert.ok(after.minDist === Number.POSITIVE_INFINITY || after.minDist >= LENS_CLEARANCE - 0.02);
});

test("resolveClearance leaves a clear position untouched", () => {
  const cast = wallCaster(8);
  const start = { x: 0, y: 1.5, z: 0 };
  const { pos, corrections } = resolveClearance(start, cast);
  assert.equal(corrections, 0);
  assert.deepEqual(pos, start);
});

test("fade targets only include surfaces inside the fade distance", () => {
  const cast = (origin, dir, maxDist) => {
    if (dir.x <= 0.01) return null;
    const t = (0.1 - origin.x) / dir.x;
    return t >= 0 && t <= maxDist ? { distance: t, name: "tabletop" } : null;
  };
  const sample = sampleClearance(cast, { x: 0, y: 1.5, z: 0 });
  assert.deepEqual(pickFadeTargets(sample, { distance: 0.2 }), ["tabletop"]);
  assert.deepEqual(pickFadeTargets(sample, { distance: 0.01 }), []);
});

test("the cast yields to the lens instead of the lens dodging the cast", () => {
  const actors = [
    { id: "granny", position: { x: 0.2, y: 0, z: 0 } },
    { id: "grandpa", position: { x: 3, y: 0, z: 0 } },
  ];
  const plan = planActorYield(actors, { x: 0, y: 1.5, z: 0 }, { bubble: 0.8 });
  assert.equal(plan.length, 1, "only the actor inside the bubble moves");
  assert.equal(plan[0].id, "granny");
  assert.ok(plan[0].to.x > 0.6, "granny is pushed clear of the bubble");
});

test("an actor pinned against a wall sidesteps instead of being pushed through it", () => {
  const actors = [{ id: "granny", position: { x: 0.6, y: 0, z: 0 } }];
  const plan = planActorYield(actors, { x: 0, y: 1.5, z: 0 }, {
    bubble: 0.8,
    isWalkable: (p) => p.x < 0.8, // wall to the right
  });
  assert.equal(plan.length, 1);
  assert.ok(Math.abs(plan[0].to.z) > 0.2, `expected a sidestep, got ${JSON.stringify(plan[0].to)}`);
});

test("probe report passes a clean episode and fails a lens inside geometry", () => {
  const clean = [
    { simTime: 0, clearance: 1.2, minActorDist: 2.1, shieldCorrections: 0 },
    { simTime: 0.03, clearance: 0.9, minActorDist: 1.9, shieldCorrections: 0 },
  ];
  assert.equal(summarizeProbe(clean).verdict, "pass");

  const inside = [];
  for (let i = 0; i < 100; i += 1) {
    inside.push({ simTime: i / 30, clearance: i < 30 ? 0.02 : 0.9, minActorDist: 3, shieldCorrections: 0, nearestSurface: "dining_table" });
  }
  const report = summarizeProbe(inside);
  assert.equal(report.verdict, "fail");
  assert.equal(report.clearance.framesInsideGeometry, 30);
  assert.match(report.reasons.join(" "), /inside geometry/);
  assert.ok(report.violations.some((v) => v.detail === "dining_table"));
});

test("probe report fails when a performer stays in the lens", () => {
  const samples = [];
  for (let i = 0; i < 100; i += 1) {
    samples.push({
      simTime: i / 30,
      clearance: 1,
      minActorDist: i < 20 ? 0.2 : 2,
      shieldCorrections: 0,
      nearestActor: "grandpa",
    });
  }
  const report = summarizeProbe(samples);
  assert.equal(report.verdict, "fail");
  assert.match(report.reasons.join(" "), /performer inside/);
  assert.ok(PROBE_BUDGETS.actorFloor > 0);
});
