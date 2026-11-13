/**
 * Hunters across a region (hunters-rules.mjs has the rules; B3300-B3305).
 *
 *   Fed by     a hunting ground going Watched or Hunted (upkeep.mjs addHeat), a breach with witnesses (wodxBreach), a
 *              new description of a culprit (WoDX NPC's descriptions, read each turn), the Veil track at Hunted or
 *              worse (each turn), and an approved era response to a hot place.
 *   Turns      every 7 days of world time on the active Storyteller's client (a long skip runs up to 12 turns): files
 *              on culprits grow, pressure cools when nothing new happens, and word follows a culprit who has moved to
 *              another region at the speed of the year.
 *   Shows      a whispered card when a region's stage changes; an investigator, a raid or a purge goes to the approval
 *              queue. Approving starts a rumour, logs it, and (for an investigator) sends every description of a
 *              culprit the hunters know about round the whole town.
 *   Stored     world setting wodx-storyteller.hunterState {regions: {id: {pressure, since, last, stage, files,
 *              acted, log}}, lastTurn, trail}.
 *   Hooks out  wodxHunterStage {region, stage, before, pressure}.
 * Nothing runs on players' machines, and players never see the hunters' files.
 */
import * as H from "./hunters-rules.mjs";
import {MOD, esc, isActiveGM, setting, chron, npc, log} from "./core.mjs";
import {faithFor} from "../../wodx-chronicle/scripts/faith-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const T_HUNTERS = `${MOD}.hunters`;
const now = () => game.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const skipping = () => { try { return !!chron()?.isSkipping?.(); } catch (e) { return false; } };
const futureBranch = () => { try { return !!game.settings.get("wodx-chronicle", "rule.futureBranch"); } catch (e) { return false; } };
const on = () => setting("hunterPressure") !== false;

