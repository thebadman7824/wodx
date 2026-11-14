#!/usr/bin/env node
/**
 * What keeps each power's effect in bounds (Ben, 14 November 2026: every effect a power creates must be bound by rules
 * that regulate its behaviour). B4835.
 *
 *   node tools/powers/bounds.mjs [--out file.json] [--list]
 *
 * For every power the inventory lists as applying, each of its keywords is checked against BOUNDS: what ends the effect
 * (a timer, the scene, an instant change, a roll), who controls what it makes, and the roll that resists it. Flags:
 *   unbound        a keyword with no bound at all (must stay 0)
 *   summonNoSpec   a summoning power with no page-checked summon spec (must stay 0)
 *   turnText       the power's text says something happens each turn or round and nothing works it (a ceiling)
 *   storyteller    keywords whose bound is the Storyteller's own call (counted, not a fault)
 */
import path from "node:path";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const A = p => pathToFileURL(path.join(ROOT, "modules/wodx-actions/scripts", p)).href;
const E = await import(A("effects-rules.js"));
const SS = await import(A("summon-specs.js"));
const TR = await import(A("turn-rules.js"));

/** What bounds each keyword's result in play. ends: how it stops; control: who runs what it makes; resist: the roll against it. */
export const BOUNDS = {
  sense: {ends: "instant (a whisper)"}, know: {ends: "instant (one answer)"}, speak: {ends: "timer"},
  harm: {ends: "instant, soaked; lasting harm each turn for its turns (B4832)"}, mend: {ends: "instant, up to the damage there"},
  ward: {ends: "timer"}, fortune: {ends: "timer, or the next roll"}, hasten: {ends: "timer"}, light: {ends: "timer puts the token's light back (B4830)"},
  move: {ends: "instant"}, charge: {ends: "instant, held to the pool's cap"}, veil: {ends: "timer", resist: "noticing roll"},
  sight: {ends: "timer"}, rise: {ends: "timer"}, trip: {ends: "one turn", resist: "Dexterity + Athletics (B4831)"},
  hold: {ends: "timer, or breaking free each turn (B4831)", resist: "Strength"}, fear: {ends: "timer", resist: "Willpower (B4831)"},
  sway: {ends: "the Storyteller plays it out; awe on a timer", resist: "Willpower (B4831)"}, shape: {ends: "timer"},
  sideways: {ends: "instant crossing"}, boost: {ends: "timer", resist: "Stamina for a sap (B4831)"},
  summon: {ends: "the summon rules: timer, task, upkeep or dismissal (B4820)", control: "summon spec"},
  make: {ends: "fades with its duration unless Prime makes it real (B4830)"}, work: {ends: "instant (WoDX Interactables)"},
  illusion: {ends: "timer, or seeing through it (B4831)", resist: "Perception + Awareness"}, possess: {ends: "timer", resist: "Willpower (B4831)", control: "the possessor plays the body"},
  bind: {ends: "timer, written on the sheet with what ends it", resist: "Willpower (B4831)"}, banish: {ends: "instant, the approval queue"},
  manifest: {ends: "timer"}, imbue: {ends: "the approval queue; the thing keeps it"}, place: {ends: "the approval queue; the place keeps it"},
  weather: {ends: "the day's weather; Undo puts it back"}, time: {ends: "the Storyteller's call", storyteller: true}, free: {ends: "the Storyteller's call", storyteller: true}
};

const TURN_TEXT = /\b(each|every) (turn|round)\b/i;

export function audit(rows) {
  const out = {powers: 0, unbound: [], summonNoSpec: [], turnText: [], storyteller: 0, byKeyword: {}};
  for ( const r of rows ) {
    if ( r.status !== "applies" ) continue;
    out.powers++;
    for ( const k of r.kw ?? [] ) {
      out.byKeyword[k] = (out.byKeyword[k] ?? 0) + 1;
      if ( !BOUNDS[k] && E.KEYWORDS[k] ) out.unbound.push(`${r.line}|${r.name}|${k}`);
      if ( BOUNDS[k]?.storyteller ) out.storyteller++;
    }
    if ( (r.kw ?? []).includes("summon") && !SS.SPECS[SS.specKey(r.line, r.name)] && !SS.NOT_SUMMON?.[SS.specKey(r.line, r.name)] ) out.summonNoSpec.push(`${r.line}|${r.name}`);
    if ( TURN_TEXT.test(r.text ?? "") && !TR.everyTurnOf(r.name, r.line) && !TR.TURN_DESK?.[String(r.name).replace(/^[•\s]+/, "").toLowerCase()] ) out.turnText.push(`${r.line}|${r.name}`);
  }
  return out;
}

if ( import.meta.url === pathToFileURL(process.argv[1] ?? "").href ) {
  const tmp = path.join(ROOT, "tools/powers/.inventory-bounds.json");
  execFileSync(process.execPath, [path.join(ROOT, "tools/powers/inventory.mjs"), "--text", "--out", tmp], {stdio: "ignore"});
  const rows = JSON.parse(fs.readFileSync(tmp, "utf8")).rows ?? [];
  fs.rmSync(tmp, {force: true});
  const res = audit(rows);
  const i = process.argv.indexOf("--out");
  if ( i > 0 ) fs.writeFileSync(process.argv[i + 1], JSON.stringify(res, null, 1));
  console.log(`${res.powers} applying powers: unbound ${res.unbound.length}, summons with no spec ${res.summonNoSpec.length}, each-turn text not worked ${res.turnText.length}, Storyteller's call ${res.storyteller}`);
  if ( process.argv.includes("--list") ) for ( const k of ["unbound", "summonNoSpec", "turnText"] ) for ( const x of res[k] ) console.log(`${k}: ${x}`);
}
