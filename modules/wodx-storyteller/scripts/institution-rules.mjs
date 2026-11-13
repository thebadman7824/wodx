/**
 * Influence over institutions (B3355-B3360): the pure part. No Foundry here, so the harness can test it.
 *
 * Each town (a market, as WoDX Storyteller's towns are) holds the mortal institutions its year, faith and size allow:
 * the house of worship, a guild, the council, the watch and later the police, a press, a university, a bank, later a
 * company. Each has a ladder of five ranks; each rank opens levers (B3356). A seat is held by a character, an NPC, or
 * a pawn (a ghoul, a retainer) standing for a character. Climbing is a downtime project (B3357); a pawn can rise no
 * higher than the character's Influence (V20 pdf 122: pull in the mortal world; V20 Dark Ages pdf 175-183). Once a
 * month the institution turns (B3358): empty seats fill, rivals contest a seat, a scandal can unseat someone.
 * The years are rounded history for the Czech lands and western Europe, with other faiths' houses of worship; the
 * ladders, levers and chances are house figures (docs/PENDING-REVIEW.md).
 *
 * Offices of the law and the state (B3604): the court, the ruler's administration, the tax office, the garrison, and,
 * where the law of the land keeps them, the Inquisition and the secret police. Their ranks follow the town's law
 * family (WoDX Chronicle's law of the land) and the year. A town's "needs" are the order list of its law that year.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, k = 80) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, k);
export const RANKS = 5;

/** The house of worship by faith: its name and the five ranks. */
export const WORSHIP = {
  western: {name: "the parish and the diocese", ranks: ["Parish clerk", "Priest", "Dean", "Canon of the chapter", "Bishop"]},
  orthodox: {name: "the parish and the eparchy", ranks: ["Reader", "Priest", "Archpriest", "Archimandrite", "Bishop"]},
  islamic: {name: "the mosque and its madrasa", ranks: ["Student", "Muezzin", "Imam", "Qadi", "Mufti"]},
  jewish: {name: "the synagogue and the community", ranks: ["Member", "Gabbai", "Elder of the community", "Rabbi", "Chief rabbi"]},
  hindu: {name: "the temple", ranks: ["Temple servant", "Priest", "Senior priest", "Temple trustee", "Head of the temple"]},
  theravada: {name: "the monastery", ranks: ["Novice", "Monk", "Senior monk", "Abbot", "Head of the order here"]},
  tibetan: {name: "the monastery", ranks: ["Novice", "Monk", "Geshe", "Abbot", "Lama of the house"]},
  chinese: {name: "the temple and the clan hall", ranks: ["Temple servant", "Priest", "Clan elder", "Temple master", "Head of the clan hall"]},
  own: {name: "the shrine", ranks: ["Helper", "Keeper", "Elder", "Speaker", "Head of the shrine"]}
};

