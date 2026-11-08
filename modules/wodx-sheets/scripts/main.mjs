/**
 * WoDX Sheets 0.2 — character sheets that follow the era and each line's book (B74).
 *
 * Each WoDX sheet extends the World of Darkness system's own sheet for its actor type and keeps every tab the system
 * draws; only the Core tab (and, for the fae, the Dreaming tab) is replaced by the book's sheet, laid out from the
 * definitions in sheet-rules.mjs. The system's listeners bind to the same markup, so rolls, Attribute and Ability dots,
 * health, combat, gear, notes and settings keep working. Outside the sheet's era the system's own layout is shown.
 */
import ChangelingActorSheet from "../../../systems/worldofdarkness/module/actor/template/changeling-actor-sheet.js";
import MageActorSheet from "../../../systems/worldofdarkness/module/actor/template/mage-actor-sheet.js";
import HunterActorSheet from "../../../systems/worldofdarkness/module/actor/template/hunter-actor-sheet.js";
import WerewolfActorSheet from "../../../systems/worldofdarkness/module/actor/template/werewolf-actor-sheet.js";
import VampireActorSheet from "../../../systems/worldofdarkness/module/actor/template/vampire-actor-sheet.js";
import MortalActorSheet from "../../../systems/worldofdarkness/module/actor/template/mortal-actor-sheet.js";
import { isDA as isFaeDA } from "../../wodx-actions/scripts/fae-da.js";
import { isDA as isMageDA } from "../../wodx-actions/scripts/mage-da.js";
import * as FR from "../../wodx-actions/scripts/fae-da-rules.js";
import * as MR from "../../wodx-actions/scripts/mage-da-rules.js";
import * as HR from "../../wodx-actions/scripts/hunter-rules.js";
import * as SR from "./sheet-rules.mjs";

const MOD = "wodx-sheets", ACT = "wodx-actions";
const n = v => { const x = parseInt(v); return Number.isFinite(x) ? x : 0; };
const era = () => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id ?? null; } catch (e) { return null; } };
const inDA = () => ["dark-ages", "long-night"].includes(era());
const loc = s => { const t = game.i18n.localize(String(s ?? "")); return t === s && /^wod\./.test(String(s)) ? String(s).split(".").pop() : t; };
const profile = a => game.wodxActions?.getKind?.(a) ?? null;

/** Which WoDX sheet an actor gets, or null for the system's own layout. */
export function sheetFor(actor) {
  switch (actor?.type) {
    case "Changeling": return isFaeDA(actor) ? "faeDA" : null;
    case "Mage": return isMageDA(actor) ? "mageDA" : null;
    case "Hunter": return (actor.getFlag(ACT, "inquisitor") || inDA()) ? "inqDA" : null;
    case "Werewolf": return inDA() ? "werewolfDA" : null;
    case "Vampire": return inDA() ? "kindredDA" : null;
    case "Mortal": return inDA() && profile(actor) === "ghoul" ? "ghoulDA" : null;
    default: return null;
  }
}

/* -------------------------------------------------------------- */
/*  Blocks                                                         */
/* -------------------------------------------------------------- */

const itemsOf = (a, test) => [...a.items].filter(test).sort((x, y) => x.name.localeCompare(y.name));
const itemRows = (list, withDots = true) => list.map(i => ({ id: i.id, name: i.name, dots: withDots ? SR.dots(i.system?.value, Math.max(5, n(i.system?.max) || 5)) : null }));
const isType = re => i => re.test(String(i.system?.type ?? ""));
const flagObj = (a, k) => a.getFlag(ACT, k) ?? {};

