import {MODULE_ID, sceneRatings, activeChartId, behaviorType} from "./ratings.mjs";
import {SETTLEMENTS, CHARTS, gauntletFor, suggestSettlement, battlemapParent} from "./rules.mjs";
import {buildPenumbraPrototype} from "./prototype.mjs";
import {clearCrossing} from "./crossing.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Presets shipped with the module: data/presets/<id>.json */
export const PRESETS = {rothenstein: "What Sleeps Beneath Rothenstein"};

async function loadPreset(id) {
  const url = foundry.utils.getRoute(`modules/${MODULE_ID}/data/presets/${id}.json`);
  const response = await fetch(url, {cache: "no-store"});
  if ( !response.ok ) throw new Error(`Preset ${id} could not be loaded`);
  return response.json();
}

const numOrNull = v => (v === "" || v === null || v === undefined) ? null : Number(v);

/** Storyteller window: tag every scene with its kind of place and ratings. */
export class TaggingApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-otherworld-ratings",
    tag: "form",
    classes: ["wodx", "wodx-tagging"],
    window: {title: "Otherworld ratings by scene", icon: "fa-solid fa-ghost", resizable: true},
    position: {width: 860, height: 700},
    actions: {
      fillNames: TaggingApp.#onFillNames,
      fillPreset: TaggingApp.#onFillPreset,
      followParents: TaggingApp.#onFollowParents,
      report: TaggingApp.#onReport,
      prototype: () => buildPenumbraPrototype(),
      clear: () => clearCrossing()
    },
    form: {handler: TaggingApp.#onSubmit, closeOnSubmit: false}
  };

  static #instance;

  static open() {
    if ( !game.user.isGM ) return;
    // Fit the screen: Foundry also caps the height, but start inside it so nothing opens off-screen
    const height = Math.max(360, Math.min(720, window.innerHeight - 120));
    const width = Math.max(480, Math.min(900, window.innerWidth - 40));
    this.#instance ??= new TaggingApp({position: {width, height}});
    return this.#instance.render({force: true});
  }

  async _renderHTML() {
    const chartId = activeChartId();
    const chart = CHARTS[chartId];
    const options = sel => Object.entries(SETTLEMENTS).map(([k, v]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${esc(v)}</option>`).join("");
    const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name));
    const rows = scenes.map(s => {
      const r = sceneRatings(s) ?? {};
      const g = gauntletFor(chartId, r).gauntlet;
      return `<tr data-scene="${s.id}" data-name="${esc(s.name)}" data-search-text="${esc(s.name)}">
        <td class="name">${esc(s.name)}</td>
        <td><select name="${s.id}.settlement" data-fixed>${options(r.settlement ?? "")}</select></td>
        <td class="g">${g === null ? "–" : (g === 0 ? "no roll" : g)}</td>
        <td><input type="number" name="${s.id}.gauntlet" value="${r.gauntlet ?? ""}" min="0" max="10" step="1" placeholder="chart"></td>
        <td><input type="number" name="${s.id}.modifier" value="${r.modifier ?? 0}" min="-5" max="5" step="1"></td>
        <td><input type="number" name="${s.id}.shroud" value="${r.shroud ?? ""}" min="4" max="10" step="1"></td>
        <td><input type="number" name="${s.id}.banality" value="${r.banality ?? ""}" min="0" max="10" step="1"></td>
        <td><input type="checkbox" name="${s.id}.reflective" ${r.reflective ? "checked" : ""}></td>
        <td><input type="checkbox" name="${s.id}.umbralStorm" ${r.umbralStorm ? "checked" : ""}></td>
      </tr>`;
    }).join("");
    const presetOptions = Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join("");
    const div = document.createElement("div");
    div.className = "wodx-body";
    div.innerHTML = `
      <div class="wodx-top">
      <p>Era chart in force: <strong>${esc(chart.name)}</strong> (${esc(chart.source)}). A region with the "WoDX: Otherworld ratings" behavior overrides its scene.</p>
      <div class="wodx-buttons">
        <button type="button" data-action="fillNames" title="Only fills rows that are not set">Suggest from scene names</button>
        <select name="preset">${presetOptions}</select>
        <button type="button" data-action="fillPreset" title="Only fills rows that are not set">Fill from preset</button>
        <button type="button" data-action="followParents">Battlemaps follow their scene</button>
        <button type="button" data-action="report"><i class="fa-solid fa-book"></i> Write report</button>
        <button type="button" data-action="prototype" title="Copies the scene you are viewing">Penumbra prototype</button>
        <button type="button" data-action="clear" title="For the selected tokens">Clear Umbra, Caught, Lost</button>
      </div>
      <p class="wodx-quiet">Filled rows are marked; nothing is saved until you press Save.</p>
      ${searchBox("table.wodx-scenes", "Search scenes by name…", "Search scenes")}
      </div>
      <div class="wodx-scroll wodx-table-wrap"><table class="wodx-table wodx-scenes">
        <thead><tr><th>Scene</th><th>Kind of place</th><th>Gauntlet</th><th>Override</th><th>Mod.</th><th>Shroud</th><th>Banality</th><th title="Reflective surface at hand">Mirror</th><th title="Umbral storm">Storm</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>
      <footer class="form-footer wodx-footer"><button type="submit"><i class="fa-solid fa-floppy-disk"></i> Save</button></footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  #rows() {
    return [...this.element.querySelectorAll("tbody tr")];
  }

  #fill(row, tag) {
    const sel = row.querySelector("select");
    if ( !tag || sel.value ) return false;
    sel.value = tag;
    row.classList.add("wodx-filled");
    return true;
  }

  static #onFillNames() {
    let n = 0;
    for ( const row of this.#rows() ) if ( this.#fill(row, suggestSettlement(row.dataset.name)) ) n++;
    ui.notifications.info(`Suggested a kind of place for ${n} scene(s). Check them, then Save.`);
  }

  static async #onFillPreset() {
    const id = this.element.querySelector("select[name=preset]")?.value;
    let preset;
    try {
      preset = await loadPreset(id);
    } catch (err) {
      return ui.notifications.error(err.message);
    }
    let n = 0;
    for ( const row of this.#rows() ) {
      const name = battlemapParent(row.dataset.name) ?? row.dataset.name;
      if ( this.#fill(row, preset.scenes?.[name]) ) n++;
    }
    ui.notifications.info(`Filled ${n} scene(s) from the ${preset.name} preset. Check them, then Save.`);
  }

  static #onFollowParents() {
    const byName = new Map(this.#rows().map(r => [r.dataset.name, r]));
    let n = 0;
    for ( const row of this.#rows() ) {
      const parent = battlemapParent(row.dataset.name);
      const source = parent ? byName.get(parent) : null;
      if ( source && this.#fill(row, source.querySelector("select").value) ) n++;
    }
    ui.notifications.info(`${n} battlemap(s) now follow their scene. Check them, then Save.`);
  }

  static async #onSubmit(event, form) {
    const updates = [];
    for ( const scene of game.scenes ) {
      const get = k => form.elements[`${scene.id}.${k}`];
      if ( !get("settlement") ) continue;
      const next = {
        settlement: get("settlement").value,
        gauntlet: numOrNull(get("gauntlet").value),
        modifier: Number(get("modifier").value) || 0,
        shroud: numOrNull(get("shroud").value),
        banality: numOrNull(get("banality").value),
        reflective: get("reflective").checked,
        umbralStorm: get("umbralStorm").checked
      };
      const prev = sceneRatings(scene) ?? {};
      const changed = Object.keys(next).some(k => (prev[k] ?? (k === "modifier" ? 0 : (typeof next[k] === "boolean" ? false : (k === "settlement" ? "" : null)))) !== next[k]);
      if ( changed ) updates.push({_id: scene.id, [`flags.${MODULE_ID}.ratings`]: next});
    }
    if ( updates.length ) await Scene.updateDocuments(updates);
    // A report that already exists is kept in step with what was saved
    const reported = updates.length && game.journal.find(j => j.getFlag(MODULE_ID, "kind") === "ratings-report");
    if ( reported ) await writeReport();
    ui.notifications.info(updates.length ? `Saved ratings for ${updates.length} scene(s)${reported ? " and updated the report" : ""}.` : "Nothing changed.");
    await this.render();
  }

  static async #onReport() {
    await writeReport();
  }
}

