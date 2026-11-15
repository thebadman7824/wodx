/**
 * WoDX Actions 3.22.0 and 3.23.0: magic that applies itself, in Foundry. The Mage 20th Cast window gets effect keywords and a
 * spend plan; after the roll the card says what each keyword does to each target, and the active Storyteller's
 * client applies what may apply on its own (health, Quintessence, timed effects, light, height, conditions), with
 * one Undo button. What needs a yes goes to the approval queue; what is the Storyteller's call is listed for them.
 * World setting "Magic that applies itself": Automatic (on, except in the Live world), On, Off. Rules: effects-rules.js.
 */
import * as ACT from "./acts.js";
import * as BIND from "./binds.js";
import * as E from "./effects-rules.js";
import * as KRG from "./kindred-rules.js";
import * as DAE from "./mage-da-effects.js";
import * as PE from "./path-effects.js";
import * as PW from "./power-effects.js";
import * as PM from "./power-mods.js";
import * as W from "./world-effects.js";
import * as SUM from "./summons.js";
import * as SR from "./summon-rules.js";
import * as TR from "./turn-rules.js";
import * as TURN from "./turns.js";
import * as LIM from "./limits.js";
import { ask } from "./profiles.js";
import { BOOK_RITUALS, bookRitual, ritualResults } from "./book-rituals.js";
export { E, W };
import { searchBox } from "../../wodx-chronicle/scripts/search.mjs";

const MOD = "wodx-actions";
const TYPE = "wodx-actions.effect";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const LIVE_WORLDS = ["rothenstein-live"];
const isLive = () => LIVE_WORLDS.includes(game.world?.id) || !!game.world?.flags?.wodx?.liveWorld;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const combat = () => game.modules.get("wodx-combat")?.api ?? null;
const chron = () => game.modules.get("wodx-chronicle")?.api ?? null;
const upkeep = () => game.modules.get("wodx-storyteller")?.active ? game.modules.get("wodx-storyteller").api?.upkeep ?? null : null;
const corruption = () => game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api?.corruption ?? null : null;

export function isOn() {
  let mode = "auto";
  try { mode = game.settings.get(MOD, "effectsApply"); } catch (e) { /* not registered */ }
  return mode === "on" || (mode !== "off" && !isLive());
}

/* ------------------------------------------------------------------ */
/*  The Cast window                                                    */
/* ------------------------------------------------------------------ */

const flagRotes = actor => (Array.isArray(actor?.flags?.[MOD]?.rotes) ? actor.flags[MOD].rotes : []);
const roteItems = actor => [...(actor?.items ?? [])].filter(i => i.type === "Rote");
const same = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();

/** The caster's rotes: the Rote items on the sheet (3.24.0), and any kept on the actor by 3.23.0. Sorted by name. */
export function rotesOf(actor) {
  const items = roteItems(actor).map(i => ({...E.roteOfItem(i), itemId: i.id}));
  const old = flagRotes(actor).filter(r => !items.some(i => same(i.name, r.name)));
  return [...items, ...old].sort((a, b) => a.name.localeCompare(b.name));
}

/** Save a rote as a Rote item on the sheet: one per name, a new one replaces what the old item held. */
export async function saveRote(actor, rote) {
  if ( !actor || !rote ) return null;
  const data = E.itemOfRote(rote);
  const old = roteItems(actor).find(i => same(i.name, rote.name));
  if ( old ) await old.update({system: data.system, [`flags.${MOD}.rote`]: rote});
  else if ( roteItems(actor).length < E.ROTES_MAX ) await actor.createEmbeddedDocuments("Item", [data]);
  else { ui.notifications?.warn?.(`${actor.name} already has ${E.ROTES_MAX} rotes.`); return null; }
  if ( flagRotes(actor).some(r => same(r.name, rote.name)) ) await actor.update({[`flags.${MOD}.rotes`]: flagRotes(actor).filter(r => !same(r.name, rote.name))});
  return rote;
}

/** Forget a rote by name: one kept on the actor, or a Rote item that WoDX made. Rote items made by hand stay. */
export async function forgetRote(actor, name) {
  if ( !actor ) return;
  if ( flagRotes(actor).some(r => same(r.name, name)) ) await actor.update({[`flags.${MOD}.rotes`]: flagRotes(actor).filter(r => !same(r.name, name))});
  const ids = roteItems(actor).filter(i => same(i.name, name) && i.flags?.[MOD]?.rote).map(i => i.id);
  if ( ids.length ) await actor.deleteEmbeddedDocuments("Item", ids);
}

/** The keyword part of the Cast window. known: the caster's Spheres; rotes: the caster's saved rotes. */
export function fieldset(known = {}, rotes = []) {
  const box = ([k, K]) => {
    const can = E.spheresFor([k], known).missing.length === 0;
    return `<label class="wodx-kw${can ? "" : " wodx-kw-off"}" title="${esc(K.does)}"><input type="checkbox" name="kw-${k}"${can ? "" : " disabled"}/> ${esc(K.label)}</label>`;
  };
  const roteRow = rotes.length ? `<div class="form-group"><label>A saved rote</label>${rotes.length > 5 ? searchBox("select[name=kw-rote]", "Search rotes…", "Search rotes") : ""}<select name="kw-rote"><option value="">(none)</option>${rotes.map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join("")}</select></div>` : "";
  return `<fieldset class="wodx-keywords"><legend>What the Effect does (keywords)</legend>${roteRow}
    <div class="wodx-kw-list" data-fixed>${Object.entries(E.KEYWORDS).map(box).join("")}</div>
    <p class="hint">Each keyword fills in the Spheres it needs. Each one past the first needs one more success (house rule); an Effect on someone else needs at least two (Mage 20th p. 502).</p>
    <div class="form-group"><label>Extra targets</label><input type="number" name="kw-targets" min="0" max="10" value="0"/></div>
    <div class="form-group"><label>Duration steps (a turn, a scene, a day, a story, six months)</label><input type="number" name="kw-duration" min="0" max="4" value="0"/></div>
    <div class="form-group"><label><input type="checkbox" name="kw-area"/> An area, ${E.AREA.feet} feet around a spot (+${E.AREA.cost} successes; works on whoever enters)</label></div>
    ${optionsHtml()}
    <div class="form-group"><label>Save as a rote named</label><input type="text" name="kw-save" maxlength="60" placeholder="Leave empty to not save"/></div></fieldset>`;
}

