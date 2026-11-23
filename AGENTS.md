# AGENTS.md — Granny POV 3D Cartoon Studio (Agent Playbook)

This repository is a zero-build Three.js (`v0.170.0`) first-person **POV Kids-Comedy 3D Cartoon Studio** inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`), with deterministic 60Hz animation, Mixamo-retargeted `Granny` & `Grandpa` rigs, procedural 3D props & comic thought bubbles, a Web Audio SFX/BGM mixer, an automated 3D clip/leak verifier, and single-runner + chunked parallel GitHub Actions cloud renderers.

---

## What Can I Ask For? (read this before writing a beat)

Never guess an animation, prop or beat name — print the catalogue:

```bash
npm run catalogue            # human readable
npm run catalogue:json       # machine readable, ideal for an agent
npm run gestures             # just the head gestures
node scripts/catalogue.mjs --animations
```

It reports **22 animations** (15 Mixamo FBX templates + 7 procedural head
gestures), **10 props**, **22 beat types** and every preset, and it exits
non-zero if an animation points at a file that isn't on disk.

### Animation templates

| key | source | notes |
| --- | --- | --- |
| `walk` `run` `run2` `sneak` | Walk / Fast Run | locomotion, loops |
| `jump` | Jumping | one-shot, keeps the 0.32 m arc |
| `laugh` `angry` `talk` `sit` `terrified` `panic` | Laughing / Angry / Talking / Sitting / Terrified | reaction + dialogue beds |
| `punch` `kick` `mma_kick` `trip` | Punching / NormalKick / Mma Kick / Tripping | one-shot slapstick |
| `nod` `nod_yes` `nod_once` `shake` `shake_no` `tilt` `double_take` | **procedural** | no FBX, layered on the head bone |

Dropping a new `.fbx` into `Assets/AnimationTemplates/` and adding one entry to
`ASSET_MANIFEST.animations` in `src/config.js` is the whole integration — the
retargeter picks it up for both rigs.

### Head gestures (nodding / saying no)

A gesture is a rotation layered **on top of** whatever clip is playing, so a
character can nod while laughing. There are two ways to use one:

```js
// fire and forget: the gesture overlays the current clip, nothing waits
{ at: 2.7, type: "char_gesture", actor: "grandpa", gesture: "nod", duration: 0.9 }

