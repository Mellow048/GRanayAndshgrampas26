import { defineScene, argueBeats } from "../sceneKit.js";

/**
 * Scene 2 — The Argument (26s)
 *
 * Picks up on the top step of scene 1 (no cut!), walks down into the dining
 * room, and finds Granny and Grandpa bickering across the table. They are
 * *arguing*: angry bubbles, heads snapping at each other, mumble SFX. Nobody
 * punches anybody, and nobody is scared of anything.
 *
 * When we walk past, they both turn and glare at the lens (head tracking), then
 * go right back to it. The scene hands the kitchen doorway to scene 3.
 */
export default defineScene({
  id: "argument",
  title: "The Argument",
  room: "dining",
  duration: 26,
  // Scene 1 ended on the top step — we start walking down it.
  playerSpawn: "stairs_top",
  playerFacing: "stairs_middle",
  // North of the table, nose to nose, clear of the lane we walk down.
  cast: {
    granny: { spawn: "dining_argue_west", facing: "dining_argue_east" },
    grandpa: { spawn: "dining_argue_east", facing: "dining_argue_west" },
  },
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },

    // Down the stairs, into the room.
    {
      at: 0.2,
      type: "player_walk",
      via: ["stairs_middle", "stairs_bottom"],
      to: "dining_corner",
      duration: 5.2,
      speed: 2.2,
    },
    { at: 1.4, type: "player_look", target: "stairs_bottom", duration: 0.5 },

    // The argument is already in progress when we arrive.
    ...argueBeats({ from: 0.6, until: 12.0, a: "granny", b: "grandpa", interval: 1.2 }),

    // We come level with the table and they clock us.
    { at: 5.6, type: "char_face", actor: "granny", followPlayer: true, instant: false },
    { at: 5.8, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
    { at: 5.9, type: "sfx", sound: "granny_i_see_you", volume: 0.5 },
    { at: 6.2, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.4, facePlayer: true },
    { at: 6.6, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.4, facePlayer: true },

    // ...we sigh at them and keep walking.
    { at: 7.4, type: "player_look", target: "granny", duration: 0.3, track: true },
    { at: 8.4, type: "player_look", target: "grandpa", duration: 0.3, track: true },
    { at: 9.3, type: "player_gesture", gesture: "shake_no", duration: 1.0 },
    { at: 9.4, type: "sfx", sound: "aww", volume: 0.6 },

    // They go straight back to arguing with each other behind us.
    { at: 10.6, type: "char_face", actor: "granny", followPlayer: false },
    { at: 10.7, type: "char_face", actor: "grandpa", followPlayer: false },
    ...argueBeats({ from: 11.0, until: 20.0, a: "grandpa", b: "granny", interval: 1.3 }),

    // Into the kitchen — scene 3 starts on this exact doorway.
    { at: 12.4, type: "player_look", target: "kitchen_lane", duration: 0.45 },
    {
      at: 13.4,
      type: "player_walk",
      via: ["dining_corner", "dining_lane", "dining_center", "kitchen_lane"],
      to: "kitchen_fridge_front",
      duration: 9.4,
      speed: 2.0,
    },
    { at: 17.4, type: "player_look", target: "kitchen_lane", duration: 0.4 },
    { at: 22.9, type: "player_look", target: "kitchen_fridge", duration: 0.5 },
    // Arriving at the fridge — no dead air handing over to scene 3.
    { at: 24.0, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
    { at: 24.2, type: "sfx", sound: "aww", volume: 0.35 },
    { at: 25.2, type: "player_look", target: "kitchen_fridge_front", duration: 0.4 },
  ],
});
