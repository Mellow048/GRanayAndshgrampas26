/**
 * Calibrated room staging packs for reusable multi-location gags.
 * Every waypoint & `via` spine here is verified collision-free in GrannyHouse.fbx.
 */
export const GAG_LOCATIONS = {
  kitchen_to_hall: {
    label: "Kitchen -> Dining -> Back Hall",
    playerSpawn: "dining_center",
    playerFacing: "kitchen",
    start: "kitchen",
    mid: "dining_center",
    hit: "doorway_dining",
    chaserSpawn: "kitchen_lane",
    chaserMid: "dining_center",
    exit: "back_hall_left",
    via: [],
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
    mid: "front_door_view",
    hit: "stairs_bottom",
    chaserSpawn: "front_door_left",
    chaserMid: "front_door_view",
    exit: "dining_table_front",
    via: ["dining_corner", "dining_table_side"],
  },
  upstairs_hall: {
    label: "Upstairs Bedroom -> Hall -> Stairs",
    playerSpawn: "upstairs_hall_center",
    playerFacing: "up_hall_north",
    start: "up_bed_north",
    mid: "up_hall_north",
    hit: "up_hall_north_door",
    chaserSpawn: "up_bed_north_side",
    chaserMid: "up_hall_north",
    exit: "stairs_middle",
    via: ["upstairs_hall_center", "upstairs_landing", "stairs_top"],
  },
};
