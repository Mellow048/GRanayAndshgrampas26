// Park at the finish of the second lap, stay in the driver seat, and let Granny
// walk back into view. Reactions are in body language only; the sleeping
// Grandpa remains laid out on the table until the end.

export function rideWrap() {
  return {
    name: "Park It and Check on the Family",
    duration: 20,
    playerSpawn: "living_room",
    playerFacing: "living_room_view",
    cast: {
      grandpa: { facing: "kitchen" },
      granny: { facing: "living_room_entry" },
    },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.18 },
      { at: 0.0, type: "prop_action", prop: "car", action: "stop" },
      { at: 1.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      {
        at: 1.5, type: "char_move", actor: "granny", to: "living_room_entry",
        via: ["dining_lane", "dining_center", "doorway_dining", "back_hall_left", "back_hall", "back_room_east", "doorway_living"],
        duration: 8.0, speed: 2.4, anim: "walk",
      },
      { at: 10.0, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.7 },
      { at: 11.0, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 12.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      { at: 13.5, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.7 },
      { at: 15.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      { at: 16.3, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.7 },
      { at: 17.4, type: "fade", to: 1, duration: 0.6 },
    ],
  };
}
