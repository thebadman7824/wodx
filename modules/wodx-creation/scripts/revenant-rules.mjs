/**
 * WoDX Creation: revenant families in every era (B7840-B7848), pure rules (harness-tested).
 *
 * Sources, in the order the project's rules rank them:
 *   V20 Dark Ages pdf 454-455 / printed 453-454   the eight Dark Ages families (Basarab, Bratovich, Danislav, Grimaldi,
 *                                                  Obertus, Szantovich, Vlaszy, Khavi), their Disciplines and weaknesses
 *   V20 p. 500 (pdf 508)                          a revenant makes back one blood point a day
 *   V20 Ghouls and Revenants (printed = pdf - 1)  the twelve modern families (FAMILIES in states-rules.mjs), the
 *                                                  family histories behind the year windows, the "other families" of p. 113
 *   Dark Ages: Vampire (2002) p. 289              the Krevcheski (Auspex and Dominate), the blood showing at about 13,
 *                                                  the Szantovich addiction roll at 6, the Vlaszy oath at adolescence
 *   Ghouls: Fatal Addiction p. 29                 a revenant without vampire vitae ages at a quarter of the rate and
 *                                                  lives 150 years plus 50 a dot of Stamina
 * Where the books give no year or no number, the choice is a house reading and says so; each is a row in
 * docs/PENDING-REVIEW.md. Never V5.
 */
import {FAMILIES} from "./states-rules.mjs";
import {canon} from "../../wodx-chronicle/data/canon/index.mjs";

/** The last year of the Dark Ages lines: the Convention of Thorns, read from the canon. */
const THORNS = canon("convention-of-thorns").from;

const n = v => Math.max(0, Math.trunc(Number(v) || 0));

/** Before this year a family uses its V20 Dark Ages write-up where it has one; from it, V20 Ghouls and Revenants. */
export const MODERN_FROM = 1837;
/** The first and last years the chronicle runs. */
export const FIRST_YEAR = 1197, LAST_YEAR = 2300;

/**
 * The V20 Dark Ages families (pdf 454-455), and the Krevcheski of Dark Ages: Vampire (2002) p. 289, which V20 Dark
 * Ages does not list. mark: what the weakness does in play (read by the trait source, the hazard window, combat and
 * the weakness window):
 *   frenzy      difficulty added to frenzy rolls
 *   bloodMax    the family's blood pool in place of 10
 *   silver      silver deals aggravated damage
 *   sun         sunlight harms as it does a Cainite, but bashing, soaked with Stamina and Fortitude
 *   repel       a Willpower roll or leave when shown one of these
 *   oath        swears the blood oath to a Fiend at the age of majority
 *   obsession   an Obsession Derangement, on one field of knowledge
 *   addiction   a sensual pleasure becomes an addiction: a Willpower roll at this difficulty ("st": the Storyteller's),
 *               and no Willpower spent against it
 */
