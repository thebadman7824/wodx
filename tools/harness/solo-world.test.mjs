import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Solo, step 3 of The Lone Chronicle: the oracle, the Leads page and night encounters (B5980 to B5985) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/world-rules.mjs")));

test("the oracle: each step of the odds is two faces of the die", () => {
  const yeses = k => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter(f => W.ANSWERS[W.oracleAnswer(k, f)].yes).length;
  assert.deepEqual(W.ODDS_ORDER.map(yeses), [9, 7, 5, 3, 1]);
  assert.equal(W.oracleAnswer("nonsense", 6), "yesBut", "unknown odds are even");
});

test("the oracle: and, but, and the edges", () => {
  assert.equal(W.oracleAnswer("even", 10), "yesAnd");
  assert.equal(W.oracleAnswer("even", 1), "noAnd");
  assert.equal(W.oracleAnswer("even", 6), "yesBut");
  assert.equal(W.oracleAnswer("even", 5), "noBut");
  assert.equal(W.oracleAnswer("even", 8), "yes");
  assert.equal(W.oracleAnswer("even", 3), "no");
  assert.equal(W.oracleAnswer("unlikely", 10), "yes", "no 'and' at poor odds");
  assert.equal(W.oracleAnswer("unlikely", 1), "no");
  assert.equal(W.oracleAnswer("hardly", 10), "yesBut", "a 10 just makes it at Hardly");
  assert.equal(W.oracleAnswer("hardly", 9), "noBut");
  assert.equal(W.oracleAnswer("sure", 1), "noAnd", "a 1 is always a no");
  assert.equal(W.oracleAnswer("sure", 2), "yesBut");
  assert.ok(W.ANSWERS.yesAnd.lead && W.ANSWERS.noAnd.lead && !W.ANSWERS.yes.lead);
});

test("the oracle keeps its questions clean and its record short", () => {
  assert.equal(W.cleanQuestion("  Is   the door\nlocked? "), "Is the door locked?");
  assert.equal(W.cleanQuestion("   "), null);
  assert.equal(W.cleanQuestion("x".repeat(300)).length, 200);
  let list = [];
  for ( let i = 0; i < 40; i++ ) list = W.addAsked(list, {at: i, q: `q${i}`, odds: "likely", face: 5, answer: "yes"});
  assert.equal(list.length, W.ORACLE_KEEP);
  assert.equal(list.at(-1).q, "q39");
  assert.equal(W.addAsked([], {q: "x", odds: "bad", answer: "bad"})[0].odds, "even");
});

test("the Leads page: what the character knows of, and nothing else", () => {
  const me = {id: "A1", name: "Ilse"};
  const ledger = [
    {id: "o1", kind: "oath", status: "open", from: me, to: {id: "B", name: "the Prince"}, what: "Guard the gate", made: 10},
    {id: "d1", kind: "debt", status: "open", from: {id: null, name: "Jakob"}, to: {id: null, name: "ilse"}, what: "Ten groschen", made: 20},
    {id: "b1", kind: "boon", size: "minor", status: "open", from: me, to: {id: "C", name: "Vera"}, what: "", made: 5},
    {id: "c1", kind: "consequence", status: "open", from: me, to: {id: null, name: ""}, what: "The watch finds the body", made: 30},
    {id: "k1", kind: "oath", status: "kept", from: me, to: {id: "B", name: "the Prince"}, what: "Old", made: 1},
    {id: "x1", kind: "oath", status: "open", from: {id: "Z", name: "Zed"}, to: {id: "Y", name: "Yan"}, what: "Not mine", made: 1},
    {id: "j1", kind: "objective", status: "open", from: me, to: {id: null, name: ""}, what: "Find the ledger", made: 40,
      steps: [{text: "Reach the mill", done: true}, {text: "Open the chest", done: false}]},
    {id: "j2", kind: "objective", status: "open", from: me, to: {id: null, name: ""}, what: "Done already", made: 41, steps: [{text: "a", done: true}]}
  ];
  const aids = [{id: "m1", at: 100, title: "A foreshadowing", text: "A crow on the sill."}];
  const asked = W.addAsked([], {at: 50, q: "Is the mill watched?", odds: "even", face: 9, answer: "yes", actorId: "A1"});
  const rows = W.leadsFor({actorId: "A1", actorName: "Ilse", aids, ledger, asked});
  const ids = rows.map(r => r.id);
  assert.deepEqual(rows.map(r => r.kind), ["aid", "ledger", "ledger", "ledger", "objective", "oracle"]);
  assert.ok(!ids.includes("ledger:c1"), "a consequence stays the Storyteller's");
  assert.ok(!ids.includes("ledger:k1") && !ids.includes("ledger:x1") && !ids.includes("ledger:j2"));
  assert.equal(rows.find(r => r.id === "ledger:o1").title, "An oath you swore to the Prince");
  assert.equal(rows.find(r => r.id === "ledger:d1").title, "A debt Jakob owes you", "a typed name matches the character");
  assert.equal(rows.find(r => r.id === "ledger:b1").title, "A boon (minor) you owe Vera");
  assert.equal(rows.find(r => r.kind === "objective").text, "Next: Open the chest");
  assert.equal(rows.find(r => r.kind === "oracle").text, "Yes");
  // letting go
  const done = W.letGo([], "ledger:o1");
  assert.ok(!W.leadsFor({actorId: "A1", actorName: "Ilse", aids, ledger, asked, done}).some(r => r.id === "ledger:o1"));
  assert.equal(W.letGo(Array.from({length: 250}, (_, i) => `x${i}`), "y").length, W.DONE_KEEP);
});

