# AGENTS.md — Developer & AI Agent Guide for Granny 3D Cartoon Studio

Welcome! This repository is a **zero-build Three.js (`v0.170.0`) 9:16 vertical Shorts studio** starring **Granny** and **Grandpa** inside the **Granny 1 House**, driven entirely by JSON episode scripts and equipped with a **GitHub Actions Cloud Video Exporter** (SwiftShader WebGL + FFmpeg).

Read this guide before modifying rigs, writing new episodes, or adding features.

---

## 1. Repository Layout

| Path | Purpose |
| --- | --- |
| `index.html` | Studio web UI (`three@0.170.0` CDN importmap, 720×1280 9:16 stage, captions, transport, Waypoint Calibrator, JSON editor, SFX test pad). |
| `src/config.js` | `CONFIG`, `ASSET_MANIFEST`, `SFX_MANIFEST`, calibrated `SET_MAP` waypoints, `JUMP_RUN_WALK_EPISODE`, `COOKIES_CHASE_EPISODE`, `EPISODE_PRESETS`, `DEFAULT_EPISODE`. |
| `src/assetLoader.js` | FBX loaders for house & characters, texture URL remapping, `DetachedBindMode` skinning fix, height normalization (`1.65m` / `1.72m`), `SkeletonUtils.clone()` instancing, and `disposeObject3D`. |
| `src/animationLibrary.js` | Loads Mixamo `.fbx` templates, strips `.position`/`.scale`, extracts `Jumping.fbx` vertical arc, disposes template meshes, and runs scale-invariant world-quaternion `retargetMixamoClip`. |
| `src/sfxEngine.js` | Web Audio API loader/player (25 MP3s in `./SoundEffects/`), dual output (`AudioContext.destination` + `MediaStreamAudioDestinationNode`), 1–2s Cartoon SFX Pacer, and `exportMode` offline event capture. |
| `src/cameraDirector.js` | 9:16 Shorts camera (`wide`, `closeup`, `over_shoulder`, `chase_cam`, `dramatic_zoom`, `shake`, `instant`/`whip` cuts) + `OrbitControls` free-inspect toggle. |
| `src/episodeRunner.js` | Deterministic 60Hz fixed-timestep runner (`loadEpisode`, `seek`, `update`, `dispose`) resolving all locations strictly via `SET_MAP`. |
| `src/studioUI.js` | Interactive UI controller + 720×1280 `compositeCanvas` + local browser `MediaRecorder` WebM export. |
| `src/main.js` | Scene/lighting bootstrap + `?headless=1` & `window.__GRANNY_STUDIO__` API used by the cloud renderer. |
| `scripts/export-video.mjs` | Playwright + SwiftShader WebGL + FFmpeg headless exporter producing lossless frame sequences mixed with exact `./SoundEffects/*.mp3` timestamps. |
| `.github/workflows/export-video.yml` | GitHub Actions `workflow_dispatch` pipeline rendering `.mp4` / `.webm` in the cloud and publishing both workflow artifacts and a direct download on the `latest-export` GitHub Release. |

---

## 2. Critical Asset & Rig Quirks (Do Not Break These!)

All `.fbx` assets in `./Assets/` have specific quirks discovered during inspection:

1. **Granny (`./Assets/granny-animated-fbx/source/GrannyTest6.fbx`)**:
   - **Rig**: 3ds Max Biped (`Bip01_Pelvis`, `Bip01_Spine*`, `Bip01_L_UpperArm`, etc.). Raw rig faces `+X` (`forwardYawOffset: -Math.PI * 0.5`). Normalized to `1.65m`, feet at `y = 0`, facing `+Z`.
   - **Skinning Fix**: `Granny` `SkinnedMesh` explodes to ~361 units if left in `AttachedBindMode`. `assetLoader.js` **must** call `mesh.bindMode = THREE.DetachedBindMode; mesh.bind(mesh.skeleton, mesh.matrixWorld.clone());` immediately after FBX load and re-apply `DetachedBindMode` on clones.
   - **Texture Alias**: The FBX requests `TexturesCom_WoodFine0077_6_seamless_S_Normal.png`, while disk has `..._Norm.png`. Keep this alias in `ASSET_MANIFEST.characters.granny.textureAliases`.
   - **Embedded Clips**: `idle`, `Hit`, `Walk`, `arrowHit`, `Look`, `lookBed`, `idle_1`. They include non-bone `.scale`/`.position` tracks (`Granny.scale`, `SlendrinaMom.*`) which `animationLibrary.js` strips down to valid bone `.quaternion` tracks.

2. **Grandpa (`./Assets/grandpa-official-model-rigged-granny-3/source/grandpach3.fbx`)**:
   - **Rig**: Blender `Armature` (`Bone` pelvis, `Spine1`, `Spine2`, `upArm_L`, `upArm_R_001`, etc.), `0` embedded clips, faces `+Z`, normalized to `1.72m`.
   - **Texture Remap**: Embedded paths contain `/home/mellbot/.../Texture2D/<file>.png`. `assetLoader.js` remaps every texture URL by basename into `./Assets/grandpa-official-model-rigged-granny-3/textures/`.
   - **Procedural Idle**: Because `grandpach3.fbx` has no embedded idle clip, `animationLibrary.js` synthesizes a subtle breathing `idle` clip on `Spine1` / `Spine2` / `Neck`.

