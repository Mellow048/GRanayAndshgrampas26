import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { ASSET_MANIFEST } from "./config.js";
import { disposeObject3D } from "./assetLoader.js";

/**
 * Normalizes bone names by stripping common Mixamo / Blender prefixes or separators
 * for diagnostics and flexible matching.
 */
export function normalizeBoneName(name) {
  return name.replace(/^mixamorig:?/i, "").replace(/[\s:]/g, "_");
}

function getBoneChildDirection(bone) {
  const origin = new THREE.Vector3();
  const childPos = new THREE.Vector3();
  bone.getWorldPosition(origin);

  for (const child of bone.children) {
    if (!child.isBone) continue;
    child.getWorldPosition(childPos);
    const delta = childPos.sub(origin);
    if (delta.lengthSq() > 1e-6) {
      return delta.normalize();
    }
  }
  return null;
}

/**
 * Strips all .position and .scale tracks from an AnimationClip so movement is
 * 100% controlled by the EpisodeRunner's transform controller (no root motion drift).
 */
export function sanitizeClipInPlace(clip, { keepPrefixPattern = null } = {}) {
  const cloned = clip.clone();
  cloned.tracks = cloned.tracks.filter((track) => {
    if (track.name.endsWith(".position") || track.name.endsWith(".scale")) {
      return false;
    }
    if (keepPrefixPattern && !keepPrefixPattern.test(track.name)) {
      return false;
    }
    return true;
  });
  return cloned;
}

/**
 * Extracts a clean vertical jump lift curve (meters above ground) from a Mixamo
 * jump clip's Hips.position.y track before position keyframes are discarded.
 */
function extractJumpArc(clip) {
  const hipsPosTrack = clip.tracks.find(
    (t) => t.name.endsWith(".position") && /hips/i.test(t.name)
  );
  if (!hipsPosTrack || hipsPosTrack.values.length < 6) return null;

  const sampleCount = 48;
  const values = hipsPosTrack.values;
  const times = hipsPosTrack.times;
  const baseY = values[1];
  const minY = (() => {
    let m = Infinity;
    for (let i = 1; i < values.length; i += 3) {
      if (values[i] < m) m = values[i];
    }
    return m;
  })();

  const arc = [];
  const duration = Math.max(0.01, clip.duration);
  let rawMax = 0;
  for (let i = 0; i < sampleCount; i++) {
    const targetT = (i / (sampleCount - 1)) * duration;
    let idx = 0;
    while (idx < times.length - 2 && times[idx + 1] < targetT) {
      idx++;
    }
    const y = values[idx * 3 + 1];
    // Mixamo FBX is in centimeters (~100cm = 1m); convert relative lift above rest height
    const liftMeters = Math.max(0, (y - Math.max(baseY, minY)) * 0.01);
    if (liftMeters > rawMax) rawMax = liftMeters;
    arc.push(liftMeters);
  }
  // Cap vertical hop at 0.32m so characters clear the floor cleanly without hitting the 2.84m ceiling
  const maxHopMeters = 0.32;
  if (rawMax > maxHopMeters) {
    const scale = maxHopMeters / rawMax;
    for (let i = 0; i < arc.length; i++) {
      arc[i] *= scale;
    }
  }
  return arc;
}

/**
 * Scale-invariant world-quaternion retargeter from a Mixamo T-pose FBX rig
 * onto any target skeleton (3ds Max Bip01, Blender Armature, or standard Mixamo).
 */
