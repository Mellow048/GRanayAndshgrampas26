import { defineScene } from "../sceneKit.js";

/**
 * Scene 1 — Wake Up (13s)
 *
 * POV: lying in bed upstairs. We sit up, swing out of bed, and walk out to the
 * top of the stairs. The scene ENDS at `stairs_top`, exactly where scene 2
 * starts its first step — continuous shows never teleport, so the last frame of
 * this scene and the first frame of the next one are the same moment.
 */
export default defineScene({
  id: "wake",
  title: "Wake Up",
  room: "bedroom",
  duration: 13,
  playerSpawn: "up_bed_north",
  playerFacing: "up_bed_north",
  notes: "Starts lying on the bed (player_pose lie) and stands up before walking.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.18 },
    // In bed, looking at the ceiling, then at the clock.
    { at: 0.0, type: "player_pose", pose: "lie", surface: "up_bed_top_west", lift: 0.34, duration: 0.01 },
    { at: 0.3, type: "player_look", target: "up_bed_north", duration: 0.5 },
    { at: 1.6, type: "player_look", target: "up_bed_top_west", duration: 0.55 },
    { at: 2.4, type: "sfx", sound: "aww", volume: 0.35 },

    // Up on the feet.
    { at: 3.0, type: "player_pose", pose: "stand", duration: 1.0 },
    { at: 3.2, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 4.1, type: "player_look", target: "upstairs_west_room", duration: 0.5 },

    // Out of the bedroom, down the landing, to the top of the stairs.
    {
      at: 4.6,
      type: "player_walk",
      via: ["upstairs_west_room", "upstairs_hall_center", "upstairs_landing"],
      to: "stairs_top",
      duration: 6.4,
      speed: 2.3,
    },
    { at: 7.4, type: "player_look", target: "up_hall_north_door", duration: 0.35 },
    // Stop at the top of the stairs and look down them — scene 2 picks this up.
    { at: 11.2, type: "player_look", target: "stairs_middle", duration: 0.55 },
    { at: 12.2, type: "sfx", sound: "swoosh", volume: 0.32 },
  ],
});
