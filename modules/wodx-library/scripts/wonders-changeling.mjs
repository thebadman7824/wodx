/**
 * WoDX Library: the Changeling kit for the wonders registry (B3700-B3705). Dreamstuff, chimerical crafting, forged
 * chimera and Treasures (C20). Data in data/wonders-changeling.mjs; no Foundry calls here except in after(), which gets
 * the actor as a service.
 *
 *   Gather dreamstuff: one roll, each success a measure of material (a house reading for the roll, B3702).
 *   Craft: Dexterity + Crafts once a week at the scope's difficulty with the place, tools, planning and experience
 *     (never under 3; over 10 cannot be done), until the scope's successes; failure is a lost week, a botch loses the
 *     work so far (C20 pdf 318 to 319). The measures of dreamstuff are used up when it is done.
 *   Imbue a Treasure: Intelligence + Gremayre each hour, five successes a level, a point of Glamour a level; the thing
 *     is a mundane object the maker picks (C20 pdf 325).
 *   Craft a Treasure: the components (one a level) are the Storyteller's to grant; then a crafting roll (pdf 325).
 * Everything made is chimerical (flag chimerical: invisible to mortals, wounds the Glamour, not the flesh).
 */
import * as C from "../data/wonders-changeling.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const GLAM = "system.advantages.glamour.temporary";
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const keyOf = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");
const NOT_THINGS = ["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"];

/** Dreamstuff carried: total measures, and the items holding them. */
export function dreamstuffOf(objects = []) {
  const held = objects.filter(o => o.wonder === "dreamstuff" && n(o.pool) > 0);
  return {total: held.reduce((s, o) => s + n(o.pool), 0), held};
}

/** The crafting difficulty: the scope's base and every modifier, never under 3 (C20 pdf 318 to 319). */
export function craftDiff(scope, o = {}) {
  const base = C.SCOPES[scope]?.diff ?? 6;
  const mod = n(C.PLACES[o.place]?.mod) + n(C.TOOLS[o.tools]?.mod) - Math.max(0, Math.min(3, Math.round(n(o.planned)))) - (o.experienced ? 1 : 0);
  return Math.max(3, base + mod);
}

/** The Arts as WoDX Actions reads them: Power items of the art kind, by key. */
function artsOf(items = []) {
  const out = {};
  for ( const i of items ) {
    const t = String(i?.system?.type ?? "");
    if ( i?.type !== "Power" || !/types\.art$/.test(t) ) continue;
    const raw = String(i.system?.label || i.name || "");
    const k = keyOf(raw.includes(".") ? raw.split(".").pop() : raw).replace(/^dragons?ire$/, "dragonsire");
    out[k] = Math.max(out[k] ?? 0, n(i.system?.value));
  }
  return out;
}

/** Points of a forged chimera spent the simple way (the Storyteller may rework them on the sheet). */
export function chimeraTraits(points = 20) {
  const p = Math.max(6, Math.round(n(points)));
  const attrs = Math.max(2, Math.round(p * 0.25)), abil = Math.max(1, Math.round(p * 0.15)), glamour = Math.max(1, Math.round(p * 0.15));
  const will = 1, health = Math.max(1, p - attrs - abil - glamour - will * C.CHIMERA_COST.willpowerCost);
  const dots = attrs * C.CHIMERA_COST.attrs;
  const order = ["strength", "dexterity", "stamina", "perception", "wits"];
  const attributes = Object.fromEntries(order.map(k => [k, 0]));
  for ( let i = 0; i < dots; i++ ) attributes[order[i % order.length]] += 1;
  const levels = Math.min(health * C.CHIMERA_COST.healthPer, Math.max(1, attributes.stamina) * 5);
  return {points: p, attributes, abilityDots: abil * C.CHIMERA_COST.abilities, glamour, willpower: will, health: levels};
}

