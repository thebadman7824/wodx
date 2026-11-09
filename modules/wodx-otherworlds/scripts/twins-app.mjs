import {MODULE_ID} from "./ratings.mjs";
import {LAYERS, TWIN_LAYERS, loadManifest, planTwins, buildTwins, removeTwins, makeUmbralPath, layersOf, twinOf} from "./twins.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";
import {addDreamingLevel, makeTrod} from "./realms.mjs";
import {TRODS} from "./realms-rules.mjs";

const {ApplicationV2} = foundry.applications.api;
const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

/** Storyteller window: build the Penumbra and Shadowlands levels of the world maps. */
export class TwinsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-twin-levels",
    classes: ["wodx", "wodx-tagging", "wodx-twins"],
    window: {title: "Penumbra and Shadowlands levels", icon: "fa-solid fa-clone", resizable: true},
    position: {width: 820, height: 640},
    actions: {
      build: TwinsApp.#onBuild,
      remove: TwinsApp.#onRemove,
      path: TwinsApp.#onPath,
      dreaming: TwinsApp.#onDreaming,
      trod: TwinsApp.#onTrod,
      all: TwinsApp.#onAll,
      reload: TwinsApp.#onReload
    }
  };

  static #instance;
  manifest = null;
  error = null;
  busy = false;

  static open() {
    if ( !game.user.isGM ) return;
    const height = Math.max(360, Math.min(680, window.innerHeight - 120));
    const width = Math.max(480, Math.min(860, window.innerWidth - 40));
    this.#instance ??= new TwinsApp({position: {width, height}});
    return this.#instance.render({force: true});
  }

  async _prepareContext() {
    if ( !this.manifest && !this.error ) {
      try { this.manifest = await loadManifest(); }
      catch (err) { this.error = err.message; }
    }
    return {};
  }

  /** Scenes whose map has twin art, then the rest that already carry twin levels. */
  scenes() {
    const out = [];
    for ( const s of game.scenes ) {
      const bg = layersOf(s).physical?.background?.src ?? s.background?.src;
      const hasArt = !!(this.manifest && bg && TWIN_LAYERS.some(k => twinOf(this.manifest, bg, k)));
      const hasLevels = TWIN_LAYERS.some(k => layersOf(s)[k]);
      if ( hasArt || hasLevels ) out.push(s);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  async _renderHTML() {
    const div = document.createElement("div");
    div.className = "wodx-body";
    if ( this.error ) {
      div.innerHTML = `<div class="wodx-scroll"><p>${esc(this.error)}</p></div>
        <footer class="form-footer wodx-footer"><button type="button" data-action="reload"><i class="fa-solid fa-rotate"></i> Read the list again</button></footer>`;
      return div;
    }
    const scenes = this.scenes();
    const rows = scenes.map(s => {
      const p = planTwins(s, this.manifest);
      const art = TWIN_LAYERS.map(k => `<span class="${p.layers[k].src ? "ok" : "missing"}" title="${esc(LAYERS[k].name)}">${LAYERS[k].name[0]}</span>`).join(" ");
      const state = !p.ok ? `<span class="missing">${esc(p.problems.join(" "))}</span>`
        : p.built ? "Built" : (TWIN_LAYERS.some(k => p.layers[k].exists) ? "Partly built" : "Not built");
      return `<tr data-search-text="${esc(s.name)}">
        <td><input type="checkbox" name="pick" value="${s.id}" ${p.ok ? "" : "disabled"} aria-label="${esc(s.name)}"></td>
        <td class="name">${esc(s.name)}</td>
        <td class="art">${art}</td>
        <td>${p.tiles.length} roof/tile${p.tiles.length === 1 ? "" : "s"}${p.untwinnedTiles ? ` (${p.untwinnedTiles} tinted, no twin art)` : ""}, ${p.lights.length} light${p.lights.length === 1 ? "" : "s"}</td>
        <td>${state}</td>
      </tr>`;
    }).join("");
    const here = globalThis.canvas?.scene;
    const twinned = scenes.filter(s => layersOf(s).penumbra && s.id !== here?.id);
    const pathOptions = twinned.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("");
    const dreamed = game.scenes.filter(s => layersOf(s).dreaming && s.id !== here?.id).sort((a, b) => a.name.localeCompare(b.name));
    const hereDream = !!(here && layersOf(here).dreaming);
    div.innerHTML = `
      <div class="wodx-top">
        <p>Each map gets a <strong>Penumbra</strong> level (elevation ${LAYERS.penumbra.bottom}) and a <strong>Shadowlands</strong> level (${LAYERS.shadowlands.bottom}) with its twin night map. Roofs and lights are copied onto each twin level; walls, sounds and regions stay on every level. A backup of each scene is written to Data/wodx-backups/scenes before it changes.</p>
        <div class="wodx-buttons">
          <button type="button" data-action="all">Tick all</button>
          <button type="button" data-action="build"><i class="fa-solid fa-hammer"></i> Build ticked</button>
          <button type="button" data-action="remove"><i class="fa-solid fa-trash"></i> Remove twins from ticked</button>
        </div>
        ${searchBox("table.wodx-twin-scenes", "Search scenes by name…", "Search scenes")}
      </div>
      <div class="wodx-scroll wodx-table-wrap"><table class="wodx-table wodx-twin-scenes">
        <thead><tr><th></th><th>Scene</th><th title="Twin art found">Art</th><th>Copies</th><th>State</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="5">No scene has twin art. Copy the art to Data/wodx-assets/twins, then read the list again.</td></tr>`}</tbody>
      </table></div>
      <footer class="form-footer wodx-footer">
        ${here && layersOf(here).penumbra ? `
          <label>Moon path from <strong>${esc(here.name)}</strong> to</label>
          ${twinned.length > 5 ? searchBox("select[name=pathTo]", "Search…", "Search destinations") : ""}
          <select name="pathTo">${pathOptions}</select>
          <button type="button" data-action="path" ${twinned.length ? "" : "disabled"}><i class="fa-solid fa-moon"></i> Make Umbral path</button>`
          : `<span class="wodx-quiet">View a scene with twin levels to make an Umbral path from it.</span>`}
        <button type="button" data-action="reload"><i class="fa-solid fa-rotate"></i> Read the art list again</button>
      </footer>
      <footer class="form-footer wodx-footer wow-dreaming">
        ${here ? (hereDream ? `
          <label>Trod from <strong>${esc(here.name)}</strong> to</label>
          ${dreamed.length > 5 ? searchBox("select[name=trodTo]", "Search…", "Search destinations") : ""}
          <select name="trodTo">${dreamed.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>
          <select name="trodKind" data-fixed>${Object.entries(TRODS).map(([k, v]) => `<option value="${k}">${esc(v.label)}</option>`).join("")}</select>
          <button type="button" data-action="trod" ${dreamed.length ? "" : "disabled"}><i class="fa-solid fa-route"></i> Make trod</button>`
          : `<button type="button" data-action="dreaming"><i class="fa-solid fa-feather"></i> Add a Near Dreaming level to ${esc(here.name)}</button>`)
          : `<span class="wodx-quiet">View a scene to give it a Near Dreaming level.</span>`}
      </footer>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  #picked() {
    return [...this.element.querySelectorAll("input[name=pick]:checked")].map(i => game.scenes.get(i.value)).filter(Boolean);
  }

  static #onAll() {
    const boxes = [...this.element.querySelectorAll("input[name=pick]:not(:disabled)")].filter(b => b.closest("tr")?.style.display !== "none");
    const on = boxes.some(b => !b.checked);
    for ( const b of boxes ) b.checked = on;
  }

  static async #onBuild() {
    if ( this.busy ) return;
    const scenes = this.#picked();
    if ( !scenes.length ) return ui.notifications.warn("Tick the scenes to build first.");
    const ok = await foundry.applications.api.DialogV2.confirm({
      classes: ["wodx", "wodx-dialog"], window: {title: "Build twin levels"},
      content: `<p>Build Penumbra and Shadowlands levels on ${scenes.length} scene(s)? Each is backed up first. Nothing is deleted.</p>`,
      rejectClose: false
    });
    if ( !ok ) return;
    this.busy = true;
    const done = [];
    const failed = [];
    try {
      for ( const s of scenes ) {
        try {
          const r = await buildTwins(s, {manifest: this.manifest});
          done.push(`${s.name}: ${r.made.levels} level(s), ${r.made.tiles} tile(s), ${r.made.lights} light(s)`);
        } catch (err) {
          console.error("WoDX |", err);
          failed.push(`${s.name}: ${err.message}`);
        }
      }
    } finally { this.busy = false; }
    await writeTwinsReport(done, failed);
    ui.notifications[failed.length ? "warn" : "info"](`Twin levels built on ${done.length} scene(s)${failed.length ? `; ${failed.length} failed (see WoDX Twin Levels)` : ""}.`);
    await this.render();
  }

  static async #onRemove() {
    const scenes = this.#picked();
    if ( !scenes.length ) return ui.notifications.warn("Tick the scenes first.");
    let n = 0;
    for ( const s of scenes ) if ( (await removeTwins(s))?.removed ) n++;
    if ( n ) ui.notifications.info(`Removed the twin levels from ${n} scene(s).`);
    await this.render();
  }

  static async #onPath() {
    const to = game.scenes.get(this.element.querySelector("select[name=pathTo]")?.value);
    if ( !to || !canvas?.scene ) return;
    try {
      await makeUmbralPath(canvas.scene, to);
      ui.notifications.info(`Made a moon path between ${canvas.scene.name} and ${to.name}, on both Penumbra levels, at the middle of each map. Move it where the path runs.`);
    } catch (err) { ui.notifications.error(err.message); }
  }

  static async #onDreaming() {
    try {
      await addDreamingLevel(canvas.scene);
      ui.notifications.info(`${canvas.scene.name} has a Near Dreaming level now (elevation 3000), showing its own map, warmer.`);
    } catch (err) { ui.notifications.error(err.message); }
    await this.render();
  }

  static async #onTrod() {
    const to = game.scenes.get(this.element.querySelector("select[name=trodTo]")?.value);
    const kind = this.element.querySelector("select[name=trodKind]")?.value ?? "silver";
    if ( !to || !canvas?.scene ) return;
    try {
      await makeTrod(canvas.scene, to, {kind});
      ui.notifications.info(`Made a trod between ${canvas.scene.name} and ${to.name}, on both Near Dreaming levels, at the middle of each map. Move it where the road runs.`);
    } catch (err) { ui.notifications.error(err.message); }
  }

  static async #onReload() {
    this.manifest = null;
    this.error = null;
    try { this.manifest = await loadManifest(undefined, {fresh: true}); }
    catch (err) { this.error = err.message; }
    await this.render();
  }
}