/** Ranks by law family, then a fallback; each entry is [from year, ranks]. The last entry whose year has come wins. */
const byLaw = table => (year, law) => { const rows = table[law] ?? table["*"]; let out = rows[0][1]; for ( const [from, r] of rows ) if ( year >= from ) out = r; return out; };
const MODERN_COURT = ["Clerk of the court", "Advocate", "Prosecutor", "Judge", "President of the court"];
const COURT = {
  latin: [[0, ["Court scribe", "Notary", "Assessor", "Judge", "Chief justice of the land"]], [1800, MODERN_COURT]],
  common: [[0, ["Clerk of the court", "Bailiff of the court", "Serjeant-at-law", "Justice", "Lord Chief Justice"]], [1850, ["Clerk of the court", "Solicitor", "Barrister", "Judge", "Lord Chief Justice"]]],
  orthodox: [[0, ["Scribe", "Clerk of the prince's court", "Judge of the district", "Judge of the land", "The prince's chief judge"]], [1864, MODERN_COURT], [1917, ["Clerk", "Defender", "Prosecutor", "People's judge", "Chair of the tribunal"]], [1991, MODERN_COURT]],
  islamic: [[0, ["Scribe of the court", "Witness of the court", "Deputy qadi", "Qadi", "Chief qadi"]], [1880, MODERN_COURT]],
  chinese: [[0, ["Yamen clerk", "Private secretary", "Assistant magistrate", "Magistrate", "Prefect"]], [1912, MODERN_COURT]],
  "south-asia": [[0, ["Scribe", "Pandit of the court", "Judge of the town", "Chief judge", "The king's minister of justice"]], [1772, ["Clerk", "Pleader", "Law officer", "Judge", "Chief justice"]], [1950, MODERN_COURT]],
  japanese: [[0, ["Scribe", "Clerk of the court", "Investigator", "Magistrate", "Chief magistrate"]], [1868, MODERN_COURT]],
  "*": [[0, ["Helper of the court", "Speaker for the parties", "Elder of the court", "Judge", "Chief judge"]], [1900, MODERN_COURT]]
};
const RULER = {
  latin: [[0, ["Page", "Clerk of the chancery", "Steward", "Chamberlain", "The lord's governor"]], [1650, ["Copyist", "Secretary", "Councillor", "Privy councillor", "Governor of the land"]], [1850, ["Clerk", "Official", "Councillor", "Head of department", "Governor of the province"]]],
  common: [[0, ["Clerk", "Under-sheriff", "Sheriff", "Lord lieutenant", "Royal governor"]], [1850, ["Clerk", "Civil servant", "Principal", "Permanent secretary", "Minister"]]],
  orthodox: [[0, ["Scribe", "Clerk of the chancery", "Voivode's deputy", "Voivode", "Governor"]], [1722, ["Collegiate registrar", "Titular councillor", "Collegiate assessor", "State councillor", "Governor"]], [1917, ["Clerk", "Instructor", "Secretary of the committee", "First secretary", "Member of the Central Committee"]], [1991, ["Clerk", "Official", "Head of department", "Deputy governor", "Governor"]]],
  islamic: [[0, ["Scribe of the chancery", "Secretary", "Revenue officer", "Vizier's deputy", "Governor of the province"]], [1900, ["Clerk", "Official", "Director", "Deputy governor", "Governor"]]],
  chinese: [[0, ["Clerk", "Licentiate", "County magistrate", "Prefect", "Governor of the province"]], [1912, ["Clerk", "Official", "County head", "Provincial official", "Governor of the province"]], [1949, ["Cadre", "Section head", "County Party secretary", "Prefecture secretary", "Provincial Party secretary"]]],
  japanese: [[0, ["Retainer", "Steward", "Magistrate", "Elder of the house", "The lord of the domain"]], [1871, ["Clerk", "Official", "Section chief", "Vice-governor", "Prefectural governor"]]],
  "*": [[0, ["Servant of the ruler", "Messenger", "Officer", "Chief officer", "The ruler's right hand"]], [1900, ["Clerk", "Official", "Head of department", "Deputy governor", "Governor"]]]
};
const ARMY = {"*": [[0, ["Man-at-arms", "Sergeant", "Captain", "Castellan", "Marshal"]], [1650, ["Private", "Sergeant", "Lieutenant", "Captain", "Colonel"]]],
  japanese: [[0, ["Foot soldier", "Squad leader", "Samurai officer", "Captain of the guard", "Commander of the castle"]], [1873, ["Private", "Sergeant", "Lieutenant", "Captain", "Colonel"]]],
  chinese: [[0, ["Soldier", "Squad leader", "Company officer", "Battalion commander", "Brigade general"]], [1912, ["Private", "Sergeant", "Lieutenant", "Captain", "Colonel"]]],
  islamic: [[0, ["Soldier", "Officer of ten", "Officer of a hundred", "Commander of the fort", "Commander of the province's army"]], [1830, ["Private", "Sergeant", "Lieutenant", "Captain", "Colonel"]]]};
const TAX = {"*": [[0, ["Tax clerk", "Collector", "Assessor", "Receiver", "Treasurer of the land"]], [1850, ["Clerk", "Tax inspector", "Assessor", "Head of the tax office", "Director of revenue"]]],
  islamic: [[0, ["Scribe of the revenue", "Collector", "Assessor of the land tax", "Tax farmer", "Head of the treasury here"]], [1850, ["Clerk", "Tax inspector", "Assessor", "Head of the tax office", "Director of revenue"]]],
  chinese: [[0, ["Tax clerk", "Collector of grain", "Granary keeper", "Assistant prefect for revenue", "Commissioner of revenue"]], [1912, ["Clerk", "Tax inspector", "Assessor", "Head of the tax office", "Director of revenue"]]]};

