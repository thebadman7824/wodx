/**
 * WoDX NPC 0.55.0: family lines and ties after a jump in time, the Foundry side (B2770-B2772). The rules are in
 * kin-rules.mjs.
 *
 *   Family lines live in the world setting wodx-npc.familyLines {lines: {id: line}}. A line hangs from one character
 *   (its founder); the family and lineage tree shows it, and the Storyteller can bring any living member into play.
 *   When the clock jumps a year or more (a time skip, Pass the years), one approval card reports what the gap did to
 *   every player character's ties and grows every family line; nothing is written until it is approved.
 */
import * as K from "./kin-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";

const MOD = "wodx-npc";
const chron = () => game.modules.get("wodx-chronicle")?.api;
const creation = () => (game.modules.get("wodx-creation")?.active ? game.modules.get("wodx-creation").api : null);
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
export const T = {aged: `${MOD}.ties-aged`};

const yearAt = t => getEngine().timeToDate(Number(t) || 0).year;
const yearNow = () => yearAt(game.time.worldTime);
const YEAR_SECONDS = 365.25 * 86400;
const homeland = () => { try { return chron()?.world?.homeland?.() ?? "moravia"; } catch (e) { return "moravia"; } };
const sphereOf = (region, year) => { try { return chron()?.world?.rules?.sphereFor?.(region, year) ?? "latin"; } catch (e) { return "latin"; } };
const chronology = a => a?.flags?.["wodx-creation"]?.chronology ?? {};
const bornOf = a => { const b = chronology(a).bornYear; return Number.isFinite(Number(b)) && b !== null && b !== undefined ? Number(b) : null; };
const diedYear = a => { const d = chronology(a).died; return d === undefined || d === null ? null : yearAt(Number(d)); };
const undying = a => a?.type === "Vampire" || a?.type === "Mummy" || !!a?.flags?.["wodx-creation"]?.lineage?.domitor || a?.type === "Wraith";

export function registerSettings() {
  game.settings.register(MOD, "familyLines", {scope: "world", config: false, type: Object, default: {lines: {}}});
  game.settings.register(MOD, "tiesAgeing", {scope: "world", config: true, type: Boolean, default: true,
    name: "Ties after a jump in time", hint: "When the clock jumps a year or more, report what the gap did to the player characters' ties and grow their family lines, as one card for the Storyteller to approve."});
}

const store = () => { try { return foundry.utils.deepClone(game.settings.get(MOD, "familyLines") ?? {lines: {}}); } catch (e) { return {lines: {}}; } };
async function save(s) { if ( game.user.isGM ) await game.settings.set(MOD, "familyLines", s); }
export const lines = () => Object.values(store().lines ?? {});
export const lineOf = actorLike => { const id = actorLike?.id ?? actorLike; return lines().find(l => l.founder?.id === id) ?? null; };

/** A given name for a new member, from the people generator of the region and year (or none: the Storyteller names them). */
function namer(line) {
  const gen = creation()?.people?.generate;
  if ( !gen ) return null;
  let n = 0;
  return ({sex}) => { try { const p = gen({batch: `kin:${line.id}`, row: n++, sex}); return p?.given ?? String(p?.name ?? "").split(" ")[0] ?? ""; } catch (e) { return ""; } };
}

/**
 * Start a family line for a character from the mortal kin the Relationships tab knows (parent, child, sibling, spouse,
 * kin), plus unnamed brothers and sisters when fewer are known. Returns the line (an existing one is returned as it is).
 */
export async function startLine(actorLike, {family = null, region = null, year = null} = {}) {
  const a = actorLike?.id ? game.actors.get(actorLike.id) ?? actorLike : game.actors.get(actorLike);
  if ( !game.user.isGM || !a ) return null;
  const have = lineOf(a);
  if ( have ) return have;
  const ties = game.modules.get(MOD).api?.ties?.of?.(a) ?? [];
  const REL = {parent: "parent", child: "child", sibling: "sibling", spouse: "spouse", kin: "kin"};
  const members = ties.filter(t => REL[t.kind]).map(t => { const o = t.to?.id ? game.actors.get(t.to.id) : null;
    return {name: t.to?.name ?? "", relation: REL[t.kind], born: o ? bornOf(o) : null, died: o ? diedYear(o) : null, actorId: o?.id ?? null}; });
  const y = Number(year) || yearNow();
  const fam = family ?? (String(a.name).trim().split(/\s+/).length > 1 ? String(a.name).trim().split(/\s+/).at(-1) : "");
  const line = K.newLine({id: foundry.utils.randomID(), founder: {id: a.id, name: a.name}, family: fam, region: region ?? homeland(), year: y, founderBorn: bornOf(a), members});
  const s = store(); s.lines[line.id] = line; await save(s);
  return line;
}

