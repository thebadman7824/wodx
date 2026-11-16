// Final systems audit, worker 1 (B6720-B6729): the fork's own fixes, each tested on the code path it changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SYS = "../../system/worldofdarkness/";
const src = p => readFileSync(new URL(SYS + p, import.meta.url), "utf8");
globalThis.CONFIG ??= { worldofdarkness: { lowestDifficulty: 2 } };
const { applyWodxRollMods, WODX_ORIGINS } = await import(SYS + "module/scripts/wodx-roll-mods.js");
const RR = await import("../../modules/wodx-sheets/scripts/sheet-roll-rules.mjs");

// WoDX Sheets' modsFor, built from its pure rules: a Grieving mourner (socialDice -1) and a tired one (traits -1 die)
const grieving = [{ id: "grieving", name: "Grieving", mods: { socialDice: -1 } }];
const modsFor = (conditions, traits = null) => (actor, roll) => {
  const tags = [roll.attributeKey, roll.abilityKey].filter(Boolean);
  const social = ["charisma", "manipulation", "appearance", "intimidation", "persuasion"].some(t => tags.includes(t)) ? ["social"] : [];
  return { ...RR.combine({ traits, conditions, social: RR.isSocial([...tags, ...social]) }), once: [] };
};
const container = (o = {}) => ({ actor: { id: "a" }, origin: "power", attribute: "manipulation", ability: "intimidation", numDices: 5, targetlist: [],
  difficulty: 6, dicetext: [], extraInfo: [], ...o });

test("B6720: a Discipline rolled from the system's power window loses Grieving's die on a social pool", () => {
  const r = container();
  const m = applyWodxRollMods(r, { modsFor: modsFor(grieving) });
  assert.equal(r.numDices, 4);
  assert.equal(r.difficulty, 6);
  assert.equal(m.dice, -1);
  assert.match(r.extraInfo.join(" "), /WoDX: Grieving/);
});

test("B6720: a physical attack keeps its pool under Grieving, and tiredness takes a die off it", () => {
  const r = container({ origin: "attack", attribute: "dexterity", ability: "melee" });
  applyWodxRollMods(r, { modsFor: modsFor(grieving) });
  assert.equal(r.numDices, 5);
  const t = container({ origin: "attack", attribute: "dexterity", ability: "melee", targetlist: [{ numDices: 5 }, { numDices: 3 }] });
  applyWodxRollMods(t, { modsFor: modsFor([], { dice: -1, diff: 0, parts: ["Tired (no sleep): 1 die off"] }) });
  assert.equal(t.numDices, 4);
  assert.deepEqual(t.targetlist.map(x => x.numDices), [4, 2]);
  assert.match(t.extraInfo.join(" "), /Tired/);
});

test("B6720: never twice, never on the general window, soak or damage, and off with the setting", () => {
  const r = container();
  applyWodxRollMods(r, { modsFor: modsFor(grieving) });
  applyWodxRollMods(r, { modsFor: modsFor(grieving) });
  assert.equal(r.numDices, 4);
  for (const origin of ["general", "soak", "damage", "initiative"]) {
    const x = container({ origin });
    assert.equal(applyWodxRollMods(x, { modsFor: modsFor(grieving) }), null);
    assert.equal(x.numDices, 5);
  }
  const off = container();
  applyWodxRollMods(off, { modsFor: modsFor(grieving), on: false });
  assert.equal(off.numDices, 5);
  assert.deepEqual(WODX_ORIGINS, ["power", "attack", "magic", "item"]);
});

test("B6720: difficulty is held at 10 and the dice never go below none", () => {
  const r = container({ difficulty: 9, numDices: 1 });
  applyWodxRollMods(r, { modsFor: () => ({ dice: -3, diff: 3, parts: ["Blinded +3 diff"] }) });
  assert.equal(r.difficulty, 10);
  assert.equal(r.numDices, 0);
  assert.match(r.extraInfo.join(" "), /held at 10/);
});

