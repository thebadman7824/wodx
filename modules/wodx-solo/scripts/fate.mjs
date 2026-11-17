/**
 * WoDX Solo: step 5 of The Lone Chronicle (B6530 to B6536): the Beast played by the game, torpor and the years slept
 * through, death and the heirs who carry the chronicle on. fate-rules.mjs holds the rules; this is the Foundry side.
 *
 *   The Beast      when the lone player's character falls into frenzy (WoDX Actions rolls the check), the seat makes it
 *                  a stand-in (flags.wodx-storyteller.standIn), so WoDX NPC plays its turns. With no fight on the
 *                  scene the Beast goes for an enemy in sight, else the nearest living being, and the fight starts on
 *                  the map. A Kindred or ghoul player may spend a Willpower point for one turn of control (V20 pdf
 *                  307). When the fight is over the frenzy ends (one scene, as V20 says); a botched frenzy is left to
 *                  WoDX Actions, which rolls it out.
 *   Torpor         a Cainite in torpor sleeps it away from the panel: the clock runs to the night they may rise, by
 *                  WoDX Creation's Pass the Years when it is a year or more, and the rising is rolled.
 *   The years      "Sleep through the years": a Cainite goes into voluntary torpor; anyone else lives the years. The
 *                  whole world moves with them (ageing, deaths, heirs, the era) as Pass the Years does it.
 *   Heirs          when the character dies, the panel offers those the dead leave behind; the player takes one up,
 *                  its token stands by the body, and every owner record of the dead passes to the heir. Or a new
 *                  character, through arrival.
 *
 *   flags.wodx-solo.beast    {since, standIn, held}   the seat is playing the Beast; standIn: the seat set the flag
 *   flags.wodx-solo.fallen   {at}                     the death was seen and the heirs offered
 *   flags.wodx-solo.heirOf   {id, name, at}           on the heir: whom they carry on from
 */
import * as F from "./fate-rules.mjs";
import {addAsks, addActions, setFateUi, ask, SOCKET, characterOf, placeOf, tell, SoloPanel} from "./panel.mjs";

const MOD = "wodx-solo";
const ST = "wodx-storyteller";
const ACT = "wodx-actions";
const CRE = "wodx-creation";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const all = c => c?.contents ?? [...(c?.values?.() ?? c ?? [])];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const {DialogV2} = foundry.applications.api;
const A = () => game.wodxActions ?? (game.modules.get(ACT)?.active ? game.modules.get(ACT).api : null) ?? null;
const chron = () => (game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api ?? null : null);
const stApi = () => (game.modules.get(ST)?.active ? game.modules.get(ST).api ?? null : null);
const reply = (userId, type, data = {}) => game.socket.emit(SOCKET, {type, payload: {userId, ...data}});

let H = null; // from main.mjs: {isOn, isSeat, log, get}
/** The active Storyteller's client: what our own flags start (they are set only in solo play) it also finishes. */
const isActiveGM = () => game.user.isGM && (game.users.activeGM ? game.users.activeGM.id === game.user.id : true);
/** The seat, or a gate run as the Storyteller asking with force (the switch may be off on the testbed). */
const seat = force => H.isSeat() || (!!force && isActiveGM());

/* ------------------------------------------------------------------ */
/*  Reading the character                                              */
/* ------------------------------------------------------------------ */

