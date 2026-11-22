import { defineScene } from "../sceneKit.js";

/**
 * Scene 2 — The Argument (15s)
 *
 * Granny and Grandpa are going at it across the dining table. We walk in, both
 * of them turn to glare at us (head tracking), we sigh and leave.
 */
export default defineScene({
  id: "argument",
  title: "The Argument",
  room: "dining",
  duration: 15,
  playerSpawn: "stairs_bottom",
  playerFacing: "dining_center",
  cast: {
    granny: { spawn: "dining_table_side", facing: "dining_table_btn" },
    grandpa: { spawn: "dining_table_btn", facing: "dining_table_side" },
  },
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
    { at: 0.0, type: "fade", to: 0, duration: 0.6 },
    { at: 0.2, type: "player_walk", via: ["dining_corner"], to: "dining_center", duration: 3.0 },

    // Both of them clock us and keep arguing at the camera.
    { at: 0.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
    { at: 0.5, type: "char_anim", actor: "grandpa", anim: "punch", loop: true },
    { at: 0.6, type: "sfx", sound: "discord", volume: 0.7 },
    { at: 1.2, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 1.6 },
    { at: 1.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 1.6, type: "char_anim", actor: "granny", anim: "punch", loop: true },
    { at: 1.9, type: "char_bubble", actor: "granny", icon: "angry", duration: 1.6 },
    { at: 2.1, type: "sfx", sound: "bonk", volume: 0.55 },

    // We look from one to the other...
    { at: 3.4, type: "player_look", target: "grandpa", duration: 0.26, track: true },
    { at: 4.4, type: "player_look", target: "granny", duration: 0.26, track: true },
    { at: 5.4, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
    { at: 5.5, type: "sfx", sound: "aww", volume: 0.7 },

    // ...and give up on the whole thing.
    { at: 6.6, type: "player_look", target: "dining_table_front", duration: 0.3, track: false },
    { at: 6.8, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true },
    { at: 7.0, type: "sfx", sound: "granny_laugh", volume: 0.7 },
    { at: 7.4, type: "char_move", actor: "granny", to: "dining_table_front", anim: "run", duration: 1.3 },
    { at: 8.8, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.3 },
    { at: 9.0, type: "sfx", sound: "vine_boom", volume: 0.7 },
    { at: 9.6, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 10.4, type: "char_anim", actor: "grandpa", anim: "terrified", loop: true },
    { at: 10.5, type: "char_bubble", actor: "grandpa", icon: "question", duration: 1.2 },
    { at: 11.0, type: "player_look", target: "kitchen", duration: 0.3, track: false },
    { at: 11.6, type: "sfx", sound: "swoosh", volume: 0.5 },
    { at: 12.4, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
    { at: 13.2, type: "player_gesture", gesture: "shake_panic", duration: 0.8 },
    { at: 13.4, type: "sfx", sound: "glitch", volume: 0.45 },
  ],
});
