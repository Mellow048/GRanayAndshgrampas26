// Gag: "Couch Hog" (~13s). Granny & Grandpa race for the living room sofa; only one sits!

import { react, lookAt, walkTo, panic } from "./helpers.js";

export function couchHog({
  winner = "granny",
  loser = "grandpa",
} = {}) {
  return {
    name: "Couch Hog (Living Room Sofa Race)",
    duration: 13,
    playerSpawn: "living_room_view",
    playerFacing: "living_room_sofa",
    cast: {
      [winner]: { spawn: "living_room_left", facing: "living_room_sofa" },
      [loser]: { spawn: "living_room", facing: "living_room_sofa" },
    },
    props: [],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.24 },
      ...lookAt({ at: 0.0, target: "living_room_sofa", duration: 0.2 }),
      { at: 0.3, type: "char_bubble", actor: winner, icon: "exclamation", duration: 1.0 },
      { at: 0.4, type: "char_bubble", actor: loser, icon: "exclamation", duration: 1.0 },
      { at: 0.4, type: "sfx", sound: "ding" },

      // Race to the living room sofa
      { at: 1.2, type: "char_move", actor: winner, to: "living_room_sofa", via: ["living_room_right"], anim: "run2", duration: 2.0 },
      { at: 1.35, type: "char_move", actor: loser, to: "living_room_right", anim: "run2", duration: 1.8 },
      ...lookAt({ at: 1.4, target: winner, duration: 0.25, track: true }),
      { at: 1.8, type: "sfx", sound: "whoosh" },

      // Winner claims the seat smugly; loser arrives a split second late
      ...react({ at: 3.3, actor: winner, anim: "sit", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "rizz" }),
      ...lookAt({ at: 3.6, target: loser, duration: 0.22, track: true }),
      ...react({ at: 4.1, actor: loser, anim: "terrified", icon: "angry", bubbleDur: 1.5, sfx: "aww", cutBgm: true, cutBgmDuration: 0.9 }),

      // Loser throws a tantrum punch at empty air near the couch, slips, and storms toward hall
      ...walkTo({ at: 5.4, to: "living_room_entry", duration: 1.5, lookTarget: loser }),
      ...react({ at: 5.8, actor: loser, anim: "punch", icon: "angry", bubbleDur: 1.2, sfx: "bonk" }),
      ...react({ at: 6.9, actor: winner, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.2, sfx: "granny_laugh" }),
      ...lookAt({ at: 7.2, target: winner, duration: 0.25 }),
      ...panic({ at: 8.2, gesture: "nod_yes", duration: 0.7 }),

      // Loser bolts out to the back hall while Winner cheers from the sofa
      { at: 8.8, type: "char_move", actor: loser, to: "back_room_east", via: ["doorway_living"], anim: "run2", duration: 2.0 },
      ...lookAt({ at: 9.2, target: loser, duration: 0.25, track: true }),
      { at: 10.6, type: "sfx", sound: "tada" },
      ...lookAt({ at: 11.2, target: winner, duration: 0.24 }),
    ],
  };
}
couchHog.isLocationLocked = true;
