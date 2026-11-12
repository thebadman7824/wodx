import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as AN from "../../modules/wodx-npc/scripts/animal-rules.mjs";
import * as NR from "../../modules/wodx-npc/scripts/npc-rules.mjs";
import * as R from "../../modules/wodx-npc/scripts/routine-rules.mjs";

/* Animal archetypes (WoDX NPC 0.21.0, B1000 to B1004) */

const prof = k => NR.profileOf({}, k);
const foe = (more = {}) => ({id: "e1", name: "Foe", visible: true, distance: 1, reach: true, wounds: 0, fearSources: [], attackDice: 4, ...more});
const top = opts => opts[0].action;

test("every animal has a template, a routine that checks, a place kind that exists and a blood pool", () => {
  for ( const [k, a] of Object.entries(AN.ANIMALS) ) {
    assert.ok(NR.TEMPLATES[k], `${k} template`);
    assert.equal(NR.TEMPLATES[k].line, "beast");
    assert.equal(R.DEFAULT_PRESET[k], k);
    assert.deepEqual(R.checkBlocks(R.presetBlocks(k, "medieval")), [], `${k} blocks`);
    for ( const age of Object.keys(R.AGES) ) assert.ok(R.presetBlocks(k, age).length, `${k} in ${age}`);
    for ( const p of [...a.places, ...(a.town ?? [])] ) assert.ok(R.PLACE_KINDS[p], `${k} place ${p}`);
    for ( const b of a.preset.blocks ) assert.ok(R.ROLES[b.place], `${k} role ${b.place}`);
    for ( const t of a.template.tactics ) assert.ok(NR.TACTICS[t], `${k} tactic ${t}`);
    assert.ok(a.blood > 0 && a.blood <= 5, `${k} blood`);
    assert.ok(a.template.fears.includes("wraith"), `${k} shies from wraiths`);
    assert.ok(!a.template.fears.includes("supernatural"), `${k} takes no fright at Kindred`);
  }
});

test("animals keep to the places they belong in (Ben: no farm animals in back alleys, no birds in palaces)", () => {
  assert.ok(!AN.fits("cattle", {year: 1400, kind: "alley"}));
  assert.ok(!AN.fits("sheep-goats", {year: 1400, kind: "alley"}));
  assert.ok(!AN.fits("pigeons", {year: 1400, kind: "castle"}));
  assert.ok(!AN.fits("crows", {year: 1400, kind: "castle"}));
  assert.ok(AN.fits("rats", {year: 1400, kind: "alley"}));
  assert.ok(AN.fits("pigs", {year: 1400, kind: "street"}), "medieval pigs root in the lanes");
  assert.ok(!AN.fits("pigs", {year: 1900, kind: "street"}), "not after the sanitation rules");
  assert.ok(AN.fits("horse", {year: 1900, kind: "street"}));
  assert.ok(!AN.fits("horse", {year: 1990, kind: "street"}));
});

test("animals follow the years", () => {
  assert.ok(AN.inYear("wolf", 1300));
  assert.ok(!AN.inYear("wolf", 1900));
  assert.ok(AN.inYear("wolf", 2010), "back in the Beskydy");
  assert.ok(!AN.inYear("bear", 1850));
  assert.ok(!AN.inYear("hound", 1990));
  assert.ok(AN.inYear("rats", 2050));
  assert.equal(AN.commonness("stray-dog", 1950), 0.4);
  assert.equal(AN.commonness("stray-dog", 1500), 1);
  assert.ok(AN.inYear("bear", 0), "no year known: found");
});

test("passers-by animal kinds map to archetypes by place", () => {
  assert.equal(AN.forCrowd("bird", {year: 1300, kind: "market"}), "pigeons");
  assert.equal(AN.forCrowd("bird", {year: 1300, kind: "wilds"}), "crows");
  assert.equal(AN.forCrowd("dog", {year: 1300, kind: "home"}), "guard-dog");
  assert.equal(AN.forCrowd("dog", {year: 1990, kind: "alley"}), "stray-dog");
  assert.equal(AN.forCrowd("geese", {year: 1300, kind: "yard"}), "poultry");
  assert.equal(AN.forCrowd("cattle", {year: 1300, kind: "yard"}), "cattle");
  for ( const k of ["dog", "cat", "rat", "bird", "pig", "goat", "geese", "horse", "cattle"] ) assert.ok(AN.forCrowd(k, {year: 1500}), k);
  assert.equal(AN.forCrowd("unicorn", {year: 1500}), null);
});

test("names guess the animal, and templateFor uses it for beasts only", () => {
  assert.equal(AN.guessAnimal("Old Mastiff"), "guard-dog");
  assert.equal(AN.guessAnimal("A brown rat"), "rats");
  assert.equal(AN.guessAnimal("Grey wolf"), "wolf");
  assert.equal(AN.guessAnimal("Ratibor the smith"), null);
  assert.equal(NR.templateFor({kind: "beast", animal: "wolf"}), "wolf");
  assert.equal(NR.templateFor({kind: "beast", animal: null}), "beast");
  assert.equal(NR.templateFor({kind: "mortal", animal: "wolf"}), "civilian");
  assert.ok(AN.isAnimal("cat") && AN.isAnimal("beast") && !AN.isAnimal("guard"));
});

