# AGENTS.md — Granny POV 3D Cartoon Studio (Remastered Agent Playbook)


## 0. HARD-ENFORCED FUNNYHORRORANIMATION RULES (READ FIRST — VIOLATIONS FAIL VALIDATION!)

See `DIRECTOR_NOTES.md` for full details. Every rule below is **hard-enforced (exit code 1)** by `validate:episode`:

1. **NO THOUGHT BUBBLES (`char_bubble`) FOR COMMUNICATION (`THOUGHT_BUBBLE_SPAM`):** Characters communicate **FunnyHorrorAnimation style** — by looking at each other (`char_face`), nodding/shaking (`char_gesture: "nod_yes" | "shake_no" | "tilt"`), and waving/pointing (`char_arm: "wave" | "point"`). Use `greetAndNod()` or `dialogueExchange()`. **BANNED icons:** `heart`, `laugh`, `food`, `happy`. Max **0–2** shock bubbles (`!` / `?`) in `<= 90s` (max 4 in longer shows), spaced `>= 15s` apart. Prefer **ZERO** bubbles.
2. **NO MINECRAFT EXPLOSIONS WITHOUT AN EXPLOSION (`UNMOTIVATED_EXPLOSION_SFX`):** Never play `explode` or `explode_meme` on jumps, trips, bonks, or surprises. Rejected unless an explosive prop actually detonates on screen.
3. **NO TAUNT OR SFX SPAM (`TAUNT_SFX_SPAM`, `SFX_OVERLOAD_SPAM`):** `granny_i_see_you` max **2x/episode** (`>= 30s` apart) and ONLY when spotting a hider. Never fire 3+ comedic SFX inside any `2.5s` window.
4. **NO FLOATING PROPS OR BODY/COUNTER CLIPPING:** Always `attach` held props to hands and `glide` them to real surface waypoints (`kitchen_table_top`, `dining_table_top`). Route kitchen walks through `kitchen_center`.

---

This repository is a zero-build Three.js (`v0.170.0`) first-person **Granny POV Kids-Comedy 3D Cartoon Studio** set inside the Granny 1 House (`./Assets/granny-1-house/source/GrannyHouse.fbx`).

Read this playbook **before** writing any episode. Every rule below is enforced by `npm run validate:episode`, `npm test`, `npm run story -- --all`, and `node scripts/audit-pacing.mjs --all`.

---

## 1. Pick ONE Authoring Mode (Never Mix Legacy Formats)

Do **not** write giant monolithic raw JSON timelines with `after` or `await: true`. Choose one of the two supported modular formats:

| Goal | Use This | Transitions | Where Files Live |
| --- | --- | --- | --- |
| **Continuous story episode (`1–6 min`)** | `defineScene()` + `buildShow()` | **Continuous** (no cuts, no fades, actors & props stay where you left them) | `src/shows/<showId>/scene*.js` |
| **Short comedy gag or variety pack (`10–150s`)** | Gag function + `buildEpisode()` | **`0.4s` black-frame `CUT`** (auto-resets actors, props, held items between gags) | `src/gags/<myGag>.js` + `src/episodes.js` |

Both formats use **local `at` timestamps starting at `0`** inside each scene/gag. Never use `after` or `await: true`.

---

## 2. Check What Exists Before Writing a Beat

Never guess an animation, prop, gesture, or beat name. Run:

```bash
npm run catalogue        # human-readable capability list
npm run catalogue:json   # machine-readable JSON for agents
```

`src/schema.js` is the single source of truth. **`validate:episode` rejects any `UNKNOWN_PROP_TYPE` or `UNKNOWN_BEAT_TYPE` as a hard error.**

- **13 Props (`PROP_TYPES`):** `golden_key`, `padlock`, `red_button`, `emoji_ball`, `toy_blaster`, `treasure_chest`, `delivery_box`, `rising_lava`, `cookie`, `cookie_jar`, `soda_can`, `bed`, `shelf`
- **23 Beats (`BEAT_TYPES`):** `char_anim`, `char_gesture`, `char_move`, `char_face`, `char_bubble`, `char_cut`, `char_prop`, `char_prop_action`, `player_walk`, `player_look`, `player_gesture`, `player_crouch`, `player_pose`, `player_hold`, `prop_action`, `cut`, `fade`, `bgm`, `stop_bgm`, `sfx` (plus legacy aliases `anim`, `move`, `face`)
- **22 Animations:** 15 Mixamo FBX (`walk`, `run`, `run2`, `sneak`, `jump`, `laugh`, `punch`, `sit`, `terrified`, `panic`, `angry`, `talk`, `kick`, `mma_kick`, `trip`) + 7 procedural head gestures (`nod`, `nod_yes`, `nod_once`, `shake`, `shake_no`, `tilt`, `double_take`)

