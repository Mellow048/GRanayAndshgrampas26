// Wake in the real upstairs Spawn Bedroom and take the wooden staircase down;
// the camera follows a continuous route instead of using a hidden teleport.

export function wakeAndFindCar() {
  return {
    name: "Wake Up and Find the Toy Car",
    duration: 18,
    playerSpawn: "up_bed_side",
    playerFacing: "up_bed_mattress",
    playerPosture: "lying",
    cast: {
      grandpa: { spawn: "upstairs_east_hall", facing: "up_bed_side", anim: "idle", pose: "lying", visible: false },
      granny: { spawn: "dining_lane", facing: "kitchen", visible: false },
    },
    props: [
      { id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12, visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.16 },
      {
        at: 0.0,
        type: "player_pose",
        pose: "lie",
        surface: "up_bed_mattress",
        roll: -0.24,
        pitch: 0.08,
        duration: 0.01,
      },
      { at: 0.55, type: "player_gesture", gesture: "nod_yes", duration: 0.45 },
      { at: 1.0, type: "player_pose", pose: "stand", duration: 0.65 },
      { at: 1.7, type: "player_walk", to: "up_bed_hall_corner", duration: 1.6, speed: 3.5 },
      { at: 3.4, type: "player_walk", to: "upstairs_landing", duration: 1.5, speed: 3.5 },
      {
        at: 5.0,
        type: "player_walk",
        to: "hall_corner",
        via: ["stairs_middle", "stairs_bottom"],
        duration: 3.2,
        speed: 3.5,
      },
      {
        at: 8.35,
        type: "player_walk",
        to: "kitchen",
        via: ["dining_pass"],
        duration: 1.5,
        speed: 3.5,
      },
      { at: 9.95, type: "player_look", target: "car", duration: 0.4 },
      { at: 10.4, type: "player_hold", prop: "car" },
      { at: 10.4, type: "prop_action", prop: "car", action: "pickup" },
      { at: 10.5, type: "sfx", sound: "pop", volume: 0.4 },
      {
        at: 11.0,
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
        duration: 3.4,
        speed: 3.5,
      },
    ],
  };
}
