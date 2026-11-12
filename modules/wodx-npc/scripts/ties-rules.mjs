/**
 * WoDX NPC 0.37.0: relationships and lineage, the pure part (B1900-B1902). No Foundry here, so the harness can test it.
 *
 * WoDX already keeps who is tied to whom in several places; this file reads them all into one list of links, so the
 * sheet's Relationships tab and the family and lineage tree show the same thing:
 *   flags["wodx-creation"].lineage   sire, domitor, bonds {regnant id: {name, drinks}}, formerly, became, family.heirOf
 *   flags["wodx-creation"].ally      patron (an Ally or Retainer bought with a Background)
 *   flags["wodx-sheets"].ties        the hand-made list [{uuid, role, note, hidden}] (hidden: the Storyteller's only)
 *   system.sire                      a vampire sheet's own Sire box, matched to an actor by name
 *   the Ledger                       open debts, boons and oaths between two people
 *   flags["wodx-npc"].secrets        a secret can hide a link ({tie: {kind, id}}) until it is found (secrets-rules.mjs)
 * Every link is drawn from both ends: a sire's record makes a childe on the other sheet.
 */

/** The kinds of link, and how each reads from the other end. group orders the Relationships tab. */
export const KINDS = {
  sire: {label: "Sire", back: "childe", group: "blood", up: true},
  childe: {label: "Childe", back: "sire", group: "blood"},
  bondTo: {label: "Blood bond to", back: "thrall", group: "blood"},
  thrall: {label: "Drinks their vitae", back: "bondTo", group: "blood"},
  domitor: {label: "Domitor", back: "ghoul", group: "blood", up: true},
  ghoul: {label: "Ghoul", back: "domitor", group: "blood"},
  formerly: {label: "Was once", back: "became", group: "blood"},
  became: {label: "Became", back: "formerly", group: "blood"},
  parent: {label: "Parent", back: "child", group: "family", up: true},
  child: {label: "Child", back: "parent", group: "family"},
  sibling: {label: "Sibling", back: "sibling", group: "family"},
  spouse: {label: "Spouse", back: "spouse", group: "family"},
  kin: {label: "Kin", back: "kin", group: "family"},
  kinfolk: {label: "Kinfolk", back: "garou", group: "family"},
  garou: {label: "Garou kin", back: "kinfolk", group: "family"},
  heirOf: {label: "Heir of", back: "heir", group: "family", up: true},
  heir: {label: "Heir", back: "heirOf", group: "family"},
  mentor: {label: "Mentor", back: "apprentice", group: "teaching", up: true},
  apprentice: {label: "Student", back: "mentor", group: "teaching"},
  patron: {label: "Serves", back: "retainer", group: "service", up: true},
  retainer: {label: "Retainer", back: "patron", group: "service"},
  ally: {label: "Ally", back: "ally", group: "service"},
  contact: {label: "Contact", back: "contact", group: "service"},
  lover: {label: "Lover", back: "lover", group: "heart"},
  friend: {label: "Friend", back: "friend", group: "heart"},
  rival: {label: "Rival", back: "rival", group: "heart"},
  enemy: {label: "Enemy", back: "enemy", group: "heart"},
  owes: {label: "Owes", back: "owed", group: "debts"},
  owed: {label: "Is owed by", back: "owes", group: "debts"},
  haven: {label: "Haven", back: null, group: "places"},
  other: {label: "Other", back: "other", group: "other"}
};
export const GROUPS = {blood: "Blood and bonds", family: "Family and kin", teaching: "Mentors and students", service: "Allies and service",
  heart: "Friends, lovers and rivals", debts: "Debts and favours", places: "Places", other: "Other"};
/** The roles a hand-made tie can take on the sheet (the kinds the books' Backgrounds and play make by hand). */
export const HAND_ROLES = ["sire", "childe", "domitor", "ghoul", "parent", "child", "sibling", "spouse", "kin", "kinfolk", "garou", "mentor", "apprentice",
  "patron", "retainer", "ally", "contact", "lover", "friend", "rival", "enemy", "haven", "other"];
