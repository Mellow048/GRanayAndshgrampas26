import { defineScene } from "../sceneKit.js";

/**
 * Scene 1 — Wake Up (14s)
 *
 * POV: we are lying in the upstairs bedroom. We sit up, stretch, notice the
 * clock and head for the stairs. No cast on screen, so the scene proves the
 * builder handles a solo player scene.
 */
export default defineScene({
  id: "wake",
  title: "Wake Up",
  room: "bedroom",
  duration: 14,
  playerSpawn: "bedroom",
  playerFacing: "upstairs_west_room",
  notes: "Start crouched (lying down) and stand up before walking.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.2 },
    { at: 0.0, type: "fade", to: 0, duration: 0.6 },
    { at: 0.1, type: "player_crouch", crouched: true, duration: 0.1 },
    { at: 0.4, type: "sfx", sound: "aww", volume: 0.45 },

    // Sit up, stretch, take in the room.
    { at: 1.8, type: "player_crouch", crouched: false, duration: 0.9 },
    { at: 2.2, type: "player_look", target: "up_bed_top_west", duration: 0.3, track: false },
    { at: 3.4, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 3.8, type: "player_look", target: "upstairs_west_room", duration: 0.3, track: false },

    // Trudge out of the bedroom and down the hall.
    {
      at: 4.4,
      type: "player_walk",
      via: ["upstairs_west_room", "upstairs_hall_center", "upstairs_landing"],
      to: "stairs_top",
      duration: 6.2,
      speed: 2.6,
    },
    { at: 6.4, type: "player_look", target: "up_hall_north_door", duration: 0.28, track: false },
    { at: 8.6, type: "player_look", target: "stairs_middle", duration: 0.3, track: false },

    // Someone downstairs is already shouting.
    { at: 10.8, type: "sfx", sound: "granny_laugh", volume: 0.4 },
    { at: 11.0, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
    { at: 12.2, type: "player_look", target: "stairs_middle", duration: 0.3, track: false },
    { at: 12.8, type: "sfx", sound: "aww", volume: 0.5 },
  ],
});
