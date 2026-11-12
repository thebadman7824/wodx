/**
 * WoDX NPC 0.25.0: politics inside a faction, the pure part. No Foundry calls, so the harness can test it.
 *
 * A faction built around one game line may follow a polity: its offices, a rank for each member, the camps (blocs)
 * that pull inside it, its law, and the favours members trade. Each faction turn, a faction with a polity also runs
 * an inner turn: up to three of its NPC members make one move each, and every few turns the polity meets (a
 * gathering) to hear charges, fill seats and grant standing. Big changes (the top seat, anything that touches a
 * player character) go to the Storyteller's approval queue, as every other big faction change does.
 *
 * Book basis (mechanics in WoDX's own words; pdf pages):
 *   Camarilla offices: Keeper of Elysium, Scourge, Sheriff, Justicar, Archon (V20 pdf 33-34); only a Justicar may call
 *   a Conclave (V20 pdf 47); the Seneschal runs the Prince's nightly business (Guide to the Camarilla pdf 16); the
 *   Whip is an unofficial helper to a Primogen (Guide to the Camarilla pdf 30).
 *   Prestation: a debtor who will not pay loses Status as the Harpies spread the word (Guide to the Camarilla pdf
 *   148-150).
 *   Sabbat: ranks (V20 pdf 34-35); the Vinculum, a die per packmate at the first Vaulderie and, at each later one, a
 *   rating rising by 1 when its die rolls above it, to 10 (V20 pdf 297); monomacy, the ritual duel that settles a
 *   grievance (V20 pdf 517); the Code of Milan (V20 pdf 49).
 *   Anarchs: barons and gangs (V20 pdf 52-53); the Free State of 1944 (V20 pdf 52).
 *   Dark Ages: oaths to a liege, sworn on a new liege, a rise in rank and renewal (V20 Dark Ages pdf 126-127); court
 *   offices (V20 Dark Ages pdf 32, 212-213, 385-391).
 * The inner turn, its moves and their rolls, the gathering's rhythm, the Status gain for paying a large boon, and
 * a member's standing kept beside the sheet are WoDX readings (house rules, B1100-B1109).
 *
 * A faction's politics live on the faction record: f.polity (a template key, "none", or "" for the default) and
 * f.politics (the state below).
 */

import {hooksFor, SECRET_KINDS} from "./secrets-rules.mjs";

export const MAX_RANK = 5;
export const MAX_VINCULUM = 10;
/** NPC members acting in one inner turn (B1102). */
export const ACTORS_PER_TURN = 3;

/* ------------------------------------------------------------------ */
/*  The templates                                                      */
/* ------------------------------------------------------------------ */

/**
 * Each polity: label, line, kinds (faction kinds it fits), from/to (years it can exist; null is open), rank (what
 * the members' standing is called), blocs (the sheet field that sorts members into camps), gathering {name, every
 * (inner turns)}, offices [{key, title, seats, fill, top?, judge?, harpy?}], law [charges], and era notes.
 *   fill: "appoint" (the top seat picks at a gathering), "clan" (one seat per clan present, its highest-ranked member),
 *         "challenge" (won from the holder in a duel or contest), "backing" (won by having more favour than the holder)
 */
