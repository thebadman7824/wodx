import * as SW from "./siege-works-rules.mjs";
import * as C from "./core.mjs";

/**
 * WoDX Storyteller 0.50.0: the Foundry side of the campaign around a siege (B2470-B2477), shown in the Battles
 * window for a siege. The rules are in siege-works-rules.mjs. battles.mjs calls bind() once with its own get, save
 * and open, and calls week() from its own week of siege so the campaign is part of the same step and its Undo.
 */

const {esc} = C;
const n = v => Number(v) || 0;
const opt = (o, cur) => Object.entries(o).map(([k, v]) => `<option value="${esc(k)}"${String(k) === String(cur) ? " selected" : ""}>${esc(v)}</option>`).join("");
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);

let api = {get: () => null, save: async b => b, open: () => null, context: () => ({year: 1197, branch: "classic", age: {id: "feudal"}})};
export function bind(fns) { api = {...api, ...fns}; }

/** Ten-sided faces from the world's dice source (the same one Foundry's rolls use, so gates can fix it). */
export function draw(k) {
  const rnd = globalThis.CONFIG?.Dice?.randomUniform ?? Math.random;
  // the same mapping as a Foundry 14 die face, so a gate that fixes randomUniform fixes these faces too
  return Array.from({length: Math.max(1, k)}, () => Math.min(10, Math.max(1, Math.ceil((1 - rnd()) * 10))));
}

/**
 * One week of the campaign for battles.mjs: `b0` is the siege before the week, `step` the settled week. Returns
 * the merged step, or the step unchanged when the siege has no campaign.
 */
export function week(b0, step) {
  if ( !b0?.campaign ) return step;
  const {age} = api.context(b0);
  const ctx = {ageId: age.id, men: b0.sides.map(s => s.men), works: b0.sides.map(s => s.commander.works), morale: b0.sides.map(s => s.commander.morale),
    storesLeft: step.sides[1].stores, worksSuccesses: n(step.phase?.rolls?.[0]?.successes)};
  const camp = SW.campaignWeek(b0.campaign, ctx, draw);
  return SW.mergeWeek(b0, step, camp);
}

/** Lines for the week's cards: words for everyone, numbers for the Storyteller. */
export function cardLines(b, p) {
  if ( !Array.isArray(p?.camp) || !p.camp.length ) return {words: "", dice: ""};
  return {words: p.camp.map(r => esc(r.text)).join(" "), dice: p.camp.filter(r => r.dice).map(r => `${esc(b.sides[r.who]?.name ?? "")}: ${esc(r.dice)}`).join("<br>")};
}

async function change(id, fn) {
  const b = api.get(id);
  if ( !b || b.kind !== "siege" || b.over || !game.user.isGM ) return null;
  const c = fn(SW.normCampaign(b.campaign) ?? SW.blankCampaign(b), b);
  return c ? api.save({...b, campaign: c}) : null;
}

