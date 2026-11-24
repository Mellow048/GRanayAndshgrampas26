// Gag: finish the loop, park, and let Granny and Grandpa answer the mishap
// with friendly nods. The car is stopped; nobody is hurt.

export function rideWrap() {
  return {
    name: "Park It and Make Sure Everyone Is Okay",
    duration: 19,
    playerSpawn: "living_room",
    playerFacing: "living_room_view",
    cast: {
      grandpa: { facing: "kitchen" },
      granny: { facing: "living_room_entry" },
    },
    // Keeps the payoff gag previewable by itself; chained continuous episodes
    // retain the same car instance and its final position.
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
      { at: 0.0, type: "prop_action", prop: "car", action: "stop" },
      { at: 0.2, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      { at: 1.0, type: "player_look", target: "granny", duration: 0.22 },
      {
        at: 1.2, type: "char_move", actor: "granny", to: "living_room_entry",
        via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "back_room_east", "doorway_living"],
        duration: 8.0, anim: "walk",
      },
      { at: 3.0, type: "player_look", target: "grandpa", duration: 0.22 },
      { at: 4.0, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.75 },
      { at: 5.0, type: "sfx", sound: "ding", volume: 0.5 },
      { at: 7.0, type: "player_look", target: "living_room_entry", duration: 0.22 },
      { at: 9.5, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.75 },
      { at: 10.5, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 11.0, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 0.8 },
      { at: 12.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      { at: 13.0, type: "player_look", target: "car", duration: 0.22 },
      { at: 14.2, type: "player_look", target: "living_room_entry", duration: 0.22 },
      { at: 15.0, type: "sfx", sound: "tada", volume: 0.55 },
      { at: 16.0, type: "player_look", target: "granny", duration: 0.22 },
      { at: 16.8, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.75 },
      { at: 17.0, type: "stop_bgm" },
      { at: 18.4, type: "fade", to: 1, duration: 0.6 },
    ],
  };
}
