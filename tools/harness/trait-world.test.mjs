import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 8 (Chronicle 0.23.0): backgrounds made into NPCs and places */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");
const bg = (name, value) => ({id: name, name, kind: "background", value});

test("every world background is in the table with a people or place hook", () => {
  const idx = T.buildIndex();
  for ( const [k, w] of Object.entries(T.BG_WORLD) ) {
    const e = idx.byKey.get(k);
    assert.ok(e, k);
    assert.ok(w.people ? ["people", "rumour"].includes(e.hook) : e.hook === "place", k);
    if ( w.people ) assert.ok(w.to >= 1 && w.to <= 3 && w.role, k);
  }
});

test("one NPC a dot up to five, a single mentor of the holder's kind, a Kindred's retainers as ghouls", () => {
  const v = {kind: "kindred", features: [bg("Allies", 7), bg("Retainers", 2), bg("Mentor", 4), bg("Resources", 3), bg("Contacts", 0)]};
  const p = T.worldPlan(v);
  const by = k => p.find(x => x.key === k);
  assert.equal(by("allies").count, 5);
  assert.equal(by("retainers").kind, "ghoul");
  assert.equal(by("mentor").count, 1);
  assert.equal(by("mentor").kind, "kindred");
  assert.equal(by("resources"), undefined, "money backgrounds are not made into things");
  assert.equal(by("contacts"), undefined, "no dots, nothing made");
  assert.equal(T.worldPlan({kind: "mortal", features: [bg("Retainers", 2)]})[0].kind, "mortal");
});

test("what was made is counted, so a grown background asks only for the rest", () => {
  const v = {kind: "mortal", features: [bg("Contacts", 3), bg("Domain", 2)]};
  const p = T.worldPlan(v, {Contacts: ["a", "b"], Domain: ["Scene.x.Region.y"]});
  assert.equal(p.find(x => x.key === "contacts").more, 1);
  assert.equal(p.find(x => x.key === "domain").more, 0);
  assert.equal(T.worldPlan(v).find(x => x.key === "domain").size, 6);
  const m = T.traitsOf({kind: "mortal", features: [bg("Allies", 2)]}).matched[0];
  assert.match(T.describe(m), /Make them real makes an NPC a dot \(Ally\)/);
});

test("the Foundry side makes sheets, ties them, sets attitude and owns the place", () => {
  const s = src("modules/wodx-chronicle/scripts/bg-world.mjs");
  assert.match(s, /flags\.\$\{MODULE_ID\}\.bound/);
  assert.match(s, /AT\?\.apply\?\.\(n, actor, \{to: p\.to/);
  assert.match(s, /createEmbeddedDocuments\("Region"/);
  assert.match(s, /owners\?\.set\?\.\(reg/);
  assert.match(s, /flags\.\$\{MODULE_ID\}\.made/);
  assert.match(src("modules/wodx-chronicle/scripts/traits.mjs"), /Make them real/);
  assert.ok(!/—/.test(s));
});
