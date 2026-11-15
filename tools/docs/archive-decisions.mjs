/**
 * The weekly move of old decision text (B6243, stale design desk item 2026-11-15 f2, Ben 2026-11-15).
 *
 * Every Monday, with the build log, the decisions in docs/DECISIONS.md more than a month old move to
 * docs/archive/decisions-<year>-<month>.md, by the month of each decision. The index of blocks stays at the top of
 * DECISIONS.md, and each block whose text has moved names the file it is in now. Nothing is deleted: a decision is
 * written to its archive file before it leaves DECISIONS.md, and one already in the archive is not written twice.
 *
 * A decision is a "## B<n>." heading and the lines under it, dated by the first YYYY-MM-DD in its heading or by the
 * decision above it; or a row of the early table under "## The decisions", dated by its Date column.
 *
 *   node tools/docs/archive-decisions.mjs              move what is due today
 *   node tools/docs/archive-decisions.mjs --dry        say what would move, change nothing
 *   node tools/docs/archive-decisions.mjs --today 2026-12-14
 */
import {readFileSync, writeFileSync, existsSync, readdirSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {monthBefore} from "./archive-build-log.mjs";

export {monthBefore};
export const POINTER = "Decisions more than a month old move each Monday to docs/archive/decisions-<year>-<month>.md; the index names the file for each block whose text has moved (see docs/archive/README.md).";
export const BODY = "## The decisions";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const ROW = /^\| B(\d+)[a-z]? \| (\d{4}-\d{2}-\d{2}) \|/;
const HEAD = /^## B(\d+)[a-z]?\b/;

/**
 * A decisions text as {head: [lines up to and with "## The decisions"], table: [lines of the early table],
 * sections: [{n, date, lines}]}. The table's own header lines stay in `table`; its rows carry {n, date}.
 */
export function parse(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const at = lines.indexOf(BODY);
  if ( at < 0 ) throw new Error(`no "${BODY}" heading`);
  const head = lines.slice(0, at + 1), table = [], sections = [];
  let date = null;
  for ( const line of lines.slice(at + 1) ) {
    const h = HEAD.exec(line);
    if ( h ) {
      date = /(\d{4}-\d{2}-\d{2})/.exec(line)?.[1] ?? date;
      sections.push({n: +h[1], date, lines: [line]});
    }
    else if ( sections.length ) sections.at(-1).lines.push(line);
    else {
      const r = ROW.exec(line);
      table.push(r ? {n: +r[1], date: r[2], line} : {line});
    }
  }
  return {head, table, sections};
}

const block = s => s.lines.join("\n").replace(/\n+$/, "");
const tableTop = table => table.filter(t => !t.date && t.line.startsWith("|"));
const archiveText = (month, rows, secs) => {
  const [y, m] = month.split("-").map(Number);
  const top = `# WoDX decisions, ${MONTHS[m - 1]} ${y}\n\nMoved here from docs/DECISIONS.md by the weekly archive (B6243). Nothing was changed on the way. The index of blocks stays in docs/DECISIONS.md.\n\n${BODY}\n`;
  const table = rows.length ? `\n${rows.join("\n")}\n` : "";
  return `${top}${table}${secs.length ? `\n${secs.join("\n\n")}\n` : ""}`;
};
const TABLE_HEAD = ["| # | Date | Decision | Why |", "|---|------|----------|-----|"];

/** The decision numbers a decisions text holds: table rows and section headings. */
export function numbersIn(text) {
  const out = [];
  for ( const m of String(text ?? "").matchAll(/^(?:\| B(\d+)[a-z]? \||## B(\d+)[a-z]?\b)/gm) ) out.push(+(m[1] ?? m[2]));
  return out;
}

const LINK = / \(text in \[decisions-\d{4}-\d{2}\].*$/;
/**
 * The index rows with the archive files that now hold each block's text: "(text in [decisions-2026-11](...))" at the
 * end of the feature cell, with ", the rest in this file" when some of the block's decisions are still here.
 * where: Map n -> "YYYY-MM" of each moved decision; kept: the numbers still in DECISIONS.md.
 */
export function linkIndex(head, where, kept) {
  return head.map(line => {
    const m = /^\| (B(\d+)(?:-B(\d+))?) \| ([^|]+) \| ([^|]+) \|$/.exec(line);
    if ( !m ) return line;
    const lo = +m[2], hi = +(m[3] ?? m[2]);
    const months = [...new Set([...where].filter(([n]) => n >= lo && n <= hi).map(([, mo]) => mo))].sort();
    if ( !months.length && !LINK.test(m[4].trim()) ) return line;
    const feature = m[4].trim().replace(LINK, "");
    if ( !months.length ) return `| ${m[1]} | ${feature} | ${m[5].trim()} |`;
    const files = months.map(mo => `[decisions-${mo}](archive/decisions-${mo}.md)`).join(", ");
    const rest = kept.some(n => n >= lo && n <= hi) ? ", the rest in this file" : "";
    return `| ${m[1]} | ${feature} (text in ${files}${rest}) | ${m[5].trim()} |`;
  });
}

/**
 * Work out the move. text: DECISIONS.md; archives: {"YYYY-MM": text} of the archive files that exist; today:
 * YYYY-MM-DD. Returns {text, archives: {"YYYY-MM": new text}, moved, cutoff}. Decisions with no date stay.
 */
export function plan(text, archives = {}, today) {
  const cutoff = monthBefore(today), cur = parse(text);
  const out = {}, add = {};
  const due = x => x.date && x.date < cutoff;
  const take = (month, kind, value, n) => { (add[month] ??= {rows: [], secs: [], nums: []})[kind].push(value); add[month].nums.push(n); };
  for ( const t of cur.table ) if ( t.date && due(t) ) take(t.date.slice(0, 7), "rows", t.line, t.n);
  for ( const s of cur.sections ) if ( due(s) ) take(s.date.slice(0, 7), "secs", block(s), s.n);
  let moved = 0;
  for ( const [month, a] of Object.entries(add) ) {
    const old = archives[month] ? parse(archives[month]) : {table: [], sections: []};
    const haveRows = new Set(old.table.filter(t => t.date).map(t => t.line));
    const haveSecs = new Set(old.sections.map(block));
    const rows = [...old.table.filter(t => t.date).map(t => t.line), ...a.rows.filter(r => !haveRows.has(r))];
    const secs = [...old.sections.map(block), ...a.secs.filter(s => !haveSecs.has(s))];
    const sorted = secs.map(s => ({s, n: +HEAD.exec(s)[1]})).sort((x, y) => x.n - y.n).map(x => x.s);
    out[month] = archiveText(month, rows.length ? [...(tableTop(old.table).length ? tableTop(old.table).map(t => t.line) : TABLE_HEAD), ...rows] : [], sorted);
    moved += a.rows.length + a.secs.length;
  }
  if ( !moved ) return {text, archives: {}, moved: 0, cutoff};
  // Every decision now in an archive file, old and new, so the index names each file a block's text is in
  const where = new Map();
  for ( const [month, t] of Object.entries({...archives, ...out}) ) for ( const n of numbersIn(parse(t).table.map(x => x.line).join("\n") + "\n" + parse(t).sections.map(block).join("\n")) ) where.set(n, month);
  const keptTable = cur.table.filter(t => !(t.date && due(t)));
  const keptSecs = cur.sections.filter(s => !due(s));
  const kept = [...keptTable.filter(t => t.n).map(t => t.n), ...keptSecs.map(s => s.n)];
  let head = linkIndex(cur.head, where, kept);
  if ( !head.includes(POINTER) ) {
    const at = head.findIndex(l => l.startsWith("Next free block:"));
    head = at < 0 ? [...head.slice(0, -1), POINTER, "", ...head.slice(-1)] : [...head.slice(0, at + 1), "", POINTER, ...head.slice(at + 1)];
  }
  const tableLines = keptTable.some(t => t.date) ? keptTable.map(t => t.line) : keptTable.filter(t => !t.line.startsWith("|")).map(t => t.line);
  const body = [tableLines.join("\n").replace(/\n+$/, ""), keptSecs.map(block).join("\n\n")].filter(Boolean).join("\n\n");
  return {text: `${head.join("\n")}\n\n${body.replace(/^\n+/, "")}\n`, archives: out, moved, cutoff};
}

/** The archive README with a "Decisions by month" list of the files. */
export function readme(text, months) {
  const all = [...new Set([...(String(text).match(/decisions-(\d{4}-\d{2})\.md/g) ?? []).map(s => s.slice(10, 17)), ...months])].sort();
  const list = `## Decisions by month\n\nDecision text more than a month old, moved each Monday from docs/DECISIONS.md (B6243). The index of blocks stays there.\n\n${all.map(m => `- [decisions-${m}.md](decisions-${m}.md)`).join("\n")}\n`;
  const at = text.indexOf("## Decisions by month");
  if ( at < 0 ) return `${text.replace(/\n+$/, "")}\n\n${list}`;
  const next = text.indexOf("\n## ", at + 5);
  return `${text.slice(0, at)}${list}${next < 0 ? "" : text.slice(next)}`;
}

/** DECISIONS.md and every archive file, for checks that look a decision up wherever its text now is. */
export function allDecisionsText(root) {
  const docs = join(root, "docs"), arch = join(docs, "archive");
  const files = existsSync(arch) ? readdirSync(arch).filter(f => /^decisions-\d{4}-\d{2}\.md$/.test(f)).sort() : [];
  return [readFileSync(join(docs, "DECISIONS.md"), "utf8"), ...files.map(f => readFileSync(join(arch, f), "utf8"))].join("\n\n");
}
/** The decision text below the index: DECISIONS.md's and every archive file's. */
export function decisionsBelowIndex(root) {
  const docs = join(root, "docs"), arch = join(docs, "archive");
  const main = readFileSync(join(docs, "DECISIONS.md"), "utf8").split("<!-- decision-index:end -->")[1] ?? "";
  const files = existsSync(arch) ? readdirSync(arch).filter(f => /^decisions-\d{4}-\d{2}\.md$/.test(f)).sort() : [];
  return [main, ...files.map(f => readFileSync(join(arch, f), "utf8"))].join("\n\n");
}

/** The command line; archive-build-log.mjs runs it too, so the Monday archive moves both (B6243). */
export function main(argv = process.argv.slice(2)) {
  const args = argv, dry = args.includes("--dry");
  const today = args.includes("--today") && args[args.indexOf("--today") + 1] ? args[args.indexOf("--today") + 1] : new Date().toISOString().slice(0, 10);
  const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs");
  const path = join(docs, "DECISIONS.md"), arch = join(docs, "archive");
  const text = readFileSync(path, "utf8");
  const existing = Object.fromEntries(readdirSync(arch).map(f => /^decisions-(\d{4}-\d{2})\.md$/.exec(f)).filter(Boolean).map(m => [m[1], readFileSync(join(arch, m[0]), "utf8")]));
  const r = plan(text, existing, today);
  console.log(`Decisions, cutoff ${r.cutoff}: ${r.moved} to move${r.moved ? ` (${Object.keys(r.archives).join(", ")})` : ""}.`);
  if ( dry || !r.moved ) return;
  // The archive first, so a decision is never only in memory
  for ( const [m, t] of Object.entries(r.archives) ) writeFileSync(join(arch, `decisions-${m}.md`), t);
  const rp = join(arch, "README.md");
  writeFileSync(rp, readme(existsSync(rp) ? readFileSync(rp, "utf8") : "# Archive\n", Object.keys(r.archives)));
  writeFileSync(path, r.text);
}

if ( process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] ) main();
