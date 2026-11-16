import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* WoDX Solo, step 5 of The Lone Chronicle: the Beast, torpor and the years, death and heirs (B6530 to B6536) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const F = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/fate-rules.mjs")));
const KR = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/kindred-rules.js")));
const src = readFileSync(join(root, "modules/wodx-solo/scripts/fate.mjs"), "utf8");

test("the Beast goes for an enemy in sight, else the nearest living being, within reach", () => {
  const c = [
    {id: "me", self: true, yards: 0},
    {id: "maid", yards: 4},
    {id: "guard", yards: 12, hostile: true},
    {id: "corpse", yards: 1, dead: true},
    {id: "unseen", yards: 2, hidden: true, hostile: true},
    {id: "far", yards: 90, hostile: true}
  ];
  assert.equal(F.preyOf(c).id, "guard");
  assert.equal(F.preyOf(c.filter(x => x.id !== "guard")).id, "maid");
  assert.equal(F.preyOf([{id: "me", self: true, yards: 0}, {id: "far", yards: 90}]), null);
  assert.equal(F.preyOf([]), null);
});

test("Willpower buys one turn of control, for the Kindred and their ghouls, in a fight (V20 pdf 307)", () => {
  const key = F.roundKey("c1", 3);
  assert.equal(key, "c1:3");
  assert.ok(F.canFightBeast({kind: "kindred", frenzy: true, willpower: 2, inFight: true, held: null, key}).ok);
  assert.ok(F.canFightBeast({kind: "ghoul", frenzy: true, willpower: 1, inFight: true, key}).ok);
  assert.equal(F.canFightBeast({kind: "lupine", frenzy: true, willpower: 5, inFight: true, key}).ok, false);
  assert.equal(F.canFightBeast({kind: "kindred", frenzy: true, willpower: 0, inFight: true, key}).ok, false);
  assert.equal(F.canFightBeast({kind: "kindred", frenzy: true, willpower: 3, inFight: false, key}).ok, false);
  assert.equal(F.canFightBeast({kind: "kindred", frenzy: true, willpower: 3, inFight: true, held: key, key}).ok, false, "the turn is held already");
  assert.ok(F.canFightBeast({kind: "kindred", frenzy: true, willpower: 3, inFight: true, held: F.roundKey("c1", 2), key}).ok, "last round's hold is over");
  assert.equal(F.canFightBeast({kind: "kindred", frenzy: false, willpower: 3, inFight: true, key}).ok, false);
});

test("dead is the dead status, a death date or Final Death; torpor is not death", () => {
  assert.ok(F.fallen({statuses: new Set(["dead"])}));
  assert.ok(F.fallen({statuses: [], died: 12345}));
  assert.ok(F.fallen({finalDeath: {at: "the square"}}));
  assert.equal(F.fallen({statuses: ["unconscious"], died: null}), false);
  assert.equal(F.fallen({}), false);
});

test("the years: a Cainite sleeps no shorter than half the Road's torpor; the chronicle's end caps it", () => {
  const m = F.sleepPlan({kind: "mortal", year: 1200, years: 10});
  assert.equal(m.ok, true); assert.equal(m.years, 10); assert.equal(m.torpor, false);
  const v = F.sleepPlan({kind: "kindred", road: 4, year: 1200, years: 1});
  assert.equal(v.torpor, true); assert.equal(v.years, 5, "Road 4: a decade's torpor, half of it by choice");
  assert.ok(v.capped);
  assert.equal(F.sleepPlan({kind: "kindred", road: 8, year: 1200, years: 25}).years, 25);
  assert.equal(F.sleepPlan({kind: "mortal", year: 2015, years: 25}).years, 7, "the main timeline ends in 2022");
  assert.equal(F.sleepPlan({kind: "mortal", year: 2015, years: 25, futureBranch: true}).years, 25, "the Future Darkness branch runs on");
  assert.equal(F.sleepPlan({kind: "mortal", year: 2022, years: 5}).ok, false);
  // the same table WoDX Actions keeps for torpor
  for ( let road = 0; road <= 10; road++ ) assert.equal(F.TORPOR_DAYS[road] * 86400, KR.torporUntil(0, road));
  assert.deepEqual(F.SLEEPS, [1, 5, 10, 25, 50, 100]);
});

test("heirs: the childe first, then ghoul, heir, family, a tie on the sheet; the dead and groups left out", () => {
  const dead = {id: "D", uuid: "Actor.D", family: "zerotin", ties: [{uuid: "Actor.T", role: "squire"}]};
  const list = [
    {id: "T", uuid: "Actor.T", name: "Tomas"},
    {id: "K", uuid: "Actor.K", name: "Katarina", family: "zerotin"},
    {id: "G", uuid: "Actor.G", name: "Gustav", domitor: "D"},
    {id: "C", uuid: "Actor.C", name: "Clothilde", sire: "D"},
    {id: "H", uuid: "Actor.H", name: "Heir of Dietrich", heirOf: "D"},
    {id: "X", uuid: "Actor.X", name: "Xaver", sire: "D", dead: true},
    {id: "P", uuid: "Actor.P", name: "The coterie", sire: "D", group: true},
    {id: "S", uuid: "Actor.S", name: "Stranger"},
    {id: "M", uuid: "Actor.M", name: "My second", mine: true},
    {id: "D", uuid: "Actor.D", name: "Dietrich", sire: "D"}
  ];
  const h = F.heirsOf(dead, list);
  assert.deepEqual(h.map(x => x.id), ["C", "G", "H", "K", "T", "M"]);
  assert.equal(h.find(x => x.id === "T").label, "Tie: squire");
  assert.equal(h[0].label, "Childe");
  assert.deepEqual(F.heirsOf({id: "D"}, []), []);
});

test("an owner record passes to the heir with the year and where it came from", () => {
  const rec = {id: "Actor.D", kind: "actor", name: "Dietrich", held: "fief", since: 1180, stolen: true, takenBy: "Actor.Z"};
  const r = F.inherit(rec, {uuid: "Actor.C", name: "Clothilde"}, {year: 1230, from: "Dietrich"});
  assert.equal(r.id, "Actor.C"); assert.equal(r.name, "Clothilde"); assert.equal(r.held, "fief");
  assert.equal(r.since, 1230); assert.equal(r.stolen, false); assert.match(r.note, /Inherited from Dietrich/);
  assert.equal(F.inherit(null, {}), null);
});

test("the Foundry side: a stand-in for the Beast, the fight on the map, the years through Pass the Years, holdings passed", () => {
  assert.match(src, /setFlag\(ST, "standIn", true\)/);
  assert.match(src, /fight\?\.start/);
  assert.match(src, /planSkip/);
  assert.match(src, /applyPlan/);
  assert.match(src, /enterTorpor/);
  assert.match(src, /autoTorporRise/);
  assert.match(src, /passHoldings/);
  assert.match(src, /"ask\.fate\.heir"/);
  // a botched frenzy is left to WoDX Actions
  assert.match(src, /frenzyBotch/);
});
