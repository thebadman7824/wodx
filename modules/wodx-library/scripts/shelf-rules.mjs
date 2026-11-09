/**
 * The Library's shelves (WoDX Library 0.2.0), the pure part: WoDX's own short summaries of powers, roads, conditions,
 * house rules and era profiles, turned into journal entries for one world compendium per line, each entry tagged
 * with its lines and eras so the Library window can show what fits the chronicle now. Summaries and page references
 * only; book text stays in the books. No Foundry in here.
 */

import {MOD} from "./gear-rules.mjs";
import * as E from "./ency-rules.mjs";

/** The shelves: one world compendium each. */
export const SHELVES = {
  vampire: {name: "wodx-shelf-vampire", label: "WoDX · Vampire"},
  werewolf: {name: "wodx-shelf-werewolf", label: "WoDX · Werewolf"},
  wraith: {name: "wodx-shelf-wraith", label: "WoDX · Wraith"},
  rules: {name: "wodx-shelf-rules", label: "WoDX · Rules, conditions and eras"},
  encyclopedia: {name: "wodx-encyclopedia", label: "WoDX · Encyclopaedia Tenebrarum"}
};
export const SHELF_ORDER = ["vampire", "werewolf", "wraith", "rules", "encyclopedia"];
export const LINE_LABELS = {all: "Every line", vampire: "Vampire", ghoul: "Ghoul", werewolf: "Werewolf", wraith: "Wraith", mage: "Mage", changeling: "Changeling",
  hunter: "Hunter", mummy: "Mummy", demon: "Demon", mortal: "Mortal"};

const DA = ["dark-ages", "long-night", "renaissance"];
export const ALL_ERAS = ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "time-of-judgment", "future-darkness", "classical", "living-gods"];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const title = s => String(s ?? "").replace(/[-_]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const dots = n => (Number(n) > 0 ? "•".repeat(Math.min(10, Number(n))) : "basic");
const roll = r => String(r ?? "").split("+").filter(Boolean).map(title).join(" + ");
const tags = (lines, eras) => ({lines: [...new Set(lines)], eras: [...new Set(eras)]});
const page = (book, p) => (p ? `${book}, p. ${p}` : book);

/** One journal entry. `pages` are {name, html}; the first is the overview. */
function entry({key, shelf, name, book, lines, eras, pages}) {
  return {name, shelf, pages: pages.map((p, i) => ({name: p.name, type: "text", sort: (i + 1) * 100, text: {content: p.html, format: 1}})),
    flags: {[MOD]: {shelf: key, book, ...tags(lines, eras)}}};
}

/** A power as one page: what it does, the roll and difficulty when it has one, the cost and duration, the page. */
function powerHtml(x, book) {
  const bits = [x.r && `<strong>Roll:</strong> ${esc(roll(x.r))}${x.diff !== undefined && x.diff !== "" ? `, difficulty ${esc(x.diff)}` : ""}`,
    x.t && `<strong>Lasts:</strong> ${esc(x.t)}`].filter(Boolean);
  return `<p>${esc(x.e ?? "")}</p>${bits.length ? `<p>${bits.join("; ")}</p>` : ""}<p class="wodx-shelf-src">${esc(page(book, x.p))}. Read the page for the full system.</p>`;
}

/** Dark Ages Disciplines: one entry per Discipline, a page per power, in level order. */
export function fromDisciplines(json) {
  const book = "V20 Dark Ages";
  const by = new Map();
  for ( const x of json?.powers ?? [] ) (by.get(x.d) ?? by.set(x.d, []).get(x.d)).push(x);
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, list]) => entry({key: `daw-disc-${d}`, shelf: "vampire", name: `${d} (Dark Ages)`, book,
    lines: ["vampire", "ghoul"], eras: DA,
    pages: [{name: d, html: `<p>${esc(d)}, as the Dark Ages chronicle uses it: ${list.length} powers from ${esc(book)}.</p>`},
      ...list.sort((a, b) => a.l - b.l || a.n.localeCompare(b.n)).map(x => ({name: `${dots(x.l)} ${x.n}`, html: powerHtml(x, book)}))]}));
}