---

## 3. Hard Camera Discipline (No Distracted or Flicking POV)

1. **No rapid flicking (`RAPID_LOOK_FLICK`):** Space `player_look` beats at least **`0.5s` apart** (unless separated by a `cut`). Keep `duration` between `0.20s` and `0.50s` (`< 0.16s` triggers `SNAP_PAN`).
2. **Never stare at empty air (`LOOK_AT_HIDDEN_PROP`):** Never target a prop with `player_look` after it has been `hide` or `pickup`-ed. The runtime also auto-releases `trackingRef` if a tracked prop disappears.
3. **Track moving subjects (`OFF_CENTER_FRAMING`):** Whenever looking at an actor who is walking/running, set `track: true`.
4. **Walking while looking:** Use `walkTo({ at, to, lookTarget })` in `src/gags/helpers.js` (or set `lookAhead: false` on `player_walk` + `track: true` on `player_look`). Explicit `player_look` beats now lock camera gaze for the remainder of the walk so `autoLook` never yanks the lens back forward.
5. **No random `peek_lean`:** Never use `peek_lean` unless the story specifically calls for peeking around a corner. The auto-repair gate never injects `peek_lean`.

---

## 4. Hard Grounding & Navigation Rules (No Floating Objects or Characters)

1. **Real 2-floor house + built-in wooden staircase (`src/nav/houseNav.js`):** `loadHouse()` builds the wooden staircase connecting Floor 1 (`stairs_bottom`) to Floor 2 (`stairs_top` / `upstairs_landing`), and `houseNav.js` routes seamlessly across both floors. **NEVER spawn a fake `bed` prop on the 1st floor (`FAKE_GROUND_FLOOR_BED`)** — always wake up and sleep in the real 2nd-floor Granny 1 Spawn Bedroom (`up_bed_side` / `up_bed_mattress`).
2. **Do NOT use `yOffset` to float props:** Place props on real surface waypoints (`kitchen_table_top`, `kitchen_counter_top`, `dining_table_top`, `living_room_sofa`, `living_room_shelf_top`, `chest_spot`) and omit `yOffset`.
3. **Custom non-house surfaces:** If a prop rests on another spawned prop (like `soda_can` on `fridge_shelf`, or `bed` at `bed_home`), set `seat: false` on the prop definition so `ComedyPropManager` preserves its exact authored height.
4. **Keep spawns separated:** `playerSpawn` must be `>= 1.15m` from every actor; actors must spawn `>= 1.05m` apart. Use verified ground-floor packs in `src/gags/locations.js` (`kitchen_to_hall`, `living_to_hall`, `foyer_to_dining`, `hall_to_foyer`).
5. **Cast yields, lens stays steady:** `LensShield` (`src/lensShield.js`) prevents camera-in-furniture clipping; actors step out of the `0.8m` lens bubble instead of shoving the camera.

---

## 5. Story Spine Rule (Episodes `>= 60s`)

Any episode `>= 60s` must declare:
```js
story: {
  premise: "...",
  goal: "...",
  goalProp: "cookie",
  resolution: "...",
  scenes: [{ objective: "...", obstacle: "...", turn: "..." }]
}
```
The `goalProp` must appear on camera in setup, conflict, and payoff, and consecutive scenes cannot repeat the same objective.

---

## 6. Mandatory Pre-Push Verification Gate

Run all four checks before committing or rendering — every single one must exit `0`:

```bash
node --check src/*.js src/episodes/*.js src/gags/*.js src/shows/*.js src/shows/mountainDewRun/*.js scripts/*.mjs
npm test
npm run validate:episode
npm run story -- --all
node scripts/audit-pacing.mjs --all
```

### Local Preview & Cloud Render
```bash
python3 -m http.server 8000
# Studio:      http://localhost:8000
# Single Gag:  http://localhost:8000/?gag=cookieHeist&location=kitchen_to_hall
# Single Show: http://localhost:8000/?show=mountain_dew_run
# One Scene:   http://localhost:8000/?show=mountain_dew_run&scene=fridge

# Cloud render (<= 3 min):
gh workflow run export-video.yml -f preset=mountain_dew_run -f fps=30 -f format=mp4
```

