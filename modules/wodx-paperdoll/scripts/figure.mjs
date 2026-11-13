/**
 * The figure menu (B2587): a player puts together the whole figure their token walks as, from the wardrobe pieces the
 * sprite rig draws. The picture here is quick, one ready layer per piece; the walking sprite itself is drawn from the
 * saved choice with the next batch (B2586). Rules in figure-rules.mjs. buildMenu and paint need no Foundry.
 */
import * as F from "./figure-rules.mjs";
const MOD = "wodx-paperdoll";
const esc = s => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const searchBox = (target, placeholder) => `<input type="search" class="wodx-search" data-search="${esc(target)}" placeholder="${esc(placeholder)}" aria-label="${esc(placeholder)}" autocomplete="off" spellcheck="false">`;

/** Draw the quick picture: each layer from the atlas, tinted where the figure says so. */
export function paint(canvas, atlas, fig, cat) {
  const ctx = canvas.getContext("2d"), w = cat.w, h = cat.h;
  canvas.width = w; canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  const tmp = canvas.ownerDocument.createElement("canvas"); tmp.width = w; tmp.height = h;
  const t = tmp.getContext("2d");
  for ( const l of F.layersOf(fig, cat) ) {
    const c = F.cellOf(cat, l.i);
    t.globalCompositeOperation = "source-over"; t.clearRect(0, 0, w, h);
    t.drawImage(atlas, c.x, c.y, w, h, 0, 0, w, h);
    if ( l.tint && l.mode ) {
      t.globalCompositeOperation = l.mode; t.fillStyle = `#${l.tint}`; t.fillRect(0, 0, w, h);
      t.globalCompositeOperation = "destination-in"; t.drawImage(atlas, c.x, c.y, w, h, 0, 0, w, h);
    }
    ctx.drawImage(tmp, 0, 0);
  }
}

/** A piece's small picture: its own layer cut from the atlas. */
const thumb = (cat, e) => { const c = F.cellOf(cat, e.i); return `<span class="wodx-figure-thumb" style="background-position:-${c.x + (e.c?.[0] ?? 48) - 24}px -${c.y + (e.c?.[1] ?? 56) - 24}px"></span>`; };

/**
 * The menu's markup. `ui` is what the window remembers between drawings: {slot, year, allYears}; `lists` gives the
 * skin and hair colours to offer as [hex, label].
 */
export function buildMenu(fig, cat, ui, lists) {
  const year = ui.allYears ? null : ui.year ?? null;
  const swatches = (name, list, cur) => `<div class="wodx-figure-swatches" role="radiogroup" aria-label="${esc(cap(name))}">${list.map(([h, l]) =>
    `<button type="button" data-action="colour" data-what="${name}" data-hex="${h}" class="wodx-figure-swatch${h === cur ? " on" : ""}" style="background:#${h}" data-tooltip="${esc(l)}" aria-label="${esc(l)}" aria-pressed="${h === cur}"></button>`).join("")}</div>`;
  const slotLi = ([k, label]) => {
    const p = fig.slots[k];
    return `<li><button type="button" data-action="slot" data-slot="${k}" class="wodx-figure-slot${k === ui.slot ? " on" : ""}" aria-pressed="${k === ui.slot}">
      <span class="wodx-figure-slot-name">${esc(label)}</span><span class="wodx-figure-slot-has">${esc(p ? cap(p.n.replace(/^an? /, "")) : "Nothing")}</span></button></li>`;
  };
  // The body, the clothes and the face first; the smaller parts under More, open when one of them is picked (B2833)
  const all = Object.entries(F.SLOTS);
  const main = all.filter(([k]) => F.MAIN_SLOTS.includes(k)), rest = all.filter(([k]) => !F.MAIN_SLOTS.includes(k));
  const restOpen = rest.some(([k]) => k === ui.slot || fig.slots[k]);
  const slots = `${main.map(slotLi).join("")}${rest.length ? `<li class="wodx-figure-more"><details${restOpen ? " open" : ""}><summary>More: ${esc(rest.map(([, l]) => l.toLowerCase()).join(", "))}</summary><ul class="wodx-figure-slots" data-fixed>${rest.map(slotLi).join("")}</ul></details></li>` : ""}`;
  const cur = fig.slots[ui.slot], list = F.piecesFor(cat, ui.slot, year);
  if ( cur && !list.some(e => e.n === cur.n) ) { const e = F.pieceOf(cat, cur.n); if ( e ) list.unshift(e); }
  const pieces = [`<li><button type="button" data-action="wear" data-name="" class="wodx-figure-piece${cur ? "" : " on"}"><span class="wodx-figure-thumb none"></span><span>Nothing</span></button></li>`,
    ...list.map(e => `<li><button type="button" data-action="wear" data-name="${esc(e.n)}" class="wodx-figure-piece${cur?.n === e.n ? " on" : ""}" aria-pressed="${cur?.n === e.n}">${thumb(cat, e)}<span>${esc(cap(e.n.replace(/^an? /, "")))}</span></button></li>`)].join("");
  const dye = cur ? `<div class="form-group wodx-figure-dye"><label for="wodx-figure-dye">Its colour</label><div class="form-fields">
      <input type="color" id="wodx-figure-dye" name="dye" value="#${cur.c ?? "808080"}"${cur.c ? "" : ' data-unset="1"'}>
      <button type="button" data-action="undye"${cur.c ? "" : " disabled"}>As it comes</button></div></div>` : "";
  return `<div class="wodx-figure-cols">
    <div class="wodx-figure-left">
      <canvas class="wodx-figure-pic" width="${cat.w}" height="${cat.h}" role="img" aria-label="The figure so far"></canvas>
      <p class="hint">A quick picture. The walking figure is drawn from these choices the next time the Storyteller has the sprites drawn.</p>
      <h3>Skin</h3>${swatches("skin", lists.skin, fig.skin)}
      <h3>Hair</h3>${swatches("hair", lists.hair, fig.hair)}
      <div class="form-group"><label for="wodx-figure-hairstyle">Worn</label><div class="form-fields"><select id="wodx-figure-hairstyle" name="hairStyle" data-fixed>${Object.entries(F.HAIR_STYLES).map(([k, l]) =>
        `<option value="${k}"${k === fig.hairStyle ? " selected" : ""}>${esc(l)}</option>`).join("")}</select></div></div>
    </div>
    <div class="wodx-figure-mid"><h3>Dressed in</h3><ul class="wodx-figure-slots" data-fixed>${slots}</ul></div>
    <div class="wodx-figure-right">
      <h3>${esc(F.SLOTS[ui.slot])}</h3>
      ${searchBox("ul.wodx-figure-pieces", "Search these pieces")}
      ${ui.year === null || ui.year === undefined ? "" : `<label class="wodx-figure-years"><input type="checkbox" name="allYears"${ui.allYears ? " checked" : ""}> Show the pieces of every age, not only ${esc(ui.yearLabel ?? ui.year)}</label>`}
      <ul class="wodx-figure-pieces">${pieces}</ul>
      ${dye}
    </div>
  </div>
  <footer class="wodx-footer"><button type="button" data-action="save"><i class="fa-solid fa-floppy-disk"></i> Keep this figure</button>
    <button type="button" data-action="strip"><i class="fa-solid fa-rotate-left"></i> Take everything off</button></footer>`;
}