export const POLITIES = {
  "dark-ages-court": {
    label: "A feudal court of Cainites (the Dark Ages)", line: "vampire", kinds: ["kindred"], from: null, to: null,
    rank: "Status", blocs: "clan", gathering: {name: "court", every: 4, meets: "The court is held."},
    offices: [
      {key: "prince", title: "Prince", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "seneschal", title: "Seneschal", seats: 1, fill: "appoint"},
      {key: "sheriff", title: "Sheriff", seats: 1, fill: "appoint"},
      {key: "scourge", title: "Scourge", seats: 1, fill: "appoint"},
      {key: "herald", title: "Herald", seats: 1, fill: "appoint"},
      {key: "harpy", title: "Harpy", seats: 1, fill: "appoint", harpy: true}
    ],
    law: ["a broken oath to a liege", "hunting in another's fief", "an Embrace without leave", "defiance of the Prince"],
    titles: {prince: ["Prince", "Voivode", "Margrave", "Lord"]},
    notes: "Lords and vassals bound by oaths of fealty; a vassal holds a fief of hunting ground from a liege (V20 Dark Ages pdf 126-127)."
  },
  camarilla: {
    label: "A Camarilla court", line: "vampire", kinds: ["kindred"], from: 1435, to: null,
    rank: "Status", blocs: "clan", gathering: {name: "Elysium", every: 2, meets: "Court is held in Elysium."},
    offices: [
      {key: "prince", title: "Prince", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "seneschal", title: "Seneschal", seats: 1, fill: "appoint"},
      {key: "primogen", title: "Primogen", seats: 7, fill: "clan"},
      {key: "harpy", title: "Harpy", seats: 1, fill: "appoint", harpy: true},
      {key: "keeper", title: "Keeper of Elysium", seats: 1, fill: "appoint"},
      {key: "sheriff", title: "Sheriff", seats: 1, fill: "appoint"},
      {key: "scourge", title: "Scourge", seats: 1, fill: "appoint"},
      {key: "whip", title: "Whip", seats: 2, fill: "appoint"},
      {key: "herald", title: "Herald", seats: 1, fill: "appoint"}
    ],
    law: ["a breach of the Masquerade", "hunting in another's domain", "an Embrace without leave", "violence in Elysium", "an unpaid boon"],
    titles: {prince: ["Prince", "Voivode", "Margrave"]},
    notes: "The Six Traditions and the Masquerade are sect law. Archons, Justicars and Conclaves stand above the city; a Conclave is the Storyteller's event (V20 pdf 33-34, 47).",
    eras: {future: "In the Future Darkness the court meets in boardrooms as often as in Elysium."}
  },
  sabbat: {
    label: "A Sabbat diocese", line: "vampire", kinds: ["kindred"], from: 1493, to: null,
    body: "The diocese", rank: "Status (Sabbat)", blocs: "clan", gathering: {name: "esbat", every: 2, meets: "The esbat gathers."}, vinculum: true,
    offices: [
      {key: "archbishop", title: "Archbishop", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "bishop", title: "Bishop", seats: 2, fill: "challenge"},
      {key: "priest", title: "Pack priest", seats: 3, fill: "appoint"},
      {key: "ductus", title: "Ductus", seats: 3, fill: "challenge"},
      {key: "templar", title: "Templar", seats: 2, fill: "appoint"}
    ],
    law: ["a breach of the Code of Milan", "a rite skipped", "disloyalty to the Regent", "a broken word to the sect"],
    notes: "Disputes over seats go to monomacy, a ritual duel (V20 pdf 517). Each esbat shares the Vaulderie and the Vinculum grows (V20 pdf 297).",
    eras: {future: "In the Future Darkness some packs take to the roads as Nomad families."}
  },
  anarch: {
    label: "An Anarch barony", line: "vampire", kinds: ["kindred"], from: 1381, to: null,
    body: "The barony", rank: "Status (Anarch)", blocs: "clan", backers: "The gangs", gathering: {name: "gangs' meeting", every: 4, meets: "The gangs meet."},
    offices: [
      {key: "baron", title: "Baron", seats: 1, fill: "backing", top: true, judge: true},
      {key: "boss", title: "Gang leader", seats: 3, fill: "backing"}
    ],
    law: ["selling out to the elders", "hunting on another gang's turf", "a broken word to the gangs"],
    notes: "Status among Anarchs is reputation, won by deeds and word of mouth rather than titles (V20 pdf 53). Before 1493 this is a band of the Anarch Revolt.",
    eras: {revolt: "Before 1493 the barony is a band of the Anarch Revolt, at war with its elders."}
  },
  "garou-sept": {
    label: "A Garou sept", line: "werewolf", kinds: ["garou"], from: null, to: null,
    body: "The sept", rank: "Rank", rankFrom: "rank", blocs: "tribe", gathering: {name: "moot", every: 4, meets: "The sept holds its moot under the full moon."},
    riseByChallenge: true, noKill: true,
    offices: [
      {key: "elder", title: "Sept leader", seats: 1, fill: "challenge", top: true},
      {key: "truthcatcher", title: "Truthcatcher", seats: 1, fill: "appoint", judge: true},
      {key: "warder", title: "Warder", seats: 1, fill: "challenge"},
      {key: "gatekeeper", title: "Gatekeeper", seats: 1, fill: "appoint"},
      {key: "ritemaster", title: "Master of the Rite", seats: 1, fill: "appoint"},
      {key: "talesinger", title: "Talesinger", seats: 1, fill: "appoint"},
      {key: "challengemaster", title: "Master of the Challenge", seats: 1, fill: "appoint"}
    ],
    law: ["mating with another Garou", "failing to fight the Wyrm", "showing the wolf to mortals", "defying an elder of higher Rank", "harming a cub", "leaving the caern unguarded", "eating the flesh of humans or wolves"],
    notes: "The Litany is the Garou's law (W20 pdf 52-53). To rise in Rank, a Garou challenges one of higher Rank, who picks the contest (W20 pdf 253-254). Adren hold most sept offices (W20 pdf 254). Challenges end at submission, not death.",
    eras: {}
  },
  "fae-court": {
    label: "A fae court (before the Shattering)", line: "changeling", kinds: ["fae"], from: null, to: 1349,
    rank: "Title", rankFrom: "title", blocs: "house", gathering: {name: "court", every: 4, meets: "The lord of the freehold holds court."},
    offices: [
      {key: "sovereign", title: "Lord of the freehold", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "seneschal", title: "Seneschal", seats: 1, fill: "appoint"},
      {key: "herald", title: "Herald", seats: 1, fill: "appoint"},
      {key: "champion", title: "Champion", seats: 1, fill: "challenge"},
      {key: "knight", title: "Sworn knight", seats: 3, fill: "appoint"}
    ],
    law: ["trespass on a liege's demesne", "an oath of fealty broken", "refusing rescue to one of the Kithain", "breaking the peace of safe haven", "taking a Kithain's life", "showing the Dreaming to mortals"],
    titles: {sovereign: ["Lord of the freehold", "Baron", "Count", "Duke", "King or Queen"]},
    notes: "Nobles hold freeholds as fiefs by oaths of fealty (C20 pdf 74-76); the Escheat is the law both courts keep, the Seelie to its letter and the Unseelie to its spirit (C20 pdf 65-66). Title is the noble's rank (C20 pdf 169-172)."
  },
  "commoner-freehold": {
    label: "A commoner freehold (after the Shattering)", line: "changeling", kinds: ["fae"], from: 1350, to: 1968,
    body: "The freehold", rank: "Standing", rankFrom: "title", blocs: "court", backers: "The commoners", gathering: {name: "gathering", every: 4, meets: "The freehold gathers by its balefire."},
    offices: [
      {key: "keeper", title: "Keeper of the freehold", seats: 1, fill: "backing", top: true, judge: true},
      {key: "warden", title: "Warden", seats: 2, fill: "backing"}
    ],
    law: ["trespass on the freehold", "an oath broken", "refusing rescue to one of the Kithain", "taking a Kithain's life", "showing the Dreaming to mortals"],
    notes: "With the nobles gone to Arcadia after the Shattering of 1350 (C20 pdf 51, 58), commoners keep what freeholds remain, choosing their keepers by backing."
  },
  "noble-fief": {
    label: "A noble fief (after the Resurgence)", line: "changeling", kinds: ["fae"], from: 1969, to: null,
    rank: "Title", rankFrom: "title", blocs: "house", gathering: {name: "court", every: 4, meets: "The liege holds court."},
    offices: [
      {key: "sovereign", title: "Count", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "seneschal", title: "Seneschal", seats: 1, fill: "appoint"},
      {key: "herald", title: "Herald", seats: 1, fill: "appoint"},
      {key: "champion", title: "Champion", seats: 1, fill: "challenge"},
      {key: "knight", title: "Sworn knight", seats: 3, fill: "appoint"},
      {key: "commons", title: "Voice of the commoners", seats: 1, fill: "backing"}
    ],
    law: ["trespass on a liege's demesne", "an oath of fealty broken", "refusing rescue to one of the Kithain", "breaking the peace of safe haven", "taking a Kithain's life", "showing the Dreaming to mortals"],
    titles: {sovereign: ["Count", "Baron", "Duke", "King or Queen"]},
    notes: "The nobles return with the Resurgence of 1969 (C20 pdf 38, 51-52); the Accordance War between nobles and commoners follows (C20 pdf 39, 59). Escheat C20 pdf 65-66; Title C20 pdf 169-172.",
    eras: {accordance: "In the years of the Accordance War, commoners and nobles fight over every seat."}
  },
  "wraith-legion": {
    label: "A necropolis of the Hierarchy", line: "wraith", kinds: ["spirits"], from: null, to: null,
    body: "The necropolis", rank: "Status", blocs: "legion", gathering: {name: "muster", every: 4, meets: "The legions muster before the Anacreon."},
    offices: [
      {key: "anacreon", title: "Anacreon", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "regent", title: "Regent", seats: 2, fill: "appoint"},
      {key: "marshal", title: "Marshal", seats: 1, fill: "appoint"},
      {key: "centurion", title: "Centurion", seats: 4, fill: "appoint"}
    ],
    law: ["meddling with the living against the Dictum Mortuum", "dealings with Renegades", "practising a banned guild's art", "disobeying a superior officer", "losing a soul in one's charge to the Tempest"],
    notes: "The Anacreon rules a necropolis for Stygia; Regents and Centurions serve under each legion's Deathlord, and the Centurion is the lowest officer, judged on results (Wraith 20th pdf 126-136). A Great Maelstrom empties seats.",
    eras: {}
  },
  "mage-fellowship": {
    label: "A fellowship of the Arts (before the Council)", line: "mage", kinds: ["mages"], from: null, to: 1465,
    body: "The fellowship", rank: "Arete", rankFrom: "arete", blocs: "sect", gathering: {name: "council", every: 4, meets: "The fellowship meets in council."},
    offices: [
      {key: "master", title: "Master of the chantry", seats: 1, fill: "backing", top: true, judge: true},
      {key: "keeper", title: "Keeper of the node", seats: 1, fill: "appoint"},
      {key: "librarian", title: "Librarian", seats: 1, fill: "appoint"},
      {key: "sentinel", title: "Sentinel", seats: 2, fill: "appoint"}
    ],
    law: ["stealing another's lore", "drawing the Church's eye to the chantry", "taking Quintessence from the node unbidden", "slaying a fellow of the Arts", "dealings with the Order of Reason"],
    notes: "Before the Grand Convocation, willworkers gather in fellowships and chantries round a node (M20 pdf 25, 78-80; Sorcerers Crusade pdf 116). Arete stands in for standing (house rule)."
  },
  "tradition-chantry": {
    label: "A chantry of the Traditions", line: "mage", kinds: ["mages"], from: 1466, to: null,
    body: "The chantry", rank: "Arete", rankFrom: "arete", blocs: "sect", gathering: {name: "chantry council", every: 4, meets: "The chantry's council sits."},
    offices: [
      {key: "master", title: "Master of the chantry", seats: 1, fill: "backing", top: true, judge: true},
      {key: "voice", title: "Voice of a Tradition", seats: 9, fill: "clan"},
      {key: "keeper", title: "Keeper of the node", seats: 1, fill: "appoint"},
      {key: "librarian", title: "Librarian", seats: 1, fill: "appoint"},
      {key: "sentinel", title: "Sentinel", seats: 2, fill: "appoint"}
    ],
    law: ["breaking the Protocols of the Council", "betraying the chantry to the Technocracy", "slaying a mage of the Council", "taking Quintessence from the node unbidden", "drawing Paradox on the chantry"],
    notes: "The Council of Nine meets from 1466 and keeps the Protocols (M20 pdf 30, 42, 128, 141-143). Each Tradition present has a voice in the chantry, as its Deacon or Primus would (M20 pdf 127-128, 142). Arete stands in for standing (house rule)."
  },
  "order-of-reason": {
    label: "A guildhouse of the Order of Reason", line: "mage", kinds: ["mages"], reason: true, from: 1325, to: 1896,
    body: "The guildhouse", rank: "Rank", rankFrom: "rankbg", blocs: "sect", gathering: {name: "assembly", every: 4, meets: "The guildhouse holds its assembly."},
    offices: [
      {key: "grandmaster", title: "Grand master of the guildhouse", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "master", title: "Master of a Convention", seats: 7, fill: "clan"},
      {key: "warden", title: "Warden of the house", seats: 1, fill: "appoint"},
      {key: "secretary", title: "Secretary", seats: 1, fill: "appoint"}
    ],
    law: ["sharing the Order's secrets with the unenlightened", "consorting with sorcerers", "squandering the Order's means", "defying a master's order", "working wonders before the masses"],
    notes: "The Order of Reason, its Conventions answering to the guild masters (M20 pdf 128-131). Its Rank Background is the member's standing (house rule)."
  },
  "technocracy-construct": {
    label: "A Technocratic Construct", line: "mage", kinds: ["mages"], reason: true, from: 1897, to: null,
    body: "The Construct", rank: "Rank", rankFrom: "rankbg", blocs: "sect", gathering: {name: "review", every: 4, meets: "The Construct holds its quarterly review."},
    offices: [
      {key: "supervisor", title: "Supervisor", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "manager", title: "Manager for a Convention", seats: 5, fill: "clan"},
      {key: "security", title: "Head of security", seats: 1, fill: "appoint"},
      {key: "research", title: "Head of research", seats: 1, fill: "appoint"}
    ],
    law: ["breaching security protocols", "Reality Deviance", "contact with Reality Deviants", "failing to meet quota", "insubordination"],
    notes: "The Technocratic Union from 1897: Conventions, Constructs and amalgams (M20 pdf 128-131, 174-180). Its Rank Background is the member's standing (house rule).",
    eras: {future: "In the Future Darkness the Construct runs on contracts and metrics."}
  },
  inquisition: {
    label: "A tribunal of the Inquisition", line: "hunter", kinds: ["hunters"], from: null, to: 1499,
    body: "The tribunal", rank: "Status", blocs: "creed", gathering: {name: "tribunal", every: 4, meets: "The tribunal sits."},
    offices: [
      {key: "inquisitor", title: "Inquisitor", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "notary", title: "Notary", seats: 1, fill: "appoint"},
      {key: "confessor", title: "Confessor", seats: 1, fill: "appoint"},
      {key: "familiar", title: "Familiar", seats: 3, fill: "appoint"}
    ],
    law: ["heresy", "consorting with the Devil's creatures", "hiding a witch", "revealing the tribunal's work", "disobeying the Inquisitor"],
    notes: "Inquisitors of the Dark Ages hunt the Devil's own; the Inquisitor names the tribunal's officers. A house rule, since the Dark Ages Inquisitor book is not yet read."
  },
  "hunter-society": {
    label: "A society of hunters", line: "hunter", kinds: ["hunters"], from: 1500, to: 1998,
    body: "The society", rank: "Status", blocs: "creed", gathering: {name: "chapter meeting", every: 4, meets: "The chapter meets in private."},
    offices: [
      {key: "head", title: "Head of the chapter", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "archivist", title: "Archivist", seats: 1, fill: "appoint"},
      {key: "cellleader", title: "Cell leader", seats: 3, fill: "backing"}
    ],
    law: ["revealing the society", "letting a monster go", "losing the society's records", "acting without the chapter's word"],
    notes: "The Society of Leopold and the Arcanum keep chapters and cells (Hunters Hunted 2 pdf 118-124, 137-141)."
  },
  "imbued-cell": {
    label: "A cell of the imbued", line: "hunter", kinds: ["hunters"], from: 1999, to: null,
    body: "The cell", rank: "Standing", blocs: "creed", backers: "The cell", gathering: {name: "cell meeting", every: 2, meets: "The cell gets together."},
    offices: [
      {key: "voice", title: "The one the cell listens to", seats: 1, fill: "backing", top: true, judge: true},
      {key: "lookout", title: "Lookout", seats: 1, fill: "backing"}
    ],
    law: ["leaving a hunter behind", "telling the authorities", "sparing a monster the cell marked", "acting against the cell's word"],
    notes: "The imbued have no hierarchy: a cell follows whoever it trusts, and creeds pull it apart (HtR pdf 35-36, 64, 89-91, 130)."
  },
  "shemsu-heru": {
    label: "The Shemsu-heru of a city", line: "mummy", kinds: ["other"], from: null, to: null,
    body: "The Shemsu-heru", rank: "Status", blocs: "amenti", gathering: {name: "gathering", every: 4, meets: "The Undying meet in the light of Ra."},
    offices: [
      {key: "eldest", title: "Eldest of the Shemsu-heru", seats: 1, fill: "backing", top: true, judge: true},
      {key: "priest", title: "Priest to the Cult of Isis", seats: 1, fill: "appoint"},
      {key: "guardian", title: "Guardian of the tombs", seats: 2, fill: "appoint"}
    ],
    law: ["serving Set", "betraying the Cult of Isis", "neglecting the Great Rite", "harming another of the Shemsu-heru"],
    notes: "The Followers of Horus and their mortal allies of the Cult of Isis (Mummy 2nd pdf 27-29, 35-46, 136-140). The Storyteller picks this polity."
  },
  "fallen-congregation": {
    label: "A congregation of the Fallen", line: "demon", kinds: ["other"], from: 1999, to: null,
    body: "The congregation", rank: "Standing", blocs: "faction", gathering: {name: "gathering", every: 4, meets: "The Fallen gather in secret."},
    offices: [
      {key: "first", title: "First among the Fallen", seats: 1, fill: "challenge", top: true, judge: true},
      {key: "lieutenant", title: "Lieutenant", seats: 2, fill: "backing"},
      {key: "speaker", title: "Speaker for a faction", seats: 5, fill: "clan"}
    ],
    law: ["serving an Earthbound", "betraying a fellow's true name", "drawing the hunters", "breaking a pact sworn before the congregation"],
    notes: "The Fallen escape the Abyss in 1999 and split into factions: Faustians, Cryptics, Luciferans, Raveners and Reconcilers (Demon: The Fallen pdf 25, 109-118). The Storyteller picks this polity."
  },
  "kuei-jin-court": {
    label: "A court of the Kuei-jin", line: "vampire", kinds: ["kindred"], from: null, to: null,
    body: "The court", rank: "Status", blocs: "wu", gathering: {name: "court", every: 4, meets: "The court gathers before the Ancestor."},
    offices: [
      {key: "ancestor", title: "Ancestor", seats: 1, fill: "appoint", top: true, judge: true},
      {key: "mandarin", title: "Mandarin", seats: 3, fill: "appoint"},
      {key: "wu", title: "Voice of a wu", seats: 5, fill: "clan"}
    ],
    law: ["straying from one's Dharma before the court", "harming the court's mortals", "dealing with the Kin-jin", "shaming the Ancestor"],
    notes: "Courts of the Middle Kingdom: an Ancestor, mandarins, and wu as the court's blocs (KotE pdf 24, 28-30, 39-41, 88-89; the printed page numbers differ). The Storyteller picks this polity, for Asia."
  }
};
export const POLITY_LIST = Object.keys(POLITIES);

