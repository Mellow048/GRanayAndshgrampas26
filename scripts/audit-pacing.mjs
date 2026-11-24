/**
 * Pacing audit for episode presets AND modular gags.
 *
 * Catches the failures that make POV episodes feel dead:
 *  - camera looks exceeding episode.maxLookDuration (if configured)
 *  - visual gaps over 2.5s (empty rooms, dead air)
 *  - missing waypoints / tags / actors / props
 *  - gag schema violations (`after` or `await` inside modular gag beats)
 *
 * Usage:
 *   node scripts/audit-pacing.mjs [preset] [--max-gap=2.5] [--min-runtime=45] [--max-runtime=340]
 *   node scripts/audit-pacing.mjs --gags [--max-gap=2.0]
 *   node scripts/audit-pacing.mjs --all
 */
import {
  CONFIG,
  EPISODE_PRESETS,
  SET_MAP,
  SEMANTIC_MESH_TAGS,
  SEMANTIC_OBJECT_REGIONS,
} from "../src/config.js";
import { buildEpisode } from "../src/episodeBuilder.js";
import { GAG_REGISTRY, GAG_LOCATIONS } from "../src/gags/index.js";

const VISUAL = new Set([
  "player_look",
  "player_walk",
  "player_gesture",
  "player_crouch",
  "player_hold",
  "cut",
  "char_anim",
  "anim",
  "char_move",
  "move",
  "char_face",
  "face",
  "char_bubble",
  "char_gesture",
  "char_arm",
  "char_prop",
  "char_cut",
  "prop_action",
  "fade",
]);

const tagSet = new Set();
for (const entry of Object.values(SEMANTIC_MESH_TAGS || {})) {
  if (entry.tag) tagSet.add(entry.tag);
  for (const alias of entry.aliases || []) tagSet.add(alias);
}
for (const [tag, entry] of Object.entries(SEMANTIC_OBJECT_REGIONS || {})) {
  tagSet.add(tag);
  for (const alias of entry.aliases || []) tagSet.add(alias);
}
const waypoints = new Set(Object.keys(SET_MAP || {}));

