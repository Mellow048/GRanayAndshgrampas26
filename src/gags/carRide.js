// Gag: "Car Ride" (~15s). A whole car parked in the living room. Grandpa
// "drives", Granny rides shotgun nodding to the beat, and the player walks
// around the car like it's the most normal thing in the world.
// One prop only: the car (the activity needs it). No talking, no bubbles.

import { lookAt, panic, propAction } from "./helpers.js";

export function carRide({
  driver = "grandpa",
  passenger = "granny",
} = {}) {
  // This gag is intentionally staged around the dedicated seated-car markers;
  // keep it independent of the generic room-location preview matrix.
  const loc = {
    label: "Living Room Cartoon Car",
    playerSpawn: "car_view",
    playerFacing: "car_center",
    start: "car_center",
    facing: "car_forward",
    mid: "car_view",
    hit: "car_passenger_seat",
    chaserSpawn: "car_driver_seat",
    chaserMid: "car_center",
    exit: "car_center",
    via: [],
  };

  return {
    name: `Car Ride (${loc.label})`,
    duration: 15,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [driver]: { spawn: loc.chaserSpawn, facing: loc.facing },
      [passenger]: { spawn: loc.hit, facing: loc.facing },
    },
    props: [{ id: "car", type: "car", spawn: loc.start, yOffset: 0, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: "car", duration: 0.25 }),
      { at: 0.3, type: "sfx", sound: "pop" },

      // Both climb in and sit facing the car
      { at: 0.5, type: "char_anim", actor: driver, anim: "sit", loop: true },
      { at: 0.7, type: "char_anim", actor: passenger, anim: "sit", loop: true },
      { at: 1.0, type: "char_gesture", actor: driver, gesture: "nod_once", duration: 0.8 },

      // Engine rev: the suspension bounces
      ...propAction({ at: 1.6, prop: "car", action: "bounce", sfx: "whoosh" }),
      { at: 2.2, type: "char_gesture", actor: passenger, gesture: "nod", duration: 1.2 },

      // The POV watches from the living-room doorway; Grandpa and Granny are
      // seated in the car rather than stranded around the room.
      ...lookAt({ at: 2.6, target: "car", duration: 0.25, track: true }),
      { at: 3.4, type: "char_gesture", actor: driver, gesture: "double_take", duration: 0.7 },
      { at: 4.2, type: "sfx", sound: "ding" },

      // She laughs, he shakes his head: "we are NOT stuck, we are driving"
      { at: 5.0, type: "char_anim", actor: passenger, anim: "laugh", loop: true },
      { at: 5.2, type: "char_gesture", actor: driver, gesture: "shake_no", duration: 0.9 },
      { at: 5.6, type: "sfx", sound: "granny_laugh", volume: 0.5 },
      ...panic({ at: 6.2, gesture: "nod_yes", duration: 0.8 }),

      // Another rev, another bounce
      ...propAction({ at: 7.4, prop: "car", action: "bounce", sfx: "swoosh" }),
      { at: 8.0, type: "char_gesture", actor: passenger, gesture: "tilt", duration: 0.8 },
      ...lookAt({ at: 8.4, target: driver, duration: 0.24 }),

      // Victory lap: nods all round
      { at: 9.2, type: "char_gesture", actor: driver, gesture: "double_take", duration: 0.7 },
      { at: 10.2, type: "char_gesture", actor: passenger, gesture: "nod", duration: 0.8 },
      { at: 11.0, type: "char_gesture", actor: driver, gesture: "nod_once", duration: 0.8 },
      ...panic({ at: 12.0, gesture: "nod_yes", duration: 0.8 }),
      { at: 13.0, type: "char_gesture", actor: driver, gesture: "nod", duration: 0.8 },
      { at: 13.8, type: "sfx", sound: "tada" },
    ],
  };
}
