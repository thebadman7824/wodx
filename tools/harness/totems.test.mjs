// B7082-B7087: the W20 pack totems as data (data/rules/werewolf/totems-w20.json) and the pure reader (totem-rules.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const T = await import("../../modules/wodx-actions/scripts/totem-rules.js");
const DATA = JSON.parse(read("modules/wodx-actions/data/rules/werewolf/totems-w20.json"));
const row = k => DATA.rows.find(r => r.key === k);
// The tags a roll of the general window can carry (Chronicle trait-rules rollTags) plus the Attribute and Ability keys
const TAGS = new Set([...read("modules/wodx-chronicle/scripts/trait-rules.mjs").matchAll(/"([a-z]+)"/g)].map(m => m[1]));

test("B7082: the table is sound: 21 totems, every row read by a reader, no unknown trait", () => {
  assert.deepEqual(T.problems(DATA), []);
  assert.equal(DATA.rows.length, 21);
  assert.equal(DATA.book, "W20");
  for (const r of DATA.rows) {
    assert.ok((r.page >= 373 && r.page <= 377) || r.page === 509 || r.page === 514, r.key);
    for (const e of r.individual?.effects ?? []) for (const t of e.tags) assert.ok(TAGS.has(t) || T.ATTRS.includes(t) || ["enigmas", "primalurge", "rituals"].includes(t), `${r.key}: tag ${t} is not a roll tag`);
  }
});

test("B7082: the sheet's Pack Totem field finds the row, with or without 'the', and the flag wins", () => {
  assert.equal(T.totemFor(DATA, "Grandfather Thunder")?.key ?? T.totemFor(DATA, "Thunder")?.key, "thunder");
  assert.equal(T.totemFor(DATA, "the Falcon").key, "falcon");
  assert.equal(T.totemFor(DATA, "Falcon", "owl").key, "owl");
  assert.equal(T.totemFor(DATA, "Nobody"), null);
});

test("B7083: a held Pack Trait adds its dots to that roll only; Attribute dots are dice; ticks wait for the tick", () => {
  const f = row("falcon");
  assert.deepEqual(T.rollMods(f, { abilityKey: "leadership", holds: ["leadership"] }).dice, 3);
  assert.equal(T.rollMods(f, { abilityKey: "leadership", holds: [] }).dice, 0);
  assert.equal(T.rollMods(f, { abilityKey: "stealth", holds: ["leadership"] }).dice, 0);
  assert.equal(T.rollMods(row("bear"), { attrKey: "strength" }).dice, 1);
  const th = row("thunder");
  assert.equal(T.rollMods(th, { abilityKey: "intimidation" }).dice, 0);
  assert.equal(T.rollMods(th, { abilityKey: "intimidation", ticked: [T.ticksOf(th)[0].label] }).dice, 2);
  assert.equal(T.rollMods(row("rat"), { abilityKey: "stealth" }).diff, -1);
  const fen = row("fenris");
  assert.equal(T.rollMods(fen, { attrKey: "dexterity", choice: "dexterity" }).dice, 1);
  assert.equal(T.rollMods(fen, { attrKey: "strength", choice: "dexterity" }).dice, 0);
  assert.match(T.rollMods(f, { abilityKey: "leadership", holds: ["leadership"] }).parts[0], /^Falcon: Leadership \(Pack Trait\) \+3$/);
});

test("B7083: a broken ban turns every gift off", () => {
  assert.equal(T.rollMods(row("bear"), { attrKey: "strength", banned: true }).dice, 0);
  assert.deepEqual(T.ticksOf(row("thunder"), true), []);
  assert.equal(T.award(row("bear"), "honor", 3, true), 3);
  assert.equal(T.rageAtStory(row("wendigo"), 4, true), 4);
  assert.equal(T.giftDice(row("owl"), { holds: ["gift"], ofKind: true, banned: true }), 0);
});

test("B7084: one packmate holds a Pack Trait for the scene; a claim from another scene has lapsed", () => {
  const f = row("falcon");
  const claims = [{ actorId: "a", id: "leadership", scene: "s1" }];
  assert.equal(T.canClaim(f, "leadership", "b", claims, "s1").ok, false);
  assert.equal(T.canClaim(f, "leadership", "a", claims, "s1").ok, true);
  assert.equal(T.canClaim(f, "leadership", "b", claims, "s2").ok, true);
  assert.equal(T.canClaim(f, "stealth", "b", [], "s1").ok, false);
  assert.deepEqual(T.claimable(row("owl")).map(c => c.id), ["gift"]);
});

test("B7084: Renown: acceptance once, awards cut, a loss stops at what there is", () => {
  assert.deepEqual(T.acceptRenown(row("stag"), {}), { honor: 3 });
  assert.deepEqual(T.acceptRenown(row("bear"), { honor: 2 }), { honor: -2 });
  assert.equal(T.award(row("coyote"), "wisdom", 1), 0);
  assert.equal(T.award(row("coyote"), "wisdom", 3), 2);
  assert.equal(T.award(row("coyote"), "glory", 3), 3);
  assert.equal(T.award(row("coyote"), "wisdom", -2), -2);
});

test("B7085-B7086: the Willpower pool, Wendigo's Rage, Gift dice", () => {
  assert.equal(T.poolLeft(row("falcon"), [0, 1, 3]), 1);
  assert.equal(T.poolLeft(row("falcon"), [9]), 0);
  assert.equal(T.rageAtStory(row("wendigo"), 4), 9);
  assert.equal(T.giftDice(row("owl"), { holds: ["gift"], ofKind: true }), 3);
  assert.equal(T.giftDice(row("owl"), { holds: [], ofKind: true }), 0);
  assert.equal(T.giftDice(row("owl"), { holds: ["gift"], ofKind: false }), 0);
});

test("B7082: the totem window is on the Werewolf menu and the data loads", () => {
  const garou = read("modules/wodx-actions/scripts/garou.js");
  assert.match(garou, /fetchData\("rules\/werewolf\/totems-w20"\)/);
  assert.match(read("modules/wodx-actions/scripts/profile-menus.js"), /"api:packTotem", "Pack totem"/);
  assert.match(read("modules/wodx-actions/scripts/theme-rules.js"), /"api:packTotem": "/);
  assert.match(read("modules/wodx-actions/scripts/main.js"), /packTotem: withActor\(a => gx\(\)\.packTotem\(a\)\)/);
});