export function auditEpisode(name, episode, opts = {}) {
  const allowSlowScans = Boolean(episode.allowSlowScans);
  const MAX_GAP = opts.maxGap ?? 2.5;
  const MIN_RUNTIME = opts.minRuntime ?? (allowSlowScans ? 240 : 10);
  const MAX_RUNTIME = opts.maxRuntime ?? (allowSlowScans ? 340 : 2800);
  const MAX_LOOK =
    episode.maxLookDuration ??
    (allowSlowScans ? 5.0 : CONFIG.maxLookDuration ?? 0.55);

  const failures = [];
  const warnings = [];
  const fail = (msg) => failures.push(msg);
  const warn = (msg) => warnings.push(msg);

  const castIds = new Set((episode.cast || []).map((c) => c.id));
  const propIds = new Set((episode.props || []).map((p) => p.id));
  const isRef = (ref) =>
    typeof ref === "string" &&
    (waypoints.has(ref) || tagSet.has(ref) || castIds.has(ref) || propIds.has(ref) || ref === "player");

  function checkRef(ref, where) {
    if (ref === undefined || ref === null || ref === false) return;
    if (typeof ref !== "string") return;
    if (!isRef(ref)) fail(`Missing target "${ref}" (${where})`);
  }

  checkRef(episode.playerSpawn, "playerSpawn");
  checkRef(episode.playerFacing, "playerFacing");
  for (const actor of episode.cast || []) {
    checkRef(actor.spawn, `cast ${actor.id} spawn`);
    checkRef(actor.facing, `cast ${actor.id} facing`);
  }
  for (const prop of episode.props || []) checkRef(prop.spawn, `prop ${prop.id} spawn`);

  const raw = [];
  for (const skit of episode.skits || []) {
    let cursor = skit.startAt ?? 0;
    for (const beat of skit.beats || []) {
      let at = cursor;
      if (typeof beat.at === "number") at = beat.at;
      else if (typeof beat.after === "number") at = cursor + beat.after;
      raw.push({ ...beat, at, duration: Math.max(0, beat.duration ?? 0) });
      cursor = at;
    }
  }
  raw.sort((a, b) => a.at - b.at);

  const posOfRef = (ref, actorPos) => {
    if (typeof ref !== "string") return null;
    if (SET_MAP[ref]) return SET_MAP[ref];
    if (actorPos && actorPos[ref]) return actorPos[ref];
    const prop = (episode.props || []).find((p) => p.id === ref);
    if (prop && SET_MAP[prop.spawn]) {
      const p = SET_MAP[prop.spawn];
      return { x: p.x, y: (p.y ?? 0) + (prop.yOffset ?? 0), z: p.z };
    }
    return null;
  };

  const actorPos = {};
  for (const actor of episode.cast || []) {
    const spawn = posOfRef(actor.spawn) || { x: 0, y: 0, z: 0 };
    actorPos[actor.id] = { x: spawn.x, y: spawn.y ?? 0, z: spawn.z };
  }
  let playerPos = posOfRef(episode.playerSpawn) || { x: 0, y: 0, z: 0 };

  const events = [];
  let tlShift = 0;

  for (const ev of raw) {
    const simAt = ev.at + tlShift;
    let effective = ev.duration;

    if (ev.type === "player_look") {
      const rawDur = ev.duration ?? 0.2;
      effective = Math.min(rawDur, MAX_LOOK);
      checkRef(ev.target, "player_look target");
      if (rawDur > MAX_LOOK + 1e-6) {
        warn(`player_look ${rawDur}s -> capped to ${MAX_LOOK}s at ${simAt.toFixed(1)}s`);
      }
    } else if (ev.type === "cut") {
      checkRef(ev.to || ev.target, "cut destination");
      checkRef(ev.facing || ev.lookAt, "cut facing");
      const dest = posOfRef(ev.to || ev.target || ev.spawn);
      if (dest) playerPos = { x: dest.x, y: dest.y ?? 0, z: dest.z };
      effective = 0;
    } else if (ev.type === "char_cut") {
      checkRef(ev.to || ev.target, "char_cut destination");
      checkRef(ev.facing || ev.faceTarget, "char_cut facing");
      const dest = posOfRef(ev.to || ev.target);
      if (dest && ev.actor) actorPos[ev.actor] = { x: dest.x, y: dest.y ?? 0, z: dest.z };
      effective = 0;
    } else if (ev.type === "player_walk") {
      checkRef(ev.target, "player_walk target");
      checkRef(ev.to, "player_walk to");
      for (const via of ev.via || []) checkRef(via, "player_walk via");
      const stops = [...(ev.via || []), ev.to || ev.target].filter(Boolean);
      let dist = 0;
      let prev = playerPos;
      for (const stop of stops) {
        const p = posOfRef(stop);
        if (!p) continue;
        dist += Math.hypot(p.x - prev.x, p.z - prev.z);
        prev = p;
      }
      const speed = Number(ev.speed) > 0 ? Number(ev.speed) : CONFIG.baseWalkSpeed ?? 2.5;
      const climbed = Math.abs((prev?.y ?? 0) - playerPos.y) > 0.15;
      effective = Math.max(ev.duration, dist / (climbed ? CONFIG.baseStairSpeed ?? 1.85 : speed));
      if (prev) playerPos = { x: prev.x, y: prev.y ?? 0, z: prev.z };
    } else if (ev.type === "char_move" || ev.type === "move") {
      checkRef(ev.to, "char_move to");
      checkRef(ev.from, "char_move from");
      for (const via of ev.via || []) checkRef(via, "char_move via");
      const start = ev.from ? posOfRef(ev.from) : actorPos[ev.actor];
      const stops = [...(ev.via || []), ev.to].filter(Boolean);
      let dist = 0;
      let prev = start || { x: 0, y: 0, z: 0 };
      for (const stop of stops) {
        const p = posOfRef(stop);
        if (!p) continue;
        dist += Math.hypot(p.x - prev.x, p.z - prev.z);
        prev = p;
      }
      const isRun = /run/.test(ev.anim || "");
      const speed = Number(ev.speed) > 0 ? Number(ev.speed) : isRun ? CONFIG.baseRunSpeed ?? 3.8 : CONFIG.baseWalkSpeed ?? 2.5;
      const climbed = Math.abs((prev?.y ?? 0) - (start?.y ?? 0)) > 0.15;
      effective = Math.max(ev.duration, dist / (climbed ? CONFIG.baseStairSpeed ?? 1.85 : speed));
      if (ev.actor) actorPos[ev.actor] = { x: prev.x, y: prev.y ?? 0, z: prev.z };
    } else if (ev.type === "char_anim" || ev.type === "anim") {
      if (!ev.duration) effective = ev.loop ? 0.45 : 1.0;
      checkRef(ev.actor, "char_anim actor");
    } else if (ev.type === "char_bubble" || ev.type === "char_prop" || ev.type === "char_face") {
      checkRef(ev.actor, `${ev.type} actor`);
      checkRef(ev.target, `${ev.type} target`);
    } else if (ev.type === "prop_action") {
      if (ev.prop && !propIds.has(ev.prop)) fail(`Unknown prop "${ev.prop}" (prop_action)`);
      checkRef(ev.waypoint, "prop_action waypoint");
      checkRef(ev.to, "prop_action to");
      if (ev.travelDuration) effective = Math.max(effective, ev.travelDuration);
    }

    const isAwait = ev.await === true || ev.sync === "sequential";
    if (isAwait) tlShift += effective;
    events.push({ ...ev, simAt, effective, isAwait });
  }

  const visual = events.filter((e) => VISUAL.has(e.type));
  const runtime = Math.max(1, ...events.map((e) => e.simAt + e.effective));
  const gaps = [];
  let coveredUntil = 0;
  let longestGap = 0;
  for (const ev of visual) {
    const gap = ev.simAt - coveredUntil;
    longestGap = Math.max(longestGap, gap);
    if (gap > MAX_GAP) {
      gaps.push({ gap, at: ev.simAt, type: ev.type, target: ev.target || ev.to || "" });
    }
    coveredUntil = Math.max(coveredUntil, ev.simAt + Math.max(0.05, ev.effective));
  }
  for (const gap of gaps) {
    fail(
      `Dead air ${gap.gap.toFixed(2)}s before ${gap.type}${
        gap.target ? `(${gap.target})` : ""
      } at ${gap.at.toFixed(1)}s`
    );
  }

  const looks = events.filter((e) => e.type === "player_look");
  if (runtime < MIN_RUNTIME) warn(`Runtime ${runtime.toFixed(1)}s is below target ${MIN_RUNTIME}s`);
  if (runtime > MAX_RUNTIME) fail(`Runtime ${runtime.toFixed(1)}s exceeds target ${MAX_RUNTIME}s`);

  const cuts = events.filter((e) => e.type === "cut").length;
  const awaited = events.filter((e) => e.isAwait).length;

  console.log(`\nPacing audit: ${name} — "${episode.title}"`);
  console.log(`  runtime:        ${runtime.toFixed(2)}s`);
  console.log(`  beats:          ${events.length} (${visual.length} visual, ${awaited} awaited)`);
  console.log(`  hard cuts:      ${cuts}`);
  console.log(`  looks:          ${looks.length} (avg ${(looks.reduce((s, e) => s + e.duration, 0) / Math.max(1, looks.length)).toFixed(2)}s)`);
  console.log(`  walks:          ${events.filter((e) => e.type === "player_walk").length}`);
  console.log(`  longest gap:    ${longestGap.toFixed(2)}s`);
  console.log(`  reactions:      ${events.filter((e) => e.type === "char_bubble" || e.type === "char_anim").length}`);
  console.log(`  props/actions:  ${events.filter((e) => e.type === "prop_action").length}`);

  if (warnings.length) {
    console.log("\nWarnings:");
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (failures.length) {
    console.error("\nFAILED:");
    for (const f of failures) console.error(`  x ${f}`);
    return false;
  }
  console.log("  OK: pacing rules satisfied.");
  return true;
}

function auditGagSchema(label, gag) {
  const errs = [];
  if (!gag || typeof gag !== "object") errs.push("Gag did not return an object");
  if (!gag.duration || gag.duration <= 0) errs.push("Missing positive duration");
  for (const [idx, b] of (gag.beats || []).entries()) {
    if (typeof b.at !== "number" || b.at < 0) errs.push(`Beat #${idx} (${b.type}) missing valid local \`at\``);
    if ("after" in b) errs.push(`Beat #${idx} (${b.type}) uses forbidden \`after\``);
    if ("await" in b) errs.push(`Beat #${idx} (${b.type}) uses forbidden \`await\``);
  }
  if (errs.length) {
    console.error(`\nGag schema FAILED (${label}):`);
    for (const e of errs) console.error(`  x ${e}`);
    return false;
  }
  const ep = buildEpisode({
    title: gag.name,
    playerSpawn: gag.playerSpawn,
    playerFacing: gag.playerFacing,
    gags: [gag],
  });
  return auditEpisode(label, ep, { maxGap: 2.0, minRuntime: 5, maxRuntime: 90 });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flags = new Map(
    args
      .filter((a) => a.startsWith("--"))
      .map((a) => {
        const [k, v] = a.replace(/^--/, "").split("=");
        return [k, v ?? "true"];
      })
  );

  const runAll = flags.has("all");
  const runGags = flags.has("gags") || runAll;
  let allOk = true;

  if (runAll) {
    for (const [key, ep] of Object.entries(EPISODE_PRESETS)) {
      const ok = auditEpisode(key, ep, {
        maxGap: flags.has("max-gap") ? Number(flags.get("max-gap")) : 2.5,
      });
      if (!ok) allOk = false;
    }
  } else if (!flags.has("gags")) {
    const presetName =
      args.find((a) => !a.startsWith("--")) ||
      (EPISODE_PRESETS.mountain_dew_run ? "mountain_dew_run" : Object.keys(EPISODE_PRESETS)[0]);
    const episode = EPISODE_PRESETS[presetName];
    if (!episode) {
      console.error(`Unknown preset "${presetName}". Available: ${Object.keys(EPISODE_PRESETS).join(", ")}`);
      process.exit(1);
    }
    allOk = auditEpisode(presetName, episode, {
      maxGap: flags.has("max-gap") ? Number(flags.get("max-gap")) : 2.5,
      minRuntime: flags.has("min-runtime") ? Number(flags.get("min-runtime")) : undefined,
      maxRuntime: flags.has("max-runtime") ? Number(flags.get("max-runtime")) : undefined,
    });
  }

  if (runGags) {
    for (const [gagKey, factory] of Object.entries(GAG_REGISTRY)) {
      const locs = factory.isLocationLocked ? ["default"] : Object.keys(GAG_LOCATIONS);
      for (const locKey of locs) {
        const g = factory.isLocationLocked ? factory() : factory({ location: locKey });
        const ok = auditGagSchema(`gag:${gagKey}@${locKey}`, g);
        if (!ok) allOk = false;
      }
    }
  }

  if (!allOk) process.exit(1);
  console.log("\nALL AUDITS PASSED.\n");
}
