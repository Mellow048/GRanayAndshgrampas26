/**
 * storySpine.js — makes "what is this episode about?" a build failure.
 *
 * The 2:30 episode was eight competently staged gags with no throughline: the
 * cookie that starts the trouble is not the cookie that ends it, nobody wants
 * anything for longer than one scene, and nothing escalates. The staging gates
 * could not see any of that, because they only look at positions.
 *
 * A spine is deliberately small and declarative, so another agent can write one
 * in a minute and a reviewer can read it in ten seconds:
 *
 *   story: {
 *     premise:    "Granny has exactly one cookie left and Grandpa is awake.",
 *     goal:       "eat the last cookie before Grandpa catches her",
 *     goalProp:   "cookie",                 // the object the whole episode is about
 *     resolution: "Grandpa eats it; Granny gets blamed for the crumbs.",
 *     scenes: [ { objective, obstacle, turn }, ... ]   // one per scene, in order
 *   }
 *
 * The hard rules are positional rather than statistical: the goal object has to
 * be on camera in the setup, in the conflict and in the payoff, because those
 * are the three places a viewer looks for the point of the episode.
 */

export const STORY_RULES = {
  /** Episodes shorter than this can be a single bit and don't need a spine. */
  minDurationForSpine: 60,
  /** Share of scenes that should have the goal prop on stage (warning below this). */
  goalPropCoverage: 0.5,
  /** A scene longer than this needs a second turn to stay legible. */
  maxSceneSecondsWithoutSecondTurn: 32,
  /** How many consecutive scenes may share an objective before it reads as flat. */
  maxRepeatedObjectives: 1,
};

const NON_EMPTY = (v) => typeof v === "string" && v.trim().length > 0;

// Beat `at` values are absolute once the builder has chained the scenes, so a
// scene's length is its own span, not the sum of its timestamps.
function sceneSpan(skit) {
  const beats = Array.isArray(skit?.beats) ? skit.beats : [];
  let minStart = Number.POSITIVE_INFINITY;
  let maxEnd = 0;
  for (const b of beats) {
    const at = Number(b?.at ?? 0);
    const end = at + Number(b?.duration ?? 0);
    if (Number.isFinite(at)) minStart = Math.min(minStart, at);
    if (Number.isFinite(end)) maxEnd = Math.max(maxEnd, end);
  }
  if (!Number.isFinite(minStart)) return { start: 0, end: 0, seconds: 0 };
  return { start: minStart, end: maxEnd, seconds: Math.max(0, maxEnd - minStart) };
}

function sceneDuration(skit) {
  return Number(skit?.duration ?? 0) || sceneSpan(skit).seconds;
}

/**
 * The builder hoists prop declarations to `episode.props` and rewrites the beats
 * to reference ids, so a scene "has the cookie" when it mentions any prop whose
 * type is cookie. Hence the type map.
 */
export function propTypeMap(episode) {
  return new Map((Array.isArray(episode?.props) ? episode.props : []).map((p) => [String(p.id), String(p.type || "")]));
}

/** Every prop id a scene puts on stage or touches. */
export function propMentions(skit) {
  const ids = new Set();
  for (const p of Array.isArray(skit?.props) ? skit.props : []) {
    if (p?.id) ids.add(String(p.id));
    if (p?.type) ids.add(String(p.type));
  }
  const beats = Array.isArray(skit?.beats) ? skit.beats : [];
  for (const b of beats) {
    for (const key of ["prop", "propId", "subject", "target", "item", "held"]) {
      const v = b?.[key];
      if (typeof v === "string" && v) ids.add(v);
    }
  }
  return ids;
}

/**
 * @param {object} episode built episode (`skits[]`, optional `story`)
 * @param {object} [rules] override STORY_RULES
 * @returns {{ok:boolean, errors:Array, warnings:Array, stats:object}}
 */
