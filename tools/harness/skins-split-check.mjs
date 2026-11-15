/**
 * Proves the split line skins (B6060 to B6062) look exactly like the single stylesheet they replaced. Draws a slice of
 * a sheet for every line, light and dark, twice in Chromium: once with the whole stylesheet as it was, once with only
 * styles/wodx-skins.css plus the loader (scripts/skins.mjs) fetching each line's file as its sheet is dressed, in the
 * reverse order so the cascade order is put to the test. Then compares the pictures pixel for pixel, the computed
 * styles of every sheet, which files loaded, and that no sheet is left waiting. Also checks the system's own look
 * (Sheet look switched off) loads no line file at all.
 * Usage: node tools/harness/skins-split-check.mjs [out dir]      exit 1 on any difference
 */
import "./win-paths.mjs";
import {createRequire} from "node:module";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join, normalize, extname} from "node:path";
import {tmpdir} from "node:os";
import {createServer} from "node:http";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";

const require = createRequire(import.meta.url);
const {chromium} = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = process.argv[2] ?? join(tmpdir(), "wodx-skins-split");
mkdirSync(out, {recursive: true});
const {LINES} = await import(pathToFileURL(join(root, "tools/skins/skins-data.mjs")).href);
const {buildCss} = await import(pathToFileURL(join(root, "tools/skins/build-skins.mjs")).href);

// The whole stylesheet as it was, served beside the core sheet so its font paths resolve the same way
const WHOLE = "/modules/wodx-sheets/styles/__whole-skins.css";
const TYPES = {".css": "text/css", ".mjs": "text/javascript", ".js": "text/javascript", ".woff2": "font/woff2", ".html": "text/html", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp"};
const pages = {};
const server = createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (url === WHOLE) { res.writeHead(200, {"content-type": "text/css"}); return res.end(buildCss()); }
  if (pages[url]) { res.writeHead(200, {"content-type": "text/html"}); return res.end(pages[url]); }
  const map = url.startsWith("/systems/worldofdarkness/") ? url.replace("/systems/", "/system/") : url;
  const file = normalize(join(root, map));
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {"content-type": TYPES[extname(file)] ?? "application/octet-stream"});
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const CLASSES = {vampire: "vampire", ghoul: "mortal ghoul", mortal: "mortal", werewolf: "werewolf", mage: "mage", changeling: "changeling",
  wraith: "wraith", hunter: "hunter", inquisitor: "hunter wodx-inqDA", demon: "demon", mummy: "mummy", kote: "vampire wodx-kote",
  orpheus: "mortal wodx-orpheus", creature: "creature"};
// Sheets that wear another line's form class too, as a ghoul of the twentieth century does
const EXTRA = [["ghoul20", "mortal", "wodx-ghoul20"], ["ghoulDA", "mortal", "wodx-ghoulDA"]];
const sysCss = ["wod.css", "werewolf.css", "vampire.css", "mage.css", "changeling.css", "hunter.css", "demon.css", "wraith.css", "mummy.css", "exalted.css", "mortal.css", "creature.css", "darkmode.css"]
  .map(f => `/systems/worldofdarkness/css/${f}`).concat("/modules/wodx-chronicle/styles/wodx-theme.css");
const dots = n => Array.from({length: 5}, (_, i) => `<span class="dot${i < n ? " on" : ""}"></span>`).join("");
const sheet = (key, win, form, label, dark) => `<div class="application wod20 wod-sheet ${win}${dark ? " wod-theme-dark" : ""}" data-key="${key}">
  <header class="window-header"><h1 class="window-title">${label}</h1></header>
  <section class="window-content"><form class="${form}">
    <div class="sheet-headline sheet-banner splatFont centerText"><span class="sheet-banner-text">Attributes</span></div>
    <div class="cols"><div><b class="splatFont sub">Physical</b><p>Strength ${dots(2)}</p><p>Dexterity ${dots(3)}</p></div>
      <div><b class="splatFont sub">Social</b><p>Charisma ${dots(2)}</p><p>Manipulation ${dots(4)}</p></div></div>
    <div class="cols"><div class="col"><div class="sheet-headline headlineGroup sheet-banner-small splatFont centerText"><span class="sheet-banner-text">Willpower</span></div></div><div class="col"><div class="sheet-headline headlineGroup sheet-banner-small splatFont centerText"><span class="sheet-banner-text">Health</span></div></div></div>
    <p class="note">Notes in the sheet's body text, as the system sets it.</p>
  </form></section></div>`;
