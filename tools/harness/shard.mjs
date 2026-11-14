/* Splits the harness test files into shards of about equal run time, for the parallel GitHub check.
   Usage: node shard.mjs <index> <total>   prints the files of shard <index> (1-based), one per line
          node shard.mjs --docs            prints the files that read docs or Markdown (the docs-only run)
   Times come from shard-times.json (ms per file, written by times-reporter.mjs on a GitHub run).
   A file with no recorded time counts as the median, so a new test file still lands somewhere.
   Every file goes to exactly one shard (checked by shard.test.mjs). */
import {readdirSync, readFileSync, existsSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath} from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

export function testFiles(dir = here) {
  return readdirSync(dir).filter(f => f.endsWith(".test.mjs")).sort();
}

export function loadTimes(dir = here) {
  const p = join(dir, "shard-times.json");
  return existsSync(p) ? JSON.parse(readFileSync(p, "utf8")) : {};
}

/* Longest first, each file to the shard with the least time so far. Ties go by name, so the split is stable. */
export function shards(files, times, total) {
  const known = files.map(f => times[f]).filter(t => typeof t === "number").sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  const weight = f => (typeof times[f] === "number" ? times[f] : median);
  const order = [...files].sort((a, b) => weight(b) - weight(a) || a.localeCompare(b));
  const bins = Array.from({length: total}, () => ({ms: 0, files: []}));
  for (const f of order) {
    let best = bins[0];
    for (const b of bins) if (b.ms < best.ms) best = b;
    best.files.push(f);
    best.ms += weight(f);
  }
  for (const b of bins) b.files.sort();
  return bins;
}

/* Test files that read Markdown or anything under docs/: these still run when a change touches docs only. */
const READS_DOCS = /\.md\b|docs\/|CHANGELOG|README/;
export function docsFiles(dir = here) {
  // Harness helpers that read Markdown (path-case.mjs scans .md files): a test importing one counts too.
  const helpers = readdirSync(dir).filter(f => f.endsWith(".mjs") && !f.endsWith(".test.mjs") && f !== "shard.mjs")
    .filter(f => READS_DOCS.test(readFileSync(join(dir, f), "utf8")));
  return testFiles(dir).filter(f => {
    const src = readFileSync(join(dir, f), "utf8");
    return READS_DOCS.test(src) || helpers.some(h => src.includes(`./${h}`));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [a, b] = process.argv.slice(2);
  if (a === "--docs") console.log(docsFiles().join("\n"));
  else {
    const i = Number(a), n = Number(b);
    if (!(n >= 1 && i >= 1 && i <= n)) { console.error("usage: node shard.mjs <index> <total> | --docs"); process.exit(2); }
    console.log(shards(testFiles(), loadTimes(), n)[i - 1].files.join("\n"));
  }
}
