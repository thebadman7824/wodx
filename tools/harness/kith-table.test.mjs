/* B6729: the C20 kith table, one row per kith, each wired to the roll or health rule it changes. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const S = await load("modules/wodx-chronicle/scripts/signature-rules.mjs");
const B = await load("system/worldofdarkness/assets/data/sheet/bio.js");
const T = await load("modules/wodx-chronicle/scripts/trait-rules.mjs");

const row = k => S.faeRows({kith: [k]})[0];
const eff = (k, tags) => S.sigRollEffects(row(k).effects ?? [], {tags});
const sum = (list, f) => list.reduce((s, e) => s + e[f], 0);

test("every system kith key reads its own row, with a printed C20 page", () => {
  const keys = Object.entries(B.databio.kith).filter(([g]) => g !== "dauntain").flatMap(([, o]) => Object.keys(o));
  assert.ok(keys.length >= 50, `${keys.length} keys`);
  const groups = ["thallain", "inanimae", "nunnehi", "darkkin"];
  for ( const k of keys ) {
    const r = row(`wod.bio.changeling.${k}`);
    assert.ok(r, k);
    assert.ok(!groups.includes(r.key), `${k} falls to the group row ${r.key}`);
    assert.match(r.page, /^C20 p\. \d+$/, k);
    assert.match(r.text, /^Birthrights\. .+ Frailty\. /, k);
    assert.ok(!/—/.test(r.text), k);
  }
  for ( const k of ["Menehune", "Ali'i", "Kahuna", "Hana", "Kokua", "Ghille Dhu", "Korred", "Merfolk", "Morganed", "Oba", "River Hag", "Wichtel", "Wolpertinger", "Arcadian Sidhe"] )
    assert.ok(row(k) && !groups.includes(row(k).key), k);
  assert.equal(row("Arcadian Sidhe").key, "arcadiansidhe");
  assert.equal(row("wod.bio.changeling.sidhe").key, "sidhe");
});

test("attribute birthrights are dice on that attribute's rolls", () => {
  assert.equal(sum(eff("wod.bio.changeling.piskies", T.rollTags("dexterity", "athletics")), "dice"), 1);
  assert.equal(sum(eff("wod.bio.changeling.satyrs", T.rollTags("stamina")), "dice"), 1);
  assert.equal(sum(eff("wod.bio.changeling.sidhe", T.rollTags("appearance", "empathy")), "dice"), 2);
  assert.equal(sum(eff("wod.bio.changeling.ogres", T.rollTags("strength", "brawl")), "dice"), 2);
  assert.equal(sum(eff("wod.bio.changeling.yunwitsunsdi", T.rollTags("dexterity", "stealth")), "dice"), 2);
  assert.equal(sum(eff("wod.bio.changeling.piskies", T.rollTags("strength")), "dice"), 0);
});

test("Redcap: Intimidation two easier, every other Social roll two harder (C20 p. 101)", () => {
  assert.equal(sum(eff("wod.bio.changeling.redcap", T.rollTags("manipulation", "intimidation")), "diff"), -2);
  assert.equal(sum(eff("wod.bio.changeling.redcap", T.rollTags("charisma", "persuasion")), "diff"), 2);
  assert.equal(sum(eff("wod.bio.changeling.redcap", T.rollTags("dexterity", "brawl")), "diff"), 0);
});

test("Sluagh: Perception one easier, Social two harder (C20 p. 111)", () => {
  assert.equal(sum(eff("wod.bio.changeling.sluagh", T.rollTags("perception", "alertness")), "diff"), -1);
  assert.equal(sum(eff("wod.bio.changeling.sluagh", T.rollTags("charisma", "etiquette")), "diff"), 2);
});

test("Bruised levels: Rock Giants, Glomes and a troll's oaths (C20 pp. 113, 402, 440)", () => {
  assert.deepEqual(S.faeBruised([row("wod.bio.changeling.rockgiants")]), {n: 1, names: ["Rock Giants (Nunnehi)"]});
  assert.equal(S.faeBruised([row("wod.bio.changeling.glomes")]).n, 2);
  const troll = [row("wod.bio.changeling.troll")];
  assert.equal(S.faeBruised(troll, {oathsHeld: 0}).n, 0);
  assert.equal(S.faeBruised(troll, {oathsHeld: 1}).n, 1);
  assert.equal(S.faeBruised(troll, {oathsHeld: 4}).n, 2);
  assert.equal(S.trollOath(3), 2);
  assert.equal(S.faeBruised([row("wod.bio.changeling.boggans")]).n, 0);
});
