import { defineScene } from "../sceneKit.js";

/**
 * Scene 1 — Wake Up (12s)
 *
 * The house is a single storey: its second floor is decorative (the FBX has no
 * staircase at all — every "walk upstairs" in earlier cuts was the character
 * floating through the ceiling). So the show lives downstairs.
 *
 * This bed is a prop we spawn once on a measured empty patch of floor
 * (x -7.4, z -4.1 — confirmed free by `scripts/bake-nav.mjs`), and the walk
 * out of the room follows the baked floor graph, so no wall gets phased.
 */
export default defineScene({
  id: "wake",
  title: "Wake Up",
  room: "bedroom",
  duration: 12,
  playerSpawn: "bed_side",
  playerFacing: "bed_home",
  props: [{ id: "bed", type: "bed", spawn: "bed_home", rotationY: 0, seat: false }],
  notes: "In bed -> out of bed -> down the hall. Every hop is a floor route.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.18 },

    // In bed, eye on the mattress, lens rolled over so it looks across the room.
    {
      at: 0.0,
      type: "player_pose",
      pose: "lie",
      surface: "bed_sleep",
      lift: 0.32,
      slide: 1.0,
      roll: -0.6,
      pitch: 0.1,
      duration: 0.01,
    },
    { at: 0.4, type: "sfx", sound: "yawn", volume: 0.45 },
    { at: 1.6, type: "player_look", target: "bed_foot", duration: 0.5 },

    // Out of bed.
    { at: 2.1, type: "player_pose", pose: "stand", duration: 0.9 },
    { at: 2.9, type: "player_walk", to: "bed_foot", duration: 1.1, speed: 1.5 },
    { at: 4.1, type: "player_look", target: "hall_mid", duration: 0.45 },
    { at: 4.4, type: "player_walk", to: "hall_mid", duration: 2.9, speed: 1.5 },

    // Through the hall; the argument is already going on next door.
    { at: 6.0, type: "char_bubble", actor: "granny", icon: "angry", duration: 1.2, facePlayer: false },
    { at: 7.2, type: "sfx", sound: "discord", volume: 0.3 },
    { at: 7.5, type: "player_look", target: "hall_corner", duration: 0.4 },
    { at: 7.8, type: "player_walk", to: "hall_corner", duration: 1.3, speed: 1.6 },
    { at: 9.4, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 9.6, type: "sfx", sound: "checkmark", volume: 0.4 },
    { at: 10.4, type: "player_look", target: "dining_pass", duration: 0.5 },
    { at: 11.2, type: "sfx", sound: "swoosh", volume: 0.25 },
  ],
});
