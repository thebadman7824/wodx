/**
 * Family systems at play (B3220-B3239; the rules are in family-rules.mjs). Pregnancy and birth: the Storyteller starts
 * a pregnancy (or approves a player's ask in the approval queue), the clock counts the months, and the birth comes as
 * a roll and a card. Supernatural pregnancies add story hooks to the Storyteller's card only. Nothing is ever shown
 * of conception, and nothing sexual is ever described. Both parents must be adults (Chronicle's age floor, B3210).
 */
import * as F from "./family-rules.mjs";
import * as H from "./hearts-rules.mjs";
import * as HEARTS from "./hearts.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const SOCKET = `module.${MOD}`;
const ASK_CHILD = "wodx-npc.family-child";
const GROW = "wodx-npc.family-grow";
const YEAR_SECONDS = 365.25 * 86400;
const WEDDING = "wodx-npc.family-wedding";
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownersOf = a => game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const card = (title, lines) => `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div></div>`;
const dateOf = t => getEngine().timeToDate(Number(t) || 0);
const yearNow = () => dateOf(game.time.worldTime).year;
// One gender for every module (B3500): WoDX Chronicle reads every record, and gives "" for a player character (B3502)
const sexOf = a => {
  const g = game.modules.get("wodx-chronicle")?.api?.gender;
  if ( g?.forRules ) return g.rules.letter(g.forRules(a));
  if ( a?.hasPlayerOwner ) return "";
  const s = String(a?.flags?.["wodx-creation"]?.sex ?? a?.flags?.["wodx-creation"]?.people?.sex ?? a?.system?.sex ?? "").toLowerCase(); return /^m(ale)?$/.test(s) ? "m" : /^f(emale)?$/.test(s) ? "f" : "";
};
const stamina = a => { const s = a?.system?.attributes?.stamina; return Math.max(1, Number(s?.total ?? s?.value) || 1); };
const regionNow = () => { try { return chron()?.world?.homeland?.() || "moravia"; } catch (e) { return "moravia"; } };
const sphereNow = (region, year) => { try { return chron()?.world?.rules?.sphereFor?.(region, year) ?? "latin"; } catch (e) { return "latin"; } };
const south = () => { try { return Number(chron()?.place?.latitudeFor?.()) < 0; } catch (e) { return false; } };

/** The pregnancy a character carries now, or null. */
export const expectingOf = aLike => actorOf(aLike)?.flags?.[MOD]?.expecting ?? null;

/** The age floor: both must be adults. Without Chronicle's check nothing is allowed. */
function adults(a, b) {
  const r = chron()?.age?.romance?.(a, b);
  return r ?? {ok: false, why: "The age check is not available (a WoDX Chronicle with the age floor is needed)."};
}

/**
 * The Storyteller starts a pregnancy between two characters. carrier: the one who carries the child (an actor or id);
 * left out, it follows the sexes on the sheets and else the first. safe: no birth roll. Returns {ok, why, record}.
 */