const kindOf = actor => { try { return A()?.getKind?.(actor) ?? "mortal"; } catch (e) { return "mortal"; } };
const inFrenzy = actor => !!actor?.system?.conditions?.isfrenzy;
const torporOf = actor => actor?.flags?.[ACT]?.torpor ?? null;
const plainDead = actor => ({statuses: actor?.statuses ?? [], died: actor?.flags?.[CRE]?.chronology?.died ?? null, finalDeath: actor?.flags?.["wodx-npc"]?.finalDeath ?? null});
const isFallen = actor => F.fallen(plainDead(actor));
const wp = actor => num(actor?.system?.advantages?.willpower?.temporary);
/** The players whose character this is: the one assigned, or the one panel.mjs takes for them. */
const playersOf = actor => all(game.users).filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER") && characterOf(u)?.id === actor.id);
// B6669 follow-up: the year through api.eras.currentYear (there is no api.calendar.yearOf)
const yearNow = () => { try { return chron()?.eras?.currentYear?.() ?? new Date(game.time.worldTime * 1000).getUTCFullYear(); } catch (e) { return null; } };
const fightOn = sceneId => all(game.combats).filter(c => c.started && c.scene?.id === sceneId);
const combatOf = tokenDoc => all(game.combats).find(c => c.started && all(c.combatants).some(x => x.tokenId === tokenDoc?.id)) ?? null;

async function calendarYear() {
  try { const cal = await import("../../wodx-chronicle/scripts/calendar.mjs"); return cal.getEngine().timeToDate(game.time.worldTime).year; }
  catch (e) { return yearNow(); }
}
async function dateLabel(time) {
  try { const cal = await import("../../wodx-chronicle/scripts/calendar.mjs"); return cal.describeTime(time).dateLabel; } catch (e) { return ""; }
}

/* ------------------------------------------------------------------ */
/*  The Beast (B6530, B6531)                                           */
/* ------------------------------------------------------------------ */

/** The tokens near the character, as the rules read them. */
function nearOf(token) {
  const scene = token?.parent;
  if ( !scene ) return [];
  const grid = num(scene.grid?.size) || 100, dist = num(scene.grid?.distance) || 1;
  const yardsPer = dist * (/ft|feet/i.test(String(scene.grid?.units ?? "")) ? 1 / 3 : 1);
  const D = CONST.TOKEN_DISPOSITIONS;
  return all(scene.tokens).filter(t => t.actor).map(t => ({
    id: t.id, self: t.id === token.id || t.actorId === token.actorId, hidden: !!t.hidden, dead: isFallen(t.actor) || !!t.actor?.statuses?.has?.("unconscious"),
    hostile: t.disposition === D.HOSTILE && token.disposition !== D.HOSTILE,
    yards: Math.hypot(t.x - token.x, t.y - token.y) / grid * yardsPer
  }));
}

/** The Beast takes the character: the seat plays it, and with no fight on, it goes for its prey. */
export async function beastTakes(actor, {why = "", force = false, userId = null} = {}) {
  if ( !seat(force) || !actor || !inFrenzy(actor) || actor.getFlag(MOD, "beast") ) return null;
  const users = userId ? [game.users.get(userId)].filter(Boolean) : playersOf(actor);
  if ( !users.length ) return null;
  const standIn = actor.getFlag(ST, "standIn") !== true;
  if ( standIn ) await actor.setFlag(ST, "standIn", true);
  await actor.setFlag(MOD, "beast", {since: game.time.worldTime, standIn, held: null});
  const {token, scene} = placeOf(users[0]);
  let started = null, prey = null;
  if ( token && scene && !combatOf(token) && !fightOn(scene.id).length ) {
    const pick = F.preyOf(nearOf(token));
    prey = pick ? scene.tokens.get(pick.id) : null;
    const start = game.wodxCombat?.fight?.start;
    if ( prey && start ) {
      const r = await start({scene, tokens: [token, prey], source: "frenzy", byHand: true, why: `the Beast takes ${actor.name}`,
        sides: {[token.id]: "beast", [prey.id]: "prey"}}).catch(e => { console.warn(`${MOD} | frenzy fight`, e); return null; });
      started = r?.done ?? null;
    }
  }
  const control = F.canFightBeast({kind: kindOf(actor), frenzy: true, willpower: 1, inFight: true}).ok;
  for ( const u of users ) {
    await tell(u.id, `<p><b>The Beast has ${esc(actor.name)}.</b> The game plays them until it passes; one scene usually suffices (V20 pdf 307).${prey ? ` It goes for <b>${esc(prey.name)}</b>.` : ""}`
      + `${control ? " A Willpower point buys one turn of control: Fight the Beast on your panel." : ""}</p>`);
  }
  await H.log({kind: "note", source: MOD, title: `The Beast plays ${actor.name}`, note: `${why || "frenzy"}${prey ? `; goes for ${prey.name}${started ? ` (${started})` : ""}` : "; nobody in reach"}`});
  rerender();
  return {prey: prey?.id ?? null, started};
}

