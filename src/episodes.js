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
  breakfastSurprise,
  goldenPizzaWakeup,
  goldenPizzaBalcony,
  goldenPizzaKitchen,
  goldenPizzaDecoy,
  goldenPizzaDanceoff,
  goldenPizzaDelivery,
  goldenPizzaShootout,
  goldenPizzaChest,
  goldenPizzaLava,
  goldenPizzaFinale,
} from "./gags/index.js";

export const COMEDY_VARIETY_1M = buildEpisode({
  title: "Granny & Grandpa: Comedy Variety Show (68s)",
  gags: [
    cookieHeist({ location: "kitchen_to_hall" }),
    couchHog({ winner: "granny", loser: "grandpa" }),
    chestFakeout({ location: "living_to_hall" }),
    sneakPhotobomb({ location: "foyer_to_dining" }),
    ballRace({ location: "hall_to_foyer" }),
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
function withGoalProp(gag, { id, spawn, at, actor, spawnOffset = { x: 0.42, z: 0 } }) {
  const props = [...(gag.props || []), { id, type: "cookie", spawn, spawnOffset, visible: true }];
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
    }),
    cookieTrial({}),
    kickabout({}),
    // `withGoalProp` keeps the last cookie on camera through the middle act and
    // the payoff, so the episode is about one object from start to finish.
    withGoalProp(chestFakeout({ location: "living_to_hall" }), {
      id: "chest_cookie",
      spawn: "living_room_left",
      at: 9.6,
      actor: "grandpa",
    }),
    withGoalProp(talkSofa({}), {
      id: "sofa_cookie",
      spawn: "living_room_shelf_top",
      at: 14.2,
      actor: "granny",
    }),
    sneakPhotobomb({ location: "foyer_to_dining" }),
    cookiePayback({}),
    withGoalProp(cookieHeist({ location: "kitchen_to_hall" }), {
      id: "heist_cookie",
      spawn: "kitchen_table_top",
      at: 11.4,
      actor: "grandpa",
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

export const BREAKFAST_SURPRISE_20S = buildEpisode({
  title: "Granny's Breakfast Surprise (20s Physical Acting Reference)",
  gags: [breakfastSurprise({})],
});

export const GOLDEN_PIZZA_SHENANIGANS_4M = buildEpisode({
  title: "Granny & Grandpa: The Golden Pizza Shenanigans (4:38)",
  gags: [
    goldenPizzaWakeup(),
    goldenPizzaBalcony(),
    goldenPizzaKitchen(),
    goldenPizzaDecoy(),
    goldenPizzaDanceoff(),
    goldenPizzaDelivery(),
    goldenPizzaShootout(),
    goldenPizzaChest(),
    goldenPizzaLava(),
    goldenPizzaFinale(),
  ],
  story: {
    premise:
      "A steaming, legendary Golden Pizza appears upstairs and Granny, Grandpa, and the Player turn the entire two-story house into a slapstick obstacle course over who gets the first slice.",
    goal: "Keep track of the Golden Pizza across every wacky prank and bring it safely to the family dining table.",
    goalProp: "golden_pizza",
    resolution:
      "After surviving balcony drops, decoy cakes, dance-offs, flying blasters, hallway penalties, and a bubbling pizza-sauce floor, everyone shares a celebratory feast — until Grandpa tries sneaking the last slice.",
    scenes: [
      {
        objective: "Discover the steaming Golden Pizza in the upstairs bedroom before Grandpa wakes up",
        obstacle: "Grandpa catches the scent mid-nap and snatches it first",
        turn: "Granny bursts around the corner and intercepts the pizza downstairs",
      },
      {
        objective: "Intercept Granny along the upstairs balcony before she reaches the stairs",
        obstacle: "Granny uses spin-kicks and ego-parades to block the hallway",
        turn: "Grandpa accidentally sends a bouncy ball flying over the railing while Granny escapes",
      },
      {
        objective: "Survive Granny's turbo pizza-flipping stunt inside the kitchen",
        obstacle: "Granny launches the Golden Pizza high onto the refrigerator shelf",
        turn: "Grandpa bonks his head trying to reach it while Granny reels it back down",
      },
      {
        objective: "Pull off a decoy-cake switcheroo on the dining room table",
        obstacle: "Granny inspects the frosting up close with suspicious eyes",
        turn: "She discovers the cake is hollow cardboard and bonks Grandpa back into line",
      },
      {
        objective: "Win custody of the Golden Pizza in a living room boombox dance-off",
        obstacle: "Granny throws down robot disco moves and martial-arts kicks",
        turn: "Grandpa trips over the runaway emoji ball and Granny takes the trophy",
      },
      {
        objective: "Unbox the mystery foyer delivery package during Granny and Grandpa's argument",
        obstacle: "Both seniors bicker loudly right in front of the front door",
        turn: "A toy blaster and soda can pop out, sending Grandpa diving into the stairs",
      },
      {
        objective: "Referee Granny and Grandpa's chaotic back-hall pizza trophy penalty shootout",
        obstacle: "High-speed emoji ball shots ricochet across the narrow hallway",
        turn: "Grandpa blocks one with his forehead while Granny snatches the pizza off the bed",
      },
      {
        objective: "Crack open the locked treasure chest guarding the Golden Pizza",
        obstacle: "Granny parades around with the golden key and locks the padlock tight",
        turn: "Grandpa slams the prank red button, blasting the lock open and bolting with the pie",
      },
      {
        objective: "Rescue the Golden Pizza from a bubbling floor-is-pizza-sauce disaster in the foyer",
        obstacle: "Spilled spicy sauce floods the ground floor as Granny scrambles up the stairs",
        turn: "The Golden Pizza hovers safely above the sauce until everyone calls a temporary truce",
      },
      {
        objective: "Celebrate a peaceful family pizza feast at the dining table",
        obstacle: "Nobody can resist eyeing the final steaming slice",
        turn: "Grandpa reaches in for one last sneak grab and Granny raises her giant spatula laughing",
      },
    ],
  },
});
