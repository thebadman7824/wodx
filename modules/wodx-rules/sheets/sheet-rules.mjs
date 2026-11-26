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
  seneschal: ["Seneschal", S("knowledge")], theology: ["Theology", S("knowledge")],
  /* the later eras */
  art: ["Art", "art"], intuition: ["Intuition", "intuition"], intrigue: ["Intrigue", S("talent")], persuasion: ["Persuasion", "persuasion"], streetwise: ["Streetwise", "streetwise"],
  demolitions: ["Demolitions", "demolitions"], drive: ["Drive", "drive"], firearms: ["Firearms", "firearms"], larceny: ["Larceny", "larceny"], martialarts: ["Martial Arts", "martialarts"],
  meditation: ["Meditation", "meditation"], research: ["Research", "research"], security: ["Security", "security"], technology: ["Technology", "technology"],
  leadershipSkill: ["Leadership", "leadership"],
  bureaucracy: ["Bureaucracy", "bureaucracy"], computer: ["Computer", "computer"], esoterica: ["Esoterica", "esoterica"], finance: ["Finance", "finance"], gremayre: ["Gremayre", "gremayre"],
  religion: ["Religion", "religion"], science: ["Science", "science"], researchK: ["Research", "research"]
};
const cols = (t, s, k) => ({ talents: t.map(x => T[x]), skills: s.map(x => T[x]), knowledges: k.map(x => T[x]) });

const sys = (label, path) => ({ label, kind: "system", path });
const calc = (label, key) => ({ label, kind: "computed", key });
/** A field the system keeps as a choice (a key it translates): the Bio tab's own control, mirrored. */
const show = (label, path) => ({ label, kind: "system", path });
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
    page2: [["meritsFlaws", "rotes"], ["derangements", "combat"], ["gear", "description"]], buttons: ["daMage", "daQuintessence"]
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
    page2: [["otherTraits", "derangements"], ["combat"], ["gear", "description"]], buttons: ["hunterSheet", "hunterPower", "prayer"]
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
    page2: [["otherTraits", "rites"], ["fetishes", "derangements"], ["combat", "gear", "description"]], buttons: ["rageRoll", "useGift", "shiftForm"]
  },
  kindredDA: {
    type: "Vampire", book: "Vampire: The Dark Ages 20th Anniversary Edition", sheetPage: "pdf pp. 472–473", title: "Vampire: The Dark Ages",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")],
      [sys("Clan", "system.clan"), sys("Generation", "system.generation"), sys("Sire", "system.sire")]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "legerdemain", "subterfuge"],
      ["animalken", "archery", "commerce", "crafts", "etiquette", "melee", "performance", "ride", "stealth", "survival"],
      ["academics", "enigmas", "hearthwisdom", "investigation", "law", "medicine", "occult", "politics", "seneschal", "theology"]),
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["otherTraits"], ["road", "willpower", "bloodpool"], ["health", "weakness"]],
    page2: [["meritsFlaws", "rituals"], ["paths", "derangements"], ["combat", "gear", "description"]], buttons: ["useDiscipline", "frenzy", "feed"]
  },
  ghoulDA: {
    type: "Mortal", book: "Vampire: The Dark Ages 20th Anniversary Edition (the Kindred sheet, for a ghoul)", sheetPage: "pdf pp. 472–473", title: "Vampire: The Dark Ages (ghoul)",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")],
      [{ label: "Domitor", kind: "computed", key: "domitor" }, ftext("Family", `${A}.ghoulFamily`), { label: "Domitor's clan", kind: "computed", key: "domitorClan" }]],
    abilities: null, // the same as the Kindred sheet
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["otherTraits"], ["road", "willpower", "bloodpool"], ["health", "experience"]],
    page2: [["meritsFlaws", "derangements"], ["combat"], ["gear", "description"]], buttons: ["ghoulBlood", "useDiscipline"]
  }
};
SHEETS.ghoulDA.abilities = SHEETS.kindredDA.abilities;
SHEETS.werewolfDA.abilityNote = "Leadership is a Skill in the Dark Ages (Dark Ages: Werewolf p. 79); the printed sheet also lists it under Talents.";

