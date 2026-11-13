import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* The Haudenosaunee in the People generator (B3120 to B3122): recorded names, clans from the mother, names staged by age */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const G = await import(join(root, "modules/wodx-chronicle/scripts/gen-core.mjs"));
const W = await import(join(root, "modules/wodx-chronicle/scripts/world-rules.mjs"));
const {PEOPLE_TABLES} = await import(join(root, "modules/wodx-creation/data/people.mjs"));
const PR = await import(join(root, "modules/wodx-creation/scripts/people-rules.mjs"));
const HN = await import(join(root, "modules/wodx-creation/data/people-haudenosaunee.mjs"));
const RS = await import(join(root, "modules/wodx-npc/scripts/resident-rules.mjs"));
const tablesFor = ctx => id => G.resolveTable(PEOPLE_TABLES, id, ctx);
const split = s => s.split(",").map(x => x.trim()).filter(Boolean);
const people = (ctx, n = 400) => Array.from({length: n}, (_, i) => PR.nameOf({rand: G.stream("hn", "k", i), tables: tablesFor(ctx), origin: "haudenosaunee", sex: i % 2 ? "female" : "male"}));

test("haudenosaunee: over 300 names, no repeats in a list, no pronoun words", () => {
  const lists = [HN.HN_MEN, HN.HN_WOMEN, HN.HN_CLANS, HN.HN_CHURCH.male, HN.HN_CHURCH.female, HN.HN_MODERN.male, HN.HN_MODERN.female, HN.HN_FAMILY].map(split);
  const all = new Set(lists.flat());
  assert.ok(all.size >= 300, `${all.size} names`);
  assert.ok(split(HN.HN_MEN).length >= 230);
  for ( const l of lists ) assert.equal(new Set(l).size, l.length, l.join());
  for ( const n of all ) assert.doesNotMatch(n, /\b(he|she|her|hers|him|his)\b/i, n);
});

test("haudenosaunee: own names and a clan before the colonies, a church name beside them later, family names from 1800", () => {
  const med = people({era: "medieval", culture: "american"});
  assert.ok(med.every(p => HN.CLAN.test(p.family)), med.find(p => !HN.CLAN.test(p.family))?.name);
  assert.ok(med.filter((p, i) => i % 2 === 0).every(p => split(HN.HN_MEN).includes(p.given)));
  assert.ok(med.some(p => p.name.startsWith("A woman of the ")));
  assert.ok(med.every(p => !p.name.includes("{")));
  const em = people({era: "early-modern", culture: "american"});
  const church = em.filter((p, i) => i % 2 === 0 && split(HN.HN_CHURCH.male).includes(p.given.split(" ")[0]));
  assert.ok(church.length > 30 && church.length < 130, `${church.length} of 200 men carry a church name`);
  assert.ok(em.every(p => HN.CLAN.test(p.family) && !p.name.includes("{")));
  const ind = people({era: "industrial", culture: "american"});
  assert.ok(ind.every(p => split(HN.HN_FAMILY).includes(p.family)));
  const mod = people({era: "modern", culture: "canada"});
  assert.ok(mod.every(p => split(HN.HN_MODERN.male + "," + HN.HN_MODERN.female).includes(p.given)));
});

test("haudenosaunee: in eastern North America and Canada by age, not borrowed by the West", () => {
  const origin = (era, culture) => G.resolveTable(PEOPLE_TABLES, "people.origin", {era, culture})?.results.map(r => r.text) ?? [];
  assert.deepEqual(origin("medieval", "american"), ["haudenosaunee"]);
  assert.deepEqual(origin("medieval", "canada"), ["haudenosaunee"]);
  assert.ok(origin("early-modern", "american").includes("english") && origin("early-modern", "american").includes("haudenosaunee"));
  assert.ok(origin("modern", "american").includes("anglo"));
  assert.ok(!origin("medieval", W.cultureOf("north-america-west")).includes("haudenosaunee"), "the West has no medieval mix of its own");
  assert.deepEqual(origin("early-modern", W.cultureOf("north-america-west")), ["spanish"]);
  assert.ok(W.hasPeopleIn("north-america-east", 1300) && W.hasPeopleIn("canada", 1300));
});

test("haudenosaunee: in a household the children take the mother's clan; grown people keep their own", () => {
  const h = {region: "R", kind: "home", household: {trade: "hunter", people: [{role: "hunter"}, {role: "partner"}, {role: "child"}, {role: "child"}]}};
  const clans = ["of the Wolf clan", "of the Turtle clan", "of the Bear clan", "of the Eel clan"];
  const draw = (i, o) => ({sex: o.sex === "any" || !o.sex ? (i === 0 ? "male" : "female") : o.sex, origin: "haudenosaunee", given: `G${i}`, family: clans[i % 4]});
  const out = RS.nameHousehold(RS.planHousehold(h), draw, () => 0.5);
  assert.equal(out[0].family, "of the Wolf clan", "the master keeps a clan of their own");
  assert.equal(out[1].family, "of the Turtle clan", "so does the partner");
  assert.equal(out[1].sex, "female");
  for ( const c of out.slice(2) ) assert.equal(c.family, "of the Turtle clan", c.name);
  assert.equal(out[2].name, "G2 of the Turtle clan");
});
