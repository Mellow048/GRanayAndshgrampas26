# Granny 3D Cartoon Studio

Modular Three.js (`v0.170.0`, no build step) 9:16 vertical Shorts animation studio starring **Granny** and **Grandpa** inside the **Granny 1 House**, driven purely by JSON episode scripts.

## Quick Start

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/` in a browser.

## Cloud Video Export (GitHub Actions — Zero Laptop Load)

To render a 720×1280 30fps `.mp4` / `.webm` video with mixed Web Audio SFX in the cloud instead of using your laptop's CPU/GPU:

1. Open **Actions → Export 9:16 Short (Cloud Render)** on GitHub (or run via `gh workflow run export-video.yml`).
2. Pick a preset (`jump_run_walk_6s` or `cookies_chase_18s`), or select `custom_json` and paste any Episode JSON.
3. Download the rendered `.mp4` / `.webm` from the workflow run's **Artifacts**.

## Architecture (`./src/`)

| Module | Responsibility |
| --- | --- |
| `src/config.js` | `CONFIG`, `ASSET_MANIFEST`, `SFX_MANIFEST`, `SET_MAP` room waypoints, `JUMP_RUN_WALK_EPISODE` (6s default), `COOKIES_CHASE_EPISODE` (18s preset), and `EPISODE_PRESETS`. |
| `src/assetLoader.js` | Loads `GrannyHouse.fbx`, `GrannyTest6.fbx`, and `grandpach3.fbx`; normalizes character heights (`1.65m` Granny, `1.72m` Grandpa, feet at `y=0`, facing `+Z`), repairs `Granny` `DetachedBindMode` skinning, remaps embedded texture URLs, instances characters via `SkeletonUtils.clone()`, and disposes GPU resources cleanly. |
| `src/animationLibrary.js` | Loads Mixamo `.fbx` clips from `./Assets/AnimationTemplates/`, extracts clips & jump Y-arcs, disposes template meshes immediately, and retargets via scale-invariant world-quaternion deltas across `Bip01` (Granny) and Blender `Armature` (Grandpa) rigs. |
| `src/sfxEngine.js` | Preloads/decodes all 25 `.mp3` files from `./SoundEffects/` into Web Audio `AudioBuffer`s, routes through a compressor + gain limiter to both `audioCtx.destination` and `MediaStreamAudioDestinationNode`, and runs a toggleable 1–2s Cartoon SFX Pacer. |
| `src/cameraDirector.js` | 9:16 vertical Shorts camera (`wide`, `closeup`, `over_shoulder`, `chase_cam`, `dramatic_zoom`, `shake`, `instant`/`whip` cuts) + `OrbitControls` free-inspect toggle. |
| `src/episodeRunner.js` | Deterministic 60Hz fixed-timestep timeline runner supporting `move`, `action`, `dialogue`, `camera`, and `sfx` events referencing `SET_MAP` waypoints, plus deterministic `seek()`. |
| `src/studioUI.js` | Play/Pause/Restart/Scrubber/Speed (`0.5x`–`2x`), preset & live JSON editor (`Apply JSON`), 3D Waypoint Calibrator (`Copy SET_MAP JSON`), SFX Test Pad, and 720×1280 WebM export (`canvas.captureStream(30)` + Web Audio). |
| `src/main.js` | Studio bootstrap, lighting, preload orchestration, and render loop. |

## Episode JSON Schema

Episodes only reference named waypoints from `SET_MAP` (never hardcoded coordinates):

```json
{
  "title": "Granny & Grandpa: Jump, Run, Walk (6s)",
  "duration": 6.0,
  "cast": [
    { "id": "granny", "asset": "granny", "spawn": "back_hall_left", "facing": "front_door_left" },
    { "id": "grandpa", "asset": "grandpa", "spawn": "back_hall_right", "facing": "front_door_right" }
  ],
  "timeline": [
    { "time": 0.0, "type": "camera", "mode": "wide", "target": "back_hall", "cut": "instant" },
    { "time": 0.0, "type": "action", "actor": "granny", "anim": "jump", "speed": 0.95, "loop": false },
    { "time": 2.0, "type": "move", "actor": "granny", "to": "hallway_left", "anim": "run", "duration": 2.5 },
    { "time": 4.5, "type": "move", "actor": "granny", "to": "front_door_left", "anim": "walk", "duration": 1.5 }
  ]
}
```

### Available Actions & Camera Modes
- **Shared Mixamo Actions**: `walk`, `run`, `run2`, `sneak`, `jump`, `laugh`, `punch`, `sit`, `terrified`, `idle` (plus Granny embedded clips `hit`, `look`, `look_bed`, `granny_walk`).
- **Camera Modes**: `wide`, `closeup`, `over_shoulder`, `chase_cam`, `dramatic_zoom` (with `"cut": "instant" | "whip"` and optional `"shake"`).
- **Waypoints (`SET_MAP`)**: `front_door`, `front_door_left`, `front_door_right`, `hallway`, `hallway_left`, `hallway_right`, `living_room_entry`, `living_room`, `kitchen`, `dining_nook`, `stairs`, `back_hall`, `back_hall_left`, `back_hall_right`, `bedroom`.
