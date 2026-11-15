/**
 * WoDX Otherworlds: turning to spirit goes on by itself once approved (B5017, desk pick o1).
 * The year-and-a-day and Disembodiment approvals set the flags spiritChange and disembodied; from then on the active
 * Storyteller's client counts the time the traveller spends in the spirit world, raises the step (fading-rules.mjs),
 * tells the Storyteller and the player when it rises, puts the step's effect on the rolls through WoDX Chronicle's
 * roll sources, and shows it on the token as a pale cold aura.
 */
import {MODULE_ID} from "./ratings.mjs";
import {STATUS, worldOf} from "./crossing.mjs";
import * as F from "./fading-rules.mjs";

const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const KINDS = {spirit: "spiritChange", disembodied: "disembodied"};

/** Whether the traveller is in the spirit world now, for the kind of change. */
export function awayNow(actor, kind) {
  if ( kind === "spirit" ) return worldOf(actor)?.in === "umbra";
  return !!actor?.statuses?.has?.(STATUS.deep.id);
}
/** The changes on an actor: [{kind, flag}] */
export function changesOf(actor) {
  return Object.entries(KINDS).map(([kind, key]) => ({kind, flag: actor?.flags?.[MODULE_ID]?.[key] ?? null})).filter(x => x.flag && x.flag.begun !== undefined);
}

/** Active GM: count the time away and raise the steps. Returns the number of steps that rose. */
export async function tick(now = game.time.worldTime) {
  if ( !game.user?.isGM || game.users.activeGM?.id !== game.user.id ) return 0;
  let rose = 0;
  for ( const actor of game.actors ?? [] ) {
    for ( const {kind, flag} of changesOf(actor) ) {
      const last = Number.isFinite(Number(flag.last)) ? Number(flag.last) : Number(flag.begun) || now;
      const away = (Number(flag.away) || 0) + (awayNow(actor, kind) ? Math.max(0, now - last) : 0);
      const step = Math.max(Number(flag.step) || 1, F.stepOf(away));
      if ( away === flag.away && last === now && step === flag.step ) continue;
      await actor.setFlag(MODULE_ID, KINDS[kind], {...flag, away, last: now, step});
      if ( step > (Number(flag.step) || 1) ) {
        rose++;
        const whisper = game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id);
        await ChatMessage.create({whisper, speaker: {alias: "WoDX"}, content: `<div class="wodx-card"><p><strong>${esc(actor.name)}</strong> ${esc(F.stepText(kind, step))}</p></div>`});
      }
    }
  }
  if ( rose ) chron()?.tokenLooks?.refresh?.();
  return rose;
}

/** WoDX Chronicle roll source: the step's effect on the rolls with these tags. */
function rollSource(actor, ctx = {}) {
  if ( (ctx.channel ?? "roll") !== "roll" ) return [];
  const want = new Set((ctx.tags ?? []).map(t => String(t).toLowerCase()));
  const out = [];
  for ( const {kind, flag} of changesOf(actor) ) {
    const inFlesh = !awayNow(actor, kind);
    for ( const e of F.stepEffects(kind, flag.step ?? 1, {inFlesh}) ) if ( e.tags.some(t => t === "all" || want.has(t)) ) out.push({key: e.key, name: e.name, dice: e.dice, diff: e.diff, note: ""});
  }
  return out;
}
function tokenLook(token) {
  const steps = changesOf(token?.actor).map(c => Number(c.flag.step) || 1);
  return steps.length ? F.lookOf(Math.max(...steps)) : null;
}

let ready = false;
export function setupFading() {
  const go = () => {
    if ( ready ) return;
    const c = chron();
    if ( !c ) return;
    ready = true;
    try { c.traits?.addSource?.(rollSource); } catch (e) { console.warn("WoDX | fading rolls", e); }
    try { c.tokenLooks?.register?.("otherworlds.fading", tokenLook); c.tokenLooks?.refresh?.(); } catch (e) { console.warn("WoDX | fading look", e); }
  };
  if ( chron() ) go(); else Hooks.once("wodxChronicleReady", go);
  let soon = null;
  Hooks.on("updateWorldTime", () => { clearTimeout(soon); soon = setTimeout(() => { if ( !chron()?.isSkipping?.() ) tick().catch(e => console.error("WoDX | fading", e)); }, 500); });
  Hooks.on("wodxSkipEnd", () => tick().catch(e => console.error("WoDX | fading", e)));
}
export const api = () => ({tick, changesOf, awayNow, rules: F});
