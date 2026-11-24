// Carry the toy directly to the center of the living room, toss it once, and
// grow it while it remains grounded. The following scene enters via the driver
// seat mount; there is no crouch, dismount, or walk-away beat.

export function carTransformation() {
  return {
    name: "The Toy Car Becomes a Rideable Car",
    duration: 10,
    playerSpawn: "living_room",
    playerFacing: "living_room_view",
    cast: { grandpa: { facing: "kitchen" } },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.12, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.18 },
      { at: 0.0, type: "player_look", target: "living_room", duration: 0.6 },
      { at: 0.2, type: "player_hold", prop: "car", duration: 0.2 },
      { at: 0.45, type: "player_hold", prop: null },
      { at: 0.5, type: "prop_action", prop: "car", action: "pop_out", waypoint: "living_room", to: "living_room", travelDuration: 0.8, yOffset: 0.02 },
      { at: 0.5, type: "sfx", sound: "whoosh", volume: 0.55 },
      { at: 1.35, type: "prop_action", prop: "car", action: "reset", waypoint: "living_room", scale: 0.025, visible: true },
      { at: 1.4, type: "prop_action", prop: "car", action: "grow", scale: 0.55, duration: 1.6 },
      { at: 1.4, type: "sfx", sound: "tada", volume: 0.65 },
      { at: 3.1, type: "prop_action", prop: "car", action: "stop" },
      { at: 3.2, type: "player_look", target: "car", duration: 0.65 },
      { at: 4.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
      { at: 6.0, type: "sfx", sound: "click", volume: 0.4 },
      { at: 7.0, type: "player_gesture", gesture: "nod_yes", duration: 0.6 },
      // A short, real seat-entry roll carries straight into the longer drive.
      { at: 8.4, type: "prop_action", prop: "car", action: "drive", path: ["living_room_view"], duration: 1.2 },
      { at: 8.4, type: "player_ride", prop: "car", path: ["living_room_view"], duration: 1.2, speed: 3.5, sideOffset: 0.3, forwardOffset: -0.05, eyeHeight: 1.12 },
    ],
  };
}