export async function conceive(aLike, bLike, {carrier = null, safe = false, care = ""} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !game.user.isGM || !a || !b ) return null;
  const why = [];
  if ( a.id === b.id ) why.push("A child needs two parents.");
  const age = adults(a, b);
  if ( !age.ok ) why.push(age.why);
  const lines = [HEARTS.lineOf(a), HEARTS.lineOf(b)];
  const kid = H.childOf(lines, 0.5);
  if ( !kid ) why.push("One of them cannot have children.");
  let idx = carrier ? [a.id, b.id].indexOf(actorOf(carrier)?.id) : F.carrierIndex([sexOf(a), sexOf(b)]);
  if ( idx < 0 ) idx = 0;
  const mother = idx === 1 ? b : a, other = idx === 1 ? a : b;
  if ( expectingOf(mother) ) why.push(`${mother.name} is already expecting.`);
  if ( why.length ) { ui.notifications?.warn?.(why.join(" ")); return {ok: false, why}; }
  const start = Number(game.time.worldTime) || 0, due = F.dueAt(start);
  const d = dateOf(due);
  const region = regionNow();
  const record = {id: foundry.utils.randomID(), start, due, with: {id: other.id, name: other.name, line: HEARTS.lineOf(other)}, safe: !!safe,
    care: F.CARE[care] ? care : "", region, season: F.seasonOf(d.month, south()), dueYear: d.year};
  await mother.setFlag(MOD, "expecting", record);
  const hooks = F.storyHooks(lines, kid);
  await ChatMessage.create({whisper: [...new Set([...ownersOf(mother), ...ownersOf(other)])], speaker: {alias: "WoDX"}, flags: {[MOD]: {expecting: record.id}},
    content: card(`${mother.name} is expecting`, [`A child with ${other.name}, due in ${record.season} ${record.dueYear}.`])});
  if ( hooks.length || safe ) await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, flags: {[MOD]: {expecting: record.id}},
    content: card(`For the Storyteller: ${mother.name}'s child`, [...hooks, ...(safe ? ["You set this birth as safe: there will be no roll."] : [])])});
  Hooks.callAll("wodxExpecting", {mother, other, record});
  return {ok: true, record, mother, other};
}

/** End a pregnancy without a birth (the Storyteller's call). */
export async function endPregnancy(aLike) {
  const a = actorOf(aLike);
  if ( !game.user.isGM || !a || !expectingOf(a) ) return false;
  await a.unsetFlag(MOD, "expecting");
  return true;
}

/** Roll the birth on the d10s. Returns {dice, successes, botch, difficulty, pool, care}. */
async function rollBirth(mother, rec, year) {
  const care = rec.care || F.careFor(year);
  const difficulty = F.birthDifficulty(year, care), pool = F.birthPool(stamina(mother), care);
  const roll = await new Roll(`${pool}d10`).evaluate();
  const dice = roll.dice[0]?.results?.map(r => r.result) ?? [];
  return {...F.countDice(dice, difficulty), dice, difficulty, pool, care};
}

/** The birth: a roll (unless safe), then a child or a loss, and the rest the custom of the time gives. */
export async function birth(aLike, {outcome = ""} = {}) {
  const mother = actorOf(aLike);
  const rec = expectingOf(mother);
  if ( !game.user.isGM || !mother || !rec ) return null;
  const year = yearNow(), sphere = sphereNow(rec.region || regionNow(), year);
  const roll = rec.safe || outcome ? null : await rollBirth(mother, rec, year);
  const result = outcome || (roll ? F.birthOutcome(roll) : "well");
  await mother.unsetFlag(MOD, "expecting");
  const other = game.actors.get(rec.with?.id) ?? null;
  const rest = F.lyingIn(year, sphere);
  if ( result === "loss" ) {
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "WoDX"}, flags: {[MOD]: {birth: rec.id}},
      content: card(`For the Storyteller: ${mother.name}'s pregnancy ends in a loss`, ["Tell it gently, as your table wishes, and only as much as the story needs."])});
    Hooks.callAll("wodxBirth", {mother, other, record: rec, outcome: result, child: null});
    return {ok: true, outcome: result, roll};
  }
  const made = await HEARTS.haveChild(mother, other ?? mother, {lines: other ? null : [HEARTS.lineOf(mother), rec.with?.line || "mortal"]});
  const child = made?.child ?? null;
  const restUntil = (Number(game.time.worldTime) || 0) + Math.round(rest.weeks * 7 * 86400) + (result === "hard" ? F.HARD_BIRTH.restMonths * F.MONTH_SECONDS : 0);
  await mother.setFlag(MOD, "lyingIn", {until: restUntil, label: rest.label, hard: result === "hard"});
  const lines = [child ? `${child.name} is born.` : "The child is born.", `Then ${rest.label}, about ${rest.weeks} weeks.`];
  if ( result === "hard" ) lines.push(`A hard birth: ${F.HARD_BIRTH.levels} bashing health levels and about ${F.HARD_BIRTH.restMonths} more months of rest.`);
  await ChatMessage.create({whisper: [...new Set([...ownersOf(mother), ...(other ? ownersOf(other) : [])])], speaker: {alias: "WoDX"}, flags: {[MOD]: {birth: rec.id}},
    content: card(`${mother.name} gives birth`, lines)});
  Hooks.callAll("wodxBirth", {mother, other, record: rec, outcome: result, child});
  return {ok: true, outcome: result, roll, child};
}