/** The keyword options and choice lists, shared by the Cast window and the Storyteller's effect (3.31.0). */
export function optionsHtml() {
  return `<div class="form-group"><label>Options</label><div class="form-fields wodx-kw-opts" data-fixed>
      <label><input type="checkbox" name="kw-fire"/> Fire or lightning</label>
      <label><input type="checkbox" name="kw-prime"/> Charged with Prime 2 and a Quintessence</label>
      <label><input type="checkbox" name="kw-curse"/> Fortune as a curse</label>
      <label><input type="checkbox" name="kw-slow"/> Slow, not hasten</label>
      <label><input type="checkbox" name="kw-dark"/> Darkness, not light</label>
      <label><input type="checkbox" name="kw-drain"/> Drain, not charge</label>
      <label><input type="checkbox" name="kw-agg"/> Mend aggravated wounds</label>
      <label><input type="checkbox" name="kw-lasting"/> Harm that lasts (poison, disease, decay)</label>
      <label><input type="checkbox" name="kw-reflect"/> Ward turns blows back</label>
      <label><input type="checkbox" name="kw-calm"/> Calm the Beast or Rage</label>
      <label><input type="checkbox" name="kw-frenzy"/> Rouse a frenzy</label>
      <label><input type="checkbox" name="kw-awe"/> Sway as awe</label>
      <label><input type="checkbox" name="kw-sap"/> Sap, not boost</label>
      <label><input type="checkbox" name="kw-derange"/> Mend a derangement or scar</label></div></div>
    <div class="form-group"><label>Pool (Charge, Drain or Mend)</label><select name="kw-pool" data-fixed><option value="">(Quintessence, or health for Mend)</option>${Object.entries(E.POOLS).filter(([k]) => k !== "quintessence").map(([k, P]) => `<option value="${k}">${esc(P.label)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Boost or Sap works on</label><select name="kw-boost" data-fixed>${Object.entries(E.BOOSTS).map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join("")}</select></div>
    <div class="form-group"><label>Kind (Harm's damage, or what a Ward stands against)</label><select name="kw-of" data-fixed>${E.KINDS.map(k => `<option value="${k}">${k === "any" ? "(any)" : k}</option>`).join("")}</select></div>
    <div class="form-group"><label>Reaches the world (a town-wide one waits for the Storyteller's yes)</label><select name="kw-world" data-fixed><option value="">(nothing beyond the scene)</option>${Object.entries(W.WORLD).map(([k, K]) => `<option value="${k}">${esc(K.label)}${K.scope === "ground" ? " (an area on the map)" : K.scope === "taint" ? " (this place)" : " (the town)"}</option>`).join("")}</select></div>`;
}

const CTX_BOXES = {fire: "kw-fire", primeCharged: "kw-prime", curse: "kw-curse", slow: "kw-slow", dark: "kw-dark", drain: "kw-drain", aggravated: "kw-agg",
  lasting: "kw-lasting", reflect: "kw-reflect", calm: "kw-calm", frenzy: "kw-frenzy", awe: "kw-awe", sap: "kw-sap", derangement: "kw-derange"};
/** The Cast window's choice lists (3.30.0): ctx key -> field name. "of" fills both damageKind and against. */
const CTX_SELECTS = {pool: "kw-pool", boost: "kw-boost", damageKind: "kw-of", against: "kw-of"};

/** Ticking a keyword raises the Sphere choices to what it needs; picking a rote fills the window in. */
export function wire(root, known = {}, rotes = []) {
  const sync = () => {
    const ks = Object.keys(E.KEYWORDS).filter(k => root.querySelector(`[name="kw-${k}"]`)?.checked);
    const self = !game.user.targets?.size;
    const {used} = E.spheresFor(ks, known, {self});
    for ( const {sphere, level} of used ) {
      const sel = root.querySelector(`[name="s-${sphere}"]`);
      if ( sel && n(sel.value) < level ) sel.value = String(level);
    }
    if ( ks.length ) {
      const kind = root.querySelector('[name="kind"]');
      if ( kind && kind.dataset.wodxTouched !== "1" ) kind.value = E.leanOf(ks) === "vulgar" && kind.value === "coincidental" ? "vulgar" : kind.value;
    }
  };
  root.querySelector('[name="kind"]')?.addEventListener("change", e => { e.currentTarget.dataset.wodxTouched = "1"; });
  for ( const k of Object.keys(E.KEYWORDS) ) root.querySelector(`[name="kw-${k}"]`)?.addEventListener("change", sync);
  root.querySelector('[name="kw-rote"]')?.addEventListener("change", ev => {
    const r = rotes[n(ev.currentTarget.value)];
    if ( ev.currentTarget.value === "" || !r ) return;
    fill(root, r);
  });
}

/** Fill the Cast window in from a rote. A Sphere the caster lacks stays at what the sheet allows. */
export function fill(root, r) {
  if ( !root || !r ) return;
  const set = (name, v) => { const el = root.querySelector(`[name="${name}"]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!v && !el.disabled; else el.value = String(v); };
  for ( const k of Object.keys(E.KEYWORDS) ) set(`kw-${k}`, (r.keywords ?? []).includes(k));
  for ( const el of root.querySelectorAll('select[name^="s-"]') ) {
    const want = n(r.spheres?.[el.name.slice(2)]);
    const best = Math.max(0, ...[...el.options].map(o => n(o.value)).filter(v => v <= want));
    el.value = String(best);
  }
  set("kw-targets", r.plan?.targets ?? 0); set("kw-duration", r.plan?.duration ?? 0); set("kw-area", r.plan?.area);
  for ( const [k, name] of Object.entries(CTX_BOXES) ) set(name, r.ctx?.[k]);
  for ( const [k, name] of Object.entries(CTX_SELECTS) ) if ( typeof r.ctx?.[k] === "string" ) set(name, r.ctx[k]);
  if ( r.kind ) set("kind", r.kind);
  if ( r.feat ) set("feat", r.feat);
}

/** Does WoDX's Cast window take this Rote item? Only for a Mage 20th caster (a Dark Ages mage keeps the system dialog). */
export function takesRote(actor, ageKey) {
  return !!actor && ageKey !== "dark" && game.modules.get(MOD)?.active === true;
}

/** What the form asks for. */
export function read(fd) {
  const keywords = Object.keys(E.KEYWORDS).filter(k => fd[`kw-${k}`]);
  return {keywords, plan: {targets: n(fd["kw-targets"]), duration: n(fd["kw-duration"]), area: !!fd["kw-area"]},
    ctx: {...Object.fromEntries(Object.entries(CTX_BOXES).map(([k, name]) => [k, !!fd[name]])),
      ...Object.fromEntries(Object.entries(CTX_SELECTS).map(([k, name]) => [k, String(fd[name] ?? "")]).filter(([, v]) => v && v !== "any"))},
    save: String(fd["kw-save"] ?? "").trim(), world: W.WORLD[fd["kw-world"]] ? String(fd["kw-world"]) : ""};
}

/** The targets: the user's targets, else the caster's own token (or the actor). */
export function targetsOf(actor, uuids = null) {
  const own = actor?.getActiveTokens?.()?.[0]?.document ?? null;
  if ( Array.isArray(uuids) ) {
    const docs = uuids.map(docOf).filter(Boolean);
    return docs.length ? {self: false, docs} : {self: true, docs: [own ?? actor]};
  }
  const list = [...(game.user.targets ?? [])].map(t => t.document).filter(t => t && t.actorId !== actor?.id);
  return list.length ? {self: false, docs: list} : {self: true, docs: [own ?? actor]};
}

/**
 * Turn a roll into the card's items. Returns {items, html, base, need}. items: [{key, out, target, name, route}].
 */
export function plan(actor, form, successes, {used = [], witnessed = false, feat = 0, targets = null, age = "ascension"} = {}) {
  const t = targetsOf(actor, targets);
  const base = E.needFor(form.keywords, {self: t.self, feat});
  const got = E.spend(successes, base, form.plan);
  const spheres = used.map(x => x.sphere);
  const items = [];
  const docs = t.docs.slice(0, 1 + got.targets);
  const caster = actor?.getActiveTokens?.()?.[0]?.document ?? null;
  for ( const key of form.keywords ) {
    const out = E.outcome(key, got, {...form.ctx, spheres, age});
    if ( !out ) continue;
    const resist = t.self ? null : E.resistOf(key);
    if ( resist ) { out.text = `${out.text}; ${resist.text}`; out.resist = {pool: resist.pool, diff: resist.diff}; }
    if ( key === "summon" ) {
      // B4820: the beings a Mage calls (M20 pp. 513-523): bound only when the same casting binds them
      const r = summonResult(actor, {key, who: "self", out}, got.strength, null, {bound: form.keywords.includes("bind")});
      items.push({key, out: r.out, target: caster?.uuid ?? null, name: caster?.name ?? actor?.name ?? "", caster: actor?.uuid ?? null,
        route: isOn() ? (actor?.hasPlayerOwner ? "queue" : "pick") : "off"});
      continue;
    }
    if ( out.area ) {
      // One circle on the scene: the Storyteller places it, and it works on whoever enters
      const route = isOn() ? E.route(key, {self: false, count: 1, witnessed, need: base}, out) : "off";
      items.push({key, out, target: null, name: "an area", caster: caster?.uuid ?? null, route: route === "st" || route === "off" ? route : "area"});
      continue;
    }
    for ( const d of docs ) {
      const a = d?.actor ?? d;
      const pc = !!a?.hasPlayerOwner;
      const route = isOn() ? E.route(key, {self: t.self, playerCharacter: pc, count: docs.length, witnessed, need: base}, out) : "off";
      // A move waits for the Storyteller's click on the map
      items.push({key, out, target: d?.uuid ?? null, name: d?.name ?? a?.name ?? "", route: route === "auto" && out.kind === "move" ? "pick" : route});
    }
  }
  // What it does to the world (B3757): picked in the Cast window, on the same successes
  if ( form.world && successes > 0 ) for ( const r of W.worldResults({world: [form.world]}, successes) ) {
    items.push({key: "world", out: r.out, target: null, name: r.out.scope === "ground" ? "an area" : r.out.scope === "taint" ? "this place" : "the town",
      caster: caster?.uuid ?? null, scene: canvas?.scene?.id ?? null, route: isOn() ? W.worldRoute(r.out) : "off"});
  }
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply",
    pick: "goes where the Storyteller clicks", area: "waits for the Storyteller to place it"};
  const html = !got.ok && !items.length ? "" : `<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
    `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(i.out.text)}. <span class="wodx-quiet">It ${word[i.route]}.</span></li>`).join("")}</ul>
    ${got.dropped.length ? `<div class="vta-note">Too few successes for ${esc(got.dropped.join(" and "))}.</div>` : ""}</div>`;
  // What a countermagick roll needs to work the card out again (3.25.0)
  const recipe = {successes, form, used, witnessed, feat, targets: t.self ? null : t.docs.map(d => d?.uuid).filter(Boolean), actor: actor?.uuid ?? null};
  // A target who is a mage may counter first: the card waits for countermagick or the Storyteller's Apply now
  const hold = isOn() && !t.self && t.docs.some(d => E.canCounter((d?.actor ?? d)?.system));
  return {items, html, base, need: E.needFor(form.keywords, {self: t.self, feat, plan: form.plan}), got, recipe, hold};
}

/**
 * A Dark Ages rote's card items (3.26.0): what the rote does with its successes, on the caster or the targets, routed as
 * any keyword result. Returns {items, html}.
 */
export function daPlan(actor, rote, successes) {
  return planOf(actor, DAE.daOutcomes(rote, successes), successes, {name: rote?.name, line: "Mage (Dark Ages)"});
}

/** A Thaumaturgy, Necromancy or Koldunic path power on the effects card (Dark Ages Disciplines). */
export function pathPlan(actor, power, successes) {
  return planOf(actor, PE.pathOutcomes(power, successes), successes, {name: power?.n, line: "Vampire (Dark Ages)"});
}

/** A Numen at a level on the effects card (The Hunters Hunted II). */
export function numinaPlan(actor, key, level, successes, def) {
  return planOf(actor, PE.numinaOutcomes(key, level, successes, def), successes, {name: def?.label ? `${def.label} ${level}` : "", line: "Hunter (HH2)"});
}

/**
 * Any other power with keywords (a Discipline, a Gift): its keywords on the effects card (Traits With Teeth step 4).
 * set and id name the power in power-keywords.js; line is the line list to try by name. Off when the world setting is off.
 */
export function powerPlan(actor, {set, id, name, line = null, successes, source = "", noRoll = false, world = ""} = {}) {
  if ( !isOn() || !powerEffectsOn() ) return {items: [], html: "", skipped: []};
  const kw = PW.powerKeywords(set, id, name, line);
  const t = targetsOf(actor);
  const {results, skipped} = PW.powerOutcomes(kw, successes, {label: name, source, hasTarget: !t.self && t.docs.length > 0, noRoll});
  const plan = planOf(actor, results, successes, {name, line: world, source});
  if ( skipped.length ) plan.html += `<p class="wodx-quiet">Needs a target: ${esc(skipped.join(", "))}.</p>`;
  return {...plan, skipped};
}
/** A book ritual its caster worked, with these successes, on the effects card (B3753): {items, html}. */
export function ritualPlan(actor, r, successes, source = "", line = "") {
  if ( !isOn() || !powerEffectsOn() ) return {items: [], html: ""};
  const t = targetsOf(actor);
  return planOf(actor, ritualResults(r, successes, {source, hasTarget: !t.self && t.docs.length > 0}), successes, {name: r?.n, line, source});
}
export const powerEffectsOn = () => { try { return game.settings.get(MOD, "powerEffects") !== false; } catch (e) { return true; } };

/**
 * B4820: a Summon result with its power's own rules (summon-specs.js), or the keyword's when the power has none: how
 * many, how long, who commands them, the keeping roll. The card line says all of it.
 */
export function summonResult(actor, r, successes, power = null, {bound = false} = {}) {
  const spec = (power?.name ? SUM.specFor(power.name, power.line ?? "") : null) ?? SR.KEYWORD_SPEC;
  const adv = actor?.system?.advantages ?? {};
  const ladder = r.out?.timed !== undefined ? r.out.timed : null;
  const res = SR.resolve(spec, {successes: n(successes), faith: n(adv.faith?.permanent), torment: n(adv.torment?.permanent), level: n(r.out?.level ?? successes),
    gnosisSpent: n(r.out?.spent?.gnosis), rageSpent: n(r.out?.spent?.rage), willpowerSpent: n(r.out?.spent?.willpower), bloodSpent: n(r.out?.spent?.blood),
    ladder, ladderLabel: r.out?.duration ?? null, bound, npc: !actor?.hasPlayerOwner});
  const caster = actor?.name ?? "the summoner";
  return {...r, st: false, ask: false, who: "self", out: {...(r.out ?? {}), key: "summon", label: power?.name || r.out?.label || "Summon", kind: "summon", summon: res, count: res.count,
    source: r.out?.source ?? res.page, text: SR.cardLines(res, {caster}).join("; ")}};
}

/**
 * Results in the [{key, who, ask?, st?, out}] shape, spread over the caster's targets: {items, html}. power: {name,
 * line, source} names the power, so a power that reaches the world (world-effects.js WORLD_POWERS, B3757) adds its
 * town, sickness, taint or ground result: town-wide ones to the approval queue, ground for the Storyteller to place.
 */
export function planOf(actor, results, successes, power = null) {
  const world = power?.name ? W.worldResults({source: results[0]?.out?.source ?? "", ...power}, successes) : [];
  if ( !results.length && !world.length ) return {items: [], html: ""};
  // B5786: a power aimed by name (Touch from Afar) reaches its far target instead of the ones picked on the map
  const t = targetsOf(actor, power?.targets ?? null);
  const own = actor?.getActiveTokens?.()?.[0]?.document ?? actor;
  const items = [];
  for ( const r of world ) {
    const route = !isOn() ? "off" : W.worldRoute(r.out);
    // B5781: an NPC's fire or flood lands on its target's square by itself
    const tg = !t.self && actor && !actor.hasPlayerOwner && r.out.scope === "ground" ? (t.docs[0]?.object ?? t.docs[0]?.getActiveTokens?.()?.[0] ?? null) : null;
    items.push({key: "world", out: r.out, target: null, name: r.out.scope === "ground" ? "an area" : r.out.scope === "taint" ? "this place" : "the town",
      caster: own?.uuid ?? null, scene: canvas?.scene?.id ?? null, route, ...(tg?.center ? {at: {x: tg.center.x, y: tg.center.y}} : {})});
  }
  // B4836: a power tagged as a summoning that calls nothing works through its own keywords instead
  const notSum = power?.name && results.some(r => r.key === "summon") ? SUM.notSummonOf(power.name, power.line ?? "") : null;
  if ( notSum ) {
    const have = new Set(results.map(r => r.key));
    const extra = PW.powerOutcomes({keywords: notSum.kw.filter(k => !have.has(k))}, successes, {label: power.name, source: notSum.page || power.source || "", hasTarget: !targetsOf(actor).self}).results;
    results = [...results.filter(r => r.key !== "summon"), ...extra];
    if ( !results.length && !world.length ) return {items: [], html: ""};
  }
  const bound = results.some(r => r.key === "bind");
  // B4832: a power whose book acts each turn rides that rule on its first matching result
  const et0 = power?.name ? TR.everyTurnOf(power.name, power.line ?? "") : null;
  if ( et0 ) {
    // B4838: the casting's own numbers (successes, Faith, Torment) and the caster go on the record now
    const adv = actor?.system?.advantages ?? {};
    const et = TR.resolveRec(et0, {successes, faith: n(power.faith) || n(adv.faith?.permanent), torment: n(adv.torment?.permanent), by: own?.uuid ?? actor?.uuid ?? null});
    const want = r => (et.on === "target" ? r.who !== "self" : r.who === "self") && TR.fits(et, r.out);
    const i = results.findIndex(want);
    const j = i >= 0 ? i : (et.high || et.levelsEq || et.on !== "target") ? -1 : 0;
    if ( j >= 0 && results[j] ) results = results.map((r, x) => x === j ? {...r, out: {...r.out, everyTurn: et, text: `${r.out?.text ?? ""}; ${et.text}`}} : r);
    // A rule on the caster with no result of the caster's own to ride (Tripping the Ire): it gets a timed effect for the scene
    else if ( i < 0 && et.on !== "target" && !et.high && !et.levelsEq && results.length )
      results = [...results, {key: "boost", who: "self", out: {key: "boost", kind: "timed", label: power.name, name: power.name, timed: {kind: "scene"}, duration: "the scene", everyTurn: et, source: power.source ?? et.page, text: et.text}}];
  }
  // B4841: a power whose book makes copies or servants but whose keywords say otherwise (One Fights as Many) also summons
  if ( power?.name && !results.some(r => r.key === "summon") && SUM.specFor(power.name, power.line ?? "")?.extra )
    results = [...results, {key: "summon", who: "self", out: {key: "summon", kind: "summon", label: power.name, source: power.source ?? ""}}];
  for ( const r0 of results ) {
    const r = r0.key === "summon" ? summonResult(actor, r0, successes, power, {bound}) : r0;
    const k = DAE.targetCount(r.who, successes, t.self ? 0 : t.docs.length);
    const docs = r.who === "self" || !k ? [own] : t.docs.slice(0, k);
    const self = r.who === "self" || t.self;
    for ( const d of docs ) {
      const a = d?.actor ?? d;
      // B5093: the powers that name Golconda cannot reach a vampire in it (V20 pp. 158, 161, 177; V20 Dark Ages p. 220)
      if ( power?.name && a?.flags?.[MOD]?.golconda && KRG.beyondGolconda(power.name) ) {
        items.push({key: r.key, out: {...r.out, label: r.out.label, text: `${a.name ?? "The target"} is in Golconda, beyond this power's reach, and never knows it was tried`}, target: d?.uuid ?? null, name: d?.name ?? a?.name ?? "", route: "off", golconda: true});
        continue;
      }
      let route = !isOn() ? "off" : r.st ? "st" : E.route(r.key, {self, playerCharacter: !!a?.hasPlayerOwner, count: docs.length, need: 0}, r.out);
      if ( r.ask && route === "auto" ) route = "queue";
      if ( route === "auto" && r.out.kind === "move" ) route = "pick";
      // B5780: WoDX's own acts: an NPC's run by itself; on a player's character they wait for the Storyteller's yes,
      // which then applies them; readying one's own (Hand of Faith, Touch from Afar) needs no one's yes
      if ( isOn() && ACT.KINDS.has(r.out?.kind) ) route = !actor?.hasPlayerOwner ? "auto" : ["seize", "remote"].includes(r.out.kind) ? "auto" : route === "st" ? "queue" : route;
      // B4820: a summoning by a player's character waits for the Storyteller's yes; an NPC's runs by itself (B4837): a
      // plain being of the book's kind comes beside the NPC, and the Storyteller can dismiss it or Undo the card
      if ( r.key === "summon" && isOn() ) route = actor?.hasPlayerOwner ? "queue" : "auto";
      const rs = !self && r.key !== "summon" ? (r.out?.resist === null ? null : E.resistOf(r.key, r.out?.resist ? {resist: r.out.resist} : null)) : null;
      const out = rs && !r.out?.resist ? {...r.out, resist: {pool: rs.pool, diff: rs.diff}} : r.out;
      items.push({key: r.key, out, target: d?.uuid ?? null, name: d?.name ?? a?.name ?? "", route, ...(r.key === "summon" ? {caster: actor?.uuid ?? null} : {}),
        // B4925, B4928: the power and its user, for a won resistance's bar (Compel Soul) and the resist card's breakdown
        ...(power?.name ? {power: power.name, by: actor?.uuid ?? null, successes: n(successes)} : {})});
      if ( r.key === "summon" ) break; // one summoning, however many targets the caster has picked
    }
  }
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply", pick: "goes where the Storyteller clicks",
    area: "waits for the Storyteller to place it"};
  const html = `<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
    `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(String(i.out.text).slice(0, 220))}. <span class="wodx-quiet">${i.golconda ? "It does not take hold." : `It ${word[i.route]}.`}</span></li>`).join("")}</ul></div>`;
  return {items, html};
}