/** The frenzy is over: the seat hands the character back. */
export async function beastLets(actor) {
  const b = actor?.getFlag?.(MOD, "beast");
  if ( !isActiveGM() || !b ) return null;
  if ( b.standIn ) await actor.unsetFlag(ST, "standIn");
  await actor.unsetFlag(MOD, "beast");
  for ( const u of playersOf(actor) ) await tell(u.id, `<p><b>${esc(actor.name)} is back in control.</b> Think on what the Beast did.</p>`);
  await H.log({kind: "note", source: MOD, title: `${actor.name} is back in control`, note: "the frenzy ended"});
  rerender();
  return true;
}

/** A Willpower point for one turn of control (V20 pdf 307): the seat stops playing them this round. */
export async function fightBeast(userId, {actorId = null, force = false} = {}) {
  if ( !seat(force) ) return null;
  const user = game.users.get(userId);
  const actor = actorId ? game.actors.get(actorId) : characterOf(user);
  if ( !actor || (user && !actor.testUserPermission?.(user, "OWNER")) ) return null;
  const b = actor.getFlag(MOD, "beast") ?? {};
  const tok = actor.getActiveTokens?.()[0]?.document ?? placeOf(user).token;
  const combat = combatOf(tok);
  const key = combat ? F.roundKey(combat.id, combat.round) : null;
  const can = F.canFightBeast({kind: kindOf(actor), frenzy: inFrenzy(actor), willpower: wp(actor), inFight: !!combat, held: b.held, key});
  if ( !can.ok ) { await tell(userId, `<p>${esc(actor.name)} cannot fight the Beast now: ${esc(can.why)}.</p>`); return {ok: false, why: can.why}; }
  await actor.update({"system.advantages.willpower.temporary": wp(actor) - 1});
  await actor.setFlag(MOD, "beast", {...b, held: key});
  if ( actor.getFlag(ST, "standIn") === true ) await actor.unsetFlag(ST, "standIn");
  await tell(userId, `<p><b>${esc(actor.name)} holds the Beast back</b> for this turn (1 Willpower). The frenzy goes on; act as you choose until the turn is over.</p>`);
  await H.log({kind: "note", source: MOD, title: `${actor.name} fights the Beast`, note: `1 Willpower for round ${combat.round}`});
  return {ok: true, key};
}

/** The character behind a combatant: the world's actor, where the Beast's flag is kept, also for an unlinked token. */
const worldActor = c => game.actors.get(c?.actorId) ?? c?.actor ?? null;

/** A new round: a held turn is over, and the Beast has the character again. */
async function onRound(combat, changes) {
  if ( !isActiveGM() || !("round" in (changes ?? {})) ) return;
  for ( const c of all(combat.combatants) ) {
    const a = worldActor(c), b = a?.getFlag?.(MOD, "beast");
    if ( !b?.held || b.held === F.roundKey(combat.id, combat.round) ) continue;
    await a.setFlag(MOD, "beast", {...b, held: null});
    if ( inFrenzy(a) && b.standIn ) await a.setFlag(ST, "standIn", true);
  }
}

