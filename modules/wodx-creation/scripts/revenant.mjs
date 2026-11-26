/**
 * WoDX Creation: revenant family weaknesses in play (B7840-B7848). The pure rules are in revenant-rules.mjs.
 *   - a trait-effect source for WoDX Chronicle: the Bratovich temper on frenzy rolls, the D'Habi binding on Willpower
 *   - markOf(actor) for WoDX Actions and WoDX Chronicle (Khavi sunlight, Danislav silver)
 *   - the family weakness window: garlic and holy symbols, addictions, the Vlaszy oath, the Rafastio moon
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import {recordDrink} from "./lineage.mjs";
import * as RR from "../../wodx-rules/creation/revenant-rules.mjs";
import * as TERMS from "../../wodx-rules/core/terms.mjs";

const num = v => Math.max(0, Math.trunc(Number(v) || 0));
const chron = () => game.modules.get("wodx-chronicle")?.api;
export const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || null; } catch (e) { return null; } };
const whisperTo = actor => game.users.filter(u => u.isGM || actor.testUserPermission?.(u, "OWNER")).map(u => u.id);

/** The revenant record on a sheet, or null. */
export const revenantOf = actor => actor?.flags?.[MODULE_ID]?.revenant ?? null;

/**
 * What the family's weakness does in play. A sheet marked before B7840 has no mark kept: it is read from the
 * family's write-up for the year it was marked (or now).
 */
export function markOf(actor) {
  const r = revenantOf(actor);
  if ( !r ) return null;
  if ( r.mark ) return r.mark;
  return RR.familyIn(r.family, r.year ?? yearNow())?.mark ?? {};
}

/** The family's name and write-up as the sheet knows it. */
export function familyOf(actor) {
  const r = revenantOf(actor);
  if ( !r ) return null;
  const f = RR.familyIn(r.family, r.year ?? yearNow());
  return f ? {...f, label: r.label ?? f.label, weakness: r.weakness ?? f.weakness, mark: markOf(actor)} : null;
}

/** WoDX Chronicle trait source: the family's weakness on the rolls it touches. */
const source = (actor, ctx = {}) => {
  if ( (ctx.channel ?? "roll") !== "roll" ) return [];
  const m = markOf(actor);
  return m ? RR.rollEffects(m, ctx.tags ?? [], familyOf(actor)?.label ?? "Revenant") : [];
};
export function registerRevenant() {
  try { chron()?.traits?.addSource?.(source); } catch (e) { console.warn(`${MODULE_ID} | revenant roll effects`, e); }
}

