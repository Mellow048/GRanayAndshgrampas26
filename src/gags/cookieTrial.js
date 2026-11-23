// Gag: "Cookie Trial" (~26s). Granny puts Grandpa on trial for the missing cookie.
// Uses the procedural head gestures (denial, confession, double take) and a real
// cookie prop he can bite chunks out of.

import { react, lookAt, panic } from "./helpers.js";

export function cookieTrial({
  judge = "granny",
  suspect = "grandpa",
} = {}) {
  return {
    name: "Cookie Trial (Dining Room Interrogation)",
    duration: 26,
    room: "dining",
    playerSpawn: "dining_center",
    playerFacing: "dining_argue_west",
    cast: {
      [judge]: { spawn: "dining_argue_west", facing: "dining_argue_east" },
      [suspect]: { spawn: "dining_argue_east", facing: "dining_argue_west" },
    },
    props: [{ id: "trial_cookie", type: "cookie", spawn: "dining_table_top" }],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      ...lookAt({ at: 0.1, target: judge, duration: 0.25 }),

      // The accusation
      ...react({ at: 0.4, actor: judge, anim: "angry", loop: true, icon: "angry", bubbleDur: 1.6, sfx: "granny_i_see_you", cutBgm: true, cutBgmDuration: 0.8 }),
      { at: 0.45, type: "char_gesture", actor: judge, gesture: "shake_no", duration: 1.2 },
      ...lookAt({ at: 1.5, target: suspect, duration: 0.24 }),

      // The denial
      { at: 1.8, type: "char_bubble", actor: suspect, icon: "question", duration: 1.4 },
      { at: 2.2, type: "char_gesture", actor: suspect, gesture: "shake_no", duration: 1.1, sfx: null },
      { at: 3.3, type: "sfx", sound: "aww" },

      // Judge is not buying it; suspect double-takes at the evidence on the table
      ...react({ at: 3.8, actor: judge, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.8, sfx: "granny_laugh" }),
      ...lookAt({ at: 4.6, target: "trial_cookie", duration: 0.24 }),
      { at: 5.0, type: "char_gesture", actor: suspect, gesture: "double_take", duration: 0.8 },
      { at: 5.1, type: "sfx", sound: "vine_boom" },
      { at: 5.4, type: "prop_action", prop: "trial_cookie", action: "bounce" },

      // Caught red-handed: he grabs the evidence and eats it mid-trial
      ...react({ at: 6.2, actor: suspect, anim: "terrified", icon: "exclamation", bubbleDur: 1.2, sfx: "pop" }),
      { at: 6.8, type: "char_prop", actor: suspect, prop: "cookie" },
      { at: 7.4, type: "char_prop_action", actor: suspect, action: "bite", sfx: "eat" },
      { at: 8.6, type: "char_prop_action", actor: suspect, action: "bite", sfx: "eat" },
      ...lookAt({ at: 7.6, target: suspect, duration: 0.25, track: true }),

      // Contempt of court
      ...react({ at: 9.4, actor: judge, anim: "angry", loop: true, icon: "angry", bubbleDur: 1.4, sfx: "granny_i_see_you" }),
      { at: 9.5, type: "char_gesture", actor: judge, gesture: "shake_no", duration: 1.2 },
      { at: 10.4, type: "char_move", actor: suspect, to: "dining_table_front", via: ["dining_lane"], anim: "run2", duration: 1.8 },
      ...lookAt({ at: 10.6, target: suspect, duration: 0.25, track: true }),
      { at: 11.0, type: "sfx", sound: "whoosh" },
      { at: 12.6, type: "char_move", actor: judge, to: "dining_corner", anim: "run2", duration: 1.6 },
      ...panic({ at: 12.6, gesture: "shake_panic", duration: 0.7, sfx: "bonk" }),

      // He pleads innocent with a head tilt; she is having none of it
      { at: 13.4, type: "char_move", actor: suspect, to: "dining_argue_east", anim: "sneak", duration: 1.4 },
      ...lookAt({ at: 13.6, target: suspect, duration: 0.24 }),
      { at: 15.0, type: "char_gesture", actor: suspect, gesture: "tilt", duration: 1.3 },
      { at: 15.4, type: "char_move", actor: judge, to: "dining_argue_west", anim: "walk", duration: 1.6 },
      ...react({ at: 15.2, actor: judge, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),

      // Verdict: he nods along, defeated, and hands the crumbs over
      { at: 16.8, type: "char_gesture", actor: suspect, gesture: "nod_once", duration: 1.2 },
      { at: 18.0, type: "char_prop_action", actor: suspect, action: "bite", sfx: "eat" },
      { at: 18.6, type: "char_prop", actor: suspect, prop: null },
      ...lookAt({ at: 18.4, target: judge, duration: 0.24 }),
      { at: 19.2, type: "char_gesture", actor: judge, gesture: "nod", duration: 1.0 },
      { at: 20.4, type: "sfx", sound: "tada" },
      ...react({ at: 20.6, actor: judge, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8 }),
      ...react({ at: 21.2, actor: suspect, anim: "sit", loop: true, icon: "zzz", bubbleDur: 1.6, sfx: "aww" }),
      { at: 22.4, type: "char_gesture", actor: suspect, gesture: "shake_no", duration: 1.2 },
      ...lookAt({ at: 23.2, target: suspect, duration: 0.22 }),
      { at: 24.4, type: "sfx", sound: "ding" },
      { at: 24.6, type: "fade", to: 1, duration: 0.7 },
    ],
  };
}
