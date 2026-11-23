// Gag: "Cookie Payback" (~20s). Kitchen. Granny quietly puts the stolen cookie
// back in the jar; Grandpa catches her, double-takes, and they split it.
// The quietest gag in the marathon — it is the breath before the finale.

import { react, lookAt, sneakUp, walkTo } from "./helpers.js";

export function cookiePayback({
  sneaky = "granny",
  watcher = "grandpa",
} = {}) {
  return {
    name: "Cookie Payback (Kitchen)",
    duration: 20,
    room: "kitchen",
    playerSpawn: "dining_center",
    playerFacing: "kitchen",
    cast: {
      [sneaky]: { spawn: "kitchen_fridge", facing: "kitchen_counter_top" },
      [watcher]: { spawn: "kitchen", facing: "kitchen_fridge" },
    },
    props: [
      { id: "payback_jar", type: "cookie_jar", spawn: "kitchen_counter_top" },
      { id: "payback_cookie", type: "cookie", spawn: "kitchen_counter_top" },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
      ...lookAt({ at: 0.1, target: sneaky, duration: 0.24 }),

      // Tiptoe in with the evidence
      ...sneakUp({ at: 0.4, actor: sneaky, to: "kitchen_counter_top", duration: 2.0, icon: "question", sfx: "squidward_walk" }),
      ...lookAt({ at: 1.2, target: watcher, duration: 0.22 }),
      ...react({ at: 1.6, actor: watcher, anim: "sit", loop: true, icon: "zzz", bubbleDur: 1.6 }),

      // She stashes the cookie and freezes
      { at: 2.8, type: "prop_action", prop: "payback_cookie", action: "bounce" },
      { at: 3.0, type: "sfx", sound: "click" },
      { at: 3.4, type: "char_gesture", actor: sneaky, gesture: "tilt", duration: 1.2 },
      ...lookAt({ at: 3.8, target: sneaky, duration: 0.24 }),

      // He wakes up mid-stash and double-takes
      { at: 4.6, type: "char_anim", actor: watcher, anim: "terrified", duration: 0.8, facePlayer: true },
      { at: 4.7, type: "char_gesture", actor: watcher, gesture: "double_take", duration: 0.8 },
      { at: 4.8, type: "sfx", sound: "vine_boom" },
      ...lookAt({ at: 5.0, target: watcher, duration: 0.25, track: true }),

      // The stand-off: he shakes his head, she shakes hers right back
      { at: 5.8, type: "char_gesture", actor: watcher, gesture: "shake_no", duration: 1.2 },
      { at: 6.4, type: "char_gesture", actor: sneaky, gesture: "shake_no", duration: 1.2 },
      ...react({ at: 6.8, actor: watcher, anim: "talk", loop: true, icon: "question", bubbleDur: 1.6, sfx: "typing" }),
      ...lookAt({ at: 7.4, target: sneaky, duration: 0.24 }),

      // She offers him half. He nods. Peace.
      { at: 8.2, type: "char_prop", actor: sneaky, prop: "cookie" },
      ...react({ at: 8.4, actor: sneaky, anim: "talk", loop: true, icon: "heart", bubbleDur: 1.6, sfx: "rizz" }),
      { at: 9.0, type: "char_prop_action", actor: sneaky, action: "bite", sfx: "eat" },
      { at: 9.4, type: "char_gesture", actor: watcher, gesture: "nod", duration: 1.1 },
      ...lookAt({ at: 9.6, target: watcher, duration: 0.24 }),
      { at: 10.4, type: "char_prop", actor: watcher, prop: "cookie" },
      { at: 11.0, type: "char_prop_action", actor: watcher, action: "bite", sfx: "eat" },

      // Shared snack, shared laugh
      ...react({ at: 11.8, actor: sneaky, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      ...lookAt({ at: 12.2, target: sneaky, duration: 0.24 }),
      ...react({ at: 13.0, actor: watcher, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8 }),
      { at: 13.6, type: "char_gesture", actor: watcher, gesture: "nod", duration: 1.0 },
      { at: 14.6, type: "sfx", sound: "tada" },

      // They walk off together and the jar is left on the counter
      ...walkTo({ at: 15.2, to: "dining_lane", duration: 1.6, lookTarget: "payback_jar" }),
      ...lookAt({ at: 15.4, target: sneaky, duration: 0.22 }),
      { at: 16.4, type: "char_gesture", actor: sneaky, gesture: "nod", duration: 1.0 },
      ...lookAt({ at: 17.0, target: "payback_jar", duration: 0.24 }),
      { at: 17.8, type: "char_gesture", actor: sneaky, gesture: "nod_once", duration: 1.1 },
      { at: 18.2, type: "sfx", sound: "ding" },
      { at: 18.6, type: "fade", to: 1, duration: 0.7 },
    ],
  };
}
