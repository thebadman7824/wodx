import {MODULE_ID, esc} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import * as BW from "./bg-world.mjs";
import {searchBox} from "./search.mjs";
import * as T from "./trait-rules.mjs";
import * as TB from "./trait-bite-rules.mjs";
import {applyTimed} from "./timed.mjs";
import {rollEffects as sigRollEffects} from "./signatures.mjs";
import {MERITS_FLAWS, BACKGROUNDS} from "../data/trait-effects.mjs";

/**
 * WoDX Chronicle 0.18.0: the trait effect table on the Foundry side. The rules are in trait-rules.mjs.
 *
 *   Item flag wodx-chronicle.trait = {key}: the table entry a merit, flaw or background item is (key "none" leaves it
 *   alone). Set from the "Trait effects" window (actor sheet header, Storyteller or owner).
 *   game.modules.get("wodx-chronicle").api.traits: {view, of, has, effects, open, table, rules}.
 *
 * Every other module reads a character's traits through view(actor) and the rules file, so NPCs and player
 * characters are read the same way.
 */

const api = id => game.modules.get(id)?.active ? game.modules.get(id).api : null;

/** The kind of character, as WoDX Combat names it (mortal when Combat is off). */
export function kindOf(actor) {
  try { return api("wodx-combat")?.getKind?.(actor) ?? String(actor?.type ?? "mortal").toLowerCase(); } catch (e) { return "mortal"; }
}

/** What the rules read about one character: {kind, pc, features, powers}. */
export function view(actor) {
  const features = [], powers = [];
  for ( const i of actor?.items ?? [] ) {
    const kind = i.type === "Feature" ? T.featureKind(i.system?.type) : null;
    if ( kind ) features.push({id: i.id, name: i.name ?? "", kind, value: Number(i.system?.value) || 0, flagKey: i.flags?.[MODULE_ID]?.trait?.key ?? null});
    else if ( i.type === "Power" ) powers.push(i.name ?? "");
  }
  return {kind: kindOf(actor), pc: !!actor?.hasPlayerOwner, features, powers, groups: groupsOf(actor)};
}

/** B3783: the sect, clan, tribe, affiliation, kith and the like on a sheet, wherever the line keeps them. */
const GROUP_KEYS = new Set(["sect", "clan", "tribe", "affiliation", "kith", "house", "court", "camp", "faction", "conspiracy", "creed", "lineage", "dynasty", "legacy", "guild"]);
export function groupsOf(actor) {
  const out = new Set();
  const walk = (o, depth) => {
    if ( !o || typeof o !== "object" || depth > 3 ) return;
    for ( const [k, v] of Object.entries(o) ) {
      if ( typeof v === "string" ) { if ( GROUP_KEYS.has(k.toLowerCase()) && v.trim() && !v.includes(".") ) out.add(v.trim()); }
      else if ( v && typeof v === "object" && !Array.isArray(v) ) walk(v, depth + 1);
    }
  };
  try { walk(actor?.system ?? {}, 0); } catch (e) { /* no sheet */ }
  return [...out];
}

export const of = actor => T.traitsOf(view(actor));
export const has = (actor, keyOrName) => T.has(view(actor), keyOrName);
/**
 * B3902: other modules add effects of their own on the same channels (WoDX Library: a ward carried, a holy symbol
 * held). Each source is fn(actor, ctx) -> [{key, name, dice, diff, note}].
 */
