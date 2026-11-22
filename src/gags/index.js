export { GAG_LOCATIONS } from "./locations.js";
export { react, launchProp, chase, lookAt, panic } from "./helpers.js";
export { ballRace } from "./ballRace.js";

// Registry of previewable gag factories for Studio "Gag Lab" & `?gag=<name>`
import { ballRace } from "./ballRace.js";

export const GAG_REGISTRY = {
  ballRace,
};
