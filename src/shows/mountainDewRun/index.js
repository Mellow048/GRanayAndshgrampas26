import wake from "./scene1-wake.js";
import argument from "./scene2-argument.js";
import fridge from "./scene3-fridge.js";
import bed from "./scene4-bed.js";

/**
 * "Monday Morning Mountain Dew" — a 4-scene, ~61s POV short.
 *
 * Storyboard:
 *   1. wake     — lie in bed, sit up, shamble to the stairs
 *   2. argument — Granny & Grandpa bickering; we sigh and ignore them
 *   3. fridge   — grab the soda can, carry it up the stairs
 *   4. bed      — set the can on the nightstand, collapse back into bed
 *
 * Each scene lives in its own file and can be previewed on its own:
 *   http://localhost:8000/?show=mountain_dew_run&scene=bed
 */
export const MOUNTAIN_DEW_RUN = {
  id: "mountain_dew_run",
  title: "Monday Morning Mountain Dew (4 scenes)",
  aspect: "16:9",
  scenes: [wake, argument, fridge, bed],
};

export default MOUNTAIN_DEW_RUN;
