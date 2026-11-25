#!/usr/bin/env node
/**
 * Splits a long multi-skit/multi-gag episode into self-contained, gag-aligned chunk JSONs
 * for parallel GitHub Actions rendering + lossless FFmpeg concatenation.
 *
 * Handles both `buildEpisode` (`at`-timed gags) and `await`/`after`-chained Act scripts
 * (like `zombie_fort_5m`), keeping chunk boundaries frame-exact at skit/act transitions.
 *
 * Usage:
 *   node scripts/chunk-episode.mjs --preset rocket_ball_x3 --max-chunk-sec 20 --out-dir /tmp/chunks
 *   node scripts/chunk-episode.mjs --preset zombie_fort_5m --max-chunk-sec 80 --out-dir /tmp/chunks
 */
import fs from "node:fs";
import path from "node:path";
import { CONFIG, EPISODE_PRESETS, SET_MAP } from "../src/config.js";

function parseArgs(argv) {
  const opts = {
    preset: "cookie_marathon_150s",
    episodeFile: "",
    maxChunkSec: 180,
    chunks: 0,
    outDir: path.resolve("output/chunks"),
    githubMatrix: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--preset") opts.preset = argv[++i];
    else if (a === "--episode-file") opts.episodeFile = argv[++i];
    else if (a === "--max-chunk-sec") opts.maxChunkSec = Number(argv[++i]) || 180;
    else if (a === "--chunks") opts.chunks = Number(argv[++i]) || 0;
    else if (a === "--out-dir") opts.outDir = path.resolve(argv[++i]);
    else if (a === "--github-matrix") opts.githubMatrix = true;
  }
  return opts;
}

function posOfRef(ref, episode, actorPos) {
  if (typeof ref !== "string") return null;
  if (SET_MAP[ref]) return SET_MAP[ref];
  if (actorPos && actorPos[ref]) return actorPos[ref];
  const prop = (episode.props || []).find((p) => p.id === ref);
  if (prop && SET_MAP[prop.spawn]) {
    const p = SET_MAP[prop.spawn];
    return { x: p.x, y: (p.y ?? 0) + (prop.yOffset ?? 0), z: p.z };
  }
  return null;
}

