/**
 * WoDX Library: the Wraith kit for the wonders registry (B3720-B3723). No Foundry calls here.
 *
 * Ben's pick on the Item Crafting Desk: soulforged relics and Artifacts stay with the soulforging build (notes gap g22,
 * B3553) but are made through this shared engine. Anything that comes out of a forge is an Artifact, and so is a relic
 * reworked to serve the dead (Wraith 20th book p. 44, pdf 109). Arms, armour and oboli are gear and money, so they
 * stay in WoDX Actions' soulforge window, which hands Artifacts and relics on to this kit.
 *
 * The goal, difficulty and Pathos come from WoDX Actions soulforge-rules.js, so the forge window and this table never
 * disagree. As with the Gnosis for a fetish, the soulfire's Pathos and an Artificer's pledged Corpus level are paid
 * when the long task ends (B3721), so a request the Storyteller turns down costs nothing.
 *
 * B6100-B6109: the named Artifacts of Wraith 20th pp. 425-431 (data/wonders-wraith.mjs) join the two open rows. Each is
 * an Artifact at the forge with a goal set by its level (2 + 2 a level, house), and the finished item carries its
 * powers for the Use window: the Pathos it holds, what a use costs, the look on the map. Skin Artifacts need a slain
 * plasmic; Spectre Artifacts are made only by Spectres, who feed the soulfire with Angst (house).
 */
import * as SF from "../../wodx-actions/scripts/soulforge-rules.js";
import * as D from "../data/wonders-wraith.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const WR20 = "Wraith 20th";

/** product: the soulforge-rules PRODUCTS key that sets the goal and the item. */
export const WRAITH_WONDERS = [
  {key: "soulforged-artifact", name: "A soulforged Artifact", line: "wraith", kind: "artifact", product: "artifact", house: true,
    spirit: "", does: "Something made at the forges from the plasm of a soul: a ring, a lock, a tool, a beam. The Storyteller says what it does in the Underworld.", book: WR20, pdf: 109, page: 44},
  {key: "reworked-relic", name: "A reworked relic", line: "wraith", kind: "artifact", product: "relic", house: true,
    spirit: "", does: "A relic from the Skinlands reworked at the forges so it serves the dead, such as a ghost pistol made to fire Underworld rounds. It counts as an Artifact.", book: WR20, pdf: 109, page: 44}
];
/** The named Artifacts, as table rows: a forge product, and what the finished thing does (B6100). */
export const NAMED = D.ROWS.map(r => ({...r, product: r.fromRelic ? "relic" : "artifact", house: true, spirit: ""}));
const ALL = [...WRAITH_WONDERS, ...NAMED];
const BY = Object.fromEntries(ALL.map(w => [w.key, w]));
const KIND_LABEL = {forge: "Artifact", skin: "Skin Artifact", spectre: "Spectre Artifact", relic: "souled relic"};

/** A Spectre's sheet: a wraith whose variant names a Spectre or the Shadow (as WoDX Actions' profiles read it). */
export function spectreOf(a = {}) {
  const v = a.system?.settings?.variant ?? a.system?.variant ?? "";
  const txt = typeof v === "string" ? v : Object.values(v ?? {}).filter(x => typeof x === "string").join(" ");
  return /spectre|shadow/i.test(txt) || !!a.flags?.["wodx-actions"]?.spectre;
}
/** The trait a maker burns in the soulfire: Pathos, or a Spectre's Angst (house, B6103). */
export const fuelOf = m => (m?.kind === "spectre" ? {path: D.ANGST, name: "Angst"} : {path: D.PATHOS, name: "Pathos"});

/** Does the sheet name the Artificers' Guild (a feature, a background, a note)? The forge window's own test. */
export const artificerOf = (a = {}) => (a.items ?? []).some(i => /artificer/i.test(String(i?.name ?? ""))) || /artificer/i.test(String(a.system?.bio?.guild ?? a.system?.guild ?? ""));

function craftsOf(a = {}) {
  const v = (a.system?.abilities?.craft ?? a.system?.abilities?.crafts)?.value;
  if ( v !== undefined ) return n(v);
  return n((a.items ?? []).find(i => i?.type === "Ability" && /^crafts?$/i.test(String(i?.name)))?.system?.value);
}

/** The soulforge plan for a row: source is the Corpus used; o.artificer (the window's Guild box) wins over the sheet. */
export function planOf(w, m = {}, o = {}) {
  const artificer = o.artificer === undefined ? !!m.artificer : !!o.artificer;
  const source = w?.product === "relic" ? "relic" : (SF.SOURCES[o.source] ? o.source : "soul");
  const pl = SF.plan({product: w?.product, source, artificer, year: n(m.year) || null, dexterity: m.dexterity, crafts: m.crafts});
  if ( !pl.ok || !w?.level ) return pl;
  // B6101: a named Artifact's goal follows its level; a re-forged obolus still makes it harder
  const goal = D.goalFor(w.level) + (pl.goal - SF.PRODUCTS[w.product].goal);
  return {...pl, goal, pathos: SF.soulfireCost(goal, n(m.year) || null)};
}

