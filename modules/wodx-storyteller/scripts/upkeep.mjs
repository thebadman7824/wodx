/**
 * WoDX Storyteller 0.12.0: between nights, the ties that need tending, and hunting grounds with heat.
 * The rules are in upkeep-rules.mjs. Everything here runs on the active Storyteller's client only, on a clock change
 * or a time skip, never per frame; players' clients only read the flags it writes.
 *
 *   Between nights  A time skip of a night or more puts one proposal in the approval queue: the blood rising cost each
 *                   vampire, the Willpower that came back. Approving applies it and posts a card with Undo.
 *   Ties            Actor flag wodx-storyteller.ties {key: {last, every, off, warned, note, custom...}}. Once a game
 *                   day, the ties that came due go to the Storyteller on one card, with Tended buttons.
 *   Hunting grounds Scene flag wodx-storyteller.hunt {area, heat, since, responded}. WoDX Actions' Hunt reads the
 *                   ground and the heat; a hunt, a botch or a feeding seen adds heat; at Hunted the era's response
 *                   goes to the approval queue, and approving it starts a rumour.
 */
import * as U from "./upkeep-rules.mjs";
import * as W from "./world-rules.mjs";
import {MOD, SOCKET, esc, isActiveGM, setting, isPC, chron, log} from "./core.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

export const T_BETWEEN = `${MOD}.between`;
export const T_HEAT = `${MOD}.heat`;
const ACT = "wodx-actions";
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const now = () => game.time?.worldTime ?? 0;
const actSetting = (k, d) => { try { return game.settings.get(ACT, k); } catch (e) { return d; } };
const held = () => { try { return !!chron()?.isHeld?.(); } catch (e) { return false; } };
const dateOf = t => { try { return describeTime(t).dateLabel; } catch (e) { return ""; } };
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const profileOf = a => { try { return game.wodx?.profiles?.detectProfile?.(a) ?? null; } catch (e) { return null; } };
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };

