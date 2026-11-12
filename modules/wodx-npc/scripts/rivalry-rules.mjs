/**
 * WoDX NPC 0.18.0 (B820 to B825): natural rivalries between kinds of NPC. The pure parts, so the harness can test them.
 *
 *   Sides      what an NPC is: its line, clan, sect, tribe, Tradition, creed, court, kith, house and factions.
 *   Rivalries  dated pairs of sides and how each regards the other in a year, on the -3 to +3 scale that faction
 *              standing and attitude use (-1 Tense, -2 Hostile, -3 Hunts).
 *   Knowing    a rivalry only counts once the NPC can tell what the other is.
 *   Flashpoint the odds that two rivals who meet come to blows. A fight goes through WoDX Combat's starter.
 *
 * The table reads each line's own books for who hates whom (V20 of each line first, then Revised or 2nd edition),
 * with real history for the mortal powers of the Czech lands. Steps, years and odds are WoDX readings, house rules,
 * logged in docs/PENDING-REVIEW.md. Page references wait on a book check (see docs/RIVALRIES.md).
 */

export const STEP_WORDS = {"-3": "Hunts", "-2": "Hostile", "-1": "Tense", "0": "No quarrel"};
export const stepWord = s => STEP_WORDS[String(Math.max(-3, Math.min(0, Math.round(Number(s) || 0))))] ?? "No quarrel";

/** Sheet fields read as sides, and the key each becomes. */
export const SHEET_SIDES = {clan: "clan", bloodline: "clan", sect: "sect", tribe: "tribe", affiliation: "aff", tradition: "aff",
  creed: "creed", court: "court", kith: "kith", house: "house", legion: "legion", faction: "faction", amenti: "amenti"};

/** Lines that count as the supernatural for hunters and for mortals who see one plainly. */
export const SUPERNATURAL = "line:kindred|line:ghoul|line:lupine|line:mage|line:fae|line:demon|line:mummy";
const TRADITIONS = "aff:tradition|aff:council|hermes|hermetic|verbena|chorus|messianic|akashic|batini|ahl-i-batin|dreamspeaker|" +
  "spirit-talker|euthanatos|chakravanti|ecstasy|virtual adept|son of ether|sons of ether|solificati|old faith|valdaermen";
const REASON = "aff:technocra|order of reason|daedalean|craftmason|high guild|celestial master|void seeker|cosian|artificer|" +
  "iteration x|progenitor|syndicate|void engineer|new world order";
const INQUISITION = "inquisit|society of leopold|leopold";

/**
 * The rivalries. a, b: side matchers ("key:word" or a bare word, "|" between alternatives); aNot, bNot: matchers that
 * take a side out (a Black Spiral Dancer is a Garou too); from, to: the years in force (inclusive, null open);
 * ab: how a regards b, ba: how b regards a (0 or absent: no quarrel that way); open: true when both sides wear it
 * openly; note: the reason, in WoDX's words; book: where the book check looks.
 */
