/**
 * WoDX Storyteller 0.25.0: who owns what, holdings and their upkeep, making things from a recipe, putting up a
 * building, and the workshops that feed the markets. The rules are in owner-rules.mjs, craft-rules.mjs and
 * build-rules.mjs.
 *
 *   flags.wodx-storyteller.owner     on an Item, a Tile (a container), a Scene or a Region: the owner record.
 *   flags.wodx-storyteller.property  on a Scene or a Region: {type (a build-rules kind), built (year), value, upkeep,
 *                                    income, makes (a goods category it supplies)}; value, upkeep and income
 *                                    left out follow the kind and the wage of the year.
 *
 * Taking things from someone's container marks them stolen from that owner (Interactables calls wodxItemsTaken on
 * the Storyteller's client). A holding's upkeep and income are paid on the month's pay day with the allowance.
 * Owning never adds Background dots: the Storyteller awards them or the player buys them (B850).
 */
import * as O from "./owner-rules.mjs";
import * as CR from "./craft-rules.mjs";
import * as B from "./build-rules.mjs";
import * as MR from "./money-rules.mjs";
import * as MK from "./market-rules.mjs";
import {MOD, esc, isActiveGM, isPC, chron, log} from "./core.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const NPC = "wodx-npc";
const gmIds = () => game.users.filter(u => u.isGM).map(u => u.id);
const now = () => game.time?.worldTime ?? 0;
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const yearNow = () => { try { return Number(chron()?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const all = c => (c?.contents ?? [...(c?.values?.() ?? [])]);
const money = () => game.modules.get(MOD)?.api?.upkeep?.money ?? null;
const markets = () => game.modules.get(MOD)?.api?.upkeep?.markets ?? null;
const npcFactions = () => { try { return game.modules.get(NPC)?.api?.factions ?? null; } catch (e) { return null; } };
const region = () => { try { return game.settings.get(MOD, "moneyRegion") || "moravian"; } catch (e) { return "moravian"; } };
const wageNow = () => MR.wageAt(yearNow(), region());
const fmt = v => { const m = money(); return m ? m.format(v) : String(v); };

/* ---------------- Owner records ---------------- */

export const ownerOf = doc => O.normOwner(doc?.flags?.[MOD]?.owner);
export const propertyOf = doc => { const p = doc?.flags?.[MOD]?.property; return p && typeof p === "object" ? p : null; };

/** Everyone who can own: actors, then WoDX NPC factions. */
export function candidates() {
  const out = all(game.actors).filter(a => !/group/i.test(String(a.type ?? ""))).map(a => ({id: a.uuid, name: a.name, kind: "actor"}));
  for ( const f of npcFactions()?.state?.()?.factions ?? [] ) out.push({id: O.factionKey(f.id), name: f.name, kind: "faction"});
  return out;
}
export const recordFor = a => (a ? O.normOwner({id: a.uuid, kind: "actor", name: a.name}) : null);

/** What an actor stands for: itself and the factions it belongs to or leads. */
export function viewerFor(a) {
  const fs = (npcFactions()?.state?.()?.factions ?? []).filter(f => f.members?.includes(a?.id) || f.leader === a?.id).map(f => f.id);
  return {ids: a ? [a.uuid] : [], factions: fs, names: a ? [a.name] : []};
}

export async function setOwner(doc, rec) {
  if ( !doc?.update || !(game.user.isGM || doc.isOwner) ) return null;
  const r = O.normOwner(rec);
  await doc.update(r ? {[`flags.${MOD}.owner`]: r} : {[`flags.${MOD}.-=owner`]: null});
  return r;
}

/** The place (a tagged Region, else the scene) a point is in. */
function placeAt(scene, p) {
  for ( const r of all(scene?.regions) ) {
    if ( !ownerOf(r) && !r.flags?.[NPC]?.place?.owner ) continue;
    let inside = false;
    try { inside = !!r.testPoint?.({x: p.x, y: p.y, elevation: 0}) || !!r.object?.testPoint?.({x: p.x, y: p.y}, 0); } catch (e) { inside = false; }
    if ( inside ) return r;
  }
  return scene ?? null;
}

/** Whose a container or a place is: its own record, else the place it stands in, else the older place tag's name. */
export function ownerRecordAt(doc) {
  if ( !doc ) return null;
  const own = ownerOf(doc);
  if ( own ) return own;
  const scene = doc.documentName === "Scene" ? doc : doc.parent;
  const centre = doc.documentName === "Tile" ? {x: num(doc.x) + num(doc.width) / 2, y: num(doc.y) + num(doc.height) / 2}
    : doc.documentName === "Wall" && Array.isArray(doc.c) ? {x: (doc.c[0] + doc.c[2]) / 2, y: (doc.c[1] + doc.c[3]) / 2} : null;
  const place = doc.documentName === "Region" ? doc : centre ? placeAt(scene, centre) : scene;
  const rec = ownerOf(place) ?? (place && place !== doc ? ownerOf(scene) : null);
  if ( rec ) return rec;
  return O.fromPlaceTag(place?.flags?.[NPC]?.place ?? scene?.flags?.[NPC]?.place, candidates());
}

/** For the Interact window: "yours", "someone's" or "". */
export const whose = (doc, actor) => O.whose(ownerRecordAt(doc), viewerFor(actor));

/** Storyteller's client: things were taken from a container. Marks them stolen, or owned when they are the taker's. */
export async function onItemsTaken({actor, items = [], doc = null} = {}) {
  if ( !isActiveGM() || !actor || !items.length ) return null;
  const rec = ownerRecordAt(doc);
  if ( !rec ) return null;
  const viewer = viewerFor(actor);
  const mine = O.isOwner(rec, viewer);
  const mark = mine ? {...rec, stolen: false} : O.markTaken(rec, {id: actor.uuid, name: actor.name, factions: viewer.factions}, now());
  const docs = items.map(id => actor.items?.get?.(id)).filter(Boolean);
  if ( !docs.length ) return null;
  await actor.updateEmbeddedDocuments("Item", docs.map(i => ({_id: i.id, [`flags.${MOD}.owner`]: mark})));
  if ( !mine ) {
    await log({kind: "theft", actor: isPC(actor) ? actor.id : null, name: actor.name, text: `${actor.name} took ${docs.map(i => i.name).join(", ")}, which belong${docs.length === 1 ? "s" : ""} to ${rec.name || "someone"}.`});
    await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Belongings"}, content: `<div class="wodx-card wst-owners"><h3>Taken without leave</h3>
      <p>${esc(actor.name)} took ${esc(docs.map(i => i.name).join(", "))}. ${docs.length === 1 ? "It belongs" : "They belong"} to ${esc(rec.name || "someone")} and ${docs.length === 1 ? "is" : "are"} marked as stolen until handed back, sold to a fence or given away.</p></div>`});
  }
  return mark;
}

/** An item honestly changes hands (sold, given, fenced): the new owner, no stolen mark. to: an actor or null. */
export async function handOver(item, to = null, {fenced = false} = {}) {
  if ( !item?.update || !game.user.isGM ) return null;
  const rec = to ? O.handOver(ownerOf(item), recordFor(to), {year: yearNow()}) : null;
  await item.update(rec ? {[`flags.${MOD}.owner`]: rec} : {[`flags.${MOD}.-=owner`]: null});
  if ( fenced ) await log({kind: "theft", name: item.parent?.name ?? "", text: `${item.name} was sold to a fence; it is nobody's stolen goods now.`});
  return rec;
}

/** Back with its owner: an item marked stolen that lands on its owner's sheet is theirs again. */
function onPreCreateItem(item, data) {
  const rec = O.normOwner(data?.flags?.[MOD]?.owner);
  const a = item?.parent;
  if ( !rec?.stolen || !a || a.documentName !== "Actor" ) return;
  if ( O.isOwner(rec, viewerFor(a)) ) item.updateSource({[`flags.${MOD}.owner`]: {...rec, stolen: false, takenBy: "", takenByName: "", takenAt: null}});
}

/** Everything marked stolen that a character carries. */
export function stolenGoods() {
  const out = [];
  for ( const a of all(game.actors) ) for ( const i of all(a.items) ) { const r = ownerOf(i); if ( r?.stolen ) out.push({actor: a, item: i, owner: r}); }
  return out;
}

/* ---------------- Holdings ---------------- */

/** Every owned place: scenes and Regions with an owner record or a property entry. */
export function holdings() {
  const out = [];
  const add = (doc, scene) => {
    const owner = ownerOf(doc), prop = propertyOf(doc);
    if ( !owner && !prop ) return;
    const p = prop ?? {};
    const m = B.holdingMoney(p.type, wageNow(), {value: Number.isFinite(p.value) ? p.value : null, upkeep: Number.isFinite(p.upkeep) ? p.upkeep : null, earns: Number.isFinite(p.income) ? p.income : null});
    out.push({doc, scene, owner, prop: p, kind: B.BUILDINGS[p.type]?.label ?? doc.flags?.[NPC]?.place?.kind ?? "Place", ...m});
  };
  for ( const s of all(game.scenes) ) { add(s, s); for ( const r of all(s.regions) ) add(r, s); }
  return out;
}
export const holdingsOf = viewer => holdings().filter(h => h.owner && O.isOwner(h.owner, viewer));

/** The month's upkeep and income for one actor's holdings, paid with the allowance. Returns {net, lines} or null. */
export async function payHoldings(a, months = 1) {
  const m = money();
  if ( !m || !months ) return null;
  const mine = holdings().filter(h => h.owner?.kind === "actor" && h.owner.id === a.uuid);
  if ( !mine.length ) return null;
  const net = mine.reduce((s, h) => s + h.income - h.upkeep, 0) * months;
  if ( net > 0 ) await m.receive(a, net, {to: "bank", note: `Holdings for ${months} month${months === 1 ? "" : "s"}`});
  else if ( net < 0 ) {
    const r = await m.pay(a, -net, {atHome: true, credit: true, note: `Upkeep of holdings for ${months} month${months === 1 ? "" : "s"}`});
    if ( !r.ok ) await log({kind: "money", actor: isPC(a) ? a.id : null, name: a.name, attention: "Upkeep unpaid", text: `${a.name} cannot pay the upkeep of ${mine.map(h => h.doc.name).join(", ")} (${r.text} short).`});
  }
  return {net, text: `${net >= 0 ? "holdings brought in" : "holdings cost"} ${fmt(Math.abs(net))}`, lines: mine.map(h => h.doc.name)};
}

/** Tag a scene or a Region as a holding. data: {owner record, held, since, type, makes, value, upkeep, income}. */
export async function saveHolding(doc, data = {}) {
  if ( !game.user.isGM || !doc?.update ) return null;
  const rec = O.normOwner({...(data.owner ?? {}), held: data.held, since: data.since});
  const n = v => (v === "" || v === null || v === undefined || !Number.isFinite(Number(v)) ? undefined : Math.round(Number(v)));
  const prop = {type: B.BUILDINGS[data.type] ? data.type : "", built: n(data.built), makes: CR.CRAFTS[data.makes] ? data.makes : "",
    value: n(data.value), upkeep: n(data.upkeep), income: n(data.income)};
  for ( const k of Object.keys(prop) ) if ( prop[k] === undefined || prop[k] === "" ) delete prop[k];
  const upd = {[`flags.${MOD}.property`]: prop};
  upd[rec ? `flags.${MOD}.owner` : `flags.${MOD}.-=owner`] = rec;
  // Keep WoDX NPC's place tag in step, so routines know whose it is
  const tag = doc.flags?.[NPC]?.place;
  if ( rec && (!tag || tag.owner !== rec.name) ) upd[`flags.${NPC}.place`] = {kind: tag?.kind || B.BUILDINGS[prop.type]?.place || "home", owner: rec.name, private: tag?.private ?? true};
  await doc.update(upd);
  return {owner: rec, prop};
}

/* ---------------- Recipes ---------------- */

let goodsMod = null;
async function goodsData() {
  if ( !goodsMod ) { try { goodsMod = await import("../../wodx-library/data/goods.mjs"); } catch (e) { goodsMod = {GOODS: [], valueAt: () => 0}; } }
  return goodsMod;
}
/** The goods that can be made in the year, with their recipes. */
export async function makeable(year = yearNow()) {
  const G = await goodsData();
  const known = G.GOODS.filter(g => year >= g.from && year <= g.to).map(g => g.name);
  return G.GOODS.map(g => ({good: g, r: CR.recipeFor(g, year, {valueAt: G.valueAt, known})})).filter(x => x.r.ok);
}

/** Start making a good: materials come out of the character's things, or are bought when buy is set. */
export async function startCraft(a, goodId, {buy = false} = {}) {
  if ( !a || !(game.user.isGM || a.isOwner) ) return {ok: false, why: "Only the character's owner or the Storyteller can do that."};
  const G = await goodsData(), y = yearNow();
  const good = G.GOODS.find(g => g.id === goodId);
  const known = G.GOODS.filter(g => y >= g.from && y <= g.to).map(g => g.name);
  const r = CR.recipeFor(good, y, {valueAt: G.valueAt, known});
  if ( !r.ok ) return r;
  const carried = all(a.items).map(i => i.name);
  const got = CR.gatherMaterials(r.task.materials, carried, {buy});
  if ( got.missing.length ) return {ok: false, why: `Needs ${got.missing.join(", ")}, carried or bought.`};
  const m = money();
  if ( got.buy.length && m ) {
    let cost = 0;
    for ( const name of got.buy ) { const g = G.GOODS.find(x => x.name === name); if ( g ) cost += MR.priceOf({...g, value: G.valueAt(g, y)}, y, region()); }
    const paid = await m.pay(a, cost, {note: `Materials for ${good.name}`});
    if ( !paid.ok ) return {ok: false, why: `The materials cost ${fmt(cost)}; ${paid.text} short.`};
  }
  const used = [];
  for ( const name of got.take ) { const it = all(a.items).find(i => i.name === name && !used.includes(i.id)); if ( it ) used.push(it.id); }
  if ( used.length ) await a.deleteEmbeddedDocuments("Item", used);
  const save = game.modules.get(MOD)?.api?.tasks?.save;
  const t = await save?.(a, {...r.task, spent: [...got.take, ...got.buy], owner: recordFor(a), note: `${r.task.note}${r.why ? ` ${CR_cap(r.why)}.` : ""}`});
  return {ok: !!t, task: t, why: t ? "" : "The task could not be saved."};
}
const CR_cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());

/** A finished recipe: how well it came out, for the item and the card. */
export function finishCraft(task) {
  const extra = Math.max(0, num(task.total) - num(task.stages?.length ? 0 : task.goal));
  const q = CR.qualityFor(extra);
  return {quality: q.key, label: q.label, flags: {quality: q.key, qualityLabel: q.label, priceFactor: q.price, ...(q.diff ? {diffWhenUsed: q.diff} : {})}};
}

/* ---------------- Buildings ---------------- */

const factionById = id => (npcFactions()?.state?.()?.factions ?? []).find(f => f.id === id) ?? null;

/** Dice for a faction's build: its Resources and Retainers (house rule), plus the workers. */
export const factionPool = id => { const f = factionById(id); return f ? num(f.assets?.resources) + num(f.assets?.retainers) : 0; };

/** Start a building. builder: the actor whose task it is; for a faction's build, its leader. */
export async function startBuild(builder, key, {workers = 0, faction = null, sceneId = null, name = ""} = {}) {
  if ( !builder || !(game.user.isGM || builder.isOwner) ) return {ok: false, why: "Only the builder's owner or the Storyteller can do that."};
  if ( faction && !game.user.isGM ) return {ok: false, why: "Only the Storyteller starts a faction's building."};
  const f = faction ? factionById(faction) : null;
  const owner = f ? O.normOwner({id: O.factionKey(f.id), kind: "faction", name: f.name}) : recordFor(builder);
  const r = B.buildTask(key, yearNow(), {wage: wageNow(), workers, owner, scene: sceneId ?? canvas?.scene?.id ?? "", name});
  if ( !r.ok ) return r;
  const right = O.tradeRightAt(yearNow());
  if ( !f && !right.ok && ["workplace", "market", "tavern"].includes(B.BUILDINGS[key].place) ) return {ok: false, why: right.how};
  const t = await game.modules.get(MOD)?.api?.tasks?.save?.(builder, {...r.task, faction: f?.id ?? "", ...(f ? {attr: "strength", ability: ""} : {})});
  return {ok: !!t, task: t, why: t ? "" : "The task could not be saved."};
}

/** Pay for the stage about to start. A faction's build draws on its Resources, not a purse. Returns {ok, why}. */
export async function payStage(a, t) {
  const st = t.stages?.[t.stage];
  if ( !st || !st.cost || t.faction ) return {ok: true, paid: 0};
  const m = money();
  if ( !m ) return {ok: true, paid: 0};
  const r = await m.pay(a, st.cost, {atHome: true, note: `${t.name}: ${st.name.toLowerCase()}`});
  return r.ok ? {ok: true, paid: st.cost} : {ok: false, why: `the money for the ${st.name.toLowerCase()} (${fmt(st.cost)}; ${r.text} short)`};
}

/** A kit scene for a building kind: a world scene or a compendium scene flagged wodx-storyteller.kit. */
async function kitScene(kit) {
  if ( !kit ) return null;
  const s = all(game.scenes).find(x => x.flags?.[MOD]?.kit === kit);
  if ( s ) return s.toObject();
  for ( const p of all(game.packs).filter(x => x.documentName === "Scene") ) {
    try {
      const idx = await p.getIndex({fields: [`flags.${MOD}.kit`]});
      const hit = [...idx].find(e => e.flags?.[MOD]?.kit === kit);
      if ( hit ) return (await p.getDocument(hit._id))?.toObject() ?? null;
    } catch (e) { /* a pack that will not open */ }
  }
  return null;
}

/** The last stage is done: the place exists. Returns {region, scene} uuids. */
export async function finishBuild(a, t) {
  const b = B.BUILDINGS[t.building];
  if ( !b ) return {};
  const scene = game.scenes.get(t.scene) ?? canvas?.scene ?? null;
  const owner = O.normOwner({...(t.owner ?? recordFor(a)), held: O.defaultTenure(yearNow(), b.place, {supernatural: b.place === "haven"}), since: yearNow()});
  const prop = {type: t.building, built: yearNow(), ...(B.WORKS[t.building] ? {makes: B.WORKS[t.building]} : {})};
  const tag = {kind: b.place, owner: owner?.name ?? a.name, private: true};
  const label = `${owner?.name ?? a.name}: ${b.label.toLowerCase()}`;
  const out = {};
  if ( scene ) {
    const g = scene.grid?.size ?? 100, w = g * 6, h = g * 6;
    const cx = Math.round((scene.width ?? 4000) / 2 - w / 2), cy = Math.round((scene.height ?? 3000) / 2 - h / 2);
    try {
      const [r] = await scene.createEmbeddedDocuments("Region", [{name: label, color: "#b08d57",
        shapes: [{type: "rectangle", x: cx, y: cy, width: w, height: h, rotation: 0, hole: false}],
        flags: {[NPC]: {place: tag}, [MOD]: {owner, property: prop, builtBy: t.id}}}]);
      out.region = r?.uuid ?? null;
    } catch (e) { console.error(`${MOD} | building region`, e); }
  }
  const kit = await kitScene(b.kit);
  if ( kit ) {
    delete kit._id;
    kit.name = label;
    kit.flags = {...(kit.flags ?? {}), [NPC]: {...(kit.flags?.[NPC] ?? {}), place: tag}, [MOD]: {...(kit.flags?.[MOD] ?? {}), kit: null, owner, property: prop, builtBy: t.id}};
    try { const s = await Scene.create(kit); out.scene = s?.uuid ?? null; } catch (e) { console.error(`${MOD} | building kit`, e); }
  }
  if ( t.faction && out.region ) {
    try { await npcFactions()?.mutate?.(st => ({state: npcFactions().rules.applyChanges(st, [{op: "place", place: out.region, to: t.faction}], {now: now()}).state, result: true})); } catch (e) { console.error(`${MOD} | faction place`, e); }
  }
  await log({kind: "task", actor: isPC(a) ? a.id : null, name: a.name, text: `${label} stands finished${out.scene ? " (its map is ready)" : ""}.`});
  return out;
}

/** Undo of a finished build: the Region and the kit scene it made go again. */
export async function unbuild(made = {}) {
  for ( const id of [made.region, made.scene].filter(Boolean) ) { try { await (await fromUuid(id))?.delete?.(); } catch (e) { /* gone */ } }
}

/* ---------------- Workshops and the markets ---------------- */

/**
 * Once a month: a market whose working places supply a category does not run short of it. One working place lifts
 * a short or empty supply to normal; three or more make it plenty (house rule, B855). A private workshop run by a
 * person is closed while private trade is forbidden (1948-1989); one held by a faction (the state) still works.
 */
export async function workshopsMonth() {
  const mk = markets();
  if ( !isActiveGM() || !mk ) return null;
  const right = O.tradeRightAt(yearNow());
  const st = mk.state();
  const count = {};
  for ( const h of holdings() ) {
    const cat = h.prop.makes || B.WORKS[h.prop.type];
    if ( !cat || !h.owner ) continue;
    if ( !right.ok && h.owner.kind !== "faction" ) continue;
    const m = MK.marketOfScene(st, h.scene.id);
    if ( !m ) continue;
    (count[m.id] ??= {})[cat] = (count[m.id][cat] ?? 0) + 1;
  }
  const changes = [];
  for ( const [id, cats] of Object.entries(count) ) {
    const m = MK.marketById(st, id);
    const supply = {};
    for ( const [cat, n] of Object.entries(cats) ) {
      const was = MK.supplyOf(m, cat);
      const want = n >= 3 ? "plenty" : "normal";
      if ( (was === "none" || was === "short") || (want === "plenty" && was === "normal") ) { supply[cat] = want; changes.push({market: id, name: m.name, cat, was, to: want, n}); }
    }
    if ( Object.keys(supply).length ) await mk.set(id, {supply});
  }
  if ( changes.length ) await ChatMessage.create({whisper: gmIds(), speaker: {alias: "Markets"}, flags: {[MOD]: {workshops: {changes}}},
    content: `<div class="wodx-card wst-markets"><h3>The month's work in the markets</h3><ul>${changes.map(c => `<li>${esc(c.name)}: ${esc(c.cat)} ${esc(c.was)} to ${esc(c.to)} (${c.n} working place${c.n === 1 ? "" : "s"})</li>`).join("")}</ul>
      <button type="button" data-action="wst-workshops-undo">Undo</button></div>`});
  return changes;
}

async function undoWorkshops(message) {
  const f = message?.flags?.[MOD]?.workshops;
  const mk = markets();
  if ( !game.user.isGM || !f || f.undone || !mk ) return;
  const by = {};
  for ( const c of f.changes ) (by[c.market] ??= {})[c.cat] = c.was;
  for ( const [id, supply] of Object.entries(by) ) await mk.set(id, {supply});
  await message.update({[`flags.${MOD}.workshops.undone`]: true, content: message.content.replace(/<button type="button" data-action="wst-workshops-undo">Undo<\/button>/, "<p><i>Undone.</i></p>")});
}

/**
 * Once a month: a faction with Resources 3 or more and nothing being built may propose putting something up
 * (1 in 6 a month, house rule, B856). It goes to the approval queue; approved, the build starts on its leader.
 */
export async function factionBuildsMonth(rng = Math.random) {
  const fa = npcFactions();
  if ( !isActiveGM() || !fa?.state ) return [];
  const out = [];
  const building = new Set(all(game.actors).flatMap(a => Object.values(a.flags?.[MOD]?.tasks ?? {})).filter(t => t?.kind === "build" && t.faction && !["done", "ruined"].includes(t.status)).map(t => t.faction));
  const cap = {3: 120, 4: 600, 5: Infinity};
  for ( const f of fa.state().factions ?? [] ) {
    const res = num(f.assets?.resources);
    if ( f.dormant || res < 3 || !f.leader || building.has(f.id) || rng() >= 1 / 6 ) continue;
    const kinds = B.buildingsAt(yearNow()).filter(b => b.value <= cap[res] && b.value >= 12);
    if ( !kinds.length ) continue;
    const pick = kinds[Math.floor(rng() * kinds.length)];
    await chron()?.propose?.({type: `${MOD}.build`, key: `build-${f.id}`, title: `${f.name} would put up a ${pick.label.toLowerCase()}`,
      detail: `Paid from the faction's Resources (${res}); the leader's long task rolls Resources + Retainers, ${METHOD_WORD(pick.method)}.`, data: {faction: f.id, building: pick.key}});
    out.push({faction: f.id, building: pick.key});
  }
  return out;
}
const METHOD_WORD = k => `${B.METHODS[k]?.label.toLowerCase() ?? k}, ${B.METHODS[k]?.stages.length ?? 0} stages`;

export function registerApproval() {
  chron()?.registerApprovalHandler?.(`${MOD}.build`, {
    label: "Faction buildings",
    approve: async entry => {
      const f = factionById(entry.data?.faction);
      const leader = f ? game.actors.get(f.leader) : null;
      if ( !leader ) return ui.notifications.warn("That faction has no leader to run the building.");
      const r = await startBuild(leader, entry.data.building, {faction: f.id, sceneId: f.places?.length ? (fromUuidSyncSafe(f.places[0])?.parent?.id ?? fromUuidSyncSafe(f.places[0])?.id) : null});
      if ( !r.ok ) ui.notifications.warn(r.why);
    }
  });
}
function fromUuidSyncSafe(id) { try { return fromUuidSync(id); } catch (e) { return null; } }

/* ---------------- The window ---------------- */

const myActors = () => all(game.actors).filter(a => game.user.isGM ? isPC(a) : a.isOwner && !/group/i.test(String(a.type ?? "")));

export async function propertyDialog() {
  const y = yearNow(), list = myActors();
  const rows = [];
  for ( const h of game.user.isGM ? holdings() : holdings().filter(x => list.some(a => x.owner && O.isOwner(x.owner, viewerFor(a)))) ) {
    rows.push(`<tr data-search-text="${esc(`${h.doc.name} ${h.owner?.name ?? ""}`)}"><td>${esc(h.doc.name)}<br><small>${esc(h.kind)}${h.doc.documentName === "Region" ? `, on ${esc(h.scene.name)}` : ""}</small></td>
      <td>${esc(O.heldLine(h.owner))}</td><td>${esc(fmt(h.value))}<br><small>upkeep ${esc(fmt(h.upkeep))}${h.income ? `, brings in ${esc(fmt(h.income))}` : ""} a month</small></td>
      <td>${game.user.isGM ? `<button type="button" data-wst-own="edit" data-uuid="${esc(h.doc.uuid)}">Change</button>` : ""}</td></tr>`);
  }
  const stolen = game.user.isGM ? stolenGoods() : [];
  const right = O.tradeRightAt(y);
  const content = `<p>What characters own, how it is held in ${y || "this year"}, and what it costs and brings in each month (paid on the month's pay day). Owning a place adds no Background dots by itself; the Storyteller awards them, or they are bought with experience.</p>
    <p class="wodx-quiet">Trade: ${esc(right.how)}</p>
    ${rows.length > 5 ? searchBox("table.wst-own-t", "Search holdings…", "Search holdings") : ""}<div class="wst-scroll"><table class="wst-own-t"><thead><tr><th>Place</th><th>Held</th><th>Worth</th><th></th></tr></thead>
    <tbody>${rows.join("") || `<tr><td colspan="4" class="wodx-quiet">Nothing owned yet.</td></tr>`}</tbody></table></div>
    ${game.user.isGM ? `<h4>Stolen goods</h4>${stolen.length ? `<ul class="wst-stolen" data-fixed>${stolen.map(s => `<li>${esc(s.item.name)}, carried by ${esc(s.actor.name)}, belongs to ${esc(s.owner.name || "someone")}
      <button type="button" data-wst-own="fence" data-uuid="${esc(s.item.uuid)}">Fenced</button> <button type="button" data-wst-own="keep" data-uuid="${esc(s.item.uuid)}">Theirs now</button></li>`).join("")}</ul>` : `<p class="wodx-quiet">Nothing is marked stolen.</p>`}` : ""}`;
  const wire = (ev, dlg) => {
    const root = dlg?.element ?? ev?.target?.element;
    for ( const b of root?.querySelectorAll?.("[data-wst-own]") ?? [] ) b.addEventListener("click", async () => {
      const doc = await fromUuid(b.dataset.uuid);
      dlg?.close?.();
      if ( b.dataset.wstOwn === "edit" ) await editHolding(doc);
      else if ( b.dataset.wstOwn === "fence" ) await handOver(doc, null, {fenced: true});
      else if ( b.dataset.wstOwn === "keep" ) await handOver(doc, doc.parent);
      propertyDialog();
    });
  };
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 700}, window: {title: "Property and building", resizable: true}, classes: ["wodx-dialog", "wst-own-dlg"],
    content, buttons: [{action: "make", label: "Make something"}, {action: "build", label: "Put up a building"},
      ...(game.user.isGM ? [{action: "tag", label: "Tag a place on this scene"}] : []), {action: "close", label: "Close", default: true}]});
  if ( res === "make" ) return craftDialog();
  if ( res === "build" ) return buildDialog();
  if ( res === "tag" && canvas?.scene ) { const d = await pickPlace(canvas.scene); if ( d ) await editHolding(d); return propertyDialog(); }
}

