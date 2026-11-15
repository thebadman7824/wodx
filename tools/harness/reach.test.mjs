import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The world's own hand (B4860-B4868): what is approved happens (Ben, 14 November 2026). */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const R = await load("modules/wodx-storyteller/scripts/reach-rules.mjs");
const I = await load("modules/wodx-storyteller/scripts/institution-rules.mjs");
const K = await load("modules/wodx-storyteller/scripts/kits-rules.mjs");
const TR = await load("modules/wodx-storyteller/scripts/town-rules.mjs");
const P = await load("modules/wodx-storyteller/scripts/projects-rules.mjs");
const LH = await load("modules/wodx-chronicle/scripts/law-heat-rules.mjs");
const LR = await load("modules/wodx-storyteller/scripts/ledger-rules.mjs");
const src = p => readFileSync(join(root, p), "utf8");

test("every institution lever does something, for and against", () => {
  const keys = new Set(Object.values(I.KINDS).flatMap(k => k.levers.map(l => l[1])));
  for ( const k of keys ) {
    assert.ok(R.LEVERS[k], `lever ${k} has moves`);
    assert.ok(R.leverMoves(k, {asker: "a", target: "b"}).length + R.leverMoves(k, {asker: "a"}).length > 0, `lever ${k} moves somewhere`);
  }
  const towns = new Set(Object.keys({...TR.POWER_TOWN, ...TR.LEVER_TOWN}));
  for ( const l of Object.values(R.LEVERS) ) for ( const m of [...l.for, ...l.against] ) {
    if ( m.op === "town" ) assert.ok(towns.has(m.event), `town event ${m.event}`);
    if ( m.op === "force" ) assert.ok(R.FORCES[m.kind], `force ${m.kind}`);
    if ( m.op === "heat" ) assert.ok(LH.GRAVITY[m.deed], `deed ${m.deed}`);
  }
});

test("a lever turned on someone else uses its against moves; the asker's money moves name the asker", () => {
  assert.equal(R.leverMoves("arrest", {asker: "a", target: "b"})[0].op, "arrest");
  assert.deepEqual(R.leverMoves("arrest", {asker: "a", target: "a"}), []);
  const levy = R.leverMoves("levy", {asker: "a"});
  assert.ok(levy.some(m => m.op === "money" && m.on === "asker"));
});

test("every force sends extras that exist, before and after 1600", () => {
  const keys = new Set(K.EXTRAS.map(e => e.key));
  for ( const k of Object.keys(R.FORCES) ) for ( const y of [1200, 1990] ) {
    const f = R.forceFor(k, y);
    assert.ok(f.length, `${k} ${y}`);
    for ( const e of f ) assert.ok(keys.has(e.key), `${k}: ${e.key}`);
  }
});

test("road encounters: beasts and armed men fight, anyone else comes as people", () => {
  const b = R.roadPlan("Two bandits block the road", 1300);
  assert.equal(b.hostile, true); assert.deepEqual(b.extras, [{key: "bandit", n: 2}]);
  const w = R.roadPlan("A pack of wolves", 1900);
  assert.equal(w.extras[0].key, "wolf"); assert.equal(w.extras[0].n, 4);
  assert.equal(R.roadPlan("A pedlar with a mule", 1300).people, true);
  assert.equal(R.roadPlan("A pedlar with a mule", 1300).hostile, false);
  const keys = new Set(K.EXTRAS.map(e => e.key));
  for ( const t of ["wolves", "a hound", "robbers", "a gang"] ) for ( const y of [1300, 1950] ) for ( const e of R.roadPlan(t, y).extras ) assert.ok(keys.has(e.key), `${t} ${y} ${e.key}`);
});

test("the law: the watch come at Wanted and a manhunt, patrol by night, knock by day for a sleeper", () => {
  const keys = LH.STAGES.map(s => s.key);
  assert.ok(keys.includes("warrant") && keys.includes("manhunt"));
  assert.equal(R.lawMove("warrant", {crossed: true}), "come");
  assert.equal(R.lawMove("manhunt", {crossed: true}), "come");
  assert.equal(R.lawMove("asked", {crossed: true}), null);
  assert.equal(R.lawMove("warrant", {hour: 22}), null);
  assert.equal(R.lawMove("manhunt", {hour: 22}), "patrol");
  assert.equal(R.lawMove("manhunt", {hour: 12, line: "vampire", havenKnown: true}), "haven");
  assert.equal(R.lawMove("manhunt", {hour: 12, line: "mortal"}), null);
  assert.equal(R.patrolDue(null, 5), true); assert.equal(R.patrolDue(5, 5), false); assert.equal(R.patrolDue(4, 5), true);
});

test("the Veil's lowest bands act: Failing and Torn match the ledger's bands", () => {
  const band = v => LR.VEIL_BANDS.find(b => v >= b.min)?.name;
  for ( let v = 0; v <= 10; v++ ) {
    const mine = R.veilBand(v);
    if ( band(v) === "Torn" ) assert.equal(mine, "torn", `v${v}`);
    else if ( band(v) === "Failing" ) assert.equal(mine, "failing", `v${v}`);
    else assert.equal(mine, "holding", `v${v}`);
  }
  assert.ok(R.veilMoves("failing").breachHeat > 0);
  assert.equal(R.veilMoves("torn").weeklyAlarm, true);
  assert.equal(R.veilMoves("torn").rumourSpeed, 2);
  assert.ok(!/the Storyteller decides what that means/.test(src("modules/wodx-storyteller/scripts/ledger-rules.mjs")));
});

