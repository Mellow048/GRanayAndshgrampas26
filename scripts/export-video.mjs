#!/usr/bin/env node
import fs from "node:fs";
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
    preset: "jump_run_walk_6s",
    episodeFile: "",
    fps: 30,
    pacer: true,
    format: "mp4",
    outDir: path.join(REPO_ROOT, "output"),
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--preset") opts.preset = argv[++i];
    else if (a === "--episode-file") opts.episodeFile = argv[++i];
    else if (a === "--fps") opts.fps = Number(argv[++i]) || 30;
    else if (a === "--pacer") opts.pacer = argv[++i] !== "false";
    else if (a === "--format") opts.format = argv[++i] || "mp4";
    else if (a === "--out-dir") opts.outDir = path.resolve(argv[++i]);
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

function runFfmpeg(args) {
  const res = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (res.status !== 0) {
    throw new Error(`ffmpeg exited with code ${res.status}`);
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const { chromium } = await import("playwright");
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

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      "--ignore-gpu-blocklist",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 1320 },
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
      await page.route("https://cdn.jsdelivr.net/npm/three@0.170.0/**", async (route) => {
        const url = route.request().url();
        const sub = url.replace("https://cdn.jsdelivr.net/npm/three@0.170.0/", "");
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

    console.log(`[Export] Launching studio on http://127.0.0.1:${port}/?headless=1`);
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
      throw new Error(`Studio startup failed: ${startupErr}`);
    }

    const meta = await page.evaluate(
      ({ ep, pacer }) => window.__GRANNY_STUDIO__.beginHeadlessExport({ episode: ep, pacerEnabled: pacer }),
      { ep: episode, pacer: opts.pacer }
    );

    const fps = opts.fps;
    const totalFrames = Math.max(1, Math.ceil(meta.duration * fps));
    const stepDt = 1 / fps;
    console.log(
      `[Export] Rendering "${meta.title}" (${meta.duration}s @ ${fps}fps = ${totalFrames} frames)...`
    );

    for (let idx = 0; idx < totalFrames; idx += 1) {
      const frame = await page.evaluate(
        (dt) => window.__GRANNY_STUDIO__.renderExportFrame(dt),
        idx === 0 ? 0 : stepDt
      );
      const base64 = frame.dataUrl.split(",")[1];
      const framePath = path.join(framesDir, `frame_${String(idx).padStart(5, "0")}.png`);
      fs.writeFileSync(framePath, Buffer.from(base64, "base64"));

      if ((idx + 1) % 30 === 0 || idx === totalFrames - 1) {
        console.log(`[Export] Frame ${idx + 1}/${totalFrames} (t=${frame.simTime.toFixed(2)}s)`);
      }
    }

    const audioEvents = await page.evaluate(() => window.__GRANNY_STUDIO__.finishHeadlessExport());
    console.log(`[Export] Captured ${audioEvents.length} SFX audio events.`);

    if (errors.length > 0) {
      throw new Error(`Browser errors during render:\n${errors.join("\n")}`);
    }

    const slug = (meta.title || "granny-short")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Build FFmpeg audio mix inputs & filter_complex
    const ffInputs = [
      "-y",
      "-framerate",
      String(fps),
      "-i",
      path.join(framesDir, "frame_%05d.png"),
      "-f",
      "lavfi",
      "-t",
      String(meta.duration),
      "-i",
      "anullsrc=channel_layout=stereo:sample_rate=44100",
    ];

    const filterParts = ["[1:a]aformat=sample_rates=44100:channel_layouts=stereo[a0]"];
    const mixLabels = ["[a0]"];

    audioEvents.forEach((ev, idx) => {
      const sfxFullPath = path.resolve(REPO_ROOT, ev.path);
      if (!fs.existsSync(sfxFullPath)) return;
      const inIdx = 2 + idx;
      ffInputs.push("-i", sfxFullPath);

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
      const outLbl = `[a${idx + 1}]`;
      filterParts.push(`${chain.join(",")}${outLbl}`);
      mixLabels.push(outLbl);
    });

    filterParts.push(
      `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=0:normalize=0,` +
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
          fps,
          totalFrames,
          sfxCount: audioEvents.length,
          files: producedFiles,
        },
        null,
        2
      )
    );
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(framesDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
