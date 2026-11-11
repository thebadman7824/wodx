import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {cpSync, mkdtempSync, readFileSync, readdirSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {execFileSync} from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

test("release bundle: every module bundles, links and keeps cross-package files as one copy", async () => {
  const tmp = mkdtempSync(join(tmpdir(), "wodx-bundle-"));
  try {
    const mods = readdirSync(join(root, "modules")).filter(m => m.startsWith("wodx-"));
    for ( const m of mods ) cpSync(join(root, "modules", m), join(tmp, "modules", m), {recursive: true});
    cpSync(join(root, "system", "worldofdarkness"), join(tmp, "systems", "worldofdarkness"), {recursive: true});
    const out = execFileSync(process.execPath, [join(root, "tools/release/bundle.mjs"), tmp], {encoding: "utf8"});
    assert.match(out, /Kept out of bundles/);
    for ( const m of mods ) {
      const man = JSON.parse(readFileSync(join(tmp, "modules", m, "module.json"), "utf8"));
      if ( !man.esmodules?.length ) continue;
      for ( const e of man.esmodules ) {
        assert.match(e, /\.bundle\.js$/, m);
        // Loading in Node stops at the first Foundry global; a missing file would fail earlier
        const err = await import(join(tmp, "modules", m, e)).then(() => null, x => x);
        assert.ok(err === null || err instanceof ReferenceError, `${m}: ${err?.message}`);
      }
    }
    // A file another package imports is loaded from its own path, not copied into a bundle
    const act = readFileSync(join(tmp, "modules/wodx-actions/scripts/main.bundle.js"), "utf8");
    assert.match(act, /\.\.\/\.\.\/wodx-chronicle\/scripts\/search\.mjs/);
  } finally { rmSync(tmp, {recursive: true, force: true}); }
});
