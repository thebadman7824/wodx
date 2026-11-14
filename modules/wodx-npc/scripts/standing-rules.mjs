/**
 * WoDX NPC 0.59.0: standing by community with the news of a deed travelling at the era's speed, social rank by way of
 * life and century, and feuds that pass to heirs (B2863-B2871). Pure: no Foundry.
 *
 *   deeds   flags["wodx-npc"].deeds [{id, community, delta, text, region, at}]: standing is worked out from them
 *           when asked, so a deed done in Brno counts in Prague only once the news has had time to get there
 *   rank    flags["wodx-npc"].rank {ladder, step, why}
 *   feuds   the world setting "feuds" [{id, a: {kind, key, name}, b: {...}, cause, since, heat, ended, how}]
 * The numbers are house rules; the ladders and feud laws are dated readings of history (B2866, B2869).
 */

/* ------------------------------------------------------------------ */
/*  Standing by community (s1)                                         */
/* ------------------------------------------------------------------ */

/** The communities a character can stand well or badly with, and what the books call that standing. */
export const COMMUNITIES = {
  kindred: {label: "The Kindred", book: "Status (V20)"},
  garou: {label: "The Garou", book: "Renown (W20)"},
  awakened: {label: "The Awakened", book: "name among the Traditions and Conventions (M20)"},
  fae: {label: "The fae courts", book: "standing at court (C20)"},
  dead: {label: "The Restless Dead", book: "standing in the Hierarchy and the Guilds (Wraith 20th)"},
  hunters: {label: "The hunters", book: "name among the cells"},
  town: {label: "The town", book: ""},
  faith: {label: "The faithful", book: ""},
  trade: {label: "The trades", book: ""},
  law: {label: "The law", book: ""},
  rulers: {label: "Those who rule", book: ""},
  underworld: {label: "The underworld", book: ""}
};
/** What a mortal community is called in a way of life and a year. */
export function communityLabel(key, {sphere = "latin", year = 1197} = {}) {
  const y = Number(year) || 0;
  if ( key === "faith" ) return ({latin: "The Church", orthodox: "The Church", islamic: "The mosque and the ulama", indic: "The temples and priests", sinic: "The temples and shrines",
    japanese: "The temples and shrines", theravada: "The monks", tibetan: "The monasteries"})[sphere] ?? "The keepers of the faith";
  if ( key === "trade" ) return y < 1800 ? "The guilds and merchants" : y < 1950 ? "Business and the unions" : "Business";
  if ( key === "law" ) return y < 1800 ? "The watch and the courts" : y < 2050 ? "The police and the courts" : "Security and the courts";
  if ( key === "rulers" ) return y < 1800 ? "The court and the nobles" : y < 1950 ? "The government and society" : "The government and the powerful";
  return COMMUNITIES[key]?.label ?? key;
}
export const STANDING_MIN = -5, STANDING_MAX = 5;
export const standingWord = v => (v >= 4 ? "Renowned" : v >= 2 ? "Well thought of" : v >= 1 ? "Known well" : v <= -4 ? "Shunned" : v <= -2 ? "In disgrace" : v <= -1 ? "Talked about" : "Unknown");
const clampS = v => Math.max(STANDING_MIN, Math.min(STANDING_MAX, Math.round(Number(v) || 0)));
export function normDeed(d = {}) {
  return {id: String(d.id ?? ""), community: COMMUNITIES[d.community] ? d.community : "town", delta: Math.max(-3, Math.min(3, Math.round(Number(d.delta) || 0))),
    text: String(d.text ?? "").slice(0, 200), region: String(d.region ?? ""), at: Number(d.at) || 0};
}
/**
 * How far news of a deed travels: a small deed (1) stays where it was done, a big one (2) reaches the same part of
 * the world, a great one (3) reaches every land the news can get to. House reading.
 */
