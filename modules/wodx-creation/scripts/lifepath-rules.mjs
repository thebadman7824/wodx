/**
 * WoDX Creation 0.11.0: lifepaths, the pure rules (Improvement Desk cr1, approved by Ben 2026-11-12). No Foundry here,
 * so the harness can test them.
 *
 * A lifepath is a short chain of scenes before points are spent: where and when the character was born, a youth, an
 * adult life, the turn into the line (the Embrace, the First Change, the Awakening, a death...), what the clan, tribe,
 * Tradition or kith made of them, and the first years after. Each scene offers a few choices; each choice suggests
 * Backgrounds, Abilities, Merits or Flaws and may name a person from the past. Nothing is spent: the player keeps or
 * drops every suggestion at the end.
 *
 * The chain works the way Princes of Darkness (a Crusader Kings III mod) runs a childe's education: an opening choice
 * sets a flag, and the next scene is drawn from a weighted pool where that flag makes some scenes likelier, rules
 * others out, or names the very next scene. Only the event-chain idea is borrowed; none of that mod's V5 material
 * (blood potency, resonance, predator types) is used.
 *
 * Scenes are tied to years, so the same line plays differently in 1197, 1348, 1916 or 2050.
 */
import {BANDS, LINES, MORTAL_EVENTS} from "../data/lifepaths.mjs";
import {TURNING_EVENTS} from "../data/lifepaths-turnings.mjs";
import {SPLATS} from "../data/lifepaths-splats.mjs";

export {BANDS, LINES, SPLATS};
export const VERSION = 1;
/** Years from birth to each early scene. */
export const AGE_AT = {birth: 0, youth: 12, adult: 20, later: 32};
/** At most this many people are ticked to become NPCs by default; the player may tick more. */
export const PEOPLE_DEFAULT = 3;
/** People further back than this from the chronicle's year are named only: most are long dead. */
export const PEOPLE_ALIVE_SPAN = 70;

const num = v => { const x = Number(v); return Number.isFinite(x) ? Math.trunc(x) : null; };

/** The era band for a year. Years before 1197 use the first band, years past the last band the last one. */
export function bandOf(year) {
  const y = num(year);
  if ( y === null ) return BANDS[0];
  return BANDS.find(b => y >= b.from && y <= b.to) ?? (y < BANDS[0].from ? BANDS[0] : BANDS.at(-1));
}

/** The line for a sheet: the actor type and the Mortal sheet's variant. Kuei-jin use the Exalted sheet. */
export function lineFor(type, variant = "") {
  const t = String(type ?? "").toLowerCase().replace(/\s+/g, ""), v = String(variant ?? "").toLowerCase();
  if ( t === "mortal" ) return LINES[v] ? v : "mortal";
  if ( t === "changingbreed" ) return "werewolf";
  if ( t === "exalted" ) return "kueijin";
  return LINES[t] ? t : "mortal";
}

/** Is the line open in this year? Returns {ok, from, note}. */
export function lineOpen(line, year) {
  const L = LINES[line];
  const y = num(year);
  if ( !L || y === null ) return {ok: !!L, from: L?.from ?? null, note: ""};
  if ( L.from && y < L.from ) return {ok: false, from: L.from, note: L.early ?? `Not before ${L.from}.`};
  return {ok: true, from: L.from ?? null, note: ""};
}

/** A splat is offered when the turning year falls in one of its spans (no spans: every era). */
export function inSpans(spans, year) {
  if ( !spans?.length ) return true;
  const y = num(year);
  if ( y === null ) return true;
  return spans.some(([a, b]) => y >= (a ?? -Infinity) && y <= (b ?? Infinity));
}

/** The splats of a line open in a year, in list order. */
export function splatsFor(line, year) {
  return (SPLATS[line] ?? []).filter(s => inSpans(s.spans, year));
}
export const splatByKey = (line, key) => (SPLATS[line] ?? []).find(s => s.key === key) ?? null;

