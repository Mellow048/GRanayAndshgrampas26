// Gag: carry the tiny car into the living-room open space, toss it, and let
// the framework's deterministic grow animation turn it into a rideable car.
// The POV walks into the open-top body to establish the driver seat.

export function carTransformation() {
  return {
    name: "The Toy Car Becomes a Rideable Car",
    duration: 30,
    playerSpawn: "kitchen",
    playerFacing: "kitchen_counter_top",
    cast: { grandpa: { facing: "kitchen" } },
    // Also lets this dependent gag preview by itself in Gag Lab. When chained
    // into the continuous episode, the earlier kitchen-counter declaration wins.
    props: [{ id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.22 },
      { at: 0.2, type: "player_look", target: "living_room_entry", duration: 0.24 },
      {
        at: 0.55, type: "player_walk", to: "living_room_entry",
        via: ["kitchen_lane", "dining_center", "doorway_dining", "back_hall_left", "back_hall", "back_room_east", "doorway_living"],
        duration: 13.0,
      },
      { at: 4.0, type: "player_look", target: "back_room_east", duration: 0.22 },
      { at: 8.0, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 0.75 },
      { at: 10.5, type: "player_look", target: "living_room", duration: 0.22 },
      { at: 13.8, type: "player_look", target: "car", duration: 0.22 },

      // Release and toss the tiny prop a short, visible distance into the room.
      { at: 14.1, type: "player_hold", prop: null },
      { at: 14.12, type: "prop_action", prop: "car", action: "pop_out", waypoint: "living_room_entry", to: "living_room", travelDuration: 1.25, yOffset: 0.18 },
      { at: 14.12, type: "sfx", sound: "whoosh", volume: 0.65 },
      { at: 14.4, type: "player_look", target: "living_room", duration: 0.22, track: true },

      // Hide the toy as it lands; reveal a nearly-zero-scale car and grow it.
      { at: 15.56, type: "prop_action", prop: "car", action: "reset", waypoint: "living_room", scale: 0.025, visible: true },
      { at: 15.57, type: "prop_action", prop: "car", action: "grow", scale: 0.55, duration: 1.45 },
      { at: 15.57, type: "prop_action", prop: "car", action: "bounce" },
      { at: 15.57, type: "sfx", sound: "tada", volume: 0.7 },
      { at: 16.0, type: "player_look", target: "car", duration: 0.24 },
      { at: 17.0, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
      { at: 18.0, type: "prop_action", prop: "car", action: "stop" },
      { at: 19.0, type: "player_look", target: "car", duration: 0.24 },
      { at: 20.0, type: "player_gesture", gesture: "double_take", duration: 0.8 },
      { at: 21.0, type: "sfx", sound: "click", volume: 0.55 },

      // Climb into the open-top car: camera ends at the car's center and shares
      // its exact waypoint loop in the next scene.
      { at: 22.0, type: "player_crouch", crouched: true, duration: 0.35 },
      { at: 22.4, type: "player_walk", to: "living_room", duration: 1.8 },
      { at: 24.3, type: "player_crouch", crouched: false, duration: 0.35 },
      { at: 24.7, type: "sfx", sound: "whoosh", volume: 0.45 },
      { at: 25.0, type: "player_gesture", gesture: "nod_yes", duration: 0.75 },
      { at: 27.0, type: "player_look", target: "living_room_view", duration: 0.22 },
      { at: 29.0, type: "player_look", target: "living_room", duration: 0.22 },
    ],
  };
}
