// 10-chapter POV comedy showcase (~274s / 4:34):
// "The Golden Pizza Shenanigans" — Granny, Grandpa, and the Player battle
// across both floors of the house over one steaming Golden Pizza.

import { react, lookAt, walkTo, panic } from "./helpers.js";

export const GOLDEN_PIZZA_PARTS = [
  { shape: "cylinder", size: [0.23, 0.22, 0.024], pos: [0, 0.014, 0], color: 0xd97706, roughness: 0.72 },
  { shape: "torus", size: [0.215, 0.024], pos: [0, 0.024, 0], rot: [Math.PI / 2, 0, 0], color: 0xb45309, roughness: 0.78 },
  { shape: "cylinder", size: [0.195, 0.195, 0.012], pos: [0, 0.028, 0], color: 0xfde047, roughness: 0.42 },
  { shape: "cylinder", size: [0.038, 0.038, 0.008], pos: [0.08, 0.036, 0.05], color: 0xdc2626 },
  { shape: "cylinder", size: [0.036, 0.036, 0.008], pos: [-0.09, 0.036, 0.04], color: 0xdc2626 },
  { shape: "cylinder", size: [0.038, 0.038, 0.008], pos: [0.01, 0.036, -0.09], color: 0xdc2626 },
  { shape: "cylinder", size: [0.034, 0.034, 0.008], pos: [-0.05, 0.036, -0.06], color: 0xdc2626 },
  { shape: "cylinder", size: [0.035, 0.035, 0.008], pos: [0.09, 0.036, -0.06], color: 0xdc2626 },
  { shape: "cylinder", size: [0.035, 0.035, 0.008], pos: [0.0, 0.036, 0.09], color: 0xdc2626 },
  { shape: "box", size: [0.03, 0.008, 0.018], pos: [0.02, 0.038, 0.01], rot: [0, 0.5, 0], color: 0x16a34a },
  { shape: "box", size: [0.026, 0.008, 0.016], pos: [-0.04, 0.038, 0.07], rot: [0, -0.4, 0], color: 0x16a34a },
];

export const MEGA_SPATULA_PARTS = [
  { shape: "box", size: [0.04, 0.03, 0.36], pos: [0, 0.02, -0.18], color: 0x92400e },
  { shape: "box", size: [0.025, 0.016, 0.14], pos: [0, 0.02, 0.05], color: 0x94a3b8, metalness: 0.7 },
  { shape: "box", size: [0.22, 0.012, 0.24], pos: [0, 0.016, 0.22], color: 0xe2e8f0, metalness: 0.8, roughness: 0.25 },
];

export const PRANK_CAKE_PARTS = [
  { shape: "cylinder", size: [0.22, 0.22, 0.12], pos: [0, 0.06, 0], color: 0xfdf2f8 },
  { shape: "cylinder", size: [0.15, 0.15, 0.1], pos: [0, 0.17, 0], color: 0xf472b6 },
  { shape: "sphere", size: [0.028], pos: [0.1, 0.13, 0.08], color: 0xdc2626 },
  { shape: "sphere", size: [0.028], pos: [-0.1, 0.13, 0.07], color: 0xdc2626 },
  { shape: "sphere", size: [0.028], pos: [0.0, 0.13, -0.11], color: 0xdc2626 },
  { shape: "cylinder", size: [0.015, 0.015, 0.09], pos: [0, 0.26, 0], color: 0xfacc15 },
  { shape: "cone", size: [0.022, 0.05], pos: [0, 0.32, 0], color: 0xf97316 },
];

export const PARTY_BOOMBOX_PARTS = [
  { shape: "box", size: [0.56, 0.26, 0.2], pos: [0, 0.13, 0], color: 0x1e293b, roughness: 0.45 },
  { shape: "box", size: [0.52, 0.22, 0.02], pos: [0, 0.13, 0.1], color: 0x0ea5e9 },
  { shape: "cylinder", size: [0.085, 0.085, 0.03], pos: [-0.17, 0.13, 0.11], rot: [Math.PI / 2, 0, 0], color: 0x0f172a },
  { shape: "cylinder", size: [0.085, 0.085, 0.03], pos: [0.17, 0.13, 0.11], rot: [Math.PI / 2, 0, 0], color: 0x0f172a },
  { shape: "box", size: [0.14, 0.08, 0.03], pos: [0, 0.14, 0.11], color: 0xef4444 },
  { shape: "box", size: [0.32, 0.03, 0.04], pos: [0, 0.3, 0], color: 0xe2e8f0, metalness: 0.7 },
  { shape: "box", size: [0.03, 0.07, 0.04], pos: [-0.14, 0.27, 0], color: 0xe2e8f0, metalness: 0.7 },
  { shape: "box", size: [0.03, 0.07, 0.04], pos: [0.14, 0.27, 0], color: 0xe2e8f0, metalness: 0.7 },
];

export const PIZZA_TROPHY_PARTS = [
  { shape: "cylinder", size: [0.14, 0.16, 0.06], pos: [0, 0.03, 0], color: 0x451a03 },
  { shape: "cylinder", size: [0.04, 0.06, 0.16], pos: [0, 0.14, 0], color: 0xfacc15, metalness: 0.85, roughness: 0.2 },
  { shape: "cone", size: [0.14, 0.18], pos: [0, 0.26, 0], rot: [Math.PI, 0, 0], color: 0xfacc15, metalness: 0.85, roughness: 0.2 },
  { shape: "torus", size: [0.055, 0.014], pos: [-0.12, 0.25, 0], color: 0xfacc15, metalness: 0.85 },
  { shape: "torus", size: [0.055, 0.014], pos: [0.12, 0.25, 0], color: 0xfacc15, metalness: 0.85 },
  { shape: "cylinder", size: [0.07, 0.07, 0.015], pos: [0, 0.36, 0], color: 0xf59e0b },
];

function goldenPizzaProp(spawn, extra = {}) {
  return {
    id: "golden_pizza",
    type: "custom",
    spawn,
    visible: true,
    steam: true,
    scale: 1.08,
    parts: GOLDEN_PIZZA_PARTS,
    ...extra,
  };
}

