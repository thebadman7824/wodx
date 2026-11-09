/**
 * WoDX Creation: the creation check. Lays a character sheet against a book's creation totals (Attributes,
 * Abilities, Backgrounds, the line's powers, Virtues) and counts the freebies the rest would cost. It only reads:
 * nothing on the sheet changes.
 */
import {esc} from "./actor-data.mjs";
import {TOTALS, checkCreation} from "./totals-rules.mjs";
import {defaultLine} from "../data/creation-totals.mjs";
import {searchBox} from "../../wodx-chronicle/scripts/search.mjs";

const {ApplicationV2} = foundry.applications.api;
const n = v => Math.max(0, Math.trunc(Number(v) || 0));
const GROUP = {physical: ["strength", "dexterity", "stamina"], social: ["charisma", "manipulation", "appearance"], mental: ["perception", "intelligence", "wits"]};
const SECOND = {talent: /talentsecondability/, skill: /skillsecondability/, knowledge: /knowledgesecondability/};

/** What a sheet holds, in the shape checkCreation reads. */
export function totalsView(actor, lineId) {
  const s = actor.system ?? {};
  const items = [...(actor.items ?? [])];
  const cap = TOTALS[lineId]?.abilityCap ?? 3;
  const attributes = Object.fromEntries(Object.entries(GROUP).map(([g, keys]) => [g, keys.reduce((t, k) => t + Math.max(0, n(s.attributes?.[k]?.value) - 1), 0)]));
  const abilities = {talent: {dots: 0, aboveCap: 0}, skill: {dots: 0, aboveCap: 0}, knowledge: {dots: 0, aboveCap: 0}};
  const addAb = (g, v) => { if ( !abilities[g] ) return; abilities[g].dots += Math.min(v, cap); abilities[g].aboveCap += Math.max(0, v - cap); };
  for ( const a of Object.values(s.abilities ?? {}) ) if ( a && typeof a === "object" ) addAb(a.type, n(a.value));
  for ( const i of items ) for ( const [g, re] of Object.entries(SECOND) ) if ( i.type === "Trait" && re.test(String(i.system?.type ?? "")) ) addAb(g, n(i.system?.value));
  const sum = pred => items.filter(pred).reduce((t, i) => t + n(i.system?.value), 0);
  const typed = re => i => re.test(String(i.system?.type ?? ""));
  const backgrounds = sum(i => i.type === "Feature" && i.system?.type === "wod.types.background");
  const powers = {
    discipline: sum(i => i.type === "Power" && i.system?.type === "wod.types.discipline"),
    gift: items.filter(i => i.type === "Power" && typed(/gift/)(i)).length,
    sphere: Object.values(s.spheres ?? {}).reduce((t, x) => t + n(x?.value), 0),
    arcanoi: sum(i => i.type === "Power" && typed(/arcanoi/)(i)),
    passion: sum(i => i.type === "Trait" && i.system?.type === "wod.types.passion"),
    fetter: sum(i => i.type === "Trait" && i.system?.type === "wod.types.fetter"),
    art: sum(i => i.type === "Power" && typed(/\.art$/)(i)),
    realm: sum(i => i.type === "Realm"),
    lore: sum(i => i.type === "Power" && typed(/lore/)(i)),
    hekau: sum(i => i.type === "Power" && typed(/hekau/)(i))
  };
  // Hand counts where the system keeps no such Trait (Pillars, Dominions, edges)
  for ( const k of ["pillar", "dominion", "edge"] ) powers[k] = null;
  let virtues = null;
  const v = s.advantages?.virtues;
  if ( v ) {
    const used = ["conscience", "conviction", "selfcontrol", "instinct", "courage"].filter(k => n(v[k]?.permanent) > 0);
    const total = used.reduce((t, k) => t + n(v[k]?.permanent), 0);
    // Each Virtue in use starts with 1 free dot; V20's Conviction and Instinct start at 0
    const free = used.filter(k => !(lineId === "v20" && ["conviction", "instinct"].includes(k))).length;
    virtues = Math.max(0, total - free);
  }
  return {attributes, abilities, backgrounds, powers, virtues};
}

const COST_LABEL = {road: "Humanity or Road", po: "P'o", hun: "Hun", chi: "Chi Virtues"};
/** The costed Traits the check does not count (Willpower, Rage, Arete and the like). */
function extras(L) {
  const counted = new Set(["attribute", "ability", "background", "virtue", ...(L.powers ?? []).map(p => p.key)]);
  return Object.keys(L.costs).filter(k => !counted.has(k)).map(k => COST_LABEL[k] ?? k[0].toUpperCase() + k.slice(1));
}