---

## 7. v2.1 Video-Hardened Quality Rules (Enforced by `validate:episode`)

1. **Never look at an empty spot (`LOOK_AT_EMPTY_SPOT`):** Every `player_look` must aim at an actor, a visible prop, or the destination of an upcoming walk — never an empty bookshelf, wall, or armchair.
2. **Never leave the camera in an empty room (`EMPTY_FRAME_DEAD_AIR`):** Offscreen SFX do not count as visual action. Never sit `> 3.5s` with no actor within `5.5m` of the camera.
3. **Never repeat empty commutes (`LONG_EMPTY_COMMUTE` / `REPETITIVE_ROOM_LOOP`):** Keep walks `<= 3.5s` and never walk to the same room 3+ times without a cut or an in-room gag.
4. **Never collide in narrow doorways (`DOORWAY_BOTTLENECK`):** Stagger player and actor doorway crossings by `>= 1.6s`.
5. **Never spawn actors on narrow tables (`ACTOR_ON_NARROW_TABLE`):** Spawn actors on floor waypoints beside tables; elevated landings automatically seat via live bounding-box bottom (`seatOnSurface`).
6. **Held FPS items (`player_hold`):** Reserved for handheld items (auto-normalized to `0.26m` max viewmodel size so custom props never fill half the screen).
7. **Kid-safe defaults & clean audio:** Granny's `BatBloody` is hidden by default unless `prop: "bat"` is explicitly passed; random phantom `pop`/`ding`/`click` audio gap-spam is disabled; idle actors have subtle breathing/sway; `player_pose: "lie"` roll is clamped to `[-0.30, +0.30]` so the camera never clips into the sky void.

---

## 8. v3.0 Expressive Physical Acting ("Show, Don't Tell")

Never leave actors standing motionless with a thought bubble or teleport props out of thin air (`BUBBLE_WITHOUT_ACTING` & `LAZY_PROP_POP`):

- **Procedural arm & upper-body acting (`char_arm`):** Layer on top of any clip (no FBX needed):
  - `stir` (cooking/stirring), `offer` / `reach_out` (holding food/item right up to someone's face), `carry` (holding a tray/plate with both arms), `place_down` (setting down on a table), `wave`, `point`, `sniff` (leaning in to smell hot food).
- **Smooth physical prop motion (`prop_action: "glide"`):** Glides a prop along a curved arc from a counter or actor's hand (`fromActor`) directly to a table waypoint OR right under another actor's nose (`to: "grandpa", targetHeight: "nose"`).
- **Everyday storytelling props (with animated rising steam):** `frying_pan`, `breakfast_plate`, `coffee_mug`, `serving_tray`, `pillow`.
- **Gold-standard reference:** Read `src/gags/breakfastSurprise.js` (`preset=breakfast_surprise_20s`) before writing any cooking, serving, or object-interaction scene.

---

## 9. v3.1 Out-of-the-Box Primitives (Zero Engine Edits Required)

1. **Invent ANY 3D prop inline (`type: "custom"`):** Never edit `comedyProps.js` just to add a toy car, cake, pizza box, or broom. Declare `parts: [{ shape: "box"|"cylinder"|"sphere"|"cone"|"torus", size: [...], pos: [...], rot?: [...], color: 0x... }]` (plus optional `steam: true`) directly inside `props: [...]`.
2. **Lock props to live hands (`prop_action: "attach"` / `"detach"`):** Attach any prop to an actor's hand (`{ type: "prop_action", prop: "plate", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] }`) so it moves 100% locked to their hand while walking and turning, then `glide` or `place` it smoothly.
3. **Invent ANY arm/torso motion inline (`char_arm` with `gesture: "custom"`):** Pass `rUpper`, `rFore`, `lUpper`, `lFore`, `spine` (`[x, y, z]` radians) + optional `oscillate: [x, y, z]` and `cycles` right inside a `char_arm` beat.
4. **High-level physical macros (`src/gags/helpers.js`):** Use `cookAndServe()`, `handItemTo()`, and `dialogueExchange()` to author rich physical scenes in 1 line.
5. **Instant scaffolding & strict zero-warning gate:**
   ```bash
   npm run new:episode -- --name my_scene --mode gag   # or --mode show
   npm run validate:strict -- --preset <your_preset>   # fails on ANY error OR warning
   ```
