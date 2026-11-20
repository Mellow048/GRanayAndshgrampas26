# EPISODE_PRODUCTION_GUIDE.md — Granny POV Comedy Short Playbook

Use this guide whenever you write, generate, or render a new **Granny POV 3D Cartoon Episode** (`16:9` YouTube POV or `9:16` Shorts). Every rule here comes from real rendered output audits and maps directly to `src/config.js`, `src/episodeRunner.js`, `src/playerCamera.js`, `src/comedyProps.js`, `src/sfxEngine.js`, and `scripts/export-video.mjs`.

---

## 1. Where Everything Lives in the Repo

| What you need | Where to find it | Notes |
| --- | --- | --- |
| **Waypoints, Cast, SFX/BGM Manifest & Presets** | `src/config.js` | `SET_MAP`, `SFX_MANIFEST`, `ASSET_MANIFEST`, `GRANDPA_KEY_POV_44S`, `JUMP_RUN_WALK_EPISODE` |
| **Background Music (Looping Comedy/Chase BGM)** | `SoundEffects/backroundMusics/` + `SoundEffects/*.mp3` | Registered in `SFX_MANIFEST` with `category: "bgm"` — auto-loops in browser & FFmpeg |
| **22 Sound Effects (Impacts, Voices, UI, Cuts)** | `SoundEffects/*.mp3` | Registered in `SFX_MANIFEST` in `src/config.js` |
| **3D House & Character Models + Mixamo Clips** | `Assets/` | `GrannyHouse.fbx`, `GrannyTest6.fbx`, `grandpach3.fbx`, `Assets/AnimationTemplates/*.fbx` |
| **Timeline Engine & Beats** | `src/episodeRunner.js` | Compiles `skits[].beats` (`at` / `after`), enforces `LoopRepeat` walk/run, 1.3m personal space |
| **POV Camera & FPS Viewmodel** | `src/playerCamera.js` | Clamps pitch `[-45°, +35°]`, depth-cleared bottom-right `viewmodelScene`, gestures, fade |
| **Props & Thought Bubbles** | `src/comedyProps.js` | 6 props + 8 icon bubbles (`Emoji Ball` double-sided + camera yaw-tracking) |
| **Cloud Video Exporter** | `.github/workflows/export-video.yml` & `scripts/export-video.mjs` | Renders 30fps `.mp4`/`.webm` + mixed audio in GitHub Actions → `latest-export` release |

---

## 2. The 3 Mandatory Kids-Comedy Pacing Rules

Kids' attention drops within **3 seconds** if nothing changes visually. Bake these three rules into **every** episode JSON script you create:

### Rule 1: No Beat Over 2–2.5 Seconds Without Movement ("Zero Dead Air")
- **Never** leave the camera staring at a bobbing prop or stationary character for 3–5 seconds.
- **Every `1.5–2.5s`**, change something on screen: a whip-pan (`player_look`), camera walk (`player_walk`), crouch/peek (`player_crouch` / `peek_lean`), prop flying across the room (`pop_out` with `to` + `travelDuration`), pickup (`player_hold`), or a character moving/reacting (`char_move` / `char_anim` + `char_bubble`).
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

