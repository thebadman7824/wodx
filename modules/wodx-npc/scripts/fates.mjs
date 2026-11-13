/**
 * Off-screen lives of supernatural NPCs, the Foundry side (B3260-B3266). The rules are in fates-rules.mjs.
 *
 *   When the clock jumps a year or more (a time skip, Pass the Years), every supernatural NPC lives through the gap.
 *   One approval card lists what happened to each of them; nothing is written until the Storyteller approves it.
 *   Approving it sets torpor (the Torpor condition and chronology.torpor), wakes sleepers whose years are up, files the
 *   dead in "WoDX · The Dead" (chronology.died), lowers a diablerist's Generation, raises Rank or Arete, and keeps the
 *   new childer, cubs, apprentices and fosterlings as records the Storyteller can bring into play.
 *
 *   World setting wodx-npc.npcFates (off by default, B3264); world setting wodx-npc.brood {records: {id: record}}.
 *   Actor flag wodx-npc.fates.keep = true keeps an NPC out of it (the Storyteller's own plans for them stand).
 *   Player characters are never touched: Pass the Years handles them.
 */
import * as F from "./fates-rules.mjs";
import {officesOf, polityFor, POLITIES} from "./politics-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const DEAD_FOLDER = "WoDX · The Dead";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const creation = () => (game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api : null);
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const YEAR_SECONDS = 365.25 * 86400;
export const T = {fates: `${MOD}.npc-fates`};

const yearAt = t => getEngine().timeToDate(Number(t) || 0).year;
const num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function registerSettings() {
  game.settings.register(MOD, "npcFates", {scope: "world", config: true, type: Boolean, default: false,
    name: "Off-screen lives of supernatural NPCs",
    hint: "When the clock jumps a year or more, supernatural NPCs live through the gap: Embraces, torpor and waking, diablerie, Rank and Arete, deaths. One card for the Storyteller to approve; player characters are left to Pass the Years."});
  game.settings.register(MOD, "brood", {scope: "world", config: false, type: Object, default: {records: {}}});
}

const broodStore = () => { try { return foundry.utils.deepClone(game.settings.get(MOD, "brood") ?? {records: {}}); } catch (e) { return {records: {}}; } };
async function saveBrood(s) { if ( game.user.isGM ) await game.settings.set(MOD, "brood", s); }
/** The childer, cubs, apprentices and fosterlings the years made, newest first. */
export const brood = () => Object.values(broodStore().records ?? {}).sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

/** The seats an NPC holds in any faction, by title. */
function officeOf(actor, year) {
  try {
    const st = game.modules.get(MOD).api?.factions?.state?.();
    for ( const f of st?.factions ?? [] ) {
      const keys = officesOf(f, actor.id);
      if ( !keys.length ) continue;
      const pk = polityFor(f, year);
      const titles = keys.map(k => POLITIES[pk]?.offices?.find(o => o.key === k)?.title ?? k);
      return `${titles.join(", ")} of ${f.name}`;
    }
  } catch (e) { /* factions off */ }
  return null;
}

const isDead = a => a?.statuses?.has?.("dead") || num(a?.flags?.["wodx-creation"]?.chronology?.died) !== null;

/** A sheet as the rules see it. */
export function personOf(actor, year) {
  const line = F.LINE_OF_TYPE[actor?.type];
  if ( !line ) return null;
  const s = actor.system ?? {}, c = actor.flags?.["wodx-creation"]?.chronology ?? {};
  const madeT = num(c.embraced) ?? num(c.awakened);
  const gen = num(s.generation);
  const tp = c.torpor && num(c.torpor.to) !== null ? {from: yearAt(c.torpor.from), to: yearAt(c.torpor.to)} : null;
  return F.normPerson({id: actor.id, name: actor.name, line, born: num(c.bornYear), made: madeT !== null ? yearAt(madeT) : null,
    generation: gen === null ? null : gen - (Number(s.generationmod) || 0),
    road: num(s.advantages?.path?.permanent) ?? num(s.advantages?.humanity?.permanent) ?? 7,
    sectText: s.sect ?? "", rise: line === "garou" ? num(s.renown?.rank) : line === "mage" ? num(s.advantages?.arete?.permanent) : 0,
    torpor: tp, keep: !!actor.flags?.[MOD]?.fates?.keep, office: officeOf(actor, year), clan: s.clan ?? ""});
}

/** The NPCs who live off-screen: supernatural, no player owner, not dead, not a kept copy. */
export function cast() {
  return (game.actors?.contents ?? []).filter(a => F.LINE_OF_TYPE[a.type] && !a.hasPlayerOwner && !isDead(a) && !a.getFlag?.("wodx-creation", "snapshotOf"));
}

/** The jump worked out but not written. */
export function planFor(from, to) {
  const fromYear = yearAt(from), toYear = yearAt(to);
  const people = cast().map(a => personOf(a, fromYear)).filter(Boolean);
  const records = Object.values(broodStore().records ?? {}).filter(r => !r.dead && !r.actorId);
  const before = [...people, ...records.map(r => F.normPerson({...r, brood: true}))];
  const res = F.live(before, fromYear, toYear, {seed: `${game.world?.id ?? "w"}:${from}`});
  return {fromYear, toYear, from, to, result: res, changes: F.sheetChanges(res, people), lines: F.summary(res)};
}

