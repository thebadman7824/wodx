import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as PE from "../../modules/wodx-actions/scripts/path-effects.js";
import * as BR from "../../modules/wodx-actions/scripts/book-rituals.js";
import * as K from "../../modules/wodx-actions/scripts/kindred-rules.js";
import * as I from "../../modules/wodx-actions/scripts/infernal-rules.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const LIB = JSON.parse(src("modules/wodx-actions/data/disciplines-daw.json"));
const dark = LIB.powers.filter(p => p.dark);
const by = id => LIB.powers.find(p => p.id === id);

/* B7697: Dark Thaumaturgy, Maleficia and Striga, Dark Ages Companion (2002) pp. 105-111 */
test("four Dark Thaumaturgy paths and two infernal Disciplines, five levels each, on the Companion's pages", () => {
  const heads = [...new Set(dark.map(p => p.d))].sort();
  assert.deepEqual(heads, ["Dark Thaumaturgy: Rego Dolor", "Dark Thaumaturgy: Rego Manes", "Dark Thaumaturgy: Rego Venalis", "Dark Thaumaturgy: Video Nefas", "Maleficia", "Striga"]);
  for ( const h of heads ) assert.deepEqual(dark.filter(p => p.d === h).map(p => p.l).sort(), [1, 2, 3, 4, 5], h);
  for ( const p of dark ) {
    assert.ok(p.p >= 105 && p.p <= 111, p.id);
    assert.ok(PE.PATH_EFFECTS[p.id], `${p.id} has an effect spec`);
    if ( /^Dark Thaumaturgy/.test(p.d) && p.r ) assert.equal(p.diff, p.l + 3, `${p.id}: Willpower at level + 3`);
  }
  // The rolls the book names (pp. 109-111)
  assert.deepEqual(["maleficia-evil-eye", "maleficia-minor-curse", "maleficia-psalm-of-the-damned", "maleficia-greater-curse", "striga-strix", "striga-scobax", "striga-hexe", "striga-fractura"].map(id => [by(id).r, by(id).diff]),
    [["wits+occult", 6], ["intelligence+occult", 6], ["manipulation+performance", 6], ["willpower", 8], ["charisma+intimidation", 6], ["charisma+survival", 6], ["stamina+occult", 6], ["stamina+occult", 7]]);
  assert.equal(by("maleficia-greater-curse").c, "b3");
  assert.equal(by("dark-thaumaturgy-video-nefas-see-the-unseen").r, "", "See the Unseen needs no roll");
  assert.equal(by("striga-masca").r, "", "Masca needs no roll");
});

test("the effects card: damage, curses and senses at the book's numbers, cited to the Companion", () => {
  const out = (id, s) => PE.pathOutcomes(by(id), s);
  assert.deepEqual(out("dark-thaumaturgy-rego-dolor-strike-the-broken-limb", 3).map(o => [o.out.levels, o.out.type, o.out.soak]), [[3, "lethal", true]]);
  assert.deepEqual(out("dark-thaumaturgy-rego-dolor-eternal-torment", 2).map(o => [o.out.levels, o.out.type]), [[2, "aggravated"]]);
  assert.deepEqual(out("dark-thaumaturgy-rego-dolor-feed-the-corruption", 4).map(o => [o.out.levels, o.out.soak]), [[2, false]], "the first day: one from the flies, one from the maggots");
  assert.deepEqual(out("striga-hexe", 4).map(o => [o.out.levels, o.out.type]), [[4, "aggravated"]]);
  assert.equal(out("dark-thaumaturgy-rego-venalis-nights-terror", 3)[0].out.dice, -3);
  assert.equal(out("dark-thaumaturgy-rego-venalis-name-the-crime", 5)[0].out.duration, "one month");
  assert.equal(out("maleficia-minor-curse", 2)[0].out.duration, "2 hours");
  assert.deepEqual(out("striga-fractura", 3).map(o => o.out.points ?? o.key), [-3, "make"]);
  for ( const p of dark ) for ( const o of out(p.id, 2) ) assert.match(o.out.source, /^Dark Ages Companion \(2002\) p\. \d+$/, p.id);
  // The V20 Dark Ages paths keep their own source
  assert.match(PE.pathOutcomes(LIB.powers.find(p => p.id.startsWith("thaumaturgy-potestas-vitae")), 2)[0].out.source, /^V20 Dark Ages p\./);
});

