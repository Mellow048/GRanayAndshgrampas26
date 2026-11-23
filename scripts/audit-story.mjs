#!/usr/bin/env node
/**
 * audit-story.mjs — does this episode have a spine, or is it a bag of gags?
 *
 *   node scripts/audit-story.mjs                     # every preset that needs one
 *   node scripts/audit-story.mjs cookie_marathon_150s
 *   node scripts/audit-story.mjs --all --json
 *
 * Exit code 1 when any preset ≥ 60s fails the spine rules, so the export
 * workflow refuses to publish a plotless episode.
 */
import fs from "node:fs";
import path from "node:path";
import { EPISODE_PRESETS } from "../src/config.js";
import { validateStorySpine, formatStoryReport, STORY_RULES } from "../src/storySpine.js";

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");
const all = argv.includes("--all");
const named = argv.filter((a) => !a.startsWith("--"));

let targets;
if (named.length) {
  targets = named.map((name) => {
    const ep = EPISODE_PRESETS[name];
    if (!ep) {
      console.error(`Unknown preset "${name}". Known: ${Object.keys(EPISODE_PRESETS).join(", ")}`);
      process.exit(2);
    }
    return [name, ep];
  });
} else {
  targets = Object.entries(EPISODE_PRESETS).filter(
    ([, ep]) => Number(ep?.duration ?? 0) >= STORY_RULES.minDurationForSpine || all
  );
}

const results = [];
let failed = 0;
for (const [name, episode] of targets) {
  const result = validateStorySpine(episode);
  results.push({ preset: name, ...result });
  if (!result.ok) failed += 1;
  if (!asJson) {
    console.log(`\n=== ${name} — ${episode.title || "Untitled"} ===`);
    console.log(formatStoryReport(result));
  }
}

if (asJson) {
  console.log(JSON.stringify(results, null, 2));
} else if (targets.length > 1) {
  console.log("\n=== summary ===");
  for (const r of results) {
    console.log(`${r.preset.padEnd(24)} ${r.ok ? "OK" : "FAIL"}  (${r.errors.length} error(s), ${r.warnings.length} warning(s))`);
  }
  const exempt = results.filter((r) => r.warnings.some((w) => w.code === "SPINE_EXEMPT"));
  console.log(
    `\n${targets.length - failed}/${targets.length} preset(s) pass. ${exempt.length} carry explicit spine debt (see LEGACY_SPINE_DEBT in src/config.js): ${exempt
      .map((r) => r.preset)
      .join(", ") || "none"}.`
  );
}

if (!results.length) {
  if (!asJson) console.log("No presets long enough to require a spine.");
}

process.exit(failed > 0 ? 1 : 0);
