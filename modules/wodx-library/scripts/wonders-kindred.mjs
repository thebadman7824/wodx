/**
 * WoDX Library: the Kindred kit for the wonders registry (B3693-B3699). Blood sorcery that makes or marks objects:
 * Thaumaturgy (and k2: Dark Thaumaturgy, Assamite, Setite and Koldunic sorcery by the same rules) and Necromancy.
 * Data in data/wonders-kindred.mjs; no Foundry calls here except in after(), which gets the actor as a service.
 *
 * A ritual is one roll (maxRolls 1, B3696): Intelligence + Occult at 3 + level, at most 9, after its preparation, its
 * blood paid before the roll. Enchant Talisman is the long one: a roll a week for four weeks, seven blood a week, 20
 * net successes or the talisman is ruined (V20 pdf 247; V20 Dark Ages pdf 310 lets a Willpower buy a success).
 * The result marks an object the caster holds (the item gains the ward, the stored blood, the burrowing tip) or, with
 * no object picked, makes a new one; the item's powers then run from the Use window (wonder-powers.mjs).
 */
import * as K from "../data/wonders-kindred.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const BLOOD = "system.advantages.bloodpool.temporary";
const WP = "system.advantages.willpower.temporary";
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];

/** Dark Ages rules for this year? (B3694) */
export const isDA = year => n(year) > 0 && n(year) < K.DA_UNTIL;
export const levelOf = (r, year) => (isDA(year) && r.daLevel ? r.daLevel : r.level);
export const pdfOf = (r, year) => (isDA(year) && r.daPdf ? r.daPdf : r.pdf);
export const bookOf = (r, year) => (isDA(year) && r.daPdf ? K.DA : r.book);
/** The roll's difficulty: 3 + level, at most 9 (V20 pdf 238, V20 Dark Ages pdf 303). */
export const diffOf = (r, year) => r.roll?.diff ?? Math.min(9, 3 + levelOf(r, year));
/** Blood at the casting: the ritual's own, or one in the Dark Ages where it names none (V20 Dark Ages pdf 303). */
export const bloodOf = (r, year) => (isDA(year) && !r.blood && !r.needs?.match(/silver|salt|marble|holy water/) ? 1 : n(r.blood));

const low = s => String(s ?? "").toLowerCase();
const fits = (mark, it) => {
  const name = low(it?.name), type = it?.type;
  if ( !mark || mark === "any" ) return true;
  if ( mark === "weapon" ) return type === "Melee Weapon" || type === "Ranged Weapon";
  if ( mark === "wood" ) return /stake|spear|arrow|bolt|cue|staff|pike|lance|javelin|club|wood/.test(name);
  if ( mark === "container" ) return /cup|jug|flask|bottle|vial|jar|goblet|chalice|mug|tankard|canteen|pitcher|ewer/.test(name);
  if ( mark === "bone" ) return /bone|skull|teeth|tooth|rib|femur|knuckle/.test(name);
  if ( mark === "mirror" ) return /mirror/.test(name);
  if ( mark === "small" ) return type !== "Melee Weapon" || /dagger|knife/.test(name);
  if ( mark === "rigid" ) return type === "Melee Weapon" || /staff|stick|cane|rod|wand|sword|cue|violin|pointer|shotgun|spear/.test(name);
  return true;
};