/** The fight is over: the scene's frenzy ends (V20 pdf 307). A botched one is WoDX Actions' to roll out. */
async function onFightOver(combat) {
  if ( !isActiveGM() ) return;
  for ( const c of all(combat.combatants) ) {
    const a = worldActor(c);
    if ( !a?.getFlag?.(MOD, "beast") || !inFrenzy(a) || a.getFlag(ACT, "frenzyBotch") ) continue;
    const api = A();
    try { await (kindOf(a) === "lupine" ? api?.garouEndFrenzy?.({actor: a}) : api?.endFrenzy?.({actor: a})); }
    catch (e) { console.warn(`${MOD} | end frenzy`, e); }
  }
}

/* ------------------------------------------------------------------ */
/*  Torpor and the years (B6532, B6533)                                */
/* ------------------------------------------------------------------ */

let sleeping = null;
/** Run the world's clock to `to`: Pass the Years for a year or more, else the clock. Returns what passed. */
async function runTo(to, {sleeper = null, torpor = false, label = "", only = null} = {}) {
  const now = game.time.worldTime;
  if ( !(to > now) ) return {seconds: 0, years: 0};
  // a calendar year can be a few hours short of 365.25 days, so "a year or more" is read loosely
  if ( to - now < F.YEAR * 0.98 || !game.modules.get(CRE)?.active ) {
    await game.time.advance(to - now);
    return {seconds: to - now, years: 0};
  }
  const T = await import("../../wodx-creation/scripts/time.mjs");
  // only: the actors the years touch (a gate's own cast); else the whole world, as Pass the Years does
  const plan = T.planSkip(only ? {from: now, to, actors: only.map(id => game.actors.get(id)).filter(Boolean)} : {from: now, to});
  const accept = {};
  const row = sleeper ? plan.rows.find(r => r.actorId === sleeper.id) : null;
  const tc = row?.changes.find(c => c.kind === "torpor");
  if ( tc ) accept[row.actorId] = {[tc.id]: !!torpor};
  const r = await T.applyPlan(plan, {accept, label});
  return {seconds: to - now, years: plan.years, plan, done: r?.done ?? [], journal: r?.journal ?? null};
}

/** What the years did, for the player: their own changes, and the dead among those close to them. */
function yearsWords(res, actor) {
  const mine = (res.done ?? []).find(d => d.row.actorId === actor.id);
  const own = (mine?.taken ?? []).map(c => c.label);
  const close = new Set(F.heirsOf(deadRecord(actor), candidates(actor)).map(h => h.id));
  const lost = (res.done ?? []).filter(d => close.has(d.row.actorId) && d.taken.some(c => c.kind === "death")).map(d => d.row.name);
  return {own, lost, era: res.plan?.toEra?.name ?? ""};
}

/** Sleep the torpor away: the clock runs to the night they may rise, and the rising is rolled. */
export async function sleepTorpor(userId, {actorId = null, force = false, only = null} = {}) {
  if ( !seat(force) ) return null;
  const user = game.users.get(userId);
  const actor = actorId ? game.actors.get(actorId) : characterOf(user);
  const t = torporOf(actor);
  if ( !actor || !t ) { await tell(userId, "<p>Nobody of yours is in torpor.</p>"); return null; }
  return longSleep(userId, actor, {to: Math.max(num(t.until), game.time.worldTime + 1), torpor: true, why: "sleeps the torpor away", only});
}

/** Sleep through the years: a Cainite in voluntary torpor, anyone else living them. */
export async function sleepYears(userId, {years = 1, actorId = null, force = false, only = null} = {}) {
  if ( !seat(force) ) return null;
  const user = game.users.get(userId);
  const actor = actorId ? game.actors.get(actorId) : characterOf(user);
  if ( !actor ) { await tell(userId, "<p>You have no character to sleep.</p>"); return null; }
  const kind = kindOf(actor);
  const plan = F.sleepPlan({kind, road: num(actor.system?.advantages?.path?.permanent) || 7, year: await calendarYear(), years,
    futureBranch: !!chron()?.rule?.("futureBranch")});
  if ( !plan.ok ) { await tell(userId, `<p>No years can pass: ${esc(plan.why)}.</p>`); return null; }
  const T = game.modules.get(CRE)?.active ? await import("../../wodx-creation/scripts/time.mjs") : null;
  let to = T ? T.addYears(game.time.worldTime, plan.years) : game.time.worldTime + plan.years * F.YEAR;
  if ( plan.torpor && !torporOf(actor) ) {
    await A()?.enterTorpor?.(actor, {cause: "a chosen sleep", voluntary: true});
    to = Math.max(to, num(torporOf(actor)?.until));
  }
  return longSleep(userId, actor, {to, torpor: plan.torpor, why: plan.why, only});
}