/** Births that are due: the active Storyteller's client runs them when the clock passes the due date. */
export async function checkBirths() {
  if ( !isActiveGM() ) return [];
  const now = Number(game.time.worldTime) || 0, out = [];
  for ( const a of game.actors ) {
    const rec = a.flags?.[MOD]?.expecting;
    if ( rec && now >= Number(rec.due) ) out.push(await birth(a));
  }
  return out;
}

/** The plain lines the Relationships tab shows: expecting, or resting after a birth. */
export function lines(aLike) {
  const a = actorOf(aLike);
  const out = [];
  const rec = expectingOf(a);
  if ( rec ) out.push(F.expectingLine(rec.season, rec.dueYear));
  const prop = proposalOf(a);
  if ( prop?.stage === "waiting" ) { const d = dateOf(prop.due); out.push(`Betrothed to ${game.actors.get(prop.b)?.name ?? "someone"}: ${prop.wait} until ${d.day}/${d.month}/${d.year}.`); }
  else if ( prop?.stage === "asked" ) out.push(`Waiting on an answer from ${game.actors.get(prop.b)?.name ?? "someone"}.`);
  else if ( prop?.stage === "wedding" ) out.push(`The wedding to ${game.actors.get(prop.b)?.name ?? "someone"} waits on the Storyteller.`);
  const kid = childSheetOf(a), age = ageOf(a);
  if ( kid && !kid.grown && age !== null && age < 18 ) out.push(`A child of ${age}: Attributes up to ${F.attrCap(age)}, Abilities up to ${F.abilityCap(age)}. Grows up with the years.`);
  const rest = a?.flags?.[MOD]?.lyingIn;
  if ( rest && Number(rest.until) > (Number(game.time.worldTime) || 0) ) {
    const d = dateOf(rest.until);
    out.push(`Resting after the birth (${rest.label}) until ${d.day}/${d.month}/${d.year}.`);
  }
  return out;
}

/** A player asks for a child between two characters: the ask goes to the Storyteller's approval queue. */
export async function askChild(aLike, bLike) {
  const a = actorOf(aLike), b = actorOf(bLike);
  if ( !a || !b ) return null;
  const age = adults(a, b);
  if ( !age.ok ) { ui.notifications?.warn?.(age.why); return {ok: false, why: [age.why]}; }
  const payload = {type: "family.child", a: a.id, b: b.id, userId: game.user.id};
  if ( isActiveGM() ) await onAsk(payload);
  else game.socket.emit(SOCKET, payload);
  ui.notifications?.info?.("Your request goes to the Storyteller.");
  return {sent: true};
}
async function onAsk(m) {
  const a = game.actors.get(m.a), b = game.actors.get(m.b);
  if ( !a || !b ) return;
  const user = game.users.get(m.userId);
  if ( user && !user.isGM && !a.testUserPermission(user, "OWNER") && !b.testUserPermission(user, "OWNER") ) return;
  await chron()?.propose?.({type: ASK_CHILD, key: `${ASK_CHILD}.${[a.id, b.id].sort().join(".")}`, title: `${a.name} and ${b.name} ask to have a child`,
    detail: "Approving starts a pregnancy; the birth comes about nine months later on the clock.", data: {a: a.id, b: b.id, from: m.userId ?? null}});
}

/* ---- Child sheets and growing up (B3223-B3227) ---- */
const bornOf = a => { const v = a?.flags?.["wodx-creation"]?.chronology?.bornYear; return v === null || v === undefined || v === "" ? null : Number(v); };
export const childSheetOf = aLike => actorOf(aLike)?.flags?.[MOD]?.childSheet ?? null;
export const ageOf = (aLike, year = yearNow()) => { const b = bornOf(actorOf(aLike)); return b === null ? null : Math.max(0, Number(year) - b); };

