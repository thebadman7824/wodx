import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import * as F from "../../modules/wodx-npc/scripts/faction-rules.mjs";
import EV from "../../modules/wodx-chronicle/data/events.mjs";
import * as MN from "../../modules/wodx-storyteller/scripts/market-news-rules.mjs";
import {isMaelstrom} from "../../modules/wodx-npc/scripts/politics-rules.mjs";

/* Every classic dated event changes something (B3922, B3923) */

const fac = (o) => F.normFaction({id: o.id, name: o.name, kind: o.kind ?? "kindred", ...o});

test("events: every classic event has at least one effect somewhere", () => {
  const SETUP = new Set(["time-of-judgment"]); // the Storyteller's ending, set up in WoDX Storyteller
  const bare = EV.events.filter(e => !F.EVENT_POWERS[e.id] && !F.EVENT_ENDS[e.id] && !MN.newsFor(e) && !isMaelstrom(e.id) && !SETUP.has(e.id)
    && e.id !== "avatar-storm").map(e => e.id);
  assert.deepEqual(bare, []);
});

test("events: a line wiped out ends the factions named for it, with the new power offered", () => {
  const state = {factions: [fac({id: "r", name: "Ravnos of Calcutta"}), fac({id: "k", name: "The Prince's court"})]};
  const {changes, offer} = F.eventChanges(state, "week-of-nightmares", 1999, {newId: () => "new"});
  assert.deepEqual(changes.map(c => c.faction), ["r"]);
  assert.equal(changes[0].set.dormant, true);
  assert.equal(offer?.name, "Kuei-jin envoys");
  assert.equal(F.eventChanges({factions: [fac({id: "c", name: "Croatan war party", kind: "garou"})]}, "croatan", 1589).changes.length, 1);
});