/**
 * The kinds. from/to: years (null: always); people: the least a town needs; ranks: the ladder (a function of the year
 * where the names change); levers: [rank index needed, key, words].
 */
export const KINDS = {
  worship: {label: "House of worship", from: null, to: null, people: 0, ability: "etiquette",
    levers: [[1, "records", "Find or lose a record of birth, marriage or death"], [2, "denounce", "Denounce someone from the pulpit"], [3, "sanctuary", "Give someone sanctuary"], [4, "inquiry", "Call for an inquiry into heresy or sin"]]},
  guild: {label: "Guild", from: null, to: 1859, people: 800, ability: "craft", ranks: ["Apprentice", "Journeyman", "Master", "Elder of the guild", "Guild warden"],
    levers: [[2, "permit", "Grant or refuse leave to practise the trade"], [3, "prices", "Set the price of the trade's goods for a season"], [4, "expel", "Expel a master"]]},
  council: {label: "Town council", from: null, to: null, people: 300, ability: "politics",
    ranks: y => (y >= 1850 ? ["Clerk of the town hall", "Councillor", "Alderman", "Deputy mayor", "Mayor"] : ["Town scribe", "Juror", "Councillor", "Burgomaster's deputy", "Burgomaster"]),
    levers: [[1, "papers", "Lose or speed some papers"], [2, "licence", "Grant or deny a licence or a building"], [3, "curfew", "Order a curfew or a closing hour"], [4, "levy", "Raise or lift a tax"]]},
  watch: {label: "Watch", from: null, to: null, people: 300, ability: "streetwise",
    ranks: y => (y >= 1850 ? ["Constable", "Sergeant", "Inspector", "Captain", "Chief of police"] : ["Watchman", "Gate warden", "Captain of a quarter", "Captain of the watch", "Town judge"]),
    labelFor: y => (y >= 1850 ? "Police" : "Watch"),
    levers: [[1, "file", "Lose a file, or open one"], [2, "blind", "Look the other way for a night"], [3, "raid", "Order a raid or a search"], [4, "arrest", "Have someone arrested"]]},
  press: {label: "Press", from: 1488, to: null, people: 2000, ability: "expression",
    ranks: y => (y >= 1848 ? ["Reporter", "Writer", "Sub-editor", "Editor", "Publisher"] : ["Printer's devil", "Compositor", "Printer", "Master printer", "Owner of the press"]),
    labelFor: y => (y >= 1995 ? "News site" : y >= 1848 ? "Newspaper" : "Print shop"),
    levers: [[1, "rumour", "Pass on a rumour"], [2, "print", "Print a story about someone"], [3, "kill", "Keep a story out"], [4, "campaign", "Run a campaign for weeks"]]},
  university: {label: "University", from: 1348, to: null, people: 10000, ability: "academics", ranks: ["Student", "Master", "Doctor", "Dean of a faculty", "Rector"],
    levers: [[1, "library", "Get into the library's closed shelves"], [2, "teach", "Teach what you like"], [3, "degree", "Grant or refuse a degree"], [4, "expel", "Expel a scholar"]]},
  bank: {label: "Bank", from: 1400, to: null, people: 5000, ability: "finance", ranks: ["Clerk", "Cashier", "Agent", "Partner", "Head of the house"],
    levers: [[1, "look", "Look into someone's money"], [2, "loan", "Grant or call in a loan"], [3, "ruin", "Starve a business of credit"], [4, "rescue", "Save or sink a house"]]},
  company: {label: "Company", from: 1860, to: null, people: 5000, ability: "finance", ranks: ["Employee", "Manager", "Director", "Board member", "Chairman"],
    levers: [[1, "inside", "Get someone inside"], [2, "hire", "Hire or fire someone"], [3, "buy", "Buy out a smaller business"], [4, "move", "Move the works, or close it"]]},
  court: {label: "Court", hook: "Dominate makes a judge easy prey, and a ghoul clerk can lose a file for good.", from: null, to: null, people: 1000, ability: "law", ranks: byLaw(COURT), offices: true,
    labelFor: (y, law) => (law === "islamic" && y < 1880 ? "Qadi's court" : law === "chinese" && y < 1912 ? "Yamen" : "Court"),
    levers: [[1, "docket", "Move a case up or down the list"], [2, "bail", "Grant or refuse release before trial"], [3, "sentence", "Lighten or harden a sentence"], [4, "overturn", "Overturn a verdict"]]},
  ruler: {label: "The ruler's officers", hook: "Kindred princes and their rivals reach for these seats; in the Dark Medieval a lord's steward is often a ghoul.", from: null, to: null, people: 2000, ability: "politics", ranks: byLaw(RULER), offices: true,
    labelFor: y => (y >= 1850 ? "State offices" : y >= 1650 ? "The crown's administration" : "The lord's officers"),
    levers: [[1, "audience", "Get someone an audience"], [2, "grant", "Grant a privilege, charter or permit"], [3, "appoint", "Appoint someone to a lesser office"], [4, "decree", "Issue an order in the ruler's name"]]},
  tax: {label: "Tax office", hook: "The rolls show who lives where, and who has paid the same dues for sixty years without ageing.", from: null, to: null, people: 2000, ability: "finance", ranks: byLaw(TAX), offices: true,
    labelFor: y => (y >= 1850 ? "Tax office" : "Collectors of the dues"),
    levers: [[1, "assess", "Look into what someone owes"], [2, "relief", "Ease someone's dues for a year"], [3, "audit", "Send the collectors to someone"], [4, "farm", "Sell or take away the right to collect"]]},
  army: {label: "Garrison", hook: "The captain decides who rides into the woods: Kinfolk in the ranks can keep patrols away from a caern, or lead them to a pack.", from: null, to: null, people: 5000, ability: "leadership", ranks: byLaw(ARMY), offices: true,
    levers: [[1, "supply", "Divert supplies"], [2, "billet", "Billet soldiers on someone, or move them away"], [3, "patrol", "Send out a patrol"], [4, "martial", "Declare martial law in the town"]]},
  inquisition: {label: "Holy Office", hook: "The Inquisition's hunters sit here; anything that does not die is its business.", from: null, to: null, people: 5000, needs: "inquisitors", ability: "occult", offices: true,
    ranks: ["Familiar", "Notary of the Holy Office", "Commissioner", "Inquisitor", "Inquisitor of the district"],
    levers: [[1, "whisper", "Pass on a denunciation"], [2, "summon", "Summon someone for questioning"], [3, "grace", "Proclaim a time of grace for confessions"], [4, "hand", "Hand someone over to the secular arm"]]},
  secret: {label: "Secret police", hook: "Files on people who never age, never come out by day or vanish from photographs; hunters and the Technocracy's agents both read them.", from: 1800, to: null, people: 5000, needs: "secret-police", ability: "investigation", offices: true,
    ranks: ["Informer", "Agent", "Officer", "Section chief", "Head of the bureau here"],
    levers: [[1, "watch", "Have someone watched"], [2, "dossier", "Read or plant a file"], [3, "detain", "Hold someone without charge"], [4, "vanish", "Make someone disappear"]]}
};

