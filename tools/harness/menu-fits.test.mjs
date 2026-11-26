// #2504: menus show what fits the character (the Actions menu's rite and manor entries; Common checks by the year)
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const TR = await import(join(root, "modules/wodx-rules/actions/theme-rules.js"));
const CK = await import(join(root, "modules/wodx-rules/actions/checks-rules.js"));

test("Exorcism shows for a character who learned the rite; the manor for one with a Domain", () => {
  assert.equal(TR.fits("api:exorcise", {text: "brujah | sword"}), false);
  assert.equal(TR.fits("api:exorcise", {text: "Ritual of Exorcism"}), true);
  assert.equal(TR.fits("api:domainDA", {text: "resources | allies"}), false);
  assert.equal(TR.fits("api:domainDA", {text: "Domain | Retainers"}), true);
  assert.equal(TR.fits("api:feed", {text: ""}), true, "an action with no test fits everyone of its line");
});

test("no computer check in 1197, unless the character knows computers", () => {
  const pc = CK.byKey("computer");
  assert.equal(CK.fitsYear(pc, 1197), false);
  assert.equal(CK.fitsYear(pc, 1197, k => (k === "computer" ? 2 : 0)), true);
  assert.equal(CK.fitsYear(pc, 1999), true);
  assert.equal(CK.fitsYear(pc, null), true, "no year known: shown");
  assert.equal(CK.fitsYear(CK.byKey("notice"), 1197), true);
  const M = readFileSync(join(root, "modules/wodx-actions/scripts/main.js"), "utf8");
  assert.match(M, /CK\.fitsYear\(c, yr, hasAb\)/, "Common checks uses it for players");
});