export const kindredKit = {
  title: "Vampire: blood sorcery",
  noun: "a ritual on an object",
  setting: "craftKindred",
  settingName: "Making ritual objects (Vampire blood sorcery)",
  settingHint: "Thaumaturges and necromancers cast the rituals that work on objects: wards that hurt their kind, stored vitae, rowan shafts, Bones of Lies, baleful dolls and the month-long talisman. The finished ritual marks the object, and its powers run from the Use window.",
  settingDefault: true,
  ref: "Rituals roll Intelligence + Occult at 3 + level, at most 9 (V20 book p. 230, pdf 238; Necromancy pdf 185; V20 Dark Ages pdf 303).",
  rows: () => K.RITUALS,
  row: key => K.byKey[key] ?? null,

  /** actorData: {system, items, flags}; ctx: {profile, year}. */
  factsFrom(a = {}, ctx = {}) {
    const items = a.items ?? [];
    const sorcery = {thaumaturgy: 0, necromancy: 0}, names = {thaumaturgy: "", necromancy: ""};
    for ( const i of items ) {
      if ( i?.type !== "Power" || !/discipline/.test(String(i?.system?.type ?? "")) ) continue;
      const s = K.SORCERIES.find(x => x.match.test(String(i.name)));
      if ( s && n(i.system?.value) > sorcery[s.key] ) { sorcery[s.key] = n(i.system?.value); names[s.key] = s.label; }
    }
    const rituals = items.filter(i => i?.type === "Power" && i?.system?.type === "wod.types.ritual").map(i => String(i.name));
    const sys = a.system ?? {};
    const occult = n(sys.abilities?.occult?.value ?? items.find(i => i?.type === "Ability" && /^occult$/i.test(i.name))?.system?.value);
    const wits = n(sys.attributes?.wits?.total ?? sys.attributes?.wits?.value);
    return {profile: ctx.profile ?? "mortal", year: n(ctx.year), name: String(a.name ?? ""), sorcery, names, rituals,
      blood: n(sys.advantages?.bloodpool?.temporary), willpower: n(sys.advantages?.willpower?.temporary), witsOccult: wits + occult,
      objects: items.filter(i => i?.type && !["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"].includes(i.type))
        .map(i => ({id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type, wonder: i.flags?.["wodx-library"]?.wonder?.key ?? "", maker: i.flags?.["wodx-library"]?.wonder?.maker ?? ""}))};
  },
  makerOf(f = {}) {
    const ok = f.profile === "kindred" && (n(f.sorcery?.thaumaturgy) > 0 || n(f.sorcery?.necromancy) > 0);
    return {...f, kind: ok ? "kindred" : null};
  },
  listFor(m, {year} = {}) {
    if ( !m?.kind ) return [];
    const y = n(year ?? m.year);
    return K.RITUALS.filter(r => n(m.sorcery?.[r.path]) > 0 && (!r.eras || (isDA(y) ? r.eras.includes("da") : r.eras.includes("v20"))));
  },
  groups: rows => [{label: "Thaumaturgy rituals", rows: rows.filter(r => r.path === "thaumaturgy")}, {label: "Necromancy rituals", rows: rows.filter(r => r.path === "necromancy")}],

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such ritual"];
    if ( !m.kind ) out.push("only Kindred with Thaumaturgy or Necromancy cast these");
    const lvl = levelOf(r, m.year), rating = n(m.sorcery?.[r.path]);
    if ( rating < lvl ) out.push(`needs ${r.path === "necromancy" ? "Necromancy" : "Thaumaturgy"} ${lvl} or more`);
    const known = (m.rituals ?? []).some(x => low(x).replace(/[^a-z]/g, "").includes(low(r.name).replace(/^the /, "").replace(/[^a-z]/g, "")));
    if ( !known ) out.push(`does not know ${r.name}`);
    const blood = r.talisman ? 7 : bloodOf(r, m.year);
    if ( n(m.blood) < blood ) out.push(`needs ${blood} blood point${blood === 1 ? "" : "s"}, has ${n(m.blood)}`);
    const t = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    if ( o.target && !t ) out.push("that object is no longer carried");
    if ( t && !fits(r.mark, t) ) out.push(`${t.name} will not take this ritual (${r.needs})`);
    if ( t?.wonder && !r.talisman ) out.push(`${t.name} already holds a ritual`);
    if ( r.talisman && (m.objects ?? []).some(x => x.wonder === "enchant-talisman" && x.maker === m.name) ) out.push("a thaumaturge may have only one talisman at a time");
    if ( r.key === "da-ward" && !ATTRS.includes(o.wardAttr) ) out.push("pick the Attribute the ward tests");
    return out;
  },
  cautions(r, m = {}) {
    const out = [`Needs ${r.needs}.`];
    if ( r.roll ) out.push(`Made with ${r.roll.attr} + ${r.roll.ability} at difficulty ${r.roll.diff}, not the usual ritual roll.`);
    if ( r.key === "vitae-infusion" ) out.push("Made for an ally, the ally must be there, and the blood is still the caster's.");
    if ( r.ward ) out.push("Wards hurt any of their kind who touch the object, the caster's allies too.");
    if ( r.talisman && isDA(m.year) ) out.push("Dark Ages: a point of Willpower on a weekly roll buys an automatic success.");
    if ( r.house ) out.push("Part of this entry is a house reading (logged for review).");
    return out;
  },
  fields(m = {}, {isGM = false} = {}) {
    const objs = (m.objects ?? []).filter(x => !x.wonder);
    return [
      {name: "target", label: "On which object", type: "select", value: "", options: [["", "A new object (described by the ritual)"], ...objs.map(x => [x.id, x.name])],
        hint: "A ward, a stored blood point or a rowan shaft goes on something the caster has. Leave it on a new object to make one."},
      {name: "wardAttr", label: "The Attribute a Dark Ages Ward tests", type: "select", value: "", options: [["", "(not a Dark Ages Ward)"], ...ATTRS.map(a => [a, a[0].toUpperCase() + a.slice(1)])]},
      ...(isDA(m.year) ? [{name: "willpower", label: "Spend a Willpower each week for a success (talisman)", type: "checkbox", value: false}] : [])
    ];
  },

  taskFor(r, m = {}, o = {}) {
    const y = m.year, lvl = levelOf(r, y);
    const roll = r.roll ?? {attr: "intelligence", ability: "occult"};
    const target = o.target ? (m.objects ?? []).find(x => x.id === o.target) : null;
    const opts = {target: target?.id ?? "", targetName: target?.name ?? "", wardAttr: ATTRS.includes(o.wardAttr) ? o.wardAttr : "", year: n(y),
      rating: n(m.sorcery?.[r.path]), witsOccult: n(m.witsOccult), da: isDA(y)};
    if ( r.talisman ) {
      const per = [{path: BLOOD, amount: 7, floor: 0, label: "seven blood points, one each night of the week"}];
      if ( isDA(y) && o.willpower ) per.push({path: WP, amount: 1, floor: 0, adds: 1, label: "a Willpower for an automatic success"});
      return {kind: "wonder", line: "kindred", name: `Enchant a talisman${target ? `: ${target.name}` : ""}`, attr: "intelligence", ability: "occult",
        diff: 8, goal: 20, interval: "week", maxRolls: 4, delicate: true, delay: 0, perRoll: per, opts,
        note: `${r.name}: one lunar month, four weekly rolls of Intelligence + Occult at 8 for 20 net successes (${bookOf(r, y)}, pdf ${pdfOf(r, y)}).`};
    }
    const blood = bloodOf(r, y);
    return {kind: "wonder", line: "kindred", name: `${r.name}${target ? ` on ${target.name}` : ""}`, attr: roll.attr, ability: roll.ability,
      diff: diffOf(r, y), goal: 1, interval: "hour", maxRolls: 1, delicate: true, delay: n(r.delay),
      perRoll: blood ? [{path: BLOOD, amount: blood, floor: 0, label: `${blood} blood point${blood === 1 ? "" : "s"} for the ritual`}] : [], opts,
      note: `Level ${lvl} ${r.path === "necromancy" ? "Necromancy" : "Thaumaturgy"} ritual: ${r.needs} (${bookOf(r, y)}, pdf ${pdfOf(r, y)}).`};
  },

  /** The wonder flag the ritual leaves (on a new item or merged onto the chosen one). */
  flagFor(r, {successes = 1, maker = "", at = 0, task = {}} = {}) {
    const o = task.opts ?? {}, y = n(o.year), it = r.item ?? {};
    const ref = `${bookOf(r, y)}, pdf ${pdfOf(r, y)}`;
    const base = {key: r.key, line: "kindred", kind: "ritual", maker: String(maker), at: n(at), ref, does: r.does};
    let powers = (it.powers ?? []).map(p => {
      const q = {...p};
      if ( p.rollMaker ) q.roll = {dice: p.rollMaker === "witsOccult" ? n(o.witsOccult) : n(o.rating), diff: p.diff, label: p.rollMaker === "witsOccult" ? "The caster's Wits + Occult" : "The caster's Thaumaturgy"};
      delete q.rollMaker; delete q.diff;
      return q;
    });
    const extra = {};
    if ( it.ward ) {
      const kind = it.ward;
      powers = [{id: "touch", label: `One of the ${kind} touches it`, gm: true, roll: {dice: it.dice, diff: 6, label: "Lethal damage"},
        text: `The ${kind.replace(/s$/, "")} takes these as lethal damage, again at each touch; touching it on purpose costs a point of Willpower.${it.sparesMaker ? ` It does not hurt ${maker || "its caster"}.` : ""}`}];
      extra.ward = {against: kind, hurts: K.WARD_HURTS[kind] ?? [], dice: it.dice, spares: it.sparesMaker ? String(maker) : ""};
    }
    if ( it.daWard ) {
      const lvl = levelOf(r, y);
      extra.ward = {attr: o.wardAttr, level: lvl};
      powers = [{id: "move", label: "Someone tries to move it", gm: true, text: `Only someone with ${o.wardAttr || "the warded Attribute"} ${lvl} or more can move it even slightly.`}];
    }
    if ( it.chargesBySuccess ) extra.uses = {value: Math.max(1, n(successes)), max: Math.max(1, n(successes))};
    if ( it.servant ) extra.life = `${5 * Math.max(1, n(successes))} turns`;
    if ( r.talisman ) {
      extra.talisman = {da: !!o.da};
      powers = [{id: "find", label: "Sense where the talisman is", roll: {attr: "perception", ability: "occult", diff: 7}, text: "Successes show the maker where it is."}];
    }
    return {...base, ...(it.pool ? {pool: {...it.pool}} : {}), ...(it.emptySpent ? {emptySpent: true} : {}), ...(it.spentText ? {spentText: it.spentText} : {}),
      ...(it.oneUse ? {oneUse: true} : {}), ...extra, powers};
  },

  /** A new object when no target was picked; the chosen object is marked in after(). */
  itemsFor(r, {successes = 1, maker = "", at = 0, task = {}} = {}) {
    if ( !r || task.opts?.target ) return [];
    const flag = kindredKit.flagFor(r, {successes, maker, at, task});
    const it = r.item ?? {}, ref = flag.ref;
    const name = it.label ?? (r.ward ? `Warded object (${r.name})` : r.key === "da-ward" ? "Warded object" : r.name);
    const desc = para(r.does) + (flag.life ? para(`Lasts ${flag.life} once loosed.`) : "") + (flag.uses ? para(`${flag.uses.value} charge${flag.uses.value === 1 ? "" : "s"}.`) : "") + para(`${ref}.`);
    const img = it.weapon ? "icons/svg/sword.svg" : "icons/svg/item-bag.svg";
    if ( it.weapon ) {
      const x = it.weapon;
      return [{name, type: "Melee Weapon", img, system: {difficulty: x.diff, damage: {attribute: x.attr, bonus: x.bonus, type: x.type, isrollable: true},
        attack: {attribute: "dexterity", ability: x.ability, accuracy: 0, isrollable: true}, istwohanded: false, conceal: "", description: desc, reference: ref},
        flags: {"wodx-library": {wonder: flag}}}];
    }
    return [{name, type: "Item", img, system: {description: desc, reference: ref}, flags: {"wodx-library": {wonder: flag}}}];
  },

  /** True when the work marks an object the caster holds (Storyteller then expects no new item). */
  marks: (r, t = {}) => !!t.opts?.target,

  /** Blood is paid by the task before each roll (perRoll); nothing more at the end. */
  costs: () => [],

  /** Mark the chosen object, or say what a failure means. services.actor: the Foundry actor. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const out = [], a = services.actor;
    if ( status === "done" && t.opts?.target && a ) {
      const item = a.items?.get?.(t.opts.target);
      if ( !item ) out.push(`${t.opts.targetName || "The object"} was not there at the end: the ritual took on nothing.`);
      else {
        const flag = kindredKit.flagFor(r, {successes: Math.max(1, n(t.total)), maker: a.name, at: globalThis.game?.time?.worldTime ?? 0, task: t});
        const up = {"flags.wodx-library.wonder": flag, "system.description": `${item.system?.description ?? ""}${para(`${r.name}: ${r.does}`)}${para(`${flag.ref}.`)}`};
        if ( r.talisman && item.type === "Melee Weapon" ) {
          up["system.attack.accuracy"] = n(item.system?.attack?.accuracy) + 1;
          if ( t.opts?.da ) up["system.damage.bonus"] = n(item.system?.damage?.bonus) + 2;
        }
        await item.update(up);
        out.push(`${item.name} now holds ${r.name}.`);
      }
    }
    if ( status === "done" && r.talisman ) out.push(t.opts?.da
      ? "While held: two more dice on the primary path, one on rituals, no casting time for rituals of level 4 or less; as a weapon, a die more to hit and two more damage. Anyone else holding it gets three dice against its maker."
      : "While held: magic aimed at its maker is one harder; two more dice on the primary path, one on rituals; as a weapon, a die more to hit. Anyone else holding it gets three dice against its maker.");
    if ( status === "ruined" ) out.push(t.ruinedBy === "rolls"
      ? (r.talisman ? "Twenty successes were not reached by the new moon: the talisman is ruined and must be begun again." : "The ritual failed: nothing happens, though the Storyteller may make it seem otherwise.")
      : "A botch: something goes badly wrong, perhaps a summoned thing with a temper (V20 pdf 238).");
    return out;
  },
  label: r => `${r.name} (${r.path === "necromancy" ? "Necromancy" : "Thaumaturgy"} ${r.level})`,
  detail: (r, t = {}) => `${t.attr} + ${t.ability} at difficulty ${t.diff}${t.goal > 1 ? `, ${t.goal} successes in ${t.maxRolls} rolls` : ""}. ${r.needs}.`,
  intro: m => `Thaumaturgy ${n(m.sorcery?.thaumaturgy)}, Necromancy ${n(m.sorcery?.necromancy)}, blood ${n(m.blood)}.${isDA(m.year) ? " Dark Ages rituals." : ""}`,
  approvalText: "are the materials at hand?"
};

registerLine("kindred", kindredKit);
