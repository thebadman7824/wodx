/**
 * WoDX NPC 0.60.0: past lives, lines of teaching, the web of every tie, scene ideas from ties and who sees what, the
 * Foundry side (B2872-B2876). The rules are in legacy-rules.mjs.
 *
 *   past lives  api.legacy.pastLives / addPastLife / recall: a reborn soul's earlier self, its ties to people still
 *               living (the undying) or to a family line that came after; hidden until recalled with the Background
 *   teaching    api.legacy.teach(teacher, student, {what, dots, months, owed}): mentor and student ties, what was
 *               taught and what is owed (the Ledger); api.legacy.teachingLine(actor) runs up and down the line; a
 *               teacher's death tells the students their Mentor Background is gone
 *   the web     api.legacy.openWeb(): every tie in the chronicle, filtered by group, person, region and year
 *   scene ideas once a game week, one approval card of scenes the ties suggest; approved ideas go in the Ledger
 *   who sees    hidden ties show to the character who found them out; trust and warmth only to the one who feels them
 */
import * as LR from "./legacy-rules.mjs";
import * as TR from "./ties-rules.mjs";
import * as SR from "./standing-rules.mjs";
import {getEngine} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-npc";
const T = {ideas: `${MOD}.scene-ideas`};
const WEEK = 7 * 86400;
const st = () => (game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api : null);
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const api = () => game.modules.get(MOD).api;
const isActiveGM = () => game.user?.isGM && game.users.activeGM?.id === game.user.id;
const actorOf = x => (x?.actor ?? (typeof x === "string" ? game.actors.get(x) : x?.id ? game.actors.get(x.id) ?? x : null));
const yearNow = () => getEngine().timeToDate(Number(game.time.worldTime) || 0).year;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const ownersOf = a => game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
const card = (title, lines) => `<div class="vta-card wodx-x wnpc"><div class="vta-body"><p><b>${esc(title)}</b></p>${lines.map(l => `<p>${esc(l)}</p>`).join("")}</div></div>`;
const lineOf = a => api()?.hearts?.lineOf?.(a) ?? "mortal";

export function registerSettings() {
  game.settings.register(MOD, "sceneIdeas", {scope: "world", config: true, type: Boolean, default: true,
    name: "Scene ideas from ties", hint: "Once a game week, the Storyteller gets one approval card of scenes the ties suggest: boons called in, hostages, feuds boiling over, families objecting, descendants asking questions."});
  game.settings.register(MOD, "sceneIdeasWeek", {scope: "world", config: false, type: Number, default: -1});
}
const on = k => { try { return !!game.settings.get(MOD, k); } catch (e) { return false; } };

/* ---- Past lives ---- */
export const pastLives = a => (actorOf(a)?.flags?.[MOD]?.pastLives ?? []).map(LR.normPastLife);
export async function addPastLife(aLike, life = {}) {
  const a = actorOf(aLike);
  if ( !game.user.isGM || !a ) return null;
  const p = LR.normPastLife({...life, id: life.id ?? foundry.utils.randomID()});
  await a.setFlag(MOD, "pastLives", [...pastLives(a), p]);
  return p;
}
const bgDots = (a, name) => Number(a?.items?.find?.(i => String(i.name).toLowerCase() === name.toLowerCase())?.system?.value) || 0;
/** Roll to recall a past life: the Background's dots at the house difficulty. Success shows its ties to the character. */
export async function recall(aLike, lifeId, {dots = null} = {}) {
  const a = actorOf(aLike);
  const list = pastLives(a), p = list.find(x => x.id === lifeId);
  if ( !a || !p ) return null;
  const bg = LR.backgroundFor(lineOf(a), (a.items ?? []).map(i => i.name)) ?? LR.PAST_BACKGROUNDS.find(b => b.line === lineOf(a)) ?? null;
  const n = dots ?? (bg ? bgDots(a, bg.name) : 0);
  const rr = LR.recallRoll(n);
  if ( !rr.pool ) return {ok: false, why: "No Background to remember with."};
  const roll = await new Roll(`${rr.pool}d10cs>=${rr.difficulty}`).evaluate();
  const successes = Number(roll.total) || 0;
  if ( successes > 0 && game.user.isGM ) await a.setFlag(MOD, "pastLives", list.map(x => x.id === p.id ? {...x, recalled: {...x.recalled, [a.id]: game.time.worldTime}} : x));
  await ChatMessage.create({whisper: ownersOf(a), speaker: {alias: a.name}, rolls: [roll],
    content: card(`${a.name} reaches back to ${p.name || "a past self"}`, [`${bg?.name ?? "Background"} ${n}: ${rr.pool} dice at difficulty ${rr.difficulty}, ${successes} success${successes === 1 ? "" : "es"}.`,
      successes > 0 ? `Remembered: ${p.ties.map(t => `${t.name || "someone"} (${t.kind})`).join(", ") || "the life itself"}.` : "Nothing comes back this time."])});
  return {ok: successes > 0, successes};
}

