import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC 0.58.0, Storyteller 0.61.1, Sheets 0.18.1: courtship, marriage and law, children, households, loved ones (B2817-B2825).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const imp = p => import(pathToFileURL(join(root, p)));
const H = await imp("modules/wodx-npc/scripts/hearts-rules.mjs");
const TR = await imp("modules/wodx-npc/scripts/ties-rules.mjs");
const WR = await imp("modules/wodx-chronicle/scripts/world-rules.mjs");

test("warmth moves by events, a liked kind counts double, and the supernatural truth caps or slows it", () => {
  let t = H.moveWarmth({}, "b", "gift", {nature: "Bon Vivant"});
  assert.equal(t.b.value, 2, "a Bon Vivant warms to gifts");
  t = H.moveWarmth(t, "b", "roll", {successes: 3}); assert.equal(t.b.value, 3);
  t = H.moveWarmth(t, "b", "cruelty"); assert.equal(t.b.value, 1);
  assert.equal(H.moveWarmth({}, "b", "roll", {botch: true}).b.value, -1);
  assert.equal(H.warmthWord(3), "Devoted"); assert.equal(H.warmthWord(-1), "Wary");
  const path = H.hindrance({line: "vampire", path: "Path of Night"}, {line: "mortal"});
  assert.equal(path.cap, 2);
  let c = {};
  for ( let i = 0; i < 5; i++ ) c = H.moveWarmth(c, "v", "time", {cap: path.cap});
  assert.equal(c.v.value, 2, "no more than Fond");
  const rage = H.hindrance({line: "werewolf", rage: 6}, {line: "mortal"});
  assert.ok(rage.halve);
  let r = {};
  for ( let i = 0; i < 4; i++ ) r = H.moveWarmth(r, "g", "time", {halve: true});
  assert.equal(r.g.value, 2, "half as fast");
  assert.equal(H.hindrance({line: "werewolf", rage: 6}, {line: "kinfolk"}).halve, false, "Kinfolk are not uneasy");
});

test("courtship customs for every way of life, from 1197 to the far future", () => {
  for ( const s of Object.keys(WR.SPHERES) ) for ( const y of [1197, 1600, 1890, 1950, 2000, 2100] ) assert.ok(H.courtshipFor(s, y).text, `${s} ${y}`);
  assert.equal(H.courtshipFor("latin", 1197).key, "arranged");
  assert.equal(H.courtshipFor("latin", 1800).key, "calling");
  assert.equal(H.courtshipFor("japanese", 1900).key, "miai");
  assert.equal(H.courtshipFor("latin", 2100).key, "net");
});

test("marriage law by place and year: rite, record, money, divorce, more than two, same-sex unions", () => {
  for ( const s of Object.keys(WR.SPHERES) ) assert.ok(H.SPHERE_MARRIAGE[s], `${s} has a marriage`);
  for ( const r of Object.keys(H.REGION_MARRIAGE) ) assert.ok(WR.WORLD_REGIONS[r], `${r} is a world region`);
  const m1300 = H.marriageLaw("moravia", 1300, "latin");
  assert.equal(m1300.divorce, false); assert.equal(m1300.record, "the priest and witnesses"); assert.equal(m1300.moneyKind.label, "Dowry");
  assert.equal(H.marriageLaw("moravia", 1600, "latin").record, "the parish register");
  const m1930 = H.marriageLaw("moravia", 1930, "latin");
  assert.ok(m1930.divorce && m1930.civil); assert.equal(m1930.record, "the civil register");
  assert.equal(H.marriageLaw("moravia", 2010, "latin").sameSex, "union");
  assert.equal(H.marriageLaw("france", 1850, "latin").divorce, false, "France took divorce away from 1816 to 1884");
  assert.equal(H.marriageLaw("france", 2015, "latin").sameSex, "marriage");
  assert.equal(H.marriageLaw("anatolia", 1700, "islamic").plural, true);
  assert.equal(H.marriageLaw("anatolia", 1930, "islamic").plural, false);
  assert.equal(H.marriageLaw("india", 1960, "indic").divorce, true);
  const law = H.marriageLaw("moravia", 1300, "latin");
  assert.equal(H.canMarry(law, {sexes: ["f", "f"]}).ok, false);
  assert.equal(H.canMarry(law, {sexes: ["m", "f"], married: [1, 0]}).ok, false);
  assert.equal(H.canMarry(law, {sexes: ["m", "f"]}).ok, true);
  assert.equal(H.canMarry(H.marriageLaw("aegean", 1600, "islamic"), {sexes: ["m", "f"], married: [1, 0]}).ok, true);
  assert.equal(H.marriagePayment("dowry", 1000), 100); assert.equal(H.marriagePayment("none", 1000), 0);
});

