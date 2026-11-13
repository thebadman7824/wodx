import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const R = await import(join(root, "modules/wodx-chronicle/scripts/player-view-rules.mjs"));

test("view: the player's own pick, then the Storyteller's, then the world default", () => {
  assert.equal(R.viewFor({mine: "full", byUser: "beginner", fallback: "beginner"}), "full");
  assert.equal(R.viewFor({mine: "", byUser: "beginner", fallback: "full"}), "beginner");
  assert.equal(R.viewFor({mine: "", byUser: "", fallback: "beginner"}), "beginner");
  assert.equal(R.viewFor({mine: "nonsense", byUser: "", fallback: "nonsense"}), "full");
  assert.equal(R.viewFor(), "full");
});

test("fits: line and year", () => {
  assert.equal(R.fits("wodxStepSideways", {kind: "lupine"}), true);
  assert.equal(R.fits("wodxStepSideways", {kind: "mortal"}), false);
  assert.equal(R.fits("wodxStepSideways", {kind: ""}), true, "no character: nothing is moved aside");
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1197}), false);
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1999}), true);
  assert.equal(R.fits("wodxJack", {kind: "mage", year: 1990}), true);
  assert.equal(R.fits("wodxTalk", {kind: "mortal", year: 1197}), true);
});

test("sortTools: every WoDX button lands on the bar or in exactly one drawer", () => {
  const names = [...Object.keys(R.TOOL_GROUP), "wodxXCard", "wodxFindMe", "wodxSomethingNew"];
  const tools = names.map(name => ({name, title: name, icon: "x"}));
  const {bar, drawers} = R.sortTools(tools, {kind: "kindred", year: 1197});
  const inDrawers = Object.values(drawers).flatMap(d => [...d.fit, ...d.more].map(t => t.name));
  assert.deepEqual([...bar, ...inDrawers].sort(), [...names].sort());
  assert.ok(bar.includes("wodxXCard") && bar.includes("wodxFindMe") && bar.includes("wodxSomethingNew"));
  assert.ok(drawers.beyond.more.some(t => t.name === "wodxJack"), "the Net in 1197 is under More");
  assert.ok(drawers.beyond.more.some(t => t.name === "wodxStepSideways"), "a Kindred does not step sideways");
  assert.ok(drawers.now.fit.some(t => t.name === "wodxSight"), "Auspex sight fits a Kindred");
  for ( const g of R.GROUPS ) assert.ok(drawers[g.id], g.id);
});

test("sortTools: a button the Storyteller hid never reaches a drawer", () => {
  const {bar, drawers} = R.sortTools([{name: "wodxTalk"}], {});
  assert.equal(bar.length, 0);
  assert.equal(Object.values(drawers).flatMap(d => [...d.fit, ...d.more]).length, 1);
});

test("hud groups", () => {
  assert.equal(R.hudGroupOf("control-icon vta-hud"), "keep");
  assert.equal(R.hudGroupOf("control-icon vtc-hud"), "act");
  assert.equal(R.hudGroupOf("control-icon vtc-hud vtc-room"), "move");
  assert.equal(R.hudGroupOf("control-icon vtc-hud vtc-burden-btn active"), "move");
  assert.equal(R.hudGroupOf("control-icon wix-hud wix-carry-hud"), "move");
  assert.equal(R.hudGroupOf("control-icon wix-hud"), "look");
  assert.equal(R.hudGroupOf("control-icon wsn-who"), "look");
  assert.equal(R.hudGroupOf("control-icon wnpc-hud wnpc-faces-hud"), "talk");
  assert.equal(R.hudGroupOf("control-icon wodx-sprite-pick"), "act");
  assert.equal(R.hudGroupOf("control-icon some-other-module"), null);
  assert.equal(R.hudGroupOf("control-icon"), null);
});

test("search: every word must match; label starts rank first", () => {
  const e = [{label: "Feed", hint: "Kindred"}, {label: "Spend blood", hint: "heal, feed later"}, {label: "Letters", hint: "send a letter"}];
  assert.deepEqual(R.search(e, "feed").map(x => x.label), ["Feed", "Spend blood"]);
  assert.deepEqual(R.search(e, "send letter").map(x => x.label), ["Letters"]);
  assert.deepEqual(R.search(e, ""), []);
  assert.deepEqual(R.search(e, "(x["), [], "odd characters do not throw");
  assert.equal(R.search(Array.from({length: 99}, (_, i) => ({label: `a${i}`})), "a").length, 40);
});