test("seasons: cattle pasture in summer, bears sleep in winter", () => {
  const at = (month, hour = 12, isNight = false) => () => ({hour, minute: 0, dayOfWeek: 2, isNight, feast: false, month});
  const cattle = R.presetBlocks("cattle");
  assert.equal(R.blockAt(cattle, 0, at(6)).block.activity, "graze");
  assert.equal(R.blockAt(cattle, 0, at(1)).block.activity, "rest");
  const bear = R.presetBlocks("bear");
  assert.equal(R.blockAt(bear, 0, at(1)).block.label, "Asleep for the winter");
  assert.equal(R.blockAt(bear, 0, at(6)).block.activity, "wander");
  // a describe with no month keeps the block (old callers)
  assert.equal(R.blockAt(cattle, 0, () => ({hour: 12, minute: 0, dayOfWeek: 2, isNight: false, feast: false})).block.activity, "graze");
});

test("herd and scatter: flocks run, a lone sheep runs sooner", () => {
  const sheep = prof("sheep-goats");
  assert.equal(top(NR.scoreOptions(sheep, {self: {wounds: 0}, enemies: [foe()], allies: []})), "flee");
  const p = prof("pigeons");
  const r = R.pickReaction(p, {weapon: true});
  assert.equal(r[0].action, "flee");
  assert.ok(!r.some(o => o.action === "send"), "birds never send for the watch");
  assert.ok(!r.some(o => o.action === "alarm"), "only callers raise a racket");
});

test("territory: a guard dog fights on its own patch and barks at trespass", () => {
  const dog = prof("guard-dog");
  const home = NR.scoreOptions(dog, {self: {wounds: 0, onGround: true}, enemies: [foe()], allies: []});
  const away = NR.scoreOptions(dog, {self: {wounds: 0, onGround: false}, enemies: [foe()], allies: []});
  assert.equal(top(home), "attack");
  assert.ok(home.find(o => o.action === "attack").score > away.find(o => o.action === "attack").score);
  const r = R.pickReaction(dog, {trespass: true, homeGround: true});
  assert.ok(["challenge", "fight"].includes(r[0].action));
  assert.ok(r.find(o => o.action === "challenge").why.startsWith("barks"));
  assert.ok(r.some(o => o.action === "alarm" && o.why === "raises a racket"));
});

test("stalk and hunger: a wolf goes for the one alone, bolder in the lean months", () => {
  const wolf = prof("wolf");
  const st = (alone, hungry) => NR.scoreOptions(wolf, {self: {wounds: 0, hungry}, enemies: [foe({alone})], allies: [{id: "a", name: "Pack"}]}).find(o => o.action === "attack").score;
  assert.ok(st(true, false) > st(false, false));
  assert.ok(st(true, true) > st(true, false));
  assert.ok(AN.isHungry(wolf, 1) && !AN.isHungry(wolf, 7) && !AN.isHungry(prof("cat"), 1));
  const lean = R.pickReaction(wolf, {hungry: true, alone: true}).find(o => o.action === "fight").score;
  const fed = R.pickReaction(wolf, {}).find(o => o.action === "fight").score;
  assert.ok(lean > fed);
});

test("swarm and scavenge: rats pile onto the fallen", () => {
  const rats = prof("rats");
  const two = [{id: "a", name: "r1"}, {id: "b", name: "r2"}];
  const opts = NR.scoreOptions(rats, {self: {wounds: 0}, enemies: [foe({id: "down", wounds: 6}), foe({id: "up"})], allies: two});
  const atk = id => opts.find(o => o.action === "attack" && o.target === id).score;
  assert.ok(atk("down") > atk("up"));
});

test("animals shy from wraiths but not from Kindred (Ben, 2026-11-12)", () => {
  const horse = prof("horse");
  const kindred = R.pickReaction(horse, {supernatural: true});
  assert.equal(kindred[0].action, "ignore", "a Kindred showing itself does not spook a horse");
  const ghost = R.pickReaction(horse, {supernatural: true, wraith: true});
  assert.equal(ghost[0].action, "flee");
  const fight = NR.scoreOptions(horse, {self: {wounds: 0}, enemies: [foe({fearSources: ["wraith"]})], allies: []});
  assert.equal(top(fight), "flee");
  const kfight = NR.scoreOptions(prof("guard-dog"), {self: {wounds: 0}, enemies: [foe({supernatural: true})], allies: []});
  assert.equal(top(kfight), "attack");
});

test("existing templates are unchanged by the new traits", () => {
  const g = prof("guard");
  assert.equal(g.herd, undefined);
  const r = R.pickReaction(g, {trespass: true});
  assert.ok(r.some(o => o.action === "send"));
  assert.ok(NR.parsePhases("Starving: wounds >= 1 => hunger 2, herd 0").problems.length === 0);
});

test("the runtime wires animals in", () => {
  const main = readFileSync(new URL("../../modules/wodx-npc/scripts/main.mjs", import.meta.url), "utf8");
  const rt = readFileSync(new URL("../../modules/wodx-npc/scripts/routines.mjs", import.meta.url), "utf8");
  assert.match(main, /animal: animalOf\(actor\)/);
  assert.match(main, /pb\?\.animal === true \? pb\.kind/, "passers-by: animal is true and kind names it");
  assert.match(main, /out\.add\("wraith"\)/);
  assert.match(main, /hungry: AN\.isHungry/);
  assert.match(rt, /wraith: ctx\.C\?\.\(\)\?\.getKind\?\.\(intruder\) === "wraith"/);
  assert.doesNotMatch(rt, /template === "beast"/);
});
