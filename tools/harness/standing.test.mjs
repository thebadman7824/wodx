import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.59.0, Storyteller 0.63.0, Actions 3.60.0: standing, gossip along ties, rank and feuds (B2863-B2871).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const S = await imp("modules/wodx-npc/scripts/standing-rules.mjs");
const RR = await imp("modules/wodx-storyteller/scripts/rumour-rules.mjs");
const RV = await imp("modules/wodx-npc/scripts/rivalry-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");
const DAY = 86400;

test("standing: a deed counts where it was done at once, elsewhere when the news arrives, and small deeds stay local", () => {
  const deeds = [{id: "1", community: "town", delta: 2, region: "moravia", at: 0, text: "Saved the mill"}, {id: "2", community: "town", delta: 1, region: "moravia", at: 0},
    {id: "3", community: "kindred", delta: -3, region: "italy", at: 0}];
  const delay = (a, b) => (a === b ? 0 : 5 * DAY);
  const massOf = r => (r === "mexico" ? "americas" : "old");
  assert.equal(S.standingIn(deeds, "town", "moravia", DAY, {delay, massOf}).value, 3);
  const away = S.standingIn(deeds, "town", "german-lands", DAY, {delay, massOf});
  assert.equal(away.value, 0); assert.equal(away.coming.length, 1, "the big deed is on its way");
  assert.equal(S.standingIn(deeds, "town", "german-lands", 6 * DAY, {delay, massOf}).value, 2, "the small deed never gets there");
  assert.equal(S.standingIn(deeds, "town", "mexico", 60 * DAY, {delay, massOf}).value, 0, "a big deed does not cross the ocean");
  assert.equal(S.standingIn(deeds, "kindred", "mexico", 60 * DAY, {delay, massOf}).value, -3, "a great one does");
  assert.equal(S.standingIn(deeds, "kindred", "mexico", 60 * DAY, {delay: () => null, massOf}).value, 0, "no way for the news, no news");
  assert.equal(S.standingWord(-3), "In disgrace"); assert.equal(S.standingWord(4), "Renowned");
});

test("community names follow the way of life and the century", () => {
  assert.equal(S.communityLabel("faith", {sphere: "islamic"}), "The mosque and the ulama");
  assert.equal(S.communityLabel("law", {year: 1300}), "The watch and the courts");
  assert.equal(S.communityLabel("law", {year: 1900}), "The police and the courts");
  assert.equal(S.communityLabel("trade", {year: 2000}), "Business");
  for ( const k of Object.keys(S.COMMUNITIES) ) assert.ok(S.communityLabel(k, {year: 2200}), k);
});

test("rank ladders for every way of life from 1197 to the far future, carried across a jump", () => {
  for ( const s of Object.keys(WR.SPHERES) ) for ( const y of [1197, 1600, 1850, 1960, 2100] ) assert.ok(S.ladder(S.ladderFor(s, y)).length >= 6, `${s} ${y}`);
  assert.equal(S.ladderFor("latin", 1197), "latin-medieval"); assert.equal(S.ladderFor("japanese", 1700), "japanese-old"); assert.equal(S.ladderFor("latin", 2100), "future");
  const knight = {ladder: "latin-medieval", step: 5};
  assert.equal(S.rankWord(knight), "Knight");
  const later = S.carryRank(knight, "modern");
  assert.equal(later.ladder, "modern"); assert.ok(later.step >= 3);
  assert.equal(S.rankShift(knight, {ladder: "latin-medieval", step: 0}), -1, "a serf defers to a knight");
  assert.equal(S.rankShift({ladder: "latin-medieval", step: 0}, knight), 1, "a knight looks down on a serf");
  assert.equal(S.rankShift(knight, {ladder: "latin-medieval", step: 4}), 0);
  assert.match(S.matchObjection(knight, {ladder: "latin-medieval", step: 0}, 1300), /object/);
  assert.equal(S.matchObjection({ladder: "modern", step: 3}, {ladder: "modern", step: 1}, 2000), "");
  assert.equal(S.moveRank(knight, "title").step, 7); assert.equal(S.moveRank(knight, "disgrace").step, 3);
});

