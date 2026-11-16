import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/*
 * Final systems audit, worker w2 (B6730-B6739): WoDX Actions powers that wrote what nothing read.
 *   B6730  a plain Charge or Drain on a sheet with no Quintessence moves the line's own pool, not a Quintessence field
 *   B6731  a Wraith Arcanos with no roll still puts its keywords on the effects card
 *   B6732  a Ward from a power stands against a weapon blow's soak, not only a power's harm
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");

globalThis.game ??= {modules: new Map(), settings: {get() { throw new Error("not registered"); }}, user: {isGM: true, targets: new Set()}, users: {filter: () => []}};
globalThis.ui ??= {notifications: {warn() {}, info() {}}};
globalThis.Hooks ??= {callAll() {}, on() {}, off() {}, once() {}};

const E = await imp("modules/wodx-actions/scripts/effects-rules.js");
const EF = await imp("modules/wodx-actions/scripts/effects.js");
const PW = await imp("modules/wodx-actions/scripts/power-effects.js");
const PK = await imp("modules/wodx-actions/scripts/power-keywords.js");

const sheet = (type, system = {}) => ({type, name: type, flags: {}, items: [], system});
const quint = () => E.outcome("charge", {ok: true, strength: 3, duration: 0}, {});
const drain = () => E.outcome("charge", {ok: true, strength: 3, duration: 0}, {drain: true});

test("B6730: a Charge on a mage stays Quintessence", () => {
  const mage = sheet("Mage", {quintessence: {temporary: 2}});
  const o = quint();
  assert.equal(o.kind, "quint");
  assert.equal(EF.chargeOut(mage, o), o);
});

test("B6730: a Charge on a vampire, werewolf, wraith or Kuei-jin moves that line's pool, named on the card", () => {
  const cases = [
    [sheet("Vampire", {advantages: {bloodpool: {temporary: 5}}}), "blood", "system.advantages.bloodpool.temporary"],
    [sheet("Werewolf", {advantages: {gnosis: {temporary: 2, permanent: 5}}}), "gnosis", "system.advantages.gnosis.temporary"],
    [sheet("Wraith", {advantages: {pathos: {temporary: 3}}}), "pathos", "system.advantages.pathos.temporary"],
    [sheet("Vampire", {settings: {variant: "kindredeast"}, advantages: {yangchi: {temporary: 2}}}), "yangchi", "system.advantages.yangchi.temporary"],
    [sheet("Mortal", {}), "willpower", "system.advantages.willpower.temporary"]
  ];
  for ( const [a, pool, path] of cases ) {
    const o = EF.chargeOut(a, quint());
    assert.equal(o.kind, "pool", a.type);
    assert.equal(o.pool, pool, a.type);
    assert.equal(E.poolOf(o.pool).path, path);
    assert.doesNotMatch(o.text, /Quintessence/);
    assert.ok(o.points > 0);
  }
  const d = EF.chargeOut(cases[0][0], drain());
  assert.ok(d.points < 0 && /blood drawn out/.test(d.text));
});

test("B6730: the apply step sends a non-mage's Charge to the pool, and the read guard names the reader", () => {
  assert.match(src("modules/wodx-actions/scripts/effects.js"), /case "quint": \{\s*\/\/ B6730[^\n]*\n\s*const co = chargeOut\(a, o\);/);
  assert.match(src("tools/powers/read-rules.mjs"), /chargeOut\(a,/);
});

test("B6731: a Wraith Arcanos with no roll gets its keywords on the effects card", () => {
  const w = src("modules/wodx-actions/scripts/wraith.js");
  assert.doesNotMatch(w, /if \(a\.r && successes > 0 && EF\.isOn\(\)\)/, "the effects card is no longer only for rolled arts");
  assert.match(w, /noRoll: !a\.r/);
  // Sever Strand (Lifeweb, no roll): its Harm readies the user, as a Discipline with no roll does (B3751)
  const kw = PW.powerKeywords("wraith", Object.entries(PK.LINE_KEYWORDS.wraith ?? {}).find(([, e]) => e.n === "Sever Strand")?.[0] ?? "", "Sever Strand", "wraith");
  if ( kw ) {
    const {results} = PW.powerOutcomes(kw, 1, {label: "Sever Strand", noRoll: true});
    assert.ok(results.length > 0);
  }
});

test("B6732: WoDX Combat's blow soak reads a power's Ward", () => {
  const c = src("modules/wodx-combat/scripts/main.js");
  const body = c.slice(c.indexOf("function soakPoolFor("), c.indexOf("function tokenDistance("));
  assert.match(body, /powerModsOf\(target, \{ soak: true, harm: \{ type: dp\.dmgType/);
  assert.match(body, /\+ num\(pw\.dice\)/);
});

test("B6734: a wraith whose Shadow won Catharsis has each move go to the Storyteller", async () => {
  const B = await imp("modules/wodx-actions/scripts/binds.js");
  const held = B.bindingsOn({effects: [], flags: {"wodx-actions": {shadowDominant: true}}});
  assert.equal(held.length, 1);
  assert.equal(held[0].rule, "ask");
  assert.equal(B.judgeMove(held, {from: {x: 0, y: 0}, to: {x: 100, y: 0}}).ask, true);
  assert.deepEqual(B.bindingsOn({effects: [], flags: {"wodx-actions": {shadowDominant: null}}}), []);
});
