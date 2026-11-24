/**
 * Centralized configuration, real asset manifests, SFX catalog, indoor SET_MAP waypoints,
 * and built-in POV & Shorts episode presets.
 */

import { GRANNY_COOKIE_HEIST_15S } from "./episodes/cookieHeist15s.js";
import { THE_GREAT_ESCAPE_68S } from "./episodes/greatEscape75.js";
import { ZOMBIE_FORT_5M } from "./episodes/zombieFort5m.js";
import { COOKIE_CAPER_30S } from "./episodes/cookieCaper30.js";
import { COMEDY_VARIETY_1M, COOKIE_HEIST_15S, COOKIE_MARATHON_150S, ROCKET_BALL_TEST, ROCKET_BALL_x3, SHENANIGANS_45S, WAKE_TO_RIDE_120S } from "./episodes.js";
import { SHOWS, buildShow } from "./shows/index.js";

export { COMEDY_VARIETY_1M, COOKIE_HEIST_15S, COOKIE_MARATHON_150S, ZOMBIE_FORT_5M, COOKIE_CAPER_30S, ROCKET_BALL_TEST, ROCKET_BALL_x3, SHENANIGANS_45S, WAKE_TO_RIDE_120S, SHOWS };

export const CONFIG = {
  threeVersion: "0.170.0",
  fixedStepHz: 60,
  fixedDt: 1 / 60,
  maxFrameDt: 0.05,
  defaultFadeDuration: 0.18,
  // Framework guardrail: `player_look` is a whip-pan by default. Episodes can
  // opt into longer scans with `maxLookDuration` or `allowSlowScans`.
  maxLookDuration: 0.55,
  defaultAspect: "16:9",
  aspectModes: {
    "16:9": { width: 1280, height: 720, aspect: 16 / 9, fov: 68, label: "16:9 YouTube POV" },
    "9:16": { width: 720, height: 1280, aspect: 9 / 16, fov: 58, label: "9:16 Vertical Shorts" },
  },
  exportWidth: 1280,
  exportHeight: 720,
  exportFps: 30,
  playerEyeHeight: 1.55,
  playerCrouchHeight: 0.42,
  baseWalkSpeed: 2.5,
  baseRunSpeed: 3.8,
  baseSneakSpeed: 1.65,
  baseStairSpeed: 1.85,
  baseJumpSpeed: 2.35,
  house: {
    scale: 0.42,
    groundFloorRawY: 13.32,
  },
  /** Body-aware staging guard rails (see src/stagingSafety.js & episodeSafety.js). */
  staging: {
    autoRepair: true,
    castSeparation: 1.05,
    playerStandoff: 1.15,
    cameraStandoff: 1.15,
    maxDeadAir: 2.5,
    reportToConsole: true,
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
 * Semantic Mesh Tagging Rules for GrannyHouse.fbx meshes.
 * Populated into `mesh.userData.tag` on load for click-to-tag & spatial memory queries.
 */
export const SEMANTIC_MESH_TAGS = {
  ExitDoor: { tag: "front_door", aliases: ["exit_door", "door"], label: "Front Exit Door" },
  Microwave: { tag: "microwave", aliases: ["kitchen_microwave"], label: "Kitchen Microwave" },
  ElectricCabinet: { tag: "electric_cabinet", aliases: ["breaker_box"], label: "Electric Cabinet" },
  HouseFloor: { tag: "house_floor", aliases: ["floor"], label: "House Floor" },
  HouseWalls: { tag: "house_walls", aliases: ["walls"], label: "House Walls" },
  Furniture3: {
    tag: "kitchen_dining_furniture",
    aliases: ["kitchen_furniture", "dining_furniture"],
    label: "Kitchen & Dining Furniture",
  },
  Furniture2: {
    tag: "living_room_furniture",
    aliases: ["living_furniture"],
    label: "Living Room Furniture",
  },
  Furniture1: {
    tag: "back_hall_furniture",
    aliases: ["back_furniture"],
    label: "Back Hall & Bedroom Furniture",
  },
  Furniture4: {
    tag: "upstairs_west_furniture",
    aliases: [],
    label: "Upstairs West Furniture",
  },
  Furniture5: {
    tag: "upstairs_east_furniture",
    aliases: [],
    label: "Upstairs East Furniture",
  },
  Furniture6: {
    tag: "foyer_furniture",
    aliases: ["stairs_railing"],
    label: "Foyer & Staircase Furniture",
  },
  Furniture7: {
    tag: "basement_furniture",
    aliases: [],
    label: "Basement Furniture",
  },
  Fur: { tag: "basement_shelf_1", aliases: [], label: "Basement Shelf 1" },
  Fur1: { tag: "basement_shelf_2", aliases: [], label: "Basement Shelf 2" },
  cup: { tag: "basement_cup", aliases: [], label: "Basement Cup" },
  blood: { tag: "basement_blood", aliases: [], label: "Basement Stain" },
};

/**
 * Sub-object semantic bounding regions inside combined FBX furniture meshes
 * (calibrated directly from GrannyHouse.fbx vertex clusters).
 * Exposed as tagged spatial memory anchors (`userData.tag`) so `player_look` and
 * `player_walk` can target individual tables, counters, sofas, and beds by tag.
 */
export const SEMANTIC_OBJECT_REGIONS = {
  kitchen_table: {
    parentMesh: "Furniture3",
    aliases: ["kitchen_counter", "kitchen_counter_top", "kitchen_table_top"],
    min: [-8.05, 0.08, 0.40],
    max: [-6.79, 1.28, 3.07],
    label: "Kitchen Table / Counter",
  },
  dining_table: {
    parentMesh: "Furniture3",
    aliases: ["dining_table_top", "dining_table_top_west"],
    min: [-5.80, 0.05, 1.90],
    max: [-4.45, 1.15, 3.60],
    label: "Dining Room Table",
  },
  living_room_sofa: {
    parentMesh: "Furniture2",
    aliases: ["sofa", "living_sofa"],
    min: [7.19, 0.05, -0.58],
    max: [8.57, 0.89, 0.90],
    label: "Living Room Sofa",
  },
  back_bed: {
    parentMesh: "Furniture1",
    aliases: ["back_bed_top", "downstairs_bed"],
    min: [-6.05, 0.11, -4.44],
    max: [-3.83, 1.29, -2.20],
    label: "Downstairs Back Bed",
  },
  up_bed: {
    parentMesh: "Furniture4",
    aliases: ["up_bed_top", "up_bed_top_west", "upstairs_bed"],
    min: [-5.40, 2.85, -2.00],
    max: [-3.30, 3.85, -0.80],
    label: "Upstairs High Bed",
  },
  upstairs_desk: {
    parentMesh: "Furniture4",
    aliases: ["upstairs_west_desk_top"],
    min: [-7.55, 2.85, -3.20],
    max: [-6.45, 3.60, -2.00],
    label: "Upstairs West Desk",
  },
  upstairs_east_bed: {
    parentMesh: "Furniture5",
    aliases: ["upstairs_east_bed_top"],
    min: [1.30, 2.85, -4.90],
    max: [2.70, 3.60, -3.70],
    label: "Upstairs East Bed",
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
    panic: {
      path: "./Assets/AnimationTemplates/Terrified.fbx",
      loop: true,
      defaultSpeed: 1.25,
    },
    // ── added 2026-11: uploaded templates, registered so writers can just use
    //    the key. Nothing here needs touching Blender.
    angry: {
      path: "./Assets/AnimationTemplates/Angry.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    talk: {
      path: "./Assets/AnimationTemplates/Talking.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    kick: {
      path: "./Assets/AnimationTemplates/NormalKick.fbx",
      loop: false,
      defaultSpeed: 1.0,
    },
    mma_kick: {
      path: "./Assets/AnimationTemplates/Mma Kick.fbx",
      loop: false,
      defaultSpeed: 1.0,
    },
    trip: {
      path: "./Assets/AnimationTemplates/Tripping.fbx",
      loop: false,
      defaultSpeed: 1.0,
    },
    // ── Procedural head gestures: no FBX on disk, the rig layered them at
    //    runtime from src/headGestures.js. Usable anywhere `anim` is allowed.
    nod: { procedural: "head_gesture", gesture: "nod", loop: false, duration: 0.8 },
    nod_yes: { procedural: "head_gesture", gesture: "nod", loop: false, duration: 0.8 },
    nod_once: { procedural: "head_gesture", gesture: "nod_once", loop: false, duration: 1.1 },
    shake: { procedural: "head_gesture", gesture: "shake", loop: false, duration: 0.9 },
    shake_no: { procedural: "head_gesture", gesture: "shake", loop: false, duration: 0.9 },
    tilt: { procedural: "head_gesture", gesture: "tilt", loop: false, duration: 1.2 },
    double_take: { procedural: "head_gesture", gesture: "double_take", loop: false, duration: 0.9 },
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
  "error-glitch": { path: "./SoundEffects/error-glitch.mp3", category: "alert", defaultVolume: 0.68 },
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
  fluffing_a_duck: { path: "./SoundEffects/backroundMusics/Fluffing-a-Duck(chosic.com).mp3", category: "bgm", defaultVolume: 0.24 },
  monkeys_spinning_monkeys: { path: "./SoundEffects/backroundMusics/Monkeys-Spinning-Monkeys(chosic.com).mp3", category: "bgm", defaultVolume: 0.24 },
  run_amok: { path: "./SoundEffects/backroundMusics/Run-Amok(chosic.com).mp3", category: "bgm", defaultVolume: 0.26 },
};

/**
 * Calibrated INDOOR waypoints inside Granny 1 House (y = 0 is Main Ground Floor).
 * Episode JSON scripts MUST reference these waypoint names rather than raw coordinates.
 */
export { SET_MAP, NAV_GRAPH, NAV_GRAPH_EDGES } from "./setMap.js";

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
        { at: 0.2, type: "player_walk", via: ["doorway_living", "living_room_entry"], to: "living_room_view", duration: 2.6 },
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
        { at: 9.2, type: "player_walk", via: ["living_room_entry", "doorway_living", "back_room_east", "back_hall", "doorway_dining"], to: "dining_center", duration: 4.0 },
        { at: 9.5, type: "char_face", actor: "grandpa", followPlayer: false },
        { at: 9.5, type: "char_anim", actor: "grandpa", anim: "idle", loop: true },
        { at: 12.6, type: "char_move", actor: "granny", to: "dining_center", anim: "walk", duration: 2.2 },
        { at: 13.2, type: "player_walk", to: "hide_table", duration: 1.2 },
        { at: 13.8, type: "player_crouch", crouched: true, duration: 0.32 },
        { at: 14.3, type: "player_look", target: "granny", duration: 0.22, track: true },
        { at: 14.8, type: "char_face", actor: "granny", followPlayer: true, instant: true },
        { at: 14.8, type: "char_anim", actor: "granny", anim: "look", loop: true },
        { at: 14.9, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.3 },
        { at: 14.9, type: "sfx", sound: "discord", volume: 0.78, cutBgm: true, cutBgmDuration: 1.2 },
        { at: 16.2, type: "char_bubble", actor: "granny", icon: "question", duration: 1.8 },
        { at: 16.3, type: "sfx", sound: "aww", volume: 0.65 },
        { at: 17.0, type: "char_face", actor: "granny", followPlayer: false },
        { at: 17.0, type: "char_move", actor: "granny", via: ["doorway_dining"], to: "back_hall_left", anim: "walk", duration: 2.8 },
        { at: 17.2, type: "player_gesture", gesture: "peek_lean", duration: 1.0 },
      ],
    },
    {
      name: "Act 3: Grab the Golden Key on Counter Top (20-25.5s)",
      beats: [
        { at: 19.8, type: "player_crouch", crouched: false, duration: 0.35 },
        { at: 20.1, type: "player_walk", via: ["dining_center"], to: "kitchen", duration: 2.7 },
        { at: 22.8, type: "player_look", target: "golden_key", duration: 0.24 },
        { at: 23.4, type: "prop_action", prop: "golden_key", action: "pickup" },
        { at: 23.4, type: "player_hold", prop: "golden_key" },
        { at: 23.5, type: "sfx", sound: "kaching", volume: 0.8 },
        { at: 23.9, type: "player_look", target: "dining_center", duration: 0.35, track: false },
        { at: 24.3, type: "player_gesture", gesture: "nod_yes", duration: 0.65 },
        { at: 24.5, type: "sfx", sound: "tada", volume: 0.7 },
      ],
    },
    {
      name: "Act 4: Chest Reveal & Bouncing Emoji Ball (25.5-36.5s)",
      beats: [
        { at: 25.5, type: "player_walk", via: ["dining_center", "doorway_dining", "back_hall", "back_room_east", "doorway_living", "living_room_entry"], to: "living_room_view", duration: 4.8 },
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
        { at: 0.0, type: "player_look", target: "granny", duration: 0.22, track: true },
        { at: 0.0, type: "char_anim", actor: "granny", anim: "jump", speed: 0.95, loop: false },
        { at: 0.0, type: "char_anim", actor: "grandpa", anim: "jump", speed: 0.95, loop: false },
        { at: 2.0, type: "char_move", actor: "granny", to: "back_room_east", anim: "run", duration: 2.5 },
        { at: 2.0, type: "char_move", actor: "grandpa", to: "back_room_east_right", anim: "run2", duration: 2.5 },
        { at: 2.0, type: "player_look", target: "grandpa", duration: 0.25, track: true },
        { at: 4.5, type: "char_move", actor: "granny", to: "living_room_left", anim: "walk", duration: 1.5 },
        { at: 4.5, type: "char_move", actor: "grandpa", to: "living_room_right", anim: "walk", duration: 1.5 },
        { at: 4.5, type: "player_walk", to: "living_room", duration: 3.4 },
      ],
    },
  ],
};

