#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".fbx": "application/octet-stream",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
};

function parseArgs(argv) {
  const opts = {
    preset: "zombie_fort_5m",
    episodeFile: "",
    aspect: "",
    fps: 30,
    pacer: true,
    format: "mp4",
    workers: 0,
    outDir: path.join(REPO_ROOT, "output"),
    outName: "",
    concatDir: "",
    reencode: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--preset") opts.preset = argv[++i];
    else if (a === "--episode-file") opts.episodeFile = argv[++i];
    else if (a === "--aspect") opts.aspect = argv[++i] || "";
    else if (a === "--fps") opts.fps = Number(argv[++i]) || 30;
    else if (a === "--pacer") opts.pacer = argv[++i] !== "false";
    else if (a === "--format") opts.format = argv[++i] || "mp4";
    else if (a === "--workers") opts.workers = Number(argv[++i]) || 0;
    else if (a === "--out-dir") opts.outDir = path.resolve(argv[++i]);
    else if (a === "--out-name") opts.outName = argv[++i] || "";
    else if (a === "--concat") opts.concatDir = path.resolve(argv[++i]);
    else if (a === "--reencode") opts.reencode = true;
  }
  return opts;
}

function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqPath = decodeURIComponent((req.url || "/").split("?")[0]);
      const rel = reqPath === "/" ? "index.html" : reqPath.replace(/^\/+/, "");
      const fullPath = path.resolve(rootDir, rel);

      if (!fullPath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end("Forbidden");
        return;
      }

      if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
        "Access-Control-Allow-Origin": "*",
      });
      fs.createReadStream(fullPath).pipe(res);
    });
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

// One resolved binary for every encode call.
let FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

/**
 * Prefer ffmpeg on PATH, but fall back to the pure-npm `@ffmpeg-installer` build so the
 * exporter still works where the GitHub static binary cannot be downloaded.
 */
async function resolveFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (spawnSync("ffmpeg", ["-version"], { stdio: "ignore" }).status === 0) return "ffmpeg";
  try {
    const mod = await import("@ffmpeg-installer/ffmpeg");
    const install = mod.default || mod;
    if (install?.path && fs.existsSync(install.path)) {
      console.log(`[Export] ffmpeg not on PATH, using ${install.path}`);
      return install.path;
    }
  } catch {
    /* not installed */
  }
  return "ffmpeg";
}

/** amix gained `normalize` in ffmpeg 4.4; older builds always divide by the input count. */
let AMIX_NORMALIZE = null;
function amixSupportsNormalize() {
  if (AMIX_NORMALIZE !== null) return AMIX_NORMALIZE;
  const res = spawnSync(FFMPEG_BIN, ["-hide_banner", "-h", "filter=amix"], { encoding: "utf8" });
  const text = `${res.stdout || ""}${res.stderr || ""}`;
  // Only trust a real filter listing; if the probe fails, assume the modern option.
  AMIX_NORMALIZE = res.status === 0 ? /\bnormalize\b/.test(text) : true;
  return AMIX_NORMALIZE;
}

/**
 * Build an `amix` that keeps the original loudness on old *and* new ffmpeg.
 * Pass outLabel = null to leave the chain open for further filters.
 */
function amixChain(labels, outLabel) {
  const n = labels.length;
  const head = `${labels.join("")}amix=inputs=${n}:duration=first:dropout_transition=0`;
  const tail = amixSupportsNormalize() ? ":normalize=0" : `,volume=${n}`;
  return outLabel ? `${head}${tail}[${outLabel}]` : `${head}${tail}`;
}

