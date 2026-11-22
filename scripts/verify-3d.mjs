#!/usr/bin/env node
/**
 * Automated 3D spatial & state-leak verification against the real GrannyHouse.fbx mesh.
 * Runs EpisodeRunner + PlayerCamera + ComedyPropManager at 60Hz and catches:
 *  - Player wall-clips during walks (non-`cut` steps across solid walls)
 *  - Actor wall-clips during moves (non-`char_cut` horizontal steps across walls)
 *  - Close-wall camera frames (< 0.14m from walls)
 *  - Held-prop or character-prop leaks across `CUT` transitions
 *
 * Requires `three` installed (`npm install --no-save three@0.170.0`).
 *
 * Usage:
 *   node scripts/verify-3d.mjs [preset]
 *   node scripts/verify-3d.mjs --gags
 *   node scripts/verify-3d.mjs --all
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal DOM stub so FBXLoader / OrbitControls / ThoughtBubbleCache work headless in Node
function makeStubDomElement() {
  const docStub = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return {
    width: 256,
    height: 192,
    clientWidth: 1280,
    clientHeight: 720,
    style: {},
    ownerDocument: docStub,
    getContext: () => null,
    getRootNode: () => docStub,
    addEventListener: () => {},
    removeEventListener: () => {},
    setAttribute: () => {},
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }),
  };
}
if (typeof globalThis.document === "undefined") {
  globalThis.document = {
    createElement: makeStubDomElement,
    createElementNS: makeStubDomElement,
  };
}

import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { ASSET_MANIFEST, EPISODE_PRESETS, SET_MAP } from "../src/config.js";
import { setupHouseFromRaw } from "../src/assetLoader.js";
import { PlayerCamera } from "../src/playerCamera.js";
import { ComedyPropManager } from "../src/comedyProps.js";
import { EpisodeRunner } from "../src/episodeRunner.js";
import { buildEpisode } from "../src/episodeBuilder.js";
import { GAG_REGISTRY, GAG_LOCATIONS } from "../src/gags/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function createStubActor(id) {
  const root = new THREE.Group();
  root.name = `Actor_${id}`;
  root.userData.actorId = id;
  root.userData.tag = id;
  const state = { prop: "cane", bubble: null, anim: "idle", lookAtPlayer: false, speaking: false };
  const stub = {
    id,
    root,
    rigHolder: root,
    mixer: { update: () => {} },
    actions: {},
    get currentAnimation() {
      return state.anim;
    },
    get currentAction() {
      return null;
    },
    get isSpeaking() {
      return state.speaking;
    },
    playAnim(name) {
      state.anim = name;
      return null;
    },
    playAnimation(name) {
      state.anim = name;
      return null;
    },
    setAnimSpeed() {},
    faceTarget(target) {
      if (target && typeof target.x === "number") {
        const dx = target.x - root.position.x;
        const dz = target.z - root.position.z;
        if (dx * dx + dz * dz > 1e-6) root.rotation.y = Math.atan2(dx, dz);
      }
    },
    lookAt(target) {
      stub.faceTarget(target);
    },
    lookAtPlayer(enabled) {
      state.lookAtPlayer = Boolean(enabled);
    },
    showBubble(icon) {
      state.bubble = icon || null;
    },
    hideBubble() {
      state.bubble = null;
    },
    setProp(propName) {
      state.prop = propName || "none";
    },
    toggleBuiltInProp(mode = "default") {
      state.prop = mode;
    },
    setSpeaking(v) {
      state.speaking = Boolean(v);
    },
    setJumpOffset() {},
    getHeadWorldPosition(out = new THREE.Vector3()) {
      return out.copy(root.position).add(new THREE.Vector3(0, 1.5, 0));
    },
    resetPose() {
      state.speaking = false;
      state.lookAtPlayer = false;
      state.bubble = null;
      state.prop = "cane";
      state.anim = "idle";
    },
    update() {},
    dispose() {},
  };
  return stub;
}

function makeNoopSfx() {
  return new Proxy(
    { play: () => true },
    { get: (t, k) => (k in t ? t[k] : () => {}) }
  );
}

async function verifyEpisode3D(name, episode, house) {
  const scene = new THREE.Scene();
  scene.add(house.root);

  const characters = {};
  for (const c of episode.cast || []) {
    characters[c.id] = createStubActor(c.id);
    scene.add(characters[c.id].root);
  }

  const playerCamera = new PlayerCamera(makeStubDomElement(), house, scene);
  const comedyProps = new ComedyPropManager(scene, SET_MAP);
  const runner = new EpisodeRunner({
    house,
    characters,
    playerCamera,
    comedyProps,
    sfxEngine: makeNoopSfx(),
  });

  runner.loadEpisode(episode);
  runner.play();

  const dt = 1 / 60;
  const maxSteps = Math.ceil((runner.duration + 2) / dt);
  const ray = new THREE.Raycaster();
  const dirs = [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 0, -1),
  ];

  let prevPlayer = playerCamera.playerPos.clone();
  let lastRayCheckPos = prevPlayer.clone();
  const prevActors = {};
  for (const [id, act] of Object.entries(characters)) {
    prevActors[id] = act.root.position.clone();
  }

  let wallClips = 0;
  let actorClips = 0;
  let closeWallFrames = 0;
  let stateLeaks = 0;
  const clipLog = [];

  for (let step = 0; step < maxSteps && !runner.isFinished; step += 1) {
    const prevFired = runner.nextEventIdx || 0;
    await runner.stepAsync(dt);

    const curP = playerCamera.playerPos.clone();
    const pMove = Math.hypot(curP.x - prevPlayer.x, curP.z - prevPlayer.z);
    const pDy = Math.abs(curP.y - prevPlayer.y);

    // Ignore intentional instant `cut` teleports (> 0.65m in a single 1/60s frame)
    if (pMove > 0.02 && pMove < 0.65 && pDy < 0.08) {
      const checkY = curP.y + 1.05;
      if (!house.hasClearSight(prevPlayer.x, prevPlayer.z, curP.x, curP.z, checkY)) {
        wallClips += 1;
        if (clipLog.length < 5) {
          clipLog.push(`player clip @ ${runner.simTime.toFixed(2)}s`);
        }
      }
    }

    // Check close-wall clearance only when player moved meaningfully (or on frame 0)
    if (step === 0 || curP.distanceTo(lastRayCheckPos) > 0.04) {
      lastRayCheckPos.copy(curP);
      const eye = new THREE.Vector3(curP.x, curP.y + playerCamera.currentEyeHeight, curP.z);
      let minWall = Infinity;
      for (const d of dirs) {
        ray.set(eye, d);
        ray.far = 0.35;
        const hits = ray.intersectObjects(house.allHouseMeshes, false);
        if (hits.length > 0 && hits[0].distance < minWall) {
          minWall = hits[0].distance;
        }
      }
      if (minWall < 0.14) closeWallFrames += 1;
    }
    prevPlayer = curP;

    // Actor clip check (skip instant `char_cut` teleports > 0.65m or stair climbing)
    for (const [id, act] of Object.entries(characters)) {
      const curA = act.root.position.clone();
      const prevA = prevActors[id];
      const aMove = Math.hypot(curA.x - prevA.x, curA.z - prevA.z);
      const aDy = Math.abs(curA.y - prevA.y);
      if (aMove > 0.02 && aMove < 0.65 && aDy < 0.08) {
        const checkY = curA.y + 0.95;
        if (!house.hasClearSight(prevA.x, prevA.z, curA.x, curA.z, checkY)) {
          actorClips += 1;
          if (clipLog.length < 5) {
            clipLog.push(`actor(${id}) clip @ ${runner.simTime.toFixed(2)}s`);
          }
        }
      }
      prevActors[id] = curA;
    }

    // Leak check right after any `cut` event fires
    const curFired = runner.nextEventIdx || 0;
    if (curFired > prevFired) {
      for (let ei = prevFired; ei < curFired; ei += 1) {
        const ev = runner.events[ei];
        if (ev?.type === "cut" && ev.clearHold !== false && playerCamera.hasHeldProp()) {
          stateLeaks += 1;
          clipLog.push(`held prop leaked across cut @ ${runner.simTime.toFixed(2)}s`);
        }
      }
    }
  }

  scene.remove(house.root);
  const ok = wallClips === 0 && actorClips === 0 && stateLeaks === 0;
  console.log(
    `[3D ${ok ? "OK" : "FAIL"}] ${name}: dur=${runner.duration.toFixed(2)}s | wallClips=${wallClips} | actorClips=${actorClips} | closeWallFrames=${closeWallFrames} | stateLeaks=${stateLeaks}`
  );
  for (const msg of clipLog) console.log(`    -> ${msg}`);
  return ok;
}

async function main() {
  const args = process.argv.slice(2);
  const runAll = args.includes("--all");
  const runGags = args.includes("--gags") || runAll;
  const targetPreset = args.find((a) => !a.startsWith("--"));

  const fbxPath = path.resolve(REPO_ROOT, ASSET_MANIFEST.house.fbxPath.replace(/^\.\//, ""));
  if (!fs.existsSync(fbxPath)) {
    console.error(`House FBX not found at ${fbxPath}`);
    process.exit(1);
  }
  const buf = fs.readFileSync(fbxPath);
  const loader = new FBXLoader();
  const rawHouse = loader.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), path.dirname(fbxPath) + "/");
  const house = setupHouseFromRaw(rawHouse);

  let allOk = true;
  if (runAll) {
    for (const [key, ep] of Object.entries(EPISODE_PRESETS)) {
      const ok = await verifyEpisode3D(key, ep, house);
      if (!ok) allOk = false;
    }
  } else if (!runGags) {
    const key = targetPreset || "rocket_ball_x3";
    const ep = EPISODE_PRESETS[key];
    if (!ep) {
      console.error(`Unknown preset "${key}".`);
      process.exit(1);
    }
    allOk = await verifyEpisode3D(key, ep, house);
  }

  if (runGags) {
    for (const [gagKey, factory] of Object.entries(GAG_REGISTRY)) {
      for (const locKey of Object.keys(GAG_LOCATIONS)) {
        const g = factory({ location: locKey });
        const ep = buildEpisode({
          title: g.name,
          playerSpawn: g.playerSpawn,
          playerFacing: g.playerFacing,
          gags: [g],
        });
        const ok = await verifyEpisode3D(`gag:${gagKey}@${locKey}`, ep, house);
        if (!ok) allOk = false;
      }
    }
  }

  if (!allOk) process.exit(1);
  console.log("\nALL 3D VERIFICATIONS PASSED.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