/**
 * Make a sheet a child's sheet: the Storyteller's minor mark (so the age floor holds with no birth year), Attributes,
 * Abilities and Willpower fitted to the age, and a record of the years. A birth makes one; the Storyteller can make any.
 */
export async function makeChild(aLike, {bornYear = null} = {}) {
  const a = actorOf(aLike);
  if ( !game.user.isGM || !a ) return null;
  if ( bornYear !== null ) await a.setFlag("wodx-creation", "chronology", {...(a.flags?.["wodx-creation"]?.chronology ?? {}), bornYear: Number(bornYear)});
  const age = ageOf(a) ?? 0;
  if ( age >= 18 ) return {ok: false, why: [`${a.name} is ${age}, already grown.`]};
  const seed = childSheetOf(a)?.seed ?? foundry.utils.randomID();
  await a.update({...F.fitToAge(a.system?.attributes, a.system?.abilities, age, seed), "flags.wodx-chronicle.minor": true,
    [`flags.${MOD}.childSheet`]: {seed, since: yearNow(), history: childSheetOf(a)?.history ?? [], grown: null}});
  return {ok: true, age};
}

/** What the years from one age to another bring a child: a lifepath scene, schooling, a Nature, coming of age. */
export async function growthPlan(aLike, toYear) {
  const a = actorOf(aLike), sheet = childSheetOf(a), born = bornOf(a);
  if ( !a || !sheet || sheet.grown || born === null ) return null;
  const from = ageOf(a), to = Math.max(0, Number(toYear) - born);
  const bands = F.bandsCrossed(from, to);
  if ( !bands.length ) return null;
  const region = regionNow(), sphere = sphereNow(region, toYear);
  const rand = F.seeded(`${sheet.seed}:${to}`);
  let scene = null;
  try {
    const LP = await import("../../wodx-creation/scripts/lifepath-rules.mjs");
    const stage = to >= 13 || from >= 12 ? "youth" : "birth";
    const path = LP.newPath({line: "mortal", birthYear: born, seed: sheet.seed});
    const flags = LP.flagsOf(path);
    const year = born + (stage === "youth" ? 12 : 0);
    const pool = LP.allEvents().filter(e => LP.fits(e, path, stage, flags, year) && F.childSafe(e));
    const e = pool.length ? pool[Math.floor(rand() * pool.length)] : null;
    if ( e ) { const i = Math.floor(rand() * (e.options?.length || 1)); const o = e.options?.[i]; scene = {id: e.id, title: e.title, choice: o?.label ?? "", grants: F.grantsOf(o?.g)}; }
  } catch (err) { scene = null; }
  const school = F.schoolingFor(toYear, region, sphere);
  const nature = to >= F.NATURE_AGE && !String(a.system?.nature ?? "").trim() ? F.pickNature(sheet.seed) : "";
  return {id: a.id, name: a.name, from, to, toYear: Number(toYear), bands, scene, school: to >= school.from ? school : null, nature, grown: to >= 18};
}
export const planLines = p => [
  `${p.name}: from ${p.from} to ${p.to} years old.`,
  ...(p.scene ? [`The years: ${p.scene.title}. ${p.scene.choice}.${p.scene.grants.abilities.length ? ` Gains ${p.scene.grants.abilities.join(" and ")}.` : ""}${p.scene.grants.other.length ? ` Notes: ${p.scene.grants.other.join(", ")}.` : ""}`] : []),
  ...(p.school ? [`Schooling or work: ${p.school.label}.`] : []),
  ...(p.nature ? [`A Nature shows: ${p.nature}.`] : []),
  ...(p.grown ? ["Grown: now an adult. The child mark comes off; make them a player character through the character wizard if you wish."] : [])
];