export function registerUpkeepSettings() {
  game.settings.register(MOD, "betweenNights", {name: "Between nights", hint: "A time skip of a night or more proposes what the nights cost: blood on rising, Willpower back.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "ties", {name: "Ties that need tending", hint: "Once a game day, tell the Storyteller which ghouls' vitae, Fetters, Passions and people-backgrounds have gone untended.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "heat", {name: "Hunting grounds and heat", hint: "Hunting in a place builds heat; a hot place makes hunting harder and calls the era's authorities.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "plague", {name: "Plague years", hint: "In a year of plague, cholera or influenza, the Hunt says so.",
    scope: "world", config: true, type: Boolean, default: true});
  game.settings.register(MOD, "tieDay", {scope: "world", config: false, type: Number, default: -1});
}

/* ---------------- Between nights ---------------- */

function charView(a) {
  const prof = profileOf(a);
  const s = a.system ?? {}, af = a.flags?.[ACT] ?? {};
  const d = s.health?.damage ?? {};
  return {name: a.name, vampire: prof === "kindred" || /vampire/i.test(a.type), torpor: !!af.torpor, golconda: !!af.golconda,
    blood: {value: num(s.advantages?.bloodpool?.temporary), max: num(s.advantages?.bloodpool?.max)},
    willpower: {temp: num(s.advantages?.willpower?.temporary), perm: num(s.advantages?.willpower?.permanent)},
    wounded: num(d.bashing) + num(d.lethal) + num(d.aggravated) > 0};
}

export async function onSkip(info) {
  if ( !isActiveGM() || held() || info?.held || info?.eraHandled || !setting("betweenNights") ) return null;
  const nights = U.nightsBetween(info.from, info.to);
  if ( nights < 1 ) return null;
  // The nightfall card runs New Night itself when Dawn and dusk is automatic; then the last night is already settled
  const lastNightHandled = actSetting("dawnDusk", "prompt") === "auto";
  const opts = {nights, willpowerMode: actSetting("willpowerRecovery", "night"), nightlyBlood: actSetting("nightlyBlood", true), lastNightHandled};
  const rows = [];
  const only = Array.isArray(info.actorIds) ? new Set(info.actorIds) : null;
  for ( const a of game.actors.filter(x => isPC(x) && (!only || only.has(x.id))) ) {
    const p = U.betweenPlan(charView(a), opts);
    if ( !p.lines.length ) continue;
    rows.push({id: a.id, name: a.name, delta: p.delta, lines: p.lines});
  }
  if ( !rows.length ) return null;
  const detail = rows.map(r => `${r.name}: ${r.lines.map(l => l.text + (l.warn ? ` ${l.warn}` : "")).join(" ")}`).join("\n");
  return chron()?.approvals?.propose?.({type: T_BETWEEN, key: `between:${info.from}:${info.to}`,
    title: `Between nights: ${U.daysWords(nights)}${info.label ? ` (${info.label})` : ""}`, detail,
    data: {from: info.from, to: info.to, nights, rows: rows.map(r => ({id: r.id, name: r.name, delta: r.delta}))}});
}

async function applyDelta(a, delta, sign = 1) {
  const s = a.system?.advantages ?? {}, upd = {}, done = {};
  if ( delta.blood ) {
    const b = num(s.bloodpool?.temporary), to = Math.max(0, Math.min(num(s.bloodpool?.max) || Infinity, b + sign * delta.blood));
    if ( to !== b ) { upd["system.advantages.bloodpool.temporary"] = to; done.blood = to - b; }
  }
  if ( delta.willpower ) {
    const w = num(s.willpower?.temporary), to = Math.max(0, Math.min(num(s.willpower?.permanent), w + sign * delta.willpower));
    if ( to !== w ) { upd["system.advantages.willpower.temporary"] = to; done.willpower = to - w; }
  }
  if ( Object.keys(upd).length ) await a.update(upd);
  return done;
}

async function approveBetween(entry) {
  const applied = [], lines = [];
  for ( const r of entry.data?.rows ?? [] ) {
    const a = game.actors.get(r.id);
    if ( !a ) continue;
    const done = await applyDelta(a, r.delta ?? {});
    if ( !Object.keys(done).length ) continue;
    applied.push({id: a.id, delta: done});
    const bits = [];
    if ( done.blood ) bits.push(`blood ${done.blood > 0 ? "+" : ""}${done.blood}`);
    if ( done.willpower ) bits.push(`Willpower ${done.willpower > 0 ? "+" : ""}${done.willpower}`);
    lines.push(`<li><b>${esc(a.name)}</b>: ${bits.join(", ")}</li>`);
  }
  if ( !applied.length ) return;
  await ChatMessage.create({content: `<div class="wodx-card wst-between"><h3>Between nights</h3><ul>${lines.join("")}</ul>
    <p class="wodx-quiet">Rising costs a blood a night (VtDA20 p. 340); Willpower one a night (VtDA20 p. 309).</p>
    <button type="button" data-action="wst-between-undo"><i class="fa-solid fa-rotate-left"></i> Undo</button></div>`,
    whisper: gmIds(), speaker: {alias: "Between nights"}, flags: {[MOD]: {betweenUndo: applied}}});
}

export async function undoBetween(message) {
  if ( !game.user.isGM ) return;
  const applied = message?.flags?.[MOD]?.betweenUndo;
  if ( !applied?.length ) return;
  for ( const r of applied ) { const a = game.actors.get(r.id); if ( a ) await applyDelta(a, r.delta, -1); }
  await message.update({[`flags.${MOD}.betweenUndo`]: null, content: `${message.content}<p><i>Undone.</i></p>`.replace(/<button[^>]*wst-between-undo[\s\S]*?<\/button>/, "")});
}

/* ---------------- Ties ---------------- */

function itemsOf(a) {
  const out = [];
  for ( const i of a.items ?? [] ) {
    const t = String(i.system?.type ?? "");
    if ( i.type === "Trait" && t === "wod.types.fetter" ) out.push({id: i.id, name: i.name, type: "fetter", value: num(i.system?.value)});
    else if ( i.type === "Trait" && t === "wod.types.passion" ) out.push({id: i.id, name: i.name, type: "passion", value: num(i.system?.value)});
    else if ( i.type === "Feature" && /background/.test(t) ) out.push({id: i.id, name: i.name, type: "background", value: num(i.system?.value)});
  }
  return out;
}

function tieView(a) {
  // Read other modules' flags straight from the document: getFlag throws when that module is off
  const lin = a.flags?.["wodx-creation"]?.lineage ?? {};
  const prof = profileOf(a);
  const isGhoul = prof === "ghoul" || a.system?.settings?.variant === "ghoul";
  const dom = isGhoul && lin.domitor?.id ? {id: lin.domitor.id, name: lin.domitor.name ?? game.actors.get(lin.domitor.id)?.name ?? "the domitor"} : null;
  const last = dom ? lin.bonds?.[dom.id]?.last : null;
  return {ghoul: dom ? {domitor: dom, lastDrink: Number.isFinite(Number(last)) && last !== null ? Number(last) : null} : null,
    items: itemsOf(a), stored: foundry.utils.deepClone(a.flags?.[MOD]?.ties ?? {})};
}

export function tiesOf(a, t = now()) { return U.deriveTies(tieView(a), t).ties.map(x => U.tieStatus(x, t)); }

/** Characters whose ties are followed: player characters, ghouls of player characters, and anyone with a tie added. */
export function tieActors() {
  const pcIds = new Set(game.actors.filter(isPC).map(a => a.id));
  return game.actors.filter(a => pcIds.has(a.id) || pcIds.has(a.flags?.["wodx-creation"]?.lineage?.domitor?.id) || a.flags?.[MOD]?.ties);
}

async function saveTie(a, key, data) {
  const cur = a.flags?.[MOD]?.ties?.[key] ?? {};
  await a.update({[`flags.${MOD}.ties.${key}`]: {...cur, ...data}});
}

export async function tend(actorId, key) {
  if ( !game.user.isGM ) return;
  const a = game.actors.get(actorId);
  if ( !a ) return;
  await saveTie(a, key, {last: now(), warned: null});
  ui.notifications.info(`${a.name}: tended.`);
}

/** Once a game day (and after a skip): one card listing the ties that came due. */
export async function checkTies({force = false} = {}) {
  if ( !isActiveGM() || !setting("ties") || held() ) return [];
  const t = now(), day = Math.floor(t / U.DAY);
  if ( !force && day === setting("tieDay") ) return [];
  await game.settings.set(MOD, "tieDay", day);
  const rows = [];
  for ( const a of tieActors() ) {
    const v = tieView(a);
    const {ties, fresh} = U.deriveTies(v, t);
    // A tie seen for the first time starts its clock now
    for ( const key of fresh ) await saveTie(a, key, {last: ties.find(x => x.key === key)?.last ?? t});
    for ( const s of U.newlyDue(ties, t) ) {
      rows.push({a, s});
      await saveTie(a, s.key, {warned: t});
    }
  }
  if ( !rows.length ) return [];
  const li = rows.map(({a, s}) => `<li><b>${esc(a.name)}</b>: ${esc(s.name)}, untended ${esc(U.daysWords(s.every + s.overdueDays))}. ${esc(U.TIE_KINDS[s.kind].lapse)}${U.TIE_KINDS[s.kind].act ? ` <i>${esc(U.TIE_KINDS[s.kind].act)}.</i>` : ""}
    <button type="button" data-action="wst-tend" data-actor="${a.id}" data-key="${esc(s.key)}">Tended</button></li>`).join("");
  await ChatMessage.create({content: `<div class="wodx-card wst-ties"><h3>Ties that need tending</h3><ul>${li}</ul><p class="wodx-quiet">How often each needs tending is a house rule; change it in the Ties window.</p></div>`,
    whisper: gmIds(), speaker: {alias: "Ties"}});
  for ( const {a, s} of rows ) await log({kind: "tie", actor: isPC(a) ? a.id : null, name: a.name, attention: "A tie needs tending", text: `${s.name} has gone untended.`});
  return rows.map(({a, s}) => ({actor: a.id, key: s.key}));
}

/** The Storyteller's window for one character's ties. */
export async function tiesDialog(actorId = null) {
  if ( !game.user.isGM ) return ui.notifications.warn("The ties window is for the Storyteller.");
  let a = actorId ? game.actors.get(actorId) : null;
  if ( !a ) {
    const list = tieActors();
    if ( !list.length ) return ui.notifications.info("No characters with ties yet.");
    const pick = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Ties that need tending"}, classes: ["wodx-dialog", "wst-ties"],
      content: `<div class="form-group"><label>Character</label>${list.length > 6 ? searchBox("select[name=a]", "Search characters…", "Search characters") : ""}<select name="a"${list.length > 6 ? "" : " data-fixed"}>${list.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>`,
      buttons: [{action: "ok", label: "Open", default: true, callback: (ev, b) => b.form.elements.a.value}, {action: "cancel", label: "Cancel"}]});
    a = pick ? game.actors.get(pick) : null;
  }
  if ( !a ) return;
  const t = now(), ties = tiesOf(a, t);
  const rows = ties.map(s => `<tr><td>${esc(s.name)}</td>
    <td><input type="number" name="${esc(s.key)}.every" value="${s.every}" min="1" max="3650" style="width:4.5em"> days</td>
    <td>${esc(dateOf(s.last))}</td><td>${s.off ? "Off" : s.due ? `<b>Due</b> (${esc(U.daysWords(s.overdueDays))} over)` : esc(dateOf(s.next))}</td>
    <td><input type="checkbox" name="${esc(s.key)}.tended"> <input type="checkbox" name="${esc(s.key)}.off"${s.off ? " checked" : ""}></td></tr>`).join("");
  const kinds = Object.entries(U.TIE_KINDS).map(([k, v]) => `<option value="${k}"${k === "custom" ? " selected" : ""}>${esc(v.label)}</option>`).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 640}, window: {title: `Ties: ${a.name}`}, classes: ["wodx-dialog", "wst-ties"],
    content: `${ties.length > 5 ? searchBox("table.wst-ties-t", "Search ties…", "Search ties") : ""}<div class="wst-scroll"><table class="wst-ties-t"><thead><tr><th>Tie</th><th>Every</th><th>Last tended</th><th>Next</th><th>Tended now / Off</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>No ties on this sheet yet.</td></tr>"}</tbody></table></div>
      <fieldset><legend>Add a tie</legend><div class="form-group"><label>Name</label><input type="text" name="new.name" placeholder="A sister in Lübeck, a chapel, a debt of blood"></div>
      <div class="form-group"><label>Kind</label><select name="new.kind" data-fixed>${kinds}</select></div>
      <div class="form-group"><label>Every (days)</label><input type="number" name="new.every" value="30" min="1" max="3650"></div></fieldset>
      <p class="hint">Ties come from the sheet: a ghoul's domitor, Fetters, Passions and backgrounds that are people or places. How often each needs tending is a house rule.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  const upd = {};
  for ( const s of ties ) {
    const every = Math.max(1, Math.round(num(res[`${s.key}.every`]) || s.every));
    const data = {...(a.flags?.[MOD]?.ties?.[s.key] ?? {}), every, off: !!res[`${s.key}.off`]};
    if ( s.custom ) Object.assign(data, {custom: true, kind: s.kind, name: s.name});
    if ( res[`${s.key}.tended`] ) { data.last = t; data.warned = null; }
    upd[`flags.${MOD}.ties.${s.key}`] = data;
  }
  const name = String(res["new.name"] ?? "").trim();
  if ( name ) {
    const key = U.tieKey("custom", foundry.utils.randomID());
    upd[`flags.${MOD}.ties.${key}`] = {custom: true, kind: U.TIE_KINDS[res["new.kind"]] ? res["new.kind"] : "custom", name, every: Math.max(1, Math.round(num(res["new.every"]) || 30)), last: t};
  }
  if ( Object.keys(upd).length ) await a.update(upd);
}

/* ---------------- Hunting grounds and heat ---------------- */

export const huntOf = scene => U.normHunt(scene?.flags?.[MOD]?.hunt ?? {});

/** What WoDX Actions' Hunt asks: the ground set for the scene and the heat's extra difficulty. */
export function huntHere(scene = canvas?.scene) {
  const outbreak = setting("plague") ? U.outbreakFor(yearNow()) : null;
  if ( !setting("heat") || !scene ) return {area: null, heat: 0, extra: 0, band: U.heatBand(0), outbreak};
  const h = huntOf(scene), heat = U.cooled(h.heat, h.since, now());
  return {area: h.area, heat, extra: U.heatDifficulty(heat), band: U.heatBand(heat), outbreak};
}

export async function addHeat(scene, kind, {who = null} = {}) {
  if ( !isActiveGM() || !setting("heat") || !scene || held() ) return null;
  const r = U.addHeat(huntOf(scene), kind, now());
  await scene.update({[`flags.${MOD}.hunt`]: {area: r.area, heat: r.heat, since: r.since, responded: r.responded}});
  const band = U.heatBand(r.heat);
  if ( r.crossed ) {
    await ChatMessage.create({content: `<div class="wodx-card wst-heat"><h3>${esc(scene.navName || scene.name)}: ${esc(band.name)}</h3><p>Heat ${r.before} to ${r.heat}. ${esc(band.note)}${band.diff ? ` Hunting here is +${band.diff} difficulty.` : ""}</p></div>`,
      whisper: gmIds(), speaker: {alias: "Hunting grounds"}});
  }
  if ( band.name === "Hunted" && (r.responded === null || r.responded < r.since - U.HEAT.coolDays * U.DAY) ) {
    const resp = U.responseFor(yearNow());
    await chron()?.approvals?.propose?.({type: T_HEAT, key: `heat:${scene.id}`, title: `${resp.who} answer the deaths at ${scene.navName || scene.name}`,
      detail: `${resp.text} Approving starts a rumour about it and logs it.`, data: {sceneId: scene.id, who: resp.who, text: resp.text, by: who}});
  }
  return r;
}

async function approveHeat(entry) {
  const scene = game.scenes.get(entry.data?.sceneId);
  if ( !scene ) return;
  await scene.update({[`flags.${MOD}.hunt.responded`]: now()});
  const place = scene.navName || scene.name;
  try { await game.modules.get(MOD)?.api?.rumours?.start?.({text: `Something is killing people at ${place}. ${entry.data.who} are asking questions.`}); } catch (e) { console.error(`${MOD} |`, e); }
  await log({kind: "heat", attention: "A hunting ground is hot", place: scene.id, text: `${entry.data.who} answer the deaths at ${place}. ${entry.data.text}`});
}

/** The Storyteller's window: the ground and the heat for each scene. */
export async function groundsDialog() {
  if ( !game.user.isGM ) return;
  const G = game.wodxActions?.rules?.HUNTING_GROUNDS ?? {slums: {label: "Slums", diff: 4}, lower: {label: "Lower-class neighborhood", diff: 5},
    market: {label: "Market district", diff: 6}, merchant: {label: "Merchant-class neighborhood", diff: 7}, patrolled: {label: "Heavily patrolled area", diff: 8}};
  const scenes = game.scenes.filter(s => !W.NOT_A_PLACE.test(s.name ?? ""));
  const opt = cur => `<option value="">Not set</option>${Object.entries(G).map(([k, g]) => `<option value="${k}"${k === cur ? " selected" : ""}>${esc(g.label)} (${g.diff})</option>`).join("")}`;
  const rows = scenes.map(s => { const h = huntHere(s); return `<tr><td>${esc(s.navName || s.name)}</td><td><select name="${s.id}.area" data-fixed>${opt(h.area)}</select></td>
    <td><input type="number" name="${s.id}.heat" value="${h.heat}" min="0" max="${U.HEAT.max}" style="width:4em"></td><td>${esc(h.band.name)}</td></tr>`; }).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 620}, window: {title: "Hunting grounds and heat"}, classes: ["wodx-dialog", "wst-grounds"],
    content: `${scenes.length > 5 ? searchBox("table.wst-grounds-t", "Search places…", "Search places") : ""}<div class="wst-scroll"><table class="wst-grounds-t"><thead><tr><th>Place</th><th>Hunting ground</th><th>Heat</th><th>Now</th></tr></thead><tbody>${rows}</tbody></table></div>
      <p class="hint">The ground sets the Hunt's difficulty (VtDA20 p. 334). Heat is a house rule: +1 a hunt, +2 a botch or a feeding seen, −1 a quiet week. Uneasy +1 difficulty, Watched and Hunted +2.</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return;
  for ( const s of scenes ) {
    const cur = huntOf(s), h = huntHere(s);
    const area = res[`${s.id}.area`] || null, heat = Math.max(0, Math.min(U.HEAT.max, Math.round(num(res[`${s.id}.heat`]))));
    if ( area === cur.area && heat === h.heat ) continue;
    await s.update({[`flags.${MOD}.hunt`]: {...cur, area, heat, since: heat === h.heat ? cur.since : now()}});
  }
}

