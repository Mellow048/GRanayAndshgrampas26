import { defineScene } from "../sceneKit.js";

/**
 * Scene 4 — Back To Bed (18s)
 *
 * Sets the soda can down on the dining table, walks back UP the wooden staircase
 * to the real 2nd-floor Spawn Bedroom (`up_bed_side` / `up_bed_mattress`), and
 * lies back down for a nap.
 */
export default defineScene({
  id: "bed",
  title: "Back To Bed (2nd Floor)",
  room: "upstairs_bedroom",
  duration: 18,
  playerSpawn: "dining_table_front",
  playerFacing: "dining_table_top",
  notes: "`place` puts the can on the table; walks up the wooden staircase back to the 2nd-floor bed.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // Put the can down on the dining table surface (y = 1.11).
    { at: 0.2, type: "player_look", target: "dining_table_top", duration: 0.45 },
    { at: 1.0, type: "prop_action", prop: "soda_can", action: "place", waypoint: "dining_table_top" },
    { at: 1.0, type: "player_hold", prop: "none" },
    { at: 1.1, type: "sfx", sound: "click", volume: 0.5 },
    { at: 1.8, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 1.9, type: "sfx", sound: "checkmark", volume: 0.45 },

    // Walk back upstairs to the real 2nd-floor Spawn Bedroom.
    { at: 2.6, type: "player_look", target: "stairs_bottom", duration: 0.45 },
    { at: 3.1, type: "player_walk", to: "upstairs_landing", duration: 3.4, speed: 2.2 },
    { at: 5.2, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 1.2, facePlayer: false },
    { at: 6.6, type: "sfx", sound: "discord", volume: 0.28 },
    { at: 6.7, type: "player_walk", to: "up_bed_side", duration: 3.2, speed: 2.0 },

    // Back into the real 2nd-floor bed.
    { at: 10.2, type: "player_look", target: "up_bed_mattress", duration: 0.45 },
    {
      at: 11.2,
      type: "player_pose",
      pose: "lie",
      surface: "up_bed_mattress",
      roll: -0.24,
      pitch: 0.08,
      duration: 1.4,
    },
    { at: 12.0, type: "sfx", sound: "aww", volume: 0.4 },
    { at: 12.6, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 15.0, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
    { at: 16.0, type: "sfx", sound: "swoosh", volume: 0.2 },
  ],
});
