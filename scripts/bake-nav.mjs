#!/usr/bin/env node
/**
 * Bake the house's real walkable surface into `src/data/houseNav.json`.
 *
 * The show must not walk through walls or float over the stairs, so the nav
 * data cannot be hand-typed floats any more: it is measured off the actual
 * `GrannyHouse.fbx` geometry.
 *
 *   node scripts/bake-nav.mjs            # writes src/data/houseNav.json
 *   node scripts/bake-nav.mjs --map      # + ASCII maps for eyeballing rooms
 *
 * Requires `three` in Node (dev-only — the browser build stays zero-dependency):
 *
 *   npm i -D three@0.170.0
 *
 * What gets measured, per 0.2 m column:
 *   - every `HouseFloor` surface hit (ground floor, stair treads, upper floor)
 *   - headroom above it (ceiling clearance >= MIN_CLEARANCE => standable)
 *   - a 0.30 m body radius free of walls/furniture (=> not inside a wall)
 * Then neighbouring standable cells are linked only when the step between them
 * is walkable (<= MAX_STEP) and the space between them is clear of geometry.
 */
import fs from "node:fs";
import path from "node:path";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const FBX = path.join(ROOT, "Assets/granny-1-house/source/GrannyHouse.fbx");
const OUT = path.join(ROOT, "src/data/houseNav.js");

const CELL = 0.2;          // grid step (m)
const BODY_RADIUS = 0.2;   // how much clearance a body needs
const MIN_CLEARANCE = 1.72; // head room for a standable surface
const MAX_STEP = 0.34;     // biggest height change you can walk up (stair treads)
const MIN_Y = -0.4;
const MAX_Y = 4.4;

// ---------------------------------------------------------------- geometry ---
THREE.TextureLoader.prototype.load = function load() { return new THREE.Texture(); };
const buf = fs.readFileSync(FBX);
const raw = new FBXLoader().parse(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  ""
);
const root = new THREE.Group();
raw.scale.setScalar(0.42);
raw.position.y = -13.32 * 0.42;
root.add(raw);
root.updateMatrixWorld(true);
const meshes = [];
root.traverse((n) => { if (n.isMesh) meshes.push(n); });
const floorMeshes = meshes.filter((m) => m.name === "HouseFloor");
const blockerMeshes = meshes.filter((m) => m.name !== "HouseFloor");

const ray = new THREE.Raycaster();
const DOWN = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

function hitsDown(x, z, fromY, far, list) {
  ray.set(new THREE.Vector3(x, fromY, z), DOWN);
  ray.far = far;
  return ray.intersectObjects(list, false).map((h) => h.point.y);
}
function clearBetween(a, b) {
  // Is the straight segment a->b free of walls and furniture?
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-4) return true;
  dir.normalize();
  ray.set(a.clone(), dir);
  ray.far = len;
  return ray.intersectObjects(blockerMeshes, false).length === 0;
}