export const RIVALRIES = [
  // Kindred among themselves
  {id: "tremere-tzimisce", a: "clan:tremere", b: "clan:tzimisce", from: null, to: 1492, ab: -3, ba: -3,
    note: "The war over the Carpathians and Bohemia: the Tremere took their first strongholds from Tzimisce land", book: "VtDA20 pdf 413-414"},
  {id: "tremere-tzimisce-sects", a: "clan:tremere", b: "clan:tzimisce", from: 1493, to: null, ab: -2, ba: -2,
    note: "The old war goes on inside the war of the sects", book: "V20 pdf 142, 145, 404"},
  {id: "tremere-salubri", a: "clan:tremere", b: "clan:salubri", from: null, to: null, ab: -3, ba: -3,
    note: "The Tremere hunt Saulot's line since their founder took Saulot's blood", book: "VtDA20 pdf 41, 101-103; V20 pdf 416, 446"},
  {id: "tremere-assamite", a: "clan:tremere", b: "clan:assamite|banu haqim", from: 1493, to: null, ab: -2, ba: -2,
    note: "The blood curse the Tremere laid on the Assamites at the Convention of Thorns", book: "V20 pdf 324, 436, 441"},
  {id: "tremere-hermes", a: "clan:tremere", b: "hermes|hermetic", from: null, to: null, ab: -2, ba: -3,
    note: "The Order of Hermes never forgave the house that stole immortality from vampires", book: "V20 Dark Ages; M20"},
  {id: "tzimisce-ventrue", a: "clan:tzimisce", b: "clan:ventrue", from: null, to: 1492, ab: -1, ba: -1,
    note: "Eastern domains disputed with the Ventrue of the Empire", book: "V20 Dark Ages"},
  {id: "giovanni-cappadocian", a: "clan:giovanni", b: "cappadocian|lamia|harbinger", from: 1444, to: null, ab: -3, ba: -3,
    note: "The Giovanni destroyed their own clan's founder and hunt what remains of the line", book: "V20 Dark Ages; V20"},
  {id: "anarch-revolt", a: "sect:anarch", b: "sect:camarilla|prince|elder", from: 1381, to: 1492, ab: -2, ba: -2,
    note: "The Anarch Revolt against the elders", book: "Guide to the Anarchs p. 19 (pdf 20)"},
  {id: "anarch-camarilla", a: "sect:anarch", b: "sect:camarilla", from: 1493, to: null, ab: -1, ba: -1,
    note: "Rebels kept on sufferance after the Convention of Thorns", book: "Anarchs pdf 14-15"},
  {id: "sabbat-camarilla", a: "sect:sabbat", b: "sect:camarilla", from: 1493, to: null, ab: -2, ba: -2,
    note: "The war of the sects", book: "Anarchs pdf 14-15, 133; V20 pdf 46"},
  {id: "sabbat-anarch", a: "sect:sabbat", b: "sect:anarch", from: 1493, to: null, ab: -1, ba: -1,
    note: "Those who walked away from the Sword of Caine", book: "V20"},
  {id: "baali", a: "clan:baali|infernal", b: "line:kindred", bNot: "clan:baali|infernal", from: null, to: null, ab: -2, ba: -3,
    note: "Every clan destroys the Baali on sight", book: "V20"},
  {id: "setite", a: "clan:setite|follower of set|ministry", b: "line:kindred", bNot: "clan:setite|follower of set|ministry", from: null, to: null, ab: -1, ba: -1,
    note: "Corrupters no prince trusts", book: "V20"},
  {id: "setite-mummy", a: "clan:setite|follower of set|ministry", b: "line:mummy", from: null, to: null, ab: -3, ba: -3,
    note: "The servants of Set against the servants of Osiris", book: "Mummy: The Resurrection"},
  {id: "cathayan", a: "kuei-jin|cathayan", b: "line:kindred", bNot: "kuei-jin|cathayan", from: null, to: null, ab: -2, ba: -1,
    note: "The Cathayans count the Kin-jin as enemies; open hostility from the Kin-jin is rare", book: "Kindred of the East pdf 32"},
  // Garou and the Changing Breeds
  {id: "garou-kindred", a: "line:lupine", b: "line:kindred", from: null, to: null, ab: -2, ba: -2,
    note: "Leeches: the Garou count the walking dead as the Wyrm's own", book: "W20 pdf 73, 195, 456-457"},
  {id: "garou-spiral", a: "tribe:black spiral", b: "line:lupine", bNot: "tribe:black spiral", from: null, to: null, ab: -3, ba: -3,
    note: "The fallen tribe", book: "W20"},
  {id: "garou-fomor", a: "fomor|wyrm", b: "line:lupine", bNot: "tribe:black spiral", from: null, to: null, ab: -3, ba: -3,
    note: "The Wyrm's creatures", book: "W20"},
  {id: "garou-pentex", a: "pentex", b: "line:lupine", bNot: "tribe:black spiral", from: 1900, to: null, ab: -2, ba: -3,
    note: "The Wyrm's corporations", book: "W20"},
  {id: "shadowlord-silverfang", a: "tribe:shadow lord", b: "tribe:silver fang", from: null, to: null, ab: -1, ba: -1,
    note: "The old quarrel over who should lead the Nation", book: "W20"},
  {id: "fenris-fianna", a: "tribe:get of fenris|fenrir", b: "tribe:fianna", from: null, to: null, ab: -1, ba: -1,
    note: "An old feud between the tribes", book: "W20"},
  {id: "talon-city", a: "tribe:red talon", b: "tribe:glass walker|tribe:bone gnawer", from: null, to: null, ab: -1, ba: -1,
    note: "The wolves against the tribes of the cities", book: "W20"},
  {id: "garou-ratkin", a: "ratkin", b: "line:lupine", bNot: "ratkin", from: null, to: null, ab: -2, ba: -2,
    note: "The War of Rage was never forgiven", book: "W20 Changing Breeds"},
  {id: "garou-bastet", a: "bastet", b: "line:lupine", bNot: "bastet", from: null, to: null, ab: -1, ba: -1,
    note: "Old wounds from the War of Rage", book: "W20 Changing Breeds"},
  {id: "garou-reason", a: "line:lupine", b: REASON, from: 1325, to: null, ab: -1, ba: -1,
    note: "Servants of the Weaver who drain the caerns", book: "W20; M20"},
  // Mages
  {id: "hermes-daedalean", a: TRADITIONS, b: REASON, from: null, to: 1209, ab: -1, ba: -1,
    note: "The craftsmen's guilds and the old orders begin to quarrel", book: "Sorcerers Crusade pdf 70"},
  {id: "ascension-war", a: TRADITIONS, b: REASON, from: 1210, to: 1998, ab: -2, ba: -2,
    note: "The Ascension War, from the fall of Mistridge in 1210; the Order of Reason takes its name in 1325", book: "Sorcerers Crusade pdf 63-72; M20 pdf 23"},
  {id: "after-the-storm", a: TRADITIONS, b: REASON, from: 1999, to: null, ab: -1, ba: -1,
    note: "After the Avatar Storm of 1999 the war goes quieter", book: "M20 pdf 480"},
  {id: "marauder", a: "marauder", b: "line:mage", bNot: "marauder", from: null, to: null, ab: -2, ba: -2,
    note: "Mad mages", book: "M20"},
  {id: "reason-marauder", a: REASON, b: "marauder", from: null, to: null, ab: -3, ba: 0,
    note: "The Technocracy hunts the mad", book: "M20"},
  {id: "nephandi", a: "nephand", b: "line:mage", bNot: "nephand", from: null, to: null, ab: -3, ba: -3,
    note: "The fallen mages", book: "M20"},
  // Fae
  {id: "dauntain", a: "dauntain", b: "line:fae", bNot: "dauntain", from: null, to: null, ab: -3, ba: -3,
    note: "Changelings who turned on the Dreaming", book: "C20"},
  {id: "seelie-unseelie", a: "court:seelie", b: "court:unseelie", from: null, to: null, ab: -1, ba: -1,
    note: "The two courts", book: "C20"},
  {id: "shadow-court", a: "shadow court", b: "court:seelie", from: null, to: null, ab: -2, ba: -2,
    note: "The Shadow Court works against the Seelie", book: "C20"},
  {id: "accordance-war", a: "kith:sidhe", b: "line:fae", bNot: "kith:sidhe", from: 1969, to: 1973, ab: -2, ba: -2,
    note: "The Accordance War after the sidhe came back", book: "C20 pdf 29, 38-39, 51; the Battle of Manhattan, December 1973, C20 pdf 39"},
  {id: "fomorian", a: "fomorian|thallain", b: "line:fae", bNot: "fomorian|thallain", from: null, to: null, ab: -3, ba: -3,
    note: "The Fomorians and their kin", book: "C20"},
  {id: "fae-kindred", a: "line:fae", b: "line:kindred", from: null, to: null, ab: -1, ba: -1,
    note: "Kindred prize fae blood as a drug", book: "C20; V20"},
  // The dead
  {id: "spectres", a: "spectre", b: "line:wraith", bNot: "spectre", from: null, to: null, ab: -3, ba: -3,
    note: "The servants of Oblivion", book: "Wraith 20th"},
  {id: "hierarchy-renegade", a: "hierarchy|stygia|legion:", b: "renegade", from: null, to: null, ab: -2, ba: -2,
    note: "Stygia's law against those who reject it", book: "Wraith 20th"},
  {id: "hierarchy-heretic", a: "hierarchy|stygia|legion:", b: "heretic", from: null, to: null, ab: -2, ba: -1,
    note: "Stygia's law against the faiths of the dead", book: "Wraith 20th"},
  {id: "wraith-giovanni", a: "line:wraith", b: "clan:giovanni|necromancer", from: null, to: null, ab: -2, ba: -1,
    note: "Necromancers who bind and sell the dead", book: "Wraith 20th; V20"},
  // Hunters
  {id: "church-hunters", a: "kind:hunters|witch-hunter", b: SUPERNATURAL, from: null, to: 1230, ab: -2, ba: -2,
    note: "Local hunters and the Church's own before the Inquisition", book: "V20 Dark Ages"},
  {id: "inquisition", a: INQUISITION, b: SUPERNATURAL, from: 1231, to: null, ab: -3, ba: -2,
    note: "The Inquisition, later the Society of Leopold, hunts every monster it finds", book: "Dark Ages: Inquisitor; Hunters Hunted II"},
  {id: "inquisition-heretic", a: INQUISITION, b: "heretic|cathar|waldens", from: 1231, to: 1700, ab: -2, ba: -1,
    note: "Heresy is the Inquisition's first business", book: "Dark Ages: Inquisitor"},
  {id: "arcanum", a: "arcanum", b: SUPERNATURAL, from: 1885, to: null, ab: -1, ba: -1,
    note: "Scholars who watch rather than fight", book: "Hunters Hunted II"},
  {id: "agencies", a: "project twilight|special affairs", b: SUPERNATURAL, from: 1950, to: null, ab: -2, ba: -2,
    note: "Government hunters", book: "Hunters Hunted II"},
  {id: "imbued-zeal", a: "creed:avenger|creed:wayward", b: SUPERNATURAL, from: 1999, to: null, ab: -3, ba: -2,
    note: "The Creeds of Zeal and the Wayward", book: "Hunter: The Reckoning"},
  {id: "imbued-judge", a: "creed:judge|creed:defender", b: SUPERNATURAL, from: 1999, to: null, ab: -2, ba: -2,
    note: "Judges and Defenders", book: "Hunter: The Reckoning"},
  {id: "imbued-mercy", a: "creed:innocent|creed:martyr|creed:redeemer|creed:hermit|creed:visionary", b: SUPERNATURAL, from: 1999, to: null, ab: -1, ba: -1,
    note: "The Creeds of Mercy and Vision look before they strike", book: "Hunter: The Reckoning"},
  {id: "leopold-imbued", a: INQUISITION, b: "line:hunter", bNot: INQUISITION, from: 1999, to: null, ab: -1, ba: -1,
    note: "The Society of Leopold mistrusts the new hunters", book: "Hunter: The Reckoning"},
  // Mortals who see the supernatural plainly (recognition keeps this to the obvious)
  {id: "mortals-monsters", a: "line:mortal", b: SUPERNATURAL, from: null, to: null, ab: -2, ba: 0,
    note: "Ordinary people who see a monster plainly", book: "V20"},
  // Mortal powers in the Czech lands (real history)
  {id: "church-heresy", a: "kind:church", b: "heretic|cathar|waldens", from: null, to: 1300, ab: -2, ba: -1, open: true,
    note: "The Church against the heresies", book: "history"},
  {id: "hussite-wars", a: "catholic|crusader|royalist", b: "hussite|taborite|utraquist|orphan", from: 1419, to: 1434, ab: -3, ba: -3, open: true,
    note: "The Hussite Wars", book: "history"},
  {id: "hussite-peace", a: "catholic|crusader|royalist", b: "hussite|taborite|utraquist|orphan", from: 1435, to: 1620, ab: -1, ba: -1, open: true,
    note: "An uneasy peace between the faiths", book: "history"},
  {id: "thirty-years", a: "catholic|imperial", b: "protestant|swedish|estates", from: 1618, to: 1648, ab: -2, ba: -2, open: true,
    note: "The Thirty Years' War", book: "history"},
  {id: "occupation", a: "occupier|gestapo|wehrmacht|protectorate", b: "resistance|partisan", from: 1939, to: 1945, ab: -3, ba: -3,
    note: "The Protectorate of Bohemia and Moravia", book: "history"},
  {id: "state-security", a: "stb|state security|secret police", b: "dissident|charter 77", from: 1948, to: 1989, ab: -2, ba: -1,
    note: "Communist state security against its critics", book: "history"},
  {id: "watch-outlaws", a: "kind:watch|watch|police|guard", b: "criminal|thief|outlaw|gang|smuggler", from: null, to: null, ab: -1, ba: -2,
    note: "The law and those who break it", book: "house"},
  {id: "corp-runners", a: "corp|corporate", b: "runner|edgerunner", from: 2020, to: null, ab: -2, ba: -1,
    note: "Corporate security and freelancers in the Future Darkness", book: "WoDX Future Darkness"}
];