/** The dialog that sets up the campaign: walls, food, order, the crafts and the countermine. */
export async function setupDialog(id) {
  const b = api.get(id);
  if ( !b || b.kind !== "siege" || !game.user.isGM ) return null;
  const {year, branch} = api.context(b);
  const c = SW.normCampaign(b.campaign) ?? SW.blankCampaign(b);
  const walls = {"": "(no walls)", ...Object.fromEntries(SW.wallsFor(year).map(w => [w.id, `${w.label} (soak ${w.soak}, ${w.health} health levels)`]))};
  const lines = Object.fromEntries(SW.supplyLinesFor(year, branch).map(s => [s.id, s.label]));
  const ctr = c.counter ?? {watch: true, watchPool: 5, pool: 5, fast: false};
  const side = i => `<fieldset><legend>${esc(b.sides[i].name)}: keeping order</legend>
    <div class="form-group"><label>Supply</label><select name="supply${i}" data-fixed>${opt(SW.SUPPLY_WORDS, c.order.supply[i])}</select></div>
    <div class="form-group"><label><input type="checkbox" name="paid${i}"${c.order.paid[i] ? " checked" : ""}> Well paid</label></div>
    <div class="form-group"><label>Order pool (0: the commander's Charisma + Leadership)</label><input type="number" name="opool${i}" value="${c.order.pools[i]}" min="0" max="15" style="width:4em" title="Charisma + Leadership, or Manipulation + Intimidation to rule by punishment"></div></fieldset>`;
  const content = `<p class="wodx-quiet">Spoils of War pp. 40-42 and the siege tables of pp. 33-34. Everything here is rolled with each week of siege, and Undo takes it back.</p>
    <fieldset><legend>The walls</legend>
      <div class="form-group"><label>Walls</label><select name="wall" data-fixed>${opt(walls, c.wall.type)}</select></div>
      <div class="form-group"><label>Damage taken (health levels)</label><input type="number" name="damage" value="${c.wall.damage}" min="0" max="500" style="width:5em"></div>
      <div class="form-group"><label><input type="checkbox" name="moat"${c.wall.moat ? " checked" : ""}> A ditch or moat before them (the works fill it first; rams wait)</label></div></fieldset>
    <fieldset><legend>${esc(b.sides[0].name)}: food</legend>
      <div class="form-group"><label>Supply line</label><select name="line" data-fixed>${opt(lines, c.supplyLine)}</select></div>
      <div class="form-group"><label>Camp stores (days)</label><input type="number" name="stores0" value="${c.stores0}" min="0" max="365" style="width:5em"></div>
      <div class="form-group"><label><input type="checkbox" name="forage"${c.forage.on ? " checked" : ""}> Forage each week</label></div>
      <div class="form-group"><label>Foragers</label><input type="number" name="foragers" value="${c.forage.foragers}" min="0" max="100000" style="width:6em"></div>
      <div class="form-group"><label>Forage leader's Perception + Survival</label><input type="number" name="fpool" value="${c.forage.pool}" min="1" max="15" style="width:4em"></div>
      <div class="form-group"><label>The land</label><select name="fdiff" data-fixed>${opt(SW.FORAGE_LAND, c.forage.difficulty)}</select></div></fieldset>
    <div class="form-group"><label><input type="checkbox" name="order"${c.order.on ? " checked" : ""}> Roll to keep order each week</label></div>
    ${side(0)}${side(1)}
    <fieldset><legend>Crafts and guns</legend>
      <div class="form-group"><label>Engine builders' Perception + Crafts</label><input type="number" name="craft" value="${c.craftPool}" min="1" max="15" style="width:4em"></div>
      <div class="form-group"><label>Gunners' pool (0: the commander's Intelligence + Leadership)</label><input type="number" name="gunner" value="${c.gunnerPool}" min="0" max="15" style="width:4em"></div></fieldset>
    <fieldset><legend>${esc(b.sides[1].name)}: against mines</legend>
      <div class="form-group"><label><input type="checkbox" name="watch"${ctr.watch ? " checked" : ""}> Listen for mines each day</label></div>
      <div class="form-group"><label>Listeners' Perception + Alertness</label><input type="number" name="wpool" value="${ctr.watchPool}" min="1" max="15" style="width:4em"></div>
      <div class="form-group"><label>Countermine diggers' Strength + Crafts</label><input type="number" name="cpool" value="${ctr.pool}" min="1" max="15" style="width:4em"></div>
      <div class="form-group"><label><input type="checkbox" name="fast"${ctr.fast ? " checked" : ""}> Dig without shoring (twice as fast; any failure brings it down)</label></div></fieldset>`;
  const data = await foundry.applications.api.DialogV2.prompt({window: {title: `${b.name}: the campaign`, icon: "fa-solid fa-trowel-bricks"}, position: {width: 540}, content,
    ok: {label: "Save", callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object}, rejectClose: false});
  if ( !data ) return null;
  return change(id, cur => SW.normCampaign({...cur,
    wall: {type: data.wall, damage: data.damage, moat: !!data.moat, moatFill: data.moat ? cur.wall.moatFill : 0},
    supplyLine: data.line, stores0: data.stores0,
    forage: {on: !!data.forage, foragers: data.foragers, pool: data.fpool, difficulty: data.fdiff},
    order: {on: !!data.order, supply: [data.supply0, data.supply1], paid: [!!data.paid0, !!data.paid1], pools: [n(data.opool0), n(data.opool1)]},
    craftPool: data.craft, gunnerPool: n(data.gunner),
    counter: {...(cur.counter ?? {}), watch: !!data.watch, watchPool: data.wpool, pool: data.cpool, fast: !!data.fast}}));
}

