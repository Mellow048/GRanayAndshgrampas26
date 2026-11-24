import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";
import { ASSET_MANIFEST, CONFIG, SEMANTIC_MESH_TAGS, SEMANTIC_OBJECT_REGIONS } from "./config.js";
import { createPropMesh, biteCookie, ThoughtBubbleCache } from "./comedyProps.js";
import { headAimAngles, headAimWeight, aimStep } from "./stagingSafety.js";
import { isHeadGesture, headGestureSpec, sampleHeadGesture } from "./headGestures.js";

const sharedBubbleCache = new ThoughtBubbleCache();

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
const num = (v) => (Number.isFinite(v) ? v : 0);

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

function configureMaterialsAndShadows(
  root,
  { doubleSided = false, frustumCulled = false, castShadow = true } = {}
) {
  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = castShadow;
    node.receiveShadow = true;
    node.frustumCulled = node.isSkinnedMesh ? false : frustumCulled;

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

  // Accept either (x, z) or a Vector3 — the old code was called both ways and
  // a Vector3 produced NaN rays, which silently made every safety check pass.
  function xzOf(a, b) {
    if (a && typeof a === "object") return { x: a.x, z: a.z };
    return { x: a, z: b };
  }

  function isPointInsideWalkable(a, b) {
    const { x, z } = xzOf(a, b);
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    // Raycast from above the second floor downward
    ray.set(tmpA.set(x, 4.2, z), down);
    ray.far = 5.2;
    const downHits = ray.intersectObjects(allHouseMeshes, false);
    
    // CRITICAL FIX: Allow both ground floor (0.0) and second floor (2.85)
    const floor = downHits.find((h) => Math.abs(h.point.y) < 0.1 || Math.abs(h.point.y - 2.85) < 0.15);
    if (!floor) return false;
    
    const blocker = downHits.find(
      (h) => (h.point.y >= 0.16 && h.point.y <= 1.72) || (h.point.y >= 3.0 && h.point.y <= 4.5)
    );
    if (blocker) return false;
    return true;
  }

  function hasClearSight(ax, az, bx, bz, y = 0.95) {
    // Two call styles: (ax, az, bx, bz, y) or (vecA, vecB, y).
    let height = y;
    if (ax && typeof ax === "object" && az && typeof az === "object") {
      const a = ax;
      const b = az;
      height = typeof bx === "number" ? bx : y;
      ax = a.x;
      az = a.z;
      bx = b.x;
      bz = b.z;
    }
    if (![ax, az, bx, bz].every(Number.isFinite)) return false;
    tmpA.set(ax, height, az);
    tmpB.set(bx, height, bz);
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
   * Ensures a camera position stays indoors, below actual local ceiling height, and unobstructed by walls.
   */
  function clampCameraPosition(lookTarget, desiredPos, minDist = 0.85) {
    const out = desiredPos.clone();
    out.y = Math.max(out.y, 0.35);

    // Raycast upward from chest/waist level below lookTarget to detect the real ceiling above out.(x,z)
    const probeBaseY = Math.max(0.35, Math.min(lookTarget.y - 0.85, out.y - 0.85));
    ray.set(tmpA.set(out.x, probeBaseY, out.z), up);
    ray.far = 6.5;
    const ceilHits = ray.intersectObjects(allHouseMeshes, false);
    if (ceilHits.length > 0) {
      const localCeilY = ceilHits[0].point.y - 0.16;
      if (out.y > localCeilY) {
        out.y = Math.max(0.35, localCeilY);
      }
    } else {
      out.y = Math.min(out.y, 5.45);
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

  /**
   * Raycast adapter consumed by `stagingSafety` / `episodeSafety`.
   * Keeps the geometry vocabulary (surfaces, walls) out of the rules module.
   */
  const stagingWorld = {
    castRay(origin, dir, far) {
      if (!origin || !dir) return null;
      ray.set(tmpA.set(origin.x, origin.y, origin.z), tmpDir.set(dir.x, dir.y, dir.z).normalize());
      ray.far = Math.max(0.01, far);
      const hits = ray.intersectObjects(allHouseMeshes, false);
      if (!hits.length) return null;
      return { distance: hits[0].distance, point: hits[0].point.clone(), object: hits[0].object };
    },
    castDown(x, z, fromY, far) {
      ray.set(tmpA.set(x, fromY, z), down);
      ray.far = Math.max(0.01, far);
      const hits = ray.intersectObjects(allHouseMeshes, false);
      // Ignore ceilings/walls above; take the first surface strictly below.
      const hit = hits.find((h) => h.point.y < fromY - 0.005);
      if (!hit) return null;
      return { distance: hit.distance, point: hit.point.clone(), object: hit.object };
    },
    walkableAt(x, z) {
      return isPointInsideWalkable(x, z);
    },
    findPath(from, to) {
      return findPath(
        new THREE.Vector3(from.x, from.y ?? 0, from.z),
        new THREE.Vector3(to.x, to.y ?? 0, to.z)
      );
    },
    hasClearSight,
    hasClearBodyCorridor,
  };

  return {
    isPointInsideWalkable,
    hasClearSight,
    hasClearBodyCorridor,
    findPath,
    clampCameraPosition,
    findClearCameraPosition,
    stagingWorld,
  };
}

export function setupHouseFromRaw(rawHouse) {
  removeEmbeddedCamerasAndLights(rawHouse);
  configureMaterialsAndShadows(rawHouse, {
    doubleSided: true,
    frustumCulled: true,
    castShadow: false,
  });

  const houseRoot = new THREE.Group();
  houseRoot.name = "GrannyHouseRoot";

  const scale = CONFIG.house.scale;
  rawHouse.scale.setScalar(scale);
  rawHouse.position.y = -CONFIG.house.groundFloorRawY * scale;
  houseRoot.add(rawHouse);

  // Real wooden staircase bridging Ground Floor (stairs_bottom: -1.9, 0.0, 4.0)
  // to Second Floor (stairs_top: -1.9, 2.85, 1.25) so Floor 2 Spawn Bedroom is 100% reachable.
  const stairGroup = new THREE.Group();
  stairGroup.name = "HouseStaircase";
  const treadMat = new THREE.MeshStandardMaterial({ color: 0x6b4b32, roughness: 0.85, metalness: 0.04 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x523824, roughness: 0.88, metalness: 0.04 });
  const stepCount = 14;
  const xCenter = -1.9;
  const zBottom = 4.0;
  const zTop = 1.25;
  const yTop = 2.85;
  const stairWidth = 1.18;
  const stepDepth = (zBottom - zTop) / stepCount;
  const stepRise = yTop / stepCount;
  for (let i = 0; i < stepCount; i += 1) {
    const tread = new THREE.Mesh(
      new THREE.BoxGeometry(stairWidth, stepRise, stepDepth + 0.04),
      treadMat
    );
    tread.name = "HouseFloor";
    tread.position.set(
      xCenter,
      (i + 0.5) * stepRise,
      zBottom - (i + 0.5) * stepDepth
    );
    stairGroup.add(tread);
  }
  const railLen = Math.hypot(zBottom - zTop, yTop);
  const railPitch = Math.atan2(yTop, zBottom - zTop);
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, railLen), railMat);
    rail.name = "HouseStairRail";
    rail.position.set(xCenter + side * (stairWidth * 0.5 + 0.02), yTop * 0.5 + 0.85, (zBottom + zTop) * 0.5);
    rail.rotation.x = railPitch;
    stairGroup.add(rail);
  }
  houseRoot.add(stairGroup);
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

  const semanticRegistry = assignSemanticTagsToHouse(houseRoot, allHouseMeshes);
  const nav = buildIndoorNavigation(houseRoot, allHouseMeshes);

  return {
    root: houseRoot,
    floorMeshes,
    allHouseMeshes,
    semanticRegistry,
    ...nav,
    dispose: () => disposeObject3D(houseRoot),
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
  return setupHouseFromRaw(rawHouse);
}

export function toSemanticTag(rawName = "") {
  return String(rawName)
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Assigns semantic tags (`mesh.userData.tag`, `aliases`, `semanticLabel`) to every
 * GrannyHouse.fbx mesh and attaches lightweight Spatial Memory anchor volumes for
 * individual furniture pieces inside combined FBX meshes (e.g. `kitchen_table`, `dining_table`).
 */
export function assignSemanticTagsToHouse(houseRoot, allHouseMeshes = []) {
  const taggedMeshes = [];

  for (const mesh of allHouseMeshes) {
    const rule = SEMANTIC_MESH_TAGS[mesh.name];
    const tag = rule ? rule.tag : toSemanticTag(mesh.name || "house_mesh");
    const aliases = rule?.aliases ? [...rule.aliases] : [];
    const label = rule?.label || mesh.name || tag;

    mesh.userData.tag = tag;
    mesh.userData.aliases = aliases;
    mesh.userData.semanticLabel = label;
    mesh.userData.rawMeshName = mesh.name;
    taggedMeshes.push({ meshName: mesh.name, tag, aliases, label });
  }

  let anchorGroup = houseRoot.getObjectByName("SemanticAnchors");
  if (!anchorGroup) {
    anchorGroup = new THREE.Group();
    anchorGroup.name = "SemanticAnchors";
    houseRoot.add(anchorGroup);
  }

  for (const [tag, region] of Object.entries(SEMANTIC_OBJECT_REGIONS)) {
    const min = region.min;
    const max = region.max;
    const sx = Math.max(0.05, max[0] - min[0]);
    const sy = Math.max(0.05, max[1] - min[1]);
    const sz = Math.max(0.05, max[2] - min[2]);
    const cx = (min[0] + max[0]) * 0.5;
    const cy = (min[1] + max[1]) * 0.5;
    const cz = (min[2] + max[2]) * 0.5;

    const anchorMesh = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    anchorMesh.name = `Anchor_${tag}`;
    anchorMesh.visible = false;
    anchorMesh.position.set(cx, cy, cz);
    anchorMesh.userData.tag = tag;
    anchorMesh.userData.aliases = region.aliases ? [...region.aliases] : [];
    anchorMesh.userData.semanticLabel = region.label || tag;
    anchorMesh.userData.isSemanticAnchor = true;
    anchorMesh.userData.parentMeshName = region.parentMesh || null;
    anchorMesh.userData.regionMin = [...min];
    anchorMesh.userData.regionMax = [...max];

    anchorGroup.add(anchorMesh);
    taggedMeshes.push({
      meshName: region.parentMesh || anchorMesh.name,
      tag,
      aliases: anchorMesh.userData.aliases,
      label: anchorMesh.userData.semanticLabel,
      isAnchor: true,
    });
  }

  houseRoot.updateMatrixWorld(true);
  return taggedMeshes;
}

/**
 * Finds the best Object3D in a Three.js scene matching a semantic tag, alias, or mesh name.
 * Prefers SemanticAnchors, Actor_* roots, and Prop_* roots so bounding boxes wrap the whole entity.
 */
export function findTaggedObject(scene, tagOrName) {
  if (!scene || !tagOrName) return null;
  const query = String(tagOrName).trim();
  if (!query) return null;
  const queryLower = query.toLowerCase();

  let bestMatch = null;
  let bestScore = -1;

  scene.traverse((node) => {
    const ud = node.userData || {};
    const tag = ud.tag ? String(ud.tag) : "";
    const aliases = Array.isArray(ud.aliases) ? ud.aliases.map(String) : [];
    const name = node.name ? String(node.name) : "";

    let matchTypeScore = 0;
    if (tag === query) matchTypeScore = 100;
    else if (tag.toLowerCase() === queryLower) matchTypeScore = 95;
    else if (aliases.includes(query) || aliases.some((a) => a.toLowerCase() === queryLower)) matchTypeScore = 85;
    else if (name === query) matchTypeScore = 75;
    else if (name.toLowerCase() === queryLower) matchTypeScore = 70;
    else if (toSemanticTag(name) === queryLower) matchTypeScore = 60;

    if (matchTypeScore === 0) return;

    // Prefer root groups (Actor_*, Prop_*) and SemanticAnchors over individual child sub-meshes
    let roleBonus = 0;
    if (ud.isSemanticAnchor) roleBonus += 25;
    if (name.startsWith("Actor_") || name.startsWith("Prop_")) roleBonus += 20;
    if (!node.isMesh && (ud.actorId || ud.propId)) roleBonus += 15;
    if (node.visible || ud.isSemanticAnchor) roleBonus += 5;

    const totalScore = matchTypeScore + roleBonus;
    if (totalScore > bestScore) {
      bestScore = totalScore;
      bestMatch = node;
    }
  });

  return bestMatch;
}

/**
 * Computes an accurate world-space THREE.Box3 for any tagged object, SemanticAnchor,
 * prop group, or SkinnedMesh character.
 */
export function getObjectBounds(obj, outBox = new THREE.Box3()) {
  outBox.makeEmpty();
  if (!obj) return outBox;

  obj.updateMatrixWorld(true);
  const ud = obj.userData || {};

  if (ud.isSemanticAnchor && Array.isArray(ud.regionMin) && Array.isArray(ud.regionMax)) {
    outBox.min.set(ud.regionMin[0], ud.regionMin[1], ud.regionMin[2]);
    outBox.max.set(ud.regionMax[0], ud.regionMax[1], ud.regionMax[2]);
    return outBox;
  }

  // SkinnedMesh rigs compute dynamic pose bounds via Box3.setFromObject in Three r170,
  // but if a character mesh hasn't updated its bone matrices yet or is empty, fall back
  // safely to a standing torso/body volume anchored at world position.
  outBox.setFromObject(obj);

  if (ud.actorId) {
    const wp = new THREE.Vector3();
    obj.getWorldPosition(wp);
    const size = new THREE.Vector3();
    outBox.getSize(size);
    if (outBox.isEmpty() || size.y < 0.4 || size.y > 4.0) {
      outBox.min.set(wp.x - 0.34, wp.y, wp.z - 0.34);
      outBox.max.set(wp.x + 0.34, wp.y + 1.65, wp.z + 0.34);
    }
  }

  return outBox;
}

/**
 * Resolves the most specific semantic tag + world bounds at a Raycaster hit point
 * (e.g. clicking the dining table inside combined mesh Furniture3 resolves to `dining_table`).
 */
export function resolveSemanticTagAtPoint(hitObject, hitPoint) {
  if (!hitObject) return null;

  const meshName = hitObject.name || "";
  if (hitPoint && meshName) {
    let bestRegion = null;
    let bestVolume = Infinity;

    for (const [tag, region] of Object.entries(SEMANTIC_OBJECT_REGIONS)) {
      if (region.parentMesh && region.parentMesh !== meshName) continue;
      const [minX, minY, minZ] = region.min;
      const [maxX, maxY, maxZ] = region.max;
      const pad = 0.22;
      if (
        hitPoint.x >= minX - pad && hitPoint.x <= maxX + pad &&
        hitPoint.y >= minY - pad && hitPoint.y <= maxY + pad &&
        hitPoint.z >= minZ - pad && hitPoint.z <= maxZ + pad
      ) {
        const vol = (maxX - minX) * (maxY - minY) * (maxZ - minZ);
        if (vol < bestVolume) {
          bestVolume = vol;
          bestRegion = { tag, region };
        }
      }
    }

    if (bestRegion) {
      const box = new THREE.Box3(
        new THREE.Vector3(...bestRegion.region.min),
        new THREE.Vector3(...bestRegion.region.max)
      );
      return {
        tag: bestRegion.tag,
        label: bestRegion.region.label || bestRegion.tag,
        meshName,
        isSubRegion: true,
        box,
      };
    }
  }

  let cursor = hitObject;
  while (cursor) {
    if (cursor.userData?.tag) {
      return {
        tag: cursor.userData.tag,
        label: cursor.userData.semanticLabel || cursor.userData.tag,
        meshName: meshName || cursor.name || "UnnamedMesh",
        isSubRegion: false,
        box: getObjectBounds(
          cursor.userData.actorId || cursor.userData.propId
            ? findTopTaggedAncestor(hitObject, cursor.userData.tag) || cursor
            : hitObject
        ),
      };
    }
    cursor = cursor.parent;
  }

  return {
    tag: toSemanticTag(meshName || "untagged_object"),
    label: meshName || "Untagged Object",
    meshName: meshName || "UnnamedMesh",
    isSubRegion: false,
    box: getObjectBounds(hitObject),
  };
}

function findTopTaggedAncestor(node, tag) {
  let top = node;
  let cursor = node;
  while (cursor) {
    if (cursor.userData?.tag === tag) {
      top = cursor;
    }
    cursor = cursor.parent;
  }
  return top;
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
  root.userData.tag = id;
  root.userData.actorId = id;
  root.userData.semanticLabel = template.spec?.name || id;

  const rigHolder = SkeletonUtils.clone(template.root);
  rigHolder.name = `${id}_RigHolder`;
  rigHolder.traverse((node) => {
    node.userData.tag = id;
    node.userData.actorId = id;
    node.userData.semanticLabel = template.spec?.name || id;
  });
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
  // The head aim must always be rebuilt from the *bind pose*: most clips do not
  // animate the head bone, so premultiplying a world delta every frame compounds
  // and the head visibly spins.
  const headRestQuat = headBone ? headBone.quaternion.clone() : null;
  const lastAimQuat = new THREE.Quaternion();
  let headAimApplied = false;
  const handBoneName =
    template.spec.rigType === "bip01" ? "Bip01_R_Hand" : "hand_R_001";
  const handBone = rigHolder.getObjectByName(handBoneName) || null;

  // Embedded character hand/head sub-meshes (Grandpa's Shotgun vs Cane, spare Glasses, Granny's Bat)
  const embeddedProps = {
    cane: [rigHolder.getObjectByName("Kapp")].filter(Boolean),
    shotgun: ["ShotgunPipaGP", "ShotgunGP_1"]
      .map((name) => rigHolder.getObjectByName(name))
      .filter(Boolean),
    bat: [rigHolder.getObjectByName("BatBloody")].filter(Boolean),
    spareGlasses: rigHolder.getObjectByName("Grandpa_Glasses_1") || null,
    redEyes: rigHolder.getObjectByName("GrandpaRedEyes2") || null,
  };

  /**
   * Strictly toggles Grandpa's built-in Cane ("cane") vs Shotgun ("shotgun") vs "none".
   * Guarantees Shotgun and Cane can NEVER both be visible at the same time.
   */
  function toggleBuiltInProp(mode = "default") {
    if (embeddedProps.spareGlasses) embeddedProps.spareGlasses.visible = false;
    if (embeddedProps.redEyes) embeddedProps.redEyes.visible = false;

    const wantShotgun = mode === "shotgun";
    const wantNone = mode === "none";
    const showCane = !wantNone && !wantShotgun;
    const showShotgun = !wantNone && wantShotgun;

    // CRITICAL FIX: Aggressively hide all meshes attached to the hand bone first
    if (handBone) {
      handBone.children.forEach(c => {
        if (c.isMesh || c.isSkinnedMesh) c.visible = false;
      });
    }

    for (const m of embeddedProps.shotgun) m.visible = showShotgun;
    for (const m of embeddedProps.cane) m.visible = showCane;
    
    if (embeddedProps.bat.length > 0) {
      // Kid-safe default: hide BatBloody unless an episode explicitly passes prop: "bat".
      const showBat = mode === "bat";
      for (const m of embeddedProps.bat) m.visible = showBat;
    }
  }

  // Default: Grandpa holds Cane ONLY (Shotgun.visible = false, Cane.visible = true)
  toggleBuiltInProp("cane");

  // Floating 2D Comic Thought Bubble Sprite attached above the character's head
  const bubbleMat = new THREE.SpriteMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const bubbleSprite = new THREE.Sprite(bubbleMat);
  bubbleSprite.name = `${id}_ThoughtBubble`;
  bubbleSprite.position.set(0, template.spec.targetHeight + 0.25, 0);
  bubbleSprite.scale.set(0, 0, 1);
  bubbleSprite.renderOrder = 200;
  bubbleSprite.visible = false;
  root.add(bubbleSprite);

  let bubbleTimer = 0;
  let bubbleDuration = 0;
  let bubblePopPhase = 0;

  let heldPropGroup = null;
  let lookAtPlayerEnabled = false;
  let faceTargetGoal = null;
  let faceTurnSpeed = 12;

  // Head-tracking ("look at me") state: the head aims at the lens independently
  // of the animation clip, clamped so the neck never breaks.
  let headTrack = { enabled: false, weight: 1, maxYaw: 0.95, maxPitch: 0.42 };
  let headTrackYaw = 0;
  let headTrackPitch = 0;

  let currentActionEntry = null;
  let currentAnimName = null;
  let speaking = false;
  let speakPhase = 0;
  let jumpOffsetY = 0;
  const lookTargetVec = new THREE.Vector3();
  const tmpHeadPos = new THREE.Vector3();
  const tmpHeadQuat = new THREE.Quaternion();
  const tmpHeadQuatB = new THREE.Quaternion();
  const tmpHeadQuatC = new THREE.Quaternion();
  const tmpParentQuat = new THREE.Quaternion();
  const tmpLocalQuat = new THREE.Quaternion();
  const WORLD_UP = new THREE.Vector3(0, 1, 0);
  const WORLD_RIGHT = new THREE.Vector3(1, 0, 0);
  const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);

  // Layered procedural head gesture (nod / shake / tilt). Runs on top of the
  // clip and on top of the head aim, so a character can agree while laughing.
  let headGesture = null; // { name, spec, duration, elapsed }
  const tmpHandWorldScale = new THREE.Vector3();
  const tmpBubbleWorld = new THREE.Vector3();
  const tmpBubbleNdc = new THREE.Vector3();
  const tmpCamRight = new THREE.Vector3();

  function playAnimation(
    name,
    fadeDuration = CONFIG.defaultFadeDuration,
    speed = null,
    loopOverride = null
  ) {
    // Gesture "animations" (nod / shake / tilt) are procedural: they layer onto
    // whatever clip is playing instead of replacing it, so no FBX is needed.
    if (isHeadGesture(name)) {
      playHeadGesture(name, typeof fadeDuration === "number" && fadeDuration > 0.2 ? fadeDuration : 0.8);
      return null;
    }

    const entry = actions[name] || actions.idle || Object.values(actions)[0];
    if (!entry) return null;

    const nextAction = entry.action;
    const effectiveSpeed = speed ?? entry.meta.defaultSpeed ?? 1.0;
    const shouldLoop =
      loopOverride !== null ? loopOverride : entry.meta.loop !== false;

    nextAction.enabled = true;
    nextAction.paused = false;
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
      } else if (!nextAction.isRunning()) {
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
      currentActionEntry.action.crossFadeTo(nextAction, fadeDuration, false);
    }

    currentActionEntry = entry;
    currentAnimName = name;
    return nextAction;
  }

  function setAnimSpeed(speed) {
    if (currentActionEntry?.action) {
      currentActionEntry.action.timeScale = speed;
    }
  }

  function lookAt(targetPos) {
    if (!targetPos) return;
    const dx = targetPos.x - root.position.x;
    const dz = targetPos.z - root.position.z;
    if (dx * dx + dz * dz > 1e-6) {
      root.rotation.set(0, Math.atan2(dx, dz), 0);
    }
  }

  function faceTarget(targetPos, speed = 8) {
    if (!targetPos) {
      faceTargetGoal = null;
      return;
    }
    if (speed <= 0 || speed >= 60) {
      faceTargetGoal = null;
      lookAt(targetPos);
    } else {
      faceTargetGoal = new THREE.Vector3(targetPos.x, root.position.y, targetPos.z);
      faceTurnSpeed = speed;
    }
  }

  function lookAtPlayer(enabled) {
    lookAtPlayerEnabled = Boolean(enabled);
    if (lookAtPlayerEnabled) {
      faceTargetGoal = null;
    }
  }

  /**
   * Keeps the head pointed at the lens while any animation plays, so a
   * taunt/laugh never plays to the back of the room.
   */
  function setHeadTrack(enabled, opts = {}) {
    headTrack = {
      ...headTrack,
      ...opts,
      enabled: Boolean(enabled),
    };
    if (!headTrack.enabled) {
      clearHeadAim();
    }
  }

  /** Drops any head rotation we applied, leaving the pose exactly as the clip left it. */
  function clearHeadAim() {
    headTrackYaw = 0;
    headTrackPitch = 0;
    if (headAimApplied && headBone && headRestQuat) {
      headBone.quaternion.copy(headRestQuat);
    }
    headAimApplied = false;
  }

  /**
   * Applies the clamped world-space head turn and any layered gesture as one
   * quaternion on top of the clip pose. Composing both here (instead of
   * premultiplying twice) means neither layer can compound across frames.
   */
  function applyHeadPose(targetPos, dt, gesture = null) {
    if (!headBone) return;
    const step = Math.max(0, Math.min(dt || 0, 0.1));

    // If nobody touched the head since we aimed it, this clip does not animate
    // that bone — rebuild from the bind pose so the delta cannot pile up.
    if (headAimApplied && headBone.quaternion.angleTo(lastAimQuat) < 1e-5) {
      headBone.quaternion.copy(headRestQuat);
      headAimApplied = false;
    }

    let aimYaw = 0;
    let aimPitch = 0;
    if (targetPos && headTrack.enabled) {
      const headPos = headBone.getWorldPosition(tmpHeadPos);
      const camDist = Math.hypot(
        num(targetPos.x) - headPos.x,
        num(targetPos.y) - headPos.y,
        num(targetPos.z) - headPos.z
      );

      // A lens this close to the skull turns tiny movements into huge swings —
      // ease the aim out instead of chasing it.
      const weight =
        Math.max(0, Math.min(1, headTrack.weight ?? 1)) * headAimWeight(camDist);

      if (weight > 1e-3) {
        const aim = headAimAngles(headPos, targetPos, root.rotation.y, {
          maxYaw: headTrack.maxYaw,
          maxPitch: headTrack.maxPitch,
        });
        aimYaw = aim.yaw * weight;
        aimPitch = aim.pitch * weight;
      }

      // Smooth toward the goal but never faster than 4 rad/s, so no target flip
      // (or a lens pressed against the face) can whip the neck around.
      headTrackYaw = aimStep(headTrackYaw, aimYaw, step);
      headTrackPitch = aimStep(headTrackPitch, aimPitch, step);
      aimYaw = headTrackYaw;
      aimPitch = headTrackPitch;
    }

    const gestureYaw = gesture ? gesture.yaw || 0 : 0;
    const gesturePitch = gesture ? gesture.pitch || 0 : 0;
    const gestureRoll = gesture ? gesture.roll || 0 : 0;

    const totalYaw = aimYaw + gestureYaw;
    const totalPitch = aimPitch + gesturePitch;

    if (
      Math.abs(totalYaw) < 1e-4 &&
      Math.abs(totalPitch) < 1e-4 &&
      Math.abs(gestureRoll) < 1e-4
    ) {
      if (headAimApplied) {
        headBone.quaternion.copy(headRestQuat);
        headAimApplied = false;
      }
      return;
    }

    tmpHeadQuat
      .setFromAxisAngle(WORLD_UP, totalYaw)
      .multiply(tmpHeadQuatB.setFromAxisAngle(WORLD_RIGHT, totalPitch));
    if (Math.abs(gestureRoll) > 1e-5) {
      tmpHeadQuat.multiply(tmpHeadQuatC.setFromAxisAngle(WORLD_FORWARD, gestureRoll));
    }
    headBone.parent.getWorldQuaternion(tmpParentQuat);
    tmpLocalQuat
      .copy(tmpParentQuat)
      .invert()
      .multiply(tmpHeadQuat)
      .multiply(tmpParentQuat);
    headBone.quaternion.premultiply(tmpLocalQuat);
    lastAimQuat.copy(headBone.quaternion);
    headAimApplied = true;
  }

  /**
   * Starts a layered head gesture (nod / shake / tilt). The base clip keeps
   * playing underneath; passing null stops whatever is running.
   */
  function playHeadGesture(name, duration = 0.8, overrides = {}) {
    if (name == null) {
      headGesture = null;
      return null;
    }
    const spec = headGestureSpec(name, overrides);
    if (!spec) {
      console.warn(`[character:${id}] unknown head gesture "${name}"`);
      return null;
    }
    headGesture = {
      name,
      spec,
      duration: Math.max(0.08, Number.isFinite(duration) ? duration : 0.8),
      elapsed: 0,
    };
    return spec;
  }

  function stopHeadGesture() {
    headGesture = null;
  }

  function showBubble(iconName, duration = 2.0) {
    if (!iconName) {
      bubbleSprite.visible = false;
      bubbleTimer = 0;
      return;
    }
    const tex = sharedBubbleCache.getTexture(iconName);
    if (!tex) return;
    bubbleMat.map = tex;
    bubbleMat.opacity = 1;
    bubbleMat.needsUpdate = true;
    bubbleSprite.visible = true;
    bubbleDuration = Math.max(0.3, duration);
    bubbleTimer = bubbleDuration;
    bubblePopPhase = 0;
  }

  function setProp(propName = null) {
    if (heldPropGroup) {
      if (heldPropGroup.parent) heldPropGroup.parent.remove(heldPropGroup);
      disposeObject3D(heldPropGroup);
      heldPropGroup = null;
    }

    if (
      propName === "cane" ||
      propName === "shotgun" ||
      propName === "bat" ||
      propName === "none"
    ) {
      toggleBuiltInProp(propName);
      return;
    }

    if (!propName) {
      toggleBuiltInProp("cane");
      return;
    }

    // Hide built-in hand weapons while holding an external comedy prop so nothing clips
    toggleBuiltInProp("none");

    heldPropGroup = createPropMesh(propName);
    const parent = handBone || rigHolder;
    parent.updateMatrixWorld(true);
    parent.getWorldScale(tmpHandWorldScale);
    const invX = 1 / Math.max(0.0001, tmpHandWorldScale.x);
    const invY = 1 / Math.max(0.0001, tmpHandWorldScale.y);
    const invZ = 1 / Math.max(0.0001, tmpHandWorldScale.z);
    heldPropGroup.scale.set(invX * 0.9, invY * 0.9, invZ * 0.9);
    if (!handBone) {
      heldPropGroup.position.set(0.28, template.spec.targetHeight * 0.55, 0.32);
    }
    parent.add(heldPropGroup);
  }

  /**
   * Applies an action to whatever comedy prop is currently in this actor's hand.
   * Right now: "bite" (one cookie chunk per call) and "hide" (drop it).
   */
  function actOnHeldProp(action) {
    if (!heldPropGroup) return false;
    if (action === "bite") return biteCookie(heldPropGroup);
    if (action === "hide" || action === "drop") {
      if (heldPropGroup.parent) heldPropGroup.parent.remove(heldPropGroup);
      disposeObject3D(heldPropGroup);
      heldPropGroup = null;
      return true;
    }
    return false;
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

  function update(dt, playerCameraPos = null, camera = null) {
    mixer.update(dt);

    // Smooth yaw turn toward target or continuously look straight at player camera
    const turnTarget =
      lookAtPlayerEnabled && playerCameraPos ? playerCameraPos : faceTargetGoal;
    if (turnTarget) {
      const dx = turnTarget.x - root.position.x;
      const dz = turnTarget.z - root.position.z;
      if (dx * dx + dz * dz > 1e-4) {
        const targetYaw = Math.atan2(dx, dz);
        let diff = targetYaw - root.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const rate = lookAtPlayerEnabled ? 14 : faceTurnSpeed;
        root.rotation.y += diff * Math.min(1, dt * rate);
      }
    }

    // Advance any layered gesture, then apply aim + gesture as one head pose.
    if (headGesture) {
      headGesture.elapsed += Math.max(0, dt || 0);
      if (headGesture.elapsed >= headGesture.duration) {
        headGesture = null;
      }
    }
    const gestureSample = headGesture
      ? sampleHeadGesture(headGesture.name, headGesture.elapsed, headGesture.duration, headGesture.spec)
      : null;

    // Head-only aim on top of whatever the clip is doing (taunts, laughs, idle).
    if ((headTrack.enabled && playerCameraPos) || gestureSample) {
      applyHeadPose(playerCameraPos, dt, gestureSample);
    }

    // Subtle cartoon squash/bounce + head accent while speaking
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

    // Subtle procedural breathing & weight-shift life when standing still so actors never look like frozen statues.
    const isIdle = !currentAnimName || currentAnimName === "idle";
    const idleTime = (root.userData._idlePhase = (root.userData._idlePhase || 0) + (dt || 0));
    const idleBreathY = isIdle ? Math.sin(idleTime * 2.2) * 0.006 : 0;
    const idleSwayZ = isIdle ? Math.sin(idleTime * 1.1) * 0.012 : 0;

    rigHolder.position.y = jumpOffsetY + clipJumpLift + speakBounceY + idleBreathY;
    rigHolder.rotation.x = speakNod;
    rigHolder.rotation.z = idleSwayZ;

    // Pop-in bounce + float + viewport top-edge clamp on 2D Comic Thought Bubble
    if (bubbleTimer > 0) {
      bubbleTimer = Math.max(0, bubbleTimer - dt);
      bubblePopPhase += dt;
      let popScale = 1;
      if (bubblePopPhase < 0.24) {
        const t = bubblePopPhase / 0.24;
        // Elastic overshoot 0 -> 1.18 -> 1.0
        popScale = t < 0.65 ? (t / 0.65) * 1.18 : 1.18 - ((t - 0.65) / 0.35) * 0.18;
      } else if (bubbleTimer < 0.2) {
        popScale = bubbleTimer / 0.2;
      }

      const defaultLocalY =
        template.spec.targetHeight + 0.24 + clipJumpLift + Math.sin(bubblePopPhase * 4.2) * 0.035;
      bubbleSprite.position.set(0, defaultLocalY, 0);

      if (camera && typeof camera.updateMatrixWorld === "function") {
        camera.updateMatrixWorld(true);
        root.updateMatrixWorld(true);
        tmpBubbleWorld.set(0, defaultLocalY, 0).applyMatrix4(root.matrixWorld);
        tmpBubbleNdc.copy(tmpBubbleWorld).project(camera);
        if (tmpBubbleNdc.z > -1 && tmpBubbleNdc.z < 1 && tmpBubbleNdc.y > 0.66) {
          const overflow = tmpBubbleNdc.y - 0.66;
          tmpBubbleNdc.y = 0.66;
          tmpBubbleNdc.unproject(camera);
          // Shift slightly to camera-right so lowered bubble sits beside the head instead of over the face
          tmpCamRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
          tmpBubbleNdc.addScaledVector(tmpCamRight, Math.min(0.42, overflow * 0.9 + 0.18));
          root.worldToLocal(tmpBubbleNdc);
          bubbleSprite.position.copy(tmpBubbleNdc);
        }
      }

      bubbleSprite.scale.set(0.56 * popScale, 0.42 * popScale, 1);
      if (bubbleTimer === 0) {
        bubbleSprite.visible = false;
      }
    }
  }

  function seatOnSurface(surfaceY = 0) {
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    if (!box.isEmpty() && Number.isFinite(box.min.y)) {
      const dip = surfaceY - box.min.y;
      if (dip > 0.01 && dip < 1.8) {
        root.position.y += dip;
      }
    }
  }

  function resetPose() {
    speaking = false;
    speakPhase = 0;
    jumpOffsetY = 0;
    lookAtPlayerEnabled = false;
    faceTargetGoal = null;
    setHeadTrack(false);
    bubbleTimer = 0;
    bubbleSprite.visible = false;
    setProp(null);
    rigHolder.position.set(0, 0, 0);
    rigHolder.rotation.set(0, 0, 0);
    mixer.stopAllAction();
    currentActionEntry = null;
    currentAnimName = null;
  }

  function dispose() {
    setProp(null);
    bubbleMat.dispose();
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
    get currentAction() {
      return currentActionEntry?.action || null;
    },
    get isSpeaking() {
      return speaking;
    },
    playAnim: playAnimation,
    playAnimation,
    playHeadGesture,
    stopHeadGesture,
    actOnHeldProp,
    get headGesture() {
      return headGesture ? headGesture.name : null;
    },
    setAnimSpeed,
    faceTarget,
    lookAt,
    lookAtPlayer,
    setHeadTrack,
    clearHeadAim,
    get headTracking() {
      return { ...headTrack };
    },
    showBubble,
    hideBubble: () => showBubble(null),
    setProp,
    toggleBuiltInProp,
    setSpeaking,
    setJumpOffset,
    getHeadWorldPosition,
    seatOnSurface,
    resetPose,
    update,
    dispose,
  };
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