function block(key, a) {
  const fae = flagObj(a, "daFae"), mage = flagObj(a, "daMage"), inq = flagObj(a, "inquisitor");
  const adv = a.system.advantages ?? {};
  switch (key) {
    case "backgrounds": return { kind: "items", title: "Backgrounds", rows: itemRows(itemsOf(a, i => i.type === "Feature" && isType(/background/)(i))), empty: "None yet: add them as Features (Background)." };
    case "otherTraits": return { kind: "items", title: "Other Traits", rows: itemRows(itemsOf(a, i => i.type === "Trait" && isType(/othertraits/)(i))), empty: "—" };
    case "meritsFlaws": return { kind: "items", title: a.type === "Werewolf" || a.type === "Hunter" ? "Blessings and Curses" : "Merits and Flaws",
      rows: itemRows(itemsOf(a, i => i.type === "Feature" && isType(/merit|flaw/)(i)), false).map(r => ({ ...r, name: `${r.name}${/flaw/.test(a.items.get(r.id)?.system?.type ?? "") ? " (Flaw)" : ""}` })), empty: "None." };
    case "blessingsCurses": return { ...block("meritsFlaws", a), title: "Blessings and Curses" };
    case "willpower": return { kind: "stat", key: "willpower", stat: adv.willpower };
    case "rage": return { kind: "stat", key: "rage", stat: adv.rage };
    case "gnosis": return { kind: "stat", key: "gnosis", stat: adv.gnosis };
    case "bloodpool": return { kind: "stat", key: "bloodpool", stat: adv.bloodpool };
    case "road": return { kind: "stat", key: "path", stat: adv.path };
    case "conviction": return { kind: "stat", key: "conviction", stat: adv.conviction };
    case "health": return { kind: "health" };
    case "experience": return { kind: "experience" };
    case "weakness": return { kind: "text", title: "Weakness", value: a.system.weakness || "—" };
    case "derangements": return { kind: "list", title: "Derangements", lines: String(a.system.derangement ?? "").split(/\n+/).filter(Boolean).map(t => ({ text: t })), empty: "None (the Bio tab)." };
    case "disciplines": return { kind: "items", title: "Disciplines", roll: "useDiscipline", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.discipline$/)(i))), empty: "None yet." };
    case "rituals": return { kind: "items", title: "Rituals", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/ritual/)(i)), false), empty: "None." };
    case "paths": return { kind: "items", title: "Paths", rows: itemRows(itemsOf(a, i => i.type === "Power" && isType(/disciplinepath$/)(i))), empty: "None." };
    case "virtues": {
      const v = adv.virtues ?? {};
      const lab = (o, d) => { const l = loc(o?.label); return l && !/^(conscience|selfcontrol|courage)$/.test(l) ? l : d; };
      const rows = [["conscience", lab(v.conscience, "Conscience")], ["selfcontrol", lab(v.selfcontrol, "Self-Control")], ["courage", lab(v.courage, "Courage")]]
        .map(([k, label]) => ({ label, path: `system.advantages.virtues.${k}.permanent`, max: 5, dots: SR.dots(v[k]?.permanent) }));
      return { kind: "dots", title: "Virtues", roll: a.type === "Hunter" ? "hunterVirtue" : null, rows };
    }
    case "superiorVirtues": return { kind: "dots", title: "Superior Virtues", roll: "hunterPower",
      rows: [["Wisdom", "wisdom"], ["Faith", "faith"], ["Zeal", "zeal"]].map(([label, k]) => ({ label, path: `flag:${ACT}.inquisitor.${k}`, max: 5, dots: SR.dots(inq[k]) })),
      note: "Each at most its Virtue (Dark Ages: Inquisitor p. 157)." };
    case "piety": { const p = inq.piety ?? (n(adv.virtues?.conscience?.permanent) + n(adv.virtues?.selfcontrol?.permanent));
      return { kind: "track", title: "Piety", permPath: `flag:${ACT}.inquisitor.piety`, cells: SR.track(p, 0) }; }
    case "callous": { const c = n(adv.conviction?.permanent ?? adv.conviction?.temporary), p = inq.piety ?? (n(adv.virtues?.conscience?.permanent) + n(adv.virtues?.selfcontrol?.permanent));
      return { kind: "text", title: "Callous?", value: c > n(p) ? "Yes: Conviction above Piety" : "No", note: "Dark Ages: Inquisitor p. 162" }; }
    case "holyArt": return { kind: "items", title: "Holy Art", roll: "hunterPower", rows: itemRows(itemsOf(a, i => i.type === "Power")), empty: "None yet: Blessings and Holy Art paths are Powers." };
    case "gifts": case "gifts2": {
      const all = itemRows(itemsOf(a, i => i.type === "Power" && isType(/types\.gift$/)(i)), false);
      const half = Math.ceil(all.length / 2);
      return { kind: "items", title: "Gifts", roll: key === "gifts" ? "useGift" : null, rows: key === "gifts" ? all.slice(0, half) : all.slice(half), empty: key === "gifts" ? "None yet." : "" };
    }
    /* Dark Ages: Fae */
    case "dominions": { const fav = FR.COURTS[fae.court]?.favored;
      return { kind: "dots", title: "Dominions", rows: [["Day", "day"], ["Dawn", "dawn"], ["Dusk", "dusk"], ["Night", "night"]].map(([label, id]) => ({ label, path: `flag:${ACT}.daFae.dominions.${id}`, max: 5,
        dots: SR.dots(fae.dominions?.[id]), roll: "daCantrip", strong: fav === id, hint: `${FR.DOMINIONS[id].gloss}${fav === id ? " (the Court's Dominion)" : ""}` })) }; }
    case "cantrips": return { kind: "list", title: "Cantrips", lines: (fae.cantrips ?? []).map(c => ({ bold: c.name, text: `${FR.DOMINIONS[c.dominion]?.label ?? c.dominion} ${c.level}` })), empty: "None yet.",
      roll: "daCantrip", rollLabel: "Cast a cantrip", warn: n(fae.weaving?.perm) ? "" : "" };
    case "mistsWeaving": return null; // two tracks, see expand()
    case "oaths": return { kind: "list", title: "Oaths", lines: (fae.oaths ?? []).map(o => ({ bold: `${FR.OATHS[o.kind]?.label ?? o.kind} ${o.rating}`, text: o.terms, dim: o.active === false })), empty: "None.", roll: "daOath", rollLabel: "Keep an oath" };
    case "echoes": return { kind: "list", title: "Echoes", lines: (fae.echoes ?? []).map(e => ({ text: e.trigger })), empty: "None.", roll: "daEcho", rollLabel: "Face an Echo" };
    case "features": return { kind: "list", title: "Features", lines: [...(fae.greater ?? []).map(t => ({ bold: "Greater:", text: t })), ...(fae.lesser ?? []).map(t => ({ text: t }))], empty: "None.", roll: "daMien", rollLabel: "Take or drop the mien" };
    /* Dark Ages: Mage */
    case "foundation": { const F = MR.FELLOWSHIPS[mage.fellowship];
      return { kind: "dots", title: F ? `Foundation: ${F.foundation}` : "Foundation", roll: "daCast", rows: [{ label: F?.foundation ?? "Foundation", path: `flag:${ACT}.daMage.foundation`, max: 5, dots: SR.dots(mage.foundation), roll: "daCast" }],
        note: `Aura: ${MR.auraOf(mage.foundation)}${F ? ` (${F.label})` : ""}` }; }
    case "pillars": { const ps = MR.pillarsOf(mage.fellowship);
      return { kind: "dots", title: "Pillars", rows: ps.map(p => ({ label: p.label, path: `flag:${ACT}.daMage.pillars.${p.key}`, max: 5, dots: SR.dots(mage.pillars?.[p.key]), roll: "daCast", hint: p.domain })),
        note: ps.length ? "" : "Choose a fellowship first." }; }
    case "quintessence": return { kind: "stat", key: "quintessence", stat: a.system.quintessence };
    case "backlash": { const tw = mage.twilight ?? {}, br = mage.brandings ?? [];
      return { kind: "list", title: "Backlash: Branding and Twilight", lines: [{ bold: "Twilight", text: `${n(tw.temp)} temporary, ${n(tw.perm)} permanent` }, ...br.map(b => ({ bold: `Brand ${b.level}`, text: b.text ?? "" }))], empty: "", roll: "daMage", rollLabel: "Fellowship and Pillars" }; }
    default: return null;
  }
}
/** A block key may stand for more than one block (Mists and Weaving). */
function expand(key, a) {
  if (key === "mistsWeaving") {
    const f = flagObj(a, "daFae"), m = f.mists ?? {}, w = f.weaving ?? {}, imb = FR.imbalance(n(m.perm), n(w.perm));
    return [{ kind: "track", title: "Mists", roll: "daMists", hint: "The Mists: hide, cloak, Kenning", permPath: `flag:${ACT}.daFae.mists.perm`, tempPath: `flag:${ACT}.daFae.mists.temp`, cells: SR.track(m.perm, m.temp ?? m.perm) },
      { kind: "track", title: "Weaving", roll: "daUnleash", hint: "Unleash a Dominion", permPath: `flag:${ACT}.daFae.weaving.perm`, tempPath: `flag:${ACT}.daFae.weaving.temp`, cells: SR.track(w.perm, w.temp ?? w.perm),
        warn: imb ? `${imb === "mists" ? "Mists" : "Weaving"} imbalance: ${imb === "mists" ? "cantrips" : "Unleashing"} +1 difficulty (Dark Ages: Fae p. 102).` : "",
        note: f.origin ? (FR.ORIGINS[f.origin].alwaysMien ? "Firstborn: always in the fae mien." : f.mien ? "In the fae mien." : "In human shape.") : "Choose an Origin." }];
  }
  const b = block(key, a);
  return b ? [b] : [];
}