export const wraithKit = {
  title: "Wraith",
  noun: "a soulforged Artifact or reworked relic",
  setting: "craftWraith",
  settingName: "Soulforging Artifacts and relics (Wraith)",
  settingHint: "Wraiths soulforge Artifacts and rework relics from the crafting table as long tasks: Dexterity + Crafts a week, the soulfire's Pathos paid when the work ends. Arms, armour and oboli stay in the soulforge window.",
  settingDefault: true,
  ref: "Wraith 20th (book pp. 42-45, pdf 107-110): Corpus is heated over soulfire and worked into shape at the forges. Anything that comes out of a forge is an Artifact, and so is a relic reworked to serve the dead. The dice, time and Pathos are WoDX's own (house).",
  rows: () => WRAITH_WONDERS,
  row: key => BY[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const s = a.system ?? {}, adv = s.advantages ?? {};
    return {profile: ctx.profile ?? "mortal", spectre: spectreOf(a), artificer: artificerOf(a), pathos: n(adv.pathos?.temporary), angst: n(adv.angst?.temporary), corpus: n(adv.corpus?.max),
      willpower: n(adv.willpower?.permanent), dexterity: n(s.attributes?.dexterity?.value), crafts: craftsOf(a), year: n(ctx.year)};
  },
  makerOf: f => ({...f, kind: f?.spectre && ["wraith", "spirit"].includes(f?.profile) ? "spectre" : f?.profile === "wraith" ? "wraith" : null}),
  listFor: m => (m?.kind === "spectre" ? ALL : m?.kind === "wraith" ? ALL.filter(w => w.kind !== "spectre") : []),

  blockers(w, m, o = {}) {
    if ( !w ) return ["no such item"];
    if ( m?.kind !== "wraith" && m?.kind !== "spectre" ) return ["only wraiths work the soulforges"];
    if ( w.kind === "spectre" && m.kind !== "spectre" ) return ["only Spectres know how to make this"];
    if ( w.from && n(m.year) && n(m.year) < w.from ) return [`not before ${w.from}: ${w.fromWhy ?? "it is not known yet"}`];
    const pl = planOf(w, m, o);
    if ( !pl.ok ) return [pl.why];
    const out = [], fuel = fuelOf(m), have = m.kind === "spectre" ? n(m.angst) : n(m.pathos);
    if ( have < pl.pathos ) out.push(`needs ${pl.pathos} ${fuel.name} for the soulfire and has ${have}`);
    if ( pl.selfCost && n(m.corpus) <= 1 ) out.push("has no Corpus left to pledge");
    return out;
  },
  cautions(w, m = {}) {
    const out = [];
    if ( w?.product === "relic" ) out.push("The forger must hold the relic; the Storyteller says whether they do.");
    if ( w?.kind === "skin" ) out.push("A Skin Artifact is cut from a slain plasmic; the Storyteller says whether the forger has the carcass. Once made it must be fed 2 Pathos a day.");
    for ( const c of w?.cautions ?? [] ) out.push(c);
    if ( SF.forgesIn(n(m.year) || null).key === "stygia" && !m.artificer ) out.push("Outside the Artificers' Guild this is illicit under Stygia's law, and the Storyteller hears of it.");
    out.push("The dice, the time and the Pathos are WoDX's own (logged for review).");
    return out;
  },
  fields: m => [
    {name: "source", label: "From", type: "select", value: "soul", options: Object.entries(SF.SOURCES).map(([k, s]) => [k, s.label]),
      hint: "A reworked relic always uses the relic."},
    {name: "artificer", label: "A member of the Artificers' Guild", type: "checkbox", value: !!m?.artificer}
  ],

  taskFor(w, m, o = {}) {
    const pl = planOf(w, m, o);
    if ( !pl.ok ) return null;
    return {...SF.taskOf(pl, {name: `Soulforge: ${w.name.replace(/^(A|An) /, "")}`}), line: "wraith", spend: pl.pathos,
      opts: {source: pl.source, pledge: !!pl.selfCost, artificer: o.artificer === undefined ? !!m?.artificer : !!o.artificer, illicit: !!pl.illicit,
        fuel: fuelOf(m).path}};
  },

  /** The forge's own item, marked as a wonder so either module can tell what made it (B3722). */
  itemsFor(w, {maker = "", at = 0} = {}) {
    if ( w?.level ) return namedItems(w, {maker, at});
    const d = w ? SF.itemData(w.product, {maker: String(maker)}) : null;
    if ( !d ) return [];
    const ref = `${w.book}, pdf ${w.pdf}`;
    d.name = w.name.replace(/^(A|An) /, "").replace(/^./, c => c.toUpperCase());
    d.system = {...d.system, description: d.system.description + para(w.does) + para(`${ref}.`), reference: ref};
    d.flags = {...d.flags, "wodx-library": {wonder: {key: w.key, line: "wraith", kind: w.kind, maker: String(maker), at: n(at), ref, does: w.does}}};
    return [d];
  },

  /** The soulfire's Pathos, and an Artificer's own plasm: a Corpus level for good (B3721). Paid whatever the outcome. */
  costs(w, t = {}) {
    const out = [];
    const fuel = t.opts?.fuel === D.ANGST ? {path: D.ANGST, name: "Angst"} : {path: D.PATHOS, name: "Pathos"};
    if ( n(t.spend) ) out.push({path: fuel.path, amount: n(t.spend), floor: 0, label: `${n(t.spend)} ${fuel.name} burned in the soulfire.`});
    if ( t.opts?.pledge ) out.push({path: "system.advantages.corpus.max", amount: 1, floor: 1, cap: "system.advantages.corpus.temporary", label: "A Corpus level pledged to the forge, gone for good."});
    return out;
  },
  after({status} = {}) {
    if ( status === "ruined" ) return ["A botch: the work is ruined, and the Corpus that went into it is lost to the dark."];
    if ( status === "done" ) return ["Soulsteel and plasm, hard and lasting. It moans now and then."];
    return [];
  },
  label: w => (w.level ? `${w.name} (level ${w.level} ${KIND_LABEL[w.kind] ?? "Artifact"})` : w.name),
  detail: (w, t = {}) => `${w?.level ? `${w.does} ` : ""}From: ${SF.SOURCES[t.opts?.source]?.label ?? "a soul"}.${t.opts?.artificer ? " Of the Artificers' Guild." : ""}${t.opts?.illicit ? " Illicit under Stygia's law." : ""} ${t.goal} successes at difficulty ${t.diff} (Dexterity + Crafts), a roll a week; ${n(t.spend)} ${t.opts?.fuel === D.ANGST ? "Angst" : "Pathos"} for the soulfire when it ends.`,
  intro: m => `Pathos ${n(m.pathos)}, Dexterity + Crafts ${n(m.dexterity) + n(m.crafts)} dice${m.artificer ? ", of the Artificers' Guild" : ""}.`,
  approvalText: "is the soul or relic to hand?"
};

