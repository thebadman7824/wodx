import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* B7130: gear weight on dry land. Past half the lift +1 to dodge and stealth, past the lift half
   speed; a burden set by hand wins over the weight. */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const MV = await import(pathToFileURL(join(root, "modules/wodx-combat/scripts/movement-rules.js")));

test("By weight: a quarter or half of the lift is nothing, past half is +1, past the lift halves the pace", () => {
  assert.equal(MV.landLoad().steps, 0);
  assert.equal(MV.landLoad({gearKg: 20, liftKg: 50}).diff, 0, "40% of the lift is nothing on land");
  const half = MV.landLoad({gearKg: 30, liftKg: 50});
  assert.deepEqual([half.steps, half.from, half.diff, half.factor], [2, "weight", 1, 1]);
  assert.match(half.note, /30 kg of gear, past half what they can lift.*\+1 to dodge and stealth/);
  const over = MV.landLoad({gearKg: 60, liftKg: 50});
  assert.deepEqual([over.steps, over.diff, over.factor], [3, 1, 0.5]);
  assert.match(over.note, /half speed/);
  assert.equal(MV.landLoad({gearKg: 60, liftKg: 0}).steps, 0, "no lift known: nothing is guessed");
});

test("A burden set by hand wins over the weight, both ways", () => {
  assert.equal(MV.landLoad({burden: 1, gearKg: 60, liftKg: 50}).steps, 0, "a pack is nothing on land, whatever the scale says");
  const heavy = MV.landLoad({burden: 2, gearKg: 1, liftKg: 50});
  assert.deepEqual([heavy.steps, heavy.from, heavy.factor], [2, "hand", 1]);
  assert.match(heavy.note, /a heavy load/);
  assert.equal(MV.landLoad({burden: 3}).factor, 0.5);
});

test("Combat reads the land load in moves, dodges and stealth, and leaves flyers, riders and swimmers alone", () => {
  const m = src("modules/wodx-combat/scripts/movement.js");
  assert.match(m, /export function landLoadOf\(actor\)/);
  assert.match(m, /const land = !inWater && mode !== "fly" \? landLoadOf\(actor\) : null;/);
  assert.match(m, /land\?\.factor < 1 \) limit = Math\.max\(1, Math\.floor/);
  assert.match(m, /const land = onLand\(target, st\) \? landLoadOf\(target\) : null;/);
  assert.match(m, /\["dodge", "stealth"\]\.includes\(k\)\) && onLand\(actor, st\)/);
  assert.match(m, /LAND_STANCES = new Set\(\["standing", "prone", "wading", "climbing", "jumped"\]\)/);
  assert.match(m, /return !rideOf\(tokenOf\(actor\)\)/);
  assert.match(m, /movedYards, on, landLoadOf, rules: MV/);
  assert.match(m, /By what they carry/);
  for ( const st of ["standing", "prone", "wading", "climbing", "jumped"] ) assert.ok(MV.STANCES[st], `${st} is a stance`);
});
