/**
 * WoDX Sheets — what each book's character sheet holds, in its order (pure; the harness tests it).
 * An Ability row is [label, key]: a key the system keeps on every actor (system.abilities.<key>), or {second: group}
 * for one the system lacks, kept as a secondary-ability Trait item of that group (talent, skill, knowledge).
 * Paths: "system.…" is the actor's own data; "flag:wodx-actions.…" is a WoDX flag.
 */

const S = group => ({ second: group });
const A = "flag:wodx-actions";

/* Ability columns, as each sheet prints them */
const T = {
  alertness: ["Alertness", "alertness"], athletics: ["Athletics", "athletics"], awareness: ["Awareness", "awareness"], brawl: ["Brawl", "brawl"],
  dodge: ["Dodge", "dodge"], empathy: ["Empathy", "empathy"], expression: ["Expression", "expression"], intimidation: ["Intimidation", "intimidation"],
  kenning: ["Kenning", "kenning"], leadership: ["Leadership", "leadership"], legerdemain: ["Legerdemain", S("talent")], primalurge: ["Primal Urge", "primalurge"],
  subterfuge: ["Subterfuge", "subterfuge"],
  animalken: ["Animal Ken", "animalken"], archery: ["Archery", S("skill")], commerce: ["Commerce", S("skill")], crafts: ["Crafts", "craft"],
  etiquette: ["Etiquette", "etiquette"], herbalism: ["Herbalism", S("skill")], melee: ["Melee", "melee"], performance: ["Performance", "performance"],
  ride: ["Ride", S("skill")], stealth: ["Stealth", "stealth"], survival: ["Survival", "survival"],
  academics: ["Academics", "academics"], cosmology: ["Cosmology", "cosmology"], enigmas: ["Enigmas", "enigmas"], gramarye: ["Gramarye", "gremayre"],
  hearthwisdom: ["Hearth Wisdom", S("knowledge")], investigation: ["Investigation", "investigation"], law: ["Law", "law"], linguistics: ["Linguistics", "linguistics"],
  medicine: ["Medicine", "medicine"], occult: ["Occult", "occult"], politics: ["Politics", "politics"], rituals: ["Rituals", "rituals"],
  seneschal: ["Seneschal", S("knowledge")], theology: ["Theology", S("knowledge")]
};
const cols = (t, s, k) => ({ talents: t.map(x => T[x]), skills: s.map(x => T[x]), knowledges: k.map(x => T[x]) });

const sys = (label, path) => ({ label, kind: "system", path });
/** A field the system keeps as a choice (a key it translates): shown here, chosen on the Bio tab. */
const show = (label, path) => ({ label, kind: "show", path });
const ftext = (label, path) => ({ label, kind: "flagText", path });

/**
 * The sheets. Each: actor type, when it applies (see main.mjs), the title, the header (three columns, as printed),
 * the Abilities, and the blocks of the Advantages row, the lower row and the second page.
 * Block kinds are built in main.mjs from the actor (dots, items, list, stat, track, health, experience, text).
 */
