import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import fs from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6776: a held world moves its clock while nothing reacts (skip.mjs). gateskip holds the world and passes 825 years for
   its own cast; the archive took the cast's dead, the hygiene check made player characters filthy, kennels bred and the
   NPC turns ran over the whole world. Each of these clock hooks now returns first while the world is held. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILES = {
  "modules/wodx-creation/scripts/animal-keepers.mjs": /Hooks\.on\("updateWorldTime", \(\) => \{\s*if \( held\(\) \) return;/,
  "modules/wodx-library/scripts/hygiene-use.mjs": /Hooks\.on\("updateWorldTime", worldTime => \{[^}]*\|\| held\(\) \) return;/,
  "modules/wodx-library/scripts/use.mjs": /Hooks\.on\("updateWorldTime", t => \{ if \( held\(\) \) return;/,
  ...Object.fromEntries(["carry-aftercare", "carry-goals", "cults", "family", "legacy", "memory", "orders", "prowl", "servants"]
    .map(f => [`modules/wodx-npc/scripts/${f}.mjs`, /Hooks\.on\("updateWorldTime", \(\) => \{\s*if \( heldClock\(\) \) return;/]))
};

test("B6776: clock hooks wait while the world is held", () => {
  for ( const [f, re] of Object.entries(FILES) ) {
    const src = fs.readFileSync(join(root, f), "utf8");
    assert.match(src, re, `${f}: the clock hook asks first whether the world is held`);
    assert.match(src, /api\?\.isHeld\?\.\(\)/, `${f}: held comes from the chronicle's isHeld`);
  }
  const ar = fs.readFileSync(join(root, "modules/wodx-creation/scripts/archive.mjs"), "utf8");
  assert.match(ar, /export async function autoTick[\s\S]{0,200}\|\| held\(\) \) return null;/, "the archive by itself waits while the world is held");
});

test("B6776: the held helper reads the chronicle and is false without it", async () => {
  const had = globalThis.game;
  try {
    for ( const [held, want] of [[true, true], [false, false]] ) {
      globalThis.game = {modules: new Map([["wodx-chronicle", {api: {isHeld: () => held}}]])};
      const fn = new Function(`return (${'() => { try { return !!game.modules.get("wodx-chronicle")?.api?.isHeld?.(); } catch (e) { return false; } }'})`)();
      assert.equal(fn(), want);
    }
    globalThis.game = {modules: new Map()};
    const fn = new Function(`return (${'() => { try { return !!game.modules.get("wodx-chronicle")?.api?.isHeld?.(); } catch (e) { return false; } }'})`)();
    assert.equal(fn(), false);
  } finally { globalThis.game = had; }
});