/** Grow one line (or every line) to a year. write false: only work it out. Returns [{line, events, summary}]. */
export async function growLines(toYear, {only = null, write = true} = {}) {
  const s = store(), out = [];
  for ( const l of Object.values(s.lines ?? {}) ) {
    if ( only && l.id !== only ) continue;
    if ( Number(toYear) <= l.year ) continue;
    const r = K.grow(l, Number(toYear), {sphere: sphereOf(l.region, toYear), nameFor: namer(l), dying: y => K.dyingFor(y, {region: l.region, sphere: sphereOf(l.region, y)})});
    s.lines[l.id] = r.line;
    out.push({line: r.line, events: r.events, summary: K.lineSummary(r.line, r.events, Number(toYear))});
  }
  if ( write && out.length ) await save(s);
  return out;
}

/** The living members of a character's line, nearest first, with what each knows of them. */
export function descendants(actorLike, year = yearNow()) {
  const a = actorLike?.id ? actorLike : game.actors.get(actorLike);
  const l = lineOf(a);
  if ( !l ) return [];
  return K.livingAt(l, year).map(m => ({...m, age: year - m.born, relation: K.relationWord(m), story: K.storyOf(m, l, {year, undying: undying(a)})}));
}

/** Bring a living member into play: a Mortal sheet tied to the founder as kin, with what they know of them in the notes. */
export async function bring(lineId, memberId) {
  if ( !game.user.isGM ) return null;
  const s = store(), l = s.lines?.[lineId];
  const m = l?.members?.find(x => x.id === memberId);
  if ( !m ) return null;
  if ( m.actorId && game.actors.get(m.actorId) ) return game.actors.get(m.actorId);
  const year = yearNow(), founder = game.actors.get(l.founder.id);
  const name = m.name || `${l.family ? `${l.family} ` : ""}${K.relationWord(m)} of ${l.founder.name}`;
  const story = K.storyOf(m, l, {year, undying: undying(founder)});
  const [actor] = await Actor.createDocuments([{name, type: "Mortal",
    flags: {[MOD]: {kin: {line: l.id, member: m.id, founder: {id: l.founder.id, name: l.founder.name}, relation: K.relationWord(m), story}},
      "wodx-creation": {chronology: {bornYear: m.born}}}}]);
  m.actorId = actor.id; if ( !m.name ) m.name = name;
  await save(s);
  return actor;
}

/** The tree's family line section: living members, nearest first, and a Bring into play button for the Storyteller. */
const willButton = actor => (actor && game.modules.get("wodx-storyteller")?.api?.wills && (game.user.isGM || actor.isOwner)
  ? ` <button type="button" data-kin-will="${esc(actor.id)}"><i class="fa-solid fa-scroll"></i> Will</button>` : "");