// as an animation: waits for the gesture window like any other anim beat
{ at: 2.7, type: "char_anim", actor: "grandpa", anim: "shake_no", duration: 0.9 }
```

`src/headGestures.js` owns the catalogue (`axis`, `amplitude` in radians,
`cycles`). Each gesture eases in and out so the neck never pops, and
`amplitude` / `cycles` can be overridden per beat. The rig composes the gesture
and the existing head-tracking aim into a single quaternion, so neither layer
can compound across frames.

### Props, including the cookie

`{ type: "char_prop", actor, prop: "cookie" }` puts a 48 cm comedy cookie in
the actor's hand; `{ type: "char_prop_action", actor, action: "bite", sfx: "eat" }`
removes one of its four sectors — real geometry disappearing, not a scale trick.
`action: "hide"` drops it. The cookie jar is translucent with three cookies
inside, so the camera can read what the heist is about.

---

## Golden Rule for Agents: Build Modular Gags, NEVER Monolithic Scripts

When asked to make a new episode (15 seconds, 5 minutes, or 40+ minutes):

1. **Write small reusable gag modules (`10–25s` each) in `src/gags/`** using `src/gags/helpers.js` and `src/gags/locations.js`. See **`src/gags/README.md`** for the copy-paste template.
2. **Compose episodes in `src/episodes.js` with `buildEpisode({ title, aspect, gags })`** (`src/episodeBuilder.js`).
   - `buildEpisode()` automatically chains gags with `0.4s` black-frame `CUT` transitions (`fade` -> `char_cut` -> `prop_action: "hide"/"reset"` -> `cut` with `clearHold: true` -> `fade` in).
   - Zero state leaks across gags: props from Gag 1 are hidden/reset before Gag 2, held FPS items are cleared, and actors are teleported cleanly during the black frame.
3. **Register new presets in `src/config.js` (`EPISODE_PRESETS`) and `.github/workflows/*.yml`.**
4. **Verify before pushing:**
   ```bash
   node --check src/*.js src/episodes/*.js src/gags/*.js scripts/*.mjs
   node scripts/audit-pacing.mjs --all
   node scripts/verify-3d.mjs --gags
   node scripts/verify-3d.mjs <your_preset_key>
   ```

- `index.html` — Studio UI shell, importmap (`three@0.170.0`), `#stageContainer`, `#fadeOverlay`, and `?headless=1` export mode.
- `src/config.js` — `CONFIG`, `ASSET_MANIFEST`, `SFX_MANIFEST`, verified indoor `SET_MAP` waypoints, `GRANDPA_KEY_POV_44S` (44s default episode), and `JUMP_RUN_WALK_EPISODE` (6s).
- `src/assetLoader.js` — `loadHouse()` with 0.4m indoor A* navigation (`findPath`, `isPointInsideWalkable`, `clampCameraPosition`), `loadCharacterTemplate()`, `instantiateCharacter()` (`playAnim`, `faceTarget`, `lookAtPlayer`, `showBubble`, `setProp`).
- `src/headGestures.js` — procedural head gestures (`nod`, `shake`, `tilt`, `double_take`): pure sampling, no FBX, unit-tested in `tests/headGestures.test.mjs`.
- `src/catalog.js` + `scripts/catalogue.mjs` — the capability catalogue agents read instead of guessing names (`npm run catalogue`).
- `src/animationLibrary.js` — Mixamo `.fbx` template extraction, root-motion stripping, jump arc extraction (`0.32m` cap), and rest-pose quaternion retargeting (`AnimationLibrary`).
- `src/playerCamera.js` — First-person POV controller (`PlayerCamera`): eye-level walking (`1.50m`) with head-bob, whip-pan `lookAt` + tracking, `nod_yes` / `shake_no` / `shake_panic` / `peek_lean` gestures, crouch (`0.42m`), bottom-right FPS held-item viewmodel (`holdProp`, `useHeldProp`), fade-to-black, wall clamping, and `16:9` / `9:16` aspect toggling + Orbit calibrator toggle.
- `src/comedyProps.js` — `ThoughtBubbleCache` (`key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`) and `ComedyPropManager` (`golden_key`, `padlock`, `red_button`, `treasure_chest`, `emoji_ball`, `toy_blaster`, `delivery_box`, `rising_lava`, `cookie`, `cookie_jar`).
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
6. **The cast yields, the lens does not.** Personal space is resolved by moving the *performer* out of the lens bubble (`PLAYER_BUBBLE`, 0.8m, `EpisodeRunner` step 4b). The camera may only take a capped 0.10m nudge when a body cannot step aside. A camera that dodges bodies reads to the viewer as *being shoved* — that was a reported defect on the 2:30 cut, do not reintroduce it.
7. **The lens is shielded from geometry.** `LensShield` (`src/lensShield.js`) sphere-casts 14 rays around the finished eye position and pushes it out of anything inside 0.34m, then fades surfaces still inside 0.26m. `house.clampCameraPosition` alone only tests one ray and let the camera end up inside tables.
8. **Clearance is measured, not assumed.** `node scripts/export-video.mjs --preset <key> --probe` walks every frame without rendering and fails when the lens is inside geometry or a performer is inside 0.45m for more than 1% of frames. Both export workflows run it before spending render time. If the probe fails, restage the scene — do not widen the budget.
9. **Every episode ≥ 60s needs a story spine.** `story: { premise, goal, goalProp, resolution, scenes:[{objective,obstacle,turn}] }`. The goal prop must be on camera in the setup, the conflict **and** the payoff; two consecutive scenes may not share an objective. `npm run story` is the gate; `LEGACY_SPINE_DEBT` in `src/config.js` is the visible TODO list of presets that predate the rule.
10. **Two performers never share a waypoint.** `buildEpisode()` runs `enforceStageSeparation()`: concurrent walks to the same (or too-close) target are re-targeted, standing bodies on a route are routed around. Do not disable it — three separate 0.00m body merges in the 2:30 cut came from exactly this.

---


## Anti-Patterns (NEVER DO THIS)

- **NEVER** hand-write giant 300-line raw JSON timelines with `after` and `await: true` chains. Use `src/gags/` + `buildEpisode()` with local `at` timestamps only.
- **NEVER** make the player circle/spin around for seconds with slow `player_look` sweeps. Camera looks are crisp whip-pans (`0.18–0.30s`), and `CONFIG.maxLookDuration` (`0.55s`) caps long looks unless an episode explicitly sets `allowSlowScans`.
- **NEVER** default back to the tired "lava rising / red button / toy pistol / run upstairs to bedroom" survival trope unless the user explicitly asks for that specific story. Pick fresh physical comedy: cookie heists, couch hogs, chest fakeouts, sneak photobombs, ball bonks, etc.
- **NEVER** make Granny or Grandpa attack or harm the player. **Lore:** Player, Granny, and Grandpa are best buds doing goofy slapstick together.
- **NEVER** use raw XYZ coordinates in gags or episodes. Only use `GAG_LOCATIONS` or `SET_MAP` waypoint names.
- **NEVER** use `peek_lean` or `rising_lava` unless explicitly requested.
- **NEVER** skip `via` on cross-room moves (`char_move` / `player_walk`).

---

## Directory & Architecture Map

| File | Responsibility |
| --- | --- |
| `src/gags/helpers.js` | Dead-air-safe gag DSL (`react`, `launchProp`, `chase`, `sneakUp`, `walkTo`, `propAction`, `holdProp`, `lookAt`, `panic`) |
| `src/gags/locations.js` | Verified multi-room staging packs (`GAG_LOCATIONS`: `kitchen_to_hall`, `living_to_hall`, `foyer_to_dining`, `upstairs_hall`) |
| `src/gags/*.js` | Standalone gag modules (`ballRace`, `cookieHeist`, `couchHog`, `chestFakeout`, `sneakPhotobomb`) + `GAG_REGISTRY` |
| `src/episodeBuilder.js` | `buildEpisode()` + `validateGag()` — stitches gags with leak-free `0.4s` black cuts |
| `src/episodes.js` | Episodes composed via `buildEpisode()` (`COMEDY_VARIETY_1M`, `COOKIE_HEIST_15S`, `ROCKET_BALL_TEST`, `ROCKET_BALL_x3`) |
| `src/config.js` | `CONFIG`, `ASSET_MANIFEST`, `SFX_MANIFEST`, `SET_MAP` waypoints, `EPISODE_PRESETS`, `DEFAULT_EPISODE` |
| `src/episodeRunner.js` | Deterministic 60Hz runner; handles `cut`, `char_cut`, `prop_action: "reset"`, `via` routing, jump arcs, 1.3m personal space |
| `src/playerCamera.js` | First-person POV camera, head-bob, whip-pan `lookAt`, gestures, crouch (`0.42m`), depth-cleared held FPS viewmodel |
| `src/comedyProps.js` | Procedural 3D props (with `resetProp` snapshots) + `ThoughtBubbleCache` |
| `src/assetLoader.js` | `loadHouse()` / `setupHouseFromRaw()` with 0.4m walkable grid, Mixamo retargeting, Granny bind-matrix repair |
| `src/sfxEngine.js` | Web Audio mixer, per-actor footstep pitch (`tickPacer`), BGM ducking (`cutBgm`), offline FFmpeg event capture |
| `src/main.js` & `src/studioUI.js` | Studio UI, `?preset=` & `?gag=` instant URL preview, **Gag Lab** dropdown, live JSON editor, `window.__GRANNY_STUDIO__` |
| `scripts/audit-pacing.mjs` | Validates dead air, runtime, dangling tags, and gag schema (`--gags`, `--all`) |
| `scripts/verify-3d.mjs` | Simulates episodes at 30Hz/60Hz against `GrannyHouse.fbx` to catch wall clips & cross-cut prop leaks (`--gags`, `--all`) |
| `scripts/chunk-episode.mjs` | Splits 10–60 min `buildEpisode` shows on gag boundaries into ~3-min self-contained chunks |
| `scripts/export-video.mjs` | Headless Playwright (SwiftShader) + FFmpeg video/audio renderer & lossless `--concat` stitcher |
| `.github/workflows/export-video.yml` | Single-runner cloud render (fast for `<= 3 min` episodes) |
| `.github/workflows/export-long-episode.yml` | Matrix parallel cloud render + FFmpeg stitch (built for 5–60 min multi-gag episodes) |

---

## Verified Building Blocks (Catalog)

### Calibrated Room Packs (`GAG_LOCATIONS` in `src/gags/locations.js`)
- `kitchen_to_hall` — Kitchen -> Dining -> Back Hall
- `living_to_hall` — Living Room -> East Hall -> Back Hall
- `foyer_to_dining` — Front Door -> Foyer -> Dining Room
- `upstairs_hall` — Upstairs Bedroom -> Hall -> Stairs

### Key `SET_MAP` Waypoints (`src/config.js`)
- **Living / East:** `living_room`, `living_room_view`, `living_room_entry`, `living_room_left`, `living_room_right`, `living_room_sofa`, `doorway_living`, `chest_spot`, `grandpa_chest_side`, `back_room_east`, `back_room_east_right`
- **Back Hall / Foyer / Front:** `back_hall`, `back_hall_left`, `back_hall_right`, `hallway`, `foyer`, `foyer_atrium`, `front_door_view`, `front_door_pkg`, `front_door_left`, `front_door_right`
- **Kitchen / Dining:** `dining_center`, `doorway_dining`, `dining_corner`, `dining_table_front`, `dining_table_side`, `dining_table_top`, `kitchen_lane`, `kitchen`, `kitchen_table_top`, `kitchen_counter_top`, `under_bed`, `back_bed_top`
- **Stairs / Upstairs:** `stairs_bottom`, `stairs_middle`, `stairs_top`, `upstairs_landing`, `upstairs_hall_center`, `upstairs_balcony`, `up_hall_north_door`, `up_hall_north`, `up_bed_north`, `up_bed_north_side`, `up_bed_top_edge`, `up_bed_top`, `up_bed_top_west`, `upstairs_desk`, `upstairs_east_hall`, `upstairs_east_north`

> Avoid the unroofed front porch (`x = -2.4..+1.8, z = +1.6..+5.8`) and cellar stair hole (`x = +2.4, z = -0.2..+2.8`).

### Character Animations (`CONFIG.animations`)
`idle`, `walk`, `granny_walk`, `run`, `run2`, `sneak`, `jump`, `laugh`, `punch`, `sit`, `terrified`, `panic`, `look`

### Built-In 3D Props (`src/comedyProps.js`)
`cookie_jar`, `emoji_ball`, `treasure_chest`, `golden_key`, `padlock`, `delivery_box`, `toy_blaster`, `red_button`  
*(Character hand props via `char_prop` / `char_cut`: `"cane"`, `"shotgun"`, `"none"`.)*

### Comic Thought Bubbles (`ThoughtBubbleCache`)
`key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`

### Camera Gestures (`player_gesture`)
`nod_yes`, `shake_no`, `shake_panic`, `shake_earthquake`

### Audio (`SFX_MANIFEST` in `src/config.js`)
- **BGM (`bgm`):** `fluffing_a_duck`, `monkeys_spinning_monkeys`, `run_amok`, `granny_good_part`, `granny_ambience`, `granny_chase`
- **Comedy / Impacts / Voices (`sfx`):** `pop`, `ding`, `click`, `checkmark`, `tada`, `kaching`, `eat`, `bonk`, `vine_boom`, `whoosh`, `swoosh`, `discord`, `glitch`, `rizz`, `aww`, `granny_laugh`, `granny_i_see_you`, `jumpscare`, `explode`, `explode_meme`, `squidward_walk`

---

## Rigging & Engine Invariants (Do Not Break)

1. **Granny Bind Matrix:** `GrannyTest6.fbx` uses `fixBindMatrixToWorld: true` (`AttachedBindMode`). Never switch Granny to `DetachedBindMode`.
2. **Material Diffuse Reset:** `configureMaterialsAndShadows()` resets `material.color` to `0xffffff` whenever `material.map` exists.
3. **Zero-Leak Cuts:** `cut` clears FPS held props (`clearHold !== false`), `char_cut` resets actor props (`ev.prop ?? "cane"`), clears bubbles, and clears `lookAtPlayer`.

---

## Preview, Audit & Cloud Render Commands

```bash
# 1. Start local Studio (open http://localhost:8000/?gag=cookieHeist)
python3 -m http.server 8000

# 2. Pacing, story and staging checks (all presets + all gag x location combos)
node scripts/audit-pacing.mjs --all
npm run story -- --all          # premise / goal / payoff, per scene
npm run validate:episode -- --preset cookie_marathon_150s

# 2b. Lens clearance probe — no rendering, fails on camera-in-furniture
node scripts/export-video.mjs --preset cookie_marathon_150s --probe --out-dir probe

# 3. 3D mesh collision & cross-cut leak check (requires `npm install --no-save three@0.170.0`)
node scripts/verify-3d.mjs --gags
node scripts/verify-3d.mjs cookie_heist_15s

# 4. Single-runner cloud render (best for <= 3 min episodes)
gh workflow run export-video.yml --ref arena/98e36e5b-granayandshgrampas26 -f preset=cookie_heist_15s -f fps=30 -f format=mp4

# 5. Parallel chunked cloud render (for 5–40+ min modular episodes)
gh workflow run export-long-episode.yml --ref arena/98e36e5b-granayandshgrampas26 -f preset=comedy_variety_1m -f max_chunk_sec=180 -f fps=30
```
