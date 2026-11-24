// Gag: "Rocket Ball" (~14s). Ball launches across a room, bonks victim, chaser pursues.
// Supports swapping `prop`, `victim`, `chaser`, AND `location` across GAG_LOCATIONS.

import { GAG_LOCATIONS } from "./locations.js";
import { react, launchProp, chase, lookAt, panic } from "./helpers.js";

export function ballRace({
  prop = "emoji_ball",
  victim = "grandpa",
  chaser = "granny",
  location = "kitchen_to_hall",
} = {}) {
  const loc = GAG_LOCATIONS[location] || GAG_LOCATIONS.kitchen_to_hall;

  return {
    name: `Rocket Ball (${loc.label})`,
    duration: 14,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [victim]: { spawn: loc.hit, facing: loc.mid },
      [chaser]: { spawn: loc.chaserSpawn, facing: loc.start },
    },
    props: [{ id: prop, type: "emoji_ball", spawn: loc.start, visible: false }],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.24 },
      ...lookAt({ at: 0.0, target: loc.start, duration: 0.2 }),
      { at: 0.3, type: "prop_action", prop, action: "show", waypoint: loc.start },
      { at: 0.4, type: "sfx", sound: "pop" },
      { at: 0.5, type: "char_bubble", actor: chaser, icon: "exclamation", duration: 1.2 },

      // Launch #1: start -> mid room
      ...launchProp({ at: 1.5, prop, from: loc.start, to: loc.mid, travelDuration: 1.3 }),

      // Launch #2: mid room -> straight into victim
      ...launchProp({ at: 3.0, prop, from: loc.mid, to: loc.hit, travelDuration: 1.0, sfx: null, track: false }),
      ...react({ at: 3.9, actor: victim, anim: "terrified", icon: "exclamation", bubbleDur: 1.2, sfx: "bonk", cutBgm: true, cutBgmDuration: 1.0 }),
      ...panic({ at: 4.0, duration: 0.6 }),

      // Chaser storms up within 1.4m before chasing
      { at: 5.0, type: "char_bubble", actor: chaser, icon: "angry", duration: 1.5 },
      { at: 5.1, type: "char_move", actor: chaser, to: loc.chaserMid, anim: "run2", duration: 1.6 },
      ...lookAt({ at: 5.1, target: chaser, duration: 0.25, track: true }),
      { at: 6.9, type: "sfx", sound: "granny_laugh", volume: 0.7 },

      // Victim bolts through exit, chaser + ball + player follow
      ...chase({ at: 7.0, victim, chaser, via: loc.via, to: loc.exit, duration: 2.2, stagger: 0.4, bgm: "run_amok" }),
      ...launchProp({ at: 7.3, prop, from: loc.hit, to: loc.exit, travelDuration: 1.8, sfx: null, track: false }),
      { at: 7.4, type: "player_walk", to: loc.hit, duration: 2.0 },
      ...lookAt({ at: 10.0, target: victim, duration: 0.25, track: true }),
      { at: 10.2, type: "sfx", sound: "vine_boom" },
      ...panic({ at: 11.0, duration: 0.8 }),
      { at: 12.0, type: "prop_action", prop, action: "hide" },
    ],
  };
}
