// NPC Motives Desk part four (B5699-B5703): the hunters follow through. Pure rules.
import "./win-paths.mjs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const HF = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/hunt-follow-rules.mjs")));
const K = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/kits-rules.mjs")));

test("h1: proof by who hunts, and the imbued burn", () => {
  assert.equal(HF.proofFor(1200, "church-courts").key, "church-courts");
  assert.equal(HF.proofFor(1450, "inquisition").to, "the Inquisition, as proof for a trial");
  assert.equal(HF.proofFor(1900, "leopold").short, "the reliquary");
  assert.equal(HF.proofFor(1960, "agency").key, "agency");
  assert.equal(HF.proofFor(2005, "leopold", "reckoning").burn, true);
  assert.equal(HF.proofFor(1890, null).key, "arcanum");
  assert.equal(HF.proofFor(1100, null).key, "church-courts");
  assert.ok(HF.isSupernatural("Vampire") && HF.isSupernatural("Werewolf") && !HF.isSupernatural("Mortal"));
  assert.equal(HF.PROOF_EASE, -2);
});

test("h2: how a raid ends", () => {
  assert.equal(HF.raidEnd({hunters: [{down: false}], quarry: null}), "missed");
  assert.equal(HF.raidEnd({hunters: [{down: false}], quarry: {present: true, down: true}}), "won");
  assert.equal(HF.raidEnd({hunters: [{down: true}, {down: true}, {down: false}], quarry: {present: true, down: false}}), "beaten");
  assert.equal(HF.raidEnd({hunters: [{down: false}, {down: false}, {down: true}], quarry: {present: true, down: false}}), "held");
  assert.equal(HF.RAID_AFTER.beaten.file, 1);
  assert.equal(HF.RAID_AFTER.missed.watch, true);
  assert.equal(HF.watchUntil(100), 100 + 3 * 86400);
});

test("h3: the investigator's day and whether they stay", () => {
  const b = HF.investigatorBlocks({market: "M", tavern: "T", church: "C"});
  assert.deepEqual(b.slice(0, 3).map(x => x.place), ["M", "T", "C"]);
  assert.ok(b.some(x => x.from === 0 && x.place === "T"));
  assert.ok(HF.investigatorBlocks({church: "C"}).every(x => x.place === "C"));
  assert.equal(HF.investigatorStays({harmed: true}), "harmed");
  assert.equal(HF.investigatorStays({step: 2}), "won");
  assert.equal(HF.investigatorStays({days: 3}), "done");
  assert.equal(HF.investigatorStays({days: 1}), "stays");
  const ext = K.EXTRAS.find(e => e.key === "investigator");
  assert.ok(ext && ext.abilities.investigation === 3 && Object.keys(ext.attrs).length === 9);
});

test("h5: a found body feeds the hunters by cause and year, and the morgue from 1840", () => {
  assert.equal(HF.bodyPressure("violence", 1500), 0);
  assert.equal(HF.bodyPressure("drained", 1500), 2);
  assert.equal(HF.bodyPressure("savaged", 1800), 1);
  assert.equal(HF.bodyPressure("drained", 1990), 2);
  assert.equal(HF.toMorgue(1830, "drained"), false);
  assert.equal(HF.toMorgue(1850, "drained"), true);
  assert.equal(HF.toMorgue(1850, "sickness"), false);
});

const RR = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/remains-rules.mjs")));
test("B6666: who comes upon a body, and how far, read the same by remains and the hunters' own watch", () => {
  assert.equal(RR.finderOf({pc: true}), "pc");
  assert.equal(RR.finderOf({type: "Mortal"}), "town");
  assert.equal(RR.finderOf({type: "Mortal", passerby: true}), null);
  assert.equal(RR.finderOf({type: "Mortal", hunter: true}), null);
  assert.equal(RR.finderOf({type: "Vampire"}), null);
  assert.equal(RR.finderOf({pc: true, hidden: true}), null);
  assert.equal(RR.squares({x: 0, y: 0}, {x: 100, y: 0}, 100), 1);
  assert.equal(RR.squares({x: 0, y: 0}, {x: 400, y: 100}, 100), 4);
});