/** The book to start on: the one a WoDX change of state built the sheet by, else the sheet type's book for the era. */
export function lineFor(actor) {
  const f = actor.flags?.["wodx-creation"] ?? {};
  if ( f.awakening ) return "m20";
  if ( f.wraith ) return "wr20";
  return defaultLine(actor.type, {variant: actor.system?.settings?.variant, eraId: eraId()});
}

const eraId = () => game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? "";

export class CreationCheckApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "wodx-creation-check",
    classes: ["wodx", "wodx-creation-check"],
    window: {title: "Creation check", icon: "fa-solid fa-list-check", resizable: true},
    position: {width: 620, height: "auto"},
    actions: {}
  };

  static #instance;
  static open(actor) {
    this.#instance ??= new CreationCheckApp();
    if ( actor ) { this.#instance.actorId = actor.id; this.#instance.lineId = null; }
    return this.#instance.render({force: true});
  }

  actorId = null;
  lineId = null;

  candidates() {
    return game.actors.filter(a => a.isOwner && a.type !== "Group" && a.system?.attributes).sort((a, b) => a.name.localeCompare(b.name));
  }

  async _renderHTML() {
    const all = this.candidates();
    const actor = game.actors.get(this.actorId) ?? globalThis.canvas?.tokens?.controlled?.[0]?.actor ?? all[0] ?? null;
    const div = document.createElement("div");
    div.className = "wodx-body";
    if ( !actor ) { div.innerHTML = `<p class="wodx-quiet">There is no character sheet to check.</p>`; return div; }
    this.actorId = actor.id;
    const lineId = this.lineId && TOTALS[this.lineId] ? this.lineId : lineFor(actor);
    this.lineId = lineId;
    const res = checkCreation(totalsView(actor, lineId), lineId);
    const L = res.line;
    const cell = r => r.have === null ? "?" : r.have;
    const state = r => r.have === null ? "" : r.over ? `<b>${r.over} over</b>${r.cost ? `, ${r.cost} freebies` : ""}` : r.under ? `${r.under} unspent` : "exact";
    const rows = res.rows.map(r => `<tr><td>${esc(r.label)}</td><td>${r.allowed}</td><td>${cell(r)}</td><td>${state(r)}${r.note ? `<br><span class="wodx-quiet">${esc(r.note)}</span>` : ""}</td></tr>`).join("");
    const opt = (v, l, sel) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(l)}</option>`;
    const fb = res.freebies;
    div.innerHTML = `
      <div class="wodx-top">
        <div class="form-group"><label>Character</label>${searchBox("select[name=actor]", "Search characters…", "Search characters")}
          <select name="actor">${all.map(a => opt(a.id, `${a.name} (${a.type})`, actor.id)).join("")}</select></div>
        <div class="form-group"><label>Book</label>${searchBox("select[name=line]", "Search books…", "Search books")}
          <select name="line">${Object.entries(TOTALS).map(([k, t]) => opt(k, t.label, lineId)).join("")}</select></div>
      </div>
      <div class="wodx-scroll">
        <table class="wodx-table wodx-check"><thead><tr><th>Step</th><th>Book</th><th>Sheet</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <p><b>Freebies:</b> ${fb.used} of ${fb.allowed}${fb.flaws ? `, plus up to ${fb.flaws} from Flaws` : ""}.
          ${res.ok ? (fb.left >= 0 ? `${fb.left} left.` : `${-fb.left} must come from Flaws.`) : `<b>${fb.used - fb.allowed - fb.flaws} too many.</b>`}</p>
        <p class="wodx-quiet">Freebies spent on ${esc(extras(L).join(", ") || "other Traits")} are not counted here. Starting values: ${esc(L.start.join("; "))}.</p>
        <p class="wodx-quiet">${esc(L.short)}: ${esc(L.ref)}; freebie costs ${esc(L.costRef)}.${L.rebirth ? " Mummy counts both stages: the mortal life and the Rebirth's extra dots." : ""}</p>
      </div>`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender() {
    const el = this.element;
    el.querySelector("select[name=actor]")?.addEventListener("change", e => { this.actorId = e.target.value; this.lineId = null; this.render(); });
    el.querySelector("select[name=line]")?.addEventListener("change", e => { this.lineId = e.target.value; this.render(); });
  }
}
