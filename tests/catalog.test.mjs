import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildCatalog,
  listAnimations,
  PROP_TYPES,
  BEAT_TYPES,
  isKnownAnimation,
} from "../src/catalog.js";
import { HEAD_GESTURE_NAMES } from "../src/headGestures.js";
import { EPISODE_PRESETS } from "../src/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

// Presets come in two shapes: a flat `beats` list, or scenes joined by `skits`.
const allBeats = (ep) => ep.beats ?? (ep.skits ?? []).flatMap((s) => s.beats ?? []);

test("every animation that claims a file actually has one on disk", () => {
  const missing = listAnimations().filter((a) => a.kind === "fbx" && !a.fileOnDisk);
  assert.deepEqual(missing, [], "no animation may point at a missing FBX");
});

test("the templates the user uploaded are registered", () => {
  const keys = listAnimations().map((a) => a.key);
  for (const key of ["angry", "talk", "kick", "mma_kick", "trip", "chicken_dance", "crawling", "hip_hop_dance", "sitting_laughing"]) {
    assert.ok(keys.includes(key), `${key} is registered`);
  }
});

test("procedural animations point at real gestures", () => {
  for (const anim of listAnimations().filter((a) => a.kind === "procedural")) {
    assert.ok(HEAD_GESTURE_NAMES.includes(anim.gesture), `${anim.key} → ${anim.gesture}`);
  }
});

test("nodding and shaking are usable as animations", () => {
  for (const name of ["nod", "nod_yes", "shake", "shake_no"]) {
    assert.ok(isKnownAnimation(name), `${name} can be written in an anim field`);
  }
});

test("the prop list matches what createPropMesh can build", () => {
  const src = read("src/comedyProps.js");
  const start = src.indexOf("export function createPropMesh");
  const body = src.slice(start, src.indexOf("\n/**", start));
  const built = new Set([...body.matchAll(/^ {4}case "([a-z_]+)"/gm)].map((m) => m[1]));
  // A `default:` case is allowed to exist, but it must not hide an undocumented prop.
  assert.deepEqual(
    [...built].sort(),
    [...PROP_TYPES].sort(),
    "PROP_TYPES in src/catalog.js must equal the cases in createPropMesh()"
  );
});

test("the cookie is a real prop, not just a bubble icon", () => {
  assert.ok(PROP_TYPES.includes("cookie"), "a cookie prop exists");
  const src = read("src/comedyProps.js");
  assert.match(src, /CookieSector_/, "the cookie is built from biteable sectors");
  assert.match(src, /export function biteCookie/, "bites are a shared operation");
});

test("the beat list matches the runner", () => {
  const src = read("src/episodeRunner.js");
  const handled = new Set([...src.matchAll(/type === "([a-z_]+)"/g)].map((m) => m[1]));
  for (const type of handled) {
    assert.ok(BEAT_TYPES.includes(type), `beat type "${type}" is documented in src/catalog.js`);
  }
});

test("the catalogue describes itself", () => {
  const cat = buildCatalog();
  assert.ok(cat.counts.animations >= 20);
  assert.ok(cat.counts.proceduralGestures >= 4);
  assert.ok(cat.counts.props >= 10);
  assert.ok(cat.gestures.every((g) => g.label.length > 3));
  assert.ok(cat.presets.every((p) => p.beats > 0), "no empty presets");
  for (const preset of cat.presets) {
    assert.ok(allBeats(EPISODE_PRESETS[preset.key]).length > 0, `${preset.key} has beats`);
  }
});

test("the reference cookie heist actually shows a cookie being eaten", () => {
  const ep = EPISODE_PRESETS.cookie_heist_15s;
  assert.ok(ep, "the preset exists");
  const beats = allBeats(ep);
  const holds = beats.filter((b) => b.type === "char_prop" && b.prop === "cookie");
  assert.ok(holds.length > 0, "somebody holds a cookie");
  const bites = beats.filter((b) => b.type === "char_prop_action" && b.action === "bite");
  assert.ok(bites.length >= 2, "the cookie visibly loses chunks");
  assert.ok(bites[0].at > holds[0].at, "the bite happens after the grab");
});

test("the reference episode demonstrates the head gestures", () => {
  const ep = EPISODE_PRESETS.cookie_heist_15s;
  const gestures = allBeats(ep).filter((b) => b.type === "char_gesture").map((b) => b.gesture);
  assert.ok(gestures.includes("nod"), "somebody nods");
  assert.ok(gestures.includes("shake_no"), "somebody shakes their head");
});
