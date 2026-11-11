import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The crossover referee (WoDX Chronicle 0.17.0): cases, picking, what the sheets work out to. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/referee-rules.mjs")).href);
const {default: T} = await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/rules-clashes.mjs")).href);
const NR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/routine-rules.mjs")).href);
const decisions = readFileSync(join(root, "docs/DECISIONS.md"), "utf8");
const ERAS = JSON.parse(readFileSync(join(root, "modules/wodx-chronicle/data/eras.json"), "utf8"));

test("every case is whole and rests on a clash row", () => {
  const ids = new Set(), clashIds = new Set(T.rows.map(r => r.id));
  for ( const c of R.CASES ) {
    assert.ok(c.id && !ids.has(c.id), `unique id ${c.id}`); ids.add(c.id);
    assert.ok(R.POWERS[c.power], `${c.id}: known power`);
    for ( const k of [...c.from, ...c.to] ) assert.ok(k === "any" || R.LINES[k], `${c.id}: known line ${k}`);
    assert.ok(clashIds.has(c.clash), `${c.id}: clash row ${c.clash}`);
    assert.ok(c.ruling.trim() && c.refs.length, `${c.id}: ruling and refs`);
    assert.ok(["settled", "check"].includes(c.status), `${c.id}: status`);
    if ( c.status === "check" ) assert.ok(String(c.check ?? "").trim(), `${c.id}: page question`);
    if ( c.book ) assert.ok(["da", "late"].includes(c.book), `${c.id}: book`);
    for ( const ref of c.refs.filter(x => /^B\d+$/.test(x)) )
      assert.ok(new RegExp(`(\\| ${ref} \\||## ${ref}\\.)`).test(decisions), `${c.id}: ${ref} missing from DECISIONS`);
  }
});

test("nothing from 5th edition, no em-dashes in the rulings", () => {
  const text = JSON.stringify(R.CASES);
  assert.doesNotMatch(text, /\bV5\b|5th edition/);
  assert.doesNotMatch(text, /—/);
});

test("every era maps to a book", () => {
  for ( const e of ERAS.profiles ) assert.ok(["da", "late"].includes(R.bookOf(e.id)), e.id);
  assert.equal(R.bookOf("dark-ages"), "da");
  assert.equal(R.bookOf("long-night"), "da");
  assert.equal(R.bookOf("victorian"), "late");
  assert.equal(R.bookOf("future-darkness"), "late");
});

test("profileOf reads the shared flag first, then the sheet type", () => {
  assert.equal(R.profileOf({type: "Vampire"}), "kindred");
  assert.equal(R.profileOf({type: "Werewolf"}), "lupine");
  assert.equal(R.profileOf({type: "Mortal", system: {settings: {variant: "ghoul"}}}), "ghoul");
  assert.equal(R.profileOf({type: "Mortal", flags: {world: {wodx: {profile: "hunter"}}}}), "hunter");
  assert.equal(R.profileOf({type: "Wraith", system: {settings: {variant: "spectre"}}}), "spirit");
  assert.equal(R.profileOf(null), "mortal");
});

test("Dominate: Generation, Garou, mage, Dark Ages fae", () => {
  const kk = R.casesFor({power: "mind", from: "kindred", to: "kindred", book: "late"});
  assert.deepEqual(kk.map(c => c.id), ["mind-kindred"]);
  const t = R.testFor(kk[0], {actor: {name: "Anna", generation: 11}, target: {name: "Elder", generation: 8}});
  assert.equal(t.verdict, "fails");
  assert.match(t.text, /8th Generation/);
  assert.equal(R.testFor(kk[0], {actor: {generation: 8}, target: {generation: 12}}).verdict, "works");

  assert.deepEqual(R.casesFor({power: "mind", from: "kindred", to: "lupine"}).map(c => c.id), ["mind-garou"]);
  const mage = R.casesFor({power: "mind", from: "kindred", to: "mage"})[0];
  assert.equal(R.testFor(mage, {target: {arete: 3, spheres: {mind: 1}}}).roll.dice, 3);
  assert.equal(R.testFor(mage, {target: {arete: 3, spheres: {}}}).verdict, "works");

  const fae = R.casesFor({power: "mind", from: "kindred", to: "fae", book: "da"});
  assert.deepEqual(fae.map(c => c.id), ["mind-fae-da"]);
  assert.equal(R.testFor(fae[0], {target: {day: 3}, rating: 3}).verdict, "fails");
  assert.equal(R.testFor(fae[0], {target: {night: 2}, rating: 3}).verdict, "works");
  assert.equal(R.casesFor({power: "mind", from: "kindred", to: "fae", book: "late"})[0].id, "mind-fae-late");
});

