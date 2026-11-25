import test from "node:test";
import assert from "node:assert/strict";
import { MIDNIGHT_PIZZA_HEIST_2M } from "../src/episodes/midnightPizzaHeist2m.js";
import { validateAndRepair } from "../src/episodeSafety.js";
import { validateStorySpine } from "../src/storySpine.js";
import { SET_MAP, NAV_GRAPH } from "../src/config.js";
import { greetAndNod, dialogueExchange, handItemTo } from "../src/gags/helpers.js";

test("midnight_pizza_heist_2m passes strict validation with zero warnings, zero bubbles, zero random laugh/sit, and full 3/3 story spine", () => {
  const res = validateAndRepair(MIDNIGHT_PIZZA_HEIST_2M, {
    setMap: SET_MAP,
    navGraph: NAV_GRAPH,
    autoFix: false,
  });
  assert.equal(res.stats.errorsBefore, 0, JSON.stringify(res.issues, null, 2));
  assert.equal(res.stats.warningsBefore, 0, JSON.stringify(res.issues, null, 2));

  const allBeats = (MIDNIGHT_PIZZA_HEIST_2M.skits || []).flatMap((s) => s.beats || []);
  const bubbles = allBeats.filter((b) => b.type === "char_bubble");
  assert.equal(bubbles.length, 0, "episode must use zero thought bubbles");

  const weirdAnims = allBeats.filter(
    (b) => b.type === "char_anim" && (b.anim === "laugh" || b.anim === "sit")
  );
  assert.equal(weirdAnims.length, 0, "episode must avoid unmotivated laugh/chairless sit animations");

  const spine = validateStorySpine(MIDNIGHT_PIZZA_HEIST_2M);
  assert.equal(spine.ok, true, JSON.stringify(spine.errors));
  assert.equal(spine.stats.goalPropScenes, 3);
  assert.equal(spine.stats.scenes, 3);
});

test("physical communication helpers keep actors facing each other instead of snapping to camera", () => {
  const beats = [
    ...greetAndNod({ at: 0, a: "granny", b: "grandpa" }),
    ...dialogueExchange({ at: 3, a: "granny", b: "grandpa", turns: 2 }),
    ...handItemTo({ at: 7, giver: "granny", receiver: "grandpa", prop: "golden_pizza" }),
  ];
  const arms = beats.filter((b) => b.type === "char_arm");
  assert.ok(arms.length >= 4);
  for (const arm of arms) {
    assert.equal(arm.facePlayer, false);
  }
});
