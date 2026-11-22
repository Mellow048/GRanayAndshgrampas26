# AGENTS.md — Granny POV 3D Cartoon Studio Playbook

> **Episode Producers / Script Generators:** Read **`EPISODE_PRODUCTION_GUIDE.md`** before generating any JSON episode! It contains the full `SET_MAP` doorway chains, all 28 SFX/BGM keys (including `SoundEffects/backroundMusics/`), and the mandatory kids-comedy pacing checklist.

This repository is a zero-build Three.js (`v0.170.0` via importmap) first-person **POV Kids-Comedy 3D Cartoon Studio** inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`), with deterministic 60Hz animation, Mixamo retargeting (`Granny` + `Grandpa`), procedural 3D comedy props + 2D comic thought bubbles, a Web Audio SFX/BGM mixer (`./SoundEffects` + `./SoundEffects/backroundMusics`), and a GitHub Actions cloud video exporter (`16:9` widescreen & `9:16` Shorts).

## Mandatory Kids-Comedy Pacing Rules (For Every New Episode)

1. **No beat over 2–2.5s without movement ("Zero Dead Air"):** Never hold the camera on a bobbing prop or idle pose for 3–5s. If a prop pops out, immediately send it across the room (`to` + `travelDuration`), bonk someone, or grab it (`player_hold`).
2. **Show cause-and-effect visually (no shadowboxing thin air):** Never trigger `punch`/`hit` from 3m away in a doorway. Bounce the prop into Granny's face *first*, or sprint Granny (`run2`) within `1.4m` of her target before swinging.
3. **End on motion, not a still pose:** End the final `2–3s` before `fade` (`to: 1`) on Granny lunging toward the camera (`run2` + `jumpscare`) or Grandpa panicking and sprinting out of the room while Granny chases him right behind.

## Architecture Overview

- `index.html` — Studio UI shell, importmap (`three@0.170.0`), `#stageContainer`, `#fadeOverlay`, and `?headless=1` export mode.
- `src/config.js` — `CONFIG`, `ASSET_MANIFEST`, `SFX_MANIFEST`, verified indoor `SET_MAP` waypoints, `GRANDPA_KEY_POV_44S` (44s default episode), and `JUMP_RUN_WALK_EPISODE` (6s).
- `src/assetLoader.js` — `loadHouse()` with 0.4m indoor A* navigation (`findPath`, `isPointInsideWalkable`, `clampCameraPosition`), `loadCharacterTemplate()`, `instantiateCharacter()` (`playAnim`, `faceTarget`, `lookAtPlayer`, `showBubble`, `setProp`).
- `src/animationLibrary.js` — Mixamo `.fbx` template extraction, root-motion stripping, jump arc extraction (`0.32m` cap), and rest-pose quaternion retargeting (`AnimationLibrary`).
- `src/playerCamera.js` — First-person POV controller (`PlayerCamera`): eye-level walking (`1.50m`) with head-bob, whip-pan `lookAt` + tracking, `nod_yes` / `shake_no` / `shake_panic` / `peek_lean` gestures, crouch (`0.42m`), bottom-right FPS held-item viewmodel (`holdProp`, `useHeldProp`), fade-to-black, wall clamping, and `16:9` / `9:16` aspect toggling + Orbit calibrator toggle.
- `src/comedyProps.js` — `ThoughtBubbleCache` (`key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`) and `ComedyPropManager` (`golden_key`, `padlock`, `treasure_chest`, `emoji_ball`, `toy_blaster`, `cookie_jar`).
- `src/sfxEngine.js` — Web Audio mixer (`SfxEngine`): looping BGM (`fluffing_a_duck`, `monkeys_spinning_monkeys`, `run_amok` in `SoundEffects/backroundMusics/`, plus `granny_ambience`, `granny_good_part`, `granny_chase`), `cutBgm` silence ducking, movement-synced footsteps, whip-pan/bubble/pickup/action foley, 1–2s gap pacer, and deterministic offline capture for FFmpeg.
- `src/episodeRunner.js` — Deterministic 60Hz multi-skit timeline (`EpisodeRunner`) compiling `skits[].beats` (`at` / `after`) and legacy `actions`; validates + repairs every episode on load and refines each path leg against real house geometry (`_refineChainGeometry`).
- `src/stagingSafety.js` — dependency-free staging geometry: actor capsules (`makeCapsule`, `pushOutOfCapsules`), camera placement (`findSafeCameraSpot`), prop support (`resolvePropPlacement`), route validity (`findBlockedLeg`, `ensureRoute`).
- `src/episodeSafety.js` — script linter + deterministic auto-repair (`validateEpisode`, `validateAndRepair`) for spawn collisions, floating/overlapping props, wall-cutting routes, tight standoffs, action-less SFX, weapons left in hand, reactions facing away, dead air and framing.
- `scripts/validate-episode.mjs` — `npm run validate:episode`, exits non-zero when an error survives repair (the export workflow runs it before rendering).
- `src/studioUI.js` & `src/main.js` — Director controls, 28-clip Soundboard, Waypoint Calibrator (`WASD + Q/E`), Live Multi-Skit JSON Editor, and `window.__GRANNY_STUDIO__` headless export hooks.
- `scripts/export-video.mjs` & `.github/workflows/export-video.yml` — Headless Playwright (SwiftShader WebGL) + FFmpeg video/BGM/ducking/SFX pipeline auto-publishing `.mp4`/`.webm` + `export-summary.json` to the `latest-export` GitHub Release.