function compileSkitsWithTiming(episode) {
  const MAX_LOOK =
    episode.maxLookDuration ??
    (episode.allowSlowScans ? 5.0 : CONFIG.maxLookDuration ?? 0.55);

  const actorPos = {};
  for (const actor of episode.cast || []) {
    const s = posOfRef(actor.spawn, episode) || { x: 0, y: 0, z: 0 };
    actorPos[actor.id] = { x: s.x, y: s.y ?? 0, z: s.z };
  }
  let playerPos = posOfRef(episode.playerSpawn, episode) || { x: 0, y: 0, z: 0 };

  const rawBySkit = [];
  for (let si = 0; si < (episode.skits || []).length; si += 1) {
    const skit = episode.skits[si];
    let cursor = skit.startAt ?? 0;
    for (const beat of skit.beats || []) {
      let at = cursor;
      if (typeof beat.at === "number") at = beat.at;
      else if (typeof beat.after === "number") at = cursor + beat.after;
      rawBySkit.push({ skitIdx: si, beat, at, duration: Math.max(0, beat.duration ?? 0) });
      cursor = at;
    }
  }
  rawBySkit.sort((a, b) => a.at - b.at);

  const compiledSkits = (episode.skits || []).map((s) => ({
    name: s.name,
    beats: [],
    minAt: Infinity,
    maxEnd: 0,
  }));

  let tlShift = 0;
  for (const item of rawBySkit) {
    const ev = item.beat;
    const simAt = +(item.at + tlShift).toFixed(3);
    let effective = item.duration;

    if (ev.type === "player_look") {
      effective = Math.min(ev.duration ?? 0.2, MAX_LOOK);
    } else if (ev.type === "cut") {
      const dest = posOfRef(ev.to || ev.target || ev.spawn, episode);
      if (dest) playerPos = { x: dest.x, y: dest.y ?? 0, z: dest.z };
      effective = 0;
    } else if (ev.type === "char_cut") {
      const dest = posOfRef(ev.to || ev.target, episode);
      if (dest && ev.actor) actorPos[ev.actor] = { x: dest.x, y: dest.y ?? 0, z: dest.z };
      effective = 0;
    } else if (ev.type === "player_walk") {
      const stops = [...(ev.via || []), ev.to || ev.target].filter(Boolean);
      let dist = 0;
      let prev = playerPos;
      for (const stop of stops) {
        const p = posOfRef(stop, episode);
        if (!p) continue;
        dist += Math.hypot(p.x - prev.x, p.z - prev.z);
        prev = p;
      }
      const speed = Number(ev.speed) > 0 ? Number(ev.speed) : CONFIG.baseWalkSpeed ?? 2.5;
      const climbed = Math.abs((prev?.y ?? 0) - playerPos.y) > 0.15;
      effective = Math.max(item.duration, dist / (climbed ? CONFIG.baseStairSpeed ?? 1.85 : speed));
      if (prev) playerPos = { x: prev.x, y: prev.y ?? 0, z: prev.z };
    } else if (ev.type === "char_move" || ev.type === "move") {
      const start = ev.from ? posOfRef(ev.from, episode) : actorPos[ev.actor];
      const stops = [...(ev.via || []), ev.to].filter(Boolean);
      let dist = 0;
      let prev = start || { x: 0, y: 0, z: 0 };
      for (const stop of stops) {
        const p = posOfRef(stop, episode);
        if (!p) continue;
        dist += Math.hypot(p.x - prev.x, p.z - prev.z);
        prev = p;
      }
      const isRun = /run/.test(ev.anim || "");
      const speed = Number(ev.speed) > 0 ? Number(ev.speed) : isRun ? CONFIG.baseRunSpeed ?? 3.8 : CONFIG.baseWalkSpeed ?? 2.5;
      const climbed = Math.abs((prev?.y ?? 0) - (start?.y ?? 0)) > 0.15;
      effective = Math.max(item.duration, dist / (climbed ? CONFIG.baseStairSpeed ?? 1.85 : speed));
      if (ev.actor) actorPos[ev.actor] = { x: prev.x, y: prev.y ?? 0, z: prev.z };
    } else if (ev.type === "char_anim" || ev.type === "anim") {
      if (!ev.duration) effective = ev.loop ? 0.45 : 1.0;
    } else if (ev.type === "prop_action" && ev.travelDuration) {
      effective = Math.max(effective, ev.travelDuration);
    }

    const isAwait = ev.await === true || ev.sync === "sequential";
    if (isAwait) tlShift += effective;

    const bucket = compiledSkits[item.skitIdx];
    const normBeat = { ...ev, at: simAt };
    delete normBeat.after;
    delete normBeat.await;
    delete normBeat.sync;
    bucket.beats.push(normBeat);
    bucket.minAt = Math.min(bucket.minAt, simAt);
    bucket.maxEnd = Math.max(bucket.maxEnd, simAt + effective);
  }

  for (const s of compiledSkits) {
    if (s.minAt === Infinity) s.minAt = 0;
  }
  return compiledSkits;
}

function cloneStateFromEpisode(episode) {
  const actorState = {};
  for (const c of episode.cast || []) {
    actorState[c.id] = {
      id: c.id,
      asset: c.asset || c.id,
      spawn: c.spawn,
      facing: c.facing,
      anim: c.anim || "idle",
    };
  }
  const propState = {};
  for (const p of episode.props || []) {
    propState[p.id] = { ...p };
  }
  const defaultFov = CONFIG.aspectModes?.[episode.aspect || "16:9"]?.fov ?? CONFIG.cameraFov ?? 68;
  return {
    playerSpawn: episode.playerSpawn || "back_hall",
    playerFacing: episode.playerFacing || "kitchen",
    playerFov: Number.isFinite(episode.playerFov) ? episode.playerFov : defaultFov,
    defaultFov,
    actorState,
    propState,
    activeBgm: null,
  };
}