export function registerHunterSettings() {
  game.settings.register(MOD, "hunterPressure", {name: "Hunters across the region (house rule)", hint: "Hot hunting grounds, breaches with witnesses, descriptions going round and a failing Veil raise the pressure of the era's hunters on the whole region. They watch, keep files on culprits, follow them to other lands and at the worst move against them. Storyteller cards and the approval queue only.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "hunterState", {scope: "world", config: false, type: Object, default: {}});
}

export const state = () => H.normState(setting("hunterState"));
async function save(s) { await game.settings.set(MOD, "hunterState", H.normState(s)); }

/** The region a scene stands in (its own pick, else the homeland). */
export function regionAt(scene = canvas?.scene) {
  try { const r = chron()?.world?.here?.(scene); if ( r?.id ) return r.id; } catch (e) { /* no Chronicle */ }
  try { const h = chron()?.world?.homeland?.(); if ( h ) return h; } catch (e) { /* none */ }
  return "moravia";
}
const regionLabel = id => { try { return chron()?.world?.regions?.[id]?.label ?? id; } catch (e) { return id; } };
const faithAt = id => { try { return faithFor(id, yearNow()); } catch (e) { return "western"; } };

/** Who hunts in a region now. */
export function bodiesAt(regionId, r = null) {
  const x = r ?? state().regions[regionId] ?? H.normRegion({});
  return H.bodiesFor({faith: faithAt(regionId), region: regionId, year: yearNow(), futureBranch: futureBranch(), stage: H.stageIndex(H.cooled(x, now()).pressure)});
}

/** What the region of a scene looks like now: {region, pressure, stage, bodies}. */
export function here(scene = canvas?.scene) {
  const id = regionAt(scene), r = H.cooled(state().regions[id] ?? {}, now());
  return {region: id, label: regionLabel(id), pressure: r.pressure, stage: H.stageOf(r.pressure), bodies: bodiesAt(id, r), files: Object.values(r.files)};
}

/** The extra hunting difficulty the region adds for WoDX Actions' Hunt (0 when off). */
export const stageDiff = scene => (on() ? here(scene).stage.diff : 0);
/** A place's heat difficulty with the region's added, capped (for upkeep.mjs huntHere). */
export const rulesHuntExtra = (heatDiff, scene) => (on() ? H.huntExtra(heatDiff, here(scene).pressure) : heatDiff);

/** A culprit as a file needs it. */
const culpritOf = a => (a ? {id: a.id, name: a.name, kind: String(a.type ?? "") || null} : null);
const actorFrom = by => { try { const a = by?.uuid ? fromUuidSync(by.uuid) : by?.id ? game.actors.get(by.id) : null; return a?.isToken ? (a.baseActor ?? a) : a; } catch (e) { return null; } };

/**
 * Add pressure to a region and tell the Storyteller when the stage changes. kind: a rules POINTS key. who: an actor
 * to open a file on (gain: progress on it).
 */
export async function add(regionId, kind, {n = null, why = "", who = null, gain = 0} = {}) {
  if ( !isActiveGM() || !on() || held() || !regionId ) return null;
  const s = state(), t = now(), year = yearNow();
  const res = H.addPressure(s.regions[regionId] ?? {}, kind, t, {n, faith: faithAt(regionId), year, why});
  let r = res.region;
  if ( who ) r = H.noteCulprit(r, who, t, {gain, kind: who.kind}).region;
  s.regions[regionId] = r;
  await save(s);
  if ( res.crossed ) await stageCard(regionId, res.crossed, H.stageOf(res.before), r);
  return res;
}

async function stageCard(regionId, stage, before, r) {
  const bodies = bodiesAt(regionId, r), rising = H.STAGES.indexOf(stage) > H.STAGES.indexOf(before);
  await ChatMessage.create({content: `<div class="wodx-card wst-hunters"><h3>${esc(regionLabel(regionId))}: the hunters ${rising ? "stir" : "ease off"}</h3>
    <p><b>${esc(before.name)}</b> to <b>${esc(stage.name)}</b>. ${esc(stage.note)}</p><p class="wodx-quiet">${esc(H.summary(r, bodies, now()))}</p>
    <button type="button" data-action="wst-hunters-open">Hunters across the region</button></div>`, whisper: gmIds(), speaker: {alias: "The hunters"}, flags: {[MOD]: {hunters: {region: regionId}}}});
  Hooks.callAll("wodxHunterStage", {region: regionId, stage: stage.key, before: before.key, pressure: r.pressure});
}

/* ---------------- Feeds ---------------- */

/** From upkeep.mjs addHeat: a hunting ground changed band. */
export async function onHeat(scene, bandName, {who = null} = {}) {
  if ( bandName !== "Watched" && bandName !== "Hunted" ) return null;
  const a = typeof who === "string" ? game.actors.get(who) : null;
  return add(regionAt(scene), bandName === "Hunted" ? "heatHunted" : "heatWatched", {why: `${scene?.navName || scene?.name || "A place"} is ${bandName.toLowerCase()}`, who: culpritOf(a), gain: 1});
}

/** A breach that witnesses saw and that spreads (not one inside a closed place). */
export async function onBreach(p) {
  if ( !isActiveGM() || !on() ) return null;
  const e = p?.entry ?? {};
  if ( e.spread === false ) return null;
  const a = actorFrom(p?.by);
  let scene = canvas?.scene;
  try { const tok = a?.getActiveTokens?.()[0]; if ( tok?.scene ) scene = tok.scene; } catch (err) { /* the GM's scene */ }
  return add(regionAt(scene), "breach", {why: `A breach with witnesses${e.event ? ` (${String(e.event).slice(0, 60)})` : ""}`, who: culpritOf(a), gain: 1});
}

/** New descriptions of culprits since the last turn: each adds pressure where it was written and to its culprit's file. */
async function readDescriptions(s, since, t) {
  let list = [];
  try { list = npc()?.wanted?.list?.() ?? []; } catch (e) { return s; }
  const seen = new Set();
  for ( const d of list ) {
    if ( d.dropped || !d.of || d.at <= since || d.at > t ) continue;
    const scene = d.scene ? fromUuidSync?.(d.scene) ?? game.scenes.get(String(d.scene).split(".").pop()) : null;
    const id = regionAt(scene), key = `${id}:${d.of}`;
    const a = game.actors.get(d.of);
    let r = s.regions[id] ?? H.normRegion({});
    if ( !seen.has(key) ) r = H.addPressure(r, "description", t, {faith: faithAt(id), year: yearNow(), why: `A description of ${d.ofName} goes round`}).region;
    seen.add(key);
    r = H.noteCulprit(r, {id: d.of, name: d.ofName}, t, {gain: d.named ? 2 : 1, kind: a ? String(a.type ?? "") || null : null}).region;
    s.regions[id] = r;
  }
  return s;
}

/** Where each known culprit stands now: {actorId: regionId}, from their tokens on active-able scenes. */
function whereCulprits(ids) {
  const out = {};
  for ( const id of ids ) {
    const a = game.actors.get(id);
    const tok = a?.getActiveTokens?.(false, true)?.[0] ?? null;
    const sc = tok?.parent ?? game.scenes.find(sc => sc.tokens?.some?.(t => t.actorId === id));
    if ( sc ) out[id] = regionAt(sc);
  }
  return out;
}

/** Is the Veil track at Hunted or worse (WoDX Storyteller's ledger)? */
function veilLow() {
  try { const v = game.modules.get(MOD)?.api?.ledger?.state?.()?.veil?.value; return Number.isFinite(Number(v)) && Number(v) <= 4; } catch (e) { return false; }
}

/* ---------------- The turn ---------------- */

let running = false;
/** Run every turn that is due (force: one now). */
export async function turn({force = false} = {}) {
  if ( running || !isActiveGM() || !on() || held() ) return 0;
  running = true;
  try {
    let s = state();
    const t = now(), due = force ? 1 : H.turnsDue(s.lastTurn, t);
    if ( !due ) return 0;
    const since = s.lastTurn ?? t - H.TURN_DAYS * H.DAY;
    s = await readDescriptions(s, since, t);
    const year = yearNow(), veil = veilLow(), events = [];
    // Word that has arrived from other regions
    const arrived = s.trail.filter(x => x.at <= t), waiting = s.trail.filter(x => x.at > t);
    for ( const x of arrived ) {
      let r = s.regions[x.to] ?? H.normRegion({});
      if ( r.files[x.file.id] ) continue;
      r = H.addPressure(r, "carried", t, {faith: faithAt(x.to), year, why: `Word of ${x.file.name} comes from ${regionLabel(x.from)}`}).region;
      r = {...r, files: {...r.files, [x.file.id]: H.normFile({...x.file, since: t, seen: t})}};
      s.regions[x.to] = r;
      events.push({region: x.to, kind: "carried", file: x.file, from: x.from});
    }
    s.trail = waiting;
    const turns = Math.min(due, H.MAX_TURNS);
    for ( let i = 0; i < turns; i++ ) {
      const at = t - (turns - 1 - i) * H.TURN_DAYS * H.DAY;
      for ( const [id, r0] of Object.entries(s.regions) ) {
        const res = H.regionTurn(r0, at, {bodies: bodiesAt(id, r0), veilLow: veil, faith: faithAt(id), year});
        s.regions[id] = res.region;
        for ( const e of res.events ) events.push({region: id, ...e});
      }
    }
    // Word follows culprits who have moved
    const ids = new Set(Object.values(s.regions).flatMap(r => Object.keys(r.files)));
    const where = whereCulprits(ids);
    for ( const [id, r] of Object.entries(s.regions) ) {
      s.trail.push(...H.trailFrom(id, r.files, where, t, year, (to, fid) => !!s.regions[to]?.files?.[fid], s.trail));
    }
    s.lastTurn = force && s.lastTurn !== null ? s.lastTurn : (s.lastTurn === null ? t : s.lastTurn + due * H.TURN_DAYS * H.DAY);
    await save(s);
    await report(events, s);
    return turns;
  } finally { running = false; }
}

async function report(events, s) {
  const t = now();
  for ( const e of events ) {
    const r = s.regions[e.region];
    if ( !r ) continue;
    if ( e.kind === "stage" ) await stageCard(e.region, e.stage, e.before, r);
    if ( e.kind === "level" && e.file ) {
      await ChatMessage.create({content: `<div class="wodx-card wst-hunters"><h3>The hunters' file on ${esc(e.file.name)}</h3><p>${esc(regionLabel(e.region))}: <b>${esc(e.level.name)}</b>. ${esc(e.level.note)}</p></div>`,
        whisper: gmIds(), speaker: {alias: "The hunters"}});
    }
    if ( e.kind === "carried" ) {
      await ChatMessage.create({content: `<div class="wodx-card wst-hunters"><h3>Word follows ${esc(e.file.name)}</h3><p>The hunters of ${esc(regionLabel(e.region))} hear from ${esc(regionLabel(e.from))} by ${esc(H.trailOf(yearNow()).label)}. Their file starts at <b>${esc(H.levelOf(e.file.level).name)}</b>.</p></div>`,
        whisper: gmIds(), speaker: {alias: "The hunters"}});
    }
    if ( ["investigator", "raid", "purge"].includes(e.kind) ) {
      const key = H.actKey(e);
      if ( H.actedLately(r, key, t) ) continue;
      s.regions[e.region] = H.markActed(r, key, t);
      await propose(e.region, e);
    }
  }
  await save(s);
}

const MOVE_TEXT = {
  investigator: (lead, who) => ({title: `${cap(lead.label)} send an investigator`, text: `Someone from ${lead.label} arrives to ask about the dead and the strange.${who ? ` They already have a file on ${who.name}.` : ""} Approving starts a rumour and sends every description of a culprit they know of round the whole town.`}),
  raid: (lead, who) => ({title: `${cap(lead.label)} move against ${who?.name ?? "a culprit"}`, text: `They know ${H.levelOf(who?.level ?? 2).name.toLowerCase()} and act on it: a watch on the places ${who?.name ?? "the culprit"} goes, then a strike when they are ready. Approving logs it and starts a rumour; the Storyteller stages the attempt.`}),
  purge: (lead, who) => ({title: `A purge by ${lead.label}`, text: `Trials, raids and curfews across the region. Every stranger is suspect${who ? `, and ${who.name} is named` : ""}. Approving logs it and starts a rumour.`})
};
const cap = s => String(s ?? "").replace(/^\w/, c => c.toUpperCase());

async function propose(regionId, e) {
  const lead = bodiesAt(regionId)[0] ?? H.BODIES.at(-1);
  const m = MOVE_TEXT[e.kind](lead, e.file);
  await chron()?.approvals?.propose?.({type: T_HUNTERS, key: `hunters:${regionId}:${H.actKey(e)}`, title: `${regionLabel(regionId)}: ${m.title}`, detail: m.text,
    data: {region: regionId, kind: e.kind, file: e.file ? {id: e.file.id, name: e.file.name} : null, lead: lead.label, text: m.text}});
}

async function approve(entry) {
  const d = entry.data ?? {};
  const place = regionLabel(d.region);
  const text = d.kind === "investigator" ? `A stranger from ${d.lead} is asking questions in ${place}.` : d.kind === "raid" ? `${cap(d.lead)} are hunting someone in ${place}${d.file?.name ? `, and the name ${d.file.name} is whispered` : ""}.` : `${cap(d.lead)} purge ${place}.`;
  try { await game.modules.get(MOD)?.api?.rumours?.start?.({text}); } catch (err) { console.error(`${MOD} |`, err); }
  await log({kind: "hunters", attention: "The hunters move", text: `${place}: ${d.text ?? text}`});
  if ( d.kind === "investigator" ) {
    const files = Object.keys(state().regions[d.region]?.files ?? {});
    const w = npc()?.wanted;
    for ( const desc of w?.list?.() ?? [] ) if ( files.includes(desc.of) && !desc.dropped ) { try { await w.spreadNow(desc.id); } catch (err) { /* gone */ } }
  }
}

/* ---------------- The Storyteller's window ---------------- */

function listHtml() {
  const s = state(), t = now();
  const rows = Object.entries(s.regions).map(([id, r0]) => [id, H.cooled(r0, t)]).sort((a, b) => b[1].pressure - a[1].pressure).map(([id, r]) => {
    const bodies = bodiesAt(id, r), st = H.stageOf(r.pressure);
    const files = Object.values(r.files).sort((a, b) => b.level - a.level).map(f => `<li>${esc(f.name)}${f.kind ? ` (${esc(f.kind)})` : ""}: ${esc(H.levelOf(f.level).name)} <button type="button" data-act="forget" data-file="${esc(f.id)}" title="The hunters lose this file">Forget</button></li>`).join("");
    return `<div class="wst-hunters-row" data-search-item data-region="${esc(id)}"><p><b>${esc(regionLabel(id))}</b>: ${esc(st.name)}. ${esc(st.note)}</p>
      <p class="wodx-quiet">Who hunts here: ${esc(bodies.map(b => b.label).join("; "))}.</p>
      <div class="wodx-field"><label>Pressure</label><input type="number" name="${esc(id)}" value="${r.pressure}" min="0" max="${H.MAX}" style="width:4em"></div>
      ${files ? `<ul>${files}</ul>` : "<p class=\"wodx-quiet\">No files yet.</p>"}
      ${r.log.length ? `<p class="wodx-quiet">Lately: ${esc(r.log.slice(-3).map(l => l.text).join("; "))}.</p>` : ""}</div>`;
  }).join("");
  const id = regionAt(canvas?.scene);
  const trail = s.trail.length ? `<p class="wodx-quiet">Word on its way: ${esc(s.trail.map(x => `${x.file.name} to ${regionLabel(x.to)}`).join(", "))}.</p>` : "";
  return `<div class="wst-hunters-list">${Object.keys(s.regions).length > 5 ? searchBox(".wst-hunters-rows", "Search regions…", "Search regions") : ""}
    <div class="wst-hunters-rows">${rows || `<p>No hunters are looking anywhere yet. Here (${esc(regionLabel(id))}) the hunters would be ${esc(bodiesAt(id).map(b => b.label).join("; "))}.</p>`}</div>${trail}
    <p class="wodx-quiet">A house rule. Pressure rises from hot hunting grounds, breaches with witnesses, descriptions going round and a failing Veil, and falls by one after ${H.QUIET_DAYS} quiet days. Hunting and Purge add +1 to hunting difficulty in the region (with a place's heat, at most +3). The hunters' turn comes every ${H.TURN_DAYS} days.</p></div>`;
}

export async function open() {
  if ( !game.user.isGM ) return null;
  const D = foundry.applications.api.DialogV2;
  const dlg = new D({window: {title: "Hunters across the region", icon: "fa-solid fa-cross", resizable: true}, classes: ["wodx-dialog", "wst-hunters-dialog"], position: {width: 600, height: "auto"},
    content: listHtml(), rejectClose: false,
    buttons: [{action: "save", label: "Save pressure", callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "turn", label: "Run the hunters' turn now"}, {action: "close", label: "Close", default: true}],
    submit: async (result) => {
      if ( result === "turn" ) return turn({force: true});
      if ( result && typeof result === "object" ) {
        const s = state(), t = now();
        for ( const [id, v] of Object.entries(result) ) {
          if ( !s.regions[id] ) continue;
          const r = H.cooled(s.regions[id], t), p = Math.max(0, Math.min(H.MAX, Math.round(Number(v) || 0)));
          if ( p !== r.pressure ) s.regions[id] = {...r, pressure: p, last: t, stage: H.stageOf(p).key, log: [...r.log, {at: t, text: `The Storyteller set pressure to ${p}`}].slice(-30)};
        }
        await save(s);
      }
    }});
  await dlg.render(true);
  dlg.element?.addEventListener("click", async ev => {
    const b = ev.target.closest("[data-act=forget]");
    if ( !b ) return;
    ev.preventDefault();
    await forget(b.closest("[data-region]")?.dataset.region, b.dataset.file);
    const box = dlg.element.querySelector(".wst-hunters-list");
    if ( box ) box.outerHTML = listHtml();
  });
  return dlg;
}

/** The hunters of a region lose their file on someone (or every region's, with no region). */
export async function forget(regionId, fileId) {
  if ( !game.user.isGM || !fileId ) return false;
  const s = state();
  for ( const [id, r] of Object.entries(s.regions) ) {
    if ( regionId && id !== regionId ) continue;
    if ( r.files[fileId] ) { const files = {...r.files}; delete files[fileId]; s.regions[id] = {...r, files}; }
  }
  s.trail = s.trail.filter(x => x.file.id !== fileId || (regionId && x.from !== regionId));
  await save(s);
  return true;
}

/** Every region's file on one actor: [{region, label, level, name}]. */
export function filesOn(actorId) {
  return Object.entries(state().regions).filter(([, r]) => r.files[actorId]).map(([id, r]) => ({region: id, label: regionLabel(id), ...r.files[actorId], levelName: H.levelOf(r.files[actorId].level).name}));
}

/* ---------------- Wiring ---------------- */

export function registerHunterHandlers() {
  chron()?.approvals?.registerHandler?.(T_HUNTERS, {label: "The hunters of a region move", approve});
}

export function registerHunterHooks() {
  Hooks.on("updateWorldTime", () => { if ( !skipping() ) turn().catch(e => console.error(`${MOD} | hunters`, e)); });
  Hooks.on("wodxSkipEnd", () => { turn().catch(e => console.error(`${MOD} | hunters`, e)); });
  Hooks.on("wodxBreach", p => { onBreach(p).catch(e => console.error(`${MOD} | hunters`, e)); });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    const b = html?.querySelector?.("[data-action=wst-hunters-open]");
    if ( !b ) return;
    if ( !game.user.isGM ) { b.remove(); return; }
    b.addEventListener("click", ev => { ev.preventDefault(); open(); });
  });
}

export const api = () => ({open, here, regionAt, bodiesAt, add, turn, forget, filesOn, state, stageDiff, rules: H});
