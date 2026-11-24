import test from "node:test";
import assert from "node:assert/strict";

import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { validateEpisode, validateAndRepair } from "../src/episodeSafety.js";
import { walkTo } from "../src/gags/helpers.js";

const opts = { setMap: SET_MAP, navGraph: NAV_GRAPH };

test("unknown prop types are rejected instead of silently rendering as cookie jars", () => {
  const ep = {
    title: "Bad Prop",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" }],
    props: [{ id: "mystery", type: "invisible_unicorn", spawn: "chest_spot" }],
    skits: [{ name: "S1", beats: [{ at: 0, type: "fade", to: 1, duration: 0.5 }] }],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "UNKNOWN_PROP_TYPE" && i.severity === "error"));
});

test("unknown beat types are rejected instead of silently doing nothing", () => {
  const ep = {
    title: "Bad Beat",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.2, type: "teleport_to_moon" },
          { at: 1.0, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "UNKNOWN_BEAT_TYPE" && i.severity === "error"));
});

test("rapid back-to-back player_look beats trigger RAPID_LOOK_FLICK", () => {
  const ep = {
    title: "Flicky Camera",
    playerSpawn: "living_room_view",
    cast: [
      { id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" },
      { id: "granny", asset: "granny", spawn: "living_room_left" },
    ],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.2, type: "player_look", target: "grandpa", duration: 0.22 },
          { at: 0.4, type: "player_look", target: "granny", duration: 0.22 },
          { at: 1.5, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "RAPID_LOOK_FLICK"));
});

test("looking at a hidden or picked-up prop triggers LOOK_AT_HIDDEN_PROP", () => {
  const ep = {
    title: "Empty Air Look",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" }],
    props: [{ id: "jar", type: "cookie_jar", spawn: "chest_spot", visible: true }],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.5, type: "prop_action", prop: "jar", action: "pickup" },
          { at: 1.2, type: "player_look", target: "jar", duration: 0.24 },
          { at: 2.0, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "LOOK_AT_HIDDEN_PROP"));
});

test("walkTo with lookTarget disables lookAhead and enables tracking to prevent camera snapping", () => {
  const beats = walkTo({ at: 2.0, to: "kitchen", lookTarget: "grandpa" });
  const walk = beats.find((b) => b.type === "player_walk");
  const look = beats.find((b) => b.type === "player_look");
  assert.equal(walk.lookAhead, false);
  assert.equal(look.track, true);
});

test("dead-air auto-repair never injects jarring peek_lean gestures", () => {
  const ep = {
    title: "Gap Test",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.2, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
          { at: 4.5, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const repaired = validateAndRepair(ep, opts);
  const allBeats = repaired.episode.skits.flatMap((s) => s.beats);
  assert.equal(
    allBeats.some((b) => b.type === "player_gesture" && b.gesture === "peek_lean"),
    false,
    "auto-repair must never inject peek_lean"
  );
});


test("v2.1: flags staring at an empty static waypoint with LOOK_AT_EMPTY_SPOT", () => {
  const ep = {
    title: "Empty Bookshelf Look",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "kitchen" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.4, type: "player_look", target: "front_door_pkg", duration: 0.25 },
          { at: 2.0, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "LOOK_AT_EMPTY_SPOT"));
});

test("v2.1: flags narrow doorway head-on collision with DOORWAY_BOTTLENECK", () => {
  const ep = {
    title: "Doorway Collision",
    playerSpawn: "dining_center",
    cast: [{ id: "granny", asset: "granny", spawn: "back_hall" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 1.0, type: "player_walk", via: ["doorway_dining"], to: "back_hall_left", duration: 2.0 },
          { at: 1.2, type: "char_move", actor: "granny", via: ["doorway_dining"], to: "dining_center", duration: 2.0 },
          { at: 3.5, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "DOORWAY_BOTTLENECK"));
});

test("v2.1: flags 3x repetitive room commute loop with REPETITIVE_ROOM_LOOP", () => {
  const ep = {
    title: "Commute Loop",
    playerSpawn: "dining_center",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "living_room" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 0.5, type: "player_walk", to: "kitchen", duration: 1.5 },
          { at: 2.5, type: "player_walk", to: "dining_center", duration: 1.5 },
          { at: 4.5, type: "player_walk", to: "kitchen", duration: 1.5 },
          { at: 6.5, type: "player_walk", to: "dining_center", duration: 1.5 },
          { at: 8.5, type: "player_walk", to: "kitchen", duration: 1.5 },
          { at: 10.5, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "REPETITIVE_ROOM_LOOP"));
});

test("v2.1: flags staring at an empty room while offscreen SFX play with EMPTY_FRAME_DEAD_AIR", () => {
  const ep = {
    title: "Empty Bedroom Stare",
    playerSpawn: "living_room_view",
    cast: [{ id: "granny", asset: "granny", spawn: "kitchen" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 1.0, type: "sfx", sound: "granny_laugh" },
          { at: 3.0, type: "sfx", sound: "granny_laugh" },
          { at: 5.5, type: "sfx", sound: "granny_laugh" },
          { at: 7.0, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "EMPTY_FRAME_DEAD_AIR"));
});

test("v2.1: flags spawning an actor directly on a narrow kitchen table with ACTOR_ON_NARROW_TABLE", () => {
  const ep = {
    title: "Table Clip",
    playerSpawn: "dining_center",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "kitchen_table_top" }],
    props: [],
    skits: [{ name: "S1", beats: [{ at: 1.0, type: "fade", to: 1, duration: 0.5 }] }],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "ACTOR_ON_NARROW_TABLE"));
});