const sheets = dark => [
  ...LINES.map(L => { const c = CLASSES[L.id].split(" "); return sheet(L.id, c.filter(x => !x.startsWith("wodx-")).join(" "), c.filter(x => x.startsWith("wodx-")).join(" "), L.label, dark); }),
  ...EXTRA.map(([k, w, f]) => sheet(k, w, f, k, dark))
].join("");
const STYLE = `<style>body{margin:0;padding:12px;background:#777;display:grid;grid-template-columns:repeat(2,900px);gap:12px;align-items:start;font-family:serif}
.application{width:900px!important;height:auto!important;min-height:0!important;max-height:none!important;box-shadow:0 2px 8px #0008;border-radius:4px;overflow:hidden}
.window-header{background:#222;color:#eee;padding:4px 8px}.window-header h1{font-size:13px;margin:0;font-family:sans-serif}
.window-content{padding:6px 10px;min-height:250px}.cols{display:flex;gap:16px}.cols p{margin:2px 0;font-size:14px}
.sub{font-size:18px;font-weight:normal}.dot{display:inline-block;width:9px;height:9px;border-radius:50%;border:1px solid currentColor;margin-left:2px}.dot.on{background:currentColor}
.sheet-banner{height:34px;line-height:34px;font-size:24px}.sheet-banner-small{height:30px;line-height:30px;font-size:20px}.note{font-size:13px}.col{width:260px}</style>`;
// Both pages carry the layout sheet after the skins, as module.json orders them, so a cascade slip would show
// Two ways a page may bring the stylesheets in: <link>s, or @imports into cascade layers (B6063)
const head = (skins, how) => {
  const mods = [skins, "/modules/wodx-sheets/styles/wodx-layout.css"];
  if (how === "links") return `<!doctype html><html><head><meta charset="utf-8">${[...sysCss, ...mods].map(h => `<link rel="stylesheet" href="${h}">`).join("")}${STYLE}</head>`;
  const sys = sysCss.slice(0, -1), chron = sysCss.at(-1);
  return `<!doctype html><html><head><meta charset="utf-8"><style>@layer system, modules;
${sys.map(h => `@import url("${h}") layer(system);`).join("\n")}
${[chron, ...mods].map(h => `@import url("${h}") layer(modules);`).join("\n")}</style>${STYLE}</head>`;
};
const page = (split, dark, on, how) => `${head(split ? "/modules/wodx-sheets/styles/wodx-skins.css" : WHOLE, how)}<body class="${on ? "wodx-skin" : ""}">${sheets(dark)}
${split ? `<script type="module">
import * as SK from "/modules/wodx-sheets/scripts/skins.mjs";
window.__split = (async () => { for (const w of [...document.querySelectorAll(".wod-sheet")].reverse()) await SK.dress(w); return SK.loaded(); })();
</script>` : `<script>window.__split = Promise.resolve([]);</script>`}</body></html>`;

const PROPS = ["color", "background-image", "background-color", "background-size", "font-family", "padding", "border-radius", "position", "visibility"];
const styles = PROPS => [...document.querySelectorAll(".application")].map(a => {
  const pick = el => el ? Object.fromEntries(PROPS.map(p => [p, getComputedStyle(el).getPropertyValue(p)])) : null;
  const vars = Object.fromEntries(["--sheet-background-color", "--wx-skin-base", "--wx-skin-ink", "--wx-skin-accent"].map(v => [v, getComputedStyle(a).getPropertyValue(v).trim()]));
  return {key: a.dataset.key, vars, win: pick(a), content: pick(a.querySelector(".window-content")), banner: pick(a.querySelector(".sheet-banner")),
    small: pick(a.querySelector(".sheet-banner-small")), text: pick(a.querySelector(".sheet-banner-text")), sub: pick(a.querySelector(".sub")), waiting: a.classList.contains("wodx-wait-skin")};
});

