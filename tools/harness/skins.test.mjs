/**
 * The line skins (B91 to B95): the data in tools/skins, the generated stylesheet, the bundled fonts and their
 * licences, and the contrast of every skin's text, rules and accents against its paper, light and dark.
 */
import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";
import {existsSync, readFileSync, readdirSync} from "node:fs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const S = await import(pathToFileURL(join(root, "tools/skins/skins-data.mjs")).href);
const B = await import(pathToFileURL(join(root, "tools/skins/build-skins.mjs")).href);
const sheets = join(root, "modules/wodx-sheets");

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = h => { const [r, g, b] = hex(h).map(c => c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("every line has a light and a dark skin, a known rule, and a title face that is bundled or comes from Chronicle", () => {
  const ids = S.LINES.map(l => l.id);
  assert.equal(new Set(ids).size, ids.length, "line ids are unique");
  const chronicle = readFileSync(join(root, "modules/wodx-chronicle/styles/wodx-theme.css"), "utf8");
  for ( const L of S.LINES ) {
    assert.ok(S.DRAW[L.rule], `${L.id}: rule ${L.rule}`);
    assert.ok(L.sel.length, `${L.id}: selectors`);
    for ( const tone of ["light", "dark"] ) for ( const k of ["base", "ink", "rule", "acc"] ) assert.match(L[tone][k], /^#[0-9a-f]{6}$/i, `${L.id} ${tone} ${k}`);
    const bundled = S.FONTS.some(([f]) => f === L.title), fromChronicle = chronicle.includes(`font-family: "${L.title}"`);
    assert.ok(bundled || fromChronicle, `${L.id}: face ${L.title}`);
  }
});

test("text, rules and accents read against the paper (text 7:1, rules and accents 3:1)", () => {
  for ( const L of S.LINES ) for ( const tone of ["light", "dark"] ) {
    const t = L[tone];
    assert.ok(ratio(t.ink, t.base) >= 7, `${L.id} ${tone} ink ${ratio(t.ink, t.base).toFixed(2)}`);
    assert.ok(ratio(t.rule, t.base) >= 3, `${L.id} ${tone} rule ${ratio(t.rule, t.base).toFixed(2)}`);
    assert.ok(ratio(t.acc, t.base) >= 3, `${L.id} ${tone} accent ${ratio(t.acc, t.base).toFixed(2)}`);
  }
});

test("dark skins are dark and light skins are light, so the system's own text colours still read", () => {
  for ( const L of S.LINES ) {
    assert.ok(lum(L.light.base) > 0.6, `${L.id} light base`);
    assert.ok(lum(L.dark.base) < 0.03, `${L.id} dark base`);
  }
});

test("every bundled font file exists, is woff2 and has its licence", () => {
  const lic = readdirSync(join(sheets, "fonts/licenses")).map(f => f.toLowerCase());
  for ( const [family, file] of S.FONTS ) {
    const p = join(sheets, "fonts", file);
    assert.ok(existsSync(p), `${family}: ${file}`);
    assert.equal(readFileSync(p).subarray(0, 4).toString("latin1"), "wOF2", `${file} is woff2`);
    const key = file.replace(/\.woff2$/, "").toLowerCase();
    assert.ok(lic.includes(`ofl-${key}.txt`), `${file}: licence`);
  }
});

const scoped = css => {
  assert.ok(!/(?<!body)\.wodx-skin/.test(css.replace(/body\.wodx-skin/g, "")), "every rule is scoped to body.wodx-skin");
  for ( const block of css.split("}").filter(b => b.includes("{") && !b.includes("@font-face")) )
    for ( const sel of block.split("{")[0].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\([^()]*\)/g, "()").split(",") ) assert.match(sel.trim(), /^body\.wodx-skin /, sel);
};

test("the skin files in wodx-sheets are the ones the generator writes now (B6060)", () => {
  const {core, lines, index} = B.buildSplit();
  const msg = "run node tools/skins/build-skins.mjs";
  assert.equal(readFileSync(join(sheets, "styles/wodx-skins.css"), "utf8"), core, msg);
  assert.equal(readFileSync(join(sheets, "scripts/skins-index.mjs"), "utf8"), index, msg);
  const files = readdirSync(join(sheets, "styles/skins")).filter(f => f.endsWith(".css")).sort();
  assert.deepEqual(files, S.LINES.map(L => `${L.id}.css`).sort(), "one file per line, and no other");
  for ( const L of S.LINES ) {
    const css = readFileSync(join(sheets, `styles/skins/${L.id}.css`), "utf8");
    assert.equal(css, lines[L.id], `${L.id}: ${msg}`);
    scoped(css);
    assert.ok(!css.includes("@font-face"), `${L.id}: the fonts stay in the core sheet`);
  }
  scoped(core);
  const mod = JSON.parse(readFileSync(join(sheets, "module.json"), "utf8"));
  assert.ok(mod.styles.includes("styles/wodx-skins.css"));
  assert.ok(!mod.styles.some(s => s.startsWith("styles/skins/")), "line skins are loaded by scripts/skins.mjs, not on every page");
});

test("the split adds up to the single stylesheet rule for rule, in the same order (B6060)", () => {
  const {core, lines} = B.buildSplit();
  const body = t => t.replace(/^\/\* WoDX line skin:[\s\S]*?\*\/\n\n/, "");
  const wait = /\/\* While a sheet's own skin file loads[\s\S]*?\n.*wodx-wait-skin.*\n\n?/;
  assert.match(core, wait, "the loading rule is in the core sheet");
  const whole = core.replace(wait, "") + S.LINES.map(L => body(lines[L.id])).join("\n");
  assert.equal(whole, B.buildCss());
});

test("the loader's index names each line once, in the stylesheet's order, with a test for its sheet (B6060)", async () => {
  const {SKINS} = await import(pathToFileURL(join(sheets, "scripts/skins-index.mjs")).href);
  assert.deepEqual(SKINS.map(s => s.id), S.LINES.map(L => L.id));
  for ( const s of SKINS ) assert.match(s.test, /^\.wod20\.wod-sheet/, s.id);
  const main = readFileSync(join(sheets, "scripts/main.mjs"), "utf8");
  assert.match(main, /SK\.setup\(\)/, "main.mjs starts the loader");
});

test("each rule is a well-formed SVG with nothing outside its box", () => {
  for ( const L of S.LINES ) for ( const small of [false, true] ) {
    const uri = S.rule(L.rule, L.light.rule, L.light.acc, small);
    const svg = decodeURIComponent(uri.slice('url("data:image/svg+xml,'.length, -2));
    assert.match(svg, /^<svg [^>]*viewBox='0 0 \d+ \d+'/, L.id);
    assert.ok(!/NaN|undefined/.test(svg), `${L.id}: no NaN`);
    const opens = (svg.match(/<(?!\/)[a-z]+[^>]*[^/]>/gi) ?? []).length, closes = (svg.match(/<\/[a-z]+>/gi) ?? []).length;
    assert.equal(opens, closes, `${L.id}: tags balance`);
  }
});
