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
    rank: "Status (Sabbat)", blocs: "clan", gathering: {name: "esbat", every: 2, meets: "The esbat gathers."}, vinculum: true,
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
    rank: "Status (Anarch)", blocs: "clan", gathering: {name: "gangs' meeting", every: 4, meets: "The gangs meet."},
    offices: [
      {key: "baron", title: "Baron", seats: 1, fill: "backing", top: true, judge: true},
      {key: "boss", title: "Gang leader", seats: 3, fill: "backing"}
    ],
    law: ["selling out to the elders", "hunting on another gang's turf", "a broken word to the gangs"],
    notes: "Status among Anarchs is reputation, won by deeds and word of mouth rather than titles (V20 pdf 53). Before 1493 this is a band of the Anarch Revolt.",
    eras: {revolt: "Before 1493 the barony is a band of the Anarch Revolt, at war with its elders."}
  }
};
export const POLITY_LIST = Object.keys(POLITIES);

/** The polity a faction follows in a year: its own pick when that exists then, else the default for its kind. */
export function polityFor(f, year = null, {memberCount = null} = {}) {
  const y = Number.isFinite(Number(year)) && year !== null ? Number(year) : null;
  const fits = key => {
    const p = POLITIES[key];
    if ( !p || !p.kinds.includes(f?.kind) ) return false;
    if ( y === null ) return true;
    return (p.from === null || y >= p.from) && (p.to === null || y <= p.to);
  };
  if ( f?.polity === "none" ) return null;
  if ( f?.polity && POLITIES[f.polity] ) {
    if ( fits(f.polity) ) return f.polity;
    // A sect before its time: the court of its age stands in (B1101)
    return f.kind === "kindred" ? "dark-ages-court" : null;
  }
  // The default: a Kindred faction of three or more members keeps a court of its age (B1101)
  const n = memberCount ?? (f?.members?.length ?? 0);
  if ( f?.kind === "kindred" && n >= 3 ) return y !== null && y < 1435 ? "dark-ages-court" : "camarilla";
  return null;
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
      against: String(c.against), law: String(c.law ?? "").slice(0, 120), turn: Number(c.turn) || 0})).slice(0, 20),
    lean: Object.fromEntries(Object.entries(o.lean ?? {}).filter(([k, v]) => k && typeof v === "string" && v)),
    inner: Math.max(0, Math.round(Number(o.inner) || 0)),
    title: o.title ? String(o.title).slice(0, 40) : null
  };
}
/** A member's standing: the polity's own record, else the Status on the sheet. */
export const rankOf = (f, id, info = {}) => (f?.politics?.ranks?.[id] ?? clampInt(info?.[id]?.status ?? 0, 0, MAX_RANK));
/** The offices a member holds, as keys. */
export const officesOf = (f, id) => Object.entries(f?.politics?.offices ?? {}).filter(([, l]) => l.includes(id)).map(([k]) => k);
export const holdersOf = (f, key) => f?.politics?.offices?.[key] ?? [];
const cap = t => String(t).replace(/\b\w/g, ch => ch.toUpperCase());
const bloc = (info, id) => String(info?.[id]?.clan ?? "").trim().toLowerCase() || null;

/* ------------------------------------------------------------------ */
/*  Applying a politics change, with its inverse                       */
/* ------------------------------------------------------------------ */

