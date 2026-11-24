import { defineScene } from "../sceneKit.js";

/**
 * Scene 1 — Wake Up (12s)
 *
 * Wakes up in the REAL built-in 2nd-floor Granny 1 Spawn Bedroom (`up_bed_mattress` /
 * `up_bed_side` — never spawns a fake bed on the 1st floor!), stands up, walks out
 * of the bedroom, and heads down the wooden staircase to the 1st-floor hall corner.
 */
export default defineScene({
  id: "wake",
  title: "Wake Up (2nd Floor Spawn Bedroom)",
  room: "upstairs_bedroom",
  duration: 12,
  playerSpawn: "up_bed_side",
  playerFacing: "up_bed_mattress",
  notes: "Real 2nd-floor Spawn Bedroom -> upstairs hall -> wooden staircase -> 1st-floor hall corner.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.18 },

    // In the real 2nd-floor bed, gentle clamped roll so walls never clip to sky.
    {
      at: 0.0,
      type: "player_pose",
      pose: "lie",
      surface: "up_bed_mattress",
      roll: -0.24,
      pitch: 0.08,
      duration: 0.01,
    },
    { at: 0.4, type: "sfx", sound: "aww", volume: 0.4 },
    { at: 1.2, type: "player_look", target: "up_bed_hall", duration: 0.45 },

    // Stand up and head out of the 2nd-floor Spawn Bedroom toward the staircase.
    { at: 1.7, type: "player_pose", pose: "stand", duration: 0.7 },
    { at: 2.4, type: "player_walk", to: "up_bed_hall_corner", duration: 2.0, speed: 1.9 },
    { at: 4.5, type: "player_look", target: "upstairs_landing", duration: 0.35 },
    { at: 4.9, type: "player_walk", to: "upstairs_landing", duration: 1.8, speed: 1.9 },

    // Walk down the wooden staircase to Floor 1 while Granny & Grandpa argue below.
    { at: 6.7, type: "char_bubble", actor: "granny", icon: "angry", duration: 1.2, facePlayer: false },
    { at: 6.8, type: "sfx", sound: "discord", volume: 0.3 },
    { at: 6.9, type: "player_walk", to: "hall_corner", duration: 3.1, speed: 2.3 },
    { at: 10.2, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 10.4, type: "sfx", sound: "checkmark", volume: 0.4 },
    { at: 11.0, type: "player_look", target: "dining_pass", duration: 0.45 },
    { at: 11.5, type: "sfx", sound: "swoosh", volume: 0.25 },
  ],
});
