// Continuous first-person ride: the camera is mounted at the scaled driver's
// seat and follows the exact route used by the car prop. Two clean laps keep
// the vehicle moving during the Granny reveal; there are no arbitrary look-away
// beats. Granny walks into the dining doorway before the staged jump/trip.

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
const HOUSE_LOOP = [...ONE_LAP, ...ONE_LAP.slice(1), ...ONE_LAP.slice(1)];

export function carHouseLoop() {
  return {
    name: "First Drive Around the House",
    duration: 53,
    playerSpawn: "living_room",
    playerFacing: "living_room_view",
    cast: {
      grandpa: { facing: "kitchen" },
      granny: { facing: "dining_center" },
    },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.22 },
      { at: 0.1, type: "prop_action", prop: "car", action: "drive", path: HOUSE_LOOP, duration: 53 },
      { at: 0.1, type: "player_ride", prop: "car", path: HOUSE_LOOP, duration: 53, speed: 3.5, sideOffset: 0.3, forwardOffset: -0.05, eyeHeight: 1.12 },

      // Put Granny behind the doorway while hidden; her visible entrance is a
      // walk, never an on-screen teleport or pop-in.
      { at: 9.2, type: "char_cut", actor: "granny", to: "dining_lane", facing: "doorway_dining", anim: "idle" },
      { at: 10.0, type: "char_visibility", actor: "granny", visible: true },
      { at: 10.05, type: "char_move", actor: "granny", to: "doorway_dining", duration: 3.4, speed: 2.4, anim: "walk" },
      { at: 14.4, type: "player_gesture", gesture: "shake_panic", duration: 0.75 },
      { at: 14.5, type: "char_anim", actor: "granny", anim: "jump", duration: 0.7, loop: false },
      { at: 14.5, type: "char_move", actor: "granny", to: "dining_center", duration: 1.15, speed: 2.4, anim: "jump" },
      { at: 14.5, type: "sfx", sound: "bonk", volume: 0.55 },
      { at: 15.8, type: "char_anim", actor: "granny", anim: "trip", duration: 0.75, loop: false },
      { at: 16.6, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 16.7, type: "sfx", sound: "granny_laugh", volume: 0.45 },
      { at: 18.8, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.7 },
      { at: 20.5, type: "char_move", actor: "granny", to: "dining_lane", duration: 1.8, speed: 2.4, anim: "walk" },
      { at: 43.2, type: "sfx", sound: "whoosh", volume: 0.4 },
    ],
  };
}
