import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Final audit (B6753): the Everyday Banality panel shows the tagged region a changeling stands in, not only the scene's
 * own tag (the count already read regions, B6174; the panel said "not a banal place"). */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BL = await import(pathToFileURL(join(root, "modules/wodx-actions/scripts/banal-life.js")));

test("the panel names the office a changeling stands in when the scene itself is not tagged", async () => {
  const office = {flags: {"wodx-npc": {place: {kind: "office"}}}};
  const fae = {id: "a1", name: "Wren", type: "Changeling", hasPlayerOwner: true, getFlag: () => null, flags: {}, system: {}, items: []};
  const scene = {name: "Old Town", flags: {}, tokens: [{actor: fae, actorLink: true, actorId: "a1", regions: new Set([office])}]};
  globalThis.game = {user: {isGM: true}, users: [], modules: new Map()};
  globalThis.canvas = {scene, tokens: {controlled: []}};
  let shown = "";
  const api = BL.build({setFlag: async () => {}, notify: () => {}, banality: () => 0, seemingOf: () => "wilder", dialog: (t, c) => { shown = c; return null; }});
  await api.panel();
  assert.match(shown, /Wren: 0 of \d+, standing in an office or counting house/);
});