export function retargetMixamoClip(
  targetRoot,
  sourceRoot,
  sourceClip,
  targetToSourceMap,
  alignChainBones = []
) {
  targetRoot.updateMatrixWorld(true);
  sourceRoot.updateMatrixWorld(true);

  const alignSet = new Set(alignChainBones);
  const sourceBones = new Map();
  sourceRoot.traverse((node) => {
    if (node.isBone && !sourceBones.has(node.name)) {
      sourceBones.set(node.name, node);
    }
  });

  const mappedBones = [];
  targetRoot.traverse((node) => {
    if (
      node.isBone &&
      targetToSourceMap[node.name] &&
      sourceBones.has(targetToSourceMap[node.name])
    ) {
      mappedBones.push(node);
    }
  });

  // Precompute rest-pose world quaternion offset (including A-pose -> T-pose limb vector alignment)
  const restOffset = new Map();
  for (const targetBone of mappedBones) {
    const sourceBone = sourceBones.get(targetToSourceMap[targetBone.name]);
    const qTargetRest = targetBone.getWorldQuaternion(new THREE.Quaternion());
    const qSourceRest = sourceBone.getWorldQuaternion(new THREE.Quaternion());

    if (alignSet.has(targetBone.name)) {
      const targetDir = getBoneChildDirection(targetBone);
      const sourceDir = getBoneChildDirection(sourceBone);
      if (targetDir && sourceDir) {
        const qAlign = new THREE.Quaternion().setFromUnitVectors(
          targetDir,
          sourceDir
        );
        qTargetRest.premultiply(qAlign);
      }
    }

    restOffset.set(
      targetBone.name,
      qSourceRest.clone().invert().multiply(qTargetRest)
    );
  }

  const fps = 30;
  const duration = Math.max(sourceClip.duration, 1 / fps);
  const numFrames = Math.max(2, Math.round(duration * fps) + 1);
  const times = new Float32Array(numFrames);
  const trackBuffers = new Map();
  for (const tb of mappedBones) {
    trackBuffers.set(tb.name, new Float32Array(numFrames * 4));
  }

  // Sample sanitized source clip (rotation-only) across its duration
  const sanitizedSource = sanitizeClipInPlace(sourceClip);
  const sourceMixer = new THREE.AnimationMixer(sourceRoot);
  sourceMixer.clipAction(sanitizedSource).play();

  const qSourceAnimWorld = new THREE.Quaternion();
  const qTargetAnimWorld = new Map();
  const qLocal = new THREE.Quaternion();
  const effectiveWorld = new Map();

  for (let frame = 0; frame < numFrames; frame++) {
    const sampleTime = Math.min(duration, (frame / (numFrames - 1)) * duration);
    times[frame] = sampleTime;

    sourceMixer.setTime(sampleTime);
    sourceRoot.updateMatrixWorld(true);
    qTargetAnimWorld.clear();

    for (const targetBone of mappedBones) {
      const sourceBone = sourceBones.get(targetToSourceMap[targetBone.name]);
      sourceBone.getWorldQuaternion(qSourceAnimWorld);
      const desiredWorld = qSourceAnimWorld
        .clone()
        .multiply(restOffset.get(targetBone.name));
      qTargetAnimWorld.set(targetBone.name, desiredWorld);
    }

    effectiveWorld.clear();
    targetRoot.traverse((node) => {
      if (node === targetRoot) {
        effectiveWorld.set(
          node,
          targetRoot.getWorldQuaternion(new THREE.Quaternion())
        );
        return;
      }

      const parentWorld =
        effectiveWorld.get(node.parent) ||
        node.parent.getWorldQuaternion(new THREE.Quaternion());

      if (qTargetAnimWorld.has(node.name)) {
        const worldQ = qTargetAnimWorld.get(node.name);
        effectiveWorld.set(node, worldQ);
        qLocal.copy(parentWorld).invert().multiply(worldQ).normalize();

        const buffer = trackBuffers.get(node.name);
        buffer[frame * 4 + 0] = qLocal.x;
        buffer[frame * 4 + 1] = qLocal.y;
        buffer[frame * 4 + 2] = qLocal.z;
        buffer[frame * 4 + 3] = qLocal.w;
      } else {
        effectiveWorld.set(node, parentWorld.clone().multiply(node.quaternion));
      }
    });
  }

  sourceMixer.uncacheAction(sanitizedSource);
  sourceMixer.uncacheRoot(sourceRoot);

  const tracks = mappedBones.map(
    (tb) =>
      new THREE.QuaternionKeyframeTrack(
        `${tb.name}.quaternion`,
        times,
        trackBuffers.get(tb.name)
      )
  );

  return new THREE.AnimationClip(sourceClip.name, duration, tracks);
}

/**
 * Measures the character's shoulder-based world forward yaw at t=0 of a clip
 * and bakes out any initial Y-axis yaw offset into the Hips quaternion track
 * so every animation clip reliably faces local +Z (0 deg yaw).
 */
