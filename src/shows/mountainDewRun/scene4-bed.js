import { defineScene } from "../sceneKit.js";

/**
 * Scene 4 — Back To Bed (12s)
 *
 * The payoff beat the whole run exists for: put the can down on the nightstand
 * (a real surface — `prop_action place` re-seats it with the same surface probe
 * the gate uses), then collapse back into bed.
 */
export default defineScene({
  id: "bed",
  title: "Back To Bed",
  room: "bedroom",
  duration: 12,
  playerSpawn: "up_bed_north_side",
  playerFacing: "up_bed_north",
  props: [{ id: "soda_can", type: "soda_can", spawn: "up_bed_top_west", rotationY: -0.3 }],
  notes: "The can is picked up in scene 3; `place` re-shows it on the nightstand surface.",
  beats: [
    { at: 0.0, type: "bgm", sound: "granny_ambience", volume: 0.18 },
    { at: 0.0, type: "fade", to: 0, duration: 0.6 },
    { at: 0.2, type: "player_hold", prop: "soda_can" },
    { at: 0.4, type: "player_walk", to: "up_bed_north", duration: 1.5 },

    // Set it down — the exact beat that was floating in the 15s cut.
    { at: 2.0, type: "player_look", target: "up_bed_top_west", duration: 0.3, track: true },
    { at: 2.8, type: "prop_action", prop: "soda_can", action: "place", waypoint: "up_bed_top_west" },
    { at: 2.8, type: "player_hold", prop: "none" },
    { at: 2.9, type: "sfx", sound: "pop", volume: 0.55 },
    { at: 3.6, type: "player_look", target: "up_bed_top_west", duration: 0.24, track: true },
    { at: 4.4, type: "player_gesture", gesture: "nod_yes", duration: 0.8 },
    { at: 4.5, type: "sfx", sound: "checkmark", volume: 0.6 },

    // Back into the hay.
    { at: 5.4, type: "player_walk", to: "up_bed_north_side", duration: 1.6 },
    { at: 7.2, type: "player_crouch", crouched: true, duration: 1.1 },
    { at: 7.3, type: "sfx", sound: "aww", volume: 0.5 },
    { at: 8.6, type: "player_gesture", gesture: "nod_yes", duration: 0.7 },
    { at: 9.2, type: "fade", to: 1, duration: 1.6 },
  ],
});