const BUTTONS = {
  daFae: ["fa-scroll", "Edit Origin, Court, cantrips, Features, Echoes and Oaths"], daCounter: ["fa-shield-alt", "Counter"], daRest: ["fa-tree", "Rest in a faerie realm"],
  daMage: ["fa-scroll", "Fellowship and Pillars"], daQuintessence: ["fa-gem", "Gather Quintessence"],
  hunterSheet: ["fa-scroll", "Order, Superior Virtues, Piety"], hunterPower: ["fa-cross", "A Blessing"], prayer: ["fa-praying-hands", "Prayer"],
  rageRoll: ["fa-fire", "Rage"], useGift: ["fa-paw", "Use a Gift"], shiftForm: ["fa-exchange-alt", "Change form"],
  useDiscipline: ["fa-tint", "Use a Discipline"], frenzy: ["fa-angry", "Frenzy check"], feed: ["fa-glass-whiskey", "Feed"], ghoulBlood: ["fa-tint", "Vitae"]
};

function header(def, a) {
  const choices = {
    courts: () => Object.entries(FR.COURTS).map(([id, c]) => ({ id, label: c.label })), origins: () => Object.entries(FR.ORIGINS).map(([id, o]) => ({ id, label: o.label })),
    fellowships: () => Object.entries(MR.FELLOWSHIPS).map(([id, f]) => ({ id, label: f.label })), orders: () => Object.entries(HR.ORDERS).map(([id, o]) => ({ id, label: o.label }))
  };
  const computed = {
    clan: () => { const s = a.system; return s.clan === "custom" ? (s.custom?.clan || "") : loc(s.clan); },
    domitor: () => { const l = a.getFlag("wodx-creation", "lineage") ?? {}; return game.actors.get(l.domitor)?.name ?? (l.domitor || "—"); },
    domitorClan: () => { const l = a.getFlag("wodx-creation", "lineage") ?? {}; const d = game.actors.get(l.domitor); return d ? (d.system.clan === "custom" ? d.system.custom?.clan : loc(d.system.clan)) : "—"; }
  };
  return def.header.map(col => col.map(f => {
    const v = foundry.utils.getProperty(a, SR.propPath(f.path ?? ""));
    if (f.kind === "flagSelect") return { ...f, kind: "select", options: [{ id: "", label: "(choose)" }, ...choices[f.options]().map(o => ({ ...o, sel: o.id === v }))] };
    if (f.kind === "system" || f.kind === "flagText") return { ...f, kind: "input", value: v ?? "" };
    if (f.kind === "show") return { ...f, value: loc(v) || "—", hint: "Chosen on the Bio tab" };
    if (f.kind === "computed") return { ...f, value: computed[f.key]?.() || "—" };
    return { ...f, value: v ?? "" };
  }));
}