/** The Sheets roles from before 0.30.0 that read as these kinds. */
const OLD_ROLE = {kin: "kin", haven: "haven"};

const low = v => String(v ?? "").trim().toLowerCase();
const who = v => (v && typeof v === "object" ? {id: v.id ?? null, name: String(v.name ?? "")} : v ? {id: null, name: String(v)} : null);
const idOfUuid = uuid => { const m = /^Actor\.([A-Za-z0-9]{16})$/.exec(String(uuid ?? "")); return m ? m[1] : null; };
export const kindOf = k => (KINDS[k] ? k : OLD_ROLE[k] ?? "other");

/** A bond's stage by drinks (V20: the third drink on a separate night binds fully). */
export const bondWord = drinks => (Number(drinks) >= 3 ? "full bond" : Number(drinks) === 2 ? "second drink" : "first drink");

/**
 * Every link in the world, from both ends. actors: [{id, name, type, system, flags}] (plain data); ledger: entries.
 * Returns [{from, to: {id, name}, uuid, kind, note, source, hidden, secret, hand}] where secret is "<holder id>:<secret id>"
 * for a link a secret hides and hand is the uuid on the from-actor's own hand-made list (so the sheet can edit it). A link made in two places is kept once: the first source (WoDX's own records) wins,
 * and a hand-made note is kept on it.
 */
export function edges(actors = [], {ledger = []} = {}) {
  const list = [...(actors ?? [])].filter(a => a?.id);
  const byId = new Map(list.map(a => [a.id, a]));
  const byName = new Map();
  for ( const a of list ) if ( a.type === "Vampire" && !byName.has(low(a.name)) ) byName.set(low(a.name), a);
  const out = [], seen = new Map();
  const name = (ref) => (ref?.id && byId.get(ref.id)?.name) || ref?.name || "";
  const add = (fromId, to, kind, {note = "", source = "", hidden = false, uuid = null, back = true, hand = null} = {}) => {
    if ( !fromId || !to || (!to.id && !to.name && !uuid) || to.id === fromId ) return;
    const k = kindOf(kind);
    const key = `${fromId}|${to.id ?? uuid ?? low(to.name)}|${k}`;
    if ( seen.has(key) ) {
      const e = seen.get(key);
      if ( note && !e.note ) e.note = note;
      if ( hidden && source === "hand" ) e.hidden = true;
      if ( hand ) e.hand = hand;
      return;
    }
    const e = {from: fromId, to: {id: to.id ?? null, name: name(to)}, uuid: uuid ?? (to.id ? `Actor.${to.id}` : null), kind: k, note: String(note ?? ""), source, hidden: !!hidden, secret: null, hand};
    seen.set(key, e); out.push(e);
    const b = KINDS[k]?.back;
    if ( back && b && to.id && byId.has(to.id) ) add(to.id, {id: fromId, name: byId.get(fromId)?.name ?? ""}, b, {note, source, hidden, back: false});
  };
  for ( const a of list ) {
    const l = a.flags?.["wodx-creation"]?.lineage ?? {};
    // The sire: WoDX's lineage first, else the sheet's Sire box matched by name
    if ( l.sire ) add(a.id, who(l.sire), "sire", {source: "lineage"});
    else if ( a.type === "Vampire" ) {
      const text = String(a.system?.sire ?? "").trim();
      if ( text ) { const m = byName.get(low(text)); add(a.id, m ? {id: m.id, name: m.name} : {id: null, name: text}, "sire", {source: "sheet"}); }
    }
    if ( l.domitor ) add(a.id, who(l.domitor), "domitor", {source: "lineage"});
    for ( const [rid, b] of Object.entries(l.bonds ?? {}) ) {
      if ( l.domitor?.id === rid ) continue;
      add(a.id, {id: rid, name: b?.name ?? ""}, "bondTo", {note: bondWord(b?.drinks), source: "lineage"});
    }
    if ( l.formerly ) add(a.id, who(l.formerly), "formerly", {source: "lineage"});
    if ( l.became ) add(a.id, who(l.became), "became", {source: "lineage"});
    if ( l.family?.heirOf ) add(a.id, who(l.family.heirOf), "heirOf", {source: "lineage"});
    const ally = a.flags?.["wodx-creation"]?.ally;
    if ( ally?.patron ) add(a.id, who(ally.patron), "patron", {source: "background"});
  }
  // A domitor's ghoul also drinks: say so on the domitor link rather than twice
  for ( const a of list ) {
    const l = a.flags?.["wodx-creation"]?.lineage ?? {};
    const d = l.domitor?.id && l.bonds?.[l.domitor.id];
    if ( d ) { const e = seen.get(`${a.id}|${l.domitor.id}|domitor`); if ( e && !e.note ) e.note = bondWord(d.drinks); }
  }
  for ( const a of list ) {
    for ( const t of a.flags?.["wodx-sheets"]?.ties ?? [] ) {
      if ( !t?.uuid ) continue;
      const id = idOfUuid(t.uuid);
      const to = id ? {id, name: byId.get(id)?.name ?? t.name ?? ""} : {id: null, name: t.name ?? ""};
      add(a.id, to, t.role, {note: t.note ?? "", source: "hand", hidden: !!t.hidden, uuid: id ? null : t.uuid, hand: t.uuid});
    }
  }
  for ( const e of ledger ?? [] ) {
    if ( !e || (e.status ?? "open") !== "open" || !["debt", "boon", "oath"].includes(e.kind) ) continue;
    if ( !e.from?.id || !e.to?.id ) continue;
    const what = e.kind === "boon" ? `${e.size ?? "minor"} boon${e.what ? `: ${e.what}` : ""}` : e.what || e.kind;
    add(e.from.id, who(e.to), "owes", {note: String(what).slice(0, 120), source: "ledger"});
  }
  return out;
}

