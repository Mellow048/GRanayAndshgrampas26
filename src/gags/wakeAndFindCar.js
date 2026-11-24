// Wake in the measured ground-floor bedroom, then follow a walkable route to
// the kitchen. The imported house has no navigable stairs, so the episode does
// not fake an upstairs descent with a concealed teleport.

export function wakeAndFindCar() {
  return {
    name: "Wake Up and Find the Toy Car",
    duration: 14,
    playerSpawn: "bed_sleep",
    playerFacing: "bed_foot",
    playerPosture: "lying",
    cast: {
      grandpa: { spawn: "dining_table_top", facing: "kitchen", anim: "idle", pose: "lying" },
      granny: { spawn: "dining_lane", facing: "kitchen", visible: false },
    },
    props: [
      { id: "bed", type: "bed", spawn: "bed_home", rotationY: 0, seat: false },
      { id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12, visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.16 },
      {
        at: 0.0,
        type: "player_pose",
        pose: "lie",
        surface: "bed_sleep",
        roll: -0.55,
        pitch: 0.08,
        duration: 0.01,
      },
      { at: 0.8, type: "player_pose", pose: "stand", duration: 0.65 },
      { at: 1.5, type: "player_walk", to: "bed_foot", duration: 0.5, speed: 3.5 },
      { at: 2.1, type: "player_walk", to: "hall_mid", duration: 0.82, speed: 3.5 },
      {
        at: 3.0,
        type: "player_walk",
        to: "kitchen",
        via: ["hall_corner", "dining_pass"],
        duration: 1.55,
        speed: 3.5,
      },
      // Grandpa is found asleep on the real table; the tiny car is already on
      // the counter beside him. Both glances have a clear story target.
      { at: 4.75, type: "player_look", target: "grandpa", duration: 0.45 },
      { at: 5.3, type: "player_look", target: "car", duration: 0.4 },
      { at: 5.85, type: "player_hold", prop: "car" },
      { at: 5.85, type: "prop_action", prop: "car", action: "pickup" },
      { at: 5.95, type: "sfx", sound: "pop", volume: 0.4 },
      {
        at: 6.35,
        type: "player_walk",
        to: "living_room_view",
        via: [
          "kitchen_lane",
          "dining_center",
          "doorway_dining",
          "back_hall_left",
          "back_hall",
          "back_room_east",
          "doorway_living",
          "living_room_entry",
        ],
        duration: 5.55,
        speed: 3.5,
      },
    ],
  };
}