test("B6720: the system's DiceRoller applies them before it reads the pool", () => {
  const s = src("module/scripts/roll-dice.js");
  const body = s.slice(s.indexOf("export async function DiceRoller"));
  assert.ok(body.indexOf("applyWodxRollMods(diceRoll") > 0);
  assert.ok(body.indexOf("applyWodxRollMods(diceRoll") < body.indexOf("let difficulty = diceRoll.difficulty"));
});

/** Pull one exported arrow/function body out of a system file and build it with the given globals (no Foundry). */
function fnFrom(file, start, globals = {}) {
  const s = src(file);
  const i = s.indexOf(start);
  assert.ok(i >= 0, `${start} in ${file}`);
  let j = s.indexOf("{", i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === "{") depth++; else if (s[k] === "}" && !--depth) break; }
  const head = s.slice(i, j).replace(/^export const \w+ = /, "").replace(/^Hooks\.on\('createItem', /, "");
  const body = head + s.slice(j, k + 1);
  return new Function(...Object.keys(globals), `return (${body});`)(...Object.values(globals));
}

test("B6721: the trash on a removable bio field removes it; a fixed field stays", async () => {
  const OnActorDelete = fnFrom("module/scripts/action-helpers.js", "export const OnActorDelete = async function");
  const calls = [];
  const sheet = { actor: { system: { bio: { splatfields: { clan: { isremovable: true }, nature: { isremovable: false } } } }, update: async u => calls.push(u) }, render() { calls.push("render"); } };
  const target = v => ({ getAttribute: () => v });
  await OnActorDelete.call(sheet, { preventDefault() {} }, target("system.bio.splatfields.clan"));
  await OnActorDelete.call(sheet, { preventDefault() {} }, target("system.bio.splatfields.nature"));
  await OnActorDelete.call(sheet, { preventDefault() {} }, target("system.bio.appearance"));
  assert.deepEqual(calls, [{ "system.bio.splatfields.-=clan": null }, "render"]);
  assert.match(src("module/actor/template/pc-actor-sheet.js"), /actorDelete: OnActorDelete/);
});

test("B6721: an item given from another sheet tells the receiving owner, without a TypeError", async () => {
  const shown = [];
  const mk = (user) => fnFrom("module/hooks.js", "Hooks.on('createItem', async (item, options, userId) =>", {
    game: { user, i18n: { localize: () => "You got {1} from {2}." } }, ui: { notifications: { info: t => shown.push(t) } } });
  const item = owner => ({ name: "Knife", parent: { isOwner: owner, hasPlayerOwner: true }, flags: { copyFile: { receivedPlayer: "giver", receivedName: "Anna" } } });
  await mk({ id: "taker", isGM: false })(item(true));
  await mk({ id: "giver", isGM: false })(item(true));
  await mk({ id: "other", isGM: false })(item(false));
  assert.deepEqual(shown, ["You got Knife from Anna."]);
});

test("B6722: a rule changed in the settings menus counts without a reload; the exploding dice default is a real choice", () => {
  const s = src("wod.js");
  assert.match(s, /Hooks\.on\("updateSetting", reread\)/);
  const body = s.slice(s.indexOf("function readSettingsIntoConfig() {"));
  const values = { theRollofOne: "1", explodingDice: "never", lowestDifficulty: "2" };
  const game = { settings: { get: (_m, k) => values[k] ?? false } };
  const CONFIG = { worldofdarkness: {} };
  const read = new Function("game", "CONFIG", `${body}; return readSettingsIntoConfig;`)(game, CONFIG);
  read();
  assert.equal(CONFIG.worldofdarkness.usehandleOnes, true);
  assert.equal(CONFIG.worldofdarkness.useexplodingDice, false);
  values.theRollofOne = "0"; values.explodingDice = "always";
  read();
  assert.equal(CONFIG.worldofdarkness.usehandleOnes, false);
  assert.equal(CONFIG.worldofdarkness.useexplodingDice, true);
  values.explodingDice = false; // an old world's stored default
  read();
  assert.equal(CONFIG.worldofdarkness.useexplodingDice, false);
  assert.match(src("module/settings.js"), /default: "never",/);
});
