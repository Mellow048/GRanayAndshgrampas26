// "Granny's Midnight Pizza Heist" (~2 minutes / 120s, continuous 3-act POV comedy).
// Upgraded FunnyHorrorAnimation style:
//   - Player is AN ACTIVE PARTICIPANT (moves for clear views, shakes no, nods yes, shrugs)
//   - Strategic high-impact thought bubbles (`shh`, `question`, `where_grandpa` portrait + `???`) — never spammed
//   - True character-space head nods/shakes + shoulder-lift `idk` shrug
//   - Zero teleport cuts, zero random laughs/chairless sits, new Mixamo dances & comedy SFX

const pizzaParts = [
  {
    name: "PizzaPlatter",
    shape: "cylinder",
    size: [0.32, 0.3, 0.025],
    pos: [0, 0.0125, 0],
    color: 0xe2e8f0,
    metalness: 0.55,
    roughness: 0.25,
  },
  {
    name: "PizzaCrust",
    shape: "cylinder",
    size: [0.28, 0.29, 0.03],
    pos: [0, 0.032, 0],
    color: 0xd97706,
    roughness: 0.72,
  },
  {
    name: "PizzaCheese",
    shape: "cylinder",
    size: [0.245, 0.245, 0.018],
    pos: [0, 0.045, 0],
    color: 0xfacc15,
    roughness: 0.38,
  },
  { name: "Pep1", shape: "cylinder", size: [0.048, 0.048, 0.012], pos: [0.0, 0.055, 0.0], color: 0xdc2626, roughness: 0.48 },
  { name: "Pep2", shape: "cylinder", size: [0.045, 0.045, 0.012], pos: [0.13, 0.055, 0.05], color: 0xb91c1c, roughness: 0.48 },
  { name: "Pep3", shape: "cylinder", size: [0.045, 0.045, 0.012], pos: [-0.13, 0.055, -0.04], color: 0xdc2626, roughness: 0.48 },
  { name: "Pep4", shape: "cylinder", size: [0.044, 0.044, 0.012], pos: [0.05, 0.055, -0.14], color: 0xb91c1c, roughness: 0.48 },
  { name: "Pep5", shape: "cylinder", size: [0.044, 0.044, 0.012], pos: [-0.07, 0.055, 0.13], color: 0xdc2626, roughness: 0.48 },
  { name: "Pep6", shape: "cylinder", size: [0.042, 0.042, 0.012], pos: [0.11, 0.055, -0.11], color: 0xb91c1c, roughness: 0.48 },
];