const SOURCES = [];
export function addSource(fn) { if ( typeof fn === "function" && !SOURCES.includes(fn) ) SOURCES.push(fn); return () => SOURCES.splice(SOURCES.indexOf(fn), 1); }
const fromSources = (actor, ctx) => SOURCES.flatMap(fn => { try { return fn(actor, ctx) ?? []; } catch (e) { console.warn("WoDX Chronicle | trait effect source", e); return []; } });
/** The traits' effects on one roll, the signature features' (clan, tribe, auspice, breed) when their line is on, and other modules'. */
export const effects = (actor, ctx = {}) => [...T.effectsFor(view(actor), ctx), ...sigRollEffects(actor, ctx), ...fromSources(actor, ctx)];
/** For WoDX Senses: what the character's traits do to their own senses, and what others sense about them. */
export const senses = actor => T.senseEffects(view(actor));
export const shows = actor => T.showsOf(view(actor));
/** For WoDX Actions (B3780): the situations the character's merits and flaws ask the player to tick on a roll. */
export const ticks = actor => T.ticksOf(view(actor));
/** For WoDX Combat (B3793): extra health levels, softer wound penalties, silver. */
export const toughness = actor => T.bodyOf(view(actor));
/** For WoDX NPC: how the character's traits move a first meeting with this NPC: {delta, names}. */
export const attitudeSeed = (actor, npc, extra = {}) => T.attitudeSeed(view(actor), npc ? {
  kind: kindOf(npc),
  groups: [...groupsOf(npc), ...(extra.groups ?? [])],
  words: [...(extra.words ?? []), ...(extra.office ? [extra.office] : [])],
  office: !!extra.office
} : null);

/** For "Only when": the working traits as {name, key, kind, value, aliases}, and the power names. */
export function whenFeats(actor) {
  const v = view(actor), t = T.traitsOf(v);
  const feats = [
    ...t.matched.filter(m => !m.wrongKind).map(m => ({name: m.name, key: m.key, kind: m.kind, value: m.value, aliases: [m.entry.name, ...(m.entry.aliases ?? [])]})),
    ...t.unmatched.map(u => ({name: u.name, key: "", kind: u.kind, value: u.value, aliases: []}))
  ];
  return {feats, powers: v.powers};
}

const ENTRIES = () => [...MERITS_FLAWS, ...BACKGROUNDS];

/** The window: each merit, flaw and background, what it matched and what it does; the Storyteller can change the match. */
export async function open(actorOrId) {
  const a = typeof actorOrId === "string" ? game.actors.get(actorOrId) : actorOrId;
  if ( !a || !(game.user.isGM || a.isOwner) ) return null;
  const gm = game.user.isGM;
  const v = view(a), t = T.traitsOf(v);
  // Step 8: backgrounds the world does not hold yet (Allies with no sheets, a Domain with no region)
  const todo = gm ? BW.plan(a, v).filter(x => x.more > 0) : [];
  const opts = (kind, sel) => [`<option value="">Match by name</option>`, `<option value="none"${sel === "none" ? " selected" : ""}>No effect (a home-made trait)</option>`,
    ...ENTRIES().filter(e => e.kind === kind).sort((x, y) => x.name.localeCompare(y.name))
      .map(e => `<option value="${esc(e.key)}"${sel === e.key ? " selected" : ""}>${esc(e.name)}</option>`)].join("");
  const rows = v.features.map(f => {
    const m = t.matched.find(x => x.id === f.id);
    const what = m ? (m.wrongKind ? `Does nothing: ${esc(m.why)}.` : esc(T.describe(m))) : (f.flagKey === "none" ? "Left alone." : "No match in the table: no effect yet.");
    const pick = gm ? `<select data-wct-item="${f.id}" aria-label="Table entry for ${esc(f.name)}">${opts(f.kind, f.flagKey ?? "")}</select>` : "";
    return `<li><b>${esc(f.name)}</b> <small>(${esc(f.kind)}${f.value ? ` ${f.value}` : ""})</small>${m && m.entry.name !== f.name ? ` <small>= ${esc(m.entry.name)}</small>` : ""}<br><small>${what}</small>${pick ? `<br>${pick}` : ""}</li>`;
  }).join("");
  const wire = (ev, dlg) => {
    for ( const s of dlg?.element?.querySelectorAll?.("[data-wct-item]") ?? [] ) s.addEventListener("change", async () => {
      const item = a.items.get(s.dataset.wctItem);
      if ( !item ) return;
      if ( s.value ) await item.update({[`flags.${MODULE_ID}.trait`]: {key: s.value}});
      else await item.update({[`flags.${MODULE_ID}.-=trait`]: null});
      dlg.close();
      open(a);
    });
  };
  return foundry.applications.api.DialogV2.wait({rejectClose: false, render: wire, position: {width: 600}, window: {title: `Trait effects: ${a.name}`}, classes: ["wodx-dialog", "wct-traits"],
    content: `<p>Merits, flaws and backgrounds on ${esc(a.name)} (${esc(v.kind)}), and what WoDX does with each. ${t.unmatched.filter(u => !u.skipped).length} with no effect yet.</p>
      ${v.features.length > 5 ? searchBox("ul.wct-traits-list", "Search traits…", "Search traits") : ""}<div class="wst-scroll"><ul class="wct-traits-list">${rows || "<li>No merits, flaws or backgrounds on this sheet.</li>"}</ul></div>`,
    buttons: [...(todo.length ? [{action: "real", label: `Make them real (${todo.map(x => x.name).join(", ")})`, callback: () => BW.makeReal(a, v)}] : []),
      {action: "close", label: "Close", default: true}]});
}

