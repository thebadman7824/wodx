import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Rumour and reputation: tales made from deeds (B3350-B3354) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const T = await imp("modules/wodx-storyteller/scripts/tale-rules.mjs");
const R = await imp("modules/wodx-storyteller/scripts/rumour-rules.mjs");

test("tales: words from slots", () => {
  assert.equal(T.taleText({who: "Ada", did: "struck the reeve", where: "the market", tone: -1, how: "badly"}), "Ada struck the reeve at the market, badly");
  assert.equal(T.taleText({who: "Ada", did: "kept a boon", where: "in Elysium"}), "Ada kept a boon in Elysium");
  assert.equal(T.normTale({tone: 9}).tone, 3);
  assert.equal(T.normTale({}).who, "someone");
});

test("tales: each leaning retells its own way", () => {
  const t = {who: "Ada", did: "struck the reeve", where: "the market", tone: -1};
  assert.equal(T.retell(t, "gossip").tone, -2);
  assert.equal(T.retell(t, "enemy").tone, -2);
  assert.equal(T.retell(t, "friend").tone, 0);
  assert.equal(T.retell({...t, tone: 3}, "gossip").tone, 3);
  assert.equal(T.retell(t, "stranger", () => 0.1).where, "somewhere near");
  assert.equal(T.retell(t, "stranger", () => 0.9).who, "someone like Ada");
  assert.equal(T.leaningOf({att: -2}), "enemy");
  assert.equal(T.leaningOf({att: 2}), "friend");
  assert.equal(T.leaningOf({}), "stranger");
  assert.equal(T.leaningOf({att: 2, gossip: true}), "gossip");
});

test("tales: a twist during spreading gives the hearer a new version, and plain tellings pass theirs on", () => {
  const r = R.normRumour({id: "a", text: "x", knownBy: ["n1"], about: "pc", tale: {who: "Ada", did: "struck the reeve", tone: -1}});
  assert.deepEqual(r.heardAs, {});
  const c = {n1: ["n2", "n3"], n2: ["n4"], n3: ["n5"]};
  let x = r;
  for ( let i = 0; i < 3; i++ ) x = R.spreadNight(x, c, () => 0.01, {twist: 1, leanings: {n1: "gossip", n2: "enemy", n3: "friend"}}).rumour;
  assert.equal(x.versions[x.heardAs.n2].tone, -2, "the gossip made it worse");
  assert.equal(x.versions[x.heardAs.n4].tone, -3, "the enemy darker still");
  let y = r;
  for ( let i = 0; i < 3; i++ ) y = R.spreadNight(y, c, () => 0.5, {twist: 0}).rumour;
  assert.equal(y.versions.length, 1);
  assert.ok(Object.values(y.heardAs).every(v => v === 0));
  const plain = R.normRumour({id: "b", text: "x"});
  assert.equal(plain.tale, undefined, "a rumour without a tale stays as it was");
});

test("tales: versions are capped, and the closest is given when full", () => {
  const vs = Array.from({length: T.MAX_VERSIONS}, (_, i) => ({who: `W${i}`, did: "x", tone: (i % 7) - 3}));
  const out = T.twistFor(vs, 0, "friend", () => 0.5);
  assert.equal(out.versions.length, T.MAX_VERSIONS);
  assert.equal(out.versions[out.index].tone, -2);
});

test("tales: NPCs meet a character with what they heard, by one step at most", () => {
  const rs = [R.normRumour({id: "a", text: "x", about: "pc", knownBy: ["n1", "n2"], tale: {who: "Ada", did: "x", tone: -3}}),
    R.normRumour({id: "b", text: "y", about: "pc", knownBy: ["n2"], tale: {who: "Ada", did: "y", tone: 3}})];
  assert.equal(T.toneFor(rs, "n1", "pc"), -1);
  assert.equal(T.toneFor(rs, "n2", "pc"), 0);
  assert.equal(T.toneFor(rs, "n9", "pc"), 0);
  assert.equal(T.toneFor(rs, "n1", "other"), 0);
});

test("tales: Fame widens the start, and the player's view groups the versions", () => {
  assert.equal(T.firstTellers({}), 1);
  assert.equal(T.firstTellers({fame: 3, crowd: true}), 6);
  assert.equal(T.firstTellers({fame: 12}), 6);
  const r = R.normRumour({id: "a", text: "x", about: "pc", knownBy: ["n1", "n2", "n3"], tale: {who: "Ada", did: "x", tone: -1},
    versions: [{who: "Ada", did: "x", tone: -1}, {who: "Ada", did: "x", tone: -2, how: "cruelly"}], heardAs: {n1: 0, n2: 1, n3: 1}});
  const v = T.aboutView([r], "pc", id => (id === "n1" ? "the court" : "the town"));
  assert.equal(v[0].community, "the town");
  assert.equal(v[0].heard, 2);
  assert.equal(v[0].versions[0].text, "Ada x, cruelly");
  assert.equal(T.toneOfDeed(-5), -3);
  assert.equal(T.toneOfDeed(0), 0);
});

test("tales: deeds and boons start them, and the first meeting reads them", () => {
  const s = src("modules/wodx-storyteller/scripts/rumours.mjs");
  assert.match(s, /Hooks\.on\("wodxBoonSettled"/);
  assert.match(s, /leanings: x\.tale \? leaningsFor\(x\)/);
  assert.match(src("modules/wodx-npc/scripts/standing.mjs"), /rumours\?\.tale\?\.\(/);
  assert.match(src("modules/wodx-npc/scripts/attitude.mjs"), /rumours\?\.toneFor\?\.\(/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /tale: Rumours\.startTale/);
});