### Safe Room-to-Room `via` Chains
- **Back Hall ↔ Living Room (Grandpa's Room):**
  - `back_hall` → `back_room_east` → **`doorway_living`** → **`living_room_entry`** → `living_room_view`
- **Back Hall ↔ Dining Room / Kitchen:**
  - `back_hall` → **`doorway_dining`** → `dining_center` → `kitchen_lane` → `kitchen`
- **Full Cross-House Run (Kitchen → Living Room):**
  - `via: ["dining_center", "doorway_dining", "back_hall", "back_room_east", "doorway_living", "living_room_entry"]`, `to: "living_room_view"`

### Key Waypoints Reference (`src/config.js`)
- **Living Room (Grandpa's Room):** `doorway_living` (`4.4, 0, -0.7`), `living_room_entry` (`4.7, 0, 0.2`), `living_room_view` (`5.4, 0, 0.6`), `living_room` (`5.4, 0, 2.0`), `living_room_ball_bounce` (`5.5, 0, 1.7`), `granny_living_burst` (`4.2, 0, -0.7`), `chest_spot` (`6.2, 0, 2.6`), `chest_padlock` (`5.95, 0, 2.35`), `grandpa_chest_side` (`4.3, 0, 2.5`), `grandpa_step_back` (`4.0, 0, 2.9`)
- **Back Hallway & Bedroom Stairs:** `back_hall` (`0.0, 0, -2.2`), `back_hall_left` (`-0.8, 0, -3.5`), `back_hall_right` (`0.6, 0, -2.6`), `hallway` (`0.8, 0, -2.4`), `back_room_east` (`3.2, 0, -1.8`), `under_bed` (`-3.2, 0, -2.8`), `stairs` (`-3.4, 0, -2.6`)
- **Dining Room & Kitchen:** `doorway_dining` (`-3.6, 0, -1.2`), `dining_center` (`-3.6, 0, 0.4`), `hide_table` (`-4.2, 0, 2.3`), `kitchen_lane` (`-5.8, 0, 0.8`), `kitchen` (`-6.4, 0, 1.4`), `key_spot` (`-7.35, 1.13, 1.4` — elevated counter top!)
- **Other:** `foyer` (`-0.8, 0, 0.2`), `bedroom` (`-4.2, 2.85, 2.1`, upstairs)
- **Avoid:** The unroofed front porch (`x = -2.4..+1.8, z = +1.6..+5.8`) and cellar stair hole (`x = +2.4, z = -0.2..+2.8`).

---

## 5. Cast, Animations, Props & Thought Bubbles

- **Characters (`cast[]`):** `granny` (`1.65m`), `grandpa` (`1.72m`). Always spawn characters facing into the open room (`facing: "living_room_view"`, etc.), and use `char_face` with `followPlayer: true, instant: true` before dialogue/reaction beats.
- **Animations (`anim`):**
  - **Looping locomotion (use in `char_move`):** `walk`, `run`, `run2` (fast sprint), `sneak`, `granny_walk` (Granny only). `EpisodeRunner` automatically enforces `LoopRepeat` and crossfades back to `idle` on arrival.
  - **Emotes & actions (use in `char_anim`):** `idle`, `laugh` (`loop: true`), `terrified` (`loop: true`), `sit` (`loop: true`), `jump` (`loop: false`), `punch` (`loop: false`), plus Granny-only `look`, `hit`, `look_bed`.
- **Thought Bubbles (`icon`):** `key`, `question`, `exclamation`, `zzz`, `angry`, `laugh`, `food`, `heart`. Keep duration `1.4s–2.4s`. Viewport NDC clamping prevents top-edge cropping automatically.
- **Comedy Props (`type`):** `golden_key`, `padlock`, `treasure_chest`, `emoji_ball`, `toy_blaster`, `cookie_jar`.
  - Use `player_hold` (`{ "prop": "golden_key" }`) for the non-clipping bottom-right FPS viewmodel, `{ "prop": "golden_key", "use": true }` to poke/activate, and `{ "prop": null }` to clear.
  - Pitch is clamped `[-45°, +35°]`, and elevated waypoints (`y > 0.2`, e.g. `key_spot`) automatically target the prop rather than the ceiling.

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

## 7. Pre-Render Checklist & Cloud Rendering

Before rendering a new episode JSON:
1. **No dead air > 2.5s:** Scan `beats` timestamps — every `2.5s` window should have movement, camera change, prop flight/pickup, or character action.
2. **Doorway-centered paths:** Every cross-room `player_walk` or `char_move` includes `doorway_living` / `doorway_dining` in `via`.
3. **Close-range cause-and-effect:** Any `punch` / `hit` happens within `1.4m` of its target or right after a prop impact.
4. **Motion ending:** Final `2s` before `fade` has active `run2` chase / lunge, never a frozen pose.
5. **Cloud render command (zero local CPU/GPU encoding):**
   ```bash
   gh workflow run export-video.yml --ref main \
     -f preset=custom_json \
     -f custom_json="$(cat path/to/my-episode.json)" \
     -f aspect=9:16 \
     -f fps=30 \
     -f sfx_pacer=true \
     -f format=mp4
   ```
   Rendered `.mp4` + `export-summary.json` are published automatically to the `latest-export` GitHub Release.