/** On a skip's end: one card if anything happened and the setting is on. */
export async function onSkipEnd(info = {}) {
  if ( !isActiveGM() ) return;
  try { if ( !game.settings.get(MOD, "npcFates") ) return; } catch (e) { return; }
  if ( !((Number(info.to) - Number(info.from)) / YEAR_SECONDS >= 1) ) return wakeDue(info.to);
  const plan = planFor(info.from, info.to);
  if ( !plan.result.events.length ) return;
  await chron()?.propose?.({type: T.fates, key: `npc-fates:${info.from}:${info.to}`, title: `Off-screen lives, ${plan.fromYear} to ${plan.toYear}`,
    detail: plan.lines.join("\n").slice(0, 1900), data: {from: info.from, to: info.to, fromYear: plan.fromYear, toYear: plan.toYear,
      changes: plan.changes, brood: plan.result.brood, people: Object.values(plan.result.people).filter(p => p.brood)}});
}

/** A short skip: sleepers whose years are up wake. */
export async function wakeDue(now = game.time.worldTime) {
  const y = yearAt(now);
  for ( const a of cast() ) {
    const tp = a.flags?.["wodx-creation"]?.chronology?.torpor;
    if ( tp && num(tp.to) !== null && num(tp.to) <= now && !a.flags?.[MOD]?.fates?.keep ) await wake(a);
  }
  return y;
}

const timeOf = (year, d) => Math.max(d.from, Math.min(d.to, d.from + (year - d.fromYear) * YEAR_SECONDS));
async function deadFolder() {
  return game.folders.find(f => f.type === "Actor" && f.name === DEAD_FOLDER)
    ?? Folder.create({name: DEAD_FOLDER, type: "Actor", flags: {"wodx-creation": {kind: "dead"}}});
}
async function setChron(actor, changes) {
  const c = foundry.utils.deepClone(actor.getFlag("wodx-creation", "chronology") ?? {});
  return actor.setFlag("wodx-creation", "chronology", {...c, ...changes});
}
async function wake(actor) {
  try { await chron()?.conditions?.setCondition?.(actor, "torpor", false); } catch (e) { /* no condition */ }
  return setChron(actor, {torpor: null});
}

/** Write an approved jump. */
export async function apply(d) {
  let n = 0;
  for ( const [id, ch] of Object.entries(d.changes ?? {}) ) {
    const a = game.actors.get(id);
    if ( !a ) continue;
    n++;
    if ( ch.generation !== undefined ) await a.update({"system.generation": ch.generation + (Number(a.system?.generationmod) || 0)});
    if ( ch.rise !== undefined ) {
      if ( a.type === "Mage" ) await a.update({"system.advantages.arete.permanent": ch.rise});
      else if ( F.LINE_OF_TYPE[a.type] === "garou" ) await a.update({"system.renown.rank": ch.rise});
    }
    if ( ch.wake ) await wake(a);
    if ( ch.torpor ) {
      await setChron(a, {torpor: {from: timeOf(ch.torpor.from, d), to: d.from + (ch.torpor.to - d.fromYear) * YEAR_SECONDS}});
      try { await chron()?.conditions?.setCondition?.(a, "torpor", true); } catch (e) { /* no condition */ }
    }
    if ( ch.dead ) {
      await setChron(a, {died: timeOf(Number(ch.dead) || d.toYear, d), cause: "off-screen"});
      const f = await deadFolder();
      await a.update({folder: f.id});
    }
  }
  // Brood: new records, and the end state of the old ones
  const s = broodStore();
  s.records ??= {};
  for ( const b of d.brood ?? [] ) s.records[b.id] = {...b, name: nameFor(b)};
  for ( const p of d.people ?? [] ) if ( s.records[p.id] ) Object.assign(s.records[p.id], {dead: p.dead, torpor: p.torpor, generation: p.generation, rise: p.rise});
  await saveBrood(s);
  return `${n} NPC${n === 1 ? "" : "s"} changed; ${(d.brood ?? []).length} new childer, cubs, apprentices or fosterlings kept as records`;
}

/** A given name from the people generator, else the record's own "X's childe". */
function nameFor(b) {
  if ( b.name && !/'s (childe|cub|apprentice|fosterling)$/.test(b.name) ) return b.name;
  try { const p = creation()?.people?.generate?.({batch: `brood:${b.id}`, row: 0}); if ( p?.name ) return p.name; } catch (e) { /* none */ }
  return b.name;
}

const SHEET = {vampire: "Vampire", garou: "Werewolf", mage: "Mage", changeling: "Changeling"};
/** Make a sheet for a brood record and tie it to the one who made it. */
export async function bring(id) {
  if ( !game.user.isGM ) return null;
  const s = broodStore(), b = s.records?.[id];
  if ( !b || b.actorId ) return b?.actorId ? game.actors.get(b.actorId) : null;
  const now = game.time.worldTime, madeAt = Math.max(0, now - (yearAt(now) - b.year) * YEAR_SECONDS);
  const data = {name: b.name, type: SHEET[b.line] ?? "Mortal",
    flags: {"wodx-creation": {chronology: {bornYear: b.born, ...(b.line === "vampire" ? {embraced: madeAt} : {})},
      lineage: b.line === "vampire" ? {sire: {id: b.sireId, name: b.sireName}} : {}}, [MOD]: {fates: {brood: b.id}}}};
  if ( b.line === "vampire" && b.generation ) data.system = {generation: b.generation, ...(b.sect ? {sect: b.sect} : {})};
  const a = await Actor.create(data);
  if ( a ) { b.actorId = a.id; await saveBrood(s); }
  return a;
}

export function registerHandlers() {
  chron()?.registerApprovalHandler?.(T.fates, {label: "Off-screen lives of supernatural NPCs",
    approve: async entry => apply(entry.data ?? {}),
    reject: async () => "Left as they were"});
}
export function listen() {
  Hooks.on("wodxSkipEnd", info => { onSkipEnd(info).catch(e => console.error(`${MOD} | off-screen lives`, e)); });
}

export const rules = F;
