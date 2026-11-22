// Gag: "Mystery Chest Fakeout" (~14s). Opener expects treasure; gets bonked by a bouncing surprise!

import { GAG_LOCATIONS } from "./locations.js";
import { react, launchProp, lookAt, propAction, walkTo, panic } from "./helpers.js";

export function chestFakeout({
  opener = "grandpa",
  prankster = "granny",
  location = "living_to_hall",
} = {}) {
  const loc = GAG_LOCATIONS[location] || GAG_LOCATIONS.living_to_hall;

  return {
    name: `Chest Fakeout (${loc.label})`,
    duration: 14,
    playerSpawn: loc.playerSpawn,
    playerFacing: loc.start,
    cast: {
      [opener]: { spawn: loc.mid, facing: loc.start },
      [prankster]: { spawn: loc.chaserSpawn, facing: loc.start },
    },
    props: [
      { id: "chest", type: "treasure_chest", spawn: loc.start, yOffset: 0, visible: true },
      { id: "surprise", type: "emoji_ball", spawn: loc.start, yOffset: 0.35, visible: false },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
      ...lookAt({ at: 0.0, target: "chest", duration: 0.22 }),

      // Opener approaches the chest excitedly
      { at: 0.3, type: "char_move", actor: opener, to: loc.start, anim: "sneak", duration: 1.6 },
      ...react({ at: 2.0, actor: opener, anim: "idle", icon: "heart", bubbleDur: 1.2, sfx: "ding" }),

      // Chest pops open with fanfare -> fakeout surprise launches straight at Opener!
      ...propAction({ at: 3.1, prop: "chest", action: "open", sfx: "tada" }),
      ...launchProp({ at: 3.7, prop: "surprise", from: loc.start, to: loc.mid, travelDuration: 0.85, sfx: "whoosh", track: true }),
      ...react({ at: 4.5, actor: opener, anim: "terrified", icon: "exclamation", bubbleDur: 1.4, sfx: "bonk", cutBgm: true, cutBgmDuration: 1.0 }),
      ...panic({ at: 4.6, gesture: "shake_panic", duration: 0.7 }),

      // Prankster bursts out laughing at the setup
      ...lookAt({ at: 5.5, target: prankster, duration: 0.25, track: true }),
      ...react({ at: 5.7, actor: prankster, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      { at: 6.2, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.25 },

      // Opener recovers and chases Prankster out of the room
      ...react({ at: 7.5, actor: opener, anim: "idle", icon: "angry", bubbleDur: 1.3, sfx: "vine_boom" }),
      { at: 8.1, type: "char_move", actor: prankster, to: loc.exit, via: loc.via, anim: "run2", duration: 2.2 },
      { at: 8.5, type: "char_move", actor: opener, to: loc.exit, via: loc.via, anim: "run2", duration: 2.2 },
      ...walkTo({ at: 8.8, to: loc.hit, duration: 1.8, lookTarget: prankster }),
      ...lookAt({ at: 10.9, target: opener, duration: 0.25, track: true }),
      ...propAction({ at: 12.1, prop: "surprise", action: "hide" }),
      ...propAction({ at: 12.2, prop: "chest", action: "close" }),
    ],
  };
}
