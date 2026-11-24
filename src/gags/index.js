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
export { cookieTrial } from "./cookieTrial.js";
export { kickabout } from "./kickabout.js";
export { talkSofa } from "./talkSofa.js";
export { cookiePayback } from "./cookiePayback.js";
export { tagChase } from "./tagChase.js";
export { carRide } from "./carRide.js";
export { footRace } from "./footRace.js";
export { wakeAndFindCar } from "./wakeAndFindCar.js";
export { carTransformation } from "./carTransformation.js";
export { carHouseLoop } from "./carHouseLoop.js";
export { rideWrap } from "./rideWrap.js";

import { ballRace } from "./ballRace.js";
import { cookieHeist } from "./cookieHeist.js";
import { couchHog } from "./couchHog.js";
import { chestFakeout } from "./chestFakeout.js";
import { sneakPhotobomb } from "./sneakPhotobomb.js";
import { cookieTrial } from "./cookieTrial.js";
import { kickabout } from "./kickabout.js";
import { talkSofa } from "./talkSofa.js";
import { cookiePayback } from "./cookiePayback.js";
import { tagChase } from "./tagChase.js";
import { carRide } from "./carRide.js";
import { footRace } from "./footRace.js";
import { wakeAndFindCar } from "./wakeAndFindCar.js";
import { carTransformation } from "./carTransformation.js";
import { carHouseLoop } from "./carHouseLoop.js";
import { rideWrap } from "./rideWrap.js";

// Registry of previewable gag factories for Studio "Gag Lab" & `?gag=<name>`
export const GAG_REGISTRY = {
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
};
