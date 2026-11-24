# EPISODE_PRODUCTION_GUIDE.md — Engine Reference & Pacing Rules

> **STOP — Authoring a New Episode?**
> Use the modular gag framework in **`src/gags/`** + **`src/episodeBuilder.js`** (`buildEpisode()`), NOT giant raw `after`/`await` timelines.
> Start with **`src/gags/README.md`** (copy-paste 20-line template) and **`AGENTS.md`** (complete catalog of helpers, locations, props, animations, SFX, and verification commands).
> This guide documents the lower-level engine invariants, `SET_MAP` coordinates, and pacing rules that power `EpisodeRunner` under the hood.

---

Use this guide whenever you extend the engine or inspect low-level beat timing for **Granny POV 3D Cartoon Episodes** (`16:9` YouTube POV or `9:16` Shorts). Every rule here maps directly to `src/config.js`, `src/episodeRunner.js`, `src/playerCamera.js`, `src/comedyProps.js`, `src/sfxEngine.js`, and `scripts/export-video.mjs`.

---

## 1. Where Everything Lives in the Repo

| What you need | Where to find it | Notes |
| --- | --- | --- |
| **Waypoints, Cast, SFX/BGM Manifest & Presets** | `src/config.js` | `SET_MAP`, `SFX_MANIFEST`, `ASSET_MANIFEST`, `GRANDPA_KEY_POV_44S`, `FLOOR_IS_LAVA_4M`, `JUMP_RUN_WALK_EPISODE`, `EPISODE_PRESETS` |
| **Fast-Cut Escape Episode** | `src/episodes/greatEscape75.js` | `THE_GREAT_ESCAPE_68S` — reference implementation for hard cuts, whip-pans, and zero dead air |
| **Pacing Audit (runs before every cloud render)** | `scripts/audit-pacing.mjs` | Fails on dead air / runaway runtime / dangling refs; warns on oversized looks and awaited beats |
| **Background Music (Looping Comedy/Chase BGM)** | `SoundEffects/backroundMusics/` + `SoundEffects/*.mp3` | Registered in `SFX_MANIFEST` with `category: "bgm"` — auto-loops in browser & FFmpeg |
| **22 Sound Effects (Impacts, Voices, UI, Cuts)** | `SoundEffects/*.mp3` | Registered in `SFX_MANIFEST` in `src/config.js` |
| **3D House & Character Models + Mixamo Clips** | `Assets/` | `GrannyHouse.fbx`, `GrannyTest6.fbx`, `grandpach3.fbx`, `Assets/AnimationTemplates/*.fbx` |
| **Timeline Engine & Beats** | `src/episodeRunner.js` | Compiles `skits[].beats` (`at` / `after`), `await: true` / `sync: "sequential"` barriers, auto stair routing, jump-arc hops, 1.3m personal space |
| **POV Camera & FPS Viewmodel** | `src/playerCamera.js` | Clamps pitch `[-45°, +35°]`, stair vertical clamping, jump-arc hops, depth-cleared `viewmodelScene`, gestures, fade |
| **Props & Thought Bubbles** | `src/comedyProps.js` | 6 props + 8 icon bubbles (`Emoji Ball` double-sided + camera yaw-tracking) |
| **Cloud Video Exporter** | `.github/workflows/export-video.yml` & `scripts/export-video.mjs` | Renders 30fps `.mp4`/`.webm` + mixed audio in GitHub Actions → `latest-export` release |

---

## 2. The 3 Mandatory Kids-Comedy Pacing Rules

Kids' attention drops within **3 seconds** if nothing changes visually. Bake these three rules into **every** episode JSON script you create:

### Rule 1: No Beat Over 2–2.5 Seconds Without Movement ("Zero Dead Air")
- **Never** leave the camera staring at a bobbing prop or stationary character for 3–5 seconds.
- **Every `1.5–2.5s`**, change something on screen: a whip-pan (`player_look`), camera walk (`player_walk`), crouch/peek (`player_crouch` / `peek_lean`), prop flying across the room (`pop_out` with `to` + `travelDuration`), pickup (`player_hold`), or a character moving/reacting (`char_move` / `char_anim` + `char_bubble`).
- A `player_look` is a **whip-pan, not a stare**: keep source durations at or below `CONFIG.maxLookDuration` (`0.55s`). The engine hard-caps anything longer, and the audit warns on it.
- **Cut, don't commute.** When the next gag is in another room, use `cut` (`to`, `facing`) instead of a 4–8s walk through empty geometry. Move actors with `char_cut` (`actor`, `to`, `facing`) for the same reason. Walks are for tension inside a shot, not for travel between shots.
- If a prop pops out of a box or chest, **immediately** send it flying across the room (`to` waypoint), bonk a character with it, or grab it into the player's hand within `1.5–2.0s`.

### Rule 2: Always Show Cause-and-Effect Visually (No Shadowboxing Thin Air)
- **Never** trigger `punch` or `hit` while a character is 3+ meters away in a doorway with nobody in reach—it reads as shadowboxing thin air and breaks the comedy logic.
- **Before any angry swing/reaction:**
  - Either have the gag prop (`emoji_ball`, `cookie_jar`, `toy_blaster`) **bounce/fly right to Granny's position first** (`bonk` + `vine_boom`), **OR**
  - Have Granny **`run2` sprint right up to the target (`<= 1.4m` away)** *before* triggering `angry` + `punch` / `jump`.
- If Granny hears a noise while you're hiding (`!`), have her **stop, turn to face the room (`char_face` + `look`)**, show `?` when she doesn't spot you, and *then* leave—never make her shout `"I see you!"` while walking away backwards.

### Rule 3: End on Motion, Not a Static Pose
- **Never** end an episode with a character repeating a stationary `terrified` or `idle` crouch while explosion/chase SFX play offscreen.
- **Best high-retention endings (last `2–3s` into `fade`):**
  1. **Camera Lunge:** Granny switches to `run2`, sprints straight toward the player/camera (`char_face: followPlayer: true`) with `jumpscare` / `granny_laugh` + `shake_panic` right as `fade` goes to `1`.
  2. **Slapstick Chase Exit:** Grandpa panics and sprints (`run2`) out through `doorway_living` → `back_room_east` while Granny chases right behind him (`0.4s` later, `run2`) as the camera pans with them and fades to black!

---

## 3. Audio, Looping BGM (`SoundEffects/backroundMusics/`), & SFX Guide

### Background Music Tracks (`category: "bgm"` — Automatically Looped)
Use `{ "at": ..., "type": "bgm", "sound": "<key>", "volume": 0.24 }`. Switching to a new `bgm` beat cleanly replaces the active track, and `SfxEngine` + `export-video.mjs` (`-stream_loop -1`) automatically loop every track seamlessly.

| `sound` key | File Path | Mood / Best Use | Credits (Keep for descriptions if needed) |
| --- | --- | --- | --- |
| **`fluffing_a_duck`** | `SoundEffects/backroundMusics/Fluffing-a-Duck(chosic.com).mp3` | **Sneaky / Quirky Setup** (sneaking, plotting, goofy discovery) | Kevin MacLeod (`incompetech.com`), CC BY 3.0 |
| **`monkeys_spinning_monkeys`** | `SoundEffects/backroundMusics/Monkeys-Spinning-Monkeys(chosic.com).mp3` | **Upbeat Slapstick / Comedy Hijinks** (pranks, bouncing props, silly chases) | Kevin MacLeod (`incompetech.com`), CC BY 3.0 |
| **`run_amok`** | `SoundEffects/backroundMusics/Run-Amok(chosic.com).mp3` | **Frantic High-Speed Chase** (climax sprint, Granny bursting in, chaos finale) | Kevin MacLeod (`incompetech.com`), CC BY 3.0 |
| `granny_ambience` | `SoundEffects/granny-ambience.mp3` | Creepy low tension intro / suspense | Built-in |
| `granny_good_part` | `SoundEffects/granny-ambience-but-its-only-the-good-part.mp3` | Suspenseful hallway sneak / hide-and-seek | Built-in |
| `granny_chase` | `SoundEffects/granny-chase-music.mp3` | Intense Granny horror-chase sting | Built-in |

