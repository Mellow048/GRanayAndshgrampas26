import { defineScene } from "../sceneKit.js";

/**
 * Scene 3 — The Cold One (16s)
 *
 * The fridge is the one already in the house model (tall unit on the kitchen's
 * north wall). We do not build furniture: a small wooden shelf sits inside it
 * and the can is on that shelf, visible from the moment the kitchen is in view.
 * Nothing pops into existence — you walk up, take it, and leave.
 *
 * Granny and Grandpa stay at the table where we left them.
 */
export default defineScene({
  id: "fridge",
  title: "The Cold One",
  room: "kitchen",
  duration: 16,
  // Scene 2 finished on this exact spot in front of the fridge.
  playerSpawn: "kitchen_fridge_front",
  playerFacing: "kitchen_fridge",
  props: [
    // `seat: false` — both rest on authored heights, not on house geometry.
    { id: "fridge_shelf", type: "shelf", spawn: "kitchen_fridge_shelf", rotationY: 0, seat: false },
    { id: "soda_can", type: "soda_can", spawn: "kitchen_fridge_shelf", rotationY: 0.3, seat: false },
  ],
  notes: "The can is visible on the fridge shelf the whole time; pickup is the only transition.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // There it is, on the shelf.
    { at: 0.3, type: "player_look", target: "kitchen_fridge_shelf", duration: 0.45 },
    { at: 1.1, type: "player_walk", to: "kitchen_fridge_front", duration: 0.8, speed: 1.6 },
    { at: 2.0, type: "player_look", target: "soda_can", duration: 0.4, track: true },

    // Take it.
    { at: 2.8, type: "prop_action", prop: "soda_can", action: "pickup" },
    { at: 2.8, type: "player_hold", prop: "soda_can" },
    { at: 2.9, type: "sfx", sound: "pop", volume: 0.5 },
    { at: 3.6, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 3.7, type: "sfx", sound: "checkmark", volume: 0.5 },

    // Turn around and head back through the dining room.
    { at: 4.6, type: "player_look", target: "kitchen_lane", duration: 0.5 },
    {
      at: 5.4,
      type: "player_walk",
      via: ["kitchen_lane", "doorway_dining", "dining_lane", "dining_corner"],
      to: "stairs_bottom",
      duration: 8.6,
      speed: 2.1,
    },

    // They are still at it behind us — they never even look up.
    { at: 7.4, type: "player_look", target: "dining_table_front", duration: 0.45, track: true },
    { at: 8.6, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 1.3, facePlayer: false },
    { at: 9.8, type: "char_bubble", actor: "granny", icon: "question", duration: 1.2, facePlayer: false },
    { at: 11.0, type: "sfx", sound: "discord", volume: 0.35 },
    { at: 11.8, type: "player_look", target: "stairs_bottom", duration: 0.45 },
    { at: 13.6, type: "player_look", target: "stairs_middle", duration: 0.5 },
    { at: 15.0, type: "sfx", sound: "swoosh", volume: 0.3 },
  ],
});