export const reaches = (delta, sameRegion, sameMass) => sameRegion || (Math.abs(delta) >= 2 && sameMass) || Math.abs(delta) >= 3;
/**
 * Standing with a community in a region at a time. deeds: the character's; delay(fromRegion, toRegion): seconds the
 * news takes, or null when it cannot get there in the year; massOf(region): the part of the world.
 */
export function standingIn(deeds = [], community, region, now, {delay = () => 0, massOf = () => "old"} = {}) {
  let v = 0;
  const heard = [], coming = [];
  for ( const d of (deeds ?? []).map(normDeed) ) {
    if ( d.community !== community ) continue;
    const same = !d.region || !region || d.region === region;
    if ( !reaches(d.delta, same, massOf(d.region) === massOf(region)) ) continue;
    const s = same ? 0 : delay(d.region, region);
    if ( s === null || s === undefined ) continue;
    if ( d.at + s <= now ) { v += d.delta; heard.push(d); } else coming.push({...d, arrives: d.at + s});
  }
  return {value: clampS(v), word: standingWord(clampS(v)), heard, coming};
}

/* ------------------------------------------------------------------ */
/*  Social rank (s3)                                                   */
/* ------------------------------------------------------------------ */

/** Rank ladders, lowest first, by way of life and century. A reading of history, rounded. */
const LADDERS = {
  "latin-medieval": ["Serf", "Free peasant", "Townsfolk", "Burgher", "Clergy", "Knight", "Lord", "Prince"],
  "latin-early": ["Labourer", "Peasant", "Craftsman", "Merchant", "Clergy or scholar", "Gentry", "Noble", "Prince"],
  "latin-industrial": ["Poor", "Working class", "Lower middle class", "Middle class", "Professional", "Gentry", "Noble", "Royal"],
  "modern": ["Poor", "Working class", "Lower middle class", "Middle class", "Professional", "Wealthy", "Elite"],
  "future": ["Off the grid", "Precariat", "Wage worker", "Contractor", "Professional", "Corporate", "Elite"],
  "orthodox-old": ["Serf", "Peasant", "Townsfolk", "Merchant", "Clergy", "Servitor noble", "Boyar", "Ruling house"],
  "islamic-old": ["Slave", "Peasant", "Craftsman", "Merchant", "Ulama", "Notable", "Officer of the state", "Ruling house"],
  "indic-old": ["Bonded labourer", "Labourer", "Artisan", "Merchant", "Landholder", "Priestly family", "Ruling house"],
  "sinic-old": ["Bondservant", "Peasant", "Artisan", "Merchant", "Scholar", "Scholar-official", "Noble", "Imperial clan"],
  "japanese-old": ["Outcast", "Peasant", "Artisan", "Merchant", "Samurai", "Lord's house", "Court noble"],
  "custom": ["Captive or bondsman", "Commoner", "Craftsman or trader", "Elder's family", "Chief's kin", "Ruling house"]
};
export function ladderFor(sphere, year) {
  const y = Number(year) || 0;
  if ( y >= 2050 ) return "future";
  if ( sphere === "latin" ) return y < 1500 ? "latin-medieval" : y < 1800 ? "latin-early" : y < 1918 ? "latin-industrial" : "modern";
  if ( sphere === "orthodox" ) return y < 1861 ? "orthodox-old" : y < 1918 ? "latin-industrial" : "modern";
  if ( sphere === "islamic" ) return y < 1923 ? "islamic-old" : "modern";
  if ( sphere === "indic" ) return y < 1947 ? "indic-old" : "modern";
  if ( sphere === "sinic" ) return y < 1912 ? "sinic-old" : "modern";
  if ( sphere === "japanese" ) return y < 1871 ? "japanese-old" : "modern";
  return y < 1950 ? "custom" : "modern";
}
export const ladder = key => LADDERS[key] ?? LADDERS.custom;
export const LADDER_KEYS = Object.keys(LADDERS);
export function normRank(r = {}) {
  if ( !r || !LADDERS[r.ladder] ) return null;
  return {ladder: r.ladder, step: Math.max(0, Math.min(LADDERS[r.ladder].length - 1, Math.round(Number(r.step) || 0))), why: String(r.why ?? "").slice(0, 120)};
}
/** Carry a rank onto the ladder of another year (a jump in time): the same share of the way up. */
export function carryRank(r, toKey) {
  const n = normRank(r);
  if ( !n || !LADDERS[toKey] || n.ladder === toKey ) return n;
  const from = LADDERS[n.ladder].length - 1, to = LADDERS[toKey].length - 1;
  return {ladder: toKey, step: Math.round(n.step / Math.max(1, from) * to), why: n.why};
}
export const rankWord = r => { const n = normRank(r); return n ? ladder(n.ladder)[n.step] : ""; };
/**
 * How rank changes the way an NPC treats someone: a social roll's difficulty against an NPC two or more steps lower is
 * one easier (deference), two or more steps higher one harder (contempt). Ranks are compared by share of the ladder.
 */
