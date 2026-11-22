import { defineScene } from "../sceneKit.js";

/**
 * Scene 4 — Back To Bed (18s)
 *
 * Starts at the dining table where scene 3 left us, can in hand. The can goes
 * down on the real table surface, then we walk back along the baked floor and
 * get into the bed — the only bed in the show, spawned once in scene 1, still
 * in exactly the same place.
 */
export default defineScene({
  id: "bed",
  title: "Back To Bed",
  room: "bedroom",
  duration: 18,
  playerSpawn: "dining_table_front",
  playerFacing: "dining_table_top",
  notes: "`place` puts the can on the table; the walk home is routed on real floor.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // Put the can down on the table (a real surface at y 1.11).
    { at: 0.2, type: "player_look", target: "dining_table_top", duration: 0.45 },
    { at: 1.0, type: "prop_action", prop: "soda_can", action: "place", waypoint: "dining_table_top" },
    { at: 1.0, type: "player_hold", prop: "none" },
    { at: 1.1, type: "sfx", sound: "click", volume: 0.5 },
    { at: 1.8, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 1.9, type: "sfx", sound: "checkmark", volume: 0.45 },

    // Home.
    { at: 2.6, type: "player_look", target: "hall_corner", duration: 0.5 },
    { at: 3.0, type: "player_walk", to: "bed_side", duration: 6.4, speed: 1.7 },
    { at: 5.2, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 1.2, facePlayer: false },
    { at: 6.6, type: "sfx", sound: "discord", volume: 0.28 },
    { at: 7.4, type: "player_look", target: "bed_foot", duration: 0.45 },

    // Into bed.
    { at: 9.8, type: "player_look", target: "bed_sleep", duration: 0.5 },
    { at: 10.4, type: "player_walk", to: "bed_side", duration: 1.0, speed: 1.4 },
    {
      at: 11.6,
      type: "player_pose",
      pose: "lie",
      surface: "bed_sleep",
      lift: 0.32,
      slide: 1.0,
      roll: -0.6,
      pitch: 0.1,
      duration: 1.5,
    },
    { at: 12.0, type: "sfx", sound: "aww", volume: 0.4 },
    { at: 13.4, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 14.6, type: "sfx", sound: "yawn", volume: 0.4 },
    { at: 15.4, type: "player_gesture", gesture: "shake_no", duration: 1.0 },
    { at: 16.0, type: "sfx", sound: "swoosh", volume: 0.2 },
  ],
});
