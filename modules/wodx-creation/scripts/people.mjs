/**
 * The People generator (Phase 7a, B52): mortals and ghouls for the chronicle's era and homeland, each with a name,
 * a trade, Nature and Demeanor, what they want, what they hide, and a ready sheet. Seeded: the same batch number and
 * row give the same person again. Storyteller first: the people go to the approval queue (or are made at once by the
 * Storyteller's own hand), and nothing is written to the world before that.
 */
import {MODULE_ID, esc, lineOf} from "./actor-data.mjs";
import {makeGhoul} from "./change-of-state.mjs";
import {PEOPLE_TABLES, TRADE_SHEETS} from "../data/people.mjs";
import {person, noteOf} from "./people-rules.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;
const FOLDER = "WoDX people";
const chron = () => game.modules.get("wodx-chronicle")?.api;

export function registerPeopleSettings() {
  game.settings.register(MODULE_ID, "peopleBatch", {scope: "world", config: false, type: Number, default: 0});
}

/** At start (WoDX Chronicle is ready): the tables and the queue's handler. */
export function registerPeople() {
  const go = () => chron()?.gen?.registerTables(MODULE_ID, PEOPLE_TABLES);
  if ( chron()?.gen ) go(); else Hooks.once("wodxChronicleReady", go);
  chron()?.registerApprovalHandler?.("wodx-people", {label: "New people", approve: entry => createPeople(entry.data)});
}

/** One person, seeded: batch and row name the stream; nonce counts re-rolls of that row. */
export function generate({batch, row, nonce = 0, kind = "mortal", sex = "any", trade = "any"}) {
  const g = chron().gen;
  const ctx = fitContext(g, g.context());
  const rand = g.random(`people:${batch}:${row}`, nonce);
  return {...person({rand, tables: g.lookup(ctx), era: ctx.era, culture: ctx.culture, kind, sex, trade}), batch, row, nonce, eraId: ctx.eraId};
}

/** The nearest context that has people tables: the homeland's, else Bohemia's, else the medieval ones. */
export function fitContext(g, ctx) {
  for ( const c of [ctx, {...ctx, culture: "bohemia"}, {...ctx, culture: "bohemia", era: "medieval"}] ) if ( g.lookup(c)("people.origin") ) return c;
  return ctx;
}