export function normalizeClipYawToPlusZ(targetRoot, clip, spec) {
  const isBip01 = spec.rigType === "bip01";
  const hipsName = isBip01 ? "Bip01_Pelvis" : "Bone";
  const lArmName = isBip01 ? "Bip01_L_UpperArm" : "upArm_L";
  const rArmName = isBip01 ? "Bip01_R_UpperArm" : "upArm_R_001";

  const hipsTrack = clip.tracks.find(
    (t) => t.name === `${hipsName}.quaternion`
  );
  const hipsBone = targetRoot.getObjectByName(hipsName);
  const lArm = targetRoot.getObjectByName(lArmName);
  const rArm = targetRoot.getObjectByName(rArmName);
  if (!hipsTrack || !hipsBone || !lArm || !rArm) return clip;

  // Save rest quaternions so we leave targetRoot pristine
  const savedQuats = new Map();
  targetRoot.traverse((n) => {
    if (n.isBone) savedQuats.set(n, n.quaternion.clone());
  });

  const mixer = new THREE.AnimationMixer(targetRoot);
  const act = mixer.clipAction(clip);
  act.play();
  mixer.setTime(0);
  targetRoot.updateMatrixWorld(true);

  const lPos = lArm.getWorldPosition(new THREE.Vector3());
  const rPos = rArm.getWorldPosition(new THREE.Vector3());
  const lr = rPos.sub(lPos).setY(0);
  if (lr.lengthSq() > 1e-6) {
    lr.normalize();
    const fwd = new THREE.Vector3(0, 1, 0).cross(lr).normalize();
    const yaw0 = Math.atan2(fwd.x, fwd.z);

    if (Math.abs(yaw0) > 0.015) {
      const qFixWorld = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        -yaw0
      );
      const qParentWorld = hipsBone.parent
        ? hipsBone.parent.getWorldQuaternion(new THREE.Quaternion())
        : new THREE.Quaternion();
      const qDeltaLocal = qParentWorld
        .clone()
        .invert()
        .multiply(qFixWorld)
        .multiply(qParentWorld);

      const vals = hipsTrack.values;
      const q = new THREE.Quaternion();
      for (let i = 0; i < vals.length; i += 4) {
        q.set(vals[i], vals[i + 1], vals[i + 2], vals[i + 3]);
        q.premultiply(qDeltaLocal).normalize();
        vals[i] = q.x;
        vals[i + 1] = q.y;
        vals[i + 2] = q.z;
        vals[i + 3] = q.w;
      }
    }
  }

  mixer.uncacheAction(clip);
  mixer.uncacheRoot(targetRoot);
  for (const [bone, q] of savedQuats.entries()) {
    bone.quaternion.copy(q);
  }
  targetRoot.updateMatrixWorld(true);
  return clip;
}

/**
 * Generates a subtle standing breathing idle clip from a character's rest pose
 * when no standalone Mixamo Idle template exists on disk.
 */
function createProceduralIdleClip(targetRoot, spec) {
  const duration = 2.4;
  const times = new Float32Array([0, 0.6, 1.2, 1.8, 2.4]);
  const tracks = [];

  const spineBone =
    targetRoot.getObjectByName("Spine1") ||
    targetRoot.getObjectByName("Bip01_Spine1");
  const headBone = targetRoot.getObjectByName(spec.headBoneName);

  const addSwayTrack = (bone, eulerAngles) => {
    if (!bone) return;
    const baseQ = bone.quaternion.clone();
    const values = new Float32Array(times.length * 4);
    const deltaQ = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (let i = 0; i < times.length; i++) {
      const [rx, ry, rz] = eulerAngles[i];
      euler.set(rx, ry, rz);
      deltaQ.setFromEuler(euler);
      const finalQ = baseQ.clone().multiply(deltaQ).normalize();
      values[i * 4 + 0] = finalQ.x;
      values[i * 4 + 1] = finalQ.y;
      values[i * 4 + 2] = finalQ.z;
      values[i * 4 + 3] = finalQ.w;
    }

    tracks.push(
      new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values)
    );
  };

  addSwayTrack(spineBone, [
    [0, 0, 0],
    [0.028, 0.015, 0],
    [0, 0, 0],
    [-0.018, -0.015, 0],
    [0, 0, 0],
  ]);

  addSwayTrack(headBone, [
    [0, 0, 0],
    [-0.02, 0.05, 0],
    [0, 0, 0],
    [0.015, -0.05, 0],
    [0, 0, 0],
  ]);

  return new THREE.AnimationClip("idle", duration, tracks);
}

