import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as P from "../../modules/wodx-storyteller/scripts/prelude-rules.mjs";

/* WoDX Storyteller 0.9.0: prelude and Embrace scene templates. */
test("every line in the list has a template with all three parts", () => {
  assert.deepEqual([...P.LINE_ORDER].sort(), Object.keys(P.PRELUDES).sort());
  for ( const k of P.LINE_ORDER ) {
    const t = P.PRELUDES[k];
    assert.ok(t.label && t.title, k);
    for ( const part of ["before", "turn", "after"] ) assert.ok(t[part].length >= 2, `${k} ${part}`);
  }
});
test("the sheet suggests the line: ghouls and revenants by variant, other splats by type, the rest mortal", () => {
  assert.equal(P.lineFor("Vampire"), "vampire");
  assert.equal(P.lineFor("Mortal", "ghoul"), "ghoul");
  assert.equal(P.lineFor("Mortal", "revenant"), "revenant");
  assert.equal(P.lineFor("Mortal"), "mortal");
  assert.equal(P.lineFor("Changing Breed"), "werewolf");
  assert.equal(P.lineFor("Group"), "mortal");
  assert.equal(P.lineFor(undefined), "mortal");
});
test("hunters follow the era: the calling, the first sight, the Imbuing from 1999", () => {
  assert.equal(P.hunterKind(1197), "inquisitor");
  assert.equal(P.hunterKind(1880), "mortal");
  assert.equal(P.hunterKind(1998), "mortal");
  assert.equal(P.hunterKind(1999), "imbued");
  assert.equal(P.composePrelude({line: "hunter", year: 1230}).title, "The calling");
  assert.equal(P.composePrelude({line: "hunter", year: 1990}).title, "The first sight");
  assert.equal(P.composePrelude({line: "hunter", year: 2003, name: "Ilse"}).title, "The Imbuing: Ilse");
  assert.equal(P.composePrelude({line: "hunter"}).title, "The first sight");
});
test("a prelude names its character, falls back to mortal, and its journal is escaped and points to Creation", () => {
  const p = P.composePrelude({line: "vampire", name: "Anezka <of> the Adit"});
  assert.equal(p.title, "The Embrace: Anezka <of> the Adit");
  assert.deepEqual(p.parts.map(x => x.heading), ["Before", "The turn", "After"]);
  const html = P.preludeHtml(p);
  assert.match(html, /Anezka|Embrace a mortal \(WoDX Creation\)/);
  assert.ok(!html.includes("<of>"));
  assert.match(html, /<h2>When it ends<\/h2>/);
  assert.equal(P.composePrelude({line: "nonsense"}).line, "mortal");
  assert.match(P.preludeHtml(P.composePrelude({line: "mortal"})), /Nothing to record in Creation/);
});
test("the prelude is wired: Draw for the story, the api, a fixed line list and a searchable character list", () => {
  const night = readFileSync(new URL("../../modules/wodx-storyteller/scripts/night.mjs", import.meta.url), "utf8");
  const main = readFileSync(new URL("../../modules/wodx-storyteller/scripts/main.mjs", import.meta.url), "utf8");
  const ui = readFileSync(new URL("../../modules/wodx-storyteller/scripts/prelude.mjs", import.meta.url), "utf8");
  assert.match(night, /action: "prelude"/);
  assert.match(main, /prelude: \{dialog: Prelude\.preludeDialog/);
  assert.match(ui, /name="line" data-fixed/);
  assert.match(ui, /searchBox\("select\[name=actor\]"/);
  assert.match(ui, /DOCUMENT_OWNERSHIP_LEVELS\.NONE/);
});