export async function upkeepChooser() {
  if ( !game.user.isGM ) return;
  const pick = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Upkeep"}, classes: ["wodx-dialog"],
    content: "<p>Ties a character has to keep up, the hunting grounds and how hot each one is, how each character lives on their Resources and what they have, the markets and their prices, the long tasks under way, the havens and who knows where they are, hardship on the road, or the bodies left behind.</p>",
    buttons: [{action: "ties", label: "Ties that need tending"}, {action: "grounds", label: "Hunting grounds"},
      ...(game.modules.get("wodx-otherworlds")?.api?.drift ? [{action: "drift", label: "The Gauntlet over time"}] : []),
      {action: "money", label: "Money"}, {action: "markets", label: "Markets"}, {action: "tasks", label: "Long tasks"}, {action: "havens", label: "Havens"}, {action: "hardship", label: "Hardship on the road"}, {action: "remains", label: "Bodies left behind"}, {action: "check", label: "Check ties now"}, {action: "cancel", label: "Close"}]});
  if ( pick === "drift" ) return game.modules.get("wodx-otherworlds")?.api?.drift?.dialog?.();
  if ( pick === "hardship" ) return game.modules.get(MOD)?.api?.hardship?.open?.();
  if ( pick === "remains" ) return game.modules.get(MOD)?.api?.remains?.open?.();
  if ( pick === "havens" ) return game.modules.get(MOD)?.api?.havens?.open?.();
  if ( pick === "tasks" ) return game.modules.get(MOD)?.api?.tasks?.open?.();
  if ( pick === "markets" ) return game.modules.get(MOD)?.api?.upkeep?.markets?.open?.();
  if ( pick === "money" ) return game.modules.get(MOD)?.api?.upkeep?.money?.dialog?.();
  if ( pick === "ties" ) return tiesDialog();
  if ( pick === "grounds" ) return groundsDialog();
  if ( pick === "check" ) { const n = await checkTies({force: true}); if ( !n.length ) ui.notifications.info("No ties have come due."); }
}