/** The card's list, written from its flags (so countermagick can change it). */
function listHtml(data) {
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply",
    pick: "goes where the Storyteller clicks", area: "waits for the Storyteller to place it"};
  const items = data.items ?? [];
  return `<ul>${items.map(i => `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(i.out.text)}. <span class="wodx-quiet">It ${word[i.route] ?? "waits"}.</span></li>`).join("") || "<li>Nothing: the Effect fails.</li>"}</ul>`;
}

/**
 * Countermagick against a card, on the active Storyteller's client: take back what applied, cut the caster's
 * successes, and work the card out again; reflected successes turn the Effect on its caster.
 */
export async function applyCounter(msg, counter, {mode = "self", by = ""} = {}) {
  const data = msg?.flags?.[MOD];
  if ( data?.kind !== "effects" || !data.recipe || !isActiveGM() ) return null;
  if ( data.done && data.undo?.length && !data.undone ) await undo(data.undo);
  const caster = docOf(data.recipe.actor);
  const prev = n(data.countered?.total);
  const total = prev + n(counter);
  const {left, reflected} = E.countered(data.recipe.successes, total, mode);
  const opts = {used: data.recipe.used ?? [], witnessed: data.recipe.witnessed, feat: data.recipe.feat};
  let items = [];
  const now = plan(caster, data.recipe.form, left, {...opts, targets: data.recipe.targets ?? []});
  if ( now.got.ok ) items = now.items;
  let back = null;
  if ( reflected ) {
    const own = caster?.getActiveTokens?.()?.[0]?.document ?? null;
    const r = plan(caster, data.recipe.form, reflected, {...opts, targets: own ? [own.uuid] : [caster?.uuid]});
    if ( r.got.ok ) { back = r.items.map(i => ({...i, name: `${i.name} (reflected)`})); items = [...items, ...back]; }
  }
  await msg.update({[`flags.${MOD}.items`]: items, [`flags.${MOD}.done`]: false, [`flags.${MOD}.undo`]: [], [`flags.${MOD}.undone`]: false,
    [`flags.${MOD}.placed`]: [], [`flags.${MOD}.hold`]: false, [`flags.${MOD}.countered`]: {total, mode, by, left, reflected}});
  await onCard(msg);
  return {left, reflected, items: items.length};
}

/* ------------------------------------------------------------------ */
/*  Applying and taking back                                           */
/* ------------------------------------------------------------------ */

const docOf = uuid => { try { return uuid ? fromUuidSync(uuid) : null; } catch (e) { return null; } };
const actorOf = d => d?.actor ?? (d?.documentName === "Actor" ? d : null);
const tokenOf = d => (d?.documentName === "Token" ? d : actorOf(d)?.getActiveTokens?.()?.[0]?.document ?? null);

/** Apply one item. Returns an undo record, or {note} when nothing could change. */
export async function applyItem(item, casterName = "the caster") {
  // B5174: an Untamable target shrugs off Domination and the Gifts that command (W20 p. 476)
  const ta = actorOf(docOf(item?.target));
  if ( ta && E.untamableStops(item?.out?.label ?? item?.out?.name) && (chron()?.traits?.has?.(ta, "untamable") ?? 0) > 0 )
    return {note: `${ta.name} is Untamable: ${item.out.label ?? "the power"} finds no hold.`};
  const rec = await applyCore(item, casterName);
  // B4838: an each-turn rule on any other kind of result (a thing made, a hold, a boost) gets a timed effect of its own
  const et = item?.out?.everyTurn;
  if ( et && !["damage", "timed"].includes(item.out.kind) && rec && typeof rec === "object" && !rec.note ) {
    const a = actorOf(docOf(item.target));
    const uuid = a ? await TURN.attach(a, et, {label: item.out.label ?? item.out.name ?? "A power", by: casterName}) : null;
    if ( uuid ) rec.everyEffect = uuid;
  }
  // B3528: a mind or body binding on a player character gets the player a binding card; B5793: the binding's effect
  // remembers who bound them, so Fear keeps the token from going nearer that one (binds.js)
  try { await bindingCard(item, casterName); } catch (e) { console.warn("WoDX | binding card", e); }
  try {
    const byA = item?.by ?? item?.caster ?? item?.casterUuid;
    const by = byA ? actorOf(docOf(byA)) : null;
    if ( by && rec?.effect && BIND.RULE[item?.key] ) await fromUuidSync(rec.effect)?.setFlag?.(MOD, "bindBy", by.id);
  } catch (e) { console.warn("WoDX | binding by", e); }
  // Traits With Teeth step 5: Sway and Fear move an NPC's regard for the caster (WoDX NPC), undone with the rest
  try {
    const mood = await moodAfter(item, casterName);
    if ( mood && rec && typeof rec === "object" ) rec.attitude = mood;
  } catch (e) { console.warn("WoDX | effect attitude", e); }
  // B5119: others can follow what was applied (a Puppeteer's rides make a consort)
  try { Hooks.callAll("wodxEffectApplied", item, rec, casterName); } catch (e) { console.warn("WoDX | effect hook", e); }
  return rec;
}

/** B3528: tell a bound player character's players what binds them, how long, and the resist roll. */
export async function bindingCard(item, casterName = "the caster", {actor = null} = {}) {
  const a = actor ?? actorOf(docOf(item?.target));
  if ( !a?.hasPlayerOwner || !game.user.isGM ) return null;
  const b = E.bindingOf(item, {caster: casterName});
  if ( !b ) return null;
  const users = game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id);
  return ChatMessage.create({speaker: {alias: b.by}, whisper: users, flags: {[MOD]: {binding: {actor: a.id, key: b.key}}},
    content: `<div class="wodx-card wodx-binding"><h3><i class="fa-solid fa-link"></i> ${esc(a.name)} is bound</h3>
      <p><b>${esc(b.label)}</b>, from ${esc(b.by)}: ${esc(b.command)}.</p>
      <p>It lasts ${esc(b.lasts)}. Resisting: ${esc(b.resist)}.</p>
      <p class="wodx-quiet">Play the character as bound until it ends or the Storyteller lifts it. ${E.BIND_HOLDS[b.key] ?? "The Storyteller rules on what you try."}</p></div>`});
}

/** Sway (not Awe) on an NPC: one step warmer toward the caster; Fear (Afraid): one step colder. Returns the undo record. */
async function moodAfter(item, casterName) {
  const o = item?.out ?? {};
  const delta = PW.moodDelta(item?.key, o);
  if ( !delta || !game.user.isGM ) return null;
  const AT = game.modules.get("wodx-npc")?.active ? game.modules.get("wodx-npc").api?.attitude : null;
  const npc = actorOf(docOf(item.target));
  if ( !AT || !npc || npc.hasPlayerOwner ) return null;
  const caster = ((item.casterUuid ?? item.caster) ? actorOf(docOf(item.casterUuid ?? item.caster)) : null) ?? game.actors.getName?.(casterName) ?? null;
  if ( !caster || caster.id === npc.id ) return null;
  const before = AT.of(npc, caster)?.step ?? 0;
  const met = !!AT.of(npc, caster)?.met;
  await AT.apply(npc, caster, {delta, why: `${o.label ?? "A power"} (${casterName})`});
  return {npc: npc.id, char: caster.id, before, met};
}

