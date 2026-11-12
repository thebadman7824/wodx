/**
 * WoDX Storyteller 0.31.0: cook, brew or mix. Recipes for food, drink, medicine and drugs come from WoDX Library
 * (data/recipes.mjs, scripts/recipe-rules.mjs); this file is the window, the work and the waiting.
 *
 *   Actor flag wodx-storyteller.recipes   method keys the character has been taught (beyond dots and books).
 *   Scene flag wodx-storyteller.kits      kit keys the place has (a kitchen, a still, a laboratory); the Storyteller
 *                                         marks them in the window.
 *   Item flag wodx-storyteller.ripens     {at, name}: a thing standing (fermenting, curing) until the clock passes at,
 *                                         then it takes its finished name.
 *   Item flags wodx-storyteller.strength / impure   for drugs and medicine; Library's Use reads them.
 *
 * Everyday dishes are made at once with no roll when the pool is at least the difficulty; everything else is a long
 * task (an extended action, V20 pp. 251-252) that rolls as game time passes. Ingredients are used up at the start.
 */
import * as CR from "./craft-rules.mjs";
import {MOD, esc, isActiveGM, chron} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const LIB = "wodx-library";
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const all = c => (c?.contents ?? [...(c?.values?.() ?? [])]);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const money = () => game.modules.get(MOD)?.api?.upkeep?.money ?? null;
const tasksApi = () => game.modules.get(MOD)?.api?.tasks ?? null;
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const ownerIds = a => game.users.filter(u => !u.isGM && a?.testUserPermission?.(u, "OWNER")).map(u => u.id);
const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const unset = path => { const Del = globalThis.foundry?.data?.operators?.ForcedDeletion; return Del ? {[path]: new Del()} : {[path.replace(/\.([^.]+)$/, ".-=$1")]: null}; };

let L = null;
/** Library's recipe rules, goods and use rules, loaded once. */
export async function lib() {
  if ( L ) return L;
  try {
    const [R, G, U] = await Promise.all([import("../../wodx-library/scripts/recipe-rules.mjs"), import("../../wodx-library/data/goods.mjs"), import("../../wodx-library/scripts/use-rules.mjs")]);
    L = {R, G, U};
  } catch (e) { console.warn(`${MOD} | recipes need WoDX Library`, e); L = null; }
  return L;
}

/* ---------------------------------------------------------------- what the character has */

const qtyOf = it => Math.max(1, Math.floor(num(it?.flags?.["wodx-sheets"]?.qty) || 1));
export const carriedOf = a => all(a?.items).filter(i => !i.flags?.[MOD]?.ripens).map(i => ({id: i.id, name: i.name, qty: qtyOf(i)}));
export function abilitiesMap(a) {
  const out = {};
  for ( const [k, v] of Object.entries(a?.system?.abilities ?? {}) ) if ( v && typeof v === "object" ) out[k] = num(v.value);
  // Secondary Abilities kept as items (Hearth Wisdom, Herbalism) count by their name
  for ( const i of all(a?.items) ) {
    const key = String(i.name ?? "").toLowerCase().replace(/[^a-z]/g, "");
    if ( ["herbalism", "hearthwisdom", "science", "survival"].includes(key) && i.system?.value !== undefined ) out[key] = Math.max(out[key] ?? 0, num(i.system.value));
  }
  return out;
}
export const knownOf = a => (Array.isArray(a?.flags?.[MOD]?.recipes) ? a.flags[MOD].recipes : []);
export const sceneKits = (scene = canvas?.scene) => (Array.isArray(scene?.flags?.[MOD]?.kits) ? scene.flags[MOD].kits : []);
const sceneOf = a => a?.getActiveTokens?.()?.[0]?.document?.parent ?? canvas?.scene ?? null;

/** Everything the character could make in the year, with what stands in the way. */
export async function listFor(a, {using = "", year = yearNow()} = {}) {
  const l = await lib();
  if ( !l || !a ) return [];
  const {R, G} = l;
  const carried = carriedOf(a), names = carried.map(c => c.name), abilities = abilitiesMap(a), known = knownOf(a), kits = sceneKits(sceneOf(a));
  const goods = using ? R.usesOf(using, G.GOODS, year) : G.GOODS.filter(g => R.inScope(g) && (!year || (year >= g.from && year <= g.to)));
  const out = [];
  for ( const good of goods ) {
    const r = R.recipeOf(good, year);
    if ( !r.ok ) continue;
    const rec = r.recipe;
    const know = R.knows({key: rec.key, family: rec.family, ...rec}, {abilities, known, carried: names});
    const kit = R.kitReady(rec.kit, {carried: names, sceneKits: kits, year});
    const plan = R.planBatch(rec, carried, 1);
    out.push({good, recipe: rec, know, kit, plan, ready: know.ok && kit.ok && !plan.missing.length});
  }
  return out.sort((x, y) => (y.ready - x.ready) || x.good.name.localeCompare(y.good.name));
}

