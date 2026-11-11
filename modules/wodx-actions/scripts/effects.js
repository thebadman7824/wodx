/**
 * WoDX Actions 3.22.0 and 3.23.0: magic that applies itself, in Foundry. The Mage 20th Cast window gets effect keywords and a
 * spend plan; after the roll the card says what each keyword does to each target, and the active Storyteller's
 * client applies what may apply on its own (health, Quintessence, timed effects, light, height, conditions), with
 * one Undo button. What needs a yes goes to the approval queue; what is the Storyteller's call is listed for them.
 * World setting "Magic that applies itself": Automatic (on, except in the Live world), On, Off. Rules: effects-rules.js.
 */
import * as E from "./effects-rules.js";
import * as DAE from "./mage-da-effects.js";
import * as PE from "./path-effects.js";
export { E };
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
    <div class="form-group"><label>Options</label><div class="form-fields wodx-kw-opts" data-fixed>
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
    <div class="form-group"><label>Save as a rote named</label><input type="text" name="kw-save" maxlength="60" placeholder="Leave empty to not save"/></div></fieldset>`;
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
    save: String(fd["kw-save"] ?? "").trim()};
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
    if ( resist ) out.text = `${out.text}; ${resist.text}`;
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
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply",
    pick: "goes where the Storyteller clicks", area: "waits for the Storyteller to place it"};
  const html = !got.ok ? "" : `<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
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
  return planOf(actor, DAE.daOutcomes(rote, successes), successes);
}

/** A Thaumaturgy, Necromancy or Koldunic path power on the effects card (Dark Ages Disciplines). */
export function pathPlan(actor, power, successes) {
  return planOf(actor, PE.pathOutcomes(power, successes), successes);
}

/** A Numen at a level on the effects card (The Hunters Hunted II). */
export function numinaPlan(actor, key, level, successes, def) {
  return planOf(actor, PE.numinaOutcomes(key, level, successes, def), successes);
}

/** Results in the [{key, who, ask?, st?, out}] shape, spread over the caster's targets: {items, html}. */
export function planOf(actor, results, successes) {
  if ( !results.length ) return {items: [], html: ""};
  const t = targetsOf(actor);
  const own = actor?.getActiveTokens?.()?.[0]?.document ?? actor;
  const items = [];
  for ( const r of results ) {
    const k = DAE.targetCount(r.who, successes, t.self ? 0 : t.docs.length);
    const docs = r.who === "self" || !k ? [own] : t.docs.slice(0, k);
    const self = r.who === "self" || t.self;
    for ( const d of docs ) {
      const a = d?.actor ?? d;
      let route = !isOn() ? "off" : r.st ? "st" : E.route(r.key, {self, playerCharacter: !!a?.hasPlayerOwner, count: docs.length, need: 0}, r.out);
      if ( r.ask && route === "auto" ) route = "queue";
      if ( route === "auto" && r.out.kind === "move" ) route = "pick";
      items.push({key: r.key, out: r.out, target: d?.uuid ?? null, name: d?.name ?? a?.name ?? "", route});
    }
  }
  const word = {auto: "applies", queue: "waits in the approval queue", st: "is the Storyteller's call", off: "is for the Storyteller to apply", pick: "goes where the Storyteller clicks"};
  const html = `<div class="vta-res wodx-effects"><b>What it does</b><ul>${items.map(i =>
    `<li><b>${esc(i.out.label)}</b> on ${esc(i.name)}: ${esc(String(i.out.text).slice(0, 220))}. <span class="wodx-quiet">It ${word[i.route]}.</span></li>`).join("")}</ul></div>`;
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
  const d = docOf(item.target), a = actorOf(d), o = item.out;
  if ( !a ) return {note: `${item.name}: not found`};
  const C = combat(), T = chron();
  const health = foundry.utils.deepClone(a.system?.health?.damage ?? {});
  switch ( o.kind ) {
    case "damage":
      if ( !C ) return {note: "WoDX Combat is off: apply the damage by hand"};
      await C.soakAndApply(tokenOf(d)?.object ?? a, {mode: "levels", amount: o.levels, type: o.type, soak: o.soak});
      return {uuid: a.uuid, health};
    case "heal": {
      if ( !C ) return {note: "WoDX Combat is off: heal by hand"};
      let left = o.levels;
      for ( const type of o.aggravated ? ["aggravated"] : ["lethal", "bashing"] ) {
        const has = n(a.system?.health?.damage?.[type]);
        const take = Math.min(has, left);
        if ( take > 0 ) { await C.healDamage(a, type, take); left -= take; }
      }
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
      const tokenWas = tok ? {uuid: tok.uuid, elevation: tok.elevation, sight: foundry.utils.deepClone(tok.sight ?? {})} : null;
      const effect = await T.applyTimed(a, {name: o.name ?? o.label, description: `${o.text} (cast by ${casterName})`, duration: o.timed, condition: o.condition,
        changes, key: `wodx-effect-${o.key}`, source: o.source ?? "Mage 20th pp. 502-504"});
      if ( tok && o.feet ) await tok.update({elevation: n(tok.elevation) + o.feet});
      if ( tok && o.vision ) await tok.update({"sight.visionMode": "darkvision", "sight.range": Math.max(n(tok.sight?.range), 30)});
      return {uuid: a.uuid, effect: effect?.uuid ?? null, token: tok && (o.feet || o.vision) ? tokenWas : null};
    }
    case "pool": {
      const P = E.poolOf(o.pool);
      const was = n(foundry.utils.getProperty(a, P.path));
      const cap = P.cap ? n(foundry.utils.getProperty(a, P.cap)) : Infinity;
      await a.update({[P.path]: Math.max(0, Math.min(cap || Infinity, was + n(o.points)))});
      return {uuid: a.uuid, pool: {path: P.path, value: was}};
    }
    case "light": {
      const tok = tokenOf(d);
      if ( !tok ) return {note: "no token on the scene for the light"};
      const was = foundry.utils.deepClone(tok.light ?? {});
      await tok.update(o.dark ? {"light.negative": true, "light.dim": 20, "light.bright": 10} : {"light.negative": false, "light.dim": 30, "light.bright": 15, "light.color": "#ffd9a0"});
      return {token: {uuid: tok.uuid, light: was}};
    }
    case "move": {
      const tok = tokenOf(d);
      if ( !tok || !item.at ) return {note: `${item.name}: no token or no spot to move to`};
      const was = {uuid: tok.uuid, x: tok.x, y: tok.y};
      const size = tok.parent?.grid?.size ?? 100;
      const pos = {x: Math.round(item.at.x - (n(tok.width) || 1) * size / 2), y: Math.round(item.at.y - (n(tok.height) || 1) * size / 2)};
      await tok.update(pos, {animate: false, teleport: true});
      return {token: was};
    }
    default:
      return {note: `${o.label}: ${o.text}`};
  }
}

