/**
 * WoDX Library: the Mage kit for the wonders registry (B3684-B3688). No Foundry calls here.
 *
 * Ben's Item Crafting Desk picks, all full: m1 Wonders (a Talisman, or a Device for the Technocracy) built from the
 * Effect keywords WoDX Actions already knows, m2 charms and periapts, m3 mage fetishes from the Garou list. The Book
 * of Secrets steps (pdf 152-162) run as one extended Arete roll: the energy and the investment each want three
 * successes a dot, at the highest Sphere + 4 (+ 3 in a Sanctum), less up to 3 for purification. The foundation (an
 * Attribute + Ability roll the Storyteller sets) is narrated. A finished Wonder carries its Effects as powers with
 * its own Arete, its Quintessence and its Paradox (the wonder-powers shape on flags.wodx-library.wonder).
 */
import {MAGE_WONDERS, MAGE_FETISH, DIFF, byKey as mageByKey} from "../data/wonders-mage.mjs";
import {WONDERS as GAROU_ROWS, MAKES} from "../data/wonders.mjs";
import {KEYWORDS, spheresFor, leanOf} from "../../wodx-actions/scripts/effects-rules.js";
import {SPHERES} from "../../wodx-actions/scripts/m20-rules.js";
import {registerLine} from "./wonder-registry.mjs";
import * as GR from "./wonder-rules.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const TECH = /technocra|iteration\s*x|new world order|progenitor|syndicate|void engineer|\bnwo\b/i;

/** Mage fetishes: the Garou list (not the Bane fetishes, the breed fetishes or talens), bound by Sphere magick. */
const FETISH_ROWS = GAROU_ROWS.filter(w => w.kind === "fetish" && !w.wyrm && !w.breeds).map(w => ({...w, key: `fetish-${w.key}`, garou: w.key, line: "mage",
  kind: "fetish", book: w.book, pdf: w.pdf}));
const ROWS = [...MAGE_WONDERS.map(w => ({...w, line: "mage"})), ...FETISH_ROWS];
const BY = Object.fromEntries(ROWS.map(w => [w.key, w]));

/** The Effect keywords a mage may seal into a Wonder, from the options picked. */
export const effectsOf = (o = {}) => [...new Set([o.effect1, o.effect2, o.effect3].map(x => String(x ?? "")).filter(k => KEYWORDS[k]))];

/** A Wonder's dots: the highest Sphere its Effects need (M20 pdf 654); a periapt's are picked (1 to 5). */
export function dotsOf(w, o = {}, known = {}) {
  if ( w?.kind === "periapt" ) return Math.max(1, Math.min(5, Math.round(n(o.dots) || 1)));
  if ( w?.kind === "fetish" ) return n(w.level);
  const {used} = spheresFor(effectsOf(o), known);
  return Math.max(1, ...used.map(u => n(u.level)));
}

/** Every Sphere minimum the work needs: the row's own (or its alternative) and the Effects', as {sphere: level}. */
export function needsOf(w, o = {}, known = {}) {
  if ( !w ) return {};
  if ( w.kind === "fetish" ) return o.forced ? {...MAGE_FETISH.needsForced} : {...MAGE_FETISH.needsWilling};
  const base = (w.alt && ((w.alt.fits && o.fits) || (w.alt.living && o.living))) ? Object.fromEntries(Object.entries(w.alt).filter(([k]) => SPHERES.includes(k))) : {...w.needs};
  const need = {...base};
  for ( const u of spheresFor(effectsOf(o), known).used ) need[u.sphere] = Math.max(n(need[u.sphere]), n(u.level));
  return need;
}

/** The Arete roll's difficulty (Book of Secrets pdf 157). */
export function difficultyOf(w, o = {}, known = {}) {
  const top = Math.max(0, ...Object.values(needsOf(w, o, known)).map(n));
  return Math.max(DIFF.floor, Math.min(10, top + (o.sanctum ? DIFF.sanctum : DIFF.vulgar) - Math.max(0, Math.min(DIFF.purifyMax, Math.round(n(o.purify))))));
}

/** Successes wanted. */
export function goalOf(w, o = {}, known = {}) {
  if ( !w ) return 1;
  if ( w.kind === "fetish" ) return MAGE_FETISH.goalPerLevel * Math.max(1, n(w.level));
  if ( w.kind === "charm" ) return w.goalPerItem * Math.max(1, Math.round(n(o.count) || 1));
  if ( w.kind === "trinket" ) return w.goalPerFeat * Math.max(1, ...effectsOf(o).map(k => n(KEYWORDS[k]?.feat) || 1));
  return (w.goalPerDot ?? 3) * dotsOf(w, o, known);
}

const isTech = m => m?.practice === "tech";
const named = (w, m) => (isTech(m) && w.tech ? w.tech : w.name);

