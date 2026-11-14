import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* Chronicle trait effects take extra sources from other modules (B3902) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const t = readFileSync(join(root, "modules/wodx-chronicle/scripts/traits.mjs"), "utf8");

test("another module can add trait effects (a carried ward), and a broken source never stops a roll", () => {
  assert.match(t, /export function addSource\(fn\)/);
  assert.match(t, /\.\.\.fromSources\(actor, ctx\)/);
  assert.match(t, /catch \(e\) \{ console\.warn\("WoDX Chronicle \| trait effect source", e\); return \[\]; \}/);
  assert.match(t, /traitsApi = \{[^}]*addSource,/);
});
