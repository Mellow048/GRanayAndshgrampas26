import { defineScene } from "../sceneKit.js";

/**
 * Scene 3 — The Cold One (14s)
 *
 * Starts on the exact spot scene 2 stopped on. The house already has a fridge
 * (the tall north-wall unit in the kitchen), so nothing is built around it: a
 * small `shelf` prop sits inside it with the Mountain Dew on it, in view the
 * whole time. We do not open a door and we never make a can appear — we walk
 * up, take the one that was always there, and leave.
 */
export default defineScene({
  id: "fridge",
  title: "The Cold One",
  room: "kitchen",
  duration: 14,
  playerSpawn: "kitchen_fridge_front",
  playerFacing: "kitchen_fridge",
  props: [
    { id: "fridge_shelf", type: "shelf", spawn: "kitchen_fridge_shelf", rotationY: 0, seat: false },
    { id: "soda_can", type: "soda_can", spawn: "kitchen_fridge_shelf", rotationY: 0.3, seat: false },
  ],
  notes: "Pickup is the only prop transition; the can is on screen before we reach it.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.16 },

    // It was already on the shelf.
    { at: 0.2, type: "player_look", target: "kitchen_fridge_shelf", duration: 0.45 },
    { at: 0.9, type: "player_walk", to: "kitchen_fridge_front", duration: 0.6, speed: 1.4 },

    // Just pick the damn thing up.
    { at: 1.8, type: "prop_action", prop: "soda_can", action: "pickup" },
    { at: 1.8, type: "player_hold", prop: "soda_can" },
    { at: 1.9, type: "sfx", sound: "pop", volume: 0.5 },
    { at: 2.6, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 2.7, type: "sfx", sound: "checkmark", volume: 0.45 },

    // Back out through the dining room, can in hand.
    { at: 3.4, type: "player_look", target: "dining_pass", duration: 0.5 },
    { at: 3.8, type: "player_walk", to: "dining_pass", duration: 3.0, speed: 1.6 },
    { at: 5.2, type: "char_bubble", actor: "granny", icon: "angry", duration: 1.3, facePlayer: false },
    { at: 6.6, type: "sfx", sound: "discord", volume: 0.3 },

    { at: 7.2, type: "player_look", target: "dining_table_front", duration: 0.5 },
    { at: 7.6, type: "player_walk", to: "dining_table_front", duration: 2.6, speed: 1.6 },
    { at: 9.2, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.2, facePlayer: false },
    { at: 10.4, type: "player_look", target: "dining_table_top", duration: 0.5 },
    { at: 11.2, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 11.4, type: "sfx", sound: "checkmark", volume: 0.4 },
    { at: 12.6, type: "sfx", sound: "swoosh", volume: 0.25 },
  ],
});
