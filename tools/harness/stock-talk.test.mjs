import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Stock talk (NPC 0.11.0): what NPCs say by era and regard before the Storyteller writes a line */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const TK = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/talk-rules.mjs")));
const S = await import(pathToFileURL(join(root, "modules/wodx-npc/data/stock-talk.mjs")));

const all = [];
const walk = o => { if ( typeof o === "string" ) all.push(o); else if ( Array.isArray(o) ) o.forEach(walk); else if ( o && typeof o === "object" ) Object.values(o).forEach(walk); };
for ( const k of ["GREET", "NONE", "RUMOUR_LEAD", "RUMOUR_REFUSE", "GOSSIP", "NEWS", "WORK", "DIRECTIONS"] ) walk(S[k]);

test("a large library: every era and regard has greetings; gossip, news and work for every era", () => {
  assert.ok(all.length >= 350, `${all.length} lines`);
  for ( const era of Object.keys(S.ERAS) ) {
    for ( const r of S.REGARDS ) assert.ok(S.GREET[era][r].length >= 5, `${era} ${r}`);
    for ( const k of ["GOSSIP", "NEWS", "WORK"] ) assert.ok(S[k][era].length >= 6, `${k} ${era}`);
  }
  for ( const r of S.REGARDS ) { assert.ok(S.NONE[r].length >= 4); assert.ok(S.DIRECTIONS[r].length >= 2); }
  for ( const r of ["dislike", "neutral", "like", "love"] ) assert.ok(S.RUMOUR_LEAD[r].every(l => l.includes("{rumour}")), r);
});

test("the writing: gender-neutral, no dashes for pauses, no duplicates, each line quoted speech", () => {
  for ( const l of all ) {
    assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(l), l);
    assert.ok(!/—|--/.test(l), l);
    assert.ok(/^".+"$/.test(l), l);
  }
  assert.equal(new Set(all).size, all.length, "no line twice");
});

test("eras and regard: years to spans, steps to feelings, attitude before standing", () => {
  assert.deepEqual([1197, 1499, 1500, 1850, 1944, 1999, 2025, 2030].map(y => TK.eraBand(y)), ["medieval", "medieval", "earlymodern", "nineteenth", "twentieth", "modern", "modern", "future"]);
  assert.equal(TK.eraBand(2030, "future"), "future");
  assert.deepEqual([-3, -2, -1, 0, 1, 2, 3].map(TK.regardOf), ["hate", "dislike", "dislike", "neutral", "neutral", "like", "love"]);
  assert.equal(TK.stepFor({attitude: 3, standings: [-3]}), 3, "the NPC's own attitude wins");
  assert.equal(TK.stepFor({attitude: null, standings: [-3, -2]}), -2);
  assert.equal(TK.stepFor({}), 0);
});

test("stock lines: greetings by era and regard, steady for a seed; rumours from the network wrapped by regard", () => {
  const g = TK.stockLine("greet", {stock: S, era: "medieval", regard: "love", seed: 7});
  assert.ok(S.GREET.medieval.love.includes(g.say));
  assert.equal(TK.stockLine("greet", {stock: S, era: "medieval", regard: "love", seed: 7}).say, g.say);
  const r = TK.stockLine("rumours", {stock: S, era: "modern", regard: "like", seed: 1, rumour: "The count was seen at the river at midnight."});
  assert.match(r.say, /The count was seen at the river at midnight\./);
  assert.ok(r.rumour);
  assert.ok(S.RUMOUR_REFUSE.hate.includes(TK.stockLine("rumours", {stock: S, regard: "hate", seed: 2, rumour: "x"}).say), "the hated get nothing");
  assert.ok(S.GOSSIP.nineteenth.includes(TK.stockLine("rumours", {stock: S, era: "nineteenth", regard: "neutral", seed: 3}).say), "no rumour: everyday gossip");
  assert.ok(S.NEWS.future.includes(TK.stockLine("news", {stock: S, era: "future", regard: "neutral", seed: 4}).say));
  assert.ok(S.WORK.earlymodern.includes(TK.stockLine("work", {stock: S, era: "earlymodern", regard: "like", seed: 5}).say));
  assert.ok(S.NONE.dislike.includes(TK.stockLine("none", {stock: S, regard: "dislike", seed: 6}).say));
  assert.equal(TK.stockLine("greet", {stock: null}), null);
});

test("the Foundry side: the Storyteller's lines first, stock after; a world setting and a per-NPC switch", () => {
  const t = src("modules/wodx-npc/scripts/talk.mjs"), m = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(t, /if \( ans \) return ans\.line;\s*return stockAnswer\(r, topic\);/);
  assert.match(t, /"stockTalk"/);
  assert.match(t, /savedProfile\(npc\)\.noStock/);
  assert.match(t, /heardBy\?\.\(npc\.id\)/);
  assert.match(m, /noStock: data\.noStock \? true : null/);
});
