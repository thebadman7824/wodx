import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as D from "../../modules/wodx-storyteller/scripts/dreams-rules.mjs";

/* WoDX Storyteller 0.6.0: dreams and visions you write. */
test("a dream is kept clean, and one with no character is dropped", () => {
  const d = D.normDream({id: "a", actorId: "x", title: "  ", text: "Water.", at: "100"});
  assert.deepEqual(d, {id: "a", actorId: "x", title: "A dream", text: "Water.", at: 100, source: "", released: false, releasedAt: null, journalId: null});
  assert.equal(D.normDream({id: "b", actorId: "x", at: "soon"}).at, null);
  assert.equal(D.normDreams([{id: "a", actorId: "x"}, {id: "b"}, {actorId: "y"}, null].filter(Boolean)).length, 1);
  assert.deepEqual(D.normDreams("nope"), []);
});
test("the clock brings the dreams whose time has come, in order, and never an untimed or released one", () => {
  const list = [{id: "late", actorId: "x", at: 300}, {id: "early", actorId: "x", at: 100}, {id: "hand", actorId: "x", at: null},
    {id: "done", actorId: "x", at: 50, released: true}, {id: "later", actorId: "x", at: 900}];
  assert.deepEqual(D.dueDreams(list, 400).map(d => d.id), ["early", "late"]);
  assert.deepEqual(D.dueDreams(list, 0).map(d => d.id), []);
  assert.deepEqual(D.dueDreams(list, null).map(d => d.id), []);
  const {waiting, done} = D.sortDreams(list);
  assert.deepEqual(waiting.map(d => d.id), ["early", "late", "later", "hand"]);
  assert.deepEqual(done.map(d => d.id), ["done"]);
});
test("the journal keeps the Storyteller's paragraphs and escapes the rest", () => {
  assert.equal(D.dreamHtml("Water.\n\nA <bell>\nringing"), "<p>Water.</p><p>A &lt;bell&gt;<br>ringing</p>");
  assert.equal(D.dreamHtml(""), "<p></p>");
  assert.equal(D.DEFAULT_HOUR, 8);
  const main = readFileSync(new URL("../../modules/wodx-storyteller/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /Dreams\.registerDreamHooks\(\)/);
  const src = readFileSync(new URL("../../modules/wodx-storyteller/scripts/dreams.mjs", import.meta.url), "utf8");
  assert.match(src, /OBSERVER/);
  assert.match(src, /Hooks\.on\("wodxSkipEnd"/);
  assert.match(src, /searchBox\("\.wstory-dreams-waiting"/);
});