export const changelingKit = {
  title: "Changeling: chimera and Treasures",
  noun: "a chimerical work or a Treasure",
  setting: "craftChangeling",
  settingName: "Making chimera and Treasures (Changeling)",
  settingHint: "Changelings gather dreamstuff, craft chimerical garb, weapons, armor and forged chimera from it, and imbue or craft Treasures that hold an Art and a store of Glamour. Everything made is chimerical.",
  settingDefault: true,
  ref: "Chimerical crafting is mortal crafting with dream materials: Dexterity + Crafts weekly at the scope's difficulty (C20 book p. 317, pdf 318 to 319); Treasures pdf 325.",
  rows: () => C.ROWS,
  row: key => C.byKey[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const sys = a.system ?? {}, adv = sys.advantages ?? {}, items = a.items ?? [];
    return {profile: ctx.profile ?? "mortal", year: n(ctx.year), name: String(a.name ?? ""), arts: artsOf(items),
      glamour: n(adv.glamour?.temporary), glamourPerm: n(adv.glamour?.permanent), banality: n(adv.banality?.permanent),
      objects: items.filter(i => i?.type && !NOT_THINGS.includes(i.type)).map(i => {
        const w = i.flags?.["wodx-library"]?.wonder;
        return {id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type, wonder: w?.key ?? "", pool: n(w?.pool?.value), chimerical: !!w?.chimerical};
      })};
  },
  makerOf: f => ({...f, kind: f.profile === "fae" ? "changeling" : null}),
  listFor: m => (m?.kind ? C.ROWS : []),
  groups: rows => [{label: "Dreamstuff", rows: rows.filter(r => r.kind === "gather")}, {label: "Chimerical crafting", rows: rows.filter(r => r.kind === "craft")},
    {label: "Treasures", rows: rows.filter(r => r.kind === "imbue" || r.kind === "treasure")}],

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such work"];
    if ( !m.kind ) out.push("only changelings work dreamstuff and make Treasures");
    if ( r.kind === "craft" ) {
      const have = dreamstuffOf(m.objects).total;
      if ( have < n(r.stuff) ) out.push(`needs ${r.stuff} measure${r.stuff === 1 ? "" : "s"} of dreamstuff, has ${have}`);
      if ( C.SCOPES[r.scope].diff + n(C.PLACES[o.place]?.mod) + n(C.TOOLS[o.tools]?.mod) - Math.min(3, n(o.planned)) - (o.experienced ? 1 : 0) > 10 ) out.push("over difficulty 10: no changeling can make it");
    }
    if ( r.kind === "imbue" || r.kind === "treasure" ) {
      const lvl = Math.max(1, Math.min(5, Math.round(n(o.level) || 1)));
      if ( !C.ARTS[o.art] ) out.push("pick the Art it will hold");
      if ( r.kind === "imbue" ) {
        if ( n(m.arts?.[o.art]) < lvl ) out.push(`the maker must know ${C.ARTS[o.art] ?? "the Art"} at ${lvl}`);
        if ( !o.target ) out.push("pick the mundane thing to imbue");
        if ( n(m.glamour) < lvl ) out.push(`needs ${lvl} Glamour to give, has ${n(m.glamour)}`);
      }
      const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
      if ( o.target && !t ) out.push("that thing is no longer carried");
      if ( t?.wonder ) out.push(`${t.name} already holds something`);
    }
    return out;
  },
  cautions(r) {
    const out = [];
    if ( r.house ) out.push("Gathering is a story in the books; here it is one roll.");
    if ( r.kind === "craft" ) out.push("Failure loses a week; a botch can break a tool, spoil materials, cost the work done so far, or hurt someone.");
    if ( r.key === "forged-chimera" ) out.push("The chimera is made with simple traits from its points; the Storyteller can rework them and add Redes.");
    if ( r.kind === "treasure" ) out.push("The Storyteller decides when the components are found: one for each level of the Art. The Treasure manifests the Art even if its maker does not know it.");
    if ( r.kind === "imbue" ) out.push("A very Banal thing is harder to imbue, at the Storyteller's word.");
    return out;
  },
  fields(m = {}) {
    const objs = (m.objects ?? []).filter(x => !x.wonder && !x.chimerical);
    const opts = obj => Object.entries(obj).map(([k, v]) => [k, v.label]);
    return [
      {name: "place", label: "Where the work is done", type: "select", value: "", options: [["", "(no change)"], ...opts(C.PLACES)]},
      {name: "tools", label: "Tools", type: "select", value: "", options: [["", "(ordinary)"], ...opts(C.TOOLS)]},
      {name: "planned", label: "Planning done (1 to 3 off)", type: "number", min: 0, max: 3, value: 0, hint: "Each five successes of planning (Intelligence + Crafts, a day a roll) take one off."},
      {name: "experienced", label: "Has made the same thing before", type: "checkbox", value: false},
      {name: "art", label: "The Art a Treasure holds", type: "select", value: "", options: [["", "(not a Treasure)"], ...Object.entries(C.ARTS)]},
      {name: "level", label: "The Art's level", type: "number", min: 1, max: 5, value: 1},
      {name: "target", label: "The mundane thing (Imbue a Treasure)", type: "select", value: "", options: [["", "(none)"], ...objs.map(x => [x.id, x.name])]}
    ];
  },

  taskFor(r, m = {}, o = {}) {
    const lvl = Math.max(1, Math.min(5, Math.round(n(o.level) || 1)));
    const target = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    const opts = {place: C.PLACES[o.place] ? o.place : "", tools: C.TOOLS[o.tools] ? o.tools : "", art: C.ARTS[o.art] ? o.art : "", level: lvl,
      target: target?.id ?? "", targetName: target?.name ?? ""};
    const ref = `${r.book}, pdf ${r.pdf}`;
    if ( r.kind === "gather" ) return {kind: "wonder", line: "changeling", name: r.name, attr: r.roll.attr, ability: r.roll.ability, diff: r.roll.diff,
      goal: 1, interval: "day", maxRolls: 1, delicate: false, delay: 0, opts, note: `Taken in the Dreaming, bought or fetched (${ref}).`};
    if ( r.kind === "imbue" ) return {kind: "wonder", line: "changeling", name: `Imbue ${target?.name ?? "a Treasure"} with ${C.ARTS[o.art] ?? "an Art"} ${lvl}`,
      attr: "intelligence", ability: "gremayre", diff: 6, goal: 5 * lvl, interval: "hour", delicate: false, delay: 0, opts,
      note: `Intelligence + Gremayre each hour, ${5 * lvl} successes, ${lvl} Glamour given (${ref}).`};
    const scope = r.scope ?? "advanced";
    return {kind: "wonder", line: "changeling", name: r.kind === "treasure" ? `Craft a Treasure of ${C.ARTS[o.art] ?? "an Art"} ${lvl}` : `Craft: ${r.name}`,
      attr: "dexterity", ability: "craft", diff: Math.min(10, craftDiff(scope, o)), goal: C.SCOPES[scope].goal + (r.better ? 2 : 0), interval: "week", delicate: false, delay: 0,
      opts: {...opts, scope, stuff: n(r.stuff)}, note: `${C.SCOPES[scope].label}; Dexterity + Crafts each week (${ref}).`};
  },

  /** The wonder flag a finished work carries. */
  flagFor(r, {successes = 1, maker = "", at = 0, task = {}} = {}) {
    const o = task.opts ?? {}, ref = `${r.book}, pdf ${r.pdf}`;
    const base = {key: r.key, line: "changeling", kind: r.kind, maker: String(maker), at: n(at), ref, does: r.does, chimerical: true};
    if ( r.kind === "gather" ) return {...base, pool: {label: "measures of dreamstuff", value: Math.max(1, n(successes)), max: Math.max(1, n(successes))}, emptySpent: true, powers: []};
    if ( r.kind === "imbue" || r.kind === "treasure" ) {
      const art = C.ARTS[o.art] ?? "its Art", lvl = Math.max(1, n(o.level) || 1), imbued = r.kind === "imbue";
      return {...base, treasure: {art: o.art, level: lvl, imbued}, pool: {label: "Glamour", value: 0, max: 10},
        powers: [
          {id: "art", label: `Call on its ${art} ${lvl}${imbued ? " (a Glamour from it)" : ""}`, ...(imbued ? {spend: {pool: "item", amount: 1}} : {}),
            text: `The Treasure works the level ${lvl} power of ${art} with no Realm needed; make the roll that power asks${imbued ? ", and pay any Glamour it costs as well" : ""}.`},
          ...(imbued ? [{id: "art-own", label: `Call on its ${art} ${lvl} (a Glamour of your own)`, spend: {pool: `actor:${GLAM}`, amount: 1}, text: "The Treasure is empty, so the user pays the point."}] : []),
          {id: "feed", label: "Give it a point of Glamour", transfer: {from: `actor:${GLAM}`, to: "item", amount: 1}, text: "Any changeling may feed a Treasure; rarely does one hold more than ten."}
        ]};
    }
    if ( r.item === "chimera" ) return {...base, companion: true, powers: []};
    return {...base, powers: []};
  },

  itemsFor(r, {successes = 1, maker = "", at = 0, task = {}} = {}) {
    if ( !r || (r.kind === "imbue" && task.opts?.target) ) return [];
    const flag = changelingKit.flagFor(r, {successes, maker, at, task}), ref = flag.ref;
    const desc = para(r.does) + para("Chimerical: unseen by mortals; its wounds fall on the Glamour, not the flesh.") + para(`${ref}.`);
    const data = {name: r.kind === "gather" ? "Dreamstuff" : r.kind === "treasure" ? `Treasure of ${C.ARTS[task.opts?.art] ?? "the Dreaming"}` : r.name,
      type: "Item", img: "icons/svg/item-bag.svg", system: {description: desc, reference: ref}, flags: {"wodx-library": {wonder: flag}}};
    if ( r.item === "weapon" ) return [{...data, type: "Melee Weapon", img: "icons/svg/sword.svg",
      system: {...data.system, difficulty: 6, damage: {attribute: "strength", bonus: r.better ? 3 : 2, type: "lethal", isrollable: true},
        attack: {attribute: "dexterity", ability: "melee", accuracy: 0, isrollable: true}, istwohanded: false, conceal: ""}}];
    if ( r.item === "armor" ) return [{...data, type: "Armor", img: "icons/svg/shield.svg", system: {...data.system, soak: {bashing: 0, lethal: 0, aggravated: 0, chimerical: {bashing: 3, lethal: 3, aggravated: 0}}, dexpenalty: 1}}];
    if ( r.item === "chimera" ) return [{...data, name: "Forged chimera (its maker's token)"}];
    return [data];
  },

  marks: (r, t = {}) => r?.kind === "imbue" && !!t.opts?.target,

  /** Imbuing gives a point of Glamour a level (C20 pdf 325). */
  costs(r, t = {}) {
    if ( r?.kind !== "imbue" || t.status !== "done" ) return [];
    const lvl = Math.max(1, n(t.opts?.level) || 1);
    return [{path: GLAM, amount: lvl, floor: 0, label: `${lvl} Glamour given to the Treasure.`}];
  },

  /** Use up the dreamstuff, mark an imbued thing, and make a forged chimera as a companion. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const out = [], a = services.actor;
    if ( status !== "done" || !a ) return status === "ruined" ? ["The work is lost."] : out;
    const now = globalThis.game?.time?.worldTime ?? 0;
    if ( r.kind === "craft" && n(t.opts?.stuff) ) {
      let need = n(t.opts.stuff);
      for ( const it of [...(a.items ?? [])] ) {
        const f = it.flags?.["wodx-library"]?.wonder;
        if ( need <= 0 || f?.key !== "dreamstuff" ) continue;
        const take = Math.min(need, n(f.pool?.value));
        if ( !take ) continue;
        need -= take;
        const left = n(f.pool.value) - take;
        await it.update({"flags.wodx-library.wonder.pool.value": left, ...(left <= 0 ? {"flags.wodx-library.wonder.spent": true} : {})});
      }
      out.push(`${n(t.opts.stuff) - need} measure${n(t.opts.stuff) - need === 1 ? "" : "s"} of dreamstuff used.`);
    }
    if ( r.kind === "imbue" && t.opts?.target ) {
      const item = a.items?.get?.(t.opts.target);
      if ( item ) {
        const flag = changelingKit.flagFor(r, {maker: a.name, at: now, task: t});
        await item.update({"flags.wodx-library.wonder": flag, "system.description": `${item.system?.description ?? ""}${para(`A Treasure of ${C.ARTS[t.opts.art] ?? "an Art"} ${n(t.opts.level)}: ${r.does}`)}`});
        out.push(`${item.name} is now a Treasure.`);
      } else out.push("The thing was not there at the end: the Glamour went nowhere.");
    }
    if ( r.item === "chimera" ) {
      try {
        const tr = chimeraTraits(C.CHIMERA_POINTS[r.scope] ?? 20);
        const own = Object.fromEntries(Object.entries(a.ownership ?? {}).filter(([, v]) => n(v) >= 3));
        const attributes = Object.fromEntries(Object.entries(tr.attributes).map(([k, v]) => [k, {value: v}]));
        const Actor = globalThis.Actor;
        const [c] = await Actor.createDocuments([{name: `${a.name}'s forged chimera`, type: "Creature", ownership: {default: 0, ...own},
          system: {attributes, advantages: {willpower: {permanent: tr.willpower, temporary: tr.willpower}, glamour: {permanent: tr.glamour, temporary: tr.glamour}}},
          flags: {"wodx-library": {chimera: {maker: a.id, points: tr.points, health: tr.health, abilityDots: tr.abilityDots, forged: true, chimerical: true}}}}]);
        if ( c ) out.push(`${c.name} is made (${tr.points} chimera points: ${tr.health} health levels, ${tr.abilityDots} Ability dots to place, Glamour ${tr.glamour}). It has no Redes yet.`);
      } catch (e) { out.push("The chimera's body is ready; the Storyteller makes its sheet."); }
    }
    return out;
  },
  label: r => (r.scope ? `${r.name} (${r.scope})` : r.name),
  detail: (r, t = {}) => `${t.attr} + ${t.ability} at difficulty ${t.diff}, ${t.goal} success${t.goal === 1 ? "" : "es"}, each ${t.interval}.`,
  intro: m => `Glamour ${n(m.glamour)}, dreamstuff ${dreamstuffOf(m.objects).total}.`,
  approvalText: "are the materials or components to hand?"
};

registerLine("changeling", changelingKit);
