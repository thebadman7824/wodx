/**
 * WoDX NPC 0.58.0: courtship, marriage and the law, children, households and loved ones as a weak spot, the Foundry
 * side (B2817-B2825). The rules are in hearts-rules.mjs.
 *
 *   court     api.hearts.court(lover, loved, event, {successes, botch}): warmth on the lover's sheet, shaped by the
 *             loved one's Nature and the supernatural truth (a Kindred on a Path, a Garou's Rage, the Mists)
 *   marry     api.hearts.marry(a, b, {witnesses, pay}): the law of the place and year decides if it can be done, how,
 *             where it is recorded and what money moves; spouse ties at both ends, a record on each sheet
 *   divorce   only where and when the law allows it; otherwise the answer says why
 *   children  api.hearts.haveChild(a, b, {name}): only those who can; the child's sheet ties to both parents,
 *             the child's nature (metis, Kinfolk, Kinain) is noted, and the child ages with game time
 *   household who lives under each roof; each month Storyteller's money (wodxMonthPaid) charges the household's keep
 *   weak spot when someone close is hurt, taken or dies, the one who loves them gets a card with the book's checks;
 *             setting "Cards for loved ones", on by default
 */
import * as H from "./hearts-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const api = () => game.modules.get(MOD).api;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const yearNow = () => getEngine().timeToDate(Number(game.time.worldTime) || 0).year;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownersOf = a => game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const card = (title, lines) => `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div></div>`;

/** The line a sheet belongs to. */
export function lineOf(actorLike) {
  const a = actorOf(actorLike);
  const t = String(a?.type ?? "").toLowerCase();
  if ( t === "mortal" ) return a?.flags?.["wodx-creation"]?.lineage?.kinfolk || a?.flags?.[MOD]?.kinfolk ? "kinfolk" : a?.flags?.["wodx-creation"]?.ghoul || a?.flags?.[MOD]?.ghoul ? "ghoul" : "mortal";
  if ( t.startsWith("changel") ) return "changeling";
  if ( /kuei|cathayan/.test(t) ) return "kueijin";
  return ["vampire", "werewolf", "mage", "wraith", "hunter", "mummy", "demon"].includes(t) ? t : "mortal";
}
const pathOf = a => { const c = String(a?.system?.advantages?.path?.custom ?? "").trim(); return c && !/humanit/i.test(c) ? c : ""; };
const humanityOf = a => Number(a?.system?.advantages?.path?.permanent ?? a?.system?.advantages?.humanity?.permanent) || 0;
const regionNow = () => { try { return chron()?.world?.homeland?.() || "moravia"; } catch (e) { return "moravia"; } };
const sphereNow = (region, year) => { try { return chron()?.world?.rules?.sphereFor?.(region, year) ?? "latin"; } catch (e) { return "latin"; } };

export function registerSettings() {
  game.settings.register(MOD, "heartCards", {scope: "world", config: true, type: Boolean, default: true,
    name: "Cards for loved ones", hint: "When a spouse, child, parent, lover or a close friend is hurt, taken or dies, a card gives the one who loves them the checks to roll."});
}
const on = () => { try { return !!game.settings.get(MOD, "heartCards"); } catch (e) { return false; } };