/** A mages' faction whose name or notes say it serves Reason keeps the Order's polity, else the Traditions'. */
const REASON = /technocra|order of reason|union|construct|daedalean|craftmason|cosian|high guild|celestial master|void seeker|artificer|ksirafai|iteration x|progenitor|syndicate|void engineer|new world order/i;
/** The polity a kind of faction keeps by default in a year, when it has three or more members (B1101, B1110). */
export const DEFAULTS = {
  kindred: y => (y !== null && y < 1435 ? "dark-ages-court" : "camarilla"),
  garou: () => "garou-sept",
  fae: y => (y === null || y >= 1969 ? "noble-fief" : y >= 1350 ? "commoner-freehold" : "fae-court"),
  mages: (y, f) => (REASON.test(`${f?.name ?? ""} ${f?.notes ?? ""}`)
    ? (y === null || y >= 1897 ? "technocracy-construct" : y >= 1325 ? "order-of-reason" : "mage-fellowship")
    : (y !== null && y < 1466 ? "mage-fellowship" : "tradition-chantry")),
  hunters: y => (y !== null && y < 1500 ? "inquisition" : y !== null && y < 1999 ? "hunter-society" : "imbued-cell")
};
const inYears = (p, y) => y === null || ((p.from === null || y >= p.from) && (p.to === null || y <= p.to));
/** The polity a faction follows in a year: its own pick when that exists then, else the default for its kind. */
export function polityFor(f, year = null, {memberCount = null} = {}) {
  const y = Number.isFinite(Number(year)) && year !== null ? Number(year) : null;
  const byKind = () => { const k = DEFAULTS[f?.kind]?.(y, f); return k && inYears(POLITIES[k], y) ? k : null; };
  if ( f?.polity === "none" ) return null;
  if ( f?.polity && POLITIES[f.polity] ) {
    if ( inYears(POLITIES[f.polity], y) ) return f.polity;
    // A body before (or after) its time: the polity of its age for that kind stands in (B1101); a Reason body
    // keeps to Reason's side (B1113)
    if ( POLITIES[f.polity].reason ) return DEFAULTS.mages(y, {name: "order of reason"});
    return byKind();
  }
  // The default: a faction of three or more members of a kind with a polity keeps the one of its age
  const n = memberCount ?? (f?.members?.length ?? 0);
  return n >= 3 ? byKind() : null;
}
/** The words of an office, with a court's own title for its top seat. */
export function officeTitle(polityKey, officeKey, f = null) {
  const o = POLITIES[polityKey]?.offices.find(x => x.key === officeKey);
  if ( !o ) return officeKey;
  if ( o.top && f?.politics?.title ) return f.politics.title;
  return o.title;
}
export const topOffice = key => POLITIES[key]?.offices.find(o => o.top) ?? null;
export const judgeOffice = key => POLITIES[key]?.offices.find(o => o.judge) ?? topOffice(key);

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
const ids = arr => [...new Set((Array.isArray(arr) ? arr : []).filter(x => typeof x === "string" && x))];
/**
 * The politics of one faction:
 *   offices {officeKey: [actorIds]}   ranks {actorId: 0-5}   favour {actorId: 0-9}   claims [{office, who}]
 *   docket [{id, by, against, law, turn}]   vinculum {"a>b": 1-10}   wary {actorId: turn}   lean {bloc: actorId}
 *   inner (inner turns run)   title (the court's name for its top seat)
 */