/* ------------------------------------------------------------------ */
/*  Sides                                                              */
/* ------------------------------------------------------------------ */

const lc = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const words = v => (Array.isArray(v) ? v : [v]).map(lc).filter(Boolean);

/**
 * An NPC's sides as "key:value" strings. info: {line, sheet: {clan, sect, ...}, variant, factions: [{name, kind}],
 * written: ["sect:sabbat", ...], master: (the same shape, for a follower)}.
 */
export function sidesOf(info = {}) {
  const out = new Set();
  if ( info.line ) out.add(`line:${lc(info.line)}`);
  for ( const [field, key] of Object.entries(SHEET_SIDES) ) for ( const w of words(info.sheet?.[field]) ) out.add(`${key}:${w}`);
  for ( const w of words(info.variant) ) out.add(`variant:${w}`);
  for ( const f of info.factions ?? [] ) {
    if ( f?.kind ) out.add(`kind:${lc(f.kind)}`);
    if ( f?.name ) out.add(`faction:${lc(f.name)}`);
  }
  for ( const w of words(info.written) ) out.add(w.includes(":") ? w : `side:${w}`);
  return [...out];
}

/** Does one matcher alternative ("key:word" or a bare word) fit one side? */
function fits(alt, side) {
  const i = alt.indexOf(":");
  if ( i < 0 ) return side.slice(side.indexOf(":") + 1).includes(alt);
  const k = alt.slice(0, i), w = alt.slice(i + 1), sk = side.slice(0, side.indexOf(":")), sv = side.slice(side.indexOf(":") + 1);
  return k === sk && (!w || sv.includes(w));
}
/** Does a matcher fit any of the sides? */
export function matches(matcher, sides = []) {
  if ( !matcher ) return false;
  const alts = String(matcher).toLowerCase().split("|").map(s => s.trim()).filter(Boolean);
  return sides.some(s => alts.some(a => fits(a, s)));
}

