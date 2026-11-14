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
 */
import * as SF from "../../wodx-actions/scripts/soulforge-rules.js";
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
const BY = Object.fromEntries(WRAITH_WONDERS.map(w => [w.key, w]));

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
  return SF.plan({product: w?.product, source, artificer, year: n(m.year) || null, dexterity: m.dexterity, crafts: m.crafts});
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
    return {profile: ctx.profile ?? "mortal", artificer: artificerOf(a), pathos: n(adv.pathos?.temporary), corpus: n(adv.corpus?.max),
      willpower: n(adv.willpower?.permanent), dexterity: n(s.attributes?.dexterity?.value), crafts: craftsOf(a), year: n(ctx.year)};
  },
  makerOf: f => ({...f, kind: f?.profile === "wraith" ? "wraith" : null}),
  listFor: m => (m?.kind === "wraith" ? WRAITH_WONDERS : []),

  blockers(w, m, o = {}) {
    if ( !w ) return ["no such item"];
    if ( m?.kind !== "wraith" ) return ["only wraiths work the soulforges"];
    const pl = planOf(w, m, o);
    if ( !pl.ok ) return [pl.why];
    const out = [];
    if ( n(m.pathos) < pl.pathos ) out.push(`needs ${pl.pathos} Pathos for the soulfire and has ${n(m.pathos)}`);
    if ( pl.selfCost && n(m.corpus) <= 1 ) out.push("has no Corpus left to pledge");
    return out;
  },
  cautions(w, m = {}) {
    const out = [];
    if ( w?.product === "relic" ) out.push("The forger must hold the relic; the Storyteller says whether they do.");
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
      opts: {source: pl.source, pledge: !!pl.selfCost, artificer: o.artificer === undefined ? !!m?.artificer : !!o.artificer, illicit: !!pl.illicit}};
  },

  /** The forge's own item, marked as a wonder so either module can tell what made it (B3722). */
  itemsFor(w, {maker = "", at = 0} = {}) {
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
    if ( n(t.spend) ) out.push({path: "system.advantages.pathos.temporary", amount: n(t.spend), floor: 0, label: `${n(t.spend)} Pathos burned in the soulfire.`});
    if ( t.opts?.pledge ) out.push({path: "system.advantages.corpus.max", amount: 1, floor: 1, cap: "system.advantages.corpus.temporary", label: "A Corpus level pledged to the forge, gone for good."});
    return out;
  },
  after({status} = {}) {
    if ( status === "ruined" ) return ["A botch: the work is ruined, and the Corpus that went into it is lost to the dark."];
    if ( status === "done" ) return ["Soulsteel and plasm, hard and lasting. It moans now and then."];
    return [];
  },
  label: w => w.name,
  detail: (w, t = {}) => `From: ${SF.SOURCES[t.opts?.source]?.label ?? "a soul"}.${t.opts?.artificer ? " Of the Artificers' Guild." : ""}${t.opts?.illicit ? " Illicit under Stygia's law." : ""} ${t.goal} successes at difficulty ${t.diff} (Dexterity + Crafts), a roll a week; ${n(t.spend)} Pathos for the soulfire when it ends.`,
  intro: m => `Pathos ${n(m.pathos)}, Dexterity + Crafts ${n(m.dexterity) + n(m.crafts)} dice${m.artificer ? ", of the Artificers' Guild" : ""}.`,
  approvalText: "is the soul or relic to hand?"
};

registerLine("wraith", wraithKit);
