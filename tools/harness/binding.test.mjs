import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The binding card for a player character (B3528): which results bind, and what the card names. No hold on the token. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const E = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/effects-rules.js")).href);

test("only binding keywords make a card, with the command, how long and the resist roll", () => {
  for ( const k of E.BINDING_KEYS ) assert.ok(E.KEYWORDS[k], `${k} is a keyword`);
  assert.equal(E.bindingOf({key: "mend", out: {label: "Mend"}}), null);
  assert.equal(E.bindingOf({key: "harm", out: {}}), null);
  const b = E.bindingOf({key: "bind", out: {label: "Dominate: Bind", text: "forget the night at the mill", duration: "a month"}}, {caster: "Count Zelený"});
  assert.equal(b.by, "Count Zelený");
  assert.equal(b.lasts, "a month");
  assert.match(b.command, /forget the night/);
  assert.match(b.resist, /^Willpower at 7/);
  const f = E.bindingOf({key: "fear", out: {}});
  assert.equal(f.lasts, "the scene");
  assert.match(f.resist, /Willpower at 6/);
});

test("the card tells the player and holds nothing on the token", () => {
  const src = readFileSync(join(root, "modules/wodx-actions/scripts/effects.js"), "utf8");
  const fn = src.slice(src.indexOf("export async function bindingCard"), src.indexOf("/** Sway (not Awe)"));
  assert.match(fn, /hasPlayerOwner/);
  assert.doesNotMatch(fn, /\.update\(|setFlag|lockRotation|locked/, "no hold on the token");
  assert.match(src, /await bindingCard\(item, casterName\)/);
});
