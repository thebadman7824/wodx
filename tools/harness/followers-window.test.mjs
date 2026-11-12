import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Improvement desk fo1 and cw1 (WoDX NPC 0.41.0, Library 0.16.0, Sheets 0.12.0): the Followers window and descriptions that spread */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const FR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/followers-rules.mjs")));
const W = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/wanted-rules.mjs")));
const L = await import(pathToFileURL(join(root, "modules/wodx-library/scripts/look-rules.mjs")));
const XH = await import(pathToFileURL(join(root, "modules/wodx-sheets/scripts/extras-html.mjs")));

const DAY = 86400;

test("followers: the kind comes from the tie that makes them one", () => {
  assert.equal(FR.kindFor({"wodx-creation": {lineage: {domitor: {id: "pc", name: "M"}}}}, "pc"), "ghoul");
  assert.equal(FR.kindFor({"wodx-chronicle": {bound: {actor: "pc", bg: "herd"}}}, "pc"), "herd");
  assert.equal(FR.kindFor({"wodx-chronicle": {bound: {actor: "pc", bg: "retainers"}}}, "pc"), "retainer");
  assert.equal(FR.kindFor({"wodx-creation": {ally: {patron: "pc"}}}, "pc"), "ally");
  assert.equal(FR.kindFor({"wodx-npc": {serves: ["pc"]}}, "pc"), "follower");
  assert.equal(FR.serves({"wodx-npc": {serves: ["pc"]}}, "pc"), true);
  assert.equal(FR.serves({"wodx-npc": {serves: ["x"]}}, "pc"), false);
});

test("followers: bond step, last loyalty change and its reason", () => {
  assert.equal(FR.bondFor({"wodx-creation": {lineage: {bonds: {pc: {drinks: 3}}}}}, "pc").text, "Blood bound (full bond)");
  assert.equal(FR.bondFor({}, "pc").text, "");
  const last = FR.lastChange({log: [{at: 1, delta: 0, why: "First met"}, {at: 5, delta: -1, why: "a hard order"}, {at: 9, delta: 0, why: "same"}]});
  assert.deepEqual(last, {delta: -1, why: "a hard order", at: 5});
  assert.equal(FR.lastText(last), "Fell a step: a hard order");
  assert.equal(FR.lastText({delta: 2, why: "kept fed"}), "Rose 2 steps: kept fed");
  assert.equal(FR.lastChange({}), null);
});

test("followers: a row shows where, the order, trouble and the quick orders", () => {
  const here = FR.rowFor({id: "g", name: "Hanus", flags: {"wodx-creation": {lineage: {domitor: {id: "pc"}}}, "wodx-npc": {order: {kind: "cleanup", target: "w1", leader: "pc"}}}, sceneName: "Old Square", sameScene: true, tokenId: "t1"},
    "pc", {step: -1, word: "Distrusted", names: {w1: "the baker", pc: "Mila"}, described: 1});
  assert.equal(here.kind, "ghoul");
  assert.equal(here.where, "Here (Old Square)");
  assert.match(here.order, /Dealing with the baker/);
  assert.ok(here.trouble.some(t => /witness: the baker/.test(t)));
  assert.ok(here.trouble.some(t => /Wavering/.test(t)));
  assert.ok(here.trouble.some(t => /description of it/.test(t)));
  assert.deepEqual(here.quick, [...FR.QUICK, "none"]);
  const away = FR.rowFor({id: "r", name: "Zdena", flags: {"wodx-npc": {serves: ["pc"], order: {kind: "errand", errand: "buy", leader: "pc"}}}, sceneName: null}, "pc", {});
  assert.equal(away.where, "Away on an errand");
  assert.deepEqual(away.quick, []);
  const elsewhere = FR.rowFor({id: "x", name: "Ota", flags: {"wodx-npc": {serves: ["pc"]}}, sceneName: "The Mill", sameScene: false}, "pc", {});
  assert.equal(elsewhere.where, "The Mill");
  assert.deepEqual(elsewhere.quick, []);
  const rows = FR.sortRows([elsewhere, away, here]);
  assert.equal(rows[0].id, "g", "the one here comes first");
});