/**
 * 4m08s (~248s) Viral-Style First-Person POV Kids Comedy Episode:
 * "THE FLOOR IS LAVA! Mystery Package Disaster (4m POV)"
 */
export const FLOOR_IS_LAVA_4M = {
  title: "THE FLOOR IS LAVA! (Fixed Narrative)",
  aspect: "16:9",
  playerSpawn: "front_door_view",
  playerFacing: "front_door_pkg",
  cast: [
    { id: "granny", asset: "granny", spawn: "dining_center", facing: "front_door_pkg" },
    { id: "grandpa", asset: "grandpa", spawn: "living_room", facing: "living_room_entry" },
  ],
  props: [
    { id: "package", type: "delivery_box", spawn: "front_door_pkg", yOffset: 0.0 },
    { id: "red_button", type: "red_button", spawn: "front_door_pkg", yOffset: 0.42, visible: false },
    { id: "lava", type: "rising_lava", spawn: "lava_origin", yOffset: 0.0, visible: false },
  ],
  skits: [
    {
      name: "Act 1: The Delivery",
      beats: [
        { at: 0, type: "bgm", sound: "fluffing_a_duck", volume: 0.24 },
        { at: 0, type: "fade", to: 0, duration: 0.4 },
        { after: 1.0, type: "player_walk", target: "package", standoff: 0.85, await: true },
        { after: 0.2, type: "prop_action", prop: "package", action: "open" },
        { after: 0.1, type: "sfx", sound: "tada", volume: 0.75 },
        { after: 0.5, type: "prop_action", prop: "red_button", action: "pop_out", waypoint: "front_door_pkg", yOffset: 0.44 },
        { after: 0.1, type: "player_look", target: "red_button", duration: 0.25 },
        { after: 0.1, type: "sfx", sound: "ding" },
        { after: 0.4, type: "player_look", target: "granny", duration: 0.3, track: true }
      ]
    },
    {
      name: "Act 2: The Mistake",
      beats: [
        { after: 0.5, type: "char_move", actor: "granny", via: ["dining_corner", "stairs_bottom"], to: "front_door_left", anim: "walk", await: true },
        { after: 0.2, type: "char_face", actor: "granny", target: "red_button", instant: true },
        { after: 0.5, type: "char_anim", actor: "granny", anim: "punch", loop: false, await: true },
        { after: 0, type: "prop_action", prop: "red_button", action: "press" },
        { after: 0, type: "sfx", sound: "vine_boom", cutBgm: true, cutBgmDuration: 1.5 },
        { after: 0.5, type: "player_gesture", gesture: "shake_earthquake", duration: 2.0 },
        { after: 0.1, type: "sfx", sound: "explode_meme" },
        { after: 0.5, type: "bgm", sound: "run_amok", volume: 0.28 },
        { after: 0.1, type: "prop_action", prop: "lava", action: "rise_to", targetY: 0.15, duration: 3.0 }
      ]
    },
    {
      name: "Act 3: Escape to High Ground",
      beats: [
        { after: 0.2, type: "char_bubble", actor: "granny", icon: "exclamation", duration: 1.5 },
        { after: 0.5, type: "char_move", actor: "granny", via: ["stairs_bottom", "dining_corner", "dining_table_side", "kitchen"], to: "kitchen_counter_top", anim: "run2", endAnim: "panic" },
        { after: 0.2, type: "char_move", actor: "grandpa", via: ["living_room_entry", "doorway_living", "back_room_east", "back_hall", "doorway_dining", "dining_center", "dining_table_front"], to: "dining_table_top", anim: "run2", endAnim: "panic" },
        { after: 0.2, type: "player_walk", via: ["stairs_bottom"], target: "dining_table_side", standoff: 0.8, speed: 3.5, await: true },
        { after: 0.2, type: "player_look", target: "grandpa", duration: 0.3 }
      ]
    },
    {
      name: "Act 4: Trapped",
      beats: [
        { after: 0.5, type: "char_face", actor: "grandpa", followPlayer: true, instant: true },
        { after: 0.1, type: "char_face", actor: "granny", followPlayer: true, instant: true },
        { after: 0.2, type: "char_bubble", actor: "grandpa", icon: "angry", duration: 2.0 },
        { after: 0.2, type: "prop_action", prop: "lava", action: "rise_to", targetY: 0.85, duration: 4.0 },
        { after: 0.6, type: "player_look", target: "granny", duration: 0.35 },
        { after: 1.2, type: "player_look", target: "grandpa", duration: 0.35 },
        { after: 0.2, type: "player_gesture", gesture: "shake_panic", duration: 1.5 },
        { after: 1.5, type: "fade", to: 1, duration: 1.5 }
      ]
    }
  ]
};