/* ---------------------------------------------------------------- doing it */

/** Start a recipe: checks, buys what is missing when asked, uses up the ingredients, then makes it or sets the task. */
export async function start(a, goodId, {batch = 1, buy = false} = {}) {
  if ( !a || !(game.user.isGM || a.isOwner) ) return {ok: false, why: "Only the character's owner or the Storyteller can do that."};
  const l = await lib();
  if ( !l ) return {ok: false, why: "Recipes need WoDX Library."};
  const {R, G, U} = l, y = yearNow();
  const good = G.GOODS.find(g => g.id === goodId);
  const r = R.recipeOf(good, y);
  if ( !r.ok ) return r;
  const rec = r.recipe, n = Math.max(1, Math.min(rec.batch, Math.round(num(batch)) || 1));
  const carried = carriedOf(a), names = carried.map(c => c.name), abilities = abilitiesMap(a);
  const know = R.knows(rec, {abilities, known: knownOf(a), carried: names});
  if ( !know.ok && !game.user.isGM ) return {ok: false, why: `${a.name} does not know how: ${know.why}.`};
  const kit = R.kitReady(rec.kit, {carried: names, sceneKits: sceneKits(sceneOf(a)), year: y});
  if ( !kit.ok && !game.user.isGM ) return {ok: false, why: `${cap(kit.why)}.`};
  const plan = R.planBatch(rec, carried, n);
  const bought = [];
  if ( plan.missing.length ) {
    if ( !buy ) return {ok: false, why: `Missing: ${plan.missing.map(m => `${m.n} × ${m.label}`).join(", ")}.`};
    let cost = 0;
    for ( const m of plan.missing ) {
      const g = R.membersOf(m.group, G.GOODS, y)[0];
      if ( !g ) return {ok: false, why: `No one sells ${m.label} in ${y || "this year"}.`};
      const p = await money()?.price?.(g, {count: m.n});
      cost += num(p?.total);
      bought.push(`${m.n} ${g.name}`);
    }
    if ( cost && money() ) {
      const paid = await money().pay(a, cost, {note: `Ingredients for ${good.name}`});
      if ( !paid.ok ) return {ok: false, why: `The ingredients cost ${money().format(cost)}; ${paid.text} short.`};
    }
  }
  await useUp(a, plan.take);
  const ab = R.bestAbility(rec, abilities);
  const line = U.lineOf(a.type, a.system?.settings?.variant);
  const old = y && good.to && y > good.to;
  const diff = R.diffFor(rec, {line, abilityValue: ab.value, old});
  const at = a.system?.attributes?.[rec.attr];
  const pool = num(at?.total ?? at?.value) + ab.value;
  const spent = [...plan.take.map(t => `${t.n} ${t.name}`), ...bought];
  if ( R.noRoll(rec, pool, diff) ) {
    const made = await makeItem(a, {good, makes: rec.makes, batch: n, wait: rec.wait, waitWord: rec.waitWord, leaves: rec.leaves.map(([nm, k]) => `${k * n} ${nm}`), strength: rec.strength});
    await ChatMessage.create({content: `<div class="wodx-card wst-cook"><p>${esc(a.name)} makes ${esc(n > 1 ? `${n} of ${rec.makes}` : rec.makes)} (${esc(rec.label.toLowerCase())}): everyday work, no roll needed.${rec.wait ? ` It stands ${esc(R.leftLine(rec.wait * 86400))} ${esc(rec.waitWord)}.` : ""}</p></div>`,
      speaker: ChatMessage.getSpeaker({actor: a})});
    return {ok: true, made, now: true};
  }
  const task = R.taskFor(rec, {batch: n, ability: ab.key, diff, spent});
  const t = await tasksApi()?.save?.(a, {...task, owner: {id: a.uuid, kind: "actor", name: a.name},
    note: `${task.note}${know.how === "book" ? " Worked from a book." : ""}${!know.ok ? " The Storyteller allowed it without the know-how." : ""}${!kit.ok ? " The Storyteller allowed it without the kit." : ""}`});
  return {ok: !!t, task: t, why: t ? "" : "The task could not be saved (is Long tasks over the clock on?)."};
}

