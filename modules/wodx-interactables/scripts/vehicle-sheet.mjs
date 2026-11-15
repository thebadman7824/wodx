/**
 * WoDX Interactables: the vehicle's own sheet, the Foundry side of vehicle-sheet-rules.mjs (decisions B4968, B4969).
 * The actor kind "wodx-interactables.vehicle" (module.json documentTypes) has its own data and its own sheet:
 *   - its kind, the year it was built, its paint and style (for the sprite thread's pictures);
 *   - its figures for that year (Durability, Structure, Maneuver, safe and top speed, seats), from the same tables the
 *     tiles use; a Structure track marked like health, wrecked at the end of it;
 *   - who is aboard (its tokens on the scene), its mounted guns and its cargo (items dropped on the sheet);
 *   - headlights on the token for a motor vehicle from 1900.
 * Getting in, driving and fighting go as for a mount tile: main.mjs reads its token as a mount (beastOf).
 */
import * as VR from "./vehicle-sheet-rules.mjs";

const MOD = "wodx-interactables";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const yearNow = () => { try { return Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0; } catch (e) { return 0; } };
const opts = (o, v) => Object.entries(o).map(([k, l]) => `<option value="${esc(k)}"${k === (v ?? "") ? " selected" : ""}>${esc(l)}</option>`).join("");

/** The vehicle's data. */
function dataModel() {
  const F = foundry.data.fields;
  return class VehicleData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
      return {
        kind: new F.StringField({initial: "car", choices: Object.fromEntries(VR.VEHICLE_KINDS.map(k => [k, k]))}),
        built: new F.NumberField({nullable: true, initial: null, integer: true, min: 0, max: 3000}),
        colour: new F.StringField({initial: "", blank: true}),
        style: new F.StringField({initial: "", blank: true}),
        lost: new F.NumberField({initial: 0, integer: true, min: 0}),
        burning: new F.BooleanField({initial: false}),
        lights: new F.BooleanField({initial: false}),
        seats: new F.NumberField({nullable: true, initial: null, integer: true, min: 1, max: 40}),
        notes: new F.HTMLField({initial: "", blank: true})
      };
    }
  };
}

/** The tokens of a vehicle on the scenes that are viewed, with who is aboard each. */
function aboardOf(actor) {
  const out = [];
  for ( const scene of game.scenes?.filter(s => s.active || s.id === canvas?.scene?.id) ?? [] ) {
    for ( const t of scene.tokens?.contents ?? [] ) {
      if ( t.actor?.id !== actor.id && t.actorId !== actor.id ) continue;
      const f = t.flags?.[MOD] ?? {};
      if ( f.driver?.n ) out.push({n: f.driver.n, role: "at the wheel"});
      for ( const r of Array.isArray(f.riders) ? f.riders : [] ) if ( r?.n ) out.push({n: r.n, role: "aboard"});
    }
  }
  return out;
}

/** Light the tokens of a vehicle, or put the light out (B4969). */
export async function setLights(actor) {
  if ( !actor || actor.type !== VR.VEHICLE_TYPE || !game.user.isGM ) return;
  const fig = VR.figures(actor.system, yearNow());
  const light = VR.headlights(fig.kind, fig.year, !!actor.system.lights && fig.hull.state !== "wrecked");
  for ( const scene of game.scenes?.filter(s => s.active || s.id === canvas?.scene?.id) ?? [] ) {
    const docs = (scene.tokens?.contents ?? []).filter(t => t.actor?.id === actor.id || t.actorId === actor.id);
    const ups = docs.map(t => ({_id: t.id, light: light ?? {dim: 0, bright: 0, angle: 360}, "texture.tint": fig.hull.tint ?? "#ffffff"}));
    if ( ups.length ) await scene.updateEmbeddedDocuments("Token", ups);
  }
}

