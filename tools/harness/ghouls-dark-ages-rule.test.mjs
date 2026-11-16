import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync, readdirSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6930: rule.ghoulsDarkAges is gone (it had no reader; B6744 had kept it as a record). Creation's ghoul rules take
   no era, and a world that saved the old key still reads house rules without error. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const H = (await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/house-rules.mjs")))).default;
const R = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/rules.mjs")));

test("the ghoul switch is deleted and the ghoul rules stay the Dark Ages ones in every era", () => {
  assert.equal(H.switches.find(s => s.id === "ghoulsDarkAges"), undefined, "switch removed");
  assert.ok(H.switches.some(s => s.group === "rules"), "the Rules group keeps a switch, so no empty heading");
  assert.equal(R.ghoulBloodMax(0), 10);
  assert.equal(R.ghoulBloodMax(250), 12);
  const hits = [];
  for ( const mod of readdirSync(join(root, "modules")) ) {
    for ( const sub of ["scripts", "data"] ) {
      let files = [];
      try { files = readdirSync(join(root, "modules", mod, sub)); } catch (e) { continue; }
      for ( const f of files ) if ( /\.m?js$/.test(f) && readFileSync(join(root, "modules", mod, sub, f), "utf8").includes("ghoulsDarkAges") ) hits.push(`${mod}/${sub}/${f}`);
    }
  }
  assert.deepEqual(hits, []);
  assert.doesNotMatch(readFileSync(join(root, "docs/STORYTELLER-GUIDE.md"), "utf8"), /Ghouls use V20 Dark Ages rules in every era/);
});

test("a saved world with the old rule.ghoulsDarkAges key still registers and reads house rules", async () => {
  const stored = new Map([["wodx-chronicle.rule.ghoulsDarkAges", true]]);
  const registered = new Set();
  globalThis.game = {settings: {
    register: (m, k) => registered.add(`${m}.${k}`),
    get: (m, k) => { const key = `${m}.${k}`; if ( !registered.has(key) ) throw new Error(`not registered: ${key}`); return stored.get(key) ?? false; }
  }};
  for ( const s of H.switches ) game.settings.register("wodx-chronicle", `rule.${s.id}`, {});
  const U = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/util.mjs")));
  assert.equal(U.rule("ghoulsDarkAges"), false, "an unknown stored key reads as off and does not throw");
  for ( const s of H.switches ) assert.doesNotThrow(() => U.rule(s.id));
  delete globalThis.game;
});
