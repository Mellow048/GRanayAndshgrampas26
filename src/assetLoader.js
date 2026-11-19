import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { ASSET_MANIFEST, CONFIG } from "./config.js";

/**
 * Loads an FBX and waits for all textures registered on its LoadingManager to finish decoding
 * (so WebGL/SwiftShader never renders untextured frames while PNGs are still decoding).
 */
async function loadFbxWithTextures(fbxPath, textureDir, textureAliases = {}) {
  const manager = createAssetLoadingManager(textureDir, textureAliases);
  let active = 0;
  let allDoneResolve = null;

  const hasBrowserImages = typeof Image !== "undefined";
  const texturesReady = hasBrowserImages
    ? new Promise((resolve) => {
        allDoneResolve = resolve;
      })
    : Promise.resolve();

  manager.onStart = (_url, loaded, total) => {
    active = total - loaded;
  };
  manager.onProgress = (_url, loaded, total) => {
    active = total - loaded;
  };
  manager.onLoad = () => {
    active = 0;
    if (allDoneResolve) allDoneResolve();
  };
  manager.onError = (url) => {
    console.warn(`[AssetLoader] Failed to load asset resource: ${url}`);
  };

  const loader = new FBXLoader(manager);
  const fbx = await loader.loadAsync(fbxPath);

  if (hasBrowserImages && active > 0) {
    await Promise.race([
      texturesReady,
      new Promise((resolve) => setTimeout(resolve, 10000)),
    ]);
  }
  return fbx;
}
export function createAssetLoadingManager(textureDir, textureAliases = {}) {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const cleanUrl = url.split("?")[0];
    if (/\.(png|jpe?g|webp|bmp|tga)$/i.test(cleanUrl)) {
      const base = cleanUrl.split(/[\\/]/).pop();
      const mapped = textureAliases[base] || base;
      return `${textureDir}${mapped}`;
    }
    return url;
  });
  return manager;
}

/**
 * Computes accurate world-space Box3 for an Object3D including SkinnedMesh bone transforms.
 */
export function computeAccurateWorldBox(object) {
  object.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const vertex = new THREE.Vector3();

  object.traverse((node) => {
    if (!node.isMesh || !node.geometry) return;
    const posAttr = node.geometry.attributes?.position;
    if (!posAttr) return;

    if (node.isSkinnedMesh && node.skeleton) {
      node.skeleton.update();
      const step = posAttr.count > 2500 ? 3 : 1;
      for (let i = 0; i < posAttr.count; i += step) {
        vertex.fromBufferAttribute(posAttr, i);
        node.applyBoneTransform(i, vertex);
        vertex.applyMatrix4(node.matrixWorld);
        box.expandByPoint(vertex);
      }
    } else {
      const meshBox = new THREE.Box3().setFromObject(node);
      box.union(meshBox);
    }
  });

  return box;
}

/**
 * Recursively disposes all GPU geometries, materials, and textures under an Object3D.
 */
export function disposeObject3D(root) {
  if (!root) return;
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  const disposedTextures = new Set();

  root.traverse((node) => {
    if (node.geometry && !disposedGeometries.has(node.geometry)) {
      disposedGeometries.add(node.geometry);
      node.geometry.dispose();
    }

    const materials = Array.isArray(node.material)
      ? node.material
      : node.material
        ? [node.material]
        : [];

    for (const mat of materials) {
      if (!mat || disposedMaterials.has(mat)) continue;
      disposedMaterials.add(mat);

      for (const value of Object.values(mat)) {
        if (value && value.isTexture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      }
      mat.dispose();
    }
  });
}

function configureMaterialsAndShadows(root, { doubleSided = false } = {}) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
    node.frustumCulled = false;

    const mats = Array.isArray(node.material) ? node.material : [node.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (doubleSided) {
        mat.side = THREE.DoubleSide;
      }
      if (mat.map) {
        // FBX exporters often encode dark DiffuseFactor (0.15-0.25) in mat.color;
        // reset to white so painted diffuse textures render at full fidelity.
        if (mat.color) {
          mat.color.setHex(0xffffff);
        }
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      if ("shininess" in mat) {
        mat.shininess = 8;
      }
      if ("specular" in mat && mat.specular) {
        mat.specular.setHex(0x222222);
      }
      mat.needsUpdate = true;
    }
  });
}