/** The ranks of a kind in a year and faith. */
export function ranksOf(kind, year = 0, faith = "western", law = "") {
  if ( kind === "worship" ) return (WORSHIP[faith] ?? WORSHIP.own).ranks;
  const r = KINDS[kind]?.ranks;
  return typeof r === "function" ? r(year, law) : r ?? [];
}
/** What the institution is called in a year and faith. */
export function labelOf(kind, year = 0, faith = "western", law = "") {
  if ( kind === "worship" ) { const w = WORSHIP[faith] ?? WORSHIP.own; return w.name.replace(/^./, c => c.toUpperCase()); }
  const k = KINDS[kind];
  return k?.labelFor ? k.labelFor(year, law) : k?.label ?? kind;
}

/** Which kinds a town of this size has in a year; order: the order list of its law that year (B3604). */
export const kindsFor = (year, people, order = null) => Object.keys(KINDS).filter(k => {
  const x = KINDS[k];
  if ( x.needs && !(order ?? []).includes(x.needs) ) return false;
  return (x.from == null || year >= x.from) && (x.to == null || year <= x.to) && n(people) >= x.people;
});

export function normSeat(s = {}) {
  const rank = Math.max(0, Math.min(RANKS - 1, Math.round(n(s.rank))));
  const holder = s.holder && typeof s.holder === "object" && (s.holder.id || s.holder.name) ? {id: str(s.holder.id, 40), name: str(s.holder.name), faction: str(s.holder.faction, 60), pawnOf: str(s.holder.pawnOf, 40)} : null;
  return {rank, holder, since: n(s.since)};
}
/** Seats: one at the top, then 2, 3, 4 and 6 down the ladder. */
export const SEATS = [6, 4, 3, 2, 1];
export function blankSeats() { const out = []; SEATS.forEach((c, rank) => { for ( let i = 0; i < c; i++ ) out.push({rank, holder: null, since: 0}); }); return out; }