function halfway(a, b) {
  return new THREE.Vector3((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

function columnSurfaces(x, z) {
  const ys = hitsDown(x, z, MAX_Y + 1.2, MAX_Y + 1.4, floorMeshes)
    .filter((y) => y > MIN_Y && y < MAX_Y)
    .sort((a, b) => b - a);
  const out = [];
  for (const y of ys) {
    if (out.some((o) => Math.abs(o.y - y) < 0.16)) continue; // duplicate surface
    // clear space above this surface?
    const above = hitsDown(x, z, y + 0.06, MIN_CLEARANCE + 0.1, blockerMeshes.concat(floorMeshes));
    const nearest = above.filter((h) => h > y + 0.06).sort((a, b) => a - b)[0];
    const clearance = nearest === undefined ? MIN_CLEARANCE + 0.1 : nearest - y - 0.06;
    if (clearance < MIN_CLEARANCE) continue;
    // is the body standing in a wall / inside furniture?
    const body = new THREE.Vector3(x, y + 0.95, z);
    let blocked = false;
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2;
      const dst = new THREE.Vector3(
        x + Math.cos(a) * BODY_RADIUS,
        y + 0.95,
        z + Math.sin(a) * BODY_RADIUS
      );
      if (!clearBetween(body, dst)) { blocked = true; break; }
    }
    if (blocked) continue;
    out.push({ y });
  }
  return out;
}

// ------------------------------------------------------------------- grid ----
const box = new THREE.Box3().setFromObject(root);
const x0 = Math.floor(box.min.x / CELL) * CELL;
const z0 = Math.floor(box.min.z / CELL) * CELL;
const nx = Math.ceil((box.max.x - x0) / CELL);
const nz = Math.ceil((box.max.z - z0) / CELL);

const cells = []; // flat list; nodes[] indexes into it
const nodeAt = new Map(); // "ix,iz,layerIndex" -> node id
const nodes = [];

for (let ix = 0; ix < nx; ix += 1) {
  for (let iz = 0; iz < nz; iz += 1) {
    const x = x0 + (ix + 0.5) * CELL;
    const z = z0 + (iz + 0.5) * CELL;
    const surfaces = columnSurfaces(x, z);
    surfaces.forEach((s, layer) => {
      const id = nodes.length;
      nodes.push({ ix, iz, layer, x: +x.toFixed(3), y: +s.y.toFixed(3), z: +z.toFixed(3) });
      nodeAt.set(`${ix},${iz},${layer}`, id);
    });
  }
}

// ------------------------------------------------------------------ edges ----
// Link 4-neighbours when the step is walkable and the space is clear. Allowed
// height change per horizontal metre is capped, which is what makes the stairs
// a ramp instead of a ladder and stops a route from "walking on air".
const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
];
const edges = [];
const adjacency = nodes.map(() => []);
for (let i = 0; i < nodes.length; i += 1) {
  const a = nodes[i];
  for (const [dx, dz] of NEIGHBOURS) {
    const jix = a.ix + dx;
    const jiz = a.iz + dz;
    if (jix < 0 || jiz < 0 || jix >= nx || jiz >= nz) continue;
    // Any surface in the neighbour column that is a walkable step away —
    // stair treads sit on their own layer, so matching by layer index would
    // disconnect the staircase from both floors.
    for (let j = 0; j < nodes.length; j += 1) {
      const b = nodes[j];
      if (b.ix !== jix || b.iz !== jiz) continue;
      if (j === i || j < i) continue;
      const dy = Math.abs(b.y - a.y);
      if (dy > MAX_STEP) continue;
    const mid = new THREE.Vector3(
      (a.x + b.x) / 2,
      Math.min(a.y, b.y) + 0.85,
      (a.z + b.z) / 2
    );
    const prev = new THREE.Vector3(
      (a.x + b.x) / 2,
      Math.min(a.y, b.y) + 1.55,
      (a.z + b.z) / 2
    );
    if (!clearBetween(prev, mid)) continue; // doorway blocked at head height
    // A body-height check across the whole joining segment: if the space
    // between the two cells is not clear, it is a wall, not a step.
    const half = new THREE.Vector3(
      (a.x + b.x) / 2,
      Math.min(a.y, b.y) + 0.55,
      (a.z + b.z) / 2
    );
    if (!clearBetween(prev, halfway(prev, half))) continue;
    if (!clearBetween(halfway(prev, half), mid)) continue;
    edges.push([i, j]);
    adjacency[i].push(j);
    adjacency[j].push(i);
    }
  }
}

// ------------------------------------------------------------- components ----
const comp = new Array(nodes.length).fill(-1);
let compCount = 0;
for (let i = 0; i < nodes.length; i += 1) {
  if (comp[i] >= 0) continue;
  const stack = [i];
  comp[i] = compCount;
  while (stack.length) {
    const n = stack.pop();
    for (const m of adjacency[n]) if (comp[m] < 0) { comp[m] = compCount; stack.push(m); }
  }
  compCount += 1;
}
const compSize = new Array(compCount).fill(0);
for (const c of comp) if (c >= 0) compSize[c] += 1;

// stairs = a node whose neighbours differ in height by more than 4 cm
const slope = nodes.map((n, i) =>
  adjacency[i].some((m) => Math.abs(nodes[m].y - n.y) > 0.04) ? 1 : 0
);

const csize = nodes.map((_, i) => compSize[comp[i]]);

// Tag the map: 0 = open floor, 1 = stairs/ramp, 2 = doorway (a passage only
// ~2 cells wide, i.e. walls on both sides), 3 = narrow strip along a wall.
const levelOf = (n) => (n.y >= 1.4 ? 1 : 0);
const cellSet = new Set(nodes.map((n) => `${n.ix},${n.iz},${levelOf(n)}`));
const freeRun = (n, dx, dz) => {
  const lvl = levelOf(n);
  let count = 0;
  for (let k = 1; k <= 3; k += 1) {
    if (cellSet.has(`${n.ix + dx * k},${n.iz + dz * k},${lvl}`)) count += 1;
    else break;
  }
  return count;
};
const tag = nodes.map((n, i) => {
  if (slope[i]) return 1;
  const spanX = freeRun(n, 1, 0) + freeRun(n, -1, 0);
  const spanZ = freeRun(n, 0, 1) + freeRun(n, 0, -1);
  if (Math.min(spanX, spanZ) <= 2) return 2;
  if (Math.min(spanX, spanZ) <= 3) return 3;
  return 0;
});

const data = {
  version: 2,
  source: "Assets/granny-1-house/source/GrannyHouse.fbx",
  scale: 0.42,
  cell: CELL,
  bounds: { x0: +x0.toFixed(3), z0: +z0.toFixed(3), nx, nz },
  // compact node records:
  // ix, iz, x, y, z, component, componentSize, stairs, tag
  // tag: 0 = floor, 1 = stairs, 2 = doorway
  nodes: nodes.map((n, i) => [
    n.ix,
    n.iz,
    +n.x.toFixed(2),
    +n.y.toFixed(2),
    +n.z.toFixed(2),
    comp[i],
    csize[i],
    slope[i],
    tag[i],
  ]),
  edges,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  `// BAKED — do not edit by hand. Regenerate with: node scripts/bake-nav.mjs\n// Walkable surface measured from ${data.source} (scale ${data.scale}).\nexport const HOUSE_NAV = ${JSON.stringify(data)};\n`
);
const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
console.log(
  `baked ${nodes.length} walkable cells, ${edges.length} links, ${compCount} components -> ${path.relative(ROOT, OUT)} (${kb} kB)`
);
const big = compSize
  .map((s, i) => ({ i, s }))
  .filter((c) => c.s >= 40)
  .sort((a, b) => b.s - a.s)
  .slice(0, 8);
console.log(
  "largest components:",
  big.map((c) => {
    const ns = nodes.filter((_, i) => comp[i] === c.i);
    const ys = ns.map((n) => n.y);
    return `#${c.i} n=${c.s} y=${Math.min(...ys).toFixed(2)}..${Math.max(...ys).toFixed(2)}`;
  }).join("  ")
);

// ---------------------------------------------------------------- ASCII map ---
if (process.argv.includes("--map")) {
  const render = (levelFn, label) => {
    console.log(`\n--- ${label} --- (+x right, +z down) ---`);
    for (let iz = 0; iz < nz; iz += 1) {
      let row = "";
      for (let ix = 0; ix < nx; ix += 1) {
        const ids = [];
        nodes.forEach((n, i) => { if (n.ix === ix && n.iz === iz) ids.push(i); });
        const pick = ids.find((i) => levelFn(nodes[i]));
        if (pick === undefined) { row += " "; continue; }
        const n = nodes[pick];
        if (csize[pick] < 12) row += ".";
        else if (slope[pick]) row += "/";
        else row += String.fromCharCode(97 + (comp[pick] % 26));
      }
      console.log(`${(z0 + (iz + 0.5) * CELL).toFixed(1).padStart(5)} ${row}`);
    }
    let axis = "      ";
    for (let ix = 0; ix < nx; ix += 5) axis += (x0 + (ix + 0.5) * CELL).toFixed(0).padEnd(3);
    console.log(axis);
  };
  render((n) => n.y < 1.4, "ground floor");
  render((n) => n.y >= 1.4 && n.y < 2.6, "stairs");
  render((n) => n.y >= 2.6, "upper floor");
}
