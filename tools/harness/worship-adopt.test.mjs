import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Houses of worship from the town generator take the faith of the place (B3200-B3201) */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const A = await imp("modules/wodx-interactables/scripts/adopt-rules.mjs");
const F = await imp("modules/wodx-chronicle/scripts/faith-rules.mjs");
const R = await imp("modules/wodx-npc/scripts/routine-rules.mjs");
const SAMPLE = src("tools/mapgen/samples/hohenhausen.wodx.json");
const frame = A.frameOf({grid: {size: 100, distance: 5}, dimensions: {sceneX: 0, sceneY: 0, size: 100, distance: 5}, padding: 0});

test("worship: every faith of the chronicle names a house of worship NPC routines know", () => {
  for ( const f of Object.keys(F.FAITHS) ) assert.ok(R.WORSHIP_KINDS.includes(A.WORSHIP_KIND[f]), f);
  const ch = {kind: "church", owner: "", private: false};
  assert.deepEqual(A.worshipFor(ch, "Chapel", "islamic").place.kind, "mosque");
  assert.equal(A.worshipFor(ch, "Chapel", "islamic").label, "Mosque");
  assert.equal(A.worshipFor(ch, "Castle chapel", "jewish").label, "Castle synagogue");
  assert.equal(A.worshipFor(ch, "Chapel", "tibetan").place.kind, "temple");
  assert.equal(A.worshipFor(ch, "Chapel", "western").place.kind, "church");
  assert.equal(A.worshipFor(ch, "St Wenceslas", "islamic").label, "St Wenceslas", "a name of its own stays");
  assert.equal(A.worshipFor({...ch, faith: "hindu"}, "Chapel", "islamic").place.kind, "temple", "the map's own faith wins");
  assert.equal(A.worshipFor({kind: "home"}, "House", "islamic").place.kind, "home");
  assert.equal(A.worshipFor(ch, "Chapel", null).changed, false, "no faith known: left as drawn");
});

test("worship: adopting a generated town in a Muslim land draws a mosque; at home a chapel", () => {
  const sc = A.parseSidecar(SAMPLE).data;
  const empty = {walls: [], tiles: [], lights: [], regions: []};
  const cairo = A.plan(sc, {...empty, faith: F.faithFor("egypt", 1300)}, frame, new Set());
  const kinds = rs => rs.map(r => r.flags["wodx-npc"]?.place?.kind).filter(Boolean);
  assert.ok(kinds(cairo.regions).includes("mosque") && !kinds(cairo.regions).includes("church"));
  assert.ok(cairo.notes.some(n => /follow the faith kept here/.test(n)));
  const home = A.plan(sc, {...empty, faith: "western"}, frame, new Set());
  assert.ok(kinds(home.regions).includes("church"));
  assert.ok(!home.notes.some(n => /follow the faith kept here/.test(n)));
  // the generator's own faith, written with --faith, is kept through the sidecar
  const tagged = JSON.parse(SAMPLE);
  for ( const r of tagged.regions ) if ( r.place?.kind === "church" ) r.place.faith = "jewish";
  const j = A.plan(A.parseSidecar(JSON.stringify(tagged)).data, {...empty, faith: "western"}, frame, new Set());
  assert.ok(kinds(j.regions).includes("synagogue"));
});

test("worship: the generator takes --faith, the adopter reads the scene's faith", () => {
  assert.match(src("tools/mapgen/ddtown.py"), /add_argument\("--faith"/);
  assert.match(src("modules/wodx-interactables/scripts/adopt.mjs"), /faith: await faithOf\(scene\)/);
});

/* B6362: the tagged house is holy ground, and its faith is read by prayer, True Faith and the demon's burn */
const IR = await imp("modules/wodx-interactables/scripts/interact-rules.mjs");
test("worship: a house of worship is holy ground kept for its faith", () => {
  for ( const f of Object.keys(F.FAITHS) ) assert.ok(IR.FAITHS.includes(f), f);
  const o = IR.worshipGround({kind: "mosque", faith: "islamic"}, "The mosque");
  assert.ok(IR.holyGround(o));
  assert.equal(o.rating, 1);
  assert.equal(o.faith, "islamic");
  assert.equal(o.house, "mosque");
  assert.equal(IR.worshipGround({kind: "church"}, "Chapel", "orthodox").faith, "orthodox", "the scene's faith when the place has none");
  assert.equal(IR.worshipGround({kind: "temple", holy: 3}).rating, 3);
  assert.equal(IR.worshipGround({kind: "tavern", faith: "islamic"}), null);
  assert.equal(IR.holyGround(IR.worshipGround({kind: "church", desecrated: true})), false);
  assert.equal(IR.holyHarm(o, {kind: "demon", torment: 5}).lethal, 1, "a demon is seared by any faith's house");
});
test("worship: whose holy ground it is", () => {
  assert.ok(IR.sameFaith("islamic", "islamic"));
  assert.ok(!IR.sameFaith("islamic", "western"));
  assert.ok(IR.sameFaith("orthodox", "western"), "Christians share their churches");
  assert.ok(IR.sameFaith("tibetan", "theravada"));
  assert.ok(!IR.sameFaith("chinese", "theravada"));
  assert.ok(IR.sameFaith(null, "jewish") && IR.sameFaith("jewish", null), "no faith named on either side counts as anyone's");
  for ( const f of IR.FAITHS ) assert.ok(IR.FAITH_WORDS[f], f);
  const hunter = src("modules/wodx-actions/scripts/hunter.js");
  assert.match(hunter, /onHoly\(actor\)\?\.own/, "True Faith reads whether the ground is their own");
  assert.match(hunter, /fd\.src === "ground" && gRating !== null \? gRating/, "prayer reads the ground on the map");
});
