import {MODULE_ID, esc, lineOf, lineage, chronology, generationOf, clanNameOf} from "./actor-data.mjs";
import {bondStage} from "./rules.mjs";
import {describeTime} from "../../wodx-chronicle/scripts/calendar.mjs";

/**
 * Lineage: who made whom. Stored on each actor in flags["wodx-creation"]:
 *   lineage    {sire, domitor, formerly, became, bonds: {<regnant id>: {name, drinks, last}}}
 *   chronology {embraced, ghouled, died} as world time in seconds
 * Names are kept beside ids so the record survives an actor being deleted.
 */

export const dateLabel = time => {
  try {
    return describeTime(Number(time) || 0).dateLabel;
  } catch {
    return "";
  }
};

export async function setLineage(actor, changes) {
  const next = {...lineage(actor), ...changes};
  return actor.setFlag(MODULE_ID, "lineage", next);
}

export async function setChronology(actor, changes) {
  const next = {...chronology(actor), ...changes};
  return actor.setFlag(MODULE_ID, "chronology", next);
}

/** Record a drink of a vampire's blood. Returns the new bond stage. */
export async function recordDrink(actor, regnant, time = game.time.worldTime) {
  const l = lineage(actor);
  const bonds = {...(l.bonds ?? {})};
  const prev = bonds[regnant.id] ?? {name: regnant.name, drinks: 0};
  bonds[regnant.id] = {name: regnant.name, drinks: prev.drinks + 1, last: time};
  await setLineage(actor, {bonds});
  return bondStage(bonds[regnant.id].drinks);
}

/* -------------------------------------------- */
/*  The lineage journal                         */
/* -------------------------------------------- */

export const ordinal = n => `${n}${(n % 100 >= 11 && n % 100 <= 13) ? "th" : ({1: "st", 2: "nd", 3: "rd"}[n % 10] ?? "th")}`;
const ref = actor => (actor ? `@UUID[Actor.${actor.id}]{${esc(actor.name)}}` : "");
const nameOf = (link, actors) => {
  if ( !link ) return "";
  const a = link.id ? actors.get(link.id) : null;
  return a ? ref(a) : esc(link.name ?? "");
};

/** Sire of a vampire: the WoDX lineage first, else the sheet's free-text Sire field matched to an actor by name. */
export function sireLink(actor, actors = game.actors) {
  const l = lineage(actor);
  if ( l.sire ) return l.sire;
  const text = String(actor.system?.sire ?? "").trim();
  if ( !text ) return null;
  const match = [...actors].find(a => lineOf(a) === "vampire" && a.name.toLowerCase() === text.toLowerCase());
  return {id: match?.id ?? null, name: match?.name ?? text};
}

/** Build the HTML for the two pages: blood (sires and childer) and ghouls (domitors and bonds). */
export function lineageHTML(actors = game.actors) {
  const all = [...actors];
  const byId = new Map(all.map(a => [a.id, a]));
  const vampires = all.filter(a => lineOf(a) === "vampire" && !lineage(a).became);
  const childer = new Map();
  const roots = [];
  for ( const v of vampires ) {
    const s = sireLink(v, all);
    const key = s?.id ?? (s?.name ? `name:${s.name}` : null);
    if ( !key ) { roots.push(v); continue; }
    if ( !childer.has(key) ) childer.set(key, {link: s, list: []});
    childer.get(key).list.push(v);
  }
  // A sire known only by name, or one who is not a vampire actor here, heads a tree of its own
  const describe = v => {
    const bits = [clanNameOf(v), generationOf(v) ? `${ordinal(generationOf(v))} Generation` : ""].filter(Boolean).join(", ");
    const when = chronology(v).embraced !== undefined ? `, Embraced ${dateLabel(chronology(v).embraced)}` : "";
    return `${ref(v)}${bits ? ` (${esc(bits)})` : ""}${esc(when)}`;
  };
  const seen = new Set();
  const tree = (v, depth = 0) => {
    if ( seen.has(v.id) || depth > 20 ) return "";
    seen.add(v.id);
    const kids = childer.get(v.id)?.list ?? [];
    return `<li>${describe(v)}${kids.length ? `<ul>${kids.map(k => tree(k, depth + 1)).join("")}</ul>` : ""}</li>`;
  };
  const topLevel = [];
  for ( const v of roots ) if ( childer.has(v.id) ) topLevel.push(tree(v));
  for ( const [key, {link, list}] of childer ) {
    // A sire who is a vampire here is drawn inside its own tree
    if ( byId.has(key) && lineOf(byId.get(key)) === "vampire" ) continue;
    topLevel.push(`<li>${nameOf(link, byId) || "Unknown sire"}<ul>${list.map(k => tree(k, 1)).join("")}</ul></li>`);
  }
  const alone = vampires.filter(v => !seen.has(v.id));
  const blood = `<p>Sires and their childer, from the WoDX lineage and each sheet's Sire field.</p>
    ${topLevel.length ? `<ul>${topLevel.join("")}</ul>` : "<p>No sire is recorded yet.</p>"}
    ${alone.length ? `<h2>No sire recorded</h2><ul>${alone.map(v => `<li>${describe(v)}</li>`).join("")}</ul>` : ""}`;

  const domitors = new Map();
  for ( const a of all ) {
    const l = lineage(a);
    for ( const [id, b] of Object.entries(l.bonds ?? {}) ) {
      if ( !domitors.has(id) ) domitors.set(id, {name: b.name, rows: []});
      const isGhoul = l.domitor?.id === id && lineOf(a) === "ghoul";
      domitors.get(id).rows.push(`<li>${ref(a)}: ${esc(bondStage(b.drinks).label)}${isGhoul ? ", ghoul" : ""}${b.last !== undefined ? `, last drink ${esc(dateLabel(b.last))}` : ""}</li>`);
    }
  }
  const ghouls = domitors.size
    ? [...domitors].map(([id, d]) => `<h2>${nameOf({id, name: d.name}, byId)}</h2><ul>${d.rows.join("")}</ul>`).join("")
    : "<p>No drinks of vitae are recorded yet.</p>";

  const changed = all.filter(a => lineage(a).formerly || lineage(a).became);
  const changes = changed.length
    ? `<ul>${changed.filter(a => lineage(a).formerly).map(a => `<li>${ref(a)} was ${nameOf(lineage(a).formerly, byId)} before the Embrace</li>`).join("")}</ul>`
    : "<p>None yet.</p>";
  return {blood, ghouls: `${ghouls}<h2>Changes of state</h2>${changes}`};
}

/** Write the "WoDX Lineage" journal (GM only). */
export async function writeLineageJournal() {
  if ( !game.user.isGM ) return null;
  const {blood, ghouls} = lineageHTML();
  let journal = game.journal.find(j => j.getFlag?.(MODULE_ID, "kind") === "lineage");
  if ( !journal ) {
    journal = await JournalEntry.create({name: "WoDX Lineage", flags: {[MODULE_ID]: {kind: "lineage"}},
      pages: [{name: "Blood", type: "text", text: {content: blood}}, {name: "Ghouls and bonds", type: "text", text: {content: ghouls}}]});
    return journal;
  }
  for ( const [name, html] of [["Blood", blood], ["Ghouls and bonds", ghouls]] ) {
    const page = journal.pages.getName(name);
    if ( page ) await page.update({"text.content": html});
    else await journal.createEmbeddedDocuments("JournalEntryPage", [{name, type: "text", text: {content: html}}]);
  }
  return journal;
}
