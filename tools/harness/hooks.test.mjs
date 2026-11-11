import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function files(dir, out = []) {
  for ( const n of readdirSync(dir) ) {
    if ( n === "node_modules" ) continue;
    const p = join(dir, n);
    if ( statSync(p).isDirectory() ) files(p, out);
    else if ( /\.(m?js)$/.test(n) ) out.push(p);
  }
  return out;
}

test("every hook a module sends is heard, or listed in docs/HOOKS.md as an extension point", () => {
  const sent = new Set(), heard = new Set();
  for ( const f of files(join(root, "modules")) ) {
    const s = readFileSync(f, "utf8");
    for ( const m of s.matchAll(/Hooks\.(?:callAll|call)\(\s*["'`](wodx[A-Za-z]+)/g) ) sent.add(m[1]);
    for ( const m of s.matchAll(/Hooks\.(?:on|once)\(\s*["'`](wodx[A-Za-z]+)/g) ) heard.add(m[1]);
  }
  const doc = readFileSync(join(root, "docs/HOOKS.md"), "utf8");
  const ext = doc.split("## Extension points")[1] ?? "";
  const listed = new Set([...ext.matchAll(/^\| (wodx[A-Za-z]+) \|/gm)].map(m => m[1]));
  const all = new Set([...doc.matchAll(/^\| (wodx[A-Za-z]+) \|/gm)].map(m => m[1]));
  assert.ok(sent.size > 10, "found the senders");
  for ( const h of sent ) {
    assert.ok(heard.has(h) || listed.has(h), `${h} is sent but nobody hears it: add a listener or list it under Extension points`);
    assert.ok(all.has(h), `${h} is missing from docs/HOOKS.md`);
  }
  for ( const h of listed ) assert.ok(!heard.has(h), `${h} now has a listener: move it to the Heard table`);
});