export function normPolitics(p = {}) {
  const o = p && typeof p === "object" ? p : {};
  const offices = {};
  for ( const [k, v] of Object.entries(o.offices ?? {}) ) { const l = ids(v); if ( l.length ) offices[k] = l; }
  const num = (src, lo, hi) => {
    const out = {};
    for ( const [k, v] of Object.entries(src ?? {}) ) { const n = clampInt(v, lo, hi); if ( n ) out[k] = n; }
    return out;
  };
  return {
    offices, ranks: Object.fromEntries(Object.entries(o.ranks ?? {}).filter(([k, v]) => k && v !== null && v !== "" && Number.isFinite(Number(v))).map(([k, v]) => [k, clampInt(v, 0, MAX_RANK)])), favour: num(o.favour, 0, 9), vinculum: num(o.vinculum, 0, MAX_VINCULUM), wary: num(o.wary, 0, 1e9),
    claims: (Array.isArray(o.claims) ? o.claims : []).filter(c => c && c.office && c.who).map(c => ({office: String(c.office), who: String(c.who)})).slice(0, 20),
    docket: (Array.isArray(o.docket) ? o.docket : []).filter(c => c && c.id && c.against).map(c => ({id: String(c.id), by: c.by ? String(c.by) : null,
      against: String(c.against), law: String(c.law ?? "").slice(0, 120), turn: Number(c.turn) || 0,
      ...(c.hook?.holder && c.hook?.secret ? {proof: Math.max(0, Math.min(2, Number(c.proof) || 0)), hook: {holder: String(c.hook.holder), secret: String(c.hook.secret), entry: c.hook.entry ? String(c.hook.entry) : null}} : {})})).slice(0, 20),
    lean: Object.fromEntries(Object.entries(o.lean ?? {}).filter(([k, v]) => k && typeof v === "string" && v)),
    inner: Math.max(0, Math.round(Number(o.inner) || 0)),
    title: o.title ? String(o.title).slice(0, 40) : null
  };
}
/** A member's standing: the polity's own record, else the Status on the sheet. */
/** What a polity reads from the sheet as a member's standing: Status, Garou Rank, a Changeling's Title (rankFrom). */
export const rankFrom = key => POLITIES[key]?.rankFrom ?? "status";
export const baseRank = (info, id, key = null) => clampInt(info?.[id]?.[rankFrom(key)] ?? 0, 0, MAX_RANK);
export const rankOf = (f, id, info = {}, key = null) => (f?.politics?.ranks?.[id] ?? baseRank(info, id, key));
/** The offices a member holds, as keys. */
export const officesOf = (f, id) => Object.entries(f?.politics?.offices ?? {}).filter(([, l]) => l.includes(id)).map(([k]) => k);
export const holdersOf = (f, key) => f?.politics?.offices?.[key] ?? [];
const cap = t => String(t).replace(/\b\w+/g, (w, i) => (i && /^(of|the|and)$/.test(w) ? w : w[0].toUpperCase() + w.slice(1)));
/** The plural a polity's blocs go by in the lines of a turn. */
export const BLOC_WORDS = {clan: "clans", tribe: "tribes", house: "houses", court: "courts", legion: "legions"};
/** A member's bloc: the sheet field the polity sorts by (clan, tribe, house, court, legion). */
const bloc = (info, id, key = null) => String(info?.[id]?.[POLITIES[key]?.blocs ?? "clan"] ?? "").trim().toLowerCase() || null;

/* ------------------------------------------------------------------ */
/*  Applying a politics change, with its inverse                       */
/* ------------------------------------------------------------------ */

/** The ops this file owns. */
export const POL_OPS = new Set(["pol-office", "pol-rank", "pol-favour", "pol-docket", "pol-docket-remove", "pol-claim", "pol-claim-remove",
  "pol-vinculum", "pol-wary", "pol-lean", "pol-inner", "pol-boon", "pol-fight", "pol-expose"]);
/**
 * Apply one politics change to a faction record in place. Returns its inverse (an array of changes), or null when
 * nothing changed.
 */
