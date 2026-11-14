/**
 * WoDX Chronicle: standing before the law in the world (B3614-B3615). The rules are in law-standing-rules.mjs.
 *   Setting  lawStanding: history (default), softened or off
 *   Reads    the character's social rank from WoDX NPC (api.standing.rank), and the law family of where they are
 *   Used by  trials (difficulty), sentences (the tier) and WoDX Storyteller's climbs in the offices (the cap)
 */
import {MODULE_ID, setting} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as S from "./law-standing-rules.mjs";
import * as place from "./place.mjs";

const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
const regionOf = scene => { try { return place.regionHere(scene)?.id ?? place.homeland() ?? "moravia"; } catch (e) { return "moravia"; } };

export function registerStandingSettings() {
  game.settings.register(MODULE_ID, "lawStanding", {name: "Standing before the law", hint: "How the law treats the unfree, the clergy, the nobility and the rich. As history by default; softened keeps the effects on trials and sentences but bars no one from office; off makes everyone equal before the law.",
    scope: "world", config: true, type: String, default: "history", choices: S.MODES});
}
export const mode = () => (S.MODES[setting("lawStanding")] ? setting("lawStanding") : "history");

/** The rank word WoDX NPC keeps for an actor, or "". */
function rankWord(actor) {
  try { return game.modules.get("wodx-npc")?.api?.standing?.rank?.(actor)?.word ?? ""; } catch (e) { return ""; }
}

/** How an actor stands before the law of a region in a year. */
export function standingFor(actor, region = regionOf(globalThis.canvas?.scene), year = yearNow()) {
  return S.standingOf(rankWord(actor), L.familyOf(region).id, year, mode());
}
/** The highest rank an actor may reach in an institution of this kind (for WoDX Storyteller's climbs). */
export const officeCap = (actor, kind, region, year) => S.capFor(standingFor(actor, region, year), kind);

export {S as rules};
