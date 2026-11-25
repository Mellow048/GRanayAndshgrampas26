// "Where's Granny?! + Midnight Pizza Heist" (~2 minutes / 120s, 4 seamless 30s continuous acts).
// Built 1:1 on FunnyHorrorAnimation storytelling principles:
//   - Player continuously walks with the characters through the REAL multi-floor house
//     (Upstairs Hall -> Wooden Staircase -> Kitchen -> Dining -> Back Hall -> Living Room)
//   - Player is a living participant (shakes no, nods yes, peeks, zooms for close-ups, clears furniture)
//   - Strategic high-impact thought bubbles (`where_granny` + `???`, `shh`, `where_grandpa` + `???`, `pizza`)
//   - True character-space head nods/shakes + shoulder-lifted `idk` shrug + Mixamo Chicken Dance finale
//   - Zero furniture phasing, zero teleport cuts, zero confusing room-crossings

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
  playerSpawn: "upstairs_west_room",
  playerFacing: "upstairs_hall_center",
  cast: [
    { id: "grandpa", asset: "grandpa", spawn: "upstairs_hall_center", facing: "upstairs_west_room" },
    { id: "granny", asset: "granny", spawn: "bed_side", facing: "bed_foot" },
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
    premise: "Grandpa wakes up hungry upstairs, leads the Player down to the kitchen, and wonders where Granny is while eyeing her fresh pizza.",
    goal: "Grandpa tries to sneak away with the golden pizza when Granny wakes up in the back bedroom.",
    resolution: "Granny asks the Player where Grandpa went, follows us to the living room sofa, and shares the pizza in a victory dance.",
    scenes: [
      {
        name: "Act 1: Down the Stairs & Empty Kitchen",
        objective: "Grandpa beckons the Player downstairs to inspect the kitchen and look for Granny.",
        obstacle: "Granny is nowhere in the kitchen, only her hot steaming pizza sits on the counter.",
        turn: "Grandpa asks the Player 'Where is Granny?' with a ??? portrait bubble and eyes the pizza.",
        beats: [
          "Grandpa leads the Player down the wooden staircase into the kitchen.",
          "Grandpa asks us where Granny is (`where_granny` ??? bubble) and decides to snatch the pizza.",
        ],
      },
      {
        name: "Act 2: Pizza Grab & Granny Wakes Up!",
        objective: "Grandpa grabs the pizza and brings it out while the Player walks right alongside him.",
        obstacle: "Granny wakes up in the far back bedroom and footsteps echo toward the kitchen.",
        turn: "Grandpa panics and escapes to hide the pizza on the living room sofa while Granny enters the empty kitchen.",
        beats: [
          "Grandpa grabs the pizza off the counter and places it on the dining table.",
          "Granny wakes up in the back room; Grandpa bolts to the living room while we watch Granny arrive.",
        ],
      },
      {
        name: "Act 3: Pizza Missing & Granny Asks Us!",
        objective: "Granny realizes her pizza is gone and asks the Player where Grandpa went.",
        obstacle: "The Player plays innocent before tipping Granny off down the main hallway.",
        turn: "The Player and Granny walk together through the hall toward the living room.",
        beats: [
          "Granny walks straight up to us with an idk shrug and `where_grandpa` ??? portrait bubble.",
          "We shake no, look/nod down the hall, and walk together toward the living room.",
        ],
      },
      {
        name: "Act 4: Living Room Standoff & Peace Dance",
        objective: "Granny and the Player corner Grandpa beside the living room sofa with the pizza.",
        obstacle: "Grandpa hugs the pizza defensively and Granny demands it back.",
        turn: "Grandpa offers to share, the Player nods yes, and Grandpa celebrates with the Chicken Dance.",
        beats: [
          "Granny catches Grandpa by the living room sofa and scolds him.",
          "Grandpa offers a peace slice, we nod yes, and everyone celebrates together.",
        ],
      },
    ],
  },
  skits: [
    // =========================================================================
    // ACT 1 (0s - 30s): Upstairs Wake-Up -> Stairs Walk -> Kitchen Mystery
    // =========================================================================
    {
      name: "Act 1: Down the Stairs & Empty Kitchen",
      room: "upstairs",
      startAt: 0,
      duration: 30,
      playerSpawn: "upstairs_west_room",
      playerFacing: "upstairs_hall_center",
      beats: [
        { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
        { at: 0.0, type: "player_look", target: "grandpa", duration: 0.35, track: true },

        // Grandpa wakes up hungry upstairs and waves for the Player to follow him downstairs
        { at: 0.4, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.5, facePlayer: true },
        { at: 0.8, type: "sfx", sound: "yummy", volume: 0.68 },
        { at: 2.0, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.4, facePlayer: true },
        { at: 2.2, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },

        // Continuous real-time 1st-person stair descent: Grandpa leads, Player walks smoothly behind!
        {
          at: 3.4,
          type: "char_move",
          actor: "grandpa",
          via: ["upstairs_landing", "stairs_top", "stairs_middle", "stairs_bottom", "dining_corner", "dining_table_side", "dining_table_front", "dining_table_ne"],
          to: "kitchen_lane",
          anim: "walk",
          duration: 11.2,
          facePlayer: false,
        },
        {
          at: 5.2,
          type: "player_walk",
          via: ["upstairs_hall_center", "upstairs_landing", "stairs_top", "stairs_middle", "stairs_bottom", "dining_corner", "dining_table_side", "dining_table_front"],
          to: "dining_center",
          duration: 11.0,
        },
        { at: 5.4, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 9.0, type: "sfx", sound: "footsteps_slow", volume: 0.45 },

        // Once Grandpa rounds the stairwell corner out of sight, LOS releases auto-tracking -> Player scans naturally!
        { at: 13.6, type: "player_look", yawOffset: 0.36, pitchOffset: -0.02, duration: 0.45 },

        // Grandpa reaches the kitchen, spots the steaming pizza on the counter, and steps closer
        { at: 14.9, type: "player_look", target: "grandpa", duration: 0.45, track: true },
        { at: 15.0, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.25 },
        { at: 15.2, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
        { at: 15.4, type: "sfx", sound: "ding2", volume: 0.6 },
        { at: 16.5, type: "char_move", actor: "grandpa", to: "kitchen", anim: "walk", duration: 1.5, facePlayer: false },

        // Player steps right up cleanly to dining_table_ne (1.8m away, clear of dining table!) to see the counter up close!
        { at: 16.8, type: "player_walk", to: "dining_table_ne", duration: 1.6 },
        { at: 18.6, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.25 },
        { at: 18.8, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.8, facePlayer: false },
        { at: 19.2, type: "sfx", sound: "eat", volume: 0.55 },

        // Grandpa checks around, turns right TO US, zooms closer, and asks "??? Where's Granny?"
        { at: 20.8, type: "char_gesture", actor: "grandpa", gesture: "tilt", duration: 1.0 },
        { at: 21.8, type: "player_zoom", fov: 49, duration: 0.4 },
        { at: 21.9, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 22.1, type: "char_arm", actor: "grandpa", gesture: "idk", duration: 2.2, facePlayer: true },
        { at: 22.2, type: "char_bubble", actor: "grandpa", icon: "where_granny", duration: 2.3 },

        // Player looks around ("Not here!") and shakes NO, then zooms cleanly back before Act 2 seam!
        { at: 24.4, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
        { at: 25.4, type: "player_zoom", fov: null, duration: 0.55 },
        { at: 25.6, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 1.0 },
        { at: 26.8, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 1.8, facePlayer: true },
        { at: 27.0, type: "sfx", sound: "pop", volume: 0.5 },
        // Clean hold into 30.0s chunk handoff
        { at: 28.8, type: "char_face", actor: "grandpa", target: "dining_table_ne", duration: 0.2 },
        { at: 28.8, type: "player_look", target: "grandpa", duration: 0.35, track: false },
      ],
    },

    // =========================================================================
    // ACT 2 (30s - 60s): Grabbing Pizza -> Granny Wakes Up -> Living Room Hide
    // =========================================================================
    {
      name: "Act 2: Pizza Grab & Granny Wakes Up!",
      room: "kitchen",
      startAt: 30,
      duration: 30,
      playerSpawn: "dining_table_ne",
      playerFacing: "grandpa",
      beats: [
        // Grandpa grabs the steaming pizza off kitchen_counter_top and shushes the Player!
        { at: 30.0, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.2 },
        { at: 30.2, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 30.6, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.4, facePlayer: false },
        { at: 31.4, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 31.5, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.2, facePlayer: false },
        { at: 31.7, type: "sfx", sound: "whoosh", volume: 0.5 },
        { at: 32.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 32.4, type: "char_bubble", actor: "grandpa", icon: "shh", duration: 1.6 },
        { at: 32.7, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },

        // Player steps clear to dining_lane while Grandpa carries pizza cleanly around the dining table to dining_table_front
        { at: 34.0, type: "player_walk", to: "dining_lane", duration: 1.4 },
        { at: 34.8, type: "char_move", actor: "grandpa", via: ["kitchen_lane", "dining_table_ne", "dining_table_btn"], to: "dining_table_front", anim: "walk", duration: 3.0, facePlayer: false },
        { at: 37.9, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.3, facePlayer: false },
        { at: 38.0, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "dining_table_top", duration: 1.2, arc: 0.14 },
        { at: 39.2, type: "sfx", sound: "checkmark", volume: 0.55 },

        // Far away in the Back Bedroom (bed_side), Granny wakes up and heads toward Kitchen (via dining_pass -> kitchen_lane, clear of fridge wall!)
        { at: 41.2, type: "sfx", sound: "door_creak", volume: 0.68 },
        { at: 41.3, type: "char_move", actor: "granny", via: ["bed_foot", "hall_mid", "hall_corner", "dining_pass", "kitchen_lane"], to: "kitchen", anim: "walk", duration: 12.2, facePlayer: false },

        // Both Player & Grandpa hear Granny coming!
        { at: 41.6, type: "player_look", target: { x: -4.7, y: 1.25, z: 0.5 }, duration: 0.35, track: false },
        { at: 41.8, type: "player_gesture", gesture: "double_take", duration: 0.7 },
        { at: 42.3, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 42.4, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },

        // Grandpa snatches the pizza back and flees through doorway_dining -> back_hall -> living room (west hall wall hides him from Granny!)
        { at: 43.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 43.3, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.0, facePlayer: false },
        { at: 44.0, type: "char_move", actor: "grandpa", via: ["dining_table_btn", "dining_table_ne", "dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living", "living_room_entry"], to: "living_room", anim: "run", duration: 11.5, facePlayer: false },
        { at: 45.0, type: "sfx", sound: "footsteps_fast", volume: 0.5 },

        // Player glances toward where Grandpa bolted after LOS breaks, walks to dining_center, then hears Granny from kitchen_lane
        { at: 46.2, type: "player_look", yawOffset: 0.32, pitchOffset: -0.02, duration: 0.45 },
        { at: 47.0, type: "player_walk", to: "dining_center", duration: 1.6 },
        { at: 48.6, type: "player_look", yawOffset: -0.45, pitchOffset: -0.02, duration: 0.45 },
        { at: 50.0, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 50.4, type: "player_gesture", gesture: "peek_lean", duration: 1.0 },

        // Grandpa places pizza on the living room sofa safely on the other side of the house!
        { at: 55.6, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.2, arc: 0.12 },
        { at: 56.8, type: "char_face", actor: "grandpa", target: "living_room_entry", duration: 0.2 },

        // Keep exact clean rest state at 59.0-60.0 for seamless Act 3 entry
        { at: 58.6, type: "char_face", actor: "granny", target: "kitchen_counter_top", duration: 0.25 },
        { at: 58.8, type: "player_look", target: "granny", duration: 0.35, track: false },
      ],
    },

    // =========================================================================
    // ACT 3 (60s - 90s): Granny Spots Missing Pizza, Asks Us -> Leads Chase!
    // =========================================================================
    {
      name: "Act 3: Pizza Missing & Granny Asks Us!",
      room: "kitchen",
      startAt: 60,
      duration: 30,
      playerSpawn: "dining_center",
      playerFacing: "granny",
      beats: [
        // Keep pizza anchored in Act 3 state + Granny inspects her empty counter!
        { at: 60.0, type: "prop_action", prop: "golden_pizza", action: "reset", waypoint: "living_room_sofa", visible: true },
        { at: 60.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 60.4, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 1.0 },
        { at: 60.5, type: "sfx", sound: "vine_boom", volume: 0.72 },
        { at: 61.6, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 1.8, facePlayer: false },

        // Granny walks right up to THE PLAYER in dining_center (via kitchen_lane -> dining_table_ne, clear of table!)
        { at: 63.6, type: "char_move", actor: "granny", via: ["kitchen_lane"], to: "dining_table_ne", anim: "walk", duration: 2.2, facePlayer: false },
        { at: 66.0, type: "player_zoom", fov: 49, duration: 0.45 },
        { at: 66.0, type: "char_face", actor: "granny", followPlayer: true, instant: false },
        { at: 66.2, type: "char_arm", actor: "granny", gesture: "idk", duration: 2.2, facePlayer: true },
        { at: 66.3, type: "char_bubble", actor: "granny", icon: "where_grandpa", duration: 2.3 },

        // Player plays innocent ("shake_no"), returns zoom to default, looks down hall doorway & nods ("He went that way!")
        { at: 68.0, type: "player_gesture", gesture: "shake_no", duration: 0.9 },
        { at: 69.0, type: "player_zoom", fov: null, duration: 0.45 },
        { at: 69.1, type: "player_look", target: { x: -3.6, y: 1.25, z: -1.2 }, duration: 0.35, track: false },
        { at: 69.4, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },

        // Granny gets it! Nods sharply, points, and storms down the main hall with Player right behind her!
        { at: 70.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 70.3, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 0.9 },
        { at: 70.4, type: "sfx", sound: "granny_i_see_you", volume: 0.75 },
        { at: 71.2, type: "char_arm", actor: "granny", gesture: "point", duration: 1.0, facePlayer: false },

        // Continuous hallway chase walk: Granny leads through back hall to back_room_east; Player follows 2.4s behind cleanly
        {
          at: 72.4,
          type: "char_move",
          actor: "granny",
          via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway"],
          to: "back_room_east",
          anim: "run",
          duration: 12.0,
          facePlayer: false,
        },
        { at: 73.2, type: "sfx", sound: "footsteps_fast", volume: 0.5 },
        {
          at: 74.8,
          type: "player_walk",
          via: ["doorway_dining", "back_hall_left", "back_hall"],
          to: "hallway",
          duration: 11.5,
        },
        { at: 75.0, type: "player_look", target: "granny", duration: 0.4, track: true },

        // Clean hold in the hall at 87.5-90.0 before bursting into the living room
        { at: 87.5, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 88.6, type: "char_face", actor: "granny", target: "doorway_living", duration: 0.25 },
      ],
    },

    // =========================================================================
    // ACT 4 (90s - 120s): Living Room Standoff, Player Ties It Up & Chicken Dance!
    // =========================================================================
    {
      name: "Act 4: Living Room Standoff & Peace Dance",
      room: "living_room",
      startAt: 90,
      duration: 30,
      playerSpawn: "hallway",
      playerFacing: "granny",
      beats: [
        // Granny enters the Living Room; Player follows 2.0s behind cleanly into living_room_left
        { at: 90.0, type: "char_move", actor: "granny", via: ["doorway_living", "living_room_entry"], to: "living_room_view", anim: "walk", duration: 4.0, facePlayer: false },
        { at: 90.4, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 92.2, type: "player_walk", via: ["back_room_east", "doorway_living", "living_room_entry"], to: "living_room_left", duration: 4.4 },

        // Grandpa pops up by the sofa holding the pizza (`AHA!`)
        { at: 95.8, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 96.0, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.25 },
        { at: 96.2, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.9 },
        { at: 96.3, type: "sfx", sound: "grandpa_aha", volume: 0.85 },
        { at: 97.2, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 97.3, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 2.2, facePlayer: false },

        // Granny hands on hips, shakes NO crisply, and points sternly
        { at: 98.8, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 99.0, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 99.2, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 2.0, facePlayer: false },
        { at: 99.6, type: "char_gesture", actor: "granny", gesture: "shake_no", duration: 1.3 },
        { at: 101.2, type: "char_arm", actor: "granny", gesture: "point", duration: 1.4, facePlayer: false },
        { at: 101.4, type: "sfx", sound: "bonk", volume: 0.55 },

        // Grandpa does a tucked-elbow idk shrug, then holds pizza out with a "share?" pizza bubble
        { at: 102.6, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 102.8, type: "char_arm", actor: "grandpa", gesture: "idk", duration: 1.8, facePlayer: false },
        { at: 104.8, type: "char_arm", actor: "grandpa", gesture: "offer", duration: 2.4, facePlayer: false },
        { at: 105.0, type: "char_bubble", actor: "grandpa", icon: "pizza", duration: 1.8 },

        // Granny turns briefly to the Player; we nod YES (`nod_yes`), she agrees (`ding2`!)
        { at: 106.8, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 107.0, type: "char_face", actor: "granny", followPlayer: true, instant: false },
        { at: 107.2, type: "char_gesture", actor: "granny", gesture: "tilt", duration: 1.2 },
        { at: 108.0, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
        { at: 108.8, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 1.2 },
        { at: 109.0, type: "sfx", sound: "ding2", volume: 0.65 },

        // Grandpa sets the pizza on living_room_sofa -> LET'S GO + Chicken Dance finale!
        { at: 110.2, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 110.3, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.3, facePlayer: false },
        { at: 110.4, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.1, arc: 0.12 },
        { at: 111.7, type: "sfx", sound: "lets_go", volume: 0.8 },
        { at: 111.9, type: "char_anim", actor: "grandpa", anim: "chicken_dance", loop: true, duration: 5.5, facePlayer: true },
        { at: 112.0, type: "char_move", actor: "granny", to: "living_room_right", anim: "walk", duration: 1.0, facePlayer: false },
        { at: 113.2, type: "char_face", actor: "granny", target: "living_room_left", duration: 0.25 },
        { at: 113.4, type: "char_arm", actor: "granny", gesture: "wave", duration: 2.4, facePlayer: true },
        { at: 114.2, type: "player_gesture", gesture: "nod_yes", duration: 0.9 },
        { at: 116.0, type: "char_arm", actor: "granny", gesture: "clap", duration: 2.2, facePlayer: true },
        { at: 116.2, type: "sfx", sound: "tada", volume: 0.6 },
        { at: 117.4, type: "char_gesture", actor: "granny", gesture: "nod", duration: 1.4 },
        { at: 118.8, type: "fade", to: 1, duration: 1.2 },
      ],
    },
  ],
};