export function rankShift(charRank, npcRank) {
  const a = normRank(charRank), b = normRank(npcRank);
  if ( !a || !b ) return 0;
  const share = r => r.step / Math.max(1, ladder(r.ladder).length - 1);
  const gap = Math.round((share(a) - share(b)) * 6);
  return gap >= 2 ? -1 : gap <= -2 ? 1 : 0;
}
/** Would the families object to the match? Before 1900 a gap of three steps or more, later only five or more. */
export function matchObjection(r1, r2, year) {
  const a = normRank(r1), b = normRank(r2);
  if ( !a || !b ) return "";
  const share = r => r.step / Math.max(1, ladder(r.ladder).length - 1);
  const gap = Math.abs(Math.round((share(a) - share(b)) * 6));
  return gap >= (Number(year) < 1900 ? 3 : 5) ? "The families object: the match is far beneath one of them." : "";
}
/** What raises or lowers rank, and by how much. House numbers. */
export const RANK_EVENTS = {
  title: {delta: 2, label: "Granted a title or office"}, marriageUp: {delta: 1, label: "Married above their station"},
  marriageDown: {delta: -1, label: "Married beneath their station"}, wealth: {delta: 1, label: "Grew rich"},
  ruin: {delta: -1, label: "Lost their fortune"}, deed: {delta: 1, label: "A great deed, rewarded"}, disgrace: {delta: -2, label: "Disgraced"}
};
export function moveRank(r, event) {
  const n = normRank(r);
  if ( !n ) return null;
  const d = RANK_EVENTS[event]?.delta ?? (Number(event) || 0);
  return {...n, step: Math.max(0, Math.min(ladder(n.ladder).length - 1, n.step + d)), why: RANK_EVENTS[event]?.label ?? n.why};
}

/* ------------------------------------------------------------------ */
/*  Feuds and vendettas (s4)                                           */
/* ------------------------------------------------------------------ */

export const FEUD_SIDES = {family: "A family", line: "A family line", clan: "A clan", tribe: "A tribe", house: "A house or kith", faction: "A faction"};
/**
 * Where and when private feud was lawful, and how it could be settled. Readings of history: the Holy Roman Empire's
 * Eternal Peace (1495) ended lawful feud there; blood money stays in Islamic law; Corsica's and Albania's vendettas.
 */
