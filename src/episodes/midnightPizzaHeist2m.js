/**
 * Granny's Midnight Pizza Heist (2m POV — 7 scenes, ~120s)
 *
 * FunnyHorrorAnimation style:
 * - ZERO thought bubbles (`char_bubble`). Every interaction uses physical body language:
 *   looking at each other (`char_face`), waving/pointing/offering/sniffing (`char_arm`),
 *   nodding/shaking/tilting/double-takes (`char_gesture`), and physical props (`attach`/`glide`).
 * - Crystal-clear single-object story spine (`goalProp: "golden_pizza"`) across both floors
 *   of Granny's House (Foyer -> Kitchen -> Living Room -> Chest -> 2nd-Floor Stairs & Bedroom
 *   -> Back Hall -> Dining Room Finale).
 */
import { buildEpisode } from "../episodeBuilder.js";
import { dialogueExchange, greetAndNod } from "../gags/helpers.js";

const PIZZA_PARTS = [
  { shape: "cylinder", size: [0.26, 0.27, 0.036], pos: [0, 0.018, 0], color: 0xd97706, roughness: 0.78 },
  { shape: "torus", size: [0.24, 0.028], pos: [0, 0.024, 0], rot: [Math.PI / 2, 0, 0], color: 0xeab308, roughness: 0.72 },
  { shape: "cylinder", size: [0.225, 0.225, 0.01], pos: [0, 0.026, 0], color: 0xdc2626, roughness: 0.45 },
  { shape: "cylinder", size: [0.215, 0.215, 0.012], pos: [0, 0.031, 0], color: 0xfef08a, roughness: 0.35 },
  { shape: "cylinder", size: [0.038, 0.038, 0.01], pos: [0, 0.038, 0], color: 0x991b1b, roughness: 0.5 },
  { shape: "cylinder", size: [0.036, 0.036, 0.01], pos: [0.11, 0.038, 0.06], color: 0x991b1b, roughness: 0.5 },
  { shape: "cylinder", size: [0.036, 0.036, 0.01], pos: [-0.11, 0.038, 0.07], color: 0x991b1b, roughness: 0.5 },
  { shape: "cylinder", size: [0.036, 0.036, 0.01], pos: [0.09, 0.038, -0.1], color: 0x991b1b, roughness: 0.5 },
  { shape: "cylinder", size: [0.036, 0.036, 0.01], pos: [-0.09, 0.038, -0.1], color: 0x991b1b, roughness: 0.5 },
  { shape: "cylinder", size: [0.034, 0.034, 0.01], pos: [0.0, 0.038, 0.13], color: 0x991b1b, roughness: 0.5 },
];

const PIZZA_PROP = (spawn, opts = {}) => ({
  id: "golden_pizza",
  type: "custom",
  spawn,
  steam: true,
  parts: PIZZA_PARTS,
  ...opts,
});