/** The "WoDX Twin Levels" journal: what was built, and what failed. */
export async function writeTwinsReport(done = [], failed = []) {
  const stamp = new Date().toLocaleString();
  const html = `<p>Last build: ${esc(stamp)}.</p>
    ${done.length ? `<h2>Built</h2><ul>${done.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
    ${failed.length ? `<h2>Failed</h2><ul>${failed.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
    <h2>How the twins work</h2>
    <ul>
      <li>Stepping sideways moves a Garou's token to the Penumbra level; stepping back moves it to the physical level. Crossing the Shroud (Storyteller) moves tokens to and from the Shadowlands level.</li>
      <li>A level shows only itself, so a token in the Penumbra sees the Penumbra map, its roofs and lights.</li>
      <li>Walls, sounds and regions are on every level (house rule): the spirit and shadow worlds keep the physical world's shape.</li>
      <li>An Umbral path is a Teleport Token region on the Penumbra level only, so only travelers in the Umbra take it.</li>
      <li>Each scene was backed up to Data/wodx-backups/scenes before it changed.</li>
    </ul>`;
  let journal = game.journal.find(j => j.getFlag(MODULE_ID, "kind") === "twins-report");
  if ( !journal ) journal = await JournalEntry.create({name: "WoDX Twin Levels", flags: {[MODULE_ID]: {kind: "twins-report"}},
    pages: [{name: "Twin levels", type: "text", text: {content: html}}]});
  else await journal.pages.getName("Twin levels")?.update({"text.content": html});
  return journal;
}