> **Pro Comedy Audio Trick (`cutBgm`):** On a sudden shock or punchline, add `"cutBgm": true, "cutBgmDuration": 1.1` to an `sfx` beat (`vine_boom`, `bonk`, `granny_i_see_you`, `discord`). It mutes the BGM into dead silence for 1.1 seconds so the gag lands 3x harder, then brings the music right back!

### Full 22-Clip SFX Catalog (`SFX_MANIFEST`)
Sync SFX directly to visible actions (`1.2s–1.85s` rhythm; avoid overlapping voices):

- **Impacts & Slapstick:** `bonk`, `vine_boom`, `explode`, `explode_meme`
- **Pops, Alerts & UI:** `pop`, `ding`, `discord`, `glitch`, `checkmark`, `click`
- **Comedy Payoffs:** `tada`, `kaching`, `rizz`, `aww`, `eat`
- **Voices & Horror Stings:** `granny_i_see_you`, `granny_laugh`, `jumpscare`
- **Movement & Cuts:** `swoosh` (whip-pan camera turn), `whoosh` (fast movement), `squidward_walk` (comic footsteps), `typing`

---

## 4. Indoor Stage Map & Safe Doorway Routing (`SET_MAP`)

**NEVER** hardcode raw `(x, y, z)` coordinates in episode JSON—always use `SET_MAP` names, and **ALWAYS** list doorway waypoints in `via: [...]` when moving between rooms so the camera and characters pass cleanly through doorway centers without clipping wall corners!