export const DA_FAMILIES = {
  basarab: {label: "Basarab", disciplines: ["animalism", "dominate", "presence"], page: "V20 Dark Ages p. 453",
    weakness: "Garlic and holy symbols repel them: a Willpower roll, or they must leave its presence.", mark: {repel: ["garlic", "holy symbol"]}},
  bratovich: {label: "Bratovich", disciplines: ["animalism", "potence", "vicissitude"], page: "V20 Dark Ages p. 453",
    weakness: "They frenzy as the Brujah do: two harder to resist.", mark: {frenzy: 2}},
  danislav: {label: "Danislav", disciplines: ["auspex", "protean", "vicissitude"], page: "V20 Dark Ages pp. 453-454",
    weakness: "Silver deals them aggravated damage. Lupine Kinfolk; a few hide Gifts from their masters.", mark: {silver: true}},
  grimaldi: {label: "Grimaldi", disciplines: ["celerity", "dominate", "fortitude"], page: "V20 Dark Ages p. 454",
    weakness: "Thin Tzimisce blood: a pool of 8 blood points, not 10.", mark: {bloodMax: 8}},
  obertus: {label: "Obertus", disciplines: ["auspex", "obfuscate", "vicissitude"], page: "V20 Dark Ages p. 454",
    weakness: "Each chooses a field of knowledge, held as an Obsession Derangement.", mark: {obsession: true}},
  szantovich: {label: "Szantovich", disciplines: ["auspex", "presence", "vicissitude"], page: "V20 Dark Ages p. 454; Dark Ages: Vampire p. 289",
    weakness: "A strong sensual pleasure becomes an addiction: a Willpower roll to do anything but chase it, and no Willpower can be spent against it.",
    mark: {addiction: 6}},
  vlaszy: {label: "Vlaszy", disciplines: ["animalism", "potence", "presence"], page: "V20 Dark Ages p. 454",
    weakness: "Each swears the blood oath to a Fiend at the age of majority.", mark: {oath: true}},
  khavi: {label: "Khavi", disciplines: ["animalism", "obfuscate", "vicissitude"], page: "V20 Dark Ages p. 454",
    weakness: "Sunlight harms them as it does a Cainite, but the damage is bashing and they soak it with Stamina and Fortitude.", mark: {sun: "bashing"}},
  krevcheski: {label: "Krevcheski", disciplines: ["auspex", "dominate"], page: "Dark Ages: Vampire p. 289",
    weakness: "Only two family Disciplines, a sign of the Fiends' distrust; the family already courts the Tremere.", mark: {}}
};

/** What the twelve V20 Ghouls and Revenants weaknesses do in play (the text is FAMILIES[key].weakness). */
export const GR_MARKS = {
  bratovich: {frenzy: 2, noWillpowerFrenzy: true},
  dhabi: {willpower: 2},
  ducheski: {socialCap: 2},
  enrathi: {humanityCap: 3, conscienceCap: 2},
  grimaldi: {},
  kairouan: {flaw: "Slow Healing"},
  obertus: {obsession: true},
  oprichniki: {flaw: "Haunted"},
  rafastio: {moon: true},
  rossellini: {flaw: "Deathsight"},
  anushin: {},
  zantosa: {addiction: "st"}
};

/**
 * The other families of V20 Ghouls and Revenants p. 113 (pdf 114). The book gives them no Disciplines, so the
 * Storyteller picks (any Discipline may be taken at birth).
 */
export const MINOR_FAMILIES = {
  marijava: {label: "Marijava", disciplines: [], page: "V20 Ghouls and Revenants pdf 114 / printed 113",
    weakness: "One drink of a vampire's vitae Binds them.", mark: {bindsAtOnce: true}},
  keskinen: {label: "Keskinen", disciplines: [], page: "V20 Ghouls and Revenants pdf 114 / printed 113",
    weakness: "A Derangement: the patron's wish to blot out the sun for good.", mark: {obsession: true}},
  katayama: {label: "Katayama", disciplines: [], page: "V20 Ghouls and Revenants pdf 114 / printed 113",
    weakness: "None in the book yet: the youngest family, bred by Malkavian scientists.", mark: {}}
};

/**
 * The years each family lives in the chronicle, with the name it goes by. house: the book gives no year.
 *   da / gr: the key of its V20 Dark Ages and V20 Ghouls and Revenants write-ups (null: none).
 */
