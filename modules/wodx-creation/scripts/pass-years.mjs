import {esc} from "./actor-data.mjs";
import {planSkip, applyPlan, addYears, yearOf} from "./time.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;

/**
 * The Pass the Years window. Pick how far to go; it lists each character's proposed changes, ticked by default
 * where the rules decide and unticked where the Storyteller should; nothing happens until "Pass the years".
 */
export class PassYearsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-pass-years",
    classes: ["wodx", "wodx-pass-years"],
    window: {title: "Pass the years", icon: "fa-solid fa-hourglass-half", resizable: true},
    position: {width: 760, height: 700},
    // No form: Enter in the years box must never pass the years
    actions: {plan: PassYearsApp.#onPlan, report: PassYearsApp.#onReport, apply: PassYearsApp.#onApply}
  };

  static #instance;

  static open() {
    if ( !game.user.isGM ) return;
    const height = Math.max(360, Math.min(720, window.innerHeight - 100));
    const width = Math.max(480, Math.min(820, window.innerWidth - 40));
    this.#instance ??= new PassYearsApp({position: {height, width}});
    return this.#instance.render({force: true});
  }

  years = 10;
  plan = null;

  async _renderHTML() {
    const now = yearOf(game.time.worldTime);
    const p = this.plan;
    const rows = p ? p.rows.map(r => `
      <tr data-search-text="${esc(`${r.name} ${r.line} ${r.ally ?? ""}`)}">
        <td><strong>${esc(r.name)}</strong><br><span class="wodx-quiet">${esc(r.line)}${r.pc ? ", player character" : ""}${r.ally ? `, ally of ${esc(r.ally)}` : ""}</span>
          ${r.needsBorn ? `<br><label class="wodx-quiet">Born <input type="number" name="born.${r.actorId}" step="1" placeholder="year" style="width:5.5em"></label>` : ""}</td>
        <td>${r.notes.map(n => `<div class="wodx-quiet">${esc(n)}</div>`).join("")}
          ${r.changes.map(c => `<div><label title="${esc(c.detail)}"><input type="checkbox" name="accept.${r.actorId}.${c.id}" ${c.checked ? "checked" : ""}> ${esc(c.label)}</label>
            <div class="wodx-quiet wodx-indent">${esc(c.detail)}</div></div>`).join("")}</td>
      </tr>`).join("") : "";
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top">
        <div class="form-group"><label>Years to pass</label>
          <input type="number" name="years" value="${this.years}" min="1" max="1000" step="1">
          <button type="button" data-action="plan"><i class="fa-solid fa-list-check"></i> Show what happens</button></div>
        <p class="wodx-quiet">From ${now}${p ? ` to ${p.toYear}. Era: ${esc(p.fromEra?.name ?? "?")} → ${esc(p.toEra?.name ?? "?")}${p.toEra?.locked ? " (locked)" : ""}.` : "."}
          Ticked changes follow the rules; unticked ones are for you to decide. Nothing changes until you press "Pass the years".</p>
        ${p ? searchBox("table.wodx-skip", "Search characters…", "Search characters") : ""}
      </div>
      <div class="wodx-scroll">
        ${p ? (rows ? `<table class="wodx-table wodx-skip"><thead><tr><th>Character</th><th>What the years do</th></tr></thead><tbody>${rows}</tbody></table>`
          : "<p>No character changes.</p>") : "<p>Choose how many years, then press \"Show what happens\".</p>"}
      </div>
      <footer class="form-footer wodx-footer">
        <button type="button" data-action="report" ${p ? "" : "disabled"}><i class="fa-solid fa-book"></i> Write the plan to a journal</button>
        <button type="button" data-action="apply" ${p ? "" : "disabled"}><i class="fa-solid fa-hourglass-end"></i> Pass the years</button>
      </footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  #readYears() {
    const n = Math.trunc(Number(this.element.querySelector("input[name=years]")?.value));
    return Number.isFinite(n) && n >= 1 ? Math.min(1000, n) : null;
  }

  #choices() {
    const accept = {};
    const born = {};
    for ( const el of this.element.querySelectorAll("input[name^='accept.']") ) {
      const [, actorId, changeId] = el.name.split(".");
      (accept[actorId] ??= {})[changeId] = el.checked;
    }
    for ( const el of this.element.querySelectorAll("input[name^='born.']") ) {
      if ( el.value !== "" ) born[el.name.split(".")[1]] = Number(el.value);
    }
    return {accept, born};
  }

  static async #onPlan() {
    const years = this.#readYears();
    if ( !years ) return ui.notifications.warn("Give a whole number of years, 1 or more.");
    this.years = years;
    this.plan = planSkip({from: game.time.worldTime, to: addYears(game.time.worldTime, years)});
    await this.render();
  }

  static async #onReport() {
    if ( !this.plan ) return;
    const r = await applyPlan(this.plan, {...this.#choices(), dryRun: true});
    r?.journal?.sheet?.render(true);
  }

  static async #onApply() {
    if ( !this.plan ) return;
    if ( this.plan.from !== game.time.worldTime ) {
      ui.notifications.warn("The clock moved since the plan was made; showing it again.");
      return PassYearsApp.#onPlan.call(this);
    }
    const {DialogV2} = foundry.applications.api;
    const ok = await DialogV2.confirm({
      classes: ["wodx", "wodx-dialog"],
      window: {title: "Pass the years"},
      content: `<p>Move the clock ${this.plan.years} years, to ${this.plan.toYear}, and make the ticked changes? Back up the world first if you may want to undo this.</p>`,
      rejectClose: false
    });
    if ( !ok ) return;
    const r = await applyPlan(this.plan, this.#choices());
    const n = r.done.reduce((k, d) => k + d.taken.length, 0);
    ui.notifications.info(`${this.plan.years} years pass. ${n} change(s) made; see "WoDX Time Skips".`);
    this.plan = null;
    await this.render();
    r.journal?.sheet?.render(true);
  }
}
