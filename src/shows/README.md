# Long-form shows: one file per scene

A **show** is a list of **scenes**. A scene is a self-contained chunk of story with
local timings (`at` starts at `0`) that you can write, preview, validate and fix
on its own.

Shows are **continuous**: a scene boundary changes *nothing* on screen. The
player keeps their exact position, facing and held prop, the cast stays where
they were standing, and every prop stays where it was put. There is no fade, no
cut, no teleport and no reset — the boundary is an authoring/validation seam,
not an edit.

```
src/shows/
  index.js              SHOWS registry + buildShow(showId, { onlyScene })
  sceneKit.js           defineScene() contract (ids, durations, beat bounds)
  mountainDewRun/
    index.js            the storyboard (scene order)
    scene1-wake.js      14s  bedroom
    scene2-argument.js  15s  dining
    scene3-fridge.js    20s  kitchen
    scene4-bed.js       12s  bedroom
```

## Why scenes, not one big file

| One giant JSON | One file per scene |
| --- | --- |
| "the can floats somewhere around 0:50" | "scene 4, the can floats" |
| fixing scene 4 re-renders the whole risky timeline | preview scene 4 alone in 2s |
| 900 lines to diff | ~40 lines per file |
| a typo at 3:12 breaks the whole render | the gate names the scene and the beat |

### The continuity rule (this is the important one)

> **Scene N+1 starts on the exact frame scene N ended on.**

- `playerSpawn` of a scene must be where the previous scene's last walk ends.
  `checkSceneContinuity()` walks the route and warns when it isn't
  (`SCENE_START_MISMATCH`).
- A scene's `cast: { granny: {} }` (no `spawn`) means "she is still here, where
  you left her". Only the first scene that shows an actor gives them a `spawn`.
- Props are declared **once**, in the scene where they enter the story (the can
  is declared inside the fridge in scene 3) and simply persist afterwards.
- Held items persist: pick the can up in scene 3, it is still in your hand in
  scene 4.
- No `fade`, `cut` or `char_cut` beats between scenes. The only fade in a show
  is the last one.

A 5–6 minute episode is **20–24 scenes**, not one 900-line blob. Target 10–20s per
scene (4–5 story beats).

## The scene contract

```js
import { defineScene } from "../sceneKit.js";

export default defineScene({
  id: "fridge",                 // snake_case, unique in the show
  title: "The Cold One",        // shown in reports & the storyboard
  room: "kitchen",              // free-form label for the storyboard
  duration: 20,                 // seconds, must cover every beat
  playerSpawn: "dining_center", // SET_MAP name — the CUT drops the lens here
  playerFacing: "kitchen",
  cast: { granny: { spawn: "living_room", facing: "living_room_left" } },
  props: [{ id: "soda_can", type: "soda_can", spawn: "kitchen_table_top" }],
  beats: [
    { at: 0.0, type: "fade", to: 0, duration: 0.5 },
    { at: 0.2, type: "player_walk", via: ["kitchen_lane"], to: "kitchen", duration: 3.2 },
    { at: 4.8, type: "prop_action", prop: "soda_can", action: "pickup" },
    { at: 4.8, type: "player_hold", prop: "soda_can" },
  ],
});
```

Rules the kit enforces for you: `id` is snake_case, `duration > 0`, `playerSpawn`
exists, and no beat may sit past `duration`.

## Commands

```bash
node scripts/validate-episode.mjs --list-shows                 # storyboard
node scripts/validate-episode.mjs --show mountain_dew_run      # whole show, grouped by scene
node scripts/validate-episode.mjs --show mountain_dew_run --scene bed
npm run validate:episode -- --preset mountain_dew_run          # same thing as a preset
```

Studio previews:

```
?show=mountain_dew_run            full show
?show=mountain_dew_run&scene=bed  just scene 4
```

## Beat vocabulary you will actually use

