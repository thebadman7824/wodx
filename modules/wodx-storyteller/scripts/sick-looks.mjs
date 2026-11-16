/**
 * WoDX Storyteller: a sick character shows it (B4633, show-don't-tell desk c2).
 *
 * A character who has caught a town's sickness (the contagion state's people) carries the Sick status on their token
 * while it lasts, and a pale cast that everyone sees through WoDX Chronicle's token looks, so the party sees who is
 * ill. Getting better takes both away. The status is a WoDX Chronicle condition with no roll effect of its own: the
 * weekly Stamina rolls stay where they were.
 */
import * as R from "./contagion-rules.mjs";
import {MOD, chron, isActiveGM, setting} from "./core.mjs";

export const SICK = {id: "sick", name: "Sick", img: "icons/svg/poison.svg", source: "WoDX house rule (sickness in the towns)",
  summary: "Ill with a town's sickness: the Stamina rolls come each week until it passes. Pale and feverish to anyone who looks.", mods: {}};
/** The pale cast of the sick (a token look: a colour the token is washed with). */
export const PALLOR = {tint: 0xd4dcc4};

const people = () => { try { return R.normState(setting("contagionState")).people ?? {}; } catch (e) { return {}; } };
export const isSick = actor => !!(actor?.id && people()[actor.id]);

export function registerSick() {
  try { chron()?.registerCondition?.(SICK); } catch (e) { console.warn(`${MOD} | sick status`, e); }
  chron()?.tokenLooks?.register?.("storyteller.sick", token => (setting("townLooks") !== false && isSick(token?.actor) ? PALLOR : null));
}

/** The Sick status follows the contagion state (the active Storyteller's client). */
export async function syncSick() {
  if ( !isActiveGM() ) return 0;
  const set = chron()?.conditions?.setCondition, has = chron()?.conditions?.hasCondition;
  if ( !set || !has ) return 0;
  const ill = people();
  let n = 0;
  for ( const a of game.actors ) {
    const want = !!ill[a.id], now = has(a, "sick");
    if ( want !== now ) { try { await set(a, "sick", want); n++; } catch (e) { /* not a token actor */ } }
  }
  chron()?.tokenLooks?.refresh?.();
  return n;
}

export function setupSickLooks() {
  if ( chron()?.tokenLooks ) registerSick(); else Hooks.once("wodxChronicleReady", () => { registerSick(); chron()?.tokenLooks?.refresh?.(); });
  let soon = null;
  const later = () => { clearTimeout(soon); soon = setTimeout(() => { syncSick().catch(e => console.error(`${MOD} | sick status`, e)); chron()?.tokenLooks?.refresh?.(); }, 400); };
  Hooks.on("updateSetting", s => { if ( s?.key === `${MOD}.contagionState` ) later(); });
  Hooks.on("createSetting", s => { if ( s?.key === `${MOD}.contagionState` ) later(); });
  later();
}

export const api = () => ({isSick, sync: syncSick, SICK, PALLOR});