test("v2.2: rejects spawning a fake bed prop on the 1st floor with FAKE_GROUND_FLOOR_BED", () => {
  const ep = {
    title: "Fake 1st Floor Bed",
    playerSpawn: "bed_side",
    cast: [],
    props: [{ id: "fake_bed", type: "bed", spawn: "bed_home" }],
    skits: [{ name: "S1", beats: [{ at: 1.0, type: "fade", to: 1, duration: 0.5 }] }],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "FAKE_GROUND_FLOOR_BED" && i.severity === "error"));
});


test("v3.0: flags thought bubbles with no physical acting via BUBBLE_WITHOUT_ACTING", () => {
  const ep = {
    title: "Lazy Bubble",
    playerSpawn: "living_room_view",
    cast: [{ id: "granny", asset: "granny", spawn: "living_room_left" }],
    props: [],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 1.0, type: "char_bubble", actor: "granny", icon: "food", duration: 1.5 },
          { at: 3.5, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "BUBBLE_WITHOUT_ACTING"));
});

test("v3.0: flags magically popping props without arm acting or glide via LAZY_PROP_POP", () => {
  const ep = {
    title: "Magic Prop Pop",
    playerSpawn: "dining_center",
    cast: [{ id: "granny", asset: "granny", spawn: "kitchen" }],
    props: [{ id: "plate", type: "breakfast_plate", spawn: "dining_table_top", visible: false }],
    skits: [
      {
        name: "S1",
        beats: [
          { at: 1.5, type: "prop_action", prop: "plate", action: "place", waypoint: "dining_table_top" },
          { at: 3.0, type: "fade", to: 1, duration: 0.5 },
        ],
      },
    ],
  };
  const { issues } = validateEpisode(ep, { ...opts, autoFix: false });
  assert.ok(issues.some((i) => i.code === "LAZY_PROP_POP"));
});


test("v3.1: validates declarative custom props and rejects empty/invalid custom parts", () => {
  const validCustom = {
    title: "Valid Custom Car",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side" }],
    props: [
      {
        id: "toy_car",
        type: "custom",
        spawn: "chest_spot",
        parts: [
          { shape: "box", size: [0.4, 0.14, 0.22], pos: [0, 0.08, 0], color: 0xdc2626 },
          { shape: "cylinder", size: [0.05, 0.05, 0.04], pos: [0.12, 0.04, 0.11], color: 0x111827 },
        ],
      },
    ],
    skits: [{ name: "S1", beats: [{ at: 1.0, type: "fade", to: 1, duration: 0.5 }] }],
  };
  const okRes = validateEpisode(validCustom, { ...opts, autoFix: false });
  assert.equal(okRes.issues.some((i) => i.code === "INVALID_CUSTOM_PROP" || i.code === "UNKNOWN_PROP_TYPE"), false);

  const badCustom = {
    ...validCustom,
    props: [{ id: "empty_prop", type: "custom", spawn: "chest_spot", parts: [] }],
  };
  const badRes = validateEpisode(badCustom, { ...opts, autoFix: false });
  assert.ok(badRes.issues.some((i) => i.code === "INVALID_CUSTOM_PROP" && i.severity === "error"));
});