export function normInst(x = {}) {
  const kind = KINDS[x.kind] ? x.kind : "council";
  const seats = Array.isArray(x.seats) && x.seats.length ? x.seats.slice(0, 40).map(normSeat) : blankSeats();
  return {id: str(x.id, 60), kind, town: str(x.town, 80), name: str(x.name, 120), faith: str(x.faith, 20) || "western", law: str(x.law, 20), founded: n(x.founded), closed: x.closed ? n(x.closed) : 0,
    seats, log: (Array.isArray(x.log) ? x.log : []).slice(-30).map(l => ({at: n(l.at), text: str(l.text, 300)}))};
}

/** The institutions a town should have now: the kinds it lacks are opened, those past their years are closed. */
export function reconcile(list, {town, year, people, faith = "western", law = "", order = null, name = ""} = {}) {
  const out = (list ?? []).map(normInst);
  const want = new Set(kindsFor(year, people, order));
  const events = [];
  for ( const i of out ) if ( i.town === town && !i.closed && !want.has(i.kind) && ((KINDS[i.kind].to != null && year > KINDS[i.kind].to) || (KINDS[i.kind].needs && order)) ) {
    i.closed = year; events.push({kind: "closed", inst: i.id, text: `${labelOf(i.kind, year, i.faith, i.law)} of ${name || "the town"} is no more.`});
  }
  for ( const i of out ) if ( i.town === town && !i.closed && law && KINDS[i.kind].offices && !i.law ) i.law = law;
  for ( const k of want ) if ( !out.some(i => i.town === town && i.kind === k && !i.closed) ) {
    const id = out.some(i => i.id === `${town}:${k}`) ? `${town}:${k}:${year}` : `${town}:${k}`;
    const i = normInst({id, kind: k, town, faith, law, founded: year, name: `${labelOf(k, year, faith, law)} of ${name || "the town"}`});
    out.push(i); events.push({kind: "opened", inst: id, text: `${i.name} now stands.`});
  }
  return {list: out, events};
}

/** The highest rank a pawn can hold for a character: the character's Influence, from 1 to 5 (rank index 0 to 4). */
export const pawnCap = influence => Math.max(-1, Math.min(RANKS - 1, Math.round(n(influence)) - 1));
/** Successes to climb to the next rank (the climb project's goal). */
export const climbGoal = rank => 5 + 3 * Math.max(0, Math.round(n(rank)));

/** The best seat someone holds (or holds through a pawn): {rank, seat index} or null. */
export function bestSeat(inst, id) {
  let best = null;
  inst.seats.forEach((s, i) => { if ( s.holder && (s.holder.id === id || s.holder.pawnOf === id) && (!best || s.rank > best.rank) ) best = {rank: s.rank, index: i, pawn: s.holder.pawnOf === id && s.holder.id !== id}; });
  return best;
}
/** The levers a rank opens. */
export const leversFor = (kind, rank) => (KINDS[kind]?.levers ?? []).filter(([r]) => rank >= r).map(([r, key, words]) => ({rank: r, key, words}));

/**
 * Move someone up: to the first empty seat of the next rank, else unseating its newest holder (who drops a rank, if
 * there is room). Returns {inst, from, to, bumped} or {inst, why} when it cannot be done.
 */
