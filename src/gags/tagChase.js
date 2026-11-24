// Gag: "Tag Chase" (~15s). Granny and Grandpa dash through separate lanes,
// swap the lead with running gaits, Grandpa trips, and both nod "good game."
// Body language only: head gestures + physical comedy. No talking, no
// thought bubbles, no props.

import { lookAt, panic } from "./helpers.js";

export function tagChase({
  victim = "grandpa",
  chaser = "granny",
} = {}) {
  // Keep the foot chase inside the open living room: the kitchen-to-hall route
  // crosses fixed furniture and makes the runner clip through the set.
  // These are authored SET_MAP waypoints, not raw coordinates.
  const loc = {
    label: "Living Room Loop",
    playerSpawn: "back_room_east_right",
    playerFacing: "doorway_living",
    start: "living_room_left",
    mid: "living_room_ball_bounce",
    chaserSpawn: "living_room_right",
    chaserExit: "living_room_entry",
    exit: "living_room_ball_bounce",
    via: [],
  };

  return {
    name: `Tag Chase (${loc.label})`,
    duration: 15,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [victim]: { spawn: loc.start, facing: loc.mid },
      [chaser]: { spawn: loc.chaserSpawn, facing: loc.start },
    },
    props: [],
    beats: [
      { at: 0.0, type: "bgm", sound: "run_amok", volume: 0.26 },
      ...lookAt({ at: 0.0, target: victim, duration: 0.22, track: true }),

      // She spots him (double take), he tilts his head like "huh?"
      { at: 0.4, type: "char_gesture", actor: chaser, gesture: "double_take", duration: 0.7 },
      { at: 0.6, type: "sfx", sound: "pop" },
      { at: 1.2, type: "char_gesture", actor: victim, gesture: "tilt", duration: 0.8 },

      // The chase: victim bolts for the exit, chaser follows staggered
      // Split the pair onto two clear lanes so they play tag without sharing a
      // waypoint or colliding: Grandpa runs across the room, Granny cuts short.
      { at: 1.6, type: "char_move", actor: victim, to: loc.exit, anim: "run2", duration: 2.6 },
      { at: 2.0, type: "char_move", actor: chaser, to: loc.chaserExit, anim: "run", duration: 2.6 },
      ...lookAt({ at: 1.7, target: victim, duration: 0.25, track: true }),

      // Mid-chase: he looks back, she nods like "gotcha"
      { at: 3.2, type: "char_gesture", actor: victim, gesture: "double_take", duration: 0.7 },
      { at: 3.8, type: "char_gesture", actor: chaser, gesture: "nod", duration: 0.9 },
      { at: 4.2, type: "sfx", sound: "whoosh" },

      // POV reacts from a safe doorway vantage while the pair dash past.
      ...panic({ at: 5.0, gesture: "shake_panic", duration: 0.7, sfx: "aww" }),
      ...lookAt({ at: 6.0, target: chaser, duration: 0.24 }),

      // Roles swap: Granny takes the lead and Grandpa mock-chases in place;
      // head shake and running gait sell the game without crossing their lanes.
      { at: 7.0, type: "char_anim", actor: chaser, anim: "run", duration: 1.2 },
      { at: 7.4, type: "char_anim", actor: victim, anim: "run2", duration: 1.2 },
      { at: 7.2, type: "char_gesture", actor: victim, gesture: "shake_no", duration: 0.9 },
      { at: 8.0, type: "sfx", sound: "squidward_walk" },
      ...lookAt({ at: 8.2, target: chaser, duration: 0.25, track: true }),
      { at: 9.2, type: "char_gesture", actor: victim, gesture: "nod", duration: 0.8 },

      // Slapstick: he trips over his own feet, she laughs, player nods yes
      { at: 10.2, type: "char_anim", actor: victim, anim: "trip", duration: 1.0 },
      { at: 10.3, type: "sfx", sound: "bonk" },
      { at: 11.0, type: "char_anim", actor: chaser, anim: "laugh", loop: true },
      { at: 11.1, type: "sfx", sound: "granny_laugh", volume: 0.6 },
      ...panic({ at: 11.4, gesture: "nod_yes", duration: 0.8 }),

      // Good game: he jumps up, both nod at the player
      { at: 13.0, type: "char_anim", actor: victim, anim: "jump", duration: 0.6 },
      { at: 13.2, type: "char_gesture", actor: victim, gesture: "nod", duration: 0.8 },
      { at: 13.6, type: "char_gesture", actor: chaser, gesture: "nod", duration: 0.8 },
      { at: 14.0, type: "sfx", sound: "tada" },
    ],
  };
}
