import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The referee ticket (B3520 to B3523): the pool, the risks by line and book, the Storyteller's difficulty change. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/ticket-rules.mjs")).href);
const Q = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/approvals-rules.mjs")).href);
const HR = (await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/house-rules.mjs")).href)).default;

const sheet = {name: "Ilse", profile: "mage", attributes: {wits: 3, manipulation: 2}, abilities: {occult: 4, subterfuge: 1}};

test("the pool is Attribute plus Ability, and unknown traits add nothing", () => {
  assert.equal(T.poolOf(sheet, "wits", "occult"), 7);
  assert.equal(T.poolOf(sheet, "wits", ""), 3);
  assert.equal(T.poolOf(sheet, "nonsense", "occult"), 4);
  assert.equal(T.poolOf({}, "wits", "occult"), 0);
});

test("risks follow the line and the era's book", () => {
  const keys = q => T.risksFor(q).map(r => r.key);
  assert.deepEqual(keys({profile: "mage"}), ["paradox"]);
  assert.deepEqual(keys({profile: "mage", book: "da"}), ["magick"], "no M20 Paradox under the Dark Ages books");
  assert.ok(T.risksFor({profile: "kindred", book: "da"})[0].text.includes("Road"));
  assert.ok(T.risksFor({profile: "kindred"})[0].text.includes("Humanity"));
  assert.deepEqual(keys({profile: "fae"}), ["banality"]);
  assert.deepEqual(keys({profile: "mortal", witnesses: true}), [], "a mortal seen by mortals strains nothing");
  assert.deepEqual(keys({profile: "lupine", witnesses: true}), ["rage", "witnesses"]);
  for ( const p of ["mage", "kindred", "fae", "lupine", "wraith", "hunter", "demon"] ) for ( const r of T.risksFor({profile: p, witnesses: true}) )
    assert.ok(!/—/.test(r.text) && r.text.length < 200, `${p}: plain text`);
});

test("the Storyteller moves the difficulty 1 to 3 either way, inside 2 to 10, from the first difficulty", () => {
  assert.equal(T.shift(6, 2), 8);
  assert.equal(T.shift(6, 9), 9, "never more than 3");
  assert.equal(T.shift(9, 3), 10);
  assert.equal(T.shift(3, -3), 2);
  const t = T.buildTicket({text: "Bend the bridge's luck", attr: "wits", ability: "occult", difficulty: 7, actor: sheet});
  assert.equal(t.pool, 7);
  const a = T.withShift(t, 2), b = T.withShift(a, -1);
  assert.equal(a.difficulty, 9);
  assert.equal(b.difficulty, 6, "a new change replaces the last, it does not stack");
  assert.match(T.poolWords(a), /Wits \+ Occult, 7 dice at difficulty 9 \(\+2 from the Storyteller\)/);
});

test("a ticket carries the referee's cases, keeps three complications, and always waits", () => {
  const cases = [{case: {id: "x", ruling: "Dominate needs eye contact.", refs: ["V20 p. 1"]}, test: {verdict: "roll", text: "Roll it", roll: {who: "target", dice: 3, difficulty: 7}}}];
  let t = T.buildTicket({text: "Command the guard to forget", actor: {name: "A", profile: "kindred"}, target: {name: "B", profile: "mortal"}, cases, power: "Dominate"});
  assert.equal(t.cases[0].roll.dice, 3);
  assert.equal(t.targetName, "B");
  for ( let i = 0; i < 5; i++ ) t = T.withComplication(t, `c${i}`);
  assert.deepEqual(t.complications, ["c2", "c3", "c4"]);
  assert.ok(T.fallbackComplication(() => 0.5));
  assert.ok(Q.NEVER_AUTO.includes("ticket"));
  assert.equal(Q.routeProposal("ticket", {auto: {ticket: true}, lightTouch: true}), "queue", "neither a standing rule nor light touch passes or holds it");
});

test("the pause rule is a house rule switch, off by default", () => {
  const s = HR.switches.find(x => x.id === "ticketPause");
  assert.ok(s && s.default === false && s.group === "automation");
});

test("the ticket's player form uses fixed lists and the Ask dialog offers it", () => {
  const src = readFileSync(join(root, "modules/wodx-chronicle/scripts/ticket.mjs"), "utf8");
  for ( const m of src.matchAll(/<select [^>]*>/g) ) assert.match(m[0], /data-fixed/);
  assert.match(readFileSync(join(root, "modules/wodx-chronicle/scripts/approvals.mjs"), "utf8"), /ask for a ruling/);
});