// ---------------------------------------------------------------------------
// Chapter 1 (~26s) — Upstairs Bedroom: "The Phantom Pizza Sniff"
// ---------------------------------------------------------------------------
export function goldenPizzaWakeup() {
  return {
    name: "Ch 1: The Phantom Pizza Sniff (Upstairs Bedroom)",
    duration: 26,
    room: "upstairs_bedroom",
    playerSpawn: "up_bed_side",
    playerFacing: "up_bed_top_west",
    cast: {
      grandpa: { spawn: "up_bed_north", facing: "up_bed_top_west" },
      granny: { spawn: "up_bed_north_side", facing: "up_bed_north" },
    },
    props: [goldenPizzaProp("up_bed_top_west")],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      ...lookAt({ at: 0.1, target: "golden_pizza", duration: 0.25 }),
      { at: 0.5, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
      { at: 0.6, type: "sfx", sound: "tada", volume: 0.7 },
      { at: 1.4, type: "prop_action", prop: "golden_pizza", action: "bounce" },

      // Grandpa snores beside the bed, then catches a whiff of fresh pizza!
      ...lookAt({ at: 1.8, target: "grandpa", duration: 0.26, track: true }),
      ...react({ at: 2.2, actor: "grandpa", anim: "sit", loop: true, icon: "zzz", bubbleDur: 1.5, sfx: "aww" }),
      { at: 4.0, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.8 },
      { at: 4.2, type: "char_bubble", actor: "grandpa", icon: "food", duration: 1.4 },
      { at: 5.8, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 5.9, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
      { at: 5.95, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.0 },
      { at: 6.0, type: "sfx", sound: "vine_boom", volume: 0.75 },

      // Grandpa reaches out and grabs the Golden Pizza for himself
      { at: 7.0, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.8 },
      { at: 7.4, type: "prop_action", prop: "golden_pizza", action: "glide", to: "grandpa", targetHeight: "nose", duration: 1.2, arc: 0.2 },
      { at: 8.6, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.05, 0.22] },
      ...react({ at: 8.8, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "rizz" }),

      // Granny bursts in, points dramatically, and intercepts the pizza!
      ...lookAt({ at: 10.6, target: "granny", duration: 0.25, track: true }),
      { at: 10.7, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 10.8, type: "char_arm", actor: "granny", gesture: "point", duration: 1.8 },
      ...react({ at: 11.0, actor: "granny", anim: "angry", loop: true, icon: "angry", bubbleDur: 1.6, sfx: "granny_i_see_you" }),
      { at: 12.6, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.1 },

      ...lookAt({ at: 13.8, target: "grandpa", duration: 0.25, track: true }),
      ...react({ at: 14.0, actor: "grandpa", anim: "terrified", icon: "exclamation", bubbleDur: 1.4, sfx: "bonk" }),
      { at: 14.4, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "granny", targetHeight: "nose", duration: 1.0, arc: 0.35 },
      { at: 15.4, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },
      { at: 15.5, type: "sfx", sound: "whoosh", volume: 0.65 },

      // Granny carries the prize down the upstairs hall; Grandpa scrambles after her!
      ...lookAt({ at: 16.6, target: "granny", duration: 0.26, track: true }),
      { at: 16.7, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 16.8, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.6, sfx: "granny_laugh" }),
      { at: 18.2, type: "char_arm", actor: "granny", gesture: "carry", duration: 4.5 },
      { at: 18.2, type: "char_move", actor: "granny", to: "upstairs_hall_center", via: ["up_hall_north", "up_hall_north_door"], anim: "run", duration: 3.4 },
      { at: 19.6, type: "char_move", actor: "grandpa", to: "up_hall_north", via: ["up_bed_north_side"], anim: "run2", duration: 3.2 },
      { at: 20.6, type: "sfx", sound: "pop", volume: 0.6 },
      ...walkTo({ at: 21.8, to: "up_bed_hall", duration: 1.6, lookTarget: "granny" }),
      { at: 23.6, type: "player_gesture", gesture: "shake_no", duration: 1.2 },
      { at: 24.4, type: "sfx", sound: "swoosh", volume: 0.6 },
    ],
  };
}
goldenPizzaWakeup.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 2 (~27s) — Upstairs Balcony & East Hall: "The Great Balcony Drop"
// ---------------------------------------------------------------------------
export function goldenPizzaBalcony() {
  return {
    name: "Ch 2: The Great Balcony Drop (Upstairs Balcony)",
    duration: 27,
    room: "upstairs_east",
    playerSpawn: "upstairs_east_north",
    playerFacing: "upstairs_hall_center",
    cast: {
      granny: { spawn: "upstairs_hall_center", facing: "upstairs_east_north" },
      grandpa: { spawn: "upstairs_balcony", facing: "upstairs_hall_center" },
    },
    props: [
      goldenPizzaProp("upstairs_hall_center"),
      { id: "balcony_ball", type: "emoji_ball", spawn: "upstairs_balcony", visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.22 },
      { at: 0.1, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.22] },
      ...lookAt({ at: 0.3, target: "granny", duration: 0.25, track: true }),

      // Granny parades the pizza in the hall while Grandpa sneaks from the balcony to east hall!
      { at: 0.7, type: "char_arm", actor: "granny", gesture: "offer", duration: 2.2 },
      ...react({ at: 0.8, actor: "granny", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "granny_laugh" }),

      ...lookAt({ at: 2.8, target: "grandpa", duration: 0.26, track: true }),
      { at: 3.0, type: "char_move", actor: "grandpa", to: "upstairs_east_hall", anim: "sneak", duration: 2.0 },
      { at: 3.2, type: "sfx", sound: "squidward_walk", volume: 0.55 },
      { at: 5.1, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.4 },
      { at: 5.3, type: "char_bubble", actor: "grandpa", icon: "question", duration: 1.3 },
      { at: 5.5, type: "sfx", sound: "pop", volume: 0.6 },

      // Granny spots him — karate-spin kick!
      ...lookAt({ at: 6.4, target: "granny", duration: 0.25, track: true }),
      { at: 6.6, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 6.8, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.8 },
      { at: 6.85, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.0 },
      { at: 6.9, type: "sfx", sound: "vine_boom", volume: 0.75 },
      { at: 7.8, type: "char_anim", actor: "granny", anim: "kick", duration: 1.1, facePlayer: true },
      { at: 8.1, type: "sfx", sound: "swoosh", volume: 0.7 },

      // Grandpa jumps back and bumps the bouncy ball right over the railing!
      ...lookAt({ at: 9.0, target: "grandpa", duration: 0.25, track: true }),
      { at: 9.1, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 9.2, actor: "grandpa", anim: "terrified", icon: "exclamation", bubbleDur: 1.5, sfx: "bonk" }),
      { at: 10.6, type: "prop_action", prop: "balcony_ball", action: "glide", from: "upstairs_balcony", to: "foyer_atrium", duration: 1.5, arc: 0.55 },
      { at: 12.0, type: "sfx", sound: "explode_meme", volume: 0.6 },
      { at: 12.1, type: "char_anim", actor: "grandpa", anim: "jump", duration: 1.0, facePlayer: true },

      // Player reacts; Granny waves triumphantly
      ...panic({ at: 13.4, gesture: "shake_no", duration: 0.9, sfx: "aww" }),
      ...lookAt({ at: 14.4, target: "granny", duration: 0.25, track: true }),
      { at: 14.6, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.6 },
      ...react({ at: 14.8, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.8, sfx: "tada" }),

      // Grandpa watches in disbelief from the balcony while Granny sprints down the stairs!
      { at: 16.6, type: "char_move", actor: "grandpa", to: "upstairs_balcony", anim: "walk", duration: 1.8 },
      ...lookAt({ at: 17.2, target: "grandpa", duration: 0.25, track: true }),
      { at: 18.6, type: "char_gesture", actor: "grandpa", gesture: "shake_no", duration: 1.1 },

      // Race for the staircase!
      ...lookAt({ at: 19.9, target: "granny", duration: 0.25, track: true }),
      { at: 20.1, type: "char_arm", actor: "granny", gesture: "carry", duration: 5.5 },
      { at: 20.1, type: "char_move", actor: "granny", to: "stairs_top", via: ["upstairs_landing"], anim: "run", duration: 3.4 },
      { at: 22.8, type: "sfx", sound: "whoosh", volume: 0.6 },
      ...walkTo({ at: 23.8, to: "upstairs_east_hall", duration: 1.4, lookTarget: "grandpa" }),
      { at: 25.3, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 1.1 },
      { at: 25.4, type: "sfx", sound: "ding", volume: 0.6 },
    ],
  };
}
goldenPizzaBalcony.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 3 (~28s) — Kitchen: "Turbo Kitchen Bake-Off"
// ---------------------------------------------------------------------------
export function goldenPizzaKitchen() {
  return {
    name: "Ch 3: Turbo Kitchen Bake-Off (Kitchen)",
    duration: 28,
    room: "kitchen",
    playerSpawn: "dining_lane",
    playerFacing: "kitchen",
    cast: {
      granny: { spawn: "kitchen", facing: "kitchen_table_top" },
      grandpa: { spawn: "dining_center", facing: "kitchen" },
    },
    props: [
      goldenPizzaProp("kitchen_table_top"),
      { id: "bake_skillet", type: "frying_pan", spawn: "kitchen_counter_top", visible: true, steam: true },
      { id: "bake_spatula", type: "custom", spawn: "kitchen_counter_top", spawnOffset: { x: 0.35, z: -0.25 }, visible: true, parts: MEGA_SPATULA_PARTS },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      ...lookAt({ at: 0.1, target: "granny", duration: 0.25, track: true }),

      // Granny goes full chef-mode with the giant pizza spatula and sizzling pan
      { at: 0.4, type: "char_arm", actor: "granny", gesture: "stir", duration: 2.6 },
      { at: 0.5, type: "char_bubble", actor: "granny", icon: "food", duration: 1.8 },
      { at: 0.6, type: "sfx", sound: "pop", volume: 0.55 },
      { at: 2.2, type: "char_gesture", actor: "granny", gesture: "nod_once", duration: 0.9 },

      // She flips the Golden Pizza WAY too hard — straight onto the tall fridge shelf!
      { at: 3.3, type: "char_arm", actor: "granny", gesture: "offer", duration: 1.6 },
      { at: 3.4, type: "prop_action", prop: "golden_pizza", action: "glide", from: "kitchen_table_top", to: "kitchen_fridge_shelf", duration: 1.5, arc: 0.65 },
      { at: 3.5, type: "sfx", sound: "whoosh", volume: 0.7 },
      ...lookAt({ at: 4.5, target: "golden_pizza", duration: 0.25 }),
      { at: 4.9, type: "sfx", sound: "explode_meme", volume: 0.65 },
      { at: 5.0, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 5.1, type: "char_anim", actor: "granny", anim: "terrified", duration: 1.2, facePlayer: true },

      // Grandpa rushes into the kitchen to rescue it
      ...lookAt({ at: 6.4, target: "grandpa", duration: 0.25, track: true }),
      { at: 6.6, type: "char_move", actor: "grandpa", to: "kitchen_fridge_front", via: ["kitchen_lane"], anim: "run", duration: 2.2 },
      { at: 8.8, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.8 },
      { at: 9.0, type: "char_anim", actor: "grandpa", anim: "jump", duration: 1.0, facePlayer: true },
      { at: 9.2, type: "sfx", sound: "bonk", volume: 0.75 },

      // Grandpa bonks his head and double-takes while Granny bursts out laughing!
      { at: 10.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 10.5, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
      { at: 10.55, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.0 },
      { at: 10.6, type: "sfx", sound: "vine_boom", volume: 0.75 },
      ...lookAt({ at: 11.8, target: "granny", duration: 0.25, track: true }),
      { at: 11.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 12.0, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),

      // Granny reels it back down using her mega-spatula skills!
      { at: 14.2, type: "char_arm", actor: "granny", gesture: "reach_out", duration: 1.8 },
      { at: 14.5, type: "prop_action", prop: "golden_pizza", action: "glide", from: "kitchen_fridge_shelf", to: "granny", targetHeight: "nose", duration: 1.3, arc: 0.28 },
      { at: 15.8, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.24] },
      { at: 16.0, type: "sfx", sound: "tada", volume: 0.75 },

      // Grandpa sniffs the recovered pie, steps out toward dining_center, then Granny zooms past!
      ...lookAt({ at: 17.2, target: "grandpa", duration: 0.25, track: true }),
      { at: 17.4, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.5 },
      { at: 17.6, type: "char_bubble", actor: "grandpa", icon: "heart", duration: 1.5 },
      { at: 17.8, type: "sfx", sound: "rizz", volume: 0.6 },
      { at: 19.2, type: "char_move", actor: "grandpa", to: "dining_center", via: ["kitchen_lane"], anim: "walk", duration: 2.2 },

      ...lookAt({ at: 21.4, target: "granny", duration: 0.25, track: true }),
      { at: 21.6, type: "char_arm", actor: "granny", gesture: "carry", duration: 4.5 },
      { at: 21.6, type: "char_move", actor: "granny", to: "kitchen_lane", anim: "run", duration: 1.8 },
      { at: 24.0, type: "sfx", sound: "swoosh", volume: 0.6 },
      ...walkTo({ at: 24.6, to: "dining_corner", duration: 1.8, lookTarget: "granny" }),
      { at: 26.4, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
      { at: 26.6, type: "sfx", sound: "ding", volume: 0.65 },
    ],
  };
}
goldenPizzaKitchen.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 4 (~28s) — Dining Room: "The Prank-Cake Decoy Switcheroo"
// ---------------------------------------------------------------------------
export function goldenPizzaDecoy() {
  return {
    name: "Ch 4: The Prank-Cake Decoy Switcheroo (Dining Room)",
    duration: 28,
    room: "dining",
    playerSpawn: "dining_center",
    playerFacing: "dining_table_top",
    cast: {
      granny: { spawn: "dining_table_front", facing: "dining_table_top_west" },
      grandpa: { spawn: "dining_corner", facing: "dining_table_top_west" },
    },
    props: [
      goldenPizzaProp("dining_table_top"),
      { id: "decoy_cake", type: "custom", spawn: "dining_table_top_west", visible: false, parts: PRANK_CAKE_PARTS },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      ...lookAt({ at: 0.1, target: "grandpa", duration: 0.25, track: true }),

      // Grandpa slyly places a frosty Decoy Cake on the table to distract Granny!
      { at: 0.4, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.6 },
      { at: 0.8, type: "prop_action", prop: "decoy_cake", action: "place", waypoint: "dining_table_top_west" },
      { at: 0.9, type: "sfx", sound: "pop", volume: 0.65 },
      { at: 2.1, type: "char_arm", actor: "grandpa", gesture: "offer", duration: 2.0 },
      { at: 2.2, type: "char_bubble", actor: "grandpa", icon: "heart", duration: 1.6 },
      { at: 2.4, type: "sfx", sound: "rizz", volume: 0.65 },

      // Granny falls for it at first and leans in for a huge whiff
      ...lookAt({ at: 4.2, target: "granny", duration: 0.25, track: true }),
      { at: 4.4, type: "char_arm", actor: "granny", gesture: "sniff", duration: 1.8 },
      { at: 4.6, type: "char_bubble", actor: "granny", icon: "food", duration: 1.5 },
      { at: 6.2, type: "char_gesture", actor: "granny", gesture: "nod_once", duration: 0.9 },

      // While she's distracted, Grandpa sneaks east toward the stairs and slides the Golden Pizza!
      ...lookAt({ at: 7.2, target: "grandpa", duration: 0.25, track: true }),
      { at: 7.4, type: "char_move", actor: "grandpa", to: "stairs_bottom", anim: "sneak", duration: 1.8 },
      { at: 7.5, type: "sfx", sound: "squidward_walk", volume: 0.55 },
      { at: 9.3, type: "prop_action", prop: "golden_pizza", action: "glide", from: "dining_table_top", to: "grandpa", targetHeight: "nose", duration: 1.2, arc: 0.15 },
      { at: 10.5, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.05, 0.22] },
      ...walkTo({ at: 10.6, to: "kitchen_lane", duration: 1.6, lookTarget: "grandpa" }),
      { at: 12.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
      { at: 12.3, type: "sfx", sound: "kaching", volume: 0.65 },

      // WAIT A MINUTE — Granny taps the Decoy Cake and realizes it's hollow cardboard!
      ...lookAt({ at: 13.4, target: "granny", duration: 0.25, track: true }),
      { at: 13.6, type: "prop_action", prop: "decoy_cake", action: "bounce" },
      { at: 13.8, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 13.9, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.9 },
      { at: 14.0, type: "sfx", sound: "vine_boom", volume: 0.8 },
      ...react({ at: 15.0, actor: "granny", anim: "angry", loop: true, icon: "angry", bubbleDur: 1.8, sfx: "granny_i_see_you" }),
      { at: 16.4, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.1 },

      // Bust! Granny bonks Grandpa and reclaims the Golden Pizza
      ...lookAt({ at: 17.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 17.8, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 18.0, type: "char_anim", actor: "granny", anim: "punch", duration: 0.9, facePlayer: true },
      { at: 18.2, type: "sfx", sound: "bonk", volume: 0.8 },
      { at: 18.5, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 18.6, actor: "grandpa", anim: "terrified", icon: "exclamation", bubbleDur: 1.6, sfx: "explode_meme" }),
      { at: 19.6, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "granny", targetHeight: "nose", duration: 1.1, arc: 0.3 },
      { at: 20.7, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },

      // Granny laughs victoriously and runs cleanly into dining_center!
      ...lookAt({ at: 21.8, target: "granny", duration: 0.25, track: true }),
      { at: 21.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 22.0, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.6, sfx: "granny_laugh" }),
      { at: 23.6, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.4 },
      { at: 23.6, type: "char_move", actor: "granny", to: "dining_center", anim: "run", duration: 2.0 },
      { at: 24.4, type: "char_move", actor: "grandpa", to: "dining_corner", anim: "run2", duration: 2.0 },
      { at: 26.2, type: "player_gesture", gesture: "shake_no", duration: 1.0 },
      { at: 26.8, type: "sfx", sound: "whoosh", volume: 0.6 },
    ],
  };
}
goldenPizzaDecoy.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 5 (~28s) — Living Room: "Boombox Pizza Dance-Off"
// ---------------------------------------------------------------------------
export function goldenPizzaDanceoff() {
  return {
    name: "Ch 5: Boombox Pizza Dance-Off (Living Room)",
    duration: 28,
    room: "living_room",
    playerSpawn: "living_room_entry",
    playerFacing: "living_room",
    cast: {
      granny: { spawn: "living_room", facing: "living_room_entry" },
      grandpa: { spawn: "grandpa_chest_side", facing: "living_room" },
    },
    props: [
      goldenPizzaProp("living_room_shelf_top"),
      { id: "boombox", type: "custom", spawn: "living_room_sofa", spawnOffset: { x: 0, z: -0.55 }, visible: true, parts: PARTY_BOOMBOX_PARTS },
      { id: "dance_ball", type: "emoji_ball", spawn: "living_room_ball_bounce", visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.26 },
      ...lookAt({ at: 0.1, target: "boombox", duration: 0.25 }),
      { at: 0.5, type: "prop_action", prop: "boombox", action: "bounce" },
      { at: 0.6, type: "sfx", sound: "tada", volume: 0.7 },

      // Granny declares a dance battle for the Golden Pizza!
      ...lookAt({ at: 1.4, target: "granny", duration: 0.25, track: true }),
      { at: 1.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 1.6, type: "char_arm", actor: "granny", gesture: "point", duration: 1.6 },
      ...react({ at: 1.8, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.6, sfx: "granny_laugh" }),

      // Round 1: Granny's groovy double-arm robot disco!
      {
        at: 3.5,
        type: "char_arm",
        actor: "granny",
        gesture: "custom",
        duration: 3.2,
        rUpper: [-1.15, 0.3, 0.35],
        rFore: [-0.85, 0, 0],
        lUpper: [-1.15, -0.3, -0.35],
        lFore: [-0.85, 0, 0],
        spine: [0.1, 0, 0.08],
        oscillate: [0.45, 0.35, 0.3],
        cycles: 4,
      },
      { at: 3.7, type: "char_anim", actor: "granny", anim: "jump", duration: 1.0, facePlayer: true },
      { at: 5.0, type: "sfx", sound: "rizz", volume: 0.65 },
      { at: 5.4, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },

      // Round 2: Grandpa answers with wild spinning Grandpa arms!
      ...lookAt({ at: 6.9, target: "grandpa", duration: 0.25, track: true }),
      { at: 7.0, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      {
        at: 7.2,
        type: "char_arm",
        actor: "grandpa",
        gesture: "custom",
        duration: 3.2,
        rUpper: [-1.45, -0.2, 0.5],
        rFore: [-0.5, 0, 0],
        lUpper: [-0.7, 0.2, -0.5],
        lFore: [-0.9, 0, 0],
        spine: [0.14, 0, -0.1],
        oscillate: [0.55, 0.4, 0.35],
        cycles: 5,
      },
      ...react({ at: 7.4, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "pop" }),
      { at: 9.2, type: "char_gesture", actor: "grandpa", gesture: "nod", duration: 1.0 },

      // Round 3: Granny finishes with a martial-arts spinning kick!
      ...lookAt({ at: 10.6, target: "granny", duration: 0.25, track: true }),
      { at: 10.8, type: "char_anim", actor: "granny", anim: "mma_kick", duration: 1.4, facePlayer: true },
      { at: 11.1, type: "sfx", sound: "swoosh", volume: 0.75 },
      { at: 11.4, type: "prop_action", prop: "dance_ball", action: "glide", from: "living_room_ball_bounce", to: "grandpa_chest_side", duration: 0.9, arc: 0.3 },

      // Grandpa gets booped by the ball and wipes out!
      ...lookAt({ at: 12.2, target: "grandpa", duration: 0.25, track: true }),
      { at: 12.4, type: "char_anim", actor: "grandpa", anim: "trip", duration: 1.4, facePlayer: true },
      { at: 12.5, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.1 },
      { at: 12.6, type: "sfx", sound: "bonk", volume: 0.8 },
      { at: 13.8, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 14.0, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
      { at: 14.1, type: "sfx", sound: "aww", volume: 0.65 },
      ...react({ at: 15.0, actor: "grandpa", anim: "sit", loop: true, icon: "zzz", bubbleDur: 1.8 }),

      // Player walks closer for a look as Granny claims the Golden Pizza trophy
      ...walkTo({ at: 16.8, to: "living_room_left", duration: 1.5, lookTarget: "granny" }),
      { at: 18.4, type: "char_arm", actor: "granny", gesture: "reach_out", duration: 1.6 },
      { at: 18.6, type: "prop_action", prop: "golden_pizza", action: "glide", from: "living_room_shelf_top", to: "granny", targetHeight: "nose", duration: 1.3, arc: 0.22 },
      { at: 19.9, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },
      { at: 20.1, type: "sfx", sound: "kaching", volume: 0.7 },

      // Victory wave before dashing for the front door!
      { at: 21.0, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.8 },
      { at: 21.2, type: "char_bubble", actor: "granny", icon: "laugh", duration: 1.6 },
      { at: 21.4, type: "sfx", sound: "granny_laugh", volume: 0.65 },
      { at: 23.0, type: "char_move", actor: "granny", to: "living_room_view", anim: "run", duration: 2.0 },
      { at: 24.4, type: "char_move", actor: "grandpa", to: "grandpa_step_back", anim: "walk", duration: 1.8 },
      { at: 25.4, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
      { at: 26.6, type: "sfx", sound: "whoosh", volume: 0.6 },
    ],
  };
}
goldenPizzaDanceoff.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 6 (~28s) — Front Foyer: "Double-Pizza Delivery Mayhem"
// ---------------------------------------------------------------------------
export function goldenPizzaDelivery() {
  return {
    name: "Ch 6: Double-Pizza Delivery Mayhem (Front Foyer)",
    duration: 28,
    room: "foyer",
    playerSpawn: "foyer_atrium",
    playerFacing: "front_door_pkg",
    cast: {
      granny: { spawn: "front_door_right", facing: "front_door_pkg" },
      grandpa: { spawn: "front_door_left", facing: "front_door_pkg" },
    },
    props: [
      goldenPizzaProp("front_door_right"),
      { id: "pizza_box", type: "delivery_box", spawn: "front_door_pkg", visible: true },
      { id: "box_blaster", type: "toy_blaster", spawn: "front_door_pkg", spawnOffset: { x: -0.25, z: 0 }, visible: false },
      { id: "box_soda", type: "soda_can", spawn: "front_door_pkg", spawnOffset: { x: 0.25, z: 0 }, visible: false },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.22] },
      ...lookAt({ at: 0.3, target: "pizza_box", duration: 0.25 }),
      { at: 0.6, type: "sfx", sound: "ding", volume: 0.75 },
      { at: 0.9, type: "prop_action", prop: "pizza_box", action: "bounce" },

      // Granny & Grandpa argue over what's inside the surprise delivery box!
      ...lookAt({ at: 1.6, target: "granny", duration: 0.25, track: true }),
      ...react({ at: 1.8, actor: "granny", anim: "talk", loop: true, icon: "question", bubbleDur: 1.6, sfx: "typing" }),
      { at: 2.0, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.2 },

      ...lookAt({ at: 3.4, target: "grandpa", duration: 0.25, track: true }),
      ...react({ at: 3.6, actor: "grandpa", anim: "angry", loop: true, icon: "angry", bubbleDur: 1.6, sfx: "discord" }),
      { at: 3.8, type: "char_gesture", actor: "grandpa", gesture: "shake_no", duration: 1.2 },

      // Player walks forward and pops open the box!
      ...walkTo({ at: 5.2, to: "front_door_view", duration: 1.6, lookTarget: "pizza_box" }),
      { at: 6.9, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
      { at: 7.0, type: "prop_action", prop: "box_blaster", action: "pop_out", to: "front_door_pkg" },
      { at: 7.2, type: "prop_action", prop: "box_soda", action: "pop_out", to: "front_door_right" },
      { at: 7.3, type: "sfx", sound: "explode_meme", volume: 0.7 },

      // Surprise! A toy blaster + fizzing soda explode out!
      ...lookAt({ at: 7.8, target: "grandpa", duration: 0.25, track: true }),
      { at: 7.9, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 8.0, actor: "grandpa", anim: "terrified", icon: "exclamation", bubbleDur: 1.5, sfx: "vine_boom" }),
      { at: 8.2, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },

      // Granny tries the toy blaster — spin chaos!
      ...lookAt({ at: 9.6, target: "granny", duration: 0.25, track: true }),
      { at: 9.8, type: "char_arm", actor: "granny", gesture: "point", duration: 1.8 },
      { at: 10.0, type: "prop_action", prop: "box_blaster", action: "pop_out", waypoint: "front_door_pkg", yOffset: 0.22 },
      { at: 10.2, type: "sfx", sound: "pop", volume: 0.7 },
      { at: 11.6, type: "prop_action", prop: "box_soda", action: "bounce" },
      { at: 11.8, type: "sfx", sound: "whoosh", volume: 0.65 },

      // Grandpa dives away from front_door_left straight to stairs_bottom!
      ...lookAt({ at: 12.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 12.8, type: "char_move", actor: "grandpa", to: "stairs_bottom", anim: "run2", duration: 2.0 },
      { at: 15.0, type: "char_anim", actor: "grandpa", anim: "jump", duration: 1.0, facePlayer: true },
      { at: 15.2, type: "sfx", sound: "bonk", volume: 0.8 },

      // Granny laughs so hard she nearly drops the Golden Pizza!
      ...lookAt({ at: 16.4, target: "granny", duration: 0.25, track: true }),
      { at: 16.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 16.6, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      { at: 18.6, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "granny", to: "front_door_pkg", duration: 1.2, arc: 0.35 },
      { at: 19.8, type: "prop_action", prop: "box_blaster", action: "stop" },
      { at: 20.0, type: "char_arm", actor: "granny", gesture: "reach_out", duration: 1.6 },
      { at: 20.2, type: "prop_action", prop: "golden_pizza", action: "glide", from: "front_door_pkg", to: "granny", targetHeight: "nose", duration: 1.0, arc: 0.18 },
      { at: 21.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },
      { at: 21.4, type: "sfx", sound: "tada", volume: 0.7 },

      // Player backs up so Granny can race cleanly past foyer_atrium toward the back hall!
      ...walkTo({ at: 22.0, to: "foyer_atrium", duration: 1.4, lookTarget: "granny" }),
      { at: 23.6, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.8 },
      { at: 23.6, type: "char_move", actor: "granny", to: "front_door_view", anim: "run", duration: 1.8 },
      { at: 24.4, type: "char_move", actor: "grandpa", to: "front_door_pkg", anim: "run2", duration: 2.0 },
      { at: 25.6, type: "player_gesture", gesture: "shake_no", duration: 1.1 },
      { at: 26.8, type: "sfx", sound: "swoosh", volume: 0.6 },
    ],
  };
}
goldenPizzaDelivery.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 7 (~28s) — Back Hall: "Back-Hall Pizza Trophy Shootout"
// ---------------------------------------------------------------------------
export function goldenPizzaShootout() {
  return {
    name: "Ch 7: Back-Hall Pizza Trophy Shootout (Back Hall)",
    duration: 28,
    room: "back_hall",
    playerSpawn: "back_room_east",
    playerFacing: "back_hall",
    cast: {
      granny: { spawn: "back_hall_left", facing: "doorway_dining" },
      grandpa: { spawn: "doorway_dining", facing: "back_hall_left" },
    },
    props: [
      goldenPizzaProp("back_hall_left"),
      { id: "hall_trophy", type: "custom", spawn: "back_bed_top", visible: true, parts: PIZZA_TROPHY_PARTS },
      { id: "shootout_ball", type: "emoji_ball", spawn: "back_hall", visible: true },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "run_amok", volume: 0.24 },
      { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.22] },
      ...lookAt({ at: 0.3, target: "shootout_ball", duration: 0.25 }),
      ...walkTo({ at: 1.0, to: "hallway", duration: 1.6, lookTarget: "granny" }),

      // Granny places the Golden Pizza beside the Back-Hall Trophy and lines up a penalty kick!
      { at: 2.7, type: "char_arm", actor: "granny", gesture: "place_down", duration: 1.5 },
      { at: 2.9, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "granny", to: "back_bed_top", yOffset: 0.02, duration: 1.1, arc: 0.2 },
      { at: 4.1, type: "sfx", sound: "checkmark", volume: 0.65 },
      { at: 4.3, type: "char_arm", actor: "granny", gesture: "point", duration: 1.5 },
      { at: 4.4, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.5 },

      // Grandpa steps into goalie stance!
      ...lookAt({ at: 5.7, target: "grandpa", duration: 0.25, track: true }),
      { at: 5.9, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 1.0 },
      {
        at: 6.4,
        type: "char_arm",
        actor: "grandpa",
        gesture: "custom",
        duration: 2.0,
        rUpper: [-0.9, 0.4, 0.8],
        lUpper: [-0.9, -0.4, -0.8],
        oscillate: [0.18, 0, 0.2],
        cycles: 3,
      },

      // SHOT 1: Granny blasts the ball — Grandpa blocks it with his forehead!
      ...lookAt({ at: 8.2, target: "granny", duration: 0.25, track: true }),
      { at: 8.5, type: "char_anim", actor: "granny", anim: "kick", duration: 1.1, facePlayer: true },
      { at: 8.7, type: "sfx", sound: "swoosh", volume: 0.75 },
      { at: 8.8, type: "prop_action", prop: "shootout_ball", action: "glide", from: "back_hall", to: "doorway_dining", duration: 0.9, arc: 0.3 },
      ...lookAt({ at: 9.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 9.65, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 9.7, type: "char_anim", actor: "grandpa", anim: "trip", duration: 1.0, facePlayer: true },
      { at: 9.8, type: "sfx", sound: "bonk", volume: 0.85 },
      { at: 11.0, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
      { at: 11.05, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.0 },
      { at: 11.1, type: "sfx", sound: "vine_boom", volume: 0.75 },

      // Player cheers & nods; Trophy bounces!
      { at: 12.2, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
      { at: 12.4, type: "prop_action", prop: "hall_trophy", action: "bounce" },
      { at: 12.6, type: "sfx", sound: "kaching", volume: 0.65 },

      // SHOT 2: Grandpa kicks back wildly — sends the ball flying past Granny!
      { at: 13.6, type: "char_anim", actor: "grandpa", anim: "mma_kick", duration: 1.3, facePlayer: true },
      { at: 13.9, type: "sfx", sound: "whoosh", volume: 0.75 },
      { at: 14.0, type: "prop_action", prop: "shootout_ball", action: "glide", from: "doorway_dining", to: "back_hall", duration: 1.0, arc: 0.45 },
      ...lookAt({ at: 15.0, target: "granny", duration: 0.25, track: true }),
      { at: 15.05, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 15.1, actor: "granny", anim: "terrified", icon: "exclamation", bubbleDur: 1.5, sfx: "explode_meme" }),
      { at: 16.4, type: "char_anim", actor: "granny", anim: "jump", duration: 1.0, facePlayer: true },

      // Grandpa celebrates prematurely — Granny scoops the Golden Pizza off the bed!
      ...lookAt({ at: 17.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 17.7, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 17.8, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      ...lookAt({ at: 19.8, target: "granny", duration: 0.25, track: true }),
      { at: 20.0, type: "char_arm", actor: "granny", gesture: "reach_out", duration: 1.6 },
      { at: 20.2, type: "prop_action", prop: "golden_pizza", action: "glide", from: "back_bed_top", to: "granny", targetHeight: "nose", duration: 1.1, arc: 0.2 },
      { at: 21.3, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },
      { at: 21.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 21.6, type: "sfx", sound: "granny_laugh", volume: 0.7 },
      { at: 21.8, type: "char_anim", actor: "granny", anim: "laugh", duration: 1.3, facePlayer: true },

      // Sprint east back toward the Living Room!
      { at: 23.4, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.8 },
      { at: 23.4, type: "char_move", actor: "granny", to: "back_room_east", via: ["back_hall"], anim: "run", duration: 2.8 },
      { at: 24.4, type: "char_move", actor: "grandpa", to: "back_hall_left", anim: "run2", duration: 2.2 },
      { at: 26.4, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
      { at: 26.5, type: "sfx", sound: "pop", volume: 0.6 },
    ],
  };
}
goldenPizzaShootout.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 8 (~27s) — Living Room East: "The Chest-Lockout & Key Scramble"
// ---------------------------------------------------------------------------
export function goldenPizzaChest() {
  return {
    name: "Ch 8: Chest-Lockout & Key Scramble (Living Room East)",
    duration: 27,
    room: "living_room",
    playerSpawn: "living_room_entry",
    playerFacing: "chest_spot",
    cast: {
      granny: { spawn: "living_room", facing: "chest_spot" },
      grandpa: { spawn: "grandpa_chest_side", facing: "chest_spot" },
    },
    props: [
      goldenPizzaProp("living_room_sofa"),
      { id: "pizza_chest", type: "treasure_chest", spawn: "chest_spot", visible: false },
      { id: "chest_lock", type: "padlock", spawn: "chest_padlock", visible: false },
      { id: "chest_key", type: "golden_key", spawn: "living_room_sofa", spawnOffset: { x: 0, z: 0.55 }, visible: false },
      { id: "trap_button", type: "red_button", spawn: "living_room_right", visible: false },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
      // Granny reveals her Mystery Treasure Chest & Padlock fortress for the pizza!
      { at: 0.2, type: "char_arm", actor: "granny", gesture: "place_down", duration: 1.3 },
      { at: 0.3, type: "prop_action", prop: "pizza_chest", action: "pop_out", to: "chest_spot" },
      { at: 0.4, type: "prop_action", prop: "chest_lock", action: "pop_out", to: "chest_padlock" },
      { at: 0.5, type: "prop_action", prop: "trap_button", action: "pop_out", to: "living_room_right" },
      ...lookAt({ at: 0.6, target: "pizza_chest", duration: 0.26 }),
      { at: 0.7, type: "sfx", sound: "kaching", volume: 0.7 },

      // Granny waves the Golden Key tauntingly
      ...lookAt({ at: 1.8, target: "granny", duration: 0.25, track: true }),
      { at: 1.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 2.0, type: "prop_action", prop: "chest_key", action: "attach", actor: "granny", offset: [0, 0.02, 0.2] },
      { at: 2.2, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.8 },
      ...react({ at: 2.3, actor: "granny", anim: "laugh", loop: true, icon: "laugh", bubbleDur: 1.8, sfx: "granny_laugh" }),

      // Grandpa sneaks to the edge & inspects the mysterious Red Prank Button...
      ...lookAt({ at: 4.4, target: "grandpa", duration: 0.25, track: true }),
      { at: 4.6, type: "char_move", actor: "grandpa", to: "grandpa_step_back", anim: "sneak", duration: 1.8 },
      { at: 4.8, type: "sfx", sound: "squidward_walk", volume: 0.55 },
      { at: 6.5, type: "char_gesture", actor: "grandpa", gesture: "tilt", duration: 1.0 },
      { at: 7.4, type: "char_bubble", actor: "grandpa", icon: "question", duration: 1.4 },

      // Grandpa slams the Red Button — BOOM! Padlock pops & key launches!
      { at: 8.6, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.4 },
      { at: 8.9, type: "prop_action", prop: "trap_button", action: "bounce" },
      { at: 9.0, type: "sfx", sound: "pop", volume: 0.8 },
      { at: 9.3, type: "prop_action", prop: "chest_lock", action: "glide", from: "chest_padlock", to: "living_room_ball_bounce", duration: 0.9, arc: 0.45 },
      { at: 9.5, type: "sfx", sound: "explode_meme", volume: 0.75 },

      // Granny panics & drops the key!
      ...lookAt({ at: 10.2, target: "granny", duration: 0.25, track: true }),
      { at: 10.3, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 10.4, actor: "granny", anim: "terrified", icon: "exclamation", bubbleDur: 1.6, sfx: "vine_boom" }),
      { at: 10.8, type: "prop_action", prop: "chest_key", action: "glide", fromActor: "granny", to: "chest_spot", duration: 1.0, arc: 0.3 },
      { at: 11.8, type: "prop_action", prop: "chest_key", action: "pop_out", waypoint: "chest_spot", yOffset: 0.36 },

      // Grandpa celebrates and grabs the Golden Pizza!
      ...lookAt({ at: 12.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 12.7, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 12.8, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      { at: 14.6, type: "char_move", actor: "grandpa", to: "grandpa_chest_side", anim: "run", duration: 1.4 },
      { at: 16.0, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.6 },
      { at: 16.2, type: "prop_action", prop: "golden_pizza", action: "glide", from: "living_room_sofa", to: "grandpa", targetHeight: "nose", duration: 1.1, arc: 0.25 },
      { at: 17.3, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.05, 0.22] },
      { at: 17.4, type: "char_bubble", actor: "grandpa", icon: "heart", duration: 1.3 },
      { at: 17.5, type: "sfx", sound: "rizz", volume: 0.65 },

      // Player walks left; Granny clears cleanly north to living_room_view, Grandpa dashes to grandpa_step_back!
      ...walkTo({ at: 18.4, to: "living_room_left", duration: 1.5, lookTarget: "grandpa" }),
      { at: 19.6, type: "char_move", actor: "granny", to: "living_room_view", anim: "walk", duration: 1.6 },
      { at: 21.4, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 4.5 },
      { at: 21.4, type: "char_move", actor: "grandpa", to: "grandpa_step_back", anim: "run2", duration: 1.8 },
      ...lookAt({ at: 22.8, target: "granny", duration: 0.25, track: true }),
      { at: 22.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 23.0, actor: "granny", anim: "angry", loop: true, icon: "angry", bubbleDur: 1.8, sfx: "granny_i_see_you" }),
      { at: 24.6, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.1 },
      { at: 25.8, type: "sfx", sound: "whoosh", volume: 0.6 },
    ],
  };
}
goldenPizzaChest.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 9 (~26s) — Foyer & Staircase: "THE FLOOR IS PIZZA SAUCE!"
// ---------------------------------------------------------------------------
export function goldenPizzaLava() {
  return {
    name: "Ch 9: The Floor Is Pizza Sauce! (Foyer & Stairs)",
    duration: 26,
    room: "foyer",
    playerSpawn: "foyer_atrium",
    playerFacing: "front_door_pkg",
    cast: {
      grandpa: { spawn: "front_door_right", facing: "foyer_atrium" },
      granny: { spawn: "front_door_left", facing: "front_door_right" },
    },
    props: [
      goldenPizzaProp("front_door_right"),
      { id: "sauce_lava", type: "rising_lava", spawn: "lava_origin", visible: false },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "granny_chase", volume: 0.26 },
      { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.05, 0.22] },
      ...lookAt({ at: 0.3, target: "grandpa", duration: 0.25, track: true }),

      // Grandpa tries juggling the hot pizza — WHOOPS! Spicy sauce spills everywhere!
      { at: 0.6, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 0.7, type: "char_anim", actor: "grandpa", anim: "trip", duration: 1.2, facePlayer: true },
      { at: 0.8, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 1.1 },
      { at: 0.9, type: "sfx", sound: "bonk", volume: 0.75 },
      { at: 1.6, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "foyer", yOffset: 0.95, duration: 1.2, arc: 0.5 },
      { at: 2.2, type: "prop_action", prop: "sauce_lava", action: "rise_to", targetY: 0.16, duration: 6.5 },
      { at: 2.3, type: "sfx", sound: "explode_meme", volume: 0.75 },
      { at: 2.8, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "foyer", yOffset: 0.95, visible: true, spin: true, float: true },

      // FLOOR IS PIZZA SAUCE!! Both Granny & Grandpa panic!
      ...lookAt({ at: 3.2, target: "granny", duration: 0.25, track: true }),
      { at: 3.3, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      ...react({ at: 3.4, actor: "granny", anim: "panic", loop: true, icon: "exclamation", bubbleDur: 1.8, sfx: "vine_boom" }),
      { at: 3.6, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.9 },

      ...lookAt({ at: 5.2, target: "grandpa", duration: 0.25, track: true }),
      ...react({ at: 5.4, actor: "grandpa", anim: "terrified", icon: "exclamation", bubbleDur: 1.8, sfx: "aww" }),
      { at: 5.8, type: "char_anim", actor: "grandpa", anim: "jump", duration: 1.0, facePlayer: true },

      // Player backs up toward front_door_view while the Golden Pizza hovers safely!
      ...walkTo({ at: 7.0, to: "front_door_view", duration: 1.6, lookTarget: "golden_pizza" }),
      { at: 8.8, type: "player_gesture", gesture: "shake_no", duration: 1.0 },
      { at: 9.0, type: "sfx", sound: "whoosh", volume: 0.65 },

      // Granny dashes for the staircase to escape the bubbling sauce!
      ...lookAt({ at: 10.0, target: "granny", duration: 0.25, track: true }),
      { at: 10.2, type: "char_move", actor: "granny", to: "stairs_middle", via: ["stairs_bottom"], anim: "run", duration: 3.0 },
      { at: 11.4, type: "char_move", actor: "grandpa", to: "front_door_right", anim: "run2", duration: 1.8 },
      { at: 13.4, type: "char_anim", actor: "grandpa", anim: "jump", duration: 1.0, facePlayer: true },
      { at: 13.6, type: "sfx", sound: "pop", volume: 0.65 },

      // Sauce recedes; the levitating Golden Pizza floats gracefully to front_door_left
      { at: 14.8, type: "prop_action", prop: "sauce_lava", action: "hide" },
      { at: 15.0, type: "prop_action", prop: "golden_pizza", action: "glide", from: "foyer", to: "front_door_left", yOffset: 0.6, duration: 1.5, arc: 0.25 },
      ...lookAt({ at: 15.4, target: "golden_pizza", duration: 0.25 }),
      { at: 16.6, type: "sfx", sound: "ding", volume: 0.7 },

      // Granny descends and reaches a truce with Grandpa — time to finally eat!
      { at: 17.2, type: "char_move", actor: "granny", to: "front_door_left", via: ["stairs_bottom"], anim: "walk", duration: 3.0 },
      ...lookAt({ at: 17.6, target: "granny", duration: 0.25, track: true }),
      { at: 20.3, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 20.4, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.8 },
      { at: 20.4, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "front_door_left", yOffset: 0, visible: true, spin: false, float: false },
      { at: 20.5, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.24] },
      ...react({ at: 20.7, actor: "granny", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "granny_laugh" }),

      ...lookAt({ at: 22.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 22.7, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 22.8, type: "char_gesture", actor: "grandpa", gesture: "nod", duration: 1.1 },
      ...react({ at: 23.0, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      { at: 24.4, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },
    ],
  };
}
goldenPizzaLava.isLocationLocked = true;

// ---------------------------------------------------------------------------
// Chapter 10 (~28s) — Dining Room Finale: "One Big Slice of Peace (Until Dessert!)"
// ---------------------------------------------------------------------------
export function goldenPizzaFinale() {
  return {
    name: "Ch 10: One Big Slice of Peace (Dining Room Finale)",
    duration: 28,
    room: "dining",
    playerSpawn: "dining_center",
    playerFacing: "dining_table_top",
    cast: {
      granny: { spawn: "dining_table_front", facing: "dining_table_top" },
      grandpa: { spawn: "dining_argue_east", facing: "dining_table_top" },
    },
    props: [
      goldenPizzaProp("dining_table_top"),
      { id: "finale_mug", type: "coffee_mug", spawn: "dining_table_top_west", spawnOffset: { x: 0.3, z: -0.2 }, visible: false, steam: true },
      { id: "finale_spatula", type: "custom", spawn: "kitchen_table_top", spawnOffset: { x: 0.45, z: -0.35 }, visible: false, parts: MEGA_SPATULA_PARTS },
    ],
    beats: [
      { at: 0.0, type: "bgm", sound: "granny_good_part", volume: 0.24 },
      { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.05, 0.22] },
      ...lookAt({ at: 0.3, target: "granny", duration: 0.25, track: true }),

      // Granny proudly places the steaming Golden Pizza & warm cocoa on the dining table
      { at: 0.7, type: "char_arm", actor: "granny", gesture: "place_down", duration: 1.6 },
      { at: 1.0, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "granny", to: "dining_table_top", duration: 1.2, arc: 0.14 },
      { at: 2.2, type: "prop_action", prop: "finale_mug", action: "place", waypoint: "dining_table_top_west" },
      { at: 2.3, type: "sfx", sound: "checkmark", volume: 0.7 },

      // Both lean in, sniff the melted cheese, and toast!
      ...lookAt({ at: 2.8, target: "grandpa", duration: 0.25, track: true }),
      { at: 3.0, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.7 },
      { at: 3.2, type: "char_bubble", actor: "grandpa", icon: "food", duration: 1.6 },
      { at: 3.4, type: "sfx", sound: "rizz", volume: 0.6 },

      // Player walks left to kitchen_lane to join the feast!
      ...walkTo({ at: 5.0, to: "kitchen_lane", duration: 1.6, lookTarget: "golden_pizza" }),
      { at: 6.7, type: "player_gesture", gesture: "nod_yes", duration: 1.0 },

      // Granny serves celebratory pizza snacks to everyone!
      ...lookAt({ at: 7.8, target: "granny", duration: 0.25, track: true }),
      { at: 7.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 8.0, type: "char_arm", actor: "granny", gesture: "offer", duration: 2.0 },
      { at: 8.4, type: "char_prop", actor: "granny", prop: "cookie" },
      { at: 8.6, type: "char_prop", actor: "grandpa", prop: "cookie" },
      { at: 9.0, type: "char_prop_action", actor: "granny", action: "bite", sfx: "eat" },
      ...react({ at: 9.2, actor: "granny", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8 }),
      ...lookAt({ at: 10.2, target: "grandpa", duration: 0.25, track: true }),
      { at: 10.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      { at: 10.4, type: "char_prop_action", actor: "grandpa", action: "bite", sfx: "eat" },
      ...react({ at: 10.6, actor: "grandpa", anim: "laugh", loop: true, icon: "heart", bubbleDur: 1.8, sfx: "tada" }),
      { at: 12.2, type: "char_prop", actor: "granny", prop: null },
      { at: 12.3, type: "char_prop", actor: "grandpa", prop: null },

      // Family truce! Granny waves warmly, Grandpa nods happily
      ...lookAt({ at: 12.8, target: "granny", duration: 0.25, track: true }),
      { at: 13.0, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.8 },
      { at: 13.2, type: "char_bubble", actor: "granny", icon: "heart", duration: 1.6 },
      { at: 13.4, type: "sfx", sound: "granny_laugh", volume: 0.65 },
      { at: 14.8, type: "char_gesture", actor: "grandpa", gesture: "nod", duration: 1.2 },
      { at: 15.0, type: "sfx", sound: "aww", volume: 0.55 },

      // ONE FINAL TWIST: Grandpa tries sneaking the VERY LAST slice!!
      ...lookAt({ at: 16.4, target: "grandpa", duration: 0.25, track: true }),
      { at: 16.6, type: "char_bubble", actor: "grandpa", icon: "question", duration: 1.4 },
      { at: 16.8, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.8 },
      { at: 17.0, type: "sfx", sound: "squidward_walk", volume: 0.6 },
      { at: 17.5, type: "prop_action", prop: "golden_pizza", action: "glide", from: "dining_table_top", to: "grandpa", targetHeight: "nose", duration: 1.1, arc: 0.14 },

      // Caught red-handed! Granny raises her giant spatula — hilarious comedy freeze!
      ...lookAt({ at: 18.8, target: "granny", duration: 0.25, track: true }),
      { at: 19.0, type: "char_face", actor: "granny", followPlayer: true, instant: true },
      { at: 19.1, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.9 },
      { at: 19.2, type: "sfx", sound: "vine_boom", volume: 0.8 },
      { at: 20.1, type: "prop_action", prop: "finale_spatula", action: "attach", actor: "granny", offset: [0, 0.04, 0.22] },
      ...react({ at: 20.3, actor: "granny", anim: "punch", icon: "angry", bubbleDur: 1.8, sfx: "bonk" }),
      { at: 21.4, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "dining_table_top", duration: 1.0, arc: 0.35 },

      // Both burst out laughing together as the Golden Pizza lands dead-center on the table!
      ...lookAt({ at: 22.6, target: "grandpa", duration: 0.25, track: true }),
      { at: 22.7, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
      ...react({ at: 22.8, actor: "grandpa", anim: "jump", icon: "laugh", bubbleDur: 2.0, sfx: "granny_laugh" }),
      { at: 24.4, type: "char_arm", actor: "granny", gesture: "wave", duration: 2.0 },
      { at: 24.6, type: "char_anim", actor: "granny", anim: "laugh", duration: 2.0, facePlayer: true },
      { at: 25.0, type: "player_gesture", gesture: "shake_no", duration: 1.4 },
      { at: 25.4, type: "sfx", sound: "tada", volume: 0.75 },
      { at: 26.8, type: "fade", to: 1, duration: 0.9 },
    ],
  };
}
goldenPizzaFinale.isLocationLocked = true;
