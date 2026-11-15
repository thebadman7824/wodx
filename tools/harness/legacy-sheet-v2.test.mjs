import "./win-paths.mjs";
// The line sheets on ApplicationV2 (B6110 to B6114): every line has its sheet on both engines with the same name, the
// ApplicationV2 one is built on LegacyActorSheetV2, each reads its own template, and the lines on ApplicationV2 are
// the ones listed in LINES_V2.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const SYS = "../../system/worldofdarkness/";
const read = p => fs.readFileSync(new URL(p, import.meta.url), "utf8");

// Just enough of Foundry for the sheet classes to load
class V1ActorSheet { static get defaultOptions() { return { classes: ["sheet", "actor"], width: 800, height: 720 }; } }
class ActorSheetV2 { static DEFAULT_OPTIONS = {}; }
const merge = (a, b) => ({ ...a, ...b });
globalThis.foundry ??= {};
foundry.applications ??= {};
foundry.applications.api = { ...(foundry.applications.api ?? {}), HandlebarsApplicationMixin: B => class HandlebarsApplication extends B { static PARTS = {}; } };
foundry.applications.api.ApplicationV2 ??= class ApplicationV2 {};
foundry.applications.api.DialogV2 ??= class DialogV2 {};
foundry.applications.sheets = { ...(foundry.applications.sheets ?? {}), ActorSheetV2 };
foundry.appv1 = { sheets: { ActorSheet: V1ActorSheet } };
foundry.utils = { ...(foundry.utils ?? {}), mergeObject: foundry.utils?.mergeObject ?? merge };
globalThis.CONST ??= { DOCUMENT_OWNERSHIP_LEVELS: { NONE: 0, LIMITED: 1, OBSERVER: 2, OWNER: 3 } };
globalThis.game ??= { i18n: { localize: s => s }, settings: { get: () => null }, user: {} };
globalThis.CONFIG ??= { worldofdarkness: {} };
globalThis.FormApplication ??= class FormApplication {};
globalThis.Dialog ??= class Dialog {};
globalThis.Application ??= class Application {};

const T = SYS + "module/actor/template/";
const LINES = { mortal: "Mortal", vampire: "Vampire", werewolf: "Werewolf", mage: "Mage", changeling: "Changeling", hunter: "Hunter",
  demon: "Demon", wraith: "Wraith", mummy: "Mummy", exalted: "Exalted", changingbreed: "ChangingBreed", creature: "Creature" };

test("the bridge turns the template's <form> root into a <div> and splits the old class strings", async () => {
  const { formToDiv, legacyClasses } = await import(new URL(T + "legacy-sheet-v2.js", import.meta.url));
  assert.deepEqual(legacyClasses(["sheet", "actor"], ["wod20 wod-sheet mummy", "wodx-sheet", "sheet"]), ["sheet", "actor", "wod20", "wod-sheet", "mummy", "wodx-sheet"]);
  // A small stand-in for the DOM
  const mk = tag => ({ tagName: tag, attributes: [], children: [], classList: { list: [], add(c) { this.list.push(c); } }, dataset: {},
    setAttribute(n, v) { this.attributes.push({ name: n, value: v }); }, get firstChild() { return this.children[0] ?? null; },
    appendChild(c) { this.owner?.children.splice(this.owner.children.indexOf(c), 1); this.children.push(c); } });
  const form = mk("FORM"); form.attributes = [{ name: "class", value: "editable flexcol locked" }, { name: "autocomplete", value: "off" }];
  const kid = { name: "kid" }; form.children = [kid];
  const doc = { createElement: tag => { const d = mk(tag.toUpperCase()); d.appendChild = function (c) { form.children.splice(form.children.indexOf(c), 1); this.children.push(c); }; return d; } };
  const div = formToDiv(form, doc);
  assert.equal(div.tagName, "DIV");
  assert.deepEqual(div.attributes.map(a => a.name), ["class", "autocomplete"]);
  assert.deepEqual(div.children, [kid]);
  assert.ok(div.classList.list.includes("wod-legacy-form"));
  const plain = mk("DIV"); assert.equal(formToDiv(plain, doc), plain);
});

