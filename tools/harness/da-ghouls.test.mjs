import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as H from "../../modules/wodx-rules/actions/hunter-rules.js";
import * as AG from "../../modules/wodx-rules/creation/animal-ghoul-rules.mjs";

const src = p => fs.readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

/* B7673: the V20 Dark Ages ghoul rules of p. 400 the full check found missing */
test("a ghoul frenzies only with five points of vitae, and resists two lower", () => {
  assert.deepEqual(H.ghoulFrenzy(4), { can: false, diff: 0 });
  assert.deepEqual(H.ghoulFrenzy(5), { can: true, diff: -2 });
  const m = src("modules/wodx-actions/scripts/main.js");
  assert.match(m, /P\.detectProfile\(actor\) === "ghoul" \? HR\.ghoulFrenzy\(b\.value\)/);
  assert.match(m, /if \(gf\) diff = Math\.max\(2, diff \+ gf\.diff \+ mark\)/);
});

test("a lost part grows back for 1, 2 or 3 blood, a Willpower and Stamina at 8; a botch loses it", () => {
  assert.equal(H.regrowSizeOf("left ear"), "small");
  assert.equal(H.regrowSizeOf("right eye"), "medium");
  assert.equal(H.regrowSizeOf("left foot"), "medium");
  assert.equal(H.regrowSizeOf("right arm"), "large");
  assert.deepEqual(Object.values(H.REGROW).map(r => r.blood), [1, 2, 3]);
  assert.equal(H.GHOUL_DA.regrowDiff, 8);
  assert.equal(H.regrowOutcome({ successes: 1 }), "grown");
  assert.equal(H.regrowOutcome({ successes: 0 }), "failed");
  assert.equal(H.regrowOutcome({ successes: 0, botch: true }), "lost");
  const f = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(f, /<option value="regrow">Grow back a lost part \(V20 Dark Ages p\. 400\)<\/option>/);
  assert.match(f, /if \(out === "grown" && c && bodyApi\?\.remove\) await bodyApi\.remove\(actor, c\.id\)/);
});

test("a human ghoul with five points shows the domitor's clan weakness", () => {
  assert.equal(AG.humanMark("brujah", 4), null);
  assert.equal(AG.humanMark("brujah", 5).frenzy, 2, "Brujah: two harder (V20 Dark Ages p. 45)");
  for (const [k, m] of Object.entries(AG.HUMAN_MARKS)) {
    assert.ok(m.label && m.text.length > 20, k);
    assert.doesNotMatch(m.text, /—|\b(he|she|him|her|his|hers)\b/i, k);
  }
  for (const k of ["assamite", "brujah", "cappadocian", "gangrel", "lasombra", "malkavian", "nosferatu", "ravnos", "setite", "toreador", "tremere", "tzimisce", "ventrue"])
    assert.ok(AG.HUMAN_MARKS[k], `${k} has a mark`);
  const b = src("modules/wodx-creation/scripts/animal-blood.mjs");
  assert.match(b, /const mark = beast \? AG\.clanMark\(clan, pts\) : AG\.humanMark\(clan, pts\)/);
});
