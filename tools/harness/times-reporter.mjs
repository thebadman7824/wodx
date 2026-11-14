/* Test reporter that writes how long each test file took, as JSON {file: ms}.
   Used by the GitHub check to keep shard-times.json current. Usage:
   node --test --test-concurrency=1 --test-reporter=tap --test-reporter-destination=stdout \
     --test-reporter=./times-reporter.mjs --test-reporter-destination=times.json *.test.mjs
   With one file at a time, a file's time is from the last event of the file before it to its own
   last event, so it counts loading and setup as well as the tests themselves. */
import {basename} from "node:path";

export default async function* timesReporter(source) {
  const last = new Map();
  let start = Date.now();
  for await (const event of source) {
    const f = event.data?.file;
    if (!f) continue;
    last.delete(basename(f));
    last.set(basename(f), Date.now());
  }
  const times = {};
  for (const [f, t] of [...last.entries()].sort((a, b) => a[1] - b[1])) {
    times[f] = Math.max(1, t - start);
    start = t;
  }
  const sorted = Object.fromEntries(Object.entries(times).sort(([a], [b]) => a.localeCompare(b)));
  yield JSON.stringify(sorted, null, 1) + "\n";
}