/** Everything the book's layout needs, from the actor. */
export function viewFor(id, a) {
  const def = SR.SHEETS[id];
  const rows = SR.abilityRows(def, a.system.abilities ?? {}, [...a.items]);
  const titles = { talents: "Talents", skills: "Skills", knowledges: "Knowledges" };
  const cols = list => list.map(c => c.flatMap(k => expand(k, a)));
  return {
    id, book: def.book, sheetPage: def.sheetPage, title: def.title,
    header: header(def, a),
    abilityCols: Object.entries(rows).map(([k, list]) => ({ title: titles[k], rows: list.map(r => ({ ...r, dots: SR.dots(r.value) })) })),
    abilityNote: id === "werewolfDA" ? "Leadership is a Skill in the Dark Ages (Dark Ages: Werewolf p. 79); the printed sheet also lists it under Talents." : "",
    advantages: cols(def.advantages), lower: cols(def.lower), page2: cols(def.page2 ?? []),
    page2Title: id === "faeDA" ? "Oaths, Echoes and Features" : "The second page", page2InCore: !def.page2Tab,
    buttons: (def.buttons ?? []).filter(b => BUTTONS[b]).map(b => ({ api: b, icon: BUTTONS[b][0], label: BUTTONS[b][1] }))
  };
}

/* -------------------------------------------------------------- */
/*  The sheet classes                                              */
/* -------------------------------------------------------------- */