test("the Storyteller's window lists every drawer button", async () => {
  const src = (await import("node:fs")).readFileSync(join(root, "modules/wodx-chronicle/scripts/player-tools.mjs"), "utf8");
  for ( const name of Object.keys(R.TOOL_GROUP) ) assert.ok(src.includes(`"${name}"`), `${name} missing from PLAYER_TOOLS`);
});

const TR = await import(join(root, "modules/wodx-actions/scripts/theme-rules.js"));

test("actions front row: the line's first five acts, in its own order", () => {
  const sections = [["Do", TR.MENU_PLAN.kindred.act.map(s => [s, s, "fa-x"])]];
  const g = TR.groupMenu("kindred", sections);
  assert.deepEqual(TR.frontRow(g).map(b => b.spec), TR.MENU_PLAN.kindred.act.slice(0, 5));
  assert.deepEqual(TR.frontRow({bands: []}), []);
});

test("action line: what it does, then a fixed cost; no cost guessed", () => {
  assert.equal(TR.actionLine("api:spendBlood", "Spend blood to heal"), "Spend blood to heal. Spends blood.");
  assert.equal(TR.actionLine("api:somethingElse", "Does a thing."), "Does a thing.");
  assert.equal(TR.actionLine("api:somethingElse", ""), "");
});

test("plain line on a roll card", () => {
  assert.match(TR.plainLine({text: "BOTCH"}), /^Botch/);
  assert.match(TR.plainLine({text: "Failure"}), /^Failure/);
  assert.equal(TR.plainLine({text: "1 success"}), "Success: it works, barely (1 success).");
  assert.equal(TR.plainLine({text: "3 successes: good"}), "Success: it works, well (3 successes).");
  assert.equal(TR.plainLine(null), "");
});

test("quieter chat: world cards fold, rolls never", () => {
  assert.equal(R.isWorldCard({flags: {"wodx-npc": {overheard: {a: 1}}}}), true);
  assert.equal(R.isWorldCard({alias: "Weather"}), true);
  assert.equal(R.isWorldCard({alias: "Weather", rolls: 1}), false);
  assert.equal(R.isWorldCard({flags: {"wodx-atmosphere": {x: 1}}, html: '<div class="vta-dice"></div>'}), false);
  assert.equal(R.isWorldCard({alias: "Marta"}), false);
  assert.equal(R.oneLine("a b c"), "a b c");
  const long = R.oneLine("word ".repeat(60));
  assert.ok(long.endsWith("...") && long.length <= 94);
});

const SB = await import(join(root, "modules/wodx-sheets/scripts/beginner-rules.mjs"));
const CKR = await import(join(root, "modules/wodx-actions/scripts/checks-rules.js"));

test("sheet quick rolls: defaults are real checks; the player's own list wins; at most eight", () => {
  const known = new Set(CKR.CHECKS.map(c => c.key));
  for ( const k of SB.QUICK_DEFAULT ) assert.ok(known.has(k), k);
  assert.deepEqual(SB.quickList(undefined, known), SB.QUICK_DEFAULT);
  assert.deepEqual(SB.quickList(["search", "nope", "search"], known), ["search"]);
  assert.deepEqual(SB.quickList([], known), [], "an emptied row stays empty");
  assert.equal(SB.toggleQuick(Array(8).fill(0).map((_, i) => `k${i}`), "x"), null);
  assert.deepEqual(SB.toggleQuick(["a", "b"], "a"), ["b"]);
});

test("sheet: the line's power button comes from the Actions menu order", () => {
  assert.equal(SB.powerSpec("kindred", TR.MENU_PLAN), "api:useDiscipline");
  assert.equal(SB.powerSpec("lupine", TR.MENU_PLAN), "api:useGift");
  assert.equal(SB.powerSpec("wraith", TR.MENU_PLAN), "api:useArcanos");
  assert.equal(SB.powerSpec("mage", TR.MENU_PLAN), "cast");
  assert.equal(SB.powerSpec("mortal", TR.MENU_PLAN), null);
});

