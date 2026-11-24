/**
 * The capability catalogue.
 *
 * One import answers "what can I write in an episode?" — every animation, every
 * procedural gesture, every prop, every beat type and every preset, with the
 * one-line explanation an agent needs. `scripts/catalogue.mjs` prints it;
 * `tests/catalog.test.mjs` checks it against the source so it cannot drift.
 *
 * Pure data: no three.js, no DOM, so it also runs in CI and in Node scripts.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASSET_MANIFEST, EPISODE_PRESETS } from "./config.js";
import { HEAD_GESTURES, isHeadGesture } from "./headGestures.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Props `createPropMesh()` can build. Kept in sync by tests/catalog.test.mjs. */
export const PROP_TYPES = [
  "golden_key",
  "padlock",
  "red_button",
  "emoji_ball",
  "toy_blaster",
  "treasure_chest",
  "delivery_box",
  "rising_lava",
  "cookie",
  "cookie_jar",
  "car",
];

/** Beat types `EpisodeRunner._applyBeat()` understands. Also test-guarded. */
export const BEAT_TYPES = [
  "anim",
  "char_anim",
  "char_bubble",
  "char_cut",
  "char_visibility",
  "char_face",
  "face",
  "char_gesture",
  "char_move",
  "move",
  "char_prop",
  "char_prop_action",
  "cut",
  "fade",
  "player_crouch",
  "player_gesture",
  "player_hold",
  "player_look",
  "player_walk",
  "prop_action",
  "bgm",
  "stop_bgm",
  "sfx",
];

const BEAT_NOTES = {
  anim: "play an animation on an actor (alias of char_anim)",
  char_anim: "play an animation on an actor; waits for it unless duration is given",
  char_gesture: "layer a head gesture on an actor *without* interrupting its clip",
  char_prop: "put a comedy prop in an actor's hand (null to drop it)",
  char_prop_action: "act on the prop already in hand: bite | hide",
  char_move: "walk/move an actor along the nav graph",
  char_face: "turn an actor toward a waypoint or the player",
  char_bubble: "show a thought bubble over an actor",
  char_cut: "teleport an actor for a scene cut (no walking through walls)",
  char_visibility: "hide or reveal a performer for an authored entrance",
  player_walk: "first-person walk to a waypoint",
  player_look: "first-person look at a waypoint or actor",
  player_gesture: "first-person camera gesture (nod_yes, shake_no, peek_lean, shake_panic)",
  player_crouch: "first-person crouch state",
  player_hold: "put a prop in the player's hands / use it",
  fade: "fade the frame to a colour",
  cut: "hard camera cut",
  prop_action: "drive a placed scene prop: open | close | bounce | spin | bite | grow | drive | hide",
  bgm: "start a music bed",
  stop_bgm: "stop the music bed",
  sfx: "fire a one-shot sound effect",
};

function fileExists(relPath) {
  if (!relPath) return false;
  return fs.existsSync(path.join(REPO_ROOT, relPath.replace(/^\.\//, "")));
}

/** Every animation key with where it comes from and whether the file is present. */
export function listAnimations() {
  return Object.entries(ASSET_MANIFEST.animations).map(([key, def]) => ({
    key,
    kind: def.procedural ? "procedural" : "fbx",
    gesture: def.gesture ?? null,
    path: def.path ?? null,
    fileOnDisk: def.path ? fileExists(def.path) : true,
    loop: def.loop !== false,
    speed: def.defaultSpeed ?? 1,
    duration: def.duration ?? null,
  }));
}

export function listGestures() {
  return Object.entries(HEAD_GESTURES).map(([name, spec]) => ({
    name,
    axis: spec.axis,
    amplitudeRadians: spec.amplitude,
    cycles: spec.cycles,
    hold: Boolean(spec.hold),
    label: spec.label,
  }));
}

export function listProps() {
  return PROP_TYPES.map((type) => ({
    type,
    holdable: true,
    note: type === "cookie" ? "bites come off with the `bite` action" : undefined,
  }));
}

export function listBeats() {
  return BEAT_TYPES.map((type) => ({ type, note: BEAT_NOTES[type] ?? "" }));
}

export function listPresets() {
  return Object.entries(EPISODE_PRESETS).map(([key, ep]) => ({
    key,
    title: ep?.title ?? key,
    beats: (ep?.beats ?? (ep?.skits ?? []).flatMap((s) => s.beats ?? [])).length,
    cast: Object.keys(ep?.cast ?? {}),
  }));
}

export function buildCatalog() {
  const animations = listAnimations();
  return {
    generatedFrom: "src/config.js + src/headGestures.js",
    animations,
    gestures: listGestures(),
    props: listProps(),
    beats: listBeats(),
    presets: listPresets(),
    counts: {
      animations: animations.length,
      fbxAnimations: animations.filter((a) => a.kind === "fbx").length,
      proceduralGestures: animations.filter((a) => a.kind === "procedural").length,
      props: PROP_TYPES.length,
      beats: BEAT_TYPES.length,
      presets: Object.keys(EPISODE_PRESETS).length,
    },
  };
}

/** True when `name` may be written in an `anim` field. */
export function isKnownAnimation(name) {
  return Object.prototype.hasOwnProperty.call(ASSET_MANIFEST.animations, name) || isHeadGesture(name);
}
