// Gag: "Sofa Talk Show" (~20s). Grandpa hosts a chat segment; Granny answers
// everything with a head gesture instead of words, which is the joke.
// First episode use of the new Talking.fbx template.

import { react, lookAt, panic } from "./helpers.js";

export function talkSofa({
  host = "grandpa",
  guest = "granny",
} = {}) {
  return {
    name: "Sofa Talk Show",
    duration: 20,
    room: "living_room",
    playerSpawn: "living_room_view",
    playerFacing: "living_room_left",
    cast: {
      [host]: { spawn: "living_room_right", facing: "living_room_left" },
      [guest]: { spawn: "living_room_left", facing: "living_room_right" },
    },
    props: [],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.1, target: host, duration: 0.24 }),

      // Opening monologue
      ...react({ at: 0.4, actor: host, anim: "talk", loop: true, icon: "heart", bubbleDur: 1.6, sfx: "ding" }),
      { at: 0.5, type: "char_gesture", actor: host, gesture: "nod", duration: 1.0 },
      ...lookAt({ at: 1.6, target: guest, duration: 0.24 }),

      // The guest agrees with literally everything
      ...react({ at: 2.0, actor: guest, anim: "talk", loop: true, icon: "laugh", bubbleDur: 1.4 }),
      { at: 2.2, type: "char_gesture", actor: guest, gesture: "nod", duration: 1.1 },
      { at: 3.6, type: "char_gesture", actor: guest, gesture: "nod", duration: 1.1 },
      { at: 4.6, type: "char_gesture", actor: host, gesture: "tilt", duration: 1.3 },

      // ...until he asks about the cookie, and she changes her tune
      { at: 5.6, type: "char_bubble", actor: guest, icon: "question", duration: 1.4 },
      { at: 6.0, type: "char_gesture", actor: guest, gesture: "shake_no", duration: 1.2 },
      ...react({ at: 6.2, actor: host, anim: "angry", loop: true, icon: "angry", bubbleDur: 1.4, sfx: "granny_i_see_you" }),
      ...lookAt({ at: 7.0, target: host, duration: 0.24 }),

      // She double-takes, then tries to laugh it off
      { at: 7.8, type: "char_gesture", actor: guest, gesture: "double_take", duration: 0.8 },
      { at: 7.9, type: "sfx", sound: "vine_boom" },
      ...react({ at: 8.8, actor: guest, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      ...lookAt({ at: 9.2, target: guest, duration: 0.24 }),

      // The host turns to the lens and shrugs
      ...react({ at: 10.4, actor: host, anim: "talk", loop: true, icon: "question", bubbleDur: 1.6, sfx: "aww" }),
      ...panic({ at: 11.2, gesture: "shake_panic", duration: 0.7 }),
      { at: 11.8, type: "char_gesture", actor: host, gesture: "shake_no", duration: 1.1 },
      ...lookAt({ at: 12.4, target: guest, duration: 0.22 }),

      // Applause
      ...react({ at: 13.0, actor: guest, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      { at: 13.4, type: "char_gesture", actor: guest, gesture: "nod", duration: 1.0 },
      ...react({ at: 14.4, actor: host, anim: "talk", loop: true, icon: "heart", bubbleDur: 1.4 }),
      ...lookAt({ at: 15.0, target: host, duration: 0.24 }),
      { at: 16.0, type: "char_gesture", actor: host, gesture: "nod_once", duration: 1.2 },
      { at: 17.2, type: "sfx", sound: "ding" },
      ...lookAt({ at: 17.6, target: guest, duration: 0.22 }),
      { at: 18.0, type: "char_gesture", actor: guest, gesture: "tilt", duration: 1.3 },
      { at: 18.6, type: "fade", to: 1, duration: 0.7 },
    ],
  };
}
