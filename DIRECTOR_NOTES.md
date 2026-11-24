# DIRECTOR_NOTES.md — FunnyHorrorAnimation Rules (READ THIS BEFORE WRITING A SINGLE BEAT)

> **STOP.** If you violate ANY rule below, `npm run validate:episode` and `npm run validate:strict` will **HARD-FAIL (exit code 1)**. Read every line.

---

## 1. DO NOT USE THOUGHT BUBBLES (`char_bubble`) FOR COMMUNICATION

In the **FunnyHorrorAnimation** YouTube style, characters **NEVER** have conversations using floating emoji thought bubbles (`heart`, `laugh`, `food`, `happy`, `?`, `!`). Thought bubble spam turns the video into an annoying guessing game and confuses viewers.

### How Characters Actually Communicate Here:
1. **Look at each other:** `char_face` (`{ type: "char_face", actor: "granny", targetActor: "grandpa" }`)
2. **Nod or shake head:** `char_gesture` (`nod_yes`, `nod`, `shake_no`, `tilt`, `double_take`)
3. **Simple greeting or pointing:** `char_arm` (`wave`, `point`, `offer`, `stir`, `carry`, `place_down`, `sniff`)
4. **Use the zero-bubble macros in `src/gags/helpers.js`:**
   - `greetAndNod({ at, a: "granny", b: "grandpa" })` — turn to each other, wave, nod back.
   - `dialogueExchange({ at, a: "granny", b: "grandpa", turns: 2 })` — face each other + nod/tilt/shake + wave/point.

### Hard Validator Limits (`THOUGHT_BUBBLE_SPAM` — EXIT CODE 1):
- **BANNED icons:** `heart`, `laugh`, `food`, `happy` are **HARD-BANNED** on `char_bubble`.
- **Hard cap:** Maximum **0–2** thought bubbles total in episodes `<= 90s` (prefer **0**!), and max **4** total in 2–5 minute episodes.
- **Minimum spacing:** Never place two `char_bubble` beats within **15 seconds** of each other.
- Only use `!` or `?` in rare, extreme shock moments — NEVER to explain a plot beat that should be shown physically!

---

## 2. DO NOT USE MINECRAFT EXPLOSIONS (`explode` / `explode_meme`) UNLESS SOMETHING ACTUALLY EXPLODES

- **NEVER** play `explode` or `explode_meme` when a character jumps, trips, bonks, gets surprised, or drops a prop.
- `UNMOTIVATED_EXPLOSION_SFX` is a **HARD ERROR**: `explode` / `explode_meme` is rejected unless an actual explosive prop (`tnt`, `bomb`, `fireball`, `red_button` trap) triggers within `2.0s`.
- Use SFX that actually match the action:
  - Jump / toss / fast turn → `whoosh`
  - Bonk / trip / bump → `bonk` or `thud`
  - Subtle reveal / funny realization → `vine_boom` (sparingly!)
  - Pickup / item grab → `kaching` or `pop`

---

## 3. DO NOT SPAM TAUNTS OR RANDOM SOUND EFFECTS

- **`granny_i_see_you` (`TAUNT_SFX_SPAM` — HARD ERROR):** Maximum **2 times per entire episode**, at least **30 seconds apart**, and **ONLY** when Granny literally catches someone sneaking or hiding. Never play `"I SEE YOU"` at an empty room or when standing face-to-face.
- **No SFX slot-machine spam (`SFX_OVERLOAD_SPAM` — HARD ERROR):** Never fire **3 or more comedic SFX within any 2.5-second window**. Let silence, music, and physical acting sell the comedy.
- Do not stack `giggle` / `crowd_aww` / `boing` / `level_up` every second.

---

## 4. SHOW PHYSICAL INTERACTIONS — NEVER FLOAT PROPS OR CLIP INTO COUNTERS

- **Holding food/items:** ALWAYS attach held props to the character's hand using `{ type: "prop_action", prop: "pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] }` while they carry it, and `{ action: "glide", to: "kitchen_table_top", duration: 0.9 }` to set it down cleanly. Never float a pizza 1 meter in the air!
- **Kitchen counter clipping:** Never walk straight across the L-shaped kitchen counter — route through open floor waypoints (`kitchen_center`, `kitchen_doorway`).
- **Actor separation:** Never spawn or walk Granny and Grandpa onto the exact same waypoint. Keep them at least `1.05m` apart (the runtime also enforces a `0.82m` live repulsion bubble).
- **Camera sightlines:** Never park the POV camera behind a doorframe or wall. Always run `npm run validate:strict` before rendering!
