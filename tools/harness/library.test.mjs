import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as S from "../../modules/wodx-library/scripts/shelf-rules.mjs";
import {MANUAL, CHANGES} from "../../modules/wodx-library/data/manual.mjs";
import houseRules from "../../modules/wodx-chronicle/data/house-rules.mjs";

/* WoDX Library 0.2.0: the shelves, the manual and what's new. */
const J = f => JSON.parse(readFileSync(new URL(`../../modules/${f}`, import.meta.url), "utf8"));
const src = {disciplines: J("wodx-actions/data/disciplines-daw.json"), roads: J("wodx-actions/data/roads-daw.json"), gifts: J("wodx-actions/data/gifts-daw.json"),
  arcanoi: J("wodx-actions/data/arcanoi-w20.json"), arcanoiGW: J("wodx-actions/data/arcanoi-gw.json"), wraith: J("wodx-actions/data/wraith-w20.json"),
  eras: J("wodx-chronicle/data/eras.json"), houseRules,
  conditions: [{id: "frenzy", name: "Frenzy", source: "V20 Dark Ages pp. 356–357", lines: ["vampire", "werewolf"], summary: "The Beast rules."}]};
const all = S.buildShelves(src);

test("every source lands on a shelf, every entry tagged and with a page reference", () => {
  const by = k => all.filter(e => e.shelf === k);
  for ( const k of S.SHELF_ORDER.filter(k => k !== "encyclopedia") ) assert.ok(by(k).length, k);
  const powers = src.disciplines.powers.length, pages = by("vampire").filter(e => /Dark Ages\)$/.test(e.name)).reduce((n, e) => n + e.pages.length - 1, 0);
  assert.equal(pages, powers, "a page for every Dark Ages power");
  for ( const e of all ) {
    const f = e.flags["wodx-library"];
    assert.ok(f.shelf && f.lines.length && f.eras.length, e.name);
    assert.ok(e.pages.length >= 1 && e.pages.every(p => p.text.content.length), e.name);
  }
  assert.equal(new Set(all.map(e => e.flags["wodx-library"].shelf)).size, all.length, "keys are unique");
  assert.ok(all.some(e => e.name === "Era: The Dark Medieval" && e.flags["wodx-library"].eras.join() === "dark-ages"));
  assert.ok(all.find(e => e.name === "Road of the Beast").pages[0].text.content.includes("p. 115"));
});
test("the era filter: Dark Ages powers in the Dark Ages only, Wraith 20th in every era, the Great War's in its own", () => {
  const f = n => all.find(e => e.name === n).flags["wodx-library"];
  assert.ok(S.fits(f("Animalism (Dark Ages)"), {line: "vampire", era: "dark-ages"}));
  assert.ok(!S.fits(f("Animalism (Dark Ages)"), {line: "vampire", era: "modern"}));
  assert.ok(!S.fits(f("Animalism (Dark Ages)"), {line: "werewolf", era: "dark-ages"}));
  assert.ok(S.fits(f("Argos"), {line: "wraith", era: "victorian"}));
  assert.ok(S.fits(f("Argos (Great War)"), {era: "great-war"}) && !S.fits(f("Argos (Great War)"), {era: "modern"}));
  assert.ok(S.fits(f("Conditions"), {line: "mage", era: "wild-west"}));
  assert.ok(S.fits(f("Animalism (Dark Ages)"), {}));
});
test("missing sources are skipped, text is escaped, hashes are stable", () => {
  assert.deepEqual(S.buildShelves({}), []);
  const e = S.fromConditions([{name: "X", summary: "<b>bad</b>", source: "s"}])[0];
  assert.ok(!e.pages[1].text.content.includes("<b>"));
  assert.equal(S.hashOf({a: 1}), S.hashOf({a: 1}));
  assert.notEqual(S.hashOf({a: 1}), S.hashOf({a: 2}));
});
test("the manual and what's new: pages for all and one for the Storyteller; no decision numbers", () => {
  assert.ok(MANUAL.length >= 8 && MANUAL.every(p => p.name && p.html && ["all", "gm"].includes(p.who)));
  assert.equal(MANUAL.filter(p => p.who === "gm").length, 1);
  assert.ok(CHANGES.length && CHANGES.every(c => c.date && c.what));
  assert.doesNotMatch(JSON.stringify({MANUAL, CHANGES}), /\bB\d{2,3}\b|Phase \d/);
});
test("the Library is wired: toolbar, api, ready install, searchable list, fixed line list", () => {
  const main = readFileSync(new URL("../../modules/wodx-library/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-library/scripts/shelves.mjs", import.meta.url), "utf8");
  assert.match(main, /tokens\.tools\.wodxLibrary = /);
  assert.match(main, /library: \{open: /);
  assert.match(main, /Sh\.installShelves\(\)/);
  assert.match(ui, /searchBox\("ul\.wodx-shelf-list"/);
  assert.match(ui, /name="line" data-fixed/);
});

test("shelf sync removes entries that left the source, remakes changed ones, keeps the rest", () => {
  const M = "wodx-library";
  const doc = (shelf, hash, id) => ({...(id ? {id} : {}), flags: {[M]: {shelf, hash}}});
  const mine = [doc("a", "1"), doc("b", "2"), doc("d", "4")];
  const docs = [doc("a", "1", "A"), doc("b", "old", "B"), doc("c", "3", "C"), {id: "X", flags: {}}];
  const p = S.syncPlan(mine, docs, M);
  assert.deepEqual(p.remove.sort(), ["B", "C"]);
  assert.deepEqual(p.create.map(d => d.flags[M].shelf).sort(), ["b", "d"]);
  assert.equal(p.kept, 1); assert.equal(p.remade, 1); assert.equal(p.stale, 1);
  assert.ok(!p.remove.includes("X"), "documents the module did not make are left alone");
});

test("shelf sync keeps one document per key and removes the extra copies", () => {
  const M = "wodx-library";
  const doc = (shelf, hash, id) => ({id, flags: {[M]: {shelf, hash}}});
  const p = S.syncPlan([doc("a", "1"), doc("b", "2")], [doc("a", "1", "A1"), doc("a", "1", "A2"), doc("b", "2", "B1"), doc("b", "old", "B2")], M);
  assert.deepEqual(p.remove.sort(), ["A2", "B2"]);
  assert.equal(p.create.length, 0); assert.equal(p.kept, 2); assert.equal(p.extra, 2);
});
