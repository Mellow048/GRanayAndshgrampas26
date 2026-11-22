import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import {
  validateEpisode,
  validateAndRepair,
  formatStagingReport,
  suggestedVia,
  doorwayChain,
} from "../src/episodeSafety.js";

const fixture = JSON.parse(
  fs.readFileSync(new URL("./fixtures/broken-episode.json", import.meta.url), "utf8")
);

const clone = () => JSON.parse(JSON.stringify(fixture));
const opts = { setMap: SET_MAP, navGraph: NAV_GRAPH };

test("every failure from the rejected render is detected", () => {
  const { issues } = validateEpisode(clone(), { ...opts, autoFix: false });
  const codes = new Set(issues.map((i) => i.code));

  const expected = [
    "SPAWN_INSIDE_ACTOR",      // camera starts inside Grandpa's torso
    "PROP_FLOATS",             // cookie jar floating above the floor
    "PROP_OVERLAP",            // jar clipping into the red button
    "PATH_THROUGH_WALL",       // Granny cuts the kitchen doorframe
    "STANDOFF_TOO_CLOSE",      // player walk parks the lens in a face
    "SOUND_WITHOUT_ANIM",      // eating SFX with no eating beat
    "REACTION_FACING_AWAY",    // laugh played away from the lens
    "PROP_STUCK_IN_HAND",      // heart bubble while holding the shotgun
    "DEAD_AIR",                // seconds of nothing
  ];

  for (const code of expected) {
    assert.ok(codes.has(code), `expected ${code}, got ${[...codes].join(", ")}`);
  }
});

test("auto-repair fixes every reported failure", () => {
  const result = validateAndRepair(clone(), opts);
  assert.equal(result.stats.errorsAfter, 0, formatStagingReport(result));
  assert.ok(result.stats.fixed >= 7);

  const ep = result.episode;

  // 1. Player no longer spawns inside Grandpa.
  assert.notEqual(ep.playerSpawn, "kitchen");
  const playerWp = SET_MAP[ep.playerSpawn];
  const grandpaWp = SET_MAP[ep.cast.find((c) => c.id === "grandpa").spawn];
  assert.ok(Math.hypot(playerWp.x - grandpaWp.x, playerWp.z - grandpaWp.z) >= 1.15);

  // 2. Props no longer float and no longer share space.
  for (const prop of ep.props) {
    assert.equal(prop.yOffset, undefined, `${prop.id} still has a floating yOffset`);
  }
  assert.ok(ep.props.some((p) => p.spawnOffset), "one prop was offset clear of the other");

  // 3. Granny's route now names the doorway.
  const grannyMove = ep.skits[0].beats.find(
    (b) => b.type === "char_move" && b.actor === "granny"
  );
  assert.deepEqual(grannyMove.via, ["doorway_living"]);

  // 4. The player keeps a real standoff from Grandpa's head.
  const walk = ep.skits[0].beats.find((b) => b.type === "player_walk");
  assert.equal(walk.standoff, 1.15);

  // 5. The laugh is sold to the lens.
  const faceBeat = ep.skits[0].beats.find(
    (b) => b.type === "char_face" && b.actor === "granny" && b.followPlayer === true
  );
  assert.ok(faceBeat, "inserted char_face for Granny");
  assert.ok(faceBeat.at <= 4.0);

  // 6. The weapon is stowed before the heart bubble.
  const stow = ep.skits[0].beats.find(
    (b) => b.type === "char_prop" && b.actor === "grandpa" && b.prop === "none"
  );
  assert.ok(stow, "inserted char_prop none before the bubble");

  // 7. The eating cue gained a visible beat.
  const eatReaction = ep.skits[0].beats.find(
    (b) => b.type === "char_anim" && b.at > 0.4 && b.at < 1.2
  );
  assert.ok(eatReaction, "inserted an animation for the eat SFX");
});

test("the doorway chain mirrors the authored nav graph", () => {
  const chain = doorwayChain(SET_MAP, NAV_GRAPH, "back_room_east", "living_room_left");
  assert.deepEqual(chain, ["back_room_east", "doorway_living", "living_room_entry", "living_room_left"]);
  assert.deepEqual(
    suggestedVia(SET_MAP, NAV_GRAPH, "back_room_east", "living_room_left"),
    ["doorway_living", "living_room_entry"]
  );
});

test("a clean episode produces no errors and no repairs", () => {
  const clean = {
    title: "Clean",
    aspect: "16:9",
    playerSpawn: "living_room_view",
    cast: [{ id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side", facing: "living_room_view" }],
    props: [{ id: "chest", type: "treasure_chest", spawn: "chest_spot" }],
    skits: [
      {
        name: "Skit",
        beats: [
          { at: 0.0, type: "player_look", target: "grandpa", duration: 0.22 },
          { at: 0.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
          { at: 0.5, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true, duration: 1.4 },
          { at: 1.0, type: "char_bubble", actor: "grandpa", icon: "laugh", duration: 1.2 },
          { at: 2.0, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
          { at: 2.6, type: "fade", to: 1, duration: 1.0 },
        ],
      },
    ],
  };

  const result = validateAndRepair(clean, opts);
  assert.equal(result.stats.errorsAfter, 0, formatStagingReport(result));
  assert.equal(result.stats.fixed, 0, "nothing needed repairing");
});
