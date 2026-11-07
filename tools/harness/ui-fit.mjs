/**
 * UI-fit check (rule B17). Renders every WoDX window with Foundry's real stylesheet in Chromium, at common screen
 * sizes, and checks that every control can be reached and that footer buttons are visible without scrolling.
 *
 * Usage: node ui-fit.mjs <path to Foundry's foundry2.css> [outDir for screenshots]
 */
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {writeFileSync, mkdirSync, existsSync} from "node:fs";
import {installMock} from "./foundry-mock.mjs";

const require = createRequire(import.meta.url);
const {chromium} = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const foundryCss = process.argv[2];
const outDir = process.argv[3] ?? null;
if ( !foundryCss || !existsSync(foundryCss) ) {
  console.error("Give the path to Foundry's public/css/foundry2.css");
  process.exit(2);
}

/* ---- Render each window's markup with the stand-in for Foundry ---- */
const mock = installMock({dataRoot: root});
class Field { constructor(options = {}) { this.options = options; } }
foundry.data.fields = {StringField: Field, NumberField: Field, BooleanField: Field};
foundry.data.regionBehaviors = {RegionBehaviorType: class {}};
CONFIG.RegionBehavior = {dataModels: {}, typeLabels: {}, typeHints: {}, typeIcons: {}};
CONFIG.statusEffects = [];
// A world the size of Rothenstein: 211 scenes
class Coll extends Map { find(f) { for ( const v of this.values() ) if ( f(v) ) return v; } [Symbol.iterator]() { return this.values(); } }
game.scenes = new Coll();
for ( let i = 0; i < 211; i++ ) {
  const id = `scene${String(i).padStart(11, "0")}`;
  game.scenes.set(id, {id, name: i % 3 ? `⚔ BATTLEMAP · Locus · A Very Long Scene Name Number ${i}` : `Lower Town · Place ${i}`,
    flags: {}, regions: [], getFlag(s, k) { return this.flags?.[s]?.[k]; }});
}
await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-otherworlds/scripts/main.mjs"));
game.modules.set("wodx-otherworlds", {});
await Hooks.callAll("init");
mock.setupTime();
await Hooks.callAll("ready");
await mock.settle();
// Some approvals waiting, so the queue window has content
const chronicle = game.modules.get("wodx-chronicle").api;
for ( let i = 0; i < 8; i++ ) await chronicle.propose({type: "request", title: `Request ${i}: a long request title to see wrapping`, detail: "Details ".repeat(30)});