export const THE_GREAT_ESCAPE_5M = {
  "title": "The Great Escape (5-Minute Stealth POV)",
  "aspect": "16:9",
  "playerSpawn": "back_hall_left",
  "playerFacing": "doorway_dining",
  "cast": [
    {
      "id": "grandpa",
      "asset": "grandpa",
      "spawn": "living_room_sofa",
      "facing": "living_room_entry",
      "anim": "sit"
    },
    {
      "id": "granny",
      "asset": "granny",
      "spawn": "living_room_left",
      "facing": "living_room_view",
      "anim": "idle"
    }
  ],
  "props": [
    {
      "id": "treasure_chest",
      "type": "treasure_chest",
      "spawn": "chest_spot",
      "yOffset": 0,
      "scale": 1,
      "rotationY": -2.45
    },
    {
      "id": "golden_key",
      "type": "golden_key",
      "spawn": "chest_spot",
      "yOffset": 0.48,
      "scale": 1,
      "spin": true,
      "float": true
    },
    {
      "id": "kitchen_box",
      "type": "treasure_chest",
      "spawn": "kitchen_counter_top",
      "yOffset": 0,
      "scale": 0.55,
      "rotationY": 1.57
    },
    {
      "id": "toy_blaster",
      "type": "toy_blaster",
      "spawn": "upstairs_east_bed_top",
      "yOffset": 0.08,
      "scale": 1
    },
    {
      "id": "red_button",
      "type": "red_button",
      "spawn": "upstairs_balcony",
      "yOffset": 0,
      "scale": 1
    }
  ],
  "skits": [
    {
      "name": "Act 1: The Awakening",
      "beats": [
        {
          "after": 0,
          "type": "bgm",
          "sound": "granny_good_part",
          "volume": 0.24
        },
        {
          "after": 0,
          "type": "player_look",
          "target": "doorway_dining",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "zzz",
          "duration": 15
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "back_bed",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "back_hall_left"
          ],
          "to": "under_bed",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": true,
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "dining_nook",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "dining_nook",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "doorway_dining",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "back_bed",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_no",
          "duration": 1.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": false,
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "under_bed",
            "back_hall_left",
            "back_hall",
            "back_hall_right",
            "hallway",
            "back_room_east"
          ],
          "to": "back_room_east_right",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "doorway_living",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "doorway_living",
            "living_room_entry"
          ],
          "to": "living_room_view",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "grandpa",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "zzz",
          "duration": 15
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "granny",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "treasure_chest",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": true,
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "living_room_right",
            "living_room",
            "grandpa_chest_side"
          ],
          "target": "treasure_chest",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "grandpa",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "golden_key",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "prop_action",
          "prop": "treasure_chest",
          "action": "open"
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "click",
          "volume": 0.65
        },
        {
          "after": 0.1,
          "type": "prop_action",
          "prop": "golden_key",
          "action": "pickup"
        },
        {
          "after": 0,
          "type": "player_hold",
          "prop": "golden_key",
          "use": true,
          "duration": 0.85,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "kaching",
          "volume": 0.78
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "nod_yes",
          "duration": 1.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "grandpa",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "zzz",
          "duration": 10
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": false,
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "living_room",
            "living_room_view",
            "living_room_entry",
            "doorway_living",
            "back_room_east",
            "hallway"
          ],
          "to": "back_hall",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "doorway_living",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        }
      ]
    },
    {
      "name": "Act 2: The Kitchen Trap",
      "beats": [
        {
          "after": 0.1,
          "type": "player_look",
          "target": "back_hall_left",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "back_hall_left",
            "doorway_dining",
            "dining_nook",
            "dining_center"
          ],
          "target": "dining_table",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "dining_table",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "hide_table",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "kitchen_lane",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "dining_center",
            "kitchen_lane"
          ],
          "to": "kitchen",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "microwave",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_no",
          "duration": 1.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "kitchen_box",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "target": "kitchen_box",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_hold",
          "prop": "golden_key",
          "use": true,
          "duration": 0.85,
          "await": true
        },
        {
          "after": 0.1,
          "type": "prop_action",
          "prop": "kitchen_box",
          "action": "open"
        },
        {
          "after": 0,
          "type": "sfx",
          "sound": "ding",
          "volume": 0.85
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "granny",
          "icon": "exclamation",
          "duration": 2.5
        },
        {
          "after": 0,
          "type": "sfx",
          "sound": "granny_i_see_you",
          "volume": 0.88
        },
        {
          "after": 0,
          "type": "bgm",
          "sound": "granny_chase",
          "volume": 0.24
        },
        {
          "after": 0,
          "type": "char_move",
          "actor": "granny",
          "via": [
            "living_room_entry",
            "doorway_living",
            "back_room_east",
            "back_hall",
            "back_hall_left",
            "doorway_dining",
            "dining_center",
            "kitchen_lane"
          ],
          "to": "kitchen",
          "anim": "run",
          "speed": 1.8
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": true,
          "duration": 0.35,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "kitchen"
          ],
          "target": "kitchen_table",
          "standoff": 0.1,
          "speed": 2.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "kitchen_lane",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "granny",
          "duration": 0.45,
          "track": true,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "squidward_walk",
          "volume": 0.65
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "granny",
          "icon": "question",
          "duration": 2.8
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "granny",
          "via": [
            "kitchen_lane",
            "dining_center",
            "dining_table_front",
            "dining_center",
            "doorway_dining",
            "back_hall_left",
            "back_hall"
          ],
          "to": "back_room_east",
          "anim": "walk",
          "speed": 1.05
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "kitchen_lane",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "dining_center",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 2.2,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_crouch",
          "crouched": false,
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "nod_yes",
          "duration": 1.4,
          "await": true
        }
      ]
    },
    {
      "name": "Act 3: The Upstairs Run",
      "beats": [
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "kitchen_lane",
            "dining_center",
            "dining_table_front",
            "dining_table_side",
            "dining_corner"
          ],
          "to": "stairs_bottom",
          "speed": 3.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "swoosh",
          "volume": 0.7
        },
        {
          "after": 0,
          "type": "bgm",
          "sound": "granny_ambience",
          "volume": 0.24
        },
        {
          "after": 0,
          "type": "player_walk",
          "via": [
            "stairs_middle",
            "stairs_top"
          ],
          "to": "upstairs_landing",
          "speed": 3.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_anim",
          "actor": "grandpa",
          "anim": "idle",
          "loop": true
        },
        {
          "after": 0,
          "type": "char_prop",
          "actor": "grandpa",
          "prop": "shotgun"
        },
        {
          "after": 0,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "angry",
          "duration": 2.4
        },
        {
          "after": 0,
          "type": "player_look",
          "target": "upstairs_west_room",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "upstairs_hall_center",
            "upstairs_west_room"
          ],
          "to": "bedroom",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "upstairs_west_room",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_no",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "upstairs_west_room",
            "upstairs_hall_center",
            "up_hall_north_door",
            "up_hall_north",
            "up_bed_north_side"
          ],
          "to": "up_bed_north",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "target": "upstairs_desk",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "typing",
          "volume": 0.55
        },
        {
          "after": 0,
          "type": "player_look",
          "target": "upstairs_desk",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_no",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "target": "up_bed",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "up_bed",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "grandpa",
          "via": [
            "living_room_entry",
            "doorway_living",
            "back_room_east",
            "back_hall",
            "back_hall_left",
            "doorway_dining",
            "dining_center",
            "dining_table_front",
            "dining_table_side",
            "dining_corner",
            "stairs_bottom",
            "stairs_middle",
            "stairs_top",
            "upstairs_landing",
            "upstairs_hall_center"
          ],
          "to": "upstairs_east_hall",
          "anim": "walk",
          "speed": 1.35
        },
        {
          "after": 0,
          "type": "player_walk",
          "via": [
            "up_bed_north_side",
            "up_hall_north",
            "up_hall_north_door",
            "upstairs_hall_center",
            "upstairs_east_hall",
            "upstairs_east_door"
          ],
          "to": "upstairs_east_north",
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "target": "upstairs_east_bed",
          "standoff": 0.8,
          "speed": 1.05,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "toy_blaster",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "tada",
          "volume": 0.72
        },
        {
          "after": 0,
          "type": "prop_action",
          "prop": "toy_blaster",
          "action": "pickup"
        },
        {
          "after": 0,
          "type": "player_hold",
          "prop": "toy_blaster",
          "use": true,
          "duration": 0.85,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "rizz",
          "volume": 0.72
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "nod_yes",
          "duration": 1.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "upstairs_east_door",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "grandpa",
          "via": [
            "upstairs_east_hall"
          ],
          "to": "upstairs_east_door",
          "anim": "walk",
          "speed": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "grandpa",
          "duration": 0.4,
          "track": true,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "vine_boom",
          "volume": 0.86
        },
        {
          "after": 0,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "angry",
          "duration": 2
        },
        {
          "after": 0,
          "type": "player_hold",
          "prop": "toy_blaster",
          "use": true,
          "duration": 0.55,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "pop",
          "volume": 0.9
        },
        {
          "after": 0.1,
          "type": "char_anim",
          "actor": "grandpa",
          "anim": "hit",
          "loop": false,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "bonk",
          "volume": 0.88
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "upstairs_east_door",
            "upstairs_east_hall"
          ],
          "to": "upstairs_balcony",
          "speed": 3.3,
          "await": true
        }
      ]
    },
    {
      "name": "Act 4: The Final Scramble",
      "beats": [
        {
          "after": 0.1,
          "type": "player_look",
          "target": "red_button",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "target": "red_button",
          "standoff": 0.8,
          "speed": 1.1,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "prop_action",
          "prop": "red_button",
          "action": "press"
        },
        {
          "after": 0,
          "type": "sfx",
          "sound": "error-glitch",
          "volume": 0.88
        },
        {
          "after": 0.1,
          "type": "bgm",
          "sound": "run_amok",
          "volume": 0.28
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "granny",
          "via": [
            "back_hall",
            "back_hall_left",
            "doorway_dining",
            "dining_center",
            "dining_table_front",
            "dining_table_side",
            "dining_corner",
            "stairs_bottom",
            "stairs_middle",
            "stairs_top",
            "upstairs_landing",
            "upstairs_hall_center",
            "upstairs_east_hall"
          ],
          "to": "upstairs_east_door",
          "anim": "run",
          "speed": 2.3
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "grandpa",
          "via": [
            "upstairs_east_hall"
          ],
          "to": "upstairs_balcony",
          "anim": "run2",
          "speed": 1.9
        },
        {
          "after": 0,
          "type": "char_bubble",
          "actor": "granny",
          "icon": "angry",
          "duration": 2.8
        },
        {
          "after": 0.1,
          "type": "char_bubble",
          "actor": "grandpa",
          "icon": "angry",
          "duration": 2.8
        },
        {
          "after": 0,
          "type": "player_look",
          "target": "upstairs_east_hall",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "foyer_atrium",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "upstairs_east_hall",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "foyer_atrium",
          "duration": 0.4,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "foyer_atrium"
          ],
          "to": "front_door_view",
          "speed": 3.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "whoosh",
          "volume": 0.78
        },
        {
          "after": 0,
          "type": "player_look",
          "target": "upstairs_balcony",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "granny",
          "via": [
            "upstairs_east_hall",
            "upstairs_hall_center",
            "upstairs_landing",
            "stairs_top",
            "stairs_middle",
            "stairs_bottom"
          ],
          "to": "front_door_view",
          "anim": "run",
          "speed": 1.65
        },
        {
          "after": 0.1,
          "type": "char_move",
          "actor": "grandpa",
          "via": [
            "upstairs_east_hall",
            "upstairs_hall_center",
            "upstairs_landing",
            "stairs_top",
            "stairs_middle"
          ],
          "to": "stairs_bottom",
          "anim": "run2",
          "speed": 1.55
        },
        {
          "after": 0,
          "type": "player_walk",
          "to": "front_door_left",
          "speed": 1.25,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "stairs_bottom",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "front_door_right",
          "speed": 1.25,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "stairs_bottom",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "foyer_atrium",
          "speed": 1.25,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "granny",
          "duration": 0.45,
          "track": true,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "foyer",
          "speed": 1.15,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "stairs_bottom",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "shake_panic",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "to": "front_door_view",
          "speed": 1.25,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "front_door",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_gesture",
          "gesture": "peek_lean",
          "duration": 1.8,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_walk",
          "via": [
            "foyer_atrium",
            "front_door_view"
          ],
          "target": "front_door",
          "standoff": 0.8,
          "speed": 3.5,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_hold",
          "prop": "golden_key",
          "use": true,
          "duration": 0.9,
          "await": true
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "click",
          "volume": 0.78
        },
        {
          "after": 0.1,
          "type": "sfx",
          "sound": "tada",
          "volume": 0.88
        },
        {
          "after": 0,
          "type": "player_gesture",
          "gesture": "nod_yes",
          "duration": 1.6,
          "await": true
        },
        {
          "after": 0.1,
          "type": "player_look",
          "target": "front_door",
          "duration": 0.45,
          "await": true
        },
        {
          "after": 0.1,
          "type": "fade",
          "to": 1,
          "duration": 2.5,
          "await": true
        }
      ]
    }
  ]
};

