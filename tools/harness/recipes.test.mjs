import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Recipes for food, drink, medicine and drugs (Library 0.10.0, Storyteller 0.31.0, B947-B952) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const G = await imp("modules/wodx-library/data/goods.mjs");
const R = await imp("modules/wodx-library/scripts/recipe-rules.mjs");
const T = await imp("modules/wodx-storyteller/scripts/tasks-rules.mjs");
const good = n => G.GOODS.find(g => g.name === n);
const yearOf = g => Math.min(g.to, Math.max(g.from, 1990));

test("recipes: every consumable has a method, or is raw, or comes from a factory", () => {
  const scope = G.GOODS.filter(R.inScope);
  assert.ok(scope.length > 500, `only ${scope.length} in scope`);
  const left = [];
  let made = 0;
  for ( const g of scope ) {
    const m = R.methodFor(g, yearOf(g));
    if ( m.method ) made++;
    else if ( !m.raw && !m.factory ) left.push(`${g.name}: ${m.why}`);
  }
  assert.deepEqual(left, []);
  assert.ok(made > 350, `only ${made} goods have a method`);
});

test("recipes: every method makes at least one good, and every group it uses has members in its time", () => {
  for ( const m of R.METHODS ) {
    const hits = G.GOODS.filter(g => (m.kinds ?? ["food"]).includes(g.kind) && (m.catch || m.makes.test(g.name)));
    assert.ok(hits.length, `${m.key} makes nothing`);
    assert.ok(R.FAMILIES[m.family], `${m.key}: family ${m.family}`);
    assert.ok(R.KITS[m.kit ?? R.FAMILIES[m.family].kit], `${m.key}: kit`);
    for ( const g of hits.slice(0, 20) ) {
      const r = R.recipeOf(g, yearOf(g));
      if ( !r.ok || r.recipe.key !== m.key ) continue;
      for ( const n of r.recipe.needs ) {
        assert.ok(R.GROUPS[n.group], `${m.key}/${g.name}: no group ${n.group}`);
        const y = yearOf(g);
        assert.ok(G.GOODS.some(x => R.GROUPS[n.group].re.test(R.cleanName(x.name)) && x.from <= y), `${g.name} (${m.key}): nothing for ${n.group} by ${y}`);
      }
    }
  }
  for ( const [k, gr] of Object.entries(R.GROUPS) ) assert.ok(R.membersOf(k, G.GOODS).length, `group ${k} is empty`);
});

test("recipes: era decides the method and the kit; raw things are not made", () => {
  assert.equal(R.methodFor(good("laudanum"), 1700).method.key, "laudanum");
  assert.match(R.methodFor(good("morphine"), 1800).why, /until about 1827/);
  assert.equal(R.methodFor(good("an apple"), 1300).raw, true);
  assert.equal(R.methodFor(good("cola"), 1990).factory, true);
  assert.equal(R.methodFor(good("ale"), 1250).method.key, "ale");
  assert.equal(R.recipeOf(good("ale"), 1250).recipe.wait, 7);
  assert.equal(R.kitReady("laboratory", {year: 1500}).ok, false);
  assert.equal(R.kitReady("laboratory", {year: 1700, sceneKits: ["laboratory"]}).ok, true);
  assert.equal(R.kitReady("herbal", {year: 1700, sceneKits: ["laboratory"]}).ok, true, "a laboratory has a herbalist's table");
  assert.equal(R.kitReady("kitchen", {carried: ["an iron cooking pot", "flint and steel with tinder"]}).ok, true);
  assert.equal(R.kitReady("kitchen", {carried: ["an iron cooking pot"]}).ok, false, "a pot needs a fire");
  assert.equal(R.kitForm("kitchen", 1250), "a hearth and a pot");
  assert.equal(R.kitForm("kitchen", 1925), "an electric stove");
});

test("recipes: a dish asks for what its name says", () => {
  const groups = n => R.recipeOf(good(n), 1990).recipe.needs.map(x => x.group);
  assert.ok(groups("fish soup").includes("fish"));
  assert.ok(groups("a fruit pancake").includes("fruit") && groups("a fruit pancake").includes("flour"));
  assert.ok(groups("ale").includes("malt") && groups("ale").includes("leaven"));
  assert.deepEqual(groups("gin").sort(), ["juniper", "wash"]);
});

test("recipes: knowing a recipe by dots, a book or a teacher", () => {
  const rec = R.recipeOf(good("morphine"), 1900).recipe;
  assert.equal(R.knows(rec, {abilities: {science: 2}}).ok, false);
  assert.equal(R.knows(rec, {abilities: {science: 4}}).ok, true);
  assert.equal(R.knows(rec, {abilities: {medicine: 4}}).how, "dots", "Medicine serves too");
  assert.equal(R.knows(rec, {known: ["morphine"]}).how, "taught");
  const herb = R.recipeOf(good("belladonna drops"), 1600).recipe;
  assert.equal(R.knows(herb, {carried: ["a herbal with drawings"]}).how, "book");
  assert.equal(R.knows(herb, {abilities: {hearthwisdom: 3}}).ok, true, "Hearth Wisdom serves in Dark Ages");
  assert.equal(R.bestAbility(herb, {medicine: 1, herbalism: 3}).key, "herbalism");
});