async function longSleep(userId, actor, {to, torpor, why, only = null}) {
  const {scene} = placeOf(game.users.get(userId));
  if ( sleeping ) { await tell(userId, "<p>The years are already passing.</p>"); return null; }
  if ( scene && fightOn(scene.id).length ) { await tell(userId, "<p>Not while a fight is running.</p>"); return null; }
  sleeping = {userId, actorId: actor.id};
  const from = game.time.worldTime;
  try {
    const fromLabel = await dateLabel(from);
    const res = await runTo(to, {sleeper: actor, torpor, label: `${actor.name} ${why}`, only});
    // A Cainite whose time is up tries to rise now (a blood point and the Road at 8, WoDX Actions)
    const tp = torporOf(game.actors.get(actor.id));
    if ( torpor && tp && game.time.worldTime >= num(tp.until) && !(num(tp.retryAt) > game.time.worldTime) ) await A()?.autoTorporRise?.({actor}).catch(() => null);
    const w = yearsWords(res, actor);
    const toLabel = await dateLabel(game.time.worldTime);
    const still = torporOf(game.actors.get(actor.id));
    await tell(userId, `<p><b>${esc(actor.name)} ${esc(why)}.</b> ${esc(fromLabel)} to <b>${esc(toLabel)}</b>${res.years ? `, ${res.years} years` : ""}${w.era ? `; the age is now ${esc(w.era)}` : ""}.</p>`
      + `${w.own.length ? `<p>On ${esc(actor.name)}: ${esc(w.own.join("; "))}.</p>` : ""}${w.lost.length ? `<p>Gone in those years: ${esc(w.lost.join(", "))}.</p>` : ""}`
      + `<p>${still ? `${esc(actor.name)} sleeps on; the next night brings another try to rise.` : torpor ? `${esc(actor.name)} rises.` : ""}</p>`);
    await H.log({kind: "note", source: MOD, title: `${actor.name} ${why}`, note: `${fromLabel} to ${toLabel}${res.years ? `, ${res.years} years` : ""}`});
    rerender();
    return {...res, lost: w.lost, own: w.own, stillInTorpor: !!still};
  } finally { sleeping = null; }
}

/* ------------------------------------------------------------------ */
/*  Death and heirs (B6534, B6535)                                     */
/* ------------------------------------------------------------------ */

function deadRecord(actor) {
  return {id: actor.id, uuid: actor.uuid, family: actor.flags?.[CRE]?.lineage?.family?.key ?? "",
    ties: (actor.flags?.["wodx-sheets"]?.ties ?? []).map(t => ({uuid: t?.uuid, role: t?.role}))};
}
function candidates(dead, user = null) {
  return all(game.actors).map(a => {
    const lin = a.flags?.[CRE]?.lineage ?? {};
    return {id: a.id, uuid: a.uuid, name: a.name, sire: lin.sire?.id ?? null, domitor: lin.domitor?.id ?? null, heirOf: lin.family?.heirOf?.id ?? null,
      family: lin.family?.key ?? "", dead: isFallen(a), group: /group/i.test(String(a.type ?? "")), mine: !!user && a.testUserPermission?.(user, "OWNER")};
  });
}
export function heirsFor(actor, user = null) { return actor ? F.heirsOf(deadRecord(actor), candidates(actor, user)) : []; }

