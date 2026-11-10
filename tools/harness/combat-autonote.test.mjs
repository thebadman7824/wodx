// The attack card reads the defense roll only when there is one (an automatic defense note can come alone).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("../../modules/wodx-combat/scripts/main.js", import.meta.url), "utf8");
test("defense section guards a missing defense roll", () => {
  assert.match(src, /if \(defNote\) L\.push\([^\n]*\);\n\s*else if \(def\) \{\n\s*L\.push\(`\$\{cap\(def\.type\)\}/);
});
test("API version matches module.json", () => {
  const v = JSON.parse(readFileSync(new URL("../../modules/wodx-combat/module.json", import.meta.url), "utf8")).version;
  assert.ok(src.includes(`version: "${v}", reload`));
});