async function rollWillpower(actor, difficulty) {
  const wp = num(actor.system?.advantages?.willpower?.permanent);
  const roll = await new Roll(`${Math.max(1, wp)}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  return {roll, wp, ...TERMS.successes(faces, difficulty)};
}

async function card(actor, title, lines, rolls = []) {
  return ChatMessage.create({content: `<div class="wodx-card wodx-revenant"><h3>${esc(title)}</h3>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`,
    speaker: ChatMessage.getSpeaker({actor}), whisper: whisperTo(actor), rolls});
}

/** Garlic or a holy symbol shown to a Basarab: Willpower, or leave (V20 Dark Ages p. 453). */
export async function repel(actor, what = "holy symbol") {
  const m = markOf(actor), R = RR.weaknessRoll(m ?? {}, "repel");
  if ( !R ) return null;
  const r = await rollWillpower(actor, R.difficulty);
  const held = r.successes > 0 && !r.botch;
  await card(actor, `${actor.name} faces ${what}`, [
    `Willpower ${r.wp} at ${R.difficulty}: ${r.successes} success${r.successes === 1 ? "" : "es"}${r.botch ? ", a botch" : ""}.`,
    held ? "<b>Holds the ground.</b>" : `<b>Cannot bear it and ${esc(R.fail)}.</b>`,
    `<span class="wodx-quiet">${esc(R.note)}</span>`], [r.roll]);
  return {held, ...r};
}

/**
 * A strong pleasure offered to a Szantovich or Zantosa: Willpower or the pleasure becomes an addiction, kept on the
 * sheet. No Willpower point may be spent against it.
 */
export async function temptation(actor, pleasure = "a pleasure", difficulty = null) {
  const m = markOf(actor), R = RR.weaknessRoll(m ?? {}, "addiction");
  if ( !R ) return null;
  const rev = revenantOf(actor), have = rev.addictions ?? [];
  const known = have.some(p => p.toLowerCase() === String(pleasure).toLowerCase());
  const diff = Math.max(2, Math.min(10, num(difficulty) || R.difficulty));
  const r = await rollWillpower(actor, diff);
  const resisted = r.successes > 0 && !r.botch;
  if ( !resisted && !known ) await actor.update({[`flags.${MODULE_ID}.revenant.addictions`]: [...have, String(pleasure)]});
  await card(actor, `${actor.name} is offered ${pleasure}`, [
    `Willpower ${r.wp} at ${diff} (no Willpower may be spent): ${r.successes} success${r.successes === 1 ? "" : "es"}${r.botch ? ", a botch" : ""}.`,
    resisted ? "<b>Turns it down this time.</b>" : `<b>${known ? "Gives in to an old addiction" : "Hooked: this is now an addiction"} and ${esc(R.fail)}.</b>`,
    `<span class="wodx-quiet">${esc(R.note)}</span>`], [r.roll]);
  return {resisted, ...r};
}

/** The Vlaszy oath: the blood oath to a Fiend at the age of majority (V20 Dark Ages p. 454). */
export async function swearOath(actor, regnant, time = game.time.worldTime) {
  if ( !regnant ) return null;
  const stage = await recordDrink(actor, regnant, time, 3);
  await actor.update({[`flags.${MODULE_ID}.revenant.oath`]: {id: regnant.id, name: regnant.name, at: time}});
  await card(actor, `${actor.name} swears the oath`, [`Bound by the blood oath to ${esc(regnant.name)}, as every Vlaszy is at the age of majority.`,
    `<span class="wodx-quiet">V20 Dark Ages p. 454; Dark Ages: Vampire p. 289</span>`]);
  return stage;
}

/** The moon's step on a Rafastio's Discipline rolls tonight (V20 Ghouls and Revenants pdf 107). */
export function moonStep(moon = null) {
  let m = moon;
  if ( m === null ) { try { m = chron()?.when?.context?.({})?.moon ?? ""; } catch (e) { m = ""; } }
  const s = String(m ?? "").toLowerCase();
  if ( /new/.test(s) ) return {moon: s, step: 2};
  if ( /full/.test(s) ) return {moon: s, step: -1};
  if ( /wax|wan|quarter|gibbous|crescent/.test(s) ) return {moon: s, step: 1};
  return {moon: s, step: 0};
}

/** The family weakness window, for the Storyteller or the revenant's owner. */
export async function weaknessDialog(actor = null) {
  const list = game.actors.filter(a => revenantOf(a) && (game.user.isGM || a.isOwner)).sort((a, b) => a.name.localeCompare(b.name));
  if ( !list.length ) return ui.notifications.warn("There is no revenant to show.");
  const sel = actor ?? globalThis.canvas?.tokens?.controlled?.[0]?.actor;
  const pick = sel && revenantOf(sel) ? sel : list[0];
  const F = familyOf(pick), m = F?.mark ?? {};
  const fiends = game.actors.filter(a => a.type === "Vampire" || a.system?.settings?.variant === "vampire").sort((a, b) => a.name.localeCompare(b.name));
  const ms = m.moon ? moonStep() : null;
  const rows = [];
  if ( m.repel ) rows.push(`<div class="form-group"><label>Shown</label><select name="repel" data-fixed>${m.repel.map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join("")}</select></div>`);
  if ( m.addiction ) rows.push(`<div class="form-group"><label>The pleasure</label><input type="text" name="pleasure" placeholder="wine, a lover's bite, opium..."/></div>
    <div class="form-group"><label>Difficulty</label><input type="number" name="diff" value="${m.addiction === "st" ? 6 : num(m.addiction)}" min="2" max="10"/></div>`);
  if ( m.oath && !revenantOf(pick).oath ) rows.push(`<div class="form-group"><label>Swear the oath to</label><select name="regnant" data-fixed><option value="">Not yet</option>${fiends.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("")}</select></div>`);
  const addicted = revenantOf(pick).addictions ?? [];
  const content = `<form>
    <div class="form-group"><label>Revenant</label><select name="who" data-fixed>${list.map(a => `<option value="${a.id}" ${a.id === pick.id ? "selected" : ""}>${esc(a.name)}</option>`).join("")}</select></div>
    <p><b>${esc(F?.label ?? "")}</b>: ${esc(F?.weakness ?? "")}</p>
    ${addicted.length ? `<p>Addicted to: ${addicted.map(esc).join(", ")}.</p>` : ""}
    ${revenantOf(pick).oath ? `<p>Oath sworn to ${esc(revenantOf(pick).oath.name)}.</p>` : ""}
    ${ms ? `<p>The moon tonight${ms.moon ? ` (${esc(ms.moon)})` : ""}: Disciplines ${ms.step > 0 ? `+${ms.step}` : ms.step} difficulty.</p>` : ""}
    ${m.frenzy ? `<p>Frenzy rolls are ${m.frenzy} harder (counted on every frenzy roll).</p>` : ""}
    ${m.willpower ? `<p>Willpower rolls are ${m.willpower} harder (counted on every Willpower roll).</p>` : ""}
    ${m.sun ? "<p>Sunlight: the hazard window deals bashing damage, soaked with Stamina and Fortitude.</p>" : ""}
    ${m.silver ? "<p>Silver: weapons of silver deal aggravated damage in a fight.</p>" : ""}
    ${rows.join("")}
    <p class="wodx-quiet">${esc(F?.page ?? "")}</p></form>`;
  const r = await foundry.applications.api.DialogV2.prompt({classes: ["wodx", "wodx-dialog"], window: {title: "Family weakness"}, position: {width: 520}, content,
    ok: {label: m.repel ? "Roll to stand" : m.addiction ? "Roll against it" : m.oath ? "Swear" : "Close",
      callback: (event, button) => { const f = button.form.elements; return {who: f.who.value, repel: f.repel?.value, pleasure: f.pleasure?.value, diff: f.diff?.value, regnant: f.regnant?.value}; }},
    rejectClose: false});
  if ( !r ) return null;
  const who = game.actors.get(r.who) ?? pick;
  if ( who.id !== pick.id ) return weaknessDialog(who);
  if ( r.regnant ) return swearOath(who, game.actors.get(r.regnant));
  if ( m.repel ) return repel(who, r.repel || m.repel[0]);
  if ( m.addiction && r.pleasure ) return temptation(who, r.pleasure, r.diff);
  return null;
}