/* ---- Step 8 (Chronicle 0.23.0): backgrounds as things in the world ---- */
export const worldPlan = actor => BW.plan(actor, view(actor));
export const makeReal = actor => BW.makeReal(actor, view(actor));

/* ---- Step 7 (Chronicle 0.22.0) ---- */

/** For WoDX Interactables: the map triggers a character carries (P4). */
export const triggers = actor => T.triggersOf(view(actor));
/** For WoDX Storyteller: what a character's traits put in the night's draw (P8). rand: () => 0..1. */
export const pulls = (actor, rand) => T.pullsOf(view(actor), rand, actor?.name ?? "");
/** For WoDX Storyteller: the Ledger entries a character's traits call for (P10). */
export const ledgerFor = (actor, now = game.time?.worldTime ?? 0) => T.ledgerOf(view(actor), {id: actor?.id ?? "", name: actor?.name ?? "", now});

export const PROMPT_TYPE = `${MODULE_ID}.traitPrompt`;
const MOMENTS = {feed: "feeding", social: "a social act", fight: "a fight", night: "tonight"};
/**
 * A moment where traits should bite (P11): one queue card a character, keyed so the same moment is not asked twice.
 * on: feed, social, fight or night. at: what makes the moment its own (a night's date, a fight id). Returns how many.
 */