function wodxSheet(Base, type) {
  return class extends Base {
    static get defaultOptions() { return foundry.utils.mergeObject(super.defaultOptions, { classes: [...(super.defaultOptions.classes ?? []), "wodx-sheet"] }); }
    get wodxId() { return sheetFor(this.actor); }
    get isDA() { return !!this.wodxId; }
    async getData() {
      const data = await super.getData();
      const id = this.wodxId;
      if (!id) return data;
      if (id === "faeDA" && data.actor.system.listdata?.settings) data.actor.system.listdata.settings.haschimericalhealth = false;
      data.wodx = viewFor(id, this.actor);
      return data;
    }
    async _renderInner(data) {
      const html = await super._renderInner(data);
      const id = this.wodxId;
      if (!id) return html;
      const el = html.find ? html : $(html);
      const core = el.find(".tab.core");
      if (core.length) core.html(await foundry.applications.handlebars.renderTemplate(`modules/${MOD}/templates/core.hbs`, data));
      const p2 = SR.SHEETS[id].page2Tab;
      if (p2) el.find(`.tab.${p2}`).html(await foundry.applications.handlebars.renderTemplate(`modules/${MOD}/templates/page2-tab.hbs`, data));
      el.find(".sheet-body > .sheet-headline").first().text(SR.SHEETS[id].title);
      el.addClass(`wodx-${id}`);
      return html;
    }
    activateListeners(html) {
      super.activateListeners(html);
      if (this.wodxId) listeners(this, html[0] ?? html);
    }
  };
}