async function useUp(a, take = []) {
  const del = [], upd = [];
  for ( const t of take ) {
    const it = a.items.get(t.id);
    if ( !it ) continue;
    const left = qtyOf(it) - t.n;
    if ( left > 0 ) upd.push({_id: it.id, "flags.wodx-sheets.qty": left}); else del.push(it.id);
  }
  if ( upd.length ) await a.updateEmbeddedDocuments("Item", upd);
  if ( del.length ) await a.deleteEmbeddedDocuments("Item", del);
}

/** Quality for food and drink, strength for drugs and medicine, from the successes past the goal. */
export function qualityOf(t) {
  const extra = Math.max(0, num(t.total) - num(t.goal));
  if ( t.strength ) return L?.R?.strengthFor?.(extra)?.key ?? "usual";
  return CR.qualityFor(extra).key;
}

/** Make the thing (and what the method leaves behind). Waiting things carry their standing name until ready. */
async function makeItem(a, {good, makes, batch = 1, wait = 0, waitWord = "", leaves = [], strength = false, quality = "plain", impure = false, taskId = ""}) {
  const l = await lib();
  const base = game.items?.getName?.(makes);
  const data = base ? base.toObject() : {name: makes, type: "Item"};
  delete data._id;
  let finalName = data.name;
  const extra = {};
  if ( strength ) {
    if ( quality === "weak" || quality === "strong" ) finalName = `${finalName} (${quality})`;
    extra.strength = quality === "plain" ? "usual" : quality;
    if ( impure ) extra.impure = true;
  } else if ( quality && quality !== "plain" ) {
    const q = CR.QUALITY.find(x => x.key === quality);
    if ( q ) { finalName = `${finalName} (${q.label.toLowerCase()})`; Object.assign(extra, {quality: q.key, qualityLabel: q.label, priceFactor: q.price, ...(q.diff ? {diffWhenUsed: q.diff} : {})}); }
  }
  data.name = wait ? l.R.waitingName(finalName, waitWord) : finalName;
  data.flags = {...(data.flags ?? {}), [LIB]: {...(data.flags?.[LIB] ?? {}), ...(good?.id ? {good: good.id} : {})},
    "wodx-sheets": {...(data.flags?.["wodx-sheets"] ?? {}), ...(batch > 1 ? {qty: batch} : {})},
    [MOD]: {...(data.flags?.[MOD] ?? {}), ...(taskId ? {madeBy: taskId} : {}), owner: {id: a.uuid, kind: "actor", name: a.name}, ...extra,
      ...(wait ? {ripens: {at: now() + wait * 86400, name: finalName}} : {})}};
  const out = [data];
  for ( const line of leaves ) {
    const m = /^(\d+)\s+(.+)$/.exec(line);
    if ( !m ) continue;
    const g = l.G.GOODS.find(x => x.name === m[2]);
    out.push({name: m[2], type: "Item", flags: {[LIB]: g ? {good: g.id} : {}, "wodx-sheets": Number(m[1]) > 1 ? {qty: Number(m[1])} : {}, [MOD]: taskId ? {madeBy: taskId} : {}}});
  }
  return a.createEmbeddedDocuments("Item", out);
}

/** A recipe task is done: make it. Called from the long-task tick. */
export async function finishRecipe(a, t) {
  await lib();
  const good = L?.G?.GOODS?.find(g => g.id === t.good) ?? null;
  return makeItem(a, {good, makes: t.makes, batch: t.batch, wait: t.wait, waitWord: t.waitWord, leaves: t.leaves, strength: t.strength,
    quality: qualityOf(t), impure: t.impure, taskId: t.id});
}

/** Teach a character a method (a finished training task, or the Storyteller's word). */
export async function teach(a, key) {
  if ( !a || !key ) return null;
  const list = [...new Set([...knownOf(a), key])];
  return a.update({[`flags.${MOD}.recipes`]: list});
}
export async function unteach(a, key) {
  return a?.update?.({[`flags.${MOD}.recipes`]: knownOf(a).filter(k => k !== key)});
}

/** Mark the kits a scene has. */
export async function setSceneKits(scene, kits = []) {
  const l = await lib();
  if ( !game.user.isGM || !scene || !l ) return null;
  return scene.update({[`flags.${MOD}.kits`]: kits.filter(k => l.R.KITS[k] && k !== "none")});
}

/* ---------------------------------------------------------------- things that stand */