export function promote(inst0, who, {at = 0, cap = RANKS - 1} = {}) {
  const inst = normInst(inst0);
  const have = bestSeat(inst, who.pawnOf || who.id);
  const target = have ? have.rank + 1 : 0;
  if ( target > Math.min(cap, RANKS - 1) ) return {inst, why: target > RANKS - 1 ? "already at the top" : "a pawn can climb no higher than the character's Influence"};
  let i = inst.seats.findIndex(s => s.rank === target && !s.holder);
  let bumped = null;
  if ( i < 0 ) {
    const filled = inst.seats.map((s, k) => ({s, k})).filter(x => x.s.rank === target).sort((a, b) => b.s.since - a.s.since);
    if ( !filled.length ) return {inst, why: "no such seat"};
    i = filled[0].k; bumped = inst.seats[i].holder;
    if ( target > 0 ) { const down = inst.seats.findIndex(s => s.rank === target - 1 && !s.holder); if ( down >= 0 ) inst.seats[down] = {rank: target - 1, holder: bumped, since: at}; }
  }
  if ( have ) inst.seats[have.index] = {rank: have.rank, holder: null, since: 0};
  inst.seats[i] = {rank: target, holder: {id: str(who.id, 40), name: str(who.name), faction: str(who.faction, 60), pawnOf: str(who.pawnOf, 40)}, since: at};
  return {inst, from: have ? have.rank : -1, to: target, bumped};
}

/** Who controls it: shares by faction (or holder when they have none), each seat weighing its rank + 1. */
export function control(inst) {
  const m = {};
  let total = 0;
  for ( const s of normInst(inst).seats ) { if ( !s.holder ) continue; const k = s.holder.faction || s.holder.pawnOf || s.holder.id || s.holder.name; m[k] = (m[k] ?? 0) + s.rank + 1; total += s.rank + 1; }
  return Object.entries(m).map(([k, w]) => ({who: k, share: total ? Math.round(100 * w / total) : 0})).sort((a, b) => b.share - a.share);
}

/** B3358: the chances in one month. */
export const MONTH = {fill: 0.5, contest: 1 / 12, scandal: 1 / 24};

/**
 * One month. npcs: [{id, name, faction}] who might take an empty seat; isPc: id -> true for a player character (or
 * their pawn). Returns {inst, events: [{kind, seat, text, pc}]}; events on a PC's seat are for the approval queue.
 */
export function monthTurn(inst0, {npcs = [], isPc = () => false, rand = Math.random, at = 0, year = 0} = {}) {
  const inst = normInst(inst0);
  const events = [];
  if ( inst.closed ) return {inst, events};
  const ranks = ranksOf(inst.kind, year, inst.faith, inst.law);
  const seated = new Set(inst.seats.filter(s => s.holder).map(s => s.holder.id));
  const free = (npcs ?? []).filter(p => p?.id && !seated.has(p.id));
  inst.seats.forEach((s, i) => {
    if ( !s.holder && free.length && rand() < MONTH.fill ) {
      const p = free.splice(Math.floor(rand() * free.length), 1)[0];
      inst.seats[i] = {rank: s.rank, holder: {id: p.id, name: p.name, faction: p.faction ?? "", pawnOf: ""}, since: at};
      events.push({kind: "filled", seat: i, text: `${p.name} takes a seat as ${ranks[s.rank] ?? "a member"}.`, pc: false});
    } else if ( s.holder && s.rank >= 2 && rand() < MONTH.scandal ) {
      const pc = isPc(s.holder.pawnOf || s.holder.id);
      events.push({kind: "scandal", seat: i, text: `A scandal touches ${s.holder.name}, ${ranks[s.rank] ?? "a member"}.`, pc});
      if ( !pc ) inst.seats[i] = {rank: s.rank, holder: null, since: 0};
    } else if ( s.holder && s.rank >= 1 && rand() < MONTH.contest ) {
      const pc = isPc(s.holder.pawnOf || s.holder.id);
      events.push({kind: "contest", seat: i, text: `Someone works to take the seat of ${s.holder.name}, ${ranks[s.rank] ?? "a member"}.`, pc});
    }
  });
  inst.log = [...inst.log, ...events.map(e => ({at, text: e.text}))].slice(-30);
  return {inst, events};
}
