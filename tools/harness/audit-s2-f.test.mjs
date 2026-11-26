import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Final audit, second sweep, worker f (B6905 to B6906): clan-seat titles with "an", the system's settings check */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const stream = (seed = 7) => { let x = seed >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; };

test("B6905: a seat titled with \"an\" (Voice of an auspice) names the bloc that fills it", async () => {
  const F = await imp("modules/wodx-rules/npc/faction-rules.mjs");
  const PO = await imp("modules/wodx-rules/npc/politics-rules.mjs");
  const info = {e: {name: "Eldest", tribe: "Kamakshi", rank: 4}, k: {name: "Kali", tribe: "Kartikeya", rank: 2}, n: {name: "Naga", tribe: "Kamsa", rank: 1}};
  const f = F.normFaction({id: "nest", name: "The nest", kind: "garou", leader: "e", members: ["e", "k", "n"], politics: {offices: {eldest: ["e"]}, inner: 3}});
  let said = [];
  for ( let seed = 1; seed < 60 && !said.length; seed++ ) said = PO.innerTurn(f, {polity: "nagah-nest", info, rand: stream(seed), turn: 4}).lines.filter(l => / becomes Voice of /.test(l));
  assert.ok(said.length, "the gathering seats a Voice");
  for ( const l of said ) { assert.doesNotMatch(l, /Voice of an auspice/); assert.match(l, /Voice of the (Kamakshi|Kartikeya|Kamsa)\./); }
});

test("B6906: the settings check on every load sends only what changed, and nothing for an actor already right", async () => {
  globalThis.FormApplication ??= class {}; globalThis.Application ??= class {}; globalThis.Dialog ??= class {};
  globalThis.foundry ??= {}; foundry.utils ??= {}; foundry.utils.duplicate ??= x => JSON.parse(JSON.stringify(x));
  foundry.applications ??= {api: {ApplicationV2: class {}, HandlebarsApplicationMixin: x => x, DialogV2: class {}}};
  globalThis.CONFIG ??= {}; CONFIG.worldofdarkness = {...(CONFIG.worldofdarkness ?? {}), attributeSettings: "20th", attributes20: {strength: "s"}, sheettype: {spirit: "Spirit", werewolf: "Werewolf", changingbreed: "Changing Breed", vampire: "Vampire", mage: "Mage", changeling: "Changeling", creatures: "Creature"}};
  const sent = [];
  const make = (ok) => {
    const system = {attributes: {strength: {isvisible: ok}, composure: {isvisible: false}, resolve: {isvisible: false}}, advantages: {willpower: {permanent: 5, temporary: 3, roll: 5}},
      settings: {haswillpower: true, powers: {}}, initiative: {base: 4, bonus: 1, total: 5}};
    const src = {name: "Kin", type: "Mortal", items: [{name: "a sword"}], system};
    return {type: "Mortal", system, toJSON: () => src, toObject: () => JSON.parse(JSON.stringify(src)), update: async d => sent.push(d)};
  };
  globalThis.game = {...(globalThis.game ?? {}), settings: {get: (m, k) => k === "advantageRolls" ? true : 1, set() {}}, actors: [make(true), make(false)]};
  const M = await imp("system/worldofdarkness/module/migration.js");
  await M.updates();
  assert.equal(sent.length, 1, "the actor already right is not written");
  assert.deepEqual(sent[0], {"system.attributes.strength.isvisible": true}, "only the changed value goes, not the items");
});
