/**
 * WoDX NPC 0.55.0: family lines that outlive the character, and what a jump in time does to everyone's ties
 * (B2770-B2772). Pure: no Foundry, so the harness can test it.
 *
 * A family line is a mortal family that carries on while the clock passes. It starts from a character's mortal kin
 * (the Relationships tab's parent, child, sibling, spouse and kin ties) or from the character alone, and the
 * Storyteller grows it when years pass. People in it marry, have children and die by the life tables of their
 * century and way of life; most of them never get a sheet. Any living member can be brought into play as an NPC.
 *
 * Every figure here is a house reading of history, rounded for play (B2771). The books give no such table.
 */

/** Ages of life by period: marrying age, children born to a couple, the share who live to grow up, adult death age. */
export const LIFE = [
  {from: -9999, key: "medieval", marry: [16, 24], children: 5, survive: 0.5, dies: [32, 72]},
  {from: 1500, key: "early-modern", marry: [18, 27], children: 5, survive: 0.55, dies: [34, 76]},
  {from: 1800, key: "industrial", marry: [20, 28], children: 5, survive: 0.65, dies: [38, 80]},
  {from: 1900, key: "c20", marry: [21, 29], children: 3, survive: 0.9, dies: [52, 88]},
  {from: 1960, key: "late-c20", marry: [23, 31], children: 2, survive: 0.97, dies: [60, 92]},
  {from: 2000, key: "modern", marry: [26, 34], children: 2, survive: 0.99, dies: [66, 95]},
  {from: 2050, key: "future", marry: [28, 38], children: 1, survive: 0.99, dies: [70, 105]}
];
/**
 * Ways of life that differ from the table: a later start for long lives or small families. sphere: Chronicle's
 * world-rules sphere. shift moves the row's start year (a later modern age). House reading.
 */
export const SPHERE_SHIFT = {
  latin: 0, orthodox: 20, islamic: 30, indic: 40, sinic: 30, japanese: 0, theravada: 40, tibetan: 60, malay: 40,
  sahel: 60, swahili: 60, bantu: 60, mesoamerican: 40, andean: 40, polynesian: 40, northern: 30
};
/** Years of great dying: a share of the living die on top of the usual (house reading of history). */
export const DYING = [
  {from: 1347, to: 1351, spheres: ["latin", "orthodox", "islamic"], extra: 0.3, what: "the Black Death"},
  {from: 1618, to: 1648, regions: ["moravia", "german-lands"], extra: 0.15, what: "the Thirty Years' War"},
  {from: 1520, to: 1580, spheres: ["mesoamerican", "andean"], extra: 0.4, what: "the great sickness after the conquest"},
  {from: 1914, to: 1918, spheres: ["latin", "orthodox"], extra: 0.04, what: "the Great War"},
  {from: 1918, to: 1920, extra: 0.03, what: "the influenza"},
  {from: 1939, to: 1945, spheres: ["latin", "orthodox", "sinic", "japanese"], extra: 0.06, what: "the Second World War"}
];
/** How many living members a line keeps track of; past it, the eldest branches carry on and the rest are left out. */
export const KEEP_LIVING = 14;

export const lifeFor = (year, sphere = "latin") => {
  const y = Number(year) - (SPHERE_SHIFT[sphere] ?? 0);
  let out = LIFE[0];
  for ( const r of LIFE ) if ( y >= r.from ) out = r;
  return out;
};
const between = (rand, [a, b]) => a + Math.floor(rand() * (b - a + 1));

