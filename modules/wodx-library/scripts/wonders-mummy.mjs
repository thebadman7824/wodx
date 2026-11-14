/**
 * WoDX Library: the Mummy kit for the wonders registry (B3706-B3711). Amulets, ushabti and other effigies, and the Sekhem
 * Vessel (Mummy: The Resurrection, every era). Data in data/wonders-mummy.mjs; no Foundry calls here except in after(),
 * which gets the actor as a service.
 *
 *   The thing to inscribe is made or bought first; the maker then inscribes it, an extended roll of the ritual's pool
 *     (its trait + the Hekau path) gathering successes equal to the ritual's Sekhem (pdf 85 to 86, 102).
 *   Sekhem: the book has the whole cost put in over the work, with rest and meditation between; WoDX takes a point of
 *     Sekhem with each roll and pauses when the pool is dry (a house reading, B3707).
 *   An amulet lasts Amulets + Balance months (its end date is written on it) and can be renewed with one success.
 *   Talismans give their Attribute while worn; wards are the Storyteller's to apply; a Vessel holds what was put in.
 *   Servitors and creatures are made as NPC companions; each costs its upkeep in Sekhem.
 *   Active amulets and effigies a maker has made: at most Balance + the higher of Amulets and Effigy (pdf 73).
 */
import * as M from "../data/wonders-mummy.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const SEKHEM = "system.advantages.sekhem.temporary";
const SEKHEM_MAX = "system.advantages.sekhem.permanent";
const MONTH = 30 * 86400;
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const NOT_THINGS = ["Power", "Ability", "Advantage", "Sphere", "Realm", "Bonus", "Experience", "Feature", "Splat", "Trait"];
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const getp = (o, path) => path.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
const val = v => n(v && typeof v === "object" ? (v.total ?? v.value ?? v.permanent) : v);

/** Hekau path ratings from Power items of the hekau kind (as WoDX Actions reads them). */
function pathsOf(items = []) {
  const out = {amulets: 0, effigy: 0};
  for ( const i of items ) {
    if ( i?.type !== "Power" || !/types\.hekau$/.test(String(i.system?.type ?? "")) ) continue;
    const s = String(i.name ?? "").toLowerCase();
    for ( const k of Object.keys(out) ) if ( s.includes(k.replace(/s$/, "")) ) out[k] = Math.max(out[k], n(i.system?.value));
  }
  return out;
}

/** How many of the maker's amulets and effigies are still working. */
export const activeCount = (objects = [], maker = "") => objects.filter(o => o.line === "mummy" && !o.spent && o.counts && (!maker || o.maker === maker)).length;
export const limitOf = m => n(m.balance) + Math.max(n(m.paths?.amulets), n(m.paths?.effigy));