/** Mark the links a secret hides. secretsOf(id) gives that actor's secrets [{id, tie: {kind, id}}]. */
export function hideBySecrets(list = [], secretsOf = () => []) {
  const holders = new Set(list.map(e => e.from));
  const hide = new Map();
  for ( const h of holders ) for ( const s of secretsOf(h) ?? [] ) {
    if ( !s?.tie?.id || s.public ) continue;
    const k = kindOf(s.tie.kind);
    hide.set(`${h}|${s.tie.id}|${k}`, `${h}:${s.id}`);
    const b = KINDS[k]?.back;
    if ( b ) hide.set(`${s.tie.id}|${h}|${b}`, `${h}:${s.id}`);
  }
  for ( const e of list ) { const s = hide.get(`${e.from}|${e.to.id}|${e.kind}`); if ( s ) e.secret = s; }
  return list;
}

/**
 * May this viewer see the link? viewer: {gm, mine: Set of actor ids they own, found: Set of "<holder>:<secret>"
 * their characters found}. A hand-made link the Storyteller hid is theirs alone. A link a secret hides shows to the
 * owners of either end (they know) and to anyone whose character found it out.
 */
export function visibleTo(e, viewer = {}) {
  if ( viewer.gm ) return true;
  if ( e.hidden ) return false;
  if ( !e.secret ) return true;
  const mine = viewer.mine ?? new Set(), found = viewer.found ?? new Set();
  return mine.has(e.from) || (e.to?.id && mine.has(e.to.id)) || found.has(e.secret);
}

/** One actor's links, ordered by group then kind then name. */
export function tiesOf(id, list = []) {
  const groups = Object.keys(GROUPS), kinds = Object.keys(KINDS);
  return list.filter(e => e.from === id).sort((a, b) => groups.indexOf(KINDS[a.kind]?.group) - groups.indexOf(KINDS[b.kind]?.group)
    || kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.to.name.localeCompare(b.to.name));
}

