/**
 * schema.js — zero-dependency single source of truth for runtime-supported
 * prop types, beat types, prop actions, and player gestures.
 *
 * Imported by both `src/catalog.js` and `src/episodeSafety.js` so the
 * validator, catalogue CLI, and runtime can never drift out of sync.
 */

export const PROP_TYPES = [
  "golden_key",
  "padlock",
  "red_button",
  "emoji_ball",
  "toy_blaster",
  "treasure_chest",
  "delivery_box",
  "rising_lava",
  "cookie",
  "cookie_jar",
  "soda_can",
  "bed",
  "shelf",
  "frying_pan",
  "breakfast_plate",
  "coffee_mug",
  "serving_tray",
  "pillow",
  "custom",
];

export const CUSTOM_PART_SHAPES = new Set(["box", "cylinder", "sphere", "cone", "torus"]);

export const PROP_TYPE_SET = new Set(PROP_TYPES);

export const BEAT_TYPES = [
  "anim",
  "char_anim",
  "char_bubble",
  "char_cut",
  "char_face",
  "face",
  "char_gesture",
  "char_arm",
  "char_head_track",
  "char_move",
  "move",
  "char_prop",
  "char_prop_action",
  "cut",
  "fade",
  "player_crouch",
  "player_gesture",
  "player_hold",
  "player_look",
  "player_pose",
  "player_walk",
  "player_zoom",
  "prop_action",
  "bgm",
  "stop_bgm",
  "sfx",
];

export const BEAT_TYPE_SET = new Set(BEAT_TYPES);

export const PROP_ACTIONS = [
  "reset",
  "show",
  "hide",
  "pickup",
  "place",
  "glide",
  "attach",
  "detach",
  "steam",
  "open",
  "close",
  "press",
  "unpress",
  "rise_to",
  "pop_out",
  "bounce",
  "bite",
  "stop",
];

export const PROP_ACTION_SET = new Set(PROP_ACTIONS);
