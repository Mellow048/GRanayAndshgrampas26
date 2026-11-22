import test from "node:test";
import assert from "node:assert/strict";

import {
  BODY,
  makeCapsule,
  pointInCapsule,
  pushOutOfCapsules,
  segmentClear,
  sightlineClear,
  findSafeCameraSpot,
  findSupport,
  isEmbedded,
  resolvePropPlacement,
  findBlockedLeg,
  ensureRoute,
  dist2D,
} from "../src/stagingSafety.js";
import { makeTestWorld } from "./helpers/testWorld.js";

const world = makeTestWorld();

test("capsules describe a body and reject points inside it", () => {
  const cap = makeCapsule({ id: "grandpa", position: { x: 0, y: 0, z: 0 }, height: 1.78 });
  assert.equal(cap.radius, BODY.radius);
  assert.ok(pointInCapsule({ x: 0.2, y: 1.2, z: 0 }, cap));
  assert.ok(!pointInCapsule({ x: 1.0, y: 1.2, z: 0 }, cap));
  assert.ok(!pointInCapsule({ x: 0.1, y: 3.0, z: 0 }, cap), "above the head is free");
});

test("pushOutOfCapsules rescues a camera spawned inside a neck", () => {
  const cap = makeCapsule({ id: "grandpa", position: { x: 0, y: 0, z: 0 } });
  const inside = { x: 0.05, y: 1.55, z: 0.02 };
  assert.ok(pointInCapsule(inside, cap, 0.05));

  const { pos, dodged } = pushOutOfCapsules(inside, [cap], { pad: 0.3, world });
  assert.deepEqual(dodged, ["grandpa"]);
  assert.ok(!pointInCapsule(pos, cap, 0.25), `pushed to ${JSON.stringify(pos)}`);
  assert.ok(dist2D(pos, cap) >= cap.radius + 0.25);
  assert.ok(world.walkableAt(pos.x, pos.z), "the escape route stays inside the room");
});

test("a wall blocks sight, a doorway does not", () => {
  const wall = [[2, -2], [2, 0]];
  const door = [[0, -2], [0, 0]];
  assert.equal(
    segmentClear(world, { x: wall[0][0], y: 0.9, z: wall[0][1] }, { x: wall[1][0], y: 0.9, z: wall[1][1] }, { radius: 0.1 }),
    false
  );
  assert.equal(
    segmentClear(world, { x: door[0][0], y: 0.9, z: door[0][1] }, { x: door[1][0], y: 0.9, z: door[1][1] }, { radius: 0.1 }),
    true
  );
});

test("sightlineClear refuses to look through another performer", () => {
  const eye = { x: 0, y: 1.6, z: 2 };
  const face = { x: 0, y: 1.5, z: -2 };
  const blocker = makeCapsule({ id: "granny", position: { x: 0, y: 0, z: 0 } });
  assert.equal(sightlineClear(world, eye, face, { actors: [blocker] }), false);
  assert.equal(sightlineClear(world, eye, face, { actors: [], ignoreActorId: "granny" }), true);
});

test("findSafeCameraSpot never lands inside a body or behind a wall", () => {
  const subject = { x: 0, y: 1.5, z: -2 };
  // A performer parked exactly where the old code would have put the lens.
  const blocker = makeCapsule({ id: "grandpa", position: { x: 0, y: 0, z: -3.1 } });

  const spot = findSafeCameraSpot({
    eyeTarget: subject,
    world,
    actors: [blocker],
    preferredDir: { x: 0, z: -1 }, // straight into the back wall + into Grandpa
    minDist: 1.2,
    preferredDist: 1.8,
    maxDist: 2.6,
    lensHeight: 1.55,
    floorY: 0,
  });

  assert.ok(spot, "a legal spot exists");
  assert.ok(!pointInCapsule(spot.pos, blocker, 0.2), "lens is outside the body");
  assert.ok(world.walkableAt(spot.pos.x, spot.pos.z), "lens is inside the walkable shell");
  assert.ok(
    sightlineClear(world, spot.pos, subject, { radius: 0.05, actors: [blocker] }),
    "lens can see the subject"
  );
});

