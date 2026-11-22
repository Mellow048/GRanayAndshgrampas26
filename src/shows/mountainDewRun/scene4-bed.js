import { defineScene } from "../sceneKit.js";

/**
 * Scene 4 — Back To Bed (22s)
 *
 * Scene 3 stopped at the bottom of the stairs with the can in hand; this scene
 * starts on that exact step. Up the stairs, around the table, the can goes on
 * the table (a real surface), then we get into the REAL bed and lie down.
 *
 * The camera does not stare at the ceiling when it lies down — that is how the
 * decorative shelf near the ceiling ended up in frame last time.
 */
export default defineScene({
  id: "bed",
  title: "Back To Bed",
  room: "bedroom",
  duration: 22,
  playerSpawn: "stairs_bottom",
  playerFacing: "stairs_middle",
  notes: "Held prop carries across the boundary; `place` re-seats it on the table.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // Up the stairs, along the hall, around the table.
    {
      at: 0.3,
      type: "player_walk",
      via: ["stairs_middle", "stairs_top", "upstairs_landing", "upstairs_hall_center", "up_bed_hall_corner", "up_bed_hall"],
      to: "up_bed_side",
      duration: 13.0,
      speed: 2.2,
    },
    { at: 3.0, type: "player_look", target: "stairs_middle", duration: 0.45 },
    { at: 7.0, type: "player_look", target: "upstairs_landing", duration: 0.4 },
    { at: 10.4, type: "player_look", target: "up_bed_hall_corner", duration: 0.4 },
    { at: 12.4, type: "player_look", target: "up_bed_side", duration: 0.45 },

    // Put the can somewhere safe: the table.
    { at: 13.6, type: "player_look", target: "up_bed_top_west", duration: 0.5 },
    { at: 14.4, type: "prop_action", prop: "soda_can", action: "place", waypoint: "up_bed_top_west" },
    { at: 14.4, type: "player_hold", prop: "none" },
    { at: 14.5, type: "sfx", sound: "click", volume: 0.5 },
    { at: 15.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 15.3, type: "sfx", sound: "checkmark", volume: 0.5 },

    // Into the bed — the real one — and drift off.
    { at: 16.2, type: "player_look", target: "up_bed_mattress", duration: 0.5 },
    { at: 16.8, type: "player_walk", to: "up_bed_side", duration: 1.2, speed: 1.5 },
    {
      at: 18.2,
      type: "player_pose",
      pose: "lie",
      surface: "up_bed_mattress",
      lift: 0.32,
      roll: -0.75,
      pitch: 0.12,
      duration: 1.4,
    },
    { at: 18.4, type: "sfx", sound: "aww", volume: 0.42 },
    { at: 19.8, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 20.4, type: "fade", to: 1, duration: 1.6 },
  ],
});
