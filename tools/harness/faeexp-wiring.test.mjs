import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B6935: the C20 and Dark Ages fae rule exports that only tests called are wired into play (the desk's fae-da-exports
   ruling): each named export is read by the play code that should call it. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const C = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/c20-rules.js")));
const D = await import(pathToFileURL(join(root, "modules/wodx-creation/scripts/derived-rules.mjs")));

test("C20: PRIMARY sets the cantrip's primary Realms, the Mists and the Musing time reach the cards", () => {
  assert.match(src("modules/wodx-actions/scripts/c20-rules.js"), /used\.filter\(u => PRIMARY\.includes\(u\.realm\)\)/);
  const c20 = src("modules/wodx-actions/scripts/c20.js");
  assert.match(c20, /C\.ownMists\(/);
  assert.match(c20, /C\.OWN_MISTS/);
  assert.match(c20, /C\.musingTime\(/);
  assert.match(c20, /value="study"/);
  assert.equal(C.cantripPlan({art: 3, used: [{realm: "scene", level: 1}], known: {scene: 2}}).ok, false, "Scene alone is not primary");
  assert.equal(C.cantripPlan({art: 3, used: [{realm: "actor", level: 1}], known: {actor: 2}}).ok, true);
});

test("C20: Creation's starting Tempers come from startingTempers", () => {
  assert.match(src("modules/wodx-creation/scripts/derived-rules.mjs"), /startingTempers\(/);
  const row = (sys, opts) => Object.fromEntries(D.derivedTraits("c20", sys, opts).rows.map(r => [r.key, r.want]));
  const grump = row({seeming: "grump"});
  assert.deepEqual([grump.willpower, grump.glamour, grump.banality], [5, 4, 3]);
  const wild = row({seeming: "wilder"}, {wilder: "willpower"});
  assert.deepEqual([wild.willpower, wild.glamour], [5, 4]);
  const child = row({seeming: "childling"});
  assert.deepEqual([child.willpower, child.glamour], [4, 5]);
});

test("Dark Ages fae: havocStep lowers a havoc on the card, cantripCap sets the caps", () => {
  assert.match(src("modules/wodx-actions/scripts/fae-da.js"), /F\.havocStep\(/);
  assert.match(src("modules/wodx-actions/scripts/fae-da-rules.js"), /cantripCap\(weaving, dominions\[d\]\)/);
});