/** Dark Ages Roads: one entry each, with the virtues, aura, sins of the hierarchy (as WoDX words them) and paths. */
export function fromRoads(json) {
  const book = "V20 Dark Ages";
  const v = json?.virtueLabels ?? {};
  return Object.entries(json?.roads ?? {}).map(([k, r]) => entry({key: `daw-road-${k}`, shelf: "vampire", name: r.name, book, lines: ["vampire"], eras: DA,
    pages: [{name: r.name, html: `<p><em>${esc(r.latin ?? "")}</em>${r.nick ? `, called the ${esc(r.nick)}` : ""}.</p>
      <p><strong>Virtues:</strong> ${esc((r.virtues ?? []).map(x => v[x] ?? x).join(" and "))}. <strong>Aura:</strong> ${esc(r.aura ?? "")}.</p>
      ${r.sins?.length ? `<p><strong>Hierarchy of sins</strong>, in the order of the book's chart:</p><ol>${r.sins.map(s => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
      ${r.paths?.length ? `<p><strong>Paths:</strong> ${r.paths.map(p => `${esc(p.name)} (p. ${esc(p.p)})`).join(", ")}.</p>` : ""}
      <p class="wodx-shelf-src">${esc(page(book, r.p))}${r.hp ? `; hierarchy p. ${esc(r.hp)}` : ""}.</p>`}]}));
}

/** Dark Ages Gifts: one entry per level, a page per Gift with who may learn it. */
export function fromGifts(json) {
  const book = "Dark Ages: Werewolf";
  const by = new Map();
  for ( const x of json?.gifts ?? [] ) (by.get(x.l) ?? by.set(x.l, []).get(x.l)).push(x);
  return [...by.entries()].sort(([a], [b]) => a - b).map(([l, list]) => entry({key: `daw-gifts-${l}`, shelf: "werewolf", name: `Gifts, level ${l} (Dark Ages)`, book,
    lines: ["werewolf"], eras: DA,
    pages: [{name: `Level ${l}`, html: `<p>${list.length} Gifts of level ${l} from ${esc(book)}, chapter four.</p>`},
      ...list.sort((a, b) => a.n.localeCompare(b.n)).map(x => ({name: x.n,
        html: `<p><strong>Learned by:</strong> ${esc((x.g ?? []).map(title).join(", "))}.</p>${powerHtml({...x, diff: x.d}, book)}`}))]}));
}

/** Arcanoi: one entry per Arcanos for Wraith 20th (every era) and one per Arcanos for The Great War. */
export function fromArcanoi(json, {gw = false} = {}) {
  const book = gw ? "Wraith: The Great War" : "Wraith 20th";
  const by = new Map();
  for ( const x of json?.arts ?? [] ) (by.get(x.d) ?? by.set(x.d, []).get(x.d)).push(x);
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([d, list]) => entry({key: `${gw ? "gw" : "w20"}-arc-${d}`, shelf: "wraith",
    name: gw ? `${d} (Great War)` : d, book, lines: ["wraith"], eras: gw ? ["great-war"] : ALL_ERAS,
    pages: [{name: d, html: `<p>${esc(d)}: ${list.length} arts from ${esc(book)}.${json?.general?.defaults?.[d] ? ` ${esc(json.general.defaults[d])}` : ""}</p>`},
      ...list.sort((a, b) => a.l - b.l || a.n.localeCompare(b.n)).map(x => ({name: `${dots(x.l)} ${x.n}`, html: powerHtml(x, book)}))]}));
}

/** Wraith Thorns: one entry, a page each. */
export function fromThorns(json) {
  const book = "Wraith 20th";
  const list = json?.thorns ?? [];
  if ( !list.length ) return [];
  return [entry({key: "w20-thorns", shelf: "wraith", name: "Thorns", book, lines: ["wraith"], eras: ALL_ERAS,
    pages: [{name: "Thorns", html: `<p>${list.length} Thorns, the Shadow's gifts.</p>`},
      ...list.map(t => ({name: t.n, html: `<p>${esc(t.e ?? "")}</p><p><strong>Cost:</strong> ${esc(t.cost ?? "")}</p><p class="wodx-shelf-src">${esc(page(book, t.p))}.</p>`}))]})];
}

/** Conditions (WoDX Chronicle's registry): one entry, a page each. */
export function fromConditions(list = []) {
  if ( !list.length ) return [];
  return [entry({key: "conditions", shelf: "rules", name: "Conditions", book: "V20 Dark Ages and each line's book", lines: ["all"], eras: ALL_ERAS,
    pages: [{name: "Conditions", html: "<p>The conditions WoDX puts on tokens, with what each does and where the rule is.</p>"},
      ...list.map(c => ({name: c.name, html: `<p>${esc(c.summary ?? "")}</p>${c.lines?.length ? `<p><strong>Lines:</strong> ${esc(c.lines.map(l => LINE_LABELS[l] ?? l).join(", "))}</p>` : ""}<p class="wodx-shelf-src">${esc(c.source ?? "")}.</p>`}))]})];
}

/** House-rule switches: one entry per group. */
export function fromHouseRules(data) {
  const groups = data?.groups ?? [];
  return groups.map(g => {
    const list = (data?.switches ?? []).filter(s => s.group === g.id);
    return list.length ? entry({key: `rules-${g.id}`, shelf: "rules", name: `House rules: ${g.name}`, book: "WoDX", lines: ["all"], eras: ALL_ERAS,
      pages: [{name: g.name, html: `<p>Switches in the Chronicle's house rules. Each is on or off in this world; the Chronicle Rules journal shows which.</p>`},
        ...list.map(s => ({name: s.name, html: `<p>${esc(s.hint ?? "")}</p><p><strong>Starts:</strong> ${s.default ? "on" : "off"}.</p><p class="wodx-shelf-src">${esc(s.source ?? "")}.</p>`}))]}) : null;
  }).filter(Boolean);
}

/** Era profiles: one entry per era, tagged with that era only. */
export function fromEras(json) {
  const list = Array.isArray(json?.profiles) ? json.profiles : Array.isArray(json) ? json : Object.values(json?.profiles ?? json ?? {});
  return list.filter(p => p?.id && p.name).map(p => entry({key: `era-${p.id}`, shelf: "rules", name: `Era: ${p.name}`, book: "WoDX era profiles", lines: ["all"], eras: [p.id],
    pages: [{name: p.name, html: `<p><strong>Years:</strong> ${p.prologue ? "a prologue, set by hand" : `${esc(p.start ?? "?")} to ${esc(p.end ?? "?")}`}.</p><p><strong>Rules from:</strong> ${esc(p.basis ?? "")}.</p>${[].concat(p.ourCall ?? []).length ? `<p><strong>House readings:</strong> ${esc([].concat(p.ourCall).join("; "))}.</p>` : ""}`}]}));
}

/** The encyclopedia's entries as journals (with fixed ids, so their links hold), skipping any that fail the checks. */
export function fromEncyclopedia(ency) {
  const books = Object.fromEntries((ency?.books ?? []).map(b => [b.id, b]));
  const entries = (ency?.entries ?? []).filter(e => !E.checkEntry(e, books).length);
  const titles = Object.fromEntries(entries.map(e => [e.id, e.title]));
  return entries.map(e => ({...E.toJournal(e, {books, titles, pack: `world.${SHELVES.encyclopedia.name}`, MOD}), shelf: "encyclopedia"}));
}

/** Every shelf's entries from the sources given (missing sources are skipped). */
export function buildShelves(src = {}) {
  return [
    ...fromDisciplines(src.disciplines), ...fromRoads(src.roads), ...fromGifts(src.gifts),
    ...fromArcanoi(src.arcanoi), ...fromArcanoi(src.arcanoiGW, {gw: true}), ...fromThorns(src.wraith),
    ...fromConditions(src.conditions), ...fromHouseRules(src.houseRules), ...fromEras(src.eras), ...fromEncyclopedia(src.encyclopedia)
  ];
}

/** Does an entry fit a line and an era? "all" on either side matches anything. */
export function fits(flags, {line = "all", era = null} = {}) {
  const f = flags ?? {};
  const lineOk = line === "all" || (f.lines ?? []).includes("all") || (f.lines ?? []).includes(line);
  const eraOk = !era || (f.eras ?? []).includes(era);
  return lineOk && eraOk;
}

/** A short, stable fingerprint of any data, to tell when a journal or entry needs remaking. */
export function hashOf(o) {
  const str = JSON.stringify(o) ?? "";
  let h = 0;
  for ( let i = 0; i < str.length; i++ ) h = (h * 31 + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
