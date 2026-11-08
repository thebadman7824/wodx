/**
 * WoDX Sheets 0.1 — character sheets that follow the era and each line's book (B74).
 *
 * The WoDX Changeling sheet extends the World of Darkness system's own Changeling sheet, so its rolls, dots, health,
 * combat, gear, notes and settings keep working. In a Dark Ages chronicle (or on a sheet set to Dark Ages: Fae) it lays
 * out the Dark Ages: Fae character sheet in the book's order; otherwise it is the system's Changeling 20th sheet.
 * The fae traits live on the actor's flags (wodx-actions.daFae), as WoDX Actions keeps them.
 */
import ChangelingActorSheet from "../../../systems/worldofdarkness/module/actor/template/changeling-actor-sheet.js";
import { isDA as isFaeDA } from "../../wodx-actions/scripts/fae-da.js";
import * as FR from "../../wodx-actions/scripts/fae-da-rules.js";
import * as SR from "./sheet-rules.mjs";

const MOD = "wodx-sheets", ACT = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };

export class WodxChangelingSheet extends ChangelingActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, { classes: ["wod20", "wod-sheet", "changeling", "wodx-sheet"] });
  }
  get isDA() { return isFaeDA(this.actor); }
  get template() { return this.isDA ? `modules/${MOD}/templates/fae-da.hbs` : super.template; }

  async getData() {
    const data = await super.getData();
    if (!this.isDA) return data;
    const a = this.actor, f = a.getFlag(ACT, "daFae") ?? {};
    if (data.actor.system.listdata?.settings) data.actor.system.listdata.settings.haschimericalhealth = false;
    const rows = SR.abilityRows(SR.FAE_DA, a.system.abilities ?? {}, [...a.items]);
    const titles = { talents: "Talents", skills: "Skills", knowledges: "Knowledges" };
    const bg = [...a.items].filter(i => i.type === "Feature" && /background/.test(i.system?.type ?? "")).map(i => ({ id: i.id, name: i.name, dots: SR.dots(i.system?.value) }));
    const other = [...a.items].filter(i => i.type === "Trait" && /othertraits/.test(i.system?.type ?? "")).map(i => ({ id: i.id, name: i.name, dots: SR.dots(i.system?.value) }));
    const m = { perm: n(f.mists?.perm), temp: n(f.mists?.temp ?? f.mists?.perm) }, w = { perm: n(f.weaving?.perm), temp: n(f.weaving?.temp ?? f.weaving?.perm) };
    const imb = FR.imbalance(m.perm, w.perm);
    const fav = FR.COURTS[f.court]?.favored;
    const cap = n(w.perm);
    data.wodx = {
      book: SR.FAE_DA.book,
      agenda: f.agenda ?? "",
      courts: [{ id: "", label: "(choose)" }, ...Object.entries(FR.COURTS).map(([id, c]) => ({ id, label: c.label, sel: id === f.court }))],
      origins: [{ id: "", label: "(choose)" }, ...Object.entries(FR.ORIGINS).map(([id, o]) => ({ id, label: o.label, sel: id === f.origin }))],
      abilityCols: Object.entries(rows).map(([k, list]) => ({ title: titles[k], rows: list.map(r => ({ ...r, dots: SR.dots(r.value) })) })),
      dominions: SR.FAE_DA.dominions.map(([label, id]) => ({ id, label, gloss: FR.DOMINIONS[id].gloss, favored: fav === id, dots: SR.dots(f.dominions?.[id]) })),
      backgrounds: bg, otherTraits: other,
      cantrips: (f.cantrips ?? []).map(c => ({ ...c, dominion: FR.DOMINIONS[c.dominion]?.label ?? c.dominion })),
      cantripNote: cap ? `Weaving ${cap}: up to ${cap} cantrips in each Dominion known.` : "",
      mists: SR.track(m.perm, m.temp), weaving: SR.track(w.perm, w.temp),
      imbalance: imb ? `${imb === "mists" ? "Mists" : "Weaving"} imbalance: ${imb === "mists" ? "cantrips" : "Unleashing"} +1 difficulty (Dark Ages: Fae p. 102).` : "",
      mien: f.origin ? (FR.ORIGINS[f.origin].alwaysMien ? "Firstborn: always in the fae mien." : f.mien ? "In the fae mien." : "In human shape.") : "Choose an Origin.",
      oaths: (f.oaths ?? []).map(o => ({ ...o, kind: FR.OATHS[o.kind]?.label ?? o.kind, active: o.active !== false })),
      echoes: (f.echoes ?? []).map(e => e.trigger), lesser: f.lesser ?? [], greater: f.greater ?? [],
      anyFeature: !!((f.lesser ?? []).length || (f.greater ?? []).length)
    };
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.isDA) return;
    const root = html[0] ?? html;
    const actor = this.actor;
    const setFae = patch => actor.setFlag(ACT, "daFae", foundry.utils.mergeObject(foundry.utils.deepClone(actor.getFlag(ACT, "daFae") ?? {}), patch));
    root.querySelectorAll(".wodx-roll[data-roll]").forEach(el => el.addEventListener("click", ev => {
      ev.preventDefault();
      const fn = game.wodxActions?.[el.dataset.roll];
      if (fn) fn({ actor });
    }));
    root.querySelectorAll(".wodx-open[data-itemid]").forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); actor.items.get(el.dataset.itemid)?.sheet?.render(true); }));
    if (!this.options.editable) return;
    root.querySelectorAll(".wodx-pick[data-wodx]").forEach(el => el.addEventListener("change", () => setFae({ [el.dataset.wodx]: el.value || null })));
    root.querySelectorAll(".wodx-text[data-wodx]").forEach(el => el.addEventListener("change", () => setFae({ [el.dataset.wodx]: String(el.value).slice(0, 200) })));
    // Dominion dots
    root.querySelectorAll(".wodx-dots[data-flag^='dominions.']").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
      ev.preventDefault();
      const id = box.dataset.flag.split(".")[1], f = actor.getFlag(ACT, "daFae") ?? {};
      setFae({ dominions: { [id]: Math.min(5, SR.clickValue(n(f.dominions?.[id]), n(dot.dataset.i))) } });
    })));
    // Mists and Weaving: dots set the rating, boxes the points (never above the rating)
    root.querySelectorAll(".wodx-track[data-flag]").forEach(tr => {
      const key = tr.dataset.flag;
      tr.querySelectorAll(".wodx-dots .wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
        ev.preventDefault();
        const cur = actor.getFlag(ACT, "daFae")?.[key] ?? {};
        const perm = SR.clickValue(n(cur.perm), n(dot.dataset.i));
        setFae({ [key]: { perm, temp: Math.min(perm, n(cur.temp ?? cur.perm)) } });
      }));
      tr.querySelectorAll(".wodx-boxes .wodx-box").forEach(b => b.addEventListener("click", ev => {
        ev.preventDefault();
        const cur = actor.getFlag(ACT, "daFae")?.[key] ?? {};
        setFae({ [key]: { perm: n(cur.perm), temp: Math.min(n(cur.perm), SR.clickValue(n(cur.temp ?? cur.perm), n(b.dataset.i))) } });
      }));
    });
    // An Ability the sheet does not have yet: the first dot adds it (a flat Ability shown, or a secondary-ability Trait)
    root.querySelectorAll(".wodx-dots[data-add-ability]").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", async ev => {
      ev.preventDefault();
      const v = n(dot.dataset.i), flat = box.dataset.flatkey;
      if (flat) return actor.update({ [`system.abilities.${flat}.value`]: v, [`system.abilities.${flat}.isvisible`]: true });
      return actor.createEmbeddedDocuments("Item", [{ name: box.dataset.addAbility, type: "Trait", system: { type: `wod.types.${box.dataset.group}secondability`, value: v, max: 5 } }]);
    })));
  }
}

Hooks.once("init", () => {
  foundry.documents.collections.Actors.registerSheet(MOD, WodxChangelingSheet, { types: ["Changeling"], makeDefault: true, label: "WoDX: follows the era (Dark Ages: Fae, or Changeling 20th)" });
  game.modules.get(MOD).api = { version: "0.1.0", rules: SR, WodxChangelingSheet };
});
