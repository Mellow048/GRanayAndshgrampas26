import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PlayerCamera } from "../src/playerCamera.js";

test("vehicle mount eases from the current POV and ignores duplicate route points", async () => {
  const camera = Object.create(PlayerCamera.prototype);
  camera.playerPos = new THREE.Vector3(0, 0, 0);
  camera.baseEyeHeight = 1.55;
  camera.crouchStartHeight = 1.55;
  camera.crouchTargetHeight = 1.55;
  camera.crouchElapsed = 1;
  camera.crouchDuration = 0.3;
  const walks = [];
  camera.startWalk = (options) => {
    walks.push(options);
    return Promise.resolve();
  };

  await camera.startVehicleRide(
    [new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(2, 0, 0)],
    { duration: 2, mountDuration: 0.8, eyeHeight: 1.12, sideOffset: 0.3, forwardOffset: -0.05 }
  );

  assert.equal(walks.length, 2, "one smooth approach followed by the driven route");
  assert.deepEqual(walks[0].points[0].toArray(), [0, 0, 0]);
  assert.deepEqual(walks[0].points[1].toArray(), [0.95, 0, 0.3]);
  assert.equal(walks[0].duration, 0.8);
  assert.deepEqual(walks[1].points[0].toArray(), walks[0].points[1].toArray());
  assert.equal(walks[1].points.length, 2, "duplicate waypoints do not create a zero-length heading");
  assert.equal(camera.baseEyeHeight, 1.12);
});
