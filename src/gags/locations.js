/**
 * Calibrated ground-floor room staging packs for reusable multi-location gags.
 * Every waypoint & `via` spine here is verified on the real baked house floor (`src/nav/houseNav.js`)
 * and keeps safe clearance around solid tables, counters, and sofas (`src/furnitureColliders.js`).
 */
export const GAG_LOCATIONS = {
  kitchen_to_hall: {
    label: "Kitchen -> Dining -> Back Hall",
    playerSpawn: "hall_corner",
    playerFacing: "kitchen",
    start: "kitchen",
    mid: "dining_center",
    hit: "doorway_dining",
    chaserSpawn: "kitchen_lane",
    chaserMid: "dining_center",
    exit: "back_hall_left",
    via: ["doorway_dining"],
  },
  living_to_hall: {
    label: "Living Room -> East Hall -> Back Hall",
    playerSpawn: "living_room_view",
    playerFacing: "living_room",
    start: "living_room",
    mid: "living_room_entry",
    hit: "doorway_living",
    chaserSpawn: "living_room_right",
    chaserMid: "living_room_entry",
    exit: "back_hall",
    via: ["back_room_east"],
  },
  foyer_to_dining: {
    label: "Front Door -> Foyer -> Dining Room",
    playerSpawn: "front_door_view",
    playerFacing: "front_door_pkg",
    start: "front_door_pkg",
    mid: "front_door_right",
    hit: "foyer_atrium",
    chaserSpawn: "front_door_left",
    chaserMid: "foyer",
    exit: "dining_table_front",
    via: ["dining_corner", "dining_table_side"],
  },
  hall_to_foyer: {
    label: "Back Hall -> Foyer -> Front Door",
    playerSpawn: "back_hall",
    playerFacing: "back_hall_left",
    start: "back_hall_left",
    mid: "back_hall_right",
    hit: "hallway",
    chaserSpawn: "back_room_east",
    chaserMid: "hallway",
    exit: "front_door_view",
    via: ["foyer_atrium"],
  },
};
