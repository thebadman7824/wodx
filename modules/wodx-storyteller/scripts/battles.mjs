import * as B from "./battle-rules.mjs";
import * as X from "./battle-extras.mjs";
import * as C from "./core.mjs";
import * as Clocks from "./clocks.mjs";
import * as T from "./tasks-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

/**
 * WoDX Storyteller 0.43.0: battles and sieges (B2200-B2209). The rules are in battle-rules.mjs.
 *
 * The Storyteller opens the Battles window from the Storyteller's hand (or game.wodx.storyteller.battles.open()),
 * sets up two forces and fights the battle phase by phase, or a siege week by week. Each step rolls both
 * commanders, adds the characters' deeds, posts a card in words for everyone and a card with the dice for the
 * Storyteller, and has an Undo. A siege's breach is mirrored on a progress clock. When the battle ends it goes in
 * the Storyteller's log, the hook wodxBattle fires, and WoDX Chronicle's Legends book picks it up on its next build.
 * Nothing moves the clock by itself: "Let the time pass" moves the world clock by the time the battle took.
 */

const {MOD, esc, setting, isActiveGM} = C;
const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const KEY = "battles";
const n = v => Number(v) || 0;
const now = () => globalThis.game?.time?.worldTime ?? 0;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur) ? " selected" : ""}>${esc(v)}</option>`).join("");

export function registerBattleSettings() {
  game.settings.register(MOD, KEY, {scope: "world", config: false, type: Object, default: B.blankBattles(), onChange: () => BattlesApp.refresh()});
  X.registerHooks();
}

export const state = () => B.normBattles(setting(KEY));
export const list = () => state().list;
export const get = id => list().find(b => b.id === id) ?? null;

async function put(battle) {
  if ( !game.user.isGM ) return null;
  const s = state(), b = B.normBattle(battle);
  const i = s.list.findIndex(x => x.id === b.id);
  if ( i >= 0 ) s.list[i] = b; else s.list.push(b);
  await game.settings.set(MOD, KEY, B.normBattles(s));
  return b;
}
export async function remove(id) {
  if ( !game.user.isGM ) return;
  const s = state(); s.list = s.list.filter(b => b.id !== id);
  await game.settings.set(MOD, KEY, s);
  try { await Clocks.removeClock(`siege-${id}`.slice(0, 40)); } catch (e) { /* no clock */ }
}

/** The year, branch and age of war for a battle. */
export function contextOf(battle) {
  const ctx = C.tripContext(now());
  const year = battle?.year || ctx.year || 1197;
  const branch = battle?.branch ?? (ctx.future ? "future" : "classic");
  return {year, branch, age: B.ageFor(year, {branch, realm: battle?.realm ?? "world"})};
}

/* ---- Characters' numbers ---- */

const attrOf = (a, k) => { const x = a?.system?.attributes?.[k]; return x ? n(x.total ?? x.value) : 0; };
function abilityDots(a, key) {
  let best = n(a?.system?.abilities?.[key]?.value);
  for ( const i of a?.items ?? [] ) {
    if ( !["Ability", "Trait"].includes(i.type) ) continue;
    const id = String(i.system?.id || i.name || "").trim().toLowerCase();
    if ( id === key ) best = Math.max(best, n(i.system?.value));
  }
  return best;
}
/**
 * A commander's pools from their sheet (Spoils of War pp. 40-45): Perception + Leadership to direct the battle,
 * Charisma + Leadership to hold the army together, Intelligence + Leadership for siege works, Wits + Medicine
 * against disease in camp.
 */
export function commandPools(a) {
  const lead = abilityDots(a, "leadership");
  return {pool: Math.max(1, attrOf(a, "perception") + lead), morale: Math.max(1, attrOf(a, "charisma") + lead),
    works: Math.max(1, attrOf(a, "intelligence") + lead), medicine: Math.max(1, attrOf(a, "wits") + abilityDots(a, "medicine"))};
}
export const commandPool = a => commandPools(a).pool;

/* ---- Rolling ---- */

async function roll(dice, diff) {
  const r = new Roll(`${Math.max(1, dice)}d10`);
  await r.evaluate();
  const faces = r.dice[0]?.results?.map(x => x.result) ?? [];
  return {...T.countFaces(faces, diff), faces};
}

/** Start a battle or a siege. */
export async function start(raw = {}) {
  const ctx = contextOf(raw);
  const b = B.normBattle({...raw, year: raw.year || ctx.year, branch: raw.branch ?? ctx.branch, started: now()});
  for ( const s of b.sides ) {
    const a = s.commander.actorId ? game.actors.get(s.commander.actorId) : null;
    if ( a ) { Object.assign(s.commander, commandPools(a)); s.commander.name ||= a.name; }
  }
  const saved = await put(b);
  if ( saved?.kind === "siege" ) await syncClock(saved);
  return saved;
}

async function syncClock(b) {
  try {
    const c = B.clockFor(b), old = Clocks.state().own.find(x => x.id === c.id);
    await Clocks.saveClock({...(old ?? {}), ...c, shown: old?.shown ?? false});
  } catch (e) { /* clocks are part of this module; nothing to do if the setting is not ready */ }
}

/** Fight one phase. `deeds` = [[{name, successes}], [...]]; `extra` = dice added to each side's commander. */
export async function fight(id, {deeds = [[], []], extra = [0, 0], actions = ["melee", "melee"], quiet = false} = {}) {
  const b0 = get(id);
  if ( !b0 || b0.over || !game.user.isGM ) return null;
  const {age} = contextOf(b0);
  deeds = X.withOffers(b0, deeds);
  const setup = B.isBook(b0) ? B.bookSetup(b0, age, {extra}) : B.phaseSetup(b0, age, {extra});
  const rolls = [await roll(setup[0].pool, setup[0].difficulty), await roll(setup[1].pool, setup[1].difficulty)];
  let step;
  if ( B.isBook(b0) ) {
    // Right of Command: the commanders' roll sets the pools, then each army's action is rolled against the other
    const plan = {...B.bookPools(b0, age, rolls), commandRolls: rolls};
    plan.contests = B.bookContests(b0, age, plan.pools, actions);
    for ( const c of plan.contests ) c.rolls = {attack: c.attack.pool ? await roll(c.attack.pool, c.attack.difficulty) : null, resist: c.resist.pool ? await roll(c.resist.pool, c.resist.difficulty) : null};
    step = B.settleBookTurn(b0, age, plan, deeds);
  } else step = B.settlePhase(b0, age, rolls, deeds);
  let b = {...B.applyStep(b0, step, now()), offers: null};
  if ( step.waver ) {
    const w = step.waver, r = await roll(b.sides[w.side].commander.morale, w.difficulty);
    b = B.applyWaver(b, w.side, r, now());
    b.phases.at(-1).waver.difficulty = w.difficulty;
  }
  b = await put(b);
  if ( !quiet ) await cards(b, b.phases.at(-1), setup);
  await afterStep(b, step.phase);
  return b;
}

/** One week of a siege. `quiet`: no cards (a war fought off the screen). */
export async function week(id, {quiet = false} = {}) {
  const b0 = get(id);
  if ( !b0 || b0.over || b0.kind !== "siege" || !game.user.isGM ) return null;
  const {age} = contextOf(b0);
  const setup = B.siegeSetup(b0, age);
  const r = await roll(setup.pool, setup.difficulty);
  const sick = [await roll(b0.sides[0].commander.medicine, B.diseaseDifficulty(b0.sides[0])), await roll(b0.sides[1].commander.medicine, B.diseaseDifficulty(b0.sides[1]))];
  const step = B.settleWeek(b0, age, r, sick);
  const b = await put(B.applyStep(b0, step, now()));
  await syncClock(b);
  if ( !quiet ) await cards(b, step.phase, [setup]);
  await afterStep(b, step.phase);
  return b;
}

export async function storm(id, {quiet = false} = {}) {
  const b0 = get(id);
  if ( !b0 || b0.over || b0.kind !== "siege" ) return null;
  const b = await put(B.assault(b0));
  if ( !quiet ) await say(b, `<p>${esc(b.sides[0].name)} storm the walls of ${esc(b.place || b.sides[1].name)}.</p>`);
  return b;
}
export async function withdrawSide(id, side) {
  const b0 = get(id);
  if ( !b0 || b0.over ) return null;
  const b = await put(B.withdraw(b0, side, now()));
  await afterStep(b, b.phases.at(-1));
  await say(b, `<p>${esc(b.over.text)}</p>`);
  return b;
}
export async function callDraw(id, {quiet = false} = {}) {
  const b0 = get(id);
  if ( !b0 || b0.over ) return null;
  const b = await put(B.stalemate(b0, now()));
  await afterStep(b, null);
  if ( !quiet ) await say(b, `<p>${esc(b.over.text)}</p>`);
  return b;
}
export async function undo(id) {
  const b0 = get(id);
  if ( !b0 ) return null;
  const b = await put(B.undoAny(b0));
  if ( b.kind === "siege" ) await syncClock(b);
  await ChatMessage.create({content: `<div class="wodx-card"><p>Undo: the last step of ${esc(b.name)} is taken back.</p></div>`, whisper: gmIds(), speaker: {alias: "Battles"}});
  return b;
}

/** Move the world clock by the time the battle took, once. */
export async function passTime(id) {
  const b = get(id);
  if ( !b || !game.user.isGM ) return 0;
  const {age} = contextOf(b);
  const secs = Math.max(0, B.timeTaken(b, age) - n(b.timePassed));
  if ( !secs ) { ui.notifications.info("The time this battle took has already passed."); return 0; }
  await put({...b, timePassed: n(b.timePassed) + secs});
  await game.time.advance(secs);
  return secs;
}

/**
 * The battle's counterattack on a character (Dark Ages Companion pp. 46-47): the age's dice at 6, doubled as damage
 * through WoDX Combat's soak (with its Undo), aggravated every third phase; five successes stake a Cainite.
 */
export async function hazard(id, actorId, {attention = false} = {}) {
  const b = get(id), a = game.actors.get(actorId);
  if ( !b || !a ) return null;
  const {age} = contextOf(b);
  const c = b.chars.find(x => x.actorId === actorId);
  const dice = B.hazardFor(age, c?.stance ?? "thick", attention);
  if ( !dice ) return null;
  const r = await roll(dice, 6);
  const phaseNo = b.phases.filter(p => p.kind === "phase").length;
  const res = B.counterResult(r.successes, phaseNo, {cainite: /vampire/i.test(String(a.type ?? ""))});
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Battles"}, content: `<div class="wodx-card wst-battle-card"><p>The battle turns on ${esc(a.name)}: ${dice} dice at 6, ${r.successes} success${r.successes === 1 ? "" : "es"} [${r.faces.join(", ")}].
    ${res.dice ? `${res.dice} dice of ${res.type} damage, not dodged.` : "Nothing gets through."}${res.staked ? ` <strong>A stake through the heart: ${esc(a.name)} falls into torpor.</strong>` : ""}</p></div>`});
  if ( !res.dice ) return res;
  if ( !game.wodxCombat?.soakAndApply ) { ui.notifications.warn(`WoDX Combat is off: ${res.dice} dice of ${res.type} damage to ${a.name}; roll soak and apply it by hand.`); return res; }
  const tok = a.getActiveTokens?.()?.[0];
  const done = await game.wodxCombat.soakAndApply(tok ?? a, {mode: "pool", amount: res.dice, type: res.type, fireSun: false, soakDiff: 6, soak: true, fortBlood: "auto", soakBonus: 0});
  // the levels left after soak (0 when it was all soaked)
  return {...res, levels: Number(done?.levels ?? res.dice) || 0};
}

/* ---- Cards, log and hooks ---- */

const unitWords = units => Object.entries(units ?? {}).map(([k, c]) => `${c} ${B.UNIT_TYPES[k].label.toLowerCase()}`).join(", ") || "no units left";

async function say(b, html) {
  await ChatMessage.create({content: `<div class="wodx-card wst-battle-card"><h3>${esc(b.name)}</h3>${html}</div>`, speaker: {alias: "Battles"}, flags: {[MOD]: {battle: b.id}}});
}

/** Words for everyone, numbers for the Storyteller. */
async function cards(b, p, setup) {
  const [s0, s1] = b.sides;
  let words;
  if ( p.kind === "week" ) {
    words = `Week ${p.week} of the siege. ${p.work ? `${esc(s0.name)} work at the walls.` : `The walls of ${esc(b.place || s1.name)} hold.`}${p.hungry ? ` Hunger inside the walls.` : ""}${b.breached ? " There is a breach." : ""}`;
  } else {
    const lead = p.winner === null ? "Neither side gives ground." : `${esc(b.sides[p.winner].name)} gain the upper hand${p.net >= 3 || p.net <= -3 ? " and drive the enemy back" : ""}.`;
    const deeds = [0, 1].flatMap(i => p.deeds[i]).filter(d => d.successes > 0 && d.name).map(d => esc(d.name));
    const wv = p.waver ? ` ${esc(b.sides[p.waver.side].name)} ${p.waver.result === "holds" ? "waver but hold" : p.waver.result === "breaks" ? "break" : "waver"}.` : "";
    words = `Phase ${b.phases.filter(x => x.kind === "phase").length}. ${lead}${deeds.length ? ` Deeds of ${deeds.join(", ")} turn the fighting.` : ""}${wv}`;
  }
  await say(b, `<p>${words}</p>${b.over ? `<p><strong>${esc(b.over.text)}</strong></p>` : ""}`);
  const dice = p.rolls.map((r, i) => `${esc(b.sides[i].name)}: ${setup[i]?.pool ?? "?"} dice at ${setup[i]?.difficulty ?? "?"}, ${r.successes} success${r.successes === 1 ? "" : "es"}${r.botch ? " (a botch)" : ""} [${r.faces.join(", ")}]`).join("<br>");
  const deedSum = p.deeds ? [0, 1].map(i => p.deeds[i].reduce((t, d) => t + d.successes, 0)) : [0, 0];
  const side = (s, i) => `${esc(s.name)}: ${s.men.toLocaleString("en")} left (lost ${n(p.lost?.[i]).toLocaleString("en")}${p.book ? `, ${p.units[i]} unit${p.units[i] === 1 ? "" : "s"}` : ""}), ${b.book ? unitWords(s.units) : `resolve ${s.resolve}`}${b.kind === "siege" && i === 1 ? `, stores ${s.stores} days` : ""}`;
  const contests = p.book ? `<br>${p.contests.map((c, i) => `${esc(b.sides[i].name)} ${esc(B.ACTIONS[c.action].toLowerCase())}: ${c.attack.pool} dice, ${c.rolls.attack.successes}, against ${c.resist.pool} dice, ${c.rolls.resist.successes}`).join("<br>")}` : "";
  await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Battles"}, content: `<div class="wodx-card wst-battle-card"><h3>${esc(b.name)}: the numbers</h3>
    <p>${dice}${contests}${deedSum.some(Boolean) ? `<br>Deeds: ${deedSum.join(" and ")}` : ""}${p.kind === "week" ? `<br>The breach: ${b.breach} of ${B.BREACH_SEGMENTS}. Disease: ${p.sick.join(" and ")}` : ""}${p.waver ? `<br>Wavering: ${esc(b.sides[p.waver.side].name)} rolled Charisma + Leadership at ${p.waver.difficulty ?? "?"}, ${p.waver.successes} (${esc(p.waver.result)})` : ""}</p>
    <p>${b.sides.map(side).join("<br>")}</p></div>`});
}

async function afterStep(b, p) {
  Hooks.callAll("wodxBattle", {battle: b, step: p});
  if ( b.over && isActiveGM() ) {
    await C.log({kind: "note", text: `${b.name}${b.place ? ` at ${b.place}` : ""}: ${b.over.text}`});
    if ( b.kind === "siege" || b.phases.some(x => x.kind === "assault") ) await syncClock(b);
  }
}

/* ---- The window ---- */

const realmOpts = cur => opt(B.REALMS, cur);
const actorOpts = cur => `<option value="">(by name and pool)</option>${C.pcs().concat(game.actors.filter(a => !a.hasPlayerOwner && a.type !== "Group").slice(0, 300))
  .map(a => `<option value="${a.id}"${a.id === cur ? " selected" : ""}>${esc(a.name)}</option>`).join("")}`;

function sideForm(i, s, year) {
  const pos = Object.fromEntries(B.positionsFor(year).map(p => [p.id, p.label]));
  return `<fieldset><legend>${i === 0 ? "The first side (attacks)" : "The second side (defends)"}</legend>
    <div class="form-group"><label>Name</label><input type="text" name="s${i}.name" value="${esc(s.name)}" maxlength="120"></div>
    <div class="form-group"><label>Faction (optional)</label><input type="text" name="s${i}.faction" value="${esc(s.faction)}" list="wst-battle-factions"></div>
    <div class="form-group"><label>Men</label><input type="number" name="s${i}.men" value="${s.men}" min="1" step="1"></div>
    <div class="form-group"><label>Quality</label><select name="s${i}.quality" data-fixed>${opt(B.QUALITY, s.quality)}</select></div>
    <div class="form-group"><label>The supernatural in its ranks</label><select name="s${i}.supernatural" data-fixed>${opt(B.SUPERNATURAL, s.supernatural)}</select></div>
    <div class="form-group"><label>Where it stands</label><select name="s${i}.position" data-fixed>${opt(pos, s.position)}</select></div>
    <div class="form-group"><label>Commander</label><select name="s${i}.actorId">${actorOpts(s.commander.actorId)}</select></div>
    <div class="form-group"><label>Or by name</label><input type="text" name="s${i}.cname" value="${esc(s.commander.name)}" maxlength="120"></div>
    <div class="form-group"><label>Pools (no sheet)</label><input type="number" name="s${i}.pool" value="${s.commander.pool}" min="1" max="15" style="width:4em" title="Perception + Leadership: directing the battle">
      <input type="number" name="s${i}.morale" value="${s.commander.morale}" min="1" max="15" style="width:4em" title="Charisma + Leadership: holding the army together">
      <input type="number" name="s${i}.works" value="${s.commander.works}" min="1" max="15" style="width:4em" title="Intelligence + Leadership: siege works">
      <input type="number" name="s${i}.medicine" value="${s.commander.medicine}" min="1" max="15" style="width:4em" title="Wits + Medicine: disease in camp"></div>
    ${i === 1 ? `<div class="form-group"><label>Stores (days, a siege)</label><input type="number" name="s1.stores" value="${s.stores}" min="0" step="1"></div>` : ""}
    <details${B.unitCount(s.units) ? " open" : ""}><summary>The book's army, by units (Spoils of War)</summary>
      <p class="wodx-quiet">Fill this in for both sides to fight with the book's army: its units set the men and the Maneuver, Melee, Ranged and Defense pools. Leave it empty to use men and quality.</p>
      ${Object.entries(B.UNIT_TYPES).map(([k, t]) => `<div class="form-group"><label>${esc(t.label)} <span class="wodx-quiet">(${t.troops.toLocaleString("en")} a unit)</span></label><input type="number" name="s${i}.u.${k}" value="${n(s.units?.[k])}" min="0" max="999" step="1" style="width:5em"></div>`).join("")}
    </details>
  </fieldset>`;
}

/** The dialog that sets up a new battle (or changes one that has not started). */
export async function setupDialog({kind = "field", id = null} = {}) {
  if ( !game.user.isGM ) return null;
  const b = id ? get(id) : B.normBattle({kind});
  const {year, age} = contextOf(b);
  let evs = [];
  try { evs = B.warEvents(C.chron()?.events?.list?.() ?? [], year); } catch (e) { evs = []; }
  let factions = [];
  try { factions = (game.settings.get("wodx-npc", "factions")?.factions ?? []).map(f => f.name); } catch (e) { /* NPC is off */ }
  const pcs = C.pcs();
  const content = `<p class="wodx-quiet">${esc(String(year))}: ${esc(age.label)}. ${esc(age.note)}</p>
    ${evs.length ? `<div class="form-group"><label>From the chronicle's events</label><select name="eventId"><option value="">(none)</option>${evs.map(ev => `<option value="${esc(ev.id)}"${ev.id === b.eventId ? " selected" : ""}>${esc(`${ev.year}: ${ev.name}`)}</option>`).join("")}</select></div>` : ""}
    <div class="form-group"><label>Name</label><input type="text" name="name" value="${esc(b.name)}" maxlength="120"></div>
    <div class="form-group"><label>Place</label><input type="text" name="place" value="${esc(b.place)}" maxlength="120"></div>
    <div class="form-group"><label>Kind</label><select name="kind" data-fixed>${opt({field: "A battle in the field", siege: "A siege"}, b.kind)}</select></div>
    <div class="form-group"><label>Where</label><select name="realm" data-fixed>${realmOpts(b.realm)}</select></div>
    <datalist id="wst-battle-factions">${factions.map(f => `<option value="${esc(f)}">`).join("")}</datalist>
    ${sideForm(0, b.sides[0], year)}${sideForm(1, b.sides[1], year)}
    <fieldset><legend>Characters in the battle</legend>${pcs.length > 8 ? searchBox(".wst-battle-pcs", "Find a character…", "Search characters") : ""}
      <div class="wst-battle-pcs wodx-scroll" style="max-height:12em">${pcs.map(a => {
        const c = b.chars.find(x => x.actorId === a.id);
        return `<div class="form-group" data-search-item data-search-text="${esc(a.name)}"><label><input type="checkbox" name="c.${a.id}"${c ? " checked" : ""}> ${esc(a.name)}</label>
          <select name="cs.${a.id}" data-fixed>${opt({0: "First side", 1: "Second side"}, c?.side ?? 0)}</select>
          <select name="ct.${a.id}" data-fixed>${opt({thick: "In the thick of it", rear: "At the rear", command: "In command"}, c?.stance ?? "thick")}</select></div>`;
      }).join("") || `<p class="wodx-quiet">No player characters.</p>`}</div></fieldset>
    <p class="wodx-quiet">Commander rolls, wavering, disease and the counterattack follow Spoils of War and the Dark Ages Companion; the forces' weight, resolve and the breach are house rules.</p>`;
  const data = await foundry.applications.api.DialogV2.prompt({window: {title: id ? "Change the battle" : kind === "siege" ? "A new siege" : "A new battle", icon: "fa-solid fa-chess-rook"},
    position: {width: 560}, content, ok: {label: id ? "Save" : "Start", callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object}, rejectClose: false});
  if ( !data ) return null;
  const ev = evs.find(x => x.id === data.eventId);
  const side = i => ({name: data[`s${i}.name`], faction: data[`s${i}.faction`], men: data[`s${i}.men`], quality: data[`s${i}.quality`], supernatural: data[`s${i}.supernatural`],
    position: data[`s${i}.position`], defends: i === 1, stores: i === 1 ? data["s1.stores"] : 0,
    units: Object.fromEntries(Object.keys(B.UNIT_TYPES).map(k => [k, data[`s${i}.u.${k}`]])),
    commander: {actorId: data[`s${i}.actorId`], name: data[`s${i}.cname`] || game.actors.get(data[`s${i}.actorId`])?.name || "",
      pool: data[`s${i}.pool`], morale: data[`s${i}.morale`], works: data[`s${i}.works`], medicine: data[`s${i}.medicine`]}});
  const chars = pcs.filter(a => data[`c.${a.id}`]).map(a => ({actorId: a.id, name: a.name, side: Number(data[`cs.${a.id}`]) === 1 ? 1 : 0, stance: data[`ct.${a.id}`]}));
  const raw = {...(id ? b : {}), kind: data.kind, realm: data.realm, name: data.name || ev?.name || "", place: data.place, eventId: ev?.id ?? "", sides: [side(0), side(1)], chars};
  raw.book = undefined;
  if ( id ) { raw.sides = raw.sides.map((s, i) => ({...s, resolve: b.phases.length ? b.sides[i].resolve : null, start: b.phases.length ? b.sides[i].start : null})); }
  for ( const sd of raw.sides ) { const a = sd.commander.actorId ? game.actors.get(sd.commander.actorId) : null; if ( a ) Object.assign(sd.commander, commandPools(a)); }
  const out = id ? await put(raw) : await start(raw);
  BattlesApp.open(out?.id);
  return out;
}

