import {MODULE_ID, esc} from "./util.mjs";
import {searchBox} from "./search.mjs";
import * as T from "./trait-rules.mjs";
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
  return {kind: kindOf(actor), pc: !!actor?.hasPlayerOwner, features, powers};
}

export const of = actor => T.traitsOf(view(actor));
export const has = (actor, keyOrName) => T.has(view(actor), keyOrName);
export const effects = (actor, ctx = {}) => T.effectsFor(view(actor), ctx);

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
    buttons: [{action: "close", label: "Close", default: true}]});
}

export function registerTraitHooks() {
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

export const traitsApi = {view, of, has, effects, open, whenFeats, kindOf, table: {merits: MERITS_FLAWS, backgrounds: BACKGROUNDS, patterns: T.PATTERNS}, rules: T};