/**
 * Loads all Mixamo FBX animation templates from ./Assets/AnimationTemplates,
 * immediately disposes template meshes after extraction/retargeting, and builds
 * per-character animation clip libraries.
 */
export class AnimationLibrary {
  constructor() {
    this.templates = new Map();
    this.characterClips = new Map();
  }

  async loadAllTemplates() {
    const loader = new FBXLoader();
    const uniquePaths = new Set(
      Object.values(ASSET_MANIFEST.animations).map((entry) => entry.path)
    );

    const loadedByPath = new Map();
    await Promise.all(
      [...uniquePaths].map(async (fbxPath) => {
        const fbxRoot = await loader.loadAsync(fbxPath);
        const rawClip =
          (fbxRoot.animations || []).find((c) => c.tracks.length > 0) || null;

        if (!rawClip) {
          disposeObject3D(fbxRoot);
          throw new Error(`No animation tracks found in Mixamo template: ${fbxPath}`);
        }

        const jumpArc = extractJumpArc(rawClip);
        const sanitizedClip = sanitizeClipInPlace(rawClip);

        // Dispose meshes/materials/textures immediately; retain only lightweight skeleton hierarchy for retargeting
        fbxRoot.traverse((node) => {
          if (node.isMesh) {
            node.visible = false;
          }
        });
        disposeObject3D(fbxRoot);

        loadedByPath.set(fbxPath, {
          sourceRoot: fbxRoot,
          rawClip,
          sanitizedClip,
          jumpArc,
        });
      })
    );

    for (const [actionKey, animDef] of Object.entries(ASSET_MANIFEST.animations)) {
      const bundle = loadedByPath.get(animDef.path);
      this.templates.set(actionKey, {
        key: actionKey,
        animDef,
        ...bundle,
      });
    }
  }

  /**
   * Builds and caches retargeted AnimationClips for a normalized character template.
   */
  buildClipsForCharacter(charTemplate) {
    if (this.characterClips.has(charTemplate.key)) {
      return this.characterClips.get(charTemplate.key);
    }

    const { spec, root, rawAnimations } = charTemplate;
    const clips = {};

    // 1. Register native embedded clips if authored on the character (e.g., Granny's idle/hit/look)
    for (const [alias, rawName] of Object.entries(
      spec.embeddedClipAliases || {}
    )) {
      const found = rawAnimations.find((c) => c.name === rawName);
      if (found) {
        const clean = sanitizeClipInPlace(found, {
          keepPrefixPattern: /^(Bip01_|SlendrinaMom_)/,
        });
        clean.name = alias;
        normalizeClipYawToPlusZ(root, clean, spec);
        clips[alias] = {
          clip: clean,
          loop: alias === "idle" || alias === "look" || alias === "granny_walk",
          defaultSpeed: 1.0,
          jumpArc: null,
        };
      }
    }

    // 2. Retarget all Mixamo animation templates from ./Assets/AnimationTemplates
    for (const [actionKey, tpl] of this.templates.entries()) {
      const retargeted = retargetMixamoClip(
        root,
        tpl.sourceRoot,
        tpl.rawClip,
        spec.boneMap,
        spec.alignChains
      );
      retargeted.name = actionKey;
      normalizeClipYawToPlusZ(root, retargeted, spec);

      clips[actionKey] = {
        clip: retargeted,
        loop: tpl.animDef.loop !== false,
        defaultSpeed: tpl.animDef.defaultSpeed ?? 1.0,
        jumpArc: tpl.animDef.preserveJumpArc ? tpl.jumpArc : null,
      };
    }

    // 3. Ensure every character always has a clean "idle" action
    if (!clips.idle) {
      clips.idle = {
        clip: createProceduralIdleClip(root, spec),
        loop: true,
        defaultSpeed: 1.0,
        jumpArc: null,
      };
    }

    this.characterClips.set(charTemplate.key, clips);
    return clips;
  }

  /**
   * Disposes all cached source template skeletons once all character rigs are built.
   */
  disposeSourceTemplates() {
    for (const tpl of this.templates.values()) {
      disposeObject3D(tpl.sourceRoot);
    }
    this.templates.clear();
  }

  getActionNames(charKey) {
    const clips = this.characterClips.get(charKey);
    return clips ? Object.keys(clips) : [];
  }
}