export const FEUD_LAW = {
  "moravia": [[-9999, "lawful"], [1495, "outlawed"]], "german-lands": [[-9999, "lawful"], [1495, "outlawed"]],
  "france": [[-9999, "lawful"], [1258, "outlawed"]], "british-isles": [[-9999, "lawful"], [1600, "outlawed"]],
  "italy": [[-9999, "lawful"], [1800, "custom"], [1900, "outlawed"]], "scandinavia": [[-9999, "lawful"], [1300, "outlawed"]],
  "carpathians-balkans": [[-9999, "lawful"], [1500, "custom"], [1990, "outlawed"]],
  "russia": [[-9999, "lawful"], [1500, "outlawed"]]
};
export function feudLaw(region, year, sphere = "latin") {
  const base = sphere === "islamic" || sphere === "sahel" || sphere === "swahili" || sphere === "malay" ? "bloodMoney" : ["latin", "orthodox"].includes(sphere) ? "outlawed" : "custom";
  const rows = FEUD_LAW[region];
  let out = rows ? rows[0][1] : base;
  for ( const [from, v] of rows ?? [] ) if ( Number(year) >= from ) out = v;
  if ( Number(year) >= 1950 && out !== "bloodMoney" ) out = "outlawed";
  return {key: out, text: ({lawful: "Private feud is lawful: a formal challenge, then open war between the houses.",
    outlawed: "Feud is against the law: killings are murder before the courts, so it is fought in secret.",
    custom: "The law forbids it, but custom keeps the vendetta: kin are bound to avenge kin.",
    bloodMoney: "Blood money settles a killing by law: the family of the dead may take payment instead of a life."})[out]};
}
/** The ways to settle a feud, by what the law and the age allow. */
export function settlements(law, year) {
  const out = [{key: "payment", label: law.key === "bloodMoney" ? "Blood money" : "A payment for the dead"}, {key: "marriage", label: "A marriage between the houses"}];
  if ( Number(year) < 1900 || law.key !== "outlawed" ) out.push({key: "duel", label: "A duel between champions"});
  out.push({key: "truce", label: "A sworn truce"});
  return out;
}
export function normFeud(f = {}) {
  const side = s => (s && FEUD_SIDES[s.kind] && (s.key || s.name) ? {kind: s.kind, key: String(s.key ?? s.name).toLowerCase(), name: String(s.name ?? s.key)} : null);
  const a = side(f.a), b = side(f.b);
  if ( !a || !b || !f.id ) return null;
  return {id: String(f.id), a, b, cause: String(f.cause ?? "").slice(0, 200), since: Number(f.since) || 0, heat: Math.max(1, Math.min(3, Math.round(Number(f.heat) || 2))),
    ended: f.ended ? Number(f.ended) : null, how: String(f.how ?? ""), deaths: Math.max(0, Number(f.deaths) || 0)};
}
/** Does this person belong to the side? info: {family, lines: [ids], clan, tribe, house, factions: [names]}. Heirs belong by name or line. */
export function onSide(side, info = {}) {
  const k = String(side.key).toLowerCase(), low = v => String(v ?? "").toLowerCase();
  if ( side.kind === "family" ) return low(info.family) === k;
  if ( side.kind === "line" ) return (info.lines ?? []).map(low).includes(k);
  if ( side.kind === "clan" ) return low(info.clan).includes(k);
  if ( side.kind === "tribe" ) return low(info.tribe).includes(k);
  if ( side.kind === "house" ) return low(info.house).includes(k);
  if ( side.kind === "faction" ) return (info.factions ?? []).map(low).includes(k);
  return false;
}
/** The sides a person takes in the live feuds, as rivalry sides ("feud:<id>a"), and the rows that make them rivals. */
export function feudSides(feuds = [], info = {}) {
  const out = [];
  for ( const f of (feuds ?? []).map(normFeud).filter(f => f && !f.ended) ) {
    if ( onSide(f.a, info) ) out.push(`feud:${f.id}a`);
    if ( onSide(f.b, info) ) out.push(`feud:${f.id}b`);
  }
  return out;
}
export const feudRows = (feuds = []) => (feuds ?? []).map(normFeud).filter(f => f && !f.ended).map(f => ({
  id: `feud-${f.id}`, a: `feud:${f.id}a`, b: `feud:${f.id}b`, from: null, to: null, ab: -f.heat, ba: -f.heat,
  note: `The feud of ${f.a.name} and ${f.b.name}${f.cause ? `: ${f.cause}` : ""}`, book: "House: a feud (WoDX NPC)"}));
/** A killing in the feud: the heat rises (most 3) and the count of the dead goes up. */
export const feudKilling = f => { const n = normFeud(f); return n ? {...n, heat: Math.min(3, n.heat + 1), deaths: n.deaths + 1} : null; };