test("children: who can have them, and what the child of each pairing is", () => {
  assert.equal(H.childOf(["vampire", "mortal"]), null);
  assert.equal(H.childOf(["werewolf", "werewolf"]).kind, "metis");
  assert.equal(H.childOf(["werewolf", "mortal"], 0.05).kind, "garou-to-be");
  assert.equal(H.childOf(["werewolf", "mortal"], 0.5).kind, "kinfolk");
  assert.equal(H.childOf(["changeling", "mortal"]).kind, "kinain");
  assert.match(H.childOf(["mage", "mortal"]).note, /Awaken/);
  assert.equal(H.childOf(["mortal", "mortal"]).line, "mortal");
  assert.equal(H.childStage(1), "infant"); assert.equal(H.childStage(15), "youth"); assert.equal(H.childStage(30), "grown");
});

test("households: the monthly keep by role, and the Masquerade risk of mortals in a haven", () => {
  const list = [{id: "s", role: "spouse"}, {id: "c", role: "child"}, {name: "Maid", role: "servant"}, {name: "x", role: "nonsense"}];
  const c = H.householdCost(list, 100, 2);
  assert.equal(c.rows.length, 4); assert.equal(c.rows[3].role, "kin");
  assert.equal(c.total, (50 + 25 + 60 + 40) * 2);
  assert.equal(H.masqueradeRisk("vampire", list), 2); assert.equal(H.masqueradeRisk("mage", list), 0);
  assert.equal(H.masqueradeRisk("vampire", [{id: "g", role: "ghoul"}]), 0);
});

test("loved ones: who counts as close, and the checks each line rolls", () => {
  assert.ok(H.isClose("spouse")); assert.ok(H.isClose("lover")); assert.ok(!H.isClose("friend", 1)); assert.ok(H.isClose("friend", 2)); assert.ok(!H.isClose("rival", 3));
  assert.match(H.weakSpotChecks("vampire", "child", "harm", {name: "Ana"})[0].text, /frenzy/);
  assert.match(H.weakSpotChecks("werewolf", "spouse", "taken")[0].text, /Rage/);
  assert.ok(H.weakSpotChecks("werewolf", "spouse", "taken").some(c => /Ledger/.test(c.text)));
  const d = H.weakSpotChecks("mortal", "child", "death", {name: "Ana"});
  assert.match(d[0].text, /difficulty 8/); assert.ok(d.some(c => /Derangement/.test(c.text)));
  assert.ok(!H.weakSpotChecks("mortal", "friend", "death").some(c => /Derangement/.test(c.text)));
  assert.ok(H.weakSpotChecks("changeling", "lover", "death").some(c => /Banality/.test(c.text)));
});

test("warmth shows on lover and spouse ties", () => {
  const actors = [{id: "a", name: "Ana", flags: {"wodx-npc": {warmth: {bbbbbbbbbbbbbbbb: {value: 2}}}, "wodx-sheets": {ties: [{uuid: "Actor.bbbbbbbbbbbbbbbb", role: "lover"}]}}}, {id: "bbbbbbbbbbbbbbbb", name: "Bo"}];
  const e = TR.edges(actors).find(x => x.from === "a" && x.kind === "lover");
  assert.equal(e.warmth, "Fond");
});

test("wiring: the month hook from Storyteller, the setting, the hooks and the API", () => {
  const h = src("modules/wodx-npc/scripts/hearts.mjs"), main = src("modules/wodx-npc/scripts/main.mjs"), money = src("modules/wodx-storyteller/scripts/money.mjs");
  assert.match(money, /Hooks\.callAll\("wodxMonthPaid"/);
  assert.match(h, /Hooks\.on\("wodxMonthPaid"/); assert.match(h, /register\(MOD, "heartCards"/);
  for ( const k of ["wodxDamageApplied", "updateActor"] ) assert.match(h, new RegExp(`Hooks\\.on\\("${k}"`));
  assert.match(main, /HEARTS\.listen\(\);/); assert.match(main, /hearts: \{warmth: HEARTS\.warmthOf/);
  const sm = src("modules/wodx-storyteller/scripts/main.mjs");
  for ( const k of ["purse: Money.purseOf", "pay: Money.pay", "transfer: Money.transfer", "money: Money.moneyNow", "rules: MoneyRules"] ) assert.ok(sm.includes(k), k);
});
