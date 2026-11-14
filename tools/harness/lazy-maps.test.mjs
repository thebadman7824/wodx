// Storyteller 0.58.2 and Otherworlds 0.23.2 (B2675, B2676): the world map grid and the realm world maps load on first
// use. Walks the static imports from each module's main script and checks the heavy files are not among them.
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {dirname, resolve, join} from "node:path";
import {fileURLToPath} from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const IMPORT = /^\s*(?:import|export)\s[^;]*?\sfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

/** Every file reached by static imports from a start file (dynamic import() is left out on purpose). */
function staticGraph(start) {
  const seen = new Set(), todo = [start];
  while ( todo.length ) {
    const file = todo.pop();
    if ( seen.has(file) || !existsSync(file) ) continue;
    seen.add(file);
    const text = readFileSync(file, "utf8");
    for ( const m of text.matchAll(IMPORT) ) {
      const spec = m[1] ?? m[2];
      if ( spec.startsWith(".") ) todo.push(resolve(dirname(file), spec));
    }
  }
  return seen;
}
const rel = set => [...set].map(f => f.slice(root.length + 1));

test("Storyteller's main script does not pull in the world map grid", () => {
  const g = rel(staticGraph(join(root, "modules/wodx-storyteller/scripts/main.mjs")));
  assert.ok(g.includes("modules/wodx-storyteller/scripts/world-map.mjs"), "the window file is still loaded");
  for ( const heavy of ["modules/wodx-storyteller/scripts/world-map-rules.mjs", "modules/wodx-storyteller/data/world.mjs"] )
    assert.ok(!g.includes(heavy), `${heavy} is statically imported`);
});

test("Otherworlds' main script does not pull in the realm world maps", () => {
  const g = rel(staticGraph(join(root, "modules/wodx-otherworlds/scripts/main.mjs")));
  assert.ok(g.includes("modules/wodx-otherworlds/scripts/realm-worlds.mjs"), "the window file is still loaded");
  for ( const heavy of ["modules/wodx-otherworlds/scripts/realm-worlds-rules.mjs", "modules/wodx-otherworlds/scripts/realm-places.mjs"] )
    assert.ok(!g.includes(heavy), `${heavy} is statically imported`);
});

test("the world map loads once on first use", async () => {
  globalThis.foundry ??= {applications: {}};
  globalThis.game ??= {modules: new Map(), settings: {get: () => null}};
  const W = await import(join(root, "modules/wodx-storyteller/scripts/world-map.mjs"));
  assert.equal(W.loaded(), null);
  assert.throws(() => W.view({layer: "earth"}), /not loaded yet/);
  const [a, b] = await Promise.all([W.load(), W.load()]);
  assert.equal(a, b);
  assert.equal(W.loaded(), a);
  assert.equal(typeof a.journey, "function");
  assert.ok(a.REGION_IDS.length >= 40);
});

test("the realm world maps load once on first use", async () => {
  const R = await import(join(root, "modules/wodx-otherworlds/scripts/realm-worlds.mjs"));
  assert.equal(R.loaded(), null);
  assert.throws(() => R.mapOf({realm: "tempest"}), /not loaded yet/);
  const [a, b] = await Promise.all([R.load(), R.load()]);
  assert.equal(a, b);
  assert.equal(typeof a.build, "function");
  assert.ok(a.REALM_IDS.length > 10);
});
