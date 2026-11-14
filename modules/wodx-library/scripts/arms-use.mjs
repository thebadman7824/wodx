/**
 * WoDX Library: the Foundry side of everyday arms, weapon fittings and traps (B3805 to B3807; rules in arms-rules.mjs).
 *
 *   Ready it: an everyday weapon is taken in hand (equipped), and WoDX Combat's attack list offers it first.
 *   Fit it / Take it off: a weapon fitting is put on (equipped); Combat reads what it does to the matching weapon.
 *   Set the trap: the setter rolls; the trap remembers how well it was hidden. Spring it: the targeted character
 *     rolls Perception + Alertness to see it, or takes its damage (soaked in WoDX Combat), is held, or sets off its
 *     alarm. Disarm it: Dexterity + Security. A botch springs it on whoever was handling it.
 *   Clean a gun: wet powder is dried out of the character's guns.
 */
import * as A from "./arms-rules.mjs";

const MOD = "wodx-library";
const SOCKET = `module.${MOD}`;
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const combat = () => game.modules.get("wodx-combat")?.api ?? game.wodxCombat ?? null;
const chronicle = () => game.modules.get("wodx-chronicle")?.api ?? null;

const num = v => Number(v) || 0;
const attrOf = (a, k) => num(a?.system?.attributes?.[k]?.total ?? a?.system?.attributes?.[k]?.value);
const abilityOf = (a, k) => {
  const v = a?.system?.abilities?.[k];
  if ( v ) return num(v.value);
  const t = (a?.items ?? []).find(i => i.type === "Trait" && String(i.name ?? "").toLowerCase() === k);
  return num(t?.system?.value);
};