/** Start a mine toward the walls. */
export async function mineDialog(id) {
  const b = api.get(id);
  if ( !b || b.kind !== "siege" || !game.user.isGM ) return null;
  const content = `<p class="wodx-quiet">Spoils of War pp. 41-42: planned with Intelligence + Leadership, dug with Strength + Crafts each week, fired under the walls.</p>
    <div class="form-group"><label>Yards from the start to the walls</label><input type="number" name="distance" value="100" min="10" max="2000"></div>
    <div class="form-group"><label>Ground</label><select name="ground" data-fixed>${opt(Object.fromEntries(Object.entries(SW.GROUND).map(([k, g]) => [k, `${g.label} (${g.yards} yards a success)`])), "fair")}</select></div>
    <div class="form-group"><label>Bad ground for planning</label><select name="bad" data-fixed>${opt({0: "No (difficulty 6)", 1: "Somewhat (7)", 2: "Very (8)"}, 0)}</select></div>
    <div class="form-group"><label>Miners' Strength + Crafts</label><input type="number" name="pool" value="5" min="1" max="15"></div>`;
  const data = await foundry.applications.api.DialogV2.prompt({window: {title: "Dig a mine", icon: "fa-solid fa-person-digging"}, content,
    ok: {label: "Start", callback: (e, btn) => new foundry.applications.ux.FormDataExtended(btn.form).object}, rejectClose: false});
  if ( !data ) return null;
  return change(id, cur => ({...cur, mine: {distance: data.distance, ground: data.ground, badGround: data.bad, pool: data.pool, state: "planning", dug: 0},
    counter: cur.counter ? {...cur.counter, dug: 0} : null}));
}

export const addEngine = (id, type) => change(id, (c, b) => {
  const {year, branch} = api.context(b);
  if ( !SW.enginesFor(year, branch).some(e => e.id === type) ) { ui.notifications.warn("That engine is not of this age."); return null; }
  return {...c, engines: [...c.engines, {type, stage: "materials", got: 0}]};
});
export const removeEngine = (id, engineId) => change(id, c => ({...c, engines: c.engines.filter(e => e.id !== engineId)}));
/** An engine brought in already built (bought, captured or carried with the army). */
export const readyEngine = (id, engineId) => change(id, c => ({...c, engines: c.engines.map(e => (e.id === engineId ? {...e, stage: "ready", got: 0} : e))}));
export const endMine = id => change(id, c => ({...c, mine: null}));
const STAGE = {materials: "gathering materials", assemble: "being put together", ready: "ready"};
const MINE = {planning: "being planned", digging: "being dug", fired: "fired", broken: "found and broken"};

