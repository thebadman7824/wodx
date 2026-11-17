// Load less on players' machines (B6240-B6242, stale design desk 2026-11-15 f1). The world timeline, the future
// tables, the Threads of Fate cards and the People name lists are left out of every module's start-up imports: the
// Storyteller's client loads the timeline at start, the cards and the names load on first use, and a player's client
// reads what the Storyteller's client writes. Walks the static imports from each module's main script.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync, readdirSync} from "node:fs";
import {dirname, resolve, join} from "node:path";
import {fileURLToPath} from "node:url";
import {installMock} from "./foundry-mock.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
installMock({dataRoot: root});
const IMPORT = /^\s*(?:import|export)\s[^;]*?\sfrom\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

/** Every file reached by static imports from the start files (dynamic import() is left out on purpose). */
function staticGraph(starts) {
  const seen = new Set(), todo = [...starts];
  while ( todo.length ) {
    const file = todo.pop();
    if ( seen.has(file) || !existsSync(file) ) continue;
    seen.add(file);
    for ( const m of readFileSync(file, "utf8").matchAll(IMPORT) ) {
      const spec = m[1] ?? m[2];
      if ( spec.startsWith(".") ) todo.push(resolve(dirname(file), spec));
    }
  }
  return seen;
}
const mods = join(root, "modules");
const entries = readdirSync(mods).flatMap(m => {
  const mj = join(mods, m, "module.json");
  return existsSync(mj) ? (JSON.parse(readFileSync(mj, "utf8")).esmodules ?? []).map(e => join(mods, m, e)) : [];
});
const graph = [...staticGraph(entries)].map(f => f.slice(root.length + 1).replaceAll("\\", "/"));

const HEAVY = ["modules/wodx-chronicle/data/world-history.mjs", "modules/wodx-chronicle/data/future-events.mjs", "modules/wodx-chronicle/data/future-world.mjs",
  "modules/wodx-storyteller/data/threads-cards.mjs", "modules/wodx-creation/data/people-world.mjs", "modules/wodx-creation/data/people.mjs"];

test("no module's start-up imports pull in the large tables", () => {
  assert.ok(graph.includes("modules/wodx-chronicle/scripts/events.mjs"), "the dated events still load at start");
  assert.ok(graph.includes("modules/wodx-storyteller/scripts/threads.mjs"), "Threads of Fate still loads at start");
  assert.ok(graph.includes("modules/wodx-creation/scripts/people.mjs"), "the People window still loads at start");
  for ( const heavy of HEAVY ) assert.ok(!graph.includes(heavy), `${heavy} is statically imported`);
  for ( const f of graph ) assert.ok(!/\/data\/people-(?!order)[a-z-]+\.mjs$/.test(f), `${f}: a people's name list is statically imported`);
});

test("the world timeline loads once, and the events list grows when it does", async () => {
  const E = await import(join(root, "modules/wodx-chronicle/scripts/events.mjs"));
  assert.equal(E.loaded(), false);
  const book = E.allEvents().length;
  assert.ok(book > 0, "the book events are there before the load");
  assert.deepEqual(E.worldEras(), []);
  const [a, b] = await Promise.all([E.load(), E.load()]);
  assert.equal(a, b);
  assert.equal(E.loaded(), true);
  assert.ok(E.allEvents().length > book + 1000, "the world timeline joins the list");
  assert.ok(E.worldEras().length >= 5, "the world eras are read");
  assert.ok(E.cascades().length >= 1, "the Cascades are read");
  assert.equal(E.worldEra(1500)?.id, E.worldEras().find(e => e.from <= 1500 && e.to >= 1500)?.id);
});

test("the Threads of Fate cards load on first use", async () => {
  const T = await import(join(root, "modules/wodx-storyteller/scripts/threads.mjs"));
  const api = T.api();
  assert.equal(api.cards.length, 0, "no cards before the first use");
  const deck = await api.loadCards();
  assert.ok(deck.length > 50, "the deck is read");
  assert.equal(api.cards.length, deck.length, "the api's cards are the loaded deck");
});

test("the People tables load on first use, with the feminine family names", async () => {
  const P = await import(join(root, "modules/wodx-creation/scripts/people.mjs"));
  assert.equal(P.loaded(), null);
  assert.deepEqual(P.feminine(), {});
  const d = await P.load();
  assert.ok(d.tables.length > 500, "the name tables are read");
  assert.equal(typeof d.person, "function");
  assert.ok(Object.keys(P.feminine()).length > 3, "the feminine forms come with them");
  const PW = await import(join(root, "modules/wodx-creation/data/people-world.mjs"));
  assert.ok(PW.FAMILY_FIRST.has("chinese"), "people-world still names who puts the family name first");
});

test("an NPC household takes the feminine form once the names are handed over", async () => {
  const RS = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
  const P = await import(join(root, "modules/wodx-creation/scripts/people.mjs"));
  const fem = (await P.load()).feminine;
  const [origin, forms] = Object.entries(fem).find(([o]) => !["czech", "slovak", "german"].includes(o));
  const [male, female] = Object.entries(forms)[0];
  RS.useFeminine({});
  assert.equal(RS.kinFamily({family: male, origin}, {sex: "female", origin}), male, "without the forms the name stays");
  RS.useFeminine(fem);
  assert.equal(RS.kinFamily({family: male, origin}, {sex: "female", origin}), female);
  RS.useFeminine({});
});