/* ---- Courtship ---- */
export const warmthOf = (lover, loved) => { const a = actorOf(lover), b = actorOf(loved); return H.normWarmth(a?.flags?.[MOD]?.warmth)[b?.id ?? loved]?.value ?? 0; };
export function hindranceFor(lover, loved) {
  const a = actorOf(lover), b = actorOf(loved);
  return H.hindrance({line: lineOf(b), path: pathOf(b), humanity: humanityOf(b), rage: Number(b?.system?.advantages?.rage?.permanent) || 0}, {line: lineOf(a)});
}
export async function court(lover, loved, event, {successes = 0, botch = false, why = ""} = {}) {
  const a = actorOf(lover), b = actorOf(loved);
  if ( !game.user.isGM || !a || !b || a.id === b.id ) return null;
  const h = hindranceFor(a, b);
  const t = H.moveWarmth(a.flags?.[MOD]?.warmth, b.id, event, {at: game.time.worldTime, why, nature: a.system?.nature ?? "", successes, botch, cap: h.cap, halve: h.halve});
  await a.setFlag(MOD, "warmth", t);
  return {...t[b.id], word: H.warmthWord(t[b.id].value), notes: h.notes};
}
export const courtship = ({region = regionNow(), year = yearNow()} = {}) => H.courtshipFor(sphereNow(region, year), year);

/* ---- Marriage ---- */
export const lawHere = ({region = regionNow(), year = yearNow()} = {}) => H.marriageLaw(region, year, sphereNow(region, year));
const sexOf = a => { const s = String(a?.flags?.["wodx-creation"]?.sex ?? a?.system?.sex ?? "").toLowerCase(); return /^m/.test(s) ? "m" : /^f/.test(s) ? "f" : ""; };
const marriagesOf = a => (actorOf(a)?.flags?.[MOD]?.marriages ?? []).filter(m => !m.ended);
async function addHandTie(a, b, role) {
  const ties = foundry.utils.deepClone(a.flags?.["wodx-sheets"]?.ties ?? []);
  if ( !ties.some(t => t.uuid === `Actor.${b.id}` && t.role === role) ) ties.push({uuid: `Actor.${b.id}`, name: b.name, role});
  await a.setFlag("wodx-sheets", "ties", ties);
}
async function dropHandTie(a, b, role) {
  const ties = (a.flags?.["wodx-sheets"]?.ties ?? []).filter(t => !(t.uuid === `Actor.${b.id}` && t.role === role));
  await a.setFlag("wodx-sheets", "ties", ties);
}
export async function marry(aLike, bLike, {region = regionNow(), year = yearNow(), witnesses = [], pay = null, force = false} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !game.user.isGM || !a || !b || a.id === b.id ) return null;
  const law = H.marriageLaw(region, year, sphereNow(region, year));
  const can = H.canMarry(law, {sexes: [sexOf(a), sexOf(b)], married: [marriagesOf(a).length, marriagesOf(b).length]});
  if ( !can.ok && !force ) return {ok: false, why: can.why, law};
  const id = foundry.utils.randomID();
  let money = null;
  if ( pay?.from && pay?.to && law.money !== "none" ) {
    const from = actorOf(pay.from), to = actorOf(pay.to);
    const purse = (() => { try { const p = st()?.upkeep?.money?.purse?.(from); return (Number(p?.carried) || 0) + (Number(p?.bank) || 0); } catch (e) { return 0; } })();
    const amount = Number(pay.amount) || H.marriagePayment(law.money, purse);
    if ( from && to && amount ) { try { await st()?.upkeep?.money?.transfer?.(from, to, amount, {note: law.moneyKind.label, to: "bank"}); money = {kind: law.money, from: from.id, to: to.id, amount}; } catch (e) { money = null; } }
  }
  const rec = {id, at: game.time.worldTime, region, year, rite: law.rite, record: law.record, civil: !!law.civil, money,
    witnesses: (witnesses ?? []).map(w => actorOf(w)?.name ?? String(w)).filter(Boolean).slice(0, 6)};
  for ( const [x, y] of [[a, b], [b, a]] ) {
    await x.setFlag(MOD, "marriages", [...(x.flags?.[MOD]?.marriages ?? []), {...rec, with: {id: y.id, name: y.name}}]);
    await addHandTie(x, y, "spouse");
  }
  await ChatMessage.create({whisper: [...new Set([...ownersOf(a), ...ownersOf(b)])], speaker: {alias: "WoDX"}, flags: {[MOD]: {marriage: id}},
    content: card(`${a.name} and ${b.name} are married`, [`By ${law.rite}; recorded by ${law.record}.`, ...(rec.witnesses.length ? [`Witnesses: ${rec.witnesses.join(", ")}.`] : []),
      ...(money ? [`${law.moneyKind.label}: paid by ${law.moneyKind.payer}.`] : []), ...(can.ok ? [] : ["Against the law of the place: " + can.why.join(" ")])])});
  Hooks.callAll("wodxMarried", {a, b, record: rec});
  return {ok: true, record: rec, law};
}
export async function divorce(aLike, bLike, {region = regionNow(), year = yearNow()} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !game.user.isGM || !a || !b ) return null;
  const law = H.marriageLaw(region, year, sphereNow(region, year));
  if ( !H.canDivorce(law) ) return {ok: false, why: ["The law here grants no divorce: only an annulment by the church, or living apart."], law};
  for ( const [x, y] of [[a, b], [b, a]] ) {
    await x.setFlag(MOD, "marriages", (x.flags?.[MOD]?.marriages ?? []).map(m => m.with?.id === y.id && !m.ended ? {...m, ended: game.time.worldTime, how: "divorce"} : m));
    await dropHandTie(x, y, "spouse");
  }
  return {ok: true, law};
}

