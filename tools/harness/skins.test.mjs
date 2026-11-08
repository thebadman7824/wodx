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

test("the stylesheet in wodx-sheets is the one the generator writes now", () => {
  const css = readFileSync(join(sheets, "styles/wodx-skins.css"), "utf8");
  assert.equal(css, B.buildCss(), "run node tools/skins/build-skins.mjs");
  assert.ok(!/(?<!body)\.wodx-skin/.test(css.replace(/body\.wodx-skin/g, "")), "every rule is scoped to body.wodx-skin");
  for ( const block of css.split("}").filter(b => b.includes("{") && !b.includes("@font-face")) )
    for ( const sel of block.split("{")[0].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\([^()]*\)/g, "()").split(",") ) assert.match(sel.trim(), /^body\.wodx-skin /, sel);
  const mod = JSON.parse(readFileSync(join(sheets, "module.json"), "utf8"));
  assert.ok(mod.styles.includes("styles/wodx-skins.css"));
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
