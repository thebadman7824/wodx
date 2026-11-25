/**
 * WoDX Rothenstein: the chronicle "What Sleeps Beneath Rothenstein" as a pack of its own (Chronicle Packs Desk,
 * Ben's picks a1, a2, b1, b2; 18 Nov 2026). Everything written for this story lives in this module: the saga, its
 * fronts, twists, reveals and encounters. Turn the module off and none of it exists in the game.
 *
 * MANIFEST says what the chronicle is, so shared code never has to know it by name. Every field works for any era
 * and any region: a chronicle set in 1920s Shanghai fills the same fields.
 *
 * Pure (no Foundry calls), so the harness loads it as it is.
 */
import {SAGA, SAGA_CLOCKS, SAGA_ENDINGS} from "./data/saga.mjs";
import {FRONTS, JUDGEMENTS, ROLES, COURIER_GAP, CLUES, CHAPTERS, WEEK} from "./data/fronts.mjs";
import {CHAINS, TWISTS, PAIRS, ORDER, LAST_CHAPTER, CHAPTERS as TWIST_CHAPTERS, WEEK as TWIST_WEEK, TWIST_GAP} from "./data/twists.mjs";
import {REVEALS, JUDGED_FAVOURS, MURDERS, COLD} from "./data/reveals.mjs";
import {ENCOUNTERS, KINDS} from "./data/encounters.mjs";
import {ROTHENSTEIN as RECIPE} from "./data/recipe.mjs";
import * as FACTIONS from "./data/factions.mjs";

export const ID = "rothenstein";

export const MANIFEST = {
  id: ID,
  /** The Foundry module that carries it. */
  module: "wodx-rothenstein",
  title: SAGA.title,
  /** The town the chronicle's people call home; shared code uses this word instead of a name of its own. */
  town: "Rothenstein",
  /** The scene a lone player lands on when they arrive (WoDX Solo, B8032): its name, or the start of it. */
  landing: "Dolany Village",
  /** A region id from WoDX Chronicle's WORLD_REGIONS. */
  homeland: "moravia",
  /** The first night of play: [year, month, day]. */
  opening: [1200, 9, 1],
  /** The years its books span, prologue to last book, and the eras they cross. */
  span: {from: Math.min(...SAGA.books.map(b => b.from)), to: Math.max(...SAGA.books.map(b => b.to))},
  eras: [...new Set(SAGA.books.map(b => b.era))],
  /** The lines that have a door into the chronicle from its first night. */
  lines: ["vampire", "werewolf", "mage", "changeling", "wraith", "hunter", "mortal"],
  /** The world the builder makes it in (WoDX Storyteller's recipe). */
  world: RECIPE.world,
  /** The Live world that plays it; every WoDX module refuses to change it without the owner. */
  live: ["rothenstein-live"],
  /** Book keys in order. */
  books: SAGA.books.map(b => b.key),
  /** The book whose ending later books answer; fronts, twists and encounters run while it runs. */
  firstBook: "red-stone",
  /**
   * What is local to the valley (WoDX Chronicle chronicle-local-rules.mjs, B7610-B7616), filled from the Book 1
   * omnibus, ruling 27 (B7804).
   */
  local: {
    feasts: [
      {month: 9, day: 1, name: "St Aegidius, the parish feast", revel: true},
      {month: 9, day: 28, name: "St Wenceslas"},
      {month: 6, day: 23, name: "The Kupala fires", custom: true, revel: true}
    ],
    titles: [{kind: "council", rank: 4, title: "Richter", to: 1849}],
    languages: [{name: "the Old Tongue", closedIn: ["red-stone"], intent: true, sounds: ["ur", "va", "dho", "ost", "rem", "ka", "zhi", "lu", "sva", "tor"]}],
    caerns: [{key: "old-grove", name: "The Old Grove", scene: "Old Grove", level: 3, tribes: "Silver Fang kin"}],
    hunters: {stage: "rumours"},
    /** The Ashfield is the taint's one source: each field it takes deepens the Ashfield scene a level (B7807). */
    taints: [{clock: "ashfield", scene: "Ashfield", per: 1, max: 8}],
    /** B7901: Lady Adelheid's ruins and the churchyard's new graves are Haunts (the omnibus's wraith door, ruling 27). */
    haunts: [{scene: "Altenhof", name: "The ruins of Altenhof", rating: 4, echoes: ["nightmarish"]},
      {scene: "churchyard|Aegidius", name: "St Aegidius' churchyard", rating: 1, echoes: []}],
    /** B7903: what dies on the Ashfield leaves nothing: it is eaten (the omnibus, saga.mjs). */
    souls: [{scene: "Ashfield", fate: "eaten"}]
  },
  /** The words that mark this chronicle in shared code (the guard test reads them). */
  marks: ["Rothenstein", "Kranzfels", "Bogdan Ursu", "Husbandman", "Rudý Hospodář", "Črnomir", "Richter Graff", "Father Ludovic",
    "Baba Yaroslava", "Altenhof", "Ashfield", "Dolany", "Old Grove", "Silver Adit", "Ivo's Ferry", "red-stone"]
};

/** The data the story engines read (WoDX Chronicle's chronicle-data.mjs). */
export const PACK = {
  id: ID,
  title: MANIFEST.title,
  manifest: MANIFEST,
  saga: {SAGA, SAGA_CLOCKS, SAGA_ENDINGS, FIRST_BOOK: MANIFEST.firstBook},
  fronts: {FRONTS, JUDGEMENTS, ROLES, COURIER_GAP, CLUES, CHAPTERS, WEEK},
  twists: {CHAINS, TWISTS, PAIRS, ORDER, LAST_CHAPTER, CHAPTERS: TWIST_CHAPTERS, WEEK: TWIST_WEEK, GAP: TWIST_GAP},
  reveals: {REVEALS, JUDGED_FAVOURS, MURDERS, COLD},
  encounters: {ENCOUNTERS, KINDS, LAST: "c9"},
  /** The builder's recipe (WoDX Storyteller builder.mjs). */
  recipe: RECIPE,
  /** Its Threads of Fate cards, loaded when the Storyteller's deck first loads (WoDX Storyteller threads.mjs). */
  /** Otherworld scene tags for the chronicle's scenes (WoDX Otherworlds' Fill from preset). */
  scenePresets: {rothenstein: {title: "What Sleeps Beneath Rothenstein", path: "modules/wodx-rothenstein/data/scene-tags.json"}},
  /** The valley's ten starting factions, for WoDX NPC's faction window. */
  factions: FACTIONS,
  cards: () => import("./data/cards.mjs").then(m => m.CARDS),
  /** The Future Darkness world events set in Rothenstein (fdw-...-mo-N, ids unchanged), loaded with the other large tables. */
  events: () => import("./data/world-events.mjs").then(m => m.default.events)
};
