#!/usr/bin/env node
/**
 * validate-episode.mjs — run the staging rules over an episode before rendering.
 *
 *   node scripts/validate-episode.mjs                        # every preset
 *   node scripts/validate-episode.mjs --preset cookie_marathon_150s
 *   node scripts/validate-episode.mjs --file scripts/out/my-episode.json
 *   node scripts/validate-episode.mjs --json                 # machine readable
 *   node scripts/validate-episode.mjs --no-fix               # report only
 *   node scripts/validate-episode.mjs --out fixed.json       # write repaired JSON
 *
 * Exit code is 1 when an error survives the auto-repair pass, so the export
 * workflow can refuse to publish a broken render.
 */
import fs from "node:fs";
import path from "node:path";
import { EPISODE_PRESETS, SET_MAP, NAV_GRAPH } from "../src/config.js";
import { validateAndRepair, formatStagingReport } from "../src/episodeSafety.js";
import { validateStorySpine, formatStoryReport } from "../src/storySpine.js";

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (flag) => {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
};

const asJson = has("--json");
const autoFix = !has("--no-fix");
const outPath = value("--out");
const filePath = value("--file");
const presetName = value("--preset");

let targets = [];
if (filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  targets = [{ name: path.basename(filePath), episode: raw }];
} else if (presetName) {
  const ep = EPISODE_PRESETS[presetName];
  if (!ep) {
    console.error(`Unknown preset "${presetName}". Known: ${Object.keys(EPISODE_PRESETS).join(", ")}`);
    process.exit(2);
  }
  targets = [{ name: presetName, episode: ep }];
} else {
  targets = Object.entries(EPISODE_PRESETS).map(([name, episode]) => ({ name, episode }));
}

let worst = 0;
const results = [];

for (const target of targets) {
  const result = validateAndRepair(target.episode, { setMap: SET_MAP, navGraph: NAV_GRAPH, autoFix });
  const story = validateStorySpine(result.episode);
  const storyErrors = story.errors.length;
  results.push({ name: target.name, ...result, story });

  if (asJson) continue;
  console.log(`\n=== ${target.name} — ${target.episode.title || "Untitled"} ===`);
  console.log(formatStagingReport(result));
  if (result.repaired) console.log("(repaired episode is what the renderer will play)");
  console.log(formatStoryReport(story));

  worst = Math.max(worst, result.stats.errorsAfter + storyErrors);
}

if (asJson) {
  console.log(
    JSON.stringify(
      results.map((r) => ({
        preset: r.name,
        stats: r.stats,
        issues: r.issues.map(({ code, severity, at, message, fix, applied }) => ({
          code, severity, at, message, fix, applied,
        })),
      })),
      null,
      2
    )
  );
} else if (targets.length > 1) {
  console.log("\n=== summary ===");
  for (const r of results) {
    const s = r.stats;
    console.log(
      `${r.name.padEnd(22)} ${String(s.errorsAfter).padStart(2)} error(s) left · ${String(s.fixed).padStart(2)} fixed · ${s.warningsAfter} warning(s)`
    );
  }
}

if (outPath) {
  const payload = results.length === 1 ? results[0].episode : results.map((r) => ({ preset: r.name, episode: r.episode }));
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  if (!asJson) console.log(`\nRepaired JSON written to ${outPath}`);
}

process.exit(worst > 0 ? 1 : 0);
