/**
 * Centralized configuration, real asset manifests, SFX catalog, indoor SET_MAP waypoints,
 * and built-in POV & Shorts episode presets.
 */

export const CONFIG = {
  threeVersion: "0.170.0",
  fixedStepHz: 60,
  fixedDt: 1 / 60,
  maxFrameDt: 0.05,
  defaultFadeDuration: 0.18,
  defaultAspect: "16:9",
  aspectModes: {
    "16:9": { width: 1280, height: 720, aspect: 16 / 9, fov: 64, label: "16:9 YouTube POV" },
    "9:16": { width: 720, height: 1280, aspect: 9 / 16, fov: 56, label: "9:16 Vertical Shorts" },
  },
  exportWidth: 1280,
  exportHeight: 720,
  exportFps: 30,
  playerEyeHeight: 1.5,
  playerCrouchHeight: 0.42,
  house: {
    scale: 0.42,
    groundFloorRawY: 13.32,
  },
  sfxPacer: {
    enabledByDefault: true,
    minIntervalSec: 1.2,
    maxIntervalSec: 1.85,
    footstepIntervalWalk: 0.44,
    footstepIntervalRun: 0.28,
    footstepIntervalSneak: 0.56,
    globalCooldownSec: 0.16,
    masterVolume: 0.85,
  },
};

/**
 * Real 3D models & Mixamo FBX animation templates discovered in ./Assets.
 */