test("every line has its sheet on both engines, with the same name and its own template", async () => {
  const LegacyActorSheetV2 = (await import(new URL(T + "legacy-sheet-v2.js", import.meta.url))).default;
  for (const [file, Name] of Object.entries(LINES)) {
    const mod = await import(new URL(`${T}${file}-actor-sheet.js`, import.meta.url));
    const v1 = mod.default, v2 = mod[`${Name}ActorSheetV2`];
    assert.ok(v1 && v2, file);
    assert.equal(v1.name, `${Name}ActorSheet`, file);
    assert.equal(v2.name, `${Name}ActorSheet`, `${file}: the sheet id stays WoD.${Name}ActorSheet`);
    assert.ok(v1.prototype instanceof V1ActorSheet, `${file} V1 on the old engine`);
    assert.ok(v2.prototype instanceof LegacyActorSheetV2, `${file} V2 on the bridge`);
    assert.ok(!(v2.prototype instanceof V1ActorSheet), file);
    const tpl = `systems/worldofdarkness/templates/actor/${file}-sheet.html`;
    assert.equal(v2.PARTS.sheet.template, tpl, `${file} draws its own template`);
    assert.ok(fs.existsSync(new URL(`${SYS}templates/actor/${file}-sheet.html`, import.meta.url)), tpl);
    // The old engine's classes reach the new window
    assert.ok(v2.defaultOptions.classes.join(" ").split(/\s+/).includes("wod20"), file);
    assert.ok(v2.defaultOptions.tabs.length >= 1, `${file} keeps its tabs`);
  }
});

test("the lines on ApplicationV2 are known actor types, and the system and WoDX Sheets follow the same list", async () => {
  const { LINES_V2 } = await import(new URL(T + "lines-v2.js", import.meta.url));
  const known = new Set(["Mortal", "Vampire", "Werewolf", "Mage", "Changeling", "Hunter", "Demon", "Wraith", "Mummy", "Exalted", "Changing Breed", "Creature"]);
  for (const t of LINES_V2) assert.ok(known.has(t), t);
  const wod = read(SYS + "wod.js");
  for (const [, Name] of Object.entries(LINES)) assert.match(wod, new RegExp(`lineSheet\\("[A-Za-z ]+", actorSheets\\.${Name}ActorSheet, actorSheets\\.${Name}ActorSheetV2\\)`), Name);
  const main = read("../../modules/wodx-sheets/scripts/main.mjs");
  assert.match(main, /import \{ onV2 \} from "\.\.\/\.\.\/\.\.\/systems\/worldofdarkness\/module\/actor\/template\/lines-v2\.js";/);
  for (const L of ["Changeling", "Mage", "Hunter", "Werewolf", "Vampire", "Mortal", "Wraith", "Demon", "Mummy"])
    assert.match(main, new RegExp(`Wodx${L}Sheet = pick\\("${L}", ${L}ActorSheet, ${L}ActorSheetV2\\)`), L);
});

test("hooks written for the old sheets also reach the moved ones", () => {
  const hooks = read(SYS + "module/hooks.js");
  assert.match(hooks, /Hooks\.on\("renderLegacyActorSheetV2", onRenderLineSheet\)/);
  assert.match(hooks, /if \(sheet\.isLegacyBridge\) return;/);
  const main = read("../../modules/wodx-sheets/scripts/main.mjs");
  assert.match(main, /Hooks\.on\("renderLegacyActorSheetV2", genderField\)/);
  assert.match(main, /Hooks\.on\("renderLegacyActorSheetV2", sheetToolsButtonV2\)/);
  assert.match(read("../../modules/wodx-sheets/scripts/extras.mjs"), /getHeaderControlsActorSheetV2/);
  assert.match(read("../../modules/wodx-chronicle/scripts/player-guide.mjs"), /renderLegacyActorSheetV2/);
});

test("the line sheets call no old-engine method the bridge does not give", () => {
  const bridge = read(T + "legacy-sheet-v2.js");
  const V1_ONLY = ["_render", "_onSubmit", "_getSubmitData", "_updateObject", "_getHeaderButtons", "bringToTop", "_onChangeInput", "activateEditor", "_activateEditor", "saveEditor", "_createEditor", "getData", "_renderInner", "activateTab", "_onChangeTab"];
  for (const file of Object.keys(LINES)) {
    const src = read(`${T}${file}-actor-sheet.js`);
    for (const m of V1_ONLY) if (new RegExp(`this\\.${m}\\(|super\\.${m}\\(`).test(src))
      assert.match(bridge, new RegExp(`\\n\\t(async )?${m}\\(`), `${file} calls ${m}, which the bridge must give`);
  }
});
