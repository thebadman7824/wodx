import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as X from "../../modules/wodx-storyteller/scripts/codex-rules.mjs";

/* WoDX Storyteller 0.7.0: a player codex. */
test("a revealed page becomes a codex page with the date it was learned", () => {
  assert.equal(X.codexName("Anezka"), "Codex: Anezka");
  assert.equal(X.codexName(""), "Codex: someone");
  const t = X.codexPage({uuid: "JournalEntry.a.JournalEntryPage.b", name: "The bell", type: "text", text: "<p>It rang.</p>", sort: 5}, "3 May 1241");
  assert.deepEqual(t, {name: "The bell", sort: 5, flags: {from: "JournalEntry.a.JournalEntryPage.b"}, type: "text", text: '<p>It rang.</p><p class="wodx-quiet wodx-codex-when">Learned 3 May 1241.</p>'});
  const i = X.codexPage({uuid: "u", name: "Map", type: "image", img: "maps/a.webp"}, "today");
  assert.equal(i.type, "image");
  assert.equal(i.src, "maps/a.webp");
  assert.equal(i.caption, "Learned today");
  const v = X.codexPage({uuid: "u2", name: "A <film>", type: "video"});
  assert.equal(v.type, "text");
  assert.match(v.text, /@UUID\[u2\]\{A &lt;film&gt;\}/);
});
test("revealing again changes the copy already there instead of adding a second", () => {
  const pages = [X.codexPage({uuid: "p1", name: "One", type: "text", text: "a"}), X.codexPage({uuid: "p2", name: "Two", type: "text", text: "b"})];
  const {add, change} = X.planReveal([{id: "c1", from: "p1"}, {id: "c9", from: "other"}, {id: "c0"}], pages);
  assert.deepEqual(add.map(p => p.name), ["Two"]);
  assert.deepEqual(change.map(p => [p.id, p.name]), [["c1", "One"]]);
  assert.deepEqual(X.planReveal([], []), {add: [], change: []});
  const src = readFileSync(new URL("../../modules/wodx-storyteller/scripts/codex.mjs", import.meta.url), "utf8");
  assert.match(src, /getHeaderControlsJournalEntrySheet/);
  assert.match(src, /OBSERVER/);
});
