/**
 * Chronicle canon guard (B7170, Finish-Line Desk o6). A hand-typed year beside a canon name, outside
 * modules/wodx-chronicle/data/canon/, is a copy of a shared date:
 *  - a copy that disagrees with the canon fails at once (the 1381 / 1394 kind of split);
 * A year counts only inside the same clause (up to a full stop or semicolon).
 *  - a copy that agrees is allowed only while it is on tools/harness/canon-copies.json, which may only shrink.
 * New code reads canon("<id>") instead. To rewrite the list after removing copies: CANON_WRITE=1 node --test canon.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {execFileSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {CANON, canon, canonSpan} from "../../modules/wodx-rules/chronicle/data/canon/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const LIST = path.join(root, "tools/harness/canon-copies.json");
const SKIP = /^modules\/wodx-rules\/chronicle\/data\/canon\/|^modules\/wodx-library\/data\/encyclopedia\/|\/lang\/|\/packs\/|node_modules\//;
const YEAR = /\b(1[0-9]{3}|20[0-9]{2})\b/g;
const AFTER = 60, BEFORE = 90;

function files() {
  return execFileSync("git", ["ls-files", "modules", "system"], {cwd: root, encoding: "utf8"})
    .split("\n").filter(f => /\.(mjs|js|json)$/.test(f) && !SKIP.test(f));
}

/** The years a line ties to one fact: those in the next AFTER characters, else those in the BEFORE characters before. */
function yearsBeside(line, at, len) {
  let next = line.slice(at + len, at + len + AFTER);
  const stop = next.search(/[.;](?:\s|$)/);
  if ( stop >= 0 ) next = next.slice(0, stop);
  const after = [...next.matchAll(YEAR)].map(m => +m[1]);
  if ( after.length ) return after.slice(0, 2);
  let prev = line.slice(Math.max(0, at - BEFORE), at);
  const cut = Math.max(...[...prev.matchAll(/[.;]\s/g)].map(m => m.index + 2), 0);
  prev = prev.slice(cut);
  return [...prev.matchAll(YEAR)].map(m => +m[1]).slice(-2);
}

/** Every copy in the repo: {key "file|fact", file, line, fact, years, wrong}. */
export function scan() {
  const out = [];
  for ( const f of files() ) {
    const text = fs.readFileSync(path.join(root, f), "utf8");
    if ( !/[12][0-9]{3}/.test(text) ) continue;
    text.split("\n").forEach((line, i) => {
      if ( line.length > 2000 || /canon\(/.test(line) ) return;
      for ( const fact of CANON ) {
        const re = new RegExp(fact.names.source, "gi");
        for ( const m of line.matchAll(re) ) {
          const years = yearsBeside(line, m.index, m[0].length);
          if ( !years.length ) continue;
          const wrong = years.filter(y => y < fact.from || y > fact.to);
          out.push({key: `${f}|${fact.id}`, file: f, line: i + 1, fact: fact.id, years, wrong});
        }
      }
    });
  }
  return out;
}

const count = rows => rows.reduce((m, r) => (m[r.key] = (m[r.key] || 0) + 1, m), {});

test("every canon fact is well formed and checked against a book", () => {
  const ids = new Set();
  for ( const f of CANON ) {
    assert.match(f.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, f.id);
    assert.ok(!ids.has(f.id), `${f.id} twice`); ids.add(f.id);
    assert.ok(Number.isInteger(f.from) && Number.isInteger(f.to) && f.from <= f.to, `${f.id}: from and to`);
    assert.ok(f.names instanceof RegExp, `${f.id}: names`);
    assert.ok(f.refs?.length && f.refs.every(r => r.book && Number.isInteger(r.pdf) && r.says), `${f.id}: refs with book, pdf and says`);
    assert.ok(f.refs.every(r => r.says.split(/\s+/).length < 16), `${f.id}: says is a short note in our own words`);
  }
  assert.equal(canon("convention-of-thorns").from, 1493);
  assert.equal(canonSpan("anarch-revolt"), "1335 to 1493");
  assert.throws(() => canon("no-such-fact"), /no fact/);
});

test("no hand-typed year disagrees with the canon", () => {
  const wrong = scan().filter(r => r.wrong.length).map(r => `${r.file}:${r.line} ${r.fact} ${r.wrong.join(", ")} (canon ${canonSpan(r.fact)})`);
  assert.deepEqual(wrong, [], "read canon(\"<id>\") from modules/wodx-rules/chronicle/data/canon/index.mjs instead of typing the year");
});

test("copies of canon years only shrink (tools/harness/canon-copies.json)", () => {
  const now = count(scan());
  if ( process.env.CANON_WRITE ) fs.writeFileSync(LIST, JSON.stringify(Object.fromEntries(Object.entries(now).sort()), null, 1) + "\n");
  const was = JSON.parse(fs.readFileSync(LIST, "utf8"));
  const grew = Object.entries(now).filter(([k, n]) => n > (was[k] || 0)).map(([k, n]) => `${k}: ${n} (list ${was[k] || 0})`);
  assert.deepEqual(grew, [], "a new copy of a canon year: read canon(\"<id>\") instead");
  const shrank = Object.entries(was).filter(([k, n]) => (now[k] || 0) < n).map(([k]) => k);
  assert.deepEqual(shrank, [], "copies were removed: run CANON_WRITE=1 node --test tools/harness/canon.test.mjs to shrink the list");
});
