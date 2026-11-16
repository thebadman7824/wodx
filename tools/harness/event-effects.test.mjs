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
  // The Bunyip: broken in the War of Tears (a few survive), gone at the last stand of 1937 (Ben's desk pick, 16 November 2026)
  const tears = F.eventChanges({factions: [fac({id: "b", name: "Bunyip of the river", kind: "garou"})]}, "war-of-tears", 1899, {newId: () => "far"});
  assert.equal(tears.changes.length, 0);
  assert.equal(tears.offer?.name, "Bunyip in the far country");
  assert.equal(F.eventChanges({factions: [fac({id: "b", name: "Bunyip in the far country", kind: "garou"})]}, "bunyip-last-stand", 1937).changes.length, 1);
});

test("events: Future Darkness disasters move the markets once each", async () => {
  const FUT = (await import("../../modules/wodx-chronicle/data/future-events.mjs")).default.events;
  const all = new Map([...EV.events, ...FUT].map(e => [e.id, e]));
  for ( const [id, key] of Object.entries(MN.EVENT_NEWS) ) {
    assert.ok(all.has(id), `${id} is a real event`);
    assert.ok(MN.PRESETS[key], `${id} names a preset`);
  }
  // one card per happening: no year gets the same preset twice from the branch (cascades counted apart)
  const seen = new Set();
  for ( const [id, key] of Object.entries(MN.EVENT_NEWS) ) {
    const e = all.get(id), k = `${e.year}:${e.cascade ?? ""}:${key}`;
    assert.ok(!seen.has(k), `${id} repeats ${k}`);
    seen.add(k);
  }
  for ( const id of ["wofd-1997-1", "wofd-1998-1", "wofd-2002-1", "wofd-2004-2", "wofd-2008-4"] ) assert.ok(MN.newsFor(all.get(id)), id);
});
