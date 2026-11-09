/**
 * Each line's character creation totals, from the books (mechanics only, with page refs; "pdf" is the file's page,
 * "printed" the number on the page). The research notes behind them are in docs/research/creation-totals.
 *
 * attributes / abilities: dots for primary, secondary and tertiary, on top of the 1 every Attribute starts with.
 * abilityCap: no Ability above this before freebies. backgrounds: dots. powers: the line's own power steps, each
 * {key, label, dots, count: "dots"|"items"}. freebies: points, flaws: the most extra points Flaws can give.
 * costs: freebie cost per dot (per item when count is "items"). start: fixed starting values, as text.
 * Mummy builds in two stages, so it also carries `rebirth`, applied on top of the mortal stage.
 */
export const TOTALS = {
  v20: {
    label: "Vampire: The Masquerade 20th Anniversary", short: "V20", sheet: "Vampire", ref: "V20 pdf 92–94 / printed 84–86",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "discipline", label: "Disciplines", dots: 3, note: "From the three clan Disciplines; Caitiff choose with the Storyteller."}],
    virtues: 7, freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, discipline: 7, background: 1, virtue: 2, road: 2, willpower: 1},
    start: ["Humanity = Conscience + Self-Control", "Willpower = Courage", "Blood pool: roll one die"],
    costRef: "pdf 90 / printed 82"
  },
  vtda20: {
    label: "Vampire: The Dark Ages 20th Anniversary", short: "V20 Dark Ages", sheet: "Vampire", ref: "V20DA pdf 153–156 / printed 152–155",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "discipline", label: "Disciplines", dots: 4, note: "Among the clan's three; others cost freebies only."}],
    virtues: 7, freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, discipline: 7, background: 1, virtue: 2, road: 2, willpower: 1},
    start: ["Road = the two Road Virtues added", "Willpower = Courage", "Blood pool: one die + Domain + Herd, to the Generation's limit"],
    costRef: "pdf 159 / printed 158"
  },
  ghoul: {
    label: "V20 Ghouls and Revenants: ghoul", short: "Ghoul", sheet: "Mortal", ref: "V20 G&R pdf 117 / printed 116",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 5,
    powers: [{key: "discipline", label: "Disciplines", dots: 2, note: "Potence 1, plus one dot that suits the domitor (vassal) or any with the Storyteller (independent)."}],
    virtues: 7, freebies: 21, flaws: 7,
    costs: {attribute: 5, ability: 2, discipline: 10, background: 1, virtue: 2, road: 1, willpower: 1},
    start: ["Humanity = Conscience + Self-Control", "Willpower = Courage", "Blood: starts at 1 (house rule; see the Storyteller's guide)"],
    costRef: "pdf 117 / printed 116"
  },
  revenant: {
    label: "V20 Ghouls and Revenants: revenant", short: "Revenant", sheet: "Mortal", ref: "V20 G&R pdf 117 / printed 116",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 5,
    powers: [{key: "discipline", label: "Disciplines", dots: 2, note: "Potence 1, plus one dot of a Discipline the family uses."}],
    virtues: 5, freebies: 21, flaws: 7,
    costs: {attribute: 5, ability: 2, discipline: 10, background: 1, virtue: 2, road: 1, willpower: 1},
    start: ["Humanity = Conscience + Self-Control, or a Path (5 at most)", "Willpower = Courage", "Blood pool 10, starts at 1, makes back 1 a night"],
    costRef: "pdf 117 / printed 116"
  },
  w20: {
    label: "Werewolf: The Apocalypse 20th Anniversary", short: "W20", sheet: "Werewolf", ref: "W20 pdf 114–119 / printed 112–117",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "gift", label: "Gifts", dots: 3, count: "items", note: "Level One: one each from breed, auspice and tribe."}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, gift: 7, rage: 1, gnosis: 2, willpower: 1},
    start: ["Rage by auspice", "Gnosis by breed", "Willpower by tribe", "Rank 1"],
    costRef: "pdf 116 / printed 114"
  },
  daw: {
    label: "Werewolf: The Dark Ages", short: "DA:W", sheet: "Werewolf", ref: "DA:W pdf 81–82 / printed 80–81",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "gift", label: "Gifts", dots: 3, count: "items", note: "Level One: one each from breed, auspice and tribe. Primal-Urge 1 at least."}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, gift: 7, rage: 1, gnosis: 2, willpower: 1},
    start: ["Rage by auspice", "Gnosis by breed", "Willpower by tribe", "Rank 1"],
    costRef: "pdf 82 / printed 81"
  },
  m20: {
    label: "Mage: The Ascension 20th Anniversary", short: "M20", sheet: "Mage", ref: "M20 pdf 256–258 / printed 255–257",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 7,
    powers: [{key: "sphere", label: "Spheres", dots: 6, note: "The first dot goes in the Affinity Sphere; no Sphere above Arete."}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, sphere: 7, arete: 4, willpower: 1},
    start: ["Arete 1 (3 at most with freebies)", "Willpower 5", "Quintessence = Avatar", "Paradox 0"],
    costRef: "pdf 254 / printed 253"
  },
  dam: {
    label: "Mage: The Dark Ages", short: "DA:M", sheet: "Mage", ref: "DA:M pdf 81–82 / printed 80–81",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "pillar", label: "Pillars", dots: 3, note: "Foundation starts at 1. No Foundation or Pillar above 3."}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, foundation: 5, pillar: 3, willpower: 1},
    start: ["Willpower 5", "Quintessence 5, or Cray + Fount if higher"],
    costRef: "pdf 82 / printed 81"
  },
  wr20: {
    label: "Wraith: The Oblivion 20th Anniversary", short: "Wraith 20", sheet: "Wraith", ref: "Wr20 pdf 176–180 / printed 111–115",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 7,
    powers: [{key: "arcanoi", label: "Arcanoi", dots: 5, note: "None above 3."},
      {key: "passion", label: "Passions", dots: 10}, {key: "fetter", label: "Fetters", dots: 10}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, arcanoi: 5, passion: 2, fetter: 1, willpower: 2, pathos: 0.5},
    start: ["Corpus 10", "Pathos = 5 + Memoriam", "Willpower 5", "The Shadow: roll Willpower for Angst, 7 Dark Passion dots, 10 Shadow freebies"],
    costRef: "pdf 180 / printed 115"
  },
  c20: {
    label: "Changeling: The Dreaming 20th Anniversary", short: "C20", sheet: "Changeling", ref: "C20 pdf 143–146 / printed 142–145",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "art", label: "Arts", dots: 3}, {key: "realm", label: "Realms", dots: 5}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, art: 5, realm: 2, glamour: 3, willpower: 1},
    start: ["Willpower 4, Glamour 4, Banality 3, changed by seeming"],
    costRef: "pdf 145 / printed 144"
  },
  dafae: {
    label: "Dark Ages: Fae", short: "DA:Fae", sheet: "Changeling", ref: "DA:Fae pdf 87–88 / printed 86–87",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "dominion", label: "Dominions", dots: 2, note: "By origin: changeling 2, inanimae 3, firstborn 3. None above 3."}],
    freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, dominion: 7, willpower: 2, weaving: 4},
    start: ["Willpower 4", "Mists and Weaving by origin"],
    costRef: "pdf 88 / printed 87"
  },
  inquisitor: {
    label: "Dark Ages: Inquisitor", short: "Inquisitor", sheet: "Mortal", ref: "DA:I pdf 148–150 / printed 147–149",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 5,
    powers: [], virtues: 7, freebies: 21, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, virtue: 2, willpower: 1, piety: 1},
    start: ["Theology 1 at least", "One dot of the order's Superior Virtue", "Conviction = Superior Virtue + its Virtue", "Willpower = Courage + Zeal"],
    costRef: "pdf 148 / printed 147"
  },
  htr: {
    label: "Hunter: The Reckoning", short: "HtR", sheet: "Hunter", ref: "HtR pdf 85–91 / printed 84–90",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 5,
    powers: [{key: "edge", label: "Virtues and edges", dots: 3, note: "One pool of 3 for Virtues and edges; freebies can't buy either."}],
    freebies: 21, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, willpower: 1, conviction: 1},
    start: ["Willpower 3", "Conviction by creed, 8 at most"],
    costRef: "pdf 86 / printed 85"
  },
  demon: {
    label: "Demon: The Fallen", short: "DtF", sheet: "Demon", ref: "DtF pdf 124–129 / printed 123–128",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "lore", label: "Lores", dots: 3}], virtues: 3, freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, lore: 7, background: 1, faith: 6, virtue: 2, willpower: 1},
    start: ["Faith 3", "Torment by House", "Willpower = the two highest Virtues"],
    costRef: "pdf 125 / printed 124"
  },
  kote: {
    label: "Kindred of the East", short: "KotE", sheet: "Vampire", ref: "KotE pdf 70–86 / printed 78–94",
    attributes: [7, 5, 3], abilities: [13, 9, 5], abilityCap: 3, backgrounds: 5,
    powers: [{key: "discipline", label: "Disciplines", dots: 3, note: "One must be a Demon Art."}], freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, discipline: 10, background: 1, chi: 3, hun: 3, po: 1, willpower: 1},
    start: ["Yin and Yang 1 each, plus 4", "Hun 1, P'o 3", "Willpower = Hun, raised to 5 at least", "Dharma 1"],
    costRef: "pdf 71 / printed 79"
  },
  mummy: {
    label: "Mummy: The Resurrection", short: "MtR", sheet: "Mummy", ref: "MtR pdf 52–56 / printed 56–60",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 3,
    powers: [{key: "hekau", label: "Hekau", dots: 3, note: "Given at the Rebirth; one dot in the Amenti's primary path."}],
    freebies: 5, flaws: 7,
    rebirth: {attributes: 2, abilities: 5, backgrounds: 2, freebies: 10},
    costs: {attribute: 5, ability: 2, hekau: 5, background: 1, balance: 4, sekhem: 1, willpower: 1},
    start: ["Balance 1 (3 at most)", "Willpower 5", "Sekhem = Balance"],
    costRef: "pdf 52 / printed 56"
  },
  orpheus: {
    label: "Orpheus", short: "Orpheus", sheet: "Mortal", ref: "Orpheus pdf 123–131 / printed 122–130",
    attributes: [6, 4, 3], abilities: [11, 7, 4], abilityCap: 3, backgrounds: 4,
    powers: [], freebies: 15, flaws: 7,
    costs: {attribute: 5, ability: 2, background: 1, vitality: 5, willpower: 3},
    start: ["Backgrounds: 2, plus 2 Orpheus ones for Group members", "Vitality, Willpower and Spite by Shade and Nature", "Spirits get 5 more freebies"],
    costRef: "pdf 125 / printed 124"
  }
};

/** The book a sheet type most likely follows in an era (the check window starts there; the Storyteller can change it). */
export function defaultLine(sheetType, {variant = "", eraId = ""} = {}) {
  const dark = ["dark-ages", "long-night"].includes(eraId);
  switch ( sheetType ) {
    case "Vampire": return dark ? "vtda20" : "v20";
    case "Werewolf": return dark ? "daw" : "w20";
    case "Mage": return dark ? "dam" : "m20";
    case "Wraith": return "wr20";
    case "Changeling": return dark ? "dafae" : "c20";
    case "Hunter": return dark ? "inquisitor" : "htr";
    case "Demon": return "demon";
    case "Mummy": return "mummy";
    case "Mortal": return variant === "ghoul" ? "ghoul" : dark ? "inquisitor" : "htr";
    default: return "v20";
  }
}