test("feuds: the law by place and year, the ways to settle, heirs on the side, and rivalry rows", () => {
  assert.equal(S.feudLaw("moravia", 1300, "latin").key, "lawful");
  assert.equal(S.feudLaw("moravia", 1600, "latin").key, "outlawed");
  assert.equal(S.feudLaw("arabia", 1300, "islamic").key, "bloodMoney");
  assert.equal(S.feudLaw("arabia", 2000, "islamic").key, "bloodMoney");
  assert.equal(S.feudLaw("japan", 1600, "japanese").key, "custom");
  assert.equal(S.feudLaw("italy", 1850, "latin").key, "custom");
  assert.ok(S.settlements(S.feudLaw("moravia", 1300), 1300).some(s => s.key === "duel"));
  assert.ok(!S.settlements(S.feudLaw("moravia", 1990), 1990).some(s => s.key === "duel"));
  const f = {id: "f1", a: {kind: "family", key: "Kessler", name: "Kessler"}, b: {kind: "clan", key: "tzimisce", name: "the Tzimisce"}, heat: 2};
  assert.deepEqual(S.feudSides([f], {family: "kessler"}), ["feud:f1a"]);
  assert.deepEqual(S.feudSides([f], {clan: "Tzimisce antitribu"}), ["feud:f1b"]);
  assert.deepEqual(S.feudSides([{...f, ended: 5}], {family: "kessler"}), []);
  assert.equal(S.feudSides([{id: "f2", a: {kind: "line", key: "L1"}, b: {kind: "family", key: "x"}}], {lines: ["L1"]})[0], "feud:f2a", "a descendant in the family line inherits it");
  const rows = S.feudRows([f]);
  assert.equal(rows[0].ab, -2);
  const between = RV.rowsBetween(["feud:f1a"], ["feud:f1b"], 1500, rows);
  assert.ok(between.length >= 1, "the rivalry rules read the feud row");
  assert.equal(S.feudKilling(f).heat, 3); assert.equal(S.feudKilling({...f, heat: 3}).heat, 3);
});

test("gossip: ties join NPCs, a rumour keeps its source, subject and truth, and denials slow it", () => {
  const edges = [{from: "a", to: {id: "b"}, kind: "friend"}, {from: "a", to: {id: "p"}, kind: "friend"}, {from: "a", to: {id: "c"}, kind: "enemy"}];
  const pairs = RR.tiePairs(edges, id => id !== "p");
  assert.deepEqual(pairs, [["a", "b"]], "players and enemies are left out");
  const r = RR.normRumour({id: "r", text: "x", source: "a", about: "b", truth: "half", doubt: 7});
  assert.equal(r.source, "a"); assert.equal(r.truth, "half"); assert.equal(r.doubt, 3);
  assert.equal(RR.normRumour({id: "r", text: "x", truth: "maybe"}).truth, "unknown");
  assert.equal(RR.heatAfterDoubt(2, 1), 1); assert.equal(RR.heatAfterDoubt(2, 3), 0); assert.equal(RR.heatAfterDoubt(Infinity, 0), Infinity); assert.equal(RR.heatAfterDoubt(Infinity, 1), 2);
});

test("wiring: rumours read ties, rivalry reads feuds, Actions reads rank, and the API", () => {
  const ru = src("modules/wodx-storyteller/scripts/rumours.mjs"), rv = src("modules/wodx-npc/scripts/rivalry.mjs"), so = src("modules/wodx-actions/scripts/social.js"), main = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(ru, /RR\.tiePairs\(npc\(\)\?\.ties\?\.edges/); assert.match(ru, /heatAfterDoubt/); assert.match(ru, /export async function doubtRumour/);
  assert.match(rv, /feudApi\(\)\?\.feudRows/); assert.match(rv, /\.\.\.feudSides\(actor\)\]/);
  assert.match(so, /standing\?\.rankShift\?\.\(actor, npc\)/); assert.match(so, /bondShift \+ rankShift/);
  assert.match(main, /STANDING\.registerSettings\(\);/); assert.match(main, /standing: \{deed: STANDING\.deed/);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /doubt: Rumours\.doubtRumour/);
});

test("a feud with capitals in its id still matches its rivalry row (NPC 0.68.0)", () => {
  const f = {id: "ttWkOCxfKpCCApNn", a: {kind: "family", key: "Gatefeud", name: "Gatefeud"}, b: {kind: "family", key: "Gaterival", name: "Gaterival"}, heat: 2};
  const rows = S.feudRows([f]);
  assert.equal(RV.rowsBetween(["feud:ttWkOCxfKpCCApNna"], ["feud:ttWkOCxfKpCCApNnb"], 1300, rows).length, 1);
});