export const SHEETS = {
  faeDA: {
    type: "Changeling", book: "Dark Ages: Fae", sheetPage: "pdf pp. 224–225", title: "Dark Ages: Fae", page2Tab: "dreaming",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")],
      [{ label: "Court", kind: "flagSelect", path: `${A}.daFae.court`, options: "courts" }, { label: "Origin", kind: "flagSelect", path: `${A}.daFae.origin`, options: "origins" }, ftext("Agenda", `${A}.daFae.agenda`)]],
    abilities: cols(["alertness", "athletics", "brawl", "dodge", "expression", "intimidation", "kenning", "leadership", "legerdemain", "subterfuge"],
      ["animalken", "archery", "commerce", "crafts", "etiquette", "melee", "performance", "ride", "stealth", "survival"],
      ["enigmas", "gramarye", "hearthwisdom", "investigation", "law", "linguistics", "medicine", "occult", "politics", "seneschal"]),
    advantages: [["dominions"], ["backgrounds"], ["cantrips"]],
    lower: [["willpower", "otherTraits"], ["mistsWeaving"], ["health", "experience"]],
    page2: [["oaths"], ["echoes"], ["features"]], buttons: ["daFae", "daCounter", "daRest"]
  },
  mageDA: {
    type: "Mage", book: "Dark Ages: Mage", sheetPage: "pdf p. 241", title: "Dark Ages: Mage",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), { label: "Fellowship", kind: "flagSelect", path: `${A}.daMage.fellowship`, options: "fellowships" }],
      [ftext("Cabal", `${A}.daMage.cabal`), sys("Concept", "system.concept"), ftext("Mentor", `${A}.daMage.mentor`)]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "dodge", "empathy", "expression", "intimidation", "leadership", "subterfuge"],
      ["animalken", "archery", "crafts", "etiquette", "herbalism", "melee", "performance", "ride", "stealth", "survival"],
      ["academics", "cosmology", "enigmas", "hearthwisdom", "investigation", "linguistics", "medicine", "occult", "politics", "theology"]),
    advantages: [["backgrounds"], ["foundation"], ["pillars"]],
    lower: [["otherTraits"], ["quintessence", "willpower", "backlash"], ["health", "experience"]],
    page2: [], buttons: ["daMage", "daQuintessence"]
  },
  inqDA: {
    type: "Hunter", book: "Dark Ages: Inquisitor", sheetPage: "pdf p. 239", title: "Dark Ages: Inquisitor",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), ftext("Impulse", `${A}.inquisitor.impulse`)],
      [{ label: "Order", kind: "flagSelect", path: `${A}.inquisitor.order`, options: "orders" }, sys("Concept", "system.concept"), ftext("Chapter", `${A}.inquisitor.chapter`)]],
    abilities: cols(["alertness", "athletics", "brawl", "dodge", "empathy", "expression", "intimidation", "leadership", "legerdemain", "subterfuge"],
      ["animalken", "archery", "commerce", "crafts", "etiquette", "melee", "performance", "ride", "stealth", "survival"],
      ["academics", "hearthwisdom", "investigation", "law", "linguistics", "medicine", "occult", "politics", "seneschal", "theology"]),
    advantages: [["backgrounds"], ["virtues"], ["superiorVirtues"]],
    lower: [["blessingsCurses", "holyArt"], ["piety", "willpower", "conviction", "callous"], ["health", "experience"]],
    page2: [], buttons: ["hunterSheet", "hunterPower", "prayer"]
  },
  werewolfDA: {
    type: "Werewolf", book: "Dark Ages: Werewolf", sheetPage: "pdf p. 233", title: "Dark Ages: Werewolf",
    header: [[show("Breed", "system.breed"), show("Auspice", "system.auspice"), show("Tribe", "system.tribe")],
      [sys("Pack Name", "system.packname"), sys("Pack Totem", "system.packtotem"), sys("Concept", "system.concept")]],
    // The printed sheet lists Leadership under both Talents and Skills; the book makes it a Skill (DA:W p. 79)
    abilities: cols(["alertness", "athletics", "brawl", "dodge", "empathy", "expression", "intimidation", "primalurge", "subterfuge"],
      ["animalken", "archery", "crafts", "etiquette", "leadership", "melee", "performance", "ride", "stealth", "survival"],
      ["academics", "enigmas", "hearthwisdom", "investigation", "law", "linguistics", "medicine", "occult", "politics", "rituals"]),
    advantages: [["backgrounds"], ["gifts"], ["gifts2"]],
    lower: [["meritsFlaws"], ["rage", "gnosis", "willpower"], ["health", "experience"]],
    page2: [], buttons: ["rageRoll", "useGift", "shiftForm"]
  },
  kindredDA: {
    type: "Vampire", book: "Vampire: The Dark Ages 20th Anniversary Edition", sheetPage: "pdf pp. 472–473", title: "Vampire: The Dark Ages",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")],
      [{ label: "Clan", kind: "computed", key: "clan" }, { label: "Generation", kind: "system", path: "system.generation", number: true }, sys("Sire", "system.sire")]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "legerdemain", "subterfuge"],
      ["animalken", "archery", "commerce", "crafts", "etiquette", "melee", "performance", "ride", "stealth", "survival"],
      ["academics", "enigmas", "hearthwisdom", "investigation", "law", "medicine", "occult", "politics", "seneschal", "theology"]),
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["otherTraits"], ["road", "willpower", "bloodpool"], ["health", "weakness"]],
    page2: [["meritsFlaws", "rituals"], ["paths", "derangements"], ["experience"]], buttons: ["useDiscipline", "frenzy", "feed"]
  },
  ghoulDA: {
    type: "Mortal", book: "Vampire: The Dark Ages 20th Anniversary Edition (the Kindred sheet, for a ghoul)", sheetPage: "pdf pp. 472–473", title: "Vampire: The Dark Ages (ghoul)",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")],
      [{ label: "Domitor", kind: "computed", key: "domitor" }, ftext("Family", `${A}.ghoulFamily`), { label: "Domitor's clan", kind: "computed", key: "domitorClan" }]],
    abilities: null, // the same as the Kindred sheet
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["otherTraits"], ["road", "willpower", "bloodpool"], ["health", "experience"]],
    page2: [["meritsFlaws"], ["derangements"], []], buttons: ["ghoulBlood", "useDiscipline"]
  }
};
SHEETS.ghoulDA.abilities = SHEETS.kindredDA.abilities;
/** Back-compatible name for the first sheet. */
export const FAE_DA = { book: SHEETS.faeDA.book, abilities: SHEETS.faeDA.abilities, dominions: [["Day", "day"], ["Dawn", "dawn"], ["Dusk", "dusk"], ["Night", "night"]] };