/** The character died: once, the player is told and offered the heirs. */
async function onFallen(actor) {
  if ( !H.isSeat() || actor.getFlag(MOD, "fallen") ) return null;
  const users = playersOf(actor);
  if ( !users.length ) return null;
  if ( actor.getFlag(MOD, "beast") ) await beastLets(actor);
  await actor.setFlag(MOD, "fallen", {at: game.time.worldTime});
  for ( const u of users ) {
    const heirs = heirsFor(actor, u);
    await tell(u.id, `<p><b>${esc(actor.name)} is dead.</b> The chronicle goes on.${heirs.length ? ` Those left behind: ${esc(heirs.slice(0, 5).map(h => `${h.name} (${h.label})`).join(", "))}.` : ""} Press Carry on on your panel to take one up, or to begin anew.</p>`);
  }
  await H.log({kind: "note", source: MOD, title: `${actor.name} died`, note: `${heirsFor(actor).length} who could carry on`});
  rerender();
  return true;
}

/** The heirs, sent to the player who asked. */
export async function sendHeirs(userId, {force = false} = {}) {
  if ( !seat(force) ) return null;
  const user = game.users.get(userId);
  const dead = characterOf(user);
  const list = dead && isFallen(dead) ? heirsFor(dead, user) : [];
  reply(userId, "fate.heirs", {dead: dead ? {id: dead.id, name: dead.name} : null, heirs: list});
  return list;
}

/** Every owner record the dead held, passed to the heir. Returns how many. */
async function passHoldings(dead, heir) {
  const O = stApi()?.owners;
  if ( !O?.of || !O?.set ) return 0;
  const year = await calendarYear();
  const docs = [];
  for ( const s of all(game.scenes) ) docs.push(s, ...all(s.regions), ...all(s.tiles));
  for ( const a of all(game.actors) ) docs.push(...all(a.items));
  let n = 0;
  for ( const d of docs ) {
    let rec = null;
    try { rec = O.of(d); } catch (e) { rec = null; }
    if ( !rec || rec.kind !== "actor" || rec.id !== dead.uuid ) continue;
    await O.set(d, F.inherit(rec, heir, {year, from: dead.name}));
    n++;
  }
  return n;
}