const browser = await chromium.launch();
const ctx = await browser.newContext({deviceScaleFactor: 1, viewport: {width: 1850, height: 1000}});
const faults = [], report = [];
for ( const how of ["links", "layers"] ) for ( const on of [true, false] ) for ( const dark of [false, true] ) {
  const tag = `${how}-${on ? "wodx" : "system"}-${dark ? "dark" : "light"}`;
  const got = {};
  for ( const split of [false, true] ) {
    const path = `/__${tag}-${split ? "split" : "whole"}.html`;
    pages[path] = page(split, dark, on, how);
    const p = await ctx.newPage();
    const fetched = [];
    p.on("request", r => { const m = /styles\/skins\/([a-z]+)\.css/.exec(r.url()); if (m) fetched.push(m[1]); });
    await p.goto(base + path);
    const loaded = await p.evaluate(() => window.__split);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const png = await p.screenshot({path: join(out, `${tag}-${split ? "split" : "whole"}.png`), fullPage: true});
    got[split ? "split" : "whole"] = {png, css: await p.evaluate(styles, PROPS), loaded, fetched,
      order: await p.evaluate(() => {
        // Every stylesheet in cascade order, by file name (a line file by its line)
        const name = h => { const m = /styles\/skins\/([a-z]+)\.css/.exec(h ?? ""); return m ? m[1] : (h ?? "").split("/").pop(); };
        const out = [];
        const walk = sh => { if (sh.href) out.push(name(sh.href)); let r = []; try { r = [...sh.cssRules]; } catch {} for (const x of r) if (x instanceof CSSImportRule && x.styleSheet) walk(x.styleSheet); };
        for (const sh of document.styleSheets) walk(sh);
        return out;
      }), report: await p.evaluate(async () => { try { return (await import("/modules/wodx-sheets/scripts/skins.mjs")).report(); } catch { return null; } })};
    await p.close();
  }
  const {whole, split} = got;
  const same = whole.png.equals(split.png);
  const diffs = whole.css.flatMap((w, i) => JSON.stringify(w) === JSON.stringify(split.css[i]) ? [] : [w.key]);
  const wantLoaded = on ? LINES.map(L => L.id) : [];
  const loadedOk = JSON.stringify([...split.loaded].sort()) === JSON.stringify([...wantLoaded].sort());
  const once = new Set(split.fetched).size === split.fetched.length;
  const skinOrder = split.order.filter(x => LINES.some(L => L.id === x));
  const orderOk = JSON.stringify(skinOrder) === JSON.stringify(LINES.map(L => L.id).filter(id => skinOrder.includes(id)));
  const coreAt = split.order.indexOf("wodx-skins.css"), layoutAt = split.order.indexOf("wodx-layout.css");
  const placeOk = split.order.slice(coreAt + 1, layoutAt).length === skinOrder.length;
  const waiting = split.css.filter(c => c.waiting).map(c => c.key);
  report.push({tag, how: split.report?.how, layer: split.report?.layer, pixelsSame: same, styleDiffs: diffs, loaded: split.loaded, fetched: split.fetched, linkOrder: split.order, waiting});
  if (!same) faults.push(`${tag}: the pictures differ`);
  if (diffs.length) faults.push(`${tag}: computed styles differ on ${diffs.join(", ")}`);
  if (!loadedOk) faults.push(`${tag}: loaded ${split.loaded.join(",")} but wanted ${wantLoaded.join(",")}`);
  if (!once) faults.push(`${tag}: a line file was fetched twice (${split.fetched.join(",")})`);
  if (!orderOk || !placeOk) faults.push(`${tag}: line files out of order (${split.order.join(" ")})`);
  if (waiting.length) faults.push(`${tag}: sheets left waiting: ${waiting.join(",")}`);
}
await browser.close();
server.close();
writeFileSync(join(out, "skins-split-report.json"), JSON.stringify(report, null, 1));
for ( const r of report ) console.log(`${r.tag} (${r.how ?? "-"}${r.layer ? ` ${r.layer}` : ""}): pixels ${r.pixelsSame ? "same" : "DIFFER"}, style diffs ${r.styleDiffs.length}, loaded ${r.loaded.length}, waiting ${r.waiting.length}`);
console.log(faults.length ? `FAIL\n${faults.join("\n")}` : `PASS: the split skins draw exactly as the single stylesheet did (pictures in ${out})`);
process.exit(faults.length ? 1 : 0);
