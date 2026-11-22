/**
 * "Granny's Cookie Jar Heist (15s POV)" — a 15-second first-person short.
 *
 * Written to exercise every staging rule the framework now enforces:
 *  - the player spawns 2.4 m clear of both performers (no lens-in-a-neck),
 *  - the cookie jar is seated on the dining table surface (no floating jar),
 *  - Granny walks in through `doorway_dining` instead of clipping the frame,
 *  - the lens stands off 1.55 m from Grandpa and re-aims with `track`,
 *  - no 2.5 s window is empty, and the short ends on a punch + panic,
 *  - every reaction turns to the camera first (`char_face followPlayer`).
 *
 * Run `node scripts/validate-episode.mjs --preset granny_cookie_heist_15s`
 * before rendering; the gate must report 0 errors.
 */
export const GRANNY_COOKIE_HEIST_15S = {
  title: "Granny's Cookie Jar Heist (15s POV)",
  aspect: "16:9",
  playerSpawn: "dining_center",
  playerFacing: "dining_table_front",
  cast: [
    {
      id: "grandpa",
      asset: "grandpa",
      spawn: "dining_table_side",
      facing: "dining_center",
    },
    {
      id: "granny",
      asset: "granny",
      spawn: "doorway_dining",
      facing: "dining_center",
    },
  ],
  props: [{ id: "cookie_jar", type: "cookie_jar", spawn: "dining_table_top", rotationY: -0.4 }],
  skits: [
    {
      name: "Cookie Jar Heist",
      beats: [
        // 0.0 — 4.0  Sneak up to the table, Grandpa is guarding the jar.
        { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.24 },
        { at: 0.0, type: "fade", to: 0, duration: 0.5 },
        {
          at: 0.2,
          type: "player_walk",
          via: ["dining_table_front"],
          to: "dining_table_btn",
          duration: 2.2,
        },
        { at: 2.4, type: "player_look", target: "cookie_jar", duration: 0.24 },
        { at: 2.5, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
        { at: 2.6, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true },
        { at: 2.7, type: "char_bubble", actor: "grandpa", icon: "laugh", duration: 1.5 },
        { at: 2.8, type: "sfx", sound: "aww", volume: 0.6 },
        { at: 3.9, type: "prop_action", prop: "cookie_jar", action: "bounce" },
        { at: 4.0, type: "sfx", sound: "pop", volume: 0.7 },

        // 4.0 — 6.4  The player grabs the jar; Grandpa realises.
        { at: 4.2, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
        { at: 4.3, type: "prop_action", prop: "cookie_jar", action: "pickup" },
        { at: 4.3, type: "player_hold", prop: "cookie_jar" },
        { at: 4.4, type: "sfx", sound: "kaching", volume: 0.75 },
        { at: 5.0, type: "player_look", target: "grandpa", duration: 0.24, track: true },
        { at: 5.1, type: "char_anim", actor: "grandpa", anim: "terrified", loop: true },
        { at: 5.2, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.4 },
        { at: 5.3, type: "sfx", sound: "discord", volume: 0.8 },

        // 6.4 — 9.9  Granny walks in through the doorway — caught red-handed.
        { at: 6.4, type: "char_face", actor: "granny", followPlayer: true, instant: true },
        { at: 6.5, type: "player_look", target: "granny", duration: 0.22, track: true },
        {
          at: 6.6,
          type: "char_move",
          actor: "granny",
          via: ["doorway_dining"],
          to: "dining_center",
          anim: "run",
          duration: 1.4,
        },
        { at: 6.6, type: "sfx", sound: "granny_chase", volume: 0.85, cutBgm: true, cutBgmDuration: 1.0 },
        { at: 8.1, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
        { at: 8.2, type: "char_bubble", actor: "granny", icon: "laugh", duration: 1.6 },
        { at: 8.3, type: "sfx", sound: "granny_laugh", volume: 0.8 },
        { at: 9.8, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
        { at: 9.9, type: "sfx", sound: "aww", volume: 0.7 },

        // 9.9 — 15.0  The lunge, the punch, the jumpscare, fade on motion.
        {
          at: 10.4,
          type: "char_move",
          actor: "granny",
          to: "dining_table_front",
          anim: "run2",
          duration: 1.3,
        },
        { at: 10.5, type: "player_look", target: "granny", duration: 0.24, track: true },
        { at: 10.5, type: "sfx", sound: "granny_i_see_you", volume: 0.85 },
        { at: 11.8, type: "player_hold", prop: "none" },
        { at: 11.9, type: "char_anim", actor: "granny", anim: "punch", speed: 1.2 },
        { at: 12.0, type: "sfx", sound: "bonk", volume: 0.9 },
        { at: 12.5, type: "player_gesture", gesture: "shake_panic", duration: 1.3 },
        { at: 12.6, type: "sfx", sound: "jumpscare", volume: 0.95 },
        { at: 13.6, type: "fade", to: 1, duration: 1.2 },
      ],
    },
  ],
};

export default GRANNY_COOKIE_HEIST_15S;
