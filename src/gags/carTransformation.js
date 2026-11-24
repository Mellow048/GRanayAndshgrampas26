// Release the tiny car into the living-room floor space, let it bounce forward
// and grow, then mount it with a short eased approach instead of a camera snap.

export function carTransformation() {
  return {
    name: "The Toy Car Becomes a Rideable Car",
    duration: 7,
    playerSpawn: "living_room_view",
    playerFacing: "living_room",
    cast: { grandpa: { facing: "kitchen" } },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.12, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.16 },
      // The toy leaves the player's hand at the room entrance and bounces into
      // the clear center of the room; growth begins during that visible toss.
      { at: 0.1, type: "player_hold", prop: null },
      { at: 0.1, type: "prop_action", prop: "car", action: "place", waypoint: "living_room_entry" },
      { at: 0.15, type: "prop_action", prop: "car", action: "pop_out", waypoint: "living_room_entry", to: "living_room", travelDuration: 0.9 },
      { at: 0.15, type: "sfx", sound: "whoosh", volume: 0.5 },
      { at: 0.8, type: "prop_action", prop: "car", action: "grow", scale: 0.55, duration: 2.25 },
      { at: 0.8, type: "sfx", sound: "tada", volume: 0.55 },
      { at: 3.2, type: "prop_action", prop: "car", action: "stop" },
      // Ease down into the driver seat, then start the car and camera route
      // together. There is no on-foot vehicle exit later in the episode.
      { at: 3.8, type: "player_ride", prop: "car", path: ["living_room_right", "living_room_view"], duration: 1.2, mountDuration: 0.65, speed: 3.5, sideOffset: 0.3, forwardOffset: -0.05, eyeHeight: 1.12 },
      { at: 4.45, type: "prop_action", prop: "car", action: "drive", path: ["living_room_right", "living_room_view"], duration: 1.2 },
    ],
  };
}
