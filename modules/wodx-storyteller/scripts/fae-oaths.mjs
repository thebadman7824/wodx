/**
 * Fae oaths kept by the village: the Storyteller's window and what it changes in play (B7866-B7869).
 *
 *   An oath recorded here with a fae character is written onto that fae's sheet (WoDX Actions' oath list), where the
 *   Echo window rolls it as a shield. Breaking it here takes it off as a shield, posts the punishment and the Court's
 *   way with oath-breakers. Baptism washes Iron and Stone Oaths away; a town's rising (wodxTown "rising") breaks the
 *   oaths that rule it; the hetman's anger raises the town's unrest toward that rising.
 *   Household helpers: a slighted sprite or brownie stops the chores, and a spiteful one opens a Ledger consequence.
 *   Faerie food marks a mortal for a day (WoDX Actions reads it on Willpower against fae wiles).
 *   The retinue: a servant who tries to betray rolls Willpower at 10; one who raises a hand to the master takes the
 *   master's Mists in aggravated damage.
 * Rules: fae-oaths-rules.mjs. Dark Ages: Fae pp. 33-39, 67-74, 85, 94, 108-110, 183, 204; Dark Ages: Mage p. 194.
 */
import * as R from "../../wodx-rules/storyteller/fae-oaths-rules.mjs";
import * as Markets from "./markets.mjs";
import * as Towns from "./towns.mjs";
import * as Led from "./ledger.mjs";
import {MOD, esc, setting, mutate, gmIds, isActiveGM} from "./core.mjs";
import * as TERMS from "../../wodx-rules/core/terms.mjs";

const ACT = "wodx-actions";
const now = () => game.time?.worldTime ?? 0;
const combat = () => game.wodxCombat ?? game.modules.get("wodx-combat")?.api ?? null;
const all = c => [...(c ?? [])];
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function registerFaeOathSettings() {
  game.settings.register(MOD, "faeOaths", {scope: "world", config: false, type: Object, default: R.blank(), onChange: () => FaeOathsApp.refresh()});
}
export const state = () => R.normState(setting("faeOaths"));
const save = fn => mutate("faeOaths", cur => { const out = fn(R.normState(cur)); return {value: out.value, result: out.result}; });

const towns = () => { try { return Markets.state().markets.map(m => ({id: m.id, name: m.name})); } catch { return []; } };
const townName = id => towns().find(t => t.id === id)?.name ?? id ?? "";
const card = (title, html, {gm = true} = {}) => ChatMessage.create({speaker: {alias: "Fae oaths"}, ...(gm ? {whisper: gmIds()} : {}),
  content: `<div class="wodx-card wst-fae-oaths"><h3>${esc(title)}</h3>${html}</div>`});

/* ---- The fae's sheets ---- */

/** Write each oath onto its fae's sheet list, by ledgerId: added, updated, or (washed away) removed. */
async function syncSheets(oaths) {
  for ( const o of oaths ) {
    for ( const f of o.fae ) {
      const a = f.id ? game.actors.get(f.id) : null;
      if ( !a ) continue;
      const da = a.getFlag(ACT, "daFae") ?? {};
      const list = (Array.isArray(da.oaths) ? da.oaths : []).filter(x => x.ledgerId !== o.id);
      if ( o.state !== "washed" ) list.push(R.sheetOath(o));
      await a.setFlag(ACT, "daFae", {...da, oaths: list});
    }
  }
}

/* ---- Oaths ---- */

export async function saveOath(raw) {
  const o = R.normOath({...raw, made: raw?.made ?? now()});
  await save(s => ({value: {...s, oaths: [...s.oaths.filter(x => x.id !== o.id), o]}, result: o}));
  await syncSheets([o]);
  return o;
}
export async function removeOath(id) {
  const o = state().oaths.find(x => x.id === id);
  await save(s => ({value: {...s, oaths: s.oaths.filter(x => x.id !== id)}}));
  if ( o ) await syncSheets([{...o, state: "washed"}]);
}