/**
 * Write the ratings report and the Gauntlet charts into journals. GM only.
 */
export async function writeReport() {
  if ( !game.user.isGM ) return;
  const chartIds = Object.keys(CHARTS);
  const scenes = [...game.scenes].sort((a, b) => a.name.localeCompare(b.name));
  const tagged = scenes.filter(s => sceneRatings(s)?.settlement || Number.isInteger(sceneRatings(s)?.gauntlet));
  const rows = tagged.map(s => {
    const r = sceneRatings(s);
    const cells = chartIds.map(c => { const g = gauntletFor(c, r).gauntlet; return `<td>${g === null ? "–" : (g === 0 ? "no roll" : g)}</td>`; }).join("");
    return `<tr><td>${esc(s.name)}</td><td>${esc(SETTLEMENTS[r.settlement] ?? "Set by hand")}</td>${cells}<td>${r.shroud ?? "–"}</td></tr>`;
  }).join("");
  const untagged = scenes.filter(s => !tagged.includes(s)).map(s => `<li>${esc(s.name)}</li>`).join("");
  const regionCount = scenes.reduce((n, s) => n + s.regions.filter(r => r.behaviors.some(b => b.type === behaviorType())).length, 0);
  const head = chartIds.map(c => `<th>${esc(CHARTS[c].name)}</th>`).join("");
  const html = `
    <p>${tagged.length} of ${scenes.length} scenes are tagged; ${regionCount} region(s) carry their own ratings. The era in force uses <strong>${esc(CHARTS[activeChartId()].name)}</strong>.</p>
    <table><thead><tr><th>Scene</th><th>Kind of place</th>${head}<th>Shroud</th></tr></thead><tbody>${rows}</tbody></table>
    ${untagged ? `<h2>Not tagged</h2><ul>${untagged}</ul>` : ""}`;

  let journal = game.journal.find(j => j.getFlag(MODULE_ID, "kind") === "ratings-report");
  if ( !journal ) {
    journal = await JournalEntry.create({name: "WoDX Otherworld Ratings", flags: {[MODULE_ID]: {kind: "ratings-report"}},
      pages: [{name: "Scenes", type: "text", text: {content: html}}]});
  } else {
    const page = journal.pages.getName("Scenes");
    if ( page ) await page.update({"text.content": html});
    else await journal.createEmbeddedDocuments("JournalEntryPage", [{name: "Scenes", type: "text", text: {content: html}}]);
  }
  await writeChartsPage();
  journal.sheet.render(true);
}

