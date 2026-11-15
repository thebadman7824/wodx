// WoDX Storyteller: NPCs make their own wonders (B5970 to B5974).
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import * as NM from "../../modules/wodx-storyteller/scripts/npc-makers-rules.mjs";

test("a month between looks", () => {
  assert.ok(NM.due(0, 5));
  assert.ok(!NM.due(100, 100 + NM.MONTH - 1));
  assert.ok(NM.due(100, 100 + NM.MONTH));
});

test("a few able NPCs start work, never the busy or the blocked", () => {
  const c = [
    {id: "busy", busy: true, works: [{line: "garou", key: "a"}]},
    {id: "blocked", works: [{line: "garou", key: "a", blocked: true}]},
    ...Array.from({length: 8}, (_, i) => ({id: `n${i}`, works: [{line: "garou", key: "x", opts: {spend: 1}}, {line: "mage", key: "y"}]}))];
  const always = NM.chooseWork(c, () => 0);
  assert.equal(always.length, NM.PER_MONTH);
  assert.ok(always.every(p => p.id.startsWith("n")));
  assert.deepEqual(always[0], {id: "n0", line: "garou", key: "x", opts: {spend: 1}});
  assert.equal(NM.chooseWork(c, () => 0.99).length, 0, "chance says no");
});

test("the plainest opts the kit allows", () => {
  assert.deepEqual(NM.optsFor(() => []), {});
  assert.deepEqual(NM.optsFor(o => (o.spend ? [] : ["spend 1"])), {spend: 1});
  assert.equal(NM.optsFor(() => ["never"]), null);
});

test("wired: a monthly look on the clock, a setting, quiet starts, a card", () => {
  const s = readFileSync(new URL("../../modules/wodx-storyteller/scripts/wonders.mjs", import.meta.url), "utf8");
  assert.match(s, /Hooks\.on\("updateWorldTime", look\)/);
  assert.match(s, /"npcMakers"/);
  assert.match(s, /quiet: true/);
  assert.match(s, /wst-npc-makers/);
  const m = readFileSync(new URL("../../modules/wodx-storyteller/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(m, /Wonders\.registerWonderSettings\(\)/);
});
