import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { ASSET_MANIFEST, CONFIG } from "./config.js";

/**
 * Builds a LoadingManager that remaps embedded absolute/relative FBX texture paths
 * to the asset's real ./textures/ directory on disk.
 */
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
        mat.map.colorSpace = THREE.SRGBColorSpace;
        mat.map.needsUpdate = true;
      }
      // Tone down harsh FBX specular highlights so baked cartoon textures read cleanly
      if ("shininess" in mat && mat.shininess > 20) {
        mat.shininess = 12;
      }
      if ("specular" in mat && mat.specular) {
        mat.specular.multiplyScalar(0.25);
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
 * Loads and normalizes the Granny 1 House FBX so its Main Ground Floor sits at y = 0.
 */
export async function loadHouse() {
  const spec = ASSET_MANIFEST.house;
  const manager = createAssetLoadingManager(spec.textureDir, spec.textureAliases);
  const loader = new FBXLoader(manager);

  const rawHouse = await loader.loadAsync(spec.fbxPath);
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

  return {
    root: houseRoot,
    floorMeshes,
    allHouseMeshes,
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

  const manager = createAssetLoadingManager(spec.textureDir, spec.textureAliases);
  const loader = new FBXLoader(manager);
  const rawModel = await loader.loadAsync(spec.fbxPath);

  removeEmbeddedCamerasAndLights(rawModel);
  configureMaterialsAndShadows(rawModel, { doubleSided: false });
  rawModel.updateMatrixWorld(true);

  if (spec.forceDetachedBindMode) {
    rawModel.traverse((node) => {
      if (node.isSkinnedMesh && node.skeleton) {
        node.bindMode = THREE.DetachedBindMode;
        node.bind(node.skeleton, node.matrixWorld.clone());
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

  // Preserve DetachedBindMode after SkeletonUtils.clone if required by the rig
  if (template.spec.forceDetachedBindMode) {
    rigHolder.traverse((node) => {
      if (node.isSkinnedMesh) {
        node.bindMode = THREE.DetachedBindMode;
      }
    });
  }

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
