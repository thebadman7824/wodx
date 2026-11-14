/**
 * WoDX Library: the Kuei-jin kit for the wonders registry (B3770-B3779). The wangyu's stone weapons and true jade.
 * Data in data/wonders-kuei-jin.mjs; no Foundry calls here except in after(), which gets the actor.
 *
 *   Who: a Kuei-jin (the system's vampire sheet set to Kindred of the East) with Jade Shintai 6 or more, or with the
 *     power itself written on the sheet as a Power (B3771). The Companion lists both among the wangyu's arts past the
 *     fifth dot without a level each.
 *   Blade of Stone: one roll of Manipulation + Crafts at 8. It makes a Melee Weapon of the shape picked: the V20 chart's
 *     damage plus two, aggravated (B3772).
 *   Taste of Jade: an hour, a Willpower point, one roll of Perception + Meditation at 9. It makes a piece of true jade
 *     (or turns a carried piece) for a night a success: a two-dot Jade Talisman of Yin or Yang with a Chi pool of two.
 *     Its Use buttons take in ambient Chi once a night (the Wall asked first), draw a point out a turn, and burst it
 *     when a roll spending its Chi botches. After its last night nothing runs (B3773-B3775).
 */
import * as K from "../data/wonders-kuei-jin.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const low = s => String(s ?? "").toLowerCase();
const WILL = "system.advantages.willpower.temporary";
const CHI = {yin: "system.advantages.yinchi.temporary", yang: "system.advantages.yangchi.temporary"};
const KIND = {yin: "Yin", yang: "Yang"};
const NIGHT = 86400;
const ADVANCED = 6;
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const NOT_THINGS = ["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"];
const refOf = r => `${r.book} p. ${r.page}${r.talisman ? `; Jade Talisman, ${r.talisman.book} pp. ${r.talisman.page}-${r.talisman.page + 1}` : ""}`;