test("recipes: a batch uses more and takes longer, but less than one at a time", () => {
  const rec = R.recipeOf(good("ale"), 1250).recipe;
  const carried = [{id: "a", name: "malt (in a sack)", qty: 3}, {id: "b", name: "barley", qty: 5}, {id: "c", name: "yeast (in a bag)", qty: 1}];
  const one = R.planBatch(rec, carried, 1);
  assert.deepEqual(one.missing, []);
  assert.deepEqual(one.take.map(t => [t.id, t.n]), [["a", 2], ["c", 1]]);
  const four = R.planBatch(rec, carried, 4);
  assert.deepEqual(four.missing.map(m => [m.group, m.n]), [["leaven", 3]]);
  assert.equal(four.take.filter(t => t.group === "malt").reduce((s, t) => s + t.n, 0), 8);
  assert.equal(R.batchGoal(3, 1), 3);
  assert.equal(R.batchGoal(3, 4), 8);
  assert.ok(R.batchGoal(3, 10) < 30);
});

test("recipes: everyday cooking needs no roll when the pool is enough; Kindred cook harder by taste", () => {
  const stew = R.recipeOf(good("vegetable soup"), 1300).recipe;
  assert.equal(R.noRoll(stew, 6, 6), true);
  assert.equal(R.noRoll(stew, 5, 6), false);
  assert.equal(R.noRoll(R.recipeOf(good("morphine"), 1900).recipe, 10, 7), false, "drugs always roll");
  assert.equal(R.diffFor(stew, {line: "vampire", abilityValue: 2}), 7);
  assert.equal(R.diffFor(stew, {line: "vampire", abilityValue: 3}), 6);
  assert.equal(R.diffFor(stew, {line: "mortal", abilityValue: 0}), 6);
});

test("recipes: strength from successes past the goal; the long task keeps the recipe's fields", () => {
  assert.equal(R.strengthFor(0).key, "weak");
  assert.equal(R.strengthFor(2).key, "usual");
  assert.equal(R.strengthFor(5).key, "strong");
  const rec = R.recipeOf(good("laudanum"), 1700).recipe;
  const t = T.normTask(R.taskFor(rec, {batch: 3, ability: "medicine", diff: 6, spent: ["1 a lump of opium"]}));
  assert.equal(t.kind, "craft");
  assert.equal(t.recipe, "laudanum");
  assert.equal(t.batch, 3);
  assert.equal(t.wait, 14);
  assert.equal(t.strength, true);
  assert.equal(t.delicate, false, "a botched drug is impure, not ruined");
  assert.equal(t.goal, R.batchGoal(rec.goal, 3));
  assert.ok(T.WORKSHOPS[R.taskFor(R.recipeOf(good("ale"), 1250).recipe).workshop] !== undefined);
  assert.equal(R.waitingName("ale", "fermenting"), "ale (fermenting)");
  assert.equal(R.cleanName("3 ale (fermenting) (good work)"), "ale");
});

test("recipes: wiring in Storyteller and Library", () => {
  const ck = src("modules/wodx-storyteller/scripts/cookery.mjs");
  assert.match(ck, /export async function ripen/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /cookery: Cook\.cookApi\(\)/);
  assert.match(src("modules/wodx-storyteller/scripts/tasks.mjs"), /Cook\.finishRecipe/);
  assert.match(src("modules/wodx-library/scripts/use.mjs"), /case "cook":/);
  assert.match(src("modules/wodx-storyteller/scripts/owners.mjs"), /action: "cook", label: "Cook, brew or mix"/);
});

test("take apart: tools and lamps give metal by era, electronics give scrap, food gives nothing", () => {
  const opt = {goods: G.GOODS, valueAt: G.valueAt};
  const crowbar = R.salvageOf(good("a crowbar"), 1990, opt);
  assert.equal(crowbar.ok, true);
  assert.equal(crowbar.parts[0].name, "steel bar stock");
  const old = G.GOODS.find(g => g.kind === "tools" && /hammer/.test(g.name) && g.from < 1300);
  assert.equal(R.salvageOf(old, 1300, opt).parts[0].name, "iron bar stock");
  assert.equal(R.salvageOf(good("ale"), 1300, opt).ok, false);
  assert.equal(R.salvageOf(good("a silver penny"), 1300, opt).ok, false);
  const n = G.GOODS.filter(g => R.salvageOf(g, Math.min(g.to, Math.max(g.from, 1990)), opt).ok).length;
  assert.ok(n > 100, `only ${n} can be taken apart`);
  for ( const [k, names] of Object.entries(R.PART_CHOICES ?? {}) ) for ( const nm of names ) assert.ok(good(nm), `${k}: ${nm} is not a good`);
});

test("take apart: a tool in hand, V20 successes", () => {
  assert.equal(R.apartTool("any", ["a pocket knife"]).ok, true);
  assert.equal(R.apartTool("any", ["an apple"]).ok, false);
  assert.equal(R.apartTool("technology", ["a pocket knife"]).ok, false);
  assert.equal(R.apartTool("any", ["an odd thing"], () => ["pries"]).ok, true, "a quality serves");
  assert.deepEqual(R.successes([7, 8, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(R.successes([1, 3, 4], 6), {successes: 0, botch: true});
  assert.deepEqual(R.successes([2, 3], 6), {successes: 0, botch: false});
});