/* ---- Children ---- */
export async function haveChild(aLike, bLike, {name = "", sex = ""} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !game.user.isGM || !a || !b ) return null;
  const kid = H.childOf([lineOf(a), lineOf(b)], Math.random());
  if ( !kid ) return {ok: false, why: "One of them cannot have children."};
  const year = yearNow();
  const nm = name || `Child of ${a.name.split(" ")[0]} and ${b.name.split(" ")[0]}`;
  const [c] = await Actor.createDocuments([{name: nm, type: kid.line === "werewolf" ? "Werewolf" : "Mortal", ownership: a.ownership,
    flags: {"wodx-creation": {chronology: {bornYear: year}, ...(sex ? {sex} : {}), ...(kid.line === "kinfolk" ? {lineage: {kinfolk: true}} : {})},
      [MOD]: {child: {kind: kid.kind, note: kid.note, parents: [a.id, b.id]}, ...(kid.line === "kinfolk" ? {kinfolk: true} : {})}}}]);
  await addHandTie(c, a, "parent"); await addHandTie(c, b, "parent");
  await ChatMessage.create({whisper: [...new Set([...ownersOf(a), ...ownersOf(b)])], speaker: {alias: "WoDX"}, content: card(`${a.name} and ${b.name} have a child`, [nm + ".", ...(kid.note ? [kid.note] : [])])});
  return {ok: true, child: c, kind: kid};
}
export function childAge(actorLike) {
  const b = Number(actorOf(actorLike)?.flags?.["wodx-creation"]?.chronology?.bornYear);
  if ( !Number.isFinite(b) ) return null;
  const age = Math.max(0, yearNow() - b);
  return {age, stage: H.childStage(age)};
}