/** The items a named Artifact becomes: its own thing with powers, or a weapon and its armor (B6102). */
export function namedItems(w, {maker = "", at = 0} = {}) {
  const ref = `${w.book} p. ${w.page}, pdf ${w.pdf}`;
  const flag = {...structuredClone(w.flag ?? {}), key: w.key, line: "wraith", kind: w.kind, maker: String(maker), at: n(at), ref, does: w.does, level: w.level};
  if ( flag.pool ) flag.pool.value = Math.min(n(flag.pool.max), n(flag.pool.value));
  const desc = `<p>${w.kind === "spectre" ? "Made by a Spectre" : "Soulforged"}${maker ? ` by ${String(maker).replace(/[<>&]/g, "")}` : ""}. A level ${w.level} ${KIND_LABEL[w.kind] ?? "Artifact"}.</p>` + para(w.does) + para(`${ref}.`);
  const flags = {"wodx-actions": {soulforged: {product: w.product, maker: String(maker), named: w.key}}, "wodx-library": {wonder: flag}};
  const out = [];
  if ( w.weapon ) {
    const x = w.weapon;
    out.push({name: w.name, type: "Melee Weapon", img: "icons/svg/sword.svg", flags,
      system: {description: desc, reference: ref, difficulty: 6, isequipped: false, conceal: x.conceal ?? "N",
        damage: {attribute: "strength", bonus: n(x.damage), type: x.type ?? "lethal", isrollable: true},
        attack: {attribute: "dexterity", ability: x.ability ?? "melee", accuracy: n(x.accuracy), isrollable: true}}});
  }
  if ( w.armor ) {
    const x = w.armor, own = !w.weapon;
    out.push({name: x.name ?? w.name, type: "Armor", img: "icons/svg/shield.svg",
      flags: own ? flags : {"wodx-actions": {soulforged: {product: w.product, maker: String(maker), named: w.key}}},
      system: {description: own ? desc : para(`Worn with ${w.name}.`) + para(`${ref}. ${x.house ?? ""}`), reference: ref, isequipped: false,
        soak: {bashing: n(x.soak), lethal: n(x.soak), aggravated: n(x.soak)}, dexpenalty: n(x.penalty)}});
  }
  if ( !out.length ) out.push({name: w.name.replace(/^A /, "").replace(/^./, c => c.toUpperCase()), type: "Item", img: "icons/svg/item-bag.svg", flags, system: {description: desc, reference: ref}});
  return out;
}

registerLine("wraith", wraithKit);