/** The campaign part of the Battles window, for a siege. */
export function render(b) {
  if ( b.kind !== "siege" ) return "";
  const id = esc(b.id);
  const c = SW.normCampaign(b.campaign);
  if ( !c ) return b.over ? "" : `<p><button type="button" data-action="campSetup" data-id="${id}" title="Foraging, keeping order, mines, engines and the walls (Spoils of War)"><i class="fa-solid fa-trowel-bricks"></i> Set up the campaign</button></p>`;
  const {year, branch} = api.context(b);
  const w = SW.wallsOf(c), m = c.mine, ctr = c.counter;
  const eng = c.engines.map(e => {
    const E = SW.ENGINES[e.type];
    return `<li>${esc(E.label)}: ${STAGE[e.stage]}${e.stage !== "ready" ? ` (${e.got} of ${E.damage})` : ""}${b.over ? "" : ` <button type="button" data-action="campEngineReady" data-id="${id}" data-engine="${esc(e.id)}"${e.stage === "ready" ? " hidden" : ""} title="Brought in already built">Ready</button>
      <button type="button" data-action="campEngineRemove" data-id="${id}" data-engine="${esc(e.id)}">Remove</button>`}</li>`;
  }).join("");
  const engineOpts = SW.enginesFor(year, branch).map(e => `<option value="${esc(e.id)}">${esc(`${e.label} (${e.damage}${e.aggravated ? "A" : "L"})`)}</option>`).join("");
  return `<details open><summary>The campaign around the siege</summary>
    <p>${w ? `${esc(w.label)}: ${w.damage} of ${w.health} health levels of damage, soak ${w.soak}.` : "No walls set."}${c.wall.moat ? ` A ditch before them, ${c.wall.moatFill >= SW.MOAT_FILL ? "filled" : `${c.wall.moatFill} of ${SW.MOAT_FILL} filled`}.` : ""}</p>
    <p>${esc(b.sides[0].name)}: ${esc(SW.SUPPLY_LINES[c.supplyLine].label)}${c.forage.on ? `, ${c.forage.foragers.toLocaleString("en")} foragers (${esc(SW.FORAGE_LAND[c.forage.difficulty].toLowerCase())})` : ""}; camp stores ${c.stores0} days.
      ${c.order.on ? `Order is rolled each week.` : ""}${b.sides.map(s => (n(s.unrest) ? ` ${esc(s.name)}: unrest +${s.unrest}.` : "")).join("")}</p>
    <p>${m ? `A mine ${MINE[m.state]}: ${m.dug} of ${m.distance} yards (${esc(SW.GROUND[m.ground].label.toLowerCase())})${m.plan ? `, ${m.plan} planning successes` : ""}${m.detected ? ", heard by the garrison" : ""}${m.state === "fired" ? `, ${m.damage} health levels to the walls` : ""}.` : "No mine."}
      ${ctr && m?.detected && m.state === "digging" ? ` Countermine: ${ctr.dug} yards${ctr.fast ? ", without shoring" : ""}.` : ""}</p>
    ${eng ? `<ul>${eng}</ul>` : ""}
    ${b.over ? "" : `<div class="wodx-buttons"><button type="button" data-action="campSetup" data-id="${id}">Change the campaign</button>
      ${!m || ["fired", "broken"].includes(m.state) ? `<button type="button" data-action="campMine" data-id="${id}">Dig a mine</button>` : `<button type="button" data-action="campMineEnd" data-id="${id}">Give up the mine</button>`}
      <select name="campEngine.${id}" data-fixed>${engineOpts}</select><button type="button" data-action="campEngine" data-id="${id}">Build an engine</button></div>`}</details>`;
}

/** The window's actions (merged into BattlesApp's). */
export const ACTIONS = {
  campSetup: (e, t) => setupDialog(t.dataset.id),
  campMine: (e, t) => mineDialog(t.dataset.id),
  campMineEnd: (e, t) => endMine(t.dataset.id),
  campEngine: (e, t) => addEngine(t.dataset.id, t.closest(".wodx-buttons")?.querySelector("select")?.value),
  campEngineReady: (e, t) => readyEngine(t.dataset.id, t.dataset.engine),
  campEngineRemove: (e, t) => removeEngine(t.dataset.id, t.dataset.engine)
};
