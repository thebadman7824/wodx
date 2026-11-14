/**
 * The weekly move of old build log entries (B2722, stale design review item e3, Ben 2026-11-13).
 *
 * Every Monday, the entries of docs/BUILD-LOG.md more than a month old move to docs/archive/build-log-<year>-<month>.md,
 * by the month of each entry, beside the PENDING-REVIEW archive. Nothing is deleted: an entry is written to its archive
 * file before it leaves the log, and an entry already in the archive is not written twice. The log keeps a line at the
 * top that says where the older entries are, and docs/archive/README.md lists the files.
 *
 * An entry is a "## " or "### " heading and the lines under it. Its date is the first YYYY-MM-DD in its heading, or the
 * date of the entry above it when the heading has none.
 *
 *   node tools/docs/archive-build-log.mjs              move what is due today
 *   node tools/docs/archive-build-log.mjs --dry        say what would move, change nothing
 *   node tools/docs/archive-build-log.mjs --today 2026-12-14
 */
import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

export const POINTER = "Entries more than a month old move each Monday to docs/archive/build-log-<year>-<month>.md (see docs/archive/README.md).";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** The day a month before `today` (YYYY-MM-DD), held to the last day of a shorter month. */
export function monthBefore(today) {
  const [y, m, d] = String(today).split("-").map(Number);
  const py = m === 1 ? y - 1 : y, pm = m === 1 ? 12 : m - 1;
  const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
  return `${py}-${String(pm).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** The log as {head: [lines], entries: [{date, lines}]}. */
export function parse(text) {
  const lines = String(text ?? "").replace(/\r\n/g, "\n").split("\n");
  const head = [], entries = [];
  let date = null;
  for ( const line of lines ) {
    if ( /^#{2,3} /.test(line) ) {
      date = /(\d{4}-\d{2}-\d{2})/.exec(line)?.[1] ?? date;
      entries.push({date, lines: [line]});
    }
    else if ( entries.length ) entries.at(-1).lines.push(line);
    else head.push(line);
  }
  return {head, entries};
}

const block = e => e.lines.join("\n").replace(/\n+$/, "");
const archiveHead = month => {
  const [y, m] = month.split("-").map(Number);
  return `# WoDX build log, ${MONTHS[m - 1]} ${y}\n\nMoved here from docs/BUILD-LOG.md by the weekly archive (B2722). Nothing was changed on the way.\n`;
};

/**
 * Work out the move. log: BUILD-LOG.md's text; archives: {"YYYY-MM": text} of the archive files that exist; today:
 * YYYY-MM-DD. Returns {log, archives: {"YYYY-MM": new text}, moved: count, cutoff}. Entries with no date stay.
 */
export function plan(log, archives = {}, today) {
  const cutoff = monthBefore(today), {head, entries} = parse(log);
  const keep = [], out = {}, files = {...archives};
  let moved = 0;
  for ( const e of entries ) {
    if ( !e.date || e.date >= cutoff ) { keep.push(e); continue; }
    const month = e.date.slice(0, 7), b = block(e);
    let text = files[month] ?? archiveHead(month);
    if ( !text.includes(b) ) text = `${text.replace(/\n+$/, "")}\n\n${b}\n`;
    files[month] = out[month] = text;
    moved++;
  }
  if ( !moved ) return {log, archives: {}, moved: 0, cutoff};
  const h = head.join("\n").replace(/\n+$/, "");
  const top = h.includes(POINTER) ? h : `${h}\n\n${POINTER}`;
  return {log: `${top}\n\n${keep.map(block).join("\n\n")}\n`, archives: out, moved, cutoff};
}

/** The archive README with a "Build log by month" list of the files. */
export function readme(text, months) {
  const all = [...new Set([...(String(text).match(/build-log-(\d{4}-\d{2})\.md/g) ?? []).map(s => s.slice(10, 17)), ...months])].sort();
  const list = `## Build log by month\n\nBuild log entries more than a month old, moved each Monday (B2722).\n\n${all.map(m => `- [build-log-${m}.md](build-log-${m}.md)`).join("\n")}\n`;
  const at = text.indexOf("## Build log by month");
  if ( at < 0 ) return `${text.replace(/\n+$/, "")}\n\n${list}`;
  const next = text.indexOf("\n## ", at + 5);
  return `${text.slice(0, at)}${list}${next < 0 ? "" : text.slice(next)}`;
}

function main() {
  const args = process.argv.slice(2), dry = args.includes("--dry");
  const today = args[args.indexOf("--today") + 1] && args.includes("--today") ? args[args.indexOf("--today") + 1] : new Date().toISOString().slice(0, 10);
  const docs = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "docs");
  const logPath = join(docs, "BUILD-LOG.md"), arch = join(docs, "archive");
  const log = readFileSync(logPath, "utf8");
  const months = [...new Set(parse(log).entries.map(e => e.date?.slice(0, 7)).filter(Boolean))];
  const existing = Object.fromEntries(months.map(m => [m, join(arch, `build-log-${m}.md`)]).filter(([, p]) => existsSync(p)).map(([m, p]) => [m, readFileSync(p, "utf8")]));
  const r = plan(log, existing, today);
  console.log(`Cutoff ${r.cutoff}: ${r.moved} entries to move${r.moved ? ` (${Object.keys(r.archives).join(", ")})` : ""}.`);
  if ( dry || !r.moved ) return;
  // The archive first, so an entry is never only in memory
  for ( const [m, text] of Object.entries(r.archives) ) writeFileSync(join(arch, `build-log-${m}.md`), text);
  const rp = join(arch, "README.md");
  writeFileSync(rp, readme(existsSync(rp) ? readFileSync(rp, "utf8") : "# Archive\n", Object.keys(r.archives)));
  writeFileSync(logPath, r.log);
}

if ( process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] ) main();
