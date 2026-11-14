import {MODULE_ID, esc} from "./util.mjs";
import {propose, registerHandler} from "./approvals.mjs";
import * as BW from "./bg-world.mjs";
import {searchBox} from "./search.mjs";
import * as T from "./trait-rules.mjs";
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
/** The traits' effects on one roll, and the signature features' (clan, tribe, auspice, breed) when their line is on. */
export const effects = (actor, ctx = {}) => [...T.effectsFor(view(actor), ctx), ...sigRollEffects(actor, ctx)];
/** For WoDX Senses: what the character's traits do to their own senses, and what others sense about them. */
export const senses = actor => T.senseEffects(view(actor));
export const shows = actor => T.showsOf(view(actor));
/** For WoDX Actions (B3780): the situations the character's merits and flaws ask the player to tick on a roll. */
export const ticks = actor => T.ticksOf(view(actor));
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
export async function prompt(actors, on, {at = "", where = ""} = {}) {
  if ( !MOMENTS[on] ) return 0;
  let n = 0;
  for ( const a of [actors].flat().filter(Boolean) ) {
    const list = T.promptsOn(view(a), on);
    if ( !list.length ) continue;
    n++;
    await propose({type: PROMPT_TYPE, key: `trait:${on}:${a.id}:${at || Math.floor(game.time?.worldTime ?? 0)}`,
      title: `${a.name}: ${list.map(x => x.name).join(", ")} (${MOMENTS[on]})`,
      detail: list.map(x => `${x.name}: ${x.text}.`).join(" "), data: {actor: a.id, on, where, list}});
  }
  return n;
}
function registerPromptHandler() {
  registerHandler(PROMPT_TYPE, {label: "A merit or flaw comes into play",
    small: entry => { const l = entry.data?.list ?? []; return l.length > 0 && l.every(x => T.isMechanical(x.key)); },
    approve: async entry => {
    const d = entry.data ?? {}, a = game.actors.get(d.actor);
    const items = (d.list ?? []).map(x => `<li><b>${esc(x.name)}</b>: ${esc(x.text)}.</li>`).join("");
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

export const traitsApi = {view, of, has, effects, senses, shows, ticks, attitudeSeed, groupsOf, triggers, pulls, ledgerFor, prompt, worldPlan, makeReal, open, whenFeats, kindOf, table: {merits: MERITS_FLAWS, backgrounds: BACKGROUNDS, patterns: T.PATTERNS}, rules: T};