function runFfmpeg(args) {
  const res = spawnSync(FFMPEG_BIN, args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with code ${res.status}`);
  }
}

/**
 * Pick a Chromium to drive.
 * CHROMIUM_EXECUTABLE_PATH → `@sparticuz/chromium` (bundled in the npm tarball, so it
 * works where the Playwright browser CDN is unreachable) → Playwright's own download.
 */
async function resolveBrowserRuntime() {
  if (process.env.CHROMIUM_EXECUTABLE_PATH) {
    return { executablePath: process.env.CHROMIUM_EXECUTABLE_PATH, extraArgs: [] };
  }
  try {
    const mod = await import("@sparticuz/chromium");
    const sparticuz = mod.default || mod;
    const executablePath = await sparticuz.executablePath();
    if (executablePath && fs.existsSync(executablePath)) {
      console.log(`[Export] Using bundled Chromium at ${executablePath}`);
      return { executablePath, extraArgs: Array.isArray(sparticuz.args) ? sparticuz.args : [] };
    }
  } catch {
    /* fall back to Playwright's own browser */
  }
  return { executablePath: null, extraArgs: [] };
}

async function openStudioSession({
  chromium,
  browserRuntime,
  port,
  localThreeDir,
  hasLocalThree,
  episode,
  pacer,
  aspect,
}) {
  const browser = await chromium.launch({
    headless: true,
    ...(browserRuntime?.executablePath ? { executablePath: browserRuntime.executablePath } : {}),
    args: [
      ...(browserRuntime?.extraArgs || []),
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 1280 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`console.error: ${msg.text()}`);
    }
  });

  if (hasLocalThree) {
    for (const prefix of [
      "https://unpkg.com/three@0.170.0/",
      "https://cdn.jsdelivr.net/npm/three@0.170.0/",
    ]) {
      await page.route(`${prefix}**`, async (route) => {
        const url = route.request().url();
        const sub = url.replace(prefix, "");
        const localFile = path.resolve(localThreeDir, sub);
        if (localFile.startsWith(localThreeDir) && fs.existsSync(localFile)) {
          await route.fulfill({
            status: 200,
            contentType: "application/javascript; charset=utf-8",
            body: fs.readFileSync(localFile),
          });
          return;
        }
        await route.continue();
      });
    }
  }

  await page.goto(`http://127.0.0.1:${port}/?headless=1`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });

  await page.waitForFunction(
    () => Boolean(window.__GRANNY_STUDIO__?.ready || window.__GRANNY_STUDIO_ERROR__),
    { timeout: 120000 }
  );

  const startupErr = await page.evaluate(() => window.__GRANNY_STUDIO_ERROR__ || null);
  if (startupErr) {
    await browser.close();
    throw new Error(`Studio startup failed: ${startupErr}`);
  }

  const meta = await page.evaluate(
    ({ ep, pacerEnabled, aspectOverride }) =>
      window.__GRANNY_STUDIO__.beginHeadlessExport({
        episode: ep,
        pacerEnabled,
        aspectOverride,
      }),
    { ep: episode, pacerEnabled: pacer, aspectOverride: aspect }
  );

  const remaining = (meta.stagingIssues || []).filter((i) => !i.applied && i.severity === "error");
  if (remaining.length) {
    console.warn(
      `[Export] Staging gate: ${remaining.length} unfixable issue(s) remain — the render will contain them:\n` +
        remaining.map((i) => `  - [${i.at.toFixed(2)}s] ${i.code}: ${i.message}`).join("\n")
    );
    if (process.env.STRICT_STAGING === "1") {
      await browser.close();
      throw new Error(`Staging gate failed with ${remaining.length} error(s). Set STRICT_STAGING=0 to render anyway.`);
    }
  }

  return { browser, page, errors, meta };
}

function buildSfxFilterChain(ev, inIdx, outLbl) {
  const delayMs = Math.max(0, Math.round(ev.time * 1000));
  const pitch = Math.max(0.5, Math.min(2.0, Number(ev.pitch) || 1.0));
  const vol = Math.max(0, Math.min(2.0, Number(ev.volume) || 0.7));
  const chain = [
    `[${inIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo`,
  ];
  if (ev.maxDuration && ev.maxDuration > 0) {
    chain.push(`atrim=0:${ev.maxDuration}`);
  }
  if (Math.abs(pitch - 1.0) > 0.005) {
    chain.push(`asetrate=44100*${pitch.toFixed(4)},aresample=44100`);
  }
  chain.push(`volume=${vol.toFixed(3)}`);
  if (delayMs > 0) {
    chain.push(`adelay=${delayMs}|${delayMs}`);
  }
  return `${chain.join(",")}${outLbl}`;
}

function preMixSfxBatches(sfxEvents, duration, framesDir, batchSize = 40) {
  const validEvents = sfxEvents.filter((ev) =>
    fs.existsSync(path.resolve(REPO_ROOT, ev.path))
  );
  if (validEvents.length <= batchSize) {
    return { batchWavPaths: [], remainingEvents: validEvents };
  }

  const batchWavPaths = [];
  for (let i = 0; i < validEvents.length; i += batchSize) {
    const chunk = validEvents.slice(i, i + batchSize);
    const batchIdx = Math.floor(i / batchSize);
    const wavPath = path.join(framesDir, `sfx_batch_${batchIdx}.wav`);

    const inputs = [
      "-y",
      "-f",
      "lavfi",
      "-t",
      String(duration),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
    ];
    const filters = ["[0:a]aformat=sample_rates=44100:channel_layouts=stereo[a0]"];
    const labels = ["[a0]"];

    chunk.forEach((ev, idx) => {
      const inIdx = idx + 1;
      inputs.push("-i", path.resolve(REPO_ROOT, ev.path));
      const lbl = `[s${inIdx}]`;
      filters.push(buildSfxFilterChain(ev, inIdx, lbl));
      labels.push(lbl);
    });

    filters.push(
      amixChain(labels, "bout")
    );

    runFfmpeg([
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[bout]",
      "-t",
      String(duration),
      "-c:a",
      "pcm_f32le",
      wavPath,
    ]);
    batchWavPaths.push(wavPath);
  }
  console.log(
    `[Export] Pre-mixed ${validEvents.length} SFX events into ${batchWavPaths.length} intermediate stems.`
  );
  return { batchWavPaths, remainingEvents: [] };
}

function concatRenderedChunks(concatDir, outDir, outName = "", { reencode = false } = {}) {
  if (!fs.existsSync(concatDir)) {
    throw new Error(`Concat directory not found: ${concatDir}`);
  }
  const files = fs
    .readdirSync(concatDir, { withFileTypes: true })
    .flatMap((d) =>
      d.isDirectory()
        ? fs
            .readdirSync(path.join(concatDir, d.name))
            .map((f) => path.join(concatDir, d.name, f))
        : [path.join(concatDir, d.name)]
    )
    .filter((f) => /\.(mp4|webm)$/i.test(f))
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true }));

  if (files.length === 0) {
    throw new Error(`No rendered chunk videos found in ${concatDir}`);
  }
  const ext = path.extname(files[0]).slice(1).toLowerCase() || "mp4";
  const sameExt = files.filter((f) => f.toLowerCase().endsWith(`.${ext}`));

  fs.mkdirSync(outDir, { recursive: true });
  const listFile = path.join(outDir, "concat-list.txt");
  fs.writeFileSync(
    listFile,
    sameExt.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n") + "\n"
  );

  const slug = (outName || "long-episode-stitched")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outPath = path.join(outDir, `${slug}.${ext}`);

  const ffArgs = ["-y", "-f", "concat", "-safe", "0", "-i", listFile];
  if (reencode) {
    // Chunks that do not share identical stream parameters cannot be stream-copied.
    ffArgs.push("-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p");
    if (ext === "mp4") ffArgs.push("-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart");
  } else {
    ffArgs.push("-c", "copy");
    if (ext === "mp4") ffArgs.push("-movflags", "+faststart");
  }
  ffArgs.push(outPath);

  runFfmpeg(ffArgs);
  const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`[Concat] Stitched ${sameExt.length} chunks -> ${outPath} (${sizeMb} MB)`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.concatDir) {
    // The concat path used to return before resolving the ffmpeg binary, so a
    // cloud stitch job died with "spawn undefined". Resolve it first.
    FFMPEG_BIN = await resolveFfmpeg();
    concatRenderedChunks(opts.concatDir, opts.outDir, opts.outName || opts.preset, {
      reencode: Boolean(opts.reencode),
    });
    return;
  }

  const { chromium } = await import("playwright").catch(() => import("playwright-core"));
  const browserRuntime = await resolveBrowserRuntime();
  FFMPEG_BIN = await resolveFfmpeg();
  const { EPISODE_PRESETS } = await import(path.join(REPO_ROOT, "src/config.js"));

  let episode = null;
  const envJson = (process.env.EPISODE_JSON || "").trim();
  if (opts.episodeFile) {
    episode = JSON.parse(fs.readFileSync(path.resolve(opts.episodeFile), "utf8"));
  } else if (envJson) {
    episode = JSON.parse(envJson);
  } else if (opts.preset && EPISODE_PRESETS[opts.preset]) {
    episode = EPISODE_PRESETS[opts.preset];
  } else {
    throw new Error(
      `Unknown preset "${opts.preset}". Available: ${Object.keys(EPISODE_PRESETS).join(", ")}`
    );
  }

  fs.mkdirSync(opts.outDir, { recursive: true });
  const framesDir = path.join("/tmp", `granny-frames-${Date.now()}`);
  fs.mkdirSync(framesDir, { recursive: true });

  const { server, port } = await startStaticServer(REPO_ROOT);
  const localThreeDir = path.join(REPO_ROOT, "node_modules/three");
  const hasLocalThree = fs.existsSync(localThreeDir);

  const activeBrowsers = [];

  try {
    console.log(`[Export] Launching primary studio on http://127.0.0.1:${port}/?headless=1`);
    const primary = await openStudioSession({
      chromium,
      browserRuntime,
      port,
      localThreeDir,
      hasLocalThree,
      episode,
      pacer: opts.pacer,
      aspect: opts.aspect,
    });
    activeBrowsers.push(primary.browser);

    const meta = primary.meta;
    const fps = opts.fps;
    const totalFrames = Math.max(1, Math.ceil(meta.duration * fps));
    const stepDt = 1 / fps;

    const autoWorkers = Math.min(4, Math.max(1, os.cpus().length));
    let workerCount = opts.workers > 0 ? opts.workers : autoWorkers;
    if (totalFrames < 120) workerCount = 1;
    workerCount = Math.max(1, Math.min(workerCount, totalFrames));

    console.log(
      `[Export] Rendering "${meta.title}" [${meta.aspectKey} ${meta.width}x${meta.height}] (${meta.duration.toFixed(2)}s @ ${fps}fps = ${totalFrames} frames) across ${workerCount} worker(s)...`
    );

    const renderStartMs = Date.now();
    const ranges = [];
    for (let w = 0; w < workerCount; w += 1) {
      const startIdx = Math.floor((w * totalFrames) / workerCount);
      const endIdx = Math.floor(((w + 1) * totalFrames) / workerCount);
      ranges.push({ workerId: w, startIdx, endIdx });
    }

    async function runWorker(range, existingSession = null) {
      const session =
        existingSession ||
        (await openStudioSession({
          chromium,
          browserRuntime,
          port,
          localThreeDir,
          hasLocalThree,
          episode,
          pacer: opts.pacer,
          aspect: opts.aspect,
        }));
      if (!existingSession) {
        activeBrowsers.push(session.browser);
      }

      const { page, errors } = session;
      const { workerId, startIdx, endIdx } = range;

      if (startIdx > 0) {
        await page.evaluate(
          ({ count, dt }) => window.__GRANNY_STUDIO__.advanceExportFrames(count, dt),
          { count: startIdx - 1, dt: stepDt }
        );
      }

      for (let idx = startIdx; idx < endIdx; idx += 1) {
        const frame = await page.evaluate(
          (dt) => window.__GRANNY_STUDIO__.renderExportFrame(dt),
          idx === 0 ? 0 : stepDt
        );
        const base64 = frame.dataUrl.split(",")[1];
        const ext = frame.dataUrl.startsWith("data:image/jpeg") ? "jpg" : "png";
        const framePath = path.join(framesDir, `frame_${String(idx).padStart(5, "0")}.${ext}`);
        fs.writeFileSync(framePath, Buffer.from(base64, "base64"));

        const doneInChunk = idx - startIdx + 1;
        const chunkLen = endIdx - startIdx;
        if (doneInChunk % 60 === 0 || idx === endIdx - 1) {
          const elapsedS = ((Date.now() - renderStartMs) / 1000).toFixed(1);
          console.log(
            `[Worker ${workerId}] ${doneInChunk}/${chunkLen} (global frame ${idx + 1}/${totalFrames}, t=${frame.simTime.toFixed(2)}s, elapsed=${elapsedS}s)`
          );
        }
      }

      let audioCapture = null;
      if (workerId === 0) {
        if (endIdx < totalFrames) {
          await page.evaluate(
            ({ count, dt }) => window.__GRANNY_STUDIO__.advanceExportFrames(count, dt),
            { count: totalFrames - endIdx, dt: stepDt }
          );
        }
        audioCapture = await page.evaluate(() =>
          window.__GRANNY_STUDIO__.finishHeadlessExport()
        );
      }

      if (errors.length > 0) {
        throw new Error(`Browser errors in worker ${workerId}:\n${errors.join("\n")}`);
      }

      if (!existingSession) {
        await session.browser.close();
      }
      return audioCapture;
    }

    const workerResults = await Promise.all(
      ranges.map((r) => runWorker(r, r.workerId === 0 ? primary : null))
    );

    const audioCapture = workerResults[0];
    await primary.browser.close();

    const frameExt = fs.existsSync(path.join(framesDir, "frame_00000.jpg")) ? "jpg" : "png";
    const sfxEvents = audioCapture?.sfx || [];
    const bgmSegments = audioCapture?.bgm || [];
    const bgmDucks = audioCapture?.ducks || [];

    console.log(
      `[Export] All ${totalFrames} frames rendered in ${((Date.now() - renderStartMs) / 1000).toFixed(1)}s. Captured ${sfxEvents.length} SFX events, ${bgmSegments.length} BGM segments, ${bgmDucks.length} duck cuts.`
    );

    const slug = (opts.outName || meta.title || "granny-pov-episode")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const ffInputs = [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(framesDir, `frame_%05d.${frameExt}`),
      "-f",
      "lavfi",
      "-t",
      String(meta.duration),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
    ];

    const filterParts = ["[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a0]"];
    const mixLabels = ["[a0]"];
    let nextInputIdx = 2;

    // 1. Mix looping BGM segments with cutBgm ducking windows
    const duckExpr =
      bgmDucks.length > 0
        ? bgmDucks
            .map((d) => `between(t,${d.startTime.toFixed(3)},${d.endTime.toFixed(3)})`)
            .join("+")
        : "";

    for (const seg of bgmSegments) {
      const bgmFullPath = path.resolve(REPO_ROOT, seg.path);
      if (!fs.existsSync(bgmFullPath)) continue;
      const segDur = Math.max(0.05, (seg.endTime ?? meta.duration) - seg.startTime);
      const delayMs = Math.max(0, Math.round(seg.startTime * 1000));
      const vol = Math.max(0, Math.min(1.5, Number(seg.volume) || 0.24));

      ffInputs.push("-stream_loop", "-1", "-t", segDur.toFixed(3), "-i", bgmFullPath);
      const inIdx = nextInputIdx++;
      const outLbl = `[bgm${inIdx}]`;

      const chain = [
        `[${inIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo`,
        `volume=${vol.toFixed(3)}`,
      ];
      if (delayMs > 0) {
        chain.push(`adelay=${delayMs}|${delayMs}`);
      }
      if (duckExpr) {
        chain.push(`volume=enable='${duckExpr}':volume=0`);
      }
      filterParts.push(`${chain.join(",")}${outLbl}`);
      mixLabels.push(outLbl);
    }

    // 2. Mix SFX clips (batched into intermediate stems when > 40 events)
    const { batchWavPaths, remainingEvents } = preMixSfxBatches(
      sfxEvents,
      meta.duration,
      framesDir,
      40
    );

    for (const wavPath of batchWavPaths) {
      const inIdx = nextInputIdx++;
      ffInputs.push("-i", wavPath);
      const outLbl = `[stem${inIdx}]`;
      filterParts.push(`[${inIdx}:a]anull${outLbl}`);
      mixLabels.push(outLbl);
    }

    for (const ev of remainingEvents) {
      const sfxFullPath = path.resolve(REPO_ROOT, ev.path);
      if (!fs.existsSync(sfxFullPath)) continue;
      const inIdx = nextInputIdx++;
      ffInputs.push("-i", sfxFullPath);
      const outLbl = `[sfx${inIdx}]`;
      filterParts.push(buildSfxFilterChain(ev, inIdx, outLbl));
      mixLabels.push(outLbl);
    }

    filterParts.push(
      `${amixChain(mixLabels, null)},` +
        `acompressor=threshold=-10dB:ratio=4:attack=5:release=120,alimiter=limit=0.95[aout]`
    );

    const formats = opts.format === "both" ? ["mp4", "webm"] : [opts.format];
    const producedFiles = [];

    for (const fmt of formats) {
      const outPath = path.join(opts.outDir, `${slug}.${fmt}`);
      const codecArgs =
        fmt === "webm"
          ? ["-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", "-crf", "24", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k"]
          : ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k"];

      runFfmpeg([
        ...ffInputs,
        "-filter_complex",
        filterParts.join(";"),
        "-map",
        "0:v:0",
        "-map",
        "[aout]",
        "-t",
        String(meta.duration),
        ...codecArgs,
        outPath,
      ]);

      const sizeMb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
      producedFiles.push({ path: outPath, file: path.basename(outPath), sizeMb });
      console.log(`[Export] Wrote ${outPath} (${sizeMb} MB)`);
    }

    fs.writeFileSync(
      path.join(opts.outDir, "export-summary.json"),
      JSON.stringify(
        {
          title: meta.title,
          duration: meta.duration,
          aspectKey: meta.aspectKey,
          width: meta.width,
          height: meta.height,
          fps,
          totalFrames,
          sfxCount: sfxEvents.length,
          bgmCount: bgmSegments.length,
          staging: meta.staging || null,
          stagingIssues: meta.stagingIssues || [],
          files: producedFiles,
        },
        null,
        2
      )
    );
  } finally {
    for (const b of activeBrowsers) {
      try {
        await b.close();
      } catch {
        // ignore already-closed browser
      }
    }
    server.close();
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