/** Find the splat a sheet names: text is the sheet's clan, tribe, Tradition, kith (and so on) fields run together. */
export function guessSplat(line, text) {
  const s = ` ${String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  let best = null, len = 0;
  for ( const sp of SPLATS[line] ?? [] ) {
    for ( const m of [sp.label, ...(sp.match ?? [])] ) {
      const w = ` ${String(m).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()} `;
      if ( w.trim() && s.includes(w) && w.length > len ) { best = sp.key; len = w.length; }
    }
  }
  return best;
}

/* ------------------------------------------------------------------ */
/*  The chain                                                          */
/* ------------------------------------------------------------------ */

/** The stages a line runs through. Mortals have no turning; the rest add it and the first years after. */
export function stagesFor(line) {
  return LINES[line]?.stages ?? LINES.mortal.stages;
}

/** A fresh lifepath. */
export function newPath({line = "mortal", splat = null, birthYear, turnYear = null, seed = "wodx"} = {}) {
  const L = LINES[line] ? line : "mortal";
  const b = num(birthYear) ?? 1200;
  let t = L === "mortal" ? null : (num(turnYear) ?? b + 25);
  if ( t !== null && t < b ) t = b;
  return {v: VERSION, line: L, splat: splat || null, birthYear: b, turnYear: t, seed: String(seed), steps: [], rerolls: {}};
}

/** The year a stage is set in. Early scenes follow the birth year, but never pass the turning. */
export function yearOf(path, stage) {
  if ( stage in AGE_AT ) {
    const y = path.birthYear + AGE_AT[stage];
    return path.turnYear !== null ? Math.min(y, path.turnYear) : y;
  }
  if ( stage === "after2" ) return (path.turnYear ?? path.birthYear) + 3;
  return path.turnYear ?? path.birthYear + AGE_AT.adult;
}

/** The flags set so far: each choice's flag, the station (st:...), the line and the splat. */
export function flagsOf(path, pool = allEvents()) {
  const flags = new Set([`line:${path.line}`]);
  if ( path.splat ) flags.add(`splat:${path.splat}`);
  for ( const s of path.steps ) {
    const o = eventById(s.event, pool, path)?.options?.[s.option];
    for ( const f of [].concat(o?.f ?? []) ) flags.add(f);
  }
  return flags;
}

/** Every scene: the mortal ones and the turnings. Splat scenes are made from SPLATS on the fly. */
export function allEvents() {
  return [...MORTAL_EVENTS, ...TURNING_EVENTS];
}

/** A splat's scene, shaped like any other. */
export function splatEvent(line, key) {
  const sp = splatByKey(line, key);
  if ( !sp?.beat ) return null;
  return {id: `splat:${line}:${key}`, stage: "splat", title: sp.beat.title, text: sp.beat.text, options: sp.beat.options, splat: key, house: !!sp.house};
}

export function eventById(id, pool = allEvents(), path = null) {
  if ( String(id).startsWith("splat:") ) {
    const [, line, key] = String(id).split(":");
    return splatEvent(line, key);
  }
  return pool.find(e => e.id === id) ?? null;
}

/** Does a scene fit the path at this stage? */
export function fits(e, path, stage, flags, year) {
  if ( e.stage !== stage ) return false;
  const w = e.when ?? {};
  if ( w.lines && !w.lines.includes(path.line) ) return false;
  if ( w.notLines && w.notLines.includes(path.line) ) return false;
  if ( w.splats && !w.splats.includes(path.splat) ) return false;
  if ( !inSpans(w.spans, year) ) return false;
  if ( w.flags && !w.flags.every(f => flags.has(f)) ) return false;
  if ( w.any && !w.any.some(f => flags.has(f)) ) return false;
  if ( w.not && w.not.some(f => flags.has(f)) ) return false;
  return true;
}

/** A scene's weight: its base, times each factor whose flag is set (a factor of 0 rules it out). */
export function weightOf(e, flags) {
  let w = e.w ?? 10;
  for ( const [f, x] of Object.entries(e.more ?? {}) ) if ( flags.has(f) ) w *= x;
  return w;
}

/** The scenes that could come next, with weights. A forced scene (the last choice named it) wins if it fits. */
export function candidates(path, pool = allEvents()) {
  const stages = stagesFor(path.line);
  const stage = stages[path.steps.length];
  if ( !stage ) return [];
  const year = yearOf(path, stage);
  const flags = flagsOf(path, pool);
  if ( stage === "splat" ) {
    const se = path.splat ? splatEvent(path.line, path.splat) : null;
    if ( se ) return [{event: se, w: 1}];
  }
  const fitting = pool.filter(e => fits(e, path, stage, flags, year)).map(e => ({event: e, w: weightOf(e, flags)})).filter(c => c.w > 0);
  const last = path.steps.at(-1);
  const next = last ? eventById(last.event, pool, path)?.options?.[last.option]?.n : null;
  if ( next ) {
    const forced = fitting.filter(c => next[c.event.id] !== undefined).map(c => ({...c, w: c.w * next[c.event.id]})).filter(c => c.w > 0);
    if ( forced.length ) return forced;
  }
  return fitting;
}

/** A seeded stream (mulberry32 over a string hash): the same path, stage and re-roll give the same scene. */
export function rng(seed) {
  let h = 1779033703 ^ String(seed).length;
  for ( const c of String(seed) ) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The scene for the current stage, or null when the path is finished. */
export function currentEvent(path, pool = allEvents()) {
  const list = candidates(path, pool);
  if ( !list.length ) return null;
  const stage = stagesFor(path.line)[path.steps.length];
  const rand = rng(`${path.seed}:${path.steps.length}:${stage}:${path.rerolls?.[path.steps.length] ?? 0}`);
  const total = list.reduce((s, c) => s + c.w, 0);
  let r = rand() * total;
  for ( const c of list ) { r -= c.w; if ( r < 0 ) return c.event; }
  return list.at(-1).event;
}

/** The stage the path is on (null when done), and whether a scene exists for it. */
export function stageNow(path) {
  return stagesFor(path.line)[path.steps.length] ?? null;
}

/**
 * Take a choice. Returns a new path; the old one is untouched. A stage with no scene that fits is passed with a
 * skip, so a path never sticks.
 */
export function choose(path, optionIndex, pool = allEvents()) {
  const stage = stageNow(path);
  if ( !stage ) return path;
  const e = currentEvent(path, pool);
  if ( !e ) return {...path, steps: [...path.steps, {stage, event: null, option: null, year: yearOf(path, stage)}]};
  const i = Math.max(0, Math.min((e.options?.length ?? 1) - 1, Number(optionIndex) || 0));
  return {...path, steps: [...path.steps, {stage, event: e.id, option: i, year: yearOf(path, stage)}]};
}

/** Step back one scene. */
export function back(path) {
  if ( !path.steps.length ) return path;
  const rerolls = {...(path.rerolls ?? {})};
  delete rerolls[path.steps.length];
  return {...path, steps: path.steps.slice(0, -1), rerolls};
}

/** Draw a different scene for this stage, if the pool has another. */
export function reroll(path) {
  const k = path.steps.length;
  return {...path, rerolls: {...(path.rerolls ?? {}), [k]: (path.rerolls?.[k] ?? 0) + 1}};
}

export const done = path => !stageNow(path);

/* ------------------------------------------------------------------ */
/*  What it gives                                                      */
/* ------------------------------------------------------------------ */

export const KINDS = {bg: "Background", ab: "Ability", merit: "Merit", flaw: "Flaw", note: "Note"};

/** "bg Allies|ab Crafts|flaw Enemy" -> [{kind, name}]. Unknown kinds become notes. */
export function parseGives(g) {
  if ( !g ) return [];
  return String(g).split("|").map(s => s.trim()).filter(Boolean).map(s => {
    const sp = s.indexOf(" ");
    const k = sp > 0 ? s.slice(0, sp) : s;
    return KINDS[k] && sp > 0 ? {kind: k, name: s.slice(sp + 1).trim()} : {kind: "note", name: s};
  });
}

/** "role|what they were to you" -> {role, note}. */
export function parsePerson(p) {
  if ( !p ) return null;
  const [role, ...rest] = String(p).split("|");
  return {role: role.trim(), note: rest.join("|").trim()};
}

/**
 * Everything the path suggests, gathered: the story so far (one line per scene), the suggestions (each once, with
 * the scenes that gave it), and the people. nowYear: the chronicle's year, to say who may still be alive.
 */
export function summary(path, {nowYear = null, pool = allEvents()} = {}) {
  const story = [], gives = new Map(), people = [];
  path.steps.forEach((s, idx) => {
    if ( !s.event ) return;
    const e = eventById(s.event, pool, path);
    const o = e?.options?.[s.option];
    if ( !e || !o ) return;
    story.push({stage: s.stage, year: s.year, band: bandOf(s.year).label, title: e.title, choice: o.label, text: o.text ?? ""});
    for ( const g of parseGives(o.g) ) {
      const key = `${g.kind}:${g.name.toLowerCase()}`;
      if ( !gives.has(key) ) gives.set(key, {...g, key, from: []});
      gives.get(key).from.push(e.title);
    }
    const p = parsePerson(o.p);
    if ( p ) {
      const alive = nowYear === null || (nowYear - s.year) <= PEOPLE_ALIVE_SPAN || !!o.lasting;
      people.push({...p, year: s.year, scene: e.title, idx, alive, pick: false});
    }
  });
  let ticked = 0;
  for ( const p of people ) if ( p.alive && ticked < PEOPLE_DEFAULT ) { p.pick = true; ticked++; }
  const order = Object.keys(KINDS);
  const list = [...gives.values()].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.name.localeCompare(b.name));
  return {line: path.line, splat: path.splat, birthYear: path.birthYear, turnYear: path.turnYear, story, gives: list, people};
}

/** The record kept on the actor: the path itself and what the player kept. */
export function record(path, {kept = [], people = [], at = 0} = {}) {
  return {v: VERSION, path: {...path}, kept: [...kept], people: people.map(p => ({role: p.role, note: p.note, year: p.year, actorId: p.actorId ?? null, name: p.name ?? null})), at};
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** The lifepath as journal or chat text. keptKeys: the suggestions kept (all when not given). */
export function summaryHtml(sum, {name = "", keptKeys = null, splatLabel = ""} = {}) {
  const L = LINES[sum.line];
  const head = `<p><strong>${esc(name || "A character")}</strong>: ${esc(L?.label ?? sum.line)}${splatLabel ? `, ${esc(splatLabel)}` : ""}. Born ${sum.birthYear}${sum.turnYear !== null ? `; ${esc(L?.turning ?? "the turn")} ${sum.turnYear}` : ""}.</p>`;
  const story = `<ol>${sum.story.map(s => `<li><strong>${s.year}, ${esc(s.title)}.</strong> ${esc(s.choice)}${s.text ? `: ${esc(s.text)}` : ""}</li>`).join("")}</ol>`;
  const kept = sum.gives.filter(g => !keptKeys || keptKeys.includes(g.key));
  const gives = kept.length ? `<h3>Suggestions kept</h3><ul>${kept.map(g => `<li>${esc(KINDS[g.kind])}: ${esc(g.name)}</li>`).join("")}</ul>` : "";
  const people = sum.people.length ? `<h3>People from the past</h3><ul>${sum.people.map(p => `<li>${esc(p.name ? `${p.name}, ` : "")}${esc(p.role)}${p.note ? `: ${esc(p.note)}` : ""} (${p.year})</li>`).join("")}</ul>` : "";
  return `${head}${story}${gives}${people}<p class="wodx-quiet">A lifepath spends no points. Buy what was kept with the creation points as usual.</p>`;
}

/** Problems in the tables (the harness runs this): missing text, options, unknown ids in next. */
export function lint(pool = allEvents()) {
  const out = [];
  const ids = new Set();
  for ( const e of pool ) {
    if ( ids.has(e.id) ) out.push(`${e.id}: id used twice`);
    ids.add(e.id);
  }
  const check = (e, where) => {
    if ( !e.title || !e.text ) out.push(`${where}: no title or text`);
    if ( !e.options?.length ) out.push(`${where}: no options`);
    for ( const o of e.options ?? [] ) {
      if ( !o.label ) out.push(`${where}: an option has no label`);
      for ( const id of Object.keys(o.n ?? {}) ) if ( !ids.has(id) ) out.push(`${where}: next names unknown ${id}`);
    }
  };
  for ( const e of pool ) check(e, e.id);
  for ( const [line, list] of Object.entries(SPLATS) ) {
    if ( !LINES[line] ) out.push(`splats: unknown line ${line}`);
    const keys = new Set();
    for ( const s of list ) {
      if ( keys.has(s.key) ) out.push(`${line}.${s.key}: key used twice`);
      keys.add(s.key);
      if ( !s.label ) out.push(`${line}.${s.key}: no label`);
      if ( !s.beat ) out.push(`${line}.${s.key}: no scene`); else check(s.beat, `${line}.${s.key}`);
    }
  }
  return out;
}
