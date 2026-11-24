// Setup: wake in bed, leave the upstairs landing, take the explicit hidden
// descent cut that the one-floor house mesh requires, and find the toy car.
// Grandpa is staged lying across the real dining table; Granny starts hidden.

export function wakeAndFindCar() {
  return {
    name: "Wake Up and Find the Toy Car",
    duration: 22,
    playerSpawn: "up_bed_side",
    playerFacing: "up_bed_north",
    playerPosture: "lying",
    cast: {
      grandpa: { spawn: "dining_table_top", facing: "kitchen", anim: "idle", pose: "lying" },
      granny: { spawn: "upstairs_east_bed_top", facing: "upstairs_east_north", visible: false },
    },
    props: [
      { id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12, visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.18 },
      // Body-height rises once from a lying pose; no false crouch/stand cycle.
      { at: 1.0, type: "player_crouch", crouched: false, duration: 0.8 },
      { at: 1.9, type: "player_gesture", gesture: "nod_once", duration: 0.6 },
      {
        at: 2.5, type: "player_walk", to: "stairs_top",
        via: ["up_bed_north_side", "up_hall_north", "up_hall_north_door", "upstairs_hall_center", "upstairs_landing"],
        duration: 3.8, speed: 3.5,
      },
      // The FBX's upstairs and downstairs are disconnected. Keep this transition
      // wholly under black rather than letting a teleport show as a jump cut.
      { at: 6.25, type: "fade", to: 1, duration: 0.55 },
      { at: 6.85, type: "cut", to: "stairs_bottom", facing: "kitchen", duration: 0.1 },
      { at: 7.0, type: "fade", to: 0, duration: 0.55 },
      {
        at: 7.65, type: "player_walk", to: "kitchen",
        via: ["dining_corner", "dining_table_side", "dining_center", "kitchen_lane"],
        duration: 3.6, speed: 3.5,
      },
      { at: 11.35, type: "player_look", target: "grandpa", duration: 0.7 },
      { at: 12.3, type: "player_look", target: "car", duration: 0.65 },
      { at: 13.0, type: "player_hold", prop: "car", duration: 0.3 },
      { at: 13.0, type: "prop_action", prop: "car", action: "pickup" },
      { at: 13.1, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },
      {
        at: 14.0, type: "player_walk", to: "living_room",
        via: ["kitchen_lane", "dining_center", "doorway_dining", "back_hall_left", "back_hall", "back_room_east", "doorway_living", "living_room_entry"],
        duration: 7.6, speed: 3.5, lookAhead: true,
      },
    ],
  };
}