export async function prompt(actors, on, {at = "", where = "", vessel = null} = {}) {
  if ( !MOMENTS[on] ) return 0;
  let n = 0;
  for ( const a of [actors].flat().filter(Boolean) ) {
    const list = T.promptsOn(view(a), on);
    if ( !list.length ) continue;
    n++;
    await propose({type: PROMPT_TYPE, key: `trait:${on}:${a.id}:${at || Math.floor(game.time?.worldTime ?? 0)}`,
      title: `${a.name}: ${list.map(x => x.name).join(", ")} (${MOMENTS[on]})`,
      detail: list.map(x => `${x.name}: ${x.text}.`).join(" "), data: {actor: a.id, on, where, list, vessel}});
  }
  return n;
}
const BITE_KEY = "wodx-trait-bite";
const traitVal = (a, k) => { const s = a?.system ?? {}; return Number(s.attributes?.[k]?.value ?? s.abilities?.[k]?.value ?? s.advantages?.virtues?.[k]?.permanent ?? s.advantages?.virtues?.[k]?.value) || 0; };
/** Roll and land one trait's bite. Returns the line for the card, or null when the trait has no rule. */
async function bite(a, x, d) {
  const b = TB.biteOf(x.key);
  if ( !b ) return null;
  const f = b.fail ?? {};
  let r = null, faces = [], roll = null, held = false, frenzy = false;
  if ( b.roll ) {
    const [pool, diff0] = b.roll;
    const wp = a.system?.advantages?.willpower ?? {};
    const dice = pool === "willpower" || pool === "banality" ? Number(wp.permanent) || 3 : pool === "rage" ? Number(a.system?.advantages?.rage?.permanent) || 1 : Math.max(1, traitVal(a, pool));
    const diff = pool === "banality" ? Math.max(3, Math.min(10, Number(a.system?.banality?.permanent ?? a.system?.advantages?.banality?.permanent) || 6)) : diff0;
    roll = await new Roll(`${Math.max(1, dice)}d10`).evaluate();
    faces = roll.dice[0]?.results?.map(q => q.result) ?? [];
    r = TB.count(faces, diff);
    ({held, frenzy} = TB.outcome(b, r));
    if ( held ) return `rolled ${faces.join(", ")} at ${diff}: held.`;
  }
  const said = r ? `rolled ${faces.join(", ")}: ` : "";
  if ( f.hint ) {
    await ChatMessage.create({content: `<div class="wodx-card"><p><b>Common Sense</b>: before ${esc(d.on === "fight" ? "this fight" : "this step")}, ${esc(a.name)} has a feeling it may be a mistake. Think it over once more.</p></div>`, speaker: {alias: a.name}, whisper: game.users.filter(u => !u.isGM && a.testUserPermission(u, "OWNER")).map(u => u.id).concat(game.users.filter(u => u.isGM).map(u => u.id))});
    return "a word of warning went to the player.";
  }
  if ( f.wp ) { const wp = a.system?.advantages?.willpower ?? {}; await a.update({"system.advantages.willpower.temporary": Math.max(0, (Number(wp.temporary) || 0) + f.wp)}); return `${said}a Willpower point goes.`; }
  if ( f.spendWp ) {
    const wp = Number(a.system?.advantages?.willpower?.temporary) || 0;
    if ( wp > 0 ) { await a.update({"system.advantages.willpower.temporary": wp - 1}); return `${said}a Willpower point spent to set it aside.`; }
    return timedBite(a, x, f.else, said);
  }
  if ( f.banality ) { const p = a.system?.banality ? "system.banality.temporary" : "system.advantages.banality.temporary"; await a.update({[p]: (Number(foundry.utils.getProperty(a, p)) || 0) + f.banality}); return `${said}a point of Banality.`; }
  if ( "bout" in f ) {
    const D = game.modules.get(MODULE_ID)?.api?.derangements;
    if ( f.bout ) await D?.startBout?.(a, f.bout); else await D?.hold?.(a);
    return `${said}a derangement takes hold for the scene.`;
  }
  if ( f.infect ) {
    const v = d.vessel ? await fromUuid(d.vessel) : null, va = v?.actor ?? v;
    if ( !va ) return "no vessel to infect.";
    const die = (await new Roll("1d10").evaluate()).total;
    if ( !TB.infects(f.infect, die) ) return `rolled ${die}: the bite stays clean.`;
    await va.update({"flags.wodx-actions.vesselState": "disease"});
    try { await va.toggleStatusEffect?.("disease", {active: true}); } catch (e) { /* no such status */ }
    await applyTimed(va, {name: TB.FEVER.name, description: "−1 die on every roll while the fever runs", duration: {kind: "time", seconds: TB.FEVER.seconds},
      key: `${BITE_KEY}:fever`, data: {name: TB.FEVER.name, tags: TB.FEVER.tags, dice: TB.FEVER.dice, diff: 0}, source: "V20 p. 481"});
    return `rolled ${die}: the bite festers. ${va.name} falls sick (a die off every roll for a week) and carries it in the blood.`;
  }
  if ( f.consume ) {
    const v = d.vessel ? await fromUuid(d.vessel) : null, va = v?.actor ?? v;
    if ( !va ) return "no vessel.";
    const mortal = !/vampire|kindred|cainite|wraith|spirit/i.test(`${va.type} ${va.system?.kind ?? ""}`);
    if ( !mortal ) return `${va.name} is no mortal: there is nothing to eat.`;
    try { await va.toggleStatusEffect?.("dead", {active: true, overlay: true}); } catch (e) { /* no status */ }
    await va.update({"flags.wodx-actions.fleshTaken": true});
    return `the heart and liver are eaten too: ${va.name} is dead.`;
  }
  if ( f.berserk ) {
    const to = game.users.filter(u => u.isGM || a.testUserPermission(u, "OWNER")).map(u => u.id);
    await ChatMessage.create({content: `<div class="wodx-card"><p><b>Berserker</b>: ${esc(a.name)} can go berserk at will, ignoring wound penalties (W20 p. 476).</p><button type="button" data-wct-berserk="${esc(a.uuid)}">Go berserk</button></div>`,
      speaker: {alias: a.name}, whisper: to});
    return "the player has a button to go berserk.";
  }
  if ( f.frenzy ) {
    if ( !frenzy ) return `${said}no frenzy.`;
    await a.update({"system.conditions.isfrenzy": true});
    await game.modules.get(MODULE_ID)?.api?.conditions?.setCondition?.(a, "frenzy", true);
    return `${said}frenzy.`;
  }
  return timedBite(a, x, f, said);
}
async function timedBite(a, x, f, said) {
  if ( !f?.tags ) return null;
  await applyTimed(a, {name: f.name, description: `${x.name}: ${f.diff ? `+${f.diff} difficulty` : `${f.dice} dice`} on ${f.tags.join(", ")} rolls`, duration: {kind: f.lasts === "night" ? "night" : "scene"},
    key: `${BITE_KEY}:${x.key}`, data: {name: f.name, tags: f.tags, diff: f.diff ?? 0, dice: f.dice ?? 0}, source: "WoDX trait"});
  return `${said}${f.name}: ${f.diff ? `+${f.diff} difficulty` : `${f.dice} dice`} on ${f.tags.includes("all") ? "every roll" : `${f.tags.join(", ")} rolls`} for the ${f.lasts === "night" ? "night" : "scene"}.`;
}
/**
 * B5012: a timed roll effect another module puts on a character (WoDX Library's drink and drugs): dice or difficulty
 * on rolls with any of the tags ("all" for every roll), for a duration applyTimed reads. key keeps one per cause.
 */
