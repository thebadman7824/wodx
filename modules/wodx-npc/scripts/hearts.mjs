/**
 * WoDX NPC 0.58.0: courtship, marriage and the law, children, households and loved ones as a weak spot, the Foundry
 * side (B2854-B2862). The rules are in hearts-rules.mjs.
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
import * as LR from "./lines-rules.mjs";
import * as LM from "./line-mend.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import * as TERMS from "../../wodx-chronicle/scripts/terms.mjs";
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

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

/** Chronicle's age floor (18) for anything romantic or sexual; without Chronicle's age check nothing is allowed. */
function ageCheck(...people) {
  const r = game.modules.get("wodx-chronicle")?.api?.age?.romance?.(...people);
  const out = r ?? {ok: false, why: "The age check is not available (a WoDX Chronicle with the age floor is needed)."};
  if ( !out.ok ) ui.notifications?.warn?.(out.why);
  return out;
}

/** The line a sheet belongs to (B6310: the all-lines key, so a Kuei-jin is not read as Kindred nor a Fera as a mortal). */
export function lineOf(actorLike) {
  // B6187: the shared reading (a ghoul by the sheet's own variant too, a Kuei-jin by the Kindred of the East variant)
  const l = TERMS.lineOf(actorOf(actorLike));
  return ["spirit", "creature", "exalted"].includes(l) ? "mortal" : l;
}
/** The all-lines key itself (lines-rules.mjs KEYS). */
export const lineKeyOf = actorLike => LR.lineKey(actorOf(actorLike), linesApi());
const linesApi = () => { try { return game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api?.lines ?? null : null; } catch (e) { return null; } };
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
  const lb = lineOf(b);
  return H.hindrance({line: lb, path: pathOf(b), humanity: lb === "kueijin" ? Number(b?.system?.advantages?.dharma?.permanent) || 0 : humanityOf(b),
    rage: Number(b?.system?.advantages?.rage?.permanent) || 0, torment: Number(b?.system?.advantages?.torment?.permanent ?? b?.system?.advantages?.torment?.temporary) || 0}, {line: lineOf(a)});
}
export async function court(lover, loved, event, {successes = 0, botch = false, why = ""} = {}) {
  const a = actorOf(lover), b = actorOf(loved);
  if ( !game.user.isGM || !a || !b || a.id === b.id ) return null;
  // B3211: never with anyone under 18, in any era (Chronicle's age floor)
  const age = ageCheck(a, b);
  if ( !age.ok ) return {ok: false, why: age.why};
  const h = hindranceFor(a, b);
  const before = H.normWarmth(a.flags?.[MOD]?.warmth)[b.id]?.value ?? 0;
  const t = H.moveWarmth(a.flags?.[MOD]?.warmth, b.id, event, {at: game.time.worldTime, why, nature: a.system?.nature ?? "", successes, botch, cap: h.cap, halve: h.halve});
  await a.setFlag(MOD, "warmth", t);
  const broken = H.heartbreakDue(before, t[b.id].value, event, botch) ? await heartbreak(a, b).catch(e => { console.error(`${MOD} | heartbreak`, e); return null; }) : null;
  return {...t[b.id], word: H.warmthWord(t[b.id].value), notes: h.notes, ...(broken ? {heartbreak: broken} : {})};
}
export const courtship = ({region = regionNow(), year = yearNow()} = {}) => H.courtshipFor(sphereNow(region, year), year);

/* ---- Marriage ---- */
export const lawHere = ({region = regionNow(), year = yearNow()} = {}) => H.marriageLaw(region, year, sphereNow(region, year));
// One gender for every module (B3500): WoDX Chronicle reads every record, and gives "" for a player character (B3502)
const sexOf = a => {
  const g = game.modules.get("wodx-chronicle")?.api?.gender;
  if ( g?.forRules ) return g.rules.letter(g.forRules(a));
  if ( a?.hasPlayerOwner ) return "";
  const s = String(a?.flags?.["wodx-creation"]?.sex ?? a?.flags?.["wodx-creation"]?.people?.sex ?? a?.system?.sex ?? "").toLowerCase(); return /^m(ale)?$/.test(s) ? "m" : /^f(emale)?$/.test(s) ? "f" : "";
};
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
  // B3211: no marriage with anyone under 18, whatever the law of the time said; force does not lift it
  const age = ageCheck(a, b);
  if ( !age.ok ) return {ok: false, why: [age.why]};
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
  Hooks.callAll("wodxDivorced", {a, b});
  return {ok: true, law};
}

