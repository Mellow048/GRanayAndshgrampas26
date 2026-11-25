# DIRECTOR_NOTES.md — FunnyHorrorAnimation Rules (READ THIS BEFORE WRITING A SINGLE BEAT)

> **STOP.** Every rule below comes directly from creator review & viewer retention feedback. Follow them strictly before writing or rendering an episode.

---

## 1. EXPRESSIVE, FAST BODY EMOTIONS — NO "NODDING TO TALK" LOOPS

- **NEVER** make Granny and Grandpa stand face-to-face nodding back and forth (`nod_yes` / `talk`) trying to hold an invisible conversation! Viewers cannot guess what characters are "talking" about — it feels slow, confusing, and kills retention.
- **Communicate FAST (`0.8s–1.8s` per beat) using unmistakable visual emotions:**
  - **Angry / Scolding:** `char_anim { anim: "angry" }` + `char_arm { gesture: "angry_hips" | "scold" }` + `bonk`
  - **Sad / Guilty:** `char_arm { gesture: "sad" }` + `char_gesture { gesture: "sad" | "hang_head" }` + `aww`
  - **Offering / Sharing:** `char_arm { gesture: "offer" }` facing the recipient (`char_face followPlayer: true` when offering to the Player)
  - **Shock / Surprise:** `char_gesture { gesture: "double_take" }` + `vine_boom` / `ding2`
  - **Searching / Genuine Question:** `char_arm { gesture: "idk" }` (tucked-elbow shoulder shrug) paired with strategic comic portrait `? ? ?` thought bubbles (`where_granny`, `where_grandpa`) ONLY when genuinely asking *"Where did Granny/Grandpa go?"*

### Strategic Thought Bubbles (`char_bubble` — Quality Over Spam):
- **Allowed & Recommended sparingly:** `where_granny` and `where_grandpa` (`? ? ?` + character portrait), `pizza`, `shh`, `cookie`, `idea`, `panic` ONLY to clarify a question the Player would otherwise miss (`<= 4` total in `<= 90s`, `<= 6` in longer episodes, spaced `>= 8s` apart).
- **BANNED chat icons (`THOUGHT_BUBBLE_SPAM` — EXIT CODE 1):** `heart`, `laugh`, `food`, `happy`. Never replace physical acting with thought-bubble chatter.

---

## 2. BE A LIVING "BEST BUDS" PLAYER — BREAK ROBOTIC 1-SUBJECT LOCK

You are NOT a tripod locked on one character with X-ray vision — it should feel like **you are playing Granny with your two goofy buddies (Granny & Grandpa) doing shenanigans together:**
1. **Never wall-lock behind walls:** When Grandpa or Granny disappears around a corner or behind a wall, `PlayerCamera` automatically releases tracking (`hasTargetLineOfSight`). Scan the room/doorway naturally (`yawOffset`) before re-acquiring!
2. **Don't stare monotonically at 1 character:** Break robotic fixation! Briefly glance at the other buddy, the doorway, or what just happened (`player_look` >= `0.75s` apart), even when not strictly needed — just don't spam flicks.
3. **Never ignore your buddies (Player Etiquette):** When Grandpa offers you pizza (`offer`) or Granny claps happily at you (`clap`), **look directly at them and nod/shake back (`nod_yes` / `shake_no`)**. Leaving them hanging feels cold/robotic.
4. **Make space so characters never run into your face:** Before Granny or Grandpa sprints through a doorway/hallway, actively step aside (`player_walk` to a clear side waypoint) so they pass smoothly. Pass `ghostPlayer: true` on fast chase `char_move` passes in narrow corridors if needed.

---

## 3. MOVEMENT, STEERING, PROPS & TONE LOGIC

1. **No Slow-Motion Runs (`SLOW_MOTION_RUN`):** Never override a `run` / `run2` move with an artificially long `duration` (e.g., `12s` to go `12m`). Keep sprints crisp (`>= 3.5 m/s`, ~`3.8–4.4 m/s`) so chases punch up retention!
2. **Smooth Straight Steering:** Let `houseNav.stringPullRoute` and look-ahead steering guide walks smoothly — avoid chaining redundant tiny `via` points inside the same open room.
3. **NEVER Place Props Behind Your Back & No Confusing Double-Pickups:**
   - Always `char_face` the destination (`dining_table_top`, `living_room_sofa`, `kitchen_counter_top`) BEFORE `place_down` / `glide` (the runtime also enforces `faceDest: true`). Never stare at the Player while placing an item behind your back.
   - Never make a character put an item down only to pick the same item back up 2 seconds later without a clear story interruption.
4. **No Out-of-Tone Dancing During Serious Confrontations:**
   - Save `chicken_dance` and `hip_hop_dance` for earned lighthearted gag/party payoffs — NEVER drop a dance right after someone gets busted stealing or scolded.
5. **Zero Furniture Clipping (`FURNITURE_COLLISION` — EXIT CODE 1):** Always route floor walks via floor waypoints clear of `dining_table`, `kitchen_table`, `living_room_sofa`, and beds (`src/furnitureColliders.js`).
6. **No Unmotivated Explosions (`UNMOTIVATED_EXPLOSION_SFX`) or SFX/Taunt Spam:** Keep `granny_i_see_you` `<= 2x` (`>= 30s` apart) and `< 3` comedic SFX per `2.5s` window.
7. **Always Render Full Episodes in One Go (Direct `.mp4`, Zero Chunk Seams / Zips):** Use single-pass full export (`export-video.yml` or `export-long-episode.yml` with `max_chunk_sec: 999`) so characters never snap/teleport 1 inch at chunk boundaries, and share the direct `latest-export/*.mp4` release download URL (never force unpacking `.zip` artifacts).