let ripening = false;
/** On the Storyteller's client: things whose time has come take their finished names. */
export async function ripen() {
  if ( ripening || !isActiveGM() ) return [];
  ripening = true;
  const out = [];
  try {
    const t0 = now();
    for ( const a of game.actors ) {
      const due = all(a.items).filter(i => i.flags?.[MOD]?.ripens && num(i.flags[MOD].ripens.at) <= t0);
      if ( !due.length ) continue;
      await a.updateEmbeddedDocuments("Item", due.map(i => ({_id: i.id, name: i.flags[MOD].ripens.name || i.name.replace(/\s*\([^)]*\)$/, ""), ...unset(`flags.${MOD}.ripens`)})));
      const names = due.map(i => i.flags[MOD].ripens.name || i.name);
      await ChatMessage.create({content: `<div class="wodx-card wst-cook"><h3>${esc(a.name)}: ready</h3><ul data-fixed>${names.map(n => `<li>${esc(n)}</li>`).join("")}</ul></div>`,
        whisper: [...new Set([...gmIds(), ...ownerIds(a)])], speaker: {alias: "Ready"}});
      out.push({actor: a.id, names});
    }
  } finally { ripening = false; }
  return out;
}

export function registerCookHooks() {
  Hooks.on("updateWorldTime", () => { try { if ( chron()?.isSkipping?.() ) return; } catch (e) { /* no Chronicle */ } ripen().catch(e => console.error(`${MOD} | ripen`, e)); });
  Hooks.on("wodxSkipEnd", () => { ripen().catch(e => console.error(`${MOD} | ripen`, e)); });
}

/* ---------------------------------------------------------------- the window */

const myActors = () => all(game.actors).filter(a => game.user.isGM ? a.hasPlayerOwner || a.type === "character" || a.isOwner : a.isOwner).filter(a => !/group/i.test(String(a.type ?? "")));
const FAMILY_TABS = [["", "Everything"], ["food", "Food"], ["drink", "Drink"], ["medicine", "Medicine"], ["drugs", "Drugs"]];

