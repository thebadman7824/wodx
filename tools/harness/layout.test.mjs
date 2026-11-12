import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

/* The layout pass (B2490 to B2494): type names, the sheet layout stylesheet, picks, and the shared layout checks */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = f => readFileSync(join(root, f), "utf8");

test("no actor or item type is named deprecated", () => {
  const lang = JSON.parse(read("system/worldofdarkness/lang/en.json"));
  for ( const [k, v] of Object.entries(lang) ) if ( k.startsWith("TYPES.") ) assert.doesNotMatch(v, /deprecated/i, k);
});

test("WoDX Sheets loads the layout stylesheet after the skins", () => {
  const styles = JSON.parse(read("modules/wodx-sheets/module.json")).styles;
  assert.equal(styles.at(-1), "styles/wodx-layout.css");
  assert.ok(styles.indexOf("styles/wodx-skins.css") < styles.indexOf("styles/wodx-layout.css"));
});

test("the layout stylesheet arranges and does not restyle: no fonts, no images, no skin colours", () => {
  const css = read("modules/wodx-sheets/styles/wodx-layout.css");
  assert.doesNotMatch(css, /font-family|background-image|url\(/);
  for ( const part of ["wodx-possessions", "wodx-ties", "wodx-body", "wodx-st-notes"] ) assert.match(css, new RegExp(part), part);
  assert.match(css, /\.window-header \.window-title \{[^}]*min-width/);
});

test("the title bar buttons keep their words as a tooltip", () => {
  const main = read("modules/wodx-sheets/scripts/main.mjs");
  assert.match(main, /Hooks\.on\("renderActorSheet", nameHeaderButtons\)/);
  assert.match(main, /Hooks\.on\("renderItemSheet", nameHeaderButtons\)/);
  assert.match(main, /dataset\.tooltip = words/);
});

test("a pick in a WoDX window or dialog may grow and wrap under its label", () => {
  const css = read("modules/wodx-chronicle/styles/wodx-chronicle.css");
  assert.match(css, /:is\(\.application\.wodx, \.application\.wodx-dialog\) \.form-group:has\(> select\) \{ flex-wrap: wrap; \}/);
  assert.match(css, /td > select \{ min-width:/);
});

test("the layout checks are one self-contained function that the fit tool and the gate share", async () => {
  const {audit} = await import(join(root, "tools/gate/fit-audit.mjs"));
  assert.equal(typeof audit, "function");
  const src = audit.toString();
  for ( const kind of ["cut", "clip", "crowd", "over", "shade", "dim"] ) assert.ok(src.includes(`say("${kind}"`), kind);
  assert.doesNotMatch(src, /\bimport\b|\brequire\(/);
  // Self-contained: it can be rebuilt from its own text, as the browser does
  assert.equal(typeof new Function(`return (${src})`)(), "function");
  assert.match(read("tools/harness/ui-fit.mjs"), /from "\.\.\/gate\/fit-audit\.mjs"/);
  assert.match(read("tools/gate/gateuisnap.mjs"), /fit-audit\.mjs/);
});