/** A small seeded stream (mulberry32), so a line grows the same way for the same seed. */
export function seeded(seed) {
  let h = 1779033703 ^ String(seed).length;
  for ( const c of String(seed) ) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const alive = (m, year) => !m.lost && m.born <= year && (m.died === null || m.died === undefined || m.died > year);

/**
 * A new line. founder {id, name}: the character it hangs from. family: the family name. members: kin already known,
 * [{name, sex, born, died, relation ("parent", "sibling", "child", "spouse", "kin"), actorId}].
 */
export function newLine({id, founder, family = "", region = "moravia", year, founderBorn = null, members = [], seed = null}) {
  const out = {id, founder: {id: founder?.id ?? null, name: founder?.name ?? ""}, family: String(family ?? ""), region, foundedYear: Number(year),
    year: Number(year), seed: seed ?? id, members: [], log: []};
  const fb = Number.isFinite(Number(founderBorn)) && founderBorn !== null ? Number(founderBorn) : Number(year) - 25;
  out.members.push({id: "m0", name: founder?.name ?? "", sex: null, born: fb, died: null, parent: null, gen: 0, actorId: founder?.id ?? null, founder: true, spouse: null});
  let n = 1;
  for ( const k of members ) {
    const gen = k.relation === "parent" ? -1 : k.relation === "child" ? 1 : 0;
    const born = Number.isFinite(Number(k.born)) && k.born !== null ? Number(k.born) : gen === -1 ? fb - 25 : gen === 1 ? fb + 25 : fb;
    out.members.push({id: `m${n++}`, name: String(k.name ?? ""), sex: k.sex ?? null, born, died: k.died ?? null, parent: gen === 1 ? "m0" : null,
      gen, actorId: k.actorId ?? null, relation: k.relation ?? "kin", spouse: null, direct: gen === 1});
  }
  // Few people have no kin at all: with fewer than two known, the line starts with unnamed brothers and sisters
  // the Storyteller can name later (house rule, B2771)
  for ( let i = out.members.filter(m => !m.founder && m.gen >= 0).length; i < 2; i++ ) {
    out.members.push({id: `m${n++}`, name: "", sex: i % 2 ? "male" : "female", born: fb + (i ? 3 : -2), died: null, parent: null, gen: 0, actorId: null, relation: "sibling", spouse: null, direct: false});
  }
  return out;
}

/** The living members of a line in a year, nearest generation first. */
export function livingAt(line, year) {
  return (line?.members ?? []).filter(m => !m.founder && alive(m, Number(year))).sort((a, b) => a.gen - b.gen || a.born - b.born);
}
/** Members who descend from one member (by parent links), with how many steps down. */
export function descendantsOf(line, memberId = "m0") {
  const kids = new Map();
  for ( const m of line?.members ?? [] ) if ( m.parent ) { if ( !kids.has(m.parent) ) kids.set(m.parent, []); kids.get(m.parent).push(m); }
  const out = [], walk = (id, d) => { for ( const k of kids.get(id) ?? [] ) { out.push({...k, steps: d}); walk(k.id, d + 1); } };
  walk(memberId, 1);
  return out;
}

/** How one member is related to the founder, in words. */
export function relationWord(m) {
  if ( !m ) return "";
  if ( m.founder ) return "the founder";
  if ( m.relation && m.gen <= 0 && !m.parent ) return {parent: "parent", sibling: "sibling", spouse: "spouse", kin: "kin"}[m.relation] ?? "kin";
  const g = m.gen;
  if ( g <= 0 ) return "kin";
  if ( g === 1 ) return m.direct ? "child" : "niece or nephew";
  const base = m.direct ? "grandchild" : "niece or nephew";
  if ( g === 2 ) return m.direct ? base : "great-niece or nephew";
  const greats = g - 2 + (m.direct ? 0 : 1);
  return greats >= 4 ? `${greats} times great-${base}` : `${"great-".repeat(greats)}${base}`;
}

/**
 * What a member knows of the founder, by generations between them and the age they live in. undying: the founder
 * does not age (a vampire, ghoul, mummy and so on), so the family may keep a story of someone who never grew old.
 */
export function storyOf(m, line, {year, undying = false} = {}) {
  if ( !m || m.founder ) return "";
  const who = line?.founder?.name || "the founder";
  const d = Math.abs(m.gen);
  const keep = Number(year) >= 1900 ? "photographs" : Number(year) >= 1600 ? "a painted likeness or a family Bible" : "a name said in the family's prayers";
  if ( d <= 1 ) return `Knew ${who} in life and remembers them well.`;
  if ( d <= 3 ) return undying ? `Grew up on stories of ${who}, and that ${who} never seemed to age.` : `Grew up on family stories of ${who}.`;
  if ( d <= 6 ) return undying ? `Knows ${who} only from ${keep}, and a whispered tale that they are still alive.` : `Knows ${who} only from ${keep}.`;
  return undying ? `Has heard a half-believed legend of an ancestor who never died.` : `Knows nothing of ${who}.`;
}

/**
 * Grow a line to `toYear`. rand: a seeded stream (seeded(line.seed + toYear)). nameFor({sex, year}) gives a given name
 * (the Foundry side uses the people generator); without it, members are left for the Storyteller to name. dying(year):
 * the extra share who die that year (dyingFor). Returns {line, events: [{year, kind, who, detail}]}; the line given is
 * not changed.
 */
export function grow(line, toYear, {rand = seeded(`${line?.seed}:${toYear}`), sphere = "latin", nameFor = null, dying = () => 0} = {}) {
  const L = structuredClone(line);
  const events = [];
  const end = Number(toYear);
  let next = L.members.reduce((n, m) => Math.max(n, Number(String(m.id).slice(1)) || 0), 0) + 1;
  for ( let y = L.year + 1; y <= end; y++ ) {
    const life = lifeFor(y, sphere);
    const extra = Number(dying(y)) || 0;
    // Deaths: an adult dies once past the period's first age of death, more surely as they age
    for ( const m of L.members ) {
      if ( m.founder || m.actorId || !alive(m, y) ) continue;
      const age = y - m.born;
      if ( m.deathAge === undefined ) m.deathAge = between(rand, life.dies);
      if ( age >= m.deathAge || (extra && rand() < extra) ) {
        m.died = y; delete m.deathAge;
        events.push({year: y, kind: "death", who: m.id, detail: `${m.name || "A member"} died${extra && age < 50 ? " in a year of great dying" : ""}, aged ${age}`});
      }
    }
    // Marriages and births: each living member of the line in their marrying years, children every few years
    const liv = L.members.filter(m => !m.founder && alive(m, y) && (m.gen ?? 0) >= 0 && m.relation !== "spouse");
    for ( const m of liv ) {
      const age = y - m.born;
      // Someone already past marrying age when the line starts may well be married already
      const late = !m.spouse && !m.late && age > life.marry[1] && age <= 42;
      if ( late ) m.late = true;
      if ( !m.spouse && ((age >= life.marry[0] && age <= life.marry[1] && rand() < 0.35) || (late && rand() < 0.7)) ) {
        m.spouse = "married"; m.married = y;
        events.push({year: y, kind: "marriage", who: m.id, detail: `${m.name || "A member"} married at ${age}`});
      }
      if ( m.spouse && age <= 42 && (m.kids ?? 0) < life.children && rand() < 0.35 ) {
        m.kids = (m.kids ?? 0) + 1;
        if ( rand() > life.survive ) continue; // born, but did not live to be counted
        const sex = rand() < 0.5 ? "female" : "male";
        const kid = {id: `m${next++}`, name: nameFor?.({sex, year: y, parent: m}) ?? "", sex, born: y, died: null, parent: m.id, gen: (m.gen ?? 0) + 1, actorId: null, spouse: null, direct: !!m.direct};
        if ( L.family && kid.name && !kid.name.includes(" ") ) kid.name = `${kid.name} ${L.family}`;
        L.members.push(kid);
        events.push({year: y, kind: "birth", who: kid.id, detail: `${kid.name || "A child"} born to ${m.name || "a member"}`});
      }
    }
    // Too many living: keep the eldest branches
    const now = L.members.filter(m => !m.founder && alive(m, y));
    if ( now.length > KEEP_LIVING ) {
      const byId = new Map(L.members.map(m => [m.id, m]));
      const rootOf = m => { let c = m, guard = 0; while ( c?.parent && byId.get(c.parent) && !byId.get(c.parent).founder && guard++ < 60 ) c = byId.get(c.parent); return Number(String(c?.id).slice(1)) || 0; };
      // The founder's own descendants first, then the oldest branches; the rest go out of sight (lost), not dead
      now.sort((a, b) => Number(!!b.direct) - Number(!!a.direct) || rootOf(a) - rootOf(b) || a.born - b.born);
      for ( const m of now.slice(KEEP_LIVING) ) if ( !m.actorId ) { m.lost = y; }
    }
  }
  // A family seldom ends outright: if no one is left in sight, a branch that went out of sight carries on
  if ( !L.members.some(m => !m.founder && alive(m, end)) ) {
    const back = L.members.filter(m => m.lost && m.died == null && end - m.born < 70).sort((a, b) => b.born - a.born)[0];
    if ( back ) { delete back.lost; events.push({year: end, kind: "found", who: back.id, detail: "A branch of the family that had moved away is found again"}); }
  }
  L.year = Math.max(L.year, end);
  // What is kept: the living, everyone they descend from, sheets, and the dead of the last hundred years
  const byIdEnd = new Map(L.members.map(m => [m.id, m])), keep = new Set();
  for ( const m of L.members ) if ( alive(m, end) || m.founder || m.actorId ) { let c = m, guard = 0; while ( c && !keep.has(c.id) && guard++ < 80 ) { keep.add(c.id); c = byIdEnd.get(c.parent); } }
  L.members = L.members.filter(m => keep.has(m.id) || (!m.lost && m.died != null && m.died >= end - 100 && m.name));
  return {line: L, events};
}

/** The extra share who die in a year in a region. */
export function dyingFor(year, {region = "", sphere = "latin"} = {}) {
  let x = 0;
  for ( const d of DYING ) {
    if ( year < d.from || year > d.to ) continue;
    if ( d.regions && !d.regions.includes(region) ) continue;
    if ( d.spheres && !d.spheres.includes(sphere) ) continue;
    // Spread over the years it lasted
    x += d.extra / (d.to - d.from + 1);
  }
  return x;
}

/** A short line about a grown family: births, deaths, how many live, and the nearest living. */
export function lineSummary(line, events, year) {
  const b = events.filter(e => e.kind === "birth").length, d = events.filter(e => e.kind === "death").length;
  const liv = livingAt(line, year);
  const near = liv.find(m => m.gen > 0) ?? liv[0];
  return `${line.family ? `The ${line.family} family` : "The family"}: ${b} born, ${d} died; ${liv.length} living${near ? `, the nearest ${relationWord(near)} ${near.name || "(unnamed)"}, ${year - near.born}` : ""}.`;
}

/* ------------------------------------------------------------------ */
/*  Ties after a jump in time (c3)                                     */
/* ------------------------------------------------------------------ */

const MORTALISH = new Set(["Mortal", "Kinfolk", "Hunter", "Imbued"]);
/**
 * What a jump from fromYear to toYear did to everyone's ties: a report the Storyteller approves before anything is
 * written. people: [{id, name, type, pc, died (year or null), born (year or null), undying}]. edges: ties-rules
 * edges(). due: Ledger entries that came due in the gap. grown: [{line, summary}]. Returns
 * {rows: [{actorId, name, lines: [text]}], years}.
 */
export function agedTies({fromYear, toYear, people = [], edges = [], due = [], grown = []} = {}) {
  const years = Number(toYear) - Number(fromYear);
  const byId = new Map(people.map(p => [p.id, p]));
  const rows = new Map();
  const say = (id, text) => { const p = byId.get(id); if ( !p ) return; if ( !rows.has(id) ) rows.set(id, {actorId: id, name: p.name, pc: !!p.pc, lines: []}); const r = rows.get(id); if ( !r.lines.includes(text) ) r.lines.push(text); };
  for ( const e of edges ) {
    const me = byId.get(e.from), other = e.to?.id ? byId.get(e.to.id) : null;
    if ( !me || !other || !me.pc ) continue;
    if ( other.died !== null && other.died !== undefined && other.died > fromYear && other.died <= toYear ) say(me.id, `${other.name} (${e.kind}) died in ${other.died}.`);
    else if ( (other.died === null || other.died === undefined) && !other.undying && MORTALISH.has(other.type) && other.born !== null && other.born !== undefined ) {
      const age = toYear - other.born;
      if ( age >= 75 ) say(me.id, `${other.name} (${e.kind}) would be ${age} by ${toYear}: dead, or near it, unless Pass the years says otherwise.`);
      else if ( years >= 10 ) say(me.id, `${other.name} (${e.kind}) is now ${age}.`);
    }
    if ( ["bondTo", "thrall"].includes(e.kind) && years >= 1 ) say(me.id, `The blood bond with ${other.name} fades without a drink (Pass the years lists the steps).`);
  }
  for ( const d of due ) {
    for ( const side of [d.from, d.to] ) if ( side?.id && byId.get(side.id)?.pc ) say(side.id, `"${d.what || d.kind}" came due in the gap.`);
  }
  for ( const g of grown ) if ( g.line?.founder?.id ) say(g.line.founder.id, g.summary);
  return {years, rows: [...rows.values()].sort((a, b) => Number(b.pc) - Number(a.pc) || a.name.localeCompare(b.name))};
}