export function applyPolitics(f, c) {
  if ( !f ) return null;
  const p = f.politics = normPolitics(f.politics);
  switch ( c.op ) {
    case "pol-office": {
      if ( c.office === "__leader" ) return restoreLeader(f, c);
      const list = [...(p.offices[c.office] ?? [])];
      if ( c.remove ) {
        if ( !list.includes(c.actor) ) return null;
        p.offices[c.office] = list.filter(x => x !== c.actor);
        if ( !p.offices[c.office].length ) delete p.offices[c.office];
        if ( c.top && f.leader === c.actor ) f.leader = null;
        return [{op: "pol-office", faction: f.id, office: c.office, actor: c.actor, top: c.top}];
      }
      if ( list.includes(c.actor) ) return null;
      list.push(c.actor);
      p.offices[c.office] = list;
      const inv = [{op: "pol-office", faction: f.id, office: c.office, actor: c.actor, remove: true, top: c.top}];
      if ( c.top ) {
        const was = f.leader ?? null;
        f.leader = c.actor;
        if ( !f.members.includes(c.actor) ) f.members.push(c.actor);
        if ( was !== c.actor ) inv.push({op: "pol-office", faction: f.id, office: "__leader", actor: was, restore: true});
      }
      return inv;
    }
    case "pol-rank": {
      // delta from the record (or the sheet's Status when there is none yet); set / unset for Undo
      const had = c.actor in p.ranks, prev = had ? p.ranks[c.actor] : null;
      if ( c.unset ) {
        if ( !had ) return null;
        delete p.ranks[c.actor];
        return [{op: "pol-rank", faction: f.id, actor: c.actor, set: prev}];
      }
      const was = had ? prev : clampInt(c.base ?? 0, 0, MAX_RANK);
      const to = c.set !== undefined ? clampInt(c.set, 0, MAX_RANK) : clampInt(was + (Number(c.delta) || 0), 0, MAX_RANK);
      if ( had && to === was ) return null;
      if ( !had && c.set === undefined && to === was ) return null;
      p.ranks[c.actor] = to;
      return [had ? {op: "pol-rank", faction: f.id, actor: c.actor, set: prev} : {op: "pol-rank", faction: f.id, actor: c.actor, unset: true}];
    }
    case "pol-favour": {
      const was = p.favour[c.who] ?? 0, to = clampInt(c.set ?? was + (Number(c.delta) || 0), 0, 9);
      if ( to === was ) return null;
      if ( to ) p.favour[c.who] = to; else delete p.favour[c.who];
      return [{op: "pol-favour", faction: f.id, who: c.who, set: was}];
    }
    case "pol-docket": {
      if ( p.docket.some(x => x.id === c.charge.id) ) return null;
      p.docket.push({...c.charge});
      return [{op: "pol-docket-remove", faction: f.id, id: c.charge.id}];
    }
    case "pol-docket-remove": {
      const x = p.docket.find(d => d.id === c.id);
      if ( !x ) return null;
      p.docket = p.docket.filter(d => d.id !== c.id);
      return [{op: "pol-docket", faction: f.id, charge: x}];
    }
    case "pol-claim": {
      if ( p.claims.some(x => x.office === c.office && x.who === c.who) ) return null;
      p.claims.push({office: c.office, who: c.who});
      return [{op: "pol-claim-remove", faction: f.id, office: c.office, who: c.who}];
    }
    case "pol-claim-remove": {
      if ( !p.claims.some(x => x.office === c.office && x.who === c.who) ) return null;
      p.claims = p.claims.filter(x => !(x.office === c.office && x.who === c.who));
      return [{op: "pol-claim", faction: f.id, office: c.office, who: c.who}];
    }
    case "pol-vinculum": {
      const k = `${c.from}>${c.to}`, was = p.vinculum[k] ?? 0, to = clampInt(c.set ?? was + (Number(c.delta) || 0), 0, MAX_VINCULUM);
      if ( to === was ) return null;
      if ( to ) p.vinculum[k] = to; else delete p.vinculum[k];
      return [{op: "pol-vinculum", faction: f.id, from: c.from, to: c.to, set: was}];
    }
    case "pol-wary": {
      const was = p.wary[c.who] ?? 0, to = Math.max(0, Number(c.until) || 0);
      if ( to === was ) return null;
      if ( to ) p.wary[c.who] = to; else delete p.wary[c.who];
      return [{op: "pol-wary", faction: f.id, who: c.who, until: was}];
    }
    case "pol-lean": {
      const was = p.lean[c.bloc] ?? null;
      if ( was === (c.who ?? null) ) return null;
      if ( c.who ) p.lean[c.bloc] = c.who; else delete p.lean[c.bloc];
      return [{op: "pol-lean", faction: f.id, bloc: c.bloc, who: was}];
    }
    case "pol-inner": {
      const was = p.inner, to = Math.max(0, Number(c.set) || 0);
      if ( to === was ) return null;
      p.inner = to;
      return [{op: "pol-inner", faction: f.id, set: was}];
    }
    case "pol-boon": return []; // a report: the creditor calls in a boon; the Storyteller marks the ledger
    case "pol-expose": return []; // NPC 0.33.0 (B1505): a secret laid bare; WoDX NPC makes it known and spends the hook
    case "pol-fight": return []; // a report: a challenge with a player's character, staged as a fight (B1111)
    default: return null;
  }
}
/** The leader-restore half of an office inverse (internal: put back who led before the top seat changed). */
export function restoreLeader(f, c) {
  if ( c.office !== "__leader" || !c.restore ) return null;
  const was = f.leader ?? null;
  f.leader = c.actor ?? null;
  return [{op: "pol-office", faction: f.id, office: "__leader", actor: was, restore: true}];
}

/** Is a politics change big (it waits for the Storyteller)? The top seat, or anything that touches a player character. */
export function politicsBig(c, pcActors = new Set()) {
  if ( c.op === "pol-office" && c.office !== "__leader" && (pcActors.has(c.actor) || (c.top && !c.seed)) ) return true;
  if ( c.op === "pol-rank" && pcActors.has(c.actor) ) return true;
  if ( c.op === "pol-docket" && pcActors.has(c.charge?.against) ) return true;
  if ( c.op === "pol-boon" && pcActors.has(c.debtor) ) return true;
  if ( c.op === "pol-fight" ) return true;
  if ( c.op === "pol-expose" && pcActors.has(c.holder) ) return true;
  return false;
}

/** A politics change in a sentence. names: {faction(id), actor(id)}. */
export function describePolitics(c, names = {}, state = null) {
  const an = id => names.actor?.(id) ?? "someone", fn = id => names.faction?.(id) ?? "a faction";
  const f = state?.factions?.find(x => x.id === c.faction);
  const key = f ? polityFor(f, null) ?? f.polity : null;
  const title = o => (key ? officeTitle(key, o, f) : o);
  switch ( c.op ) {
    case "pol-office": return c.office === "__leader" ? `${fn(c.faction)} is led by ${c.actor ? an(c.actor) : "nobody"} again`
      : c.remove ? `${an(c.actor)} gives up the seat of ${title(c.office)} in ${fn(c.faction)}` : `${an(c.actor)} takes the seat of ${title(c.office)} in ${fn(c.faction)}`;
    case "pol-rank": return c.unset ? `${an(c.actor)}'s standing in ${fn(c.faction)} follows the sheet again` : c.set !== undefined ? `${an(c.actor)}'s standing in ${fn(c.faction)} is ${c.set}`
      : `${an(c.actor)}: standing in ${fn(c.faction)} ${c.delta > 0 ? "+" : ""}${c.delta}`;
    case "pol-favour": return c.set !== undefined ? (c.set ? `${an(c.who)}'s favour in ${fn(c.faction)} falls to ${c.set}` : `${an(c.who)}'s favour in ${fn(c.faction)} is spent`) : `${an(c.who)} gains favour in ${fn(c.faction)} (${c.delta > 0 ? "+" : ""}${c.delta})`;
    case "pol-docket": return `${an(c.charge?.by)} accuses ${an(c.charge?.against)} of ${c.charge?.law || "a wrong"} before ${fn(c.faction)}`;
    case "pol-docket-remove": return `A charge before ${fn(c.faction)} is settled`;
    case "pol-claim": return `${an(c.who)} claims the seat of ${title(c.office)}`;
    case "pol-claim-remove": return `A claim to ${title(c.office)} is settled`;
    case "pol-vinculum": return `${an(c.from)}'s Vinculum to ${an(c.to)} ${c.set !== undefined ? `is ${c.set}` : `${c.delta > 0 ? "+" : ""}${c.delta}`}`;
    case "pol-wary": return `${an(c.who)} watches for a move against them`;
    case "pol-lean": return c.who ? `The ${cap(c.bloc)} lean toward ${an(c.who)}` : `The ${c.bloc} lean toward nobody`;
    case "pol-inner": return `${fn(c.faction)}'s politics move on`;
    case "pol-boon": return `${an(c.creditor)} calls in a ${c.size ?? ""} boon from ${an(c.debtor)}`.replace("a  boon", "a boon");
    case "pol-expose": return `${an(c.finder)} lays bare ${an(c.holder)}'s secret: ${c.law ?? "a hidden wrong"}`;
    case "pol-fight": return `${an(c.challenger)} challenges ${an(c.holder)} by ${c.how ?? "a challenge"}${c.office ? ` for ${c.title ?? "a seat"}` : " for Rank"}: stage it as a fight${c.noKill ? ", ended at submission" : ""}`;
    default: return c.op;
  }
}

/* ------------------------------------------------------------------ */
/*  The inner turn                                                     */
/* ------------------------------------------------------------------ */

const rollDice = (rand, n) => Array.from({length: Math.max(0, n)}, () => 1 + Math.floor(rand() * 10));
/** Successes, less one for each 1; a botch is no successes and a 1 (V20 pdf 257). */
export function hits(dice, difficulty) {
  const d = Math.max(2, Math.min(10, difficulty));
  const h = dice.filter(x => x >= d).length, ones = dice.filter(x => x === 1).length;
  return {net: Math.max(0, h - ones), botch: h === 0 && ones > 0};
}
const attr = (info, id, k) => clampInt(info?.[id]?.attrs?.[k] ?? 2, 0, 10) || 2;
const roll = (rand, n, diff) => { const dice = rollDice(rand, Math.max(1, n)); return {dice, ...hits(dice, diff)}; };
/** The contests a challenged Garou may pick from (W20 pdf 253-254): the one challenged picks the one they are best at. */
export const CONTESTS = [
  {how: "a contest of strength", pair: ["strength", "dexterity"]},
  {how: "a riddle contest", pair: ["wits", "perception"]},
  {how: "a staring contest", pair: ["charisma", "manipulation"]}
];
/** How a challenge is fought: a duel in a court; in a polity that lets the challenged choose, their best contest. */
export function contestFor(key, info, holder) {
  if ( !POLITIES[key]?.riseByChallenge ) return {how: "a challenge", pair: ["strength", "dexterity"]};
  return [...CONTESTS].sort((a, b) => (attr(info, holder, b.pair[0]) + attr(info, holder, b.pair[1])) - (attr(info, holder, a.pair[0]) + attr(info, holder, a.pair[1])))[0];
}