async function applyCore(item, casterName = "the caster") {
  // item is reassigned when the Storyteller picks a spot (Summon, Move)
  const d = docOf(item.target), a = actorOf(d), o = item.out;
  if ( o?.kind === "world" ) return applyWorld(item, casterName, a);
  if ( ACT.KINDS.has(o?.kind) ) return ACT.apply(item, casterName, {docOf, actorOf, tokenOf, pickPoint, choose});
  if ( !a && !["summon", "weather"].includes(o?.kind) ) return {note: `${item.name}: not found`};
  const C = combat(), T = chron();
  const health = foundry.utils.deepClone(a?.system?.health?.damage ?? {});
  switch ( o.kind ) {
    case "damage":
      if ( !C ) return {note: "WoDX Combat is off: apply the damage by hand"};
      // A pool rolls its damage dice first (C20 Holly-Strike, Lord of Levin), levels go on as they are
      // B4842: a poison eaten later (Bitter Fruit) does its harm only through its each-turn roll
      if ( !o.everyTurn?.only ) await C.soakAndApply(tokenOf(d)?.object ?? a, {mode: o.pool ? "pool" : "levels", amount: o.pool || o.levels, type: o.type, soak: o.soak, of: o.of ?? null});
      // B4832: harm that lasts goes on each turn, and a power whose book says so hurts each turn until it is stopped
      const every = o.everyTurn ?? TR.lastingHarm(o);
      const effect = every ? await TURN.attach(a, every, {label: o.label ?? "Harm", by: casterName}) : null;
      return {uuid: a.uuid, health, ...(effect ? {effect} : {})};
    case "heal": {
      if ( !C ) return {note: "WoDX Combat is off: heal by hand"};
      let left = o.levels;
      for ( const type of o.aggravated ? ["aggravated"] : ["lethal", "bashing"] ) {
        const has = n(a.system?.health?.damage?.[type]);
        const take = Math.min(has, left);
        if ( take > 0 ) { await C.healDamage(a, type, take); left -= take; }
      }
      await TURN.onHealed(a);
      return {uuid: a.uuid, health};
    }
    case "quint": {
      const q = n(a.system?.quintessence?.temporary);
      await a.update({"system.quintessence.temporary": Math.max(0, q + o.points)});
      return {uuid: a.uuid, quint: q};
    }
    case "timed": case "condition": {
      if ( !T?.applyTimed || !o.timed ) return {note: "WoDX Chronicle is off: note the effect by hand"};
      const changes = [];
      const tok = tokenOf(d);
      const tokenWas = tok ? {uuid: tok.uuid, elevation: tok.elevation, movementAction: tok.movementAction ?? null, sight: foundry.utils.deepClone(tok.sight ?? {})} : null;
      // B6000: the numbers a Ward, Boost, Blessing or Calm needs ride in the effect, so the dice read them (power-mods.js)
      const owner = possessFor(item, a, o);
      const reveal = o.key === "manifest" && tok ? manifestOf(tok) : null;
      // B6013: an Illusion shows on the map: a shimmering figure where the Storyteller clicks, gone when it ends
      const shown = o.key === "illusion" ? await illusionTile(item, tok, casterName) : null;
      const revert = owner ? {key: "wodx-actions.possessEnd", data: {actor: a.uuid, ownership: owner.was}}
        : reveal ? {key: "wodx-actions.manifestEnd", data: {token: tok.uuid, was: reveal.was}}
        : shown ? {key: "wodx-actions.illusionEnd", data: {tile: shown}} : undefined;
      const effect = await T.applyTimed(a, {name: o.name ?? o.label, description: `${o.text} (cast by ${casterName})`, duration: o.timed, condition: o.condition,
        changes, key: PM.keyFor(o), source: o.source ?? "Mage 20th pp. 502-504", data: PM.timedData(o), ...(revert ? {revert} : {})});
      // B6005: Possess on an NPC hands its body to the possessor's players while it lasts
      if ( owner ) await a.update({ownership: owner.now});
      // B6008: Manifest: a being from beyond shows on this side, pale and flickering, on the physical level
      if ( reveal ) await tok.update(reveal.now, {animate: false});
      try { if ( ["ward", "boost", "fortune", "fear", "manifest", "sway", "bind"].includes(o.key) ) chron()?.tokenLooks?.refresh?.(); } catch (e) { /* no looks */ }
      // Rise: the token takes the Fly way of moving first, then goes up (Actions 3.42.1: Foundry 14 lifts a flier)
      if ( tok && o.feet ) {
        if ( "movementAction" in tok && tok.movementAction !== "fly" ) await tok.update({movementAction: "fly"});
        await tok.update({elevation: n(tok.elevation) + o.feet}, {animate: false});
      }
      if ( tok && o.vision ) await tok.update({"sight.visionMode": "darkvision", "sight.range": Math.max(n(tok.sight?.range), 30)});
      if ( o.everyTurn && effect?.uuid ) await TURN.attach(a, o.everyTurn, {effect: effect.uuid, label: o.label ?? o.name, by: casterName});
      // B4846: a burning sheath hurts whoever lands a close blow on its bearer
      if ( o.touch?.levels && effect?.uuid ) await fromUuidSync(effect.uuid)?.setFlag?.(MOD, "touchHarm", o.touch);
      return {uuid: a.uuid, effect: effect?.uuid ?? null, token: tok && (o.feet || o.vision) ? tokenWas : reveal ? {uuid: tok.uuid, ...reveal.was} : null,
        ...(owner ? {ownership: {uuid: a.uuid, was: owner.was}} : {}), ...(shown ? {made: [shown]} : {})};
    }
    case "pool": {
      const P = E.poolOf(o.pool);
      const was = n(foundry.utils.getProperty(a, P.path));
      const cap = P.cap ? n(foundry.utils.getProperty(a, P.cap)) : Infinity;
      await a.update({[P.path]: Math.max(0, Math.min(cap || Infinity, was + n(o.points)))});
      return {uuid: a.uuid, pool: {path: P.path, value: was}};
    }
    case "summon": {
      // The Storyteller's effect (3.31.0): tokens of a chosen actor where the Storyteller clicks. 3.38.0: a cast Summon
      // asks the Storyteller who comes and where, when the card did not say. B4820: the summoning's own rules (how long
      // it stays, who commands it, its keeping roll) ride on the tokens, and a plain being of the book's kind can answer
      const r = o.summon ?? null;
      const plain = r ? `A plain ${SR.WHAT[r.what] ?? "being"} (the book's numbers)` : null;
      const auto = item.route === "auto" && !o.actor;
      const pick = o.actor ? o.actor : auto ? "plain" : await choose("Who answers the summons?", [...(plain ? [["", plain]] : []), ...[...game.actors].filter(x => !x.getFlag(MOD, "summonBase"))
        .sort((x, y) => x.name.localeCompare(y.name)).map(x => [x.uuid, x.name])], v => v || "plain");
      if ( !pick ) return {note: `${o.label}: no one answers`};
      const src = pick === "plain" ? null : fromUuidSync(pick);
      if ( pick !== "plain" && !src ) return {note: `${o.label}: that actor is gone`};
      if ( !item.at && auto ) {
        // B4837: an NPC's summoning comes beside the NPC, one square off
        const who = item.caster ? fromUuidSync(item.caster) : null;
        const tok = who?.token?.object ?? who?.getActiveTokens?.()?.[0] ?? null;
        const g = canvas?.grid?.size ?? 100;
        if ( tok?.center ) item = {...item, at: {x: tok.center.x + g, y: tok.center.y}};
      }
      if ( !item.at ) item = {...item, at: await pickPoint(`Click where ${src?.name ?? plain ?? "it"} appears.`)};
      const scene = canvas?.scene;
      if ( !scene || !item.at ) return {note: `${o.label}: no spot to place it`};
      const fallback = () => SR.resolve({...SR.KEYWORD_SPEC, count: {by: "fixed", fixed: Math.max(1, Math.min(12, n(o.count) || 1))}}, {ladder: o.timed ?? null, ladderLabel: o.duration ?? null});
      return SUM.bring({...item, out: {...o, summon: r ?? fallback()}}, {src, at: item.at, casterName, scene});
    }
    case "give": {
      const src = o.item ? fromUuidSync(o.item) : null;
      // 3.38.0: a cast Make with no item chosen: the Storyteller names the thing, and a plain item of that name is made
      const named = src ? null : (o.thing || await askText(`What does ${casterName} make for ${a.name}?`));
      if ( !src && !named ) return {note: `${o.label}: no item chosen`};
      const data = src ? src.toObject() : {name: named, type: "Item", system: {description: `Made by ${casterName} (${o.label}).`}};
      // B6006: an imbued thing (a talisman, a fetish, a charm) carries the power it was given and shows as charged
      if ( o.imbued ) { foundry.utils.setProperty(data, `flags.${MOD}.imbued`, {power: o.label ?? "Imbue", by: casterName, source: o.source ?? ""}); data.img ??= "icons/svg/aura.svg"; }
      delete data._id;
      // B4830: a made thing lasts as long as the power's duration and then fades, unless the book makes it real for good
      // (a Mage creation with Prime in it; a house reading in PENDING-REVIEW): the clock or the scene's end takes it back
      const ends = o.lasting ? null : madeEnd(o.timed);
      if ( ends ) foundry.utils.setProperty(data, `flags.${MOD}.madeEnds`, {...ends, by: casterName, power: o.label ?? "Make"});
      const [made] = await a.createEmbeddedDocuments("Item", [data]);
      return {made: made ? [made.uuid] : []};
    }
    case "light": {
      const tok = tokenOf(d);
      if ( !tok ) return {note: "no token on the scene for the light"};
      // B4830: the plain data of the token's light (the light field is a data model), to put back when it ends
      const was = tok.toObject?.()?.light ?? foundry.utils.deepClone(tok.light ?? {});
      await tok.update(o.dark ? {"light.negative": true, "light.dim": 20, "light.bright": 10} : {"light.negative": false, "light.dim": 30, "light.bright": 15, "light.color": "#ffd9a0"});
      // B4830: the light or darkness ends with its duration; WoDX Chronicle's timer puts the token's own light back
      let effect = null;
      if ( T?.applyTimed && o.timed ) {
        try {
          effect = await T.applyTimed(a, {name: o.dark ? "Shrouded in darkness" : "Shedding light", description: `${o.text} (cast by ${casterName})`, duration: o.timed,
            key: `wodx-effect-light`, revert: {key: "wodx-actions.lightEnd", data: {token: tok.uuid, light: was}}, source: o.source ?? "Mage 20th p. 504"});
        } catch (e) { console.warn("WoDX | light timer", e); }
      }
      return {token: {uuid: tok.uuid, light: was}, effect: effect?.uuid ?? null};
    }
    case "move": {
      const tok = tokenOf(d);
      // 3.38.0: a Move on someone else, approved from the queue, asks for the spot then
      if ( tok && !item.at ) item = {...item, at: await pickPoint(`Click where ${item.name} goes.`)};
      if ( !tok || !item.at ) return {note: `${item.name}: no token or no spot to move to`};
      const was = {uuid: tok.uuid, x: tok.x, y: tok.y};
      const size = tok.parent?.grid?.size ?? 100;
      const pos = {x: Math.round(item.at.x - (n(tok.width) || 1) * size / 2), y: Math.round(item.at.y - (n(tok.height) || 1) * size / 2)};
      await jump(tok, pos);
      return {token: was};
    }
    case "cross": {
      // 3.38.0 (Traits With Teeth step 10): Step Sideways or Cross, through WoDX Otherworlds with no second roll
      const tok = tokenOf(d), OW = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api : null;
      if ( !tok || !OW?.sendAcross ) return {note: `${item.name}: ${OW ? "no token on the scene" : "WoDX Otherworlds is off"}; move them across by hand`};
      const r = await OW.sendAcross(tok, {to: o.to});
      return r ? {across: tok.uuid, to: o.to ?? null} : {note: `${item.name}: could not cross`};
    }
    case "banish": return banishCore(item, a, d, casterName);
    case "place": {
      // B6007: the Gauntlet, the Shroud or Banality of this place moves (WoDX Otherworlds drift), with a look on the map
      const OW = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api : null;
      const scene = (d?.parent?.documentName === "Scene" ? d.parent : null) ?? canvas?.scene ?? null;
      if ( !OW?.drift?.lever || !scene ) return {note: `${o.label}: ${OW ? "no scene" : "WoDX Otherworlds is off"}; change the place by hand`};
      const taken = await OW.drift.lever(scene, o.track ?? "value", n(o.step) || -1, `${casterName}: ${o.label}`);
      if ( !taken ) return {note: `${o.label}: ${scene.name} can move no further`};
      const look = await worldLook(scene, n(o.step) < 0 ? "dread" : "calm", `${casterName}: ${o.label}`);
      return {drift: {scene: scene.uuid, taken}, ...(look ? {look} : {})};
    }
    case "work": return workCore(item, d, o, casterName);
    case "weather": {
      // 3.38.0: Weather sets tonight's weather in WoDX Atmosphere; Undo puts back what was set before
      const AT = game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere").api?.weather : null;
      if ( !AT?.set || !AT?.night ) return {note: "WoDX Atmosphere is off: describe the weather by hand"};
      const w = E.WEATHER_SET[o.weather] ? o.weather : await choose(`What weather does ${casterName} call?`, Object.entries(E.WEATHER_SET).map(([k, v]) => [k, v.label]));
      if ( !E.WEATHER_SET[w] ) return {note: `${o.label}: no weather chosen`};
      const jdn = AT.night();
      let prev = null;
      try { prev = foundry.utils.deepClone(game.settings.get("wodx-atmosphere", "overrides")?.[jdn] ?? null); } catch (e) { prev = null; }
      await AT.set(jdn, {...(prev ?? {}), ...E.WEATHER_SET[w].day});
      return {weather: {jdn, prev}};
    }
    default:
      return {note: `${o.label}: ${o.text}`};
  }
}

/** The Storyteller picks one of [[value, label]]. map: turns the value into what is returned. Null when cancelled. */
/**
 * A world result (B3757): a town event, a sickness or a taint change for the scene's town or place, once the Storyteller
 * has approved it; or, from a ground area, what the spot does to a token in it. Returns an undo record or {note}.
 */
async function applyWorld(item, casterName, a) {
  const o = item.out ?? {};
  const scene = game.scenes?.get(item.scene) ?? canvas?.scene ?? null;
  const why = `${casterName}: ${o.power || o.label}`;
  if ( o.scope === "ground" ) {
    // Deep water is WoDX Combat's own (the region carries its water flag); fire burns, broken ground knocks down
    if ( !a ) return {note: `${item.name}: not found`};
    if ( o.world === "blaze" ) return applyCore({...item, out: {...o, kind: "damage", pool: Math.max(1, n(o.dice) || 2), type: "lethal", of: "fire", soak: true}}, casterName);
    if ( o.world === "rubble" ) return applyCore({...item, out: {...o, kind: "condition", condition: "knockdown", difficulty: 6 + Math.min(3, n(o.scale)), timed: {kind: "rounds", rounds: 1}}}, casterName);
    return {note: `${item.name} is in deep water: WoDX Combat's swimming and drowning rules hold there`};
  }
  if ( o.scope === "taint" ) {
    const K = corruption();
    if ( !K?.of || !K?.set || !scene ) return {note: "WoDX Otherworlds' Wyrm corruption is off: change the place's taint by hand"};
    const prev = K.of(scene), step = o.world === "cleanse" ? -n(o.scale) : n(o.scale);
    const level = Math.max(0, n(prev.level) + step);
    await K.set(scene, {...prev, level, log: [...(prev.log ?? []), {at: game.time?.worldTime ?? 0, what: `${why}: ${o.world === "cleanse" ? "cleansed" : "fouled"} (${prev.level} to ${level})`}]});
    return {taint: {scene: scene.uuid, prev}, look: await worldLook(scene, o.world, why)};
  }
  const U = upkeep();
  if ( o.world === "plague" ) {
    const CG = U?.contagion;
    if ( !CG?.power ) return {note: "WoDX Storyteller's sickness is off: describe the sickness by hand"};
    const r = await CG.power({scene, scale: o.scale, source: why});
    return r?.market ? {sick: r.market, look: await worldLook(scene, "plague", why)} : {note: r?.why ?? "No town on this scene for the sickness to take"};
  }
  const TW = U?.towns;
  const kind = W.townKindOf(o);
  if ( !TW?.power || !kind ) return {note: "WoDX Storyteller's towns are off: describe what befalls the town by hand"};
  const r = await TW.power({kind, scale: o.scale, scene, label: why});
  // The town card carries its own Undo; nothing to keep here
  return r ? {note: `${o.label}: the town card has its own Undo`, look: await worldLook(scene, o.world, why)} : {note: "No town on this scene for it to reach"};
}