/* ---- Teaching ---- */
export const taughtBy = a => LR.normTaught(actorOf(a)?.flags?.[MOD]?.taught);
async function handTie(a, b, role) {
  const ties = foundry.utils.deepClone(a.flags?.["wodx-sheets"]?.ties ?? []);
  if ( !ties.some(t => t.uuid === `Actor.${b.id}` && t.role === role) ) { ties.push({uuid: `Actor.${b.id}`, name: b.name, role}); await a.setFlag("wodx-sheets", "ties", ties); }
}
export async function teach(teacherLike, studentLike, {what = "", dots = 1, months = 1, owed = ""} = {}) {
  const t = actorOf(teacherLike), s = actorOf(studentLike);
  if ( !game.user.isGM || !t || !s || t.id === s.id ) return null;
  const map = taughtBy(t);
  const row = {what: what || LR.TEACHABLE[lineOf(t)] || "Abilities", dots, from: game.time.worldTime, to: game.time.worldTime + Math.max(0, Number(months) || 0) * 30 * 86400, owed};
  map[s.id] = [...(map[s.id] ?? []), row];
  await t.setFlag(MOD, "taught", map);
  await handTie(s, t, "mentor");
  if ( owed ) { try { await st()?.ledger?.save?.({kind: "debt", what: `For teaching ${row.what}: ${owed}`, from: {id: s.id, name: s.name}, to: {id: t.id, name: t.name}}); } catch (e) { /* Ledger off */ } }
  return {...row, way: LR.teachingFor(yearNow()).text};
}
export function teachingLine(aLike) {
  const a = actorOf(aLike);
  return a ? LR.teachingLine(api()?.ties?.edges?.() ?? [], a.id) : {up: [], down: []};
}
async function onDeath(a) {
  if ( !isActiveGM() || !a?.id ) return;
  const students = (api()?.ties?.edges?.() ?? []).filter(e => e.kind === "mentor" && e.to?.id === a.id).map(e => game.actors.get(e.from)).filter(Boolean);
  for ( const s of students ) await ChatMessage.create({whisper: ownersOf(s), speaker: {alias: s.name}, flags: {[MOD]: {mentorGone: true}},
    content: card(`${a.name}, ${s.name}'s teacher, is dead`, ["The Mentor Background built on them is gone; the Storyteller may let the points go to another Background or a new teacher.", ...(taughtBy(a)[s.id]?.length ? [`What was taught stays: ${taughtBy(a)[s.id].map(r => r.what).join(", ")}.`] : [])])});
}