export const LINES = [
  {key: "basarab", years: [FIRST_YEAR, 1699], da: "basarab", gr: null, patron: "Tzimisce", home: "Wallachia and Transylvania",
    why: "V20 Dark Ages p. 453 names them; Ghouls and Revenants pdf 101 calls them extinct in modern nights. House: gone by 1700."},
  {key: "bratovich", years: [FIRST_YEAR, LAST_YEAR], da: "bratovich", gr: "bratovich", patron: "Tzimisce", home: "the Carpathians; from about 1700 the Americas",
    why: "V20 Dark Ages p. 453; Ghouls and Revenants pdf 90-91 (a ship to the West Indies at the dawn of the 18th century)."},
  {key: "danislav", years: [FIRST_YEAR, THORNS], da: "danislav", gr: null, patron: "Tzimisce", home: "the Voivodate",
    why: "V20 Dark Ages pp. 453-454. House: not named after the Convention of Thorns, so their line ends that year."},
  {key: "grimaldi", years: [FIRST_YEAR, LAST_YEAR], da: "grimaldi", gr: "grimaldi", patron: "Tzimisce", home: "Italy and the lands where the Fiends have little sway",
    why: "V20 Dark Ages p. 454 has them serving in the Dark Ages (Ghouls and Revenants pdf 98 says the late Middle Ages; V20 Dark Ages wins in its era)."},
  {key: "obertus", years: [FIRST_YEAR, LAST_YEAR], da: "obertus", gr: "obertus", patron: "Tzimisce", home: "Constantinople, scattered after 1204; then Eastern Europe",
    why: "V20 Dark Ages p. 454; Ghouls and Revenants pdf 102."},
  {key: "szantovich", years: [FIRST_YEAR, LAST_YEAR], da: "szantovich", gr: "zantosa", patron: "Tzimisce", home: "the courts of Hungary and the Voivodate",
    names: [[FIRST_YEAR, THORNS, "Szantovich"], [THORNS + 1, LAST_YEAR, "Zantosa"]],
    why: "V20 Dark Ages p. 454 (Szantovich); Ghouls and Revenants pdf 112: \"originally known as the Szantovich\". House: the new name from the year after the Convention of Thorns."},
  {key: "vlaszy", years: [FIRST_YEAR, THORNS], da: "vlaszy", gr: null, patron: "Tzimisce", home: "Hungary (Magyar stock)",
    why: "V20 Dark Ages p. 454. House: not named after the Convention of Thorns, so their line ends that year."},
  {key: "khavi", years: [FIRST_YEAR, THORNS], da: "khavi", gr: null, patron: "the Fiend Byelobog", home: "the rivers and the Baltic coast",
    why: "V20 Dark Ages p. 454; Ghouls and Revenants pdf 102 speaks of them in the past. House: their line ends with the Convention of Thorns."},
  {key: "krevcheski", years: [FIRST_YEAR, 1249], da: "krevcheski", gr: null, patron: "Tzimisce (the elder Krevcheski)", home: "a mountain fortress in the Carpathians",
    why: "Dark Ages: Vampire p. 289; Ghouls and Revenants pdf 94 has them defect to the Tremere and take the name Ducheski. House: the defection in 1250."},
  {key: "ducheski", years: [1250, LAST_YEAR], da: null, gr: "ducheski", patron: "Tremere", home: "Tremere chantries",
    why: "Ghouls and Revenants pdf 94. House: from the Krevcheski defection in 1250."},
  {key: "dhabi", years: [FIRST_YEAR, LAST_YEAR], da: null, gr: "dhabi", patron: "Baali", home: "the Near East, in hiding",
    why: "Ghouls and Revenants pdf 92: an ancient family of the Baali."},
  {key: "enrathi", years: [FIRST_YEAR, LAST_YEAR], da: null, gr: "enrathi", patron: "none fixed (slavers for hire)", home: "Italy",
    why: "Ghouls and Revenants pdf 96: from the sixth century."},
  {key: "kairouan", years: [FIRST_YEAR, LAST_YEAR], da: null, gr: "kairouan", patron: "Banu Haqim", home: "near Alamut and North Africa",
    why: "Ghouls and Revenants pdf 100: founded in the 12th century, in the early years of the Ashirra."},
  {key: "rafastio", years: [FIRST_YEAR, LAST_YEAR], da: null, gr: "rafastio", patron: "Tal'Mahe'Ra", home: "the Po valley",
    why: "Ghouls and Revenants pdf 106: revenants since the Dark Ages."},
  {key: "anushin", years: [1500, LAST_YEAR], da: null, gr: "anushin", patron: "Ventrue (Anushin-Rawan)", home: "the island of Yiaros",
    why: "Ghouls and Revenants pdf 110: an island Elysium of the Camarilla. House: from 1500."},
  {key: "rossellini", years: [1550, LAST_YEAR], da: null, gr: "rossellini", patron: "Giovanni", home: "Venice",
    why: "Ghouls and Revenants pdf 108: bound to Claudius Giovanni in the 16th century. House: from 1550."},
  {key: "oprichniki", years: [1565, LAST_YEAR], da: null, gr: "oprichniki", patron: "Tzimisce (Russian koldun)", home: "Russia",
    why: "Ghouls and Revenants pdf 104: from Ivan the Terrible's oprichnina (1565)."},
  {key: "marijava", years: [FIRST_YEAR, LAST_YEAR], minor: "marijava", patron: "Tal'Mahe'Ra, Ravnos and Setites", home: "India and Afghanistan",
    why: "Ghouls and Revenants pdf 114: once one of the largest families. House: present from 1197."},
  {key: "keskinen", years: [FIRST_YEAR, LAST_YEAR], minor: "keskinen", patron: "Louhi", home: "Scandinavia",
    why: "Ghouls and Revenants pdf 114: no date given. House: present from 1197."},
  {key: "katayama", years: [1950, LAST_YEAR], minor: "katayama", patron: "Malkavian (Dr. Netchurch)", home: "the United States",
    why: "Ghouls and Revenants pdf 114: the youngest family, three generations bred true by modern nights. House: from 1950."}
];

