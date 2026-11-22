// Episodes made from gags. Registered in config.js EPISODE_PRESETS.
import { buildEpisode } from "./episodeBuilder.js";
import { ballRace } from "./gags/index.js";

export const ROCKET_BALL_TEST = buildEpisode({
  title: "Rocket Ball Test",
  playerSpawn: "dining_center",
  playerFacing: "kitchen",
  gags: [ballRace()],
});

// 3 back-to-back runs across 3 different rooms with swapped roles
export const ROCKET_BALL_x3 = buildEpisode({
  title: "Rocket Ball x3",
  playerSpawn: "dining_center",
  playerFacing: "kitchen",
  gags: [
    ballRace({ location: "kitchen_to_hall" }),
    ballRace({ location: "living_to_hall", victim: "granny", chaser: "grandpa" }),
    ballRace({ location: "foyer_to_dining" }),
  ],
});
