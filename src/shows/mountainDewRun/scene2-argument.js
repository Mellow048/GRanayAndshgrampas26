import { defineScene, argueBeats } from "../sceneKit.js";

/**
 * Scene 2 — The Argument (15s)
 *
 * Starts exactly where scene 1 stopped (hall corner). Granny and Grandpa are
 * bickering across the table off to our left; we walk the baked floor past
 * them, glance over once, and carry on to the kitchen.
 *
 * They argue — bubbles, head snaps, discord — nobody is hit, nobody is scared.
 * They are 1.1 m clear of the route the router actually takes, so the lens
 * never passes through a body.
 */
export default defineScene({
  id: "argument",
  title: "The Argument",
  room: "dining",
  duration: 15,
  playerSpawn: "hall_corner",
  playerFacing: "dining_pass",
  cast: {
    granny: { spawn: "dining_argue_west", facing: "dining_argue_east" },
    grandpa: { spawn: "dining_argue_east", facing: "dining_argue_west" },
  },
  notes: "Route is planned on the real floor: hall -> dining pass -> fridge front.",
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },

    // The row is already going when we come round the corner.
    ...argueBeats({ from: 0.2, until: 13.0, a: "granny", b: "grandpa", interval: 1.3 }),

    { at: 0.3, type: "player_look", target: "granny", duration: 0.45 },
    { at: 1.0, type: "player_walk", to: "dining_pass", duration: 2.6, speed: 1.6 },

    // They clock us for a beat, then carry on with each other.
    { at: 2.6, type: "char_face", actor: "granny", followPlayer: true },
    { at: 2.7, type: "char_face", actor: "grandpa", followPlayer: true },
    { at: 2.8, type: "sfx", sound: "granny_i_see_you", volume: 0.45 },
    { at: 3.0, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.2, facePlayer: true },

    // One glance, then keep moving — no pirouettes.
    { at: 3.8, type: "player_look", target: "grandpa", duration: 0.4, track: true },
    { at: 4.6, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
    { at: 4.7, type: "sfx", sound: "aww", volume: 0.45 },
    { at: 5.4, type: "char_face", actor: "granny", followPlayer: false },
    { at: 5.5, type: "char_face", actor: "grandpa", followPlayer: false },

    // On to the kitchen.
    { at: 5.8, type: "player_look", target: "kitchen_fridge_front", duration: 0.5 },
    { at: 6.2, type: "player_walk", to: "kitchen_fridge_front", duration: 3.4, speed: 1.6 },
    { at: 7.6, type: "char_bubble", actor: "granny", icon: "angry", duration: 1.3, facePlayer: false },
    { at: 9.0, type: "sfx", sound: "discord", volume: 0.3 },

    // There it is: the can, sitting on the fridge shelf.
    { at: 9.8, type: "player_look", target: "kitchen_fridge_shelf", duration: 0.5 },
    { at: 10.6, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 10.8, type: "sfx", sound: "checkmark", volume: 0.4 },
    { at: 12.0, type: "char_bubble", actor: "grandpa", icon: "question", duration: 1.2, facePlayer: false },
    { at: 13.6, type: "sfx", sound: "discord", volume: 0.25 },
  ],
});
