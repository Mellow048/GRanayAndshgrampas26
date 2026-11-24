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
