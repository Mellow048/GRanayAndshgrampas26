# Granny POV 3D Cartoon Studio (Remastered)

A zero-build Three.js (`v0.170.0`) first-person **Granny POV Kids-Comedy 3D Cartoon Studio** set inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`), featuring Mixamo-retargeted Granny & Grandpa rigs, real baked-mesh floor navigation, strict camera discipline & grounding validators, procedural 3D props, Web Audio SFX/BGM mixing, and automated GitHub Actions FFmpeg rendering.

> **Writing a new episode?** Start with [`AGENTS.md`](AGENTS.md) — it is the single source of truth for both continuous shows (`src/shows/`) and cut-based gag modules (`src/gags/`).

---

## What Changed in the Remastered Framework

- **Steady, focused POV camera (`src/playerCamera.js`):** Explicit `player_look` beats now lock gaze during walks (`manualLookOverride`) so `autoLook` never snaps the lens back forward mid-walk. Tracking automatically releases when a prop is hidden/picked up, eliminating staring at empty air.
- **Real baked-mesh floor navigation at runtime (`src/nav/houseNav.js` + `src/episodeRunner.js`):** Ground-floor walks now route over the exact same baked house floor mesh used by the validator — no more wall-clipping, floating characters, or attempts to climb a nonexistent staircase.
- **No more phantom props or silent no-ops (`src/schema.js`, `src/comedyProps.js`, `src/episodeRunner.js`):** Implemented real 3D meshes for `soda_can`, `bed`, and `shelf`, wired `player_pose` (`lie`/`stand`) and `prop_action: "place"`, respected `seat: false` on custom surfaces, and made `validate:episode` reject unknown prop/beat types as hard errors.
- **Strict camera & staging gate (`src/episodeSafety.js`):** Added `UNKNOWN_PROP_TYPE`, `UNKNOWN_BEAT_TYPE`, `RAPID_LOOK_FLICK`, and `LOOK_AT_HIDDEN_PROP` checks, fixed actor framing checks, and stopped auto-repair from injecting random `peek_lean` camera leans.
- **Clean repository:** Removed unrelated pelican/octopus demos & tests, dead `cameraDirector.js`, and broken upstairs legacy presets (`zombie_fort_5m`, `floor_is_lava_4m`). All 71 unit tests, 11 presets, pacing audits, and story audits pass cleanly.

---

## Quick Start

```bash
# 1. Preview locally
python3 -m http.server 8000
# Open http://localhost:8000
# Single gag:  http://localhost:8000/?gag=cookieHeist
# Single show: http://localhost:8000/?show=mountain_dew_run

# 2. Inspect supported animations, props, and beats
npm run catalogue

# 3. Run the full verification gate
npm test
npm run validate:episode
npm run story -- --all
node scripts/audit-pacing.mjs --all
```

---

## Presets (`src/config.js`)

| Preset Key | Format | Description |
| --- | --- | --- |
| `mountain_dew_run` | Continuous Show (`src/shows/`) | 4-scene continuous story (wake → argument → fridge → bed) |
| `granny_cookie_heist_15s` | Reference POV (`14.8s`) | Clean 0-error, 0-warning POV cookie heist benchmark |
| `comedy_variety_1m` | Modular Gags (`70.6s`) | 5 ground-floor comedy gags chained with leak-free `0.4s` cuts |
| `cookie_marathon_150s` | Modular Gags + Story Spine (`2:30`) | 8-scene modular marathon passing the full story-spine gate |
| `cookie_heist_15s` | Single Gag (`15.0s`) | Standalone `cookieHeist` showcase |
| `rocket_ball_test` / `rocket_ball_x3` | Modular Gags (`14s` / `43s`) | Single & 3-room `ballRace` showcases |
| `cookie_caper_30s` | Vertical Short (`9:16`, `30.2s`) | Kid-safe vertical comedy short |
| `the_great_escape_68s` | Fast-Cut POV (`67.6s`) | High-tempo multi-room escape |
| `grandpa_key_pov_44s` | Classic POV (`43.9s`) | Mystery chest adventure |
| `jump_run_walk_6s` | Locomotion Test (`7.9s`) | Quick rig & locomotion check |

---

## Cloud Video Rendering (GitHub Actions)

```bash
# Standard episode (<= 3 min)
gh workflow run export-video.yml -f preset=mountain_dew_run -f fps=30 -f sfx_pacer=true -f format=mp4

# Long multi-gag episode (parallel matrix + FFmpeg concat)
gh workflow run export-long-episode.yml -f preset=cookie_marathon_150s -f max_chunk_sec=180 -f fps=30
```