/** Apply an approved plan: fit the sheet to the new age, add the Abilities the years gave (within the age's cap), the Nature, and coming of age. */
export async function applyGrowth(plan) {
  const a = game.actors.get(plan?.id);
  if ( !game.user.isGM || !a || !childSheetOf(a) ) return null;
  const sheet = childSheetOf(a), cap = F.abilityCap(plan.to);
  const up = F.fitToAge(a.system?.attributes, a.system?.abilities, plan.to, sheet.seed);
  const abs = a.system?.abilities ?? {};
  const gain = [...(plan.scene?.grants?.abilities ?? []).map(F.abilityKey), ...(plan.school ? [plan.school.ability] : [])];
  for ( const k of gain ) {
    if ( !abs[k] || typeof abs[k] !== "object" ) continue;
    const was = Number(up[`system.abilities.${k}.value`] ?? abs[k].value) || 0;
    up[`system.abilities.${k}.value`] = Math.min(cap, was + 1);
  }
  if ( plan.nature ) up["system.nature"] = plan.nature;
  const history = [...(sheet.history ?? []), {to: plan.to, year: plan.toYear, lines: planLines(plan).slice(1)}].slice(-20);
  up[`flags.${MOD}.childSheet`] = {...sheet, history, grown: plan.grown ? plan.toYear : null};
  await a.update(up);
  if ( plan.grown ) await a.unsetFlag("wodx-chronicle", "minor");
  Hooks.callAll("wodxGrownUp", {actor: a, plan});
  return {ok: true, grown: !!plan.grown};
}

/** On a skip of whole years: one approval card for each child whose age crosses a band. */
export async function onSkipEnd(info = {}) {
  if ( !isActiveGM() ) return [];
  if ( !((Number(info.to) - Number(info.from)) / YEAR_SECONDS >= 1) ) return [];
  const toYear = dateOf(info.to).year, out = [];
  for ( const a of game.actors ) {
    if ( !childSheetOf(a) || childSheetOf(a).grown ) continue;
    const plan = await growthPlan(a, toYear);
    if ( !plan ) continue;
    await chron()?.propose?.({type: GROW, key: `${GROW}.${a.id}.${toYear}`, title: `The years for ${a.name} (${plan.from} to ${plan.to})`, detail: planLines(plan).join("\n"), data: {plan}});
    out.push(plan);
  }
  return out;
}

/* ---- Players playing children (B3228) ---- */
const childPCs = () => { try { return !!game.settings.get(MOD, "childCharacters"); } catch (e) { return false; } };
function minorAfter(actor, change) {
  const rules = chron()?.age?.rules;
  if ( !rules ) return false;
  const merged = foundry.utils.mergeObject(actor.toObject(), foundry.utils.deepClone(change ?? {}), {inplace: false});
  return rules.isMinor(rules.ageFacts(merged, t => dateOf(t).year), yearNow());
}
const playerOwners = own => Object.entries(own ?? {}).filter(([id, lvl]) => id !== "default" && Number(lvl) >= 3 && !game.users.get(id)?.isGM).map(([id]) => id);
export function guardChildCharacters() {
  Hooks.on("preCreateActor", doc => {
    if ( childPCs() || game.user.isGM ) return;
    if ( minorAfter(doc, {}) ) { ui.notifications?.warn?.("The Storyteller has not opened child characters to players. A character must be 18 or older."); return false; }
  });
  Hooks.on("preUpdateActor", (actor, change) => {
    if ( childPCs() ) return;
    const players = change?.ownership ? playerOwners(change.ownership) : [];
    if ( players.length && minorAfter(actor, change) ) {
      for ( const id of players ) delete change.ownership[id];
      ui.notifications?.warn?.(`${actor.name} is under 18, and child characters are not open to players (a world setting).`);
    }
    if ( !game.user.isGM && foundry.utils.hasProperty(change, "flags.wodx-creation.chronology.bornYear") && minorAfter(actor, change) ) {
      delete change.flags["wodx-creation"].chronology.bornYear;
      ui.notifications?.warn?.("The Storyteller has not opened child characters to players. A character must be 18 or older.");
    }
  });
}
export function registerSettings() {
  game.settings.register(MOD, "childCharacters", {scope: "world", config: true, type: Boolean, default: false,
    name: "Players may play children", hint: "Off: no player may own or make a character under 18. On: they may, and a child character still never takes part in anything romantic or sexual."});
}