test("props are seated on the real surface instead of floating", () => {
  const support = findSupport(world, 1.9, -2.2, 1.4, 2);
  assert.equal(support.y, 1.0);
  assert.equal(support.object, "counter");

  const seated = resolvePropPlacement({
    world,
    desired: { x: 1.9, y: 1.34, z: -2.2 },
    halfExtents: { x: 0.1, y: 0.13, z: 0.1 },
  });
  assert.equal(seated.floating, false);
  assert.ok(Math.abs(seated.pos.y - 1.132) < 0.01, `seated at ${seated.pos.y}`);
});

test("a prop steps aside instead of clipping into another prop", () => {
  const first = resolvePropPlacement({
    world,
    desired: { x: 1.7, y: 1.34, z: -2.2 },
    halfExtents: { x: 0.1, y: 0.13, z: 0.1 },
  });
  const others = [{ id: "cookie_jar", aabb: {
    min: { x: first.pos.x - 0.1, y: first.pos.y - 0.13, z: first.pos.z - 0.1 },
    max: { x: first.pos.x + 0.1, y: first.pos.y + 0.13, z: first.pos.z + 0.1 },
  } }];

  const second = resolvePropPlacement({
    world,
    desired: { x: 1.7, y: 1.34, z: -2.2 },
    halfExtents: { x: 0.12, y: 0.08, z: 0.12 },
    others,
  });

  assert.equal(second.nudged, true);
  assert.deepEqual(second.collisions.length > 0, true);
  assert.ok(Math.abs(second.pos.x - first.pos.x) > 0.15 || Math.abs(second.pos.z - first.pos.z) > 0.15);
  assert.ok(Math.abs(second.pos.y - 1.08) < 0.02, "still on the counter");
});

test("a prop spawned inside furniture is detected and re-seated", () => {
  // A closed cavity barely wider than the prop, i.e. a microwave interior.
  const oven = makeTestWorld({
    walls: [
      { x1: 1.94, z1: 0.94, x2: 2.06, z2: 0.94, y0: 0, y1: 1.6 },
      { x1: 1.94, z1: 1.06, x2: 2.06, z2: 1.06, y0: 0, y1: 1.6 },
      { x1: 1.94, z1: 0.94, x2: 1.94, z2: 1.06, y0: 0, y1: 1.6 },
      { x1: 2.06, z1: 0.94, x2: 2.06, z2: 1.06, y0: 0, y1: 1.6 },
    ],
  });
  const half = { x: 0.05, y: 0.05, z: 0.05 };
  // Centre of the box: boxed in on all four sides.
  assert.equal(isEmbedded(oven, { x: 2.0, y: 0.8, z: 1.0 }, half), true);
  // Open floor two metres away: nothing within reach.
  assert.equal(isEmbedded(oven, { x: 2.0, y: 0.8, z: 2.5 }, half), false);

  const seated = resolvePropPlacement({
    world: oven,
    desired: { x: 2.0, y: 0.8, z: 1.0 },
    halfExtents: half,
    isSpotFree: (pos, h) => !isEmbedded(oven, pos, h),
  });
  assert.ok(seated.collisions.includes("geometry"), "the embedded spot is rejected");
  assert.equal(isEmbedded(oven, seated.pos, half), false, "re-seated somewhere legal");
});

test("ensureRoute detours through the doorway instead of the wall", () => {
  const from = { x: 2.4, y: 0, z: -2 };
  const to = { x: 2.4, y: 0, z: 0.6 };

  assert.ok(findBlockedLeg(world, [from, to], { radius: 0.2 }), "straight line clips the wall");

  const route = ensureRoute(world, from, [to], { radius: 0.2 });
  assert.equal(route.inserted, true);
  assert.equal(route.unresolved, false);
  assert.equal(findBlockedLeg(world, route.points, { radius: 0.15 }), null);
  assert.ok(route.points.length > 2);
  assert.ok(
    route.points.some((p) => Math.abs(p.z + 1) < 0.35 && Math.abs(p.x) < 0.9),
    "the detour passes through the doorway"
  );
});