export const MIDNIGHT_PIZZA_HEIST_2M = {
  id: "midnight_pizza_heist_2m",
  title: "Granny's Midnight Pizza Heist (2m POV)",
  duration: 120,
  transitions: "continuous",
  maxLookDuration: 0.55,
  playerSpawn: "dining_lane",
  playerFacing: "kitchen",
  cast: [
    { id: "granny", asset: "granny", spawn: "kitchen", facing: "kitchen_table_top" },
    { id: "grandpa", asset: "grandpa", spawn: "doorway_dining", facing: "kitchen" },
  ],
  props: [
    {
      id: "golden_pizza",
      type: "custom",
      spawn: "kitchen_counter_top",
      visible: true,
      steam: true,
      parts: pizzaParts,
    },
    {
      id: "skillet",
      type: "frying_pan",
      spawn: "kitchen_table_top",
      visible: true,
      steam: true,
    },
    {
      id: "cookie_jar",
      type: "cookie_jar",
      spawn: "dining_table_top_west",
      visible: true,
    },
  ],
  story: {
    goalProp: "golden_pizza",
    premise: "Granny bakes a giant midnight pizza; Grandpa keeps trying to swipe it right under our noses.",
    goal: "Grandpa wants the golden pizza while dragging the Player into keeping his secret.",
    resolution: "Granny asks us where Grandpa went, we tip her off, and everyone shares the pizza in a victory dance.",
    scenes: [
      {
        name: "Act 1: Kitchen Sneak & Secret Witness",
        objective: "Grandpa sneaks behind Granny, shushes the Player, and reaches for the fresh pizza.",
        obstacle: "Granny catches Grandpa red-handed and makes him place the pizza on the dining table.",
        turn: "Grandpa pretends to obey, then plots a distraction at the hall doorway.",
        beats: [
          "The Player steps closer to dining_center to watch Grandpa swipe the pizza and shush us.",
          "Granny catches Grandpa, puts hands on hips, and locks the pizza on the dining table.",
        ],
      },
      {
        name: "Act 2: Pizza Missing & Granny Asks Us!",
        objective: "Grandpa lures Granny to the hallway, swaps the cookie jar, and bolts with the pizza.",
        obstacle: "Granny returns to an empty table and asks the Player with a ??? Grandpa bubble where he went.",
        turn: "We shrug/shake no, look down the hall to tip her off, and follow Granny into the chase.",
        beats: [
          "Grandpa pulls the knock distraction, steals the pizza, and bolts through the hall.",
          "Granny asks the Player where Grandpa went; the Player nods toward the doorway to trigger the chase.",
        ],
      },
      {
        name: "Act 3: Living Room Standoff & Peace Dance",
        objective: "Granny corners Grandpa in the living room while he tries to hide the pizza.",
        obstacle: "Grandpa throws up a big idk shrug before finally offering to share.",
        turn: "Granny checks with the Player, we nod yes, and Grandpa celebrates with a dance.",
        beats: [
          "Granny corners Grandpa in the living room and demands the pizza back.",
          "Grandpa offers a peace slice, the Player nods approval, and Grandpa breaks into dance.",
        ],
      },
    ],
  },
  skits: [
    // =========================================================================
    // ACT 1 (0s - 40s): Kitchen Close-Up & Secret Witness
    // =========================================================================
    {
      name: "Act 1: Kitchen Sneak & Secret Witness",
      room: "kitchen",
      startAt: 0,
      duration: 40,
      playerSpawn: "dining_lane",
      playerFacing: "kitchen",
      beats: [
        { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
        { at: 0.0, type: "player_look", target: "granny", duration: 0.35, track: true },

        // Granny cooks happily in the kitchen
        { at: 0.4, type: "char_arm", actor: "granny", gesture: "stir", duration: 3.0, facePlayer: false },
        { at: 0.8, type: "sfx", sound: "pop", volume: 0.5 },
        { at: 2.2, type: "char_gesture", actor: "granny", gesture: "nod_once", duration: 0.9 },

        // Camera glances toward doorway_dining as Grandpa tiptoes into dining_center
        { at: 3.6, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 3.8, type: "char_move", actor: "grandpa", to: "dining_center", anim: "sneak", duration: 2.6, facePlayer: false },
        { at: 4.5, type: "sfx", sound: "footsteps_slow", volume: 0.4 },

        // Grandpa sniffs the hot pizza aroma and nods eagerly
        { at: 6.6, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.25 },
        { at: 6.8, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.8, facePlayer: false },
        { at: 7.2, type: "sfx", sound: "yummy", volume: 0.72 },
        { at: 8.6, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 1.0 },

        // Grandpa sneaks into kitchen_lane; Player steps forward to dining_center AFTER Grandpa clears it for an unobstructed view!
        { at: 9.8, type: "char_move", actor: "grandpa", to: "kitchen_lane", anim: "sneak", duration: 2.4, facePlayer: false },
        { at: 11.2, type: "player_walk", to: "dining_center", duration: 1.8 },
        { at: 11.3, type: "player_look", target: "grandpa", duration: 0.4, track: true },

        // Clear close view: Grandpa reaches onto kitchen_counter_top and grabs the golden pizza!
        { at: 12.6, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.2 },
        { at: 12.8, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.6, facePlayer: false },
        { at: 13.6, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 13.7, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.8, facePlayer: false },
        { at: 13.8, type: "sfx", sound: "whoosh", volume: 0.5 },

        // Grandpa spots THE PLAYER watching right next to him, turns to us with a SHH! bubble — and we nod along!
        { at: 14.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 14.4, type: "char_bubble", actor: "grandpa", icon: "shh", duration: 1.6 },
        { at: 14.7, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },

        // Granny finishes stirring, turns, and catches Grandpa red-handed!
        { at: 16.0, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 16.2, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.25 },
        { at: 16.5, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.0 },
        { at: 16.6, type: "sfx", sound: "vine_boom", volume: 0.72 },
        { at: 17.6, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },
        { at: 18.2, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.4 },
        { at: 18.8, type: "sfx", sound: "bonk", volume: 0.55 },

        // Grandpa gives a big shoulder-raised IDK shrug, Granny points to the dining table
        { at: 19.8, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 20.0, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.25 },
        { at: 20.2, type: "char_arm", actor: "grandpa", gesture: "idk", duration: 1.8, facePlayer: false },
        { at: 21.2, type: "char_arm", actor: "granny", gesture: "point", duration: 1.6, facePlayer: false },
        { at: 21.5, type: "sfx", sound: "ding2", volume: 0.55 },

        // Player steps cleanly back to dining_lane BEFORE Grandpa walks through dining_center!
        { at: 22.0, type: "player_walk", to: "dining_lane", duration: 1.6 },
        { at: 23.8, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.2, facePlayer: false },
        { at: 23.8, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "dining_table_front", anim: "walk", duration: 2.2, facePlayer: false },
        { at: 24.0, type: "player_look", target: "grandpa", duration: 0.4, track: true },

        // Grandpa sets the pizza squarely on dining_table_top, waves "Okay, okay!", and exits to doorway_dining
        { at: 26.2, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.3, facePlayer: false },
        { at: 26.3, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "dining_table_top", duration: 1.2, arc: 0.14 },
        { at: 27.6, type: "sfx", sound: "checkmark", volume: 0.55 },
        { at: 28.0, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.2, facePlayer: false },
        { at: 29.2, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "doorway_dining", anim: "walk", duration: 2.8, facePlayer: false },

        // Granny walks out around kitchen_lane -> dining_center -> dining_table_btn to guard the pizza
        { at: 32.4, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 32.4, type: "char_move", actor: "granny", via: ["kitchen_lane", "dining_center", "dining_table_front"], to: "dining_table_btn", anim: "walk", duration: 3.4, facePlayer: false },
        { at: 36.0, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 36.2, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },

        // Grandpa rubs/claps his hands at doorway_dining with a mischievous idea!
        { at: 37.8, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 38.0, type: "char_face", actor: "grandpa", target: "dining_lane", duration: 0.2 },
        { at: 38.2, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 1.5, facePlayer: false },
        { at: 39.7, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "dining_table_top", visible: true },
      ],
    },

    // =========================================================================
    // ACT 2 (40s - 80s): Knock Distraction, Swap & Granny Asks Us!
    // =========================================================================
    {
      name: "Act 2: Pizza Missing & Granny Asks Us!",
      room: "kitchen",
      startAt: 40,
      duration: 40,
      playerSpawn: "dining_lane",
      playerFacing: "doorway_dining",
      beats: [
        // Grandpa creates a knock distraction at doorway_dining, then slips clear into kitchen_lane
        { at: 40.2, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 40.4, type: "char_arm", actor: "grandpa", gesture: "point", duration: 1.4, facePlayer: false },
        { at: 40.6, type: "sfx", sound: "door_creak", volume: 0.65 },
        { at: 41.6, type: "sfx", sound: "knock", volume: 0.7 },

        { at: 42.0, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "kitchen_lane", anim: "sneak", duration: 2.4, facePlayer: false },

        // Granny hears the knock, walks to doorway_dining to investigate
        { at: 43.4, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 43.6, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.0 },
        { at: 44.8, type: "char_move", actor: "granny", via: ["dining_table_front", "dining_center"], to: "doorway_dining", anim: "walk", duration: 3.4, facePlayer: false },

        // Granny checks the hall ("Who is it?!") with a classic shoulder-lift idk + question bubble
        { at: 48.4, type: "char_face", actor: "granny", target: "dining_nook", duration: 0.25 },
        { at: 48.6, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.3 },
        { at: 49.6, type: "char_arm", actor: "granny", gesture: "idk", duration: 1.8, facePlayer: false },
        { at: 49.7, type: "char_bubble", actor: "granny", icon: "question", duration: 1.6 },

        // Meanwhile Grandpa sneaks out from kitchen_lane to dining_table_front, swaps the cookie jar, and swipes the pizza!
        { at: 51.0, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 51.2, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "dining_table_front", anim: "sneak", duration: 3.0, facePlayer: false },
        { at: 52.0, type: "sfx", sound: "footsteps_slow", volume: 0.45 },

        { at: 54.4, type: "char_face", actor: "grandpa", target: "dining_table_top", duration: 0.2 },
        { at: 54.6, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.5, facePlayer: false },
        { at: 55.2, type: "prop_action", prop: "cookie_jar", action: "glide", from: "dining_table_top_west", to: "dining_table_top", duration: 0.9, arc: 0.12 },
        { at: 56.0, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 56.1, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.0, facePlayer: false },
        { at: 56.2, type: "sfx", sound: "yummy", volume: 0.7 },

        // Granny checks further into the under_bed hall alcove while Grandpa bolts down the hall to the living room!
        { at: 56.5, type: "char_move", actor: "granny", via: ["dining_nook"], to: "under_bed", anim: "walk", duration: 1.4, facePlayer: false },
        { at: 58.2, type: "char_move", actor: "grandpa", via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living", "living_room_entry"], to: "living_room", anim: "run", duration: 10.0, facePlayer: false },
        { at: 59.0, type: "sfx", sound: "footsteps_fast", volume: 0.5 },

        // Granny returns to dining_table_btn and realizes the pizza is GONE!
        { at: 61.0, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 61.0, type: "char_move", actor: "granny", via: ["doorway_dining", "dining_center", "dining_table_front"], to: "dining_table_btn", anim: "walk", duration: 3.3, facePlayer: false },
        { at: 64.5, type: "char_face", actor: "granny", target: "dining_table_top", duration: 0.2 },
        { at: 64.6, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.9 },
        { at: 64.7, type: "sfx", sound: "vine_boom", volume: 0.75 },

        // KEY INTERACTIVE BEAT: Granny steps clear of the table into dining_center TO US, shows portrait "??? Where's Grandpa?" bubble + idk shoulders!
        { at: 65.1, type: "char_move", actor: "granny", via: ["dining_table_front"], to: "dining_center", anim: "walk", duration: 1.1, facePlayer: false },
        { at: 65.4, type: "player_zoom", fov: 50, duration: 0.45 },
        { at: 66.2, type: "char_face", actor: "granny", followPlayer: true, instant: false },
        { at: 66.3, type: "char_arm", actor: "granny", gesture: "idk", duration: 2.0, facePlayer: true },
        { at: 66.4, type: "char_bubble", actor: "granny", icon: "where_grandpa", duration: 2.2 },

        // Player acts physically: first shakes head ("I didn't take it!"), then turns to the dining doorway and nods ("He went that way!")!
        { at: 67.5, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
        { at: 68.4, type: "player_zoom", fov: 58, duration: 0.35 },
        { at: 68.5, type: "player_look", target: { x: -3.6, y: 1.25, z: -1.2 }, duration: 0.35, track: false },
        { at: 68.8, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },

        // Granny gets the tip! She nods sharply, points toward doorway_dining ("I see!"), and sprints down the hall!
        { at: 69.3, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 0.9 },
        { at: 69.4, type: "sfx", sound: "granny_i_see_you", volume: 0.78 },
        { at: 69.9, type: "char_arm", actor: "granny", gesture: "point", duration: 1.0, facePlayer: false },
        { at: 70.2, type: "player_look", target: "granny", duration: 0.35, track: true },

        // Staggered chase so doorway_dining stays clean: Granny runs out first, Camera chases right behind!
        { at: 70.6, type: "char_move", actor: "granny", via: ["doorway_dining", "back_hall_left", "back_hall"], to: "hallway", anim: "run", duration: 8.0, facePlayer: false },
        { at: 72.4, type: "player_walk", via: ["dining_center", "doorway_dining", "back_hall_left"], to: "back_hall", duration: 6.4 },
        { at: 72.6, type: "player_look", target: "granny", duration: 0.4, track: true },

        // Grandpa sets the pizza on the living room sofa thinking he's safe
        { at: 78.2, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.1, arc: 0.12 },
        { at: 79.4, type: "sfx", sound: "checkmark", volume: 0.5 },
        { at: 79.7, type: "prop_action", prop: "cookie_jar", action: "reset", waypoint: "dining_table_top", visible: true },
        { at: 79.8, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "living_room_sofa", visible: true },
      ],
    },

    // =========================================================================
    // ACT 3 (80s - 120s): Living Room Standoff, Player Ties It Together & Dance!
    // =========================================================================
    {
      name: "Act 3: Living Room Standoff & Peace Dance",
      room: "living_room",
      startAt: 80,
      duration: 40,
      playerSpawn: "back_hall",
      playerFacing: "hallway",
      beats: [
        // Granny storms into the Living Room; Camera follows behind smoothly
        { at: 80.2, type: "char_move", actor: "granny", via: ["back_room_east", "doorway_living", "living_room_entry"], to: "living_room_view", anim: "walk", duration: 5.2, facePlayer: false },
        { at: 80.4, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 83.4, type: "player_walk", via: ["hallway", "back_room_east", "doorway_living"], to: "living_room_left", duration: 5.8 },
        { at: 84.0, type: "sfx", sound: "footsteps_fast", volume: 0.45 },

        // Grandpa spots Granny and the Player, hits "AHA!" defensively and hugs the pizza
        { at: 86.2, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 86.4, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.25 },
        { at: 86.6, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 1.0 },
        { at: 86.7, type: "sfx", sound: "grandpa_aha", volume: 0.85 },
        { at: 87.6, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 87.7, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.6, facePlayer: false },

        // Granny puts hands on hips, shakes NO crisply, and points for the pizza back!
        { at: 89.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 89.4, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 89.6, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },
        { at: 90.0, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.4 },
        { at: 92.0, type: "char_arm", actor: "granny", gesture: "point", duration: 1.6, facePlayer: false },
        { at: 92.3, type: "sfx", sound: "bonk", volume: 0.55 },

        // Grandpa does an innocent raised-shoulder IDK shrug, sniffs the pizza, and offers a peace slice!
        { at: 93.8, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 94.0, type: "char_arm", actor: "grandpa", gesture: "idk", duration: 1.9, facePlayer: false },
        { at: 96.2, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.8, facePlayer: false },
        { at: 96.6, type: "sfx", sound: "eat", volume: 0.55 },
        { at: 98.2, type: "char_arm", actor: "grandpa", gesture: "offer", duration: 2.6, facePlayer: false },
        { at: 98.6, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 1.1 },

        // Granny looks to the Player ("What do you think — share?"), Player nods YES!
        { at: 100.6, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 100.8, type: "char_face", actor: "granny", followPlayer: true, instant: false },
        { at: 101.0, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.4 },
        { at: 101.1, type: "char_bubble", actor: "granny", icon: "pizza", duration: 1.8 },
        { at: 102.2, type: "player_gesture", gesture: "nod_yes", duration: 0.85 },

        // Granny nods YES happily + claps!
        { at: 103.0, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 1.3 },
        { at: 103.2, type: "sfx", sound: "ding2", volume: 0.65 },
        { at: 104.4, type: "char_arm", actor: "granny", gesture: "clap", duration: 2.0, facePlayer: false },

        // Grandpa sets the golden pizza cleanly down on the living room sofa to share
        { at: 106.5, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 106.7, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.5, facePlayer: false },
        { at: 106.9, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.3, arc: 0.12 },
        { at: 108.4, type: "sfx", sound: "tada", volume: 0.65 },

        // Victory celebration: "LET'S GO!" + Grandpa breaks into Chicken Dance while Granny steps into frame, waves & Player nods!
        { at: 109.4, type: "char_face", actor: "grandpa", target: "living_room_left", duration: 0.25 },
        { at: 109.6, type: "sfx", sound: "lets_go", volume: 0.8 },
        { at: 109.8, type: "char_anim", actor: "grandpa", anim: "chicken_dance", loop: true, duration: 5.5, facePlayer: true },
        { at: 110.2, type: "char_move", actor: "granny", to: "living_room_right", anim: "walk", duration: 1.0, facePlayer: false },
        { at: 111.3, type: "char_face", actor: "granny", target: "living_room_left", duration: 0.25 },
        { at: 111.5, type: "char_arm", actor: "granny", gesture: "wave", duration: 2.5, facePlayer: true },
        { at: 112.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
        { at: 114.2, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 1.4 },
        { at: 115.6, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 2.6, facePlayer: true },
        { at: 115.8, type: "char_arm", actor: "granny", gesture: "clap", duration: 2.4, facePlayer: true },
        { at: 116.0, type: "sfx", sound: "pop", volume: 0.5 },
        { at: 117.4, type: "char_gesture", actor: "granny", gesture: "nod", duration: 1.4 },
        { at: 118.8, type: "fade", to: 1, duration: 1.2 },
      ],
    },
  ],
};
