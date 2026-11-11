/**
 * WoDX Storyteller 0.26.0: who owns a thing or a place, and how a place is held in each age. No Foundry calls here.
 *
 * One owner record sits on an item, a container (a tile), a scene or a Region: flags.wodx-storyteller.owner.
 *   {id, kind, name, held, since, stolen, takenBy, takenAt, note}
 *   id: the owner's document uuid ("Actor.abc") or "faction:<id>" for a WoDX NPC faction; kind: actor | faction | name
 *   (a name typed in with nothing behind it yet, as the older place tags have). held: how a place is held (TENURES).
 *   since: the year it came to the owner. stolen: the thing is away from its owner without leave; takenBy: who took it.
 *
 * Owning is bookkeeping only. A building or a hoard never adds Background dots by itself: Domain, Holdings, Chantry,
 * Sanctum, Haunt or Resources rise by a story award or by experience, as the Storyteller rules (house rule, B850).
 */

const str = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : null);
export const KINDS = ["actor", "faction", "name"];

export function normOwner(o) {
  if ( !o || typeof o !== "object" ) return null;
  const id = str(o.id, 120), name = str(o.name, 80);
  if ( !id && !name ) return null;
  const kind = KINDS.includes(o.kind) ? o.kind : id.startsWith("faction:") ? "faction" : id ? "actor" : "name";
  return {
    id, kind, name, held: TENURES[o.held] ? o.held : "", since: num(o.since),
    stolen: !!o.stolen, takenBy: str(o.takenBy, 120), takenByName: str(o.takenByName, 80), takenAt: num(o.takenAt),
    note: str(o.note, 300)
  };
}

export const factionKey = id => `faction:${id}`;
export const isFaction = o => normOwner(o)?.kind === "faction";
export const factionIdOf = o => (isFaction(o) ? normOwner(o).id.slice(8) : null);

/**
 * Is this owner the viewer, or one the viewer stands for? viewer: {ids: [actor uuids], factions: [faction ids],
 * names: [names]}. A record with only a name matches the viewer's name word for word.
 */
export function isOwner(o, viewer = {}) {
  const r = normOwner(o);
  if ( !r ) return false;
  if ( r.kind === "actor" ) return (viewer.ids ?? []).includes(r.id);
  if ( r.kind === "faction" ) return (viewer.factions ?? []).includes(r.id.slice(8));
  const want = r.name.toLowerCase();
  return (viewer.names ?? []).some(n => String(n).trim().toLowerCase() === want);
}

/** What a player is told: "yours", "someone's" (no name: the character may not know whose) or "" when nobody owns it. */
export function whose(o, viewer = {}) {
  const r = normOwner(o);
  if ( !r ) return "";
  return isOwner(r, viewer) ? "yours" : "someone's";
}

/** Taking it without leave: the owner stays; the record says it is stolen and who took it. Taking back clears it. */
export function markTaken(o, taker = {}, at = 0) {
  const r = normOwner(o);
  if ( !r ) return null;
  if ( isOwner(r, {ids: [taker.id].filter(Boolean), factions: taker.factions ?? [], names: [taker.name].filter(Boolean)}) ) return {...r, stolen: false, takenBy: "", takenByName: "", takenAt: null};
  return {...r, stolen: true, takenBy: str(taker.id, 120), takenByName: str(taker.name, 80), takenAt: num(at)};
}

/** It changes hands honestly (bought, given, fenced, inherited): a new owner and no stolen mark. */
export function handOver(o, to = {}, {year = null, held = ""} = {}) {
  const prev = normOwner(o) ?? {};
  if ( !to?.id && !to?.name ) return null;
  return normOwner({id: to.id ?? "", kind: to.kind, name: to.name ?? "", held: held || prev.held || "", since: year ?? prev.since ?? null});
}

