import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Ownership, holdings, recipes, buildings and workshops (Storyteller 0.27.0, B850-B856) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const O = await imp("modules/wodx-storyteller/scripts/owner-rules.mjs");
const CR = await imp("modules/wodx-storyteller/scripts/craft-rules.mjs");
const B = await imp("modules/wodx-storyteller/scripts/build-rules.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const G = await imp("modules/wodx-library/data/goods.mjs");
const MR = await imp("modules/wodx-storyteller/scripts/money-rules.mjs");

test("owner records: actor, faction, a name only; junk is nobody", () => {
  assert.equal(O.normOwner(null), null);
  assert.equal(O.normOwner({}), null);
  assert.equal(O.normOwner({id: "Actor.a1", name: "Anna"}).kind, "actor");
  assert.equal(O.normOwner({id: "faction:f1", name: "Tanners"}).kind, "faction");
  assert.equal(O.normOwner({name: "Old Jakub"}).kind, "name");
  assert.equal(O.normOwner({id: "Actor.a1", held: "nonsense"}).held, "");
});

test("whose: yours, someone's, or nothing; factions count for their members", () => {
  const me = {ids: ["Actor.a1"], factions: ["f1"], names: ["Anna Novak"]};
  assert.equal(O.whose(null, me), "");
  assert.equal(O.whose({id: "Actor.a1"}, me), "yours");
  assert.equal(O.whose({id: "Actor.b2"}, me), "someone's");
  assert.equal(O.whose({id: "faction:f1", name: "Tanners"}, me), "yours");
  assert.equal(O.whose({name: "anna novak"}, me), "yours");
});

test("taken without leave is stolen; the owner taking it back is not", () => {
  const rec = {id: "Actor.b2", name: "Bertold"};
  const s = O.markTaken(rec, {id: "Actor.a1", name: "Anna"}, 99);
  assert.equal(s.stolen, true);
  assert.equal(s.id, "Actor.b2");
  assert.equal(s.takenByName, "Anna");
  assert.equal(O.markTaken(s, {id: "Actor.b2", name: "Bertold"}).stolen, false);
  const sold = O.handOver(s, {id: "Actor.c3", name: "Fence"}, {year: 1450});
  assert.equal(sold.stolen, false);
  assert.equal(sold.id, "Actor.c3");
  assert.equal(sold.since, 1450);
});

test("a typed owner name links to the one actor or faction it names", () => {
  const c = [{id: "Actor.a1", name: "Jakub the Smith", kind: "actor"}, {id: "Actor.a2", name: "Jakub Novak", kind: "actor"}, {id: "faction:t", name: "The Tanners' Guild", kind: "faction"}];
  assert.equal(O.matchName("Master Jakub Novak", c)?.id, "Actor.a2");
  assert.equal(O.matchName("Jakub", c), null, "two matches link to nobody");
  assert.equal(O.fromPlaceTag({owner: "Tanners' Guild"}, c).id, "faction:t");
  assert.equal(O.fromPlaceTag({owner: "Nobody Known"}, c).kind, "name");
});

test("how a place is held follows the age in Moravia", () => {
  assert.equal(O.defaultTenure(1250, "home"), "burgher");
  assert.equal(O.defaultTenure(1250, "castle"), "fief");
  assert.equal(O.defaultTenure(1400, "castle"), "landtable");
  assert.equal(O.defaultTenure(1890, "workplace"), "deed");
  assert.equal(O.defaultTenure(1960, "home"), "personal");
  assert.equal(O.defaultTenure(1960, "workplace"), "allotted");
  assert.equal(O.defaultTenure(1995, "home"), "registry");
  assert.equal(O.defaultTenure(2060, "workplace"), "corporate");
  assert.equal(O.defaultTenure(1700, "home", {supernatural: true}), "front");
  assert.equal(O.defaultTenure(1300, "church"), "church");
  for ( const y of [1197, 1348, 1600, 1848, 1849, 1948, 1989, 1990, 2023, 2099] ) {
    const list = O.tenuresAt(y, "home");
    assert.ok(list.length >= 2, `forms open in ${y}`);
    assert.ok(list.some(t => t.key === O.defaultTenure(y, "home")), `the default is open in ${y}`);
  }
  assert.equal(O.tradeRightAt(1500).ok, true);
  assert.match(O.tradeRightAt(1500).how, /guild/);
  assert.equal(O.tradeRightAt(1970).ok, false);
  assert.equal(O.tradeRightAt(1995).ok, true);
});

test("recipes: the year decides what can be made", () => {
  const find = n => G.GOODS.find(g => g.name === n);
  const known = y => G.GOODS.filter(g => y >= g.from && y <= g.to).map(g => g.name);
  const nail = find("an iron nail");
  const r = CR.recipeFor(nail, 1300, {valueAt: G.valueAt, known: known(1300)});
  assert.equal(r.ok, true);
  assert.equal(r.task.ability, "crafts");
  assert.equal(r.task.workshop, "forge");
  assert.ok(r.task.materials.includes("a bar of iron"));
  const jeans = find("a pair of jeans");
  assert.equal(CR.recipeFor(jeans, 1300, {valueAt: G.valueAt}).ok, false, "not before it is known");
  const cloak = find("a folded wool cloak");
  const old = CR.recipeFor(cloak, 2023, {valueAt: G.valueAt});
  assert.equal(old.ok, true, "a hand craft can still make it the old way");
  assert.equal(old.task.diff, CR.recipeFor(cloak, 1300, {valueAt: G.valueAt}).task.diff + 1);
  const coin = G.GOODS.find(g => g.kind === "coin");
  assert.equal(CR.recipeFor(coin, 1500, {valueAt: G.valueAt}).ok, false);
  const shoes = find("a pair of leather shoes");
  assert.ok(CR.recipeFor(shoes, 1500, {valueAt: G.valueAt, known: known(1500)}).task.materials.includes("a tanned hide"));
});

test("recipes for every era: something can be made in each, and every category has a craft or a reason", () => {
  for ( const k of Object.keys(G.KINDS) ) assert.ok(CR.CRAFTS[k] || CR.NOT_MADE[k], `category ${k}`);
  for ( const y of [1197, 1400, 1550, 1700, 1870, 1916, 1960, 1995, 2004, 2050, 2099] ) {
    const n = G.GOODS.filter(g => CR.recipeFor(g, y, {valueAt: G.valueAt}).ok).length;
    assert.ok(n > 50, `${n} things can be made in ${y}`);
  }
  for ( const [k] of Object.entries(CR.CRAFTS) ) for ( const [w] of CR.CRAFTS[k].shop ) assert.ok(w === "" || T.WORKSHOPS[w], `workshop ${w}`);
});

test("materials: carried first, bought when asked, else missing", () => {
  const g = CR.gatherMaterials(["a bar of iron", "a seasoned timber plank"], ["Bar of iron", "rope"]);
  assert.deepEqual(g.take, ["Bar of iron"]);
  assert.deepEqual(g.missing, ["a seasoned timber plank"]);
  assert.deepEqual(CR.gatherMaterials(["a seasoned timber plank"], [], {buy: true}).buy, ["a seasoned timber plank"]);
});

test("quality from extra successes", () => {
  assert.equal(CR.qualityFor(0).key, "plain");
  assert.equal(CR.qualityFor(2).key, "good");
  assert.equal(CR.qualityFor(5).key, "fine");
  assert.equal(CR.qualityFor(9).key, "master");
});

test("buildings for every era, with kit keys the map generator knows", () => {
  for ( const y of [1197, 1300, 1450, 1600, 1750, 1870, 1916, 1935, 1960, 1995, 2004, 2030, 2050, 2099] ) {
    const list = B.buildingsAt(y);
    assert.ok(list.length >= 3, `${list.length} kinds in ${y}`);
    assert.ok(list.some(b => b.place === "home"), `a home can be built in ${y}`);
  }
  const py = src("tools/mapgen/buildings.py") + src("tools/mapgen/eratypes.py");
  for ( const k of B.KIT_KEYS ) assert.ok(py.includes(`"${k}"`), `kit ${k} is a map generator type`);
  for ( const b of Object.values(B.BUILDINGS) ) {
    assert.ok(B.METHODS[B.methodAt(b, Math.max(b.from, 1197))], b.label);
    for ( const w of Object.keys(B.WORKS) ) assert.ok(B.BUILDINGS[w], w);
  }
});

test("a build task: stages, costs that add up, years enforced", () => {
  const wage = MR.wageAt(1400);
  const r = B.buildTask("smithy", 1400, {wage, workers: 3});
  assert.equal(r.ok, true);
  const t = r.task;
  assert.equal(t.kind, "build");
  assert.equal(t.stages.length, 4);
  assert.equal(t.stages.reduce((s, x) => s + x.cost, 0), t.cost);
  assert.equal(t.cost, Math.round(24 * wage));
  assert.equal(B.buildTask("panel-block", 1400, {wage}).ok, false);
  assert.equal(B.buildTask("keep", 1700, {wage}).ok, false);
  assert.equal(B.buildTask("nothing", 1400).ok, false);
  assert.equal(B.buildTask("smithy", 1400, {workers: 99}).task.workers, B.MAX_WORKERS);
});

test("a building moves stage by stage and finishes only at the last", () => {
  const base = T.normTask({...B.buildTask("cottage", 1300, {wage: 100}).task, id: "t1", started: 0});
  assert.equal(base.stages.length, 4);
  let t = base;
  const win = {successes: 50, botch: false};
  for ( let i = 0; i < 3; i++ ) {
    t = T.stepTask(t, win, t.next);
    assert.equal(t.status, "open", `stage ${i + 1} done, more to come`);
    assert.equal(t.stage, i + 1);
    assert.equal(t.total, 0);
    assert.equal(t.goal, base.stages[i + 1].goal);
  }
  t = T.stepTask(t, win, t.next);
  assert.equal(t.status, "done");
  const kept = T.normTask(t);
  assert.equal(kept.building, "cottage");
  assert.equal(kept.stages.length, 4);
  const craft = T.normTask({kind: "craft", good: "an-iron-nail", materials: ["a bar of iron"], spent: ["a bar of iron"], quality: "good"});
  assert.deepEqual(craft.spent, ["a bar of iron"]);
  assert.equal(T.normTask({kind: "craft"}).stages.length, 0, "a plain task has no stages");
});

test("holding money: value, upkeep and income from the kind and the wage", () => {
  const m = B.holdingMoney("tavern", 1000);
  assert.equal(m.value, 60000);
  assert.equal(m.upkeep, 600);
  assert.equal(m.income, 1200);
  assert.equal(B.holdingMoney("cottage", 1000).income, 0);
  assert.equal(B.holdingMoney("cottage", 1000, {upkeep: 5}).upkeep, 5);
});

test("wiring: owners in the Storyteller, the take hook in Interactables, no dots from owning", () => {
  const own = src("modules/wodx-storyteller/scripts/owners.mjs");
  const main = src("modules/wodx-storyteller/scripts/main.mjs");
  const ix = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(ix, /Hooks\.callAll\("wodxItemsTaken"/);
  assert.match(ix, /owners\?\.whose/);
  assert.match(own, /Hooks\.on\("wodxItemsTaken"/);
  assert.match(main, /owners: \{open: Own\.propertyDialog/);
  assert.match(main, /Own\.registerApproval\(\)/);
  assert.match(src("modules/wodx-storyteller/scripts/money.mjs"), /Own\.payHoldings/);
  assert.match(src("modules/wodx-storyteller/scripts/tasks.mjs"), /Own\.finishBuild/);
  assert.doesNotMatch(own, /system\.backgrounds|backgrounds\.[a-z]+\.value\s*=/, "owning never writes Background dots");
});