/** The ops this file owns. */
export const POL_OPS = new Set(["pol-office", "pol-rank", "pol-favour", "pol-docket", "pol-docket-remove", "pol-claim", "pol-claim-remove",
  "pol-vinculum", "pol-wary", "pol-lean", "pol-inner", "pol-boon"]);
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
    const clans = new Set(f.members.filter(id => live(info, id)).map(id => bloc(info, id)).filter(Boolean));
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
  const key = ctx.polity, P = POLITIES[key];
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
  const actors = members.filter(id => !info[id]?.pc).sort((a, b) => rankOf(view, b, info) - rankOf(view, a, info) || name(a).localeCompare(name(b))).slice(0, ACTORS_PER_TURN);
  for ( const id of actors ) {
    const r = rankOf(view, id, info), mine = officesOf(view, id);
    const owed = (ctx.boons ?? []).filter(b => b.to === id && b.from && members.includes(b.from));
    const accused = p.docket.some(d => d.against === id);
    const vacant = P.offices.filter(o => openSeats(view, o.key, o, info) > 0 && !mine.includes(o.key));
    const blocsLeft = [...new Set(members.map(m => bloc(info, m)).filter(k => k && k !== bloc(info, id) && p.lean[k] !== id))].length;
    const w = {petition: 3, court: blocsLeft ? 2 : 0, accuse: 1, favour: owed.length ? 3 : 0, bid: vacant.length ? 3 : (r >= 3 && !mine.length ? 1 : 0.3), wait: accused ? 3 : 0.5};
    const move = pick(rand, w);
    step();
    switch ( move ) {
      case "petition": {
        const x = roll(rand, attr(info, id, "charisma") + r, 6);
        if ( x.net ) { add({op: "pol-favour", who: id, delta: x.net >= 3 ? 2 : 1}); say(`${name(id)} petitions the court and is heard (${x.net} success${x.net === 1 ? "" : "es"}).`); }
        else say(`${name(id)} petitions the court${x.botch ? " and gives offence" : " but is not heard"}.`);
        if ( x.botch ) add({op: "pol-favour", who: id, set: 0});
        break;
      }
      case "court": {
        const b = bloc(info, id) ? [...new Set(members.map(m => bloc(info, m)).filter(k => k && k !== bloc(info, id)))] : [];
        const open = b.filter(k => p.lean[k] !== id);
        const target = open.length ? open[Math.floor(rand() * open.length)] : null;
        const x = roll(rand, attr(info, id, "manipulation") + r, 7);
        if ( target && x.net ) { add({op: "pol-lean", bloc: target, who: id}); say(`${name(id)} wins the ${cap(target)} to their side.`); }
        else say(`${name(id)} courts the other clans without result.`);
        break;
      }
      case "accuse": {
        // The top seat is beyond a charge, save among the Anarchs
        const rivals = members.filter(m => m !== id && (key === "anarch" || !officesOf(view, m).includes(top?.key)));
        const against = rivals.sort((a, b) => rankOf(view, b, info) - rankOf(view, a, info))[0] ?? null;
        if ( !against ) { say(`${name(id)} finds nobody worth accusing.`); break; }
        const wary = (p.wary[against] ?? 0) >= turn;
        const x = roll(rand, attr(info, id, "manipulation") + r, 6 + (wary ? 1 : 0)), y = roll(rand, attr(info, against, "wits") + rankOf(view, against, info), 6);
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
        const holder = holders.sort((a, b) => rankOf(view, a, info) - rankOf(view, b, info))[0] ?? null;
        if ( o.fill === "backing" ) {
          const mineF = (p.favour[id] ?? 0) + r, theirs = holder ? (p.favour[holder] ?? 0) + rankOf(view, holder, info) : -1;
          if ( mineF > theirs ) {
            if ( holder ) add({op: "pol-office", office: o.key, actor: holder, remove: true, top: !!o.top});
            add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
            add({op: "pol-favour", who: id, set: 0});
            say(`The gangs back ${name(id)} over ${holder ? name(holder) : "nobody"} for ${officeTitle(key, o.key, f)}.`);
          } else say(`${name(id)} looks for backing against ${holder ? name(holder) : "the gangs"} and finds too little.`);
          break;
        }
        // A challenge: monomacy in the Sabbat, a duel or a test in a court (B1103). Rolled here between NPCs; the
        // Storyteller may stage it as a fight instead when the card comes in.
        if ( !holder ) break;
        const wary = (p.wary[holder] ?? 0) >= turn;
        const vin = key === "sabbat" && (p.vinculum[`${id}>${holder}`] ?? 0) >= 7 ? 1 : 0;
        const x = roll(rand, attr(info, id, "strength") + attr(info, id, "dexterity"), 6 + (wary ? 1 : 0) + vin);
        const y = roll(rand, attr(info, holder, "strength") + attr(info, holder, "dexterity"), 6);
        const how = key === "sabbat" ? "monomacy" : "a challenge";
        if ( x.net > y.net ) {
          add({op: "pol-office", office: o.key, actor: holder, remove: true, top: !!o.top});
          add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
          add({op: "pol-rank", actor: holder, delta: -1, base: info[holder]?.status ?? 0});
          say(`${name(id)} wins the seat of ${officeTitle(key, o.key, f)} from ${name(holder)} by ${how} (${x.net} to ${y.net}).`);
        } else {
          add({op: "pol-rank", actor: id, delta: -1, base: info[id]?.status ?? 0});
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
  const P = POLITIES[key], info = ctx.info ?? {}, rand = ctx.rand ?? Math.random;
  const p = f.politics, name = id => info[id]?.name ?? "someone";
  const members = f.members.filter(id => live(info, id));
  const removed = new Set(sofar.filter(c => c.op === "pol-office" && c.remove).map(c => `${c.office}:${c.actor}`));
  const taken = new Set(sofar.filter(c => c.op === "pol-office" && !c.remove).map(c => `${c.office}:${c.actor}`));
  const holds = (k, id) => (holdersOf(f, k).includes(id) && !removed.has(`${k}:${id}`)) || taken.has(`${k}:${id}`);
  const judgeKey = judgeOffice(key)?.key, judge = members.find(id => holds(judgeKey, id)) ?? null;
  const weight = id => (p.favour[id] ?? 0) + rankOf(f, id, info) + Object.values(p.lean).filter(w => w === id).length;

  // Charges
  for ( const d of p.docket ) {
    step();
    add({op: "pol-docket-remove", id: d.id});
    if ( !members.includes(d.against) ) { lines(`The charge against ${name(d.against)} is dropped: they are gone.`); continue; }
    // The judge's word weighs: a charge the judge brings, or one against the judge, leans that way
    const a = weight(d.by ?? "") + rollDice(rand, 1)[0] + (judge && d.by === judge ? 3 : 0), b = weight(d.against) + rollDice(rand, 1)[0] + (judge && d.against === judge ? 3 : 0);
    if ( a > b ) {
      add({op: "pol-rank", actor: d.against, delta: -1, base: info[d.against]?.status ?? 0});
      lines(`${judge ? name(judge) : "The court"} finds ${name(d.against)} guilty of ${d.law}: they lose standing.`);
    } else {
      if ( d.by ) add({op: "pol-favour", who: d.by, set: Math.max(0, (p.favour[d.by] ?? 0) - 1)});
      lines(`${judge ? name(judge) : "The court"} clears ${name(d.against)} of ${d.law}.`);
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
      const seated = new Set(members.filter(id => holds(o.key, id)).map(id => bloc(info, id)));
      const clans = [...new Set(members.map(id => bloc(info, id)).filter(Boolean))].filter(k => !seated.has(k));
      for ( const k of clans ) {
        if ( room <= 0 ) break;
        const eldest = members.filter(id => bloc(info, id) === k).sort((a, b) => rankOf(f, b, info) - rankOf(f, a, info) || name(a).localeCompare(name(b)))[0];
        step(); add({op: "pol-office", office: o.key, actor: eldest}); room--;
        lines(`${name(eldest)} takes the ${cap(k)} seat among the ${o.title}.`);
      }
      continue;
    }
    if ( room <= 0 ) continue;
    const want = claims.map(c => c.who).filter(id => members.includes(id) && !holds(o.key, id));
    const pool = want.length ? want : (o.top ? members : members.filter(id => !holding.has(id)));
    const ranked = [...new Set(pool)].sort((a, b) => weight(b) - weight(a) || name(a).localeCompare(name(b)));
    for ( const id of ranked.slice(0, o.top ? 1 : room) ) {
      if ( !o.top && !want.length && info[id]?.pc ) continue; // a player's character is never seated unasked
      step();
      add({op: "pol-office", office: o.key, actor: id, top: !!o.top});
      if ( want.length ) add({op: "pol-favour", who: id, set: 0});
      holding.add(id);
      lines(`${o.top ? "The court raises" : judge ? `${name(judge)} names` : "The court names"} ${name(id)} ${o.title}.`);
    }
  }

  // Standing: the one with most favour gains a dot (the judge's gift), the favour spent (B1104)
  const best = members.filter(id => (p.favour[id] ?? 0) >= 3).sort((a, b) => (p.favour[b] ?? 0) - (p.favour[a] ?? 0))[0];
  if ( best && best !== judge ) {
    step();
    add({op: "pol-rank", actor: best, delta: 1, base: info[best]?.status ?? 0});
    add({op: "pol-favour", who: best, set: 0});
    lines(`${judge ? name(judge) : "The court"} grants ${name(best)} new standing.`);
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
    out.push({op: "pol-rank", faction: f.id, actor: entry.from.id, delta, base: info[entry.from.id]?.status ?? 0, why: status === "broken" ? "a broken boon" : "a boon paid"});
  }
  return out;
}
