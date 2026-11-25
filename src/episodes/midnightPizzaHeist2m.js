// "Granny's Midnight Pizza Heist" (~2 minutes / 120s, continuous 3-act POV slapstick).
// Built in crisp, @funnyhorroranimationofficial style physical comedy:
//   - ZERO thought bubbles (pure body language: point, angry_hips, shrug, sniff, nod, shake, double_take, wave, clap)
//   - ZERO unmotivated laughs or mid-air sits
//   - ZERO teleport cuts (continuous camera from Kitchen -> Dining -> Hall -> Living Room)
//   - All props cleanly seated on real house surfaces or carried cleanly in-hand

const pizzaParts = [
  // Silver serving platter (base at y = 0.0)
  {
    name: "PizzaPlatter",
    shape: "cylinder",
    size: [0.32, 0.30, 0.025],
    pos: [0, 0.0125, 0],
    color: 0xe2e8f0,
    metalness: 0.55,
    roughness: 0.25,
  },
  // Golden-brown baked crust
  {
    name: "PizzaCrust",
    shape: "cylinder",
    size: [0.28, 0.29, 0.03],
    pos: [0, 0.032, 0],
    color: 0xd97706,
    roughness: 0.72,
  },
  // Bright melted mozzarella layer
  {
    name: "PizzaCheese",
    shape: "cylinder",
    size: [0.245, 0.245, 0.018],
    pos: [0, 0.045, 0],
    color: 0xfacc15,
    roughness: 0.38,
  },
  // Six bold pepperoni slices for instant readability across any room
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
    premise: "Granny bakes a giant midnight pizza; Grandpa keeps trying to sneak away with it.",
    goal: "Grandpa wants a slice of Granny's golden pizza before she locks it down for the night.",
    resolution: "Cornered in the living room, Grandpa offers a peace slice and Granny happily shares.",
    scenes: [
      {
        name: "Act 1: Hands Off My Midnight Pizza!",
        objective: "Granny guards her fresh pizza in the kitchen while Grandpa tries to sneak a bite.",
        obstacle: "Granny catches Grandpa red-handed and makes him put the pizza on the dining table.",
        turn: "Grandpa pretends to back off into the doorway, then hatches a sneaky distraction.",
        beats: [
          "Grandpa tiptoes in and reaches for the fresh pizza.",
          "Granny catches him, puts her hands on her hips, and guards the pizza on the dining table.",
        ],
      },
      {
        name: "Act 2: The Knock Distraction & Heist!",
        objective: "Grandpa lures Granny to the hallway doorway and loops behind her to swipe the pizza.",
        obstacle: "Granny returns to a swapped cookie jar on the table and spots the trail.",
        turn: "Granny chases Grandpa down the hall toward the living room.",
        beats: [
          "Grandpa lures Granny to check the hall and sneaks back around to grab the pizza.",
          "Granny discovers the cookie jar decoy and chases Grandpa out of the dining room.",
        ],
      },
      {
        name: "Act 3: Living Room Standoff & Peace Slice",
        objective: "Granny corners Grandpa with the stolen pizza in the living room.",
        obstacle: "Grandpa hugs the pizza defensively while Granny demands it back.",
        turn: "Grandpa pleads hungry and offers to share; Granny nods yes and both celebrate.",
        beats: [
          "Granny corners Grandpa in the living room and points sternly.",
          "Grandpa offers the pizza peacefully, Granny claps yes, and they wave together.",
        ],
      },
    ],
  },
  skits: [
    // =========================================================================
    // ACT 1 (0s - 40s): Kitchen Cook & First Caught-Red-Handed Attempt
    // =========================================================================
    {
      name: "Act 1: Hands Off My Midnight Pizza!",
      room: "kitchen",
      startAt: 0,
      duration: 40,
      playerSpawn: "dining_lane",
      playerFacing: "kitchen",
      beats: [
        { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
        { at: 0.0, type: "player_look", target: "granny", duration: 0.35, track: true },

        // Granny proudly stirs and seasons her midnight spread
        { at: 0.4, type: "char_arm", actor: "granny", gesture: "stir", duration: 3.0, facePlayer: false },
        { at: 0.8, type: "sfx", sound: "pop", volume: 0.5 },
        { at: 2.2, type: "char_gesture", actor: "granny", gesture: "nod_once", duration: 0.9 },

        // Camera glances toward the dining doorway as Grandpa creeps in
        { at: 3.6, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 3.8, type: "char_move", actor: "grandpa", to: "dining_center", anim: "sneak", duration: 2.6, facePlayer: false },
        { at: 4.5, type: "sfx", sound: "footsteps_slow", volume: 0.4 },

        // Grandpa stops at dining_center, sniffs the hot pizza aroma, and nods excitedly
        { at: 6.6, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.25 },
        { at: 6.9, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 2.0, facePlayer: false },
        { at: 7.3, type: "sfx", sound: "rizz", volume: 0.45 },
        { at: 8.9, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 1.0 },

        // Grandpa tiptoes closer to kitchen_lane behind Granny's back
        { at: 10.0, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 10.2, type: "char_move", actor: "grandpa", to: "kitchen_lane", anim: "sneak", duration: 2.6, facePlayer: false },
        { at: 11.4, type: "sfx", sound: "footsteps_slow", volume: 0.45 },

        // Grandpa reaches out and slides the golden pizza into his hands!
        { at: 13.0, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.2 },
        { at: 13.2, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.8, facePlayer: false },
        { at: 14.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 14.3, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.0, facePlayer: false },
        { at: 14.5, type: "sfx", sound: "whoosh", volume: 0.5 },

        // Granny finishes stirring, turns around, and catches him red-handed!
        { at: 16.0, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.25 },
        { at: 16.3, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.1 },
        { at: 16.4, type: "sfx", sound: "vine_boom", volume: 0.7 },
        { at: 17.6, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },
        { at: 18.2, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.3 },
        { at: 18.8, type: "sfx", sound: "bonk", volume: 0.55 },

        // Grandpa freezes sheepishly, shrugs, then Granny points firmly to the dining table
        { at: 20.0, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 20.2, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.25 },
        { at: 20.4, type: "char_arm", actor: "grandpa", gesture: "shrug", duration: 1.5, facePlayer: false },
        { at: 22.0, type: "char_arm", actor: "granny", gesture: "point", duration: 1.6, facePlayer: false },
        { at: 22.4, type: "sfx", sound: "ding", volume: 0.55 },

        // Grandpa carries the pizza over to dining_table_front, sets it on dining_table_top, and backs out cleanly
        { at: 23.6, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.2, facePlayer: false },
        { at: 23.6, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "dining_table_front", anim: "walk", duration: 2.2, facePlayer: false },
        { at: 26.0, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.4, facePlayer: false },
        { at: 26.1, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "dining_table_top", duration: 1.3, arc: 0.14 },
        { at: 27.5, type: "sfx", sound: "checkmark", volume: 0.55 },
        { at: 28.0, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.2, facePlayer: false },
        { at: 29.2, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "doorway_dining", anim: "walk", duration: 2.8, facePlayer: false },

        // Once Grandpa clears dining_center into doorway_dining, Granny walks cleanly up to guard the table
        { at: 32.4, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 32.4, type: "char_move", actor: "granny", via: ["kitchen_lane", "dining_center", "dining_table_front"], to: "dining_table_btn", anim: "walk", duration: 3.4, facePlayer: false },
        { at: 36.0, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 36.2, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },

        // At doorway_dining, Grandpa claps wickedly with his new plan!
        { at: 37.8, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 38.0, type: "char_face", actor: "grandpa", target: "dining_lane", duration: 0.2 },
        { at: 38.2, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 1.5, facePlayer: false },
        { at: 39.7, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "dining_table_top", visible: true },
      ],
    },

    // =========================================================================
    // ACT 2 (40s - 80s): The Doorway Knock Distraction & Hallway Chase!
    // =========================================================================
    {
      name: "Act 2: The Knock Distraction & Heist!",
      room: "kitchen",
      startAt: 40,
      duration: 40,
      playerSpawn: "dining_lane",
      playerFacing: "doorway_dining",
      beats: [
        // Grandpa creates a noisy knock distraction at doorway_dining, then slips aside to kitchen_lane
        { at: 40.2, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 40.4, type: "char_arm", actor: "grandpa", gesture: "point", duration: 1.4, facePlayer: false },
        { at: 40.6, type: "sfx", sound: "door_creak", volume: 0.65 },
        { at: 41.6, type: "sfx", sound: "knock", volume: 0.7 },

        // Grandpa sneaks clear into kitchen_lane BEFORE Granny walks to investigate doorway_dining
        { at: 42.0, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "kitchen_lane", anim: "sneak", duration: 2.4, facePlayer: false },

        // Granny turns with a double-take and walks out to doorway_dining to check the hall
        { at: 43.4, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 43.6, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.0 },
        { at: 44.8, type: "char_move", actor: "granny", via: ["dining_table_front", "dining_center"], to: "doorway_dining", anim: "walk", duration: 3.4, facePlayer: false },

        { at: 48.4, type: "char_face", actor: "granny", target: "dining_nook", duration: 0.25 },
        { at: 48.6, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.4 },
        { at: 50.4, type: "char_arm", actor: "granny", gesture: "shrug", duration: 1.8, facePlayer: false },

        // While Granny checks the doorway, Grandpa sneaks straight from kitchen_lane to the dining table!
        { at: 51.0, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 51.2, type: "char_move", actor: "grandpa", via: ["dining_center"], to: "dining_table_front", anim: "sneak", duration: 3.0, facePlayer: false },
        { at: 52.0, type: "sfx", sound: "footsteps_slow", volume: 0.45 },

        // Grandpa swaps the cookie jar onto the spot and snatches the steaming pizza!
        { at: 54.4, type: "char_face", actor: "grandpa", target: "dining_table_top", duration: 0.2 },
        { at: 54.6, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.6, facePlayer: false },
        { at: 55.2, type: "prop_action", prop: "cookie_jar", action: "glide", from: "dining_table_top_west", to: "dining_table_top", duration: 0.9, arc: 0.12 },
        { at: 56.0, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 56.1, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.2, facePlayer: false },
        { at: 56.2, type: "sfx", sound: "whoosh", volume: 0.5 },

        // Granny steps clear to under_bed searching the hall alcove so doorway_dining is open for Grandpa's escape
        { at: 56.5, type: "char_move", actor: "granny", via: ["dining_nook"], to: "under_bed", anim: "walk", duration: 1.4, facePlayer: false },
        { at: 58.2, type: "char_move", actor: "grandpa", via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living", "living_room_entry"], to: "living_room", anim: "run", duration: 10.0, facePlayer: false },
        { at: 59.0, type: "sfx", sound: "footsteps_fast", volume: 0.5 },

        // Once Grandpa clears doorway_dining (~60.5), Granny walks back to dining_table_btn and sees the decoy cookie jar!
        { at: 61.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 61.2, type: "char_move", actor: "granny", via: ["doorway_dining", "dining_center", "dining_table_front"], to: "dining_table_btn", anim: "walk", duration: 3.4, facePlayer: false },
        { at: 64.8, type: "char_face", actor: "granny", target: "dining_table_top", duration: 0.2 },
        { at: 65.0, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.1 },
        { at: 65.2, type: "sfx", sound: "vine_boom", volume: 0.72 },
        { at: 66.2, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 1.4, facePlayer: false },
        { at: 67.6, type: "char_face", actor: "granny", target: "doorway_dining", duration: 0.2 },
        { at: 67.8, type: "char_arm", actor: "granny", gesture: "point", duration: 1.2, facePlayer: false },
        { at: 68.0, type: "sfx", sound: "bonk", volume: 0.6 },

        // Granny chases Grandpa out through doorway_dining -> hallway; Camera follows 2.0s later cleanly
        { at: 69.0, type: "char_move", actor: "granny", via: ["dining_table_front", "dining_center", "doorway_dining", "back_hall_left", "back_hall"], to: "hallway", anim: "run", duration: 8.6, facePlayer: false },
        { at: 71.0, type: "player_walk", via: ["dining_center", "doorway_dining", "back_hall_left"], to: "back_hall", duration: 7.4 },
        { at: 71.2, type: "player_look", target: "granny", duration: 0.4, track: true },

        // Grandpa reaches living_room and sets the pizza onto the bench/sofa
        { at: 78.0, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.2, arc: 0.12 },
        { at: 79.3, type: "sfx", sound: "checkmark", volume: 0.5 },
        { at: 79.7, type: "prop_action", prop: "cookie_jar", action: "reset", waypoint: "dining_table_top", visible: true },
        { at: 79.8, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "living_room_sofa", visible: true },
      ],
    },

    // =========================================================================
    // ACT 3 (80s - 120s): Living Room Standoff & The Peace Slice!
    // =========================================================================
    {
      name: "Act 3: Living Room Standoff & Peace Slice",
      room: "living_room",
      startAt: 80,
      duration: 40,
      playerSpawn: "back_hall",
      playerFacing: "hallway",
      beats: [
        // Granny leads into the Living Room; Camera follows 3.2s behind so doorway_living is completely clear!
        { at: 80.2, type: "char_move", actor: "granny", via: ["back_room_east", "doorway_living", "living_room_entry"], to: "living_room_view", anim: "walk", duration: 5.2, facePlayer: false },
        { at: 80.4, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 83.4, type: "player_walk", via: ["hallway", "back_room_east", "doorway_living"], to: "living_room_left", duration: 5.8 },
        { at: 84.0, type: "sfx", sound: "footsteps_fast", volume: 0.45 },

        // Grandpa spots Granny blocking the room and hugs the pizza defensively!
        { at: 86.2, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 86.4, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.25 },
        { at: 86.6, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 1.0 },
        { at: 86.8, type: "sfx", sound: "vine_boom", volume: 0.65 },
        { at: 87.6, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 87.7, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.8, facePlayer: false },

        // Granny plants her hands on her hips and points firmly for the pizza back!
        { at: 89.4, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 89.6, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 89.8, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.2, facePlayer: false },
        { at: 90.2, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.4 },
        { at: 92.2, type: "char_arm", actor: "granny", gesture: "point", duration: 1.6, facePlayer: false },
        { at: 92.5, type: "sfx", sound: "bonk", volume: 0.55 },

        // Grandpa pleads: shrugs pitifully, sniffs the hot pizza, and holds it out to share!
        { at: 94.0, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 94.2, type: "char_arm", actor: "grandpa", gesture: "shrug", duration: 2.0, facePlayer: false },
        { at: 96.4, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.8, facePlayer: false },
        { at: 96.8, type: "sfx", sound: "eat", volume: 0.55 },
        { at: 98.4, type: "char_arm", actor: "grandpa", gesture: "offer", duration: 2.6, facePlayer: false },
        { at: 99.0, type: "char_gesture", actor: "grandpa", gesture: "nod_once", duration: 1.1 },

        // Granny pauses, tilts her head ("Well... okay, let's share!"), then nods YES warmly!
        { at: 101.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 101.4, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.4 },
        { at: 103.0, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 1.4 },
        { at: 103.4, type: "sfx", sound: "checkmark", volume: 0.65 },
        { at: 104.6, type: "char_arm", actor: "granny", gesture: "clap", duration: 2.0, facePlayer: false },

        // Grandpa sets the pizza down onto the living room bench so they can both enjoy it!
        { at: 106.8, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 107.0, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.6, facePlayer: false },
        { at: 107.2, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.4, arc: 0.12 },
        { at: 108.7, type: "sfx", sound: "tada", volume: 0.65 },

        // Peace celebration: Granny & Grandpa clap, nod warmly, and wave goodbye to the camera!
        { at: 109.6, type: "char_face", actor: "grandpa", target: "living_room_left", duration: 0.25 },
        { at: 109.8, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 2.2, facePlayer: false },
        { at: 110.2, type: "char_face", actor: "granny", target: "living_room_left", duration: 0.25 },
        { at: 110.4, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 1.4 },
        { at: 112.4, type: "char_arm", actor: "granny", gesture: "wave", duration: 2.4, facePlayer: false },
        { at: 112.6, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 2.4, facePlayer: false },
        { at: 112.8, type: "sfx", sound: "happy_ending", volume: 0.6 },
        { at: 115.4, type: "char_gesture", actor: "grandpa", gesture: "nod", duration: 1.5 },
        { at: 115.6, type: "char_gesture", actor: "granny", gesture: "nod", duration: 1.5 },
        { at: 117.2, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 1.8, facePlayer: false },
        { at: 117.4, type: "char_gesture", actor: "granny", gesture: "nod", duration: 1.5 },
        { at: 117.5, type: "sfx", sound: "pop", volume: 0.5 },
        { at: 118.8, type: "fade", to: 1, duration: 1.2 },
      ],
    },
  ],
};