/* -------------------------------------------------------------- */
/*  The family and lineage tree                                    */
/* -------------------------------------------------------------- */

/** The lines a tree follows: up the first kind, down the second. */
export const LINES = [
  {key: "blood", label: "Blood: sires and childer", up: "sire", down: "childe"},
  {key: "ghouls", label: "Domitors and ghouls", up: "domitor", down: "ghoul"},
  {key: "family", label: "Family", up: "parent", down: "child"},
  {key: "heirs", label: "Heirs", up: "heirOf", down: "heir"},
  {key: "teaching", label: "Mentors and students", up: "mentor", down: "apprentice"},
  {key: "service", label: "Patrons and retainers", up: "patron", down: "retainer"}
];
const MAX_UP = 13, MAX_DOWN = 6;

/**
 * The tree for one person. Returns {root, lines: [{key, label, up: [nodes, nearest first], down: node tree, side}]}
 * with only the lines that have something in them. A node is {id, name, note, unknown, hidden, kids}. A link the
 * viewer may not see shows as "Unknown" going up and is left out going down, so a hidden childe is not given away.
 * isVampire(id): a vampire with no sire recorded still shows an unknown sire above them.
 */
export function treeFor(rootId, list = [], {viewer = {}, names = {}, isVampire = () => false, side = ["sibling", "spouse", "kin", "kinfolk", "garou", "bondTo", "thrall", "formerly", "became"]} = {}) {
  const from = new Map();
  for ( const e of list ) { if ( !from.has(e.from) ) from.set(e.from, []); from.get(e.from).push(e); }
  const node = (e, extra = {}) => {
    const see = visibleTo(e, viewer);
    return see ? {id: e.to.id, name: e.to.name || names[e.to.id] || "", note: e.note, unknown: false, hidden: !!(e.hidden || e.secret), kids: [], ...extra}
      : {id: null, name: "Unknown", note: "", unknown: true, hidden: false, kids: [], ...extra};
  };
  const out = {root: {id: rootId, name: names[rootId] ?? ""}, lines: []};
  for ( const L of LINES ) {
    // Up: the nearest first, to the oldest known; an unknown link ends the climb
    const up = [], seenUp = new Set([rootId]);
    let cur = rootId;
    for ( let i = 0; i < MAX_UP; i++ ) {
      const e = (from.get(cur) ?? []).find(x => x.kind === L.up);
      if ( !e ) {
        if ( L.up === "sire" && isVampire(cur) && (i === 0 || up.at(-1)?.id) ) up.push({id: null, name: "Unknown sire", note: "", unknown: true, hidden: false, kids: []});
        break;
      }
      const n = node(e);
      up.push(n);
      if ( n.unknown || !e.to.id || seenUp.has(e.to.id) ) break;
      seenUp.add(e.to.id);
      cur = e.to.id;
    }
    // Down: every visible link, to a few generations
    const seenDown = new Set([rootId]);
    const down = (id, depth) => {
      if ( depth >= MAX_DOWN ) return [];
      return (from.get(id) ?? []).filter(e => e.kind === L.down && visibleTo(e, viewer)).sort((a, b) => a.to.name.localeCompare(b.to.name)).map(e => {
        const n = node(e);
        if ( e.to.id && !seenDown.has(e.to.id) ) { seenDown.add(e.to.id); n.kids = down(e.to.id, depth + 1); }
        return n;
      });
    };
    const kids = down(rootId, 0);
    const realUp = up.filter(n => !n.unknown || L.up === "sire");
    if ( realUp.length || kids.length ) out.lines.push({key: L.key, label: L.label, up, down: kids});
  }
  const sides = (from.get(rootId) ?? []).filter(e => side.includes(e.kind) && visibleTo(e, viewer)).map(e => ({...node(e), kind: e.kind, label: KINDS[e.kind]?.label ?? e.kind}));
  if ( sides.length ) out.side = sides;
  return out;
}
