// Gag: "Foot Race" (~15s). Granny vs Grandpa, start to finish. Grandpa
// trips halfway, Granny wins and does the victory jump, Grandpa shakes his
// head like a good sport, and everybody nods for a rematch.
// Body language only: no talking, no bubbles, no props.

import { lookAt, panic } from "./helpers.js";

export function footRace({
  racerA = "granny",
  racerB = "grandpa",
} = {}) {
  // Two separate, verified lanes around the foyer/dining-room furniture.
  // Waypoint IDs keep the route authored in SET_MAP, never raw coordinates.
  const loc = {
    label: "Foyer Two-Lane Race",
    playerSpawn: "foyer",
    playerFacing: "stairs_bottom",
    start: "front_door_right",
    mid: "stairs_bottom",
    chaserSpawn: "front_door_left",
    exit: "dining_table_front",
    via: ["front_door_view", "stairs_bottom", "dining_corner", "dining_table_side"],
    runnerBVia: ["front_door_view"],
    runnerBFinish: "dining_corner",
  };

  return {
    name: `Foot Race (${loc.label})`,
    duration: 15,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [racerA]: { spawn: loc.start, facing: loc.mid },
      [racerB]: { spawn: loc.chaserSpawn, facing: loc.mid },
    },
    props: [],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.24 },
      ...lookAt({ at: 0.0, target: racerA, duration: 0.22 }),

      // On your marks: both nod (ready!)
      { at: 0.4, type: "char_gesture", actor: racerA, gesture: "nod_once", duration: 0.7 },
      { at: 0.8, type: "char_gesture", actor: racerB, gesture: "nod_once", duration: 0.7 },
      { at: 1.0, type: "sfx", sound: "click" },

      // GO: she sprints for the exit, he runs for the middle
      { at: 1.2, type: "char_move", actor: racerA, to: loc.exit, anim: "run", duration: 3.2, via: [...loc.via] },
      { at: 1.8, type: "char_move", actor: racerB, to: loc.mid, anim: "run2", duration: 1.6, via: [...loc.runnerBVia] },
      ...lookAt({ at: 1.3, target: racerA, duration: 0.25, track: true }),
      { at: 2.0, type: "sfx", sound: "squidward_walk" },

      // Mid-race: he trips over his own feet
      { at: 3.1, type: "char_anim", actor: racerB, anim: "trip", duration: 1.0 },
      { at: 3.2, type: "sfx", sound: "bonk" },
      { at: 3.6, type: "char_gesture", actor: racerB, gesture: "double_take", duration: 0.7 },
      ...panic({ at: 3.8, gesture: "shake_panic", duration: 0.7, sfx: "aww" }),

      // He gets up and runs the rest of the way
      { at: 4.2, type: "char_move", actor: racerB, to: loc.runnerBFinish, anim: "run2", duration: 1.8, via: ["dining_corner"] },

      // She crosses first: victory jump + laugh
      { at: 4.8, type: "char_anim", actor: racerA, anim: "jump", duration: 0.6 },
      { at: 5.0, type: "char_anim", actor: racerA, anim: "laugh", loop: true },
      { at: 5.1, type: "sfx", sound: "granny_laugh", volume: 0.6 },
      { at: 5.4, type: "char_gesture", actor: racerA, gesture: "nod", duration: 0.9 },

      // He finishes on his own lane, shakes his head like a good sport.
      { at: 6.2, type: "char_gesture", actor: racerB, gesture: "shake_no", duration: 1.0 },
      ...lookAt({ at: 6.8, target: racerB, duration: 0.24 }),
      { at: 7.6, type: "sfx", sound: "checkmark" },

      // Rematch? Both nod yes, player nods yes, everybody jumps
      { at: 9.0, type: "char_gesture", actor: racerA, gesture: "nod", duration: 0.8 },
      { at: 9.6, type: "char_gesture", actor: racerB, gesture: "nod", duration: 0.8 },
      ...panic({ at: 10.4, gesture: "nod_yes", duration: 0.8 }),
      { at: 11.2, type: "char_anim", actor: racerB, anim: "jump", duration: 0.6 },
      { at: 11.8, type: "char_anim", actor: racerA, anim: "jump", duration: 0.6 },
      { at: 12.6, type: "sfx", sound: "tada" },
      { at: 13.2, type: "char_gesture", actor: racerA, gesture: "nod", duration: 0.8 },
      { at: 13.8, type: "char_gesture", actor: racerB, gesture: "nod", duration: 0.8 },
    ],
  };
}