export class BattlesApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-battles",
    classes: ["wodx", "wst-battles-app"],
    window: {title: "Battles and sieges", icon: "fa-solid fa-chess-rook", resizable: true},
    position: {width: 600, height: 680},
    actions: {
      newField: () => setupDialog({kind: "field"}), newSiege: () => setupDialog({kind: "siege"}),
      pick: (e, t) => BattlesApp.open(t.dataset.id), back: () => BattlesApp.open(null),
      edit: (e, t) => setupDialog({id: t.dataset.id}),
      fight: (e, t) => BattlesApp.#onFight(t), week: (e, t) => week(t.dataset.id), storm: (e, t) => storm(t.dataset.id),
      withdraw: (e, t) => withdrawSide(t.dataset.id, Number(t.dataset.side)), draw: (e, t) => callDraw(t.dataset.id),
      undo: (e, t) => undo(t.dataset.id), time: (e, t) => passTime(t.dataset.id),
      ...X.ACTIONS,
      hit: (e, t) => hazard(t.dataset.id, t.dataset.actor, {attention: !!BattlesApp.field(`att.${t.dataset.actor}`)?.checked}), remove: (e, t) => BattlesApp.#onRemove(t)
    }
  };
  static #instance;
  static #timer = null;
  #current = null;
  static open(id = undefined) {
    if ( !game.user.isGM ) return null;
    this.#instance ??= new BattlesApp();
    if ( id !== undefined ) this.#instance.#current = id;
    return this.#instance.render({force: true});
  }
  static refresh() {
    if ( !this.#instance?.rendered || this.#timer ) return;
    this.#timer = setTimeout(() => { this.#timer = null; if ( this.#instance?.rendered ) this.#instance.render(); }, 300);
  }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    const b = this.#current ? get(this.#current) : null;
    div.innerHTML = b ? this.#detail(b) : this.#list();
    X.bindChanges(div);
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  #list() {
    const all = [...list()].reverse();
    const row = b => `<div class="wst-battle-row" data-search-item data-search-text="${esc(`${b.name} ${b.place} ${b.sides.map(s => s.name).join(" ")}`)}">
      <button type="button" data-action="pick" data-id="${esc(b.id)}">${esc(b.name)}</button>
      <span class="wodx-quiet">${b.year ? esc(String(b.year)) : ""}${b.place ? `, ${esc(b.place)}` : ""}: ${b.over ? esc(b.over.text) : b.kind === "siege" ? `under siege, week ${b.weeks}` : `fighting, phase ${b.phases.length}`}</span></div>`;
    return `${all.length > 6 ? searchBox(".wst-battle-list", "Find a battle…", "Search battles") : ""}
      <p class="wodx-quiet">Battles and sieges fought as two forces, with the characters' deeds tipping the result (Spoils of War and the Dark Ages Companion, with house rules for every age).</p>
      <div class="wodx-scroll wst-battle-list">${all.map(row).join("") || `<p class="wodx-quiet">No battles yet.</p>`}</div>
      <div class="wodx-buttons"><button type="button" data-action="newField"><i class="fa-solid fa-flag"></i> A new battle</button>
        <button type="button" data-action="newSiege"><i class="fa-solid fa-chess-rook"></i> A new siege</button></div>
      ${(() => { const {year, branch} = contextOf(null); return X.renderOldFields(list(), year, branch); })()}`;
  }

  #detail(b) {
    const {year, age} = contextOf(b);
    const id = esc(b.id);
    const setup = b.kind === "siege" ? null : B.isBook(b) ? B.bookSetup(b, age) : B.phaseSetup(b, age);
    const bp = B.isBook(b) ? B.bookPools(b, age).pools : null;
    const side = (s, i) => `<div class="wst-battle-side"><strong>${esc(s.name)}</strong>${s.faction ? ` <span class="wodx-quiet">(${esc(s.faction)})</span>` : ""}
      <div>${s.men.toLocaleString("en")} of ${s.start.toLocaleString("en")} men, ${bp ? `${esc(unitWords(s.units))}. Maneuver ${bp[i].maneuver}, Melee ${bp[i].melee}, Ranged ${bp[i].ranged}, Defense ${bp[i].defense}, before the commanders roll.` : `${esc(B.QUALITY[s.quality])}. Resolve ${s.resolve}.`}</div>
      <div class="wodx-quiet">${esc(B.POSITIONS[s.position].label)}${s.supernatural ? `; ${esc(B.SUPERNATURAL[s.supernatural])}` : ""}. ${esc(s.commander.name || "No named commander")}, ${setup ? `${setup[i].pool} dice at ${setup[i].difficulty}` : `${b.sides[0] === s ? `${s.commander.works} dice for the works` : `${s.commander.pool} dice`}`}.${b.kind === "siege" && i === 1 ? ` Stores for ${s.stores} days.` : ""}${s.penalty ? " Wavering: 2 dice less." : ""}${B.demoralised(s) ? ` Demoralised: ${B.demoralised(s)} dice less.` : ""}${s.sick ? ` Disease: +${s.sick} difficulty.` : ""}</div>
      ${b.over ? "" : `<div class="form-group"><label>Deeds this phase</label><input type="number" name="deed${i}" value="0" min="0" max="20" style="width:4em" title="Successes from the characters' deeds for this side"><input type="text" name="deedName${i}" placeholder="Who, and what they did" maxlength="120"></div>`}
      ${b.over || !bp || b.kind === "siege" ? "" : `<div class="form-group"><label>This turn</label><select name="act${i}" data-fixed>${opt(B.ACTIONS, "melee")}</select></div>`}
      ${b.over ? "" : `<button type="button" data-action="withdraw" data-id="${id}" data-side="${i}">${i === 0 && b.kind === "siege" ? "Lift the siege" : "Draw off"}</button>`}</div>`;
    const chars = b.chars.map(c => {
      const a = game.actors.get(c.actorId);
      return a ? `<div>${esc(a.name)} <span class="wodx-quiet">(${esc(b.sides[c.side].name)}, ${c.stance === "thick" ? "in the thick of it" : c.stance === "rear" ? "at the rear" : "in command"})</span>
        ${b.kind === "field" && !b.over ? `<label title="Opened a hole in the line: 2 more dice against them"><input type="checkbox" name="att.${esc(c.actorId)}"> drew attention</label>
          <button type="button" data-action="hit" data-id="${id}" data-actor="${esc(c.actorId)}" title="The battle's counterattack on this character, soaked through WoDX Combat">The battle turns on ${esc(a.name)}</button>` : ""}</div>` : "";
    }).join("");
    const steps = [...b.phases].reverse().slice(0, 30).map(p => `<li>${p.kind === "week" ? `Week ${p.week}: breach ${p.breach} of ${B.BREACH_SEGMENTS}${p.hungry ? ", hunger" : ""}` : p.kind === "phase" ? p.book ? `Turn: units lost ${p.units.join(" and ")}` : `Phase: ${p.total.join(" to ")}${p.winner === null ? ", even" : `, ${esc(b.sides[p.winner].name)}`}` : p.kind === "assault" ? "The walls are stormed" : `${esc(b.sides[p.side ?? 0].name)} drew off`}</li>`).join("");
    const taken = B.timeTaken(b, age);
    return `<p><button type="button" data-action="back"><i class="fa-solid fa-arrow-left"></i> All battles</button></p>
      <h3>${esc(b.name)}${b.place ? ` <span class="wodx-quiet">at ${esc(b.place)}</span>` : ""}</h3>
      <p class="wodx-quiet">${esc(String(year))}, ${esc(B.REALMS[b.realm])}: ${esc(age.label)}. ${esc(age.note)}</p>
      ${b.war ? `<p class="wodx-quiet">A war between factions${b.war.kind === "supernatural" ? " of the hidden world, fought with their powers" : ", fought by mortal hands"}${b.war.auto ? "; it is fought off the screen at each faction turn" : "; it waits for you because a player character is there"}.</p>` : ""}
      ${b.over ? `<p><strong>${esc(b.over.text)}</strong></p>` : ""}
      <div class="wst-battle-sides">${b.sides.map(side).join("")}</div>
      ${b.kind === "siege" ? `<p>Week ${b.weeks} of the siege. The breach: ${b.breach} of ${B.BREACH_SEGMENTS}${b.breached ? ", the walls are open" : ""}. The progress clock "${esc(B.clockFor(b).name)}" follows it.</p>` : ""}
      ${chars ? `<fieldset><legend>Characters</legend>${chars}</fieldset>` : ""}
      ${X.renderOffers(b)}${X.renderAftermath(b)}
      <div class="wodx-buttons">
        ${b.over ? "" : b.kind === "siege" ? `<button type="button" data-action="week" data-id="${id}">A week of siege</button><button type="button" data-action="storm" data-id="${id}">Storm the walls</button>`
          : `<button type="button" data-action="fight" data-id="${id}"><i class="fa-solid fa-dice"></i> Fight a phase</button><button type="button" data-action="draw" data-id="${id}">Stop the fighting</button>`}
        ${b.phases.length || b.over ? `<button type="button" data-action="undo" data-id="${id}">Undo</button>` : ""}
        ${taken ? `<button type="button" data-action="time" data-id="${id}" title="Move the world clock by the time the battle took">Let the time pass (${esc(B.timeWords(taken - n(b.timePassed)))})</button>` : ""}
        ${b.phases.length ? "" : `<button type="button" data-action="edit" data-id="${id}">Change</button>`}
        <button type="button" data-action="remove" data-id="${id}">Remove</button></div>
      ${steps ? `<details><summary>What has happened</summary><ol reversed>${steps}</ol></details>` : ""}`;
  }

  static field(name) { return this.#instance?.element?.querySelector(`[name="${CSS.escape(name)}"]`) ?? null; }
  static async #onFight(target) {
    const el = this.#instance?.element;
    const deeds = [0, 1].map(i => {
      const s = n(el?.querySelector(`[name="deed${i}"]`)?.value), name = el?.querySelector(`[name="deedName${i}"]`)?.value ?? "";
      return s > 0 ? [{name, successes: s}] : [];
    });
    const actions = [0, 1].map(i => el?.querySelector(`[name="act${i}"]`)?.value || "melee");
    return fight(target.dataset.id, {deeds, actions});
  }
  static async #onRemove(target) {
    const b = get(target.dataset.id);
    if ( !b ) return;
    const ok = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove the battle"}, content: `<p>Remove ${esc(b.name)} from the list? Lines already in the log and the Legends book stay.</p>`, rejectClose: false});
    if ( ok ) { await remove(b.id); BattlesApp.open(null); }
  }
}

// Storyteller 0.46.0: deeds and the field's aftermath (battle-extras.mjs) use this module's store
X.bind({get, save: put, open: id => BattlesApp.open(id), ageId: b => contextOf(b).age.id});