function applyBeatToState(beat, state) {
  if (beat.type === "cut") {
    if (beat.to || beat.target) state.playerSpawn = beat.to || beat.target;
    if (beat.facing || beat.lookAt) state.playerFacing = beat.facing || beat.lookAt;
  } else if (beat.type === "player_walk") {
    if (beat.to || beat.target) state.playerSpawn = beat.to || beat.target;
    if (beat.faceTarget && beat.faceTarget !== false) {
      state.playerFacing = beat.faceTarget;
    }
  } else if (beat.type === "player_look") {
    if (beat.target) state.playerFacing = beat.target;
  } else if (beat.type === "player_zoom") {
    state.playerFov = Number.isFinite(beat.fov) ? beat.fov : state.defaultFov;
  } else if (beat.type === "char_cut" && beat.actor && state.actorState[beat.actor]) {
    const a = state.actorState[beat.actor];
    if (beat.to || beat.target) a.spawn = beat.to || beat.target;
    if (beat.facing || beat.faceTarget) a.facing = beat.facing || beat.faceTarget;
    if (beat.anim) a.anim = beat.anim;
  } else if ((beat.type === "char_move" || beat.type === "move") && beat.actor && state.actorState[beat.actor]) {
    const a = state.actorState[beat.actor];
    const prev = posOfRef(a.spawn, null);
    const dst = posOfRef(beat.to, null);
    if (prev && dst) {
      const dx = dst.x - prev.x;
      const dz = dst.z - prev.z;
      const len = Math.hypot(dx, dz);
      if (len > 0.05) {
        a.facing = { x: +(dst.x + (dx / len) * 2).toFixed(2), y: dst.y ?? 0, z: +(dst.z + (dz / len) * 2).toFixed(2) };
      }
    }
    if (beat.to) a.spawn = beat.to;
    a.anim = "idle";
  } else if ((beat.type === "char_face" || beat.type === "face") && beat.actor && state.actorState[beat.actor]) {
    const a = state.actorState[beat.actor];
    const target = beat.target || beat.targetActor;
    if (beat.followPlayer === true || target === "player") {
      a.facing = state.playerSpawn;
    } else if (target) {
      a.facing = target;
    }
  } else if (beat.type === "prop_action" && beat.prop && state.propState[beat.prop]) {
    const p = state.propState[beat.prop];
    if (beat.action === "hide" || beat.action === "pickup") p.visible = false;
    else if (beat.action === "show") p.visible = true;
    else if (beat.action === "place" || beat.action === "glide") {
      p.visible = true;
      const dst = beat.to || beat.waypoint || beat.at;
      if (dst && (typeof dst === "object" || SET_MAP[dst])) p.spawn = dst;
    } else if (beat.action === "reset") {
      if (beat.waypoint) p.spawn = beat.waypoint;
      if (beat.yOffset !== undefined) p.yOffset = beat.yOffset;
      if (beat.rotationY !== undefined) p.rotationY = beat.rotationY;
      if (beat.scale !== undefined) p.scale = beat.scale;
      if (beat.visible !== undefined) p.visible = beat.visible;
      if (beat.spin !== undefined) p.spin = beat.spin;
      if (beat.float !== undefined) p.float = beat.float;
    } else if (beat.action === "pop_out") {
      if (beat.to && SET_MAP[beat.to]) p.spawn = beat.to;
      else if (beat.waypoint && SET_MAP[beat.waypoint]) p.spawn = beat.waypoint;
      p.visible = true;
    }
  } else if (beat.type === "bgm" && beat.sound) {
    state.activeBgm = { sound: beat.sound, volume: beat.volume ?? 0.24 };
  }
}

