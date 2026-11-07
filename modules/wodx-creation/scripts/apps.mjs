import {MODULE_ID, esc, lineOf, xpTotals, purchaseOptions, newDisciplineOption, newAbilityOption, kindLabel, lineage, generationOf, clanNameOf, domitorOf} from "./actor-data.mjs";
import {embraceDialog, vitaeDialog} from "./change-of-state.mjs";
import {award, requestSpend, writeLogPage} from "./xp.mjs";
import {writeLineageJournal, ordinal} from "./lineage.mjs";
import {XP} from "../data/vampire.mjs";

const {ApplicationV2} = foundry.applications.api;

/* -------------------------------------------- */
/*  Storyteller window                          */
/* -------------------------------------------- */

export class CreationApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-creation",
    classes: ["wodx", "wodx-creation"],
    window: {title: "Creation and experience", icon: "fa-solid fa-droplet", resizable: true},
    position: {width: 460, height: "auto"},
    actions: {
      embrace: () => embraceDialog().then(() => CreationApp.refresh()),
      vitae: () => vitaeDialog().then(() => CreationApp.refresh()),
      award: () => awardDialog(),
      spend: CreationApp.#onSpend,
      lineage: async () => { const j = await writeLineageJournal(); j?.sheet?.render(true); },
      log: CreationApp.#onLog
    }
  };

  static #instance;

  static open() {
    if ( !game.user.isGM ) return SpendApp.openFor();
    this.#instance ??= new CreationApp();
    return this.#instance.render({force: true});
  }

  static refresh() {
    if ( this.#instance?.rendered ) this.#instance.render();
  }

  async _renderHTML() {
    const pcs = game.actors.filter(a => a.hasPlayerOwner && lineOf(a) && !lineage(a).became).sort((a, b) => a.name.localeCompare(b.name));
    const rows = pcs.map(a => {
      const t = xpTotals(a);
      const what = lineOf(a) === "vampire" ? `${clanNameOf(a) || "Vampire"}, ${generationOf(a) ? ordinal(generationOf(a)) : "?"}`
        : (lineOf(a) === "ghoul" ? `Ghoul of ${domitorOf(a)?.name ?? lineage(a).domitor?.name ?? "?"}` : "Mortal");
      return `<tr><td>${esc(a.name)}</td><td>${esc(what)}</td><td>${t.available}</td>
        <td><button type="button" data-action="spend" data-actor="${a.id}" title="Spend for this character">Spend</button></td></tr>`;
    }).join("");
    const div = document.createElement("div");
    div.className = "wodx-body wodx-scroll";
    div.innerHTML = `
      <h3>Changes of state</h3>
      <div class="wodx-buttons">
        <button type="button" data-action="embrace"><i class="fa-solid fa-skull"></i> Embrace a mortal</button>
        <button type="button" data-action="vitae"><i class="fa-solid fa-droplet"></i> Give vitae</button>
      </div>
      <h3>Experience</h3>
      <div class="wodx-buttons">
        <button type="button" data-action="award"><i class="fa-solid fa-star"></i> Award experience</button>
        <button type="button" data-action="log"><i class="fa-solid fa-book"></i> Experience log</button>
        <button type="button" data-action="lineage"><i class="fa-solid fa-sitemap"></i> Lineage journal</button>
      </div>
      ${rows ? `<table class="wodx-table"><thead><tr><th>Player character</th><th>What</th><th>To spend</th><th></th></tr></thead><tbody>${rows}</tbody></table>`
        : `<p class="wodx-quiet">No player owns a mortal, ghoul or vampire yet.</p>`}
      <p class="wodx-quiet">Players ask to spend from the droplet button; their requests wait in the approval queue.</p>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static #onSpend(event, target) {
    const actor = game.actors.get(target.dataset.actor);
    if ( actor ) SpendApp.openFor(actor);
  }

  static async #onLog() {
    let journal = null;
    for ( const a of game.actors.filter(a => a.items.some(i => i.type === "Experience")) ) journal = await writeLogPage(a);
    if ( !journal ) return ui.notifications.info("No experience has been recorded yet.");
    journal.sheet?.render(true);
  }
}

/* -------------------------------------------- */
/*  Spending window                             */
/* -------------------------------------------- */

export class SpendApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-spend"],
    window: {title: "Spend experience", icon: "fa-solid fa-star", resizable: true},
    position: {width: 520, height: 640},
    actions: {
      buy: SpendApp.#onBuy,
      buyNewDiscipline: SpendApp.#onNewDiscipline,
      buyNewAbility: SpendApp.#onNewAbility
    }
  };

  /** Open for an actor, or for the selected token's actor, or for the user's own character. */
  static openFor(actor = null) {
    actor ??= canvas?.tokens?.controlled?.[0]?.actor ?? game.user.character ?? null;
    if ( !actor ) return ui.notifications.warn("Select your character's token first.");
    if ( !actor.isOwner ) return ui.notifications.warn("You can only spend experience for your own character.");
    if ( !lineOf(actor) ) return ui.notifications.warn(`WoDX does not handle experience for a ${actor.type} yet; use the sheet.`);
    const height = Math.max(360, Math.min(640, window.innerHeight - 120));
    const app = new SpendApp({id: `wodx-spend-${actor.id}`, actor, position: {height}});
    return app.render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
  }

  get title() {
    return `Spend experience: ${this.actor?.name ?? ""}`;
  }

  async _renderHTML() {
    const actor = this.actor;
    const line = lineOf(actor);
    const t = xpTotals(actor);
    const verb = game.user.isGM ? "Buy" : "Ask";
    const opts = purchaseOptions(actor);
    const groups = ["attribute", "ability", "discipline", "virtue", "road", "willpower"].map(kind => {
      const list = opts.filter(o => o.kind === kind);
      if ( !list.length ) return "";
      return `<h3>${esc(kindLabel(kind))}</h3><table class="wodx-table"><tbody>${list.map(o => `
        <tr class="${o.ok ? "" : "wodx-muted"}"><td>${esc(o.label)}${o.discipline === "clan" ? ' <span class="wodx-tag">clan</span>' : ""}</td>
          <td>${o.current} → ${o.next}</td><td>${o.cost ?? "–"} xp</td>
          <td><button type="button" data-action="buy" data-kind="${o.kind}" data-key="${esc(o.key)}" ${o.ok ? "" : "disabled"} title="${esc(o.reason)}">${verb}</button></td></tr>`).join("")}
        </tbody></table>`;
    }).join("");
    const discBlock = line === "mortal" ? "" : `
      <div class="form-group"><label>New Discipline (${XP[line].newDiscipline} xp)</label>
        <input type="text" name="newDiscipline" placeholder="Name, e.g. Celerity">
        <button type="button" data-action="buyNewDiscipline">${verb}</button></div>`;
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top"><p><strong>${t.available}</strong> experience to spend (earned ${t.earned}, spent ${t.spent}).
        Costs follow ${esc(XP[line].source)}.</p></div>
      <div class="wodx-scroll">
        ${groups}
        <h3>Something new</h3>
        ${discBlock}
        <div class="form-group"><label>New Ability (${XP[line].newAbility} xp)</label>
          <select name="newAbilityGroup"><option value="talent">Talent</option><option value="skill" selected>Skill</option><option value="knowledge">Knowledge</option></select>
          <input type="text" name="newAbility" placeholder="Name, e.g. Ride">
          <button type="button" data-action="buyNewAbility">${verb}</button></div>
      </div>
      <footer class="wodx-footer"><p class="wodx-quiet">${game.user.isGM ? "Buying spends at once and records it in the experience log." : "Your request goes to the Storyteller, who approves it."}</p></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  async #spend(option) {
    const r = await requestSpend(this.actor, option);
    if ( r?.ok ) this.render();
  }

  static #onBuy(event, target) {
    const option = purchaseOptions(this.actor).find(o => o.kind === target.dataset.kind && o.key === target.dataset.key);
    return this.#spend(option);
  }

  static #onNewDiscipline() {
    const name = this.element.querySelector("input[name=newDiscipline]")?.value;
    const option = newDisciplineOption(this.actor, name);
    if ( !option ) return ui.notifications.warn("Type the Discipline's name.");
    return this.#spend(option);
  }

  static #onNewAbility() {
    const name = this.element.querySelector("input[name=newAbility]")?.value;
    const group = this.element.querySelector("select[name=newAbilityGroup]")?.value ?? "skill";
    const option = newAbilityOption(this.actor, name, group);
    if ( !option ) return ui.notifications.warn("Type the Ability's name.");
    return this.#spend(option);
  }
}

/* -------------------------------------------- */
/*  Award dialog                                */
/* -------------------------------------------- */

export async function awardDialog() {
  if ( !game.user.isGM ) return null;
  const {DialogV2} = foundry.applications.api;
  const actors = game.actors.filter(a => lineOf(a) && !lineage(a).became).sort((a, b) =>
    (Number(b.hasPlayerOwner) - Number(a.hasPlayerOwner)) || a.name.localeCompare(b.name));
  if ( !actors.length ) return ui.notifications.warn("There is no character to award.");
  const rows = actors.map(a => `<li><label><input type="checkbox" name="who" value="${a.id}" ${a.hasPlayerOwner ? "checked" : ""}> ${esc(a.name)}${a.hasPlayerOwner ? "" : ' <span class="wodx-quiet">(NPC)</span>'}</label></li>`).join("");
  const result = await DialogV2.prompt({
    classes: ["wodx", "wodx-dialog"],
    window: {title: "Award experience"},
    content: `
      <div class="form-group"><label>Points each</label><input type="number" name="amount" value="1" min="1" max="50" step="1"></div>
      <div class="form-group"><label>For</label><input type="text" name="note" maxlength="120" placeholder="Session, story or deed"></div>
      <p>Characters (player characters are ticked):</p><ul class="wodx-list">${rows}</ul>`,
    ok: {
      label: "Award",
      callback: (event, button) => ({
        amount: Number(button.form.elements.amount.value),
        note: button.form.elements.note.value,
        ids: [...button.form.querySelectorAll("input[name=who]:checked")].map(i => i.value)
      })
    },
    rejectClose: false
  });
  if ( !result?.ids?.length ) return null;
  const done = await award(result.ids.map(id => game.actors.get(id)).filter(Boolean), result.amount, result.note);
  CreationApp.refresh();
  return done;
}