/** The weights of the six inner moves for one member (B1102). */
export const INNER_MOVES = {
  petition: "Petition", court: "Court a bloc", accuse: "Accuse", favour: "Call in a favour", bid: "Bid for office", wait: "Lie in wait"
};
function pick(rand, weights) {
  const total = Object.values(weights).reduce((a, b) => a + Math.max(0, b), 0);
  if ( total <= 0 ) return "petition";
  let r = rand() * total;
  for ( const [k, w] of Object.entries(weights) ) { r -= Math.max(0, w); if ( r < 0 ) return k; }
  return Object.keys(weights).at(-1);
}

/** Seats with room in them, for an office. */
function openSeats(f, key, o, info) {
  const held = holdersOf(f, key).filter(id => live(info, id) && f.members.includes(id));
  if ( o.fill === "clan" ) {
    const clans = new Set(f.members.filter(id => live(info, id)).map(id => bloc(info, id, key)).filter(Boolean));
    return Math.max(0, Math.min(o.seats, clans.size) - held.length);
  }
  return Math.max(0, o.seats - held.length);
}
const live = (info, id) => info?.[id] ? info[id].alive !== false : true;

/**
 * One inner turn for a faction with a polity. Returns {changes, lines, gathering} where lines are plain sentences
 * for the Storyteller's card.
 *   ctx: {rand, polity (key), info {actorId: {name, alive, pc, clan, status, attrs}}, boons [{id, size, from, to}] (open),
 *         turn, year, era ("revolt" | "future" | null)}
 */
export function innerTurn(f, ctx = {}) {
  const key = ctx.polity, P = POLITIES[key], body = P?.body ?? "The court", here = body.toLowerCase(), blocs = BLOC_WORDS[P?.blocs] ?? "clans";
  const rand = ctx.rand ?? Math.random, info = ctx.info ?? {}, turn = ctx.turn ?? 0;
  const out = {changes: [], lines: [], groups: [], gathering: false};
  if ( !P ) return out;
  const p = normPolitics(f.politics);
  const name = id => info[id]?.name ?? "someone";
  // Each move (and each item of a gathering) is one group, so the Storyteller takes or refuses it whole
  const step = () => out.groups.push({changes: [], lines: []});
  const add = c => { if ( !out.groups.length ) step(); const x = {faction: f.id, ...c}; out.changes.push(x); out.groups.at(-1).changes.push(x); };
  const say = t => { if ( !out.groups.length ) step(); out.lines.push(t); out.groups.at(-1).lines.push(t); };
  const members = f.members.filter(id => live(info, id));
  const top = topOffice(key);

  // Seats held by the dead or by those who left fall empty
  for ( const [k, list] of Object.entries(p.offices) ) for ( const id of list ) {
    if ( !live(info, id) || !f.members.includes(id) ) {
      step();
      add({op: "pol-office", office: k, actor: id, remove: true, top: k === top?.key});
      say(`${name(id)} no longer holds the seat of ${officeTitle(key, k, f)}.`);
    }
  }
  const view = {...f, politics: p};
  // A leader with no seat yet holds the top one: the record catches up with the court as it stands
  if ( top && !holdersOf(view, top.key).some(id => live(info, id) && f.members.includes(id)) && f.leader && live(info, f.leader) && f.members.includes(f.leader) ) {
    step();
    add({op: "pol-office", office: top.key, actor: f.leader, top: true, seed: true});
    p.offices[top.key] = [...(p.offices[top.key] ?? []), f.leader];
  }

  // Up to three NPC members act, the highest standing first
  const actors = members.filter(id => !info[id]?.pc).sort((a, b) => rankOf(view, b, info, key) - rankOf(view, a, info, key) || name(a).localeCompare(name(b))).slice(0, ACTORS_PER_TURN);
  for ( const id of actors ) {
    const r = rankOf(view, id, info, key), mine = officesOf(view, id);
    const owed = (ctx.boons ?? []).filter(b => b.to === id && b.from && members.includes(b.from));
    const accused = p.docket.some(d => d.against === id);
    const vacant = P.offices.filter(o => openSeats(view, o.key, o, info) > 0 && !mine.includes(o.key));
    const blocsLeft = [...new Set(members.map(m => bloc(info, m, key)).filter(k => k && k !== bloc(info, id, key) && p.lean[k] !== id))].length;
    const w = {petition: 3, court: blocsLeft ? 2 : 0, accuse: 1, favour: owed.length ? 3 : 0, bid: vacant.length ? 3 : (r >= 3 && !mine.length ? 1 : 0.3), wait: accused ? 3 : 0.5};
    const move = pick(rand, w);
    step();
    switch ( move ) {
      case "petition": {
        const x = roll(rand, attr(info, id, "charisma") + r, 6);
        if ( x.net ) { add({op: "pol-favour", who: id, delta: x.net >= 3 ? 2 : 1}); say(`${name(id)} petitions ${here} and is heard (${x.net} success${x.net === 1 ? "" : "es"}).`); }
        else say(`${name(id)} petitions ${here}${x.botch ? " and gives offence" : " but is not heard"}.`);
        if ( x.botch ) add({op: "pol-favour", who: id, set: 0});
        break;
      }
      case "court": {
        const b = bloc(info, id, key) ? [...new Set(members.map(m => bloc(info, m, key)).filter(k => k && k !== bloc(info, id, key)))] : [];
        const open = b.filter(k => p.lean[k] !== id);
        const target = open.length ? open[Math.floor(rand() * open.length)] : null;
        const x = roll(rand, attr(info, id, "manipulation") + r, 7);
        if ( target && x.net ) { add({op: "pol-lean", bloc: target, who: id}); say(`${name(id)} wins the ${cap(target)} to their side.`); }
        else say(`${name(id)} courts the other ${blocs} without result.`);
        break;
      }
      case "accuse": {
        // The top seat is beyond a charge, save among the Anarchs
        const rivals = members.filter(m => m !== id && (key === "anarch" || !officesOf(view, m).includes(top?.key)));
        // NPC 0.33.0 (B1505): a secret found on a member is the charge, and the proof makes it stick
        const hook = hooksFor(id, ctx.hooks ?? [], rivals, {polity: key, year: ctx.year ?? null})[0] ?? null;
        const against = hook?.holder ?? rivals.sort((a, b) => rankOf(view, b, info, key) - rankOf(view, a, info, key))[0] ?? null;
        if ( !against ) { say(`${name(id)} finds nobody worth accusing.`); break; }
        if ( hook ) {
          const law = SECRET_KINDS[hook.secret.kind]?.law ?? "a hidden wrong";
          add({op: "pol-docket", charge: {id: `${f.id}:${turn}:${id}`, by: id, against, law, turn, proof: hook.weight, hook: {holder: hook.holder, secret: hook.secret.id, entry: hook.entry ?? null}}});
          say(`${name(id)} accuses ${name(against)} of ${law}, and has proof; it will be heard at the next ${P.gathering.name}.`);
          break;
        }
        const wary = (p.wary[against] ?? 0) >= turn;
        const x = roll(rand, attr(info, id, "manipulation") + r, 6 + (wary ? 1 : 0)), y = roll(rand, attr(info, against, "wits") + rankOf(view, against, info, key), 6);
        if ( x.net > y.net ) {
          const law = P.law[Math.floor(rand() * P.law.length)];
          add({op: "pol-docket", charge: {id: `${f.id}:${turn}:${id}`, by: id, against, law, turn}});
          say(`${name(id)} accuses ${name(against)} of ${law}; it will be heard at the next ${P.gathering.name}.`);
        } else say(`${name(id)} moves to accuse ${name(against)}, but the charge will not stick.`);
        break;
      }
      case "favour": {
        const b = owed[0];
        add({op: "pol-boon", creditor: id, debtor: b.from, entry: b.id, size: b.size});
        add({op: "pol-favour", who: id, delta: b.size === "trivial" ? 1 : 2});
        say(`${name(id)} calls in a ${b.size ?? ""} boon from ${name(b.from)}; mark it in the Ledger when it is paid.`.replace("a  boon", "a boon"));
        break;
      }
      case "bid": {
        if ( mine.includes(topOffice(key)?.key) ) { say(`${name(id)} sees to the business of the top seat.`); break; }
        const o = vacant.find(x => !x.top) ?? vacant[0] ?? P.offices.filter(x => !x.top && !mine.includes(x.key)).sort(() => rand() - 0.5)[0];
        if ( !o ) { say(`${name(id)} looks for a seat and finds none.`); break; }
        const holders = holdersOf(view, o.key).filter(h => live(info, h) && f.members.includes(h));
        const free = openSeats(view, o.key, o, info) > 0;
        if ( o.fill === "appoint" || (free && o.fill !== "backing") ) {
          if ( o.fill === "clan" ) break; // the clan's eldest takes it at the gathering
          add({op: "pol-claim", office: o.key, who: id});
          say(`${name(id)} lays a claim to the seat of ${officeTitle(key, o.key, f)}.`);
          break;
        }
        const holder = holders.sort((a, b) => rankOf(view, a, info, key) - rankOf(view, b, info, key))[0] ?? null;
        if ( o.fill === "backing" ) {
          const mineF = (p.favour[id] ?? 0) + r, theirs = holder ? (p.favour[holder] ?? 0) + rankOf(view, holder, info, key) : -1;
          if ( mineF > theirs ) {
            if ( holder ) add({op: "pol-office", office: o.key, actor: holder, remove: true, top: !!o.top});
            add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
            add({op: "pol-favour", who: id, set: 0});
            say(`${P.backers ?? body} back${P.backers ? "" : "s"} ${name(id)} over ${holder ? name(holder) : "nobody"} for ${officeTitle(key, o.key, f)}.`);
          } else say(`${name(id)} looks for backing against ${holder ? name(holder) : "the holder"} and finds too little.`);
          break;
        }
        // A challenge: monomacy in the Sabbat, a duel or a test in a court (B1103). Rolled here between NPCs; the
        // Storyteller may stage it as a fight instead when the card comes in.
        if ( !holder ) break;
        const wary = (p.wary[holder] ?? 0) >= turn;
        const vin = key === "sabbat" && (p.vinculum[`${id}>${holder}`] ?? 0) >= 7 ? 1 : 0;
        const c = contestFor(key, info, holder);
        const how = key === "sabbat" ? "monomacy" : c.how;
        // A player's character in the challenge: the Storyteller stages it as a fight, nothing is rolled here (B1111)
        if ( info[id]?.pc || info[holder]?.pc ) {
          add({op: "pol-fight", challenger: id, holder, office: o.key, title: officeTitle(key, o.key, f), how, noKill: !!P.noKill, top: !!o.top});
          say(`${name(id)} challenges ${name(holder)} for ${officeTitle(key, o.key, f)} by ${how}; the Storyteller stages it.`);
          break;
        }
        const x = roll(rand, attr(info, id, c.pair[0]) + attr(info, id, c.pair[1]), 6 + (wary ? 1 : 0) + vin);
        const y = roll(rand, attr(info, holder, c.pair[0]) + attr(info, holder, c.pair[1]), 6);
        if ( x.net > y.net ) {
          add({op: "pol-office", office: o.key, actor: holder, remove: true, top: !!o.top});
          add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
          add({op: "pol-rank", actor: holder, delta: -1, base: baseRank(info, holder, key)});
          say(`${name(id)} wins the seat of ${officeTitle(key, o.key, f)} from ${name(holder)} by ${how} (${x.net} to ${y.net}).`);
        } else {
          add({op: "pol-rank", actor: id, delta: -1, base: baseRank(info, id, key)});
          say(`${name(id)} challenges ${name(holder)} for ${officeTitle(key, o.key, f)} by ${how} and loses (${x.net} to ${y.net}).`);
        }
        break;
      }
      case "wait": {
        add({op: "pol-wary", who: id, until: turn + 1});
        say(`${name(id)} keeps a careful watch.`);
        break;
      }
    }
  }

  // The gathering, every few inner turns
  const inner = p.inner + 1;
  add({op: "pol-inner", set: inner});
  if ( inner % Math.max(1, P.gathering.every) === 0 ) {
    out.gathering = true;
    say(P.gathering.meets);
    gather(view, key, ctx, add, say, step, out.changes);
  }
  return out;
}