/** B6005: Possess on an NPC: the possessor's players own the body while it lasts. {was, now} or null. */
function possessFor(item, a, o) {
  if ( o?.key !== "possess" || !a || a.hasPlayerOwner || !game.user.isGM ) return null;
  const by = item?.by ?? item?.caster ?? item?.casterUuid;
  const caster = by ? actorOf(docOf(by)) : null;
  const players = caster ? game.users.filter(u => !u.isGM && caster.testUserPermission?.(u, "OWNER")) : [];
  if ( !players.length ) return null;
  const was = foundry.utils.deepClone(a.ownership ?? {});
  const now = {...was};
  for ( const u of players ) now[u.id] = 3;
  return {was, now};
}
/** B6013: the figure an Illusion puts on the map (a Tile), by the target or where the Storyteller clicks. Its uuid. */
async function illusionTile(item, tok, casterName) {
  const scene = tok?.parent ?? canvas?.scene;
  if ( !scene || !game.user.isGM ) return null;
  const g = scene.grid?.size ?? 100;
  const at = item.at ?? (tok ? {x: n(tok.x) + g * 1.5, y: n(tok.y) + g / 2} : await pickPoint(`Click where ${casterName}'s illusion appears.`));
  if ( !at ) return null;
  const [t] = await scene.createEmbeddedDocuments("Tile", [{texture: {src: "icons/svg/mystery-man.svg", tint: "#cfe0ff"}, x: Math.round(at.x - g / 2), y: Math.round(at.y - g / 2),
    width: g, height: g, alpha: 0.7, flags: {[MOD]: {illusion: {by: casterName, power: item.out?.label ?? "Illusion"}}}}]);
  return t?.uuid ?? null;
}
/** B6008: what a Manifest does to the token: seen (not hidden), pale, and on the scene's physical level. {was, now}. */
function manifestOf(tok) {
  const was = {hidden: !!tok.hidden, alpha: Number(tok.alpha ?? 1)};
  const now = {hidden: false, alpha: 0.8};
  try {
    const OW = game.modules.get("wodx-otherworlds")?.api;
    const phys = OW?.twins?.layersOf?.(tok.parent)?.physical ?? null;
    const lvl = tok._source?.level ?? tok.level ?? null;
    if ( phys && lvl && lvl !== phys.id ) { was.level = lvl; now.level = phys.id; }
  } catch (e) { /* no levels */ }
  return {was, now};
}
/**
 * B6009: Banish or Bar: the powers on the target end (their timed effects, with Undo); with none, a being from beyond
 * goes back across, and anything else is driven off, away from the caster.
 */
async function banishCore(item, a, d, casterName) {
  const o = item.out ?? {};
  if ( !a ) return {note: `${item.name}: not found`};
  const own = new Set(["wodx-effect-banish"]);
  const powers = [...(a.effects ?? [])].filter(e => { const k = String(e.flags?.["wodx-chronicle"]?.timed?.key ?? ""); return k.startsWith("wodx-effect-") && !own.has(k); });
  if ( powers.length ) {
    const restoreEffects = powers.map(e => { const x = e.toObject(); delete x._id; return x; });
    await a.deleteEmbeddedDocuments("ActiveEffect", powers.map(e => e.id));
    try { chron()?.tokenLooks?.refresh?.(); } catch (e) { /* no looks */ }
    return {uuid: a.uuid, restoreEffects};
  }
  const tok = tokenOf(d);
  if ( !tok ) return {note: `${item.name}: no token to drive off`};
  const OW = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api : null;
  const beyond = (() => { try { const L = OW?.twins?.layersOf?.(tok.parent); const lvl = tok._source?.level ?? tok.level; return !!(L?.physical && lvl && lvl !== L.physical.id); } catch (e) { return false; } })();
  if ( beyond && OW?.sendAcross ) { const r = await OW.sendAcross(tok); return r ? {across: tok.uuid, to: r.from === "shadowlands" ? "shadowlands" : null} : {note: `${item.name}: could not send it back`}; }
  const by = item?.by ?? item?.caster ?? item?.casterUuid;
  const from = tokenOf(by ? docOf(by) : null);
  const size = tok.parent?.grid?.size ?? 100, dist = tok.parent?.grid?.distance ?? 5;
  const sq = Math.max(1, Math.round(n(o.push || 10) / dist));
  let dx = 1, dy = 0;
  if ( from ) { const vx = n(tok.x) - n(from.x), vy = n(tok.y) - n(from.y), m = Math.hypot(vx, vy) || 1; dx = vx / m; dy = vy / m; }
  const was = {uuid: tok.uuid, x: tok.x, y: tok.y};
  await jump(tok, {x: Math.round(n(tok.x) + dx * sq * size), y: Math.round(n(tok.y) + dy * sq * size)});
  return {token: was};
}
/** B6009: Work or Break: the door nearest the Storyteller's click (or the target) opens, shuts, or is broken open. */
async function workCore(item, d, o, casterName) {
  const scene = canvas?.scene;
  if ( !scene ) return {note: `${o.label}: no scene`};
  const tok = tokenOf(d);
  const at = item.at ?? (tok ? {x: n(tok.x) + (scene.grid?.size ?? 100) / 2, y: n(tok.y) + (scene.grid?.size ?? 100) / 2} : await pickPoint(`Click by the door or lock ${casterName} works.`));
  if ( !at ) return {note: `${o.label}: no spot chosen`};
  const reach = 3 * (scene.grid?.size ?? 100);
  const mid = w => ({x: (n(w.c[0]) + n(w.c[2])) / 2, y: (n(w.c[1]) + n(w.c[3])) / 2});
  const door = [...(scene.walls ?? [])].filter(w => n(w.door) > 0).map(w => ({w, dist: Math.hypot(mid(w).x - at.x, mid(w).y - at.y)}))
    .filter(x => x.dist <= reach).sort((p, q) => p.dist - q.dist)[0]?.w ?? null;
  if ( !door ) return {note: `${o.label}: no door or lock within reach`};
  const ds = n(door.ds);
  // shut opens, open shuts, locked is broken open
  await door.update({ds: ds === 1 ? 0 : 1});
  return {door: {uuid: door.uuid, ds}};
}

async function choose(title, list, map = v => v) {
  if ( !list.length || !game.user.isGM ) return null;
  const DialogV2 = foundry.applications.api.DialogV2;
  const v = await DialogV2.prompt({window: {title}, classes: ["wodx-dialog"], rejectClose: false,
    content: `<div class="form-group"><select name="pick"${list.length > 12 ? "" : " data-fixed"}>${list.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join("")}</select></div>`,
    ok: {label: "Choose", callback: (ev, b) => b.form.elements.pick.value}});
  return v ? map(v) : null;
}
/** The Storyteller types a short name. Null when cancelled or empty. */
async function askText(title) {
  if ( !game.user.isGM ) return null;
  const DialogV2 = foundry.applications.api.DialogV2;
  const v = await DialogV2.prompt({window: {title}, classes: ["wodx-dialog"], rejectClose: false,
    content: `<div class="form-group"><input type="text" name="thing" maxlength="80" placeholder="a silver knife, a loaf, a lantern"></div>`,
    ok: {label: "Make it", callback: (ev, b) => String(b.form.elements.thing.value ?? "").trim()}});
  return v || null;
}

/* ------------------------------------------------------------------ */
/*  Areas: a circle on the scene that works on whoever enters          */
/* ------------------------------------------------------------------ */

/**
 * 3.35.1: put a token straight on a spot. In Foundry 14 a plain x/y update is a move that stops at walls, so a Move
 * through a wall (or its Undo) came up short; a "displace" move ignores walls. The plain update stays as a fallback.
 */
async function jump(tok, pos) {
  if ( typeof tok.move === "function" && CONFIG.Token?.movement?.actions?.displace ) {
    try { await tok.move([{x: pos.x, y: pos.y, action: "displace"}], {animate: false}); return; } catch (e) { /* plain update below */ }
  }
  await tok.update(pos, {animate: false, teleport: true});
}

const HOSTILE = ["harm", "hold", "fear", "trip"];
const centerOf = tok => {
  const size = tok?.parent?.grid?.size ?? 100;
  return {x: n(tok?.x) + (Number(tok?.width) || 1) * size / 2, y: n(tok?.y) + (Number(tok?.height) || 1) * size / 2};
};
const areaOf = r => r?.flags?.[MOD]?.effectArea ?? null;

/** When an area ends, in world seconds (null: at the end of the scene). */
function untilOf(timed) {
  if ( !timed ) return null;
  if ( timed.kind === "time" ) return (game.time?.worldTime ?? 0) + n(timed.seconds);
  if ( timed.kind === "rounds" ) return (game.time?.worldTime ?? 0) + 6 * Math.max(1, n(timed.rounds));
  return null;
}

/** B4830: when a made thing fades: {until} in world seconds, or {scene} for the end of the scene; null when it lasts. */
function madeEnd(timed) {
  if ( !timed ) return null;
  if ( timed.kind === "scene" ) return {scene: canvas?.scene?.id ?? null};
  if ( timed.kind === "night" ) return {until: (game.time?.worldTime ?? 0) + 12 * 3600};
  const u = untilOf(timed);
  return u === null ? null : {until: u};
}

/** B4830: made things whose time has run out fade from their holders' things (active Storyteller only). */
export async function expireMade({sceneEnd = false} = {}) {
  if ( !isActiveGM() ) return 0;
  const now = game.time?.worldTime ?? 0;
  let gone = 0;
  for ( const a of game.actors ?? [] ) {
    const ids = a.items.filter(i => {
      const m = i.flags?.[MOD]?.madeEnds;
      return m && ((sceneEnd && "scene" in m) || (Number.isFinite(m.until) && now >= m.until));
    });
    if ( !ids.length ) continue;
    await a.deleteEmbeddedDocuments("Item", ids.map(i => i.id));
    gone += ids.length;
    await ChatMessage.create({speaker: {alias: "WoDX"}, whisper: game.users.filter(u => u.isGM || a.testUserPermission?.(u, "OWNER")).map(u => u.id),
      content: `<div class="wodx-card"><p>${esc(ids.map(i => i.name).join(", "))} fade${ids.length === 1 ? "s" : ""} from ${esc(a.name)}'s hands: the power that made ${ids.length === 1 ? "it" : "them"} has run out.</p></div>`});
  }
  return gone;
}

/** Does the area touch this token? Not the caster, for an area meant to hurt or bind. */
function touches(area, tok) {
  if ( !tok || area.applied?.includes(tok.id) ) return false;
  if ( HOSTILE.includes(area.item?.key) || (area.item?.key === "fortune" && area.item?.out?.name === "Cursed") || ["blaze", "rubble"].includes(area.item?.out?.world) ) {
    if ( area.casterToken && tok.uuid === area.casterToken ) return false;
  }
  return E.inArea(centerOf(tok), area);
}

/** Work an area on one token: what may apply applies, the rest is queued or whispered. Returns an undo record or null. */
async function areaOn(region, tok) {
  const area = areaOf(region);
  if ( !area ) return null;
  const a = tok.actor;
  // A world area is the Storyteller's already: they placed it (B3757)
  const route = area.item.key === "world" ? "auto" : E.route(area.item.key, {self: false, playerCharacter: !!a?.hasPlayerOwner, count: 1, need: 0}, area.item.out);
  const item = {...area.item, target: tok.uuid, name: tok.name, route};
  let rec = null;
  if ( route === "auto" ) {
    rec = await applyItem(item, area.caster);
    if ( rec?.note ) rec = null;
  } else if ( route === "queue" ) {
    await chron()?.propose?.({type: TYPE, title: `${area.caster}: ${item.out.label} (area) on ${tok.name}`, detail: item.out.text, data: {item, caster: area.caster}});
  } else {
    await ChatMessage.create({content: `<p><b>${esc(item.out.label)}</b> (area) reaches ${esc(tok.name)}: ${esc(item.out.text)}.</p>`, whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: area.caster}});
  }
  await region.update({[`flags.${MOD}.effectArea.applied`]: [...(area.applied ?? []), tok.id], [`flags.${MOD}.effectArea.undo`]: rec ? [...(area.undo ?? []), rec] : (area.undo ?? [])});
  return rec;
}

/** How a ground area looks to everyone: flood water, fire, broken ground (B3757). */
/** The look on the map for each world kind (B3758): looks-rules.mjs in WoDX Chronicle. */
const LOOK_KIND = {water: "water", blaze: "fire", rubble: "rubble", flood: "flood", fire: "fire", quake: "quake", storm: "storm", plague: "plague",
  calm: "calm", dread: "fog", taint: "taint", cleanse: "calm"};
/** How long a town-wide look stays on the scene, in seconds of world time; a quake shakes once and is gone. */
const LOOK_SECONDS = {quake: 60, storm: 3 * 3600, flood: 6 * 3600, fire: 3 * 3600, plague: 24 * 3600, taint: 24 * 3600, calm: 3600, dread: 3600, cleanse: 600};
async function worldLook(scene, world, why) {
  const kind = LOOK_KIND[world];
  if ( !kind || !scene ) return null;
  try { return await chron()?.looks?.weather?.({scene, kind, until: {seconds: LOOK_SECONDS[world] ?? 3600}, source: why}) ?? null; }
  catch (e) { console.warn("WoDX | world look", e); return null; }
}
/** The lasting damage each ground leaves (B3759, scars-rules.mjs in WoDX Chronicle). */
const SCAR_KIND = {water: "flood", blaze: "fire", rubble: "quake"};
const GROUND_LOOK = {water: {fill: "#2f6f9f", edge: "#9fd0f0", alpha: 0.5}, blaze: {fill: "#c8501e", edge: "#ffb347", alpha: 0.45},
  rubble: {fill: "#6b5536", edge: "#b89b6a", alpha: 0.5}};