/* -------- The later eras (Victorian to modern), from each line's printed sheet -------- */
const ND = [show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), sys("Concept", "system.concept")];
const HTR_T = ["alertness", "athletics", "awareness", "brawl", "dodge", "empathy", "expression", "intimidation", "intuition", "leadership", "streetwise", "subterfuge"];
const HTR_S = ["animalken", "crafts", "demolitions", "drive", "etiquette", "firearms", "melee", "performance", "security", "stealth", "survival", "technology"];
Object.assign(SHEETS, {
  v20: {
    type: "Vampire", book: "Vampire: The Masquerade 20th Anniversary Edition", sheetPage: "p. 519", title: "Vampire: The Masquerade",
    header: [ND, [sys("Clan", "system.clan"), sys("Generation", "system.generation"), sys("Sire", "system.sire")]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "streetwise", "subterfuge"],
      ["animalken", "crafts", "drive", "etiquette", "firearms", "larceny", "melee", "performance", "stealth", "survival"],
      ["academics", "computer", "finance", "investigation", "law", "medicine", "occult", "politics", "science", "technology"]),
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["meritsFlaws"], ["road", "willpower", "bloodpool"], ["systemHealth", "weakness", "experience"]],
    page2: [["otherTraits", "rituals"], ["paths", "derangements"], ["combat", "gear", "description"]], buttons: ["useDiscipline", "frenzy", "feed"]
  },
  ghoul20: {
    type: "Mortal", book: "Vampire: The Masquerade 20th Anniversary Edition (the Kindred sheet, for a ghoul)", sheetPage: "p. 519", title: "Vampire: The Masquerade (ghoul)",
    header: [ND, [{ label: "Domitor", kind: "computed", key: "domitor" }, ftext("Family", `${A}.ghoulFamily`), { label: "Domitor's clan", kind: "computed", key: "domitorClan" }]],
    abilities: null,
    advantages: [["disciplines"], ["backgrounds"], ["virtues"]],
    lower: [["meritsFlaws"], ["road", "willpower", "bloodpool"], ["systemHealth", "experience"]],
    page2: [["otherTraits", "derangements"], ["combat"], ["gear", "description"]], buttons: ["ghoulBlood", "useDiscipline"]
  },
  w20: {
    type: "Werewolf", book: "Werewolf: The Apocalypse 20th Anniversary Edition", sheetPage: "pdf p. 552", title: "Werewolf: The Apocalypse",
    header: [[show("Breed", "system.breed"), show("Auspice", "system.auspice"), show("Tribe", "system.tribe")],
      [sys("Pack Name", "system.packname"), sys("Pack Totem", "system.packtotem"), sys("Concept", "system.concept")]],
    abilities: cols(["alertness", "athletics", "brawl", "empathy", "expression", "leadership", "intimidation", "primalurge", "streetwise", "subterfuge"],
      ["animalken", "crafts", "drive", "etiquette", "firearms", "larceny", "melee", "performance", "stealth", "survival"],
      ["academics", "computer", "enigmas", "investigation", "law", "medicine", "occult", "rituals", "science", "technology"]),
    advantages: [["backgrounds"], ["gifts"], ["gifts2"]],
    lower: [["renown", "rank"], ["rage", "gnosis", "willpower"], ["systemHealth", "experience"]],
    page2: [["otherTraits", "rites"], ["fetishes", "derangements"], ["combat", "gear", "description"]], buttons: ["rageRoll", "useGift", "shiftForm"]
  },
  m20: {
    type: "Mage", book: "Mage: The Ascension 20th Anniversary Edition", sheetPage: "p. 249", title: "Mage: The Ascension",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), show("Essence", "system.essence")],
      [show("Affiliation", "system.affiliation"), show("Sect", "system.sect"), sys("Concept", "system.concept")]],
    abilities: cols(["alertness", "art", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "leadership", "streetwise", "subterfuge"],
      ["crafts", "drive", "etiquette", "firearms", "martialarts", "meditation", "melee", "research", "stealth", "survival", "technology"],
      ["academics", "computer", "cosmology", "enigmas", "esoterica", "investigation", "law", "medicine", "occult", "politics", "science"]),
    powers: { title: "Spheres", cols: [["spheres1"], ["spheres2"], ["spheres3"]] },
    advantages: [["backgrounds", "otherTraits"], ["arete", "willpower", "quintessenceWheel"], ["systemHealth", "experience"]],
    lower: [], page2: [["meritsFlaws", "rotes"], ["derangements"], ["combat", "gear", "description"]], buttons: ["m20Cast", "m20Counter"]
  },
  c20: {
    type: "Changeling", book: "Changeling: The Dreaming 20th Anniversary Edition", sheetPage: "p. 500", title: "Changeling: The Dreaming",
    header: [[show("Court", "system.court"), calc("Legacies", "legacies"), show("House", "system.house")],
      [show("Seeming", "system.seeming"), show("Kith", "system.kith"), ftext("Motley", `${A}.c20.motley`)]],
    abilities: cols(["alertness", "athletics", "brawl", "empathy", "expression", "intimidation", "kenning", "leadership", "streetwise", "subterfuge"],
      ["animalken", "crafts", "drive", "etiquette", "firearms", "larceny", "melee", "performance", "stealth", "survival"],
      ["academics", "computer", "enigmas", "gremayre", "investigation", "law", "medicine", "politics", "science", "technology"]),
    advantages: [["backgrounds"], ["arts"], ["realms"]],
    lower: [["birthrights", "antithesis", "experience"], ["glamour", "willpower", "nightmare", "banality"], ["health", "threshold"]],
    page2: [["meritsFlaws", "otherTraits"], ["combat"], ["gear", "description"]], buttons: ["c20Cantrip", "c20Unleash", "c20Mists"]
  },
  wr20: {
    type: "Wraith", book: "Wraith: The Oblivion 20th Anniversary Edition", sheetPage: "pdf pp. 592–593", title: "Wraith: The Oblivion",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), show("Shadow", "system.shadow")],
      [sys("Life", "system.life"), sys("Death", "system.death"), sys("Regret", "system.regret")]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "persuasion", "streetwise", "subterfuge"],
      ["crafts", "drive", "etiquette", "firearms", "larceny", "leadershipSkill", "meditation", "melee", "performance", "stealth"],
      ["academics", "bureaucracy", "computer", "enigmas", "investigation", "medicine", "occult", "politics", "science", "technology"]),
    advantages: [["backgrounds"], ["passions"]],
    lower: [["arcanoi"], ["corpus", "willpower", "pathos"], ["fetters", "experience"]],
    page2: [["psyche", "thorns"], ["angst"], ["darkPassions"]], page2Title: "The Shadow", buttons: ["useArcanos", "passion", "fetter", "shadow"]
  },
  htr: {
    type: "Hunter", book: "Hunter: The Reckoning", sheetPage: "the printed sheet", title: "Hunter: The Reckoning",
    header: [ND, [show("Primary Virtue", "system.primaryvirtue"), show("Creed", "system.creed"), calc("Starting Conviction", "startConviction")]],
    abilities: cols(HTR_T, HTR_S, ["academics", "bureaucracy", "computer", "finance", "investigation", "law", "linguistics", "medicine", "occult", "politics", "researchK", "science"]),
    advantages: [["backgrounds"], ["edges"], ["hunterVirtues"]],
    lower: [["derangements"], ["conviction", "willpower", "experience"], ["systemHealth"]],
    page2: [["meritsFlaws", "otherTraits"], ["combat"], ["gear", "description"]], buttons: ["hunterPower", "hunterSheet", "secondSight"]
  },
  demon: {
    type: "Demon", book: "Demon: The Fallen", sheetPage: "p. 303", title: "Demon: The Fallen",
    header: [ND, [show("House", "system.house"), show("Faction", "system.faction"), sys("Visage", "system.visage")]],
    abilities: cols(HTR_T, HTR_S, ["academics", "computer", "finance", "investigation", "law", "linguistics", "medicine", "occult", "politics", "religion", "researchK", "science"]),
    advantages: [["backgrounds"], ["lores"], ["virtues"]],
    lower: [["apocalypticForm"], ["faith", "torment", "willpower"], ["systemHealth", "experience"]],
    page2: [["meritsFlaws", "otherTraits"], ["derangements", "combat"], ["gear", "description"]], buttons: ["demonEvoke", "demonForm", "demonReap"]
  },
  mummy: {
    type: "Mummy", book: "Mummy: The Resurrection", sheetPage: "the printed sheet", title: "Mummy: The Resurrection",
    header: [ND, [show("Amenti", "system.amenti"), sys("Hamartia", "system.hamartia"), sys("Inheritance", "system.inheritance")]],
    abilities: cols(HTR_T, ["animalken", "crafts", "drive", "etiquette", "firearms", "melee", "meditation", "performance", "security", "stealth", "survival", "technology"],
      ["academics", "bureaucracy", "computer", "cosmology", "enigmas", "investigation", "law", "linguistics", "medicine", "occult", "researchK", "science"]),
    advantages: [["backgrounds"], ["hekau"], ["meritsFlaws"]],
    lower: [["otherTraits", "experience"], ["balance", "willpower", "sekhem"], ["systemHealth"]],
    page2: [["derangements"], ["combat"], ["gear", "description"]], buttons: ["mummyCast", "mummySekhem", "mummyBalance"]
  },
  kote: {
    type: "Vampire", book: "Kindred of the East", sheetPage: "the printed sheet", title: "Kindred of the East",
    header: [[show("Nature", "system.nature"), sys("P'o Nature", "system.ponature"), show("Demeanor", "system.demeanor")],
      [sys("Balance", "system.balance"), show("Direction", "system.direction"), sys("Wu", "system.wu")]],
    abilities: cols(["alertness", "athletics", "brawl", "dodge", "empathy", "expression", "intimidation", "leadership", "streetwise", "subterfuge"],
      ["animalken", "crafts", "drive", "etiquette", "firearms", "martialarts", "melee", "performance", "stealth", "survival"],
      ["computer", "finance", "investigation", "law", "linguistics", "medicine", "occult", "politics", "rituals", "science"]),
    advantages: [["disciplines"], ["backgrounds"], ["rites"]],
    lower: [["yinYang"], ["dharma", "hun", "willpower", "po", "demonchi"], ["systemHealth", "imbalance", "experience"]],
    page2: [["meritsFlaws", "otherTraits"], ["derangements", "combat"], ["gear", "description"]], buttons: ["kotFeed", "kotSpend", "kotDharma"]
  },
  orpheus: {
    type: "Mortal", book: "Orpheus", sheetPage: "p. 310", title: "Orpheus",
    header: [[show("Nature", "system.nature"), show("Demeanor", "system.demeanor"), show("Shade", "system.variant.shade")],
      [show("Lament", "system.variant.lament"), sys("Role", "system.variant.role")]],
    abilities: cols(["alertness", "athletics", "awareness", "brawl", "empathy", "expression", "intimidation", "intrigue", "intuition", "leadership", "streetwise", "subterfuge"],
      ["animalken", "crafts", "drive", "etiquette", "firearms", "meditation", "melee", "performance", "security", "stealth", "survival", "technology"],
      ["academics", "bureaucracy", "computer", "enigmas", "finance", "investigation", "law", "linguistics", "medicine", "occult", "politics", "science"]),
    advantages: [["backgrounds"], ["horrors"], ["stains"]],
    lower: [["defaultAbilities"], ["vitality", "willpower", "spite"], ["systemHealth", "experience"]],
    page2: [["meritsFlaws", "otherTraits"], ["derangements", "combat"], ["gear", "description"]], buttons: ["orphHorror", "orphVitality", "orphSpite"]
  }
});
SHEETS.ghoul20.abilities = SHEETS.v20.abilities;
/** The Dark Ages sheets, and those of the later eras. */
export const DA_SHEETS = ["faeDA", "mageDA", "inqDA", "werewolfDA", "kindredDA", "ghoulDA"];
export const LATER_SHEETS = ["v20", "ghoul20", "w20", "m20", "c20", "wr20", "htr", "demon", "mummy", "kote", "orpheus"];
/** Orpheus's default Horrors, as the sheet lists them (Orpheus, the chapter pages given there). */
export const ORPHEUS_DEFAULTS = [["Dead-Eyes", "p. 82"], ["Detect Nature Group", "p. 148"], ["Incorporeal and Invisible", "p. 82"], ["Manifest", "p. 82"],
  ["Misery Loves Company", "p. 149"], ["Sense Lifeline", "p. 150"], ["Sever the Strand", "p. 150"], ["Thievery", "p. 151"]];
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
/** Click on dot i of value v, as the system's own sheets do: the dot sets the value, and the first dot of a 1 clears it. */
export const clickValue = (v, i) => (Number(i) === 1 && Number(v) === 1 ? 0 : Number(i));
/** A "flag:" or "system." path as a property path on the actor. */
export const propPath = p => (String(p).startsWith("flag:") ? `flags.${String(p).slice(5)}` : String(p));
/** Every block a sheet uses (for checking that main.mjs builds each). */
export const blocksOf = def => [...(def.powers?.cols ?? []), ...def.advantages, ...def.lower, ...(def.page2 ?? [])].flat();

/** The header fields that are WoDX's own (flags), which the Bio tab also shows (B75). */
export const bioFields = def => def.header.flat().filter(f => f.kind === "flagSelect" || f.kind === "flagText");