export async function breakOath(id, side = "human", why = "") {
  const o = state().oaths.find(x => x.id === id);
  if ( !o ) return null;
  const b = R.breakOath(o, side, {why, at: now()});
  await save(s => ({value: {...s, oaths: s.oaths.map(x => (x.id === id ? b.oath : x))}}));
  await syncSheets([b.oath]);
  await card(`An oath is broken`, `<p><b>${esc(R.TIERS[o.tier].label)} ${o.rating}</b>: ${esc(o.deal)}, if ${esc(o.duty)}.</p><p>${esc(b.words)}</p>
    ${b.punishment ? `<p class="vta-big bad">The punishment: ${esc(b.punishment)}.</p>` : ""}${b.court ? `<p>${esc(b.court)}</p>` : ""}
    <p class="wodx-quiet">${R.REF} p. 110, p. ${R.COURTS[o.court].page}</p>`);
  return b;
}

export async function setInactive(id, on = true) {
  let out = null;
  await save(s => ({value: {...s, oaths: s.oaths.map(x => (x.id === id ? (out = R.inactive(x, on)) : x))}}));
  if ( out ) await syncSheets([out]);
  return out;
}

/** Someone is baptised: by actor (id) or by name. */
export async function baptise(who = {}) {
  const r = R.baptise(state().oaths, who);
  if ( !r.gone.length ) return r;
  await save(s => ({value: {...s, oaths: r.oaths}}));
  await syncSheets(r.oaths.filter(o => r.gone.includes(o.id)));
  await card(`${who.name ?? "Someone"} is baptised`, `<p>${r.gone.length} Iron or Stone Oath${r.gone.length === 1 ? "" : "s"} wash${r.gone.length === 1 ? "es" : ""} away; Gold Oaths stay.</p><p class="wodx-quiet">${R.REF} p. 108</p>`);
  return r;
}

/** A town rises: the oaths that rule it break (p. 204). */
export async function onRising(town) {
  const r = R.rising(state().oaths, town, now());
  if ( !r.gone.length ) return r;
  await save(s => ({value: {...s, oaths: r.oaths}}));
  await syncSheets(r.oaths.filter(o => r.gone.includes(o.id)));
  await card(`${townName(town)} rises`, `<p>The rising breaks ${r.gone.length} oath${r.gone.length === 1 ? "" : "s"} that ruled the village, and the fae who held ${r.gone.length === 1 ? "it lose its" : "them lose their"} shield against Echoes.</p><p class="wodx-quiet">${R.REF} p. 204</p>`);
  return r;
}

/** The hetman is angered: the town's unrest rises at once (town-rules LEVER_TOWN.hetman). */
export async function hetman(town, label = "The hetman") {
  return Towns.api().lever({kind: "hetman", town, label});
}

/* ---- Household helpers ---- */

export async function saveHelper(raw) {
  const h = R.normHelper(raw);
  await save(s => ({value: {...s, helpers: [...s.helpers.filter(x => x.id !== h.id), h]}, result: h}));
  return h;
}
export async function slightHelper(id, how) {
  const h = state().helpers.find(x => x.id === id);
  if ( !h ) return null;
  const r = R.slight(h, how, {now: now()});
  await save(s => ({value: {...s, helpers: s.helpers.map(x => (x.id === id ? r.helper : x))}}));
  let due = "";
  if ( r.spite ) {
    // A spiteful helper comes due in a week, on the Ledger
    await Led.saveEntry({kind: "consequence", from: {id: null, name: r.helper.name}, to: {id: null, name: r.helper.household || "the household"},
      what: R.HELPERS[r.helper.kind].spite, due: now() + 7 * TERMS.DAY});
    due = `<p>On the Ledger: its spite comes due in a week.</p>`;
  }
  await card(`${r.helper.name}: ${R.SLIGHTS[how] ?? how}`, `<p>${esc(r.words)}</p>${R.doesChores(r.helper) ? "" : `<p>The chores are no longer done in the night.</p>`}${due}<p class="wodx-quiet">${esc(R.HELPERS[r.helper.kind].page)}</p>`);
  return r;
}
/** Brownies back from mushrooms after their seven days. */
async function helpersBack() {
  const t = now(), back = state().helpers.filter(h => R.helperBack(h, t).mood !== h.mood);
  if ( !back.length ) return;
  await save(s => ({value: {...s, helpers: s.helpers.map(h => R.helperBack(h, t))}}));
}