function listeners(sheet, root) {
  const actor = sheet.actor;
  const get = p => foundry.utils.getProperty(actor, SR.propPath(p));
  const set = (p, v) => actor.update({ [SR.propPath(p)]: v });
  root.querySelectorAll(".wodx-book .wodx-roll[data-roll], .wodx-actions-row .wodx-roll[data-roll], .wodx-page2 .wodx-roll[data-roll]").forEach(el => el.addEventListener("click", ev => {
    ev.preventDefault();
    const fn = game.wodxActions?.[el.dataset.roll];
    if (fn) fn({ actor });
  }));
  root.querySelectorAll(".wodx-open[data-itemid]").forEach(el => el.addEventListener("click", ev => { ev.preventDefault(); actor.items.get(el.dataset.itemid)?.sheet?.render(true); }));
  if (!sheet.options.editable) return;
  root.querySelectorAll(".wodx-pick[data-set]").forEach(el => el.addEventListener("change", () => set(el.dataset.set, el.value || null)));
  root.querySelectorAll(".wodx-text[data-set]").forEach(el => el.addEventListener("change", () => set(el.dataset.set, el.dataset.number ? n(el.value) : String(el.value).slice(0, 200))));
  root.querySelectorAll(".wodx-dots[data-set]").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
    ev.preventDefault();
    set(box.dataset.set, Math.min(n(box.dataset.max) || 5, SR.clickValue(n(get(box.dataset.set)), n(dot.dataset.i))));
  })));
  root.querySelectorAll(".wodx-track").forEach(tr => {
    const pp = tr.dataset.perm, tp = tr.dataset.temp;
    tr.querySelectorAll(".wodx-dots .wodx-dot").forEach(dot => dot.addEventListener("click", ev => {
      ev.preventDefault();
      const perm = SR.clickValue(n(get(pp)), n(dot.dataset.i));
      const upd = { [SR.propPath(pp)]: perm };
      if (tp) upd[SR.propPath(tp)] = Math.min(perm, n(get(tp) ?? get(pp)));
      actor.update(upd);
    }));
    tr.querySelectorAll(".wodx-boxes .wodx-box").forEach(b => b.addEventListener("click", ev => {
      ev.preventDefault();
      const cur = get(tp) ?? get(pp);
      set(tp, Math.min(pp ? n(get(pp)) : 10, SR.clickValue(n(cur), n(b.dataset.i))));
    }));
  });
  root.querySelectorAll(".wodx-dots[data-add-ability]").forEach(box => box.querySelectorAll(".wodx-dot").forEach(dot => dot.addEventListener("click", async ev => {
    ev.preventDefault();
    const v = n(dot.dataset.i), flat = box.dataset.flatkey;
    if (flat) return actor.update({ [`system.abilities.${flat}.value`]: v, [`system.abilities.${flat}.isvisible`]: true });
    return actor.createEmbeddedDocuments("Item", [{ name: box.dataset.addAbility, type: "Trait", system: { type: `wod.types.${box.dataset.group}secondability`, value: v, max: 5 } }]);
  })));
}

export const WodxChangelingSheet = wodxSheet(ChangelingActorSheet, "Changeling");
export const WodxMageSheet = wodxSheet(MageActorSheet, "Mage");
export const WodxHunterSheet = wodxSheet(HunterActorSheet, "Hunter");
export const WodxWerewolfSheet = wodxSheet(WerewolfActorSheet, "Werewolf");
export const WodxVampireSheet = wodxSheet(VampireActorSheet, "Vampire");
export const WodxMortalSheet = wodxSheet(MortalActorSheet, "Mortal");
for (const [k, c] of Object.entries({ WodxChangelingSheet, WodxMageSheet, WodxHunterSheet, WodxWerewolfSheet, WodxVampireSheet, WodxMortalSheet })) Object.defineProperty(c, "name", { value: k });

const LABELS = {
  Changeling: "WoDX: follows the era (Dark Ages: Fae, or the system's Changeling 20th)", Mage: "WoDX: follows the era (Dark Ages: Mage, or the system's Mage 20th)",
  Hunter: "WoDX: follows the era (Dark Ages: Inquisitor, or the system's Hunter)", Werewolf: "WoDX: follows the era (Dark Ages: Werewolf, or the system's W20)",
  Vampire: "WoDX: follows the era (V20 Dark Ages, or the system's V20)", Mortal: "WoDX: follows the era (a Dark Ages ghoul, or the system's Mortal)"
};

Hooks.once("init", async () => {
  const reg = foundry.documents.collections.Actors;
  for (const [type, cls] of [["Changeling", WodxChangelingSheet], ["Mage", WodxMageSheet], ["Hunter", WodxHunterSheet], ["Werewolf", WodxWerewolfSheet], ["Vampire", WodxVampireSheet], ["Mortal", WodxMortalSheet]])
    reg.registerSheet(MOD, cls, { types: [type], makeDefault: true, label: LABELS[type] });
  const tpl = foundry.applications.handlebars;
  const block = await tpl.getTemplate(`modules/${MOD}/templates/block.hbs`);
  const page2 = await tpl.getTemplate(`modules/${MOD}/templates/page2.hbs`);
  Handlebars.registerPartial("wodxBlock", block);
  Handlebars.registerPartial("wodxPage2", page2);
  game.modules.get(MOD).api = { version: "0.2.0", rules: SR, sheetFor, viewFor };
});
