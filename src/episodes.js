// Episodes composed from modular gags. Registered in config.js EPISODE_PRESETS.
import { buildEpisode } from "./episodeBuilder.js";
import {
  ballRace,
  cookieHeist,
  couchHog,
  chestFakeout,
  sneakPhotobomb,
} from "./gags/index.js";

export const COMEDY_VARIETY_1M = buildEpisode({
  title: "Granny & Grandpa: Comedy Variety Show (68s)",
  gags: [
    cookieHeist({ location: "kitchen_to_hall" }),
    couchHog({ winner: "granny", loser: "grandpa" }),
    chestFakeout({ location: "living_to_hall" }),
    sneakPhotobomb({ location: "foyer_to_dining" }),
    ballRace({ location: "upstairs_hall" }),
  ],
});

export const COOKIE_HEIST_15S = buildEpisode({
  title: "Cookie Heist (15s Gag Showcase)",
  gags: [cookieHeist({ location: "kitchen_to_hall" })],
});

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