const inYears = (line, y) => y >= line.years[0] && y <= line.years[1];
const yearOrNull = y => (Number.isFinite(Number(y)) && y !== null && y !== "" ? Math.trunc(Number(y)) : null);

/** The name a family goes by in a year. */
export function nameIn(line, year) {
  const y = yearOrNull(year);
  const hit = y === null ? null : (line.names ?? []).find(([a, b]) => y >= a && y <= b);
  return hit?.[2] ?? statsOf(line, year)?.label ?? line.key;
}

/** The write-up a family uses in a year: V20 Dark Ages before 1837 where there is one, else Ghouls and Revenants. */
export function statsOf(line, year) {
  const y = yearOrNull(year) ?? MODERN_FROM;
  if ( line.minor ) return {...MINOR_FAMILIES[line.minor], book: "gr"};
  const da = line.da ? DA_FAMILIES[line.da] : null, gr = line.gr ? FAMILIES[line.gr] : null;
  if ( da && (y < MODERN_FROM || !gr) ) return {...da, book: "da"};
  if ( gr ) return {...gr, page: `V20 Ghouls and Revenants ${gr.page}`, mark: GR_MARKS[line.gr] ?? {}, book: "gr"};
  return {...da, book: "da"};
}

/** The families alive in a year (all of them when no year is known), each with its name and write-up for that year. */
export function familiesIn(year) {
  const y = yearOrNull(year);
  return LINES.filter(l => y === null || inYears(l, y)).map(l => ({key: l.key, line: l, ...statsOf(l, y), label: nameIn(l, y)}));
}