const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? " selected" : ""}>${esc(label)}</option>`;
const actorPick = (list, name = "actor") => `<div class="form-group"><label>Who</label><select name="${name}" data-fixed>${list.map(a => opt(a.id, a.name, a.id === game.user.character?.id)).join("")}</select></div>`;

/** The whole scene, or one of its Regions. */
async function pickPlace(scene) {
  const regs = all(scene.regions);
  if ( !regs.length ) return scene;
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, window: {title: "Which place"}, classes: ["wodx-dialog"],
    content: `${regs.length > 8 ? searchBox("select[name=place]", "Search places…", "Search places") : ""}<div class="form-group"><label>Place</label><select name="place">${opt(scene.uuid, `The whole scene: ${scene.name}`, true)}${regs.map(r => opt(r.uuid, r.name, false)).join("")}</select></div>`,
    buttons: [{action: "ok", label: "Choose", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  return res?.place ? (await fromUuid(res.place)) : null;
}

export async function editHolding(doc) {
  if ( !game.user.isGM || !doc ) return null;
  const own = ownerRecordAt(doc) ?? {}, prop = propertyOf(doc) ?? {}, y = yearNow();
  const kind = doc.flags?.[NPC]?.place?.kind || B.BUILDINGS[prop.type]?.place || "";
  const cands = candidates();
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 540}, window: {title: `Holding: ${doc.name}`}, classes: ["wodx-dialog", "wst-own-edit"],
    content: `${cands.length > 8 ? searchBox("select[name=owner]", "Search owners…", "Search owners") : ""}
      <div class="form-group"><label>Owner</label><select name="owner">${opt("", "Nobody", !own.id && !own.name)}${cands.map(c => opt(c.id, `${c.name}${c.kind === "faction" ? " (faction)" : ""}`, c.id === own.id)).join("")}${own.kind === "name" ? opt("name:" + own.name, `${own.name} (a name only)`, true) : ""}</select></div>
      <div class="form-group"><label>Held as</label><select name="held" data-fixed>${O.tenuresAt(y, kind).map(t => opt(t.key, t.label, t.key === (own.held || O.defaultTenure(y, kind)))).join("")}</select></div>
      <div class="form-group"><label>Since (year)</label><input type="number" name="since" value="${own.since ?? y}"></div>
      <div class="form-group"><label>Kind of building</label><select name="type">${opt("", "Not set", !prop.type)}${Object.entries(B.BUILDINGS).map(([k, b]) => opt(k, `${b.label} (${b.from < 0 ? "any age" : b.from} to ${b.to})`, k === prop.type)).join("")}</select></div>
      <div class="form-group"><label>Supplies the market with</label><select name="makes">${opt("", "Nothing", !prop.makes)}${Object.entries(CR.CRAFTS).map(([k, c]) => opt(k, `${k} (${c.label.toLowerCase()})`, k === prop.makes)).join("")}</select></div>
      <div class="form-group"><label>Worth, upkeep, income</label><input type="number" name="value" value="${prop.value ?? ""}" placeholder="from the kind"><input type="number" name="upkeep" value="${prop.upkeep ?? ""}" placeholder="1% a month"><input type="number" name="income" value="${prop.income ?? ""}" placeholder="from the kind"></div>
      <p class="hint">Sums are in the smallest coin of the money in use. Left blank, they follow the kind of building and the wage of the year (house rule). ${esc(O.TENURES[own.held]?.note ?? "")}</p>`,
    buttons: [{action: "save", label: "Save", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res ) return null;
  const c = cands.find(x => x.id === res.owner);
  const owner = c ? {id: c.id, kind: c.kind, name: c.name} : String(res.owner ?? "").startsWith("name:") ? {name: res.owner.slice(5), kind: "name"} : null;
  return saveHolding(doc, {owner, held: res.held, since: num(res.since) || null, type: res.type, makes: res.makes, value: res.value, upkeep: res.upkeep, income: res.income, built: prop.built});
}

export async function craftDialog() {
  const list = myActors();
  if ( !list.length ) return ui.notifications.warn("No character to make things.");
  const can = await makeable();
  const rows = can.map(({good, r}) => opt(good.id, `${good.name}: ${r.task.goal} successes, ${r.task.interval === "hour" ? "a roll an hour" : r.task.interval === "day" ? "a roll a day" : "a roll a week"}${r.task.materials.length ? `, needs ${r.task.materials.join(" and ")}` : ""}${r.why ? ` (${r.why})` : ""}`, false)).join("");
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 620}, window: {title: "Make something"}, classes: ["wodx-dialog", "wst-craft"],
    content: `<p>Things known in ${yearNow() || "this year"}, from the goods list. Dexterity + Crafts at difficulty 6, more for costly work or a thing out of its time; successes past the goal make better work (house rule). The Storyteller can change the task afterwards in Long tasks.</p>
      ${actorPick(list)}${searchBox("select[name=good]", "Search what to make…", "Search goods")}
      <div class="form-group"><label>Make</label><select name="good" size="10">${rows}</select></div>
      <div class="form-group"><label>Buy missing materials</label><input type="checkbox" name="buy"></div>`,
    buttons: [{action: "go", label: "Start", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res?.good ) return null;
  const r = await startCraft(game.actors.get(res.actor), res.good, {buy: !!res.buy});
  if ( !r.ok ) ui.notifications.warn(r.why); else ui.notifications.info(`${r.task.name} is under way.`);
  return r;
}

export async function buildDialog() {
  const list = myActors();
  if ( !list.length ) return ui.notifications.warn("No character to build.");
  const y = yearNow(), w = wageNow();
  const kinds = B.buildingsAt(y);
  const factions = game.user.isGM ? (npcFactions()?.state?.()?.factions ?? []).filter(f => !f.dormant && f.leader) : [];
  const res = await foundry.applications.api.DialogV2.wait({rejectClose: false, position: {width: 600}, window: {title: "Put up a building"}, classes: ["wodx-dialog", "wst-build"],
    content: `<p>What can be built in ${y || "this year"}. The work goes in stages; each stage is paid for as it starts and rolls Dexterity + Crafts, with a die for each worker (house rule). When it is done, the place appears on this scene with its owner, and a map comes from the building kit where the kit has one.</p>
      ${actorPick(list)}${factions.length ? `<div class="form-group"><label>For a faction</label><select name="faction" data-fixed>${opt("", "No, for the character", true)}${factions.map(f => opt(f.id, f.name, false)).join("")}</select></div>` : ""}
      ${searchBox("select[name=kind]", "Search buildings…", "Search buildings")}
      <div class="form-group"><label>Build</label><select name="kind" size="10">${kinds.map(b => opt(b.key, `${b.label}: ${fmt(Math.round(b.value * w))}, ${B.METHODS[b.method].label.toLowerCase()}, ${B.METHODS[b.method].stages.length} stages, a roll each ${B.METHODS[b.method].interval}${b.kit ? "" : " (no kit map)"}`, false)).join("")}</select></div>
      <div class="form-group"><label>Workers (dice)</label><input type="number" name="workers" value="2" min="0" max="${B.MAX_WORKERS}"></div>`,
    buttons: [{action: "go", label: "Start", default: true, callback: (ev, b) => Object.fromEntries(new FormData(b.form))}, {action: "cancel", label: "Cancel"}]});
  if ( !res?.kind ) return null;
  const f = res.faction ? factionById(res.faction) : null;
  const builder = f ? game.actors.get(f.leader) : game.actors.get(res.actor);
  const r = await startBuild(builder, res.kind, {workers: num(res.workers), faction: f?.id ?? null});
  if ( !r.ok ) ui.notifications.warn(r.why); else ui.notifications.info(`${r.task.name} is under way.`);
  return r;
}

export function registerOwnerHooks() {
  Hooks.on("wodxItemsTaken", p => { onItemsTaken(p).catch(e => console.error(`${MOD} | taken`, e)); });
  Hooks.on("preCreateItem", onPreCreateItem);
  Hooks.on("renderChatMessageHTML", (message, el) => {
    const html = el?.[0] ?? el;
    if ( !game.user.isGM || !html || !message.flags?.[MOD]?.workshops ) return;
    html.querySelector?.("[data-action=wst-workshops-undo]")?.addEventListener("click", () => undoWorkshops(message));
  });
}
