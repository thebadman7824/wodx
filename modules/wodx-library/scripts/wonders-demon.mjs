/**
 * WoDX Library: the Demon kit for the wonders registry (B3712-B3716). Enchant Object and Imbue Object (Demon: The
 * Fallen pdf 192). Data in data/wonders-demon.mjs; no Foundry calls here except in after(), which gets the actor.
 *
 *   Enchant Object: Forge 4, and a lore with the evocation the object will hold. Extended Dexterity + Crafts, a roll a
 *     day (a house reading, B3713), difficulty 6 for the maker's own work or 8 for a carried thing, successes by scope.
 *     A point of Faith goes in. A botch destroys the thing. The item calls on the evocation with Use buttons: Willpower
 *     at 8 for mortals, Faith at 6 for the Fallen, a point lost on a botch; attuning costs a permanent point and ends the
 *     rolls. An evocation that costs Faith costs a demon user that point too (B3714).
 *   Imbue Object: Forge 5. One roll of Stamina + Crafts against the soul's Willpower (rolled when it is done), a point of
 *     Faith. The vessel holds the soul until it is broken.
 *   Monstrous: when the maker's permanent Torment is 7 or more, or the maker chooses it, the high-Torment version is made
 *     (cursed objects, twisted souls; B3715).
 */
import * as Dm from "../data/wonders-demon.mjs";
import * as D from "../../wodx-actions/scripts/demon-rules.js";
import {registerLine} from "./wonder-registry.mjs";
import {countSuccesses} from "./wonder-powers.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const FAITH = "system.advantages.faith.temporary", FAITH_P = "system.advantages.faith.permanent";
const WILL = "system.advantages.willpower.temporary", WILL_P = "system.advantages.willpower.permanent";
const TORMENT = "system.advantages.torment.temporary";
const MONSTROUS = 7;
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const NOT_THINGS = ["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"];
const evoKey = e => `${e.lore}:${e.level}`;

/** Lore ratings from the sheet's Lore powers, as WoDX Actions reads them. */
function loresOf(items = []) {
  const out = {};
  for ( const i of items ) {
    if ( i?.type !== "Power" || !/types\.lore$/.test(String(i.system?.type ?? "")) ) continue;
    const k = D.loreOf(i.name) || D.loreOf(i.system?.label);
    if ( k ) out[k] = Math.max(out[k] ?? 0, n(i.system?.value));
  }
  return out;
}
export const monstrous = (m = {}, o = {}) => !!o.dark || n(m.tormentPerm) >= MONSTROUS;