/* ---- The web ---- */
function peopleTable() {
  const out = {};
  for ( const a of game.actors ) {
    const c = a.flags?.["wodx-creation"]?.chronology ?? {};
    const died = c.died ? getEngine().timeToDate(Number(c.died)).year : null;
    out[a.id] = {name: a.name, born: Number.isFinite(Number(c.bornYear)) && c.bornYear !== null ? Number(c.bornYear) : null, died, region: a.flags?.["wodx-chronicle"]?.region ?? null};
  }
  return out;
}
export function web({groups = null, only = null, year = null, region = null} = {}) {
  const all = api()?.ties?.edges?.() ?? [];
  // A player sees no hidden or secret tie on the web, not even one their character found (the sheet shows those)
  const edges = game.user.isGM ? all : all.filter(e => !e.hidden && !e.secret);
  return LR.webOf(edges, {groups, only, year, region, people: peopleTable(), groupOf: k => TR.KINDS[k]?.group ?? "other"});
}
const COLOURS = {blood: "#a33", bonds: "#a6a", family: "#3a7", teaching: "#37a", service: "#aa3", heart: "#d58", debts: "#888", places: "#666", other: "#999"};
function webSvg(w, size = 520) {
  const pos = LR.circleLayout(w.nodes, {size});
  const lines = w.links.map(l => `<line x1="${pos[l.a].x}" y1="${pos[l.a].y}" x2="${pos[l.b].x}" y2="${pos[l.b].y}" stroke="${COLOURS[l.group] ?? "#999"}" stroke-width="2" opacity="0.7"><title>${esc(TR.KINDS[l.kind]?.label ?? l.kind)}</title></line>`).join("");
  const dots = w.nodes.map(n => `<g class="wnpc-web-node" data-open="${esc(n.id)}" style="cursor:pointer"><circle cx="${pos[n.id].x}" cy="${pos[n.id].y}" r="6" fill="currentColor"/><text x="${pos[n.id].x}" y="${pos[n.id].y - 10}" text-anchor="middle" font-size="11" fill="currentColor">${esc(n.name)}</text></g>`).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" role="img" aria-label="The web of ties">${lines}${dots}</svg>`;
}
function webHtml(opts) {
  const w = web(opts);
  const groupBoxes = Object.entries(TR.GROUPS).map(([k, v]) => `<label><input type="checkbox" name="g" value="${esc(k)}" ${!opts.groups || opts.groups.includes(k) ? "checked" : ""}> <span style="color:${COLOURS[k] ?? "#999"}">${esc(v)}</span></label>`).join(" ");
  const people = w.nodes.map(n => `<li data-search-item><a data-open="${esc(n.id)}">${esc(n.name)}</a> <a data-only="${esc(n.id)}" title="Only their ties">(centre)</a></li>`).join("");
  return `<div class="wnpc-web-wrap"><div class="wnpc-web-filters" data-fixed>${groupBoxes}</div>
    <p><label>Year <input type="number" name="year" value="${opts.year ?? ""}" placeholder="any" style="width:6em"></label> ${opts.only ? `<a data-only="">Show everyone</a>` : ""}</p>
    ${webSvg(w)}<p class="wodx-quiet">${w.nodes.length} people, ${w.links.length} ties.</p>
    ${searchBox(".wnpc-web-people", "Find a person…")}<ul class="wnpc-web-people">${people}</ul></div>`;
}
export async function openWeb(opts = {}) {
  const D = foundry.applications.api.DialogV2;
  let state = {groups: null, only: null, year: null, ...opts};
  const dlg = new D({window: {title: "The web of ties", icon: "fa-solid fa-diagram-project", resizable: true}, classes: ["wodx-dialog", "wodx-npc-dialog", "wnpc-web-dialog"],
    position: {width: 600, height: "auto"}, content: webHtml(state), buttons: [{action: "close", label: "Close", default: true}], rejectClose: false});
  await dlg.render(true);
  const redraw = () => { const box = dlg.element?.querySelector(".wnpc-web-wrap"); if ( box ) box.outerHTML = webHtml(state); };
  dlg.element?.addEventListener("change", ev => {
    if ( ev.target.name === "g" ) state.groups = [...dlg.element.querySelectorAll("input[name=g]:checked")].map(x => x.value);
    if ( ev.target.name === "year" ) state.year = ev.target.value === "" ? null : Number(ev.target.value);
    redraw();
  });
  dlg.element?.addEventListener("click", ev => {
    const o = ev.target.closest("[data-open]"), c = ev.target.closest("[data-only]");
    if ( c ) { ev.preventDefault(); state.only = c.dataset.only || null; redraw(); }
    else if ( o ) { ev.preventDefault(); game.actors.get(o.dataset.open)?.sheet?.render(true); }
  });
  return dlg;
}

