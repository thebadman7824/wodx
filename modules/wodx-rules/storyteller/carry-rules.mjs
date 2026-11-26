/**
 * Carry to a new chronicle (Chronicle Packs Desk c2; Ben's picks, 18 Nov 2026). Pure, so the harness can test it.
 *
 * When a chronicle ends, the group may start again in a fresh world made from the WoDX template, with the chronicle's
 * module off. Nothing of the old chronicle comes along unless it is carried on purpose: the characters, chosen people
 * and items the Storyteller ticks. Each one crosses with its sheet whole, less what only made sense in the old world,
 * and with a note of where it came from on the sheet itself.
 *
 * The carry file: {version, kind: "wodx-carry", from: {world, chronicle, title, date, book, ending, made},
 *   docs: {Actor: [...], Item: [...]}, dropped: [{name, what: [...]}]}
 *
 * What stays behind, and is listed so the Storyteller can set it up again by hand when it matters:
 *   the chronicle mark (flags.wodx.chronicle), the builder's mark, an opening goal (it belonged to a story chain),
 *   who owned it (player accounts differ from world to world; the import gives it back to the same player names),
 *   its folder, and ties to the old world's factions (they live in that world's faction list, not on the sheet).
 */
export const VERSION = 1;
export const KIND = "wodx-carry";
export const KINDS = ["Actor", "Item"];

const clone = x => structuredClone(x ?? {});
const unset = (o, path) => {
  const keys = path.split(".");
  let p = o;
  for ( const k of keys.slice(0, -1) ) { if ( !p || typeof p !== "object" ) return false; p = p[k]; }
  if ( p && typeof p === "object" && keys.at(-1) in p ) { delete p[keys.at(-1)]; return true; }
  return false;
};

/** The ties dropped from every carried document: [path, what it was, in plain words]. */
export const TIES = [
  ["flags.wodx.chronicle", "its chronicle mark"],
  ["flags.wodx-storyteller.built", "the builder's mark"],
  ["flags.wodx-chronicle.goal", "its opening goal (a story chain of the old chronicle)"]
];

/** The line written at the top of a carried character's notes. */
export function historyLine(from = {}) {
  const parts = [`Carried across from ${from.title || "an earlier chronicle"}`];
  if ( from.book ) parts.push(`after ${from.book}`);
  if ( from.ending ) parts.push(`(${from.ending})`);
  if ( from.date ) parts.push(`on ${from.date}`);
  return `${parts.join(" ")}.`;
}

/**
 * One document made ready to cross. doc is its toObject(); ties = extra ties the caller found (faction names).
 * Returns {doc, dropped: [what...]}.
 */
export function cleanDoc(doc, from = {}, {kind = "Actor", ties = []} = {}) {
  const d = clone(doc), dropped = [];
  for ( const [path, what] of TIES ) if ( unset(d, path) ) dropped.push(what);
  for ( const it of d.items ?? [] ) for ( const [path] of TIES ) unset(it, path);
  const owners = Object.entries(d.ownership ?? {}).filter(([id, lvl]) => id !== "default" && lvl >= 3).map(([id]) => id);
  if ( owners.length ) dropped.push("who owned it (given back by player name on import)");
  d.ownership = {default: d.ownership?.default ?? 0};
  if ( d.folder ) dropped.push("its folder");
  for ( const k of ["folder", "sort", "_stats"] ) delete d[k];
  for ( const t of ties ) dropped.push(t);
  const sourceId = d._id ?? "";
  delete d._id;
  d.flags ??= {};
  d.flags["wodx-storyteller"] = {...(d.flags["wodx-storyteller"] ?? {}),
    carried: {from: from.title ?? "", chronicle: from.chronicle ?? "", world: from.world ?? "", date: from.date ?? "", book: from.book ?? "",
      ending: from.ending ?? "", sourceId, kind}};
  // The note on the sheet: a character's notes field, an item's description
  const line = historyLine(from);
  if ( kind === "Actor" && d.system && typeof (d.system.notes ?? "") === "string" ) d.system.notes = `<p>${line}</p>${d.system.notes ?? ""}`;
  if ( kind === "Item" && d.system && typeof (d.system.description ?? "") === "string" ) d.system.description = `<p>${line}</p>${d.system.description ?? ""}`;
  return {doc: d, dropped};
}

/**
 * The carry file for the picked documents.
 * picks: {Actor: [{doc, owners: [player names], ties: [...]}], Item: [{doc}]}
 */
export function bundle(picks = {}, from = {}, {made = Date.now()} = {}) {
  const out = {version: VERSION, kind: KIND, from: {...from, made}, docs: {Actor: [], Item: []}, dropped: []};
  for ( const kind of KINDS ) for ( const p of picks[kind] ?? [] ) {
    const r = cleanDoc(p.doc, from, {kind, ties: p.ties ?? []});
    if ( p.owners?.length ) r.doc.flags["wodx-storyteller"].carried.owners = [...p.owners];
    out.docs[kind].push(r.doc);
    if ( r.dropped.length ) out.dropped.push({name: r.doc.name ?? "?", what: r.dropped});
  }
  return out;
}

/** Problems with a carry file in plain words; empty means it can be read in. */
export function check(file) {
  const out = [];
  if ( !file || typeof file !== "object" ) return ["The file holds no carry data."];
  if ( file.kind !== KIND ) out.push("This is not a WoDX carry file.");
  if ( !(Number(file.version) >= 1) ) out.push("The carry file has no version.");
  else if ( file.version > VERSION ) out.push("The carry file was written by a newer WoDX. Update the modules first.");
  for ( const kind of KINDS ) if ( file.docs?.[kind] && !Array.isArray(file.docs[kind]) ) out.push(`The carry file's ${kind} list is broken.`);
  if ( !KINDS.some(k => (file.docs?.[k] ?? []).length) ) out.push("The carry file holds nothing to bring across.");
  return out;
}

/**
 * What the import makes: each document not already brought across from the same file (found again by its
 * carried.sourceId and world), with ownership given back to players of the same name.
 * have = [{sourceId, world}] already in this world; players = [{id, name}].
 */
export function importPlan(file, {have = [], players = []} = {}) {
  const seen = new Set(have.map(h => `${h.world}:${h.sourceId}`)), byName = new Map(players.map(u => [String(u.name), u.id]));
  const plan = {make: {Actor: [], Item: []}, kept: 0};
  for ( const kind of KINDS ) for ( const d of file?.docs?.[kind] ?? [] ) {
    const c = d.flags?.["wodx-storyteller"]?.carried ?? {};
    if ( c.sourceId && seen.has(`${c.world}:${c.sourceId}`) ) { plan.kept++; continue; }
    const x = clone(d);
    for ( const name of c.owners ?? [] ) { const id = byName.get(name); if ( id ) x.ownership[id] = 3; }
    plan.make[kind].push(x);
  }
  return plan;
}

/** A file name for the carry file: world id and date, letters, digits and dashes only. */
export const fileName = (world = "world", made = Date.now()) =>
  `${String(world).replace(/[^\w-]+/g, "-")}-${new Date(made).toISOString().slice(0, 16).replace(/[^\d]/g, "")}.json`;