test("look: what a witness remembers, and a disguise shows as what it passes for", () => {
  const look = L.lookOf({items: [{name: "Red cloak", worn: true, kind: "cloth", tier: 3}, {name: "Livery coat", worn: true, kind: "cloth", tier: 2}, {name: "Sword", worn: true, kind: "arms"}],
    year: 1240, appearance: 4, conditions: ["bloody"], weaponOut: true});
  assert.deepEqual(look.dress, ["Red cloak", "Livery coat"]);
  const m = L.marksOf(look, {size: L.sizeOf(2)});
  assert.equal(m.size, "big");
  assert.equal(m.face, "striking");
  const text = L.describeMarks(m);
  assert.match(text, /^a well dressed figure in livery, very big, with a face people remember, wearing red cloak and livery coat, with blood on them and a weapon drawn$/);
  assert.equal(L.sizeOf(1), null);
  assert.equal(L.marksOf(null), null);
  assert.equal(L.describeMarks(null), "");
});

test("descriptions: the means follow the year, 1197 to the World of Future Darkness", () => {
  assert.equal(W.meansAt(1197).key, "hue");
  assert.equal(W.meansAt(1620).key, "notice");
  assert.equal(W.meansAt(1916).key, "wire");
  assert.equal(W.meansAt(1995).key, "news");
  assert.equal(W.meansAt(2010).key, "camera");
  assert.equal(W.meansAt(2040).key, "facematch");
  assert.equal(W.meansAt(0).key, "hue");
  for ( let y = 1197; y <= 2100; y++ ) assert.ok(W.meansAt(y), `a means for ${y}`);
  for ( let i = 1; i < W.MEANS.length; i++ ) assert.equal(W.MEANS[i].from, W.MEANS[i - 1].to + 1, "no gap between ages");
});

const marks = {station: 3, sides: ["livery"], dress: ["Red cloak"], condition: ["bloody"], size: null, face: null};
const at = 1000;

test("descriptions: heard where it happened at once, carried on, then all over town; never in the Umbra by itself", () => {
  const d = W.carried(W.writeDesc({id: "d1", of: "pc", ofName: "Mila", cause: "theft", marks, text: "x", at, scene: "S1", sceneName: "Old Square", year: 1240, witnesses: ["Hanus"]}), [{scene: "S2", at: at + 1800}]);
  assert.equal(W.heardAt(d, "S1", at), at);
  assert.equal(W.heardAt(d, "S2", at + 60), null);
  assert.equal(W.heardAt(d, "S2", at + 1800), at + 1800);
  assert.equal(W.heardAt(d, "S3", at + 3600), null);
  assert.equal(W.heardAt(d, "S3", at + 24 * 3600), at + 24 * 3600, "the town crier after a day");
  assert.equal(W.heardAt(d, "U1", at + 24 * 3600, {realm: true}), null);
  const later = W.writeDesc({id: "d2", of: "pc", marks, at, scene: "S1", year: 2040});
  assert.equal(W.heardAt(later, "S9", at + 3600), at + 3600, "face matching reaches town in an hour");
});

test("descriptions: fade by the means of the year, and are pruned once forgotten", () => {
  const d = W.writeDesc({id: "d1", of: "pc", marks, at, scene: "S1", year: 1240});
  assert.equal(W.strength(d, at), 1);
  assert.ok(W.strength(d, at + 7 * DAY) <= 0.5);
  assert.equal(W.faded(d, at + 14 * DAY), true);
  assert.equal(W.heardAt(d, "S1", at + 15 * DAY), null);
  assert.equal(W.prune([d], at + 15 * DAY).length, 0);
  assert.equal(W.prune([d], at + DAY).length, 1);
  const modern = W.writeDesc({id: "d3", of: "pc", marks, at, scene: "S1", year: 2040});
  assert.ok(W.strength(modern, at + 100 * DAY) > 0.5, "face matching is remembered far longer");
  assert.equal(W.recogniseRoll("strong", 1).difficulty, 6);
  assert.equal(W.recogniseRoll("partial", 0.4).difficulty, 9);
  assert.equal(W.recogniseRoll("none"), null);
  assert.match(W.summary(d, at + 2 * DAY), /after a theft|after a crime/);
});

