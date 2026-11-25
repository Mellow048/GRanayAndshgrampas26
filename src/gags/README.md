# Gag Modules (`src/gags/`) — 60-Second Authoring Guide

Every episode in this studio is built by **chaining small, self-contained gag modules** (`10–25s` each) through `buildEpisode()` in `src/episodeBuilder.js`.

Do **not** write giant monolithic `after`/`await` timelines. Write a small gag function here, register it in `src/gags/index.js`, preview it instantly at `?gag=<yourGag>`, and reuse it across rooms and episodes!

---

## Copy-Paste Gag Template (`src/gags/myGag.js`)

```js
import { GAG_LOCATIONS } from "./locations.js";
import { reactFast, sneakUp, chasePast, lookAt, propAction, playerReply, placeOnSurface } from "./helpers.js";

export function myGag({
  victim = "grandpa",
  chaser = "granny",
  location = "kitchen_to_hall",
} = {}) {
  const loc = GAG_LOCATIONS[location] || GAG_LOCATIONS.kitchen_to_hall;

  return {
    name: `My Gag (${loc.label})`,
    duration: 14,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [victim]: { spawn: loc.mid, facing: loc.start },
      [chaser]: { spawn: loc.chaserSpawn, facing: loc.mid },
    },
    props: [
      { id: "my_prop", type: "cookie_jar", spawn: "dining_table_top", visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: victim, duration: 0.3, track: true }),

      // Fast, clear acting every <= 2.0s (no dead air, no banned chat icons!)
      ...sneakUp({ at: 0.3, actor: victim, to: loc.start, duration: 1.8, sfx: "pop" }),
      ...propAction({ at: 2.2, prop: "my_prop", action: "bounce", sfx: "eat" }),

      ...reactFast({ at: 3.4, actor: chaser, emotion: "angry", targetActor: victim, sfx: "granny_i_see_you" }),
      ...reactFast({ at: 5.2, actor: victim, emotion: "sad", targetActor: chaser }),
      ...chasePast({ at: 6.8, runner: chaser, via: loc.via, to: loc.exit, playerStepTo: loc.hit, playerLookTarget: chaser, duration: 2.4 }),
      ...placeOnSurface({ at: 9.6, actor: victim, prop: "my_prop", to: "dining_table_top", duration: 1.0 }),
      ...reactFast({ at: 11.0, actor: chaser, emotion: "happy", facePlayer: true, sfx: "tada" }),
      ...playerReply({ at: 11.4, lookTarget: chaser, gesture: "nod_yes", duration: 0.8 }),
      { at: 13.0, type: "fade", to: 1, duration: 0.8 },
    ],
  };
}
```

---

## Hard Rules Inside a Gag

1. **Use ONLY local `at` times (`0` = start of gag).** Never use `after` or `await` inside `beats`.
2. **Never leave dead air `> 2.0s`.** Something visual (`player_look`, `player_walk`, `char_move`, `char_anim`, `char_bubble`, `prop_action`, `player_gesture`) must happen at least every 2 seconds.
3. **Keep `player_look` short (`0.18–0.30s`).** Never spin or circle the camera for seconds at a time.
4. **Never use raw XYZ coordinates.** Only use `GAG_LOCATIONS` fields or `SET_MAP` waypoint names.
5. **Cross-room moves MUST include `via`.** `loc.via` already carries the collision-free doorway spine.
6. **Zero state leaks:** `buildEpisode()` inserts `0.4s` black-frame `CUT`s between gags that automatically clear held FPS props, reset actor props, hide unused props from previous gags, and reset shared props.

---

## Available Helpers (`src/gags/helpers.js`)

| Helper | What it emits |
| --- | --- |
| `reactFast({ at, actor, emotion, targetActor, facePlayer, bubble, sfx })` | Crisp emotion (`"angry"`, `"sad"`, `"shock"`, `"idk"`, `"offer"`, `"happy"`) + SFX |
| `placeOnSurface({ at, actor, prop, to, duration, sfx })` | Faces surface `to`, lowers arm (`place_down`), and glides `prop` cleanly onto it |
| `playerReply({ at, lookTarget, gesture, stepTo, duration })` | Player turns politely to look + `nod_yes` / `shake_no` (or steps aside) |
| `chasePast({ at, runner, to, via, playerStepTo, duration })` | Steps Player aside first, then sprints `runner` fast (`>= 3.6 m/s`, `ghostPlayer: true`) |
| `bestBudsGlance({ at, primary, secondary, gap })` | Natural two-buddy glance breaking robotic 1-subject focus |
| `cookAndServe({ at, chef, guest, plateProp, serveWp, tableWp })` | Stir -> carry -> offer under nose -> face surface -> set down cleanly |
| `handItemTo({ at, giver, receiver, prop, targetHeight })` | Turn & offer prop straight into receiver's hand/nose |
| `launchProp({ at, prop, from, to, travelDuration, yOffset, sfx, track })` | `pop_out` flight across room + `whoosh` + camera `track` |
| `chase({ at, victim, chaser, via, to, duration, stagger, anim, bgm })` | Staggered two-actor chase (`stagger: 0.35–0.45` avoids body clipping) |
| `sneakUp({ at, actor, to, via, duration, icon, sfx })` | Sneak walk (`anim: "sneak"`) + optional thought bubble & SFX |
| `walkTo({ at, to, via, duration, speed, lookTarget })` | First-person `player_walk` + quick `player_look` |
| `propAction({ at, prop, action, waypoint, yOffset, sfx })` | Shorthand for `show`, `hide`, `open`, `close`, `bounce`, `pickup`, `stop` |
| `holdProp({ at, prop, use, duration, sfx })` | Pick up / use FPS held item (auto-cleared on next `CUT`) |
| `lookAt({ at, target, duration, track })` | Whip-pan camera look (`0.18–0.45s`) |
| `panic({ at, duration, gesture, sfx })` | Camera gesture (`shake_panic`, `nod_yes`, `shake_no`, `shake_earthquake`) |

---

## Register, Preview & Verify

1. Export your gag in `src/gags/index.js` and add it to `GAG_REGISTRY`.
2. Preview instantly in the browser:
   - `http://localhost:8000/?gag=myGag`
   - `http://localhost:8000/?gag=myGag&location=living_to_hall`
   - Or pick it from **Preset -> Gag Lab (Single Gag Preview)** in the Studio UI.
3. Validate pacing + 3D wall collisions in 1 command:
   ```bash
   node scripts/audit-pacing.mjs --gags
   node scripts/verify-3d.mjs --gags
   ```