export function chunkEpisode(episode, { maxChunkSec = 180, chunks = 0 } = {}) {
  const compiledSkits = compileSkitsWithTiming(episode);
  if (compiledSkits.length === 0) return [{ index: 0, startSec: 0, endSec: 0, duration: 0, episode }];

  const totalDur = Math.max(...compiledSkits.map((m) => m.maxEnd), 1);
  const targetChunkDur =
    chunks > 0 ? Math.max(5, totalDur / Math.min(chunks, compiledSkits.length)) : maxChunkSec;

  // Detect whether skits are chronologically sequential (non-overlapping).
  // `buildEpisode` gag episodes are always sequential; legacy `after`-interleaved Acts may overlap.
  let isSequential = true;
  for (let i = 1; i < compiledSkits.length; i += 1) {
    if (compiledSkits[i].minAt < compiledSkits[i - 1].maxEnd - 2.5) {
      isSequential = false;
      break;
    }
  }

  const groups = [];
  if (!isSequential) {
    // Keep interleaved skits together in one exact compiled chunk to prevent Act interleaving bugs
    groups.push(compiledSkits);
  } else {
    let cur = [];
    let curStart = 0;

    for (let i = 0; i < compiledSkits.length; i += 1) {
      const item = compiledSkits[i];
      if (cur.length === 0) {
        curStart = item.minAt;
        cur.push(item);
        continue;
      }
      const projectedDur = item.maxEnd - curStart;
      if (projectedDur > targetChunkDur && (chunks <= 0 || groups.length + 1 < chunks)) {
        groups.push(cur);
        cur = [item];
        curStart = item.minAt;
      } else {
        cur.push(item);
      }
    }
    if (cur.length > 0) groups.push(cur);
  }

  const state = cloneStateFromEpisode(episode);
  const outChunks = [];

  for (let gi = 0; gi < groups.length; gi += 1) {
    const grp = groups[gi];
    const startSec = grp[0].minAt;
    const nextGroupStart = gi + 1 < groups.length ? groups[gi + 1][0].minAt : Math.max(...grp.map((g) => g.maxEnd));
    const endSec = Math.max(nextGroupStart, ...grp.map((g) => g.maxEnd));

    const chunkPlayerSpawn = state.playerSpawn;
    const chunkPlayerFacing = state.playerFacing;
    const chunkPlayerFov = state.playerFov;
    const chunkCast = Object.values(state.actorState).map((a) => ({ ...a }));
    const chunkProps = Object.values(state.propState).map((p) => ({ ...p }));

    const chunkSkits = grp.map((g, sIdx) => {
      const rebasedBeats = g.beats.map((b) => ({
        ...b,
        at: +Math.max(0, b.at - startSec).toFixed(3),
      }));
      if (gi > 0 && sIdx === 0) {
        if (state.activeBgm && !rebasedBeats.some((b) => b.type === "bgm" && b.at <= 0.6)) {
          rebasedBeats.unshift({ at: 0, type: "bgm", sound: state.activeBgm.sound, volume: state.activeBgm.volume });
        }
      }
      return {
        name: g.name,
        beats: rebasedBeats,
      };
    });

    // Keep chunk duration aligned cleanly without flashing black between continuous acts
    const localEnd = +(endSec - startSec).toFixed(3);
    const maxBeatEnd = Math.max(
      0,
      ...chunkSkits.flatMap((s) => s.beats.map((b) => b.at + Math.max(b.duration ?? 0, b.travelDuration ?? 0)))
    );
    if (episode.transitions !== "continuous" && gi + 1 < groups.length && localEnd - maxBeatEnd > 0.05) {
      chunkSkits.at(-1).beats.push({
        at: +Math.max(0, localEnd - 0.02).toFixed(3),
        type: "fade",
        to: 1,
        duration: 0.02,
      });
    }

    for (const g of grp) {
      for (const b of g.beats) {
        applyBeatToState(b, state);
      }
    }

    const ep = {
      title: `${episode.title} [Chunk ${gi + 1}/${groups.length}]`,
      aspect: episode.aspect || "16:9",
      duration: localEnd,
      transitions: episode.transitions,
      playerSpawn: chunkPlayerSpawn,
      playerFacing: chunkPlayerFacing,
      playerFov: chunkPlayerFov,
      cast: chunkCast,
      props: chunkProps,
      skits: chunkSkits,
    };
    if (episode.maxLookDuration !== undefined) ep.maxLookDuration = episode.maxLookDuration;
    if (episode.allowSlowScans !== undefined) ep.allowSlowScans = episode.allowSlowScans;

    outChunks.push({
      index: gi,
      startSec,
      endSec,
      duration: localEnd,
      episode: ep,
    });
  }

  return outChunks;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const opts = parseArgs(process.argv.slice(2));
  let episode;
  if (opts.episodeFile) {
    episode = JSON.parse(fs.readFileSync(path.resolve(opts.episodeFile), "utf8"));
  } else {
    episode = EPISODE_PRESETS[opts.preset];
    if (!episode) {
      console.error(`Unknown preset "${opts.preset}".`);
      process.exit(1);
    }
  }

  const chunkList = chunkEpisode(episode, {
    maxChunkSec: opts.maxChunkSec,
    chunks: opts.chunks,
  });

  fs.mkdirSync(opts.outDir, { recursive: true });
  const manifest = {
    title: episode.title,
    aspect: episode.aspect || "16:9",
    totalChunks: chunkList.length,
    chunks: [],
  };

  for (const ch of chunkList) {
    const padded = String(ch.index).padStart(3, "0");
    const fileName = `chunk_${padded}.json`;
    fs.writeFileSync(path.join(opts.outDir, fileName), JSON.stringify(ch.episode, null, 2));
    manifest.chunks.push({
      index: ch.index,
      padded,
      file: fileName,
      startSec: ch.startSec,
      endSec: ch.endSec,
      duration: ch.duration,
    });
  }
  fs.writeFileSync(path.join(opts.outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(
    `[Chunk] Split "${episode.title}" into ${chunkList.length} gag-aligned chunks in ${opts.outDir}`
  );
  for (const c of manifest.chunks) {
    console.log(`  - ${c.file}: ${c.startSec.toFixed(2)}s -> ${c.endSec.toFixed(2)}s (${c.duration.toFixed(2)}s)`);
  }

  if (opts.githubMatrix) {
    const matrix = { chunk: manifest.chunks.map((c) => c.padded) };
    if (process.env.GITHUB_OUTPUT) {
      fs.appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify(matrix)}\n`);
    } else {
      console.log(`matrix=${JSON.stringify(matrix)}`);
    }
  }
}
