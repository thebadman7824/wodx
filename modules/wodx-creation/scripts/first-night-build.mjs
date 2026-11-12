/**
 * WoDX Creation 0.13.0: the guided builder for Before the First Night (Chronicle Start Desk b1, d3). Spends the
 * book's creation points on the sheet with a live count: Attributes, Abilities and Virtues are set here dot by dot;
 * Backgrounds, the line's powers and Merits and Flaws are counted from the sheet, with each Merit and Flaw's cost
 * later in the chronicle beside it. The count is the creation check's (totals-rules.mjs), so the book's
 * primary, secondary and tertiary groups fall where they cost least. Every line with creation totals works; the
 * Vampire books first, as the desk asked.
 */
import {esc} from "./actor-data.mjs";
import {TOTALS, checkCreation} from "./totals-rules.mjs";
import {totalsView, CreationCheckApp} from "./totals-check.mjs";
import {defaultLine} from "../data/creation-totals.mjs";
import * as R from "./first-night-rules.mjs";
import * as B from "./first-night-build-rules.mjs";

const {ApplicationV2} = foundry.applications.api;
const chron = () => game.modules.get("wodx-chronicle")?.active ? game.modules.get("wodx-chronicle").api : null;

export class BuildApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["wodx", "wodx-first-night", "wodx-fn-build"],
    window: {title: "Build", icon: "fa-solid fa-hammer", resizable: true},
    position: {width: 640, height: "auto"},
    actions: {step: BuildApp.#onStep, sheet: BuildApp.#onSheet, check: BuildApp.#onCheck}
  };

  static openFor(actor) {
    if ( !actor?.isOwner ) return ui.notifications.warn("You can only build your own character.");
    const height = Math.max(440, Math.min(820, window.innerHeight - 80));
    return new BuildApp({actor, id: `wodx-fn-build-${actor.id}`, position: {height}}).render({force: true});
  }

  constructor(options = {}) {
    super(options);
    this.actor = options.actor;
    let eraId = "";
    try { eraId = chron()?.eras?.activeEra?.()?.profile?.id ?? ""; } catch (e) { /* none */ }
    this.lineId = defaultLine(this.actor.type, {variant: this.actor.system?.settings?.variant ?? "", eraId});
  }

  get title() { return `Build: ${this.actor?.name ?? ""}`; }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    const a = this.actor, L = TOTALS[this.lineId];
    if ( !L ) { div.innerHTML = `<p class="wodx-quiet">WoDX has no creation totals for this kind of sheet yet. Use the sheet itself.</p>`; return div; }
    const res = checkCreation(totalsView(a, this.lineId), this.lineId);
    const groups = B.traitGroups(a.system ?? {});
    const row = (path, label, v, min, max) => `<tr><td>${esc(label)}</td><td class="wodx-fn-dots">${B.dots(v, max)}</td>
      <td><button type="button" data-action="step" data-path="${path}" data-d="-1" ${v <= min ? "disabled" : ""} aria-label="One less ${esc(label)}">-</button>
      <button type="button" data-action="step" data-path="${path}" data-d="1" ${v >= max ? "disabled" : ""} aria-label="One more ${esc(label)}">+</button></td></tr>`;
    const section = (title, list) => list.length ? `<h4>${esc(title)}</h4><table class="wodx-table">${list.map(t => row(t.path, t.label, t.value, t.min, t.max)).join("")}</table>` : "";
    const sum = res.rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.allowed}</td><td>${r.have ?? "?"}</td><td>${r.have === null ? "" : r.over ? `<b>${r.over} over</b>${r.cost ? `, ${r.cost} freebies` : ""}` : r.under ? `${r.under} to spend` : "done"}</td></tr>`).join("");
    const fb = res.freebies;
    let feats = [];
    try { feats = chron()?.traits?.of?.(a)?.matched ?? []; } catch (e) { feats = []; }
    const tables = await import("../../wodx-chronicle/scripts/trait-rules.mjs").catch(() => ({}));
    const flawPts = R.flawPoints(feats);
    const mf = feats.filter(f => f.kind === "merit" || f.kind === "flaw" || f.kind === "background")
      .map(f => { const c = R.costLine(f.key, tables); return `<li>${esc(f.name)} ${f.value ? `(${f.value})` : ""}${c ? `: <span class="wodx-quiet">${esc(c)}</span>` : ""}</li>`; }).join("");
    div.innerHTML = `
      <div class="wodx-top"><p class="wodx-prompt">${esc(L.label)}. Spend the points; the count below follows the book (${esc(L.ref)}).</p></div>
      <div class="wodx-scroll">
        <table class="wodx-table wodx-check"><thead><tr><th>Step</th><th>Book</th><th>Sheet</th><th></th></tr></thead><tbody>${sum}</tbody></table>
        <p><b>Freebies:</b> ${fb.used} of ${fb.allowed}${fb.flaws ? `, plus up to ${fb.flaws} from Flaws (${flawPts} taken)` : ""}. ${res.ok ? (fb.left >= 0 ? `${fb.left} left.` : `${-fb.left} must come from Flaws.`) : `<b>${fb.used - fb.allowed - fb.flaws} too many.</b>`}</p>
        ${section("Physical", groups.physical)}${section("Social", groups.social)}${section("Mental", groups.mental)}
        ${section("Talents", groups.talent)}${section("Skills", groups.skill)}${section("Knowledges", groups.knowledge)}
        ${section("Virtues", groups.virtues)}
        <h4>Backgrounds, Merits and Flaws</h4>
        ${mf ? `<ul class="wodx-fn-costs">${mf}</ul>` : `<p class="wodx-quiet">None on the sheet yet.</p>`}
        <p class="wodx-quiet">Add Backgrounds, ${esc((L.powers ?? []).map(p => p.label).join(", ") || "powers")}, Merits and Flaws on the sheet; they are counted here. Starting values: ${esc(L.start.join("; "))}.</p>
        <div class="wodx-buttons"><button type="button" data-action="sheet"><i class="fa-solid fa-user"></i> The sheet</button>
          <button type="button" data-action="check"><i class="fa-solid fa-list-check"></i> Creation check</button></div>
      </div>`;
    return div;
  }
  _replaceHTML(result, content) { content.replaceChildren(result); }

  static async #onStep(ev, el) {
    const path = el.dataset.path, d = Number(el.dataset.d) || 0;
    const t = B.allTraits(this.actor.system ?? {}).find(x => x.path === path);
    if ( !t ) return;
    const v = Math.max(t.min, Math.min(t.max, t.value + d));
    if ( v === t.value ) return;
    await this.actor.update({[t.path]: v});
    this.render();
  }
  static #onSheet() { this.actor.sheet?.render(true); }
  static #onCheck() { CreationCheckApp.open(this.actor); }
}
