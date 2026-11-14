import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as T from "../../modules/wodx-chronicle/scripts/trait-rules.mjs";
import {BACKGROUNDS, PROMPTS, ATTITUDE} from "../../modules/wodx-chronicle/data/trait-effects.mjs";

/* Backgrounds nothing read get a card or an attitude seed (B3920) */

const bg = (name, value = 2) => ({id: name, name, kind: "background", value});
const view = (kind, names) => ({kind, features: names.map(n => bg(n))});

test("backgrounds: none is left as Storyteller-only with no card", () => {
  const left = BACKGROUNDS.filter(b => b.hook === "story" && !PROMPTS[b.key] && !ATTITUDE[b.key]).map(b => b.key);
  assert.deepEqual(left, []);
});

test("backgrounds: standing among one's own kind seeds the attitude of that kind only", () => {
  assert.equal(T.attitudeSeed(view("demon", ["Eminence"]), {kind: "demon"}).delta, 1);
  assert.equal(T.attitudeSeed(view("demon", ["Eminence"]), {kind: "mortal"}).delta, 0);
  assert.equal(T.attitudeSeed(view("lupine", ["Pure Breed"]), {kind: "lupine"}).delta, 1);
  assert.equal(T.attitudeSeed(view("wraith", ["Notoriety"]), {kind: "wraith"}).delta, 1);
});

test("backgrounds: a card at the moment it matters, with a book reference", () => {
  const p = T.promptsOn(view("mage", ["Secret Weapons", "Certification"]), "fight");
  assert.ok(p.some(x => x.key === "secret-weapons" && /M20 core p\. 253/.test(x.text)), JSON.stringify(p));
  const s = T.promptsOn(view("mage", ["Certification"]), "social");
  assert.ok(s.some(x => x.key === "certification"));
  assert.equal(T.refOf({books: ["Orpheus"], page: {Orpheus: null}}), "Orpheus");
  assert.equal(T.refOf({book: "V20", page: 493}), "V20 p. 493");
});

test("backgrounds: Alternate Identity turns a named deed into an unnamed one for the heat", async () => {
  const {readFileSync} = await import("node:fs");
  const h = readFileSync(new URL("../../modules/wodx-chronicle/scripts/law-heat.mjs", import.meta.url), "utf8");
  assert.match(h, /other = named && traitHas\(actor, "alternate-identity"\) > 0/);
  assert.match(h, /if \( other \) named = false;/);
});