/** The gathering: charges heard, seats filled, standing granted, the Vaulderie shared. */
function gather(f, key, ctx, add, lines, step, sofar) {
  const P = POLITIES[key], info = ctx.info ?? {}, rand = ctx.rand ?? Math.random, body = P.body ?? "The court";
  const p = f.politics, name = id => info[id]?.name ?? "someone";
  const members = f.members.filter(id => live(info, id));
  const removed = new Set(sofar.filter(c => c.op === "pol-office" && c.remove).map(c => `${c.office}:${c.actor}`));
  const taken = new Set(sofar.filter(c => c.op === "pol-office" && !c.remove).map(c => `${c.office}:${c.actor}`));
  const holds = (k, id) => (holdersOf(f, k).includes(id) && !removed.has(`${k}:${id}`)) || taken.has(`${k}:${id}`);
  const judgeKey = judgeOffice(key)?.key, judge = members.find(id => holds(judgeKey, id)) ?? null;
  const weight = id => (p.favour[id] ?? 0) + rankOf(f, id, info, key) + Object.values(p.lean).filter(w => w === id).length;

  // Charges
  for ( const d of p.docket ) {
    step();
    add({op: "pol-docket-remove", id: d.id});
    if ( !members.includes(d.against) ) { lines(`The charge against ${name(d.against)} is dropped: they are gone.`); continue; }
    // The judge's word weighs: a charge the judge brings, or one against the judge, leans that way
    const a = weight(d.by ?? "") + rollDice(rand, 1)[0] + (judge && d.by === judge ? 3 : 0) + 3 * (Number(d.proof) || 0), b = weight(d.against) + rollDice(rand, 1)[0] + (judge && d.against === judge ? 3 : 0);
    // A charge with proof lays the secret bare, whatever the verdict
    if ( d.hook ) add({op: "pol-expose", holder: d.hook.holder, secret: d.hook.secret, entry: d.hook.entry ?? null, finder: d.by ?? null, law: d.law});
    if ( a > b ) {
      add({op: "pol-rank", actor: d.against, delta: -1, base: baseRank(info, d.against, key)});
      lines(`${judge ? name(judge) : body} finds ${name(d.against)} guilty of ${d.law}: they lose standing.`);
    } else {
      if ( d.by ) add({op: "pol-favour", who: d.by, set: Math.max(0, (p.favour[d.by] ?? 0) - 1)});
      lines(`${judge ? name(judge) : body} clears ${name(d.against)} of ${d.law}.`);
    }
  }

  // Seats: claims first, then the clans' seats, then any seat still empty
  const holding = new Set();
  for ( const o of P.offices ) for ( const id of members ) if ( holds(o.key, id) ) holding.add(id);
  for ( const o of P.offices ) {
    let room = o.seats - members.filter(id => holds(o.key, id)).length;
    const claims = p.claims.filter(c => c.office === o.key);
    if ( claims.length ) step();
    for ( const c of claims ) add({op: "pol-claim-remove", office: c.office, who: c.who});
    if ( o.fill === "clan" ) {
      const seated = new Set(members.filter(id => holds(o.key, id)).map(id => bloc(info, id, key)));
      const clans = [...new Set(members.map(id => bloc(info, id, key)).filter(Boolean))].filter(k => !seated.has(k));
      for ( const k of clans ) {
        if ( room <= 0 ) break;
        const eldest = members.filter(id => bloc(info, id, key) === k).sort((a, b) => rankOf(f, b, info, key) - rankOf(f, a, info, key) || name(a).localeCompare(name(b)))[0];
        step(); add({op: "pol-office", office: o.key, actor: eldest}); room--;
        lines(o.key === "primogen" ? `${name(eldest)} takes the ${cap(k)} seat among the ${o.title}.` : `${name(eldest)} becomes ${o.title.replace(/ a \w+$/, " the " + cap(k))}.`);
      }
      continue;
    }
    if ( room <= 0 ) continue;
    const topKey = topOffice(key)?.key;
    const want = claims.map(c => c.who).filter(id => members.includes(id) && !holds(o.key, id) && (o.top || !holds(topKey, id)));
    const pool = want.length ? want : (o.top ? members : members.filter(id => !holding.has(id)));
    const ranked = [...new Set(pool)].sort((a, b) => weight(b) - weight(a) || name(a).localeCompare(name(b)));
    for ( const id of ranked.slice(0, o.top ? 1 : room) ) {
      if ( !o.top && !want.length && info[id]?.pc ) continue; // a player's character is never seated unasked
      step();
      add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
      if ( want.length ) add({op: "pol-favour", who: id, set: 0});
      holding.add(id);
      lines(`${o.top ? `${body} raises` : judge ? `${name(judge)} names` : `${body} names`} ${name(id)} ${o.title}.`);
    }
  }

  // Standing: the one with most favour gains a dot (the judge's gift), the favour spent (B1104)
  const best = members.filter(id => (p.favour[id] ?? 0) >= 3).sort((a, b) => (p.favour[b] ?? 0) - (p.favour[a] ?? 0))[0];
  if ( best && best !== judge ) {
    step();
    add({op: "pol-rank", actor: best, delta: 1, base: baseRank(info, best, key)});
    add({op: "pol-favour", who: best, set: 0});
    lines(`${judge ? name(judge) : body} grants ${name(best)} new standing.`);
  }

  // Rising in Rank (W20 pdf 253-254): at the moot one who has earned it challenges a Garou of higher Rank
  if ( P.riseByChallenge ) {
    const seeker = members.filter(id => rankOf(f, id, info, key) < MAX_RANK && (p.favour[id] ?? 0) >= 2 && id !== best)
      .sort((a, b) => (p.favour[b] ?? 0) - (p.favour[a] ?? 0) || name(a).localeCompare(name(b)))[0];
    const r = seeker ? rankOf(f, seeker, info, key) : 0;
    const above = seeker ? members.filter(id => rankOf(f, id, info, key) > r).sort((a, b) => rankOf(f, a, info, key) - rankOf(f, b, info, key))[0] : null;
    if ( seeker && above ) {
      step();
      const c = contestFor(key, info, above);
      add({op: "pol-favour", who: seeker, set: 0});
      if ( info[seeker]?.pc || info[above]?.pc ) {
        add({op: "pol-fight", challenger: seeker, holder: above, office: null, how: c.how, noKill: true, rise: true});
        lines(`${name(seeker)} challenges ${name(above)} for Rank; ${name(above)} picks ${c.how}, and the Storyteller stages it.`);
      } else {
        const x = roll(rand, attr(info, seeker, c.pair[0]) + attr(info, seeker, c.pair[1]), 6), y = roll(rand, attr(info, above, c.pair[0]) + attr(info, above, c.pair[1]), 6);
        if ( x.net > y.net ) {
          add({op: "pol-rank", actor: seeker, delta: 1, base: baseRank(info, seeker, key)});
          lines(`${name(seeker)} challenges ${name(above)} for Rank by ${c.how} and wins (${x.net} to ${y.net}): the sept names them a Rank higher.`);
        } else lines(`${name(seeker)} challenges ${name(above)} for Rank by ${c.how} and fails (${x.net} to ${y.net}).`);
      }
    }
  }

  // The Vaulderie (V20 pdf 297): a die per packmate at the first rite; later, a die above the rating raises it by 1
  if ( P.vinculum ) {
    step();
    const pack = members.slice(0, 8);
    let first = 0, grew = 0;
    for ( const a of pack ) for ( const b of pack ) {
      if ( a === b ) continue;
      const k = `${a}>${b}`, v = p.vinculum[k] ?? 0, d = rollDice(rand, 1)[0];
      if ( !v ) { add({op: "pol-vinculum", from: a, to: b, set: d}); first++; }
      else if ( d > v && v < MAX_VINCULUM ) { add({op: "pol-vinculum", from: a, to: b, delta: 1}); grew++; }
    }
    if ( pack.length > 1 ) lines(`The Vaulderie is shared${first ? `; ${first} new Vinculum${first === 1 ? "" : "s"}` : ""}${grew ? `; ${grew} grow stronger` : ""}.`);
  }
}

