# Granny POV 3D Cartoon Studio

A zero-build Three.js (`v0.170.0`) first-person **Granny POV Kids-Comedy 3D Cartoon Studio** set inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`), powered by a **modular gag-builder framework**, Mixamo-retargeted Granny & Grandpa rigs, procedural 3D props & thought bubbles, a Web Audio SFX/BGM mixer, automated 3D verification, and parallel GitHub Actions cloud rendering.

---

## Why This Framework Is Fast & Reusable

Instead of hand-coding massive fragile scripts, you write **one short gag function (`10–25s`)** in `src/gags/` and chain any number of gags together with `buildEpisode()` (`src/episodeBuilder.js`):

- **Zero-leak `CUT` transitions:** Every `0.4s` black cut between gags hides unused props, resets shared props, clears held FPS items, and resets Granny/Grandpa poses & hand props.
- **Multi-room staging (`src/gags/locations.js`):** One gag automatically works across Kitchen, Living Room, Foyer, and Upstairs Hall (`GAG_LOCATIONS`).
- **Dead-air-proof helpers (`src/gags/helpers.js`):** `react`, `launchProp`, `chase`, `sneakUp`, `walkTo`, `propAction`, `holdProp`, `lookAt`, `panic`.
- **Instant single-gag preview:** Open `?gag=cookieHeist` or pick any gag from **Gag Lab** in the Studio dropdown.
- **40+ minute ready:** `scripts/chunk-episode.mjs` + `.github/workflows/export-long-episode.yml` splits long gag shows cleanly on gag boundaries, renders chunks in parallel across up to 16 GitHub runners, and stitches them losslessly with FFmpeg.

> **New to authoring?** Read [`src/gags/README.md`](src/gags/README.md) (60-second cheat sheet) and [`AGENTS.md`](AGENTS.md) (full agent playbook).

---

## Built-In Gag Modules & Presets

### Modular Gag Library (`src/gags/`)
- **`cookieHeist`** — Grandpa sneaks cookies from the jar, Granny catches him red-handed, frantic chase.
- **`couchHog`** — Granny & Grandpa sprint for the living room sofa; winner claims the seat smugly.
- **`chestFakeout`** — Opening the chest expecting treasure, only to get bonked by a surprise pop-out.
- **`sneakPhotobomb`** — Grandpa tiptoes behind Granny while she searches the room and photobombs the camera.
- **`ballRace`** — Rocket emoji ball zips across the room, bonks the victim, and triggers a room-to-room chase.

### Episode Presets (`src/config.js` / `src/episodes.js`)
- **`comedy_variety_1m`** *(Default, `69.6s`, `16:9`)* — Chains all 5 gags back-to-back across 5 rooms with zero leaks.
- **`cookie_heist_15s`** *(`15.0s`, `16:9`)* — Standalone 15-second slapstick gag showcase (`cookieHeist`).
- **`granny_cookie_heist_15s`** *(`14.8s`, `16:9`)* — Hand-authored POV reference episode: Grandpa guards the jar, Granny storms in through the doorway, jumpscare finish. The episode the staging gate is regression-tested against (0 errors, 0 warnings, world-aware).
- **`rocket_ball_test`** *(`14.0s`, `16:9`)* — Single `ballRace` gag preview.
- **`rocket_ball_x3`** *(`42.8s`, `16:9`)* — Same `ballRace` gag chained across 3 different rooms with swapped roles.
- **`cookie_caper_30s`** *(`30.2s`, `9:16` Vertical Short)* — Kid-safe vertical comedy Short.
- **`the_great_escape_68s`** *(`67.6s`, `16:9`)* — Fast-cut escape episode.
- **`grandpa_key_pov_44s`** *(`43.9s`, `16:9`)* — Legacy 3-skit chest adventure.

---

## Staging Safety Gate (no more clipping renders)

Every script is validated **before** it renders — spawn standoffs, prop support, doorway routing, camera sightlines, reaction facing, dead air and framing:

```bash
npm run validate:episode -- --preset granny_cookie_heist_15s   # human report + fixes
npm run validate:episode -- --file my-episode.json --out fixed.json
npm test                                                       # 13 geometry/rule tests
```

- `src/stagingSafety.js` — actor capsules, camera standoffs, prop surface snapping, `isEmbedded` geometry probe, wall-aware routing (pure JS, testable in Node).
- `src/episodeSafety.js` — 15 linter codes with deterministic auto-repair; `EpisodeRunner.loadEpisode()` runs it automatically and keeps the report on `runner.staging`.
- The export workflow runs `node --test` **and** the same gate before installing Playwright, and writes the results into `export-summary.json` (`STRICT_STAGING=1` fails the build).

## Run & Preview Locally

```bash
python3 -m http.server 8000
```
- Full Studio: `http://localhost:8000`
- Instant Gag Preview: `http://localhost:8000/?gag=cookieHeist`
- Choose Room Pack: `http://localhost:8000/?gag=cookieHeist&location=living_to_hall`
- Specific Preset: `http://localhost:8000/?preset=cookie_heist_15s`

---

## Verify Pacing & 3D Collisions

```bash
# Audit pacing, dead air, gag schema, and waypoint references across all presets & gags
node scripts/audit-pacing.mjs --all

# Simulate 3D geometry against GrannyHouse.fbx (catches wall clips & cross-cut prop leaks)
npm install --no-save three@0.170.0
node scripts/verify-3d.mjs --gags
node scripts/verify-3d.mjs comedy_variety_1m
```

---

## Cloud Video Rendering (GitHub Actions)

### Short / Standard Episodes (`<= 3 min`)
```bash
gh workflow run export-video.yml -f preset=cookie_heist_15s -f fps=30 -f sfx_pacer=true -f format=mp4
gh workflow run export-video.yml -f preset=granny_cookie_heist_15s -f fps=30 -f sfx_pacer=true -f format=mp4
```
The rendered `.mp4` + `export-summary.json` (including the staging report) are published automatically to the `latest-export` GitHub Release.

### Long Multi-Gag Episodes (`5–40+ min`, Parallel Matrix + FFmpeg Concat)
```bash
gh workflow run export-long-episode.yml -f preset=comedy_variety_1m -f max_chunk_sec=180 -f fps=30
```
Completed videos are uploaded as workflow artifacts (and `export-video.yml` also publishes to the `latest-export` GitHub Release).