test("descriptions: changing clothes or a disguise breaks the match, less so with photographs and face matching", () => {
  const old = W.writeDesc({id: "a", of: "pc", marks, at, scene: "S1", year: 1240});
  assert.equal(W.matchOf(old, marks).level, "strong");
  assert.match(W.matchOf(old, marks).why, /blood on them/);
  const changed = {station: 1, sides: [], dress: ["Grey smock"], condition: []};
  assert.equal(W.matchOf(old, changed).level, "none");
  assert.equal(W.matchOf(old, marks, {held: true}).level, "none");
  const big = W.writeDesc({id: "b", of: "pc", marks: {...marks, size: "huge"}, at, scene: "S1", year: 1240});
  assert.equal(W.matchOf(big, {...changed, size: "huge"}).level, "partial", "a giant in a new coat is still a giant");
  const photo = W.writeDesc({id: "c", of: "pc", marks, at, scene: "S1", year: 2010});
  assert.equal(W.matchOf(photo, changed).level, "partial");
  const fm = W.writeDesc({id: "e", of: "pc", marks, at, scene: "S1", year: 2040});
  assert.equal(W.matchOf(fm, changed).level, "strong");
  assert.equal(W.matchOf(fm, marks, {held: true}).level, "partial", "a disguise no longer beats it so easily");
  const disguised = {...marks, disguised: true};
  assert.equal(W.matchOf(old, disguised).level, "none", "putting on a disguise later breaks it");
});

test("descriptions: a second sighting soon after freshens the same one", () => {
  const a = W.writeDesc({id: "a", of: "pc", marks, at, scene: "S1", year: 1240, witnesses: ["Hanus"]});
  assert.equal(W.sameAs([a], {of: "pc", scene: "S1", at: at + 300})?.id, "a");
  assert.equal(W.sameAs([a], {of: "pc", scene: "S1", at: at + 3600}), null);
  assert.equal(W.sameAs([a], {of: "pc", scene: "S2", at: at + 60}), null);
  const b = W.merge(a, W.writeDesc({id: "b", of: "pc", marks, at: at + 300, scene: "S1", year: 1240, witnesses: ["Ota"], named: true}));
  assert.equal(b.id, "a");
  assert.deepEqual(b.witnesses, ["Hanus", "Ota"]);
  assert.equal(b.named, true);
  assert.equal(W.of([b], "pc", at + 400).length, 1);
  assert.equal(W.normDesc({cause: "nonsense"}).cause, "crime");
  assert.equal(W.tests("guard"), true);
  assert.equal(W.tests("knight"), true, "the era templates hear the talk of the town too");
  assert.equal(W.tests("servant"), true);
  assert.equal(W.tests(null), true);
  assert.equal(W.tests("beast"), false);
  assert.equal(W.tests("spirit"), false);
  assert.equal(W.tests("wolf", {animal: true}), false);
});

test("wiring: NPC api, token tools, settings, hooks and the sheet button", () => {
  const main = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(main, /openFollowers: followers\.openFollowers/);
  assert.match(main, /openWanted: wanted\.openList/);
  assert.match(main, /tokens\.tools\.wodxFollowers/);
  assert.match(main, /tokens\.tools\.wodxWanted/);
  assert.match(main, /wanted\.registerSettings\(\)/);
  const w = src("modules/wodx-npc/scripts/wanted.mjs");
  assert.match(w, /skip: "no description of them heard here"/, "test says why it stopped");
  assert.match(main, /isAnimal: AN\.isAnimal/);
  for ( const h of ["wodxBreach", "wodxMapEvent", "deleteCombat", "updateToken"] ) assert.match(w, new RegExp(`Hooks\\.on\\("${h}"`));
  assert.match(w, /whisper: gmIds\(\)/, "Storyteller cards only");
  assert.match(src("modules/wodx-npc/scripts/orders.mjs"), /async function send\(req\)/);
  const html = XH.relationsHtml([], {followers: true});
  assert.match(html, /data-act="tie-followers"/);
  assert.doesNotMatch(XH.relationsHtml([]), /tie-followers/);
  assert.match(src("modules/wodx-sheets/scripts/extras.mjs"), /openFollowers/);
  assert.match(src("modules/wodx-library/scripts/look.mjs"), /describe,/);
});
