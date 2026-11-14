/**
 * WoDX Chronicle: the law's heat in the world (B3606-B3607). The rules are in law-heat-rules.mjs.
 *   Fed      by WoDX NPC's descriptions (hook wodxCrimeSeen): a crime with witnesses adds heat where it happened
 *   Stored   world setting lawHeat: {regions: {regionId: {actorId: entry}}}
 *   Told     the Storyteller gets a card when a culprit reaches Asked after, Wanted or Manhunt, with what it means to
 *            that kind of character and buttons to make the arrest or let it go
 *   Arrest   clears the heat and calls wodxArrest {actor, region, deeds}, which the trial picks up (B3608)
 * Players see their own stage on the Law here card when they have a dot of Law, Politics or Streetwise.
 */
import {MODULE_ID, esc, setting, setSetting, isActiveGM} from "./util.mjs";
import {currentYear} from "./eras.mjs";
import * as L from "./law-rules.mjs";
import * as H from "./law-heat-rules.mjs";
import * as place from "./place.mjs";

export function registerHeatSettings() {
  game.settings.register(MODULE_ID, "lawHeat", {scope: "world", config: false, type: Object, default: {regions: {}}});
  game.settings.register(MODULE_ID, "lawHeatOn", {name: "The law looks for criminals", hint: "Crimes that witnesses see raise the law's heat on the culprit in that land. A warrant and then a manhunt follow; the Storyteller decides on any arrest.",
    scope: "world", config: true, type: Boolean, default: true});
}
const on = () => setting("lawHeatOn") !== false;
const now = () => game.time?.worldTime ?? 0;
const yearNow = () => { try { return currentYear(); } catch (e) { return 1197; } };
export const state = () => H.normState(setting("lawHeat") ?? {});
const save = s => setSetting("lawHeat", H.normState(s));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const regionOf = scene => { try { return place.regionHere(scene)?.id ?? place.homeland() ?? "moravia"; } catch (e) { return "moravia"; } };
/** A character's line from its sheet type and variant (as WoDX Library's use-rules lineOf). */
function actorLine(a) {
  const t = String(a?.type ?? "").toLowerCase(), v = String(a?.system?.settings?.variant ?? "").toLowerCase();
  if ( t === "mortal" && (v === "ghoul" || v === "revenant") ) return v;
  if ( t === "changing breed" || t === "changingbreed" ) return "werewolf";
  if ( t === "pc" ) return "vampire";
  return Object.keys(H.LINE_HOOKS).includes(t) ? t : "mortal";
}

/** The heat on an actor in a region (cooled to now): {entry, heat, stage} or null. */
export function of(actorId, region = regionOf(globalThis.canvas?.scene)) {
  const e = state().regions[region]?.[actorId];
  if ( !e ) return null;
  const law = L.lawOf(region, yearNow());
  const heat = H.cooled(e, now(), law);
  return {entry: e, heat, stage: H.stageOf(heat), law};
}

/** Add a deed for a culprit at a scene. Returns the addDeed result. */
export async function addDeed(actor, deed, {scene = globalThis.canvas?.scene, named = false, witnesses = 1} = {}) {
  if ( !isActiveGM() || !on() || !actor?.id ) return null;
  const region = regionOf(scene), law = L.lawOf(region, yearNow());
  const s = state();
  s.regions[region] ??= {};
  const res = H.addDeed(s.regions[region][actor.id] ?? {}, {deed, law, now: now(), named, witnesses, where: scene?.name ?? "", id: actor.id, name: actor.name, line: actorLine(actor)});
  s.regions[region][actor.id] = res.entry;
  await save(s);
  if ( res.crossed ) await stageCard(actor, region, res, law);
  return res;
}

async function stageCard(actor, region, res, law) {
  const st = res.crossed, hook = H.LINE_HOOKS[res.entry.line] ?? "";
  const buttons = st.key === "asked" ? "" : `<button type="button" data-action="wodx-law-arrest" data-actor="${esc(actor.id)}" data-region="${esc(region)}">Make the arrest</button>
    <button type="button" data-action="wodx-law-drop" data-actor="${esc(actor.id)}" data-region="${esc(region)}">Let it go</button>`;
  await ChatMessage.create({speaker: {alias: "The law"}, whisper: gmIds(), flags: {[MODULE_ID]: {lawHeat: {actor: actor.id, region}}},
    content: `<div class="wodx-card wodx-law-heat"><h3>${esc(actor.name)}: ${esc(st.name)}</h3><p>${esc(st.note)}</p>
      <p class="hint">${esc(H.summary(res.entry, now(), law))}${law.bribe <= 2 ? " Here the watch can be bought cheaply." : ""}</p>${hook ? `<p><em>${esc(hook)}</em></p>` : ""}${buttons}</div>`});
}

/** Make the arrest: heat clears, and the trial hears of it. */
export async function arrest(actorId, region) {
  if ( !game.user.isGM ) return null;
  const s = state(), e = s.regions[region]?.[actorId];
  if ( !e ) return null;
  const law = L.lawOf(region, yearNow());
  s.regions[region][actorId] = {...H.lower(e, now(), law, 0), arrested: now()};
  await save(s);
  const actor = game.actors.get(actorId);
  Hooks.callAll("wodxArrest", {actor: actorId, name: actor?.name ?? e.name, region, deeds: e.deeds, year: yearNow()});
  return s.regions[region][actorId];
}
/** Let it go, or lower it by a factor (a bribe, an amnesty). */
export async function lowerHeat(actorId, region, factor = 0) {
  if ( !game.user.isGM ) return null;
  const s = state(), e = s.regions[region]?.[actorId];
  if ( !e ) return null;
  s.regions[region][actorId] = H.lower(e, now(), L.lawOf(region, yearNow()), factor);
  await save(s);
  return s.regions[region][actorId];
}
/** Clear all heat in a region (an amnesty, a new regime: B3612). */
export async function amnesty(region) {
  if ( !game.user.isGM ) return 0;
  const s = state(), count = Object.keys(s.regions[region] ?? {}).length;
  delete s.regions[region];
  await save(s);
  return count;
}

/** The player's own line for the Law here card. */
export function playerLine(actor, scene) {
  const h = actor?.id ? of(actor.id, regionOf(scene)) : null;
  return h && h.stage.key !== "none" ? `The law and you: ${h.stage.name}.` : "";
}

export function registerHeatHooks() {
  Hooks.on("wodxCrimeSeen", p => {
    if ( !isActiveGM() || !on() ) return;
    const actor = game.actors.get(p?.of);
    let scene = null;
    try { scene = p?.scene ? fromUuidSync(p.scene) : globalThis.canvas?.scene; } catch (e) { scene = globalThis.canvas?.scene; }
    addDeed(actor, p?.cause === "crime" ? "theft" : String(p?.cause ?? "theft"), {scene, named: !!p?.named, witnesses: Number(p?.witnesses) || 1}).catch(e => console.error("WoDX | law heat", e));
  });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    if ( !game.user.isGM ) return;
    for ( const b of el.querySelectorAll?.("[data-action^='wodx-law-']") ?? [] ) b.addEventListener("click", async () => {
      b.disabled = true;
      if ( b.dataset.action === "wodx-law-arrest" ) await arrest(b.dataset.actor, b.dataset.region);
      else await lowerHeat(b.dataset.actor, b.dataset.region, 0);
      ui.notifications?.info?.(b.dataset.action === "wodx-law-arrest" ? "Arrested." : "The law lets it go.");
    });
  });
}

export {H as rules};