/** A ground area's drawing goes with its region, however the region ends (Undo, its time, the end of the scene). */
async function dropGroundDrawing(region) {
  const id = region?.flags?.[MOD]?.effectArea?.drawing;
  if ( isActiveGM() ) await chron()?.looks?.end?.(`area-${region?.id}`, region?.parent)?.catch?.(() => null);
  if ( id && isActiveGM() ) await region.parent?.drawings?.get(id)?.delete?.().catch(() => null);
}

/** Place an area on the scene at a spot, and work it on whoever stands in it already. */
export async function placeArea(item, at, {caster = "the caster", scene = canvas?.scene} = {}) {
  if ( !scene || !at ) return null;
  const ground = item.key === "world" ? item.out?.world : null;
  const radius = E.areaRadius({size: scene.grid?.size, distance: scene.grid?.distance, feet: ground ? item.out?.area : null});
  const color = ground === "water" ? "#2f5f8f" : ground ? "#9b5b2b" : HOSTILE.includes(item.key) ? "#9b3b3b" : "#5a7fb0";
  // A world area (B3757): deep water carries WoDX Combat's water flag, so swimming and drowning hold inside it
  const [region] = await scene.createEmbeddedDocuments("Region", [{name: `${item.out.label} (${caster})`, color,
    shapes: [{type: "ellipse", x: Math.round(at.x), y: Math.round(at.y), radiusX: radius, radiusY: radius, rotation: 0, hole: false}],
    flags: {...(ground === "water" ? {"wodx-combat": {water: "deep"}} : {}), [MOD]: {effectArea: {x: Math.round(at.x), y: Math.round(at.y), radius, item, caster, casterToken: item.caster ?? null,
      until: untilOf(item.out.timed), scene: item.out.timed?.kind === "scene" || !item.out.timed, applied: [], undo: []}}}}]);
  // Ground the players can see (B3757): regions show to the Storyteller only, so water, fire or broken ground gets a
  // drawing on the map under the tokens, removed with its region
  const look = GROUND_LOOK[ground];
  if ( look ) {
    const [drawing] = await scene.createEmbeddedDocuments("Drawing", [{x: Math.round(at.x - radius), y: Math.round(at.y - radius),
      shape: {type: "e", width: radius * 2, height: radius * 2}, fillType: 1, fillColor: look.fill, fillAlpha: look.alpha,
      strokeColor: look.edge, strokeAlpha: 0.8, strokeWidth: 6, locked: true, hidden: false, flags: {[MOD]: {groundOf: region.id}}}]).catch(() => []);
    if ( drawing ) await region.update({[`flags.${MOD}.effectArea.drawing`]: drawing.id});
    // The moving look on top (B3758): water ripples, flames, cracked ground, at each player's own level
    try {
      await chron()?.looks?.show?.({scene, kind: LOOK_KIND[ground], at: {x: Math.round(at.x), y: Math.round(at.y), radius}, drawing: drawing?.id ?? null,
        id: `area-${region.id}`, source: item.out?.power ?? item.out?.label ?? ""});
    } catch (e) { console.warn("WoDX | ground look", e); }
  }
  // Lasting damage (B3759): flood water, fire and broken ground, or a great blast, wreck what stands there until it
  // is rebuilt or the card's Undo takes it back; the area running out does not mend it
  let scar = null;
  const sq = Number(scene.grid?.size) || 100, label = String(item.out?.label ?? item.out?.power ?? "");
  const scarKind = ground ? SCAR_KIND[ground] : (item.key === "harm" && radius >= 3 * sq) ? (/fire|flame|burn|blaze|inferno|lava/i.test(label) ? "fire" : "blast") : null;
  if ( scarKind ) {
    try {
      scar = await chron()?.scars?.scar?.({scene, kind: scarKind, severity: radius >= 6 * sq ? 3 : radius >= 3 * sq ? 2 : 1, at: {x: Math.round(at.x), y: Math.round(at.y), radius},
        source: `area-${region.id}`, label: item.out?.label ?? ""}) ?? null;
    } catch (e) { console.warn("WoDX | ground scar", e); }
  }
  for ( const tok of scene.tokens ) {
    const area = areaOf(region);
    if ( touches(area, tok) ) await areaOn(region, tok);
  }
  return scar ? {region: region.uuid, scar, scene: scene.id} : {region: region.uuid};
}

/** A token moved: any area it now stands in works on it, once. */
async function onMove(tok, change) {
  if ( !isActiveGM() || !("x" in change || "y" in change) || tok?.flags?.["wodx-npc"]?.passerby ) return;
  for ( const region of tok.parent?.regions ?? [] ) {
    const area = areaOf(region);
    if ( area && touches(area, tok) ) await areaOn(region, tok);
  }
}

/** Areas end with their duration, or at the end of the scene. What they did stays (timed effects run out on their own). */
export async function expireAreas({sceneEnd = false} = {}) {
  if ( !isActiveGM() ) return 0;
  const now = game.time?.worldTime ?? 0;
  let gone = 0;
  for ( const scene of game.scenes ?? [] ) {
    const ids = (scene.regions ?? []).filter(r => {
      const a = areaOf(r);
      return a && ((a.scene && sceneEnd) || (Number.isFinite(a.until) && a.until !== null && now >= a.until));
    }).map(r => r.id);
    if ( ids.length ) { await scene.deleteEmbeddedDocuments("Region", ids); gone += ids.length; }
  }
  return gone;
}

/** Take back what a card applied. */
export async function undo(records = []) {
  const C = combat();
  for ( const r of [...records].reverse() ) {
    try {
      if ( r.region ) {
        if ( r.scar ) await chron()?.scars?.undo?.(r.scar, r.scene ?? null);
        const region = fromUuidSync(r.region);
        if ( region ) { await undo(areaOf(region)?.undo ?? []); await region.delete(); }
        continue;
      }
      const a = r.uuid ? fromUuidSync(r.uuid) : null;
      if ( r.health && a && C?.setDamage ) await C.setDamage(a, r.health);
      if ( Number.isFinite(r.quint) && a ) await a.update({"system.quintessence.temporary": r.quint});
      if ( r.pool?.path && a ) await a.update({[r.pool.path]: n(r.pool.value)});
      for ( const u of r.made ?? [] ) await fromUuidSync(u)?.delete?.();
      if ( r.attitude ) {
        const AT = game.modules.get("wodx-npc")?.api?.attitude, npc = game.actors.get(r.attitude.npc), ch = game.actors.get(r.attitude.char);
        if ( AT && npc && ch ) await (r.attitude.met ? AT.apply(npc, ch, {to: r.attitude.before, why: "Undone"}) : AT.forget(npc, ch));
      }
      if ( r.effect ) await fromUuidSync(r.effect)?.delete?.({wodxUndo: true});
      // B5780: what WoDX's own acts changed
      for ( const u of r.regions ?? [] ) await fromUuidSync(u)?.delete?.();
      if ( r.pathPrev ) await ACT.pathBack({prev: r.pathPrev});
      if ( r.restoreEffects?.length && a ) await a.createEmbeddedDocuments("ActiveEffect", r.restoreEffects);
      if ( r.npcMemory ) await game.modules.get("wodx-npc")?.api?.memory?.restore?.(r.npcMemory.npc, r.npcMemory.char, r.npcMemory.notes);
      if ( r.unflag ) await fromUuidSync(r.unflag.uuid)?.unsetFlag?.(MOD, r.unflag.key);
      if ( r.detect ) await ACT.detectBack(r.detect);
      for ( const m of r.moods ?? [] ) {
        const AT = game.modules.get("wodx-npc")?.api?.attitude, npc = game.actors.get(m.npc), ch = game.actors.get(m.char);
        if ( AT && npc && ch ) await (m.met ? AT.apply(npc, ch, {to: m.before, why: "Undone"}) : AT.forget(npc, ch));
      }
      if ( r.everyEffect ) await fromUuidSync(r.everyEffect)?.delete?.({wodxUndo: true});
      if ( r.across ) { const t = fromUuidSync(r.across); if ( t ) await game.modules.get("wodx-otherworlds")?.api?.sendAcross?.(t, {to: r.to}); }
      if ( r.weather ) await game.modules.get("wodx-atmosphere")?.api?.weather?.set?.(r.weather.jdn, r.weather.prev ?? null);
      // B6005-B6009: a possession's owners, a place's drift, a door, a banished token
      if ( r.ownership ) await fromUuidSync(r.ownership.uuid)?.update?.({ownership: r.ownership.was}, {diff: false, recursive: false});
      if ( r.drift ) { const sc = fromUuidSync(r.drift.scene); if ( sc ) await game.modules.get("wodx-otherworlds")?.api?.drift?.undo?.(sc); }
      if ( r.door ) await fromUuidSync(r.door.uuid)?.update?.({ds: r.door.ds});
      if ( r.taint ) { const sc = fromUuidSync(r.taint.scene); if ( sc ) await corruption()?.set?.(sc, r.taint.prev); }
      if ( r.sick ) await upkeep()?.contagion?.end?.(r.sick, {immune: false});
      if ( r.look ) await chron()?.looks?.end?.(r.look);
      if ( r.token ) {
        const tok = fromUuidSync(r.token.uuid);
        const back = {};
        for ( const k of ["elevation", "x", "y", "hidden", "alpha", "level"] ) if ( k in r.token ) back[k] = r.token[k];
        if ( r.token.movementAction ) back.movementAction = r.token.movementAction;
        if ( r.token.sight ) back.sight = r.token.sight;
        if ( r.token.light ) back.light = r.token.light;
        if ( tok ) {
          const {x, y, ...rest} = back;
          if ( x !== undefined || y !== undefined ) await jump(tok, {x: x ?? tok.x, y: y ?? tok.y});
          if ( Object.keys(rest).length ) await tok.update(rest, {animate: false});
        }
      }
    } catch (e) { console.warn("WoDX | effect undo", e); }
  }
}

/** The active Storyteller applies a new card's automatic items and sends the queued ones on. */
async function onCard(msg) {
  const data = msg.flags?.[MOD];
  if ( data?.kind === "counter" && data.card && isActiveGM() ) {
    const card = game.messages?.get(data.card);
    if ( card ) await applyCounter(card, data.successes, {mode: data.mode, by: data.by});
    return;
  }
  if ( data?.kind !== "effects" || data.done || data.hold || !isActiveGM() ) return;
  const records = [], notes = [], placed = [];
  for ( const [i, item] of (data.items ?? []).entries() ) {
    if ( item.route === "area" && item.at ) {
      const r = await placeArea(item, item.at, {caster: data.caster});
      if ( r?.note ) notes.push(r.note); else if ( r ) { records.push({...r, i}); placed.push(i); }
    } else if ( item.route === "auto" ) {
      const r = await applyItem(item, data.caster);
      if ( r?.note ) notes.push(r.note); else if ( r ) records.push(typeof r === "object" ? {...r, i} : r);
    } else if ( item.route === "queue" ) {
      await chron()?.propose?.({type: TYPE, title: `${data.caster}: ${item.out.label} on ${item.name}`, detail: item.out.text, data: {item, caster: data.caster}});
    }
  }
  await msg.update({[`flags.${MOD}.done`]: true, [`flags.${MOD}.undo`]: records, [`flags.${MOD}.notes`]: notes, ...(placed.length ? {[`flags.${MOD}.placed`]: [...(data.placed ?? []), ...placed]} : {})});
}

/* The Storyteller's next click on the map, in scene pixels (null when cancelled). */
const board = () => canvas?.app?.view ?? canvas?.app?.canvas ?? document.getElementById("board");
export function pickPoint(prompt = "Click the map. Right click or Escape cancels.") {
  return new Promise(resolve => {
    const el = board();
    if ( !el ) return resolve(null);
    const was = el.style.cursor;
    const end = p => {
      window.removeEventListener("pointerdown", down, true); window.removeEventListener("keydown", key, true); window.removeEventListener("contextmenu", menu, true);
      el.style.cursor = was; resolve(p);
    };
    const toScene = ev => {
      try {
        if ( typeof canvas.canvasCoordinatesFromClient === "function" ) return canvas.canvasCoordinatesFromClient({x: ev.clientX, y: ev.clientY});
        const r = el.getBoundingClientRect();
        return canvas.stage.worldTransform.applyInverse({x: ev.clientX - r.left, y: ev.clientY - r.top});
      } catch (e) { return canvas?.mousePosition ?? null; }
    };
    const down = ev => {
      if ( ev.target !== el ) return;
      ev.stopPropagation(); ev.preventDefault();
      if ( ev.button === 2 ) return end(null);
      if ( ev.button === 0 ) { const p = toScene(ev); end(p ? {x: p.x, y: p.y} : null); }
    };
    const key = ev => { if ( ev.key === "Escape" ) end(null); };
    const menu = ev => { if ( ev.target === el ) { ev.preventDefault(); ev.stopPropagation(); } };
    window.addEventListener("pointerdown", down, true); window.addEventListener("keydown", key, true); window.addEventListener("contextmenu", menu, true);
    el.style.cursor = "crosshair";
    ui.notifications?.info?.(prompt);
  });
}

