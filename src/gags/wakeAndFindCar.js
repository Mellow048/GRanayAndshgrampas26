// Gag: wake beside the upstairs bed, imply the unsupported stair descent with
// an intentional fade/cut, and discover Grandpa napping on the kitchen table
// beside a tiny toy car. Granny starts hidden and has no entrance yet.
// No dialogue or thought bubbles; only the car is a prop.

export function wakeAndFindCar() {
  return {
    name: "Wake Up and Find the Toy Car",
    duration: 35,
    playerSpawn: "up_bed_north_side",
    playerFacing: "up_bed_north",
    cast: {
      grandpa: { spawn: "kitchen_table_top", facing: "kitchen", anim: "sit" },
      // Kept out of sight until the driving gag; the reveal is authored later.
      granny: { spawn: "upstairs_east_bed_top", facing: "upstairs_east_north", visible: false },
    },
    props: [
      { id: "car", type: "car", spawn: "kitchen_counter_top", scale: 0.12, visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
      { at: 0.0, type: "fade", to: 0, duration: 0.35 },
      { at: 0.35, type: "player_look", target: "up_bed_north", duration: 0.24 },
      { at: 0.8, type: "player_gesture", gesture: "nod_once", duration: 0.75 },
      { at: 1.6, type: "player_crouch", crouched: true, duration: 0.55 },
      { at: 2.25, type: "player_crouch", crouched: false, duration: 0.4 },
      { at: 2.8, type: "player_look", target: "upstairs_hall_center", duration: 0.22 },
      {
        at: 3.1, type: "player_walk", to: "stairs_top",
        via: ["up_hall_north", "up_hall_north_door", "upstairs_hall_center", "upstairs_landing"],
        duration: 4.1,
      },
      // The FBX house has no traversable stairs. A brief black-frame cut is the
      // honest, framework-native way to imply the descent without walking in air.
      { at: 7.35, type: "fade", to: 1, duration: 0.2 },
      { at: 7.56, type: "cut", to: "stairs_bottom", facing: "dining_corner" },
      { at: 7.58, type: "fade", to: 0, duration: 0.25 },
      { at: 7.6, type: "sfx", sound: "whoosh", volume: 0.5 },
      { at: 8.0, type: "player_look", target: "kitchen", duration: 0.24 },
      {
        at: 8.35, type: "player_walk", to: "kitchen",
        via: ["dining_corner", "dining_table_side", "dining_table_front", "dining_center", "kitchen_lane"],
        duration: 9.0,
      },
      { at: 13.0, type: "char_gesture", actor: "grandpa", gesture: "tilt", duration: 1.2 },
      { at: 17.5, type: "player_look", target: "grandpa", duration: 0.24 },
      { at: 18.0, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 0.8 },
      { at: 19.0, type: "player_look", target: "car", duration: 0.24 },
      { at: 20.0, type: "player_gesture", gesture: "tilt", duration: 0.8 },
      { at: 21.0, type: "prop_action", prop: "car", action: "pickup" },
      { at: 21.0, type: "player_hold", prop: "car", duration: 0.35 },
      { at: 21.0, type: "sfx", sound: "kaching", volume: 0.55 },
      { at: 22.1, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 0.8 },
      { at: 23.0, type: "player_gesture", gesture: "nod_yes", duration: 0.75 },
      { at: 24.0, type: "player_look", target: "kitchen_counter_top", duration: 0.22 },
      { at: 25.0, type: "player_look", target: "grandpa", duration: 0.22 },
      { at: 26.0, type: "char_gesture", actor: "grandpa", gesture: "tilt", duration: 1.1 },
      { at: 28.0, type: "player_look", target: "kitchen_lane", duration: 0.22 },
      { at: 30.0, type: "player_look", target: "grandpa", duration: 0.22 },
      { at: 31.0, type: "player_gesture", gesture: "nod_yes", duration: 0.75 },
      { at: 33.0, type: "player_look", target: "kitchen", duration: 0.22 },
    ],
  };
}
