/**
 * WoDX NPC 0.60.0: past lives, lines of teaching, the web of every tie, scene ideas from ties and who sees what
 * (B2835-B2839). Pure: no Foundry.
 *
 *   pastLives  flags["wodx-npc"].pastLives [{id, name, year, region, ties: [{id, name, kind, note}], recalled: {<actor id>: at}}]
 *   taught     flags["wodx-npc"].taught {<student id>: [{what, dots, from, to, owed}]} on the teacher
 * The rolls and numbers are house rules (B2836, B2838).
 */

/* ------------------------------------------------------------------ */
/*  Past lives and returning souls (c4)                                */
/* ------------------------------------------------------------------ */

/** The Backgrounds that open a past self, by line. */
export const PAST_BACKGROUNDS = [
  {line: "mage", name: "Avatar", note: "An Awakened Avatar has lived before (M20); the dots set how much it can bring back."},
  {line: "mage", name: "Past Lives", note: "Memories of earlier incarnations, where the chronicle uses this Background."},
  {line: "changeling", name: "Remembrance", note: "The fae soul's memories of earlier lives (C20)."},
  {line: "wraith", name: "Memoriam", note: "The dead remember their lives in the Skinlands (Wraith 20th)."}
];
export const backgroundFor = (line, names = []) => PAST_BACKGROUNDS.find(b => (b.line === line || !line) && names.some(n => String(n).toLowerCase() === b.name.toLowerCase())) ?? null;
/** The roll to recall a tie from a past life: the Background's dots as the pool, difficulty 8 less one per two dots (house). */
export const recallRoll = dots => ({pool: Math.max(0, Number(dots) || 0), difficulty: Math.max(5, 8 - Math.floor((Number(dots) || 0) / 2))});
/** Ties from a past self that still reach someone: the person themselves (the undying), or a family line that came after them. */
export function pastLifeEdges(actors = [], {lines = []} = {}) {
  const ids = new Set((actors ?? []).map(a => a?.id).filter(Boolean));
  const out = [];
  for ( const a of actors ?? [] ) for ( const p of a?.flags?.["wodx-npc"]?.pastLives ?? [] ) for ( const t of p.ties ?? [] ) {
    const found = Object.keys(p.recalled ?? {});
    let to = t.id && ids.has(t.id) ? {id: t.id, name: t.name ?? ""} : null;
    let note = `${p.name || "A past self"}, ${p.year ?? "long ago"}: ${t.kind ?? "tie"}${t.note ? `, ${t.note}` : ""}`;
    if ( !to && t.line ) {
      const l = (lines ?? []).find(x => x.id === t.line);
      const heir = l?.members?.find(m => !m.founder && m.actorId && ids.has(m.actorId) && !m.died);
      if ( heir ) { to = {id: heir.actorId, name: heir.name ?? ""}; note += "; a descendant"; }
    }
    if ( to ) out.push({from: a.id, to, kind: "pastLife", note, hidden: true, foundBy: found});
  }
  return out;
}
export function normPastLife(p = {}) {
  return {id: String(p.id ?? ""), name: String(p.name ?? "").slice(0, 80), year: Number.isFinite(Number(p.year)) ? Number(p.year) : null, region: String(p.region ?? ""),
    ties: (p.ties ?? []).filter(t => t && (t.id || t.name || t.line)).slice(0, 20).map(t => ({id: t.id ? String(t.id) : null, name: String(t.name ?? ""), line: t.line ? String(t.line) : null, kind: String(t.kind ?? "tie").slice(0, 40), note: String(t.note ?? "").slice(0, 120)})),
    recalled: {...(p.recalled ?? {})}};
}

/** The tie a past life makes, hidden until it is recalled. */
export const PAST_KINDS = {pastLife: {label: "Known in a past life", back: "pastLifeOf", group: "other"}, pastLifeOf: {label: "Knew them in a past life", back: "pastLife", group: "other"}};

/* ------------------------------------------------------------------ */
/*  Teachers and their lines of students (c5)                          */
/* ------------------------------------------------------------------ */

/** What can be taught, by line: the books' names. */
export const TEACHABLE = {vampire: "Disciplines", werewolf: "Gifts", mage: "Spheres and rotes", changeling: "Arts and Realms", wraith: "Arcanoi",
  hunter: "Edges and lore", mummy: "Hekau", demon: "Lores", kueijin: "Disciplines", mortal: "Abilities and Numina"};
/** How teaching is done in each age. */
export const TEACHING_BY_ERA = [
  {from: -9999, text: "A master and an apprentice under one roof, for years."},
  {from: 1200, text: "Guild apprenticeship of about seven years, or a university for clerks."},
  {from: 1800, text: "Apprenticeships, schools and universities."},
  {from: 1870, text: "Schools for every child, then trade schools and universities."},
  {from: 2000, text: "Schools, universities and teachers on the net."},
  {from: 2050, text: "Teaching through the net, with a living teacher for what the net cannot hold."}
];
export const teachingFor = year => { let o = TEACHING_BY_ERA[0]; for ( const t of TEACHING_BY_ERA ) if ( Number(year) >= t.from ) o = t; return o; };
export function normTaught(map = {}) {
  const out = {};
  for ( const [k, list] of Object.entries(map ?? {}) ) if ( k && Array.isArray(list) ) out[k] = list.slice(-20).map(x => ({what: String(x.what ?? "").slice(0, 80), dots: Math.max(0, Number(x.dots) || 0),
    from: Number(x.from) || 0, to: Number(x.to) || 0, owed: String(x.owed ?? "").slice(0, 120)}));
  return out;
}
/**
 * A line of teaching from edges: up through mentors to the first teacher, down through students. Returns
 * {up: [{id, name, depth}], down: [{id, name, depth, via}]}. Cycles are cut.
 */
