import wake from "./scene1-wake.js";
import argument from "./scene2-argument.js";
import fridge from "./scene3-fridge.js";
import bed from "./scene4-bed.js";

/**
 * "Monday Morning Mountain Dew" — a 4-scene, ~79s POV short, CONTINUOUS.
 *
 * No cuts, no fades, no teleports between scenes: each scene starts on the
 * exact frame the previous one ended on (same spot, same held prop, same people
 * in the same places).
 *
 *   1. wake    13s — lie in bed, get up, walk out to the top of the stairs
 *   2. argument 26s — walk down; Granny & Grandpa bicker; they clock us; sigh;
 *                     we carry on into the kitchen
 *   3. fridge   18s — open the fridge, take the can, shut it, walk back out
 *   4. bed      22s — up the stairs, put the can on the nightstand, lie down
 *
 * Each scene lives in its own file and can be previewed on its own:
 *   http://localhost:8000/?show=mountain_dew_run&scene=bed
 */
export const MOUNTAIN_DEW_RUN = {
  id: "mountain_dew_run",
  title: "Monday Morning Mountain Dew (4 scenes)",
  aspect: "16:9",
  // Continuous by default: scene boundaries change nothing on screen.
  transitions: "continuous",
  scenes: [wake, argument, fridge, bed],
};

export default MOUNTAIN_DEW_RUN;