export async function addBite(a, {key, name, tags = ["all"], dice = 0, diff = 0, duration = {kind: "scene"}, source = ""} = {}) {
  if ( !a?.createEmbeddedDocuments || !key || (!Number(dice) && !Number(diff)) ) return null;
  return applyTimed(a, {name, description: `${Number(diff) ? `${diff > 0 ? "+" : ""}${diff} difficulty` : `${dice > 0 ? "+" : ""}${dice} dice`} on ${tags.includes("all") ? "every roll" : `${tags.join(", ")} rolls`}`,
    duration, key: `${BITE_KEY}:${key}`, data: {name, tags, diff: Number(diff) || 0, dice: Number(dice) || 0}, source});
}
/** The bites in force on a character, as roll effects. */
function biteSource(actor, ctx = {}) {
  const list = (actor?.effects ?? []).filter(e => !e.disabled && String(e.flags?.[MODULE_ID]?.timed?.key ?? "").startsWith(BITE_KEY)).map(e => e.flags[MODULE_ID].timed.data ?? {});
  return list.length && (ctx.channel ?? "roll") === "roll" ? TB.biteEffects(list, ctx.tags ?? []) : [];
}
function registerPromptHandler() {
  addSource(biteSource);
  registerHandler(PROMPT_TYPE, {label: "A merit or flaw comes into play",
    small: entry => { const l = entry.data?.list ?? []; return l.length > 0 && l.every(x => T.isMechanical(x.key) || !!TB.biteOf(x.key)); },
    approve: async entry => {
    const d = entry.data ?? {}, a = game.actors.get(d.actor);
    // B4879: each trait with a rule rolls and lands its effect; the rest keep the card
    const done = [];
    for ( const x of d.list ?? [] ) { const line = a ? await bite(a, x, d).catch(e => { console.error("WoDX Chronicle | trait", e); return null; }) : null; if ( line ) done.push(x.key), x.result = line; }
    const items = (d.list ?? []).map(x => `<li><b>${esc(x.name)}</b>: ${esc(x.result ?? `${x.text}.`)}</li>`).join("");
    await ChatMessage.create({content: `<div class="wodx-card"><h3>${esc(a?.name ?? "A character")}: ${esc(MOMENTS[d.on] ?? "now")}</h3><ul>${items}</ul></div>`,
      speaker: {alias: "Chronicle"}, whisper: game.users.filter(u => u.isGM).map(u => u.id)});
  }});
}

