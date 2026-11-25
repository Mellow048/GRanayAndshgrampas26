// "Where's Granny?! + Midnight Pizza Heist" (~74s continuous POV, 1:1 FunnyHorrorAnimation style).
// Built from direct creator direction:
//   - Fast, unmistakable body language (angry scold -> sad/guilty slump -> pizza offer -> shared sofa) — NO slow nodding "talking" loops
//   - Smooth string-pulled steering & real sprint speeds (no 1.0 m/s slow-motion runs)
//   - Player actively steps aside to clear doorways, breaks single-subject robot lock behind walls, and acknowledges both Granny & Grandpa politely
//   - Always faces tables/counters/sofas before placing props down (never behind their back)
//   - No out-of-tone dancing during a guilty confrontation

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
  title: "Granny's Midnight Pizza Heist (POV)",
  duration: 74,
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
    premise: "Grandpa wakes up hungry upstairs, leads his best bud the Player downstairs to the kitchen, and asks where Granny is while eyeing her fresh pizza.",
    goal: "Grandpa snatches the pizza when Granny wakes up, hiding it on the living room sofa before Granny realizes it's gone.",
    resolution: "Granny catches Grandpa red-handed and gets angry, Grandpa gets guilty/sad and offers us pizza, we nod yes, and everyone makes peace warmly.",
    scenes: [
      {
        name: "Act 1: Down the Stairs & Empty Kitchen",
        objective: "Grandpa leads the Player downstairs to check the kitchen and find Granny.",
        obstacle: "Granny isn't in the kitchen — only her hot steaming pizza sits on the counter.",
        turn: "Grandpa asks us 'Where's Granny?' (??? portrait bubble) and plots to snatch the pizza.",
        beats: [
          "Continuous stair walk with natural LOS release around the stairwell wall.",
          "Grandpa spots the pizza, asks where Granny is, and gets mischievous.",
        ],
      },
      {
        name: "Act 2: Pizza Heist & Granny's Fast Sprint",
        objective: "Grandpa grabs the pizza right off the counter while the Player keeps lookout.",
        obstacle: "Granny wakes up in the back bedroom and sprints toward the kitchen.",
        turn: "Player steps aside cleanly while Grandpa bolts down the hall to hide the pizza on the sofa.",
        beats: [
          "Grandpa snatches the pizza straight off kitchen_counter_top and shushes us.",
          "Granny wakes up and sprints rapidly into the kitchen as Grandpa escapes cleanly.",
        ],
      },
      {
        name: "Act 3: Missing Pizza & Fast Hallway Chase",
        objective: "Granny discovers her pizza missing and asks the Player where Grandpa went.",
        obstacle: "The Player playfully feigns ignorance before pointing Granny down the hall.",
        turn: "Granny sprints straight toward the living room while we jog alongside her.",
        beats: [
          "Granny asks the Player (idk shrug + where_grandpa ??? bubble); we shake no then nod down the hall.",
          "Fast chase down back_hall into the living room with zero doorway blocking.",
        ],
      },
      {
        name: "Act 4: Caught Red-Handed & Best-Buds Share",
        objective: "Granny and the Player catch Grandpa holding the stolen pizza by the sofa.",
        obstacle: "Granny gets genuinely angry and scolds Grandpa cleanly until he feels awful.",
        turn: "Grandpa gets sad, offers us the pizza to share, sets it neatly on the sofa, and we nod warmly back to Granny & Grandpa.",
        beats: [
          "Fast emotional beat: angry Granny scolds -> guilty/sad Grandpa -> offers pizza to us -> we nod yes.",
          "Grandpa faces the sofa to set the pizza down cleanly; Granny claps and we nod back to both friends.",
        ],
      },
    ],
  },
  skits: [
    // =========================================================================
    // ACT 1 (0s - 26.8s): Upstairs Wake-Up -> Stairs Walk -> Kitchen Mystery
    // =========================================================================
    {
      name: "Act 1: Down the Stairs & Empty Kitchen",
      room: "upstairs",
      startAt: 0,
      duration: 26.8,
      playerSpawn: "upstairs_west_room",
      playerFacing: "upstairs_hall_center",
      beats: [
        { at: 0.0, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
        { at: 0.0, type: "player_look", target: "grandpa", duration: 0.35, track: true },

        // Fast, lively intro: Grandpa sniffs the air, waves us along, we nod yes!
        { at: 0.4, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.2, facePlayer: true },
        { at: 0.7, type: "sfx", sound: "yummy", volume: 0.68 },
        { at: 1.7, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.2, facePlayer: true },
        { at: 1.9, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },

        // Continuous real-time stairs walk: Player follows right behind Grandpa without sudden re-look flicks;
        // once Grandpa rounds past the stairwell wall, LOS drops smoothly and autoLook pitches ~-24 deg down the steps!
        {
          at: 3.0,
          type: "char_move",
          actor: "grandpa",
          via: ["upstairs_landing", "stairs_top", "stairs_middle", "stairs_bottom", "dining_corner", "dining_table_side", "dining_table_front", "dining_table_ne"],
          to: "kitchen_lane",
          anim: "walk",
          duration: 9.8,
          facePlayer: false,
        },
        {
          at: 4.1,
          type: "player_walk",
          via: ["upstairs_hall_center", "upstairs_landing", "stairs_top", "stairs_middle", "stairs_bottom", "dining_corner", "dining_table_side", "dining_table_front"],
          to: "dining_center",
          duration: 10.2,
        },
        { at: 8.4, type: "sfx", sound: "footsteps_slow", volume: 0.42 },

        // After clearing the stairwell into dining room, Player glances right then spots Grandpa in the kitchen
        { at: 12.6, type: "player_look", yawOffset: 0.36, pitchOffset: -0.02, duration: 0.45 },
        { at: 13.8, type: "player_look", target: "grandpa", duration: 0.45, track: true },

        // Grandpa spots the steaming pizza on kitchen_counter_top and steps closer
        { at: 13.9, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.25 },
        { at: 14.1, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.8 },
        { at: 14.3, type: "sfx", sound: "ding2", volume: 0.6 },
        { at: 15.0, type: "char_move", actor: "grandpa", to: "kitchen", anim: "walk", duration: 1.2, facePlayer: false },
        { at: 15.2, type: "player_walk", to: "dining_table_ne", duration: 1.4 },

        { at: 16.4, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.2 },
        { at: 16.6, type: "char_arm", actor: "grandpa", gesture: "sniff", duration: 1.4, facePlayer: false },
        { at: 17.0, type: "sfx", sound: "eat", volume: 0.5 },

        // Grandpa checks around, turns right to US, zooms slightly, and asks "Where's Granny?"
        { at: 18.2, type: "char_gesture", actor: "grandpa", gesture: "tilt", duration: 0.9 },
        { at: 19.2, type: "player_zoom", fov: 49, duration: 0.35 },
        { at: 19.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 19.5, type: "char_arm", actor: "grandpa", gesture: "idk", duration: 2.0, facePlayer: true },
        { at: 19.6, type: "char_bubble", actor: "grandpa", icon: "where_granny", duration: 2.1 },

        // Player glances toward hall lookout & shakes NO ("Coast is clear!"), zooms out cleanly
        { at: 21.8, type: "player_gesture", gesture: "shake_no", duration: 0.8 },
        { at: 22.8, type: "player_zoom", fov: null, duration: 0.4 },
        { at: 23.0, type: "char_gesture", actor: "grandpa", gesture: "nod_yes", duration: 0.8 },
        { at: 24.0, type: "char_arm", actor: "grandpa", gesture: "clap", duration: 1.3, facePlayer: true },
        { at: 24.2, type: "sfx", sound: "pop", volume: 0.5 },
        { at: 25.4, type: "player_look", yawOffset: 0.38, pitchOffset: -0.02, duration: 0.45 },
      ],
    },

    // =========================================================================
    // ACT 2 (26.8s - 41s): Pizza Snatch -> Granny Wakes & Sprints Fast!
    // =========================================================================
    {
      name: "Act 2: Pizza Heist & Granny's Fast Sprint",
      room: "kitchen",
      startAt: 26.8,
      duration: 14.2,
      beats: [
        // Grandpa turns cleanly to the counter, picks up the pizza, and whispers "shh" to us
        { at: 26.8, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 26.8, type: "char_face", actor: "grandpa", target: "kitchen_counter_top", duration: 0.2 },
        { at: 27.1, type: "char_arm", actor: "grandpa", gesture: "reach_both", duration: 1.0, facePlayer: false, target: "kitchen_counter_top" },
        { at: 27.8, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 27.9, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 1.8, facePlayer: false },
        { at: 28.1, type: "sfx", sound: "whoosh", volume: 0.5 },
        { at: 28.6, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 28.8, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },

        // Player backs cleanly to dining_lane first so Grandpa can sneak past without colliding
        { at: 28.9, type: "player_walk", to: "dining_lane", duration: 0.9 },
        { at: 30.0, type: "char_move", actor: "grandpa", via: ["kitchen_lane"], to: "dining_table_ne", anim: "sneak", duration: 1.6, facePlayer: false },

        // SUDDENLY Granny wakes up in Back Bedroom (`door_creak` + `vine_boom`)!
        { at: 31.8, type: "sfx", sound: "door_creak", volume: 0.72, cutBgm: true, cutBgmDuration: 0.8 },
        { at: 32.0, type: "player_look", yawOffset: -0.45, pitchOffset: 0.0, duration: 0.35 },
        { at: 32.2, type: "player_gesture", gesture: "double_take", duration: 0.65 },
        { at: 32.3, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.75 },

        // Grandpa bolts at real sprint speed (`4.0+ m/s`) out through back_hall -> living_room!
        {
          at: 33.0,
          type: "char_move",
          actor: "grandpa",
          via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living", "living_room_entry"],
          to: "living_room",
          anim: "run",
          duration: 3.4,
          ghostPlayer: true,
          facePlayer: false,
        },
        { at: 33.1, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 33.4, type: "sfx", sound: "footsteps_fast", volume: 0.55 },

        // Player naturally tracks Grandpa briefly -> LOS drops behind dining wall -> Player steps clear to dining_table_front and watches Granny arrive
        { at: 35.8, type: "player_walk", to: "dining_table_front", duration: 1.1 },
        { at: 36.2, type: "player_look", yawOffset: -0.42, pitchOffset: -0.02, duration: 0.4 },

        // Grandpa arrives in Living Room, turns to sofa, and places pizza neatly
        { at: 36.6, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 0.9, facePlayer: false, target: "living_room_sofa" },
        { at: 36.7, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 0.9, arc: 0.12 },

        // Granny SPRINTS fast (`3.7+ m/s`, 2.3s — ZERO slow-motion walk!) straight into the kitchen while Player watches clearly aside!
        {
          at: 35.6,
          type: "char_move",
          actor: "granny",
          via: ["bed_foot", "hall_mid", "hall_corner", "dining_pass", "kitchen_lane"],
          to: "kitchen",
          anim: "run",
          duration: 2.3,
          ghostPlayer: true,
          facePlayer: false,
        },
        { at: 37.2, type: "player_look", target: "granny", duration: 0.4, track: true },
        { at: 37.8, type: "player_gesture", gesture: "peek_lean", duration: 0.8 },
        { at: 38.2, type: "char_face", actor: "granny", target: "kitchen_counter_top", duration: 0.2 },
      ],
    },

    // =========================================================================
    // ACT 3 (39s - 56s): Missing Pizza -> Granny Asks Us -> Fast Hallway Chase
    // =========================================================================
    {
      name: "Act 3: Missing Pizza & Fast Hallway Chase",
      room: "kitchen",
      startAt: 39.0,
      duration: 17.0,
      beats: [
        // Keep pizza steaming cleanly in the living room while Granny sees her empty kitchen counter (`vine_boom`)!
        { at: 39.0, type: "prop_action", prop: "golden_pizza", action: "steam", enabled: true },
        { at: 39.05, type: "char_gesture", actor: "granny", gesture: "double_take", duration: 0.8 },
        { at: 39.2, type: "sfx", sound: "vine_boom", volume: 0.72 },
        { at: 40.0, type: "char_arm", actor: "granny", gesture: "angry_hips", duration: 1.2, facePlayer: false },

        // Player steps up cleanly to dining_center; Granny walks up (`where_grandpa` ??? bubble!)
        { at: 41.2, type: "player_walk", to: "dining_center", duration: 1.0 },
        { at: 41.5, type: "char_move", actor: "granny", via: ["kitchen_lane"], to: "dining_table_ne", anim: "walk", duration: 1.2, facePlayer: false },
        { at: 42.9, type: "player_zoom", fov: 50, duration: 0.35 },
        { at: 42.9, type: "char_face", actor: "granny", followPlayer: true, instant: false },
        { at: 43.1, type: "char_arm", actor: "granny", gesture: "idk", duration: 1.8, facePlayer: true },
        { at: 43.2, type: "char_bubble", actor: "granny", icon: "where_grandpa", duration: 1.9 },

        // Player plays innocent (`shake_no`), zooms back out, looks toward back_hall doorway & nods ("He went that way!")
        { at: 45.2, type: "player_gesture", gesture: "shake_no", duration: 0.75 },
        { at: 46.0, type: "player_zoom", fov: null, duration: 0.35 },
        { at: 46.1, type: "player_look", target: { x: -3.6, y: 1.25, z: -1.2 }, duration: 0.35, track: false },
        { at: 46.5, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },

        // Granny nods FAST, points, and SPRINTS down the hall! Player steps aside cleanly then chases 1.9s behind (zero doorway bottleneck)!
        { at: 47.2, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 47.3, type: "char_gesture", actor: "granny", gesture: "nod_yes", duration: 0.65 },
        { at: 47.4, type: "sfx", sound: "granny_i_see_you", volume: 0.75 },
        { at: 48.0, type: "char_arm", actor: "granny", gesture: "point", duration: 0.75, facePlayer: false },
        { at: 48.2, type: "player_walk", to: "dining_lane", duration: 0.75 },
        { at: 48.9, type: "bgm", sound: "run_amok", volume: 0.2 },

        // Fast, clean Granny sprint (`4.2 m/s`, 3.4s total!) through the hallway to Living Room!
        {
          at: 49.0,
          type: "char_move",
          actor: "granny",
          via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living"],
          to: "living_room_view",
          anim: "run",
          duration: 3.4,
          ghostPlayer: true,
          facePlayer: false,
        },
        { at: 49.1, type: "sfx", sound: "footsteps_fast", volume: 0.5 },

        // Player chases 2.0s behind cleanly through doorway_dining -> living_room_left (`doorway_dining` stagger >= 1.8s!)
        {
          at: 51.0,
          type: "player_walk",
          via: ["dining_center", "doorway_dining", "back_hall_left", "back_hall", "hallway", "back_room_east", "doorway_living", "living_room_entry"],
          to: "living_room_left",
          speed: 3.5,
          duration: 4.5,
        },
        { at: 51.2, type: "player_look", target: "granny", duration: 0.4, track: true },
      ],
    },

    // =========================================================================
    // ACT 4 (56s - 74s): Fast Clear Emotions (Angry -> Sad -> Offer -> Best Buds)
    // =========================================================================
    {
      name: "Act 4: Caught Red-Handed & Best-Buds Peace",
      room: "living_room",
      startAt: 56.0,
      duration: 18.0,
      beats: [
        // Player arrives cleanly in living_room_left -> Grandpa picks up stolen pizza (`AHA!`)
        { at: 55.6, type: "player_look", target: "grandpa", duration: 0.4, track: true },
        { at: 55.7, type: "char_face", actor: "grandpa", targetActor: "granny", duration: 0.2 },
        { at: 55.8, type: "char_gesture", actor: "grandpa", gesture: "double_take", duration: 0.75 },
        { at: 56.0, type: "sfx", sound: "grandpa_aha", volume: 0.85 },
        { at: 56.6, type: "prop_action", prop: "golden_pizza", action: "attach", actor: "grandpa", offset: [0, 0.04, 0.24] },
        { at: 56.7, type: "char_arm", actor: "grandpa", gesture: "carry", duration: 1.5, facePlayer: false },

        // FAST EMOTION 1: Granny gets ANGRY immediately (NO confusing nodding loop!)
        { at: 57.9, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 58.0, type: "char_face", actor: "granny", targetActor: "grandpa", duration: 0.2 },
        { at: 58.1, type: "char_anim", actor: "granny", anim: "angry", duration: 1.6, facePlayer: false },
        { at: 58.2, type: "char_arm", actor: "granny", gesture: "scold", duration: 1.5, facePlayer: false },
        { at: 58.3, type: "sfx", sound: "bonk", volume: 0.6 },

        // FAST EMOTION 2: Grandpa immediately turns SAD / GUILTY (slumped shoulders + bowed head + aww!)
        { at: 60.0, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 60.2, type: "char_arm", actor: "grandpa", gesture: "sad", duration: 1.8, facePlayer: false },
        { at: 60.2, type: "char_gesture", actor: "grandpa", gesture: "sad", duration: 1.8 },
        { at: 60.3, type: "sfx", sound: "aww", volume: 0.7 },

        // Grandpa turns to US, perks up, and OFFERS us pizza! We glance at Granny to include her, then nod YES!
        { at: 62.3, type: "bgm", sound: "fluffing_a_duck", volume: 0.2 },
        { at: 62.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: false },
        { at: 62.5, type: "char_arm", actor: "grandpa", gesture: "offer", duration: 2.3, facePlayer: true },
        { at: 62.7, type: "sfx", sound: "pop", volume: 0.55 },
        { at: 63.6, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 64.5, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 64.9, type: "player_gesture", gesture: "nod_yes", duration: 0.75 },

        // Grandpa faces the sofa cleanly BEFORE setting the pizza down (zero behind-the-back throwing, NO weird dance!)
        { at: 66.0, type: "char_face", actor: "grandpa", target: "living_room_sofa", duration: 0.2 },
        { at: 66.2, type: "char_arm", actor: "grandpa", gesture: "place_down", duration: 1.1, facePlayer: false, target: "living_room_sofa" },
        { at: 66.3, type: "prop_action", prop: "golden_pizza", action: "glide", fromActor: "grandpa", to: "living_room_sofa", duration: 1.0, arc: 0.1 },
        { at: 67.3, type: "sfx", sound: "ding2", volume: 0.65 },

        // Granny steps over, claps warmly at us — and we LOOK DIRECTLY AT GRANNY AND NOD BACK, then Grandpa waves warmly!
        { at: 67.5, type: "char_move", actor: "granny", to: "living_room_right", anim: "walk", duration: 0.9, facePlayer: false },
        { at: 68.5, type: "player_look", target: "granny", duration: 0.35, track: true },
        { at: 68.6, type: "char_arm", actor: "granny", gesture: "clap", duration: 2.0, facePlayer: true },
        { at: 68.8, type: "sfx", sound: "tada", volume: 0.62 },
        { at: 69.2, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },

        { at: 70.6, type: "player_look", target: "grandpa", duration: 0.35, track: true },
        { at: 70.7, type: "char_arm", actor: "grandpa", gesture: "wave", duration: 1.8, facePlayer: true },
        { at: 71.1, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
        { at: 72.7, type: "fade", to: 1, duration: 1.2 },
      ],
    },
  ],
};
