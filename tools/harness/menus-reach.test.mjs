import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join, relative} from "node:path";

/* B6774: every menu in Creation, Sheets and Library can be reached: a growable list has a search box (searchBox() or a
   data-search input just before it), a fixed book list says so with data-fixed. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const walk = d => fs.readdirSync(d, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(join(d, e.name)) : /\.(mjs|hbs)$/.test(e.name) ? [join(d, e.name)] : []);

test("B6774: every select in Creation, Sheets and Library is searchable or marked fixed", () => {
  const bad = [];
  for ( const m of ["wodx-creation", "wodx-sheets", "wodx-library"] ) for ( const f of walk(join(root, "modules", m)) ) {
    const lines = fs.readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      for ( const s of line.matchAll(/<select\b([^>]*)>/g) ) {
        if ( /data-fixed/.test(s[1]) ) continue;
        const name = s[1].match(/name="([^"]+)"/)?.[1], cls = s[1].match(/class="([^" ]+)/)?.[1];
        const ctx = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
        const ok = (name && ctx.includes(`select[name=${name}]`)) || (cls && ctx.includes(`select.${cls}`)) || /data-search=/.test(ctx);
        if ( !ok ) bad.push(`${relative(root, f)}:${i + 1} ${name ?? cls ?? "select"}`);
      }
    });
  }
  assert.deepEqual(bad, []);
});
