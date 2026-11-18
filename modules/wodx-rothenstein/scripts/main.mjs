/**
 * WoDX Rothenstein (the version is in module.json): the chronicle "What Sleeps Beneath Rothenstein". Loading this
 * module registers the chronicle with WoDX Chronicle (register.mjs); a world without this module on has no
 * Rothenstein in it. The chronicle's data is in chronicle.mjs and data/.
 */
import {PACK} from "./register.mjs";

Hooks.once("init", () => {
  const mod = game.modules.get("wodx-rothenstein");
  if ( mod ) mod.api = {chronicle: PACK.manifest, pack: PACK};
});
