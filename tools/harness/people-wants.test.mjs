import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as PR from "../../modules/wodx-creation/scripts/people-rules.mjs";
import * as SX from "../../modules/wodx-npc/scripts/secrets-rules.mjs";
import * as TK from "../../modules/wodx-npc/scripts/talk-rules.mjs";
import * as L from "../../modules/wodx-library/scripts/look-rules.mjs";
import {normMarks} from "../../modules/wodx-npc/scripts/wanted-rules.mjs";

/* A made person's want, secret and look as things the game reads (B3925) */

const p = {batch: 3, row: 1, nonce: 0, motive: "to pay off a debt before winter comes", secret: "steals from their employer", look: "a scar through one eyebrow"};

test("people wants: the flags a made person carries", () => {
  const f = PR.peopleFlags(p);
  assert.deepEqual(f["flags.wodx-npc.want"], {topic: "a favour", text: p.motive, met: {}});
  const sheet = TK.parseSheet ? TK.parseSheet(f["flags.wodx-npc.behavior.talk"]) : null;
  if ( sheet ) {
    assert.ok(sheet.offers.map(TK.normTopic).includes("a favour"));
    assert.ok(sheet.lines.some(l => TK.normTopic(l.topic) === "a favour" && /pay off a debt/.test(l.say)));
  }
  const [s] = SX.secretsOf({"wodx-npc": {secrets: f["flags.wodx-npc.secrets"]}});
  assert.equal(s.kind, "crime");
  assert.match(s.text, /steals from their employer/);
  assert.equal(SX.secretsOf({"wodx-npc": {secrets: f["flags.wodx-npc.secrets"]}})[0].id, s.id, "the id is kept, so a find sticks");
  assert.deepEqual(f["flags.wodx-library.features"], ["a scar through one eyebrow"]);
  assert.equal(PR.secretKind("owes money to someone dangerous"), "debt");
  assert.equal(PR.secretKind("keeps a faith in secret"), "heresy");
  assert.equal(PR.secretKind("dreams of the same stranger every night"), "other");
  assert.deepEqual(PR.peopleFlags({}), {});
});

test("people wants: a witness remembers the look", () => {
  const m = normMarks({station: 2, features: L.noticedFeatures(["a scar through one eyebrow", "quick to offer help", "missing two fingers", "a heavy limp"])});
  assert.deepEqual(m.features, ["a scar through one eyebrow", "missing two fingers"]);
  assert.equal(L.describeMarks(m), "a plainly dressed figure, with a scar through one eyebrow, missing two fingers");
});
