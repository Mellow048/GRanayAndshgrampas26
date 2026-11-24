// Episodes composed from modular gags. Registered in config.js EPISODE_PRESETS.
import { buildEpisode } from "./episodeBuilder.js";
import {
  ballRace,
  cookieHeist,
  couchHog,
  chestFakeout,
  sneakPhotobomb,
  cookieTrial,
  kickabout,
  talkSofa,
  cookiePayback,
  tagChase,
  carRide,
  footRace,
  wakeAndFindCar,
  carTransformation,
  carHouseLoop,
  rideWrap,
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

/**
 * The 2:30 marathon. Eight gag modules, four of them new, chained by
 * buildEpisode() with black-frame cuts. This is the first preset in the repo
 * past the two-minute mark that is built from gags rather than hand-written
 * acts — the point of it is to prove the modular path scales in duration
 * without the pacing or staging gates starting to complain.
 */
/**
 * Puts the episode's goal object on stage in a scene that does not otherwise
 * have one, without touching the reusable gag.
 *
 * The 2:30 cut had a cookie in scene 2, scene 7 and nowhere else: a viewer who
 * looked away for forty seconds could not tell what anybody wanted. Declaring
 * the prop is enough for it to be reset on stage by the builder; the extra beat
 * is what makes an actor *acknowledge* it, so the object is part of the action
 * rather than scenery.
 */
function withGoalProp(gag, { id, spawn, at, actor, yOffset = 0.4 }) {
  const props = [...(gag.props || []), { id, type: "cookie", spawn, yOffset, visible: true }];
  const beats = [...gag.beats];
  if (actor) {
    beats.push({ at: Math.min(at, gag.duration - 1.2), type: "char_face", actor, target: id, instant: true });
    beats.push({ at: Math.min(at + 0.35, gag.duration - 0.8), type: "char_prop", actor, prop: id, hand: "right" });
  }
  return { ...gag, props, beats };
}

export const COOKIE_MARATHON_150S = buildEpisode({
  title: "Granny & Grandpa: The Cookie Marathon (2:30)",
  gags: [
    // The premise is stated in the opening scene: the last cookie is on the
    // table between them and both of them are looking at it.
    withGoalProp(couchHog({}), {
      id: "opening_cookie",
      spawn: "living_room_sofa",
      at: 8.4,
      actor: "granny",
      yOffset: 0.5,
    }),
    cookieTrial({}),
    kickabout({}),
    // `withGoalProp` keeps the last cookie on camera through the middle act and
    // the payoff, so the episode is about one object from start to finish.
    withGoalProp(chestFakeout({ location: "living_to_hall" }), {
      id: "chest_cookie",
      spawn: "living_room",
      at: 9.6,
      actor: "grandpa",
      yOffset: 0.62,
    }),
    withGoalProp(talkSofa({}), {
      id: "sofa_cookie",
      spawn: "living_room_left",
      at: 14.2,
      actor: "granny",
      yOffset: 0.55,
    }),
    sneakPhotobomb({ location: "foyer_to_dining" }),
    cookiePayback({}),
    withGoalProp(cookieHeist({ location: "kitchen_to_hall" }), {
      id: "heist_cookie",
      spawn: "kitchen",
      at: 11.4,
      actor: "grandpa",
      yOffset: 0.58,
    }),
  ],
  story: {
    premise: "There is exactly one cookie left in the house and both Granny and Grandpa want it.",
    goal: "be the one still holding the last cookie when the scene ends",
    goalProp: "cookie",
    resolution: "Grandpa swallows the last bite and Granny is left holding the empty jar.",
    scenes: [
      {
        objective: "take the good end of the couch before Grandpa settles in",
        obstacle: "Grandpa is already sitting on it",
        turn: "Granny wins the cushion and loses the remote",
      },
      {
        objective: "prove Grandpa is the one who ate the cookie",
        obstacle: "the only evidence is a plate of crumbs",
        turn: "the judge turns out to be the suspect",
      },
      {
        objective: "wear Grandpa out with a kickabout so he stops guarding the kitchen",
        obstacle: "the ball keeps coming straight back",
        turn: "it ends up exactly where the cookie jar is kept",
      },
      {
        objective: "get the cookie out of the chest before Grandpa notices",
        obstacle: "the chest is rigged to spring open",
        turn: "the chest holds the cookie and not the treasure",
      },
      {
        objective: "talk Granny into admitting where the cookie went",
        obstacle: "she will not stop talking about herself",
        turn: "she admits she ate it, on camera",
      },
      {
        objective: "catch whoever keeps stepping into the shot",
        obstacle: "they are always directly behind the lens",
        turn: "it is Grandpa, and he has the cookie",
      },
      {
        objective: "make Grandpa pay for the theft",
        obstacle: "he is faster than he looks",
        turn: "the jar he is guarding is already empty",
      },
      {
        objective: "get to the kitchen before Grandpa finishes the last cookie",
        obstacle: "Grandpa is standing between the doorway and the jar",
        turn: "the cookie is gone and the crumbs lead to him",
      },
    ],
  },
});

/**
 * Three kid activities, played entirely through gesture and physical comedy.
 * Only the car gag uses a prop. 3 x 15s gags plus two 0.4s cuts = 45.8s,
 * below the framework's 60-second story-spine threshold.
 */
export const SHENANIGANS_45S = buildEpisode({
  title: "Granny & Grandpa: Shenanigans (45s)",
  gags: [
    tagChase(),
    carRide(),
    footRace(),
  ],
});

/**
 * Two-minute framework smoke test: wake, find a toy car, throw/grow it,
 * drive a waypoint loop through the actual house, and stage a safe Granny
 * pratfall. The house has no navigable stair flight or exterior road, so the
 * upstairs-to-kitchen descent is an explicit black-frame cut.
 */
export const WAKE_TO_RIDE_120S = buildEpisode({
  title: "Wake Up, Grow a Car, and Drive Around the House (2-Minute Test)",
  transitions: "continuous",
  gags: [wakeAndFindCar(), carTransformation(), carHouseLoop(), rideWrap()],
  story: {
    premise: "The player wakes upstairs to find a tiny toy car waiting on the kitchen counter beside Grandpa, asleep at the table; Granny is nowhere in sight.",
    goal: "carry the toy car to open space, see if it can become a real ride, and take it around the house.",
    goalProp: "car",
    resolution: "The toy grows into a little open-top car. On the first loop, hidden Granny meets it at a blind corner and gets a safe, exaggerated jump; the car parks and everyone nods that the ride was fun.",
    scenes: [
      { objective: "wake up and find out why a tiny car is on the counter", obstacle: "the trip to the kitchen is long and Grandpa is still asleep on the table", turn: "the player picks up the very small car while Grandpa nods in his sleep", beats: ["wake beside the bed", "make the implied descent", "discover Grandpa and pick up the car"] },
      { objective: "carry the toy to an open patch and test it", obstacle: "it is only a palm-sized toy", turn: "the toss lands and the car grows into an open-top ride" },
      { objective: "drive a full loop through the house", obstacle: "Granny appears from a blind doorway just as the car arrives", turn: "a gentle staged bump sends her into a comic jump and trip", beats: ["start the house loop", "round the blind dining doorway", "finish the loop after the gag"] },
      { objective: "finish the loop and check on the family", obstacle: "Granny has to walk back from the dining room while Grandpa wakes slowly", turn: "the car parks, Granny laughs, and both grandparents nod back" },
    ],
  },
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
