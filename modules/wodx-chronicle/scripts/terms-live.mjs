/**
 * WoDX shared terms in play (B6180-B6199): the pure terms (terms.mjs) plus what needs the running game. Every module
 * reaches it as game.modules.get("wodx-chronicle").api.terms.
 */
import * as T from "./terms.mjs";
import {setting} from "./util.mjs";
import {placeOf} from "./place.mjs";
import {placeTime} from "./place-rules.mjs";

/** Seconds a turn takes at this table: WoDX Combat's house rule when it is set, else the books' three (B6191). */
export function turnSeconds() {
  try {
    const v = Number(game.settings.get("wodx-combat", "turnSeconds"));
    return Number.isFinite(v) && v > 0 ? v : T.TURN_SECONDS;
  } catch (e) { return T.TURN_SECONDS; }
}

const sceneOf = s => s ?? globalThis.canvas?.scene ?? game.scenes?.active ?? null;
/** The latitude and local time a scene keeps (its own place, else the chronicle's home). */
export function placeNow(scene = null, time = game.time?.worldTime ?? 0) {
  let home = 50.1;
  try { home = Number(setting("latitude")); } catch (e) { /* default */ }
  return placeTime(placeOf(sceneOf(scene)), time, home);
}
/** Is it night on a scene now (sunset to sunrise where the scene stands)? B6185. */
export function isNightHere(scene = null, time = game.time?.worldTime ?? 0) {
  const p = placeNow(scene, time);
  return T.isNightAt(p.time, p.latitude);
}
export const toDawnHere = (scene = null, time = game.time?.worldTime ?? 0) => { const p = placeNow(scene, time); return T.toDawn(p.time, p.latitude); };
export const toDuskHere = (scene = null, time = game.time?.worldTime ?? 0) => { const p = placeNow(scene, time); return T.toDusk(p.time, p.latitude); };

/** The scene count WoDX Actions keeps (each End the scene and each new map adds one); 0 without Actions. */
export function sceneNo() {
  try { return Number(game.settings.get("wodx-actions", "sceneTally")) || 0; } catch (e) { return 0; }
}
/** The key for a period now, from the clock, the fight and the scene count (terms.periodKey). */
export function periodNow(per) {
  return T.periodKey(per, {worldTime: game.time?.worldTime ?? 0, combat: game.combat?.started ? game.combat : null, scene: sceneNo(), turnSeconds: turnSeconds()});
}

export function termsApi() {
  return {...T, turnSeconds, placeNow, isNightHere, toDawnHere, toDuskHere, sceneNo, periodNow};
}