/** Record the Gauntlet charts, with every WoDX choice marked, in the Chronicle Rules journal. */
export async function writeChartsPage() {
  if ( !game.user.isGM ) return;
  const rules = game.journal.find(j => j.getFlag("wodx-chronicle", "kind") === "chronicle-rules");
  if ( !rules ) return;
  const keys = Object.keys(SETTLEMENTS).filter(k => k);
  const head = Object.values(CHARTS).map(c => `<th>${esc(c.name)}</th>`).join("");
  const body = keys.map(k => `<tr><td>${esc(SETTLEMENTS[k])}</td>${Object.values(CHARTS).map(c => {
    const v = c.values[k];
    const mark = c.ourCall[k] ? "*" : "";
    return `<td>${v === undefined ? "–" : (v === 0 ? "no roll" : v)}${mark}</td>`;
  }).join("")}</tr>`).join("");
  const calls = Object.values(CHARTS).flatMap(c => Object.entries(c.ourCall).map(([k, t]) => `<li>${esc(c.name)}, ${esc(SETTLEMENTS[k])}: ${esc(t)}</li>`)).join("");
  const sources = Object.values(CHARTS).map(c => `<li>${esc(c.name)}: ${esc(c.source)}</li>`).join("");
  const html = `
    <p>Which chart applies is set by the era profile: Dark Ages, Long Night and Renaissance use Dark Ages: Werewolf; the Wild West uses the Wyld West Expansion Pack; the Victorian age, the Great War and every later era use W20, the basis book for those years.</p>
    <table><thead><tr><th>Kind of place</th>${head}</tr></thead><tbody>${body}</tbody></table>
    <p>* WoDX choice, not from a book:</p><ul>${calls}</ul>
    <h2>Sources</h2><ul>${sources}</ul>
    <h2>Crossing rules</h2>
    <ul>
      <li><strong>Dark Ages:</strong> roll Gnosis against the Gauntlet. A reflective surface gives −1 and turns a botch into a ruined surface. Each failed attempt at the same spot adds +1 (at most 10). A botch without a surface loses the traveler in the Pattern Web for hours or days. Peeking needs one success and takes no time.</li>
      <li><strong>W20 and Wild West:</strong> roll Gnosis against the Gauntlet, on a highly reflective surface (not needed with Pulse of the Invisible; a carried mirror may add +1). After a failure, wait an hour. A botch catches the traveler in the Gauntlet until another Garou frees them or an hour passes for another try; a second botch traps them until rescued. Peeking from the physical world is Gauntlet +3 (at most 9). In an Umbral storm, each 1 counts twice.</li>
      <li><strong>Shift time:</strong> 1 success, five minutes; 2, thirty seconds; 3 or more, instantly.</li>
      <li><strong>Packs:</strong> the opener of the way, usually the highest Gnosis, rolls once for the whole pack.</li>
      <li><strong>WoDX reading:</strong> when a caught traveler succeeds, or a packmate's roll frees them, they arrive on the far side.</li>
      <li><strong>Disconnection</strong> (W20 p. 319): each lunar cycle spent in one world makes crossing to the other 1 harder; after a year and a day in the Penumbra a shapechanger begins to become a creature of spirit (proposed to the Storyteller). WoDX choice: the same rule is used in the Dark Ages, which gives none.</li>
    </ul>
    <h2>One Umbra</h2>
    <p>Where the lines' rules or ideas of the spirit world conflict, WoDX follows Wraith: the Oblivion first, then Werewolf: the Apocalypse, then Mage: the Ascension. Conflicts decided so far:</p>
    <ul>
      <li><strong>The Shadowlands are beyond the Shroud, not the Gauntlet.</strong> Wraith puts the Shroud between the living world and the Shadowlands; Werewolf and Mage fold the lands of the dead into the wider Umbra behind the Gauntlet. WoDX keeps them apart: a map's Shadowlands level is reached by crossing the Shroud, and stepping sideways cannot start or end there.</li>
      <li><strong>Each map has one Penumbra and one Shadowlands level.</strong> Mage's three Umbrae and Werewolf's Near Umbra realms beyond the Penumbra are scenes of their own, reached by Umbral paths.</li>
    </ul>`;
  const page = rules.pages.getName("Gauntlet charts");
  if ( page ) await page.update({"text.content": html});
  else await rules.createEmbeddedDocuments("JournalEntryPage", [{name: "Gauntlet charts", type: "text", text: {content: html}}]);
}
