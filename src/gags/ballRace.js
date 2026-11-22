// Gag: "Rocket Ball" (~14s). Ball launches from kitchen, ricochets through the house, bonks Grandpa, Granny chases him.
// Uses ONLY existing props/beats. When a toy_car prop exists, swap "emoji_ball" for it — nothing else changes.
// Every <=2s something changes on screen (Zero Dead Air).

export function ballRace({ prop = "emoji_ball", victim = "grandpa", chaser = "granny" } = {}) {
  return {
    name: "Rocket Ball",
    duration: 14,
    playerSpawn: "dining_center",
    cast: {
      [victim]: { spawn: "doorway_dining", facing: "dining_center" },
      [chaser]: { spawn: "kitchen_lane", facing: "kitchen" },
    },
    props: [{ id: prop, type: "emoji_ball", spawn: "kitchen", yOffset: 0.3, visible: false }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.24 },
      { at: 0.0, type: "player_look", target: "kitchen", duration: 0.2 },
      { at: 0.3, type: "prop_action", prop, action: "show", waypoint: "kitchen", yOffset: 0.3 },
      { at: 0.4, type: "sfx", sound: "pop" },
      { at: 0.5, type: "char_bubble", actor: chaser, icon: "exclamation", duration: 1.2 },
      // launch #1: kitchen -> dining room
      { at: 1.5, type: "prop_action", prop, action: "pop_out", waypoint: "kitchen", to: "dining_center", travelDuration: 1.3, yOffset: 0.3 },
      { at: 1.5, type: "sfx", sound: "whoosh" },
      { at: 1.6, type: "player_look", target: prop, duration: 0.25, track: true },
      // launch #2: dining -> doorway, straight into the victim
      { at: 3.0, type: "prop_action", prop, action: "pop_out", waypoint: "dining_center", to: "doorway_dining", travelDuration: 1.0, yOffset: 0.3 },
      { at: 3.9, type: "sfx", sound: "bonk", cutBgm: true, cutBgmDuration: 1.0 },
      { at: 3.9, type: "char_anim", actor: victim, anim: "terrified", loop: false },
      { at: 4.0, type: "char_bubble", actor: victim, icon: "exclamation", duration: 1.2 },
      { at: 4.0, type: "player_gesture", gesture: "shake_panic", duration: 0.6 },
      // chaser reacts: sprint to within 1.4m BEFORE any angry action (Rule 2)
      { at: 5.0, type: "char_bubble", actor: chaser, icon: "angry", duration: 1.5 },
      { at: 5.1, type: "char_move", actor: chaser, to: "dining_center", anim: "run2", duration: 1.6 },
      { at: 5.1, type: "player_look", target: chaser, duration: 0.25, track: true },
      { at: 6.9, type: "sfx", sound: "granny_laugh", volume: 0.7 },
      // victim bolts, chaser right behind (Rule 3 style exit)
      { at: 7.0, type: "char_move", actor: victim, to: "back_hall_left", anim: "run2", duration: 2.2 },
      { at: 7.4, type: "char_move", actor: chaser, to: "back_hall_left", anim: "run2", duration: 2.2 },
      { at: 7.0, type: "bgm", sound: "run_amok", volume: 0.26 },
      { at: 7.3, type: "prop_action", prop, action: "pop_out", waypoint: "doorway_dining", to: "back_hall_left", travelDuration: 1.8, yOffset: 0.3 },
      { at: 7.4, type: "player_walk", to: "doorway_dining", duration: 2.0 },
      { at: 10.0, type: "player_look", target: victim, duration: 0.25, track: true },
      { at: 10.2, type: "sfx", sound: "vine_boom" },
      { at: 11.0, type: "player_gesture", gesture: "shake_panic", duration: 0.8 },
      { at: 12.0, type: "prop_action", prop, action: "hide" },
    ],
  };
}