/** A card's move or area item, on the Storyteller's click. */
export async function placeItem(msg, index, at = undefined) {
  const data = msg.flags?.[MOD];
  const item = data?.items?.[index];
  if ( !item || (data.placed ?? []).includes(index) ) return null;
  const spot = item.key === "summon" ? at : at ?? await pickPoint(item.route === "area" ? `Click where the ${item.out.label} area goes.` : `Click where ${item.name} goes.`);
  if ( item.key === "summon" ) {
    const rec = await applyItem({...item, ...(spot ? {at: spot} : {})}, data.caster);
    const good = rec && !rec.note;
    await msg.update({[`flags.${MOD}.placed`]: [...(data.placed ?? []), index], [`flags.${MOD}.undo`]: good ? [...(data.undo ?? []), rec] : (data.undo ?? []),
      [`flags.${MOD}.undone`]: false, ...(rec?.note ? {[`flags.${MOD}.notes`]: [...(data.notes ?? []), rec.note]} : {})});
    return rec;
  }
  if ( !spot ) return null;
  const rec = item.route === "area" ? await placeArea(item, spot, {caster: data.caster}) : await applyItem({...item, at: spot}, data.caster);
  const good = rec && !rec.note;
  await msg.update({[`flags.${MOD}.placed`]: [...(data.placed ?? []), index], [`flags.${MOD}.undo`]: good ? [...(data.undo ?? []), rec] : (data.undo ?? []),
    [`flags.${MOD}.undone`]: false, ...(rec?.note ? {[`flags.${MOD}.notes`]: [...(data.notes ?? []), rec.note]} : {})});
  return rec;
}

export function setup() {
  BIND.setup();
  game.settings.register(MOD, "effectsApply", {
    name: "Magic that applies itself", hint: "Mage 20th castings with effect keywords change health, Quintessence, timed effects, light, height and place on their own, with Undo; areas work on whoever enters; the rest goes to the approval queue. Automatic: on, except in the Live world.",
    scope: "world", config: true, type: String, default: "auto", choices: {auto: "Automatic", on: "On", off: "Off"}
  });
  game.settings.register(MOD, "stRituals", {scope: "world", config: false, type: Array, default: []});
  Hooks.on("getSceneControlButtons", controls => {
    const tokens = controls.tokens ?? controls.token;
    if ( !tokens?.tools || !game.user.isGM ) return;
    tokens.tools.wodxStEffect = {name: "wodxStEffect", title: "Apply an effect or ritual (keywords, with Undo)", icon: "fa-solid fa-wand-sparkles", order: 118,
      button: true, visible: true, onChange: () => storytellerEffect()};
  });
  Hooks.on("createChatMessage", msg => { onCard(msg).catch(e => console.error("WoDX | effects", e)); });
  Hooks.on("updateToken", (tok, change) => { onMove(tok, change).catch(e => console.error("WoDX | effect areas", e)); });
  Hooks.on("updateWorldTime", () => { expireAreas().catch(e => console.error("WoDX | effect areas", e)); expireMade().catch(e => console.error("WoDX | made things", e)); });
  Hooks.on("deleteRegion", region => { dropGroundDrawing(region).catch(e => console.error("WoDX | ground drawing", e)); });
  Hooks.on("wodxEndScene", () => { expireAreas({sceneEnd: true}).catch(e => console.error("WoDX | effect areas", e)); expireMade({sceneEnd: true}).catch(e => console.error("WoDX | made things", e)); });
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const data = msg.flags?.[MOD];
    if ( data?.kind !== "effects" || !el?.querySelector ) return;
    const box = el.querySelector(".wodx-effects");
    if ( !box ) return;
    if ( data.countered ) {
      const ul = box.querySelector("ul");
      if ( ul ) ul.outerHTML = listHtml(data);
      box.insertAdjacentHTML("beforeend", `<div class="vta-note">Countermagick${data.countered.by ? ` by ${esc(data.countered.by)}` : ""}: ${n(data.countered.total)} success${n(data.countered.total) === 1 ? "" : "es"} cancelled, ${n(data.countered.left)} left${data.countered.reflected ? `; ${n(data.countered.reflected)} turned back on the caster` : ""}.</div>`);
    }
    // Countermagick: anyone with a mage of their own may answer the card while it waits (or after, for the Storyteller)
    if ( !data.undone && (data.hold || game.user.isGM) && data.recipe ) {
      box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-counter"><i class="fa-solid fa-shield-halved"></i> Countermagick</button>`);
      box.querySelector(".wodx-effects-counter").addEventListener("click", ev => {
        ev.preventDefault();
        const who = canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
        if ( !who ) return ui.notifications?.warn?.("Select the countering mage's token first.");
        game.wodxActions?.m20Counter?.({actor: who, card: msg.id});
      });
    }
    if ( !game.user.isGM ) { if ( data.done && !data.undone ) addResistButtons(msg, data, box); return; }
    if ( data.hold ) {
      box.insertAdjacentHTML("beforeend", `<div class="vta-note">A target is a mage and may counter first.</div><button type="button" class="wodx-effects-release"><i class="fa-solid fa-play"></i> Apply now</button>`);
      box.querySelector(".wodx-effects-release").addEventListener("click", async ev => {
        ev.currentTarget.disabled = true;
        await msg.update({[`flags.${MOD}.hold`]: false});
        await onCard(game.messages.get(msg.id) ?? msg);
      });
      return;
    }
    if ( data.notes?.length ) box.insertAdjacentHTML("beforeend", `<div class="vta-note">${data.notes.map(esc).join("; ")}.</div>`);
    if ( !data.undone ) {
      (data.items ?? []).forEach((item, i) => {
        if ( !["pick", "area"].includes(item.route) || (data.placed ?? []).includes(i) ) return;
        const label = item.route === "area" ? `Place the ${item.out.label} area` : item.key === "summon" ? `Place the summons (${item.out.label})` : `Move ${item.name}`;
        box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-place" data-i="${i}"><i class="fa-solid fa-crosshairs"></i> ${esc(label)}</button>`);
      });
      box.querySelectorAll(".wodx-effects-place").forEach(b => b.addEventListener("click", async ev => {
        ev.currentTarget.disabled = true;
        await placeItem(msg, n(ev.currentTarget.dataset.i));
      }));
    }
    if ( !data.undone ) addResistButtons(msg, data, box);
    if ( !data.undo?.length || data.undone ) return;
    box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-undo"><i class="fa-solid fa-rotate-left"></i> Undo what applied</button>`);
    box.querySelector(".wodx-effects-undo").addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      await undo(data.undo);
      await msg.update({[`flags.${MOD}.undone`]: true});
    });
  });
}

/* ------------------------------------------------------------------ */
/*  Resisting (B4831): the roll the card names, made by the target      */
/* ------------------------------------------------------------------ */

/** The dice for a resistance pool, as the roster names it (house reading: the Ability that goes with each). */
const RESIST_POOL = {willpower: "willpower", dexterity: "dexterity+athletics", perception: "perception+awareness", strength: "strength", stamina: "stamina"};
/** Keywords whose effect a won resistance ends; hold can be tried again each turn. */
const ENDS_ON_RESIST = new Set(["hold", "fear", "possess", "bind", "illusion", "boost", "trip", "veil", "sway", "fortune", "hasten"]);

function addResistButtons(msg, data, box) {
  (data.items ?? []).forEach((item, i) => {
    const R = item.out?.resist;
    if ( !R || item.route !== "auto" || (data.resisted ?? []).includes(i) || (data.tried ?? []).includes(i) && item.key !== "hold" ) return;
    if ( !(data.undo ?? []).some(r => r?.i === i) ) return;
    const a = actorOf(docOf(item.target));
    if ( !a || !(game.user.isGM || a.testUserPermission?.(game.user, "OWNER")) ) return;
    const pool = RESIST_POOL[R.pool] ?? R.pool;
    const label = item.key === "hold" ? "Break free" : item.key === "illusion" ? "See through it" : "Resist";
    box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-resist" data-i="${i}"><i class="fa-solid fa-hand-fist"></i> ${esc(item.name)}: ${label} (${esc(pool.split("+").map(x => x[0].toUpperCase() + x.slice(1)).join(" + "))} at ${n(R.diff)})</button>`);
  });
  box.querySelectorAll(".wodx-effects-resist").forEach(b => b.addEventListener("click", async ev => {
    ev.currentTarget.disabled = true;
    await resistItem(msg, n(ev.currentTarget.dataset.i));
  }));
}

/** The target rolls to resist one item; any success ends what it did (a house reading). NPC rolls are the Storyteller's alone. */
export async function resistItem(msg, i) {
  const data = msg?.flags?.[MOD];
  const item = data?.items?.[i];
  const R = item?.out?.resist;
  const a = actorOf(docOf(item?.target));
  if ( !R || !a ) return null;
  const pool = RESIST_POOL[R.pool] ?? R.pool;
  const dice = Math.max(1, SUM.poolDice(a, pool));
  const roll = new Roll(`${dice}d10`);
  await roll.evaluate();
  const faces = roll.dice[0]?.results?.map(r => r.result) ?? [];
  const {countSuccesses} = await import("./core-rules.js");
  const res = countSuccesses(faces, n(R.diff));
  const won = res.successes > 0;
  const what = item.key === "hold" ? (won ? "breaks free" : "cannot break free this turn") : won ? `throws off ${item.out.label}` : `cannot throw off ${item.out.label}`;
  // B4928: the whole roll shows: the pool's parts, each die, the ones that cancel, and the power's own successes.
  // An NPC's resisting roll goes to the Storyteller alone (standing rule 19).
  const bd = SR.breakdown({parts: SUM.poolParts(a, pool), dice, diff: n(R.diff), faces, successes: res.successes, botch: res.botch, against: item.successes ?? null});
  await ChatMessage.create({speaker: {alias: a.name}, rolls: [roll], ...(a.hasPlayerOwner ? {} : {whisper: game.users.filter(u => u.isGM).map(u => u.id), blind: true}),
    content: `<div class="wodx-card"><p><b>${esc(a.name)}</b> rolls against ${esc(data.caster ?? "the caster")}'s ${esc(item.out.label)}, and ${esc(what)}.</p>
      <p class="wodx-quiet">${esc(bd.pool)}</p><p>${bd.faces.map(f => `<span class="vta-die ${f.mark}">${f.v}</span>`).join(" ")}</p><p>${esc(bd.result)}</p></div>`});
  if ( game.user.isGM ) return resolveResist(msg, i, won);
  game.socket.emit(`module.${MOD}`, {action: "effectResisted", msg: msg.id, i, won, user: game.user.id});
  return won;
}

/** Active Storyteller: take back the resisted item, and note the try. */
export async function resolveResist(msg, i, won) {
  if ( !isActiveGM() || !msg ) return null;
  const data = msg.flags?.[MOD];
  const item = data?.items?.[i];
  if ( !item ) return null;
  // B4925: a ghost that beats Compel Soul is safe from all of that vampire's Necromancy tonight (VtDA p. 287)
  if ( won && /compel soul/i.test(item.power ?? item.out?.label ?? "") && item.by ) {
    const by = actorOf(docOf(item.by)), tgt = actorOf(docOf(item.target));
    if ( by && tgt ) await LIM.lostTo(by, {name: "Compel Soul", disc: "Necromancy"}, tgt).catch(e => console.warn("WoDX | Compel Soul", e));
  }
  if ( won && ENDS_ON_RESIST.has(item.key) ) {
    // B4839: tearing free of a bite costs the one who tears loose (Clenched Jaw)
    const brk = item.out?.everyTurn?.onBreak?.damage;
    if ( brk ) { const t = docOf(item.target); await combat()?.soakAndApply?.(tokenOf(t)?.object ?? actorOf(t), {mode: "levels", amount: n(brk.levels) || 1, type: brk.type ?? "lethal", soak: brk.soak !== false}); }
    const recs = (data.undo ?? []).filter(r => r?.i === i);
    await undo(recs);
    await msg.update({[`flags.${MOD}.undo`]: (data.undo ?? []).filter(r => r?.i !== i), [`flags.${MOD}.resisted`]: [...(data.resisted ?? []), i]});
  } else await msg.update({[`flags.${MOD}.tried`]: [...new Set([...(data.tried ?? []), i])]});
  return won;
}