export const ASSET_MANIFEST = {
  house: {
    id: "granny_house",
    fbxPath: "./Assets/granny-1-house/source/GrannyHouse.fbx",
    textureDir: "./Assets/granny-1-house/textures/",
    textureAliases: {},
  },

  characters: {
    granny: {
      id: "granny",
      label: "Granny",
      fbxPath: "./Assets/granny-animated-fbx/source/GrannyTest6.fbx",
      textureDir: "./Assets/granny-animated-fbx/textures/",
      textureAliases: {
        // GrannyTest6.fbx references _Normal.png while disk file is _Norm.png
        "TexturesCom_WoodFine0077_6_seamless_S_Normal.png":
          "TexturesCom_WoodFine0077_6_seamless_S_Norm.png",
      },
      targetHeight: 1.65,
      // Raw GrannyTest6 faces +X; rotate -90 deg on Y so forward aligns with +Z
      forwardYawOffset: -Math.PI * 0.5,
      // Bake raw SkinnedMesh bindMatrix to its world transform before normalizing scale
      fixBindMatrixToWorld: true,
      headBoneName: "Bip01_Head",
      rigType: "bip01",
      boneMap: {
        Bip01_Pelvis: "mixamorigHips",
        Bip01_Spine: "mixamorigSpine",
        Bip01_Spine1: "mixamorigSpine1",
        Bip01_Spine2: "mixamorigSpine2",
        Bip01_Neck: "mixamorigNeck",
        Bip01_Head: "mixamorigHead",
        Bip01_L_Clavicle: "mixamorigLeftShoulder",
        Bip01_L_UpperArm: "mixamorigLeftArm",
        Bip01_L_Forearm: "mixamorigLeftForeArm",
        Bip01_L_Hand: "mixamorigLeftHand",
        Bip01_R_Clavicle: "mixamorigRightShoulder",
        Bip01_R_UpperArm: "mixamorigRightArm",
        Bip01_R_Forearm: "mixamorigRightForeArm",
        Bip01_R_Hand: "mixamorigRightHand",
        Bip01_L_Thigh: "mixamorigLeftUpLeg",
        Bip01_L_Calf: "mixamorigLeftLeg",
        Bip01_L_Foot: "mixamorigLeftFoot",
        Bip01_R_Thigh: "mixamorigRightUpLeg",
        Bip01_R_Calf: "mixamorigRightLeg",
        Bip01_R_Foot: "mixamorigRightFoot",
      },
      alignChains: [
        "Bip01_L_UpperArm",
        "Bip01_L_Forearm",
        "Bip01_R_UpperArm",
        "Bip01_R_Forearm",
        "Bip01_L_Thigh",
        "Bip01_L_Calf",
        "Bip01_R_Thigh",
        "Bip01_R_Calf",
      ],
      embeddedClipAliases: {
        idle: "idle",
        hit: "Hit",
        look: "Look",
        look_bed: "lookBed",
        granny_walk: "Walk",
      },
    },

    grandpa: {
      id: "grandpa",
      label: "Grandpa",
      fbxPath: "./Assets/grandpa-official-model-rigged-granny-3/source/grandpach3.fbx",
      textureDir: "./Assets/grandpa-official-model-rigged-granny-3/textures/",
      textureAliases: {},
      targetHeight: 1.72,
      // grandpach3.fbx already faces +Z
      forwardYawOffset: 0,
      fixBindMatrixToWorld: false,
      headBoneName: "granpaHead",
      rigType: "grandpa_blender",
      boneMap: {
        Bone: "mixamorigHips",
        Spine1: "mixamorigSpine",
        Spine2: "mixamorigSpine2",
        Neck: "mixamorigNeck",
        granpaHead: "mixamorigHead",
        Shoulder_L: "mixamorigLeftShoulder",
        upArm_L: "mixamorigLeftArm",
        lowArm_L: "mixamorigLeftForeArm",
        hand_L: "mixamorigLeftHand",
        Shoulder_R: "mixamorigRightShoulder",
        upArm_R_001: "mixamorigRightArm",
        lowArm_R_001: "mixamorigRightForeArm",
        hand_R_001: "mixamorigRightHand",
        upLeg_L: "mixamorigLeftUpLeg",
        lowLeg_L: "mixamorigLeftLeg",
        foot_L: "mixamorigLeftFoot",
        upLeg_R_001: "mixamorigRightUpLeg",
        lowLeg_R_001: "mixamorigRightLeg",
        foot_R_001: "mixamorigRightFoot",
      },
      alignChains: [
        "upArm_L",
        "lowArm_L",
        "upArm_R_001",
        "lowArm_R_001",
        "upLeg_L",
        "lowLeg_L",
        "upLeg_R_001",
        "lowLeg_R_001",
      ],
      embeddedClipAliases: {},
    },
  },

  animations: {
    walk: {
      path: "./Assets/AnimationTemplates/Walk.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    run: {
      path: "./Assets/AnimationTemplates/Fast Run.fbx",
      loop: true,
      defaultSpeed: 0.9,
    },
    run2: {
      path: "./Assets/AnimationTemplates/Fast Run.fbx",
      loop: true,
      defaultSpeed: 1.18,
    },
    sneak: {
      path: "./Assets/AnimationTemplates/Sneak.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    jump: {
      path: "./Assets/AnimationTemplates/Jumping.fbx",
      loop: false,
      defaultSpeed: 1.0,
      preserveJumpArc: true,
    },
    laugh: {
      path: "./Assets/AnimationTemplates/Laughing.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    punch: {
      path: "./Assets/AnimationTemplates/Punching.fbx",
      loop: false,
      defaultSpeed: 1.05,
    },
    sit: {
      path: "./Assets/AnimationTemplates/Sitting.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    terrified: {
      path: "./Assets/AnimationTemplates/Terrified.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
  },
};

/**
 * Exact audio files in ./SoundEffects with category metadata.
 */
export const SFX_MANIFEST = {
  checkmark: { path: "./SoundEffects/Checkmark.mp3", category: "ui", defaultVolume: 0.65 },
  ding: { path: "./SoundEffects/DING.mp3", category: "pop", defaultVolume: 0.72 },
  eat: { path: "./SoundEffects/Eat sound (not continous).mp3", category: "comedy", defaultVolume: 0.75 },
  click: { path: "./SoundEffects/Mouse Click.mp3", category: "ui", defaultVolume: 0.55 },
  pop: { path: "./SoundEffects/Pop.mp3", category: "pop", defaultVolume: 0.8 },
  tada: { path: "./SoundEffects/Tada!.mp3", category: "comedy", defaultVolume: 0.72 },
  bonk: { path: "./SoundEffects/bonk_7zPAD7C.mp3", category: "impact", defaultVolume: 0.88 },
  discord: { path: "./SoundEffects/discord-notification.mp3", category: "alert", defaultVolume: 0.72 },
  glitch: { path: "./SoundEffects/error-glitch.mp3", category: "alert", defaultVolume: 0.68 },
  granny_good_part: { path: "./SoundEffects/granny-ambience-but-its-only-the-good-part.mp3", category: "bgm", defaultVolume: 0.25 },
  granny_ambience: { path: "./SoundEffects/granny-ambience.mp3", category: "bgm", defaultVolume: 0.22 },
  granny_chase: { path: "./SoundEffects/granny-chase-music.mp3", category: "bgm", defaultVolume: 0.28 },
  granny_i_see_you: { path: "./SoundEffects/granny-i-see-you.mp3", category: "voice", defaultVolume: 0.9 },
  jumpscare: { path: "./SoundEffects/granny-jumpscare-sound-effect.mp3", category: "sting", defaultVolume: 0.78 },
  granny_laugh: { path: "./SoundEffects/granny-laugh.mp3", category: "voice", defaultVolume: 0.88 },
  kaching: { path: "./SoundEffects/kaching-sound-fx.mp3", category: "comedy", defaultVolume: 0.72 },
  typing: { path: "./SoundEffects/keyboard-Typing.mp3", category: "filler", defaultVolume: 0.45 },
  explode: { path: "./SoundEffects/minecraft-explode1.mp3", category: "impact", defaultVolume: 0.8 },
  explode_meme: { path: "./SoundEffects/minecraft-explosion-meme-sound-effect.mp3", category: "impact", defaultVolume: 0.75 },
  rizz: { path: "./SoundEffects/rizz-sound-effect.mp3", category: "comedy", defaultVolume: 0.75 },
  squidward_walk: { path: "./SoundEffects/squidward-walk-effect.mp3", category: "step", defaultVolume: 0.55 },
  aww: { path: "./SoundEffects/studio-audience-awwww-sound-fx.mp3", category: "comedy", defaultVolume: 0.72 },
  swoosh: { path: "./SoundEffects/swoosh-sound-effects.mp3", category: "cut", defaultVolume: 0.68 },
  vine_boom: { path: "./SoundEffects/vine Boom.mp3", category: "boom", defaultVolume: 0.85 },
  whoosh: { path: "./SoundEffects/whoosh-wind.mp3", category: "cut", defaultVolume: 0.65 },
};

/**
 * Calibrated INDOOR waypoints inside Granny 1 House (y = 0 is Main Ground Floor).
 * Episode JSON scripts MUST reference these waypoint names rather than raw coordinates.
 */
export const SET_MAP = {
  foyer: { x: -0.8, y: 0.0, z: 0.2, label: "Front Foyer" },
  hallway: { x: 0.8, y: 0.0, z: -2.4, label: "Main Back Hall" },
  back_hall: { x: 0.0, y: 0.0, z: -2.2, label: "Back Room Center" },
  back_hall_left: { x: -0.8, y: 0.0, z: -3.5, label: "Back Room Far Left" },
  back_hall_right: { x: 0.6, y: 0.0, z: -2.6, label: "Back Room Right" },
  back_room_east: { x: 3.2, y: 0.0, z: -1.8, label: "Back Hall East" },
  back_room_east_right: { x: 4.0, y: 0.0, z: -1.6, label: "Back Hall East Right" },
  doorway_living: { x: 4.2, y: 0.0, z: -1.0, label: "Living Room Doorway Center" },
  living_room_entry: { x: 4.8, y: 0.0, z: 0.2, label: "Living Room Entry" },
  living_room_view: { x: 5.4, y: 0.0, z: 0.6, label: "Living Room Vantage" },
  living_room_left: { x: 4.1, y: 0.0, z: 0.4, label: "Living Room Left" },
  living_room_right: { x: 5.2, y: 0.0, z: 0.4, label: "Living Room Right" },
  living_room: { x: 5.4, y: 0.0, z: 2.0, label: "Living Room" },
  living_room_ball_bounce: { x: 5.5, y: 0.0, z: 1.7, label: "Emoji Ball Bounce Spot" },
  granny_living_burst: { x: 4.2, y: 0.0, z: -0.7, label: "Living Room Doorway Inside" },
  chest_spot: { x: 6.2, y: 0.0, z: 2.6, label: "Mystery Chest Spot" },
  chest_padlock: { x: 5.95, y: 0.0, z: 2.35, label: "Chest Padlock" },
  grandpa_chest_side: { x: 4.3, y: 0.0, z: 2.5, label: "Grandpa Beside Chest" },
  grandpa_step_back: { x: 4.0, y: 0.0, z: 2.9, label: "Grandpa Stepped Back" },
  doorway_dining: { x: -3.0, y: 0.0, z: -1.2, label: "Dining Doorway Center" },
  dining_center: { x: -3.6, y: 0.0, z: 0.4, label: "Dining Room Center" },
  hide_table: { x: -4.2, y: 0.0, z: 2.3, label: "Under Dining Table (Outward)" },
  kitchen_lane: { x: -5.8, y: 0.0, z: 0.8, label: "Kitchen Lane" },
  kitchen: { x: -6.4, y: 0.0, z: 1.4, label: "Kitchen Counter Front" },
  key_spot: { x: -7.35, y: 1.13, z: 1.4, label: "Kitchen Counter Top (Key)" },
  dining_nook: { x: -3.4, y: 0.0, z: -1.6, label: "Dining Doorway" },
  under_bed: { x: -3.2, y: 0.0, z: -2.8, label: "Beside Bed (Hide)" },
  stairs: { x: -3.4, y: 0.0, z: -2.6, label: "Stair Hall" },
  bedroom: { x: -4.2, y: 2.85, z: 2.1, label: "Upstairs Bedroom" },
};

/**
 * 44-second Viral-Style First-Person POV Kids Comedy Episode:
 * "Grandpa's Mystery Chest (44s POV)"
 */
export const GRANDPA_KEY_POV_44S = {
  title: "Grandpa's Mystery Chest (44s POV)",
  aspect: "16:9",
  playerSpawn: "back_room_east",
  playerFacing: "doorway_living",
  cast: [
    { id: "grandpa", asset: "grandpa", spawn: "grandpa_chest_side", facing: "living_room_view" },
    { id: "granny", asset: "granny", spawn: "kitchen_lane", facing: "dining_center" },
  ],
  props: [
    { id: "chest", type: "treasure_chest", spawn: "chest_spot", rotationY: -2.45 },
    { id: "padlock", type: "padlock", spawn: "chest_padlock", yOffset: 0.16, rotationY: -2.45 },
    { id: "golden_key", type: "golden_key", spawn: "key_spot", yOffset: 0.14, spin: true, float: true },
    { id: "emoji_ball", type: "emoji_ball", spawn: "chest_spot", yOffset: 0.25, visible: false },
  ],
  skits: [
    {
      name: "Act 1: Intro & Grandpa's Mystery Chest Ask (0-9s)",
      beats: [
        { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.22 },
        { at: 0.0, type: "fade", to: 0, duration: 0.4 },
        { at: 0.2, type: "player_walk", via: ["doorway_living"], to: "living_room_view", duration: 2.6 },
        { at: 2.8, type: "player_look", target: "grandpa", duration: 0.24, track: false },
        { at: 2.8, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
        { at: 3.9, type: "char_anim", actor: "grandpa", anim: "terrified", loop: true },
        { at: 4.0, type: "char_bubble", actor: "grandpa", icon: "key", duration: 2.8 },
        { at: 4.1, type: "sfx", sound: "aww", volume: 0.68 },
        { at: 5.9, type: "player_look", target: "chest", duration: 0.26, track: false },
        { at: 6.2, type: "sfx", sound: "ding", volume: 0.72 },
        { at: 7.0, type: "player_look", target: "grandpa", duration: 0.22, track: false },
        { at: 7.4, type: "player_gesture", gesture: "nod_yes", duration: 0.85 },
        { at: 7.5, type: "sfx", sound: "checkmark", volume: 0.76 },
        { at: 8.3, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true },
      ],
    },
    {
      name: "Act 2: Sneak & Outward-Facing Table Hide (9-20s)",
      beats: [
        { at: 9.2, type: "bgm", sound: "granny_good_part", volume: 0.24 },
        { at: 9.2, type: "player_walk", via: ["doorway_living", "back_hall", "doorway_dining"], to: "dining_center", duration: 4.0 },
        { at: 9.5, type: "char_face", actor: "grandpa", followPlayer: false },
        { at: 9.5, type: "char_anim", actor: "grandpa", anim: "idle", loop: true },
        { at: 12.6, type: "char_move", actor: "granny", to: "dining_center", anim: "walk", duration: 3.2 },
        { at: 13.2, type: "player_walk", to: "hide_table", duration: 1.2 },
        { at: 13.8, type: "player_crouch", crouched: true, duration: 0.32 },
        { at: 14.3, type: "player_look", target: "granny", duration: 0.22, track: true },
        { at: 14.6, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.6 },
        { at: 14.7, type: "sfx", sound: "granny_i_see_you", volume: 0.85, cutBgm: true, cutBgmDuration: 1.3 },
        { at: 15.8, type: "char_move", actor: "granny", via: ["doorway_dining"], to: "back_hall_left", anim: "walk", duration: 3.8 },
        { at: 16.4, type: "char_bubble", actor: "granny", icon: "question", duration: 2.2 },
        { at: 17.0, type: "player_gesture", gesture: "peek_lean", duration: 1.0 },
      ],
    },
    {
      name: "Act 3: Grab the Golden Key on Counter Top (20-25.5s)",
      beats: [
        { at: 19.8, type: "player_crouch", crouched: false, duration: 0.35 },
        { at: 20.1, type: "player_walk", via: ["dining_center"], to: "kitchen", duration: 2.7 },
        { at: 22.8, type: "player_look", target: "key_spot", duration: 0.22 },
        { at: 23.4, type: "prop_action", prop: "golden_key", action: "pickup" },
        { at: 23.4, type: "player_hold", prop: "golden_key" },
        { at: 23.6, type: "sfx", sound: "kaching", volume: 0.8 },
        { at: 24.3, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },
        { at: 24.5, type: "sfx", sound: "tada", volume: 0.7 },
      ],
    },
    {
      name: "Act 4: Chest Reveal & Bouncing Emoji Ball (25.5-36.5s)",
      beats: [
        { at: 25.5, type: "player_walk", via: ["dining_center", "doorway_dining", "back_hall", "doorway_living"], to: "living_room_view", duration: 4.8 },
        { at: 30.3, type: "player_look", target: "grandpa", duration: 0.22, track: false },
        { at: 30.3, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
        { at: 30.5, type: "char_move", actor: "grandpa", to: "grandpa_step_back", anim: "walk", duration: 0.9, keepFacing: true },
        { at: 31.4, type: "player_look", target: "chest", duration: 0.22 },
        { at: 31.7, type: "player_hold", prop: "golden_key", use: true },
        { at: 31.9, type: "prop_action", prop: "padlock", action: "hide" },
        { at: 31.9, type: "prop_action", prop: "chest", action: "open" },
        { at: 32.0, type: "prop_action", prop: "emoji_ball", action: "pop_out", waypoint: "chest_spot", to: "living_room_ball_bounce", travelDuration: 2.4, yOffset: 0.3 },
        { at: 32.0, type: "sfx", sound: "kaching", volume: 0.85 },
        { at: 32.5, type: "player_hold", prop: null },
        { at: 32.7, type: "player_look", target: "emoji_ball", duration: 0.22, track: true },
        { at: 33.4, type: "sfx", sound: "rizz", volume: 0.78 },
        { at: 34.4, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
        { at: 34.4, type: "char_anim", actor: "grandpa", anim: "laugh", loop: true },
        { at: 34.5, type: "char_bubble", actor: "grandpa", icon: "laugh", duration: 2.2 },
      ],
    },
    {
      name: "Act 5: Slapstick Finale Facing Player (36.5-44s)",
      beats: [
        { at: 36.5, type: "char_move", actor: "granny", via: ["doorway_living"], to: "granny_living_burst", anim: "run2", duration: 1.9 },
        { at: 37.8, type: "player_look", target: "granny", duration: 0.18, track: true },
        { at: 38.4, type: "char_face", actor: "granny", followPlayer: true, instant: true },
        { at: 38.4, type: "char_bubble", actor: "granny", icon: "angry", duration: 2.8 },
        { at: 38.4, type: "sfx", sound: "vine_boom", volume: 0.92, cutBgm: true, cutBgmDuration: 1.1 },
        { at: 38.6, type: "char_anim", actor: "granny", anim: "punch", loop: false },
        { at: 39.0, type: "sfx", sound: "bonk", volume: 0.9 },
        { at: 39.0, type: "player_gesture", gesture: "shake_panic", duration: 0.85 },
        { at: 39.5, type: "bgm", sound: "granny_chase", volume: 0.28 },
        { at: 39.6, type: "char_anim", actor: "grandpa", anim: "terrified", loop: true },
        { at: 39.7, type: "char_bubble", actor: "grandpa", icon: "exclamation", duration: 2.4 },
        { at: 39.8, type: "sfx", sound: "granny_laugh", volume: 0.88 },
        { at: 40.6, type: "player_look", target: "grandpa", duration: 0.28, track: true },
        { at: 41.4, type: "char_anim", actor: "granny", anim: "jump", loop: false },
        { at: 41.8, type: "sfx", sound: "explode_meme", volume: 0.86 },
        { at: 41.9, type: "player_gesture", gesture: "shake_panic", duration: 0.9 },
        { at: 42.8, type: "fade", to: 1, duration: 1.1 },
      ],
    },
  ],
};

/**
 * 6-second Jump (0-2s) -> Run (2-4.5s) -> Walk (4.5-6s) POV Skit.
 */
export const JUMP_RUN_WALK_EPISODE = {
  title: "Granny & Grandpa: Jump, Run, Walk (6s)",
  aspect: "9:16",
  playerSpawn: "back_hall",
  playerFacing: "back_room_east",
  cast: [
    { id: "granny", asset: "granny", spawn: "back_hall_left", facing: "back_room_east" },
    { id: "grandpa", asset: "grandpa", spawn: "back_hall_right", facing: "back_room_east_right" },
  ],
  props: [],
  skits: [
    {
      name: "Jump, Run & Walk",
      beats: [
        { at: 0.0, type: "player_walk", to: "doorway_living", duration: 0.1 },
        { at: 0.0, type: "player_look", target: "back_hall", duration: 0.1, track: false },
        { at: 0.0, type: "char_anim", actor: "granny", anim: "jump", speed: 0.95, loop: false },
        { at: 0.0, type: "char_anim", actor: "grandpa", anim: "jump", speed: 0.95, loop: false },
        { at: 2.0, type: "char_move", actor: "granny", to: "back_room_east", anim: "run", duration: 2.5 },
        { at: 2.0, type: "char_move", actor: "grandpa", to: "back_room_east_right", anim: "run2", duration: 2.5 },
        { at: 2.0, type: "player_look", target: "grandpa", duration: 0.25, track: true },
        { at: 4.5, type: "char_move", actor: "granny", to: "living_room_left", anim: "walk", duration: 1.5 },
        { at: 4.5, type: "char_move", actor: "grandpa", to: "living_room_right", anim: "walk", duration: 1.5 },
        { at: 4.5, type: "player_walk", to: "living_room", duration: 1.4 },
      ],
    },
  ],
};

export const EPISODE_PRESETS = {
  grandpa_key_pov_44s: GRANDPA_KEY_POV_44S,
  jump_run_walk_6s: JUMP_RUN_WALK_EPISODE,
};

export const DEFAULT_EPISODE = GRANDPA_KEY_POV_44S;