const norm = s => String(s ?? "").toLowerCase().replace(/[^a-z]/g, "");

/** The rows of a sheet's Abilities for an actor: {col: [{label, key, id, value, secondary, missing, group}]}. */
export function abilityRows(def, flat = {}, items = []) {
  const out = {};
  for (const [col, rows] of Object.entries(def.abilities)) {
    out[col] = rows.map(([label, key]) => {
      if (typeof key === "string") return { label, key, id: key, value: Number(flat?.[key]?.value) || 0, secondary: false, missing: !flat?.[key] };
      const it = items.find(i => i.type === "Trait" && /secondability$/.test(i.system?.type ?? "") && norm(i.name) === norm(label));
      return { label, key: norm(label), id: it?.id ?? it?._id ?? null, value: Number(it?.system?.value) || 0, secondary: true, missing: !it, group: key.second };
    });
  }
  return out;
}

/** Dots and boxes for a permanent/temporary trait: [{i, dot, box}]. */
export function track(perm = 0, temp = 0, max = 10) {
  return Array.from({ length: max }, (_, k) => ({ i: k + 1, dot: k < Number(perm), box: k < Number(temp) }));
}
/** Dots for a rating. */
export const dots = (v, max = 5) => Array.from({ length: max }, (_, k) => ({ i: k + 1, on: k < Number(v) }));
/** Click on dot i of value v: the same dot again lowers by one (the system's own habit). */
export const clickValue = (v, i) => (Number(v) === Number(i) ? Number(i) - 1 : Number(i));
/** A "flag:" or "system." path as a property path on the actor. */
export const propPath = p => (String(p).startsWith("flag:") ? `flags.${String(p).slice(5)}` : String(p));
/** Every block a sheet uses (for checking that main.mjs builds each). */
export const blocksOf = def => [...def.advantages, ...def.lower, ...(def.page2 ?? [])].flat();
