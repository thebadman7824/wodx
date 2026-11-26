import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

// Dark Ages depth desk item 6 (B7638-B7640): a poacher in a player's domain.
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const P = await import(join(root, "modules/wodx-rules/npc/poach-rules.mjs"));
const F = await import(join(root, "modules/wodx-rules/npc/faction-rules.mjs"));
const PO = await import(join(root, "modules/wodx-rules/npc/politics-rules.mjs"));

const holder = {id: "h", leader: "npcLord", members: ["pc1", "npc2"]};
const h = {trespass: {faction: "h", name: "The Fief", security: 2}};

test("a hunt in a domain a player holds is a poach; a player's own hunt and an all-NPC domain are not", () => {
  const pcs = new Set(["pc1"]);
  assert.equal(P.isPoach(h, holder, pcs, "npcX"), true);
  assert.equal(P.isPoach(h, holder, pcs, "pc1"), false);
  assert.equal(P.isPoach(h, {...holder, members: ["npc2"]}, pcs, "npcX"), false);
  assert.equal(P.isPoach({trespass: null}, holder, pcs, "npcX"), false);
  assert.deepEqual(P.holdersOf(holder, pcs), ["pc1"]);
});

test("security takes a dot each from the tracking difficulty, to no less than 3 (V20 Dark Ages p. 180)", () => {
  assert.equal(P.trackDiff(0), 6);
  assert.equal(P.trackDiff(2), 4);
  assert.equal(P.trackDiff(5), 3);
  assert.deepEqual(P.trackPool({perception: 3, investigation: 2, survival: 4}), {attr: "perception", skill: "investigation", dice: 5});
  assert.deepEqual(P.trackPool({perception: 3, investigation: 2, survival: 4}, true), {attr: "perception", skill: "survival", dice: 7});
  assert.equal(P.trackPool({}).dice, 1);
});

test("the signs start with the vessel, and the wilds leave a track", () => {
  const town = P.poachSigns(), wild = P.poachSigns({feeds: "chi", wild: true});
  assert.equal(town.length, 3);
  assert.match(town[0], /pale and faint/);
  assert.match(wild[0], /short of breath/);
  assert.match(wild[2], /track/);
});

test("the poacher broke the court's own law of hunting in another's fief, or the Tradition of Domain", () => {
  const da = Object.entries(PO.POLITIES).find(([, p]) => (p.law ?? []).includes("hunting in another's fief"));
  assert.ok(da, "a court with the law");
  assert.equal(P.brokenLaw(da[1].law), "hunting in another's fief");
  assert.equal(P.brokenLaw([]), "the Tradition of Domain");
  assert.equal(P.trackVerdict({net: 2}), "found");
  assert.equal(P.trackVerdict({net: 0}), "cold");
  assert.equal(P.trackVerdict({net: 0, botch: true}), "lost");
});

test("huntingAt marks a hunt in another faction's place as a trespass with that domain's security", () => {
  const state = {factions: [F.normFaction?.({id: "h", name: "The Fief", kind: "kindred", places: ["p1"], members: ["pc1"], assets: {security: 2, domain: 2}}) ?? {id: "h", name: "The Fief", places: ["p1"], members: ["pc1"], assets: {security: 2, domain: 2}}], breaches: []};
  const r = F.huntingAt(state, {id: "p1", kind: "market"}, {factions: []});
  assert.equal(r.trespass?.faction, "h");
  assert.equal(r.trespass?.security, 2);
  assert.equal(P.isPoach(r, state.factions[0], new Set(["pc1"]), "npcX"), true);
});
