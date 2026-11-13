/**
 * WoDX Creation 0.24.0: the step-by-step character wizard (B2760 to B2766). One page per step of the book's creation
 * order, with Back and Next: the book, Attributes and Abilities by priority, the line's powers, Backgrounds, Virtues,
 * Merits and Flaws, the freebie points at the book's costs, and a last look. Everything is written to the sheet as
 * it is chosen, so the sheet, the creation check and Before the First Night always agree. The pure part is
 * wizard-rules.mjs.
 */
import {MODULE_ID, esc} from "./actor-data.mjs";
import {TOTALS} from "./totals-rules.mjs";
import {totalsView, lineFor, CreationCheckApp} from "./totals-check.mjs";
import * as B from "./first-night-build-rules.mjs";
import * as W from "./wizard-rules.mjs";
import * as Q from "./quick-start-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {MERITS_FLAWS, BACKGROUNDS} from "../../wodx-chronicle/data/trait-effects.mjs";

const {ApplicationV2} = foundry.applications.api;
const FLAG = "wizard";
const BG = "wod.types.background", MERIT = "wod.types.merit", FLAW = "wod.types.flaw";
const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const prop = (o, p) => String(p).split(".").reduce((x, k) => x?.[k], o);
const chron = () => (game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api : null);
const darkEra = () => { try { return ["dark-ages", "long-night"].includes(chron()?.eras?.activeEra?.()?.profile?.id ?? ""); } catch (e) { return false; } };

export const wizardOf = actor => W.normWizard(actor?.flags?.[MODULE_ID]?.[FLAG] ?? {});
const saveWizard = (actor, w) => actor.update({[`flags.${MODULE_ID}.${FLAG}`]: W.normWizard(w)});

/** The book the wizard counts by: the player's pick, else the creation check's. */
export const wizardLine = actor => wizardOf(actor).line ?? lineFor(actor);

const feats = (actor, type) => [...(actor.items ?? [])].filter(i => i.type === "Feature" && i.system?.type === type);
const points = (actor, type) => feats(actor, type).reduce((t, i) => t + n(i.system?.value), 0);
const preludeLog = actor => actor?.flags?.[MODULE_ID]?.firstNight?.prelude?.log ?? [];

/** The ledger for a sheet: what Before the First Night's Build step and the check after the prelude read. */
export function ledgerFor(actor, lineId = null) {
  const line = lineId && TOTALS[lineId] ? lineId : wizardLine(actor);
  if ( !TOTALS[line] ) return null;
  return {line, ...W.ledger(totalsView(actor, line), line, {wizard: wizardOf(actor), merits: points(actor, MERIT), flaws: points(actor, FLAW),
    prelude: W.preludeAllowance(preludeLog(actor))})};
}