test("sheet tabs: powers after Core, settings, effects, body and links tucked last, nothing lost", () => {
  const tabs = ["bio", "core", "settings", "discipline", "combat", "gear", "wodxties", "wodxbody", "effect", "note", ""];
  const {order, tucked} = SB.tabOrder(tabs);
  assert.deepEqual([...order].sort((a, b) => a - b), tabs.map((_, i) => i));
  assert.deepEqual(order.slice(0, 3).map(i => tabs[i]), ["bio", "core", "discipline"]);
  assert.deepEqual(tucked.map(i => tabs[i]).sort(), ["", "effect", "settings", "wodxbody"]);
  assert.deepEqual(order.slice(-4), tucked);
});

test("hover help: plain words, no dashes or stock phrases, era wording for Humanity", () => {
  for ( const [k, v] of Object.entries(SB.HELP) ) {
    assert.ok(v.length < 160, k);
    assert.doesNotMatch(v, /—|\bdelve|\btapestry|\bin today's|\bnot just\b|\bunleash|\bembark/i, k);
    assert.doesNotMatch(v, /\b(he|she|his|her|him)\b/i, k);
  }
  assert.match(SB.helpFor("Dexterity"), /dodge/);
  assert.match(SB.helpFor("Animal Ken"), /animals/);
  assert.match(SB.helpFor("Humanity", {year: 1197}), /Road of Humanity/);
  assert.doesNotMatch(SB.helpFor("Humanity", {year: 1999}), /Road/);
  assert.equal(SB.helpFor("Nothing here"), "");
  assert.equal(SB.firstSentence("<p>Calls a mist. It lasts a scene.</p>"), "Calls a mist. It lasts a scene.", "a very short first sentence takes the next one too");
  assert.equal(SB.firstSentence("<p>The Kindred calls a mist. It lasts a scene.</p>"), "The Kindred calls a mist.");
});

test("What can I do now: the moment is read right and only usable things are offered", () => {
  assert.equal(R.moment({}), "nobody");
  assert.equal(R.moment({hasActor: true}), "between");
  assert.equal(R.moment({hasActor: true, onScene: true}), "scene");
  assert.equal(R.moment({hasActor: true, onScene: true, beyond: true}), "beyond");
  assert.equal(R.moment({hasActor: true, onScene: true, inFight: true, needsInit: true}), "fightStart");
  assert.equal(R.moment({hasActor: true, onScene: true, inFight: true, myTurn: true}), "fightTurn");
  assert.equal(R.moment({hasActor: true, onScene: true, inFight: true}), "fightWait");
  const all = {tools: new Set(["wodxTalk", "wodxPassTime", "wodxFindMe", "wodxDowntime", "wodxLetters", "wodxCreation", "wodxLibrary", "wodxOtherRolls", "wodxStepSideways"]),
    actions: true, power: "api:useDiscipline", calls: new Set(["askChar", "sheet", "order", "initiative", "attack", "quickAttack", "endTurn"])};
  for ( const k of Object.keys(R.MOMENTS) ) {
    const {head, items} = R.nowItems(k, all);
    assert.ok(head && items.length >= 2 && items.length <= R.NOW_MAX, k);
    for ( const it of [head, ...items.map(i => `${i.label} ${i.hint ?? ""}`)] ) {
      assert.doesNotMatch(it, /—|\b(he|she|his|her|him)\b/i, k);
    }
  }
  const turn = R.nowItems("fightTurn", all).items;
  assert.equal(turn.find(i => i.label.startsWith("Use one")).spec, "api:useDiscipline");
  // A mortal with no powers, without Actions, with the Storyteller hiding Talk: nothing that cannot run is offered
  const bare = R.nowItems("scene", {tools: new Set(["wodxPassTime"]), actions: false, power: null, calls: new Set(["sheet"])}).items;
  assert.deepEqual(bare.map(i => i.tool ?? i.call), ["wodxPassTime", "sheet"]);
  assert.equal(R.powerFrom(["action", "api:quickCheck", "api:usegift"]), "api:usegift");
  assert.equal(R.powerFrom(["action", "api:quickCheck"]), null);
  assert.equal(R.STUCK_ROW.length, 3);
  assert.ok(R.ON_BAR.has("wodxNow"));
});
