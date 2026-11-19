/**
 * Centralized configuration, real asset manifests, SFX catalog, house waypoints,
 * and the default 18-second Granny & Grandpa demo episode.
 */

export const CONFIG = {
  threeVersion: "0.170.0",
  fixedStepHz: 60,
  fixedDt: 1 / 60,
  maxFrameDt: 0.05,
  defaultFadeDuration: 0.18,
  shortsAspect: 9 / 16,
  exportWidth: 720,
  exportHeight: 1280,
  exportFps: 30,
  house: {
    scale: 0.42,
    groundFloorRawY: 13.32,
  },
  sfxPacer: {
    enabledByDefault: true,
    minIntervalSec: 1.0,
    maxIntervalSec: 1.85,
    footstepIntervalWalk: 0.46,
    footstepIntervalRun: 0.28,
    footstepIntervalSneak: 0.58,
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
      forceDetachedBindMode: false,
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

  /**
   * Mixamo FBX animation templates in ./Assets/AnimationTemplates.
   * All templates are exported With Skin; meshes are immediately disposed after clip extraction.
   */
  animations: {
    walk: {
      path: "./Assets/AnimationTemplates/Walk.fbx",
      loop: true,
      defaultSpeed: 1.0,
    },
    run: {
      path: "./Assets/AnimationTemplates/Fast Run.fbx",
      loop: true,
      defaultSpeed: 0.88,
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
 * Exact audio files in ./SoundEffects with category metadata for the Cartoon SFX Pacer.
 */
export const SFX_MANIFEST = {
  checkmark: { path: "./SoundEffects/Checkmark.mp3", category: "ui", defaultVolume: 0.65 },
  ding: { path: "./SoundEffects/DING.mp3", category: "pop", defaultVolume: 0.72 },
  eat: { path: "./SoundEffects/Eat sound (not continous).mp3", category: "comedy", defaultVolume: 0.75 },
  click: { path: "./SoundEffects/Mouse Click.mp3", category: "ui", defaultVolume: 0.6 },
  pop: { path: "./SoundEffects/Pop.mp3", category: "pop", defaultVolume: 0.8 },
  tada: { path: "./SoundEffects/Tada!.mp3", category: "comedy", defaultVolume: 0.7 },
  bonk: { path: "./SoundEffects/bonk_7zPAD7C.mp3", category: "impact", defaultVolume: 0.88 },
  discord: { path: "./SoundEffects/discord-notification.mp3", category: "alert", defaultVolume: 0.72 },
  glitch: { path: "./SoundEffects/error-glitch.mp3", category: "alert", defaultVolume: 0.7 },
  granny_good_part: { path: "./SoundEffects/granny-ambience-but-its-only-the-good-part.mp3", category: "sting", defaultVolume: 0.55 },
  granny_ambience: { path: "./SoundEffects/granny-ambience.mp3", category: "ambience", defaultVolume: 0.25 },
  granny_chase: { path: "./SoundEffects/granny-chase-music.mp3", category: "music", defaultVolume: 0.32 },
  granny_i_see_you: { path: "./SoundEffects/granny-i-see-you.mp3", category: "voice", defaultVolume: 0.9 },
  jumpscare: { path: "./SoundEffects/granny-jumpscare-sound-effect.mp3", category: "sting", defaultVolume: 0.78 },
  granny_laugh: { path: "./SoundEffects/granny-laugh.mp3", category: "voice", defaultVolume: 0.88 },
  kaching: { path: "./SoundEffects/kaching-sound-fx.mp3", category: "comedy", defaultVolume: 0.72 },
  typing: { path: "./SoundEffects/keyboard-Typing.mp3", category: "filler", defaultVolume: 0.45 },
  explode: { path: "./SoundEffects/minecraft-explode1.mp3", category: "impact", defaultVolume: 0.8 },
  explode_meme: { path: "./SoundEffects/minecraft-explosion-meme-sound-effect.mp3", category: "impact", defaultVolume: 0.75 },
  rizz: { path: "./SoundEffects/rizz-sound-effect.mp3", category: "comedy", defaultVolume: 0.75 },
  squidward_walk: { path: "./SoundEffects/squidward-walk-effect.mp3", category: "step", defaultVolume: 0.62 },
  aww: { path: "./SoundEffects/studio-audience-awwww-sound-fx.mp3", category: "comedy", defaultVolume: 0.72 },
  swoosh: { path: "./SoundEffects/swoosh-sound-effects.mp3", category: "cut", defaultVolume: 0.68 },
  vine_boom: { path: "./SoundEffects/vine Boom.mp3", category: "boom", defaultVolume: 0.85 },
  whoosh: { path: "./SoundEffects/whoosh-wind.mp3", category: "cut", defaultVolume: 0.68 },
};

/**
 * Calibrated INDOOR room waypoints inside the normalized Granny 1 House
 * (y = 0 is Main Ground Floor; every waypoint sits indoors under ceiling with clear floor).
 */
export const SET_MAP = {
  foyer: { x: -0.8, y: 0.0, z: 0.2, label: "Front Foyer" },
  hallway: { x: 0.8, y: 0.0, z: -2.4, label: "Main Back Hall" },
  back_hall: { x: 0.0, y: 0.0, z: -2.6, label: "Back Room Center" },
  back_hall_left: { x: -0.6, y: 0.0, z: -2.8, label: "Back Room Left" },
  back_hall_right: { x: 0.6, y: 0.0, z: -2.8, label: "Back Room Right" },
  back_room_east: { x: 3.8, y: 0.0, z: -1.6, label: "Back Hall East" },
  back_room_east_right: { x: 4.4, y: 0.0, z: -1.6, label: "Back Hall East Right" },
  doorway_living: { x: 4.0, y: 0.0, z: -1.0, label: "Living Room Doorway" },
  living_room_entry: { x: 4.2, y: 0.0, z: 0.4, label: "Living Room Entry" },
  living_room_left: { x: 4.0, y: 0.0, z: 0.4, label: "Living Room Left" },
  living_room_right: { x: 4.9, y: 0.0, z: 0.4, label: "Living Room Right" },
  living_room: { x: 5.4, y: 0.0, z: 2.2, label: "Living Room" },
  kitchen: { x: -5.5, y: 0.0, z: 0.8, label: "Kitchen" },
  dining_nook: { x: -3.4, y: 0.0, z: -1.6, label: "Dining Doorway" },
  stairs: { x: -3.4, y: 0.0, z: -2.6, label: "Stair Hall" },
  bedroom: { x: -4.2, y: 2.85, z: 2.1, label: "Upstairs Bedroom" },
};

/**
 * 6-second Jump (0-2s) -> Run (2-4.5s) -> Walk (4.5-6s) Short strictly inside Granny 1 House.
 */
export const JUMP_RUN_WALK_EPISODE = {
  title: "Granny & Grandpa: Jump, Run, Walk (6s)",
  duration: 6.0,
  cast: [
    { id: "granny", asset: "granny", spawn: "back_hall_left", facing: "back_room_east" },
    { id: "grandpa", asset: "grandpa", spawn: "back_hall_right", facing: "back_room_east_right" },
  ],
  timeline: [
    {
      time: 0.0,
      type: "camera",
      mode: "wide",
      target: "cast",
      cut: "instant",
    },
    {
      time: 0.0,
      type: "action",
      actor: "granny",
      anim: "jump",
      speed: 0.95,
      loop: false,
    },
    {
      time: 0.0,
      type: "action",
      actor: "grandpa",
      anim: "jump",
      speed: 0.95,
      loop: false,
    },
    {
      time: 0.1,
      type: "dialogue",
      actor: "granny",
      text: "1-2s: JUMPING!",
      duration: 1.85,
    },
    {
      time: 2.0,
      type: "camera",
      mode: "chase_cam",
      target: "grandpa",
      cut: "whip",
    },
    {
      time: 2.0,
      type: "move",
      actor: "granny",
      to: "back_room_east",
      anim: "run",
      duration: 2.5,
    },
    {
      time: 2.0,
      type: "move",
      actor: "grandpa",
      to: "back_room_east_right",
      anim: "run2",
      duration: 2.5,
    },
    {
      time: 2.1,
      type: "dialogue",
      actor: "grandpa",
      text: "3-4s: RUNNING!",
      duration: 2.3,
    },
    {
      time: 4.5,
      type: "camera",
      mode: "wide",
      target: "cast",
      cut: "whip",
    },
    {
      time: 4.5,
      type: "move",
      actor: "granny",
      to: "living_room_left",
      anim: "walk",
      duration: 1.5,
    },
    {
      time: 4.5,
      type: "move",
      actor: "grandpa",
      to: "living_room_right",
      anim: "walk",
      duration: 1.5,
    },
    {
      time: 4.6,
      type: "dialogue",
      actor: "granny",
      text: "LAST SECOND: WALKING!",
      duration: 1.4,
    },
  ],
};

/**
 * Full 18-second comedy Short inside Granny 1 House exercising multiple Mixamo
 * clips, wall-safe pathfinding, indoor camera framing, captions, and contextual SFX.
 */
export const COOKIES_CHASE_EPISODE = {
  title: "Grandpa Stole Granny's Cookies",
  duration: 18.0,
  cast: [
    { id: "grandpa", asset: "grandpa", spawn: "kitchen", facing: "dining_nook" },
    { id: "granny", asset: "granny", spawn: "back_hall", facing: "dining_nook" },
  ],
  timeline: [
    {
      time: 0.0,
      type: "camera",
      mode: "closeup",
      target: "grandpa",
      cut: "instant",
      shake: 0.08,
    },
    {
      time: 0.0,
      type: "action",
      actor: "grandpa",
      anim: "sneak",
      loop: true,
    },
    {
      time: 0.1,
      type: "sfx",
      sound: "granny_good_part",
      volume: 0.55,
    },
    {
      time: 0.2,
      type: "dialogue",
      actor: "grandpa",
      text: "OPERATION: STEAL GRANNY'S COOKIES",
      duration: 2.2,
    },
    {
      time: 0.6,
      type: "move",
      actor: "grandpa",
      to: "dining_nook",
      anim: "sneak",
      duration: 2.8,
    },
    {
      time: 1.5,
      type: "sfx",
      sound: "squidward_walk",
      volume: 0.65,
    },
    {
      time: 2.6,
      type: "camera",
      mode: "over_shoulder",
      target: "granny",
      lookTarget: "grandpa",
      cut: "whip",
    },
    {
      time: 2.7,
      type: "move",
      actor: "granny",
      to: "hallway",
      anim: "walk",
      duration: 2.1,
    },
    {
      time: 3.1,
      type: "sfx",
      sound: "discord",
      volume: 0.72,
    },
    {
      time: 3.6,
      type: "dialogue",
      actor: "granny",
      text: "WHO TOUCHED MY COOKIE JAR?!",
      duration: 2.1,
    },
    {
      time: 4.5,
      type: "sfx",
      sound: "granny_i_see_you",
      volume: 0.9,
    },
    {
      time: 4.9,
      type: "camera",
      mode: "dramatic_zoom",
      target: "grandpa",
      cut: "instant",
      shake: 0.26,
    },
    {
      time: 5.0,
      type: "sfx",
      sound: "vine_boom",
      volume: 0.88,
    },
    {
      time: 5.0,
      type: "action",
      actor: "grandpa",
      anim: "terrified",
      loop: true,
    },
    {
      time: 5.2,
      type: "dialogue",
      actor: "grandpa",
      text: "UH OH... SHE HEARD ME!",
      duration: 1.9,
    },
    {
      time: 6.8,
      type: "sfx",
      sound: "granny_chase",
      volume: 0.34,
    },
    {
      time: 6.9,
      type: "camera",
      mode: "chase_cam",
      target: "grandpa",
      cut: "whip",
    },
    {
      time: 7.0,
      type: "move",
      actor: "grandpa",
      to: "living_room",
      anim: "run2",
      duration: 4.2,
    },
    {
      time: 7.3,
      type: "move",
      actor: "granny",
      to: "living_room_entry",
      anim: "run",
      duration: 4.1,
    },
    {
      time: 8.2,
      type: "dialogue",
      actor: "granny",
      text: "GET BACK HERE OLD MAN!!",
      duration: 2.0,
    },
    {
      time: 9.2,
      type: "sfx",
      sound: "whoosh",
      volume: 0.7,
    },
    {
      time: 10.4,
      type: "camera",
      mode: "wide",
      target: "living_room_entry",
      cut: "whip",
    },
    {
      time: 11.2,
      type: "action",
      actor: "grandpa",
      anim: "jump",
      facing: "living_room_entry",
      loop: false,
    },
    {
      time: 11.3,
      type: "sfx",
      sound: "whoosh",
      volume: 0.75,
    },
    {
      time: 11.7,
      type: "action",
      actor: "granny",
      anim: "punch",
      facing: "living_room",
      loop: false,
    },
    {
      time: 12.1,
      type: "sfx",
      sound: "bonk",
      volume: 0.9,
    },
    {
      time: 12.1,
      type: "camera",
      mode: "closeup",
      target: "grandpa",
      cut: "instant",
      shake: 0.42,
    },
    {
      time: 12.3,
      type: "dialogue",
      actor: "grandpa",
      text: "MY BACK!!",
      duration: 1.8,
    },
    {
      time: 12.6,
      type: "action",
      actor: "grandpa",
      anim: "sit",
      loop: true,
    },
    {
      time: 13.5,
      type: "camera",
      mode: "closeup",
      target: "granny",
      cut: "whip",
    },
    {
      time: 13.6,
      type: "action",
      actor: "granny",
      anim: "laugh",
      loop: true,
    },
    {
      time: 13.7,
      type: "sfx",
      sound: "granny_laugh",
      volume: 0.88,
    },
    {
      time: 14.2,
      type: "dialogue",
      actor: "granny",
      text: "NOBODY STEALS MY COOKIES!",
      duration: 2.4,
    },
    {
      time: 15.8,
      type: "camera",
      mode: "dramatic_zoom",
      target: "granny",
      cut: "instant",
      shake: 0.14,
    },
    {
      time: 16.0,
      type: "sfx",
      sound: "tada",
      volume: 0.72,
    },
    {
      time: 16.6,
      type: "sfx",
      sound: "kaching",
      volume: 0.72,
    },
    {
      time: 16.7,
      type: "dialogue",
      actor: "granny",
      text: "SUBSCRIBE OR GRANNY FINDS YOU!",
      duration: 1.3,
    },
  ],
};

export const EPISODE_PRESETS = {
  jump_run_walk_6s: JUMP_RUN_WALK_EPISODE,
  cookies_chase_18s: COOKIES_CHASE_EPISODE,
};

export const DEFAULT_EPISODE = JUMP_RUN_WALK_EPISODE;

