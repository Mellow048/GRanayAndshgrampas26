#!/usr/bin/env node
/**
 * catalogue.mjs — print everything an episode can ask for.
 *
 *   node scripts/catalogue.mjs             # human-readable
 *   node scripts/catalogue.mjs --json      # machine-readable (agents, CI)
 *   node scripts/catalogue.mjs --animations
 *   node scripts/catalogue.mjs --gestures
 *   node scripts/catalogue.mjs --props
 *   node scripts/catalogue.mjs --beats
 *
 * Exit code 1 if an animation points at a file that is not on disk.
 */
import { buildCatalog } from "../src/catalog.js";

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const only = ["--animations", "--gestures", "--props", "--beats", "--presets"].find(has);
const full = buildCatalog();

if (has("--json")) {
  const out = only
    ? { [only.slice(2)]: full[only.slice(2)] }
    : full;
  console.log(JSON.stringify(out, null, 2));
} else {
  const section = (title, rows) => {
    console.log(`\n${title}`);
    console.log("-".repeat(title.length));
    for (const r of rows) console.log("  " + r);
  };

  if (!only || only === "--animations") {
    section(
      "ANIMATIONS  (write these in `anim`, or as a char_anim beat)",
      full.animations.map(
        (a) =>
          `${a.key.padEnd(12)} ${a.kind.padEnd(10)} ${a.loop ? "loop" : "once"}  ` +
          (a.kind === "fbx" ? (a.fileOnDisk ? a.path : `MISSING ${a.path}`) : `procedural → ${a.gesture}`)
      )
    );
  }
  if (!only || only === "--gestures") {
    section(
      "HEAD GESTURES  (layer on top of a clip, no FBX)",
      full.gestures.map((g) => `${g.name.padEnd(12)} ${g.axis.padEnd(6)} ${g.label}`)
    );
  }
  if (!only || only === "--props") {
    section("PROPS  (spawn in `props`, or hold with char_prop)", full.props.map((p) => p.type));
  }
  if (!only || only === "--beats") {
    section("BEATS", full.beats.map((b) => `${b.type.padEnd(16)} ${b.note}`));
  }
  if (!only || only === "--presets") {
    section("PRESETS  (node scripts/export-video.mjs --preset <key>)", full.presets.map((p) => `${p.key.padEnd(26)} ${p.title}  [${p.beats} beats]`));
  }
  console.log("\ncounts:", JSON.stringify(full.counts));
}

const broken = full.animations.filter((a) => a.kind === "fbx" && !a.fileOnDisk);
if (broken.length) {
  console.error("\nMISSING ANIMATION FILES:\n" + broken.map((b) => `  ${b.key} → ${b.path}`).join("\n"));
  process.exit(1);
}
