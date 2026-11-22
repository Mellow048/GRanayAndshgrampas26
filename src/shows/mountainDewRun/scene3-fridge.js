import { defineScene } from "../sceneKit.js";

/**
 * Scene 3 — The Cold One (18s)
 *
 * We are already standing in front of the fridge (scene 2 walked us there). The
 * door swings open, the soda can comes off the shelf inside, we shut the door and
 * head back for the stairs. Granny and Grandpa stay in the dining room where we
 * left them — nobody vanishes.
 */
export default defineScene({
  id: "fridge",
  title: "The Cold One",
  room: "kitchen",
  duration: 18,
  // Scene 2 finished on this exact spot in front of the fridge.
  playerSpawn: "kitchen_fridge_front",
  playerFacing: "kitchen_fridge",
  props: [
    // The fridge is scenery; the can starts inside it, hidden behind the door.
    { id: "fridge", type: "fridge", spawn: "kitchen_fridge", rotationY: Math.PI },
    // `seat: false` — it rests on the fridge shelf, not on house geometry.
    { id: "soda_can", type: "soda_can", spawn: "kitchen_fridge_shelf", rotationY: 0.3, seat: false },
  ],
  notes: "Open the fridge, take the can off the shelf, close it, walk out.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // Open it.
    { at: 0.4, type: "player_look", target: "kitchen_fridge", duration: 0.4 },
    { at: 1.0, type: "prop_action", prop: "fridge", action: "open" },
    { at: 1.1, type: "sfx", sound: "click", volume: 0.6 },
    { at: 1.9, type: "player_look", target: "soda_can", duration: 0.5, track: true },

    // Take the can.
    { at: 2.8, type: "prop_action", prop: "soda_can", action: "pickup" },
    { at: 2.8, type: "player_hold", prop: "soda_can" },
    { at: 2.9, type: "sfx", sound: "pop", volume: 0.55 },

    // Shut the door behind us.
    { at: 3.8, type: "prop_action", prop: "fridge", action: "close" },
    { at: 3.9, type: "sfx", sound: "click", volume: 0.45 },

    // Turn around and head back out through the dining room.
    { at: 4.6, type: "player_look", target: "kitchen_lane", duration: 0.55 },
    {
      at: 5.4,
      type: "player_walk",
      via: ["kitchen_fridge_front", "kitchen_lane", "dining_center", "dining_lane", "dining_corner"],
      to: "stairs_bottom",
      duration: 10.6,
      speed: 2.1,
    },

    // Granny and Grandpa are still at it as we pass — this is continuity, and it
    // is also the joke: they never even look up.
    { at: 8.2, type: "player_look", target: "dining_table_front", duration: 0.45, track: true },
    { at: 9.6, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 1.4, facePlayer: false },
    { at: 10.9, type: "char_bubble", actor: "granny", icon: "question", duration: 1.3, facePlayer: false },
    { at: 12.2, type: "sfx", sound: "discord", volume: 0.38 },
    { at: 13.0, type: "player_look", target: "stairs_bottom", duration: 0.5 },
    { at: 15.8, type: "player_look", target: "stairs_middle", duration: 0.55 },
    { at: 16.9, type: "sfx", sound: "swoosh", volume: 0.3 },
  ],
});