export const mummyKit = {
  title: "Mummy: amulets and effigies",
  noun: "an amulet or an effigy",
  setting: "craftMummy",
  settingName: "Making amulets and effigies (Mummy)",
  settingHint: "The Reborn inscribe amulets (talismans that raise an Attribute, wards) and effigies (ushabti servants, creature figures, Sekhem Vessels) with Hekau rituals, within their limit of active works.",
  settingDefault: true,
  ref: "Crafting an amulet: Mummy: The Resurrection pdf 85 to 86; an effigy pdf 102; the limit on active works pdf 73.",
  rows: () => M.ROWS,
  row: key => M.byKey[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const sys = a.system ?? {}, adv = sys.advantages ?? {}, items = a.items ?? [];
    const traits = {};
    for ( const [k, t] of Object.entries(M.TRAITS) ) traits[k] = val(getp(a, t.path));
    // Thanatology is not on the system's sheet: an Ability item of that name counts, added as dice (B3708)
    const extra = {};
    for ( const i of items ) if ( i?.type === "Ability" && /thanatology/i.test(String(i.name ?? "")) ) extra.thanatology = Math.max(n(extra.thanatology), n(i.system?.value));
    if ( traits.thanatology ) extra.thanatology = 0;
    else traits.thanatology = n(extra.thanatology);
    const known = items.filter(i => i?.type === "Power").map(i => String(i.name ?? "").toLowerCase());
    return {profile: ctx.profile ?? "mortal", name: String(a.name ?? ""), paths: pathsOf(items), traits, extra, known,
      balance: n(adv.balance?.permanent), sekhem: n(adv.sekhem?.temporary), sekhemMax: n(adv.sekhem?.permanent),
      objects: items.filter(i => i?.type && !NOT_THINGS.includes(i.type)).map(i => {
        const w = i.flags?.["wodx-library"]?.wonder;
        return {id: String(i._id ?? i.id ?? ""), name: String(i.name ?? ""), type: i.type, wonder: w?.key ?? "", line: w?.line ?? "",
          maker: String(w?.maker ?? ""), spent: !!w?.spent, counts: !!w?.counts, vessel: !!w?.vessel};
      })};
  },
  makerOf: f => ({...f, kind: f.profile === "mummy" && (f.paths.amulets || f.paths.effigy) ? "mummy" : null}),
  listFor: m => (m?.kind ? M.ROWS.filter(r => n(m.paths?.[r.path]) >= r.level) : []),
  groups: rows => Object.entries(M.PATHS).map(([k, label]) => ({label, rows: rows.filter(r => r.path === k)})),

  blockers(r, m = {}, o = {}) {
    const out = [];
    if ( !r ) return ["no such ritual"];
    if ( !m.kind ) return ["only the Reborn work Hekau"];
    if ( n(m.paths?.[r.path]) < r.level ) out.push(`needs ${M.PATHS[r.path]} ${r.level}`);
    const short = r.name.replace(/\s*\(.*\)$/, "").toLowerCase(), alt = (r.name.match(/\((.*)\)/)?.[1] ?? "").toLowerCase();
    if ( !(m.known ?? []).some(k => k.includes(short) || (alt && k.includes(alt))) ) out.push(`the maker has not learned ${r.name}`);
    if ( n(m.sekhem) < 1 ) out.push("no Sekhem to put into the work");
    if ( activeCount(m.objects, m.name) >= limitOf(m) ) out.push(`already keeps ${limitOf(m)} amulets and effigies working, the most Balance and Hekau allow`);
    if ( r.item.worn && !ATTRS.includes(o.attr) ) out.push("pick the Attribute the talisman raises");
    if ( r.item.vessel ) {
      const store = Math.round(n(o.store));
      if ( store < 1 ) out.push("pick how much Sekhem the vessel will hold");
      else if ( store > n(m.sekhem) ) out.push(`cannot put in ${store} Sekhem with ${n(m.sekhem)} on hand`);
    }
    return out;
  },
  cautions(r) {
    const out = ["Sekhem is taken a point a roll; the work waits while the pool is empty (rest and meditation refill it)."];
    if ( r.path === "amulets" ) out.push("Amulets help mortals and mummies; on vampires, shapeshifters or spirits they do nothing or worse.");
    if ( r.item.servant ) out.push("The figure is made as a companion with plain traits; the Storyteller can set them from the book's beasts. It needs its upkeep in Sekhem.");
    if ( r.item.vessel ) out.push("The Sekhem it will hold is spent at the end, on top of the ritual's own.");
    return out;
  },
  fields(m = {}) {
    return [
      {name: "attr", label: "The Attribute a talisman raises", type: "select", value: "", options: [["", "(not a talisman)"], ...ATTRS.map(a => [a, a[0].toUpperCase() + a.slice(1)])]},
      {name: "against", label: "What a ward guards against", type: "text", value: "", hint: "A part of the body or one kind of magic."},
      {name: "store", label: "Sekhem the vessel will hold", type: "number", min: 0, max: 10, value: 0}
    ];
  },

  taskFor(r, m = {}, o = {}) {
    const t = M.TRAITS[r.trait], rating = n(m.paths?.[r.path]);
    const extra = n(m.extra?.[r.trait]);
    const opts = {attr: ATTRS.includes(o.attr) ? o.attr : "", against: String(o.against ?? "").slice(0, 80), store: Math.max(0, Math.round(n(o.store))), rating,
      balance: n(m.balance), poolDice: n(m.traits?.[r.trait]) + rating, mendDice: n(m.traits?.craft) + n(m.paths?.effigy)};
    return {kind: "wonder", line: "mummy", name: `Inscribe ${r.name}${opts.attr ? ` (${opts.attr})` : ""}`,
      attr: "intelligence", ability: "", pool: `path:${t.path}`, dice: rating + extra, diff: r.diff, goal: Math.max(1, r.sekhem), interval: "hour",
      delicate: false, delay: 0, opts, perRoll: [{path: SEKHEM, amount: 1, label: "Sekhem put into the inscription", floor: 0}],
      note: `${t.label} + ${M.PATHS[r.path]} (${rating}) at difficulty ${r.diff}, ${r.sekhem} successes; about a day a level of work (${r.book}, pdf ${r.pdf}).`};
  },

  /** The wonder flag the finished work carries. */
  flagFor(r, {maker = "", at = 0, task = {}, balance = 0} = {}) {
    const o = task.opts ?? {}, ref = `${r.book}, pdf ${r.pdf}`, rating = n(o.rating) || r.level;
    const base = {key: r.key, line: "mummy", kind: r.path, maker: String(maker), at: n(at), ref, does: r.does, counts: true};
    const powers = [];
    if ( r.path === "amulets" ) {
      const months = rating + n(balance);
      base.lasts = {months, until: n(at) + months * MONTH};
      powers.push({id: "renew", label: "Renew the inscription", roll: {dice: Math.max(1, n(o.poolDice) || rating), diff: r.diff},
        text: `Five minutes a level and one success; the maker puts in the full ${r.sekhem} Sekhem again (pdf 86). Without it the amulet lapses at the end date.`});
    }
    if ( r.item.worn && o.attr ) base.worn = [{attr: o.attr, value: r.item.worn, label: `${r.name}: +${r.item.worn} ${o.attr}`}];
    if ( r.item.ward ) powers.push({id: "ward", label: `Ward rating ${r.item.ward}${o.against ? ` against ${o.against}` : ""}`, gm: true,
      text: `The ward takes ${r.item.ward} from the dice or successes of the harm it guards against (see ${ref}).`});
    if ( r.item.soakVs ) powers.push({id: "soak", label: `Soak ${r.item.soakVs}: +${rating} dice`, text: `Add ${rating} to Stamina to soak harm from ${r.item.soakVs}.`});
    if ( r.item.vessel ) {
      base.vessel = true;
      base.pool = {label: "Sekhem", value: n(o.store), max: n(o.store)};
      base.emptySpent = false;
      powers.push({id: "draw", label: "Draw Sekhem (Balance, difficulty 4)", roll: {path: "system.advantages.balance.permanent", diff: 4},
        transfer: {from: "item", to: `actor:${SEKHEM}`, amount: "successes", cap: SEKHEM_MAX}, text: "Each success moves a point into the user, never past their Sekhem rating. One vessel at a time helps a mummy."});
      powers.push({id: "fill", label: "Fill it (Effigy artisans)", transfer: {from: `actor:${SEKHEM}`, to: "item", amount: 1}, gm: false,
        text: "Only one who knows Effigy pours Sekhem in."});
    }
    if ( r.item.servant ) {
      const s = r.item.servant;
      base.servant = {health: s.health, fights: s.fights, upkeep: s.upkeep, every: s.every};
      powers.push({id: "upkeep", label: `Keep it moving (${s.upkeep} Sekhem a ${s.every})`, spend: {pool: `actor:${SEKHEM}`, amount: s.upkeep},
        text: "Without its Sekhem the figure is inert until fed again."});
      if ( s.health ) powers.push({id: "mend", label: "Mend a level (Crafts + Effigy, difficulty 6, 1 Sekhem)", roll: {dice: Math.max(1, n(o.mendDice) || rating), diff: 6}, spend: {pool: `actor:${SEKHEM}`, amount: 1},
        text: "Its maker repairs one wound at a time (pdf 102)."});
    }
    return {...base, powers};
  },

  itemsFor(r, {maker = "", at = 0, task = {}, successes = 0} = {}) {
    if ( !r ) return [];
    const flag = mummyKit.flagFor(r, {maker, at, task, balance: task.opts?.balance});
    const desc = para(r.does) + (flag.lasts ? para(`The inscription lasts ${flag.lasts.months} months unless renewed.`) : "") + para(`${flag.ref}.`);
    const name = r.item.servant ? `${r.name}: its figure` : r.item.worn && task.opts?.attr ? `${r.name} (${task.opts.attr})` : r.name;
    return [{name, type: "Item", img: r.item.servant ? "icons/svg/statue.svg" : "icons/svg/item-bag.svg",
      system: {description: desc, reference: flag.ref}, flags: {"wodx-library": {wonder: flag}}}];
  },

  costs(r, t = {}) {
    if ( !r?.item?.vessel || t.status !== "done" ) return [];
    const s = Math.max(0, n(t.opts?.store));
    return s ? [{path: SEKHEM, amount: s, floor: 0, label: `${s} Sekhem poured into the vessel.`}] : [];
  },

  /** Write the end date on an amulet; make a servitor or creature as a companion. */
  async after({row: r, task: t = {}, status, services = {}} = {}) {
    const out = [], a = services.actor;
    if ( status === "ruined" ) return ["The inscription is spoiled; the Sekhem put in is gone."];
    if ( status !== "done" || !a ) return out;
    if ( r.path === "amulets" ) {
      const months = (n(t.opts?.rating) || r.level) + n(t.opts?.balance);
      out.push(`It holds for ${months} months unless renewed.`);
    }
    if ( r.item.servant ) {
      try {
        const s = r.item.servant;
        const own = Object.fromEntries(Object.entries(a.ownership ?? {}).filter(([, v]) => n(v) >= 3));
        const attributes = Object.fromEntries(Object.entries(s.attrs).map(([k, v]) => [k, {value: v}]));
        const [c] = await globalThis.Actor.createDocuments([{name: `${a.name}'s ${r.name.replace(/\s*\(.*\)$/, "").toLowerCase()}`, type: "Creature", ownership: {default: 0, ...own},
          system: {attributes}, flags: {"wodx-library": {effigy: {maker: a.id, key: r.key, health: s.health, fights: s.fights, upkeep: s.upkeep, every: s.every, leads: !!s.leads, noWoundPenalty: true}}}}]);
        if ( c ) out.push(`${c.name} wakes: ${s.health} health levels, ${s.fights ? "it can fight" : "it cannot fight"}; ${s.upkeep} Sekhem a ${s.every} keeps it going.`);
      } catch (e) { out.push("The figure is ready; the Storyteller makes its sheet."); }
    }
    return out;
  },
  label: r => `${r.name} (${M.PATHS[r.path]} ${r.level})`,
  detail: (r, t = {}) => `${t.note ?? ""}`,
  intro: m => `Balance ${n(m.balance)}, Sekhem ${n(m.sekhem)}; Amulets ${n(m.paths?.amulets)}, Effigy ${n(m.paths?.effigy)}; ${activeCount(m.objects, m.name)} of ${limitOf(m)} works active.`,
  approvalText: "is the thing to inscribe ready, and has the maker the time?"
};

registerLine("mummy", mummyKit);