export function validateStorySpine(episode, rules = {}) {
  const r = { ...STORY_RULES, ...rules };
  const errors = [];
  const warnings = [];
  const skits = Array.isArray(episode?.skits) ? episode.skits : [];
  const duration = Number(episode?.duration ?? skits.reduce((max, s) => Math.max(max, sceneSpan(s).end), 0));
  const story = episode?.story || null;
  const stats = {
    duration,
    scenes: skits.length,
    hasSpine: Boolean(story),
    goalPropScenes: 0,
    goalPropCoverage: 0,
  };

  const err = (code, message, extra = {}) => errors.push({ code, severity: "error", message, ...extra });
  const warn = (code, message, extra = {}) => warnings.push({ code, severity: "warn", message, ...extra });

  if (!story) {
    if (NON_EMPTY(episode?.storyExempt)) {
      // Explicit, visible debt: the preset renders, but the audit keeps naming
      // it until a real spine is written.
      warn("SPINE_EXEMPT", `no story spine yet (${episode.storyExempt})`);
    } else if (duration >= r.minDurationForSpine) {
      err(
        "NO_STORY_SPINE",
        `${duration.toFixed(1)}s episode has no story spine — nothing says what the POV character wants, what is in the way, or how it ends.`
      );
    }
    return { ok: errors.length === 0, errors, warnings, stats };
  }

  for (const key of ["premise", "goal", "resolution"]) {
    if (!NON_EMPTY(story[key])) {
      err("SPINE_INCOMPLETE", `story.${key} is empty — a spine needs a premise, a goal and a resolution.`);
    }
  }
  if (!NON_EMPTY(story.goalProp)) {
    err("SPINE_INCOMPLETE", "story.goalProp is empty — name the object the episode is actually about.");
  }

  if (!skits.length) {
    warn("SPINE_UNMEASURABLE", "episode has no `skits` — this format cannot express per-scene objectives yet.");
    return { ok: errors.length === 0, errors, warnings, stats };
  }

  /* ---------------- per scene: objective / obstacle / turn ---------------- */

  const sceneSpines = Array.isArray(story.scenes) ? story.scenes : [];
  if (skits.length && sceneSpines.length !== skits.length) {
    err(
      "SPINE_SCENE_COUNT",
      `story.scenes has ${sceneSpines.length} entries but the episode has ${skits.length} scenes — every scene needs an objective, an obstacle and a turn.`
    );
  }

  let previousObjective = null;
  let repeats = 0;
  skits.forEach((skit, i) => {
    const spine = sceneSpines[i] || null;
    const label = skit?.name || skit?.title || `scene ${i + 1}`;
    if (!spine) return;
    for (const key of ["objective", "obstacle", "turn"]) {
      if (!NON_EMPTY(spine[key])) {
        err("SCENE_WITHOUT_OBJECTIVE", `${label}: story.scenes[${i}].${key} is empty.`);
      }
    }
    const objective = NON_EMPTY(spine.objective) ? spine.objective.trim().toLowerCase() : null;
    if (objective && objective === previousObjective) {
      repeats += 1;
      if (repeats >= r.maxRepeatedObjectives) {
        err(
          "STAKES_NEVER_RAISE",
          `${label}: same objective as the previous scene ("${spine.objective}") — nothing escalates.`
        );
      }
    } else {
      repeats = 0;
    }
    previousObjective = objective;

    const seconds = sceneDuration(skit);
    const turns = Array.isArray(spine.beats) ? spine.beats.length : 1;
    if (seconds > r.maxSceneSecondsWithoutSecondTurn && turns < 2) {
      warn(
        "SCENE_TOO_LONG_WITHOUT_TURN",
        `${label}: ${seconds.toFixed(1)}s with a single turn — add a second beat or split the scene.`
      );
    }
  });

  /* ---------------- the goal prop must run through all three acts ---------- */

  const goalProp = NON_EMPTY(story.goalProp) ? story.goalProp.trim() : null;
  if (goalProp && skits.length) {
    const types = propTypeMap(episode);
    const hasGoal = (skit) => {
      const ids = propMentions(skit);
      if (ids.has(goalProp)) return true;
      for (const id of ids) if (types.get(id) === goalProp) return true;
      return false;
    };
    const onStage = skits.map(hasGoal);
    stats.goalPropScenes = onStage.filter(Boolean).length;
    stats.goalPropCoverage = stats.goalPropScenes / skits.length;

    const openingEnd = Math.max(1, Math.ceil(skits.length * 0.35));
    const middleFrom = openingEnd;
    const middleTo = Math.max(middleFrom + 1, Math.floor(skits.length * 0.85));
    const acts = [
      { key: "setup", range: [0, openingEnd], label: "the opening scenes" },
      { key: "conflict", range: [middleFrom, middleTo], label: "the middle of the episode" },
      { key: "payoff", range: [skits.length - 1, skits.length], label: "the final scene" },
    ];
    for (const act of acts) {
      const present = onStage.slice(act.range[0], act.range[1]).some(Boolean);
      if (!present) {
        err(
          act.key === "payoff" ? "PAYOFF_MISSING" : "GOAL_PROP_LOST",
          `"${goalProp}" never appears in ${act.label} — the object the episode is about has to be on camera in the setup, the conflict and the payoff.`
        );
      }
    }
    if (stats.goalPropCoverage < r.goalPropCoverage) {
      warn(
        "GOAL_PROP_RARE",
        `"${goalProp}" is on stage in only ${stats.goalPropScenes}/${skits.length} scenes — the thread gets thin between the beats that matter.`
      );
    }
  }

  return { ok: errors.length === 0, errors, warnings, stats };
}

export function formatStoryReport(result) {
  const lines = [];
  const s = result.stats;
  lines.push(
    `Story spine: ${s.hasSpine ? "present" : "MISSING"} · ${s.scenes} scene(s) · goal prop on stage in ${s.goalPropScenes}/${s.scenes} scenes`
  );
  for (const e of result.errors) lines.push(`  ERROR ${e.code}: ${e.message}`);
  for (const w of result.warnings) lines.push(`  warn  ${w.code}: ${w.message}`);
  if (result.ok) {
    lines.push(
      s.hasSpine
        ? "  OK: premise, escalation and payoff are all on camera."
        : `  OK: under ${STORY_RULES.minDurationForSpine}s, a single bit does not need a spine.`
    );
  }
  return lines.join("\n");
}