export const mageKit = {
  title: "Mage",
  noun: "a Wonder, charm, periapt or fetish",
  setting: "craftMage",
  settingName: "Making Wonders, charms, periapts and fetishes (Mage)",
  settingHint: "Mages seal the Effects they know into Talismans or Devices, make one-use charms and Quintessence periapts, and bind spirits into fetishes, by M20 and the Book of Secrets. The finished Wonder carries its Effects with its own Arete, its Quintessence and its Paradox.",
  settingDefault: true,
  ref: "M20 Book of Secrets, Crafting Wonders (pdf 152-162): Prime 4 and the Effects' Spheres for a Talisman or Device, Prime 2 or 3 for a charm, Matter or Life 5 with Prime 3 for a periapt, Spirit 4 or Prime 4 for a fetish; extended Arete at the highest Sphere + 4 (+ 3 in a Sanctum).",
  rows: () => ROWS,
  row: key => BY[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const s = a.system ?? {}, adv = s.advantages ?? {};
    const spheres = Object.fromEntries(SPHERES.map(k => [k, n(s.spheres?.[k]?.value)]));
    const who = [s.affiliation, s.tradition, s.convention, s.custom?.tradition, s.bio?.affiliation, s.bio?.tradition].filter(x => typeof x === "string").join(" ");
    return {profile: ctx.profile ?? "mortal", arete: n(adv.arete?.permanent), willpower: n(adv.willpower?.permanent), spheres,
      quintessence: n(s.quintessence?.temporary), practice: TECH.test(who) ? "tech" : "mystic", year: n(ctx.year)};
  },
  makerOf: f => ({...f, kind: f?.profile === "mage" && n(f.arete) >= 1 ? "mage" : null}),
  listFor: m => (m?.kind ? ROWS : []),
  groups: rows => [{label: "Wonders", rows: rows.filter(w => w.kind !== "fetish")}, {label: "Fetishes (a bound spirit)", rows: rows.filter(w => w.kind === "fetish")}],

  blockers(w, m, o = {}) {
    const out = [];
    if ( !w ) return ["no such item"];
    if ( !m?.kind ) return ["only an Awakened mage with Arete makes Wonders"];
    const need = needsOf(w, o, m.spheres);
    const short = Object.entries(need).filter(([s, l]) => n(m.spheres?.[s]) < l).map(([s, l]) => `${s[0].toUpperCase()}${s.slice(1)} ${l}`);
    if ( short.length ) out.push(`needs ${short.join(", ")}`);
    const fx = effectsOf(o), miss = spheresFor(fx, m.spheres).missing;
    if ( miss.length ) out.push(`does not know the Spheres for ${miss.map(k => KEYWORDS[k].label).join(", ")}`);
    if ( w.kind === "talisman" ) {
      if ( !fx.length ) out.push("pick at least one Effect to seal into it");
      const dots = dotsOf(w, o, m.spheres);
      if ( fx.length > dots ) out.push(`a ${dots}-dot Wonder holds at most ${dots} Effect${dots === 1 ? "" : "s"}`);
      if ( n(m.quintessence) < w.quintPerDot * dots ) out.push(`needs ${w.quintPerDot * dots} Quintessence, has ${n(m.quintessence)}`);
    }
    if ( (w.kind === "charm" || w.kind === "trinket") && fx.length !== 1 ) out.push("holds exactly one Effect");
    if ( w.kind === "charm" && Math.round(n(o.count) || 1) > 2 * n(m.arete) ) out.push(`makes at most ${2 * n(m.arete)} charms at once (twice Arete)`);
    return out;
  },
  cautions(w, m) {
    const out = [];
    if ( w?.kind === "talisman" ) out.push(`${named(w, m)}: one permanent Willpower is sealed into it${isTech(m) ? " (a Union facility waives it)" : ""}; the Quintessence is paid when it is finished (house reading).`);
    if ( w?.kind === "periapt" ) out.push("Needs ten points of Tass of one kind, fused in; mixed Tass leaves a flaw.");
    if ( w?.kind === "fetish" ) out.push(`A forced spirit makes an unreliable fetish. ${MAGE_FETISH.use}`);
    out.push("The foundation comes first: the Storyteller sets an Attribute + Ability roll to craft the object itself.");
    return out;
  },
  fields(m, {isGM = false} = {}) {
    const fx = [["", "(none)"], ...Object.entries(KEYWORDS).map(([k, K]) => [k, K.label])];
    return [
      {name: "practice", label: "Practice", type: "select", value: m?.practice ?? "mystic", options: [["mystic", "Mystic (Talisman, Charm, Periapt)"], ["tech", "Enlightened Science (Device, Gadget, Matrix)"]]},
      {name: "effect1", label: "Effect", type: "select", value: "", options: fx},
      {name: "effect2", label: "Second Effect (Talisman or Device)", type: "select", value: "", options: fx},
      {name: "effect3", label: "Third Effect (Talisman or Device)", type: "select", value: "", options: fx},
      {name: "dots", label: "Periapt dots (5 Quintessence each)", type: "number", min: 1, max: 5, value: 1},
      {name: "count", label: "Charms at one sitting", type: "number", min: 1, max: Math.max(1, 2 * n(m?.arete)), value: 1},
      {name: "fits", label: "The energy fits the charm (Prime 2 is enough)", type: "checkbox", value: false},
      {name: "living", label: "A living periapt (Life 5 for Matter 5)", type: "checkbox", value: false},
      {name: "forced", label: "Force an unwilling spirit (fetish, Spirit 4)", type: "checkbox", value: false},
      {name: "sanctum", label: "Worked in the mage's Sanctum (+3, not +4)", type: "checkbox", value: false},
      {name: "purify", label: "Purification (0 to 3 off)", type: "number", min: 0, max: 3, value: 0},
      ...(isGM ? [{name: "facility", label: "At a Union facility (no Willpower sealed in a Device)", type: "checkbox", value: false, gm: true}] : [])
    ];
  },
  courtOf: w => (w?.kind === "fetish" ? w.court : ""),

  taskFor(w, m, o = {}) {
    const fx = effectsOf(o), dots = dotsOf(w, o, m?.spheres ?? {});
    const name = w.kind === "fetish" ? `Bind a fetish: ${w.name}` : `Make a ${named(w, {practice: o.practice ?? m?.practice})}${fx.length ? ` (${fx.map(k => KEYWORDS[k].label).join(", ")})` : ""}`;
    return {kind: "wonder", line: "mage", name, attr: "", ability: "", pool: "path:system.advantages.arete.permanent",
      diff: difficultyOf(w, o, m?.spheres ?? {}), goal: goalOf(w, o, m?.spheres ?? {}), interval: "week", delicate: true, delay: 0,
      forced: !!o.forced, spend: dots,
      opts: {effects: fx, dots, count: Math.max(1, Math.round(n(o.count) || 1)), practice: o.practice === "tech" ? "tech" : "mystic", living: !!o.living, facility: !!o.facility,
        lean: leanOf(fx), top: Math.max(0, ...spheresFor(fx, m?.spheres ?? {}).used.map(u => n(u.level)))},
      note: `${w.kind === "fetish" ? "Mage fetish" : named(w, {practice: o.practice})}: extended Arete, ${goalOf(w, o, m?.spheres ?? {})} successes. The foundation is crafted first (the Storyteller's roll).`};
  },

  itemsFor(w, {maker = "", at = 0, task = {}} = {}) {
    if ( !w ) return [];
    const o = task.opts ?? {}, fx = (o.effects ?? []).filter(k => KEYWORDS[k]), dots = Math.max(1, n(o.dots) || n(task.spend) || 1);
    const tech = o.practice === "tech", name = tech && w.tech ? w.tech : w.name, ref = `${w.book}, pdf ${w.pdf}`;
    const vulgar = (o.lean ?? leanOf(fx)) === "vulgar";
    const top = Math.max(1, n(o.top));
    const power = (k, extra = {}) => ({id: k, label: KEYWORDS[k].label, text: KEYWORDS[k].does,
      roll: {dice: w.kind === "trinket" ? 0 : dots, diff: Math.min(10, top + (vulgar ? 4 : 3))},
      ...(vulgar ? {drawback: {path: "system.paradox.temporary", amount: 1, max: 20, label: "1 Paradox (a vulgar Effect)"}} : {}), ...extra});
    const flag = extra => ({key: w.key, line: "mage", kind: w.kind, maker: String(maker), at: n(at), ref, does: w.does, ...extra});
    const fxName = fx.map(k => KEYWORDS[k].label).join(", ");
    const desc = extra => para(w.does) + (fxName ? para(`Effects: ${fxName}.`) : "") + (extra ?? "") + para(`${ref}.`);
    if ( w.kind === "fetish" ) {
      const g = GR.byKey[w.garou];
      const [item, ...rest] = GR.itemsFor(g, {maker, at, spirit: task.spirit});
      item.flags["wodx-library"].wonder = {...item.flags["wodx-library"].wonder, line: "mage", key: w.key, mage: true, unreliable: !!task.forced, use: MAGE_FETISH.use};
      item.system.description += para(MAGE_FETISH.use) + (task.forced ? para("Bound by force: an unreliable fetish.") : "");
      return [item, ...rest];
    }
    if ( w.kind === "talisman" ) return [{name: `${name}${fxName ? ` of ${fxName}` : ""}`, type: "Item", img: "icons/svg/item-bag.svg",
      system: {description: desc(para(`Arete ${dots}; holds ${5 * dots} Quintessence.${vulgar ? " Its vulgar Effects bring Paradox to whoever uses it." : ""}`)), reference: ref},
      flags: {"wodx-library": {wonder: flag({arete: dots, effects: fx, vulgar, pool: {label: "Quintessence", value: 5 * dots, max: 5 * dots}, powers: fx.map(k => power(k))})}}}];
    if ( w.kind === "charm" ) return Array.from({length: Math.max(1, Math.round(n(o.count) || 1))}, () => ({name: `${tech ? "Gadget" : "Charm"}${fxName ? ` of ${fxName}` : ""}`, type: "Item", img: "icons/svg/item-bag.svg",
      system: {description: desc(para("One use: spent when its Effect is called.")), reference: ref},
      flags: {"wodx-library": {wonder: flag({arete: dots, effects: fx, vulgar, oneUse: true, powers: fx.map(k => power(k, {uses: 1}))})}}}));
    if ( w.kind === "periapt" ) {
      const max = 5 * dots, start = Math.min(max, w.tass ?? 10);
      return [{name: `${tech ? "Matrix" : "Periapt"} (${dots} dot${dots === 1 ? "" : "s"})`, type: "Item", img: "icons/svg/item-bag.svg",
        system: {description: desc(para(`Holds up to ${max} Quintessence; starts with ${start} from the Tass fused into it (house reading).`)), reference: ref},
        flags: {"wodx-library": {wonder: flag({dots, living: !!o.living, pool: {label: "Quintessence", value: start, max},
          powers: [{id: "draw", label: "Draw Quintessence", text: "A turn of focus moves Quintessence from the periapt to the mage.", transfer: {from: "item", to: "actor:system.quintessence.temporary", amount: 1, need: {path: "system.spheres.prime.value", min: 2}}},
            {id: "refuel", label: "Pour Quintessence in", text: "A turn of focus moves the mage's own Quintessence into the periapt.", transfer: {from: "actor:system.quintessence.temporary", to: "item", amount: 1, need: {path: "system.spheres.prime.value", min: 2}}}]})}}}];
    }
    return [{name: `${name}${fxName ? ` (${fxName})` : ""}`, type: "Item", img: "icons/svg/item-bag.svg",
      system: {description: desc(para("Always at work; needs no Arete to use and no roll.")), reference: ref},
      flags: {"wodx-library": {wonder: flag({effects: fx, trinket: true})}}}];
  },

  /** A Talisman or Device seals the Quintessence and one permanent Willpower (Book of Secrets pdf 161, M20 pdf 653). */
  costs(w, t = {}) {
    if ( w?.kind !== "talisman" || t.status !== "done" ) return [];
    const dots = Math.max(1, n(t.opts?.dots) || n(t.spend) || 1), out = [{path: "system.quintessence.temporary", amount: 5 * dots, floor: 0, label: `${5 * dots} Quintessence invested.`}];
    if ( !(t.opts?.practice === "tech" && t.opts?.facility) ) out.push({path: "system.advantages.willpower.permanent", amount: 1, floor: 1, cap: "system.advantages.willpower.temporary", label: "1 permanent Willpower sealed into it."});
    return out;
  },
  async after({row: w, task: t = {}, status, services = {}} = {}) {
    const out = [];
    if ( w?.kind === "fetish" && status === "done" && t.forced ) { try { await services.spirits?.move?.(services.actor, "bound", {court: w.court, why: `forced a spirit into the ${w.name}`}); out.push("The spirit was forced: its court remembers, and the fetish is unreliable."); } catch (e) { /* Otherworlds off */ } }
    if ( w?.kind === "fetish" && status === "ruined" ) { try { await services.spirits?.move?.(services.actor, "slight", {court: w.court, why: `a botched binding (${w.name})`}); } catch (e) { /* Otherworlds off */ } }
    if ( status === "ruined" ) out.push("A botch: the work collapses, and the Storyteller decides what it costs (Book of Secrets pdf 152).");
    if ( status === "done" && t.opts?.lean === "vulgar" ) out.push("Its Effects are vulgar: using one before Sleepers brings Paradox.");
    return out;
  },
  label: w => (w.kind === "fetish" ? `${w.name} (level ${w.level}, Gnosis ${w.gnosis})` : `${w.name} / ${w.tech}`),
  detail: (w, t = {}) => `Extended Arete at difficulty ${t.diff}, ${t.goal} successes, one roll a week.`,
  intro: m => `Arete ${n(m.arete)}, Quintessence ${n(m.quintessence)}; ${SPHERES.filter(s => n(m.spheres?.[s])).map(s => `${s[0].toUpperCase()}${s.slice(1)} ${m.spheres[s]}`).join(", ") || "no Spheres"}.`,
  approvalText: "are the materials, the Tass and the time at hand?"
};

registerLine("mage", mageKit);
export {mageByKey};