export function teachingLine(edges = [], id, {most = 30} = {}) {
  const mentorsOf = x => edges.filter(e => e.from === x && e.kind === "mentor" && e.to?.id).map(e => e.to);
  const studentsOf = x => edges.filter(e => e.from === x && e.kind === "apprentice" && e.to?.id).map(e => e.to);
  let seen = new Set([id]);
  const up = [], down = [];
  let front = [id], depth = 0;
  while ( front.length && up.length < most ) {
    depth += 1;
    const next = [];
    for ( const f of front ) for ( const m of mentorsOf(f) ) if ( !seen.has(m.id) ) { seen.add(m.id); up.push({id: m.id, name: m.name, depth}); next.push(m.id); }
    front = next;
  }
  front = [id]; depth = 0; seen = new Set([id]);
  while ( front.length && down.length < most ) {
    depth += 1;
    const next = [];
    for ( const f of front ) for ( const s of studentsOf(f) ) if ( !seen.has(s.id) ) { seen.add(s.id); down.push({id: s.id, name: s.name, depth, via: f}); next.push(s.id); }
    front = next;
  }
  return {up, down};
}

/* ------------------------------------------------------------------ */
/*  The web of every tie (t1)                                          */
/* ------------------------------------------------------------------ */

/** Was this person alive (or unliving) in the year? born/died: years or null. */
export const aliveIn = (p, year) => year === null || year === undefined || year === "" || !Number.isFinite(Number(year)) || ((p.born === null || p.born === undefined || Number(year) >= p.born) && (p.died === null || p.died === undefined || Number(year) <= p.died));
/**
 * The web for a filter: {groups: [group keys] or null for all, only: actor id to centre on (its ties and theirs),
 * year, people: {id: {name, born, died, region}}, region}. Returns {nodes: [{id, name}], links: [{a, b, kind, group}]}.
 */
export function webOf(edges = [], {groups = null, only = null, year = null, people = {}, region = null, groupOf = () => "other"} = {}) {
  const ok = id => { const p = people[id]; return p && aliveIn(p, year) && (!region || !p.region || p.region === region); };
  let list = edges.filter(e => e.to?.id && ok(e.from) && ok(e.to.id) && (!groups || groups.includes(groupOf(e.kind))));
  if ( only ) { const near = new Set([only, ...list.filter(e => e.from === only).map(e => e.to.id)]); list = list.filter(e => near.has(e.from) && near.has(e.to.id)); }
  const seen = new Set(), links = [];
  for ( const e of list ) {
    const key = [e.from, e.to.id].sort().join("|") + "|" + groupOf(e.kind);
    if ( seen.has(key) ) continue;
    seen.add(key);
    links.push({a: e.from, b: e.to.id, kind: e.kind, group: groupOf(e.kind)});
  }
  const ids = [...new Set(links.flatMap(l => [l.a, l.b]))];
  return {nodes: ids.map(id => ({id, name: people[id]?.name ?? id})).sort((x, y) => x.name.localeCompare(y.name)), links};
}
/** Places for the nodes on a circle (the web window draws them). */
export function circleLayout(nodes = [], {size = 520, pad = 60} = {}) {
  const r = size / 2 - pad, c = size / 2, n = Math.max(1, nodes.length);
  return Object.fromEntries(nodes.map((nd, i) => [nd.id, {x: Math.round(c + r * Math.cos(2 * Math.PI * i / n - Math.PI / 2)), y: Math.round(c + r * Math.sin(2 * Math.PI * i / n - Math.PI / 2))}]));
}

/* ------------------------------------------------------------------ */
/*  Scene ideas from ties (t2)                                         */
/* ------------------------------------------------------------------ */

const WEEK = 7 * 86400;
/**
 * Scene ideas for the week ahead. Each source is plain data the Foundry side gathers:
 *   due: Ledger entries open and due within the week; held: hostages {victim, captor}; feuds: live, at heat 3;
 *   objections: matches the families object to; descendants: living members of a line near the founder's land;
 *   hurt: close ties hurt this week. Returns [{key, text}] (at most 12).
 */
export function sceneIdeas({now = 0, due = [], held = [], feuds = [], objections = [], descendants = [], hurt = []} = {}) {
  const out = [];
  for ( const e of due ) if ( e.due !== null && e.due <= now + WEEK ) out.push({key: `due:${e.id}`, text: e.kind === "boon" ? `${e.to?.name ?? "Someone"} calls in the boon ${e.from?.name ?? "a debtor"} owes: ${e.what}.` : `Due soon: ${e.from?.name ?? "someone"} owes ${e.to?.name ?? "someone"} ${e.what}.`});
  for ( const h of held ) out.push({key: `held:${h.victim.id}`, text: `${h.captor.name} sends word about ${h.victim.name}: proof they are alive, and the price.`});
  for ( const f of feuds ) out.push({key: `feud:${f.id}`, text: `The feud of ${f.a.name} and ${f.b.name} boils over: a killing, or a challenge at a public place.`});
  for ( const o of objections ) out.push({key: `obj:${o.a.id}:${o.b.id}`, text: `${o.a.name}'s family objects to ${o.b.name}: a visit, a warning, or a better match offered.`});
  for ( const d of descendants ) out.push({key: `desc:${d.member}`, text: `${d.name}, ${d.relation} of ${d.founder}, comes asking questions about the family's past.`});
  for ( const h of hurt ) out.push({key: `hurt:${h.id}`, text: `${h.name} is still hurt: ${h.by} must choose between them and the night's business.`});
  return out.slice(0, 12);
}
