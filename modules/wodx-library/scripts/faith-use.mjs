/**
 * WoDX Library: the Foundry side of faith and occult goods (B3902 to B3904; rules in faith-rules.mjs).
 */
import * as F from "./faith-rules.mjs";
import {rollPool} from "./arms-use.mjs";

const MOD = "wodx-library";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const num = v => Number(v) || 0;
const actions = () => game.modules.get("wodx-actions")?.api ?? null;
const faithOf = a => num(a?.system?.advantages?.faith?.permanent ?? a?.system?.advantages?.faith?.value) || num(a?.flags?.["wodx-actions"]?.trueFaith);
const facesLine = r => (r.faces.length ? `${r.dice} dice at ${r.diff}: ${r.faces.join(", ")} (${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`})` : "no dice");
const ownersOf = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
async function card(actor, title, lines, {whisper = null, rolls = []} = {}) {
  const content = `<div class="wodx-card wlib-use-card wlib-faith"><p><b>${esc(title)}</b></p>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`;
  return ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor}), rolls, ...(whisper ? {whisper} : {})});
}

/** Pray with a thing of faith. */
export async function pray(actor, item) {
  if ( faithOf(actor) && actions()?.trueFaith ) {
    await card(actor, `${actor.name} prays with ${item.name}`, ["Their True Faith is in it: repel a creature or stand against a power."]);
    return actions().trueFaith(actor);
  }
  const wp = actor.system?.advantages?.willpower ?? {};
  const night = F.nightOf(game.time?.worldTime);
  const prayed = actor.flags?.[MOD]?.prayedNight ?? null;
  if ( prayed === night ) return card(actor, `${actor.name} prays with ${item.name}`, [esc(F.prayResult({}, {prayedNight: prayed, night}).line)]);
  const r = await rollPool(num(wp.permanent), F.PRAY_DIFF);
  const res = F.prayResult(r, {temporary: num(wp.temporary), permanent: num(wp.permanent), prayedNight: prayed, night});
  const up = {[`flags.${MOD}.prayedNight`]: night};
  if ( res.willpower !== num(wp.temporary) ) up["system.advantages.willpower.temporary"] = res.willpower;
  await actor.update(up);
  return card(actor, `${actor.name} prays with ${item.name}`, [`Willpower, ${facesLine(r)}.`, esc(res.line)], {rolls: r.roll ? [r.roll] : []});
}

/** Set a charm as a ward (carried), or take it down. */
export async function ward(actor, item) {
  const on = !item.flags?.[MOD]?.ward?.on;
  await item.update({[`flags.${MOD}.ward`]: on ? {on: true, by: actor.name} : null, "system.isequipped": on ? true : item.system?.isequipped});
  return card(actor, on ? `${actor.name} sets ${item.name} as a ward` : `${actor.name} takes down ${item.name}`,
    [on ? "While it is carried, mind powers and magic used on them are one harder (+1 difficulty)." : ""]);
}

/** Read the signs. The Storyteller sees the roll and what it is worth. */
export async function divine(actor, item) {
  const att = num(actor.system?.attributes?.perception?.total ?? actor.system?.attributes?.perception?.value);
  const occ = num(actor.system?.abilities?.occult?.value);
  const r = await rollPool(att + occ, F.DIVINE_DIFF);
  return card(actor, `${actor.name} reads the signs with ${item.name}`, [`Perception + Occult, ${facesLine(r)}.`, esc(F.divineLine(r))], {whisper: ownersOf(actor), rolls: r.roll ? [r.roll] : []});
}

/** Chronicle's trait effects read a carried ward (resist channel). */
export function setupFaith() {
  const T = game.modules.get("wodx-chronicle")?.api?.traits;
  T?.addSource?.((actor, ctx) => F.wardEffects([...(actor?.items ?? [])], ctx));
}

export const faithApi = () => ({rules: F, pray, ward, divine});