/* ---- Faerie food and the retinue ---- */

export async function eatFood(actor) {
  if ( !actor ) return null;
  const flag = {at: now(), until: now() + R.FOOD.lasts};
  await actor.setFlag(ACT, "faerieFood", flag);
  await card(`${actor.name} eats faerie food`, `<p>For a day, one success fewer on Willpower rolls to resist faerie wiles.</p><p class="wodx-quiet">${R.REF} p. ${R.FOOD.page}</p>`);
  return flag;
}

const dice = async (pool, diff) => {
  const r = new Roll(`${Math.max(1, num(pool))}d10`);
  await r.evaluate();
  return {roll: r, ...TERMS.successes(r.dice.flatMap(d => d.results.map(x => x.result)), diff)};
};
const masterMists = m => num(m?.getFlag?.(ACT, "daFae")?.mists?.perm);

/** A servant tries to betray the master: Willpower at 10 (p. 94). */
export async function betray(servant, master) {
  if ( !servant ) return null;
  const r = await dice(servant.system?.advantages?.willpower?.permanent, R.RETINUE.betrayDiff);
  const ok = !r.botch && r.successes > 0;
  await card(`${servant.name} tries to betray ${master?.name ?? "the master"}`, `<p>Willpower at ${R.RETINUE.betrayDiff}: ${r.successes} success${r.successes === 1 ? "" : "es"}${r.botch ? ", a botch" : ""}.</p>
    <p class="vta-big ${ok ? "good" : "bad"}">${ok ? "They can do it, this once." : "They cannot bring themselves to it."}</p><p class="wodx-quiet">${R.REF} p. ${R.RETINUE.page}</p>`);
  return {...r, ok};
}
/** A servant tries to harm the master: blood and aggravated damage equal to the master's Mists (p. 94). */
export async function harm(servant, master) {
  if ( !servant ) return null;
  const n = R.harmDamage(masterMists(master));
  if ( n ) await combat()?.applyDamage?.(servant, "aggravated", n);
  await card(`${servant.name} raises a hand to ${master?.name ?? "the master"}`, `<p class="vta-big bad">${esc(servant.name)} vomits blood: ${n} aggravated.</p><p class="wodx-quiet">${R.REF} p. ${R.RETINUE.page}</p>`);
  return {damage: n};
}

/* ---- Hooks ---- */

export function registerFaeOathHooks() {
  Hooks.on("wodxTown", p => { if ( p?.kind === "rising" && isActiveGM() ) onRising(p.town).catch(e => console.error(`${MOD} | fae oaths`, e)); });
  Hooks.on("updateWorldTime", () => { if ( isActiveGM() ) helpersBack().catch(e => console.error(`${MOD} | fae oaths`, e)); });
}

export const api = () => ({open: () => FaeOathsApp.open(), state, saveOath, removeOath, breakOath, setInactive, baptise, rising: onRising, hetman,
  saveHelper, slightHelper, eatFood, betray, harm, rules: R});

/* ---- The window ---- */

