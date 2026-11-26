/** Registers the Rothenstein chronicle with WoDX Chronicle's story engines. Pure: the harness imports it too. */
import {registerChronicle} from "../../wodx-rules/chronicle/chronicle-data.mjs";
import {PACK} from "../chronicle.mjs";

registerChronicle(PACK);
export {PACK};