/** A typed-in owner name against actors and factions [{id, name, kind}]: the one match, or null. Titles are ignored. */
const TITLES = /^(the|of|von|van|de|der|herr|frau|lord|lady|sir|dame|father|mother|brother|sister|master|mistress|old|young|widow)$/i;
export function matchName(name, candidates = []) {
  const words = String(name ?? "").split(/\s+/).filter(w => w.length >= 3 && !TITLES.test(w)).map(w => w.toLowerCase());
  if ( !words.length ) return null;
  const hits = candidates.filter(c => {
    const have = new Set(String(c?.name ?? "").toLowerCase().split(/[^\p{L}'-]+/u));
    return words.every(w => have.has(w));
  });
  return hits.length === 1 ? hits[0] : null;
}

/** An older place tag's owner name becomes a record (linked when it matches one actor or faction). */
export function fromPlaceTag(place, candidates = []) {
  const name = str(place?.owner, 80);
  if ( !name ) return null;
  const hit = matchName(name, candidates);
  return hit ? normOwner({id: hit.id, kind: hit.kind, name: hit.name}) : normOwner({name, kind: "name"});
}

/* ------------------------------------------------------------------ */
/*  How a place is held, by age (Moravia first; other lands share the generic forms)                           */
/* ------------------------------------------------------------------ */

/**
 * kinds: the place kinds (WoDX NPC's place tags) a form suits; [] suits any. The years are history, not the books
 * (house figures, B851). The note is what the window says about it.
 */
export const TENURES = {
  fief: {label: "A fief held of a lord", from: 1197, to: 1848, kinds: ["castle", "home", "wilds", "workplace", "market"],
    note: "Held for service and loyalty. The lord can call on it, and it passes to an heir only with the lord's leave."},
  peasant: {label: "A peasant holding owing rent and labour", from: 1197, to: 1848, kinds: ["home", "workplace", "wilds"],
    note: "The family works the land of a lord and owes rent and days of labour (robota) until 1848."},
  burgher: {label: "A burgher's house under town law", from: 1197, to: 1848, kinds: ["home", "workplace", "tavern", "market"],
    note: "A royal town's own law; the house carries a vote in the town and a share of its dues."},
  church: {label: "Held by the Church", from: -10000, to: 2099, kinds: ["church", "home", "wilds", "workplace", "castle"],
    note: "A parish, a religious house or a bishop holds it. A character lives or works there by the Church's leave."},
  landtable: {label: "Entered in the land tables", from: 1348, to: 1918, kinds: ["castle", "home", "wilds", "workplace"],
    note: "A free estate entered in the Moravian land tables, kept at Brno and Olomouc from 1348."},
  rented: {label: "Rented", from: -10000, to: 2099, kinds: [],
    note: "Rent is paid each month; the landlord can put the tenant out."},
  deed: {label: "A deed in the land register", from: 1849, to: 1948, kinds: [],
    note: "Bought and sold freely and entered in the land register."},
  personal: {label: "Personal property (a family house or a cottage)", from: 1948, to: 1989, kinds: ["home", "wilds"],
    note: "Under the Communist state a family may keep its house or a country cottage; shops, workshops and estates are the state's."},
  allotted: {label: "Allotted by the state", from: 1948, to: 1989, kinds: [],
    note: "A flat or a post the state gives and can take away; a national enterprise owns the building."},
  registry: {label: "Entered in the land registry", from: 1990, to: 2099, kinds: [],
    note: "Bought and sold freely; property taken in 1948 can be claimed back from 1991."},
  corporate: {label: "A corporate lease or arcology contract", from: 2010, to: 2099, kinds: [],
    note: "In the World of Future Darkness most space belongs to a corporation and is leased by contract."},
  front: {label: "Through a front (a pawn's name, a company, a trust)", from: -10000, to: 2099, kinds: [],
    note: "The papers name someone else. The usual way for Kindred and others who cannot be seen to own."}
};

/** The forms open in a year for a kind of place, most usual first. */
export function tenuresAt(year, placeKind = "") {
  const y = Number(year) || 0;
  return Object.entries(TENURES).filter(([, t]) => y >= t.from && y <= t.to && (!t.kinds.length || !placeKind || t.kinds.includes(placeKind)))
    .map(([key, t]) => ({key, ...t}));
}

/** The form a new holding takes unless the Storyteller picks another. */
export function defaultTenure(year, placeKind = "", {supernatural = false} = {}) {
  const y = Number(year) || 0;
  if ( supernatural ) return "front";
  if ( placeKind === "church" ) return "church";
  if ( y >= 2030 && ["workplace", "market"].includes(placeKind) ) return "corporate";
  if ( y >= 1990 ) return "registry";
  if ( y >= 1948 ) return ["home", "wilds"].includes(placeKind) ? "personal" : "allotted";
  if ( y >= 1849 ) return "deed";
  if ( placeKind === "castle" ) return y >= 1348 ? "landtable" : "fief";
  if ( ["home", "workplace", "tavern", "market"].includes(placeKind) ) return "burgher";
  return "fief";
}

/** May a private person run a workshop or shop in a town that year, and on what terms. */
export function tradeRightAt(year) {
  const y = Number(year) || 0;
  if ( y < 1300 ) return {ok: true, how: "No guild yet holds the trade; the town or the lord grants the right to sell."};
  if ( y < 1859 ) return {ok: true, how: "Only a master of the craft's guild may keep a workshop and sell in a royal town (guild rule, to 1859)."};
  if ( y < 1948 ) return {ok: true, how: "A trade licence from the authorities is enough (the trade code of 1859)."};
  if ( y < 1990 ) return {ok: false, how: "Private trade is forbidden; shops and workshops belong to national enterprises and cooperatives."};
  return {ok: true, how: "A trade licence (živnostenský list) is enough."};
}

/** A line for a card or a sheet: "A burgher's house under town law, since 1402". */
export function heldLine(o) {
  const r = normOwner(o);
  if ( !r ) return "Nobody's.";
  const how = TENURES[r.held]?.label;
  return `${r.name || "Someone"}${how ? `: ${how.charAt(0).toLowerCase()}${how.slice(1)}` : ""}${r.since ? `, since ${r.since}` : ""}${r.stolen ? ` (stolen${r.takenByName ? ` by ${r.takenByName}` : ""})` : ""}.`;
}
