# Gag Modules (`src/gags/`) — 60-Second Authoring Guide

Every episode in this studio is built by **chaining small, self-contained gag modules** (`10–25s` each) through `buildEpisode()` in `src/episodeBuilder.js`.

Do **not** write giant monolithic `after`/`await` timelines. Write a small gag function here, register it in `src/gags/index.js`, preview it instantly at `?gag=<yourGag>`, and reuse it across rooms and episodes!

---

## Copy-Paste Gag Template (`src/gags/myGag.js`)

```js
import { GAG_LOCATIONS } from "./locations.js";
import { react, sneakUp, chase, lookAt, propAction, walkTo, panic } from "./helpers.js";

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
      { id: "my_prop", type: "cookie_jar", spawn: loc.start, yOffset: 0.72, visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: victim, duration: 0.22, track: true }),

      // Action every <= 2.0s (no dead air!)
      ...sneakUp({ at: 0.3, actor: victim, to: loc.start, duration: 1.8, icon: "food", sfx: "pop" }),
      ...propAction({ at: 2.2, prop: "my_prop", action: "bounce", sfx: "eat" }),

      ...react({ at: 4.5, actor: chaser, anim: "idle", icon: "angry", sfx: "granny_i_see_you", cutBgm: true }),
      ...chase({ at: 6.0, victim, chaser, via: loc.via, to: loc.exit, duration: 2.4, stagger: 0.35, bgm: "run_amok" }),
      ...walkTo({ at: 6.4, to: loc.hit, duration: 1.8, lookTarget: victim }),
      ...panic({ at: 10.5, gesture: "nod_yes", duration: 0.6 }),
      ...propAction({ at: 12.0, prop: "my_prop", action: "hide" }),
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
| `react({ at, actor, anim, loop, icon, bubbleDur, sfx, cutBgm, facePlayer })` | Auto-facing `char_anim` + `char_bubble` + optional `sfx`/BGM duck |
| `launchProp({ at, prop, from, to, travelDuration, yOffset, sfx, track })` | `pop_out` flight across room + `whoosh` + camera `track` |
| `chase({ at, victim, chaser, via, to, duration, stagger, anim, bgm })` | Staggered two-actor chase (`stagger: 0.35–0.45` avoids body clipping) |
| `sneakUp({ at, actor, to, via, duration, icon, sfx })` | Sneak walk (`anim: "sneak"`) + optional thought bubble & SFX |
| `walkTo({ at, to, via, duration, speed, lookTarget })` | First-person `player_walk` + quick `player_look` |
| `propAction({ at, prop, action, waypoint, yOffset, sfx })` | Shorthand for `show`, `hide`, `open`, `close`, `bounce`, `pickup`, `stop` |
| `holdProp({ at, prop, use, duration, sfx })` | Pick up / use FPS held item (auto-cleared on next `CUT`) |
| `lookAt({ at, target, duration, track })` | Whip-pan camera look (`0.18–0.30s`) |
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
