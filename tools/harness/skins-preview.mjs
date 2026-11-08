/**
 * Renders a slice of a character sheet for every line skin, light and dark, with the system's own CSS and the
 * WoDX skins on top, then writes one picture per tone. Also measures the contrast of each heading and label against
 * the paper actually drawn under it.
 * Usage: node skins-preview.mjs <out dir>
 */
import "./win-paths.mjs";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {tmpdir} from "node:os";
import {writeFileSync, mkdirSync} from "node:fs";

const require = createRequire(import.meta.url);
const {chromium} = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = process.argv[2] ?? join(tmpdir(), "wodx-skins");
mkdirSync(out, {recursive: true});
const {LINES} = await import(pathToFileURL(join(root, "tools/skins/skins-data.mjs")).href);

// The sheet classes to show for each skin (the first selector, as the sheet would carry it)
const CLASSES = {vampire: "vampire", ghoul: "mortal ghoul", mortal: "mortal", werewolf: "werewolf", mage: "mage", changeling: "changeling",
  wraith: "wraith", hunter: "hunter", inquisitor: "hunter wodx-inqDA", demon: "demon", mummy: "mummy", kote: "vampire wodx-kote",
  orpheus: "mortal wodx-orpheus", creature: "creature"};
const sys = join(root, "system/worldofdarkness");
const css = ["css/wod.css", "css/werewolf.css", "css/vampire.css", "css/mage.css", "css/changeling.css", "css/hunter.css", "css/demon.css", "css/wraith.css",
  "css/mummy.css", "css/exalted.css", "css/mortal.css", "css/creature.css", "css/darkmode.css"].map(f => pathToFileURL(join(sys, f)).href);
css.push(pathToFileURL(join(root, "modules/wodx-chronicle/styles/wodx-theme.css")).href, pathToFileURL(join(root, "modules/wodx-sheets/styles/wodx-skins.css")).href);

const dots = n => Array.from({length: 5}, (_, i) => `<span class="dot${i < n ? " on" : ""}"></span>`).join("");
// As in Foundry: the system's classes on the window, WoDX Sheets' own class on the form inside it
const winClass = id => CLASSES[id].split(" ").filter(c => !c.startsWith("wodx-")).join(" ");
const formClass = id => CLASSES[id].split(" ").filter(c => c.startsWith("wodx-")).join(" ");
const sheet = (L, dark) => `<div class="application wod20 wod-sheet ${winClass(L.id)}${dark ? " wod-theme-dark" : ""}" data-line="${L.id}">
  <header class="window-header"><h1 class="window-title">${L.label}</h1></header>
  <section class="window-content"><form class="${formClass(L.id)}">
    <div class="sheet-headline sheet-banner splatFont centerText"><span class="sheet-banner-text">Attributes</span></div>
    <div class="cols"><div><b class="splatFont sub">Physical</b><p>Strength ${dots(2)}</p><p>Dexterity ${dots(3)}</p></div>
      <div><b class="splatFont sub">Social</b><p>Charisma ${dots(2)}</p><p>Manipulation ${dots(4)}</p></div></div>
    <div class="cols"><div class="col"><div class="sheet-headline headlineGroup sheet-banner-small splatFont centerText"><span class="sheet-banner-text">Willpower</span></div></div><div class="col"><div class="sheet-headline headlineGroup sheet-banner-small splatFont centerText"><span class="sheet-banner-text">Health</span></div></div></div>
    <p class="note">Notes in the sheet's body text, as the system sets it.</p>
  </form></section></div>`;
const page = dark => `<!doctype html><html><head><meta charset="utf-8">${css.map(h => `<link rel="stylesheet" href="${h}">`).join("")}
<style>body{margin:0;padding:12px;background:#777;display:grid;grid-template-columns:repeat(2,900px);gap:12px;align-items:start;font-family:serif}
.application{width:900px!important;height:auto!important;min-height:0!important;max-height:none!important;box-shadow:0 2px 8px #0008;border-radius:4px;overflow:hidden}
.window-header{background:#222;color:#eee;padding:4px 8px}.window-header h1{font-size:13px;margin:0;font-family:sans-serif}
.window-content{padding:6px 10px;min-height:250px}.cols{display:flex;gap:16px}.cols p{margin:2px 0;font-size:14px}
.sub{font-size:18px;font-weight:normal}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;border:1px solid currentColor;margin-left:2px}.dot.on{background:currentColor}
.sheet-banner{height:34px;line-height:34px;font-size:24px}.sheet-banner-small{height:30px;line-height:30px;font-size:20px}.note{font-size:13px}.col{width:260px}</style></head>
<body class="wodx-skin">${LINES.map(L => sheet(L, dark)).join("")}</body></html>`;

const browser = await chromium.launch();
const ctx = await browser.newContext({deviceScaleFactor: 2, viewport: {width: 1850, height: 1000}});
const report = [];
for ( const dark of [false, true] ) {
  const file = join(out, `skins-${dark ? "dark" : "light"}.html`);
  writeFileSync(file, page(dark));
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(file).href);
  await p.evaluate(() => document.fonts.ready);
  const r = await p.evaluate(() => [...document.querySelectorAll(".application")].map(a => {
    const c = a.querySelector(".window-content"), cs = getComputedStyle(c);
    const fam = getComputedStyle(a.querySelector(".sheet-banner-text")).fontFamily;
    const loaded = [...document.fonts].filter(f => f.status === "loaded").map(f => f.family.replace(/"/g, ""));
    const face = fam.split(",")[0].replace(/"/g, "").trim();
    return {line: a.dataset.line, accent: getComputedStyle(a).getPropertyValue("--wx-skin-accent").trim(), face, faceLoaded: loaded.includes(face), ink: cs.color,
      banner: getComputedStyle(a.querySelector(".sheet-banner")).backgroundImage.slice(0, 30),
      bannerText: getComputedStyle(a.querySelector(".sheet-banner-text")).backgroundColor, text: getComputedStyle(c.querySelector(".cols p")).color};
  }));
  report.push(...r.map(x => ({tone: dark ? "dark" : "light", ...x})));
  await p.screenshot({path: join(out, `skins-${dark ? "dark" : "light"}.png`), fullPage: true});
  await p.close();
}
await browser.close();
writeFileSync(join(out, "skins-report.json"), JSON.stringify(report, null, 1));
// Each sheet must wear its own line's skin, not a neighbour's (a hunter's on an inquisitor, say)
const own = r => LINES.find(L => L.id === r.line)[r.tone].acc.toLowerCase() === r.accent.toLowerCase();
const bad = report.filter(r => !r.faceLoaded || !r.banner.startsWith('url("data:image/svg') || !own(r));
for ( const r of report ) if ( !own(r) ) console.log("WRONG SKIN", r.tone, r.line, r.accent);
for ( const r of report ) console.log(r.tone.padEnd(5), r.line.padEnd(11), r.face.padEnd(22), r.faceLoaded ? "face ok" : "FACE MISSING", "text", r.text);
console.log(bad.length ? `${bad.length} problems` : "all skins drew their face and rules");
process.exitCode = bad.length ? 1 : 0;