/* ------------------------------------------------------------------ */
/*  A Great Maelstrom                                                   */
/* ------------------------------------------------------------------ */

/** Chronicle events that are a Great Maelstrom. */
export const isMaelstrom = id => /great-maelstrom$/.test(String(id ?? ""));
/**
 * A Great Maelstrom sweeps the Shadowlands: in each faction run as a necropolis, every seat but the top one is lost
 * on a die of 1 to 5 (the Tempest takes the officer or scatters the legion). Returns changes.
 */
export function maelstromChanges(state, {year = null, rand = Math.random} = {}) {
  const out = [];
  for ( const f of state?.factions ?? [] ) {
    if ( f.dormant || polityFor(f, year) !== "wraith-legion" ) continue;
    for ( const o of POLITIES["wraith-legion"].offices ) {
      if ( o.top ) continue;
      for ( const id of holdersOf(f, o.key) ) if ( rollDice(rand, 1)[0] <= 5 ) out.push({op: "pol-office", faction: f.id, office: o.key, actor: id, remove: true});
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Boons settled in the Ledger                                         */
/* ------------------------------------------------------------------ */

/** Boon sizes that earn the debtor standing when paid (a house rule, B1104). */
export const PAID_GAINS = new Set(["major", "blood", "life"]);
/**
 * A boon settled in the Storyteller's Ledger: a broken boon costs the debtor standing in each polity they belong to
 * (Guide to the Camarilla pdf 148-150); a large one paid earns a dot (house rule). Returns changes.
 *   entry: {kind, size, from: {id}, to: {id}}, status "kept" | "broken"
 */
export function boonChanges(state, entry, status, {info = {}, year = null} = {}) {
  if ( entry?.kind !== "boon" || !entry.from?.id ) return [];
  const delta = status === "broken" ? -1 : status === "kept" && PAID_GAINS.has(entry.size) ? 1 : 0;
  if ( !delta ) return [];
  const out = [];
  for ( const f of state.factions ?? [] ) {
    if ( f.dormant || !f.members.includes(entry.from.id) ) continue;
    if ( !polityFor(f, year) ) continue;
    out.push({op: "pol-rank", faction: f.id, actor: entry.from.id, delta, base: baseRank(info, entry.from.id, polityFor(f, year)), why: status === "broken" ? "a broken boon" : "a boon paid"});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  What a player sees (NPC 0.29.0)                                     */
/* ------------------------------------------------------------------ */

/**
 * What the players whose characters belong to a faction see of its politics (B1116): the polity, who holds each seat,
 * when it next gathers, and for their own characters only, standing, seats, favour, claims and the charges against
 * them. Others' favour, claims, leanings, Vinculum and the charges they face stay with the Storyteller.
 *   mine: the player's actor ids; info: as for innerTurn (only mine need be filled); names: {actor(id)}
 * Returns null when the faction keeps no polity in that year or none of mine belong to it.
 */
export function playerView(f, mine = [], {year = null, info = {}, names = {}} = {}) {
  const key = polityFor(f, year), P = POLITIES[key];
  const own = mine.filter(id => f?.members?.includes(id));
  if ( !P || !own.length ) return null;
  const p = normPolitics(f.politics), an = id => names.actor?.(id) ?? info[id]?.name ?? "someone";
  const every = Math.max(1, P.gathering.every), next = every - (p.inner % every);
  const seats = P.offices.map(o => ({key: o.key, title: officeTitle(key, o.key, f), seats: o.seats,
    holders: (p.offices[o.key] ?? []).filter(id => f.members.includes(id)).map(an)}));
  const people = own.map(id => ({id, name: an(id), rank: rankOf(f, id, info, key), offices: officesOf(f, id).map(k => officeTitle(key, k, f)),
    favour: p.favour[id] ?? 0, claims: p.claims.filter(c => c.who === id).map(c => officeTitle(key, c.office, f)),
    charges: p.docket.filter(d => d.against === id).map(d => d.law)}));
  return {key, label: P.label, rank: P.rank, gathering: P.gathering.name, nextIn: next, law: P.law.slice(), notes: P.notes, seats, people};
}