export const kueiJinKit = {
  title: "Kuei-jin: stone weapons and true jade",
  noun: "a stone weapon or true jade",
  setting: "craftKueiJin",
  settingName: "Making stone weapons and true jade (Kuei-jin)",
  settingHint: "Masters of Jade Shintai draw weapons out of stone and make ordinary jade true for some nights (Kindred of the East Companion).",
  settingDefault: true,
  ref: "Kindred of the East Companion p. 67; Kindred of the East pp. 86-87.",
  rows: () => K.ROWS,
  row: key => K.byKey[key] ?? null,

  /** actorData: {system, items, flags, type}; ctx: {profile, year}. */
  factsFrom(a = {}, ctx = {}) {
    const items = a.items ?? [];
    const powers = items.filter(i => i?.type === "Power");
    const jade = powers.filter(i => /jade\s*shintai/i.test(String(i.name ?? ""))).reduce((m, i) => Math.max(m, n(i.system?.value)), 0);
    const s = a.system ?? {};
    return {profile: ctx.profile ?? "mortal", year: n(ctx.year), name: String(a.name ?? ""), variant: String(s.settings?.variant ?? ""), jade,
      known: powers.map(i => low(i.name)), willpower: n(s.advantages?.willpower?.temporary),
      objects: items.filter(i => i?.type && !NOT_THINGS.includes(i.type)).map(i => ({id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type,
        wonder: i.flags?.["wodx-library"]?.wonder?.spent ? "" : i.flags?.["wodx-library"]?.wonder?.key ?? ""}))};
  },
  makerOf(f = {}) {
    const kuei = f.profile === "kindred" && f.variant === "kindredeast";
    const knows = r => n(f.jade) >= ADVANCED || (f.known ?? []).includes(r.power);
    return {...f, kind: kuei && K.ROWS.some(knows) ? "wangyu" : null, knows: kuei ? K.ROWS.filter(knows).map(r => r.key) : []};
  },
  listFor: m => (m?.kind ? K.ROWS.filter(r => (m.knows ?? []).includes(r.key)) : []),

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such work"];
    if ( !m.kind ) return [m.variant === "kindredeast" ? `needs Jade Shintai ${ADVANCED} or the power itself` : "only the Kuei-jin know this"];
    if ( !(m.knows ?? []).includes(r.key) ) out.push(`needs Jade Shintai ${ADVANCED} or ${r.name} on the sheet`);
    if ( r.kind === "blade" && !K.SHAPES[o.shape] ) out.push("pick the weapon's shape");
    if ( r.kind === "jade" ) {
      if ( n(m.willpower) < 1 ) out.push("needs a Willpower point");
      if ( !KIND[o.attune] ) out.push("pick Yin or Yang");
      const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
      if ( o.target && !t ) out.push("that piece of jade is not carried");
      if ( t?.wonder ) out.push(`${t.name} already holds something`);
    }
    return out;
  },
  cautions(r) {
    const out = [`The Companion gives no level for this power; WoDX asks for Jade Shintai ${ADVANCED}, or the power written on the sheet.`];
    if ( r.kind === "blade" ) out.push("Taking the stone from a wall or a building may weaken it: the Storyteller says what follows.");
    if ( r.kind === "jade" ) out.push("It needs a piece of ordinary jade: pick one carried, or leave it empty and a new piece is written on the sheet.");
    return out;
  },
  fields(m = {}) {
    const objs = (m.objects ?? []).filter(x => !x.wonder);
    return [
      {name: "shape", label: "Blade of Stone: the weapon's shape", type: "select", value: "sword", options: Object.entries(K.SHAPES).map(([k, s]) => [k, `${s.label} (Strength +${s.bonus + 2}, aggravated)`])},
      {name: "attune", label: "Taste of Jade: attuned to", type: "select", value: "yang", options: [["yang", "Yang"], ["yin", "Yin"]]},
      {name: "target", label: "Taste of Jade: the piece of jade", type: "select", value: "", options: [["", "(a new piece)"], ...objs.map(x => [x.id, `${x.name} (${x.type})`])]}
    ];
  },

  taskFor(r, m = {}, o = {}) {
    const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    const ref = refOf(r);
    if ( r.kind === "blade" ) {
      const s = K.SHAPES[o.shape] ?? K.SHAPES.sword;
      return {kind: "wonder", line: "kuei-jin", name: `Blade of Stone: ${s.label.toLowerCase()}`, attr: "manipulation", ability: "craft", diff: 8, goal: 1, interval: "hour",
        maxRolls: 1, delicate: false, delay: 0, opts: {shape: K.SHAPES[o.shape] ? o.shape : "sword"}, note: `A hand on the stone: Manipulation + Crafts at 8 (${ref}).`};
    }
    const attune = KIND[o.attune] ? o.attune : "yang";
    return {kind: "wonder", line: "kuei-jin", name: `Taste of Jade${t ? `: ${t.name}` : ""} (${KIND[attune]})`, attr: "perception", ability: "meditation", diff: 9, goal: 1,
      interval: "hour", maxRolls: 1, delicate: false, delay: 0, opts: {attune, target: t?.id ?? "", targetName: t?.name ?? ""},
      perRoll: [{path: WILL, amount: 1, label: "A Willpower point", floor: 0}],
      note: `An hour of stillness, a Willpower point, Perception + Meditation at 9; true jade for a night a success (${ref}).`};
  },

  flagFor(r, {maker = "", at = 0, task = {}, successes = 1} = {}) {
    const o = task.opts ?? {}, ref = refOf(r);
    const base = {key: r.key, line: "kuei-jin", kind: r.kind, maker: String(maker), at: n(at), ref, does: r.does};
    if ( r.kind === "blade" ) { const s = K.SHAPES[o.shape] ?? K.SHAPES.sword; return {...base, shape: o.shape || "sword", damage: {bonus: s.bonus + 2, type: "aggravated"}}; }
    const attune = KIND[o.attune] ? o.attune : "yang", nights = Math.max(1, n(successes)), label = `${KIND[attune]} Chi`;
    return {...base, attune, nights, pool: {label, value: 0, max: 2}, expires: n(at) + nights * NIGHT,
      expiresText: `true jade for ${nights} night${nights === 1 ? "" : "s"} from its making`, expiredText: "it is ordinary jade again",
      powers: [
        {id: "absorb", label: `Take in ${label} (once a night, where the Wall is 6 or lower)`, perNight: true, gain: {amount: "successes"},
          roll: {dice: 2, diff: 9, label: "The jade (two dice)", ask: {label: "The local Wall (6 or lower)", min: 1, max: 6, value: 6, add: 3}},
          text: `The jade drinks in ambient Chi: a point a success, two at most (${K.KOTE} pp. 86-87).`},
        {id: "draw", label: `Draw a point of ${label} (a turn)`, transfer: {from: "item", to: `actor:${CHI[attune]}`, amount: 1, cap: 10},
          text: "A turn of concentration with a hand on the jade. Chi spent from it still counts against the Dharma's limit a turn."},
        {id: "burst", label: "A roll spending its Chi botched", consume: true, roll: {dice: 2, diff: 6, label: "Two dice of lethal damage"},
          text: `The jade bursts. Each success is a level of lethal damage to the one who used it, soaked as usual (${r.book} p. ${r.page}).`}
      ]};
  },

  itemsFor(r, {maker = "", at = 0, task = {}, successes = 1} = {}) {
    if ( !r ) return [];
    const flag = kueiJinKit.flagFor(r, {maker, at, task, successes});
    if ( r.kind === "blade" ) {
      const s = K.SHAPES[flag.shape] ?? K.SHAPES.sword;
      return [{name: `Stone ${s.label.split(/[ ,]/)[0].toLowerCase()}`, type: "Melee Weapon", img: "icons/svg/sword.svg",
        system: {description: para(r.does) + para(`${flag.ref}; damage from the ${K.V20} Melee Weapons Chart (p. 281).`), reference: flag.ref, difficulty: 6, conceal: s.conceal,
          attack: {attribute: "dexterity", ability: "melee", accuracy: 0, isrollable: true}, damage: {attribute: "strength", bonus: s.bonus + 2, type: "aggravated", isrollable: true}},
        flags: {"wodx-library": {wonder: flag}}}];
    }
    if ( task.opts?.target ) return [];
    return [{name: `True jade (${KIND[flag.attune]})`, type: "Item", img: "icons/svg/item-bag.svg",
      system: {description: para(r.does) + para(`It stays true jade for ${flag.nights} night${flag.nights === 1 ? "" : "s"}.`) + para(`${flag.ref}.`), reference: flag.ref},
      flags: {"wodx-library": {wonder: flag}}}];
  },
  marks: (r, t = {}) => r?.kind === "jade" && !!t.opts?.target,
  costs: () => [],

  /** Turn the carried piece of jade true. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const a = services.actor, o = t.opts ?? {};
    if ( status === "ruined" ) return [r.kind === "jade" ? "The jade stays ordinary stone." : "The stone will not take the shape."];
    if ( status !== "done" || r.kind !== "jade" || !a || !o.target ) return [];
    const it = a.items?.get?.(o.target);
    if ( !it ) return ["The jade was not there at the end."];
    const flag = kueiJinKit.flagFor(r, {maker: a.name, at: globalThis.game?.time?.worldTime ?? 0, task: t, successes: n(t.total)});
    await it.update({"flags.wodx-library.wonder": flag, "system.description": `${it.system?.description ?? ""}${para(r.does)}${para(`True jade for ${flag.nights} night${flag.nights === 1 ? "" : "s"}.`)}`});
    return [`${it.name} is true jade, attuned to ${KIND[flag.attune]}, for ${flag.nights} night${flag.nights === 1 ? "" : "s"}.`];
  },
  label: r => r.name,
  detail: (r, t = {}) => t.note ?? "",
  intro: m => `Jade Shintai ${n(m.jade)}, Willpower ${n(m.willpower)}.`,
  approvalText: "is there stone to hand, or jade?"
};

registerLine("kuei-jin", kueiJinKit);