test("the path rule: a botch costs permanent Willpower; the card carries the Companion's notes", () => {
  assert.ok(K.darkBotchCost(by("dark-thaumaturgy-rego-manes-call-a-least-demon")));
  assert.ok(!K.darkBotchCost(by("maleficia-evil-eye")));
  assert.ok(!K.darkBotchCost(LIB.powers.find(p => p.d === "Thaumaturgy: Potestas Vitae")));
  const manes = K.darkNotes(by("dark-thaumaturgy-rego-manes-call-a-least-demon"), LIB.rules.dark);
  assert.equal(manes.length, 2);
  assert.match(manes[1], /resisted by Willpower/);
  assert.match(K.darkNotes(by("maleficia-barrenness"), LIB.rules.dark)[0], /Wits \+ Occult/);
  assert.deepEqual(K.darkNotes(by("striga-strix"), LIB.rules.dark), []);
  const main = src("modules/wodx-actions/scripts/kindred.js");
  assert.match(main, /K\.darkBotchCost\(p\)/);
  assert.match(main, /K\.darkNotes\(p, DATA\.disc\?\.rules\?\.dark\)/);
});

test("a sheet's Dark Thaumaturgy path and Maleficia reach their powers, and a plain Thaumaturgy path does not", () => {
  const got = K.powersFor(LIB.powers, [{name: "Dark Thaumaturgy: Rego Dolor", value: 2}, {name: "Maleficia", value: 1}, {name: "Thaumaturgy: Potestas Vitae", value: 5}]).map(p => p.id);
  assert.ok(got.includes("dark-thaumaturgy-rego-dolor-phantom-pain"));
  assert.ok(!got.includes("dark-thaumaturgy-rego-dolor-curse-the-senses"));
  assert.ok(got.includes("maleficia-evil-eye"));
  assert.ok(!got.some(id => /video-nefas|rego-venalis|rego-manes/.test(id)));
});

test("eleven rituals of Dark Thaumaturgy in the Dark Ages set, each naming the Companion", () => {
  const rit = BR.BOOK_RITUALS.v20da.list.filter(r => r.g === "Dark Thaumaturgy rituals");
  assert.equal(rit.length, 11);
  assert.deepEqual(rit.map(r => Number(r.lvl)), [1, 1, 2, 2, 3, 3, 3, 4, 4, 5, 5]);
  for ( const r of rit ) {
    assert.equal(r.book, "DAC 2002");
    assert.match(BR.ritualNote("v20da", r), /DAC 2002 pp?\. 10[89]/);
    for ( const k of r.k ) assert.ok(BR.knownKeyword(k), `${r.n}: ${k}`);
  }
  assert.equal(BR.ritualBook("v20da", BR.findRitual(["v20da"], "Blood Contract").r), "V20 Dark Ages");
  assert.equal(BR.findRitual(["v20da"], "Bring Forth the Hell Beast").r.takes.match(/(\d+) blood/)[1], "1");
  assert.match(BR.bookRitual("v20da", BR.BOOK_RITUALS.v20da.list.indexOf(rit[0])).note, /DAC 2002 p\. 108/);
});

test("the pact window offers the four paths and the two Disciplines by name", () => {
  assert.deepEqual(I.DARK_PATHS.map(([k]) => k), ["Rego Venalis", "Video Nefas", "Rego Dolor", "Rego Manes"]);
  assert.deepEqual(I.DARK_DISCIPLINES, ["Maleficia", "Striga"]);
  const inf = src("modules/wodx-actions/scripts/infernal.js");
  assert.match(inf, /I\.DARK_PATHS/);
  assert.match(inf, /I\.DARK_DISCIPLINES/);
});