test("the Leads page keeps only the newest signs", () => {
  const aids = Array.from({length: 15}, (_, i) => ({id: `m${i}`, at: i, title: "A dream", text: `${i}`}));
  const rows = W.leadsFor({actorId: "A", aids});
  assert.equal(rows.length, W.AID_KEEP);
  assert.equal(rows[0].text, "14");
});

test("night encounters: which scenes take them", () => {
  assert.equal(W.placeKind({name: "Rothenstein market"}), "town");
  assert.equal(W.placeKind({name: "The road to Brumov"}), "wilds");
  assert.equal(W.placeKind({name: "Forest by the pass"}), "wilds");
  assert.equal(W.placeKind({name: "Battle map 3"}), null);
  assert.equal(W.placeKind({name: "The Penumbra over the mill"}), null);
  assert.equal(W.placeKind({name: "The road", town: true}), "town", "a settlement wins over the words");
  assert.equal(W.placeKind({name: "Market", flag: "wilds"}), "wilds", "the Storyteller's flag wins");
  assert.equal(W.placeKind({name: "Market", flag: "none"}), null);
});

test("night encounters: one roll for each part of each night, only at night", () => {
  const key = W.nightKey(86400.4, "deep");
  assert.equal(key, "86400:deep");
  assert.deepEqual(W.encounterDue({night: false, key, kind: "town", roll: 0}), {roll: false, comes: false});
  assert.deepEqual(W.encounterDue({night: true, key, kind: null, roll: 0}), {roll: false, comes: false});
  assert.deepEqual(W.encounterDue({night: true, key, kind: "town", rolled: [key], roll: 0}), {roll: false, comes: false});
  assert.deepEqual(W.encounterDue({night: true, key, kind: "town", roll: 0.2}), {roll: true, comes: true});
  assert.deepEqual(W.encounterDue({night: true, key, kind: "town", roll: 0.5}), {roll: true, comes: false});
  assert.ok(Math.abs(W.CHANCE - 1 / 3) < 1e-9);
  let list = [];
  for ( let i = 0; i < 70; i++ ) list = W.markRolled(list, `k${i}`);
  assert.equal(list.length, W.KEYS_KEEP);
  assert.equal(W.markRolled(["a", "b"], "a").join(), "b,a");
});

test("night encounters come in a few squares off, inside the map and not through a wall", () => {
  const scene = {width: 4000, height: 3000, padding: 0, grid: {size: 100}};
  const s = W.arrivalSpot({x: 1000, y: 1000}, scene);
  assert.deepEqual(s, {x: 1600, y: 1000});
  // the east is walled: the ring turns west
  assert.deepEqual(W.arrivalSpot({x: 1000, y: 1000}, scene, x => x > 1000), {x: 400, y: 1000});
  // in a corner the ring finds room inside
  const c = W.arrivalSpot({x: 0, y: 0}, scene);
  assert.ok(c.x >= 0 && c.y >= 0 && (c.x >= 400 || c.y >= 400));
  // padding: the map starts past it
  const p = W.arrivalSpot({x: 1000, y: 1000}, {width: 2000, height: 2000, padding: 0.25, grid: {size: 100}});
  assert.ok(p.x >= 500 && p.y >= 500);
  // no room at all
  assert.equal(W.arrivalSpot({x: 0, y: 0}, {width: 300, height: 300, grid: {size: 100}}), null);
});

test("the seat's side: wired to the panel, the socket and the clock", () => {
  const src = readFileSync(join(root, "modules/wodx-solo/scripts/world.mjs"), "utf8");
  for ( const k of ["ask.oracle", "ask.leads", "ask.letgo", "leads.rows"] ) assert.ok(src.includes(`"${k}"`), k);
  assert.match(src, /Hooks\.on\("updateWorldTime"/);
  assert.match(src, /night\.place\(text, [^\n]*hidden: false/);
  assert.match(src, /new Roll\("1d10"\)/);
  const main = readFileSync(join(root, "modules/wodx-solo/scripts/main.mjs"), "utf8");
  assert.match(main, /registerWorldSettings\(\)/);
  assert.match(main, /installWorld\(/);
  assert.match(main, /world: worldApi/);
});