/** Cook, brew or mix: pick who, then what. using: a thing's name, to show only recipes that use it. */
export async function cookDialog(actor = null, {using = ""} = {}) {
  const l = await lib();
  if ( !l ) return ui.notifications.warn("Recipes need WoDX Library.");
  let a = actor;
  if ( !a ) {
    const list = myActors();
    if ( !list.length ) return ui.notifications.warn("No character to cook, brew or mix.");
    a = list.find(x => x.id === game.user.character?.id) ?? (list.length === 1 ? list[0] : null);
    if ( !a ) {
      const id = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Cook, brew or mix"}, classes: ["wodx-dialog"],
        content: `<div class="form-group"><label>Who</label><select name="actor" data-fixed>${list.map(x => opt(x.id, x.name, false)).join("")}</select></div>`,
        buttons: [{action: "go", label: "Next", default: true, callback: (e, b) => b.form.elements.actor.value}, {action: "cancel", label: "Cancel"}]});
      a = game.actors.get(id);
      if ( !a ) return null;
    }
  }
  const {R} = l, y = yearNow();
  const rows = await listFor(a, {using, year: y});
  const kitsHere = sceneKits(sceneOf(a));
  const row = x => {
    const r = x.recipe;
    const why = [!x.know.ok ? x.know.why : "", !x.kit.ok ? x.kit.why : "", x.plan.missing.length ? `missing ${x.plan.missing.map(m => `${m.n} × ${m.label}`).join(", ")}` : ""].filter(Boolean).join("; ");
    const uses = r.needs.length ? r.needs.map(n => `${n.n} × ${n.label}`).join(", ") : "nothing but the kit";
    const time = r.everyday ? "everyday work" : `${r.goal} success${r.goal === 1 ? "" : "es"}, a roll ${r.interval === "hour" ? "an hour" : r.interval === "day" ? "a day" : "a week"}`;
    return `<tr data-kind="${esc(x.good.kind)}" data-search-text="${esc(`${x.good.name} ${r.label} ${uses}`)}" class="${x.ready ? "" : "wodx-quiet"}">
      <td><input type="radio" name="good" value="${esc(x.good.id)}" data-batch="${r.batch}"></td>
      <td><b>${esc(cap(x.good.name))}</b><br><small>${esc(r.label)}; ${esc(R.abLabel(r.ab[0]))}, ${esc(time)}${r.wait ? `; stands ${esc(R.leftLine(r.wait * 86400))} ${esc(r.waitWord)}` : ""}</small></td>
      <td><small>Uses ${esc(uses)}. ${esc(cap(R.kitForm(r.kit, y)))}.</small>${why ? `<br><small class="wst-cook-why">${esc(cap(why))}.</small>` : ""}</td></tr>`;
  };
  const kitBoxes = game.user.isGM ? `<details><summary>Kits on this scene (Storyteller)</summary><div class="wst-cook-kits">${Object.entries(R.KITS).filter(([k]) => k !== "none")
    .map(([k, v]) => `<label><input type="checkbox" name="kit" value="${esc(k)}"${kitsHere.includes(k) ? " checked" : ""}> ${esc(v.label)}</label>`).join("<br>")}</div></details>` : "";
  const teachBox = game.user.isGM ? `<details><summary>Teach ${esc(a.name)} a recipe (Storyteller)</summary><select name="teach" data-fixed>${opt("", "Nothing", true)}${R.METHODS.map(m => opt(m.key, `${m.label}${knownOf(a).includes(m.key) ? " (known)" : ""}`, false)).join("")}</select></details>` : "";
  const content = `<p>What ${esc(a.name)} can make in ${y || "this year"}${using ? ` with ${esc(using)}` : ""}. Ingredients are used up when the work starts. Everyday dishes need no roll when the dice are at least the difficulty; the rest is an extended action that rolls as time passes (house rules). Greyed recipes say what is missing.</p>
    <div class="form-group"><label>Show</label><select name="tab" data-fixed>${FAMILY_TABS.map(([k, label]) => opt(k, label, !k)).join("")}</select></div>
    ${searchBox("table.wst-cook-t", "Search recipes…", "Search recipes")}
    <div class="wst-scroll" style="max-height: 420px; overflow-y: auto;"><table class="wst-cook-t"><tbody>${rows.map(row).join("") || `<tr><td class="wodx-quiet">Nothing ${using ? "uses that" : "can be made"} in this year.</td></tr>`}</tbody></table></div>
    <div class="form-group"><label>How many</label><input type="number" name="batch" value="1" min="1" max="100"></div>
    <div class="form-group"><label>Buy what is missing</label><input type="checkbox" name="buy"></div>
    ${kitBoxes}${teachBox}`;
  const render = (ev, dlg) => {
    const el = dlg?.element ?? ev?.target?.element;
    const tab = el?.querySelector?.("[name=tab]");
    tab?.addEventListener("change", () => { for ( const tr of el.querySelectorAll("tr[data-kind]") ) tr.style.display = !tab.value || tr.dataset.kind === tab.value ? "" : "none"; });
    for ( const r of el?.querySelectorAll?.("input[name=good]") ?? [] ) r.addEventListener("change", () => { const b = el.querySelector("[name=batch]"); if ( b ) b.max = r.dataset.batch; });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render, position: {width: 720}, window: {title: `Cook, brew or mix: ${a.name}`, resizable: true}, classes: ["wodx-dialog", "wst-cook-dlg"],
    content, buttons: [{action: "go", label: "Start", default: true, callback: (e, b) => {
      const f = b.form;
      return {good: f.querySelector("input[name=good]:checked")?.value ?? "", batch: num(f.elements.batch?.value) || 1, buy: !!f.elements.buy?.checked,
        kits: [...f.querySelectorAll("input[name=kit]:checked")].map(x => x.value), kitsShown: !!f.querySelector("input[name=kit]"), teach: f.elements.teach?.value ?? ""};
    }}, {action: "cancel", label: "Close"}]});
  if ( !res || typeof res !== "object" ) return null;
  if ( game.user.isGM && res.kitsShown ) {
    const sc = sceneOf(a);
    if ( sc && JSON.stringify([...res.kits].sort()) !== JSON.stringify([...kitsHere].sort()) ) await setSceneKits(sc, res.kits);
  }
  if ( game.user.isGM && res.teach ) { await teach(a, res.teach); ui.notifications.info(`${a.name} now knows: ${R.METHODS.find(m => m.key === res.teach)?.label ?? res.teach}.`); }
  if ( !res.good ) return null;
  const r = await start(a, res.good, {batch: res.batch, buy: res.buy});
  if ( !r.ok ) ui.notifications.warn(r.why);
  else if ( !r.now ) ui.notifications.info(`${r.task.name} is under way.`);
  return r;
}

export const cookApi = () => ({open: cookDialog, list: listFor, start, teach, unteach, known: knownOf, kits: sceneKits, setKits: setSceneKits, ripen, finish: finishRecipe, lib});
