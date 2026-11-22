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
    props: [{ id: "cookie_jar", type: "cookie_jar", spawn: loc.start, yOffset: 0.72, visible: true }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: thief, duration: 0.22, track: true }),

      // Thief sneaks up to the cookie jar and snacks loudly
      ...sneakUp({ at: 0.2, actor: thief, to: loc.start, duration: 2.0, icon: "food", sfx: "pop" }),
      ...propAction({ at: 2.3, prop: "cookie_jar", action: "bounce", sfx: "eat" }),
      ...react({ at: 2.5, actor: thief, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.4 }),
      ...propAction({ at: 3.4, prop: "cookie_jar", action: "bounce", sfx: "eat" }),

      // Cop bursts onto the scene and catches Thief red-handed
      { at: 4.3, type: "char_move", actor: cop, to: loc.hit, via: [...loc.via].reverse(), anim: "run2", duration: 1.8 },
      ...lookAt({ at: 4.6, target: cop, duration: 0.25, track: true }),
      ...react({ at: 5.9, actor: cop, anim: "idle", icon: "angry", bubbleDur: 1.6, sfx: "granny_i_see_you", cutBgm: true, cutBgmDuration: 1.0 }),

      // Thief panics, drops jar, and sprints away with Cop in hot pursuit
      ...lookAt({ at: 6.2, target: thief, duration: 0.2, track: true }),
      ...react({ at: 6.4, actor: thief, anim: "terrified", icon: "exclamation", bubbleDur: 1.2, sfx: "vine_boom" }),
      ...panic({ at: 6.6, gesture: "shake_no", duration: 0.6 }),
      ...chase({ at: 7.4, victim: thief, chaser: cop, via: loc.via, to: loc.exit, duration: 2.4, stagger: 0.35, bgm: "run_amok" }),
      ...walkTo({ at: 7.8, to: loc.hit, duration: 1.9, lookTarget: thief }),
      { at: 9.8, type: "sfx", sound: "granny_laugh", volume: 0.75 },
      ...lookAt({ at: 10.2, target: cop, duration: 0.25, track: true }),
      ...panic({ at: 11.4, gesture: "nod_yes", duration: 0.6 }),
      ...propAction({ at: 12.2, prop: "cookie_jar", action: "hide" }),
      ...lookAt({ at: 13.2, target: thief, duration: 0.25, track: true }),
      { at: 13.5, type: "sfx", sound: "vine_boom" },
    ],
  };
}
