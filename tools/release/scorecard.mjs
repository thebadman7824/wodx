// Writes docs/SCORECARD.md: for each game line, what WoDX gives it now, and for each line and era, how many dated
// World of Darkness events the world timeline holds (B7064). Every figure is counted from the repository when the
// script runs, so a release can show what it completed. Run from the repository root: node tools/release/scorecard.mjs
// [--wiki /mnt/project-files/final-audit/w9/summary.md] adds the wiki coverage column from the final audit.
import {execFileSync} from "node:child_process";
import {readFileSync, writeFileSync, readdirSync, mkdtempSync, existsSync} from "node:fs";
import {join, dirname} from "node:path";
import {tmpdir} from "node:os";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };

/** The lines, with the power groups of tools/powers/inventory.mjs, the world timeline key and the Creation books. */
export const LINES = [
  {key: "vampire", label: "Vampire", powers: ["Vampire (Dark Ages)", "Vampire (V20)", "Rituals (V20)", "Rituals (V20 Dark Ages)"], books: ["v20", "vtda20"], wiki: "Vampire"},
  {key: "werewolf", label: "Werewolf", powers: ["Werewolf (Dark Ages)", "Werewolf (W20)", "Werewolf (Changing Breeds)", "Rituals (W20)", "Rituals (Dark Ages: Werewolf)"], books: ["w20", "daw"], wiki: "Werewolf"},
  {key: "mage", label: "Mage", powers: ["Mage (M20)", "Mage (Dark Ages)"], books: ["m20", "dam"], wiki: "Mage"},
  {key: "wraith", label: "Wraith", powers: ["Wraith (W20)", "Wraith (Great War)"], books: ["wr20"], wiki: "Wraith"},
  {key: "changeling", label: "Changeling", powers: ["Changeling (C20)", "Fae (Dark Ages)"], books: ["c20", "dafae"], wiki: "Changeling"},
  {key: "hunter", label: "Hunter", powers: ["Hunter (HtR)", "Hunter (HH2)", "Hunter (HH2/DA)", "Hunter (True Faith)", "Hunter (Inquisitor)"], books: ["htr", "inquisitor"], wiki: "Hunter"},
  {key: "mummy", label: "Mummy", powers: ["Mummy (2nd)", "Rituals (Mummy: The Resurrection)"], books: ["mummy"], wiki: "Mummy"},
  {key: "demon", label: "Demon", powers: ["Demon (DtF)"], books: ["demon"], wiki: "Demon"},
  {key: "kote", label: "Kuei-jin", powers: ["Kuei-jin (KotE)"], books: ["kote"], wiki: "Kindred of the East"}
];

/** The wiki coverage table of the final audit's w9 summary: {line: {works, total}}. */
export function wikiCoverage(text) {
  const out = {};
  for ( const l of String(text).split("\n") ) {
    const m = /^\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*\d+%\s*\|$/.exec(l);
    if ( m ) out[m[1]] = {works: +m[2], total: +m[7]};
  }
  return out;
}

/** Events per line and era: {line: {era: n}}, counting an event once for each line it names ("all" counts for every line). */
export function eventsByLineEra(history, keys) {
  const out = Object.fromEntries(keys.map(k => [k, {}]));
  for ( const e of history.events ) for ( const k of keys ) if ( e.lines.includes(k) || e.lines.includes("all") ) out[k][e.era] = (out[k][e.era] ?? 0) + 1;
  return out;
}

const pct = (a, b) => b ? `${Math.round(100 * a / b)}%` : "n/a";

async function main() {
  const inv = join(mkdtempSync(join(tmpdir(), "wodx-score-")), "inv.json");
  execFileSync(process.execPath, [join(root, "tools/powers/inventory.mjs"), "--out", inv]);
  const byLine = JSON.parse(readFileSync(inv, "utf8")).byLine;
  const history = (await import(pathToFileURL(join(root, "modules/wodx-chronicle/data/world-history.mjs")).href)).default;
  const totals = (await import(pathToFileURL(join(root, "modules/wodx-creation/data/creation-totals.mjs")).href)).TOTALS;
  const gateDir = join(root, "tools/gate");
  const gates = readdirSync(gateDir).filter(f => /^gate.*\.mjs$/.test(f)).map(f => readFileSync(join(gateDir, f), "utf8").toLowerCase());
  const wikiFile = arg("--wiki");
  const wiki = wikiFile && existsSync(wikiFile) ? wikiCoverage(readFileSync(wikiFile, "utf8")) : null;
  const ev = eventsByLineEra(history, LINES.map(l => l.key));

  const out = ["# Scorecard", "",
    "Written by tools/release/scorecard.mjs (B7064). What WoDX gives each game line now, counted from the repository, so each release can say what it completed. Rerun it before a release.", ""];
  out.push("## By line", "");
  out.push(`| Line | Creation books | Powers applied | Gates naming the line |${wiki ? " Wiki entries that work |" : ""}`);
  out.push(`| --- | --- | --- | --- |${wiki ? " --- |" : ""}`);
  for ( const l of LINES ) {
    const p = l.powers.map(g => byLine[g] ?? {total: 0, applies: 0}).reduce((s, x) => ({total: s.total + x.total, applies: s.applies + x.applies}), {total: 0, applies: 0});
    const books = l.books.filter(b => totals[b]).map(b => totals[b].short ?? b).join(", ") || "none";
    const word = l.key === "kote" ? "kuei-jin" : l.key;
    const re = new RegExp(`\\b${word}s?\\b`);
    const g = gates.filter(src => re.test(src)).length;
    const w = wiki?.[l.wiki];
    out.push(`| ${l.label} | ${books} | ${p.applies} of ${p.total} (${pct(p.applies, p.total)}) | ${g} |${wiki ? ` ${w ? `${w.works} of ${w.total} (${pct(w.works, w.total)})` : "n/a"} |` : ""}`);
  }
  out.push("", wiki ? `Wiki column: the final audit's wiki coverage table (${wikiFile}), which was made on 16 November 2026 and is not recounted by this script.` : "Add `--wiki <final-audit w9 summary.md>` for the wiki coverage column.", "");
  out.push("## Dated World of Darkness events by line and era", "",
    "Events in the world timeline (wodx-chronicle data/world-history.mjs, 1197 to 2009) that name the line; an event for all lines counts for each. Mortal history is left out.", "");
  out.push(`| Line | ${history.eras.map(e => `${e.name} (${e.from} to ${e.to})`).join(" | ")} | Total |`);
  out.push(`| --- | ${history.eras.map(() => "---").join(" | ")} | --- |`);
  for ( const l of LINES ) {
    const row = history.eras.map(e => ev[l.key][e.id] ?? 0);
    out.push(`| ${l.label} | ${row.join(" | ")} | ${row.reduce((a, b) => a + b, 0)} |`);
  }
  out.push("");
  writeFileSync(join(root, "docs/SCORECARD.md"), out.join("\n"));
  console.log("docs/SCORECARD.md written");
}

if ( process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1] ) await main();