### Safe Room-to-Room `via` Chains & Vertical Stair Routing
- **Back Hall ↔ Living Room (Grandpa's Room):**
  - `back_hall` → `back_room_east` → **`doorway_living`** → **`living_room_entry`** → `living_room_view`
- **Foyer ↔ Dining Room / Kitchen:**
  - `front_door_view` → `stairs_bottom` → `dining_corner` → `dining_table_front` → `kitchen`
- **Back Hall ↔ Dining Room / Kitchen:**
  - `back_hall` → **`doorway_dining`** → `dining_center` → `kitchen_lane` → `kitchen`
- **Ground Floor ↔ Upstairs (Automatic Staircase Routing):**
  - Any cross-floor `char_move` or `player_walk` automatically routes through `stairs_bottom` (`-1.9, 0.0, 4.0`) ↔ `stairs_middle` (`-1.9, 1.54, 2.5`) ↔ `stairs_top` (`-1.9, 2.85, 1.25`) ↔ `upstairs_landing` (`-1.9, 2.85, 0.95`) with vertical speed clamping (`<= 1.75 m/s` actors, `<= 1.55 m/s` player) so nobody flies diagonally through floors or ceilings.
- **Upstairs North Doorway & East Wing:**
  - `upstairs_landing` → `up_hall_north_door` (`-1.4, 2.85, -0.6`) → `up_hall_north` (`-1.4, 2.85, -2.4`) → `up_bed_north` / `upstairs_east_north` (`1.5, 2.85, -1.8`)

### Elevated Furniture Waypoints (`elevated: true`) & Jump Arcs
Targets with `elevated: true` in `SET_MAP` automatically route to their ground `approach` waypoint first, then perform a parabolic jump-arc hop (`jump` animation for characters) onto the elevated surface—or hop directly between adjacent surfaces (`< 2.2m` apart on the same floor):
- **Ground Floor Elevated:** `dining_table_top` (`y=1.11`), `dining_table_top_west` (`y=1.11`), `kitchen_table_top` (`y=1.13`), `kitchen_counter_top` (`y=1.13`), `back_bed_top` (`y=0.98`), `living_room_sofa` (`y=0.47`), `living_room_shelf_top` (`y=0.72`)
- **Upstairs Elevated:** `up_bed_top` (`y=3.83`), `up_bed_top_west` (`y=3.83`), `upstairs_west_desk_top` (`y=3.54`), `upstairs_east_bed_top` (`y=3.54`)

### Instant Cuts (`cut` / `char_cut`)
- `{ "at": 12.2, "type": "cut", "to": "kitchen_lane", "facing": "golden_key" }` teleports the POV player and snaps the view in the same frame. `to` is optional (omit it to rotate in place), `facing` is optional, and `sound` optionally plays a sting.
- `{ "at": 12.3, "type": "char_cut", "actor": "granny", "to": "foyer", "facing": "player" }` teleports an actor, cancels its active move, and faces it at the player (or a waypoint).
- Cuts are **zero-duration** and never block the timeline, so authored `at` timestamps stay exact. Use them to jump between rooms, reset a chase, or land a jumpscare.
- Reactions (`char_anim`, `char_bubble`, `char_prop`) auto-face the camera so the expression reads on screen; pass `"facePlayer": false` when a character must deliberately look away.

### Timeline Synchronization (`await: true` & `sync: "sequential"`)
- Add `"await": true` (or `"sync": "sequential"`) to any `char_move`, `player_walk`, `char_anim`, `player_look`, or `player_gesture` beat to **halt timeline advancement** until that character/camera movement or one-shot animation finishes before dispatching the next beat.
- Use `"after": <seconds>` for delta timing relative to the **previous beat** (or immediately after the previous `await: true` beat finishes). Keep any single `await: true` walk segment under `~2.2s` (or fire reaction beats right before it) to satisfy Rule 1 (`<= 2.5s` pacing).

### Key Waypoints Reference (`src/config.js`)
- **Living Room (Grandpa's Room):** `doorway_living` (`4.4, 0, -0.7`), `living_room_entry` (`4.7, 0, 0.2`), `living_room_view` (`5.4, 0, 0.6`), `living_room` (`5.4, 0, 2.0`), `living_room_ball_bounce` (`5.5, 0, 1.7`), `granny_living_burst` (`4.2, 0, -0.7`), `chest_spot` (`6.2, 0, 2.6`), `chest_padlock` (`5.95, 0, 2.35`), `grandpa_chest_side` (`4.3, 0, 2.5`), `grandpa_step_back` (`4.0, 0, 2.9`)
- **Back Hallway & Bedroom Stairs:** `back_hall` (`0.0, 0, -2.2`), `back_hall_left` (`-0.8, 0, -3.5`), `back_hall_right` (`0.6, 0, -2.6`), `hallway` (`0.8, 0, -2.4`), `back_room_east` (`3.2, 0, -1.8`), `under_bed` (`-3.2, 0, -2.8`), `stairs_bottom` (`-1.9, 0, 4.0`), `stairs_middle` (`-1.9, 1.54, 2.5`), `stairs_top` (`-1.9, 2.85, 1.25`), `upstairs_landing` (`-1.9, 2.85, 0.95`)
- **Dining Room & Kitchen:** `doorway_dining` (`-3.6, 0, -1.2`), `dining_center` (`-3.6, 0, 0.4`), `hide_table` (`-4.2, 0, 2.3`), `kitchen_lane` (`-5.8, 0, 0.8`), `kitchen` (`-6.4, 0, 1.4`), `key_spot` (`-7.35, 1.13, 1.4` — elevated counter top!)
- **Avoid:** The unroofed front porch (`x = -2.4..+1.8, z = +1.6..+5.8`) and cellar stair hole (`x = +2.4, z = -0.2..+2.8`).

---

## 5. Cast, Animations, Props & Thought Bubbles

- **Characters (`cast[]`):** `granny` (`1.65m`), `grandpa` (`1.72m`). Always spawn characters facing into the open room (`facing: "living_room_view"`, etc.), and use `char_face` with `followPlayer: true, instant: true` before dialogue/reaction beats.
- **Animations (`anim`):**
  - **Looping locomotion (use in `char_move`):** `walk`, `run`, `run2` (fast sprint), `sneak`, `granny_walk` (Granny only). `EpisodeRunner` automatically enforces `LoopRepeat` and crossfades back to `endAnim` (`idle` by default) on arrival.
  - **Emotes & actions (use in `char_anim`):** `idle`, `laugh` (`loop: true`), `terrified` (`loop: true`), `panic` (`loop: true`, sped-up `Terrified.fbx` for instant hazard reactions), `sit` (`loop: true`), `jump` (`loop: false`), `punch` (`loop: false`), plus Granny-only `look`, `hit`, `look_bed`.
- **Thought Bubbles (`icon`):** `key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`. Keep duration `1.4s–2.4s`. Viewport NDC clamping prevents top-edge cropping automatically.
- **Comedy Props (`type`):** `golden_key`, `padlock`, `treasure_chest`, `emoji_ball`, `toy_blaster`, `cookie_jar`, `delivery_box` (`open` opens flaps), `red_button` (`press` slams cap), `rising_lava` (`rise_to` with `targetY` & `duration` animates rising molten lava).
  - Use `player_hold` (`{ "prop": "golden_key" }`) for the non-clipping bottom-right FPS viewmodel, `{ "prop": "golden_key", "use": true }` to poke/activate, and `{ "prop": null }` to clear.
  - Gestures (`player_gesture`): `nod_yes`, `shake_no`, `shake_panic`, `shake_earthquake` (sustained `duration` camera rumble), `peek_lean`. Pitch is clamped `[-45°, +35°]`, and elevated waypoints (`y > 0.2`, e.g. `key_spot`) automatically target the prop rather than the ceiling.

---

## 6. Copy-Paste Episode JSON Blueprint (Fast 30s Comedy Chase Example)

Notice how every beat stays under `2.5s`, every reaction shows visual cause-and-effect, BGM escalates from `fluffing_a_duck` → `monkeys_spinning_monkeys` → `run_amok`, and the ending runs straight into a motion chase fade:

```json
{
  "title": "Granny's Stolen Cookie Jar (30s POV)",
  "aspect": "9:16",
  "playerSpawn": "doorway_dining",
  "playerFacing": "kitchen_lane",
  "cast": [
    { "id": "grandpa", "asset": "grandpa", "spawn": "dining_center", "facing": "doorway_dining" },
    { "id": "granny", "asset": "granny", "spawn": "back_hall_left", "facing": "doorway_dining" }
  ],
  "props": [
    { "id": "jar", "type": "cookie_jar", "spawn": "key_spot", "yOffset": 0.02, "float": false }
  ],
  "skits": [
    {
      "name": "Heist & Chase",
      "beats": [
        { "at": 0.0, "type": "bgm", "sound": "fluffing_a_duck", "volume": 0.24 },
        { "at": 0.0, "type": "fade", "to": 0, "duration": 0.35 },
        { "at": 0.2, "type": "char_face", "actor": "grandpa", "followPlayer": true, "instant": true },
        { "at": 0.3, "type": "char_bubble", "actor": "grandpa", "icon": "food", "duration": 2.0 },
        { "at": 0.4, "type": "sfx", "sound": "pop", "volume": 0.78 },
        { "at": 1.6, "type": "player_gesture", "gesture": "nod_yes", "duration": 0.7 },
        { "at": 2.2, "type": "player_walk", "via": ["dining_center"], "to": "kitchen", "duration": 2.1 },
        { "at": 4.3, "type": "player_look", "target": "jar", "duration": 0.2 },
        { "at": 4.7, "type": "prop_action", "prop": "jar", "action": "pickup" },
        { "at": 4.7, "type": "player_hold", "prop": "cookie_jar" },
        { "at": 4.8, "type": "sfx", "sound": "kaching", "volume": 0.8 },
        { "at": 5.3, "type": "player_look", "target": "dining_center", "duration": 0.25 },
        { "at": 5.6, "type": "char_move", "actor": "granny", "via": ["doorway_dining"], "to": "dining_center", "anim": "walk", "duration": 2.0 },
        { "at": 6.4, "type": "player_look", "target": "granny", "duration": 0.2, "track": true },
        { "at": 7.6, "type": "char_face", "actor": "granny", "followPlayer": true, "instant": true },
        { "at": 7.6, "type": "char_bubble", "actor": "granny", "icon": "angry", "duration": 2.0 },
        { "at": 7.6, "type": "sfx", "sound": "vine_boom", "volume": 0.9, "cutBgm": true, "cutBgmDuration": 1.1 },
        { "at": 8.7, "type": "bgm", "sound": "run_amok", "volume": 0.26 },
        { "at": 8.8, "type": "char_move", "actor": "granny", "to": "kitchen_lane", "anim": "run2", "duration": 1.4 },
        { "at": 10.2, "type": "char_face", "actor": "granny", "followPlayer": true, "instant": true },
        { "at": 10.2, "type": "char_anim", "actor": "granny", "anim": "punch", "loop": false },
        { "at": 10.5, "type": "sfx", "sound": "bonk", "volume": 0.9 },
        { "at": 10.5, "type": "player_gesture", "gesture": "shake_panic", "duration": 0.7 },
        { "at": 11.1, "type": "char_move", "actor": "grandpa", "via": ["doorway_dining"], "to": "back_hall", "anim": "run2", "duration": 2.2 },
        { "at": 11.4, "type": "char_move", "actor": "granny", "via": ["doorway_dining"], "to": "back_hall", "anim": "run2", "duration": 2.2 },
        { "at": 11.5, "type": "player_look", "target": "granny", "duration": 0.25, "track": true },
        { "at": 11.6, "type": "sfx", "sound": "granny_laugh", "volume": 0.85 },
        { "at": 12.6, "type": "fade", "to": 1, "duration": 0.9 }
      ]
    }
  ]
}
```

---

## 7. Staging Safety Gate (runs on every episode)

The script is validated **before** a single frame is rendered. Two modules own this:

| Module | Responsibility |
| --- | --- |
| `src/stagingSafety.js` | Pure geometry: actor capsules, camera standoffs, sightlines, prop support, route validity. No DOM/THREE — identical in browser, exporter and tests. |
| `src/episodeSafety.js` | Script linter + auto-repair for the seven failure classes below, plus `scripts/validate-episode.mjs` (CLI). |

`EpisodeRunner.loadEpisode()` runs the gate automatically, applies the deterministic repairs, logs the report to the console and shows a toast in the studio. The export workflow runs the same CLI **before** rendering.

```bash
npm run validate:episode                       # every preset
npm run validate:episode -- --preset cookie_marathon_150s
npm run validate:episode -- --file my-episode.json --out fixed.json
npm run validate:episode -- --json             # for CI / tooling
```

Exit code is `1` when an error survives the repair pass.

### What it refuses to let through

| Code | Failure it catches | How to author it correctly |
| --- | --- | --- |
| `SPAWN_INSIDE_ACTOR` | Player/cast spawn inside another body (lens starts in a neck) | Keep `playerSpawn` **1.15m+** from every `cast[].spawn` |
| `SPAWN_OVERLAP` | Two performers spawn on top of each other | Space cast spawns **1.05m+** apart |
| `PROP_FLOATS` | `yOffset` lifting a prop into mid-air (floating cookie jar) | Put the prop on a **surface waypoint** (`kitchen_counter_top`, `dining_table_top`, `chest_spot`, `key_spot`) and omit `yOffset` |
| `PROP_OVERLAP` | Two props in the same volume (jar clipping the red button) | Give each prop its own surface/waypoint, or a `spawnOffset` |
| `PROP_INSIDE_GEOMETRY` | A prop spawned **inside** furniture (jar half-buried in the microwave) — the four-ray `isEmbedded` probe finds walls on every side | Spawn on open counter/table space, or add a `spawnOffset` that clears the object |
| `PATH_THROUGH_WALL` | A cross-room move cutting a doorframe instead of using `via` | Name every doorway in `via` — the validator prints the exact chain it computed |
| `STANDOFF_TOO_CLOSE` | `player_walk { target }` parking the lens in a face | `standoff: 1.15` or more |
| `CAMERA_CLIPS_ACTOR` | A route passing through a standing performer | Route around them, or move them first |
| `SOUND_WITHOUT_ANIM` | An SFX promising action nobody performs (eating sound, no eating) | Pair the cue with a `char_anim` / `char_prop` within ~1s |
| `PROP_STUCK_IN_HAND` | A heart bubble or friendly beat while still holding the shotgun/bat | `char_prop { "prop": "none" }` before the beat |
| `REACTION_FACING_AWAY` | `laugh` / `punch` / `terrified` played away from the lens | `char_face { "followPlayer": true, "instant": true }` first |
| `DEAD_AIR` | More than 2.5s with nothing moving | Insert a gag, a look, a bubble or a move |
| `SNAP_PAN` / `OFF_CENTER_FRAMING` | Unreadably fast pans, untracked moving subjects | `duration: 0.18–0.3`, `track: true` |
| `END_ON_STILL` / `NO_FADE` | Fading on a frozen pose, or never fading | End on `run2` / jumpscare / gesture motion |

### Automatic repairs (deterministic only)

The gate will, without asking:

- move `playerSpawn` to the nearest clear floor waypoint when it starts inside a body,
- delete a floating `yOffset` so the prop snaps to the real surface under it,
- slide an overlapping prop aside with a `spawnOffset`,
- insert the missing doorway `via` chain,
- raise a too-tight `standoff` to `1.15`,
- insert `char_face { followPlayer: true }` before reactions,
- stow a weapon (`char_prop: "none"`) before friendly beats / bubbles,
- add a matching animation for an action SFX,
- insert a short `peek_lean` in the middle of a dead-air gap.

It will **not** invent story: anything it cannot repair deterministically stays in the report as an error.

### Runtime guarantees (not just the linter)

- `PlayerCamera.resolveApproachPoint()` sweeps a ring around the subject and only accepts a lens position that is outside every actor capsule, inside the walkable shell, and has a clear sightline (`findSafeCameraSpot`).
- Player walks are re-routed through the house grid A* whenever a leg would clip geometry, and the camera **slides around** performers instead of passing through them.
- Character moves are validated leg-by-leg in `EpisodeRunner._refineChainGeometry()`; a blocked leg is replaced with a real nav-grid detour (jump arcs and stairs keep their authored arcs).
- Props are seated with a downward surface probe on load and on `show` / `pop_out`, and step aside when they would intersect another prop.
- `char_face { followPlayer: true }` keeps tracking the live camera position, so a reaction is never played to the back of the room.

---

## 8. Pre-Render Checklist & Cloud Rendering

Before rendering a new episode JSON:
0. **Run the gate:** `npm run validate:episode -- --file my-episode.json` — fix everything under `Remaining:`.
1. **No dead air > 2.5s:** Scan `beats` timestamps — every `2.5s` window should have movement, camera change, prop flight/pickup, or character action.
2. **Doorway-centered paths:** Every cross-room `player_walk` or `char_move` includes `doorway_living` / `doorway_dining` in `via`. Prefer `cut` / `char_cut` over long commutes.
3. **Close-range cause-and-effect:** Any `punch` / `hit` happens within `1.4m` of its target or right after a prop impact.
4. **Motion ending:** Final `2s` before `fade` has active `run2` chase / lunge, never a frozen pose.
5. **Run the pacing audit** (the workflow runs it automatically and blocks the render on failure):
   ```bash
   node scripts/audit-pacing.mjs the_great_escape_68s
   ```
   Compare against the reference numbers: `~68s` runtime, `0` awaited beats, `>= 8` hard cuts, look average `< 0.4s`, longest uncovered gap `<= 0.75s`.
6. **Cloud render command (zero local CPU/GPU encoding):**
   ```bash
   gh workflow run export-video.yml --ref main \
     -f preset=the_great_escape_68s \
     -f aspect=auto \
     -f fps=30 \
     -f sfx_pacer=true \
     -f format=mp4
   ```
   Rendered `.mp4` + `export-summary.json` are published automatically to the `latest-export` GitHub Release.

   For a one-off script, pass the whole JSON in the **`episode_json`** input (the workflow uses it as an override, and `preset=custom_json` also works):
   ```bash
   gh workflow run export-video.yml --ref main \
     -f preset=custom_json \
     -f episode_json="$(cat path/to/my-episode.json)" \
     -f aspect=9:16 \
     -f fps=30 \
     -f sfx_pacer=true \
     -f format=mp4
   ```
