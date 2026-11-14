/**
 * WoDX Library: the Werewolf kit for the wonders registry (B3683). Wraps wonder-rules.mjs (B3630-B3636, B3680-B3682)
 * so WoDX Storyteller can treat Garou like every other line. No Foundry calls here.
 */
import * as W from "./wonder-rules.mjs";
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Rituals dots: the system's ability, or an Ability item of that name. */
function ritualsOf(a) {
  const v = a?.system?.abilities?.rituals?.value;
  if ( v !== undefined ) return n(v);
  const it = (a?.items ?? []).find(i => i?.type === "Ability" && /^rituals$/i.test(String(i?.name)));
  return n(it?.system?.value);
}

export const garouKit = {
  title: "Werewolf and the Changing Breeds",
  noun: "a fetish or talen",
  setting: "craftGarou",
  settingName: "Making fetishes and talens (Werewolf and the Changing Breeds)",
  settingHint: "Garou and the other Changing Breeds pick a fetish or talen from the book lists, bind the spirit it needs, and the finished work makes the real item: a klaive also becomes a weapon and costs Gnosis for its silver. Black Spiral Dancers bind Banes into the Wyrm's fetishes, the baneklaive among them.",
  settingDefault: true,
  ref: W.MAKES.fetish.ref,
  rows: () => W.WONDERS,
  row: key => W.byKey[key] ?? null,

  /** actorData: {system, items: [{type, name, system}], flags}; ctx: {profile, gender, settings: {craftKinfolk}}. */
  factsFrom(a = {}, ctx = {}) {
    const sys = a.system ?? {}, adv = sys.advantages ?? {};
    const tribe = [sys.tribe, sys.custom?.tribe, sys.bio?.tribe].filter(x => typeof x === "string").join(" ");
    return {profile: ctx.profile ?? "mortal", gender: ctx.gender ?? "", kinfolk: a.flags?.world?.wodx?.kinfolk ?? null,
      kinfolkMay: !!ctx.settings?.craftKinfolk, tribe, breed: sys.changingbreed ?? "",
      gnosis: n(adv.gnosis?.permanent), willpower: n(adv.willpower?.permanent ?? sys.willpower?.permanent), rituals: ritualsOf(a),
      rites: (a.items ?? []).filter(i => i?.type === "Power" && i?.system?.type === "wod.types.rite").map(i => i.name)};
  },
  makerOf: f => W.makerOf(f),
  listFor: (m, o) => W.listFor(m, {line: "garou", ...(o ?? {})}),
  groups: rows => [{label: "Fetishes (Rite of the Fetish)", rows: rows.filter(w => w.kind === "fetish")},
    {label: "Talens (Rite of Binding)", rows: rows.filter(w => w.kind === "talen")}],
  blockers: (w, m, o) => W.blockers(w, m, o),
  cautions: (w, m) => W.cautions(w, m),
  fields: (m, {isGM = false} = {}) => [
    {name: "spend", label: "Gnosis spent at the rite", type: "number", min: 0, max: n(m?.gnosis), value: 0,
      hint: "A fetish: permanent Gnosis, two off the difficulty each. A talen: temporary Gnosis, at least one, each lowering the spirit's Gnosis by one."},
    ...(isGM ? [{name: "persuasion", label: "Persuasion (fetish, 0 to 3 off)", type: "number", min: 0, max: 3, value: 0, gm: true}] : []),
    {name: "power", label: "The spirit (talens)", type: "select", value: "gaffling",
      options: [["gaffling", "A Gaffling"], ["jaggling", "A Jaggling (two more talens)"], ["greater", "A greater spirit (three more)"]]},
    {name: "forced", label: "Forced in (beaten to 0 Essence first)", type: "checkbox", value: false}
  ],
  courtOf: w => w?.court ?? "",
  taskFor: (w, m, o = {}) => ({...W.taskFor(w, m, {spend: o.spend, persuasion: o.persuasion, court: o.court, strength: o.power, forced: o.forced}), line: "garou"}),
  itemsFor: (w, {successes = 1, maker = "", at = 0, task = {}} = {}) => W.itemsFor(w, {successes, strength: task.power, spirit: task.spirit, maker, at}),
  /** A fetish costs permanent Gnosis (temporary held under it), a talen temporary Gnosis (B3631). */
  costs(w, t = {}) {
    if ( !n(t.spend) ) return [];
    const perm = w?.kind !== "talen";
    return [{path: `system.advantages.gnosis.${perm ? "permanent" : "temporary"}`, amount: n(t.spend), floor: 0,
      cap: perm ? "system.advantages.gnosis.temporary" : "", label: `${n(t.spend)} ${perm ? "permanent" : "temporary"} Gnosis spent at the rite.`}];
  },
  /** Spirit courts remember a forced spirit and a botched binding; silver is noted. services.spirits: Otherworlds api. */
  async after({row: w, task: t = {}, status, services = {}} = {}) {
    const out = [], sp = services.spirits, a = services.actor;
    if ( status === "done" ) {
      if ( t.forced ) { try { await sp?.move?.(a, "bound", {court: w.court, why: `forced a spirit into the ${w.name}`}); out.push("The spirit was forced: its court remembers."); } catch (e) { /* Otherworlds off */ } }
      if ( w.silver ) out.push(`Carrying it costs ${w.silver} from the bearer's effective Gnosis.`);
    } else if ( status === "ruined" ) {
      try { await sp?.move?.(a, "slight", {court: w.court, why: `a botched binding (${w.name})`}); } catch (e) { /* Otherworlds off */ }
      out.push("A botch: the vessel is spoiled and the spirit leaves angry.");
    }
    return out;
  },
  label: w => W.label(w),
  detail: (w, t = {}) => `Spirit: ${w.spirit}. Difficulty ${t.diff}${t.pool === "willpower" ? " (Willpower)" : " (Wits + Rituals)"}, ${n(t.spend)} Gnosis to spend.`,
  intro: m => `Gnosis ${m.gnosis}, Willpower ${m.willpower}, Rituals ${m.rituals}.${m.kind === "kinfolk" ? " Kinfolk making fetishes is a house rule in this world." : ""}`,
  approvalText: "is the spirit found and willing?"
};

registerLine("garou", garouKit);
