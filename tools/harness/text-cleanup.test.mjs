/* Text cleanup pass (B97): every player-facing string in the WoDX modules stays gender-neutral (B48)
 * and keeps em-dashes out of its prose. Code comments are not checked; nor are book names kept as the books spell them. */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync, readdirSync, statSync} from "node:fs";
import {join, dirname} from "node:path";
import {fileURLToPath} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const walk = d => readdirSync(d).flatMap(f => {
  const p = join(d, f);
  if (f === "node_modules" || f === "macros") return [];
  return statSync(p).isDirectory() ? walk(p) : /\.(m?js|json|hbs|html)$/.test(f) ? [p] : [];
});
const files = walk(join(root, "modules"));

/** the strings in a file, comments left out; keep = leave the HTML tags in */
function strings(src, keep = false) {
  const code = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  return (code.match(/`[^`]*`|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g) ?? []).map(s => keep ? s : s.slice(1, -1).replace(/<[^>]+>/g, " "));
}

// Gaia is a named goddess in the Garou books.
const ALLOWED = [/Gaia answers a plea to cleanse the land as she sees fit/];
const PRONOUN = /\b(he|she|him|her|his|hers|himself|herself)\b/i;

test("player-facing text in every module is gender-neutral (B48)", () => {
  const bad = [];
  for (const f of files) for (const s of strings(readFileSync(f, "utf8")))
    if (PRONOUN.test(s) && !ALLOWED.some(a => a.test(s))) bad.push(`${f.slice(root.length + 1)}: ${s.slice(0, 120)}`);
  assert.deepEqual(bad, []);
});

test("no em-dashes in prose: only as an empty choice in a list", () => {
  const bad = [];
  for (const f of files) for (const s of strings(readFileSync(f, "utf8"), true)) {
    if (!s.includes("—")) continue;
    // an empty choice: "—", >—<, or "— none —" and the like
    const rest = s.replace(/(["'`>])\s*—\s*(?=["'`<])/g, "$1").replace(/— [a-z /()]+ —/g, "");
    if (rest.includes("—")) bad.push(`${f.slice(root.length + 1)}: ${s.slice(0, 120)}`);
  }
  assert.deepEqual(bad, []);
});

test("in-game text doesn't echo the project's own instructions: no decision numbers, phases, names or 'own words' notes", () => {
  const ECHO = /\(B\d{1,3}\b|\bB\d{1,3}[:;)]|\bPhase \d|\bBen\b|WoDX's (own )?words|WoDX choice|Mechanics only/;
  const bad = [];
  for (const f of files) for (const s of strings(readFileSync(f, "utf8")))
    if (ECHO.test(s)) bad.push(`${f.slice(root.length + 1)}: ${s.match(new RegExp(`.{0,50}(${ECHO.source}).{0,30}`))?.[0]}`);
  assert.deepEqual(bad, []);
});

// Stock phrases that read as machine-written (Phase 10 scan). Game terms such as the Tapestry or the Delve Edge are not on the list.
const STOCK = /\b(it'?s worth noting|it is worth noting|it is important to note|in conclusion|furthermore,|moreover,|a testament to|cannot be overstated|plays? an? (key|crucial|vital|pivotal) role|seamless(ly)?|embark(s|ed)? on|delve[sd]? into|deep dive|the very fabric of|ever-evolving|a myriad of|plethora|rich tapestry|nestled|bustling|in today'?s world|navigat(e|ing) the complexities|whether you'?re)\b/i;
// Unfinished text
const PLACEHOLDER = /\b(lorem ipsum|TODO|FIXME|TBD|placeholder text|insert (name|text) here)\b/;

test("in-game text and the encyclopaedia have no stock machine phrases or placeholders", () => {
  const bad = [];
  for (const f of files) for (const s of strings(readFileSync(f, "utf8"))) {
    if (STOCK.test(s)) bad.push(`${f.slice(root.length + 1)}: ${s.match(new RegExp(`.{0,40}(${STOCK.source}).{0,20}`, "i"))?.[0]}`);
    else if (PLACEHOLDER.test(s)) bad.push(`${f.slice(root.length + 1)}: ${s.slice(0, 80)}`);
  }
  assert.deepEqual(bad, []);
});

