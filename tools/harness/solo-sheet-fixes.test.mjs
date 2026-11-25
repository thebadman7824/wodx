import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* The sheet, Road and Discipline fixes from the first solo test (25 Nov 2026): #2480, #2481, #2483, #2500. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = f => readFileSync(join(root, f), "utf8");

test("#2481: a Road written to the sheet sets path.label to custom, which the sheet's heading reads", () => {
  const KIN = src("modules/wodx-actions/scripts/kindred.js");
  assert.match(KIN, /roadSheetUpdate = name => \(\{ "system\.advantages\.path\.label": "custom", "system\.advantages\.path\.custom"/);
  assert.match(KIN, /if \(fd\.writeSheet\) await updateActor\(actor, roadSheetUpdate\(path \|\| r\.name\)\)/);
  assert.match(KIN, /export async function syncRoadNames/);
  assert.match(src("modules/wodx-actions/scripts/main.js"), /KX\.syncRoadNames\(\)/);
  // the system's heading: path.custom only when path.label is "custom"
  assert.match(src("system/worldofdarkness/module/handlebars.js"), /if \(stat\.label == "custom"\) \{\s*stat_headline_text = stat\.custom;/);
  assert.match(src("modules/wodx-creation/scripts/wizard.mjs"), /"system\.advantages\.path\.label": "custom", "system\.advantages\.path\.custom": path \|\| r\.name/);
});

test("#2480: only the Storyteller changes a Road; a player sees the Road and its sins", () => {
  const KIN = src("modules/wodx-actions/scripts/kindred.js");
  assert.match(KIN, /if \(!game\.user\.isGM\) return showRoad\(actor, cur\);/);
  const fn = KIN.slice(KIN.indexOf("async function showRoad("), KIN.indexOf("/* ---------------- Prestation"));
  assert.match(fn, /hierarchyTable\(cur, rating\)/);
  assert.match(fn, /Only the Storyteller can change a Road\./);
});

test("#2483: the targeting panel clears an area outline when the power is not an area one", () => {
  const T = src("modules/wodx-targeting/scripts/main.mjs");
  const draw = T.slice(T.indexOf("  function draw() {"), T.indexOf("  function draw() {") + 600);
  assert.match(draw, /if \( t\?\.intent !== "area" \|\| handSet\(\) \) clearPreview\(\);/);
  assert.ok(draw.indexOf("clearPreview()") < draw.indexOf("if ( handSet() ) {"), "cleared before any early return");
});

test("#2500: a carried light must be in the inventory (the Storyteller may light any)", async () => {
  const C = await import(pathToFileURL(join(root, "modules/wodx-interactables/scripts/carry-rules.mjs")));
  assert.deepEqual(C.heldKinds(["Tallow candles", "Sword"]), ["candle"]);
  assert.deepEqual(C.heldKinds(["Electric torch"]), ["electric"], "an electric torch is not a torch");
  assert.deepEqual(C.heldKinds(["Pitch torch", "Storm lantern"]), ["torch", "lantern"]);
  assert.deepEqual(C.heldKinds([]), []);
  const CA = src("modules/wodx-interactables/scripts/carry.mjs");
  assert.match(CA, /if \( !game\.user\.isGM && !heldBy\(doc\)\.includes\(kind\) \) return ui\.notifications\.warn/);
  assert.match(CA, /filter\(k => game\.user\.isGM \|\| held\.includes\(k\.id\)\)/);
  assert.match(CA, /No light in the inventory/);
});

test("#2482: the Storyteller's cards can be cleared, lose their dead chat controls, and older cards can be pressed", async () => {
  const R = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/solo-rules.mjs")));
  const out = R.stripCardControls('<header><a class="message-delete" data-action="deleteMessage"><i class="fa-solid fa-trash"></i></a></header><button class="vta-btn">Go</button>');
  assert.doesNotMatch(out, /fa-trash|message-delete/);
  assert.match(out, /<button class="vta-btn">Go<\/button>/);
  const ST = src("modules/wodx-solo/scripts/st-tools.mjs");
  assert.match(ST, /data-action="clear"><i class="fa-solid fa-trash"><\/i> Clear the list/);
  assert.match(ST, /actions: \{press: StEyes\.#onPress, clear: StEyes\.#onClear\}/);
  assert.match(ST, /ask\("ask\.st\.eyes", \{since: clearedAt\}\)/);
  assert.match(ST, /Number\(m\.timestamp \?\? 0\) > Number\(since \|\| 0\)/);
  assert.match(ST, /if \( !el \) \(\{el, spare\} = await drawnButton\(msg, pick\)\);/);
});

test("#2477: spent time keeps the guards a wait has", () => {
  const P = src("modules/wodx-solo/scripts/panel.mjs");
  const fn = P.slice(P.indexOf("export async function spendTime("), P.indexOf("/** Pause the game, or start it again. */"));
  for ( const g of [/placeOf\(user\)/, /making\(user\)/, /fightOn\(scene\.id\)\.length/, /game\.paused/, /if \( waiting \)/] ) assert.match(fn, g);
  assert.match(src("modules/wodx-actions/scripts/theme-rules.js"), /"api:giveBlood": "Give a point of your vitae/);
});
