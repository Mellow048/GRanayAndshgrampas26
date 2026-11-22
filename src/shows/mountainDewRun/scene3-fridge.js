import { defineScene } from "../sceneKit.js";

/**
 * Scene 3 — The Cold One (20s)
 *
 * Into the kitchen, grab the soda can off the counter, then carry it back
 * through the dining room and up the stairs. This is the scene that would eat a
 * whole afternoon inside one giant JSON file — here it is 18 lines of beats.
 */
export default defineScene({
  id: "fridge",
  title: "The Cold One",
  room: "kitchen",
  duration: 20,
  playerSpawn: "dining_center",
  playerFacing: "kitchen",
  // They wandered off mid-argument; the dining room is empty behind us.
  cast: {
    granny: { spawn: "living_room", facing: "living_room_left" },
    grandpa: { spawn: "back_hall", facing: "back_hall_left" },
  },
  props: [{ id: "soda_can", type: "soda_can", spawn: "kitchen_table_top", rotationY: 0.4 }],
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.2 },
    { at: 0.0, type: "fade", to: 0, duration: 0.5 },
    { at: 0.2, type: "player_walk", via: ["kitchen_lane"], to: "kitchen", duration: 3.2 },

    // There it is, glowing like a tiny green relic.
    { at: 2.6, type: "player_look", target: "soda_can", duration: 0.26, track: true },
    { at: 3.3, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 3.6, type: "prop_action", prop: "soda_can", action: "bounce" },
    { at: 3.7, type: "sfx", sound: "pop", volume: 0.6 },
    { at: 4.3, type: "player_look", target: "soda_can", duration: 0.2, track: true },
    { at: 4.8, type: "prop_action", prop: "soda_can", action: "pickup" },
    { at: 4.8, type: "player_hold", prop: "soda_can" },
    { at: 4.9, type: "sfx", sound: "kaching", volume: 0.75 },

    // Haul it back out through the dining room and up the stairs.
    { at: 5.6, type: "player_look", target: "kitchen_lane", duration: 0.28, track: false },
    {
      at: 6.0,
      type: "player_walk",
      via: ["kitchen_lane", "dining_center", "dining_corner", "stairs_bottom"],
      to: "stairs_bottom",
      duration: 5.6,
      speed: 2.8,
    },
    { at: 9.0, type: "player_look", target: "dining_table_front", duration: 0.26, track: false },
    { at: 11.4, type: "sfx", sound: "swoosh", volume: 0.5 },
    { at: 11.8, type: "player_look", target: "stairs_middle", duration: 0.3, track: false },
    {
      at: 12.4,
      type: "player_walk",
      via: ["stairs_middle", "stairs_top"],
      to: "upstairs_landing",
      duration: 4.4,
      speed: 2.2,
    },
    { at: 15.4, type: "player_look", target: "upstairs_hall_center", duration: 0.3, track: false },
    { at: 17.0, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 17.1, type: "sfx", sound: "checkmark", volume: 0.6 },
    { at: 18.2, type: "player_look", target: "upstairs_west_room", duration: 0.3, track: false },
    { at: 18.6, type: "sfx", sound: "swoosh", volume: 0.45 },
  ],
});
