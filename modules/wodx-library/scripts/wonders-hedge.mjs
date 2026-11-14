/**
 * WoDX Library: the hedge magic kit for the wonders registry (B3810-B3813). No Foundry calls here.
 *
 * Ben's Item Crafting Desk pick m4 (full): a finished Enchantment makes an item with its level, its uses and the
 * power it holds. Sorcerer (Revised), the Path of Enchantment (pdf 72-75), is the book: a ritual-only path. The
 * object is crafted first (a Crafts roll, narrated; a fine result helps), then the Enchantment takes one to three days
 * a level and ends in one Intelligence + Occult roll (Intelligence + Science for a technosorcerer) at difficulty
 * 4 + the level, one less for an Enchantment the sorcerer has mastered, with a point of Willpower. Anyone who knows
 * the path can enchant: hedge sorcerers, hunters of the Hunters Hunted era, Kinfolk, ghouls.
 */
import {registerLine} from "./wonder-registry.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const para = s => `<p>${String(s ?? "").replace(/[<>&]/g, c => ({"<": "&lt;", ">": "&gt;", "&": "&amp;"})[c])}</p>`;
const BOOK = "Sorcerer (Revised)";
const ATTRS = ["strength", "dexterity", "stamina", "charisma", "manipulation", "appearance", "perception", "intelligence", "wits"];
const cap = s => `${s[0].toUpperCase()}${s.slice(1)}`;

/** The five levels, in WoDX's words (pdf 73-75). most: the largest bonus a talisman of that level gives. */
export const LEVELS = [
  {key: "enchant-1", level: 1, name: "Minor talisman", most: 2, pdf: 73,
    does: "A small, quiet boon no one would take for magic: a dot or two to a trait, a point off a difficulty, restful sleep."},
  {key: "enchant-2", level: 2, name: "Lesser talisman", most: 2, pdf: 73,
    does: "A stronger version of a minor boon, or a subtle change to the world that someone watching might notice."},
  {key: "enchant-3", level: 3, name: "Talisman", most: 3, pdf: 74,
    does: "Plainly magical to anyone who knows the signs and very strange to anyone who doesn't: a personal ward against sorcery, a blade that harms the dead."},
  {key: "enchant-4", level: 4, name: "Greater talisman", most: 5, pdf: 74,
    does: "Bends reality hard within its limits: traits past human peak, or a power like the first two dots of a Discipline or Gift."},
  {key: "enchant-5", level: 5, name: "Mythic talisman", most: 5, pdf: 75,
    does: "Close to legend: small miracles, often with a steep price or a strange condition for using it."}
].map(w => ({...w, kind: "talisman", line: "hedge", book: BOOK}));
const BY = Object.fromEntries(LEVELS.map(w => [w.key, w]));

/** What the talisman does. */
export const POWERS = {
  attr: {label: "Dots to an Attribute while carried", text: a => `Adds ${a} to the bearer's chosen Attribute while carried.`},
  dice: {label: "Dice to one kind of roll", text: a => `Adds ${a} dice to one kind of roll the Storyteller names (shooting, dancing, seeing far).`},
  diff: {label: "Difficulty off one kind of roll", text: a => `Takes ${a} off the difficulty of one kind of roll the Storyteller names.`},
  damage: {label: "Extra damage dice", text: a => `Adds ${a} dice of damage to what it strikes.`},
  soak: {label: "Soak dice", text: a => `Gives the bearer ${a} extra dice of soak against lethal harm.`},
  ward: {label: "A ward against magic", text: a => `Takes ${a} dice from any magic aimed at the bearer.`},
  other: {label: "Something else (the Storyteller writes it)", text: () => "Does what the Storyteller and the sorcerer agreed."}
};
export const USES = {always: "Always at work", daily: "Once a day", charges: "As many times as the roll's successes, then spent", once: "Once, then spent"};