/* B6666: with the remains house rule OFF (its default) and the hunters' pressure on, a body left drained still feeds
 * the hunters: hunt-follow marks it itself on the dead mark and finds it when a townsman walks up. Mocked Foundry. */
const deep = () => new Proxy(class {}, {get: (t, k) => (k in t ? t[k] : deep()), apply: () => deep()});
globalThis.foundry ??= deep();
globalThis.Hooks ??= {on() {}, once() {}, callAll() {}};
const FOL = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/hunt-follow.mjs")));
function huntWorld({remains = false, pressure = true} = {}) {
  const setPath = (o, path, v) => { const ks = path.split("."); let x = o; for ( const k of ks.slice(0, -1) ) x = (x[k] ??= {}); x[ks.at(-1)] = v; };
  const scene = {id: "s1", uuid: "Scene.s1", grid: {size: 100}, tokens: []};
  const tok = (id, actor, x, y, more = {}) => {
    const t = {id, uuid: `Scene.s1.Token.${id}`, name: actor.name, actorId: actor.id, actorLink: true, actor, x, y, width: 1, height: 1, hidden: false, parent: scene, flags: {}, ...more,
      async update(u) { for ( const [k, v] of Object.entries(u) ) setPath(this, k, v); }};
    scene.tokens.push(t);
    return t;
  };
  const added = [];
  const settings = {"wodx-storyteller.remains": remains, "wodx-storyteller.hunterPressure": pressure};
  globalThis.game = {time: {worldTime: 5000}, user: {id: "gm", isGM: true}, users: [{id: "gm", isGM: true}], scenes: [scene],
    settings: {get: (m, k) => { const v = settings[`${m}.${k}`]; if ( v === undefined ) throw new Error("no setting"); return v; }},
    modules: {get: id => (id === "wodx-storyteller" ? {api: {hunters: {regionAt: () => "moravia", add: async (r, why, o) => { added.push({r, ...o}); }}}} : null)}};
  globalThis.ChatMessage = {create: async () => null};
  return {scene, tok, added};
}
const victimActor = () => ({id: "v", name: "Victim", type: "Mortal", documentName: "Actor", hasPlayerOwner: false, isToken: false, flags: {"wodx-actions": {vesselBlood: {value: 0, at: 5000}}}});

test("B6666: remains off, the hunters' own watch marks a drained body and the first townsman to come upon it feeds them", async () => {
  const w = huntWorld();
  const body = w.tok("b", victimActor(), 0, 0);
  const finder = w.tok("f", {id: "f", name: "Carter", type: "Mortal", hasPlayerOwner: false}, 800, 0);
  const marked = await FOL.bodyLeft({statuses: new Set(["dead"]), parent: body.actor});
  assert.equal(marked.length, 1);
  assert.equal(body.flags["wodx-storyteller"].leftBody.cause, "drained");
  assert.deepEqual(await FOL.bodyNear(finder, {x: 800, y: 0}), [], "too far");
  const r = await FOL.bodyNear(finder, {x: 100, y: 0});
  assert.equal(r.length, 1);
  assert.ok(w.added[0].n > 0 && w.added[0].r === "moravia");
  assert.equal(body.flags["wodx-storyteller"].leftBody.found, "f");
  assert.deepEqual(await FOL.bodyNear(finder, {x: 100, y: 100}), [], "found once");
});

test("B6666: with remains on the remains module does the finding, so the hunters' own watch stands aside", async () => {
  const w = huntWorld({remains: true});
  const body = w.tok("b", victimActor(), 0, 0);
  assert.deepEqual(await FOL.bodyLeft({statuses: new Set(["dead"]), parent: body.actor}), []);
  const w2 = huntWorld({pressure: false});
  const b2 = w2.tok("b", victimActor(), 0, 0);
  assert.deepEqual(await FOL.bodyLeft({statuses: new Set(["dead"]), parent: b2.actor}), [], "no hunters' pressure: nothing to feed");
  // a death that is not the Kiss's drain adds no pressure, so it is not marked
  const w3 = huntWorld();
  const b3 = w3.tok("b", {...victimActor(), flags: {}}, 0, 0);
  assert.deepEqual(await FOL.bodyLeft({statuses: new Set(["dead"]), parent: b3.actor}), []);
});