/* ---- Scene ideas ---- */
export function ideasNow() {
  const now = game.time.worldTime;
  const L = st()?.ledger?.state?.()?.entries ?? [];
  const due = L.filter(e => (e.status ?? "open") === "open" && e.due !== null && e.due >= now - WEEK && ["boon", "debt", "oath"].includes(e.kind));
  const held = game.actors.filter(a => a.flags?.[MOD]?.heldBy).map(a => ({victim: {id: a.id, name: a.name}, captor: a.flags[MOD].heldBy}));
  const feuds = (api()?.standing?.feuds?.() ?? []).filter(f => !f.ended && f.heat >= 3);
  const objections = [];
  for ( const a of game.actors ) for ( const m of (a.flags?.[MOD]?.marriages ?? []).filter(x => !x.ended) ) {
    const b = game.actors.get(m.with?.id);
    if ( b && a.id < b.id && SR.matchObjection(api()?.standing?.rank?.(a), api()?.standing?.rank?.(b), yearNow()) ) objections.push({a: {id: a.id, name: a.name}, b: {id: b.id, name: b.name}});
  }
  const descendants = [];
  for ( const l of api()?.kin?.lines?.() ?? [] ) {
    const m = (l.members ?? []).find(x => !x.died && !x.actorId && x.gen >= 2);
    if ( m && game.actors.get(l.founder?.id)?.hasPlayerOwner ) descendants.push({member: `${l.id}:${m.id}`, name: m.name || "A descendant", relation: api()?.kin?.rules?.relationWord?.(m) ?? "a descendant", founder: l.founder.name});
  }
  return LR.sceneIdeas({now, due, held, feuds, objections, descendants: descendants.slice(0, 3)});
}
async function weekly() {
  if ( !isActiveGM() || !on("sceneIdeas") ) return;
  const week = Math.floor((Number(game.time.worldTime) || 0) / WEEK);
  let last = -1;
  try { last = game.settings.get(MOD, "sceneIdeasWeek"); } catch (e) { last = -1; }
  if ( week === last ) return;
  await game.settings.set(MOD, "sceneIdeasWeek", week);
  const ideas = ideasNow();
  if ( !ideas.length ) return;
  await chron()?.propose?.({type: T.ideas, key: `scene-ideas:${week}`, title: `Scene ideas from ties (${ideas.length})`, detail: ideas.map(i => `- ${i.text}`).join("\n"), data: {ideas}});
}
export function registerHandlers() {
  chron()?.registerApprovalHandler?.(T.ideas, {label: "Scene ideas from ties",
    approve: async entry => {
      for ( const i of entry.data?.ideas ?? [] ) { try { await st()?.ledger?.save?.({kind: "consequence", what: i.text, due: game.time.worldTime + WEEK, notes: "WoDX NPC: a scene idea from ties"}); } catch (e) { /* Ledger off */ } }
      return `${(entry.data?.ideas ?? []).length} in the Ledger`;
    },
    reject: async () => "Dropped"});
}

export function listen() {
  Hooks.on("updateWorldTime", () => { weekly().catch(e => console.error(`${MOD} | scene ideas`, e)); });
  Hooks.on("updateActor", (a, change) => { const d = change?.flags?.["wodx-creation"]?.chronology?.died; if ( d !== undefined && d !== null ) onDeath(a).catch(e => console.error(`${MOD} | teaching`, e)); });
}
export const rules = LR;
export {T};