function removeEmbeddedCamerasAndLights(root) {
  const toRemove = [];
  root.traverse((node) => {
    if (node !== root && (node.isCamera || node.isLight)) {
      toRemove.push(node);
    }
  });
  for (const node of toRemove) {
    if (node.parent) node.parent.remove(node);
  }
}

/**
 * Builds an indoor walkable navigation grid + wall-collision raycast helpers
 * so characters never phase through walls or exit the house, and cameras stay unobstructed.
 */
function buildIndoorNavigation(houseRoot, allHouseMeshes) {
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const up = new THREE.Vector3(0, 1, 0);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();

  const xMin = -7.8;
  const xMax = 8.2;
  const zMin = -5.0;
  const zMax = 5.4;
  const step = 0.4;
  const cols = Math.round((xMax - xMin) / step) + 1;
  const rows = Math.round((zMax - zMin) / step) + 1;

  const cellX = (c) => xMin + c * step;
  const cellZ = (r) => zMin + r * step;
  const toCol = (x) => Math.max(0, Math.min(cols - 1, Math.round((x - xMin) / step)));
  const toRow = (z) => Math.max(0, Math.min(rows - 1, Math.round((z - zMin) / step)));

  function isPointInsideWalkable(x, z) {
    ray.set(tmpA.set(x, 2.2, z), down);
    ray.far = 3.2;
    const downHits = ray.intersectObjects(allHouseMeshes, false);
    const floor = downHits.find((h) => Math.abs(h.point.y) < 0.08);
    if (!floor) return false;
    const blocker = downHits.find(
      (h) => h.point.y >= 0.16 && h.point.y <= 1.72
    );
    if (blocker) return false;

    ray.set(tmpA.set(x, 1.0, z), up);
    ray.far = 2.6;
    const upHits = ray.intersectObjects(allHouseMeshes, false);
    return upHits.some((h) => h.point.y > 2.0 && h.point.y < 3.4);
  }

  function hasClearSight(ax, az, bx, bz, y = 0.95) {
    tmpA.set(ax, y, az);
    tmpB.set(bx, y, bz);
    tmpDir.subVectors(tmpB, tmpA);
    const dist = tmpDir.length();
    if (dist < 1e-4) return true;
    tmpDir.divideScalar(dist);
    ray.set(tmpA, tmpDir);
    ray.far = dist;
    return ray.intersectObjects(allHouseMeshes, false).length === 0;
  }

  function hasClearBodyCorridor(ax, az, bx, bz) {
    // Check center ray at knee/chest heights + slight shoulder offsets
    if (!hasClearSight(ax, az, bx, bz, 0.55)) return false;
    if (!hasClearSight(ax, az, bx, bz, 1.25)) return false;
    const dx = bx - ax;
    const dz = bz - az;
    const len = Math.hypot(dx, dz);
    if (len < 1e-4) return true;
    const nx = (-dz / len) * 0.2;
    const nz = (dx / len) * 0.2;
    if (!hasClearSight(ax + nx, az + nz, bx + nx, bz + nz, 0.95)) return false;
    if (!hasClearSight(ax - nx, az - nz, bx - nx, bz - nz, 0.95)) return false;
    // Also verify midpoint has indoor floor + ceiling so we never cross open porch/cellar
    return isPointInsideWalkable((ax + bx) * 0.5, (az + bz) * 0.5);
  }

  const walkable = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (isPointInsideWalkable(cellX(c), cellZ(r))) {
        walkable[r * cols + c] = 1;
      }
    }
  }

  function nearestWalkableCell(x, z) {
    let bestIdx = -1;
    let bestD2 = Infinity;
    const c0 = toCol(x);
    const r0 = toRow(z);
    for (let r = Math.max(0, r0 - 8); r <= Math.min(rows - 1, r0 + 8); r += 1) {
      for (let c = Math.max(0, c0 - 8); c <= Math.min(cols - 1, c0 + 8); c += 1) {
        const idx = r * cols + c;
        if (!walkable[idx]) continue;
        const d2 = (cellX(c) - x) ** 2 + (cellZ(r) - z) ** 2;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = idx;
        }
      }
    }
    return bestIdx;
  }

  function findPath(fromVec, toVec) {
    const start = fromVec.clone();
    const goal = toVec.clone();
    if (Math.abs(start.y - goal.y) > 0.45) {
      return [start, goal];
    }

    if (hasClearBodyCorridor(start.x, start.z, goal.x, goal.z)) {
      return [start, goal];
    }

    const sIdx = nearestWalkableCell(start.x, start.z);
    const gIdx = nearestWalkableCell(goal.x, goal.z);
    if (sIdx < 0 || gIdx < 0) {
      return [start, goal];
    }

    const total = cols * rows;
    const gScore = new Float32Array(total).fill(Infinity);
    const fScore = new Float32Array(total).fill(Infinity);
    const cameFrom = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const open = [sIdx];
    gScore[sIdx] = 0;
    const gx = cellX(gIdx % cols);
    const gz = cellZ(Math.floor(gIdx / cols));
    fScore[sIdx] = Math.hypot(gx - cellX(sIdx % cols), gz - cellZ(Math.floor(sIdx / cols)));

    const dirs = [
      [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
      [1, 1, 1.414], [-1, 1, 1.414], [1, -1, 1.414], [-1, -1, 1.414],
    ];

    let found = false;
    while (open.length > 0) {
      let bestPos = 0;
      for (let i = 1; i < open.length; i += 1) {
        if (fScore[open[i]] < fScore[open[bestPos]]) bestPos = i;
      }
      const cur = open.splice(bestPos, 1)[0];
      if (cur === gIdx) {
        found = true;
        break;
      }
      closed[cur] = 1;
      const cr = Math.floor(cur / cols);
      const cc = cur % cols;
      const cx = cellX(cc);
      const cz = cellZ(cr);

      for (const [dc, dr, costMul] of dirs) {
        const nc = cc + dc;
        const nr = cr + dr;
        if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
        const nIdx = nr * cols + nc;
        if (closed[nIdx] || !walkable[nIdx]) continue;
        const nx = cellX(nc);
        const nz = cellZ(nr);
        if (!hasClearSight(cx, cz, nx, nz, 0.95)) continue;

        const tentative = gScore[cur] + step * costMul;
        if (tentative < gScore[nIdx]) {
          cameFrom[nIdx] = cur;
          gScore[nIdx] = tentative;
          fScore[nIdx] = tentative + Math.hypot(gx - nx, gz - nz);
          if (!open.includes(nIdx)) open.push(nIdx);
        }
      }
    }

    if (!found) {
      return [start, goal];
    }

    const rawPts = [];
    let p = gIdx;
    while (p !== -1) {
      rawPts.push(new THREE.Vector3(cellX(p % cols), start.y, cellZ(Math.floor(p / cols))));
      p = cameFrom[p];
    }
    rawPts.reverse();
    const combined = [start, ...rawPts, goal];

    // String-pull collinear / directly visible segments
    const smoothed = [combined[0]];
    let anchor = 0;
    while (anchor < combined.length - 1) {
      let farthest = anchor + 1;
      for (let j = combined.length - 1; j > anchor + 1; j -= 1) {
        if (hasClearBodyCorridor(combined[anchor].x, combined[anchor].z, combined[j].x, combined[j].z)) {
          farthest = j;
          break;
        }
      }
      smoothed.push(combined[farthest]);
      anchor = farthest;
    }
    return smoothed;
  }

  /**
   * Ensures a camera position stays indoors, below ceiling height, and unobstructed by walls.
   */
  function clampCameraPosition(lookTarget, desiredPos, minDist = 0.85) {
    const out = desiredPos.clone();
    if (lookTarget.y < 2.2) {
      out.y = Math.min(out.y, 2.48);
      out.y = Math.max(out.y, 0.45);
    }

    tmpDir.subVectors(out, lookTarget);
    const dist = tmpDir.length();
    if (dist > 0.05) {
      tmpDir.divideScalar(dist);
      ray.set(lookTarget, tmpDir);
      ray.far = dist;
      const hits = ray.intersectObjects(allHouseMeshes, false);
      if (hits.length > 0) {
        const safeDist = Math.max(minDist, hits[0].distance - 0.35);
        out.copy(lookTarget).addScaledVector(tmpDir, safeDist);
      }
    }
    return out;
  }

  /**
   * Finds the clearest indoor camera position around lookTarget at preferred distance/height.
   */
  function findClearCameraPosition(lookTarget, preferredOffset, distance = 3.1, height = 1.68) {
    const candidates = [
      preferredOffset.clone().normalize(),
      new THREE.Vector3(0.45, 0, 0.89).normalize(),
      new THREE.Vector3(-0.45, 0, 0.89).normalize(),
      new THREE.Vector3(0.92, 0, 0.38).normalize(),
      new THREE.Vector3(-0.92, 0, 0.38).normalize(),
      new THREE.Vector3(0.35, 0, -0.94).normalize(),
      new THREE.Vector3(-0.35, 0, -0.94).normalize(),
    ];

    let bestPos = null;
    let bestScore = -Infinity;
    const probe = new THREE.Vector3();

    for (let idx = 0; idx < candidates.length; idx += 1) {
      const dir = candidates[idx];
      probe.set(
        lookTarget.x + dir.x * distance,
        Math.min(2.42, lookTarget.y + (height - 1.1)),
        lookTarget.z + dir.z * distance
      );
      const clamped = clampCameraPosition(lookTarget, probe, 0.85);
      const achievedDist = clamped.distanceTo(lookTarget);

      // Prefer indoor spots with ceiling overhead and maximal unobstructed distance
      ray.set(tmpA.set(clamped.x, 1.0, clamped.z), up);
      ray.far = 2.6;
      const indoorBonus = ray.intersectObjects(allHouseMeshes, false).some((h) => h.point.y > 2.0) ? 1.2 : 0;
      const prefBonus = idx === 0 ? 0.25 : 0;
      const score = achievedDist + indoorBonus + prefBonus;

      if (score > bestScore) {
        bestScore = score;
        bestPos = clamped;
      }
    }
    return bestPos || clampCameraPosition(lookTarget, lookTarget.clone().add(preferredOffset));
  }

  return {
    isPointInsideWalkable,
    hasClearSight,
    findPath,
    clampCameraPosition,
    findClearCameraPosition,
  };
}

