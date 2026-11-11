import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Trait effects step 7 (Chronicle 0.22.0, Actions 3.37.0, Storyteller 0.29.0, Interactables 0.25.0): flaws set off on
   the map, the night's draw, Ledger entries and prompts to the Storyteller */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/trait-rules.mjs")));
const src = p => readFileSync(join(root, p), "utf8");
const feat = (name, kind = "flaw") => ({id: name, name, kind, value: 1});
const vamp = (...names) => ({kind: "kindred", features: names.map(n => feat(n))});

test("every step 7 table names a real entry, and none of its text breaks the house style", () => {
  const idx = T.buildIndex();
  for ( const tab of [T.TRIGGERS, T.PULLS, T.LEDGER, T.PROMPTS] ) for ( const key of Object.keys(tab) ) assert.ok(idx.byKey.has(key), key);
  const text = JSON.stringify([T.TRIGGERS, T.PULLS, T.LEDGER, T.PROMPTS]);
  assert.ok(!/—/.test(text), "no em-dashes");
  assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(text), "gender-neutral");
  for ( const p of Object.values(T.PULLS) ) assert.ok(p.chance > 0 && p.chance < 1 && (p.text || p.aid));
  for ( const p of Object.values(T.PROMPTS) ) assert.ok(p.on.every(o => ["feed", "social", "fight", "night"].includes(o)));
});

test("map triggers match whole words in tile and region names, and Phobia reads its brackets", () => {
  const tr = T.triggersOf(vamp("Can't Cross Running Water", "Crosses", "Phobia (rats, fire)"));
  assert.deepEqual(tr.map(t => t.key).sort(), ["cant-cross-running-water", "crosses", "phobia"]);
  assert.deepEqual(tr.find(t => t.key === "phobia").words, ["rats", "fire"]);
  assert.deepEqual(T.triggered(tr, ["The mill STREAM"]).map(t => t.key), ["cant-cross-running-water"]);
  assert.deepEqual(T.triggered(tr, ["Old crossroads", "Streamside inn"]), []);
  assert.deepEqual(T.triggered(tr, ["Wayside cross"]).map(t => t.key), ["crosses"]);
  assert.deepEqual(T.triggered(tr, ["A nest of rats"]).map(t => t.key), ["phobia"]);
  assert.ok(tr.find(t => t.key === "crosses").stop && !tr.find(t => t.key === "phobia").stop);
  assert.deepEqual(T.triggersOf(vamp("Phobia")), [], "a Phobia with nothing named sets nothing off");
  assert.equal(T.triggersOf({kind: "mortal", features: [feat("Garlic")]}).length, 0, "a vampire's flaw on a mortal does nothing");
});

test("the night's draw: a flaw turns up by its chance, and Oracular Ability brings a story aid", () => {
  const v = vamp("Hunted", "Haunted");
  assert.equal(T.pullsOf(v, () => 0.99, "Anna").length, 0);
  const got = T.pullsOf(v, () => 0, "Anna");
  assert.deepEqual(got.map(p => p.key).sort(), ["haunted", "hunted"]);
  assert.ok(got.every(p => p.text.includes("Anna") && !p.text.includes("{{")));
  const o = T.pullsOf({kind: "mortal", features: [feat("Oracular Ability", "merit")]}, () => 0, "Ivo");
  assert.deepEqual(o.map(p => [p.key, p.aid]), [["oracular-ability", "augury"]]);
});

test("Ledger entries: a fixed id, the right side owing, and a reveal clock on secrets", () => {
  const es = T.ledgerOf(vamp("Dark Secret", "Narc", "Boon"), {id: "A1", name: "Anna", now: 1000, day: 10});
  const by = k => es.find(e => e.id === `trait-A1-${k}`);
  assert.equal(by("dark-secret").kind, "consequence");
  assert.equal(by("dark-secret").due, 1000 + 180 * 10);
  assert.equal(by("narc").from.name, "Anna");
  assert.equal(by("boon").to.name, "Anna");
  assert.equal(by("boon").due, null);
  assert.ok(es.every(e => /V20 p\. \d+/.test(e.notes)));
});

test("prompts come at their moment only, with the book page", () => {
  const v = vamp("Infectious Bite", "Flashbacks", "Addiction");
  assert.deepEqual(T.promptsOn(v, "feed").map(p => p.key), ["infectious-bite"]);
  assert.deepEqual(T.promptsOn(v, "fight").map(p => p.key), ["flashbacks"]);
  assert.deepEqual(T.promptsOn(v, "night").map(p => p.key), ["addiction"]);
  assert.ok(T.promptsOn(v, "feed")[0].text.endsWith("(V20 p. 481)"));
  const m = T.traitsOf(vamp("Hunted")).matched[0];
  assert.match(T.describe(m), /night's draw about one night in 3/);
});

test("the modules carry it out: Interactables holds the move, Storyteller draws and opens entries, Actions asks on feeding", () => {
  const ia = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(ia, /traits\?\.triggers\?\.\(actor\)/);
  assert.match(ia, /wodxHeld: true/);
  assert.match(ia, /held: !!options\?\.wodxHeld/);
  assert.match(ia, /"traitTriggers"/);
  const night = src("modules/wodx-storyteller/scripts/night.mjs");
  assert.match(night, /pulls: pullsFor\(g, jdn, nonce\)/);
  assert.match(night, /traits\?\.prompt\?\.\(all\(game\.actors\)\.filter\(isPC\), "night"/);
  const led = src("modules/wodx-storyteller/scripts/ledger.mjs");
  assert.match(led, /export function syncTraits/);
  assert.match(led, /"ledgerTraits"/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /traits\?\.prompt\?\.\(actor, "feed"/);
  const tr = src("modules/wodx-chronicle/scripts/traits.mjs");
  assert.match(tr, /Hooks\.on\("wodxSocial"/);
  assert.match(tr, /Hooks\.on\("wodxFightStarted"/);
  assert.equal(JSON.parse(src("modules/wodx-chronicle/module.json")).version, "0.22.0");
});
