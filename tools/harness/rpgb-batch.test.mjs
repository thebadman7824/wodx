import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Households (NPC 0.9.0), "Opens for" and stock lists (Interactables 0.23.0), Mood regions (Atmosphere 0.11.0) */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const AR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/alert-rules.mjs")));
const R = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/interact-rules.mjs")));
const W = await import(pathToFileURL(join(root, "modules/wodx-chronicle/scripts/when-rules.mjs")));

test("a household answers: same name, within call, not players' characters, not down, not already fighting", () => {
  const others = [
    {id: "a", name: "Hans", household: "The Kessler farm", yards: 12},
    {id: "b", name: "Grete", household: "the kessler farm ", yards: 35},
    {id: "c", name: "Far cousin", household: "The Kessler farm", yards: 80},
    {id: "d", name: "A player", household: "The Kessler farm", yards: 5, pc: true},
    {id: "e", name: "Dying", household: "The Kessler farm", yards: 5, down: true},
    {id: "f", name: "Fighting", household: "The Kessler farm", yards: 5, inFight: true},
    {id: "g", name: "Neighbour", household: "The Weber farm", yards: 3}
  ];
  assert.deepEqual(AR.kinToAnswer({id: "v", household: "The Kessler farm"}, others).map(k => k.id), ["a", "b"]);
  assert.deepEqual(AR.kinToAnswer({id: "v", household: "The Kessler farm"}, others, {reach: 100}).map(k => k.id), ["a", "b", "c"]);
  assert.deepEqual(AR.kinToAnswer({id: "v", household: ""}, others), []);
});

test("a door that opens for those who fit its list offers lock and unlock without a key", () => {
  const ch = (x = {}) => ({actorId: "pc1", strength: 2, dexterity: 3, perception: 3, intelligence: 2, potence: 0, abilities: {}, eraId: "dark-ages", year: 1300, side: "a", ...x});
  const o = R.describe({door: true, ds: "locked", flags: {lock: "good"}});
  const plain = R.optionsFor(o, ch()).map(x => x.id);
  assert.ok(!plain.includes("unlock"));
  const opens = R.optionsFor(o, ch({opensFor: true}));
  const u = opens.find(x => x.id === "unlock");
  assert.ok(u);
  assert.match(u.label, /opens for you/);
  assert.match(R.resolve(o, u, [], {}).text, /^unlocks it\.$/);
  assert.equal(R.cleanSettings({opensFor: "clan Tremere; night"}).opensFor, "clan Tremere; night");
  assert.equal(R.cleanContainer({opensFor: "faction court"}).opensFor, "faction court");
});

test("stock lists: chances, counts, when lines, mistakes", () => {
  const {lines, problems} = R.parseStock("always: a tallow candle\n1 in 3: a ritual book\n50%: 3-12 silver pennies\nwhen year >= 1890: 1 in 2: a box of matches\nsome junk");
  assert.equal(lines.length, 4);
  assert.equal(problems.length, 1);
  assert.equal(lines[1].p, 1 / 3);
  assert.deepEqual([lines[2].min, lines[2].max], [3, 12]);
  assert.equal(lines[3].when, "year >= 1890");
  const lo = R.rollStock(lines, {rng: () => 0, passes: () => true});
  assert.deepEqual(lo, ["a tallow candle", "a ritual book", "silver pennies (3)", "a box of matches"]);
  const hi = R.rollStock(lines, {rng: () => 0.99, passes: () => true});
  assert.deepEqual(hi, ["a tallow candle"]);
  // The when line follows the era: in 1300 there are no matches
  const passes = when => W.checkWhen(when, {year: 1300}).ok;
  assert.ok(!R.rollStock(lines, {rng: () => 0, passes}).includes("a box of matches"));
  assert.ok(R.rollStock(lines, {rng: () => 0, passes: when => W.checkWhen(when, {year: 1900}).ok}).includes("a box of matches"));
});