/** Take up an heir (or begin anew): ownership, the played character, a token by the body, the holdings. */
export async function takeHeir(userId, {actorId = null, fresh = false, force = false} = {}) {
  if ( !seat(force) ) return null;
  const user = game.users.get(userId);
  const dead = characterOf(user);
  if ( !user || !dead || !isFallen(dead) ) { await tell(userId, "<p>Your character still lives.</p>"); return null; }
  const OWNER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER, OBSERVER = CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
  const {scene, token: body} = placeOf(user);
  // The dead stay readable to the player, and no longer theirs to play
  const letGo = async () => { await dead.update({[`ownership.${user.id}`]: OBSERVER}); await user.update({character: null}); };
  if ( fresh ) {
    await letGo();
    await H.log({kind: "note", source: MOD, title: `${user.name} begins anew`, note: `after ${dead.name}`});
    reply(userId, "fate.fresh", {});
    rerender();
    return {fresh: true};
  }
  const heir = game.actors.get(actorId);
  if ( !heir || !heirsFor(dead, user).some(h => h.id === heir.id) ) { await tell(userId, "<p>That one cannot carry on for them.</p>"); return null; }
  await heir.update({[`ownership.${user.id}`]: OWNER});
  await heir.setFlag(MOD, "heirOf", {id: dead.id, name: dead.name, at: game.time.worldTime});
  await letGo();
  await user.update({character: heir.id});
  let tok = all(game.scenes).map(s => all(s.tokens).find(t => t.actorId === heir.id)).find(Boolean) ?? null;
  if ( !tok && scene ) {
    const grid = num(scene.grid?.size) || 100;
    const td = await heir.getTokenDocument({x: num(body?.x) + grid, y: num(body?.y), flags: {[MOD]: {heir: true}}});
    [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  }
  const passed = await passHoldings(dead, heir);
  if ( tok && user.viewedScene !== tok.parent?.id ) game.socket.emit("pullToScene", tok.parent.id, userId);
  reply(userId, "fate.play", {actorId: heir.id, tokenId: tok?.id ?? null});
  await tell(userId, `<p><b>${esc(heir.name)} carries on for ${esc(dead.name)}.</b>${passed ? ` ${passed} holding${passed === 1 ? "" : "s"} of the dead now stand${passed === 1 ? "s" : ""} in ${esc(heir.name)}'s name.` : ""}</p>`);
  await H.log({kind: "note", source: MOD, title: `${heir.name} carries on`, note: `for ${dead.name}; ${passed} owner records passed`});
  rerender();
  return {heir: heir.id, token: tok?.id ?? null, passed};
}

/* ------------------------------------------------------------------ */
/*  Watching                                                           */
/* ------------------------------------------------------------------ */

function watch(actor, changes = null) {
  // The frenzy's end hands the character back wherever the seat took it (our flag), switch on or not
  if ( actor && isActiveGM() && changes && foundry.utils.getProperty(changes, "system.conditions.isfrenzy") === false && actor.getFlag(MOD, "beast") ) {
    beastLets(actor).catch(e => console.warn(`${MOD} | beast`, e));
    return;
  }
  if ( !H.isSeat() || !actor || !playersOf(actor).length ) return;
  const f = changes ? foundry.utils.getProperty(changes, "system.conditions.isfrenzy") : undefined;
  if ( isFallen(actor) ) { onFallen(actor).catch(e => console.warn(`${MOD} | fallen`, e)); return; }
  if ( f === true || (inFrenzy(actor) && !actor.getFlag(MOD, "beast") && changes === null) ) beastTakes(actor).catch(e => console.warn(`${MOD} | beast`, e));
}

/* ------------------------------------------------------------------ */
/*  The player's side                                                  */
/* ------------------------------------------------------------------ */

function rerender() {
  game.socket.emit(SOCKET, {type: "fate.redraw", payload: {userId: "*"}});
  redraw();
}
function redraw() { if ( foundry.applications.instances?.get?.("wodx-solo-panel")?.rendered ) SoloPanel.open(); }

/** The block at the top of the panel when the night has taken the character: frenzy, torpor or death. */
function fateHtml() {
  const a = characterOf(game.user);
  if ( !a || !H.isOn() ) return "";
  if ( isFallen(a) ) return `<div class="wsolo-fate"><p><b>${esc(a.name)} is dead.</b></p><button type="button" data-action="act" data-id="heir"><i class="fa-solid fa-people-arrows"></i> Carry on</button></div>`;
  const t = torporOf(a);
  if ( t ) return `<div class="wsolo-fate"><p><b>${esc(a.name)} sleeps in torpor.</b></p><button type="button" data-action="act" data-id="torpor"><i class="fa-solid fa-bed"></i> Sleep the torpor away</button></div>`;
  if ( inFrenzy(a) ) {
    const fight = ["kindred", "ghoul"].includes(kindOf(a)) ? `<button type="button" data-action="act" data-id="beast"><i class="fa-solid fa-hand-fist"></i> Fight the Beast (1 Willpower)</button>` : "";
    return `<div class="wsolo-fate wsolo-beast"><p><b>The Beast has ${esc(a.name)}.</b> The game plays them until it passes.</p>${fight}</div>`;
  }
  return "";
}

async function showHeirs({dead, heirs = []} = {}) {
  if ( !dead ) return;
  const rows = heirs.map((h, i) => `<label class="wsolo-choice"><input type="radio" name="pick" value="${esc(h.id)}"${i === 0 ? " checked" : ""}> ${esc(h.name)}<span class="wodx-quiet"> ${esc(h.label)}</span></label>`).join("");
  const got = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: `After ${dead.name}`}, rejectClose: false,
    content: `<p>${esc(dead.name)} is dead. Take up one of those left behind, or begin anew with a new character.</p>`
      + `<fieldset class="wsolo-choices" data-fixed>${rows}<label class="wsolo-choice"><input type="radio" name="pick" value="__fresh"${heirs.length ? "" : " checked"}> Begin anew<span class="wodx-quiet"> a new character arrives</span></label></fieldset>`,
    ok: {label: "Carry on", callback: (ev, b) => b.form.querySelector("input[name=pick]:checked")?.value ?? null}});
  if ( !got ) return;
  ask("ask.fate.heir", got === "__fresh" ? {fresh: true} : {actorId: got});
}