/* ---- Children ---- */
export async function haveChild(aLike, bLike, {name = "", sex = "", lines = null} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !game.user.isGM || !a || !b ) return null;
  // B3211: parents are adults
  const age = ageCheck(a, b);
  if ( !age.ok ) return {ok: false, why: age.why};
  const kid = H.childOf(lines ?? [lineOf(a), lineOf(b)], Math.random());
  if ( !kid ) return {ok: false, why: "One of them cannot have children."};
  const year = yearNow();
  const nm = name || (a.id === b.id ? `Child of ${a.name.split(" ")[0]}` : `Child of ${a.name.split(" ")[0]} and ${b.name.split(" ")[0]}`);
  // B3228: unless the Storyteller opened child characters to players, the parents' players may look at the child's sheet but not own it
  let open = false;
  try { open = !!game.settings.get(MOD, "childCharacters"); } catch (e) { open = false; }
  const own = open ? a.ownership : Object.fromEntries(Object.entries(a.ownership ?? {}).map(([k, v]) => [k, k !== "default" && Number(v) >= 3 && !game.users.get(k)?.isGM ? 2 : v]));
  const [c] = await Actor.createDocuments([{name: nm, type: kid.line === "werewolf" ? "Werewolf" : "Mortal", ownership: own,
    flags: {"wodx-creation": {chronology: {bornYear: year}, ...(sex ? {sex} : {}), ...(kid.line === "kinfolk" ? {lineage: {kinfolk: true}} : {})},
      [MOD]: {child: {kind: kid.kind, note: kid.note, parents: [a.id, b.id]}, ...(kid.line === "kinfolk" ? {kinfolk: true} : {})}}}]);
  await addHandTie(c, a, "parent"); if ( b.id !== a.id ) await addHandTie(c, b, "parent");
  // B3443: a newborn is a child sheet, marked so the age floor always knows
  try { await api()?.family?.makeChild?.(c); } catch (e) { console.error(`${MOD} | child sheet`, e); }
  await ChatMessage.create({whisper: [...new Set([...ownersOf(a), ...ownersOf(b)])], speaker: {alias: "WoDX"}, content: card(`${a.name} and ${b.name} have a child`, [nm + ".", ...(kid.note ? [kid.note] : [])])});
  return {ok: true, child: c, kind: kid};
}
export function childAge(actorLike) {
  const b = Number(actorOf(actorLike)?.flags?.["wodx-creation"]?.chronology?.bornYear);
  if ( !Number.isFinite(b) ) return null;
  const age = Math.max(0, yearNow() - b);
  return {age, stage: H.childStage(age)};
}

/* ---- Adoption (B3213-B3214) ---- */
export const adoptionLawHere = ({region = regionNow(), year = yearNow()} = {}) => H.adoptionLaw(region, year, sphereNow(region, year));
/**
 * The Storyteller adopts `childLike` into `parentLike`'s family under the law of the place and year: a child is
 * adopted, fostered or taken in by kafala as the law says; an adult only where adult adoption is lawful. The ties
 * go on both sheets (Parent and Child, or Guardian and Ward), a record on each, and a card to their owners.
 * Returns {ok, why, kind, law, record}.
 */