| Beat | Use |
| --- | --- |
| `player_walk { to, via, duration, speed }` | POV movement; `via` is the doorway spine |
| `player_look { target, duration, track }` | whip-pan; `track: true` follows a moving actor/prop |
| `player_gesture { gesture }` | `nod_yes`, `shake_no`, `shake_panic`, `peek_lean` |
| `player_crouch { crouched }` | get low / peek over furniture |
| `player_pose { pose: "lie", surface: "up_bed_top_west" }` | lie on a real surface (bed): eye drops to the mattress, lens rolls |
| `player_hold { prop }` | bottom-right held item (`"none"` stows it) |
| `char_face { actor, followPlayer, instant }` | turns the body **and** heads the lens — always use before a taunt |
| `char_face { actor, targetActor }` | turns an actor toward **another actor** (arguments, conversations) |
| `char_anim { actor, anim, loop }` | `idle walk run run2 sneak jump laugh punch sit terrified panic` |
| `char_move { actor, to, via, anim, duration }` | staged walking, auto-detoured around walls, bodies and props |
| `char_bubble { actor, icon, duration }` | `key question exclamation zzz angry laugh food heart` |
| `prop_action { prop, action }` | `show hide pickup place open close bounce pop_out stop` — `open/close` swings a `fridge` door |
| `sfx { sound, volume }` | 28 clips; movement, pans and bubbles are automatic |
| `fade { to, duration }` | fades are for story beats, CUTs are for scene changes |

## Use the house you already have

The house FBX is merged geometry, so there are no named "bed" or "fridge"
objects — but they are there. Find them by scanning, not by guessing:

```bash
# surface-height map of a room (b = low platform / bed, t = table, H = tall unit)
node /tmp/fwtest/heat2.mjs          # drop a ray grid, read the ASCII map
```

Facts already established (don't re-invent them):

| Thing | Where | Height |
| --- | --- | --- |
| Bed (upstairs) | x -8.2..-6.8, z -3.9..-0.9 | mattress top **3.56** (`up_bed_mattress`) |
| Table (upstairs) | x -6.0..-4.2, z -1.8..-1.0 | top **3.83** (`up_bed_top_west`) — this is the table, not the bed |
| Fridge (kitchen) | x -6.9..-5.1, z -0.6..-0.1 | tall unit on the north wall (`kitchen_fridge`) |
| Counter (kitchen) | x -8.2..-7.1, z 0.2..1.3 | top **1.1** |

Never build a second bed or a second fridge — put your prop on the real thing
(the `shelf` prop exists exactly for that: a plank inside the existing fridge).

## The six rules that keep a 6-minute show clean

1. **One room cluster per scene.** A scene may cross one doorway; if it crosses
   three rooms, split it.
2. **Never teleport.** If the story needs to move, *write the walk* — across the
   boundary if necessary. Scene 2 of `mountain_dew_run` starts walking down the
   stairs scene 1 stopped on.
3. **Props enter once and persist.** Declare them where they appear in the
   story; use `seat: false` when a prop rests on something that is not house
   geometry (a fridge shelf) so staging does not drop it on the floor.
4. **`char_face { followPlayer: true }` before any taunt.** The head-tracking
   layer then keeps the face on the lens even mid-laugh. For conversations, aim
   them at each other with `targetActor`.
5. **Argue, don't fight.** `argueBeats()` (`sceneKit.js`) stages two people
   bickering with bubbles and mumble SFX — kid-safe, no punches, no terrified.
6. **Camera never stares at blank geometry.** The upstairs has a decorative
   shelf near the ceiling that reads as floating when you look straight up, so
   `player_pose lie` uses a shallow roll (`roll: -0.75`, `pitch: 0.12`) instead
   of pointing at the ceiling.
7. **Run the gate per scene while writing** (`--scene <id>`), then the whole show
   once before rendering. A `SCENE_START_MISMATCH` warning means you left a gap
   between two scenes; fix it before it becomes a visible jump.
