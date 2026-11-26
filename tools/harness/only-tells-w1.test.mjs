/* B6729: pack Traits and label-only selectors whose effect was only in text, wired to the rule the text gives. */
import "./win-paths.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { readFileSync } from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = p => import(pathToFileURL(join(root, p)));
const PB = await load("system/worldofdarkness/module/scripts/wodx-pack-bonuses.js");
const CR = await load("modules/wodx-combat/scripts/rules.js");
const G = await load("modules/wodx-rules/actions/garou-rules.js");

const trait = (name, o = {}) => ({ type: "Trait", name, system: { type: "wod.types.apocalypticform", bonuslist: [], isactive: false, ...o } });

test("pack Traits get the bonus their text names (DtF pp. 188, 198, 206-207)", () => {
  assert.deepEqual(PB.packBonusesFor(trait("Irresistable Force")), [{ name: "Feats of strength", settingtype: "strength", type: "attribute_diff", value: -2, isactive: false }]);
  assert.equal(PB.packBonusesFor(trait("Chimerical Aura", { isactive: true }))[0].settingtype, "wod.abilities.dodge");
  assert.equal(PB.packBonusesFor(trait("Chimerical Aura", { isactive: true }))[0].isactive, true);
  assert.equal(PB.packBonusesFor(trait("Chameleon Skin"))[0].value, -1);
  assert.equal(PB.packBonusesFor(trait("Chameleon Skin", { bonuslist: [{ type: "soak_buff" }] })), null, "a Trait with its own bonus is left alone");
  assert.equal(PB.packBonusesFor(trait("Casts No Reflection")), null);
  assert.equal(PB.packBonusesFor({ type: "Power", name: "Chameleon Skin", system: { bonuslist: [] } }), null);
});

test("form features make attacks on the bearer harder while switched on (DtF pp. 178, 180, 190)", () => {
  const on = n => ({ type: "Trait", name: n, system: { isactive: true } });
  const sh = items => close => CR.shieldFor({ shields: CR.formDefences(items), close }).attackDiff;
  assert.equal(sh([on("Shroud of Flames")])(true), 1);
  assert.equal(sh([on("Shroud of Flames")])(false), 1);
  assert.equal(sh([on("Radiant Aura")])(true), 0);
  assert.equal(sh([on("Radiant Aura")])(false), 1);
  assert.equal(sh([on("Mirage")])(false), 2);
  assert.equal(sh([on("Mirage")])(true), 1);
  assert.equal(sh([on("Alter Size")])(true), 2);
  assert.equal(sh([{ type: "Trait", name: "Mirage", system: { isactive: false } }])(false), 0);
  // a plain shield still counts as before
  assert.equal(CR.shieldFor({ shields: [{ name: "buckler", parry: 5, attack: 1, closeOnly: true }], close: false }).attackDiff, 0);
});

test("a Skin Dancer pays level x 7 for every Gift and learns level one only (W20 p. 199)", () => {
  assert.deepEqual(G.giftTerms(1, true, { tribe: "skindancer", rank: 4 }), { xp: 7, cap: 1, own: false, note: "Skin Dancer: level x 7, level one only (W20 p. 199)" });
  assert.equal(G.giftTerms(2, false, { tribe: "skin-dancers" }).xp, 14);
  assert.deepEqual(G.giftTerms(2, true, { tribe: "fianna", rank: 3 }), { xp: 6, cap: 3, own: true, note: "" });
  assert.equal(G.giftTerms(2, false, { tribe: "fianna", rank: 0 }).cap, 1);
});

test("a War Wolf on a Creature sheet takes silver as aggravated (W20 Book of the Wyrm p. 168)", () => {
  const src = readFileSync(join(root, "modules/wodx-chronicle/scripts/traits.mjs"), "utf8");
  const body = src.slice(src.indexOf("export const mockeryOf"), src.indexOf("// B6729: a changeling"));
  const mockeryOf = new Function(`${body.replace("export const mockeryOf", "const mockeryOf")}; return mockeryOf;`)();
  assert.equal(mockeryOf({ type: "Creature", system: { settings: { variant: "warwolves" } } }), "warwolves");
  assert.equal(mockeryOf({ type: "Creature", system: { settings: { variant: "spirit" } } }), "");
  assert.equal(mockeryOf({ type: "Mortal", system: { settings: { variant: "warwolves" } } }), "");
  assert.match(src, /mockeryOf\(actor\) === "warwolves" && !b\.silver \) \{ b\.silver = true/);
});

test("a switched-on form Trait grows its natural weapons on the body (Demon: the Fallen; Shintai aspects)", async () => {
  const B = await load("modules/wodx-rules/combat/body-rules.js");
  const w = name => B.bodyOf({ effects: [{ name, description: "The character manifests something." }] }).weapons;
  assert.deepEqual([w("Claws").claw.type, w("Claws").claw.bonus], ["aggravated", 2]);
  assert.equal(w("Claws/Teeth").bite.bonus, 2);
  assert.equal(w("Gaping Maw").bite.bonus, 4);
  assert.equal(w("Bonesmasher").claw.type, "bashing");
  assert.equal(w("Casts No Reflection").claw, undefined);
  assert.equal(B.bodyOf({ effects: [{ name: "Night Sight", description: "sees claws in the dark" }] }).weapons.claw, undefined, "a name, not a word in the text");
  const src = readFileSync(join(root, "modules/wodx-combat/scripts/movement.js"), "utf8");
  assert.match(src, /\.\.\.formTraitsOf\(actor\)\]/);
});