/** One family by key (a Dark Ages or a modern key: zantosa finds the Szantovich line), in a year. */
export function familyIn(key, year) {
  const k = String(key ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const line = LINES.find(l => l.key === k || l.gr === k || l.da === k);
  if ( !line ) return null;
  return {key: line.key, line, ...statsOf(line, year), label: nameIn(line, year), alive: yearOrNull(year) === null || inYears(line, yearOrNull(year))};
}

/**
 * A revenant's start by the family's write-up for the year (Ghouls and Revenants pdf 117, 120-122: Potence 1 and one
 * family Discipline, or two family Disciplines; the V20 Dark Ages families take the same ways, house reading).
 * blood: the pool (10, or the family's own) and 1 a day (V20 p. 500). A family with no Disciplines in the book takes
 * any. Returns {disciplines, blood, errors, family}.
 */
export function startFor({family, year = null, way = "standard", picks = [], era = null} = {}) {
  const F = familyIn(family, year);
  if ( !F ) return {disciplines: {}, blood: null, errors: ["Pick a family."], family: null};
  const errors = [];
  if ( !F.alive ) errors.push(`The ${F.label} family is not in the world in ${year} (${F.line.why})`);
  const open = !F.disciplines.length;
  const own = picks.filter(p => open || F.disciplines.includes(p));
  const want = way === "alternate" ? 2 : 1;
  const chosen = [...new Set(own)].slice(0, want);
  for ( const d of F.disciplines ) if ( chosen.length < want && !chosen.includes(d) && !(way === "standard" && d === "potence") ) chosen.push(d);
  const disciplines = {};
  if ( way !== "alternate" ) disciplines.potence = 1;
  for ( const d of chosen ) disciplines[d] = (disciplines[d] ?? 0) + 1;
  if ( own.length < picks.length ) errors.push("Only the family's own Disciplines can be taken at birth.");
  if ( open && chosen.length < want ) errors.push("The book gives this family no Disciplines: pick them.");
  // B6779e: in the Victorian and modern eras V20 p. 501 starts a revenant at a limit of 2 points
  const base = era === "modern" || era === "victorian" ? 2 : 10;
  const max = F.mark?.bloodMax ? Math.min(base, F.mark.bloodMax) : base;
  return {disciplines, blood: {max, start: 1, perNight: 1}, errors, family: F};
}

/** The age the family's vitae starts to flow (Dark Ages: Vampire p. 289: "sometime around 13"). */
export const BLOOD_SHOWS_AT = 13;
/** The age of majority for the Vlaszy oath (house reading: V20 Dark Ages says majority, Dark Ages: Vampire adolescence). */
export const MAJORITY = 16;

/** A day's vitae: one point back, up to the pool (V20 p. 500). A revenant in torpor or starving makes none (house). */
export function dayOfVitae({value = 0, max = 10, starving = false} = {}) {
  const v = n(value), m = n(max);
  if ( starving || v >= m ) return {value: v, gained: 0};
  return {value: v + 1, gained: 1};
}

/**
 * How a revenant ages over a span of years (Ghouls: Fatal Addiction p. 29): fed true vitae, not at all; on the
 * family's own vitae alone, a quarter of the years, and the life ends at 150 years plus 50 a dot of Stamina.
 * Dark Ages: Vampire p. 289 says their own vitae does not slow aging at all; WoDX takes the later book in every era
 * (house reading, B7845). Returns {aged, lifespan, dies}.
 */
export function ageOver({years = 0, age = null, stamina = 2, fed = false} = {}) {
  const y = n(years);
  const lifespan = 150 + 50 * n(stamina);
  const aged = fed ? 0 : Math.ceil(y / 4);
  const now = yearOrNull(age);
  return {aged, lifespan, dies: now !== null && !fed && now + aged >= lifespan, ageAfter: now === null ? null : now + aged};
}

/** The roll a revenant's weakness asks for, by kind (repel, addiction). */
export function weaknessRoll(mark = {}, kind) {
  if ( kind === "repel" && mark.repel?.length ) return {pool: "willpower", difficulty: 6, noWillpower: false,
    fail: "must leave its presence", note: "V20 Dark Ages p. 453 gives no difficulty: 6, the usual (house reading)."};
  // Dark Ages: Vampire p. 289 sets 6; V20 Ghouls and Revenants pdf 113 leaves it to the Storyteller (6 unless set)
  if ( kind === "addiction" && mark.addiction ) return {pool: "willpower", difficulty: mark.addiction === "st" ? 6 : n(mark.addiction), stSets: mark.addiction === "st",
    noWillpower: true, fail: "does nothing but chase the pleasure", note: mark.addiction === "st" ? "V20 Ghouls and Revenants pdf 113: the Storyteller sets the difficulty" : "Dark Ages: Vampire p. 289"};
  return null;
}

/**
 * The weakness as roll effects, for WoDX Chronicle's trait engine: {name, dice, diff, note} on the tags it touches.
 * Frenzy: the Bratovich +2; Willpower: the D'Habi +2.
 */
export function rollEffects(mark = {}, tags = [], label = "Revenant") {
  const t = new Set((tags ?? []).map(s => String(s).toLowerCase()));
  const out = [];
  if ( mark.frenzy && t.has("frenzy") ) out.push({key: "revenant-frenzy", name: `${label}: the family's temper`, dice: 0, diff: n(mark.frenzy), note: "frenzies as the Brujah do"});
  if ( mark.willpower && t.has("willpower") ) out.push({key: "revenant-willpower", name: `${label}: the old binding`, dice: 0, diff: n(mark.willpower), note: "every Willpower roll"});
  return out;
}
