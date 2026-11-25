import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* A Dark Ages mage's everyday wonders and Tass (B7927-B7930; Dark Ages: Mage pp. 190-207, Dark Ages: Fae p. 182) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const W = await imp("modules/wodx-actions/scripts/mage-wonders-rules.js");
const M = await imp("modules/wodx-actions/scripts/mage-da-rules.js");

test("B7927: every wonder is made with real Pillars of its fellowships, and each does something in play", () => {
  for ( const w of W.WONDERS ) {
    assert.ok(["charm", "elixir", "tool"].includes(w.kind), w.key);
    assert.ok(w.page >= 202 && w.page <= 207, `${w.key} p. ${w.page}`);
    assert.ok(Object.keys(w.use).length, `${w.key} has a use`);
    for ( const [f, lv] of Object.entries(w.by) ) {
      const keys = M.pillarsOf(f).map(p => p.key);
      assert.ok(keys.length, `${w.key}: ${f} is a fellowship`);
      for ( const [k, v] of Object.entries(lv) ) assert.ok(keys.includes(k) && v >= 1 && v <= 5, `${w.key}: ${f} ${k} ${v}`);
    }
  }
  assert.deepEqual(W.wondersFor("valdaermen").map(w => w.key), ["unbreakable", "strength", "weakness", "vigor"]);
  assert.ok(W.wondersFor("messianic").some(w => w.key === "sleep"));
});

test("B7927: enchanting is a casting; the local way cancels a 1; a sharp edge pierces a point per two successes", () => {
  const w = W.wonderOf("unbreakable");
  const plan = M.castPlan({levels: W.levelsFor(w, "hermes"), ratings: {primus: 1, vires: 2}, foundation: 2, fellowship: "hermes"});
  assert.deepEqual([plan.ok, plan.dice, plan.difficulty], [true, 5, 8], "complex: Modus 2 + Vires 2 + a die for Primus; 5 + 2 + 1");
  assert.equal(M.castPlan({levels: W.levelsFor(w, "hermes"), ratings: {primus: 1, vires: 1}, foundation: 2, fellowship: "hermes"}).ok, false);
  assert.equal(W.levelsFor(w, "batini"), null);
  assert.deepEqual([W.localWayOnes(2, true), W.localWayOnes(2, false), W.localWayOnes(0, true)], [1, 2, 0]);
  const out = M.castOutcome({raw: 0, ones: W.localWayOnes(1, true), successes: 0}, {});
  assert.equal(out.result, "failure", "one 1 done the local way: no Backlash");
  assert.deepEqual([0, 1, 2, 3, 5].map(W.piercingFrom), [0, 0, 1, 1, 2]);
  assert.equal(w.use.bonus, 3);
});

test("B7928: the elixirs do what the book says, on the timed effects WoDX reads", () => {
  const u = k => W.wonderOf(k).use;
  assert.deepEqual([u("strength").days, u("strength").boost.on], [3, "physical"]);
  assert.deepEqual([u("weakness").days, u("weakness").penalty], [4, 3], "bedridden four sunrises");
  assert.equal(u("vigor").after.days, 2, "then two days of rest");
  assert.ok(u("truth").fortune.tags.includes("subterfuge"));
  assert.equal(u("sleep").condition, "incapacitated");
  assert.equal(u("health").heal, "successes");
  assert.equal(u("slowrot").type, "lethal");
});

test("B7929: Tass from creatures and the fae", () => {
  assert.deepEqual(W.harvest("gluttony"), {ok: true, q: 3, page: 190, ref: W.REF, side: null, note: ""});
  assert.equal(W.harvest("white-unicorn", {wounds: 3}).q, 3);
  assert.equal(W.harvest("white-unicorn", {wounds: 0}).ok, false);
  assert.equal(W.harvest("goblin").q, 5);
  assert.equal(W.harvest("malicious-fae").q, 10, "ten biscuits of one each");
  assert.equal(W.harvest("fae", {origin: "firstborn", living: true, lastWeek: null, week: 4}).q, 5);
  assert.equal(W.harvest("fae", {origin: "firstborn", living: false}).q, 10);
  assert.equal(W.harvest("fae", {origin: "changeling", living: true, lastWeek: 4, week: 4}).ok, false, "a living fae once a week");
  assert.equal(W.harvest("fae", {origin: "changeling", living: true, lastWeek: 3, week: 4}).q, 2);
  assert.equal(W.harvest("fae", {origin: "inanimae", taken: true}).ok, false);
  assert.equal(W.harvest("sloth").ok, false);
  assert.ok(W.NO_TASS.includes("ghost"));
});

test("B7927-B7930: wiring", () => {
  const h = src("modules/wodx-actions/scripts/mage-household.js"), d = src("modules/wodx-actions/scripts/mage-da.js"), m = src("modules/wodx-actions/scripts/main.js");
  assert.match(h, /\["enchant", "Enchant a wonder/);
  assert.match(h, /enchant: WX\.enchant, use: WX\.useWonder, tass: WX\.tass/);
  assert.match(d, /HH\.build\(ctx, \{ info, backlash: \{/);
  assert.match(m, /MXD\.build\(\{[^}]*setDamage, applyDamage/);
  const shared = src("modules/wodx-actions/scripts/mage-wonders.js") + src("modules/wodx-actions/scripts/mage-wonders-rules.js");
  assert.ok(!/Rothenstein|Voss/.test(shared));
  assert.ok(!/—/.test(shared));
  assert.ok(!/\b(he|she|his|her|him)\b/i.test(shared.replace(/heal|here|her[a-z]/gi, "")));
});