/** The approval queue's handler for queued keyword results (called once WoDX Chronicle is ready). */
export function registerHandler(api) {
  ACT.setup();
  // B4830: a Light or Dark keyword's timer puts the token's own light back when it runs out
  api?.timed?.registerReverter?.("wodx-actions.lightEnd", async (actor, data) => {
    const tok = data?.token ? fromUuidSync(data.token) : null;
    if ( tok && data.light ) await tok.update({light: data.light});
  });
  // B6005, B6008: a possession hands the body back; a manifestation fades back to its own side
  api?.timed?.registerReverter?.("wodx-actions.possessEnd", async (actor, data) => {
    const a = data?.actor ? fromUuidSync(data.actor) : actor;
    if ( a && data?.ownership ) await a.update({ownership: data.ownership}, {diff: false, recursive: false});
  });
  api?.timed?.registerReverter?.("wodx-actions.illusionEnd", async (actor, data) => { await (data?.tile ? fromUuidSync(data.tile) : null)?.delete?.(); });
  api?.timed?.registerReverter?.("wodx-actions.manifestEnd", async (actor, data) => {
    const tok = data?.token ? fromUuidSync(data.token) : null;
    if ( tok && data?.was ) await tok.update(data.was, {animate: false});
  });
  // B6000: what a power does to a character shows on the token: a Ward's shimmer, a Boost's glow, a Curse's shadow
  try { api?.tokenLooks?.register?.("wodx-actions.powers", token => { const l = PM.looksFrom(PM.effectsOf(token?.actor)); return l.length ? api.tokenLooks.rules?.combine?.(l, "full") ?? l[0] : null; }); } catch (e) { /* no looks */ }
  Hooks.on("createActiveEffect", e => { if ( String(e.flags?.["wodx-chronicle"]?.timed?.key ?? "").startsWith("wodx-effect-") ) try { api?.tokenLooks?.refresh?.(); } catch (x) { /* no looks */ } });
  Hooks.on("deleteActiveEffect", e => { if ( String(e.flags?.["wodx-chronicle"]?.timed?.key ?? "").startsWith("wodx-effect-") ) try { api?.tokenLooks?.refresh?.(); } catch (x) { /* no looks */ } });
  // Small (Chronicle 0.46.0, B2453): never. Only what is already past the effect rules' own Auto reaches the queue
  // (witnessed vulgar magic, a mind effect, another player's character, more than three targets)
  api?.registerApprovalHandler?.(TYPE, {label: "Magic that applies itself", small: () => false, approve: async entry => {
    const item = entry.data?.item, caster = entry.data?.caster ?? "the caster";
    const rec = await applyItem(item, caster);
    // 3.38.0: the approved result gets its own card, with Undo for what changed
    const good = rec && !rec.note && Object.keys(rec).some(k => k !== "attitude" || rec.attitude);
    await ChatMessage.create({speaker: {alias: caster}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: `<div class="wodx-card wodx-effects"><h3>${esc(caster)}: ${esc(item?.out?.label ?? "an effect")} on ${esc(item?.name ?? "")}</h3><p>${esc(item?.out?.text ?? "")}</p></div>`,
      flags: {[MOD]: {kind: "effects", done: true, items: [], caster, undo: good ? [rec] : [], notes: rec?.note ? [rec.note] : [], undone: false}}});
  }});
}


/* ------------------------------------------------------------------ */
/*  The Storyteller's effect (3.31.0, B782)                            */
/* ------------------------------------------------------------------ */

/** The world's saved rituals (the Storyteller's own keyword sets). */
export function ritualsOf() {
  try { return (game.settings.get(MOD, "stRituals") ?? []).filter(r => r?.name); } catch (e) { return []; }
}
export async function saveRitual(r) {
  if ( !r || !game.user.isGM ) return ritualsOf();
  const list = E.keepRitual(ritualsOf(), r);
  await game.settings.set(MOD, "stRituals", list);
  return list;
}
export async function forgetRitual(name) {
  const key = String(name ?? "").toLowerCase();
  await game.settings.set(MOD, "stRituals", ritualsOf().filter(r => r.name.toLowerCase() !== key));
}

const STEPS = ["a turn", "a scene", "a day", "a story", "six months"];

/** The window's form. picks: world actors and items for Summon and Make. */
function stContent(rituals, picks) {
  const opts = (list, none) => `<option value="">${none}</option>${list.map(x => `<option value="${esc(x.uuid)}">${esc(x.name)}</option>`).join("")}`;
  return `<form class="wodx-st-effect"><p class="hint">Applies on the targeted tokens (or the selected ones), with no roll. For a ritual or rite the players made up, or a power with no list yet. Everything it changes can be undone from its card.</p>
    ${rituals.length ? `<div class="form-group"><label>A saved ritual</label>${rituals.length > 5 ? searchBox("select[name=st-ritual]", "Search rituals…", "Search rituals") : ""}<select name="st-ritual"><option value="">(none)</option>${rituals.map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join("")}</select></div>` : ""}
    <div class="form-group"><label>From the books</label>${searchBox("select[name=st-book]", "Search book rituals…", "Search book rituals")}<select name="st-book"><option value="">(none)</option>${Object.entries(BOOK_RITUALS).map(([set, b]) =>
      `<optgroup label="${esc(b.book)}">${b.list.map((r, i) => `<option value="${set}:${i}">${esc(r.n)} (${esc(r.g)}${/^\d/.test(r.lvl) ? ` ${esc(r.lvl)}` : ""})</option>`).join("")}</optgroup>`).join("")}</select></div>
    <fieldset class="wodx-keywords"><legend>What it does (keywords)</legend><div class="wodx-kw-list" data-fixed>${Object.entries(E.KEYWORDS).map(([k, K]) =>
      `<label class="wodx-kw" title="${esc(K.does)}"><input type="checkbox" name="kw-${k}"/> ${esc(K.label)}</label>`).join("")}</div></fieldset>
    <div class="form-group"><label>Strength (as successes, 1 to ${E.ST_STRENGTH_MAX})</label><input type="number" name="st-strength" min="1" max="${E.ST_STRENGTH_MAX}" value="3"/></div>
    <div class="form-group"><label>Lasts</label><select name="st-step" data-fixed>${STEPS.map((l, i) => `<option value="${i + 1}"${i === 1 ? " selected" : ""}>${l}</option>`).join("")}</select></div>
    <div class="form-group"><label><input type="checkbox" name="kw-area"/> An area, ${E.AREA.feet} feet around a spot (works on whoever enters)</label></div>
    ${optionsHtml()}
    <div class="form-group"><label>Summon brings</label>${picks.actors.length > 5 ? searchBox("select[name=st-actor]", "Search actors…", "Search actors") : ""}<select name="st-actor">${opts(picks.actors, "(the Storyteller places it by hand)")}</select><input type="number" name="st-count" min="1" max="12" value="1" title="How many"/></div>
    <div class="form-group"><label>Make gives</label>${picks.items.length > 5 ? searchBox("select[name=st-item]", "Search items…", "Search items") : ""}<select name="st-item">${opts(picks.items, "(nothing on the sheet)")}</select></div>
    <div class="form-group"><label>Takes (casting time, shown on the card)</label><input type="text" name="st-takes" maxlength="60" placeholder="for example: one hour"/></div>
    <div class="form-group"><label>Note on the card</label><input type="text" name="st-note" maxlength="300"/></div>
    <div class="form-group"><label><input type="checkbox" name="st-whisper" checked/> Card for Storytellers only</label></div>
    <div class="form-group"><label>Save as a ritual named</label><input type="text" name="st-save" maxlength="60" placeholder="Leave empty to not save"/></div></form>`;
}

/** Fill the window in from a saved ritual. */
function stFill(root, r) {
  const set = (name, v) => { const el = root.querySelector(`[name="${name}"]`); if ( !el ) return; if ( el.type === "checkbox" ) el.checked = !!v; else el.value = String(v ?? ""); };
  for ( const k of Object.keys(E.KEYWORDS) ) set(`kw-${k}`, (r.keywords ?? []).includes(k));
  set("st-strength", r.strength ?? 1); set("st-step", r.step ?? 2); set("kw-area", r.area); set("st-note", r.note); set("st-takes", r.takes);
  for ( const [k, name] of Object.entries(CTX_BOXES) ) set(name, r.ctx?.[k]);
  for ( const [k, name] of Object.entries(CTX_SELECTS) ) if ( typeof r.ctx?.[k] === "string" ) set(name, r.ctx[k]);
  set("st-actor", r.ctx?.summonActor ?? ""); set("st-item", r.ctx?.makeItem ?? "");
}

/**
 * Card items for the Storyteller's effect. form: read(fd) plus {strength, step, actor, count, item}. docs: target
 * token documents. Everything applies on the Storyteller's own say: auto, or a click on the map for Move, Summon and
 * areas.
 */
export function stItems(form, docs) {
  const results = E.stOutcomes(form.keywords, {strength: form.strength, step: form.step, ctx: form.ctx, area: !!form.plan?.area});
  const items = [];
  for ( const {key, out} of results ) {
    if ( key === "summon" && form.actor ) {
      items.push({key, out: {...out, kind: "summon", actor: form.actor, count: form.count, text: `${form.count > 1 ? `${form.count} of ` : ""}${form.actorName}, placed where the Storyteller clicks`}, target: null, name: "a spot on the map", route: "pick"});
      continue;
    }
    if ( out.area ) { items.push({key, out, target: null, name: "an area", caster: null, route: "area"}); continue; }
    for ( const d of docs ) {
      let o = out;
      if ( key === "make" && form.item ) o = {...out, kind: "give", item: form.item, text: `${form.itemName} into ${d.name}'s inventory`};
      items.push({key, out: o, target: d.uuid, name: d.name, route: o.kind === "move" ? "pick" : "auto"});
    }
  }
  // The Storyteller's own world effect (B3757): it is their say already, so a town-wide one lands at once
  if ( form.world ) for ( const r of W.worldResults({world: [form.world]}, Math.max(W.WORLD[form.world].need, n(form.strength))) ) {
    items.push({key: "world", out: {...r.out, text: r.out.text.replace(/; the Storyteller approves it first$/, "")}, target: null,
      name: r.out.scope === "ground" ? "an area" : r.out.scope === "taint" ? "this place" : "the town", caster: null, scene: canvas?.scene?.id ?? null,
      route: r.out.scope === "ground" ? "area" : "auto"});
  }
  return items;
}

/** Open the Storyteller's effect window and post its card, which the Storyteller's client applies. */
export async function storytellerEffect() {
  if ( !game.user.isGM ) return ui.notifications?.warn?.("Only the Storyteller can apply effects this way.");
  const rituals = ritualsOf();
  const byName = c => [...(c ?? [])].map(x => ({uuid: x.uuid, name: x.name})).sort((a, b) => a.name.localeCompare(b.name));
  const picks = {actors: byName(game.actors), items: byName(game.items)};
  const r = await ask({title: "Apply an effect or ritual", content: stContent(rituals, picks), width: 560,
    buttons: [{id: "ok", label: "Apply", icon: "fa-solid fa-wand-sparkles", default: true}, {id: "no", label: "Cancel", icon: "fa-solid fa-xmark"}],
    onRender: root => {
      root?.querySelector?.('[name="st-ritual"]')?.addEventListener("change", ev => { const x = rituals[n(ev.currentTarget.value)]; if ( ev.currentTarget.value !== "" && x ) stFill(root, x); });
      root?.querySelector?.('[name="st-book"]')?.addEventListener("change", ev => { const [set, i] = String(ev.currentTarget.value).split(":"); const x = bookRitual(set, n(i)); if ( x ) stFill(root, x); });
    }});
  if ( !r || r.id !== "ok" ) return null;
  const fd = r.data, base = read(fd);
  if ( !base.keywords.length ) return ui.notifications?.warn?.("Tick at least one keyword.");
  const pick = (list, u) => list.find(x => x.uuid === u)?.name ?? "";
  const form = {...base, strength: n(fd["st-strength"]) || 1, step: n(fd["st-step"]) || 2, actor: fd["st-actor"] || "", actorName: pick(picks.actors, fd["st-actor"]),
    count: Math.max(1, Math.min(12, n(fd["st-count"]) || 1)), item: fd["st-item"] || "", itemName: pick(picks.items, fd["st-item"])};
  const docs = (game.user.targets?.size ? [...game.user.targets] : canvas?.tokens?.controlled ?? []).map(t => t.document).filter(Boolean);
  const needsTarget = form.keywords.some(k => !(k === "summon" && form.actor)) && !form.plan.area;
  if ( needsTarget && !docs.length ) return ui.notifications?.warn?.("Target or select the tokens it works on first.");
  const name = String(fd["st-save"] ?? "").trim();
  if ( name ) await saveRitual(E.ritualFrom(name, {...form, ctx: {...form.ctx, ...(form.actor ? {summonActor: form.actor} : {}), ...(form.item ? {makeItem: form.item} : {})}, area: form.plan.area, note: fd["st-note"], takes: fd["st-takes"]}));
  const items = stItems(form, docs);
  const fromBook = fd["st-book"] ? bookRitual(...String(fd["st-book"]).split(":").map((v, k) => (k ? n(v) : v))) : null;
  const title = name || (fd["st-ritual"] !== "" && rituals[n(fd["st-ritual"])]?.name) || fromBook?.name || "The Storyteller's effect";
  const extra = [fd["st-takes"] ? `Takes ${esc(fd["st-takes"])}.` : "", fd["st-note"] ? esc(fd["st-note"]) : ""].filter(Boolean).join(" ");
  const word = {auto: "applies", pick: "goes where the Storyteller clicks", area: "waits for the Storyteller to place it"};
  const content = `<div class="wodx-card"><h3>${esc(title)}</h3>${extra ? `<p>${extra}</p>` : ""}<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
    `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(i.out.text)}. <span class="wodx-quiet">It ${word[i.route]}.</span></li>`).join("")}</ul></div></div>`;
  return ChatMessage.create({content, speaker: {alias: title}, whisper: fd["st-whisper"] ? game.users.filter(u => u.isGM).map(u => u.id) : [],
    flags: {[MOD]: {kind: "effects", caster: title, items}}});
}
