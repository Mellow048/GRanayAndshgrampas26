// Gag: "Cookie Heist" (~14s). Thief sneaks cookies, Cop catches them, frantic room chase.

import { GAG_LOCATIONS } from "./locations.js";
import { react, sneakUp, chase, lookAt, propAction, walkTo, panic } from "./helpers.js";

export function cookieHeist({
  thief = "grandpa",
  cop = "granny",
  location = "kitchen_to_hall",
} = {}) {
  const loc = GAG_LOCATIONS[location] || GAG_LOCATIONS.kitchen_to_hall;

  return {
    name: `Cookie Heist (${loc.label})`,
    duration: 15,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.playerFacing,
    cast: {
      [thief]: { spawn: loc.mid, facing: loc.start },
      [cop]: { spawn: loc.exit, facing: loc.hit },
    },
    props: [{ id: "cookie_jar", type: "cookie_jar", spawn: loc.start, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: thief, duration: 0.22, track: true }),

      // Thief sneaks up to the cookie jar, pulls an actual cookie out of it and
      // eats it on camera — bites are real geometry disappearing, not a scale pop.
      ...sneakUp({ at: 0.2, actor: thief, to: loc.start, duration: 2.0, icon: "food", sfx: "pop" }),
      { at: 2.2, type: "char_face", actor: thief, target: "player", duration: 0.1 },
      { at: 2.25, type: "char_prop", actor: thief, prop: "cookie" },
      ...propAction({ at: 2.3, prop: "cookie_jar", action: "bounce", sfx: "eat" }),
      ...react({ at: 2.5, actor: thief, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.4 }),
      { at: 2.7, type: "char_gesture", actor: thief, gesture: "nod", duration: 0.9 },
      { at: 3.2, type: "char_prop_action", actor: thief, action: "bite", sfx: "eat" },
      { at: 3.8, type: "char_prop_action", actor: thief, action: "bite", sfx: "eat" },
      ...propAction({ at: 3.4, prop: "cookie_jar", action: "bounce", sfx: "eat" }),

      // Cop bursts onto the scene and catches Thief red-handed
      { at: 4.3, type: "char_move", actor: cop, to: loc.hit, via: [...loc.via].reverse(), anim: "run2", duration: 1.8 },
      ...lookAt({ at: 4.6, target: cop, duration: 0.25, track: true }),
      ...react({ at: 5.9, actor: cop, anim: "angry", icon: "angry", bubbleDur: 1.6, sfx: "granny_i_see_you", cutBgm: true, cutBgmDuration: 1.0 }),
      { at: 5.95, type: "char_gesture", actor: cop, gesture: "shake_no", duration: 1.0 },
      { at: 5.98, type: "char_gesture", actor: thief, gesture: "shake_no", duration: 0.9 },
      { at: 6.15, type: "char_prop", actor: thief, prop: null },

      // Thief panics, drops jar, and sprints away with Cop in hot pursuit
      ...lookAt({ at: 6.2, target: thief, duration: 0.2, track: true }),
      ...react({ at: 6.4, actor: thief, anim: "terrified", icon: "exclamation", bubbleDur: 1.2, sfx: "vine_boom" }),
      { at: 6.45, type: "char_gesture", actor: thief, gesture: "double_take", duration: 0.7 },
      ...panic({ at: 6.6, gesture: "shake_no", duration: 0.6 }),
      ...chase({ at: 7.4, victim: thief, chaser: cop, via: loc.via, to: loc.exit, duration: 2.4, stagger: 0.35, bgm: "run_amok" }),
      ...walkTo({ at: 7.8, to: loc.hit, duration: 1.9, lookTarget: thief }),
      { at: 9.8, type: "sfx", sound: "granny_laugh", volume: 0.75 },
      ...lookAt({ at: 10.2, target: cop, duration: 0.25, track: true }),
      ...panic({ at: 11.4, gesture: "nod_yes", duration: 0.6 }),
      { at: 11.5, type: "char_gesture", actor: cop, gesture: "nod", duration: 0.9, icon: "laugh" },
      ...propAction({ at: 12.2, prop: "cookie_jar", action: "hide" }),
      ...lookAt({ at: 13.2, target: thief, duration: 0.25, track: true }),
      { at: 13.5, type: "sfx", sound: "vine_boom" },
      // Never fade on a still pose — the last thing the lens sees is a head move.
      { at: 13.6, type: "char_gesture", actor: cop, gesture: "nod_once", duration: 1.0 },
      { at: 13.7, type: "char_gesture", actor: thief, gesture: "shake_no", duration: 1.0 },
    ],
  };
}