export const demonKit = {
  title: "Demon: enchanted and imbued objects",
  noun: "an enchanted object or a soul vessel",
  setting: "craftDemon",
  settingName: "Making enchanted objects (Demon)",
  settingHint: "Malefactors and other masters of the Lore of the Forge put evocations into objects and bind souls into vessels. Monstrous makers make cursed things.",
  settingDefault: true,
  ref: "The Lore of the Forge: Demon: The Fallen pdf 192 (book p. 191).",
  rows: () => Dm.ROWS,
  row: key => Dm.byKey[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const adv = a.system?.advantages ?? {}, items = a.items ?? [];
    const lores = loresOf(items);
    return {profile: ctx.profile ?? "mortal", name: String(a.name ?? ""), lores, evocations: D.evocationsKnown(lores),
      faith: n(adv.faith?.temporary), faithPerm: n(adv.faith?.permanent), torment: n(adv.torment?.temporary), tormentPerm: n(adv.torment?.permanent),
      objects: items.filter(i => i?.type && !NOT_THINGS.includes(i.type)).map(i => ({id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type,
        wonder: i.flags?.["wodx-library"]?.wonder?.key ?? "", tech: /computer|phone|radio|electr|television|laptop/i.test(String(i.name ?? ""))}))};
  },
  makerOf: f => ({...f, kind: f.profile === "demon" && n(f.lores?.forge) >= 4 ? "demon" : null}),
  listFor: m => (m?.kind ? Dm.ROWS.filter(r => n(m.lores?.forge) >= r.level) : []),

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such evocation"];
    if ( !m.kind ) return ["only the Fallen with the Lore of the Forge at 4 do this"];
    if ( n(m.lores?.forge) < r.level ) out.push(`needs the Lore of the Forge at ${r.level}`);
    if ( n(m.faith) < 1 ) out.push("needs a point of Faith");
    const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    if ( o.target && !t ) out.push("that thing is no longer carried");
    if ( t?.wonder ) out.push(`${t.name} already holds something`);
    if ( r.kind === "enchant" ) {
      if ( !(m.evocations ?? []).some(e => evoKey(e) === o.evocation) ) out.push("pick an evocation the maker knows for it to hold");
      if ( !Dm.SCOPES[o.scope] ) out.push("pick how much the enchantment does");
      if ( t?.tech ) out.push("nothing electronic can be enchanted");
    }
    if ( r.kind === "imbue" ) {
      if ( !String(o.soul ?? "").trim() ) out.push("name the soul to bind");
      if ( n(o.soulWill) < 1 ) out.push("set the soul's Willpower");
    }
    return out;
  },
  cautions(r, m = {}) {
    const out = [];
    if ( monstrous(m) ) out.push(`The maker's Torment is ${n(m.tormentPerm)}: what is made will be the monstrous version. ${r.cursed}`);
    if ( r.kind === "enchant" ) out.push("The Storyteller has the last word on which lore, and how much of it, the object needs. A roll a day is WoDX's pace.");
    if ( r.kind === "imbue" ) out.push("The soul must be within the maker's Faith in yards when it is done; its Willpower is rolled against the binding then.");
    return out;
  },
  fields(m = {}) {
    const objs = (m.objects ?? []).filter(x => !x.wonder);
    const label = e => `${D.LORES[e.lore]?.label ?? e.lore} ${e.level}: ${e.name}${e.faith ? " (a Faith)" : ""}`;
    return [
      {name: "evocation", label: "The evocation it will hold", type: "select", value: "", options: [["", "(none)"], ...(m.evocations ?? []).map(e => [evoKey(e), label(e)])]},
      {name: "scope", label: "How much it does", type: "select", value: "simple", options: Object.entries(Dm.SCOPES).map(([k, v]) => [k, `${v.label} (${v.goal})`])},
      {name: "target", label: "A thing made by others (difficulty 8)", type: "select", value: "", options: [["", "(the maker's own work, difficulty 6)"], ...objs.map(x => [x.id, x.name])]},
      {name: "soul", label: "The soul to bind (Imbue Object)", type: "text", value: ""},
      {name: "soulKind", label: "The soul is", type: "select", value: "mortal", options: [["mortal", "a mortal ghost"], ["demon", "one of the Fallen"]]},
      {name: "soulWill", label: "The soul's Willpower", type: "number", min: 0, max: 10, value: 0},
      {name: "dark", label: "Choose the monstrous version", type: "checkbox", value: false}
    ];
  },

  taskFor(r, m = {}, o = {}) {
    const target = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    const evo = (m.evocations ?? []).find(e => evoKey(e) === o.evocation) ?? null;
    const opts = {target: target?.id ?? "", targetName: target?.name ?? "", evocation: evo ? evoKey(evo) : "", evoName: evo?.name ?? "", evoFaith: n(evo?.faith),
      evoAttr: evo?.attr ?? "", evoAbility: evo?.ability ?? "", scope: Dm.SCOPES[o.scope] ? o.scope : "simple", dark: monstrous(m, o),
      soul: String(o.soul ?? "").slice(0, 80), soulKind: o.soulKind === "demon" ? "demon" : "mortal", soulWill: Math.max(0, Math.min(10, Math.round(n(o.soulWill))))};
    const diff = target ? 8 : 6, ref = `${r.book}, pdf ${r.pdf}`;
    if ( r.kind === "imbue" ) return {kind: "wonder", line: "demon", name: `Bind ${opts.soul || "a soul"} into ${target?.name ?? "a hand-made vessel"}`,
      attr: "stamina", ability: "craft", diff, goal: 1, interval: "hour", maxRolls: 1, delicate: true, delay: 0, opts,
      note: `Stamina + Crafts against the soul's Willpower ${opts.soulWill}, a point of Faith (${ref}).`};
    return {kind: "wonder", line: "demon", name: `Enchant ${target?.name ?? "a thing of the maker's making"} with ${evo?.name ?? "an evocation"}`,
      attr: "dexterity", ability: "craft", diff, goal: Dm.SCOPES[opts.scope].goal, interval: "day", delicate: true, delay: 0, opts,
      note: `Extended Dexterity + Crafts at ${diff}, ${Dm.SCOPES[opts.scope].goal} successes, a point of Faith (${ref}).`};
  },

  /** The wonder flag an enchanted thing or a soul vessel carries. */
  flagFor(r, {maker = "", at = 0, task = {}, successes = 1, bound = true} = {}) {
    const o = task.opts ?? {}, ref = `${r.book}, pdf ${r.pdf}`, dark = !!o.dark;
    const base = {key: r.key, line: "demon", kind: r.kind, maker: String(maker), at: n(at), ref, does: dark ? `${r.does} ${r.cursed}` : r.does, cursed: dark};
    if ( r.kind === "imbue" ) return {...base, soul: {name: o.soul, kind: o.soulKind, bound: !!bound, twisted: dark && bound, tormentAdded: dark && o.soulKind === "demon" ? n(successes) : 0},
      powers: [{id: "break", label: "Break the vessel (frees the soul)", consume: true, text: "Breaking the vessel is the only way out for what it holds."}]};
    const evo = {name: o.evoName, lore: String(o.evocation ?? "").split(":")[0], faith: n(o.evoFaith), attr: o.evoAttr, ability: o.evoAbility};
    const what = `${evo.name || "its evocation"}${evo.attr ? ` (as the evocation: ${evo.attr}${evo.ability ? ` + ${evo.ability}` : ""})` : ""}`;
    const demonPays = evo.faith ? {spend: {pool: `actor:${FAITH}`, amount: evo.faith}} : {};
    const powers = dark ? [
      {id: "use-mortal", label: `Use it: ${evo.name} (a mortal loses a Willpower)`, spend: {pool: `actor:${WILL}`, amount: 1},
        text: `The cursed thing works ${what}; it botches on a 1 or 2, and the harm finds the user or someone close.`},
      {id: "use-demon", label: `Use it: ${evo.name} (a demon gains a Torment)`, drawback: {path: TORMENT, amount: 1, label: "1 temporary Torment gained.", max: 10}, ...demonPays,
        text: `The cursed thing works ${what}; it botches on a 1 or 2, and the harm finds the user or someone close.`}
    ] : [
      {id: "use-mortal", label: `Use it: ${evo.name} (a mortal: Willpower at 8)`, roll: {path: WILL_P, diff: 8}, onBotch: {path: WILL, amount: 1, label: "A Willpower point lost."},
        text: `On a success it works ${what}.`},
      {id: "use-demon", label: `Use it: ${evo.name} (a demon: Faith at 6)`, roll: {path: FAITH_P, diff: 6}, onBotch: {path: FAITH, amount: 1, label: "A Faith point lost."}, ...demonPays,
        text: `On a success it works ${what}.`},
      {id: "attune-mortal", label: "Attune it to a mortal (a permanent Willpower)", spend: {pool: `actor:${WILL_P}`, amount: 1}, uses: 1, text: "Once attuned it works at will, with no roll."},
      {id: "attune-demon", label: "Attune it to a demon (a permanent Faith)", spend: {pool: `actor:${FAITH_P}`, amount: 1}, uses: 1, text: "Once attuned it works at will, with no roll."},
      {id: "use-attuned", label: `Use it, attuned: ${evo.name}`, requires: ["attune-mortal", "attune-demon"], ...demonPays, text: `It works ${what}.`}
    ];
    return {...base, evocation: evo, powers};
  },

  itemsFor(r, {maker = "", at = 0, task = {}, successes = 1} = {}) {
    if ( !r || task.opts?.target ) return [];
    const flag = demonKit.flagFor(r, {maker, at, task, successes});
    const name = r.kind === "imbue" ? `Soul vessel: ${task.opts?.soul || "a bound soul"}` : `${task.opts?.evoName || "Enchanted"} object`;
    return [{name, type: "Item", img: r.kind === "imbue" ? "icons/svg/jar.svg" : "icons/svg/item-bag.svg",
      system: {description: para(flag.does) + para(`${flag.ref}.`), reference: flag.ref}, flags: {"wodx-library": {wonder: flag}}}];
  },
  marks: (r, t = {}) => !!t.opts?.target,

  /** A point of Faith goes into the work, whether it holds or not. */
  costs(r, t = {}) {
    if ( !r || !["done", "ruined"].includes(t.status) ) return [];
    return [{path: FAITH, amount: 1, floor: 0, label: "A point of Faith put into the work."}];
  },

  /** Mark a carried thing; roll the soul's resistance; say what a botch broke. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const out = [], a = services.actor, o = t.opts ?? {};
    if ( status === "ruined" ) {
      if ( o.target && a?.items?.get?.(o.target) ) {
        const it = a.items.get(o.target);
        await it.update({name: `${it.name} (broken)`, "flags.wodx-library.wonder": {key: r.key, line: "demon", broken: true, spent: true, powers: []}});
        out.push(`${it.name} is destroyed by the botch.`);
      } else out.push("The botch destroys the work.");
      return out;
    }
    if ( status !== "done" || !a ) return out;
    const now = globalThis.game?.time?.worldTime ?? 0;
    let bound = true, net = n(t.total);
    if ( r.kind === "imbue" ) {
      const rand = services.rand ?? Math.random;
      const faces = Array.from({length: Math.max(1, n(o.soulWill))}, () => 1 + Math.floor(rand() * 10));
      const res = countSuccesses(faces, 6);
      net = n(t.total) - res.successes;
      bound = net > 0;
      out.push(`The soul resists with Willpower ${n(o.soulWill)}: ${res.successes} success${res.successes === 1 ? "" : "es"} [${faces.join(", ")}]. ${bound ? `${o.soul || "It"} is bound.` : "It slips the binding."}`);
      if ( bound && o.dark ) out.push(o.soulKind === "demon" ? `Twisted by the binder's Torment: +${net} permanent Torment to the bound demon.` : "Twisted by the binder's Torment: the soul gains a permanent derangement (the Storyteller's choice).");
    }
    if ( o.target ) {
      const it = a.items?.get?.(o.target);
      if ( it ) {
        const flag = demonKit.flagFor(r, {maker: a.name, at: now, task: t, successes: net, bound});
        await it.update({"flags.wodx-library.wonder": flag, "system.description": `${it.system?.description ?? ""}${para(flag.does)}`});
        out.push(r.kind === "imbue" ? `${it.name} is now a soul vessel${bound ? "" : ", empty"}.` : `${it.name} is enchanted with ${o.evoName}.`);
      } else out.push("The thing was not there at the end.");
    } else if ( r.kind === "imbue" && !bound ) {
      const v = [...(a.items ?? [])].reverse().find(i => i.flags?.["wodx-library"]?.wonder?.key === r.key);
      if ( v ) await v.update({"flags.wodx-library.wonder.soul.bound": false, name: "Soul vessel (empty)"});
    }
    if ( o.dark && r.kind === "enchant" ) out.push("It is cursed.");
    return out;
  },
  label: r => `${r.name} (the Forge ${r.level})`,
  detail: (r, t = {}) => t.note ?? "",
  intro: m => `Faith ${n(m.faith)}/${n(m.faithPerm)}, Torment ${n(m.tormentPerm)}; the Forge ${n(m.lores?.forge)}.`,
  approvalText: "does the maker have the lore the object needs, and is the vessel ready?"
};

registerLine("demon", demonKit);