test("True Faith comes first and follows the era's book", () => {
  const da = R.casesFor({power: "mind", from: "kindred", to: "mortal", book: "da", targetFaith: 2});
  assert.equal(da[0].id, "mind-faith-da");
  assert.equal(R.testFor(da[0], {target: {faith: 3}}).verdict, "fails");
  assert.equal(R.testFor(da[0], {target: {faith: 2}}).verdict, "resisted");
  const late = R.casesFor({power: "mind", from: "kindred", to: "hunter", book: "late", targetFaith: 1});
  assert.equal(late[0].id, "mind-faith-late");
  assert.equal(R.testFor(late[0], {target: {faith: 1}}).roll.difficulty, 7);
  // No Faith: no Faith case
  assert.ok(!R.casesFor({power: "mind", from: "kindred", to: "mortal"}).some(c => c.needs));
  // Faith 4 shields from ghouling; Faith 3 does not
  assert.equal(R.casesFor({power: "ghoul", from: "kindred", to: "mortal", targetFaith: 4})[0].id, "ghoul-faith");
  assert.ok(!R.casesFor({power: "ghoul", from: "kindred", to: "mortal", targetFaith: 3}).some(c => c.id === "ghoul-faith"));
});

test("a fallback shows only when nothing more particular fits", () => {
  const demon = R.casesFor({power: "mind", from: "kindred", to: "demon"});
  assert.deepEqual(demon.map(c => c.id), ["mind-any"]);
  assert.ok(!R.casesFor({power: "mind", from: "kindred", to: "lupine"}).some(c => c.fallback));
});

test("Auspex against Obfuscate matches WoDX NPC's reading in both books", () => {
  for ( const [a, o] of [[0, 1], [1, 1], [3, 2], [2, 3], [5, 1], [2, 0]] ) {
    const mine = R.pierce(a, o, "late"), theirs = NR.pierce(a, o, "v20");
    assert.equal(mine.result, theirs.result, `late ${a}/${o}`); assert.equal(mine.diff, theirs.diff);
    const mineDa = R.pierce(a, o, "da"), theirsDa = NR.pierce(a, o, "v20da");
    assert.equal(mineDa.result, theirsDa.result, `da ${a}/${o}`); assert.equal(mineDa.diff, theirsDa.diff);
  }
  const sight = R.casesFor({power: "sight", from: "kindred", to: "kindred"});
  assert.equal(sight[0].id, "sight-auspex");
  const tie = R.testFor(sight[0], {actor: {auspex: 2, perception: 3, awareness: 2}, target: {obfuscate: 2, manipulation: 2, subterfuge: 3}, book: "late"});
  assert.equal(tie.rolls.length, 2);
  assert.equal(tie.rolls[0].dice, 5);
  // A beast counts as Auspex 1
  assert.equal(R.testFor(sight[0], {actor: {profile: "beast"}, target: {obfuscate: 1}, book: "da"}).verdict, "roll");
  // The watcher's Faith 3 sees through it
  assert.equal(R.casesFor({power: "sight", from: "hunter", to: "kindred", actorFaith: 3})[0].id, "sight-faith");
});