3. **Mixamo Retargeting (`src/animationLibrary.js`)**:
   - **Do NOT use `THREE.SkeletonUtils.retargetClip` / `SkeletonUtils.retarget`**: Those reset `matrixWorld` without compensating for non-unit FBX `Armature` / parent scales (`Granny` `0.02 * 0.264`, `Grandpa` `80.51`), blowing up arm bone scales, and emit `.bones[Name]` tracks that fail on `Group`-rooted mixers.
   - **Duplicate Zero-Length Child Bones**: Mixamo FBXs in `./Assets/AnimationTemplates/` contain zero-length duplicate child bones (`mixamorigLeftArm -> mixamorigLeftArm -> mixamorigLeftForeArm`). `getBoneChildDir()` **must** skip children with `distSq <= 1e-6` so T-pose -> A-pose delta quaternions align arms properly.
   - **Template Disposal**: Every Mixamo FBX is exported With Skin. Extract clips, then immediately call `animationLibrary.disposeSourceTemplates()`.

4. **Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`)**:
   - Scaled by `CONFIG.house.scale = 0.42`, with raw ground floor `y = 13.32` shifted by `-13.32 * 0.42 = -5.5944` so ground floor sits at `y = 0.0`.
   - Ceiling height is `~2.84m` (`y = 2.85` is the 2nd floor). Camera shots on the ground floor should stay below `y = 2.6m`.
   - **Wall Warning**: There is an interior wall around `x = 2.5` separating the central hallway from the living room (open doorways near `z = 0.8` and `z = 2.8`), and furniture around `(3.2, 0, 1.8..2.8)`. Prefer chaining waypoints cleanly rather than moving straight through walls!

---

## 3. Writing New Episodes (JSON Contract)

Episodes **must** reference named `SET_MAP` waypoints (never raw `{ x, y, z }` coordinates in JSON scripts).

### Valid `SET_MAP` Waypoints
- **Central Corridor (wall-free north-south path, `z = -1.89` to `+4.70`)**:
  - `back_hall` `(0.0, 0, -1.89)`, `back_hall_left` `(-0.48, 0, -1.89)`, `back_hall_right` `(0.48, 0, -1.89)`
  - `hallway` `(0.0, 0, 2.31)`, `hallway_left` `(-0.52, 0, 2.31)`, `hallway_right` `(0.52, 0, 2.31)`
  - `front_door` `(0.21, 0, 4.70)`, `front_door_left` `(-0.48, 0, 4.10)`, `front_door_right` `(0.48, 0, 4.10)`
- **Other Calibrated Rooms**:
  - `stairs` `(-3.15, 0, -1.89)`
  - `dining_nook` `(-3.99, 0, 3.36)`
  - `kitchen` `(-6.09, 0, 0.84)`
  - `living_room_entry` `(3.15, 0, 1.68)`, `living_room` `(4.41, 0, 1.68)`
  - `bedroom` `(-4.20, 2.85, 2.10)` *(2nd floor)*

### Valid Cast Assets & Actions
- **Cast `asset`**: `"granny"` | `"grandpa"`
- **Shared Mixamo `anim` keys**: `"walk"`, `"run"`, `"run2"`, `"sneak"`, `"jump"`, `"laugh"`, `"punch"`, `"sit"`, `"terrified"`, `"idle"`
- **Granny-only embedded `anim` keys**: `"hit"`, `"look"`, `"look_bed"`, `"granny_walk"`

### Valid Camera Modes & Cuts
- **`mode`**: `"wide"` | `"closeup"` | `"over_shoulder"` | `"chase_cam"` | `"dramatic_zoom"`
- **`cut`**: `"instant"` | `"whip"`
- **`target`**: actor `id` (e.g. `"granny"`, `"grandpa"`) or any `SET_MAP` waypoint name
- **`lookTarget`** (for `"over_shoulder"`): actor `id` or waypoint name
- **`shake`**: optional float (`0.0` to `0.5`)

### Valid SFX Keys (`./SoundEffects/`)
`checkmark`, `ding`, `eat`, `click`, `pop`, `tada`, `bonk`, `discord`, `glitch`, `granny_good_part`, `granny_ambience`, `granny_chase`, `granny_i_see_you`, `jumpscare`, `granny_laugh`, `kaching`, `typing`, `explode`, `explode_meme`, `rizz`, `squidward_walk`, `aww`, `swoosh`, `vine_boom`, `whoosh`.

### Minimal Episode JSON Template
```json
{
  "title": "My Custom Short",
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

---

## 4. Exporting Videos on GitHub Actions (Zero Local CPU/GPU)

Never force users to encode WebM on their laptop when they want a cloud export. Trigger the workflow on GitHub:

```bash
# Render a built-in preset
gh workflow run export-video.yml --ref main -f preset=jump_run_walk_6s -f format=mp4

# Render custom Episode JSON
gh workflow run export-video.yml --ref main -f preset=custom_json -f format=mp4 -f episode_json='{"title":"Custom","duration":6,"cast":[...],"timeline":[...]}'
```

Outputs are:
1. Published to the **`latest-export` GitHub Release** for direct `.mp4` / `.webm` download (no zip required).
2. Uploaded as a workflow artifact (`granny-short-<preset>-<run_number>`).

---

## 5. Verification Checklist Before Merging Changes

1. Syntax check all modules:
   ```bash
   for f in src/*.js scripts/*.mjs; do node --check "$f" || exit 1; done
   ```
2. Verify all `ASSET_MANIFEST`, `SFX_MANIFEST`, and `EPISODE_PRESETS` waypoint/action/sound references exist on disk.
3. Keep generated video outputs (`output/`) out of Git.
4. Keep `index.html` zero-build (pure ES modules + `three@0.170.0` importmap).
