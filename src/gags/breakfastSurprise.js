// Gag: "Breakfast Surprise" (~20s).
// Gold-standard reference for physical "Show, Don't Tell" storytelling:
// Granny cooks eggs in a sizzling frying pan (`stir`), carries a steaming
// breakfast plate (`carry`) around the north end of the dining table, glides it
// right under Grandpa's nose (`offer` + `glide` with `targetHeight: "nose"`),
// Grandpa leans in and sniffs (`sniff` + `nod` + `clap`), and Granny sets the
// plate cleanly on the dining table (`place_down` + `glide`).

import { lookAt } from "./helpers.js";

export function breakfastSurprise({
  chef = "granny",
  sleeper = "grandpa",
} = {}) {
  return {
    name: "Breakfast Surprise (Cook & Serve)",
    duration: 20,
    room: "kitchen",
    playerSpawn: "dining_center",
    playerFacing: "kitchen",
    cast: {
      [chef]: { spawn: "kitchen", facing: "kitchen_table_top" },
      [sleeper]: { spawn: "dining_table_front", facing: "dining_center" },
    },
    props: [
      { id: "skillet", type: "frying_pan", spawn: "kitchen_table_top", visible: true, steam: true },
      { id: "breakfast", type: "breakfast_plate", spawn: "kitchen_counter_top", visible: true, steam: true },
      { id: "mug", type: "coffee_mug", spawn: "dining_table_top_west", visible: true, steam: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      ...lookAt({ at: 0.0, target: chef, duration: 0.24, track: true }),

      // 1. Granny actively cooks & stirs the sizzling frying pan at the kitchen counter
      { at: 0.3, type: "char_arm", actor: chef, gesture: "stir", duration: 2.6 },
      { at: 0.5, type: "sfx", sound: "pop", volume: 0.55 },
      { at: 1.8, type: "char_gesture", actor: chef, gesture: "nod_once", duration: 0.8 },
      { at: 2.2, type: "sfx", sound: "ding", volume: 0.65 },

      // 2. Granny carries the steaming breakfast plate around the north end of the dining table
      { at: 3.1, type: "char_arm", actor: chef, gesture: "carry", duration: 2.4 },
      { at: 3.1, type: "char_move", actor: chef, via: ["kitchen_lane", "dining_table_ne"], to: "dining_table_btn", anim: "walk", duration: 2.2 },
      { at: 3.2, type: "prop_action", prop: "breakfast", action: "glide", from: "kitchen_counter_top", to: "dining_table_btn", duration: 2.1, arc: 0.14 },
      ...lookAt({ at: 3.6, target: sleeper, duration: 0.28, track: true }),

      // 3. Granny holds the steaming breakfast plate RIGHT UNDER Grandpa's nose!
      { at: 5.5, type: "char_face", actor: chef, targetActor: sleeper, duration: 0.2 },
      { at: 5.6, type: "char_arm", actor: chef, gesture: "offer", duration: 2.6 },
      { at: 5.6, type: "prop_action", prop: "breakfast", action: "glide", to: sleeper, targetHeight: "nose", duration: 1.0, arc: 0.08 },
      { at: 5.8, type: "sfx", sound: "whoosh", volume: 0.45 },

      // 4. Grandpa visibly leans forward and sniffs the hot breakfast, then nods happily
      { at: 6.7, type: "char_face", actor: sleeper, targetActor: chef, duration: 0.2 },
      { at: 6.8, type: "char_arm", actor: sleeper, gesture: "sniff", duration: 1.8 },
      { at: 7.2, type: "sfx", sound: "rizz", volume: 0.6 },

      // 5. Granny gently sets the plate down onto the dining table surface
      { at: 8.8, type: "char_arm", actor: chef, gesture: "place_down", duration: 1.4 },
      { at: 8.9, type: "prop_action", prop: "breakfast", action: "glide", to: "dining_table_top", duration: 1.1, arc: 0.1 },
      { at: 9.9, type: "sfx", sound: "checkmark", volume: 0.6 },
      ...lookAt({ at: 10.2, target: sleeper, duration: 0.25, track: true }),

      // 6. Grandpa claps & nods at the meal while Granny waves warmly
      { at: 10.5, type: "char_face", actor: sleeper, target: "dining_table_top", duration: 0.2 },
      { at: 10.7, type: "char_arm", actor: sleeper, gesture: "clap", duration: 1.8 },
      { at: 10.8, type: "char_gesture", actor: sleeper, gesture: "nod", duration: 1.4 },
      { at: 10.9, type: "sfx", sound: "tada", volume: 0.6 },
      { at: 12.6, type: "char_face", actor: chef, followPlayer: true, instant: false },
      { at: 12.7, type: "char_arm", actor: chef, gesture: "wave", duration: 1.8 },
      { at: 13.0, type: "sfx", sound: "ding", volume: 0.6 },
      ...lookAt({ at: 14.5, target: chef, duration: 0.26, track: true }),
      { at: 15.0, type: "char_gesture", actor: chef, gesture: "nod_once", duration: 1.1 },
      { at: 16.3, type: "char_face", actor: sleeper, target: "dining_table_top", duration: 0.2 },
      { at: 16.4, type: "char_arm", actor: sleeper, gesture: "sniff", duration: 1.5 },
      { at: 16.6, type: "sfx", sound: "eat", volume: 0.65 },
      { at: 17.6, type: "char_gesture", actor: sleeper, gesture: "nod", duration: 1.2 },
      { at: 18.6, type: "fade", to: 1, duration: 0.8 },
    ],
  };
}
