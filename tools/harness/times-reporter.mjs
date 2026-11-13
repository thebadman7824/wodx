/* Test reporter that writes how long each test file took, as JSON {file: ms}.
   Used by the GitHub check to keep shard-times.json current. Usage:
   node --test --test-reporter=tap --test-reporter-destination=stdout \
     --test-reporter=./times-reporter.mjs --test-reporter-destination=times.json *.test.mjs */
import {basename} from "node:path";

export default async function* timesReporter(source) {
  const times = {};
  for await (const event of source) {
    if (event.type !== "test:pass" && event.type !== "test:fail") continue;
    const d = event.data;
    if (d.nesting !== 0 || !d.file) continue;
    const f = basename(d.file);
    times[f] = (times[f] ?? 0) + (d.details?.duration_ms ?? 0);
  }
  const sorted = Object.fromEntries(Object.entries(times).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, Math.round(v)]));
  yield JSON.stringify(sorted, null, 1) + "\n";
}