export function registerTraitHooks() {
  registerPromptHandler();
  // WoDX Actions' social acts and WoDX Combat's fights call for the moment's prompts. The hooks are heard only on the
  // client that sent them; prompt() goes to the Storyteller's queue from any client, and the key stops repeats.
  const actorOf = x => (x?.documentName === "Actor" ? x : x?.actor ?? (typeof x === "string" ? game.actors.get(x) : null));
  Hooks.on("wodxSocial", p => { const a = actorOf(p?.actor); if ( a ) prompt(a, "social", {at: `${actorOf(p?.npc)?.id ?? ""}:${Math.floor(game.time.worldTime)}`}); });
  Hooks.on("wodxFightStarted", p => {
    const pcs = [...(p?.combat?.combatants ?? [])].map(c => c.actor).filter(a => a?.hasPlayerOwner);
    if ( pcs.length ) prompt(pcs, "fight", {at: p?.combat?.id ?? ""});
  });
  const can = a => !!a && (game.user.isGM || a.isOwner);
  // B5175: Berserker's button: the player sends the character into a berserk frenzy (frenzy ignores wound penalties)
  Hooks.on("renderChatMessageHTML", (msg, el) => {
    const b = el?.querySelector?.("[data-wct-berserk]");
    if ( !b ) return;
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      const d = await fromUuid(b.dataset.wctBerserk), a = d?.actor ?? d;
      if ( !can(a) || b.disabled ) return;
      b.disabled = true;
      await a.update({"system.conditions.isfrenzy": true});
      await game.modules.get(MODULE_ID)?.api?.conditions?.setCondition?.(a, "frenzy", true);
      await ChatMessage.create({content: `<div class="wodx-card"><p><b>${esc(a.name)}</b> goes berserk: frenzy, and no wound penalties while it lasts.</p></div>`, speaker: {alias: a.name}});
    });
  });
  Hooks.on("getHeaderControlsActorSheetV2", (app, controls) => {
    const a = app.document;
    if ( !can(a) || controls.some(c => c.action === "wctTraits") ) return;
    const go = () => open(a);
    if ( app.options?.actions ) app.options.actions.wctTraits = go;
    controls.push({icon: "fa-solid fa-scale-balanced", label: "Trait effects", action: "wctTraits", onClick: go});
  });
  Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
    if ( !can(sheet.actor) || buttons.some(b => b.class === "wct-traits") ) return;
    buttons.unshift({label: "Trait effects", class: "wct-traits", icon: "fa-solid fa-scale-balanced", onclick: () => open(sheet.actor)});
  });
}

export const traitsApi = {addBite, view, of, has, effects, addSource, senses, shows, ticks, toughness, attitudeSeed, groupsOf, triggers, pulls, ledgerFor, prompt, worldPlan, makeReal, open, whenFeats, kindOf, table: {merits: MERITS_FLAWS, backgrounds: BACKGROUNDS, patterns: T.PATTERNS}, rules: T};
