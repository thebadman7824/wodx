/* Powers pass p12 (B3753): a ritual or rite worked by its caster puts the book's keywords on the effects card. */
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BR = await import("../../modules/wodx-actions/scripts/book-rituals.js");
const src = f => fs.readFileSync(path.join(root, f), "utf8");

test("a book ritual is found by name in the era's set first (B3753)", () => {
  assert.equal(BR.findRitual(["v20"], "Deflection of Wooden Doom")?.r.n, "Deflection of Wooden Doom");
  assert.equal(BR.findRitual(["daw", "w20"], "Rite of Cleansing")?.set, "daw");
  assert.equal(BR.findRitual(["w20", "daw"], "rite of cleansing")?.set, "w20");
  assert.equal(BR.findRitual(["v20"], "No Such Ritual"), null);
  assert.equal(BR.ritualLevel({lvl: "Accord 2"}), 2);
  assert.match(BR.ritualOptions(["v20"]), /value="v20:0"/);
});

test("its keywords reach the card at the caster's successes, and a failure gives nothing (B3753)", () => {
  const doom = BR.findRitual(["v20"], "Deflection of Wooden Doom").r;
  const res = BR.ritualResults(doom, 3);
  assert.equal(res[0].key, "ward"); assert.equal(res[0].who, "self");
  assert.match(res[0].out.label, /Deflection of Wooden Doom/);
  assert.deepEqual(BR.ritualResults(doom, 0), []);
  const tongue = BR.findRitual(["v20"], "Bind the Accusing Tongue").r;
  assert.equal(BR.ritualResults(tongue, 2).length, 0, "bind needs a target");
  assert.equal(BR.ritualResults(tongue, 2, {hasTarget: true})[0].key, "bind");
});

test("the caster's windows call the ritual plan (B3753)", () => {
  assert.match(src("modules/wodx-actions/scripts/kindred.js"), /async function castRitual[\s\S]*EF\.ritualPlan/);
  assert.match(src("modules/wodx-actions/scripts/garou.js"), /async function performRite[\s\S]*EF\.ritualPlan/);
  assert.match(src("modules/wodx-actions/scripts/mummy.js"), /BR\.findRitual\(\["mummy"\]/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /\["castRitual", "fa-book-dead", "Cast a ritual"\]/);
});
