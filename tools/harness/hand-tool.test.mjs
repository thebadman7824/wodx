// B6955: Chronicle's tools reach the Storyteller's hand however late the hand comes.
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync} from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const {addHandTool} = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/hand-tool.mjs")).href);

test("a hand that comes after many retries still gets the tool, once", async () => {
  const added = [];
  let calls = 0;
  const hand = () => (++calls > 7 ? {addTool: t => added.push(t.key)} : null);
  const ok = await addHandTool({key: "nightWork"}, {hand, wait: async () => {}});
  assert.equal(ok, true);
  assert.deepEqual(added, ["nightWork"]);
});

test("a hand that never comes gives up after the tries", async () => {
  let waits = 0;
  const ok = await addHandTool({key: "referee"}, {hand: () => null, tries: 5, wait: async () => { waits++; }});
  assert.equal(ok, false);
  assert.equal(waits, 5);
});

test("the night's work and the referee use it, not a single retry", () => {
  for ( const f of ["nightwork.mjs", "referee.mjs"] ) {
    const src = readFileSync(join(root, "modules/wodx-chronicle/scripts", f), "utf8");
    assert.match(src, /addHandTool\(\{key: "(nightWork|referee)"/, f);
    assert.doesNotMatch(src, /setTimeout\(add, 2000\)/, f);
  }
});