/* ---------------- Wiring ---------------- */

export function registerUpkeepHandlers() {
  const ap = chron()?.approvals;
  ap?.registerHandler?.(T_BETWEEN, {label: "Between nights (blood and Willpower over a time skip)", approve: approveBetween});
  ap?.registerHandler?.(T_HEAT, {label: "A hot hunting ground: the era's response", approve: approveHeat});
}

/** The active Storyteller: a hunt happened (on this client, or a player's by socket). */
export function onHunted(p, {userId = null} = {}) {
  const user = userId ? game.users.get(userId) : null, actor = p?.actorId ? game.actors.get(p.actorId) : null;
  if ( userId && !(user && actor?.testUserPermission?.(user, "OWNER")) ) return null;
  const scene = game.scenes.get(p?.sceneId) ?? canvas?.scene;
  return addHeat(scene, p?.botch ? "botch" : "hunt", {who: p?.actorId ?? null}).catch(e => console.error(`${MOD} |`, e));
}

export function registerUpkeepHooks() {
  Hooks.on("wodxSkipEnd", info => { onSkip(info).catch(e => console.error(`${MOD} |`, e)); checkTies({force: true}).catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } checkTies().catch(e => console.error(`${MOD} |`, e)); });
  Hooks.on("wodxHunted", p => {
    // A player's hunt is heard on the player's client: send it to the active Storyteller
    if ( !isActiveGM() ) { if ( !game.user.isGM ) game.socket.emit(SOCKET, {type: "req.hunted", payload: {userId: game.user.id, actorId: p?.actorId ?? null, sceneId: p?.sceneId ?? null, botch: !!p?.botch}}); return; }
    onHunted(p);
  });
  Hooks.on("wodxBreach", p => {
    if ( !/feed/i.test(String(p?.entry?.event ?? "")) ) return;
    let scene = canvas?.scene;
    try { const a = p?.by?.uuid ? fromUuidSync(p.by.uuid) : null; const tok = a?.getActiveTokens?.()[0]; if ( tok?.scene ) scene = tok.scene; } catch (e) { /* the GM's scene */ }
    addHeat(scene, "seen", {who: p?.by?.name ?? null}).catch(e => console.error(`${MOD} |`, e));
  });
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !game.user.isGM || !html ) return;
    html.querySelector?.("[data-action=wst-between-undo]")?.addEventListener("click", () => undoBetween(message));
    for ( const b of html.querySelectorAll?.("[data-action=wst-tend]") ?? [] ) b.addEventListener("click", () => { b.disabled = true; tend(b.dataset.actor, b.dataset.key); });
  });
}
