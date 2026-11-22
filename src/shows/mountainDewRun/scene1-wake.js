import { defineScene } from "../sceneKit.js";

/**
 * Scene 1 — Wake Up (12s)
 *
 * We are lying in the REAL bed upstairs (found by scanning the house geometry:
 * mattress top 3.56 at x -8.2..-6.8, z -3.9..-0.9), not on the table.
 *
 * The opening shot looks across the bedroom, not straight up at the ceiling —
 * there is a decorative shelf near the ceiling that reads as floating when you
 * stare at it, so the camera never does.
 *
 * The scene ends at the top of the stairs; scene 2 starts walking down them.
 */
export default defineScene({
  id: "wake",
  title: "Wake Up",
  room: "bedroom",
  duration: 12,
  playerSpawn: "up_bed_side",
  playerFacing: "up_bed_mattress",
  cast: {
    granny: { spawn: "dining_argue_west", facing: "dining_argue_east" },
    grandpa: { spawn: "dining_argue_east", facing: "dining_argue_west" },
  },
  notes: "Starts in bed (player_pose lie on up_bed_mattress) and gets up before walking.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.18 },
    // In bed: eye on the mattress, lens tilted over, looking across the room.
    {
      at: 0.0,
      type: "player_pose",
      pose: "lie",
      surface: "up_bed_mattress",
      lift: 0.32,
      roll: -0.75,
      pitch: 0.12,
      duration: 0.01,
    },
    { at: 0.2, type: "player_look", target: "up_bed_hall", duration: 0.5 },
    { at: 1.4, type: "player_look", target: "up_bed_mattress", duration: 0.4 },
    { at: 2.0, type: "sfx", sound: "aww", volume: 0.32 },

    // Up on your feet beside the bed.
    { at: 2.4, type: "player_pose", pose: "stand", duration: 1.0 },
    { at: 2.6, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 3.4, type: "player_look", target: "up_bed_hall", duration: 0.45 },

    // Out of the bedroom, around the table, along the hall to the stairs.
    {
      at: 3.8,
      type: "player_walk",
      via: ["up_bed_hall", "up_bed_hall_corner", "upstairs_west_room", "upstairs_hall_center", "upstairs_landing"],
      to: "stairs_top",
      duration: 6.8,
      speed: 2.2,
    },
    // Look at where we are going, then down the stairs — no wandering glances
    // into side rooms, no staring at the floorboards.
    { at: 5.2, type: "player_look", target: "up_bed_hall_corner", duration: 0.4 },
    { at: 7.6, type: "player_look", target: "upstairs_landing", duration: 0.4 },
    { at: 10.4, type: "player_look", target: "stairs_middle", duration: 0.5 },
    { at: 11.4, type: "sfx", sound: "swoosh", volume: 0.3 },
  ],
});