test("restocking: when it is due, and what is swapped", () => {
  const D = 86400;
  assert.equal(R.restockDue("", 0, 10 * D), false);
  assert.equal(R.restockDue("dawn", 0, 10), true);
  assert.equal(R.restockDue("dawn", 3 * D + 100, 3 * D + 50000), false);
  assert.equal(R.restockDue("dawn", 3 * D + 100, 4 * D + 1), true);
  assert.equal(R.restockDue("week", D, 7 * D), false);
  assert.equal(R.restockDue("week", D, 8 * D), true);
  assert.equal(R.restockDue("season", D, 92 * D), true);
  // The Storyteller's own lines stay; what the last draw left goes; the new draw comes in
  assert.deepEqual(R.restockLines("the shopkeeper's ledger\na ritual book\nsilver pennies (3)", ["a ritual book", "silver pennies (3)", "a tallow candle"], ["a tallow candle"]),
    ["the shopkeeper's ledger", "a tallow candle"]);
  assert.equal(R.cleanContainer({restock: "week", stock: "always: bread"}).restock, "week");
  assert.equal(R.cleanContainer({restock: "hourly"}).restock, "");
});

test("the Foundry side is wired", () => {
  const im = src("modules/wodx-interactables/scripts/main.mjs");
  assert.match(im, /opensFor: !!String\(o\.opensFor/);
  assert.match(im, /data-wix-stock/);
  assert.match(im, /Stock\.setupStock\(\)/);
  // The Fill button is wired in the tile's own window
  const tileFn = im.slice(im.indexOf("function onRenderTileConfig"), im.indexOf("function onRenderTileConfig") + 2500);
  assert.match(tileFn, /data-wix-fill/);
  assert.match(im, /if \( count > 1 \) o\.name/);
  const st = src("modules/wodx-interactables/scripts/stock.mjs");
  assert.match(st, /wodxSkipEnd/);
  const npc = src("modules/wodx-npc/scripts/main.mjs");
  assert.match(npc, /Hooks\.on\("wodxDamageApplied"/);
  assert.match(npc, /householdReach/);
  const atm = JSON.parse(src("modules/wodx-atmosphere/module.json"));
  assert.deepEqual(atm.documentTypes, {RegionBehavior: {mood: {}}});
  assert.match(src("modules/wodx-atmosphere/scripts/main.mjs"), /Mood\.registerMood/);
  const mood = src("modules/wodx-atmosphere/scripts/mood.mjs");
  assert.match(mood, /W\.check\(system\.when/);
});

test("a mood stays while any player's character is inside", async () => {
  const M = await import(pathToFileURL(join(root, "modules/wodx-atmosphere/scripts/mood.mjs")));
  assert.equal(M.stillInside([{pc: false}, {pc: true}]), true);
  assert.equal(M.stillInside([{pc: false}]), false);
  assert.equal(M.stillInside([]), false);
});

test("Ledger objectives: steps tick from map events, and finishing marks it kept without any Experience", async () => {
  const L = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/ledger-rules.mjs")));
  const e = L.normEntry({kind: "objective", what: "Find the reliquary before the abbey falls", from: "Anna", steps: "reach the cellar stairs\nopen the reliquary\nfound the trapdoor"});
  assert.equal(e.steps.length, 3);
  assert.deepEqual(e.steps.map(s => s.verb), ["reach", "open", "found"]);
  assert.equal(L.normEntry({kind: "debt", steps: "reach x"}).steps.length, 0);
  let r = L.tickObjective(e, {kind: "trigger", objectKind: "trigger", objectName: "The cellar stairs", whoName: "Anna", at: 5});
  assert.deepEqual(r.ticked, ["reach the cellar stairs"]);
  assert.equal(r.finished, false);
  r = L.tickObjective(r.entry, {kind: "open", objectName: "Oak door", state: "open"});
  assert.deepEqual(r.ticked, [], "the wrong object does not tick");
  r = L.tickObjective(r.entry, {kind: "open", objectName: "The reliquary", state: "open", undone: true});
  assert.deepEqual(r.ticked, [], "an undone event does not tick");
  r = L.tickObjective(r.entry, {kind: "open", objectName: "The reliquary", state: "open"});
  r = L.tickObjective(r.entry, {kind: "found", objectName: "A trapdoor under straw", state: "found"});
  assert.equal(r.finished, true);
  assert.equal(r.entry.status, "kept");
  assert.equal(r.entry.steps[0].by, "Anna");
  assert.equal(JSON.stringify(r.entry).includes("experience"), false);
  // A finished objective ticks no more
  assert.deepEqual(L.tickObjective(r.entry, {kind: "trigger", objectName: "The cellar stairs"}).ticked, []);
  assert.match(src("modules/wodx-storyteller/scripts/main.mjs"), /Led\.onMapEventObjectives\(ev\)/);
});

test("faction standing toward a character: steps by word, a test and an outcome", async () => {
  const F = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/faction-rules.mjs")));
  const f = F.normFaction({id: "f1", name: "The Voivode's court", key: "court", people: {pc1: 2, pc2: "hostile", pc3: 9, pc4: 0}});
  assert.deepEqual(f.people, {pc1: 2, pc2: -2, pc3: 3});
  assert.equal(F.peopleWord(2), "Welcome");
  const st = F.normState({factions: [f]});
  assert.equal(F.findFaction(st, "the court")?.id, "f1");
  assert.equal(F.findFaction(st, "voivode")?.id, "f1");
  const mine = F.peopleStandingOf(st, "pc1");
  assert.equal(mine["the voivode's court"], 2);
  assert.equal(W.checkWhen("standing court >= welcome", {actor: {standing: mine}}).ok, true);
  assert.equal(W.checkWhen("standing the voivode's court > 2", {actor: {standing: mine}}).ok, false);
  assert.equal(W.checkWhen("standing nobody > 0", {actor: {standing: mine}}).ok, false);
  const t = W.parseThen("standing the court -1\nstanding court to honoured");
  assert.deepEqual(t.actions.map(a => [a.faction, a.delta, a.to]), [["the court", -1, null], ["court", 0, 3]]);
  assert.match(src("modules/wodx-npc/scripts/factions.mjs"), /async function adjustPeople/);
  assert.match(src("modules/wodx-chronicle/scripts/when.mjs"), /fx\.adjustPeople\(a\.faction/);
});

test("recipes: a long task waits for its workshop's era and its materials, and makes a thing", async () => {
  const T = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/tasks-rules.mjs")));
  const t = T.normTask({kind: "craft", name: "Plates of the dead", workshop: "darkroom", needs: "silver nitrate; glass plates", makes: "Photographs of the dead"});
  assert.equal(t.workshop, "darkroom");
  assert.deepEqual(T.recipeCheck(t, {year: 1800, carried: ["silver nitrate", "glass plates"]}).ok, false);
  assert.match(T.recipeCheck(t, {year: 1800, carried: []}).why, /before about 1839/);
  assert.match(T.recipeCheck(t, {year: 1890, carried: ["Silver nitrate (a jar)"]}).why, /needs glass plates/);
  assert.equal(T.recipeCheck(t, {year: 1890, carried: ["Silver nitrate (a jar)", "a box of glass plates"]}).ok, true);
  assert.equal(T.recipeCheck(T.normTask({kind: "craft", workshop: "forge"}), {year: 1197}).ok, true);
  assert.equal(T.normTask({workshop: "spaceport"}).workshop, "");
  const paused = {...T.pauseTask(t), waits: "needs glass plates"};
  assert.equal(T.resumeTask(paused, 100).waits, "");
  const src2 = src("modules/wodx-storyteller/scripts/tasks.mjs");
  assert.match(src2, /R\.recipeCheck\(task/);
  assert.match(src2, /madeBy/);
});

test("talk sheets: the Storyteller's own lines, shown when they fit the character", async () => {
  const NR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/npc-rules.mjs")));
  const lines = NR.parseTalk("kind kindred => Will not speak of the abbot to a Cainite.\ncarries seal => Opens the archive.\nGrumbles about the price of salt.\n# a note");
  assert.equal(lines.length, 3);
  const mortal = {actor: {kind: "mortal", items: ["The bishop's seal"]}};
  const fit = NR.talkFor(lines, when => W.checkWhen(when, mortal).ok).map(l => l.say);
  assert.deepEqual(fit, ["Opens the archive.", "Grumbles about the price of salt."]);
  assert.equal(NR.talkFor(lines, null).length, 3);
  assert.match(src("modules/wodx-npc/scripts/main.mjs"), /export async function showTalk/);
});