export const EPISODE_PRESETS = {
  granny_cookie_heist_15s: GRANNY_COOKIE_HEIST_15S,
  // Long-form, scene-built shows (each scene is its own file under src/shows/).
  mountain_dew_run: buildShow("mountain_dew_run"),
  comedy_variety_1m: COMEDY_VARIETY_1M,
  cookie_heist_15s: COOKIE_HEIST_15S,
  cookie_marathon_150s: COOKIE_MARATHON_150S,
  rocket_ball_test: ROCKET_BALL_TEST,
  rocket_ball_x3: ROCKET_BALL_x3,
  cookie_caper_30s: COOKIE_CAPER_30S,
  the_great_escape_68s: THE_GREAT_ESCAPE_68S,
  grandpa_key_pov_44s: GRANDPA_KEY_POV_44S,
  zombie_fort_5m: ZOMBIE_FORT_5M,
  floor_is_lava_4m: FLOOR_IS_LAVA_4M,
  // Backwards-compatible alias for the fast-cut escape preset.
  the_great_escape_5m: THE_GREAT_ESCAPE_68S,
  jump_run_walk_6s: JUMP_RUN_WALK_EPISODE,
  shenanigans_45s: SHENANIGANS_45S,
  wake_to_ride_120s: WAKE_TO_RIDE_120S,
};