export class WizardApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-wizard"],
    window: {title: "Character wizard", icon: "fa-solid fa-wand-magic-sparkles", resizable: true},
    position: {width: 680, height: "auto"},
    actions: {go: WizardApp.#onGo, step: WizardApp.#onStep, extra: WizardApp.#onExtra, other: WizardApp.#onOther, addItem: WizardApp.#onAddItem,
      removeItem: WizardApp.#onRemoveItem, addFeature: WizardApp.#onAddFeature, sheet: WizardApp.#onSheet, check: WizardApp.#onCheck, hub: WizardApp.#onHub, quick: WizardApp.#onQuick}
  };

  static openFor(actor, page = null) {
    if ( !actor?.isOwner ) return ui.notifications.warn("You can only build your own character.");
    const height = Math.max(460, Math.min(860, window.innerHeight - 80));
    const app = foundry.applications.instances?.get?.(`wodx-wizard-${actor.id}`) ?? new WizardApp({actor, id: `wodx-wizard-${actor.id}`, position: {height}});
    if ( page ) app.page = page;
    return app.render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    this.page = wizardOf(this.actor).page;
  }

  get title() { return `Character wizard: ${this.actor?.name ?? ""}`; }
  get lineId() { return wizardLine(this.actor); }
  get pages() { return W.pagesFor(this.lineId); }

  /** Options for the rules: the order, the ledger's extras, the sheet's Merit, Flaw and prelude points. */
  get opts() {
    const a = this.actor;
    return {wizard: wizardOf(a), merits: points(a, MERIT), flaws: points(a, FLAW), prelude: W.preludeAllowance(preludeLog(a))};
  }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    const lineId = this.lineId, L = TOTALS[lineId];
    if ( !L ) { div.innerHTML = `<p class="wodx-quiet">WoDX has no creation totals for this kind of sheet yet. Use the sheet itself.</p>`; return div; }
    const pages = this.pages;
    if ( !pages.some(p => p.key === this.page) ) this.page = "book";
    const view = totalsView(this.actor, lineId), opts = this.opts;
    const led = W.ledger(view, lineId, opts);
    const at = pages.findIndex(p => p.key === this.page);
    const nav = pages.map((p, i) => `<button type="button" data-action="go" data-page="${p.key}" class="${p.key === this.page ? "wodx-wz-here" : ""}" aria-current="${p.key === this.page ? "step" : "false"}">${i + 1}. ${esc(p.label)}</button>`).join("");
    const body = this.#page(this.page, {L, lineId, view, opts, led});
    const left = led.left;
    div.innerHTML = `
      <div class="wodx-top">
        <nav class="wodx-wz-nav" aria-label="Wizard steps">${nav}</nav>
        <p class="wodx-wz-count"><b>Freebie points:</b> ${led.spent} spent of ${led.budget}${led.flawsCounted ? ` (${led.flawsCounted} from Flaws)` : ""}${led.prelude ? ` (${led.prelude} from the prelude)` : ""}.
          ${left >= 0 ? `${left} left.` : `<b>${-left} too many.</b>`}</p>
      </div>
      <div class="wodx-scroll">${body}</div>
      <div class="wodx-buttons">
        <button type="button" data-action="go" data-page="${W.nextPage(pages, this.page, -1)}" ${at <= 0 ? "disabled" : ""}><i class="fa-solid fa-arrow-left"></i> Back</button>
        <button type="button" data-action="sheet"><i class="fa-solid fa-user"></i> The sheet</button>
        <button type="button" data-action="go" data-page="${W.nextPage(pages, this.page, 1)}" ${at >= pages.length - 1 ? "disabled" : ""}>Next <i class="fa-solid fa-arrow-right"></i></button>
      </div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  _onRender() {
    this.element.querySelector("select[name=line]")?.addEventListener("change", async ev => {
      const w = wizardOf(this.actor);
      w.line = ev.target.value;
      await saveWizard(this.actor, w);
      this.render();
    });
    for ( const sel of this.element.querySelectorAll("select[data-rank]") ) sel.addEventListener("change", async ev => {
      const kind = ev.target.dataset.kind, w = wizardOf(this.actor);
      const groups = kind === "attributes" ? W.ATTR_GROUPS : W.ABIL_GROUPS;
      w.order[kind] = W.setRank(this.#order(kind), ev.target.dataset.group, Number(ev.target.value));
      if ( !W.goodOrder(w.order[kind], groups) ) return;
      await saveWizard(this.actor, w);
      this.render();
    });
  }

  /** The priority order in use: the player's, else the one the sheet suggests. */
  #order(kind) {
    const w = wizardOf(this.actor);
    if ( w.order[kind] ) return w.order[kind];
    const view = totalsView(this.actor, this.lineId);
    if ( kind === "attributes" ) return W.suggestedOrder(view.attributes, W.ATTR_GROUPS);
    return W.suggestedOrder(Object.fromEntries(W.ABIL_GROUPS.map(g => [g, view.abilities?.[g]?.dots ?? 0])), W.ABIL_GROUPS);
  }

  /* -------------------------------------------- */
  /*  Pages                                       */
  /* -------------------------------------------- */

  #page(key, ctx) {
    switch ( key ) {
      case "book": return this.#book(ctx);
      case "attributes": return this.#groups("attributes", ctx);
      case "abilities": return this.#groups("abilities", ctx);
      case "powers": return this.#powers(ctx);
      case "backgrounds": return this.#backgrounds(ctx);
      case "virtues": return this.#virtues(ctx);
      case "meritsFlaws": return this.#merits(ctx);
      case "freebies": return this.#freebies(ctx);
      default: return this.#review(ctx);
    }
  }

  /** One row of dots with its - and + buttons. change: the data the step handler reads. */
  #row(label, value, max, min, change, ctx, page) {
    const ch = this.#change(change);
    const up = W.canRaise(ctx.view, ctx.lineId, ch, {page, value, max, ...ctx.opts});
    const data = Object.entries(change).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
    const price = page === "freebies" && up.cost ? `<span class="wodx-quiet">+${up.cost}</span>` : "";
    return `<tr><td>${esc(label)}</td><td class="wodx-fn-dots">${B.dots(value, 5)}</td>
      <td><button type="button" data-action="step" ${data} data-d="-1" data-page="${page}" ${value <= min ? "disabled" : ""} aria-label="One less ${esc(label)}">-</button>
      <button type="button" data-action="step" ${data} data-d="1" data-page="${page}" ${up.ok ? "" : "disabled"} title="${esc(up.why ?? "")}" aria-label="One more ${esc(label)}">+</button> ${price}</td></tr>`;
  }

  /** The rules' change from a row's data. */
  #change(d) {
    if ( d.kind === "ability" ) return {kind: "ability", group: d.group, above: n(d.value) >= (TOTALS[this.lineId]?.abilityCap ?? 3)};
    if ( d.kind === "attribute" ) return {kind: "attribute", group: d.group};
    if ( d.kind === "power" || d.kind === "sphere" ) return {kind: "power", key: d.key};
    return {kind: d.kind};
  }

  #book({L, lineId}) {
    const opt = (v, l) => `<option value="${esc(v)}" ${v === lineId ? "selected" : ""}>${esc(l)}</option>`;
    return `<h3>Which book builds this character</h3>
      <p>The wizard goes through the book's steps in order. Each choice is written to the sheet at once, and Back undoes nothing by itself: lower a dot to take it back.</p>
      <div class="form-group"><label>Book</label>${searchBox("select[name=line]", "Search books…", "Search books")}
        <select name="line">${Object.entries(TOTALS).map(([k, t]) => opt(k, t.label)).join("")}</select></div>
      <p class="wodx-quiet">${esc(L.label)}: ${esc(L.ref)}. Freebie costs: ${esc(L.costRef)}.</p>
      <ul>
        <li>Attributes ${L.attributes.join(", ")} (each starts at 1)</li>
        <li>Abilities ${L.abilities.join(", ")}, none above ${L.abilityCap} before freebies</li>
        ${(L.powers ?? []).map(p => `<li>${esc(p.label)}: ${p.dots}${p.note ? `. ${esc(p.note)}` : ""}</li>`).join("")}
        <li>Backgrounds ${L.backgrounds}${L.rebirth ? `, plus ${L.rebirth.backgrounds} from the Rebirth` : ""}</li>
        ${L.virtues !== undefined ? `<li>Virtues ${L.virtues}</li>` : ""}
        <li>Freebie points ${L.freebies}${L.rebirth ? ` plus ${L.rebirth.freebies} from the Rebirth` : ""}, and up to ${L.flaws ?? 7} more from Flaws</li>
      </ul>
      <p class="wodx-quiet">Concept, Nature and Demeanor${L.sheet === "Vampire" ? ", clan" : ""} go on the sheet first. Starting values: ${esc(L.start.join("; "))}.</p>
      <h3>Quick start</h3>
      <p>Pick what the character was before the story, and the wizard spends the Attributes, Abilities${L.virtues !== undefined ? " and Virtues" : ""} for you. You can change any of it on the next pages, and still choose the ${esc((L.powers ?? []).map(p => p.label).join(" and ") || "powers")}, Backgrounds and freebies yourself.</p>
      <div class="wodx-wz-add"><select name="quick-concept" aria-label="Concept for the quick start" data-fixed>${Object.entries(Q.CONCEPTS).map(([k, c]) => `<option value="${k}">${esc(c.label)}</option>`).join("")}</select>
        <button type="button" data-action="quick"><i class="fa-solid fa-bolt"></i> Fill in a starting build</button></div>`;
  }

  #groups(kind, ctx) {
    const {L, view} = ctx;
    const groups = kind === "attributes" ? W.ATTR_GROUPS : W.ABIL_GROUPS;
    const allot = kind === "attributes" ? L.attributes : L.abilities;
    const order = this.#order(kind);
    const traits = B.traitGroups(this.actor.system ?? {});
    const rows = W.ledger(view, ctx.lineId, {...ctx.opts, wizard: {...ctx.opts.wizard, order: {...ctx.opts.wizard.order, [kind]: order}}}).check.rows;
    const out = groups.map(g => {
      const rank = order.indexOf(g), row = rows.find(r => r.group === g);
      const sel = `<select data-rank data-kind="${kind}" data-group="${g}" data-fixed aria-label="${W.GROUP_LABEL[g]} priority">${W.RANK.map((r, i) => `<option value="${i}" ${i === rank ? "selected" : ""}>${r} (${allot[i]})</option>`).join("")}</select>`;
      const list = traits[g] ?? [];
      const body = list.map(t => this.#row(t.label, t.value, t.max, t.min, kind === "attributes" ? {kind: "attribute", group: g, path: t.path, value: t.value}
        : {kind: "ability", group: g, path: t.path, value: t.value}, ctx, kind)).join("");
      const state = row ? (row.over ? `<b>${row.over} over</b>` : row.under ? `${row.under} to spend` : "done") : "";
      return `<h4>${W.GROUP_LABEL[g]} ${sel} <span class="wodx-quiet">${state}</span></h4>${body ? `<table class="wodx-table">${body}</table>` : `<p class="wodx-quiet">This sheet shows none.</p>`}`;
    }).join("");
    const intro = kind === "attributes"
      ? "Pick which group matters most to the character, then spend its dots. Every Attribute starts with one free dot."
      : `Pick the order for Talents, Skills and Knowledges, then spend. No Ability goes above ${L.abilityCap} here; freebie points can raise one later.`;
    return `<h3>${kind === "attributes" ? "Attributes" : "Abilities"}</h3><p>${intro}</p>${out}`;
  }

  #powers(ctx) {
    const {L, lineId} = ctx;
    return `<h3>${esc((L.powers ?? []).map(p => p.label).join(" and "))}</h3>` + (L.powers ?? []).map(p => this.#power(p, ctx, "powers")).join("");
  }

  /** One power's block: its rows and, for item powers, a way to add one. */
  #power(p, ctx, page) {
    const kind = W.POWER_KIND[p.key] ?? {store: "hand"};
    const row = ctx.led.check.rows.find(r => r.group === p.key);
    const head = `<h4>${esc(p.label)} <span class="wodx-quiet">${p.dots} at creation${row && row.have !== null ? `, ${row.under ? `${row.under} to spend` : row.over ? `${row.over} over` : "done"}` : ""}</span></h4>${p.note && page !== "freebies" ? `<p class="wodx-quiet">${esc(p.note)}</p>` : ""}`;
    if ( kind.store === "hand" ) return `${head}<p class="wodx-quiet">The sheet keeps no such Trait. Write them on the sheet with the Storyteller and count them by hand.</p>`;
    if ( kind.store === "sphere" ) {
      const sp = this.actor.system?.spheres ?? {};
      const rows = Object.entries(sp).filter(([, s]) => s && typeof s === "object").map(([k, s]) => this.#row(W.POWER_NAMES.sphere.find(x => x.toLowerCase() === k) ?? k, n(s.value), 5, 0,
        {kind: "sphere", key: p.key, path: `system.spheres.${k}.value`, value: n(s.value)}, ctx, page)).join("");
      return `${head}${rows ? `<table class="wodx-table">${rows}</table>` : `<p class="wodx-quiet">This sheet has no Spheres.</p>`}`;
    }
    const items = this.#powerItems(p.key);
    const rows = items.map(i => {
      const v = kind.dots ? n(i.system?.value) : 1;
      const remove = `<button type="button" data-action="removeItem" data-item="${i.id}" aria-label="Take ${esc(i.name)} off"><i class="fa-solid fa-xmark"></i></button>`;
      if ( !kind.dots ) return `<tr><td>${esc(i.name)}</td><td></td><td>${remove}</td></tr>`;
      return this.#row(i.name, v, kind.max ?? 5, 1, {kind: "power", key: p.key, item: i.id, value: v}, ctx, page).replace("</td></tr>", ` ${remove}</td></tr>`);
    }).join("");
    if ( page === "freebies" && !kind.dots ) return `${head}${rows ? `<table class="wodx-table">${rows}</table>` : ""}<p class="wodx-quiet">Add more on the ${esc(p.label)} page; each costs ${ctx.L.costs[p.key] ?? "?"} past the ${p.dots}.</p>`;
    const sug = W.powerSuggestions(p.key, ctx.lineId, {clan: this.actor.system?.clan, dark: darkEra()});
    const have = new Set(items.map(i => i.name.toLowerCase()));
    const opt = x => have.has(x.toLowerCase()) ? "" : `<option value="${esc(x)}">${esc(x)}</option>`;
    const choices = `${sug.first.length ? `<optgroup label="${p.key === "discipline" && ctx.lineId !== "ghoul" && ctx.lineId !== "revenant" ? "The clan's" : "From the book"}">${sug.first.map(opt).join("")}</optgroup>` : ""}${sug.more.length ? `<optgroup label="Others (freebie points)">${sug.more.map(opt).join("")}</optgroup>` : ""}`;
    const pick = choices ? `${searchBox(`select[name=pick-${p.key}]`, "Search…", `Search ${p.label}`)}<select name="pick-${p.key}"><option value="">Choose…</option>${choices}</select>` : "";
    return `${head}${rows ? `<table class="wodx-table">${rows}</table>` : `<p class="wodx-quiet">None yet.</p>`}
      <div class="wodx-wz-add" data-key="${p.key}">${pick}<input type="text" name="name-${p.key}" placeholder="Or write a name" aria-label="Another ${esc(p.label)}">
        <button type="button" data-action="addItem" data-key="${p.key}"><i class="fa-solid fa-plus"></i> Add</button></div>`;
  }

  #powerItems(key) {
    const k = W.POWER_KIND[key];
    if ( !k || k.store !== "item" ) return [];
    return [...(this.actor.items ?? [])].filter(i => i.type === k.type && (k.sub ? i.system?.type === k.sub : true)).sort((a, b) => a.name.localeCompare(b.name));
  }

  #bgRows(ctx, page) {
    return feats(this.actor, BG).sort((a, b) => a.name.localeCompare(b.name)).map(i => this.#row(i.name, n(i.system?.value), 5, 1, {kind: "background", item: i.id, value: n(i.system?.value)}, ctx, page)
      .replace("</td></tr>", ` <button type="button" data-action="removeItem" data-item="${i.id}" aria-label="Take ${esc(i.name)} off"><i class="fa-solid fa-xmark"></i></button></td></tr>`)).join("");
  }

  #backgrounds(ctx) {
    const {L, lineId} = ctx;
    const rows = this.#bgRows(ctx, "backgrounds");
    const have = new Set(feats(this.actor, BG).map(i => i.name.toLowerCase()));
    const list = W.backgroundOptions(lineId, BACKGROUNDS).filter(b => !have.has(b.name.toLowerCase()));
    return `<h3>Backgrounds</h3><p>${L.backgrounds} dots${L.rebirth ? `, plus ${L.rebirth.backgrounds} from the Rebirth` : ""}. A Background starts at one dot when it is added.</p>
      ${rows ? `<table class="wodx-table">${rows}</table>` : `<p class="wodx-quiet">None yet.</p>`}
      <div class="wodx-wz-add">${searchBox("select[name=pick-bg]", "Search Backgrounds…", "Search Backgrounds")}
        <select name="pick-bg"><option value="">Choose…</option>${list.map(b => `<option value="${esc(b.name)}">${esc(b.name)}${b.page ? ` (${esc(b.book)} p. ${b.page})` : ""}</option>`).join("")}</select>
        <input type="text" name="name-bg" placeholder="Or write a name" aria-label="Another Background">
        <button type="button" data-action="addFeature" data-type="background"><i class="fa-solid fa-plus"></i> Add</button></div>`;
  }

  #virtueRows(ctx, page) {
    return (B.traitGroups(this.actor.system ?? {}).virtues ?? []).map(t => this.#row(t.label, t.value, t.max, t.min, {kind: "virtue", path: t.path, value: t.value}, ctx, page)).join("");
  }

  #virtues(ctx) {
    const rows = this.#virtueRows(ctx, "virtues");
    return `<h3>Virtues</h3><p>${ctx.L.virtues} dots. Each Virtue in use starts with one free dot${ctx.lineId === "v20" ? " (Conviction and Instinct, for a Path, start at none)" : ""}.</p>
      ${rows ? `<table class="wodx-table">${rows}</table>` : `<p class="wodx-quiet">This sheet shows no Virtues.</p>`}
      <p class="wodx-quiet">From them: ${esc(ctx.L.start.join("; "))}.</p>`;
  }

  #merits(ctx) {
    const {L, lineId} = ctx;
    const cap = L.flaws ?? 7, fp = points(this.actor, FLAW), mp = points(this.actor, MERIT);
    const on = [...feats(this.actor, MERIT), ...feats(this.actor, FLAW)].sort((a, b) => a.name.localeCompare(b.name));
    const rows = on.map(i => `<tr><td>${esc(i.name)}</td><td>${i.system?.type === FLAW ? "Flaw" : "Merit"}</td><td>${n(i.system?.value)}</td>
      <td><button type="button" data-action="removeItem" data-item="${i.id}" aria-label="Take ${esc(i.name)} off"><i class="fa-solid fa-xmark"></i></button></td></tr>`).join("");
    const have = new Set(on.map(i => i.name.toLowerCase()));
    const list = W.meritOptions(lineId, MERITS_FLAWS).filter(t => !have.has(t.name.toLowerCase()));
    const opt = t => `<option value="${esc(t.key)}">${esc(t.name)} (${t.kind === "flaw" ? "Flaw" : "Merit"}, ${t.choices.join(" or ")}; ${esc(t.book)}${t.page ? ` p. ${t.page}` : ""})</option>`;
    return `<h3>Merits and Flaws</h3>
      <p>Optional. A Merit costs its points from the freebies; a Flaw gives its points, ${cap} at most. The Storyteller agrees to each.</p>
      <p><b>Merits</b> ${mp} points. <b>Flaws</b> ${fp} of ${cap}${fp > cap ? `: <b>${fp - cap} give nothing</b>` : ""}.</p>
      ${rows ? `<table class="wodx-table"><tbody>${rows}</tbody></table>` : `<p class="wodx-quiet">None yet.</p>`}
      <div class="wodx-wz-add">${searchBox("select[name=pick-mf]", "Search Merits and Flaws…", "Search Merits and Flaws")}
        <select name="pick-mf"><option value="">Choose…</option>
          <optgroup label="Merits">${list.filter(t => t.kind === "merit").map(opt).join("")}</optgroup>
          <optgroup label="Flaws">${list.filter(t => t.kind === "flaw").map(opt).join("")}</optgroup></select>
        <input type="number" name="cost-mf" min="1" max="7" placeholder="Points" aria-label="Points, where the book gives a range">
        <button type="button" data-action="addFeature" data-type="meritFlaw"><i class="fa-solid fa-plus"></i> Add</button></div>`;
  }

  #freebies(ctx) {
    const {L, lineId, led} = ctx;
    const traits = B.traitGroups(this.actor.system ?? {});
    const groupRows = (kind, groups) => groups.map(g => (traits[g] ?? []).map(t => this.#row(`${t.label} (${W.GROUP_LABEL[g]})`, t.value, t.max, t.min,
      {kind, group: g, path: t.path, value: t.value}, ctx, "freebies")).join("")).join("");
    const costs = Object.entries(L.costs).map(([k, v]) => `${k} ${v}`).join(", ");
    const extras = led.extras.map(e => {
      const v = n(prop(this.actor, `${e.path}.permanent`));
      const up = v < e.max && e.cost <= led.left;
      return `<tr><td>${esc(e.label)}</td><td class="wodx-fn-dots">${v}</td>
        <td><button type="button" data-action="extra" data-key="${e.key}" data-d="-1" ${e.bought ? "" : "disabled"} aria-label="One less ${esc(e.label)}">-</button>
        <button type="button" data-action="extra" data-key="${e.key}" data-d="1" ${up ? "" : "disabled"} aria-label="One more ${esc(e.label)}">+</button> <span class="wodx-quiet">+${e.cost}${e.bought ? `, ${e.bought} bought` : ""}</span></td></tr>`;
    }).join("");
    const others = W.otherCosts(lineId);
    return `<h3>Freebie points</h3>
      <p>Spend what is left at the book's costs (${esc(costs)}; ${esc(L.costRef)}). A dot inside an allotment you have not used up costs nothing.</p>
      <h4>Attributes</h4><table class="wodx-table">${groupRows("attribute", W.ATTR_GROUPS)}</table>
      <h4>Abilities</h4><table class="wodx-table">${groupRows("ability", W.ABIL_GROUPS)}</table>
      ${(L.powers ?? []).map(p => this.#power(p, ctx, "freebies")).join("")}
      <h4>Backgrounds</h4>${(r => r ? `<table class="wodx-table">${r}</table>` : `<p class="wodx-quiet">Add Backgrounds on their page.</p>`)(this.#bgRows(ctx, "freebies"))}
      ${L.virtues !== undefined ? `<h4>Virtues</h4><table class="wodx-table">${this.#virtueRows(ctx, "freebies")}</table>` : ""}
      ${extras ? `<h4>Other Traits</h4><table class="wodx-table">${extras}</table>` : ""}
      <h4>Anything else</h4>
      <p>${others.length ? `Bought on the sheet with the Storyteller (${esc(others.map(o => `${o.key} ${o.cost}`).join(", "))}): ` : "Points spent on the sheet some other way: "}
        <b>${led.other}</b> <button type="button" data-action="other" data-d="-1" ${led.other ? "" : "disabled"} aria-label="One point less">-</button>
        <button type="button" data-action="other" data-d="1" ${led.left > 0 ? "" : "disabled"} aria-label="One point more">+</button></p>`;
  }

  #review(ctx) {
    const {L, led} = ctx;
    const rows = led.check.rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.allowed}</td><td>${r.have ?? "?"}</td><td>${r.have === null ? esc(r.note) : r.over ? `${r.over} over, ${r.cost} points` : r.under ? `<b>${r.under} unspent</b>` : "done"}</td></tr>`).join("");
    const lines = [
      `Freebie points: ${led.check.freebies.allowed} from the book${led.flawsCounted ? `, ${led.flawsCounted} from Flaws` : ""}${led.prelude ? `, ${led.prelude} from the prelude` : ""}.`,
      `Spent: ${led.check.freebies.used} past the allotments${led.merits ? `, ${led.merits} on Merits` : ""}${led.extras.filter(e => e.bought).map(e => `, ${e.spent} on ${e.label}`).join("")}${led.other ? `, ${led.other} other` : ""}.`,
      led.left >= 0 ? `${led.left} left.` : `${-led.left} too many: take something back.`
    ];
    const warn = [...led.unspent.map(u => `${u.label}: ${u.dots} ${u.dots === 1 ? "dot" : "dots"} still to spend.`),
      ...(led.flawsOver ? [`Flaws past ${L.flaws ?? 7} points give nothing.`] : [])];
    return `<h3>Last look</h3>
      <table class="wodx-table wodx-check"><thead><tr><th>Step</th><th>Book</th><th>Sheet</th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <p>${lines.map(esc).join(" ")}</p>
      ${warn.length ? `<ul class="wodx-wz-warn">${warn.map(w => `<li>${esc(w)}</li>`).join("")}</ul>` : `<p>${led.ok ? "Everything matches the book." : ""}</p>`}
      <p class="wodx-quiet">Still to set by hand: ${esc(L.start.join("; "))}.</p>
      <div class="wodx-buttons"><button type="button" data-action="check"><i class="fa-solid fa-list-check"></i> Creation check</button>
        <button type="button" data-action="hub"><i class="fa-solid fa-moon"></i> Before the First Night</button></div>`;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  static async #onGo(ev, el) {
    this.page = el.dataset.page;
    const w = wizardOf(this.actor);
    if ( w.page !== this.page ) { w.page = this.page; await saveWizard(this.actor, w); }
    this.render();
  }

  /** The quick start (B2827): one concept's build written to the sheet, then the last look. */
  static async #onQuick() {
    const a = this.actor, L = TOTALS[this.lineId];
    const id = this.element.querySelector("select[name=quick-concept]")?.value;
    const traits = B.traitGroups(a.system ?? {});
    const built = L && Q.quickBuild(id, traits, L, {kind: W.LINE_KIND[this.lineId] ?? ""});
    if ( !built ) return;
    const spent = Object.values(traits).flat().some(t => t.value > t.min);
    if ( spent ) {
      const yes = await foundry.applications.api.DialogV2.confirm({window: {title: "Quick start"}, rejectClose: false,
        content: "<p>This sets every Attribute, Ability and Virtue on the sheet again, from the concept. Powers, Backgrounds, Merits and Flaws stay as they are. Go on?</p>"});
      if ( !yes ) return;
    }
    const up = {...built.updates};
    const s = a.system ?? {};
    const arch = Q.archetypesFor(id);
    if ( typeof s.concept === "string" && !s.concept.trim() ) up["system.concept"] = Q.CONCEPTS[id].label;
    if ( typeof s.nature === "string" && !s.nature.trim() ) up["system.nature"] = arch.nature;
    if ( typeof s.demeanor === "string" && !s.demeanor.trim() ) up["system.demeanor"] = arch.demeanor;
    await a.update(up);
    const w = wizardOf(a); w.order = built.order; w.page = "review"; await saveWizard(a, w);
    this.page = "review";
    ui.notifications.info(`${Q.CONCEPTS[id].label}: a starting build is on the sheet. Change anything you like.`);
    this.render();
  }

  static async #onStep(ev, el) {
    const d = Number(el.dataset.d) || 0, a = this.actor, data = el.dataset;
    const value = n(data.value);
    const kindRule = data.kind === "power" ? W.POWER_KIND[data.key] : null;
    const max = data.kind === "power" ? (kindRule?.max ?? 5) : data.kind === "sphere" ? 5 : 5;
    const min = ["attribute", "virtue", "background", "power"].includes(data.kind) ? 1 : 0;
    // The priorities hold still once the player spends: the order in use is saved on the first dot
    const kindOrder = data.kind === "attribute" ? "attributes" : data.kind === "ability" ? "abilities" : null;
    if ( kindOrder && !wizardOf(a).order[kindOrder] ) { const w = wizardOf(a); w.order[kindOrder] = this.#order(kindOrder); await saveWizard(a, w); }
    if ( d > 0 ) {
      const up = W.canRaise(totalsView(a, this.lineId), this.lineId, this.#change(data), {page: data.page, value, max, ...this.opts});
      if ( !up.ok ) return ui.notifications.info(up.why);
    }
    const v = Math.max(min, Math.min(max, value + d));
    if ( v === value ) return;
    if ( data.item ) await a.items.get(data.item)?.update({"system.value": v, "system.level": String(v)});
    else if ( data.path ) await a.update({[data.path]: v});
    this.render();
  }

  static async #onExtra(ev, el) {
    const d = Number(el.dataset.d) || 0, key = el.dataset.key, a = this.actor;
    const e = W.extrasFor(this.lineId).find(x => x.key === key);
    if ( !e ) return;
    const w = wizardOf(a), led = ledgerFor(a);
    const v = n(prop(a, `${e.path}.permanent`));
    if ( d > 0 && (v >= e.max || e.cost > (led?.left ?? 0)) ) return;
    if ( d < 0 && !n(w.bought[key]) ) return;
    const to = Math.max(0, Math.min(e.max, v + d));
    const up = {[`${e.path}.permanent`]: to};
    if ( key === "willpower" || key === "rage" || key === "gnosis" || key === "glamour" ) up[`${e.path}.temporary`] = to;
    if ( e.value ) up[`${e.path}.value`] = to;
    w.bought[key] = n(w.bought[key]) + d;
    up[`flags.${MODULE_ID}.${FLAG}`] = W.normWizard(w);
    await a.update(up);
    this.render();
  }

  static async #onOther(ev, el) {
    const w = wizardOf(this.actor);
    w.other = Math.max(0, w.other + (Number(el.dataset.d) || 0));
    await saveWizard(this.actor, w);
    this.render();
  }

  static async #onAddItem(ev, el) {
    const key = el.dataset.key, k = W.POWER_KIND[key], box = el.closest(".wodx-wz-add");
    if ( !k || k.store !== "item" ) return;
    const name = String(box?.querySelector(`input[name=name-${key}]`)?.value || box?.querySelector(`select[name=pick-${key}]`)?.value || "").trim();
    if ( !name ) return ui.notifications.info("Choose one or write a name.");
    if ( this.#powerItems(key).some(i => i.name.toLowerCase() === name.toLowerCase()) ) return ui.notifications.info("Already on the sheet.");
    const sys = k.sub ? {type: k.sub, value: 1, level: "1"} : {value: 1, level: "1"};
    await this.actor.createEmbeddedDocuments("Item", [{name, type: k.type, system: sys, flags: {[MODULE_ID]: {wizard: true}}}]);
    this.render();
  }

  static async #onRemoveItem(ev, el) {
    const it = this.actor.items.get(el.dataset.item);
    if ( !it ) return;
    await it.delete();
    this.render();
  }

  static async #onAddFeature(ev, el) {
    const box = el.closest(".wodx-wz-add"), a = this.actor;
    if ( el.dataset.type === "background" ) {
      const name = String(box?.querySelector("input[name=name-bg]")?.value || box?.querySelector("select[name=pick-bg]")?.value || "").trim();
      if ( !name ) return ui.notifications.info("Choose one or write a name.");
      if ( feats(a, BG).some(i => i.name.toLowerCase() === name.toLowerCase()) ) return ui.notifications.info("Already on the sheet.");
      await a.createEmbeddedDocuments("Item", [{name, type: "Feature", system: {type: BG, value: 1, level: "1"}, flags: {[MODULE_ID]: {wizard: true}}}]);
      return this.render();
    }
    const key = box?.querySelector("select[name=pick-mf]")?.value;
    const t = W.meritOptions(this.lineId, MERITS_FLAWS).find(x => x.key === key);
    if ( !t ) return ui.notifications.info("Choose a Merit or Flaw.");
    const asked = n(box?.querySelector("input[name=cost-mf]")?.value);
    const cost = t.choices.includes(asked) ? asked : t.choices[0];
    const type = t.kind === "flaw" ? FLAW : MERIT;
    const cap = TOTALS[this.lineId]?.flaws ?? 7;
    if ( type === FLAW && points(a, FLAW) + cost > cap ) return ui.notifications.info(`That would pass the book's ${cap} points of Flaws.`);
    await a.createEmbeddedDocuments("Item", [{name: t.name, type: "Feature", system: {type, value: cost, level: String(cost)}, flags: {[MODULE_ID]: {wizard: true}}}]);
    this.render();
  }

  static #onSheet() { this.actor.sheet?.render(true); }
  static #onCheck() { CreationCheckApp.open(this.actor); }
  static #onHub() { game.modules.get(MODULE_ID)?.api?.firstNight?.(this.actor); }
}
