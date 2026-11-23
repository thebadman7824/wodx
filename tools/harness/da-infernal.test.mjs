import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as I from "../../modules/wodx-actions/scripts/infernal-rules.js";
import * as B from "../../modules/wodx-combat/scripts/body-rules.js";
import * as TR from "../../modules/wodx-actions/scripts/theme-rules.js";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const pact = (rating, spent = []) => ({ id: "p", rating, spent });

/* B7696: demonic pacts and infernal investments, Dark Ages Companion (2002) ch. 7 */
test("ten pact ratings and the six transformations at the book's costs", () => {
  assert.equal(I.PACTS.length, 11);
  assert.equal(I.PACTS[1].name, "Malice");
  assert.equal(I.PACTS[10].name, "Soul Pact");
  const c = Object.fromEntries(Object.entries(I.INVESTMENTS).map(([k, v]) => [k, v.cost]));
  assert.deepEqual(c, { armor: 1, claws: 1, flame: 3, flight: 3, limbs: 2, poison: 1 });
  assert.equal(I.INVESTMENTS.claws.extras.retract.cost, 1);
  assert.equal(I.INVESTMENTS.flame.extras.hotter.cost, 2);
  assert.equal(I.INVESTMENTS.flight.extras.barbed.cost, 1);
  assert.equal(I.INVESTMENTS.poison.extras.sacs.cost, 1);
});

test("traits: Attributes new + 2, Abilities new + 1, Disciplines new + 3, one level a pact; Dark Thaumaturgy at the new level", () => {
  assert.deepEqual(I.canBuy(pact(6), { kind: "attribute", key: "strength", from: 3, to: 4 }), { ok: true, cost: 6, why: "" });
  assert.equal(I.canBuy(pact(5), { kind: "attribute", key: "strength", from: 3, to: 4 }).ok, false);
  assert.equal(I.canBuy(pact(9), { kind: "attribute", key: "strength", from: 2, to: 4 }).ok, false, "one level at a time");
  assert.equal(I.canBuy(pact(3), { kind: "ability", key: "occult", from: 1, to: 2 }).cost, 3);
  assert.equal(I.canBuy(pact(9), { kind: "discipline", key: "Presence", from: 1, to: 2 }).cost, 5);
  assert.equal(I.canBuy(pact(2), { kind: "power", key: "Dread Gaze", to: 2 }).cost, 3);
  assert.deepEqual(I.canBuy(pact(1), { kind: "darkThaum", key: "Rego Dolor", from: 0, to: 1 }), { ok: true, cost: 1, why: "" });
  const used = pact(10, [{ kind: "attribute", key: "strength", cost: 6 }]);
  assert.match(I.canBuy(used, { kind: "attribute", key: "strength", from: 4, to: 5 }).why, /already raised/);
  // The book's example (p. 175): five points for Rego Dolor 1, a man-at-arms and fiery breath
  let p = pact(5);
  for ( const b of [{ kind: "darkThaum", key: "Rego Dolor", from: 0, to: 1 }, { kind: "servant" }, { kind: "investment", key: "flame" }] ) {
    const r = I.canBuy(p, b, {});
    assert.ok(r.ok, JSON.stringify(b));
    p = { ...p, spent: [...p.spent, { ...b, cost: r.cost }] };
  }
  assert.equal(I.pointsLeft(p), 0);
});

test("investments: extras need the base, single ones once, Armor again and again", () => {
  assert.match(I.canBuy(pact(5), { kind: "investment", key: "claws", extra: "retract" }, {}).why, /needs Claws/);
  assert.ok(I.canBuy(pact(5), { kind: "investment", key: "claws", extra: "retract" }, { claws: 1 }).ok);
  assert.match(I.canBuy(pact(5), { kind: "investment", key: "claws" }, { claws: 1 }).why, /already taken/);
  assert.ok(I.canBuy(pact(5), { kind: "investment", key: "armor" }, { armor: 4 }).ok);
  assert.deepEqual(I.armorOf(3), { soak: 3, appearanceLost: 1 });
  assert.deepEqual(I.armorOf(7), { soak: 7, appearanceLost: 2 });
  assert.equal(I.flameLevels(0), 3);
  assert.equal(I.flameLevels(2), 5);
  assert.equal(I.canBuy(pact(4), { kind: "life", years: 4 }).cost, 4);
  assert.equal(I.canBuy(pact(2), { kind: "boundDemon" }).cost, 2);
});

test("the Supplicium: a Road point, the fall to the Via Diabolis at 1, and the last Supplicium", () => {
  assert.deepEqual(I.suppliciumLost({ rating: 4 }), { rating: 3, fall: false, final: false });
  assert.deepEqual(I.suppliciumLost({ rating: 1 }), { rating: 1, fall: true, final: false });
  assert.deepEqual(I.suppliciumLost({ rating: 1, devil: true }), { rating: 0, fall: false, final: true });
  assert.deepEqual(I.finalSupplicium(true), { rating: 1, damned: false });
  assert.deepEqual(I.finalSupplicium(false), { rating: 0, damned: true });
  assert.ok(I.onViaDiabolis({ key: "sin", path: "Path of the Devil" }));
  assert.ok(!I.onViaDiabolis({ key: "sin", path: "Path of Pleasure" }));
});

test("the body plan reads infernal claws, barbed wings and limbs; the menus offer the window and the flame", () => {
  const body = B.bodyOf({ features: [B.featureOf({ feature: "infernalClaws" })] });
  assert.deepEqual({ type: body.weapons.claw.type, bonus: body.weapons.claw.bonus }, { type: "lethal", bonus: 2 });
  assert.ok(B.bodyOf({ features: [B.featureOf({ feature: "wings" })] }).moves.fly);
  assert.ok(TR.MENU_PLAN.kindred.st.includes("api:infernal"));
  assert.ok(TR.MENU_PLAN.kindred.act.includes("api:infernalFlame"));
  const main = src("modules/wodx-actions/scripts/main.js");
  assert.match(main, /button\.vta-btn\[data-ix\]/);
  assert.match(main, /infernalPacts: \{/);
  assert.match(src("modules/wodx-creation/scripts/change-of-state.mjs"), /infernal\?\.owned\?\.poison/);
});