export function treeSection(actor) {
  const l = lineOf(actor);
  if ( !l ) return game.user.isGM && actor ? `<section class="wnpc-tree-line"><h3>Family line</h3><p class="wodx-quiet">No family line kept yet.</p><button type="button" data-kin-start="${esc(actor.id)}"><i class="fa-solid fa-people-roof"></i> Keep a family line</button>${willButton(actor)}</section>` : (willButton(actor) ? `<section class="wnpc-tree-line"><h3>Family line</h3>${willButton(actor)}</section>` : "");
  const year = yearNow();
  const living = descendants(actor, year);
  const rows = living.map(m => `<li>${m.actorId && game.actors.get(m.actorId) ? `<a data-open="${esc(m.actorId)}">${esc(m.name)}</a>` : esc(m.name || "(unnamed)")} <span class="wodx-quiet">${esc(m.relation)}, ${m.age}</span>${game.user.isGM ? `<br><span class="wodx-quiet">${esc(m.story)}</span>${m.actorId ? "" : ` <button type="button" data-kin-bring="${esc(l.id)}:${esc(m.id)}">Bring into play</button>`}` : ""}</li>`).join("");
  return `<section class="wnpc-tree-line"><h3>Family line${l.family ? `: ${esc(l.family)}` : ""}</h3><p class="wodx-quiet">Kept since ${l.foundedYear}, grown to ${l.year}. ${living.length} living.${willButton(actor)}</p>${rows ? `<ul data-fixed>${rows}</ul>` : ""}</section>`;
}
/** Wire the buttons of treeSection inside a dialog element; refresh() redraws the tree. */
export function wireTree(el, refresh) {
  el?.addEventListener("click", async ev => {
    const st = ev.target.closest("[data-kin-start]"), br = ev.target.closest("[data-kin-bring]"), wl = ev.target.closest("[data-kin-will]");
    if ( wl ) { ev.preventDefault(); game.modules.get("wodx-storyteller")?.api?.wills?.open?.(wl.dataset.kinWill); }
    if ( st ) { ev.preventDefault(); await startLine(st.dataset.kinStart); refresh?.(); }
    if ( br ) { ev.preventDefault(); const [l, m] = br.dataset.kinBring.split(":"); const a = await bring(l, m); a?.sheet?.render(true); refresh?.(); }
  });
}

/* ------------------------------------------------------------------ */
/*  Ties after a jump in time                                          */
/* ------------------------------------------------------------------ */

function peopleNow() {
  return game.actors.filter(a => !a.flags?.[MOD]?.passerbyBase).map(a => ({id: a.id, name: a.name, type: a.type, pc: !!a.hasPlayerOwner, born: bornOf(a), died: diedYear(a), undying: undying(a)}));
}
function ledgerDue(from, to) {
  try {
    const entries = game.settings.get("wodx-storyteller", "ledger")?.entries ?? [];
    return entries.filter(e => (e.status ?? "open") === "open" && Number.isFinite(Number(e.due)) && Number(e.due) > from && Number(e.due) <= to);
  } catch (e) { return []; }
}

/** The report for a jump, worked out but not written: {fromYear, toYear, years, rows, grown}. */
export async function reportFor(from, to) {
  const fromYear = yearAt(from), toYear = yearAt(to);
  const grown = await growLines(toYear, {write: false});
  const edges = game.modules.get(MOD).api?.ties?.edges?.() ?? [];
  const r = K.agedTies({fromYear, toYear, people: peopleNow(), edges, due: ledgerDue(from, to), grown});
  return {fromYear, toYear, years: r.years, rows: r.rows, grown: grown.map(g => ({id: g.line.id, summary: g.summary}))};
}

/** On a skip's end: one card, if anything changed and the setting is on. */
export async function onSkipEnd(info = {}) {
  if ( !isActiveGM() ) return;
  try { if ( !game.settings.get(MOD, "tiesAgeing") ) return; } catch (e) { return; }
  const fromYear = yearAt(info.from), toYear = yearAt(info.to);
  // NPC 0.65.1: a whole year of time must pass; a short skip over New Year is not a jump
  if ( !((Number(info.to) - Number(info.from)) / YEAR_SECONDS >= 1) ) return;
  const rep = await reportFor(info.from, info.to);
  if ( !rep.rows.length && !rep.grown.length ) return;
  const detail = rep.rows.map(r => `${r.name}: ${r.lines.join(" ")}`).join("\n").slice(0, 1900);
  await chron()?.propose?.({type: T.aged, key: `ties-aged:${info.from}:${info.to}`, title: `Ties after ${rep.years} years (${fromYear} to ${toYear})`,
    detail: detail || rep.grown.map(g => g.summary).join("\n"), data: {toYear, from: info.from, to: info.to}});
}

export function registerHandlers() {
  chron()?.registerApprovalHandler?.(T.aged, {label: "Ties after a jump in time",
    approve: async entry => { const out = await growLines(entry.data.toYear); return out.length ? `${out.length} family line${out.length === 1 ? "" : "s"} grown to ${entry.data.toYear}` : "Noted"; },
    reject: async () => "Left as it was"});
}
export function listen() {
  Hooks.on("wodxSkipEnd", info => { onSkipEnd(info).catch(e => console.error(`${MOD} | ties after a jump`, e)); });
}

export const rules = K;
