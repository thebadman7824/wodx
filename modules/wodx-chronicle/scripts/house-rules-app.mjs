import {MODULE_ID, esc, rule} from "./util.mjs";
import {HOUSE_RULES} from "./settings.mjs";
import {searchBox} from "./search.mjs";

const {ApplicationV2} = foundry.applications.api;

/** House rules: one switch each, grouped. Saving rewrites the Chronicle Rules journal. */
export class HouseRulesApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-house-rules-{id}",
    tag: "form",
    classes: ["wodx", "wodx-house-rules"],
    window: {title: "House rules", icon: "fa-solid fa-scale-balanced", resizable: true},
    position: {width: 520, height: "auto"},
    form: {handler: HouseRulesApp.#onSubmit, closeOnSubmit: true}
  };

  static #instance;

  /** Open the one house-rules window. */
  static open() {
    this.#instance ??= new HouseRulesApp();
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const groups = HOUSE_RULES.groups.map(g => {
      const rows = HOUSE_RULES.switches.filter(s => s.group === g.id).map(s => `
        <div class="form-group wodx-switch" data-search-item>
          <label><input type="checkbox" name="${esc(s.id)}" ${rule(s.id) ? "checked" : ""}> ${esc(s.name)}</label>
          <p class="hint">${esc(s.hint)}${s.laterPhase ? ` Takes effect from Phase ${s.laterPhase}.` : ""}</p>
        </div>`).join("");
      return rows ? `<fieldset><legend>${esc(g.name)}</legend>${rows}</fieldset>` : "";
    }).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `<div class="wodx-top">${searchBox(".wodx-rules", "Search house rules…", "Search house rules")}</div>
      <div class="wodx-scroll wodx-rules">${groups}</div>
      <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save house rules</button></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  static async #onSubmit(event, form) {
    for ( const s of HOUSE_RULES.switches ) {
      const value = !!form.elements[s.id]?.checked;
      if ( value !== rule(s.id) ) await game.settings.set(MODULE_ID, `rule.${s.id}`, value);
    }
  }
}