/* ------------------------------------------------------------------ */
/*  Areas: a circle on the scene that works on whoever enters          */
/* ------------------------------------------------------------------ */

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

/** Does the area touch this token? Not the caster, for an area meant to hurt or bind. */
function touches(area, tok) {
  if ( !tok || area.applied?.includes(tok.id) ) return false;
  if ( HOSTILE.includes(area.item?.key) || (area.item?.key === "fortune" && area.item?.out?.name === "Cursed") ) {
    if ( area.casterToken && tok.uuid === area.casterToken ) return false;
  }
  return E.inArea(centerOf(tok), area);
}

/** Work an area on one token: what may apply applies, the rest is queued or whispered. Returns an undo record or null. */
async function areaOn(region, tok) {
  const area = areaOf(region);
  if ( !area ) return null;
  const a = tok.actor;
  const route = E.route(area.item.key, {self: false, playerCharacter: !!a?.hasPlayerOwner, count: 1, need: 0}, area.item.out);
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

/** Place an area on the scene at a spot, and work it on whoever stands in it already. */
export async function placeArea(item, at, {caster = "the caster", scene = canvas?.scene} = {}) {
  if ( !scene || !at ) return null;
  const radius = E.areaRadius({size: scene.grid?.size, distance: scene.grid?.distance});
  const color = HOSTILE.includes(item.key) ? "#9b3b3b" : "#5a7fb0";
  const [region] = await scene.createEmbeddedDocuments("Region", [{name: `${item.out.label} (${caster})`, color,
    shapes: [{type: "ellipse", x: Math.round(at.x), y: Math.round(at.y), radiusX: radius, radiusY: radius, rotation: 0, hole: false}],
    flags: {[MOD]: {effectArea: {x: Math.round(at.x), y: Math.round(at.y), radius, item, caster, casterToken: item.caster ?? null,
      until: untilOf(item.out.timed), scene: item.out.timed?.kind === "scene" || !item.out.timed, applied: [], undo: []}}}}]);
  for ( const tok of scene.tokens ) {
    const area = areaOf(region);
    if ( touches(area, tok) ) await areaOn(region, tok);
  }
  return {region: region.uuid};
}

/** A token moved: any area it now stands in works on it, once. */
async function onMove(tok, change) {
  if ( !isActiveGM() || !("x" in change || "y" in change) ) return;
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
        const region = fromUuidSync(r.region);
        if ( region ) { await undo(areaOf(region)?.undo ?? []); await region.delete(); }
        continue;
      }
      const a = r.uuid ? fromUuidSync(r.uuid) : null;
      if ( r.health && a && C?.setDamage ) await C.setDamage(a, r.health);
      if ( Number.isFinite(r.quint) && a ) await a.update({"system.quintessence.temporary": r.quint});
      if ( r.pool?.path && a ) await a.update({[r.pool.path]: n(r.pool.value)});
      if ( r.effect ) await fromUuidSync(r.effect)?.delete?.();
      if ( r.token ) {
        const tok = fromUuidSync(r.token.uuid);
        const back = {};
        for ( const k of ["elevation", "x", "y"] ) if ( k in r.token ) back[k] = r.token[k];
        if ( r.token.sight ) back.sight = r.token.sight;
        if ( r.token.light ) back.light = r.token.light;
        if ( tok ) await tok.update(back, {animate: false, teleport: true});
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
  const records = [], notes = [];
  for ( const item of data.items ?? [] ) {
    if ( item.route === "auto" ) {
      const r = await applyItem(item, data.caster);
      if ( r?.note ) notes.push(r.note); else if ( r ) records.push(r);
    } else if ( item.route === "queue" ) {
      await chron()?.propose?.({type: TYPE, title: `${data.caster}: ${item.out.label} on ${item.name}`, detail: item.out.text, data: {item, caster: data.caster}});
    }
  }
  await msg.update({[`flags.${MOD}.done`]: true, [`flags.${MOD}.undo`]: records, [`flags.${MOD}.notes`]: notes});
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
  const spot = at ?? await pickPoint(item.route === "area" ? `Click where the ${item.out.label} area goes.` : `Click where ${item.name} goes.`);
  if ( !spot ) return null;
  const rec = item.route === "area" ? await placeArea(item, spot, {caster: data.caster}) : await applyItem({...item, at: spot}, data.caster);
  const good = rec && !rec.note;
  await msg.update({[`flags.${MOD}.placed`]: [...(data.placed ?? []), index], [`flags.${MOD}.undo`]: good ? [...(data.undo ?? []), rec] : (data.undo ?? []),
    [`flags.${MOD}.undone`]: false, ...(rec?.note ? {[`flags.${MOD}.notes`]: [...(data.notes ?? []), rec.note]} : {})});
  return rec;
}

export function setup() {
  game.settings.register(MOD, "effectsApply", {
    name: "Magic that applies itself", hint: "Mage 20th castings with effect keywords change health, Quintessence, timed effects, light, height and place on their own, with Undo; areas work on whoever enters; the rest goes to the approval queue. Automatic: on, except in the Live world.",
    scope: "world", config: true, type: String, default: "auto", choices: {auto: "Automatic", on: "On", off: "Off"}
  });
  Hooks.on("createChatMessage", msg => { onCard(msg).catch(e => console.error("WoDX | effects", e)); });
  Hooks.on("updateToken", (tok, change) => { onMove(tok, change).catch(e => console.error("WoDX | effect areas", e)); });
  Hooks.on("updateWorldTime", () => { expireAreas().catch(e => console.error("WoDX | effect areas", e)); });
  Hooks.on("wodxEndScene", () => { expireAreas({sceneEnd: true}).catch(e => console.error("WoDX | effect areas", e)); });
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
    if ( !game.user.isGM ) return;
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
        const label = item.route === "area" ? `Place the ${item.out.label} area` : `Move ${item.name}`;
        box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-place" data-i="${i}"><i class="fa-solid fa-crosshairs"></i> ${esc(label)}</button>`);
      });
      box.querySelectorAll(".wodx-effects-place").forEach(b => b.addEventListener("click", async ev => {
        ev.currentTarget.disabled = true;
        await placeItem(msg, n(ev.currentTarget.dataset.i));
      }));
    }
    if ( !data.undo?.length || data.undone ) return;
    box.insertAdjacentHTML("beforeend", `<button type="button" class="wodx-effects-undo"><i class="fa-solid fa-rotate-left"></i> Undo what applied</button>`);
    box.querySelector(".wodx-effects-undo").addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      await undo(data.undo);
      await msg.update({[`flags.${MOD}.undone`]: true});
    });
  });
}

/** The approval queue's handler for queued keyword results (called once WoDX Chronicle is ready). */
export function registerHandler(api) {
  api?.registerApprovalHandler?.(TYPE, {label: "Magic that applies itself", approve: async entry => { await applyItem(entry.data?.item, entry.data?.caster); }});
}