## Staging Rules (Must Preserve)

1. **Bodies are solid.** Nothing (camera, player, performer, prop) may occupy an actor's capsule (`radius 0.44m`, `height 1.78m`). `playerCamera.actorProvider` + `pushOutOfCapsules` enforce this every frame; `findSafeCameraSpot` enforces it at plan time.
2. **Surfaces are real.** Props sit on what the house actually has under them (`ComedyPropManager.seatProp`); never "fix" a floating prop by tuning `yOffset`.
3. **Routes are geometry-checked.** Nav-graph edges are only hints: every compiled leg is traced against `HouseWalls`/furniture and replaced with the 0.4m grid A* detour when blocked. Keep `house.stagingWorld` wired into `PlayerCamera` and `EpisodeRunner`.
4. **Ray helpers accept both call styles.** `isPointInsideWalkable(x, z)` and `hasClearSight(a, b)` also accept Vector3 arguments — passing a Vector3 into the numeric form silently produced NaN rays and disabled collision checks (the original "camera inside Grandpa" bug). Never remove that guard.
5. **The gate is not optional.** `loadEpisode()` validates + repairs and stores the report on `runner.staging`; `scripts/validate-episode.mjs` gates the export workflow; `node --test tests/*.test.mjs` must stay green.

## Rigging & House Rules (Must Preserve)

1. **Granny Bind Matrix**: `GrannyTest6.fbx` stores Identity `bindMatrix` on its `SkinnedMesh`. Keep `fixBindMatrixToWorld: true` (`AttachedBindMode` with `node.bindMatrix.copy(node.matrixWorld)`) before normalization. Never switch Granny to `DetachedBindMode`.
2. **Textured Materials**: FBX `MeshPhongMaterial` instances can have dark diffuse multipliers (`#242424`, `#3c3c3c`). `configureMaterialsAndShadows()` resets `material.color` to `0xffffff` whenever `material.map` is present.
3. **Indoor Waypoints (`SET_MAP`)**: Always reference `SET_MAP` waypoint names in episode scripts rather than raw coordinates. Avoid the unroofed front porch (`x = -2.4..+1.8, z = +1.6..+5.8`) and cellar stair hole (`x = +2.4, z = -0.2..+2.8`).

## Multi-Skit POV Episode JSON Schema

```json
{
  "title": "My Funny Skit",
  "aspect": "16:9",
  "playerSpawn": "back_hall",
  "playerFacing": "back_room_east",
  "cast": [
    { "id": "grandpa", "asset": "grandpa", "spawn": "living_room", "facing": "living_room_entry" },
    { "id": "granny", "asset": "granny", "spawn": "kitchen", "facing": "dining_nook" }
  ],
  "props": [
    { "id": "chest", "type": "treasure_chest", "spawn": "chest_spot" },
    { "id": "golden_key", "type": "golden_key", "spawn": "key_spot", "yOffset": 0.82, "spin": true, "float": true }
  ],
  "skits": [
    {
      "name": "Skit 1",
      "beats": [
        { "at": 0.0, "type": "bgm", "sound": "granny_ambience", "volume": 0.22 },
        { "at": 0.2, "type": "player_walk", "to": "living_room_entry", "duration": 3.0 },
        { "after": 3.2, "type": "player_look", "target": "grandpa", "duration": 0.18, "track": true },
        { "after": 0.1, "type": "char_face", "actor": "grandpa", "followPlayer": true },
        { "after": 0.1, "type": "char_bubble", "actor": "grandpa", "icon": "question", "duration": 1.8 },
        { "after": 0.2, "type": "sfx", "sound": "vine_boom", "cutBgm": true, "cutBgmDuration": 1.2 }
      ]
    }
  ]
}
```

### Supported Beat Types
- **Player POV**: `player_walk` (`to`, `duration`, `lookAhead`), `player_look` (`target`, `duration`, `track`), `player_gesture` (`gesture`: `nod_yes` | `shake_no` | `shake_panic` | `peek_lean`, `duration`), `player_crouch` (`crouched`, `duration`), `player_hold` (`prop`, `use`), `fade` (`to`, `duration`).
- **Characters**: `char_move` (`actor`, `to`, `anim`, `duration`, `speed`), `char_anim` (`actor`, `anim`, `speed`, `loop`), `char_face` (`actor`, `target`, `followPlayer`), `char_bubble` (`actor`, `icon`: `key` | `question` | `exclamation` | `zzz` | `angry` | `laugh` | `food` | `heart`, `duration`), `char_prop` (`actor`, `prop`).
- **Props & Audio**: `prop_action` (`prop`, `action`: `show` | `hide` | `pickup` | `open` | `close` | `pop_out` | `bounce` | `stop`, `waypoint`, `yOffset`), `bgm` (`sound`, `volume`), `stop_bgm`, `sfx` (`sound`, `volume`, `pitch`, `cutBgm`, `cutBgmDuration`).

## Cloud Video Rendering (GitHub Actions)

Render any preset or custom JSON to `.mp4`/`.webm` in GitHub's cloud runners without using local CPU/GPU:
```bash
gh workflow run export-video.yml --ref main -f preset=grandpa_key_pov_44s -f fps=30 -f sfx_pacer=true -f format=mp4
```
Completed videos are auto-published to the `latest-export` GitHub Release.