async function chooseYears() {
  const opts = F.SLEEPS.map((y, i) => `<label class="wsolo-choice"><input type="radio" name="pick" value="${y}"${i === 0 ? " checked" : ""}> ${y} year${y === 1 ? "" : "s"}</label>`).join("");
  const got = await DialogV2.prompt({classes: ["wodx", "wodx-dialog", "wsolo-dialog"], window: {title: "Sleep through the years"}, rejectClose: false,
    content: `<p>A Cainite sleeps in torpor, no shorter than the Road allows; anyone else lives the years. The whole world moves with them: people age and die, heirs take their places, and the age may turn.</p><fieldset class="wsolo-choices" data-fixed>${opts}</fieldset>`,
    ok: {label: "Sleep", callback: (ev, b) => b.form.querySelector("input[name=pick]:checked")?.value ?? null}});
  if ( got ) { ask("ask.fate.years", {years: Number(got)}); ui.notifications.info(`${got} years pass.`); }
}

/* ------------------------------------------------------------------ */
/*  Start                                                              */
/* ------------------------------------------------------------------ */

export function installFate(helpers) {
  H = helpers;
  addAsks({
    "ask.fate.beast": p => fightBeast(p.userId),
    "ask.fate.torpor": p => sleepTorpor(p.userId),
    "ask.fate.years": p => sleepYears(p.userId, {years: p.years}),
    "ask.fate.heirs": p => sendHeirs(p.userId),
    "ask.fate.heir": p => takeHeir(p.userId, {actorId: p.actorId ?? null, fresh: !!p.fresh})
  }, {
    "fate.heirs": showHeirs,
    "fate.play": p => { game.modules.get("wodx-chronicle")?.api?.roster?.play?.(p.actorId); redraw(); },
    "fate.fresh": () => { redraw(); game.modules.get(MOD)?.api?.arrival?.pick?.(); }
  });
  addActions({
    beast() { return ask("ask.fate.beast"); },
    torpor() { return ask("ask.fate.torpor"); },
    years() { return chooseYears(); },
    heir() { return ask("ask.fate.heirs"); }
  });
  setFateUi({html: fateHtml});
  game.socket.on(SOCKET, m => { if ( m?.type === "fate.redraw" ) redraw(); });
  Hooks.on("updateActor", (a, ch) => { watch(a, ch); if ( !game.user.isGM && a.id === characterOf(game.user)?.id ) redraw(); });
  for ( const h of ["createActiveEffect", "deleteActiveEffect"] ) Hooks.on(h, e => { const a = e?.parent; if ( a?.documentName === "Actor" ) { watch(a, null); if ( !game.user.isGM && a.id === characterOf(game.user)?.id ) redraw(); } });
  Hooks.on("updateCombat", (c, ch) => { onRound(c, ch).catch(e => console.warn(`${MOD} | beast round`, e)); });
  Hooks.on("deleteCombat", c => { onFightOver(c).catch(e => console.warn(`${MOD} | fight over`, e)); });
  Hooks.on("updateCombat", (c, ch) => { if ( ch?.active === false || ch?.started === false ) onFightOver(c).catch(() => {}); });
}

export const fateApi = {rules: F, beastTakes, beastLets, fightBeast, sleepTorpor, sleepYears, heirsFor, sendHeirs, takeHeir, busy: () => sleeping};