/**
 * Loads and normalizes the Granny 1 House FBX so its Main Ground Floor sits at y = 0.
 */
export async function loadHouse() {
  const spec = ASSET_MANIFEST.house;
  const rawHouse = await loadFbxWithTextures(
    spec.fbxPath,
    spec.textureDir,
    spec.textureAliases
  );
  removeEmbeddedCamerasAndLights(rawHouse);
  configureMaterialsAndShadows(rawHouse, { doubleSided: true });

  const houseRoot = new THREE.Group();
  houseRoot.name = "GrannyHouseRoot";

  const scale = CONFIG.house.scale;
  rawHouse.scale.setScalar(scale);
  rawHouse.position.y = -CONFIG.house.groundFloorRawY * scale;
  houseRoot.add(rawHouse);
  houseRoot.updateMatrixWorld(true);

  const floorMeshes = [];
  const allHouseMeshes = [];
  houseRoot.traverse((node) => {
    if (node.isMesh) {
      allHouseMeshes.push(node);
      if (node.name === "HouseFloor") {
        floorMeshes.push(node);
      }
    }
  });

  const nav = buildIndoorNavigation(houseRoot, allHouseMeshes);

  return {
    root: houseRoot,
    floorMeshes,
    allHouseMeshes,
    ...nav,
    dispose: () => disposeObject3D(houseRoot),
  };
}