/* ---- Player-asked marriage (B3229-B3231) ---- */
const proposalOf = aLike => actorOf(aLike)?.flags?.[MOD]?.proposal ?? null;
const marriedCount = a => (a?.flags?.[MOD]?.marriages ?? []).filter(m => !m.ended).length;
const playerOwned = a => game.users.some(u => !u.isGM && a.testUserPermission?.(u, "OWNER"));
const charisma = a => { const s = a?.system?.attributes?.charisma; return Math.max(1, Number(s?.total ?? s?.value) || 1); };
const empathy = a => Number(a?.system?.abilities?.empathy?.value) || 0;
function feudBetween(a, b) {
  const st = game.modules.get(MOD)?.api?.standing;
  try { const fa = st?.feudsOf?.(a) ?? [], fb = st?.feudsOf?.(b) ?? []; return fa.find(f => fb.some(g => g.id === f.id && g.side !== f.side)) ?? null; } catch (e) { return null; }
}

/**
 * A proposal of marriage from one character to another, as a short chain: the answer, the families' say, the banns or
 * the contract on the clock, and the wedding card to the Storyteller, whose approval runs the marriage. Both must be
 * adults (B3210) and free to marry under the law of the place and year.
 */
export async function propose(fromLike, toLike) {
  const a = actorOf(fromLike), b = actorOf(toLike);
  if ( !a || !b || a.id === b.id ) return null;
  const why = [];
  const age = adults(a, b);
  if ( !age.ok ) why.push(age.why);
  const year = yearNow(), region = regionNow(), sphere = sphereNow(region, year);
  const law = H.marriageLaw(region, year, sphere);
  const can = H.canMarry(law, {sexes: [sexOf(a), sexOf(b)], married: [marriedCount(a), marriedCount(b)]});
  if ( !can.ok ) why.push(...can.why);
  if ( proposalOf(a) || proposalOf(b) ) why.push("A proposal between them is already on its way.");
  if ( why.length ) { ui.notifications?.warn?.(why.join(" ")); return {ok: false, why}; }
  const payload = {type: "family.propose", a: a.id, b: b.id, userId: game.user.id};
  if ( isActiveGM() ) return onPropose(payload);
  game.socket.emit(SOCKET, payload);
  ui.notifications?.info?.("Your proposal is on its way.");
  return {sent: true};
}
async function onPropose(m) {
  const a = game.actors.get(m.a), b = game.actors.get(m.b);
  if ( !a || !b ) return null;
  const user = game.users.get(m.userId);
  if ( user && !user.isGM && !a.testUserPermission(user, "OWNER") ) return null;
  const id = foundry.utils.randomID();
  const rec = {id, a: a.id, b: b.id, at: Number(game.time.worldTime) || 0, stage: "asked"};
  await a.setFlag(MOD, "proposal", rec);
  if ( playerOwned(b) && !b.testUserPermission(user ?? game.user, "OWNER") ) {
    const owners = game.users.filter(u => !u.isGM && b.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({whisper: [...new Set([...owners, ...gmIds()])], speaker: {alias: "WoDX"}, flags: {[MOD]: {proposal: id, a: a.id, b: b.id}},
      content: `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(a.name)} asks ${esc(b.name)} to marry</b></p><p>The one who plays ${esc(b.name)} answers.</p>
        <p><button type="button" class="wnpc-prop" data-say="yes">Accept</button> <button type="button" class="wnpc-prop" data-say="no">Decline</button></p></div></div>`});
    return {ok: true, stage: "asked", waiting: "player"};
  }
  const warmth = HEARTS.warmthOf(b, a);
  let say = F.proposalAnswer(warmth), roll = null;
  if ( say === "roll" ) {
    const r = await new Roll(`${charisma(a) + empathy(a)}d10`).evaluate();
    roll = F.countDice(r.dice[0]?.results?.map(x => x.result) ?? [], F.PROPOSAL_DIFFICULTY);
    say = F.proposalAnswer(warmth, roll.successes);
  }
  return answer(a, b, say, {roll});
}
/** The answer: no ends it; yes goes to the families, then the banns or the contract. */
export async function answer(aLike, bLike, say, {roll = null} = {}) {
  const a = actorOf(aLike), b = actorOf(bLike), rec = proposalOf(a);
  if ( !game.user.isGM || !a || !b || !rec || rec.b !== b.id ) return null;
  const owners = [...new Set([...ownersOf(a), ...ownersOf(b)])];
  if ( say !== "yes" ) {
    await a.unsetFlag(MOD, "proposal");
    await ChatMessage.create({whisper: owners, speaker: {alias: "WoDX"}, flags: {[MOD]: {proposal: rec.id}}, content: card(`${b.name} says no`, [`${a.name}'s proposal is turned down.${roll ? ` (Charisma + Empathy: ${roll.successes} successes.)` : ""}`])});
    Hooks.callAll("wodxProposal", {a, b, record: rec, answer: "no"});
    return {ok: true, answer: "no", roll};
  }
  const year = yearNow(), region = regionNow(), sphere = sphereNow(region, year);
  const court = H.courtshipFor(sphere, year), say2 = F.familiesSay(court.key);
  const feud = feudBetween(a, b);
  if ( feud ) {
    await a.unsetFlag(MOD, "proposal");
    await ChatMessage.create({whisper: owners, speaker: {alias: "WoDX"}, flags: {[MOD]: {proposal: rec.id}},
      content: card(`${b.name} says yes, but the families are at feud`, [`The feud with ${feud.foe ?? "the other family"} blocks the match until it is settled.`])});
    Hooks.callAll("wodxProposal", {a, b, record: rec, answer: "blocked"});
    return {ok: true, answer: "blocked"};
  }
  const SR = game.modules.get(MOD)?.api?.standing;
  let objection = "";
  try { objection = say2.need ? SR?.rules?.matchObjection?.(SR.rank(a), SR.rank(b), year) ?? "" : ""; } catch (e) { objection = ""; }
  const law = H.marriageLaw(region, year, sphere);
  const wait = F.waitingFor(law, sphere, year);
  const due = (Number(game.time.worldTime) || 0) + wait.days * 86400;
  await a.setFlag(MOD, "proposal", {...rec, stage: "waiting", due, wait: wait.label, objection, who: say2.who});
  await ChatMessage.create({whisper: owners, speaker: {alias: "WoDX"}, flags: {[MOD]: {proposal: rec.id}},
    content: card(`${b.name} says yes`, [`Who must agree: ${say2.who}.${objection ? ` ${objection}` : ""}`, `Next: ${wait.label}, about ${wait.days} days on the clock. Then the wedding.`])});
  Hooks.callAll("wodxProposal", {a, b, record: rec, answer: "yes"});
  return {ok: true, answer: "yes", roll, wait, objection};
}
/** Proposals whose waiting is over: the wedding card goes to the Storyteller's approval queue. */
export async function checkWeddings() {
  if ( !isActiveGM() ) return [];
  const now = Number(game.time.worldTime) || 0, out = [];
  for ( const a of game.actors ) {
    const rec = a.flags?.[MOD]?.proposal;
    if ( !rec || rec.stage !== "waiting" || now < Number(rec.due) ) continue;
    const b = game.actors.get(rec.b);
    if ( !b ) { await a.unsetFlag(MOD, "proposal"); continue; }
    const year = yearNow(), region = regionNow(), law = H.marriageLaw(region, year, sphereNow(region, year));
    await a.setFlag(MOD, "proposal", {...rec, stage: "wedding"});
    await chron()?.propose?.({type: WEDDING, key: `${WEDDING}.${rec.id}`, title: `The wedding of ${a.name} and ${b.name}`,
      detail: [`Rite: ${law.rite}. Kept by ${law.record}.`, law.moneyKind?.payer ? `${law.moneyKind.label}: paid by ${law.moneyKind.payer} to ${law.moneyKind.to}.` : "", rec.objection ?? "", "Approving marries them; play the wedding as a scene with the families and witnesses."].filter(Boolean).join("\n"),
      data: {a: a.id, b: b.id, id: rec.id}});
    out.push(rec.id);
  }
  return out;
}
async function wed(entry) {
  const a = game.actors.get(entry.data?.a), b = game.actors.get(entry.data?.b);
  if ( a ) await a.unsetFlag(MOD, "proposal");
  if ( !a || !b ) return "One of them is gone";
  const r = await HEARTS.marry(a, b);
  return r?.ok ? "Married" : (r?.why ?? []).join(" ") || "Not married";
}
async function unwed(entry) { const a = game.actors.get(entry.data?.a); if ( a ) await a.unsetFlag(MOD, "proposal"); return "No wedding"; }
/** The player who plays the one asked answers on the card. */
function bindProposalCards() {
  Hooks.on("renderChatMessageHTML", (msg, html) => {
    const f = msg.flags?.[MOD];
    if ( !f?.proposal || !f.b ) return;
    for ( const btn of html.querySelectorAll?.(".wnpc-prop") ?? [] ) {
      btn.addEventListener("click", ev => {
        ev.preventDefault();
        const b = game.actors.get(f.b);
        if ( !b?.isOwner ) return ui.notifications?.warn?.("Only the one who plays them can answer.");
        const m = {type: "family.answer", a: f.a, b: f.b, id: f.proposal, say: btn.dataset.say === "yes" ? "yes" : "no", userId: game.user.id};
        if ( isActiveGM() ) onAnswer(m); else game.socket.emit(SOCKET, m);
        html.querySelectorAll(".wnpc-prop").forEach(x => { x.disabled = true; });
      });
    }
  });
}
async function onAnswer(m) {
  const a = game.actors.get(m.a), b = game.actors.get(m.b), user = game.users.get(m.userId);
  if ( !a || !b || proposalOf(a)?.id !== m.id || proposalOf(a)?.stage !== "asked" ) return;
  if ( user && !user.isGM && !b.testUserPermission(user, "OWNER") ) return;
  await answer(a, b, m.say);
}

let timer = null;
/** The approval cards this file answers: growing up, a child asked for, a wedding after a proposal. */
export function registerHandlers() {
  const reg = chron()?.registerApprovalHandler;
  if ( !reg ) return false;
  reg(GROW, {label: "A child grows up", approve: e => applyGrowth(e.data?.plan), reject: async () => "Left as it was"});
  reg(ASK_CHILD, {label: "A child asked for by players", approve: e => conceive(e.data?.a, e.data?.b)});
  reg(WEDDING, {label: "A wedding after a proposal", approve: wed, reject: unwed});
  return true;
}

export function listen() {
  bindProposalCards();
  registerSettings();
  guardChildCharacters();
  Hooks.on("wodxSkipEnd", info => { onSkipEnd(info).catch(e => console.error(`${MOD} | growing up`, e)); });
  // Chronicle's API may come after this module's ready, so the handlers are also registered on wodxChronicleReady
  Hooks.on("wodxChronicleReady", registerHandlers);
  Hooks.once("ready", () => {
    registerHandlers();
    game.socket.on(SOCKET, m => { if ( !isActiveGM() ) return;
      const run = m?.type === "family.child" ? onAsk : m?.type === "family.propose" ? onPropose : m?.type === "family.answer" ? onAnswer : null;
      if ( run ) run(m).catch(e => console.error(`${MOD} | family`, e));
    });
  });
  Hooks.on("updateWorldTime", () => {
    if ( !isActiveGM() ) return;
    clearTimeout(timer);
    timer = setTimeout(() => { checkBirths().catch(e => console.error(`${MOD} | births`, e)); checkWeddings().catch(e => console.error(`${MOD} | weddings`, e)); }, 750);
  });
}

export const rules = F;