/** Make the sheets. GM only. people: the generated people; domitorId for ghouls. */
export async function createPeople({people = [], domitorId = null} = {}) {
  if ( !game.user.isGM ) return [];
  let folder = game.folders.find(f => f.type === "Actor" && f.name === FOLDER);
  if ( !folder ) folder = await Folder.create({name: FOLDER, type: "Actor", color: "#3b3540"});
  const domitor = domitorId ? game.actors.get(domitorId) : null;
  const made = [];
  for ( const p of people ) {
    const actor = await Actor.create({name: p.name, type: "Mortal", folder: folder.id,
      flags: {[MODULE_ID]: {people: {batch: p.batch, row: p.row, nonce: p.nonce, seed: chron()?.gen?.seed?.(), sex: p.sex}}}});
    const up = {
      "system.nature": p.nature, "system.demeanor": p.demeanor, "system.concept": p.trade, "system.notes": noteOf(p),
      // The system's create helper resets Willpower, so it is written after the sheet exists
      "system.advantages.willpower.permanent": p.willpower, "system.advantages.willpower.temporary": p.willpower
    };
    for ( const [k, v] of Object.entries(p.attributes) ) up[`system.attributes.${k}.value`] = v;
    for ( const [k, v] of Object.entries(p.abilities) ) {
      if ( actor.system?.abilities?.[k] === undefined ) continue; // not on this era's sheet
      up[`system.abilities.${k}.value`] = v;
      up[`system.abilities.${k}.isvisible`] = true;
    }
    for ( const [k, v] of Object.entries(p.virtues) ) if ( actor.system?.advantages?.virtues?.[k] ) up[`system.advantages.virtues.${k}.permanent`] = v;
    await actor.update(up);
    // Dark Ages Secondary Abilities are items on the sheet (added by the system for the era)
    const items = [];
    for ( const [k, v] of Object.entries(p.secondary ?? {}) ) {
      const it = actor.items.find(i => i.type === "Trait" && /secondability$/.test(i.system?.type ?? "") && norm(i.name) === k);
      if ( it ) items.push({_id: it.id, "system.value": v});
    }
    if ( items.length ) await actor.updateEmbeddedDocuments("Item", items);
    if ( p.kind === "ghoul" ) await makeGhoul(actor, {domitor: domitor && lineOf(domitor) === "vampire" ? domitor : null, points: 2});
    made.push(actor);
  }
  if ( made.length ) await ChatMessage.create({
    content: `<div class="wodx-card"><h3>New people</h3><p>${made.map(a => `@UUID[${a.uuid}]{${esc(a.name)}}`).join(", ")}</p><p class="wodx-quiet">In the "${FOLDER}" folder.</p></div>`,
    whisper: game.users.filter(u => u.isGM).map(u => u.id), speaker: {alias: "Chronicle"}});
  return made;
}
const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** The Storyteller's window: choose, preview, re-roll a row, then send to the queue or make them now. */
export class PeopleApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-people",
    classes: ["wodx", "wodx-people"],
    window: {title: "People", icon: "fa-solid fa-users", resizable: true},
    position: {width: 760, height: "auto"},
    actions: {
      roll: PeopleApp.#onRoll, reroll: PeopleApp.#onReroll, queue: PeopleApp.#onQueue, create: PeopleApp.#onCreate
    }
  };
  static #instance;
  static open() {
    if ( !game.user.isGM ) return ui.notifications.warn("The Storyteller makes new people.");
    const height = Math.max(420, Math.min(820, window.innerHeight - 80));
    this.#instance ??= new PeopleApp({position: {height}});
    return this.#instance.render({force: true});
  }

  opts = {count: 4, kind: "mortal", sex: "any", trade: "any", domitorId: ""};
  batch = null;
  people = [];

  async _renderHTML() {
    const ctx = fitContext(chron().gen, chron().gen.context());
    const trades = [...new Set(chron().gen.lookup(ctx)("people.trade")?.results.map(r => r.text) ?? Object.keys(TRADE_SHEETS))].sort();
    const kindred = game.actors.filter(a => lineOf(a) === "vampire").sort((a, b) => a.name.localeCompare(b.name));
    const o = this.opts;
    const sel = (name, list, cur, fixed = true) => `<select name="${name}" ${fixed ? "data-fixed" : ""}>${list.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>`;
    const row = p => `<tr data-row="${p.row}" data-search-text="${esc(`${p.name} ${p.trade} ${p.nature} ${p.motive} ${p.secret}`)}">
        <td><input type="checkbox" name="keep.${p.row}" checked aria-label="Keep ${esc(p.name)}"></td>
        <td><strong>${esc(p.name)}</strong><br><span class="wodx-quiet">${esc(p.sex)}, ${esc(p.origin)}; ${esc(p.trade)}${p.kind === "ghoul" ? ", ghoul" : ""}</span></td>
        <td>${esc(p.nature)} / ${esc(p.demeanor)}<br><span class="wodx-quiet">Willpower ${p.willpower}</span></td>
        <td>Wants ${esc(p.motive)}.<br>Hides that this person ${esc(p.secret)}.<br><span class="wodx-quiet">${esc(p.look)}</span></td>
        <td><button type="button" data-action="reroll" data-row="${p.row}" title="Roll this one again"><i class="fa-solid fa-dice"></i></button></td></tr>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top">
        <p class="wodx-prompt">For <strong>${esc(ctx.eraId ?? "this era")}</strong> (${esc(ctx.era)}), people of <strong>${esc(chron().gen.cultures[ctx.culture] ?? ctx.culture)}</strong>.
          The same batch and row always give the same person; a re-roll gives the next one.</p>
        <form class="wodx-people-form">
          <div class="wodx-field"><label>How many</label><input type="number" name="count" min="1" max="12" value="${o.count}"></div>
          <div class="wodx-field"><label>What</label>${sel("kind", [["mortal", "Mortals"], ["ghoul", "Ghouls"]], o.kind)}</div>
          <div class="wodx-field"><label>Sex</label>${sel("sex", [["any", "Any"], ["female", "Female"], ["male", "Male"]], o.sex)}</div>
          <div class="wodx-field wide"><label>Trade</label>${searchBox("select[name=trade]", "Search trades…", "Search trades")}${sel("trade", [["any", "Any trade"], ...trades.map(t => [t, t])], o.trade, false)}</div>
          ${o.kind === "ghoul" ? `<div class="wodx-field wide"><label>Domitor</label>${searchBox("select[name=domitorId]", "Search Kindred…", "Search Kindred")}${sel("domitorId", [["", "None: independent ghouls"], ...kindred.map(a => [a.id, a.name])], o.domitorId, false)}</div>` : ""}
        </form>
        <div class="wodx-buttons"><button type="button" data-action="roll"><i class="fa-solid fa-dice-d20"></i> ${this.people.length ? "Roll a new batch" : "Roll"}</button></div>
      </div>
      <div class="wodx-scroll">
        ${this.people.length ? `${searchBox("table.wodx-people-list", "Search these people…", "Search these people")}
          <table class="wodx-table wodx-people-list"><thead><tr><th></th><th>Who</th><th>Nature / Demeanor</th><th>Wants, hides, manner</th><th></th></tr></thead>
          <tbody>${this.people.map(row).join("")}</tbody></table>
          <p class="wodx-quiet">Batch ${this.batch} · seed ${esc(chron().gen.seed())}</p>`
          : `<p class="wodx-empty">Choose how many and what kind, then Roll. Nothing is made until you send them to the queue or make them.</p>`}
      </div>
      <footer class="wodx-footer"><div class="wodx-buttons">
        <button type="button" data-action="queue" ${this.people.length ? "" : "disabled"}><i class="fa-solid fa-inbox"></i> Send to the approval queue</button>
        <button type="button" data-action="create" ${this.people.length ? "" : "disabled"}><i class="fa-solid fa-user-plus"></i> Make them now</button>
      </div></footer>`;
    div.querySelector("form").addEventListener("change", ev => {
      const f = ev.currentTarget.elements;
      const kindBefore = this.opts.kind;
      this.opts = {count: Math.max(1, Math.min(12, Number(f.count.value) || 1)), kind: f.kind.value, sex: f.sex.value, trade: f.trade.value, domitorId: f.domitorId?.value ?? this.opts.domitorId};
      if ( this.opts.kind !== kindBefore ) this.render();
    });
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  kept() {
    const el = this.element;
    return this.people.filter(p => el?.querySelector(`[name="keep.${p.row}"]`)?.checked !== false);
  }

  static async #onRoll() {
    const n = Number(game.settings.get(MODULE_ID, "peopleBatch")) + 1;
    await game.settings.set(MODULE_ID, "peopleBatch", n);
    this.batch = n;
    const {count, kind, sex, trade} = this.opts;
    this.people = Array.from({length: count}, (_, row) => generate({batch: n, row, kind, sex, trade}));
    this.render();
  }
  static #onReroll(event, target) {
    const row = Number(target.dataset.row);
    const i = this.people.findIndex(p => p.row === row);
    if ( i < 0 ) return;
    const p = this.people[i];
    this.people[i] = generate({batch: this.batch, row, nonce: p.nonce + 1, kind: p.kind, sex: this.opts.sex, trade: this.opts.trade});
    this.render();
  }
  static async #onQueue() {
    const people = this.kept();
    if ( !people.length ) return;
    await chron().propose({type: "wodx-people", key: `people:${this.batch}:${people.map(p => `${p.row}.${p.nonce}`).join(",")}`,
      title: `New people: ${people.map(p => p.name).join(", ")}`.slice(0, 200),
      detail: people.map(p => `${p.name} (${p.trade}${p.kind === "ghoul" ? ", ghoul" : ""}): wants ${p.motive}; hides that this person ${p.secret}.`).join(" "),
      data: {people, domitorId: this.opts.domitorId || null}});
    this.people = [];
    this.render();
  }
  static async #onCreate() {
    const people = this.kept();
    if ( !people.length ) return;
    await createPeople({people, domitorId: this.opts.domitorId || null});
    this.people = [];
    this.render();
  }
}