/**
 * Loads a character FBX, repairs SkinnedMesh bind matrices if needed,
 * normalizes height/origin/facing (+Z), and caches it as a reusable clone template.
 */
export async function loadCharacterTemplate(charKey) {
  const spec = ASSET_MANIFEST.characters[charKey];
  if (!spec) {
    throw new Error(`Unknown character asset key: "${charKey}"`);
  }

  const rawModel = await loadFbxWithTextures(
    spec.fbxPath,
    spec.textureDir,
    spec.textureAliases
  );

  removeEmbeddedCamerasAndLights(rawModel);
  configureMaterialsAndShadows(rawModel, { doubleSided: false });
  rawModel.updateMatrixWorld(true);

  if (spec.fixBindMatrixToWorld) {
    rawModel.traverse((node) => {
      if (node.isSkinnedMesh && node.skeleton) {
        node.bindMode = THREE.AttachedBindMode;
        node.bindMatrix.copy(node.matrixWorld);
        node.bindMatrixInverse.copy(node.matrixWorld).invert();
      }
    });
  }

  // Wrap inside orientation + normalization container facing +Z with feet at y = 0
  const templateRoot = new THREE.Group();
  templateRoot.name = `Template_${spec.id}`;

  const orientationHolder = new THREE.Group();
  orientationHolder.rotation.y = spec.forwardYawOffset || 0;
  orientationHolder.add(rawModel);
  templateRoot.add(orientationHolder);
  templateRoot.updateMatrixWorld(true);

  const rawBox = computeAccurateWorldBox(templateRoot);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const safeHeight = rawSize.y > 0.001 ? rawSize.y : 1;
  const uniformScale = spec.targetHeight / safeHeight;

  orientationHolder.scale.setScalar(uniformScale);
  orientationHolder.position.set(
    -rawCenter.x * uniformScale,
    -rawBox.min.y * uniformScale,
    -rawCenter.z * uniformScale
  );
  templateRoot.updateMatrixWorld(true);

  return {
    key: charKey,
    spec,
    root: templateRoot,
    rawAnimations: rawModel.animations || [],
    dispose: () => disposeObject3D(templateRoot),
  };
}

