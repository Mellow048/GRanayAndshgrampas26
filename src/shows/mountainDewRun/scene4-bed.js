import { defineScene } from "../sceneKit.js";

/**
 * Scene 4 — Back To Bed (22s)
 *
 * Scene 3 stopped at the bottom of the stairs with the can in our hand, and
 * this scene starts on that exact step: we walk up, down the landing, into the
 * bedroom, set the can on the nightstand (a real surface), and lie back down.
 *
 * The can is never re-spawned — it is the same object we took out of the fridge,
 * carried in the held-item mount, and put down here.
 */
export default defineScene({
  id: "bed",
  title: "Back To Bed",
  room: "bedroom",
  duration: 22,
  playerSpawn: "stairs_bottom",
  playerFacing: "stairs_middle",
  cast: {
    // Still standing in the dining room, exactly where scene 3 left them.
    granny: { facing: "dining_argue_east" },
    grandpa: { facing: "dining_argue_west" },
  },
  notes: "Held prop carries across the boundary; `place` re-seats it on the nightstand.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // Up the stairs, along the landing, into the bedroom.
    {
      at: 0.3,
      type: "player_walk",
      via: ["stairs_middle", "stairs_top", "upstairs_landing", "upstairs_hall_center", "upstairs_west_room"],
      to: "up_bed_north_side",
      duration: 13.0,
      speed: 2.2,
    },
    { at: 3.0, type: "player_look", target: "stairs_middle", duration: 0.45 },
    { at: 7.0, type: "player_look", target: "upstairs_landing", duration: 0.4 },
    { at: 10.4, type: "player_look", target: "up_hall_north_door", duration: 0.4 },
    { at: 12.6, type: "player_look", target: "upstairs_west_room", duration: 0.45 },

    // Set the can on the nightstand.
    { at: 13.6, type: "player_look", target: "up_bed_top_west", duration: 0.5 },
    { at: 14.4, type: "prop_action", prop: "soda_can", action: "place", waypoint: "up_bed_top_west" },
    { at: 14.4, type: "player_hold", prop: "none" },
    { at: 14.5, type: "sfx", sound: "click", volume: 0.5 },
    { at: 15.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 15.3, type: "sfx", sound: "checkmark", volume: 0.55 },

    // Get back in bed and drift off.
    { at: 16.4, type: "player_look", target: "up_bed_north", duration: 0.55 },
    { at: 17.4, type: "player_walk", to: "up_bed_north_side", duration: 1.4, speed: 1.6 },
    { at: 18.8, type: "player_pose", pose: "lie", surface: "up_bed_top_west", lift: 0.34, duration: 1.4 },
    { at: 19.0, type: "sfx", sound: "aww", volume: 0.45 },
    // A last wiggle before the eyes close, so the show ends on motion.
    { at: 20.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
    { at: 20.9, type: "fade", to: 1, duration: 1.6 },
  ],
});
