import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX Storyteller: every line gets its own equivalent of the Kindred-only tools (B6320-B6326).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const D = await imp("modules/wodx-storyteller/scripts/dashboard-rules.mjs");
const U = await imp("modules/wodx-storyteller/scripts/upkeep-rules.mjs");
const B = await imp("modules/wodx-storyteller/scripts/battle-rules.mjs");
const P = await imp("modules/wodx-storyteller/scripts/prelude-rules.mjs");

test("the dashboard shows each line's own pools, and the lowest leads", () => {
  const kj = D.partyRow({name: "K", type: "Vampire", system: {settings: {variant: "kindredeast"}, advantages: {yangchi: {permanent: 6, temporary: 1}, yinchi: {permanent: 3, temporary: 3}, bloodpool: {temporary: 0, max: 10}}}});
  assert.equal(kj.blood, null, "no blood pool for a Cathayan");
  assert.deepEqual(kj.pools.map(p => p.label), ["Yang Chi", "Yin Chi"]);
  const g = D.partyRow({name: "G", type: "Werewolf", system: {advantages: {rage: {permanent: 4, temporary: 4}, gnosis: {permanent: 5, temporary: 5}}}});
  assert.deepEqual(g.pools.map(p => p.key), ["rage", "gnosis"]);
  const w = D.partyRow({name: "W", type: "Wraith", system: {advantages: {pathos: {temporary: 2, max: 10}, corpus: {temporary: 10, max: 10}, angst: {temporary: 9, max: 10}}}});
  assert.ok(w.pools.find(p => p.key === "angst").rising);
  const m = D.partyRow({name: "M", type: "Mage", system: {quintessence: {permanent: 5, temporary: 5}, paradox: {permanent: 0, temporary: 3}}});
  assert.deepEqual(m.pools.map(p => p.label), ["Quintessence", "Paradox"]);
  const v = D.partyRow({name: "V", type: "Vampire", system: {advantages: {bloodpool: {temporary: 9, max: 10}}}});
  assert.deepEqual(v.blood, {now: 9, of: 10}, "the Kindred keep their blood");
  assert.deepEqual(v.pools, []);
  assert.deepEqual(D.sortParty([g, kj, v]).map(r => r.name), ["K", "V", "G"], "the Cathayan short of Chi first");
  assert.equal(D.poolWords(kj.pools), "Yang Chi 1/6; Yin Chi 3/3");
  assert.deepEqual(D.partyRow({type: "Demon", system: {advantages: {faith: {temporary: 3, max: 6}, torment: {temporary: 2, max: 10}}}}).pools.map(p => p.key), ["faith", "torment"]);
});

test("between nights: a Kuei-jin pays Chi to rise, a Garou's Rage comes back with the moon", () => {
  const k = U.betweenPlan({kueijin: true, chi: {yang: 3, yin: 1}}, {nights: 3});
  assert.equal((k.delta.yangchi ?? 0) + (k.delta.yinchi ?? 0), -3);
  assert.ok(k.lines.some(l => l.key === "chi"));
  assert.ok(!k.lines.some(l => l.key === "blood"), "no blood for a Cathayan");
  assert.match(U.betweenPlan({kueijin: true, chi: {yang: 1, yin: 0}}, {nights: 3}).lines.find(l => l.key === "chi").warn, /more Chi/);
  const g = U.betweenPlan({shifter: true, rage: {temp: 1, perm: 5}}, {nights: 2});
  assert.equal(g.delta.rage, 2);
  assert.equal(U.betweenPlan({shifter: true, rage: {temp: 5, perm: 5}}, {nights: 2}).delta.rage, undefined, "never above the rating");
  const v = U.betweenPlan({vampire: true, blood: {value: 5, max: 10}}, {nights: 2});
  assert.equal(v.delta.blood, -2, "the Kindred as before");
});

test("ties for every line's Backgrounds", () => {
  for ( const [bg, kind] of [["Dreamers", "dreamers"], ["Haunt", "haunt"], ["Pacts", "pacts"], ["Cult", "cult"], ["Dragon Nest", "nest"], ["Herd", "herd"]] ) {
    assert.equal(U.tieKindOfBackground(bg), kind, bg);
    assert.ok(U.TIE_KINDS[kind].lapse);
  }
  const t = U.deriveTies({items: [{id: "d", name: "Dreamers", type: "background", value: 2}]}, 100);
  assert.equal(t.ties[0].kind, "dreamers");
});

test("stakes pin the Kindred, and a Kuei-jin only when aspected", () => {
  assert.equal(B.stakeable("Vampire"), true);
  assert.equal(B.stakeable("Vampire", {variant: "kindredeast", yin: 5, yang: 2}), true, "Yin-aspected");
  assert.equal(B.stakeable("Vampire", {variant: "kindredeast", yin: 2, yang: 5}), true, "Yang-aspected: a foot of metal");
  assert.equal(B.stakeable("Vampire", {variant: "kindredeast", yin: 3, yang: 4}), false, "Balanced");
  assert.equal(B.stakeable("Werewolf"), false);
  assert.equal(B.counterResult(6, 1, {cainite: true}).staked, true);
});

test("a Kuei-jin's prelude is the Second Breath", () => {
  assert.equal(P.preludeFor("Vampire", "kindredeast"), "kuei-jin");
  assert.equal(P.preludeFor("Vampire", ""), "vampire");
  assert.equal(P.preludeFor("Changing Breed"), "werewolf");
  assert.ok(P.PRELUDES["kuei-jin"].turn.length >= 3);
  assert.ok(P.LINE_ORDER.includes("kuei-jin"));
});
