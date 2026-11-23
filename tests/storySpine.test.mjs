import test from "node:test";
import assert from "node:assert/strict";
import { EPISODE_PRESETS } from "../src/config.js";
import { buildEpisode, enforceStageSeparation, MIN_CONCURRENT_TARGET_GAP } from "../src/episodeBuilder.js";
import { validateStorySpine, STORY_RULES } from "../src/storySpine.js";

const cookieProp = (id) => ({ id, type: "cookie", spawn: "dining_table_top" });

function scene(title, props = [], extraBeats = []) {
  return {
    name: title,
    title,
    duration: 10,
    playerSpawn: "dining_center",
    cast: { granny: { spawn: "dining_corner" }, grandpa: { spawn: "dining_table_front" } },
    props,
    beats: [
      { at: 0.5, type: "char_face", actor: "granny", followPlayer: true },
      { at: 2, type: "char_gesture", actor: "grandpa", gesture: "nod" },
      ...extraBeats,
    ],
  };
}

function guttedEpisode(overrides = {}) {
  return {
    title: "test",
    skits: [
      { name: "s1", beats: [{ at: 0, type: "prop_action", prop: "c1" }] },
      { name: "s2", beats: [{ at: 10, type: "char_anim", actor: "granny", anim: "idle" }] },
      { name: "s3", beats: [{ at: 20, type: "prop_action", prop: "c3" }] },
    ],
    props: [
      { id: "c1", type: "cookie" },
      { id: "c3", type: "cookie" },
    ],
    ...overrides,
  };
}

test("a long episode with no spine is an error, a short one is not", () => {
  const longSkits = Array.from({ length: 3 }, (_, i) => ({
    name: `s${i}`,
    beats: [{ at: i * 40, type: "char_anim", actor: "granny", anim: "idle", duration: 40 }],
  }));
  const long = validateStorySpine({ skits: longSkits });
  assert.equal(long.ok, false);
  assert.equal(long.errors[0].code, "NO_STORY_SPINE");

  const short = validateStorySpine({ skits: [{ name: "s", beats: [{ at: 0, type: "fade", duration: 6 }] }] });
  assert.equal(short.ok, true);
  assert.ok(STORY_RULES.minDurationForSpine >= 30);
});

test("the goal prop must appear in the setup, the conflict and the payoff", () => {
  const story = {
    premise: "one cookie left",
    goal: "eat it",
    goalProp: "cookie",
    resolution: "grandpa eats it",
    scenes: [
      { objective: "a", obstacle: "x", turn: "t1" },
      { objective: "b", obstacle: "y", turn: "t2" },
      { objective: "c", obstacle: "z", turn: "t3" },
      { objective: "d", obstacle: "w", turn: "t4" },
    ],
  };
  // Four scenes, cookie in 0/1/3 but not 2: the conflict act loses the object.
  const fourScenes = {
    props: [{ id: "c1", type: "cookie" }, { id: "c2", type: "cookie" }, { id: "c4", type: "cookie" }],
    skits: [
      { name: "s1", beats: [{ at: 0, type: "prop_action", prop: "c1" }] },
      { name: "s2", beats: [{ at: 10, type: "prop_action", prop: "c2" }] },
      { name: "s3", beats: [{ at: 20, type: "char_anim", actor: "granny", anim: "idle" }] },
      { name: "s4", beats: [{ at: 30, type: "prop_action", prop: "c4" }] },
    ],
  };
  const missingMiddle = validateStorySpine({ ...fourScenes, story });
  assert.equal(missingMiddle.ok, false);
  assert.ok(missingMiddle.errors.some((e) => e.code === "GOAL_PROP_LOST"));

  // cookie in all four acts → passes
  const withMiddle = validateStorySpine({
    story,
    props: [
      { id: "c1", type: "cookie" },
      { id: "c2", type: "cookie" },
      { id: "c3", type: "cookie" },
      { id: "c4", type: "cookie" },
    ],
    skits: ["c1", "c2", "c3", "c4"].map((id, i) => ({
      name: `s${i}`,
      beats: [{ at: i * 10, type: "prop_action", prop: id }],
    })),
  });
  assert.equal(withMiddle.ok, true, JSON.stringify(withMiddle.errors));
});

test("every scene needs an objective, and objectives may not flatline", () => {
  const story = {
    premise: "p",
    goal: "g",
    goalProp: "cookie",
    resolution: "r",
    scenes: [
      { objective: "same", obstacle: "o", turn: "t" },
      { objective: "same", obstacle: "o", turn: "t" },
      { objective: "different", obstacle: "o", turn: "t" },
    ],
  };
  const result = validateStorySpine(guttedEpisode({ story }));
  assert.ok(result.errors.some((e) => e.code === "STAKES_NEVER_RAISE"));

  const missing = validateStorySpine(
    guttedEpisode({
      story: { ...story, scenes: [{ objective: "a" }, { objective: "b", obstacle: "o", turn: "t" }, { objective: "c", obstacle: "o", turn: "t" }] },
    })
  );
  assert.ok(missing.errors.some((e) => e.code === "SCENE_WITHOUT_OBJECTIVE"));
});

test("the shipped 2:30 episode passes the spine gate", () => {
  const ep = EPISODE_PRESETS.cookie_marathon_150s;
  assert.ok(ep.story, "the marathon preset declares a spine");
  const result = validateStorySpine(ep);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.stats.goalPropScenes, result.stats.scenes, "the cookie is on stage in every scene");
});

test("explicit spine debt is reported, not hidden", () => {
  const result = validateStorySpine({
    storyExempt: "pre-dates the gate",
    skits: [{ name: "s", beats: [{ at: 0, type: "char_anim", actor: "granny", anim: "idle", duration: 90 }] }],
  });
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((w) => w.code === "SPINE_EXEMPT"));
});

test("the builder never sends two performers to the same spot at the same instant", () => {
  const ep = buildEpisode({
    title: "collision",
    gags: [
      scene("a", [], [
        { at: 1, type: "char_move", actor: "granny", to: "back_hall", duration: 2 },
        { at: 1, type: "char_move", actor: "grandpa", to: "back_hall", duration: 2 },
      ]),
    ],
  });
  const targets = ep.skits[0].beats
    .filter((b) => b.type === "char_move")
    .map((b) => b.to);
  assert.equal(targets.length, 2);
  assert.notEqual(targets[0], targets[1], "one of the two walks was retargeted");
  assert.ok(ep.stageSeparation.adjustments > 0);
  assert.ok(MIN_CONCURRENT_TARGET_GAP >= 1);
});

test("enforceStageSeparation is idempotent on a clean episode", () => {
  const ep = buildEpisode({
    title: "clean",
    gags: [
      scene("a", [cookieProp("c")], [
        { at: 1, type: "char_move", actor: "granny", to: "dining_corner", duration: 2 },
      ]),
    ],
  });
  const before = JSON.stringify(ep.skits);
  assert.equal(enforceStageSeparation(ep).adjustments, 0);
  assert.equal(JSON.stringify(ep.skits), before);
});