/**
 * Instantiates a loaded character template using SkeletonUtils.clone()
 * behind the standardized studio character API.
 */
export function instantiateCharacter(id, template, animationClips) {
  const root = new THREE.Group();
  root.name = `Actor_${id}`;

  const rigHolder = SkeletonUtils.clone(template.root);
  rigHolder.name = `${id}_RigHolder`;
  root.add(rigHolder);

  const mixer = new THREE.AnimationMixer(rigHolder);
  const actions = {};

  for (const [animName, clipData] of Object.entries(animationClips)) {
    const clip = clipData.clip;
    const action = mixer.clipAction(clip);
    const shouldLoop = clipData.loop !== false;
    action.setLoop(
      shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce,
      shouldLoop ? Infinity : 1
    );
    action.clampWhenFinished = !shouldLoop;
    actions[animName] = {
      action,
      clip,
      meta: clipData,
    };
  }

  const headBone = template.spec.headBoneName
    ? rigHolder.getObjectByName(template.spec.headBoneName)
    : null;

  let currentActionEntry = null;
  let currentAnimName = null;
  let speaking = false;
  let speakPhase = 0;
  let jumpOffsetY = 0;
  const lookTargetVec = new THREE.Vector3();

  function playAnimation(
    name,
    fadeDuration = CONFIG.defaultFadeDuration,
    speed = null,
    loopOverride = null
  ) {
    const entry = actions[name] || actions.idle || Object.values(actions)[0];
    if (!entry) return null;

    const nextAction = entry.action;
    const effectiveSpeed = speed ?? entry.meta.defaultSpeed ?? 1.0;
    const shouldLoop =
      loopOverride !== null ? loopOverride : entry.meta.loop !== false;

    nextAction.setLoop(
      shouldLoop ? THREE.LoopRepeat : THREE.LoopOnce,
      shouldLoop ? Infinity : 1
    );
    nextAction.clampWhenFinished = !shouldLoop;
    nextAction.timeScale = effectiveSpeed;

    if (currentActionEntry && currentActionEntry.action === nextAction) {
      if (!shouldLoop) {
        nextAction.reset();
        nextAction.play();
      }
      currentAnimName = name;
      return nextAction;
    }

    nextAction.reset();
    nextAction.setEffectiveWeight(1);
    nextAction.play();

    if (currentActionEntry && currentActionEntry.action !== nextAction) {
      currentActionEntry.action.crossFadeTo(nextAction, fadeDuration, true);
    }

    currentActionEntry = entry;
    currentAnimName = name;
    return nextAction;
  }

  function lookAt(targetPos) {
    if (!targetPos) return;
    lookTargetVec.set(targetPos.x, root.position.y, targetPos.z);
    if (lookTargetVec.distanceToSquared(root.position) > 1e-5) {
      root.lookAt(lookTargetVec);
    }
  }

  function setSpeaking(isSpeaking) {
    speaking = Boolean(isSpeaking);
    if (!speaking) {
      speakPhase = 0;
    }
  }

  function setJumpOffset(yOffset) {
    jumpOffsetY = yOffset;
  }

  function getHeadWorldPosition(out = new THREE.Vector3()) {
    if (headBone) {
      headBone.getWorldPosition(out);
      return out;
    }
    return out.set(
      root.position.x,
      root.position.y + template.spec.targetHeight * 0.85,
      root.position.z
    );
  }

  function update(dt) {
    mixer.update(dt);

    // Subtle cartoon squash/bounce + jaw/head accent while speaking or jumping
    let speakBounceY = 0;
    let speakNod = 0;
    if (speaking) {
      speakPhase += dt * 18.0;
      speakBounceY = Math.abs(Math.sin(speakPhase)) * 0.025;
      speakNod = Math.sin(speakPhase * 0.85) * 0.06;
    }

    // Apply jump vertical arc extracted from Jumping.fbx if active
    let clipJumpLift = 0;
    if (
      currentActionEntry &&
      currentActionEntry.meta.jumpArc &&
      currentActionEntry.action.isRunning()
    ) {
      const arc = currentActionEntry.meta.jumpArc;
      const normT = clamp01(
        currentActionEntry.action.time / Math.max(0.01, currentActionEntry.clip.duration)
      );
      const idx = Math.min(arc.length - 1, Math.floor(normT * (arc.length - 1)));
      clipJumpLift = arc[idx];
    }

    rigHolder.position.y = jumpOffsetY + clipJumpLift + speakBounceY;
    rigHolder.rotation.x = speakNod;
  }

  function resetPose() {
    speaking = false;
    speakPhase = 0;
    jumpOffsetY = 0;
    rigHolder.position.set(0, 0, 0);
    rigHolder.rotation.set(0, 0, 0);
    mixer.stopAllAction();
    currentActionEntry = null;
    currentAnimName = null;
  }

  function dispose() {
    mixer.stopAllAction();
    mixer.uncacheRoot(rigHolder);
    disposeObject3D(root);
  }

  // Start in idle if available
  if (actions.idle) {
    playAnimation("idle", 0);
  }

  return {
    id,
    spec: template.spec,
    root,
    rigHolder,
    mixer,
    actions,
    get currentAnimation() {
      return currentAnimName;
    },
    get isSpeaking() {
      return speaking;
    },
    playAnimation,
    lookAt,
    setSpeaking,
    setJumpOffset,
    getHeadWorldPosition,
    resetPose,
    update,
    dispose,
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
