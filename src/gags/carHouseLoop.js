// A continuous four-lap route stays on the baked ground-floor paths. Granny
// enters from the dining doorway on foot, where the moving car rounds the
// blind corner; after the staged bump she clears the lane before the next lap.

const ONE_LAP = [
  "living_room_view",
  "living_room_right",
  "living_room_entry",
  "doorway_living",
  "back_room_east",
  "back_hall",
  "back_hall_left",
  "doorway_dining",
  "dining_center",
  "kitchen_lane",
  "dining_center",
  "doorway_dining",
  "back_hall_left",
  "back_hall",
  "back_room_east",
  "doorway_living",
  "living_room_entry",
  "living_room_right",
  "living_room_view",
];
const HOUSE_LOOP = [...ONE_LAP, ...ONE_LAP.slice(1), ...ONE_LAP.slice(1), ...ONE_LAP.slice(1)];

export function carHouseLoop() {
  return {
    name: "First Drive Around the House",
    duration: 64,
    playerSpawn: "living_room_view",
    playerFacing: "living_room_entry",
    cast: {
      grandpa: { facing: "kitchen" },
      granny: { facing: "dining_center" },
    },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.2 },
      { at: 0.7, type: "prop_action", prop: "car", action: "drive", path: HOUSE_LOOP, duration: 63 },
      { at: 0.1, type: "player_ride", prop: "car", path: HOUSE_LOOP, duration: 63, mountDuration: 0.6, speed: 2.0, sideOffset: 0.3, forwardOffset: -0.05, eyeHeight: 1.12 },

      // She is already hidden in the dining area. She becomes visible as she
      // walks into the doorway, not as a sudden pop-in beside the car.
      { at: 3.6, type: "char_visibility", actor: "granny", visible: true },
      { at: 3.8, type: "char_move", actor: "granny", to: "doorway_dining", duration: 1.55, speed: 2.4, anim: "walk" },

      // The player stays focused down the driving path. Granny rounds the
      // blind doorway, the car brushes past, and she makes a safe comic jump.
      { at: 6.0, type: "player_gesture", gesture: "shake_panic", duration: 0.55 },
      { at: 6.0, type: "char_anim", actor: "granny", anim: "jump", duration: 0.65, loop: false },
      { at: 6.0, type: "char_move", actor: "granny", to: "dining_center", duration: 0.9, speed: 3.5, anim: "jump" },
      { at: 6.0, type: "sfx", sound: "bonk", volume: 0.5 },
      { at: 6.95, type: "char_anim", actor: "granny", anim: "trip", duration: 0.75, loop: false },
      { at: 7.75, type: "char_move", actor: "granny", to: "dining_lane", duration: 0.7, speed: 3.5, anim: "walk" },
      { at: 8.55, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 8.6, type: "sfx", sound: "granny_laugh", volume: 0.4 },
    ],
  };
}