/**
 * Presets written before the story-spine gate existed.
 *
 * These are flagged rather than failed so the studio keeps working, but the
 * audit prints them on every run: the framework's contract for anything new is
 * "premise, goal, per-scene objective, payoff", and these three predate it.
 * Delete an entry when its spine is written — the exemption is a TODO list, not
 * a permanent state.
 */
export const LEGACY_SPINE_DEBT = {
  comedy_variety_1m: "variety compilation assembled before the spine gate",
  the_great_escape_68s: "escape short assembled before the spine gate",
  the_great_escape_5m: "alias of the_great_escape_68s; inherits the same debt",
  zombie_fort_5m: "hand-written act format (no scenes to attach objectives to)",
  floor_is_lava_4m: "hand-written act format (no scenes to attach objectives to)",
  grandpa_key_pov_44s: "hand-written act format (no scenes to attach objectives to)",
  granny_cookie_heist_15s: "hand-written act format (no scenes to attach objectives to)",
  jump_run_walk_6s: "hand-written act format (no scenes to attach objectives to)",
};
for (const [key, reason] of Object.entries(LEGACY_SPINE_DEBT)) {
  if (EPISODE_PRESETS[key] && !EPISODE_PRESETS[key].story) {
    EPISODE_PRESETS[key].storyExempt = reason;
  }
}

export const DEFAULT_EPISODE = COMEDY_VARIETY_1M;