/* ---- Households ---- */
export const householdOf = a => H.normHousehold(actorOf(a)?.flags?.[MOD]?.household);
export async function setHousehold(aLike, list) {
  const a = actorOf(aLike);
  if ( !game.user.isGM || !a ) return null;
  const clean = H.normHousehold((list ?? []).map(x => { const m = actorOf(x.id ?? x.actor); return {...x, id: m?.id ?? x.id ?? null, name: m?.name ?? x.name}; }));
  await a.setFlag(MOD, "household", clean);
  return clean;
}
export function upkeepOf(aLike, months = 1) {
  const a = actorOf(aLike), money = st()?.upkeep?.money;
  const m = money?.money?.();
  const wage = m && money.rules?.wageAt ? money.rules.wageAt(yearNow(), m.region) : 0;
  const cost = H.householdCost(householdOf(a), wage, months);
  return {...cost, risk: H.masqueradeRisk(lineOf(a), householdOf(a)), text: m ? money.format(cost.total) : String(cost.total)};
}
async function onMonth({months = {}} = {}) {
  if ( !isActiveGM() ) return;
  const lines = [];
  for ( const [id, n] of Object.entries(months) ) {
    const a = game.actors.get(id);
    if ( !a || !n || !householdOf(a).length ) continue;
    const u = upkeepOf(a, n);
    if ( !u.total ) continue;
    try { await st().upkeep.money.pay(a, u.total, {note: "Household"}); } catch (e) { continue; }
    lines.push(`${a.name}: ${u.rows.length} under the roof, ${u.text}.${u.risk === 2 ? " Many mortals in a Kindred's haven: the Masquerade is at great risk." : u.risk ? " Mortals in a Kindred's haven: a risk to the Masquerade." : ""}`);
  }
  if ( lines.length ) await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, flags: {[MOD]: {household: true}}, content: card("The month's household keep", lines)});
}

/* ---- Loved ones as a weak spot ---- */
function closeTo(victimId) {
  const edges = api()?.ties?.edges?.() ?? [];
  const seen = new Set();
  return edges.filter(e => e.to?.id === victimId && e.from !== victimId && H.isClose(e.kind, warmthOf(e.from, victimId)))
    .filter(e => { const k = `${e.from}`; if ( seen.has(k) ) return false; seen.add(k); return true; });
}
async function tellLoved(victim, ev) {
  if ( !isActiveGM() || !on() || !victim?.id ) return [];
  const out = [];
  for ( const e of closeTo(victim.id) ) {
    const who = game.actors.get(e.from);
    if ( !who ) continue;
    const checks = H.weakSpotChecks(lineOf(who), e.kind, ev, {name: victim.name});
    if ( !checks.length ) continue;
    await ChatMessage.create({whisper: ownersOf(who), speaker: {alias: who.name}, flags: {[MOD]: {heartCard: true}},
      content: card(`${victim.name} ${ev === "death" ? "is dead" : ev === "taken" ? "is taken" : "is hurt"}`, checks.map(c => c.text))});
    out.push({to: who.id, checks});
  }
  return out;
}
/** Someone close is taken: the captor's demands go in the Ledger, and the ones who love them are told. */
export async function takeHostage(captorLike, victimLike, {demand = ""} = {}) {
  const c = actorOf(captorLike), v = actorOf(victimLike);
  if ( !game.user.isGM || !c || !v ) return null;
  await v.setFlag(MOD, "heldBy", {id: c.id, name: c.name, at: game.time.worldTime});
  const told = await tellLoved(v, "taken");
  for ( const t of told ) {
    const who = game.actors.get(t.to);
    try { await st()?.ledger?.save?.({kind: "consequence", what: `${c.name} holds ${v.name}${demand ? ` and demands ${demand}` : ""}`, from: {id: who.id, name: who.name}, to: {id: c.id, name: c.name}, due: game.time.worldTime + 3 * 86400}); } catch (e) { /* Ledger off */ }
  }
  return told;
}
export async function release(victimLike) { const v = actorOf(victimLike); if ( game.user.isGM && v ) await v.unsetFlag(MOD, "heldBy"); }

export function listen() {
  Hooks.on("wodxMonthPaid", p => { onMonth(p).catch(e => console.error(`${MOD} | household`, e)); });
  Hooks.on("wodxDamageApplied", (a, d = {}) => { if ( Number(d.levels) > 0 || Number(d.after) > Number(d.before) ) tellLoved(a, "harm").catch(e => console.error(`${MOD} | hearts`, e)); });
  Hooks.on("updateActor", (a, change) => { const d = change?.flags?.["wodx-creation"]?.chronology?.died; if ( d !== undefined && d !== null ) tellLoved(a, "death").catch(e => console.error(`${MOD} | hearts`, e)); });
}
export const rules = H;