test("every Threads of Fate write-back on the cards has moves", async () => {
  const cards = src("modules/wodx-storyteller/data/threads-cards.mjs");
  const pairs = [...cards.matchAll(/"to":\s*"([a-z]+)",\s*"what":\s*"([^"]*)"/g)].map(m => ({to: m[1], what: m[2]}));
  assert.ok(pairs.length > 400);
  for ( const w of pairs ) if ( !["rumours", "tales"].includes(w.to) ) assert.ok(R.WRITE_BACKS[w.what], `write-back "${w.what}"`);
  const towns = new Set(Object.keys({...TR.POWER_TOWN, ...TR.LEVER_TOWN}));
  for ( const list of Object.values(R.WRITE_BACKS) ) for ( const m of list ) if ( m.op === "town" ) assert.ok(towns.has(m.event), m.event);
});

test("approvals that used to only log now act", () => {
  const core = src("modules/wodx-storyteller/scripts/core.mjs");
  assert.ok(!/The Storyteller will play the encounter/.test(core));
  assert.ok(/reach\?\.road/.test(core));
  assert.ok(/reach\?\.raid/.test(src("modules/wodx-storyteller/scripts/hunters.mjs")));
  const inst = src("modules/wodx-storyteller/scripts/institutions.mjs");
  assert.ok(/approve: approveTrouble/.test(inst) && /Reach\.lever/.test(inst));
  assert.ok(/Reach\.writeBack/.test(src("modules/wodx-storyteller/scripts/threads.mjs")));
  assert.ok(/wodxLawStage/.test(src("modules/wodx-chronicle/scripts/law-heat.mjs")));
});

test("projects end by themselves: a language, a trail, research", () => {
  assert.equal(P.languageOf({name: "Learn Latin"}), "Latin");
  assert.equal(P.languageOf({makes: "Old Norse"}), "Old Norse");
  assert.deepEqual(P.researchWords({name: "Research the Tremere chantry"}), ["tremere", "chantry"]);
  for ( const k of ["language", "track", "research"] ) assert.ok(!/The Storyteller (adds|says)/.test(P.outcomeOf({kind: k}, "X").text), k);
});

test("an institution seat can be taken", () => {
  let inst = I.normInst({id: "t:council", kind: "council", town: "t"});
  inst = I.promote(inst, {id: "a", name: "A"}).inst;
  assert.ok(I.bestSeat(inst, "a"));
  const r = I.unseat(inst, "a");
  assert.equal(r.removed, 1); assert.equal(I.bestSeat(r.inst, "a"), null);
});

test("the watch's arrest hides the culprit's token and the court brings it back (B6165)", () => {
  const s = src("modules/wodx-storyteller/scripts/reach.mjs");
  // the watch's own tokens go; the culprit's is hidden and marked, not deleted
  assert.match(s, /await sendAway\(scene\.id, d\.tokens\);\s*\n\s*if \( d\.mode !== "summon" \) await takeAway\(scene, d\.token, d\);/);
  assert.doesNotMatch(s, /\.\.\.\(d\.mode === "summon" \? \[\] : \[d\.token\]\)/);
  assert.match(s, /hidden: true, \[`flags\.\$\{MOD\}\.lawTaken`\]/);
  // not guilty, mercy and sentences served on the spot let them go; time and death keep them
  assert.match(s, /Hooks\.on\("wodxVerdict", p => \{ if \( p\?\.actor && !p\.guilty \) letGo/);
  const freed = new Function(`return ${/export const freedBy = (\(p = \{\}\) => [^;]+);/.exec(s)[1]}`)();
  assert.equal(freed({mercy: true}), true);
  assert.equal(freed({mark: {kind: "fine"}}), true);
  assert.equal(freed({mark: {kind: "brand"}}), true);
  assert.equal(freed({mark: {kind: "time"}}), false);
  assert.equal(freed({mark: {kind: "death"}}), false);
  // Chronicle's time served counts the token the watch took, so comeBack shows it
  assert.match(src("modules/wodx-chronicle/scripts/law-punish.mjs"), /!t\.hidden \|\| t\.flags\?\.\["wodx-storyteller"\]\?\.lawTaken/);
});

test("a Way lets a convened character through and the call goes along (B6166)", () => {
  const s = src("modules/wodx-storyteller/scripts/core.mjs");
  assert.match(s, /if \( called && !approved && !way \) return \{ok: false/);
  assert.match(s, /mutate\("convened", cur => \(cur\?\.\[actorId\] \? \{value: \{\.\.\.cur, \[actorId\]: \{\.\.\.cur\[actorId\], scene: plan\.dest\.scene\.id\}\}\}/);
});

test("the hunters' proof: npc().orderCarry and the uuid the carry hook sends (B6167)", () => {
  const s = src("modules/wodx-storyteller/scripts/hunt-follow.mjs");
  assert.match(s, /const carry = npc\(\)\?\.orderCarry \?\? null;/);
  assert.match(s, /if \( r\?\.ok \) return p;/);
  assert.match(s, /typeof ref === "string" \? await fromUuid\(ref\)/);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /orderCarry, carryGoals/, "WoDX NPC's api has orderCarry at its top");
});