export const inForce = (row, year) => {
  const y = Number(year);
  if ( !Number.isFinite(y) || !y ) return row.from === null || row.from === undefined;
  return (row.from === null || row.from === undefined || y >= row.from) && (row.to === null || row.to === undefined || y <= row.to);
};

/** The rivalry rows in force between two sets of sides, from the first one's view. Returns [{row, step}]. */
export function rowsBetween(mine = [], theirs = [], year, rows = RIVALRIES) {
  const out = [];
  for ( const r of rows ) {
    if ( !inForce(r, year) ) continue;
    const aMe = matches(r.a, mine) && !matches(r.aNot, mine), bThem = matches(r.b, theirs) && !matches(r.bNot, theirs);
    const bMe = matches(r.b, mine) && !matches(r.bNot, mine), aThem = matches(r.a, theirs) && !matches(r.aNot, theirs);
    if ( aMe && bThem && r.ab ) out.push({row: r, step: r.ab, mineSide: r.a, theirSide: r.b});
    else if ( bMe && aThem && r.ba ) out.push({row: r, step: r.ba, mineSide: r.b, theirSide: r.a});
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Knowing what the other is                                          */
/* ------------------------------------------------------------------ */

/** Which lines each sense shows. A line not listed needs the other to be obvious. */
export const SENSES = {
  auspex: ["kindred", "ghoul", "lupine", "mage", "fae", "wraith", "demon", "mummy", "spirit"],
  scent: ["kindred"],
  "sense wyrm": ["kindred", "spirit", "demon"],
  kenning: ["fae"],
  "second sight": ["kindred", "ghoul", "lupine", "mage", "fae", "wraith", "demon", "mummy", "spirit"],
  awareness: ["mage"]
};
/** Sides that the eye sees on anyone: livery, habit, uniform. */
const OPEN_KEYS = new Set(["kind", "side"]);

/**
 * Which of the other's sides this NPC can tell. watcher: {line, senses: [SENSES keys], knowsFactions: [faction names],
 * metThem: bool}; other: {sides, obvious: bool, openSides: [sides worn openly]}.
 * Lines show only when obvious or a sense shows them; factions when met or known; sides worn openly always. Clan,
 * sect, tribe and the like show when met, when plainly shown, or to one of the same line once it can tell what the
 * other is: Kindred know the Kindred of their city, Garou the Garou of their land (a house rule).
 */
export function knownSides(watcher = {}, other = {}) {
  const sides = other.sides ?? [];
  const senses = new Set((watcher.senses ?? []).map(lc));
  const shown = new Set(Object.entries(SENSES).filter(([k]) => senses.has(k)).flatMap(([, v]) => v));
  const knows = new Set((watcher.knowsFactions ?? []).map(lc));
  const open = new Set((other.openSides ?? []).map(lc));
  const met = !!watcher.metThem;
  const line = sides.find(s => s.startsWith("line:"))?.slice(5);
  const lineKnown = !!other.obvious || (!!line && (shown.has(line) || (!!watcher.sawIt && line !== "mortal")));
  // NPC 0.32.0: a side worn openly shows whether or not it is the wearer's own (a borrowed habit reads as the Church)
  const worn = [...open].filter(s => !sides.includes(s));
  return [...worn, ...sides.filter(s => {
    if ( open.has(s) ) return true;
    const k = s.slice(0, s.indexOf(":"));
    if ( k === "line" || k === "variant" ) return lineKnown || (k === "line" && s === "line:mortal" && met);
    if ( k === "faction" ) return met || knows.has(s.slice(8));
    if ( OPEN_KEYS.has(k) ) return met || lineKnown;
    // clan, sect, tribe and the rest: what the other is among its own kind
    return met || (lineKnown && (!!other.obvious || (!!line && lc(watcher.line) === line)));
  })];
}

/**
 * Can this watcher tell what the other is? (NPC 0.33.0, B1380.) watcher: {senses: [SENSES keys], sawIt: a recorded
 * witness of the other's secret}; other: {line, obvious}. A mortal has nothing to tell. Returns {tells, how}, how being
 * "obvious", the sense that showed it, or "saw it".
 */
export function tellsLine(watcher = {}, other = {}) {
  const line = lc(other.line);
  if ( !line || line === "mortal" ) return {tells: false, how: null};
  if ( other.obvious ) return {tells: true, how: "obvious"};
  const senses = new Set((watcher.senses ?? []).map(lc));
  for ( const [k, shows] of Object.entries(SENSES) ) if ( senses.has(k) && shows.includes(line) ) return {tells: true, how: k};
  if ( watcher.sawIt ) return {tells: true, how: "saw it"};
  return {tells: false, how: null};
}

/**
 * Did the watcher see the other for what it is? entries: the Masquerade records ({byUuid, witnesses: [{uuid, state}]});
 * a witness still marked "saw" or "told" remembers. Made to forget, or never there, and it does not.
 */
export function sawSecret(entries = [], watcherIds = [], otherIds = []) {
  const w = new Set((watcherIds ?? []).filter(Boolean)), o = new Set((otherIds ?? []).filter(Boolean));
  if ( !w.size || !o.size ) return false;
  return (entries ?? []).some(e => o.has(e?.byUuid) && (e?.witnesses ?? []).some(x => w.has(x?.uuid) && ["saw", "told"].includes(x?.state)));
}

/**
 * The watcher's own memory of who it has seen for what (0.33.0, B1383): flags.wodx-npc.seenAs, {actorId: {secret, at}},
 * written when WoDX Actions says a creature of another kind saw someone (hook wodxSecretSeen). Returns the list after
 * adding one sighting; at most 200 kept, newest last.
 */
export function noteSeen(seenAs = {}, otherId, secret, at = 0) {
  const out = {...(seenAs && typeof seenAs === "object" ? seenAs : {})};
  if ( !otherId || !/^[A-Za-z0-9]{1,32}$/.test(String(otherId)) ) return out;
  delete out[otherId];
  out[otherId] = {secret: String(secret ?? "").slice(0, 20), at: Number(at) || 0};
  const keys = Object.keys(out);
  for ( const k of keys.slice(0, Math.max(0, keys.length - 200)) ) delete out[k];
  return out;
}
/**
 * What a fed-on vessel keeps of it (0.35.0, B1384). The Kiss leaves a mortal with a swoon and a lost hour, not the
 * truth of it; one who fought it off saw what fed; a Kindred or ghoul vessel, or one who already knows the Kindred,
 * knows what was done. A willing vessel learns nothing new. vessel: {kind, knows: [secrets] | "*"}.
 * Returns "nothing", "lost time" or "saw".
 */
export function fedMemory({willing = false, fought = false, vessel = {}} = {}) {
  if ( willing ) return "nothing";
  const k = lc(vessel.kind);
  const knows = vessel.knows === "*" || (Array.isArray(vessel.knows) && vessel.knows.includes("kindred"));
  if ( fought || k === "kindred" || k === "ghoul" || knows ) return "saw";
  return "lost time";
}
/** The vessel's list of feedings after one more (flags.wodx-npc.fedOn, {actorId: {at, times, saw}}), at most 50 kept. */
export function noteFed(fedOn = {}, byId, {at = 0, saw = false} = {}) {
  const out = {...(fedOn && typeof fedOn === "object" ? fedOn : {})};
  if ( !byId || !/^[A-Za-z0-9]{1,32}$/.test(String(byId)) ) return out;
  const was = out[byId];
  delete out[byId];
  out[byId] = {at: Number(at) || 0, times: (Number(was?.times) || 0) + 1, saw: !!saw || !!was?.saw};
  const keys = Object.keys(out);
  for ( const k of keys.slice(0, Math.max(0, keys.length - 50)) ) delete out[k];
  return out;
}

/** Has the watcher seen this one for what it is? */
export const hasSeen = (seenAs, otherId) => !!(otherId && seenAs && typeof seenAs === "object" && seenAs[otherId]);

/* ------------------------------------------------------------------ */
/*  Regard and flashpoints                                             */
/* ------------------------------------------------------------------ */

/**
 * How this NPC regards the other. mine: its sides; known: the other's sides it can tell; year; standing: the
 * Storyteller's faction standing between them when set (a number, wins); rivals: the NPC's own Rivals lines,
 * parsed ([{matcher, step}], win over everything); follower: this NPC only carries its master's quarrels.
 * Returns {step, why, rows}.
 */
export function regard({mine = [], known = [], year = null, standing = null, rivals = [], follower = false, rows = RIVALRIES} = {}) {
  for ( const r of rivals ) if ( matches(r.matcher, known) ) return {step: r.step, why: r.step < 0 ? `a written rival (${r.matcher})` : "a written friend", rows: []};
  if ( Number.isFinite(standing) && standing !== 0 ) return {step: Math.max(-3, Math.min(3, standing)), why: "their factions' standing", rows: []};
  const found = rowsBetween(mine, known, year, rows);
  if ( !found.length ) return {step: 0, why: "", rows: []};
  const worst = found.reduce((a, b) => (b.step < a.step ? b : a));
  const step = follower ? Math.min(0, worst.step + 1) : worst.step;
  return {step, why: worst.row.note, rows: found.map(f => f.row.id)};
}

/** Rivals lines ("sect:camarilla -3", "clan:tremere 0") to [{matcher, step}] and problems. */
export function parseRivals(text) {
  const out = [], problems = [];
  for ( const raw of String(text ?? "").split(/\r?\n/) ) {
    const line = raw.replace(/#.*$/, "").trim();
    if ( !line ) continue;
    const m = /^(.+?)\s+([+-]?[0-3])$/.exec(line);
    if ( !m ) { problems.push(`"${line}": write a side and a step, e.g. sect:camarilla -2`); continue; }
    out.push({matcher: m[1].trim().toLowerCase(), step: Number(m[2])});
  }
  return {rivals: out, problems};
}

/** Sides that keep a secret and so hold back before mortal witnesses. */
const SECRET_KEEPERS = "line:kindred|line:lupine|line:mage|line:fae|line:ghoul";
export const ODDS = {hostile: 35, hunts: 85, ground: 20, night: 10, outnumber: 15, outnumbered: -25, witnesses: -30, frenzy: 15, cap: 95};

/**
 * The odds (0 to 95) that a rival comes to blows on meeting. sit: {step, mine (sides), aggression, ownGround, night,
 * us, them (counts on each side), witnesses (mortals watching who are not part of it), rage, hungry, truce, parley,
 * parleyed}. Returns {odds, why: [...]}.
 */
export function flashpoint(sit = {}) {
  const why = [];
  const step = Number(sit.step) || 0;
  if ( step > -2 ) return {odds: 0, why: [step === -1 ? "tense: words, not blows, unless provoked" : "no quarrel"]};
  if ( sit.truce ) return {odds: 0, why: ["truce ground"]};
  let o = step <= -3 ? ODDS.hunts : ODDS.hostile;
  why.push(step <= -3 ? `hunts them (${ODDS.hunts}%)` : `hostile (${ODDS.hostile}%)`);
  const mine = sit.mine ?? [];
  if ( sit.ownGround ) { o += ODDS.ground; why.push(`on its own ground (+${ODDS.ground})`); }
  if ( sit.night && matches("line:kindred|line:lupine", mine) ) { o += ODDS.night; why.push(`night (+${ODDS.night})`); }
  const us = Math.max(1, Number(sit.us) || 1), them = Math.max(1, Number(sit.them) || 1);
  if ( us >= 2 * them ) { o += ODDS.outnumber; why.push(`outnumbers them (+${ODDS.outnumber})`); }
  else if ( them >= 2 * us ) { o += ODDS.outnumbered; why.push(`outnumbered (${ODDS.outnumbered})`); }
  if ( (Number(sit.witnesses) || 0) > 0 && matches(SECRET_KEEPERS, mine) ) {
    const w = matches("sect:sabbat", mine) ? Math.round(ODDS.witnesses / 2) : ODDS.witnesses;
    o += w; why.push(`mortals watching (${w})`);
  }
  if ( (Number(sit.rage) || 0) >= 5 || sit.hungry ) { o += ODDS.frenzy; why.push(`${sit.hungry ? "hungry" : "Rage"} (+${ODDS.frenzy})`); }
  const ag = Number.isFinite(Number(sit.aggression)) ? Number(sit.aggression) : 1;
  o *= 0.5 + ag / 2;
  if ( sit.parley && !sit.parleyed ) { o /= 2; why.push("speaks a challenge first (half)"); }
  return {odds: Math.max(0, Math.min(ODDS.cap, Math.round(o))), why};
}

/** Roll the flashpoint: d100 at or under the odds. rng: () => [0, 1). */
export function rollFlashpoint(odds, rng = Math.random) {
  const roll = 1 + Math.floor(rng() * 100);
  return {roll, fight: roll <= odds};
}

/** The NPC pairs worth checking after a token moved: the mover against every other NPC, never characters. */
export function rivalPairs(moved, others = []) {
  if ( !moved || moved.pc || moved.down ) return [];
  return others.filter(o => o && o.id !== moved.id && !o.pc && !o.down && !o.hidden).map(o => ({a: moved.id, b: o.id}));
}

/** World seconds a pair that stared each other down stays quiet. */
export const STANDOFF_SECONDS = 600;
export const pairKey = (a, b) => [a, b].sort().join(":");
export const quietPair = (last, now, seconds = STANDOFF_SECONDS) => Number.isFinite(last) && now - last < seconds && now >= last;

/** A side map for a fight: who stands with whom. a, b: token ids; withA, withB: their helpers. */
export function sidesForFight(a, b, withA = [], withB = []) {
  const out = {};
  for ( const id of [a, ...withA] ) if ( id ) out[id] = "a";
  for ( const id of [b, ...withB] ) if ( id && !out[id] ) out[id] = "b";
  return out;
}

/** Are two tokens enemies by a fight's side map? null when the map says nothing about one of them. */
export function enemiesBySide(map, x, y) {
  if ( !map || !map[x] || !map[y] ) return null;
  return map[x] !== map[y];
}

/* ------------------------------------------------------------------ */
/*  Senses, the Storyteller's own rows                                 */
/* ------------------------------------------------------------------ */

/**
 * Rolled senses. A vampire does not pass for human to a werewolf's nose (W20 pdf 456-457); the roll for it is a house
 * rule. Sense Wyrm is Perception + Occult (W20 pdf 158; difficulty 6 a house reading). A mage's feel for another of the
 * Awakened is a house rule.
 */
export const SENSE_ROLLS = {scent: {attr: "perception", ability: "primal-urge", diff: 7}, "sense wyrm": {attr: "perception", ability: "occult", diff: 6},
  awareness: {attr: "perception", ability: "awareness", diff: 8}};

/**
 * The senses a watcher has. who: {kind (the combat profile), auspex (dots), senseWyrm (has the Gift), imbued (a creed)}.
 * Returns {auto: [senses that always work], roll: [senses that need SENSE_ROLLS]}. Aura Perception is Auspex 2.
 */
export function sensesOf(who = {}) {
  const auto = [], roll = [];
  if ( Number(who.auspex) >= 2 ) auto.push("auspex");
  if ( who.kind === "lupine" ) { roll.push("scent"); if ( who.senseWyrm ) roll.push("sense wyrm"); }
  if ( who.kind === "fae" ) auto.push("kenning");
  if ( who.kind === "hunter" && who.imbued ) auto.push("second sight");
  if ( who.kind === "mage" ) roll.push("awareness");
  return {auto, roll};
}

/**
 * The Storyteller's own rows, one a line: "sect:sabbat > clan:ventrue: -2 / -1, 1500-1700, why". The second step,
 * the years and the reason may be left out (both ways the same, every year). Returns {rows, problems}.
 */
export function parseExtraRows(text) {
  const rows = [], problems = [];
  let n = 0;
  for ( const raw of String(text ?? "").split(/\r?\n/) ) {
    const line = raw.replace(/#.*$/, "").trim();
    if ( !line ) continue;
    const m = /^(.+?)\s*>\s*(.+?):\s*([+-]?[0-3])(?:\s*\/\s*([+-]?[0-3]))?(?:\s*,\s*(\d{3,4})?\s*-\s*(\d{3,4})?)?(?:\s*,\s*(.+))?$/.exec(line);
    if ( !m ) { problems.push(`"${line}": write A > B: -2 / -1, 1500-1700, why`); continue; }
    const ab = Number(m[3]), ba = m[4] === undefined ? ab : Number(m[4]);
    rows.push({id: `own-${++n}`, a: m[1].trim().toLowerCase(), b: m[2].trim().toLowerCase(), from: m[5] ? Number(m[5]) : null, to: m[6] ? Number(m[6]) : null,
      ab, ba, note: (m[7] ?? "").trim() || "a house rivalry", book: "house"});
  }
  return {rows, problems};
}

/** The rows in use: the table less the rows switched off, plus the Storyteller's own. */
export function rowsInUse({off = [], extra = ""} = {}) {
  const gone = new Set(off ?? []);
  return [...RIVALRIES.filter(r => !gone.has(r.id)), ...parseExtraRows(extra).rows];
}