export async function adopt(parentLike, childLike, {region = regionNow(), year = yearNow(), note = ""} = {}) {
  const p = actorOf(parentLike), c = actorOf(childLike);
  if ( !game.user.isGM || !p || !c ) return null;
  const law = H.adoptionLaw(region, year, sphereNow(region, year));
  const age = game.modules.get("wodx-chronicle")?.api?.age;
  const born = a => { const v = a?.flags?.["wodx-creation"]?.chronology?.bornYear; return v === null || v === undefined || v === "" ? null : Number(v); };
  const can = H.canAdopt(law, {same: p.id === c.id, parentMinor: !!age?.minor?.(p), childMinor: !!age?.minor?.(c), parentBorn: born(p), childBorn: born(c)});
  if ( !age ) can.why.push("The age check is not available (a WoDX Chronicle with the age floor is needed).");
  if ( !can.ok || !age ) { ui.notifications?.warn?.(can.why.join(" ")); return {ok: false, why: can.why, law}; }
  const [up, down] = can.kindInfo.tie;
  const rec = {id: foundry.utils.randomID(), at: game.time.worldTime, region, year, kind: can.kind, rite: law.rite, record: law.record, inherits: can.kindInfo.inherits, note: String(note ?? "").slice(0, 200)};
  await addHandTie(c, p, up);
  await addHandTie(p, c, down);
  await c.setFlag(MOD, "adoptions", [...(c.flags?.[MOD]?.adoptions ?? []), {...rec, by: {id: p.id, name: p.name}}]);
  await p.setFlag(MOD, "adoptions", [...(p.flags?.[MOD]?.adoptions ?? []), {...rec, of: {id: c.id, name: c.name}}]);
  await ChatMessage.create({whisper: [...new Set([...ownersOf(p), ...ownersOf(c)])], speaker: {alias: "WoDX"}, flags: {[MOD]: {adoption: rec.id}},
    content: card(`${p.name} takes ${c.name} into the family: ${can.kindInfo.label.toLowerCase()}`, [`${law.rite[0].toUpperCase()}${law.rite.slice(1)}, kept by ${law.record}.`, can.kindInfo.note])});
  Hooks.callAll("wodxAdopted", {parent: p, child: c, record: rec});
  return {ok: true, kind: can.kind, law, record: rec};
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
  return {...cost, risk: H.masqueradeRisk(lineOf(a), householdOf(a), {kinfolk: householdOf(a).filter(x => x.id && lineOf(x.id) === "kinfolk").map(x => x.id)}), line: lineOf(a), text: m ? money.format(cost.total) : String(cost.total)};
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
    let talk = "";
    if ( u.risk > 0 ) {
      const face = Math.ceil(Math.random() * 10);
      if ( H.householdTalks(u.risk, face) ) {
        const tellers = householdOf(a).map(x => x.id).filter(id => id && game.actors.get(id));
        try { await st()?.rumours?.start?.({text: H.householdRumour(a.name, u.line), tellers, source: tellers[0] ?? null, about: a.id, truth: "true"}); talk = " Someone in the house talked: a rumour has started."; } catch (e) { console.warn(`${MOD} | household rumour`, e); }
      }
    }
    lines.push(`${a.name}: ${u.rows.length} under the roof, ${u.text}.${H.riskWords(u.line, u.risk)}${talk}`);
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
/** B4871: the grief roll is made for them: Willpower, a point of temporary Willpower lost on a failure, a derangement drawn on a botch. */
async function grieve(who, kind) {
  const great = H.GREAT.includes(kind);
  const diff = H.griefDiff(great);
  const dice = Math.max(1, Number(who.system?.advantages?.willpower?.permanent) || 3);
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  const {raw: hits, ones} = TERMS.successes(faces, diff);
  const res = H.griefResult({successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0}, great);
  let line = `Grief, Willpower ${dice} dice at ${diff}: ${faces.join(", ")}. `;
  if ( res.held ) line += "They hold together.";
  else {
    const wp = Number(who.system?.advantages?.willpower?.temporary) || 0;
    if ( wp > 0 ) await who.update({"system.advantages.willpower.temporary": wp - 1});
    line += wp > 0 ? "A point of temporary Willpower is lost." : "There is no Willpower left to lose.";
    if ( res.derange ) { const k = await game.modules.get("wodx-chronicle")?.api?.derangements?.gain?.(who, "loss", "from grief"); if ( k ) line += " The loss leaves a derangement."; }
  }
  return {line, roll};
}
/** A heartbreak: Willpower at difficulty 7 for the one whose heart broke; a botch draws a derangement from the loss table. */
async function heartbreak(who, other) {
  const dice = Math.max(1, Number(who.system?.advantages?.willpower?.permanent) || 3);
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  const {raw: hits, ones} = TERMS.successes(faces, H.HEARTBREAK_DIFF);
  const botch = hits === 0 && ones > 0;
  let line = `Willpower ${dice} dice at ${H.HEARTBREAK_DIFF}: ${faces.join(", ")}. `, key = null;
  if ( botch ) { key = await game.modules.get("wodx-chronicle")?.api?.derangements?.gain?.(who, "loss", "from heartbreak"); line += key ? "It breaks something in them: a derangement." : "It breaks something in them."; }
  else if ( hits > ones ) line += "They bear it.";
  else {
    // B5826, B5991: it shows for a week: Grieving, one die fewer on social rolls (Actions reads socialDice), a mark on the token
    const T = game.modules.get("wodx-chronicle")?.api;
    if ( T?.registerCondition && !T?.conditions?.getCondition?.("grieving") ) T.registerCondition({id: "grieving", name: "Grieving", img: "icons/svg/blood.svg",
      source: "WoDX house reading", summary: "Heartbroken for a week: one die fewer on social rolls.", mods: {socialDice: -1}});
    if ( T?.applyTimed ) await T.applyTimed(who, {name: "Grieving", description: `Heartbroken over ${other.name}`, duration: {kind: "time", seconds: 7 * DAY},
      condition: "grieving", key: "wodx-npc-grieving", source: "WoDX NPC hearts"});
    line += "It hurts, and it shows: grieving for a week (one die fewer on social rolls).";
  }
  await ChatMessage.create({whisper: ownersOf(who), speaker: {alias: who.name}, flags: {[MOD]: {heartCard: true}}, rolls: [roll],
    content: card(`${who.name}'s heart breaks over ${other.name}`, [line])});
  return {botch, derangement: key};
}
export async function tellLoved(victim, ev) {
  if ( !isActiveGM() || !on() || !victim?.id ) return [];
  const out = [];
  for ( const e of closeTo(victim.id) ) {
    const who = game.actors.get(e.from);
    if ( !who ) continue;
    const checks = H.weakSpotChecks(lineOf(who), e.kind, ev, {name: victim.name, po: Number(who.system?.advantages?.po?.permanent) || 0});
    if ( !checks.length ) continue;
    const lines = checks.map(c => c.text), rolls = [], rolled = [];
    // B6450: the checks are rolled for them, and a failure lands on the sheet
    for ( const c of checks.filter(x => x.roll) ) {
      let error = null;
      const r = await lovedRoll(who, c.roll).catch(err => { console.warn(`${MOD} | loved-one check`, err); error = String(err?.message ?? err); return null; });
      if ( r?.line ) lines.push(r.line);
      if ( r?.roll ) rolls.push(r.roll);
      rolled.push({fail: c.roll.fail ?? null, failed: !!r?.failed, made: !!r, ...(error ? {error} : {})});
    }
    if ( ev === "death" ) { const g = await grieve(who, e.kind); if ( g ) { lines.push(g.line); rolls.push(g.roll); } }
    // B5804 (n5): an NPC mourns on the map by its faith
    if ( ev === "death" && !who.hasPlayerOwner ) { try { const m = await api()?.aftercare?.mourn?.(who, victim); if ( m ) lines.push(`In mourning: ${m.words}, ${m.days} days.`); } catch (err) { console.warn(`${MOD} | mourning`, err); } }
    await ChatMessage.create({whisper: ownersOf(who), speaker: {alias: who.name}, flags: {[MOD]: {heartCard: true}}, rolls,
      content: card(`${victim.name} ${ev === "death" ? "is dead" : ev === "taken" ? "is taken" : "is hurt"}`, lines)});
    out.push({to: who.id, checks, rolled});
  }
  return out;
}
/* B6450: the roll a loved-one check names, made and applied. */
const actApi = () => (game.modules.get("wodx-actions")?.active ? game.modules.get("wodx-actions").api : null);
function lovedPool(a, pool) {
  const adv = a?.system?.advantages ?? {};
  if ( pool === "willpower" ) return Number(adv.willpower?.permanent) || 0;
  return Number(adv[pool]?.permanent) || 0;
}
async function bump(a, id, delta) {
  const P = actApi()?.profiles;
  if ( P?.adjust && P.resource?.(a, id)?.ok ) return P.adjust(a, id, delta, {note: false});
  const cur = Number(a.system?.advantages?.[id]?.temporary) || 0;
  return a.update({[`system.advantages.${id}.temporary`]: Math.max(0, Math.min(10, cur + delta))});
}
async function lovedRoll(who, spec) {
  if ( spec.via === "beast" ) {
    const r = await actApi()?.autoBeast?.({actor: who, provocation: "loved"});
    return {line: r ? "" : "The Beast stays quiet."};
  }
  if ( spec.via === "rage" ) return rageRoll(who);
  if ( spec.via === "fire" ) return fireSoulRoll(who);
  const dice = lovedPool(who, spec.pool);
  if ( dice <= 0 ) return null;
  const roll = await new Roll(`${dice}d10`).evaluate();
  const faces = roll.dice?.[0]?.results?.map(x => x.result) ?? [];
  const succ = TERMS.successes(faces, spec.diff).successes;
  const failed = H.lovedFailed(spec, succ);
  const label = {rage: "Rage", hun: "Hun", willpower: "Willpower"}[spec.pool] ?? spec.pool;
  if ( failed ) {
    if ( spec.fail === "frenzy" ) await markFrenzy(who, "berserk");
    else if ( spec.fail === "willpower" ) await bump(who, "willpower", -1);
    else await bump(who, spec.fail, 1);
    LM.floatOver(who, H.LOVED_FAIL_WORD[spec.fail] ?? "", "#ff8a80");
  }
  return {roll, failed, line: `${label} ${dice} at ${spec.diff}: ${succ} ${succ === 1 ? "success" : "successes"}. ${failed ? `${H.LOVED_FAIL_WORD[spec.fail]}.` : "It holds."}`};
}
async function d10s(n) { const r = await new Roll(`${Math.max(1, n)}d10`).evaluate(); return {roll: r, faces: r.dice?.[0]?.results?.map(x => x.result) ?? []}; }
const hitsAt = (faces, diff) => TERMS.successes(faces, diff).successes;
/** Mark a frenzy the way WoDX Actions does: the sheet's box, the frenzy kind and the Chronicle condition. */
async function markFrenzy(who, kind = "berserk", {thrall = false} = {}) {
  await who.update({"system.conditions.isfrenzy": true});
  try { await who.setFlag("wodx-actions", "frenzyType", kind); } catch (e) { /* Actions off */ }
  const C = game.modules.get("wodx-chronicle")?.api;
  try { await C?.conditions?.setCondition?.(who, "frenzy", true); } catch (e) { /* Chronicle off */ }
  if ( thrall ) try { await C?.timed?.applyTimed?.(who, {name: "Thrall of the Wyrm", img: "icons/svg/terror.svg", duration: {kind: "scene"}, key: "wodx-charm-thrall", source: "W20 p. 262",
    description: "The frenzy of the Wyrm's thrall: it attacks friend and foe and does the Wyrm's work."}); } catch (e) { /* Chronicle off */ }
}
/**
 * B6453: the Garou's Rage roll for a loved one hurt, taken or killed, by WoDX Actions' own rules: permanent Rage at the
 * moon's difficulty (one less for the auspice's moon or in Crinos), the rank's frenzy need, six successes the Thrall of
 * the Wyrm (W20 pdf 263-264).
 */
async function rageRoll(who) {
  const A = actApi(), GX = A?.garouRules;
  if ( !GX?.info || !GX.moonNow ) return null;
  const G = await import("../../wodx-actions/scripts/garou-rules.js");
  const i = GX.info(who), D = GX.data?.()?.garou ?? {}, b = GX.basis?.() ?? "w20";
  if ( i.fera && i.fera.rage === false ) return null;
  const dice = i.rage.perm;
  if ( dice <= 0 ) return null;
  const moon = await GX.moonNow();
  const diff = Math.min(10, G.rageDifficulty({b, phaseIndex: moon.index, auspice: i.auspice, form: i.form, table: D.rageDifficulty?.w20}) + G.rankFrenzyDiff(i.rank, D.frenzyByRank));
  const {roll, faces} = await d10s(dice);
  const succ = hitsAt(faces, diff);
  const fc = G.frenzyCheck(succ, {rank: i.rank, need: i.fera?.frenzy ?? 4, thrall: i.fera?.thrall ?? 6, byRank: D.frenzyByRank});
  const failed = fc.result !== "none", thrall = fc.result === "thrall";
  if ( failed ) { await markFrenzy(who, "berserk", {thrall}); LM.floatOver(who, thrall ? H.LOVED_FAIL_WORD.thrall : H.LOVED_FAIL_WORD.frenzy, "#ff8a80"); }
  return {roll, failed, line: `Rage ${dice} at ${diff} (${moon.name} moon): ${succ} ${succ === 1 ? "success" : "successes"}, ${fc.needed} for a frenzy. ${thrall ? "Thrall of the Wyrm." : failed ? "Frenzy." : "It holds."}`};
}
/**
 * B6453: the Kuei-jin's fire soul, by WoDX Actions' own rules: Yin against the P'o, both at 6, extended up to five
 * turns; the P'o's need of two successes (one when ravenous, shifted by a Yin or Yang imbalance) brings the lapse,
 * which is frenzy for the scene (Kindred of the East pdf 138).
 */
async function fireSoulRoll(who) {
  const A = actApi(), K = A?.kotRules;
  const i = A?.kotInfo?.(who);
  if ( !K?.natureStep || !i ) return null;
  const need = K.natureNeed("fire", {ravenous: i.hunger === "ravenous" || i.hunger === "uncontrollable", imbalance: i.perm});
  let st = {virtue: 0, po: 0, turn: 0}, turns = [], last = null;
  while ( !st.done ) {
    const a = await d10s(i.v.yin), p = await d10s(i.v.po);
    const ys = i.v.yin > 0 ? hitsAt(a.faces, 6) : 0, ps = i.v.po > 0 ? hitsAt(p.faces, 6) : 0;
    st = K.natureStep(st, ys, ps, need); last = a.roll;
    turns.push(`${ys}/${ps}`);
  }
  const failed = st.result === "lapses";
  if ( failed ) {
    await markFrenzy(who, "berserk");
    try { await game.modules.get("wodx-chronicle")?.api?.timed?.applyTimed?.(who, {name: "Fire soul", duration: {kind: "scene"}, condition: "frenzy", key: "wodx-kote-soul", source: "Kindred of the East pp. 150-151",
      description: "Fire soul: frenzy, as the Kindred know it."}); } catch (e) { /* Chronicle off */ }
    LM.floatOver(who, H.LOVED_FAIL_WORD.fire, "#ff8a80");
  }
  return {roll: last, failed, line: `Yin ${i.v.yin} against P'o ${i.v.po} at 6, turn by turn (Yin/P'o): ${turns.join(", ")}. ${failed ? "Fire soul." : st.result === "resists" ? "The Yin holds." : "The urge passes after five turns."}`};
}
/** Someone close is taken: the captor's demands go in the Ledger, and the ones who love them are told. */
export async function takeHostage(captorLike, victimLike, {demand = ""} = {}) {
  const c = actorOf(captorLike), v = actorOf(victimLike);
  if ( !game.user.isGM || !c || !v ) return null;
  await v.setFlag(MOD, "heldBy", {id: c.id, name: c.name, at: game.time.worldTime});
  const told = await tellLoved(v, "taken");
  for ( const t of told ) {
    const who = game.actors.get(t.to);
    try { await st()?.ledger?.save?.({kind: "consequence", what: `${c.name} holds ${v.name}${demand ? ` and demands ${demand}` : ""}`, from: {id: who.id, name: who.name}, to: {id: c.id, name: c.name}, due: game.time.worldTime + 3 * DAY}); } catch (e) { /* Ledger off */ }
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