function sheetClass() {
  const {ActorSheetV2} = foundry.applications.sheets;
  return class VehicleSheet extends ActorSheetV2 {
    static DEFAULT_OPTIONS = {classes: ["wodx", "wodx-vehicle"], position: {width: 560, height: 680}, window: {resizable: true},
      form: {submitOnChange: true, closeOnSubmit: false}};

    async _renderHTML() {
      const a = this.document, s = a.system, f = VR.figures(s, yearNow()), edit = this.isEditable;
      const kinds = Object.fromEntries(VR.VEHICLE_KINDS.map(k => [k, game.modules.get(MOD)?.api?.rules?.MOUNTS?.[k]?.label ?? k]));
      const guns = a.items.filter(VR.isMountedGun), cargo = a.items.filter(i => !VR.isMountedGun(i));
      const aboard = aboardOf(a);
      const row = (l, v) => `<div class="wvx-fig"><span>${esc(l)}</span><b>${esc(v)}</b></div>`;
      const chart = f.chart ? row("Safe speed", `${f.chart.safe} mph`) + row("Top speed", `${f.chart.top} mph`) + row("Maneuver", f.chart.maneuver)
        : f.speed ? row("Pace", `${f.speed} yards a turn`) : "";
      const body = f.body ? row("Durability", f.body.durability) + row("Structure", f.body.structure) + (f.body.mass ? row("Mass in a ram", `+${f.body.mass}`) : "")
        + row("Those inside", f.body.full ? "never reached from outside" : f.body.shelter ? "shielded under 4 successes" : "open to blows") : "";
      const track = f.track.map(b => `<button type="button" class="wvx-box${b.lost ? " lost" : ""}" data-box="${b.n}"${edit ? "" : " disabled"} title="${b.n} of ${f.body?.structure ?? 0}">${b.lost ? "✕" : ""}</button>`).join("");
      const item = i => `<li class="wvx-item" data-item="${i.id}"><img src="${esc(i.img)}" alt=""><a data-open="${i.id}">${esc(i.name)}</a>${edit ? `<a class="wvx-del" data-del="${i.id}" title="Remove">✕</a>` : ""}</li>`;
      const html = `<section class="wvx">
        <header class="wvx-head"><img class="wvx-img" src="${esc(a.img)}" data-edit="img" alt=""><div>
          <input type="text" name="name" value="${esc(a.name)}" ${edit ? "" : "disabled"}>
          <div class="wvx-line"><label>Kind <select name="system.kind" data-fixed ${edit ? "" : "disabled"}>${opts(kinds, f.kind)}</select></label>
          <label>Built <input type="number" name="system.built" value="${s.built ?? ""}" placeholder="${f.year || ""}" min="0" max="3000" ${edit ? "" : "disabled"}></label></div>
          <div class="wvx-line"><label>Paint <select name="system.colour" data-fixed ${edit ? "" : "disabled"}>${opts(VR.COLOURS, s.colour)}</select></label>
          <label>Style <select name="system.style" data-fixed ${edit ? "" : "disabled"}>${opts(VR.STYLES, s.style)}</select></label></div>
          ${f.early ? `<p class="wvx-warn">No ${esc(f.label.toLowerCase())} before about ${f.from}: only the Storyteller's kept one would be here.</p>` : ""}
        </div></header>
        <h3>Figures for ${f.year || "the chronicle's year"} <span class="wodx-quiet">(Mage 20th pp. 458-463; house figures before)</span></h3>
        <div class="wvx-figs">${chart}${body}${row("Seats", f.seats)}${row("Driven with", f.skill === "pilot" ? "Pilot" : f.skill === "athletics" ? "Athletics" : f.skill === "ride" ? "Ride" : "Drive")}</div>
        <h3>Structure <span class="wodx-quiet">${f.hull.label ? esc(f.hull.label) : "sound"}</span></h3>
        <div class="wvx-track">${track || "<i>No body to damage.</i>"}</div>
        <div class="wvx-line"><label><input type="checkbox" name="system.burning" ${s.burning ? "checked" : ""} ${edit ? "" : "disabled"}> Burnt out</label>
          <label><input type="checkbox" name="system.lights" ${s.lights ? "checked" : ""} ${edit ? "" : "disabled"}> Lights on</label>
          <label>Seats <input type="number" name="system.seats" value="${s.seats ?? ""}" placeholder="${f.seats}" min="1" max="40" ${edit ? "" : "disabled"}></label></div>
        <h3>Aboard</h3>
        <ul class="wvx-list">${aboard.length ? aboard.map(p => `<li>${esc(p.n)}, ${esc(p.role)}</li>`).join("") : "<li><i>Nobody. Get in from the Interact window beside its token.</i></li>"}</ul>
        <h3>Mounted guns <span class="wodx-quiet">(on the attack menu of anyone aboard)</span></h3>
        <ul class="wvx-list">${guns.map(item).join("") || "<li><i>None. Drop a weapon here to mount it.</i></li>"}</ul>
        <h3>Cargo</h3>
        <ul class="wvx-list">${cargo.map(item).join("") || "<li><i>Empty. Drop things here to load them.</i></li>"}</ul>
        <h3>Notes</h3>
        <textarea name="system.notes" rows="4" ${edit ? "" : "disabled"}>${esc(String(s.notes ?? "").replace(/<[^>]+>/g, ""))}</textarea>
      </section>`;
      const div = document.createElement("div");
      div.innerHTML = html;
      return div.firstElementChild;
    }

    _replaceHTML(result, content) {
      content.replaceChildren(result);
      result.querySelectorAll("[data-box]").forEach(b => b.addEventListener("click", ev => {
        ev.preventDefault();
        const f = VR.figures(this.document.system, yearNow());
        this.document.update({"system.lost": VR.markTrack(this.document.system.lost, Number(b.dataset.box), f.body?.structure ?? 0)});
      }));
      result.querySelectorAll("[data-open]").forEach(a => a.addEventListener("click", () => this.document.items.get(a.dataset.open)?.sheet?.render(true)));
      result.querySelectorAll("[data-del]").forEach(a => a.addEventListener("click", () => this.document.items.get(a.dataset.del)?.delete()));
      result.querySelector("[data-edit=img]")?.addEventListener("click", () => {
        if ( !this.isEditable ) return;
        new foundry.applications.apps.FilePicker.implementation({type: "image", current: this.document.img, callback: p => this.document.update({img: p})}).render(true);
      });
    }

    async _onDrop(event) {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      if ( data?.type !== "Item" || !this.isEditable ) return super._onDrop?.(event);
      const item = await fromUuid(data.uuid).catch(() => null);
      if ( !item || item.parent?.id === this.document.id ) return null;
      return this.document.createEmbeddedDocuments("Item", [item.toObject()]);
    }
  };
}

export function setupVehicleSheet() {
  CONFIG.Actor.dataModels[VR.VEHICLE_TYPE] = dataModel();
  foundry.documents.collections.Actors.registerSheet(MOD, sheetClass(), {types: [VR.VEHICLE_TYPE], makeDefault: true, label: "WoDX vehicle"});
  // the structure, the burning and the lights show on its tokens (tint and headlights)
  Hooks.on("updateActor", (actor, change) => {
    if ( actor.type === VR.VEHICLE_TYPE && change?.system && ["lost", "burning", "lights", "kind", "built"].some(k => k in change.system) ) setLights(actor).catch(e => console.warn(`${MOD} | vehicle lights`, e));
  });
  Hooks.on("createToken", doc => { if ( doc.actor?.type === VR.VEHICLE_TYPE && game.user.isGM ) setLights(doc.actor).catch(() => null); });
}
