// Gag: drive the transformed open-top car around a closed route through the
// house's existing walkable rooms. The POV camera and car follow the same
// named-waypoint path; Granny is revealed at a blind corner for a safe,
// choreographed jump/trip gag rather than simulated collision physics.

const HOUSE_LOOP = [
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

export function carHouseLoop() {
  return {
    name: "First Drive Around the House",
    duration: 36,
    playerSpawn: "living_room",
    playerFacing: "living_room_view",
    cast: {
      grandpa: { facing: "kitchen" },
      granny: { facing: "dining_center" },
    },
    // Gag Lab can preview the drive module without the preceding transform gag.
    // In the chained episode, the shared car prop keeps its evolved state.
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.25 },
      { at: 0.0, type: "sfx", sound: "whoosh", volume: 0.55 },
      { at: 0.1, type: "prop_action", prop: "car", action: "drive", path: HOUSE_LOOP, duration: 36 },
      {
        at: 0.1, type: "player_walk", to: "living_room",
        via: HOUSE_LOOP, duration: 36, lookAhead: true,
      },
      { at: 1.5, type: "player_look", target: "living_room_entry", duration: 0.22 },
      { at: 4.5, type: "player_look", target: "doorway_living", duration: 0.22 },
      { at: 7.5, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },
      { at: 10.0, type: "player_look", target: "back_hall_left", duration: 0.22 },
      { at: 12.0, type: "sfx", sound: "swoosh", volume: 0.45 },

      // Surprise entrance at the blind dining doorway, timed for the car's
      // first pass. Granny is revealed only now, after being explicitly hidden.
      { at: 13.8, type: "char_cut", actor: "granny", to: "doorway_dining", facing: "dining_center", anim: "idle" },
      { at: 13.81, type: "char_visibility", actor: "granny", visible: true },
      { at: 14.7, type: "player_look", target: "doorway_dining", duration: 0.2 },
      { at: 15.05, type: "char_anim", actor: "granny", anim: "jump", duration: 0.65 },
      { at: 15.05, type: "char_move", actor: "granny", to: "dining_center", anim: "jump", duration: 1.05 },
      { at: 15.05, type: "sfx", sound: "bonk", volume: 0.6 },
      { at: 15.25, type: "player_gesture", gesture: "shake_panic", duration: 0.55 },
      { at: 16.3, type: "char_anim", actor: "granny", anim: "trip", duration: 0.75 },
      { at: 16.5, type: "player_look", target: "granny", duration: 0.22 },
      { at: 17.2, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 17.25, type: "sfx", sound: "granny_laugh", volume: 0.48 },
      { at: 18.0, type: "char_gesture", actor: "granny", gesture: "nod", duration: 0.75 },
      { at: 19.4, type: "char_move", actor: "granny", to: "dining_lane", duration: 1.4, anim: "walk" },
      { at: 21.0, type: "player_look", target: "kitchen_lane", duration: 0.22 },
      { at: 24.0, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },
      { at: 27.0, type: "player_look", target: "back_room_east", duration: 0.22 },
      { at: 30.0, type: "sfx", sound: "whoosh", volume: 0.45 },
      { at: 33.0, type: "player_look", target: "living_room", duration: 0.22 },
    ],
  };
}