// ---------------------------------------------------------------------------
// Scene 1 (16.5s) — Front Foyer: The Midnight Pizza Delivery
// ---------------------------------------------------------------------------
const scene1Delivery = {
  id: "delivery",
  title: "The Midnight Pizza Delivery",
  room: "foyer",
  duration: 16.5,
  playerSpawn: "front_door_view",
  playerFacing: "front_door_pkg",
  cast: {
    granny: { spawn: "front_door_right", facing: "front_door_pkg", prop: "none" },
    grandpa: { spawn: "foyer", facing: "front_door_view", prop: "cane" },
  },
  props: [
    { id: "pizza_box", type: "delivery_box", spawn: "front_door_pkg", visible: true },
    PIZZA_PROP("front_door_pkg", { visible: false, seat: false }),
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
    { at: 0.0, type: "fade", to: 0, duration: 0.45 },
    { at: 0.1, type: "player_look", target: "granny", duration: 0.24 },

    // Granny greets POV cheerfully with a wave + nod, then opens the delivery box
    { at: 0.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 0.6, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.4 },
    { at: 0.7, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 0.9 },
    { at: 0.8, type: "sfx", sound: "ding", volume: 0.6 },
    { at: 1.7, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 2.3, type: "player_look", target: "pizza_box", duration: 0.25 },

    // Open box and lift out the steaming golden pizza
    { at: 2.5, type: "char_face", actor: "granny", target: "pizza_box", duration: 0.2 },
    { at: 2.7, type: "prop_action", prop: "pizza_box", action: "open" },
    { at: 2.8, type: "char_arm", actor: "granny", gesture: "offer", duration: 2.2, facePlayer: false },
    { at: 2.9, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.28] },
    { at: 3.0, type: "sfx", sound: "tada", volume: 0.7 },

    // Granny sniffs and laughs happily to the lens
    { at: 4.5, type: "player_look", target: "granny", duration: 0.24 },
    { at: 4.8, type: "char_arm", actor: "granny", gesture: "sniff", duration: 1.5, facePlayer: false },
    { at: 5.2, type: "char_face", actor: "granny", followPlayer: true, instant: false },
    { at: 5.5, type: "char_anim", actor: "granny", anim: "laugh", loop: true, duration: 1.4 },
    { at: 5.6, type: "sfx", sound: "granny_laugh", volume: 0.65 },

    // Grandpa sneaks in from the foyer and smells the pizza
    { at: 6.8, type: "char_move", actor: "grandpa", to: "foyer_atrium", anim: "sneak", duration: 2.2 },
    { at: 7.0, type: "player_look", target: "grandpa", duration: 0.26, track: true },
    { at: 9.1, type: "char_face", actor: "grandpa", target: "granny", duration: 0.2 },
    { at: 9.2, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.3, facePlayer: false },
    { at: 9.4, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.8 },
    { at: 9.45, type: "char_anim", actor: "grandpa", anim: "jump", loop: false, duration: 0.9, facePlayer: false },
    { at: 9.5, type: "sfx", sound: "vine_boom", volume: 0.7 },

    // Grandpa points eagerly at the pizza; Granny shakes NO and bolts!
    { at: 10.6, type: "char_arm", actor: "grandpa", gesture: "point", duration: 1.3, facePlayer: false },
    { at: 10.7, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 0.8 },
    { at: 11.1, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 11.4, type: "char_face", actor: "granny", target: "grandpa", duration: 0.15 },
    { at: 11.6, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 0.9 },
    { at: 11.8, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.0, facePlayer: false },
    { at: 12.1, type: "char_move", actor: "granny", to: "dining_corner", via: ["front_door_pkg", "stairs_bottom"], anim: "run2", duration: 2.8 },
    { at: 12.2, type: "sfx", sound: "whoosh", volume: 0.55 },

    // Grandpa runs after her while POV nods along
    { at: 13.0, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 13.2, type: "char_move", actor: "grandpa", to: "stairs_bottom", via: ["foyer_atrium"], anim: "run", duration: 2.5 },
    { at: 14.0, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 15.2, type: "char_gesture", actor: "grandpa", gesture: "shake_no", duration: 0.9 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 2 (17.0s) — Kitchen: Counter Guard & Sneaky Reach
// ---------------------------------------------------------------------------
const scene2Kitchen = {
  id: "kitchen_guard",
  title: "Kitchen Guard & Sneaky Reach",
  room: "kitchen",
  duration: 17.0,
  playerSpawn: "dining_lane",
  playerFacing: "kitchen",
  cast: {
    granny: { spawn: "kitchen", facing: "kitchen_counter_top", prop: "none" },
    grandpa: { spawn: "dining_table_front", facing: "kitchen", prop: "cane" },
  },
  props: [
    PIZZA_PROP("kitchen_table_top", { visible: true }),
    { id: "skillet", type: "frying_pan", spawn: "kitchen_counter_top", visible: true, steam: true },
    { id: "mug", type: "coffee_mug", spawn: "dining_table_top", visible: true, steam: true },
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.22 },
    { at: 0.2, type: "player_look", target: "granny", duration: 0.24 },

    // Granny stirs the sizzling frying pan beside her steaming pizza
    { at: 0.5, type: "char_arm", actor: "granny", gesture: "stir", duration: 2.4, facePlayer: false },
    { at: 0.6, type: "sfx", sound: "pop", volume: 0.5 },
    { at: 1.9, type: "char_gesture", actor: "granny", gesture: "nod_once", duration: 0.9 },

    // Grandpa sneaks across the kitchen lane toward the pizza
    { at: 2.6, type: "player_look", target: "grandpa", duration: 0.25, track: true },
    { at: 2.8, type: "char_move", actor: "grandpa", to: "kitchen_lane", via: ["dining_center"], anim: "sneak", duration: 2.4 },
    { at: 5.3, type: "char_face", actor: "grandpa", target: "golden_pizza", duration: 0.2 },
    { at: 5.5, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.4, facePlayer: false },
    { at: 6.8, type: "char_arm", actor: "grandpa", gesture: "reach_out", duration: 1.5, facePlayer: false },
    { at: 7.0, type: "sfx", sound: "click", volume: 0.5 },

    // Granny spots him sneaking and catches him red-handed!
    { at: 7.6, type: "player_look", target: "granny", duration: 0.24 },
    { at: 7.8, type: "char_face", actor: "granny", target: "grandpa", duration: 0.15 },
    { at: 8.0, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 8.1, type: "char_anim", actor: "granny", anim: "angry", loop: true, duration: 1.4 },
    { at: 8.2, type: "sfx", sound: "granny_i_see_you", volume: 0.78, cutBgm: true, cutBgmDuration: 1.0 },
    { at: 8.4, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.0 },

    // Grandpa recoils, double-takes, and backs up to dining_table_front
    { at: 9.2, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 9.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
    { at: 9.5, type: "char_anim", actor: "grandpa", anim: "terrified", loop: false, duration: 1.2 },
    { at: 9.6, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.8 },
    { at: 9.7, type: "sfx", sound: "vine_boom", volume: 0.75 },
    { at: 10.8, type: "char_move", actor: "grandpa", to: "dining_table_front", via: ["dining_center"], anim: "walk", duration: 1.8 },

    // Granny grabs her pizza and dashes out through the dining doorway
    { at: 11.4, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 11.6, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.4, facePlayer: false },
    { at: 11.7, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.26] },
    { at: 12.0, type: "char_move", actor: "granny", to: "doorway_dining", via: ["kitchen_lane", "dining_center"], anim: "run2", duration: 2.8 },
    { at: 12.1, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.22 },
    { at: 13.4, type: "char_move", actor: "grandpa", to: "dining_center", anim: "run", duration: 2.2 },
    { at: 15.6, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 3 (17.0s) — Living Room: Sofa Trade & Bouncing Ball Trap
// ---------------------------------------------------------------------------
const scene3LivingRoom = {
  id: "couch_trade",
  title: "Sofa Trade & Bouncing Ball",
  room: "living_room",
  duration: 17.0,
  playerSpawn: "living_room_view",
  playerFacing: "living_room_sofa",
  cast: {
    grandpa: { spawn: "living_room_sofa", facing: "living_room_left", anim: "sit", prop: "none" },
    granny: { spawn: "living_room_left", facing: "living_room_sofa", prop: "none" },
  },
  props: [
    PIZZA_PROP("living_room_left", { visible: false, seat: false }),
    { id: "trade_ball", type: "emoji_ball", spawn: "living_room_ball_bounce", visible: true },
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.23 },
    { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.26] },
    { at: 0.3, type: "player_look", target: "grandpa", duration: 0.25 },

    // Grandpa sits on sofa waving politely & pointing to his emoji_ball as a trade
    { at: 0.4, type: "char_anim", actor: "grandpa", anim: "sit", loop: true, duration: 1.5, facePlayer: false },
    { at: 0.6, type: "char_face", actor: "grandpa", target: "granny", duration: 0.2 },
    { at: 0.8, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.5, facePlayer: false },
    { at: 1.0, type: "sfx", sound: "ding", volume: 0.55 },
    { at: 2.4, type: "char_face", actor: "grandpa", target: "trade_ball", duration: 0.2 },
    { at: 2.6, type: "char_arm", actor: "grandpa", gesture: "point", duration: 1.4, facePlayer: false },
    { at: 2.7, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 0.9 },

    // Granny tilts head, examines the ball, then firmly shakes NO
    { at: 3.4, type: "player_look", target: "granny", duration: 0.25 },
    { at: 3.8, type: "char_face", actor: "granny", target: "trade_ball", duration: 0.2 },
    { at: 4.0, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.1 },
    { at: 5.2, type: "char_face", actor: "granny", target: "grandpa", duration: 0.2 },
    { at: 5.4, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.1 },
    { at: 5.5, type: "char_arm", actor: "granny", gesture: "point", duration: 1.1, facePlayer: false },
    { at: 5.6, type: "sfx", sound: "discord", volume: 0.55 },

    // Grandpa walks to the ball and boots it toward Granny!
    { at: 6.7, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 6.9, type: "char_move", actor: "grandpa", to: "living_room_ball_bounce", via: ["living_room_right", "living_room"], anim: "walk", duration: 2.0 },
    { at: 9.0, type: "char_face", actor: "grandpa", target: "granny", duration: 0.15 },
    { at: 9.2, type: "char_anim", actor: "grandpa", anim: "kick", loop: false, duration: 1.0, facePlayer: false },
    { at: 9.5, type: "prop_action", prop: "trade_ball", action: "pop_out", waypoint: "living_room_ball_bounce", to: "living_room_left", travelDuration: 1.0, yOffset: 0.2 },
    { at: 9.6, type: "sfx", sound: "whoosh", volume: 0.55 },

    // BONK! Granny gets startled, jumps, and the pizza glides onto the east shelf!
    { at: 10.2, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 10.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 10.55, type: "char_anim", actor: "granny", anim: "jump", loop: false, duration: 1.0 },
    { at: 10.6, type: "sfx", sound: "bonk", volume: 0.8 },
    { at: 10.7, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "granny", to: "living_room_shelf_top", duration: 1.1, arc: 0.35 },
    { at: 11.7, type: "prop_action", prop: "trade_ball", action: "stop" },

    // Granny grabs her pizza and dashes into the east hall, while Grandpa moves to living_room_entry
    { at: 12.4, type: "char_move", actor: "granny", to: "back_room_east_right", via: ["living_room_entry", "doorway_living", "back_room_east"], anim: "run2", duration: 2.8 },
    { at: 13.0, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 13.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
    { at: 13.5, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true, duration: 1.3 },
    { at: 13.6, type: "sfx", sound: "tada", volume: 0.55 },
    { at: 15.0, type: "char_move", actor: "grandpa", to: "living_room_left", via: ["living_room", "living_room_view"], anim: "run", duration: 1.6 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 4 (17.0s) — Mystery Chest Corner: The Locked Chest Decoy
// ---------------------------------------------------------------------------
const scene4Chest = {
  id: "chest_decoy",
  title: "The Locked Chest Decoy",
  room: "living_room",
  duration: 17.0,
  playerSpawn: "living_room",
  playerFacing: "chest_spot",
  cast: {
    granny: { spawn: "grandpa_chest_side", facing: "chest_spot", prop: "none" },
    grandpa: { spawn: "living_room_sofa", facing: "chest_spot", prop: "cane" },
  },
  props: [
    { id: "mystery_chest", type: "treasure_chest", spawn: "chest_spot", rotationY: -2.45, visible: true },
    { id: "chest_lock", type: "padlock", spawn: "chest_padlock", visible: false },
    PIZZA_PROP("grandpa_chest_side", { visible: false, seat: false }),
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
    { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.26] },
    { at: 0.3, type: "player_look", target: "granny", duration: 0.24 },

    // Granny opens the treasure chest as a decoy, slams it shut with a padlock!
    { at: 0.6, type: "prop_action", prop: "mystery_chest", action: "open" },
    { at: 0.7, type: "char_arm", actor: "granny", gesture: "offer", duration: 1.4, facePlayer: false },
    { at: 2.2, type: "prop_action", prop: "mystery_chest", action: "close" },
    { at: 2.3, type: "char_arm", actor: "granny", gesture: "place_down", duration: 1.0, facePlayer: false },
    { at: 2.4, type: "prop_action", prop: "chest_lock", action: "glide", fromActor: "granny", to: "chest_padlock", duration: 0.6, arc: 0.12 },
    { at: 2.6, type: "sfx", sound: "click", volume: 0.65 },

    // Granny smugly waves goodbye with the REAL pizza still tucked in her hand and flees!
    { at: 3.6, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 3.7, type: "char_anim", actor: "granny", anim: "laugh", loop: true, duration: 1.3 },
    { at: 3.8, type: "char_arm", actor: "granny", gesture: "wave", duration: 1.2, facePlayer: false },
    { at: 3.9, type: "sfx", sound: "granny_laugh", volume: 0.68 },
    { at: 5.1, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.0, facePlayer: false },
    { at: 5.2, type: "char_move", actor: "granny", to: "back_hall", via: ["living_room_view", "living_room_entry", "doorway_living", "back_room_east"], anim: "run2", duration: 2.9 },

    // Grandpa walks from the sofa to the chest, punches the lock off, opens it... EMPTY!
    { at: 5.9, type: "player_look", target: "grandpa", duration: 0.25, track: true },
    { at: 6.2, type: "char_move", actor: "grandpa", to: "grandpa_chest_side", via: ["living_room_right", "living_room_view", "living_room"], anim: "walk", duration: 2.5 },
    { at: 8.8, type: "player_look", target: "mystery_chest", duration: 0.24 },
    { at: 9.0, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
    { at: 9.1, type: "char_anim", actor: "grandpa", anim: "punch", loop: false, duration: 0.9 },
    { at: 9.3, type: "sfx", sound: "bonk", volume: 0.78 },
    { at: 9.4, type: "prop_action", prop: "chest_lock", action: "hide" },
    { at: 10.2, type: "prop_action", prop: "mystery_chest", action: "open" },
    { at: 10.5, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
    { at: 10.6, type: "sfx", sound: "vine_boom", volume: 0.75 },
    { at: 11.5, type: "char_gesture", actor: "grandpa", gesture: "shake_no", duration: 1.0 },

    // You nod toward the doorway; Grandpa sprints after Granny into the east hall!
    { at: 12.6, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 12.8, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 13.4, type: "char_move", actor: "grandpa", to: "back_room_east", via: ["living_room", "living_room_view", "living_room_entry", "doorway_living"], anim: "run2", duration: 2.8 },
    { at: 15.8, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 5 (17.5s) — 2nd Floor Stairs & Spawn Bedroom: The Upstairs Distraction
// ---------------------------------------------------------------------------
const scene5Upstairs = {
  id: "upstairs_heist",
  title: "Upstairs Bedroom Distraction",
  room: "upstairs_bedroom",
  duration: 17.5,
  playerSpawn: "stairs_bottom",
  playerFacing: "stairs_middle",
  cast: {
    grandpa: { spawn: "dining_corner", facing: "stairs_bottom", prop: "cane" },
    granny: { spawn: "up_bed_north", facing: "up_hall_north_door", prop: "none" },
  },
  props: [
    PIZZA_PROP("upstairs_west_desk_top", { visible: true }),
    { id: "decoy_tray", type: "serving_tray", spawn: "up_bed_north_side", visible: true },
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_good_part", volume: 0.22 },
    { at: 0.2, type: "player_look", target: "grandpa", duration: 0.24, track: true },

    // Grandpa dashes up the wooden staircase first; POV climbs right behind him
    { at: 0.4, type: "char_move", actor: "grandpa", to: "up_hall_north", via: ["stairs_bottom", "stairs_middle", "stairs_top", "upstairs_landing", "upstairs_hall_center", "up_hall_north_door"], anim: "run2", duration: 4.4 },
    { at: 2.1, type: "player_walk", to: "upstairs_hall_center", via: ["stairs_bottom", "stairs_middle", "stairs_top", "upstairs_landing"], duration: 3.8, speed: 2.4, lookAhead: false },
    { at: 2.3, type: "player_look", target: "stairs_top", duration: 0.3 },

    // Upstairs: Grandpa greets Granny warmly to distract her!
    { at: 5.0, type: "player_look", target: "granny", duration: 0.26, track: true },
    { at: 5.4, type: "char_move", actor: "grandpa", to: "up_bed_north_side", anim: "walk", duration: 1.1 },
    { at: 6.1, type: "player_walk", to: "up_hall_north", via: ["up_hall_north_door"], duration: 1.8, speed: 2.0, lookAhead: false },
    ...greetAndNod({ at: 6.6, a: "grandpa", b: "granny", duration: 2.0 }),
    { at: 7.0, type: "sfx", sound: "ding", volume: 0.55 },

    // Physical silent debate (`dialogueExchange` — ZERO thought bubbles!)
    ...dialogueExchange({ at: 8.6, a: "granny", b: "grandpa", turns: 2, step: 1.5 }),
    { at: 10.2, type: "player_look", target: "golden_pizza", duration: 0.25 },

    // Grandpa smoothly grabs the steaming pizza off the 2nd-floor desk & sprints!
    { at: 11.6, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 3.0, facePlayer: false },
    { at: 11.7, type: "prop_action", prop: "golden_pizza", action: "glide", from: "upstairs_west_desk_top", to: "grandpa", duration: 0.65, arc: 0.14 },
    { at: 12.35, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.06, 0.26] },
    { at: 12.4, type: "sfx", sound: "kaching", volume: 0.65 },

    // Granny turns, catches him, and chases him back toward the stairs!
    { at: 12.8, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 12.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 13.0, type: "char_anim", actor: "granny", anim: "angry", loop: true, duration: 1.1 },
    { at: 13.2, type: "char_move", actor: "grandpa", to: "upstairs_landing", via: ["up_hall_north", "up_hall_north_door", "upstairs_hall_center"], anim: "run2", duration: 2.6 },
    { at: 14.2, type: "char_move", actor: "granny", to: "up_hall_north_door", via: ["up_bed_north_side", "up_hall_north"], anim: "run2", duration: 2.2 },
    { at: 14.4, type: "bgm", sound: "run_amok", volume: 0.25 },
    { at: 15.8, type: "player_gesture", gesture: "shake_panic", duration: 0.8 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 6 (16.5s) — Back Hall & East Hallway: The Great Hallway Chase
// ---------------------------------------------------------------------------
const scene6Chase = {
  id: "hallway_chase",
  title: "The Great Hallway Chase",
  room: "back_hall",
  duration: 16.5,
  playerSpawn: "back_hall_left",
  playerFacing: "back_hall",
  cast: {
    grandpa: { spawn: "back_hall_right", facing: "back_room_east", prop: "none" },
    granny: { spawn: "doorway_living", facing: "back_room_east", prop: "none" },
  },
  props: [
    PIZZA_PROP("back_hall_right", { visible: false, seat: false }),
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "run_amok", volume: 0.25 },
    { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.06, 0.26] },
    { at: 0.3, type: "player_look", target: "grandpa", duration: 0.24, track: true },

    // Grandpa tries sneaking to the east room, Granny bursts right out of doorway_living!
    { at: 0.6, type: "char_move", actor: "grandpa", to: "back_room_east", anim: "sneak", duration: 1.8 },
    { at: 2.2, type: "char_move", actor: "granny", to: "back_room_east_right", via: ["back_room_east"], anim: "run2", duration: 1.6 },
    { at: 2.4, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 3.9, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 4.0, type: "char_anim", actor: "granny", anim: "angry", loop: true, duration: 1.2 },
    { at: 4.1, type: "sfx", sound: "granny_i_see_you", volume: 0.78, cutBgm: true, cutBgmDuration: 0.9 },

    // Face-to-face hallway standoff: double-takes, shakes, pointing!
    { at: 5.2, type: "char_face", actor: "grandpa", target: "granny", duration: 0.2 },
    { at: 5.4, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.8 },
    { at: 5.6, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    ...dialogueExchange({ at: 6.4, a: "granny", b: "grandpa", turns: 2, step: 1.5 }),

    // Grandpa breaks loose and races through the dining doorway into dining_center!
    { at: 9.6, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.8, facePlayer: false },
    { at: 9.8, type: "char_move", actor: "grandpa", to: "dining_center", via: ["back_hall", "back_hall_left", "doorway_dining"], anim: "run2", duration: 2.6 },
    { at: 10.6, type: "player_look", target: "granny", duration: 0.25, track: true },
    { at: 12.6, type: "player_walk", to: "hallway", duration: 1.5, speed: 2.2, lookAhead: false },
    { at: 13.0, type: "player_look", target: "granny", duration: 0.25, track: true },
    { at: 13.4, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 13.5, type: "char_anim", actor: "granny", anim: "laugh", loop: true, duration: 1.0 },
    { at: 13.6, type: "sfx", sound: "granny_laugh", volume: 0.7 },
    { at: 14.6, type: "char_move", actor: "granny", to: "back_hall_left", via: ["back_room_east", "back_hall"], anim: "run2", duration: 1.8 },
  ],
};

// ---------------------------------------------------------------------------
// Scene 7 (16.5s) — Dining Room Finale: The Pizza Truce & Playful Chase
// ---------------------------------------------------------------------------
const scene7Finale = {
  id: "dining_truce",
  title: "The Dining Room Truce",
  room: "dining",
  duration: 16.5,
  playerSpawn: "dining_corner",
  playerFacing: "dining_table_top",
  cast: {
    grandpa: { spawn: "dining_table_side", facing: "dining_table_top", prop: "none" },
    granny: { spawn: "dining_center", facing: "dining_table_top", prop: "none" },
  },
  props: [
    PIZZA_PROP("dining_table_side", { visible: false, seat: false }),
    { id: "party_tray", type: "serving_tray", spawn: "dining_table_top_west", visible: true },
    { id: "party_mug", type: "coffee_mug", spawn: "dining_table_top_west", spawnOffset: { x: 0.35, z: -0.15 }, visible: true, steam: true },
  ],
  beats: [
    { at: 0.0, type: "bgm", sound: "monkeys_spinning_monkeys", volume: 0.24 },
    { at: 0.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.06, 0.26] },
    { at: 0.3, type: "player_look", target: "grandpa", duration: 0.25 },

    // Grandpa walks right up and sets the steaming pizza gently onto the dining table!
    { at: 0.6, type: "char_face", actor: "grandpa", target: "dining_table_top", duration: 0.2 },
    { at: 0.8, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.5, facePlayer: false },
    { at: 0.9, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "dining_table_top", duration: 1.1, arc: 0.12 },
    { at: 2.0, type: "sfx", sound: "checkmark", volume: 0.65 },

    // Grandpa & Granny look at each other, wave politely, and nod yes (Truce!)
    { at: 2.5, type: "player_look", target: "granny", duration: 0.24 },
    ...greetAndNod({ at: 2.7, a: "grandpa", b: "granny", duration: 2.0 }),
    { at: 4.8, type: "char_face", actor: "granny", target: "golden_pizza", duration: 0.2 },
    { at: 5.0, type: "char_arm", actor: "granny", gesture: "sniff", duration: 1.5, facePlayer: false },
    { at: 5.3, type: "sfx", sound: "rizz", volume: 0.55 },
    { at: 5.5, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 5.6, type: "char_anim", actor: "granny", anim: "laugh", loop: true, duration: 1.4 },

    // Everyone celebrates together & POV nods yes
    { at: 6.8, type: "player_look", target: "golden_pizza", duration: 0.24 },
    { at: 7.2, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
    { at: 7.3, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true, duration: 1.6 },
    { at: 7.4, type: "sfx", sound: "tada", volume: 0.72 },
    { at: 8.2, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },

    // TWIST! Granny sneaks the whole pizza off the table and bolts with Grandpa chasing!
    { at: 9.4, type: "player_look", target: "granny", duration: 0.24, track: true },
    { at: 9.6, type: "char_move", actor: "granny", to: "dining_table_front", anim: "sneak", duration: 1.3 },
    { at: 10.9, type: "char_arm", actor: "granny", gesture: "carry", duration: 3.4, facePlayer: false },
    { at: 11.0, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "granny", offset: [0, 0.06, 0.26] },
    { at: 11.1, type: "sfx", sound: "vine_boom", volume: 0.7 },

    { at: 11.8, type: "player_look", target: "grandpa", duration: 0.24, track: true },
    { at: 11.9, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.8 },
    { at: 12.2, type: "char_move", actor: "granny", to: "back_hall_left", via: ["dining_center", "doorway_dining"], anim: "run2", duration: 2.8 },
    { at: 12.6, type: "bgm", sound: "run_amok", volume: 0.25 },
    { at: 12.8, type: "char_move", actor: "grandpa", to: "doorway_dining", via: ["dining_center"], anim: "run2", duration: 2.6 },
    { at: 13.6, type: "sfx", sound: "granny_laugh", volume: 0.72 },
    { at: 14.0, type: "char_face", actor: "granny", followPlayer: true, instant: true },
    { at: 14.2, type: "char_anim", actor: "granny", anim: "laugh", loop: true, duration: 1.5 },
    { at: 15.6, type: "fade", to: 1, duration: 0.8 },
  ],
};

export const MIDNIGHT_PIZZA_HEIST_2M = buildEpisode({
  title: "Granny's Midnight Pizza Heist (2m POV)",
  aspect: "16:9",
  gags: [
    scene1Delivery,
    scene2Kitchen,
    scene3LivingRoom,
    scene4Chest,
    scene5Upstairs,
    scene6Chase,
    scene7Finale,
  ],
  story: {
    premise: "A giant steaming pepperoni pizza arrives at midnight and both Granny and Grandpa want the whole thing.",
    goal: "keep track of the steaming pizza as Granny and Grandpa scheme and chase each other through the house",
    goalProp: "golden_pizza",
    resolution: "They agree to a polite dining-table truce — until Granny snatches the whole pizza and bolts again.",
    scenes: [
      {
        objective: "unbox the secret midnight pizza at the front door without Grandpa noticing",
        obstacle: "Grandpa smells the hot pizza and points right at it",
        turn: "Granny refuses with a head-shake and sprints toward the kitchen",
      },
      {
        objective: "guard the pizza in the kitchen while cooking",
        obstacle: "Grandpa tiptoes around the counter and reaches for a slice",
        turn: "Granny catches him red-handed and dashes for the living room",
      },
      {
        objective: "relax on the living room sofa with the pizza",
        obstacle: "Grandpa already claimed the sofa and tries trading his bouncy ball",
        turn: "Grandpa boots the ball into Granny and knocks the pizza onto the shelf",
      },
      {
        objective: "trick Grandpa into thinking the pizza is locked inside the mystery chest",
        obstacle: "Grandpa punches off the padlock to open the chest",
        turn: "the chest is empty — Granny kept the pizza and ran upstairs",
      },
      {
        objective: "sneak upstairs to the 2nd-floor bedroom where Granny hid the pizza",
        obstacle: "Granny stands guard beside the bedroom desk",
        turn: "Grandpa distracts Granny with a wave and snatches the pizza down the stairs",
      },
      {
        objective: "escape through the back hallway with the stolen pizza",
        obstacle: "Granny bursts out of the living room doorway to cut him off",
        turn: "after a frantic hallway standoff, Grandpa dashes into the dining room",
      },
      {
        objective: "share the steaming pizza peacefully at the dining table",
        obstacle: "neither of them really wants to give up the last pie",
        turn: "right after nodding to a truce, Granny swipes the pizza and sprints off laughing",
      },
    ],
  },
});