const {ClockApp} = await import(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"));
const {ApprovalsApp} = await import(join(root, "modules/wodx-chronicle/scripts/approvals.mjs"));
const {HouseRulesApp} = await import(join(root, "modules/wodx-chronicle/scripts/house-rules-app.mjs"));
const {TaggingApp} = await import(join(root, "modules/wodx-otherworlds/scripts/tagging-app.mjs"));

const windows = [];
for ( const [name, App, opts] of [["Chronicle Clock", ClockApp, {}], ["Approval queue", ApprovalsApp, {}],
  ["House rules", HouseRulesApp, {}], ["Otherworld ratings by scene", TaggingApp, {}]] ) {
  const app = new App(opts);
  await app.render({force: true});
  const content = app.element.querySelector("section.window-content").innerHTML;
  const o = App.DEFAULT_OPTIONS;
  const pos = {...o.position, ...(opts.position ?? {})};
  windows.push({name, tag: o.tag ?? "div", classes: ["application", ...(o.classes ?? [])].join(" "), width: pos.width, height: pos.height, content});
}

/* ---- Dialogs: capture what each WoDX dialog would show ---- */
const captured = [];
const api = foundry.applications.api;
api.DialogV2.prompt = async config => { captured.push(config); return null; };
api.DialogV2.confirm = async config => { captured.push(config); return null; };
const {recordLineOrVeil} = await import(join(root, "modules/wodx-chronicle/scripts/journals.mjs"));
for ( let i = 0; i < 60; i++ ) await recordLineOrVeil({kind: i % 2 ? "veil" : "line", text: `Entry ${i}: ${"a long line of text ".repeat(4)}`, by: null});
const safety = await import(join(root, "modules/wodx-chronicle/scripts/safety.mjs"));
const {setDateDialog} = await import(join(root, "modules/wodx-chronicle/scripts/clock-app.mjs"));
await safety.manageLinesVeils();
await safety.submitLineOrVeil();
await chronicle.approvals.askStoryteller();
await setDateDialog();
await chronicle.runEraTest();
// Step sideways needs a selected Garou on a scene
const scene = [...game.scenes][0];
const actor = {name: "Test Garou", type: "Werewolf", items: [], statuses: new Set(), system: {advantages: {gnosis: {roll: 4}}}, getFlag() {}};
globalThis.canvas = {tokens: {controlled: [{document: {name: "Test Garou", actor, parent: scene, regions: new Set()}}]}, scene};
CONFIG.worldofdarkness.sheettype.changingbreed = "Changing Breed";
const ow = await import(join(root, "modules/wodx-otherworlds/scripts/crossing.mjs"));
await ow.stepSideways({mode: "cross"});
const {buildPenumbraPrototype} = await import(join(root, "modules/wodx-otherworlds/scripts/prototype.mjs"));
await buildPenumbraPrototype(scene);
for ( const c of captured ) {
  windows.push({name: `Dialog · ${c.window?.title ?? "untitled"}`, tag: "div",
    classes: ["application", "dialog", ...(c.classes ?? [])].join(" "), width: 400, height: "auto",
    content: `<form class="dialog-form standard-form">${c.content ? `<div class="dialog-content standard-form">${c.content}</div>` : ""}
      <footer class="form-footer"><button type="submit">OK</button><button type="button">Cancel</button></footer></form>`});
}
if ( captured.length < 7 ) { console.error(`Only ${captured.length} dialogs captured`); process.exit(1); }
const unclassed = captured.filter(c => !(c.classes ?? []).includes("wodx-dialog"));
if ( unclassed.length ) { console.error(`Dialogs without the wodx-dialog class: ${unclassed.map(c => c.window?.title).join(", ")}`); process.exit(1); }

/* ---- Lay them out in Chromium with Foundry's CSS ---- */
const css = [pathToFileURL(foundryCss).href,
  pathToFileURL(join(root, "modules/wodx-chronicle/styles/wodx-chronicle.css")).href,
  pathToFileURL(join(root, "modules/wodx-otherworlds/styles/wodx-otherworlds.css")).href];
const sizes = [[1280, 720], [1366, 768], [1920, 1080]];
const browser = await chromium.launch();
let failures = 0;
if ( outDir ) mkdirSync(outDir, {recursive: true});

for ( const [vw, vh] of sizes ) {
  for ( const w of windows ) {
    const page = await browser.newPage({viewport: {width: vw, height: vh}});
    // The ratings window sizes itself to the screen when opened (TaggingApp.open)
    if ( w.name === "Otherworld ratings by scene" ) {
      w.height = Math.max(360, Math.min(720, vh - 120));
      w.width = Math.max(480, Math.min(900, vw - 40));
    }
    const html = `<!doctype html><html><head><meta charset="utf-8">${css.map(h => `<link rel="stylesheet" href="${h}">`).join("")}</head>
      <body class="vtt game system-worldofdarkness theme-dark">
      <${w.tag} id="app" class="${w.classes}" style="width:${w.width}px;${w.height === "auto" ? "" : `height:${w.height}px;`}left:20px;top:0">
        <header class="window-header"><h1 class="window-title">${w.name}</h1></header>
        <section class="window-content">${w.content}</section>
      </${w.tag}></body></html>`;
    const file = join(outDir ?? "/tmp", `ui-fit-${vw}x${vh}-${w.name.replaceAll(" ", "-")}.html`);
    writeFileSync(file, html);
    await page.goto(pathToFileURL(file).href);
    // Foundry centers the window and clamps it to the screen (ApplicationV2#setPosition)
    await page.evaluate(() => {
      const el = document.getElementById("app");
      const h = el.offsetHeight;
      el.style.top = `${Math.max(0, (window.innerHeight - h) / 2)}px`;
    });
    const result = await page.evaluate(() => {
      const app = document.getElementById("app");
      const problems = [];
      const ar = app.getBoundingClientRect();
      if ( ar.bottom > window.innerHeight + 1 || ar.top < -1 ) problems.push(`window runs off screen (${Math.round(ar.top)} to ${Math.round(ar.bottom)})`);
      if ( ar.right > window.innerWidth + 1 ) problems.push(`window runs off the right edge (${Math.round(ar.right)})`);
      const reachable = el => {
        const r = el.getBoundingClientRect();
        if ( r.width === 0 || r.height === 0 ) return true; // hidden inputs
        const x = r.left + (r.width / 2);
        const y = r.top + (r.height / 2);
        const a = app.getBoundingClientRect();
        if ( x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight ) return false;
        if ( x < a.left || x > a.right || y < a.top || y > a.bottom ) return false;
        const hit = document.elementFromPoint(x, y);
        return !!hit && (hit === el || el.contains(hit) || !!el.closest("label")?.contains(hit));
      };
      // Footer buttons must be visible without scrolling
      for ( const b of app.querySelectorAll(".wodx-footer button, .form-footer button") ) {
        if ( !reachable(b) ) problems.push(`footer button "${b.textContent.trim()}" is not visible`);
      }
      // Every control must be reachable after scrolling to it
      const controls = [...app.querySelectorAll("button, input, select, textarea, summary")];
      let bad = 0;
      // scrollIntoView also scrolls overflow:hidden boxes, which a person cannot do; undo those scrolls
      const unscrollable = [app, ...app.querySelectorAll("*")].filter(e => {
        const s = getComputedStyle(e);
        return !["auto", "scroll"].includes(s.overflowY) || !["auto", "scroll"].includes(s.overflowX);
      });
      for ( const c of controls ) {
        c.scrollIntoView({block: "nearest", inline: "nearest"});
        for ( const e of unscrollable ) {
          const s = getComputedStyle(e);
          if ( !["auto", "scroll"].includes(s.overflowY) ) e.scrollTop = 0;
          if ( !["auto", "scroll"].includes(s.overflowX) ) e.scrollLeft = 0;
        }
        if ( !reachable(c) ) { bad++; if ( bad <= 3 ) problems.push(`control cannot be reached: ${c.outerHTML.slice(0, 80)}`); }
      }
      if ( bad > 3 ) problems.push(`... and ${bad - 3} more controls cannot be reached`);
      return {problems, controls: controls.length, height: Math.round(ar.height)};
    });
    const label = `${vw}x${vh} ${w.name}`;
    if ( result.problems.length ) {
      failures++;
      console.log(`FAIL ${label}: ${result.problems.join("; ")}`);
    } else {
      console.log(`ok   ${label}: ${result.controls} controls reachable, window ${result.height}px`);
    }
    if ( outDir ) {
      await page.evaluate(() => document.querySelectorAll(".wodx-scroll").forEach(s => s.scrollTop = 0));
      await page.screenshot({path: join(outDir, `ui-fit-${vw}x${vh}-${w.name.replaceAll(" ", "-")}.png`)});
    }
    await page.close();
  }
}
await browser.close();
console.log(failures ? `== UI fit: ${failures} window(s) FAILED` : "== UI fit: every window passed");
process.exit(failures ? 1 : 0);