import { greetAndNod, dialogueExchange } from "../src/gags/helpers.js";

test("v3.2: THOUGHT_BUBBLE_SPAM hard-rejects banned conversation icons (heart/laugh/food/happy) and bubble spam", () => {
  const ep = {
    id: "agent_custom_bubble_spam",
    title: "Bubble Spam Test",
    duration: 30,
    playerSpawn: "kitchen_doorway",
    characters: [
      { id: "granny", spawn: "kitchen_stove" },
      { id: "grandpa", spawn: "kitchen_table_side" },
    ],
    actions: [
      { at: 1.0, type: "char_bubble", actor: "granny", icon: "heart", duration: 1.2 },
      { at: 3.0, type: "char_bubble", actor: "grandpa", icon: "laugh", duration: 1.2 },
      { at: 5.0, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.2 },
    ],
  };
  const res = validateEpisode(ep, { setMap: SET_MAP, navGraph: NAV_GRAPH, autoFix: false });
  const codes = res.issues.filter((i) => i.severity === "error").map((i) => i.code);
  assert.ok(codes.includes("THOUGHT_BUBBLE_SPAM"), `Expected THOUGHT_BUBBLE_SPAM error, got ${codes}`);
});

test("v3.2: UNMOTIVATED_EXPLOSION_SFX hard-rejects Minecraft explosion when nothing is exploding", () => {
  const ep = {
    id: "agent_custom_random_boom",
    title: "Random Explosion Test",
    duration: 20,
    playerSpawn: "kitchen_doorway",
    characters: [{ id: "grandpa", spawn: "kitchen_table_side" }],
    actions: [
      { at: 2.0, type: "char_anim", actor: "grandpa", anim: "jump" },
      { at: 2.1, type: "sfx", sound: "explode_meme" },
    ],
  };
  const res = validateEpisode(ep, { setMap: SET_MAP, navGraph: NAV_GRAPH, autoFix: false });
  const codes = res.issues.filter((i) => i.severity === "error").map((i) => i.code);
  assert.ok(codes.includes("UNMOTIVATED_EXPLOSION_SFX"), `Expected UNMOTIVATED_EXPLOSION_SFX error, got ${codes}`);
});

test("v3.2: TAUNT_SFX_SPAM and SFX_OVERLOAD_SPAM hard-reject taunt and random SFX spam", () => {
  const ep = {
    id: "agent_custom_sfx_spam",
    title: "SFX Spam Test",
    duration: 30,
    playerSpawn: "kitchen_doorway",
    characters: [{ id: "granny", spawn: "kitchen_stove" }],
    actions: [
      { at: 2.0, type: "sfx", sound: "granny_i_see_you" },
      { at: 2.5, type: "sfx", sound: "bonk" },
      { at: 3.0, type: "sfx", sound: "granny_laugh" },
      { at: 8.0, type: "sfx", sound: "granny_i_see_you" },
      { at: 12.0, type: "sfx", sound: "granny_i_see_you" },
    ],
  };
  const res = validateEpisode(ep, { setMap: SET_MAP, navGraph: NAV_GRAPH, autoFix: false });
  const codes = res.issues.filter((i) => i.severity === "error").map((i) => i.code);
  assert.ok(codes.includes("TAUNT_SFX_SPAM"), `Expected TAUNT_SFX_SPAM error, got ${codes}`);
  assert.ok(codes.includes("SFX_OVERLOAD_SPAM"), `Expected SFX_OVERLOAD_SPAM error, got ${codes}`);
});

test("v3.2: greetAndNod and dialogueExchange emit zero thought bubbles", () => {
  const g = greetAndNod({ at: 1.0, a: "granny", b: "grandpa" });
  const d = dialogueExchange({ at: 4.0, a: "granny", b: "grandpa", turns: 3 });
  assert.equal([...g, ...d].filter((b) => b.type === "char_bubble").length, 0);
  assert.ok(g.some((b) => b.type === "char_arm" && b.gesture === "wave"));
  assert.ok(g.some((b) => b.type === "char_gesture" && b.gesture === "nod_yes"));
});