async function card(actor, title, lines, {whisper = null} = {}) {
  const content = `<div class="wodx-card wlib-use-card wlib-arms"><p><b>${esc(title)}</b></p>${lines.filter(Boolean).map(l => `<p>${l}</p>`).join("")}</div>`;
  return ChatMessage.create({content, speaker: ChatMessage.getSpeaker({actor}), ...(whisper ? {whisper} : {})});
}
const ownersOf = actor => game.users.filter(u => u.isGM || actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/** Roll a pool at a difficulty: {successes, botch, faces, roll}. */
export async function rollPool(dice, diff) {
  const n = Math.max(0, Math.round(dice));
  if ( !n ) return {successes: 0, botch: false, faces: [], roll: null, dice: 0, diff};
  const roll = await new Roll(`${n}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  return {...A.countSuccesses(faces, diff), faces, roll, dice: n, diff};
}
const facesLine = r => (r.faces.length ? `${r.dice} dice at ${r.diff}: ${r.faces.join(", ")} (${r.botch ? "a botch" : `${r.successes} success${r.successes === 1 ? "" : "es"}`})` : "no dice");

/** Ready an everyday weapon (or put it away). */
export async function ready(actor, item) {
  const on = !item.system?.isequipped;
  await item.update({"system.isequipped": on});
  return card(actor, on ? `${actor.name} readies ${item.name}` : `${actor.name} puts ${item.name} away`, [on ? esc(A.summaryOf(item.name)) : ""]);
}

/** Fit a fitting to a weapon (or take it off), or put on a holster, sling, scabbard or mask. */
export async function fit(actor, item) {
  const on = !item.system?.isequipped;
  await item.update({"system.isequipped": on});
  const f = A.fittingOf(item.name);
  const verb = f ? (on ? "fits" : "takes off") : (on ? "puts on" : "takes off");
  return card(actor, `${actor.name} ${verb} ${item.name}`, [on ? esc(A.summaryOf(item.name)) : ""]);
}

/** Dry the powder out of every gun the character holds (a gun cleaning kit). */
export async function clean(actor, item) {
  const dried = [];
  for ( const g of actor.items ?? [] ) {
    const pw = g.flags?.["wodx-combat"]?.powder;
    if ( (g.type === "Ranged Weapon") && pw?.wet ) { await g.setFlag("wodx-combat", "powder", {...pw, wet: false}); dried.push(g.name); }
  }
  return card(actor, `${actor.name} cleans ${dried.length ? dried.join(", ") : "the guns"} with ${item.name}`,
    [dried.length ? `The wet powder is drawn out: ${esc(dried.join(", "))} can fire again once loaded.` : "Clean and ready: nothing was wet."]);
}

const trapState = item => item.flags?.[MOD]?.trap ?? null;
const victimToken = () => [...(game.user.targets ?? [])][0] ?? null;

/** Set a trap: the setter's roll; the trap keeps how hard it is to see. */
export async function setTrap(actor, item) {
  const t = A.trapOf(item.name);
  if ( !t ) return null;
  const [att, abil, diff] = t.set;
  const r = await rollPool(A.poolOf(attrOf(actor, att), abilityOf(actor, abil)), diff);
  const res = A.setResult(t, r);
  await item.update({[`flags.${MOD}.trap`]: res.set ? {set: true, diff: res.diff, by: actor.name, setter: actor.uuid} : null});
  await card(actor, `${actor.name} sets ${item.name}`, [`${esc(cap(att))} + ${esc(cap(abil))}, ${facesLine(r)}.`, esc(res.line)], {whisper: ownersOf(actor)});
  if ( res.springs ) await harm(actor.getActiveTokens?.()?.[0] ?? actor, item, t, A.springResult(t, {noticed: false}), actor);
  return res;
}

/** The targeted character walks into a set trap. */
export async function springTrap(actor, item, who = null) {
  const t = A.trapOf(item.name);
  const s = trapState(item);
  if ( !t ) return null;
  if ( !s?.set ) return ui.notifications.warn(`${item.name} is not set.`);
  const tok = who ?? victimToken();
  const victim = tok?.actor ?? (tok?.documentName === "Actor" ? tok : null);
  if ( !victim ) return ui.notifications.warn("Target the one who walks into it first.");
  const look = await rollPool(A.poolOf(attrOf(victim, "perception"), abilityOf(victim, "alertness")), s.diff);
  const res = A.springResult(t, {noticed: look.successes > 0});
  await card(victim, `${victim.name} comes upon ${item.name}`, [`Perception + Alertness to see it: ${facesLine(look)}.`, esc(res.line)]);
  if ( res.caught ) {
    await item.update({[`flags.${MOD}.trap`]: null});
    await harm(tok, item, t, res, actor);
  }
  return res;
}

/** Disarm a set trap: Dexterity + Security against how well it was hidden. */
export async function disarmTrap(actor, item) {
  const t = A.trapOf(item.name);
  const s = trapState(item);
  if ( !t ) return null;
  if ( !s?.set ) return ui.notifications.info(`${item.name} is not set: there is nothing to disarm.`);
  const r = await rollPool(A.poolOf(attrOf(actor, "dexterity"), abilityOf(actor, "security")), s.diff);
  const res = A.disarmResult(r);
  if ( res.safe || res.springs ) await item.update({[`flags.${MOD}.trap`]: null});
  await card(actor, `${actor.name} tries to disarm ${item.name}`, [`Dexterity + Security, ${facesLine(r)}.`, esc(res.line)]);
  if ( res.springs ) await harm(actor.getActiveTokens?.()?.[0] ?? actor, item, t, A.springResult(t, {noticed: false}), actor);
  return res;
}

/** What a sprung trap does: damage through WoDX Combat's soak, the hold, and the alarm to the setter. */
async function harm(tokOrActor, item, t, res, setter) {
  const victim = tokOrActor?.actor ?? tokOrActor;
  if ( res.dice > 0 ) {
    const C = combat();
    if ( C?.soakAndApply ) await C.soakAndApply(tokOrActor, {mode: "pool", amount: res.dice, type: res.kind, soak: true});
    else await card(victim, `${item.name}: ${res.dice} dice of ${res.kind} damage`, ["Roll it and soak as usual (WoDX Combat is not on)."]);
  }
  if ( res.hold ) await markHold(victim, res.hold, item.name);
  if ( res.alarm ) {
    const who = setter ?? victim;
    await card(who, `${item.name}: ${res.alarm}`, [`${esc(victim.name)} set it off.`], {whisper: /silent/i.test(res.alarm) ? ownersOf(who) : null});
  }
}

async function markHold(actor, condition, what) {
  const c = chronicle()?.conditions;
  if ( !c?.setCondition ) return null;
  if ( actor.isOwner ) return c.setCondition(actor, condition, true);
  if ( !game.users.some(u => u.isGM && u.active) ) return ui.notifications.warn("The Storyteller is not here to mark the hold.");
  game.socket.emit(SOCKET, {op: "cond", uuid: actor.uuid, condition, what});
  return null;
}

/** The Storyteller's client marks a hold on a character the player does not own. */
export async function onArmsSocket(op) {
  if ( op?.op !== "cond" || !game.user.isGM || game.users.activeGM?.id !== game.user.id ) return null;
  const a = await fromUuid(op.uuid);
  const actor = a?.actor ?? a;
  if ( !actor || !["held", "immobilized", "blinded", "dazed"].includes(op.condition) ) return null;
  return chronicle()?.conditions?.setCondition?.(actor, op.condition, true);
}

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** For WoDX Combat and the gate. */
export const armsApi = () => ({rules: A, weaponEntry: A.weaponEntry, fitFor: A.fitFor, atHand: A.atHand, coveredBy: A.coveredBy,
  ready, fit, clean, setTrap, springTrap, disarmTrap, rollPool});
