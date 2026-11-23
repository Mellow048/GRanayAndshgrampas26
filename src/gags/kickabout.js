// Gag: "Back Hall Kickabout" (~26s). Grandpa boots the ball, Granny volleys it
// back, and somebody ends up on the floor. Writes the new kick / mma_kick / trip
// templates into an episode for the first time.

import { react, lookAt, panic } from "./helpers.js";

export function kickabout({
  kicker = "grandpa",
  keeper = "granny",
} = {}) {
  return {
    name: "Back Hall Kickabout",
    duration: 26,
    room: "back_hall",
    playerSpawn: "back_hall",
    playerFacing: "back_hall_right",
    cast: {
      [kicker]: { spawn: "back_hall_right", facing: "back_hall_left" },
      [keeper]: { spawn: "back_hall_left", facing: "back_hall_right" },
    },
    props: [{ id: "match_ball", type: "emoji_ball", spawn: "hall_mid" }],
    beats: [
      { at: 0.0, type: "bgm", sound: "run_amok", volume: 0.26 },
      ...lookAt({ at: 0.1, target: "match_ball", duration: 0.22 }),
      { at: 0.3, type: "char_bubble", actor: keeper, icon: "exclamation", duration: 1.2 },
      { at: 0.4, type: "sfx", sound: "ding" },

      // He winds up and boots it
      { at: 0.8, type: "char_face", actor: kicker, target: "match_ball", instant: true },
      { at: 1.0, type: "char_anim", actor: kicker, anim: "kick", duration: 0.8 },
      { at: 1.5, type: "sfx", sound: "swoosh" },
      { at: 1.6, type: "prop_action", prop: "match_ball", action: "pop_out", waypoint: "hall_mid", to: "back_hall_left", travelDuration: 1.1 },
      ...lookAt({ at: 1.7, target: "match_ball", duration: 0.25, track: true }),

      // She volleys it straight back, harder
      { at: 2.9, type: "char_anim", actor: keeper, anim: "mma_kick", duration: 0.9 },
      { at: 3.0, type: "sfx", sound: "bonk" },
      { at: 3.2, type: "prop_action", prop: "match_ball", action: "pop_out", waypoint: "back_hall_left", to: "back_hall_right", travelDuration: 0.9 },
      ...lookAt({ at: 3.4, target: "match_ball", duration: 0.25, track: true }),
      ...react({ at: 4.1, actor: kicker, anim: "terrified", icon: "exclamation", bubbleDur: 1.2, sfx: "vine_boom" }),

      // He ducks, the ball keeps going, and he trips over his own feet
      { at: 5.0, type: "char_anim", actor: kicker, anim: "trip", duration: 1.0 },
      { at: 5.1, type: "sfx", sound: "bonk" },
      { at: 5.4, type: "char_gesture", actor: kicker, gesture: "double_take", duration: 0.8 },
      ...panic({ at: 6.2, gesture: "shake_panic", duration: 0.8, sfx: "aww" }),
      ...react({ at: 6.4, actor: keeper, anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      ...lookAt({ at: 6.6, target: keeper, duration: 0.24 }),

      // He gets up, points at her, and she denies everything with a head shake
      { at: 7.8, type: "char_move", actor: kicker, to: "back_hall_right", anim: "walk", duration: 1.4 },
      { at: 8.0, type: "char_gesture", actor: keeper, gesture: "shake_no", duration: 1.2 },
      ...react({ at: 8.2, actor: kicker, anim: "angry", loop: true, icon: "angry", bubbleDur: 1.6, sfx: "granny_i_see_you" }),
      ...lookAt({ at: 9.2, target: kicker, duration: 0.24 }),

      // Rematch: she goes for the ball, he slides in
      { at: 9.8, type: "char_move", actor: keeper, to: "hall_mid", anim: "run2", duration: 1.2 },
      ...lookAt({ at: 10.0, target: keeper, duration: 0.25, track: true }),
      { at: 11.0, type: "char_anim", actor: keeper, anim: "kick", duration: 0.8 },
      { at: 11.2, type: "sfx", sound: "swoosh" },
      { at: 11.4, type: "prop_action", prop: "match_ball", action: "pop_out", waypoint: "hall_mid", to: "back_hall", travelDuration: 1.0 },
      ...lookAt({ at: 11.6, target: "match_ball", duration: 0.25, track: true }),
      { at: 12.4, type: "char_anim", actor: kicker, anim: "trip", duration: 1.0 },
      { at: 12.5, type: "sfx", sound: "bonk" },
      ...react({ at: 13.4, actor: kicker, anim: "sit", loop: true, icon: "zzz", bubbleDur: 1.6, sfx: "aww" }),

      // She takes the win, he nods along to the score
      { at: 14.6, type: "char_gesture", actor: keeper, gesture: "nod", duration: 1.0 },
      ...react({ at: 15.0, actor: keeper, anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      ...lookAt({ at: 15.4, target: kicker, duration: 0.22 }),
      { at: 16.2, type: "char_gesture", actor: kicker, gesture: "nod_once", duration: 1.2 },
      { at: 17.6, type: "char_anim", actor: kicker, anim: "panic", loop: true, duration: 1.4, facePlayer: true },
      ...lookAt({ at: 17.8, target: kicker, duration: 0.24 }),
      { at: 19.0, type: "char_move", actor: keeper, to: "back_hall_left", anim: "run2", duration: 1.4 },
      ...lookAt({ at: 19.2, target: keeper, duration: 0.25, track: true }),
      { at: 20.4, type: "sfx", sound: "whoosh" },
      { at: 20.8, type: "char_anim", actor: kicker, anim: "angry", loop: true, duration: 1.2 },
      { at: 21.6, type: "char_gesture", actor: kicker, gesture: "shake_no", duration: 1.2 },
      ...lookAt({ at: 21.8, target: "match_ball", duration: 0.22 }),
      { at: 22.6, type: "prop_action", prop: "match_ball", action: "bounce" },
      { at: 23.0, type: "sfx", sound: "ding" },
      ...panic({ at: 23.4, gesture: "nod_yes", duration: 0.8 }),
      { at: 24.2, type: "char_gesture", actor: keeper, gesture: "tilt", duration: 1.2 },
      { at: 24.6, type: "fade", to: 1, duration: 0.7 },
    ],
  };
}
