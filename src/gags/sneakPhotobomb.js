// Gag: "Sneak Photobomb" (~13s). Victim searches the room while Prankster sneaks up behind!

import { GAG_LOCATIONS } from "./locations.js";
import { react, sneakUp, chase, lookAt, walkTo, panic } from "./helpers.js";

export function sneakPhotobomb({
  victim = "granny",
  prankster = "grandpa",
  location = "foyer_to_dining",
} = {}) {
  const loc = GAG_LOCATIONS[location] || GAG_LOCATIONS.foyer_to_dining;

  return {
    name: `Sneak Photobomb (${loc.label})`,
    duration: 13,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.mid,
    cast: {
      [victim]: { spawn: loc.mid, facing: loc.start },
      [prankster]: { spawn: loc.chaserSpawn, facing: loc.mid },
    },
    props: [],
    beats: [
      { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.2 },
      ...lookAt({ at: 0.0, target: victim, duration: 0.22, track: true }),

      // Victim peers around suspiciously
      ...react({ at: 0.3, actor: victim, anim: "look", loop: true, icon: "question", bubbleDur: 1.6, facePlayer: false }),

      // Prankster tiptoes right behind Victim and waves/laughs at the camera
      ...sneakUp({ at: 1.2, actor: prankster, to: loc.start, duration: 2.1, icon: "laugh", sfx: "pop" }),
      ...lookAt({ at: 2.5, target: prankster, duration: 0.24, track: true }),
      ...react({ at: 3.5, actor: prankster, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.6, sfx: "rizz" }),
      ...panic({ at: 4.0, gesture: "nod_yes", duration: 0.6 }),

      // Sudden realization!
      ...lookAt({ at: 5.0, target: victim, duration: 0.2 }),
      ...react({ at: 5.2, actor: victim, anim: "terrified", icon: "exclamation", bubbleDur: 1.4, sfx: "vine_boom", cutBgm: true, cutBgmDuration: 0.9 }),
      { at: 6.4, type: "sfx", sound: "granny_i_see_you", volume: 0.88 },

      // Frantic chase across the room
      ...chase({ at: 6.9, victim: prankster, chaser: victim, via: loc.via, to: loc.exit, duration: 2.4, stagger: 0.35, bgm: "run_amok" }),
      ...walkTo({ at: 7.4, to: loc.hit, duration: 1.9, lookTarget: prankster }),
      ...lookAt({ at: 9.6, target: victim, duration: 0.25, track: true }),
      { at: 10.6, type: "sfx", sound: "granny_laugh", volume: 0.75 },
      ...panic({ at: 11.2, gesture: "shake_no", duration: 0.6 }),
    ],
  };
}