/** Wire a drawn menu: every change hands a new figure or new window memory to `on`. */
export function wire(root, fig, cat, ui, on) {
  root.addEventListener("click", ev => {
    const b = ev.target.closest?.("[data-action]"); if ( !b || !root.contains(b) ) return;
    const a = b.dataset.action;
    if ( a === "slot" ) on.ui({...ui, slot: b.dataset.slot});
    else if ( a === "wear" ) on.fig(F.wear(fig, ui.slot, b.dataset.name || null, cat));
    else if ( a === "colour" ) on.fig({...fig, [b.dataset.what]: b.dataset.hex});
    else if ( a === "undye" ) on.fig(F.dye(fig, ui.slot, null));
    else if ( a === "strip" ) on.fig({...fig, slots: {}});
    else if ( a === "save" ) on.save(fig);
  });
  root.addEventListener("change", ev => {
    const t = ev.target;
    if ( t.name === "hairStyle" ) on.fig({...fig, hairStyle: t.value});
    else if ( t.name === "allYears" ) on.ui({...ui, allYears: t.checked});
    else if ( t.name === "dye" ) on.fig(F.dye(fig, ui.slot, t.value.replace("#", "")));
  });
}

/* ---- the window, in Foundry ---- */
let CAT = null, ATLAS = null;
async function assets() {
  CAT ??= await fetch(`${F.FOLDER}/catalogue.json`).then(r => r.json());
  ATLAS ??= await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = `${F.FOLDER}/atlas.png`; });
  return {cat: CAT, atlas: ATLAS};
}
export const figureOf = (actor, cat) => {
  const raw = actor?.flags?.[MOD]?.figure, c = actor?.flags?.[MOD]?.look?.colors ?? {};
  return raw && cat ? F.normalize(raw, cat, c) : raw ?? null;
};

export function makeFigureApp({skin, hair, year}) {
  const ApplicationV2 = foundry.applications.api.ApplicationV2;
  return class FigureApp extends ApplicationV2 {
    static DEFAULT_OPTIONS = {classes: ["wodx", "wodx-figure-app"], window: {title: "Figure", icon: "fa-solid fa-person", resizable: true}, position: {width: 860, height: 660}};
    static #open = new Map();
    static open(actor) {
      let app = this.#open.get(actor.id);
      if ( !app ) { app = new FigureApp({id: `wodx-figure-${actor.id}`, actor}); this.#open.set(actor.id, app); }
      return app.render({force: true});
    }
    constructor(options = {}) { super(options); this.actor = options.actor; this.ui = {slot: "body", allYears: false}; this.fig = null; }
    get title() { return `Figure: ${this.actor.name}`; }
    async _renderHTML() {
      const {cat, atlas} = await assets();
      const y = year?.() ?? null;
      this.ui = {...this.ui, year: y?.year ?? null, yearLabel: y?.label ?? null};
      this.fig ??= F.normalize(this.actor.flags?.[MOD]?.figure, cat, this.actor.flags?.[MOD]?.look?.colors ?? {});
      const div = document.createElement("div");
      div.className = "wodx-body wodx-figure";
      div.innerHTML = buildMenu(this.fig, cat, this.ui, {skin, hair});
      paint(div.querySelector("canvas.wodx-figure-pic"), atlas, this.fig, cat);
      wire(div, this.fig, cat, this.ui, {
        ui: u => { this.ui = u; this.render(); },
        fig: f => { this.fig = f; this.render(); },
        save: async f => { if ( this.actor.flags?.[MOD]?.figure ) await this.actor.unsetFlag(MOD, "figure"); await this.actor.setFlag(MOD, "figure", f); ui.notifications?.info(`${this.actor.name}: figure kept. The walking sprite follows when the sprites are next drawn.`); }
      });
      return div;
    }
    _replaceHTML(result, content) { content.replaceChildren(result); }
    _onClose(o) { FigureApp.#open.delete(this.actor.id); return super._onClose?.(o); }
  };
}
