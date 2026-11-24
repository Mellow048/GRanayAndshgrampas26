import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { ComedyPropManager } from "../src/comedyProps.js";

test("a scaled car is seated using its scaled bounds, not full-size bounds", () => {
  const scene = new THREE.Scene();
  const manager = new ComedyPropManager(scene, {
    kitchen_counter_top: { x: -7.2, y: 1.13, z: 2.2 },
  });
  manager.setStaging({ castDown: () => ({ point: { y: 1.13 } }), walkableAt: () => true });
  manager.loadProps([{ id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12 }]);
  const car = manager.getProp("car").mesh;
  assert.ok(Math.abs(car.position.y - 1.13) < 0.02, `counter contact y=${car.position.y}`);
});

test("car bounce is restrained and stop puts the wheels back on the surface", () => {
  const scene = new THREE.Scene();
  const manager = new ComedyPropManager(scene, { floor: { x: 0, y: 0, z: 0 } });
  manager.loadProps([{ id: "car", type: "car", spawn: "floor", scale: 0.55 }]);
  const entry = manager.getProp("car");
  manager.performAction("car", "bounce");
  manager.update(0.25);
  assert.ok(entry.mesh.position.y - entry.basePos.y < 0.12, "cartoon suspension stays close to the ground");
  manager.performAction("car", "stop");
  assert.ok(Math.abs(entry.mesh.position.y - entry.basePos.y) < 1e-6, "stopped car rests at its base position");
});
