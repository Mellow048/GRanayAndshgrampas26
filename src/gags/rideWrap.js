// The child stays in the parked car. Grandpa wakes from the bump, and Granny
// walks back into view; the close is a short, silent family reaction rather
// than a vehicle exit or a string of repeated nods.

export function rideWrap() {
  return {
    name: "Park It and Check on the Family",
    duration: 17,
    playerSpawn: "living_room_view",
    playerFacing: "living_room_entry",
    cast: {
      grandpa: { facing: "living_room" },
      granny: { facing: "living_room_entry" },
    },
    props: [{ id: "car", type: "car", spawn: "living_room", scale: 0.55, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.16 },
      { at: 0.0, type: "prop_action", prop: "car", action: "stop" },
      // The impact wakes Grandpa. Granny walks the real route back from the
      // dining room while the player stays mounted in the car.
      { at: 0.5, type: "char_anim", actor: "grandpa", anim: "sit", duration: 0.9, loop: false },
      { at: 1.5, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.7 },
      {
        at: 1.0,
        type: "char_move",
        actor: "granny",
        to: "living_room_entry",
        via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "back_room_east", "doorway_living"],
        duration: 4.8,
        speed: 3.5,
        anim: "walk",
      },
      { at: 6.0, type: "char_anim", actor: "granny", anim: "laugh", loop: true },
      { at: 7.0, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true },
      { at: 9.0, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 0.8 },
      { at: 11.0, type: "char_anim", actor: "granny", anim: "jump", duration: 0.65, loop: false },
      { at: 12.0, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 0.7 },
      { at: 14.0, type: "fade", to: 1, duration: 0.6 },
    ],
  };
}
