import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Fill a container by place and era (Interactables 0.17.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const F = await imp("modules/wodx-interactables/scripts/fill-rules.mjs");
const gear = JSON.parse(src("modules/wodx-library/data/gear.json")).items;
const seq = (...v) => { let i = 0; return () => v[i++ % v.length]; };

test("fill: siege guns, ship armour and parries are never drawn", () => {
  for ( const it of gear ) {
    const k = String(it.flags["wodx-library"].kind ?? "");
    if ( /heavy|ship|crew-served|parry/.test(k) ) assert.equal(F.categoryOf(it), null, it.name);
  }
});

test("fill: a draw keeps to the era and the place", () => {
  const got = F.draw(gear, {era: "dark-ages", place: "armory", container: "chest", count: 6, rng: seq(0.1, 0.5, 0.9, 0.3)});
  assert.equal(got.length, 6);
  assert.equal(new Set(got.map(g => g.name)).size, 6);
  for ( const g of got ) assert.ok(g.flags["wodx-library"].eras.includes("dark-ages"), g.name);
  const church = F.draw(gear, {era: "dark-ages", place: "church", count: 12});
  for ( const g of church ) assert.equal(F.categoryOf(g), "melee");
  const clinic = F.draw(gear, {era: "dark-ages", place: "clinic", count: 4});
  for ( const g of clinic ) assert.notEqual(F.categoryOf(g), "cyber");
});

test("fill: a small container takes only small things", () => {
  const got = F.draw(gear, {era: "modern", place: "armory", container: "safe", count: 12});
  assert.ok(got.length > 0);
  for ( const g of got ) assert.ok(F.fits(g, "safe"), g.name);
  for ( const g of got ) assert.ok(!["armor", "shield"].includes(F.categoryOf(g)));
});

test("fill: kept links join the list once", () => {
  assert.equal(F.mergeLines("A\nB", ["B", "C"]), "A\nB\nC");
  assert.equal(F.mergeLines("", ["X"]), "X");
});

test("fill: the button, the review and the wiring", () => {
  const s = src("modules/wodx-interactables/scripts/fill.mjs");
  assert.match(s, /if \( !game\.user\.isGM \) return null;/);
  assert.match(s, /Draw again/);
  assert.match(s, /data-fixed/);
  const m = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(m, /data-wix-fill/);
  assert.match(m, /fill: \{open: Fill\.fillDialog/);
});

test("fill: the place starts from the container's own setting, then its region, then the scene", () => {
  assert.deepEqual(F.placeGuess({own: "armory", regions: ["church"], scene: "home"}), {place: "armory", from: "own"});
  assert.deepEqual(F.placeGuess({own: "nonsense", regions: ["street", "church"], scene: "home"}), {place: "church", from: "region"});
  assert.deepEqual(F.placeGuess({regions: ["caern"], scene: "gate"}), {place: "armory", from: "scene"});
  assert.deepEqual(F.placeGuess({regions: ["street"], scene: "other"}), {place: "home", from: null});
  assert.deepEqual(F.placeGuess(), {place: "home", from: null});
  for ( const v of Object.values(F.FROM_NPC_PLACE) ) assert.ok(v === null || F.PLACES[v], v);
});

test("fill: the runtime reads the place tag of the region a container sits in, the smallest first", async () => {
  globalThis.canvas = null;
  const Fi = await imp("modules/wodx-interactables/scripts/fill.mjs");
  const region = (name, kind, x, y, w, h) => ({name, flags: {"wodx-npc": {place: {kind}}}, shapes: [{width: w, height: h}],
    testPoint: p => p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h});
  const scene = {name: "Steading", flags: {"wodx-npc": {place: {kind: "wilds"}}},
    regions: {contents: [region("Yard", "street", 0, 0, 1000, 1000), region("Longhouse", "home", 100, 100, 300, 200), region("Chapel", "church", 600, 600, 100, 100)]}};
  const tile = (x, y, flags = {}) => ({parent: scene, x, y, width: 50, height: 50, flags: {"wodx-interactables": flags}});
  assert.deepEqual(Fi.guessFor(tile(150, 150)), {place: "home", from: "region", name: "Longhouse"});
  assert.deepEqual(Fi.guessFor(tile(620, 620)), {place: "church", from: "region", name: "Chapel"});
  assert.deepEqual(Fi.guessFor(tile(800, 100)), {place: "camp", from: "scene", name: "Steading"});
  assert.equal(Fi.guessFor(tile(150, 150, {fillPlace: "den"})).place, "den");
  assert.equal(Fi.guessFor(tile(150, 150, {fillPlace: "den"}), null).place, "home", "the form's blank choice wins over the saved one");
});

/* Everyday goods by era (Library data/goods.mjs; Interactables 0.21.0) */
const G = await imp("modules/wodx-library/data/goods.mjs");

test("goods: every row has a known kind, a real era range, and a weight somewhere", () => {
  const names = new Set();
  for ( const g of G.GOODS ) {
    assert.ok(G.KINDS[g.kind], `${g.name}: kind ${g.kind}`);
    assert.ok(g.eras.length, `${g.name}: no eras`);
    assert.ok(!names.has(g.name), `${g.name}: twice`);
    names.add(g.name);
    assert.ok(Object.values(G.PLACE_WEIGHTS).some(w => w[g.kind] > 0), g.kind);
  }
  for ( const p of Object.keys(G.PLACE_WEIGHTS) ) assert.ok(F.PLACES[p], `goods place ${p} is not a fill place`);
  for ( const p of Object.keys(F.PLACES) ) assert.ok(G.PLACE_WEIGHTS[p], `fill place ${p} has no goods weights`);
});

test("goods: every era Chronicle knows has food, light and money, except the prologues' money", () => {
  const eras = JSON.parse(src("modules/wodx-chronicle/data/eras.json")).profiles.map(p => p.id);
  for ( const e of eras ) {
    assert.ok(G.ERAS.includes(e), `era ${e} missing from goods`);
    for ( const k of ["food", "light", "tools", "cloth"] ) assert.ok(G.GOODS.some(g => g.kind === k && g.eras.includes(e)), `${e} has no ${k}`);
  }
  assert.ok(G.GOODS.some(g => g.eras.includes("wild-west") && /ale/.test(g.name)), "the Wild West shares the Victorian goods");
});

test("goods: a mixed draw keeps to the era, and a small container takes small goods only", () => {
  const got = F.drawMixed({items: gear, goods: G.GOODS, weights: G.PLACE_WEIGHTS, what: "both", era: "dark-ages", place: "home", container: "chest", count: 12, rng: seq(0.05, 0.6, 0.35, 0.9, 0.2)});
  assert.equal(got.length, 12);
  for ( const g of got ) {
    const src_ = g.goods ? G.GOODS.find(x => x.name === g.name) : gear.find(x => x.name === g.name);
    assert.ok((src_.eras ?? src_.flags["wodx-library"].eras).includes("dark-ages"), g.name);
    assert.ok(g.line, g.name);
  }
  const box = F.drawMixed({goods: G.GOODS, weights: G.PLACE_WEIGHTS, what: "goods", era: "modern", place: "den", container: "box", count: 12});
  assert.ok(box.length > 0);
  for ( const g of box ) assert.ok(G.GOODS.find(x => x.name === g.name).small, g.name);
  assert.equal(F.drawMixed({items: gear, goods: G.GOODS, weights: G.PLACE_WEIGHTS, what: "gear", era: "modern", count: 5}).filter(g => g.goods).length, 0);
  assert.equal(F.drawMixed({items: gear, goods: G.GOODS, weights: G.PLACE_WEIGHTS, what: "goods", era: "modern", count: 5}).filter(g => !g.goods).length, 0);
});

test("goods: names are plain text, gender-neutral, with no long dashes", () => {
  for ( const g of G.GOODS ) {
    assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(g.name), g.name);
    assert.ok(!/[—–]/.test(g.name), g.name);
    assert.ok(!/[<>]/.test(g.name), g.name);
  }
});

/* Era item lists: every good is tagged with category, era, value, behaviour, uses and concealment */
test("goods: every good carries its backend tags", () => {
  const ids = new Set();
  for ( const g of G.GOODS ) {
    assert.ok(G.KINDS[g.kind], `${g.name}: category ${g.kind}`);
    assert.equal(g.tags.category, g.kind, g.name);
    assert.ok(g.tags.era.length, `${g.name}: no era tag`);
    assert.ok(g.from <= g.to && g.to <= 2099, `${g.name}: years ${g.from}-${g.to}`);
    for ( const e of g.eras ) assert.ok(Number.isInteger(g.values[e]) && g.values[e] >= 0 && g.values[e] <= 5, `${g.name}: value in ${e}`);
    assert.ok(G.VALUES[g.value], `${g.name}: value ${g.value}`);
    assert.ok(G.SOURCES[g.source], `${g.name}: source ${g.source}`);
    assert.ok(G.CONCEAL[g.conceal], `${g.name}: conceal ${g.conceal}`);
    assert.equal(g.small, g.conceal === "P" || g.conceal === "J", g.name);
    assert.ok(G.BEHAVIOURS[g.use] && typeof g.stacks === "boolean", `${g.name}: behaviour`);
    assert.ok(g.uses.length && g.tags.uses === g.uses, `${g.name}: uses`);
    assert.ok(!ids.has(g.id), `${g.id}: twice`);
    ids.add(g.id);
  }
  for ( const [k, [use, stacks, sheet, uses]] of Object.entries(G.KIND_BEHAVIOUR) ) {
    assert.ok(G.KINDS[k] && G.BEHAVIOURS[use] && typeof stacks === "boolean" && sheet && uses.length, k);
    assert.ok(G.GOODS.some(g => g.kind === k), `${k}: no goods`);
  }
  for ( const k of Object.keys(G.KINDS) ) assert.ok(G.KIND_BEHAVIOUR[k], `${k}: no behaviour`);
  for ( const n of [...Object.keys(G.BEHAVIOUR_OVERRIDES), ...Object.keys(G.USES_OVERRIDES)] ) assert.ok(G.GOODS.some(g => (g.former ?? g.name) === n), `override for unknown good ${n}`);
  for ( const c of Object.values(G.GEAR_CATEGORIES) ) assert.ok(G.BEHAVIOURS[c.use] && c.uses.length, c.label);
});

test("goods: era years match Chronicle, and every era from 1197 on has every category", () => {
  for ( const p of JSON.parse(src("modules/wodx-chronicle/data/eras.json")).profiles ) {
    if ( p.start == null ) continue;
    assert.deepEqual(G.ERA_YEARS[p.id], [p.start, p.end], p.id);
  }
  const since = {power: 1837};
  for ( const e of G.ERAS.filter(e => G.ERA_YEARS[e][0] >= 1197) )
    for ( const k of Object.keys(G.KINDS) ) {
      if ( since[k] && G.ERA_YEARS[e][1] < since[k] ) continue;
      assert.ok(G.GOODS.some(g => g.kind === k && g.eras.includes(e)), `${e} has no ${k}`);
    }
});

test("goods: values change over the centuries, and behaviour comes from the category unless a good differs", () => {
  const nutmeg = G.GOODS.find(g => g.name === "a whole nutmeg");
  assert.equal(nutmeg.values["dark-ages"], 3);
  assert.equal(nutmeg.values["victorian"], 0);
  const bible = G.GOODS.find(g => g.name === "a family Bible with names inside the cover");
  assert.deepEqual([bible.values.renaissance, bible.values.victorian, bible.values.modern], [4, 2, 1]);
  assert.equal(G.valueAt(bible, 1700), 2);
  assert.ok(bible.uses.includes("pray with") && bible.uses.includes("read"));
  assert.equal(G.GOODS.find(g => g.name === "a tallow candle").stacks, true);
  assert.equal(G.GOODS.find(g => g.name === "a storm lantern").use, "lit");
  assert.equal(G.GOODS.find(g => g.name === "an iron door key").kind, "keys");
  assert.equal(G.GOODS.find(g => g.name === "a cigarette").kind, "drugs");
  assert.equal(G.KINDS.coin, "Currency");
});

test("goods are single things that stack, never piles", async () => {
  const pile = /^(a few|a handful|some|several|a pile|a heap|a stack of|a purse of|a bag of (mixed )?coins)\b/i;
  for ( const g of G.GOODS ) {
    assert.ok(!pile.test(g.name), `${g.name} is a pile`);
    if ( g.stack ) assert.ok(g.stack.min >= 1 && g.stack.max >= g.stack.min, g.name);
    if ( g.stack?.max > 1 ) assert.ok(g.stack.plural, g.name);
  }
  for ( const [name] of Object.entries(G.STACK_SIZES) ) assert.ok(G.GOODS.some(g => g.name === name || g.former === name), `stack size for missing ${name}`);
  const coin = G.GOODS.find(g => g.name === "a bronze coin");
  assert.equal(coin.stacks, true);
  assert.deepEqual(coin.stack, {plural: "bronze coins", min: 2, max: 12});
  const grain = G.GOODS.find(g => g.name === "grain");
  assert.equal(grain.container, "a sack");
  assert.equal(grain.former, "a sack of grain");
  assert.equal(grain.id, "a-sack-of-grain", "the id stays the same, so old marks and items still match");
  assert.equal(G.stackLine(grain, 1), "grain (in a sack)");
  assert.equal(G.stackLine(grain, 3), "grain (in 3 sacks)");
  assert.equal(F.goodsLine(grain, () => 0.999), `grain (in ${grain.stack.max} sacks)`);
  assert.deepEqual(G.readLine("grain (in 3 sacks)"), {name: "grain", count: 3});
  assert.equal(G.stackLine(coin, 7), "7 bronze coins");
  assert.equal(G.stackLine(coin, 1), "a bronze coin");
  assert.equal(F.goodsLine(coin, () => 0), "2 bronze coins");
  assert.equal(F.goodsLine(coin, () => 0.999), "12 bronze coins");
  assert.equal(F.goodsLine({name: "a storm lantern", stack: null}, () => 0.5), "a storm lantern");
});

test("goods name the thing, not its container (Ben, 2026-11-11)", () => {
  const re = new RegExp(`^an? (${G.CONTAINER_WORDS.join("|")}) of `);
  for ( const g of G.GOODS ) {
    if ( !G.CONTAINER_KEEP.has(g.name) ) assert.ok(!re.test(g.name), `${g.name} still names its container`);
    if ( g.container ) assert.ok(g.former && g.former.endsWith(` of ${g.name}`), g.name);
  }
  const names = G.GOODS.map(g => g.name);
  assert.equal(new Set(names).size, names.length, "no two goods share a name after the split");
  assert.equal(G.GOODS.find(g => g.name === "a can of pepper spray")?.container, null);
  const claret = G.GOODS.find(g => g.name === "claret");
  assert.equal(claret.container, "a bottle");
  assert.equal(claret.tags.container, "a bottle");
});

