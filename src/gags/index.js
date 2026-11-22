export { GAG_LOCATIONS } from "./locations.js";
export {
  react,
  launchProp,
  chase,
  sneakUp,
  walkTo,
  propAction,
  holdProp,
  lookAt,
  panic,
} from "./helpers.js";
export { ballRace } from "./ballRace.js";
export { cookieHeist } from "./cookieHeist.js";
export { couchHog } from "./couchHog.js";
export { chestFakeout } from "./chestFakeout.js";
export { sneakPhotobomb } from "./sneakPhotobomb.js";

import { ballRace } from "./ballRace.js";
import { cookieHeist } from "./cookieHeist.js";
import { couchHog } from "./couchHog.js";
import { chestFakeout } from "./chestFakeout.js";
import { sneakPhotobomb } from "./sneakPhotobomb.js";

// Registry of previewable gag factories for Studio "Gag Lab" & `?gag=<name>`
export const GAG_REGISTRY = {
  ballRace,
  cookieHeist,
  couchHog,
  chestFakeout,
  sneakPhotobomb,
};