/** The difficulty of the Enchantment roll (pdf 73): 4 + level, less one for a mastered Enchantment; a fine object takes one more off (house). */
export const difficultyOf = (w, o = {}) => Math.max(3, Math.min(10, 4 + n(w?.level) - (o.mastered ? 1 : 0) - (o.fine ? 1 : 0)));

/** Days of work before the roll: two a level, the middle of the book's one to three (house). */
export const daysOf = w => 2 * Math.max(1, n(w?.level));

/** The Enchantment path dots: a Power item of the numina type named for it (as WoDX Actions' hedge magic reads it). */
function pathOf(a) {
  const it = (a?.items ?? []).filter(i => i?.type === "Power" && /numina/.test(String(i?.system?.type ?? "")) && !/power$/.test(String(i?.system?.type ?? "")))
    .find(i => /^(path\s*of\s*)?enchant/i.test(String(i?.name ?? "").trim()));
  return n(it?.system?.value);
}

export const hedgeKit = {
  title: "Hedge magic: Enchantment",
  noun: "an enchanted talisman",
  setting: "craftHedge",
  settingName: "Enchanting talismans (hedge magic)",
  settingHint: "Sorcerers who know the Path of Enchantment (Sorcerer Revised) make talismans: one roll at the end of the work, a point of Willpower, and the finished item carries its power and its uses.",
  settingDefault: true,
  ref: "Sorcerer (Revised), Path of Enchantment (pdf 72-75): ritual only; craft the object, then 1 to 3 days a level and Intelligence + Occult (Science for technosorcerers) at 4 + level, 1 Willpower; -1 when mastered.",
  rows: () => LEVELS,
  row: key => BY[key] ?? null,

  factsFrom(a = {}, ctx = {}) {
    const s = a.system ?? {}, ab = s.abilities ?? {};
    return {profile: ctx.profile ?? "mortal", path: pathOf(a), occult: n(ab.occult?.value), science: n(ab.science?.value), craft: n((ab.craft ?? ab.crafts)?.value),
      willpower: n(s.advantages?.willpower?.temporary ?? s.willpower?.temporary)};
  },
  makerOf: f => ({...f, kind: n(f?.path) >= 1 ? "enchanter" : null}),
  listFor: m => (m?.kind ? LEVELS.filter(w => w.level <= n(m.path)) : []),

  blockers(w, m, o = {}) {
    if ( !w ) return ["no such item"];
    if ( !m?.kind ) return ["only someone who knows the Path of Enchantment makes these"];
    const out = [];
    if ( w.level > n(m.path) ) out.push(`a level ${w.level} talisman needs Enchantment ${w.level}`);
    const amt = Math.round(n(o.amount) || 1);
    if ( o.power !== "other" && amt > w.most ) out.push(`a ${w.name.toLowerCase()} gives at most ${w.most}`);
    if ( o.power === "attr" && !ATTRS.includes(o.attr) ) out.push("pick the Attribute it raises");
    if ( n(m.willpower) < 1 ) out.push("needs a point of Willpower for the roll");
    return out;
  },
  cautions(w, m) {
    const out = ["The object is crafted first (the Storyteller's Crafts roll); a fine one makes the Enchantment easier.",
      "Most talismans have a keeping: something they need, or they fade. The Storyteller sets it."];
    if ( w?.level >= 4 ) out.push("A talisman this strong may raise a trait past 5 or copy a low power of another kind.");
    return out;
  },
  fields(m) {
    return [
      {name: "power", label: "What it does", type: "select", value: "dice", options: Object.entries(POWERS).map(([k, v]) => [k, v.label])},
      {name: "attr", label: "The Attribute (dots to an Attribute)", type: "select", value: "", options: [["", "(none)"], ...ATTRS.map(a => [a, cap(a)])]},
      {name: "amount", label: "How much (dots, dice or points)", type: "number", min: 1, max: 5, value: 1},
      {name: "uses", label: "How often", type: "select", value: "always", options: Object.entries(USES)},
      {name: "techno", label: "Technosorcery (Intelligence + Science)", type: "checkbox", value: false},
      {name: "mastered", label: "An Enchantment the sorcerer has mastered (-1)", type: "checkbox", value: false},
      {name: "fine", label: "The crafted object came out exceptional (-1, house)", type: "checkbox", value: false}
    ];
  },

  taskFor(w, m, o = {}) {
    const power = POWERS[o.power] ? o.power : "dice", amount = Math.max(1, Math.min(5, Math.round(n(o.amount) || 1)));
    const days = daysOf(w);
    return {kind: "wonder", line: "hedge", name: `Enchant a ${w.name.toLowerCase()} (${POWERS[power].label.toLowerCase()})`,
      attr: "intelligence", ability: o.techno ? "science" : "occult", diff: difficultyOf(w, o), goal: 1, maxRolls: 1, interval: "day", delay: days - 1, delicate: true,
      perRoll: [{path: "system.advantages.willpower.temporary", amount: 1, floor: 0, label: "a point of Willpower"}],
      opts: {power, amount, attr: ATTRS.includes(o.attr) ? o.attr : "", uses: USES[o.uses] ? o.uses : "always", techno: !!o.techno, level: w.level},
      note: `Path of Enchantment: ${days} days of work, then one roll at difficulty ${difficultyOf(w, o)} and a point of Willpower.`};
  },

  itemsFor(w, {successes = 1, maker = "", at = 0, task = {}} = {}) {
    if ( !w ) return [];
    const o = task.opts ?? {}, P = POWERS[o.power] ?? POWERS.dice, amt = Math.max(1, n(o.amount) || 1), s = Math.max(1, n(successes) || n(task.total) || 1);
    const uses = USES[o.uses] ? o.uses : "always", ref = `${BOOK}, pdf ${w.pdf}`;
    const label = o.power === "attr" && o.attr ? `${cap(o.attr)} +${amt}` : P.label;
    const power = {id: "power", label, text: P.text(amt), ...(uses === "daily" ? {perNight: true} : {})};
    const flag = {key: w.key, line: "hedge", kind: "talisman", maker: String(maker), at: n(at), ref, does: w.does, level: w.level, successes: s, power: o.power ?? "dice", amount: amt,
      techno: !!o.techno, powers: [power],
      ...(o.power === "attr" && o.attr ? {worn: [{attr: o.attr, value: amt, label: `${w.name} (Enchantment)`}]} : {}),
      ...(uses === "charges" ? {uses: {value: s, max: s}} : {}), ...(uses === "once" ? {oneUse: true} : {})};
    return [{name: `${w.name}: ${label}`, type: "Item", img: "icons/svg/item-bag.svg",
      system: {description: para(w.does) + para(P.text(amt)) + para(`${USES[uses]}.${uses === "charges" ? ` ${s} use${s === 1 ? "" : "s"}.` : ""}`)
        + para("Its keeping, if it has one, is the Storyteller's to set.") + para(`${ref}.`), reference: ref},
      flags: {"wodx-library": {wonder: flag}}}];
  },
  /** The Willpower is paid on the roll (perRoll); nothing more is taken when it ends. */
  costs: () => [],
  async after({status} = {}) {
    if ( status === "ruined" ) return ["The Enchantment failed: the object stays an ordinary thing, and the Willpower is gone."];
    return [];
  },
  label: w => `${w.name} (level ${w.level})`,
  detail: (w, t = {}) => `One Intelligence + ${t.ability === "science" ? "Science" : "Occult"} roll at difficulty ${t.diff} after ${daysOf(w)} days, and a point of Willpower.`,
  intro: m => `Enchantment ${n(m.path)}, Occult ${n(m.occult)}, Science ${n(m.science)}, Crafts ${n(m.craft)}, Willpower ${n(m.willpower)}.`,
  approvalText: "is the crafted object ready, and the workshop?"
};

registerLine("hedge", hedgeKit);