const {ApplicationV2} = foundry.applications?.api ?? {ApplicationV2: class {}};
const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(typeof v === "string" ? v : v.label)}</option>`).join("");
const actorOpts = (filter = () => true) => `<option value="">(none)</option>` + all(game.actors).filter(filter).map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join("");
const isFae = a => !!a?.getFlag?.(ACT, "daFae");

export class FaeOathsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-fae-oaths", classes: ["wodx-app", "wst-fae-oaths"], window: {title: "Fae oaths kept by the village", resizable: true}, position: {width: 720, height: 760},
    actions: {add: FaeOathsApp.#onAdd, model: FaeOathsApp.#onModel, brk: FaeOathsApp.#onBreak, idle: FaeOathsApp.#onIdle, del: FaeOathsApp.#onDel,
      baptise: FaeOathsApp.#onBaptise, hetman: FaeOathsApp.#onHetman, helper: FaeOathsApp.#onHelper, slight: FaeOathsApp.#onSlight,
      food: FaeOathsApp.#onFood, betray: FaeOathsApp.#onBetray, harm: FaeOathsApp.#onHarm}
  };
  static #instance;
  static open() { this.#instance ??= new FaeOathsApp(); return this.#instance.render({force: true}); }
  static refresh() { if ( this.#instance?.rendered ) this.#instance.render(); }

  async _renderHTML() {
    const s = state(), T = towns();
    const tOpts = `<option value="">(no town)</option>` + T.map(t => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    const row = o => `<div class="wst-oath" data-id="${esc(o.id)}" data-search-item data-search-text="${esc(`${o.deal} ${o.duty} ${o.fae.map(f => f.name).join(" ")} ${o.humans.map(h => h.name).join(" ")}`)}">
      <div><b>${esc(R.TIERS[o.tier].label)} ${o.rating}</b> (${esc(R.COURTS[o.court].label)}${o.lordship ? ", rules the village" : ""}${o.town ? `, ${esc(townName(o.town))}` : ""}): ${esc(R.STATES[o.state])}</div>
      <div>${esc(o.fae.map(f => f.name).join(", ") || "a fae")} will ${esc(o.deal || "...")}, if ${esc(o.humans.map(h => h.name).join(", ") || "the humans")} ${esc(o.duty || "...")}.</div>
      <div class="wodx-quiet">Breaks: fae if ${esc(o.faeBreaks || "?")}; humans if ${esc(o.humanBreaks || "?")}. Shame: ${esc(o.punishFae || "?")} / ${esc(o.punishHuman || "?")}.</div>
      <div class="wodx-quiet">The village says: ${esc(R.customLine(o))}</div>
      ${R.missingParts(o).length ? `<div class="wodx-quiet">Missing: ${esc(R.missingParts(o).join(", "))}.</div>` : ""}
      ${["kept", "inactive"].includes(o.state) ? `<div class="wodx-buttons"><button type="button" data-action="brk" data-id="${esc(o.id)}" data-side="human">The humans break it</button><button type="button" data-action="brk" data-id="${esc(o.id)}" data-side="fae">The fae breaks it</button>${o.tier === "iron" ? `<button type="button" data-action="idle" data-id="${esc(o.id)}">${o.state === "inactive" ? "They can keep it again" : "A side cannot keep it (inactive)"}</button>` : ""}<button type="button" data-action="del" data-id="${esc(o.id)}">Remove</button></div>` : `<div class="wodx-buttons"><button type="button" data-action="del" data-id="${esc(o.id)}">Remove</button></div>`}</div>`;
    const helperRow = h => `<div class="wst-helper" data-id="${esc(h.id)}"><b>${esc(h.name)}</b> (${esc(R.HELPERS[h.kind].label)}${h.household ? `, ${esc(h.household)}` : ""}): ${esc(R.MOODS[h.mood])}. ${R.doesChores(h) ? esc(R.HELPERS[h.kind].does) : "No chores are done."}
      ${h.mood === "gone" ? "" : `<div class="wodx-buttons">${Object.entries(R.SLIGHTS).filter(([k]) => R.HELPERS[h.kind].slights[k]).map(([k, v]) => `<button type="button" data-action="slight" data-id="${esc(h.id)}" data-how="${k}">${esc(v)}</button>`).join("")}</div>`}</div>`;
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <section><h3>Oaths (${s.oaths.length})</h3>
        <div class="wst-oaths">${s.oaths.map(row).join("") || `<p class="wodx-quiet">No oaths recorded.</p>`}</div></section>
      <section><h3>A new oath</h3><form class="wst-oath-new">
        <div class="form-group"><label>Start from the book's village oaths</label><select name="model" data-fixed><option value="">(write it here)</option>${opts(R.MODELS, "")}</select><button type="button" data-action="model">Fill in</button></div>
        <div class="form-group"><label>Tier</label><select name="tier" data-fixed>${opts(R.TIERS, "iron")}</select></div>
        <div class="form-group"><label>Rating</label><input type="number" name="rating" min="1" max="5" value="1"></div>
        <div class="form-group"><label>Court</label><select name="court" data-fixed>${opts(R.COURTS, "spring")}</select></div>
        <p class="wodx-quiet" data-court-note></p>
        <div class="form-group"><label>The fae who swore it</label><select name="fae" data-fixed>${actorOpts(isFae)}</select><input type="text" name="faeName" placeholder="or a name"></div>
        <div class="form-group"><label>The humans</label><input type="text" name="humans" placeholder="names, comma between; the village for a Gold Oath"></div>
        <div class="form-group"><label>Town</label><select name="town" data-fixed>${tOpts}</select> <label><input type="checkbox" name="lordship"> It rules the village (a rising breaks it)</label></div>
        <div class="form-group"><label>1. The fae will</label><input type="text" name="deal"></div>
        <div class="form-group"><label>2. If the humans</label><input type="text" name="duty"></div>
        <div class="form-group"><label>3. The fae breaks it if</label><input type="text" name="faeBreaks"></div>
        <div class="form-group"><label>4. The humans break it if</label><input type="text" name="humanBreaks"></div>
        <div class="form-group"><label>5. The fae's shame</label><input type="text" name="punishFae"></div>
        <div class="form-group"><label>5. The humans' shame</label><input type="text" name="punishHuman"></div>
        <div class="form-group"><label>What the village says (a Gold Oath's custom)</label><input type="text" name="custom"></div>
        <div class="form-group"><label><input type="checkbox" name="tricked"> A Spring oath the human was tricked into keeping</label></div>
        <div class="wodx-buttons"><button type="button" data-action="add"><i class="fa-solid fa-plus"></i> Record the oath</button></div>
        <p class="wodx-quiet">${R.REF} pp. 108-110: Gold, Stone and Iron Oaths and their five parts.</p></form></section>
      <section><h3>The village</h3><form class="wst-village">
        <div class="form-group"><label>Baptised</label><select name="who" data-fixed>${actorOpts()}</select><input type="text" name="whoName" placeholder="or a name"><button type="button" data-action="baptise">Baptise</button></div>
        <div class="form-group"><label>Anger the hetman of</label><select name="town" data-fixed>${tOpts}</select><button type="button" data-action="hetman">The hetman is angered</button></div>
        <p class="wodx-quiet">Baptism washes Iron and Stone Oaths away (${R.REF} p. 108). The hetman speaks for the village, and a rising breaks the oaths that rule it (p. 204).</p></form></section>
      <section><h3>Household helpers</h3>
        <div class="wst-helpers">${s.helpers.map(helperRow).join("") || `<p class="wodx-quiet">No household helpers.</p>`}</div>
        <form class="wst-helper-new"><div class="form-group"><label>Kind</label><select name="kind" data-fixed>${opts(R.HELPERS, "sprite")}</select></div>
        <div class="form-group"><label>Name</label><input type="text" name="name"></div><div class="form-group"><label>Household</label><input type="text" name="household" placeholder="whose house or farm"></div>
        <div class="wodx-buttons"><button type="button" data-action="helper"><i class="fa-solid fa-plus"></i> Add the helper</button></div></form></section>
      <section><h3>Faerie food and the retinue</h3><form class="wst-retinue">
        <div class="form-group"><label>A mortal eats faerie food</label><select name="eater" data-fixed>${actorOpts(a => !isFae(a))}</select><button type="button" data-action="food">Eats it</button></div>
        <div class="form-group"><label>The servant</label><select name="servant" data-fixed>${actorOpts()}</select></div>
        <div class="form-group"><label>The master</label><select name="master" data-fixed>${actorOpts(isFae)}</select></div>
        <div class="wodx-buttons"><button type="button" data-action="betray">Tries to betray (Willpower at 10)</button><button type="button" data-action="harm">Raises a hand to the master</button></div>
        <p class="wodx-quiet">${esc(R.RETINUE.upkeep)} The Retinue and Sprites Backgrounds are ties on the Upkeep window. (${R.REF} pp. 85, 94, 183)</p></form></section>`;
    const f = div.querySelector(".wst-oath-new"), note = div.querySelector("[data-court-note]");
    const showCourt = () => { const C = R.COURTS[f.elements.court.value]; note.textContent = `${C.label}: ${C.style}. Breakers: ${C.punish}. (${R.REF} p. ${C.page})`; };
    f.elements.court.addEventListener("change", showCourt); showCourt();
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onModel(event, target) {
    const f = target.closest("form").elements, M = R.MODELS[f.model.value];
    if ( !M ) return;
    for ( const k of ["tier", "rating", "court", "deal", "duty", "faeBreaks", "humanBreaks", "punishFae", "punishHuman", "custom"] ) if ( f[k] ) f[k].value = M[k];
    f.humans.value = "the village";
    f.court.dispatchEvent(new Event("change"));
  }
  static async #onAdd(event, target) {
    const f = target.closest("form").elements;
    const fa = f.fae.value ? game.actors.get(f.fae.value) : null;
    const fae = fa ? [{id: fa.id, name: fa.name}] : f.faeName.value.trim() ? [{id: null, name: f.faeName.value.trim()}] : [];
    const humans = f.humans.value.split(",").map(x => x.trim()).filter(Boolean).map(n => { const a = game.actors.getName?.(n); return a ? {id: a.id, name: a.name} : {id: null, name: n}; });
    const o = {tier: f.tier.value, rating: Number(f.rating.value), court: f.court.value, fae, humans, town: f.town.value || null, lordship: f.lordship.checked, tricked: f.tricked.checked};
    for ( const k of ["deal", "duty", "faeBreaks", "humanBreaks", "punishFae", "punishHuman", "custom"] ) o[k] = f[k].value;
    const miss = R.missingParts(o);
    if ( miss.length ) return ui.notifications.warn(`An oath needs all five parts (${R.REF} p. 109). Missing: ${miss.join(", ")}.`);
    await saveOath(o);
  }
  static async #onBreak(event, target) { await breakOath(target.dataset.id, target.dataset.side); }
  static async #onIdle(event, target) { const o = state().oaths.find(x => x.id === target.dataset.id); if ( o ) await setInactive(o.id, o.state !== "inactive"); }
  static async #onDel(event, target) { await removeOath(target.dataset.id); }
  static async #onBaptise(event, target) {
    const f = target.closest("form").elements, a = f.who.value ? game.actors.get(f.who.value) : null;
    const who = a ? {id: a.id, name: a.name} : {id: null, name: f.whoName.value.trim()};
    if ( !who.name ) return ui.notifications.warn("Say who is baptised.");
    const r = await baptise(who);
    if ( !r.gone.length ) ui.notifications.info(`${who.name} is sworn to no Iron or Stone Oath here.`);
  }
  static async #onHetman(event, target) {
    const t = target.closest("form").elements.town.value;
    if ( !t ) return ui.notifications.warn("Choose the town.");
    await hetman(t);
  }
  static async #onHelper(event, target) {
    const f = target.closest("form").elements;
    await saveHelper({kind: f.kind.value, name: f.name.value, household: f.household.value});
  }
  static async #onSlight(event, target) { await slightHelper(target.dataset.id, target.dataset.how); }
  static async #onFood(event, target) { const a = game.actors.get(target.closest("form").elements.eater.value); if ( a ) await eatFood(a); }
  static async #onBetray(event, target) { const f = target.closest("form").elements; await betray(game.actors.get(f.servant.value), game.actors.get(f.master.value)); }
  static async #onHarm(event, target) { const f = target.closest("form").elements; await harm(game.actors.get(f.servant.value), game.actors.get(f.master.value)); }
}