test("blood, Delirium, witnesses and possession", () => {
  assert.equal(R.casesFor({power: "drink", from: "kindred", to: "lupine"})[0].id, "drink-garou");
  assert.equal(R.casesFor({power: "drink", from: "kindred", to: "fae"})[0].id, "drink-fae");
  assert.equal(R.casesFor({power: "delirium", from: "lupine", to: "kindred"})[0].id, "delirium-immune");
  assert.equal(R.casesFor({power: "delirium", from: "lupine", to: "mortal"})[0].id, "delirium-mortal");
  const w = R.casesFor({power: "witness", from: "mage", to: "mortal"})[0];
  assert.equal(R.testFor(w, {target: {profile: "mortal"}}).verdict, "works");
  assert.equal(R.testFor(w, {target: {profile: "ghoul"}}).verdict, "fails");
  const p = R.testFor(R.casesFor({power: "possess", from: "demon", to: "wraith"})[0], {actor: {willpower: 6}, target: {willpower: 4}});
  assert.deepEqual(p.rolls.map(r => [r.dice, r.difficulty]), [[6, 6], [4, 6]]);
  const nf = R.testFor(R.casesFor({power: "unmagic", from: "mage", to: "lupine"})[0], {target: {wits: 3, occult: 2}});
  assert.equal(nf.roll.dice, 5);
});

test("successes: ones cancel, a botch needs no success at all", () => {
  assert.deepEqual(R.successes([7, 8, 1, 3], 6), {successes: 1, botch: false});
  assert.deepEqual(R.successes([1, 3, 4], 6), {successes: 0, botch: true});
  assert.deepEqual(R.successes([6, 1], 6), {successes: 0, botch: false});
});

test("every power has at least one line that uses it, and every line can use something", () => {
  for ( const p of Object.keys(R.POWERS) ) assert.ok(R.CASES.some(c => c.power === p), p);
  for ( const l of Object.keys(R.LINES) ) assert.ok(R.powersFor(l).length, l);
});

test("the book checks: changelings, wraiths, ghouls, the imbued (0.17.1)", async () => {
  const H = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/hunter-rules.js")).href);
  for ( const e of ERAS.profiles ) for ( const y of [null, 1200, 1700, 1998, 1999, 2010, 2030] ) for ( const fb of [false, true] )
    assert.equal(R.isReckoning(e.id, y, {futureBranch: fb}), H.hunterLine(e.id, y, {futureBranch: fb}) === "reckoning", `${e.id} ${y} ${fb}`);
  assert.equal(R.casesFor({power: "mind", from: "kindred", to: "fae", book: "late"})[0].status, "settled");
  assert.equal(R.casesFor({power: "ghoul", from: "kindred", to: "lupine"})[0].id, "ghoul-lupine");
  assert.equal(R.casesFor({power: "ghoul", from: "kindred", to: "wraith"})[0].id, "ghoul-ghost");
  assert.equal(R.casesFor({power: "ghoul", from: "kindred", to: "mage"})[0].id, "ghoul-mage");
  const imb = R.casesFor({power: "mind", from: "kindred", to: "hunter", reckoning: true});
  assert.equal(imb[0].id, "mind-imbued");
  assert.equal(R.testFor(imb[0], {}).verdict, "fails");
  assert.ok(!R.casesFor({power: "mind", from: "kindred", to: "hunter", reckoning: false}).some(c => c.id === "mind-imbued"));
  assert.ok(!R.casesFor({power: "mind", from: "kindred", to: "mortal", reckoning: true}).some(c => c.id === "mind-imbued"));
  assert.equal(R.casesFor({power: "sight", from: "hunter", to: "kindred", reckoning: true})[0].id, "sight-imbued");
  const ghost = R.casesFor({power: "sight", from: "kindred", to: "wraith"});
  assert.deepEqual(ghost.map(c => c.id), ["sight-unseen"]);
  assert.equal(R.testFor(ghost[0], {actor: {auspex: 1, perception: 3, awareness: 1}, target: {manipulation: 2, subterfuge: 2}}).rolls[0].difficulty, 7);
  assert.equal(R.testFor(ghost[0], {actor: {}, target: {}}).verdict, "note");
});
