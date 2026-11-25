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

test("#2487: Make the arrest sends the watch to the map, and every answer to the law is told", async () => {
  const R = await import(pathToFileURL(join(root, "modules/wodx-storyteller/scripts/reach-rules.mjs")));
  const spots = R.spotsNear({x: 0, y: 0}, {size: 100, width: 1000, height: 1000}, 2);
  assert.ok(spots.length && spots.every(p => p.x >= 0 && p.y >= 0), "inside the scene");
  assert.equal(spots[0].r, 1, "the nearest ring first");
  assert.ok(spots.findIndex(p => p.r === 2) > spots.findLastIndex(p => p.r === 1), "rings in order");
  assert.equal(spots.filter(p => p.r === 1).length, 3, "a corner token has three squares next to it");
  const H = src("modules/wodx-chronicle/scripts/law-heat.mjs");
  assert.match(H, /reach\.lawCome\(\{actorId, region, mode: "arrest", why: "the Storyteller's word"\}\)/);
  assert.match(H, /await makeArrest\(b\.dataset\.actor, b\.dataset\.region\) : await letItGo\(/);
  const RE = src("modules/wodx-storyteller/scripts/reach.mjs");
  assert.match(RE, /polygonBackends\.move\.testCollision/);
  assert.match(RE, /No one could be put on the map there; place them by hand\./);
  assert.equal((RE.match(/await told\(a, /g) ?? []).length, 3, "resist, the sentence and going with them are each told");
});

test("#2490: a trip takes time in solo play, lands by the door, and a public place has its people", async () => {
  const S = await import(pathToFileURL(join(root, "modules/wodx-solo/scripts/solo-rules.mjs")));
  assert.equal(S.spendSeconds(5 * 86400, S.TRIP_MAX_HOURS), 5 * 86400, "a five-day trip is not cut to 12 hours");
  assert.equal(S.spendSeconds(20 * 3600), 12 * 3600, "a hunt still stops at 12 hours");
  assert.ok(S.chunks(5 * 86400, S.tripStep(5 * 86400)).length <= 61, "a long trip passes in about 60 steps");
  const P = src("modules/wodx-solo/scripts/panel.mjs");
  assert.match(P, /Hooks\.on\("wodxTravelled", p => \{ onTravelled\(p\)/);
  const C = src("modules/wodx-storyteller/scripts/core.mjs");
  assert.match(C, /Hooks\.callAll\("wodxTravelled", \{actorId, userId: user, seconds: plan\.minutes \* 60/);
  assert.match(C, /const door = !at && !own \? entranceSpot\(scene, from\) : null;/);
  const box = C.slice(C.indexOf("export function regionBox("), C.indexOf("const WAY_TYPE"));
  const regionBox = new Function(`${box.replace("export ", "")}; return regionBox;`)();
  assert.deepEqual(regionBox([{type: "rectangle", x: 100, y: 200, width: 50, height: 40}]), {x: 100, y: 200, w: 50, h: 40});
  assert.deepEqual(regionBox([{type: "polygon", points: [0, 0, 30, 0, 30, 20]}]), {x: 0, y: 0, w: 30, h: 20});
  assert.equal(regionBox([]), null);
  const N = src("modules/wodx-npc/scripts/passersby.mjs");
  assert.match(N, /const on = typeof c\.on === "boolean" \? c\.on : \(soloOn\(\) && PUBLIC_KINDS\.has\(guess\)\);/);
  const RR = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/routine-rules.mjs")));
  assert.equal(RR.guessPlace("The Black Goat Tavern").kind, "tavern");
});
