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
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownersOf = a => game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const card = (title, lines) => `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div></div>`;
const dateOf = t => getEngine().timeToDate(Number(t) || 0);
const yearNow = () => dateOf(game.time.worldTime).year;
const sexOf = a => { const s = String(a?.flags?.["wodx-creation"]?.sex ?? a?.system?.sex ?? "").toLowerCase(); return /^m/.test(s) ? "m" : /^f/.test(s) ? "f" : ""; };
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

let timer = null;
export function listen() {
  Hooks.once("ready", () => {
    chron()?.registerApprovalHandler?.(ASK_CHILD, {label: "A child asked for by players", approve: e => conceive(e.data?.a, e.data?.b)});
    game.socket.on(SOCKET, m => { if ( isActiveGM() && m?.type === "family.child" ) onAsk(m).catch(e => console.error(`${MOD} | family`, e)); });
  });
  Hooks.on("updateWorldTime", () => {
    if ( !isActiveGM() ) return;
    clearTimeout(timer);
    timer = setTimeout(() => checkBirths().catch(e => console.error(`${MOD} | births`, e)), 750);
  });
}

export const rules = F;
