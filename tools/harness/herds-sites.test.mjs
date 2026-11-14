import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

/* Herd pools by district (B3570-B3575) and holy ground shared by several claims (B3580-B3586), WoDX Storyteller */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const imp = p => import(pathToFileURL(join(root, p)));
const src = p => readFileSync(join(root, p), "utf8");
const H = await imp("modules/wodx-storyteller/scripts/herd-rules.mjs");
const S = await imp("modules/wodx-storyteller/scripts/site-rules.mjs");
const M = H.MONTH;

test("the classes of vessel follow the age and the land's faith", () => {
  const med = H.classesFor(1250, "western").map(c => c.key);
  assert.ok(med.includes("nobles") && med.includes("clergy") && med.includes("merchants") && med.includes("poor"));
  const mod = H.classesFor(2005, "western").map(c => c.key);
  assert.ok(mod.includes("students") && mod.includes("nobles") && !mod.includes("clergy"));
  assert.equal(H.classesFor(1300, "islamic").find(c => c.key === "clergy").label, "Imams, scholars and Sufis");
  assert.equal(H.classesFor(1300, "chinese").find(c => c.key === "nobles").label, "Officials and their households");
  assert.equal(H.classesFor(1900, "chinese").find(c => c.key === "nobles").label, "The well-to-do", "later ages keep their own words");
  for ( const y of [1197, 1600, 1850, 2000, 2100] ) assert.ok(H.classesFor(y).length >= 5, `classes in ${y}`);
});

test("a district's pool comes from its town's people and the kind of district", () => {
  const p = H.poolFor({people: 4000, area: "slums", year: 1250});
  assert.equal(p.total, 10, "a quarter of 4,000 people, one feeding a hundred");
  assert.equal(p.classes.reduce((s, c) => s + c.n, 0), p.total, "the classes add up to the pool");
  assert.ok(p.classes.find(c => c.key === "poor").n > (p.classes.find(c => c.key === "clergy")?.n ?? 0), "slums are mostly the poor");
  assert.ok(!p.classes.some(c => c.key === "nobles"), "no nobles in the slums");
  assert.equal(H.poolFor({people: 0, area: "market", year: 1250}).total, Math.round(3000 * 0.2 / 100), "no town: the age's default");
  assert.equal(H.poolFor({people: 50, area: "patrolled", year: 1250}).total, 2, "never less than two");
});

test("feedings draw the pool down; past it the district thins in stages, and a new month fills it", () => {
  const pool = H.poolFor({people: 2000, area: "lower", year: 1300}); // 6
  let h = H.blankHerd(), r, crossed = [];
  for ( let i = 0; i < 13; i++ ) { r = H.feed(h, pool, {t: 5 * H.DAY, who: "Anna"}); h = r.herd; if ( r.crossed ) crossed.push(r.crossed.key); }
  assert.deepEqual(crossed, ["thin", "over", "stripped"]);
  assert.equal(h.feeds, 13);
  assert.equal(H.huntDiff(h, pool, 6 * H.DAY), 3);
  assert.equal(H.huntDiff(h, pool, M + H.DAY), 0, "the next month the herd is whole");
  const next = H.feed(h, pool, {t: M + H.DAY});
  assert.equal(next.herd.feeds, 1); assert.ok(next.refilled);
  assert.equal(H.harmFor("thin").rumour, false);
  assert.ok(H.harmFor("over").rumour && H.harmFor("stripped").hunters);
});

test("a vessel's tags pick its class, and animals are not counted", () => {
  assert.equal(H.classOfTags(["passerby", "monk", "man"], 1250), "clergy");
  assert.equal(H.classOfTags(["student", "woman"], 2000), "students");
  assert.equal(H.classOfTags(["animal", "rat"], 2000), "animal");
  assert.equal(H.classOfTags(["merchant"], 2000), "clerks", "a class the age lacks falls to the nearest");
  assert.equal(H.classOfTags([], 2000), null);
  const pool = H.poolFor({people: 4000, area: "market", year: 1250});
  assert.equal(H.pickClass(H.blankHerd(), pool, "merchants"), "merchants");
  assert.ok(pool.classes.some(c => c.key === H.pickClass(H.blankHerd(), pool, "nobody")));
});

test("rumours speak in the words of the age", () => {
  assert.match(H.rumourFor("over", "the Fishmarket", 1300), /curse/);
  assert.match(H.rumourFor("stripped", "Soho", 2001), /drug/);
});

const places = [{id: "c1", kind: "caern", level: 3, keepers: ["g1"], name: "The Old Oak"}, {id: "n1", kind: "node", rating: 4, keepers: ["m1"], name: "The Well"},
  {id: "f1", kind: "freehold", rating: 2, keepers: ["k1"], name: "The Hearth"}];

test("a site's strength follows its strongest place and the age, and thins as the Gauntlet rises", () => {
  assert.equal(S.levelOf(places), 3);
  assert.equal(S.maxFor(3, 1250), 45, "Dark Ages ground is half again as strong");
  assert.equal(S.maxFor(3, 1850), 30);
  assert.equal(S.maxFor(3, 2000), 24);
  assert.ok(S.maxFor(3, 2000, 2) < S.maxFor(3, 2000), "a thicker Gauntlet thins it");
  const a = S.accrue({id: "s", places: ["c1", "n1", "f1"]}, 0, {level: 3, year: 2000});
  assert.equal(a.site.strength, 24, "a new site starts full");
  const b = S.accrue({...a.site, strength: 0}, 3 * S.WEEK + 100, {level: 3, year: 2000});
  assert.equal(b.site.strength, 15, "it wells up week by week");
});

test("every role shares the strength: below half each draw gives half, spent gives nothing", () => {
  const site = S.normSite({id: "s", places: ["c1", "n1", "f1"], elysium: {keeper: "p1"}, strength: 24, last: 0, claims: {caern: {faction: "Sept of the Oak"}, node: {faction: "The Order of Hermes"}}});
  const roles = S.rolesOf(site, places);
  assert.deepEqual(roles.map(r => r.role), ["caern", "node", "freehold", "elysium"]);
  assert.equal(S.allow(site, 24, 6).take, 6);
  let r = S.draw(site, 24, {role: "node", points: 14, rolesHere: roles.map(x => x.role)});
  assert.equal(r.site.strength, 10); assert.equal(r.crossed.key, "weak");
  assert.equal(S.allow(r.site, 24, 6).take, 3, "weak: half");
  assert.equal(S.allow({...r.site, strength: 2}, 24, 6).take, 2, "never more than it holds");
  assert.equal(S.allow({...r.site, strength: 0}, 24, 6).take, 0, "spent");
  assert.deepEqual(S.toTell(site, roles, "node").sort(), ["g1", "k1", "p1"], "the other holders are told");
  const c = S.claimsOf(site, roles);
  assert.equal(c.find(x => x.role === "caern").faction, "Sept of the Oak");
});

test("claims that draw on a weak site build a quarrel; a moot fills it a little", () => {
  let s = S.normSite({id: "s", places: ["c1", "n1"], strength: 5, last: 0}), q = [];
  for ( let i = 0; i < 3; i++ ) { const r = S.draw(s, 24, {role: "node", points: 1, rolesHere: ["caern", "node"]}); s = r.site; q.push(...r.quarrel); }
  assert.deepEqual(q, ["caern+node"]);
  s = S.settle(s, "caern+node");
  assert.equal(s.quarrel["caern+node"], undefined);
  assert.equal(S.mootGift(15), 7);
  const m = S.restore(s, 24, 7, 0, "The moot");
  assert.equal(m.site.strength, 9);
});

test("the windows and hooks are wired in", () => {
  const up = src("modules/wodx-storyteller/scripts/upkeep.mjs"), pw = src("modules/wodx-storyteller/scripts/power.mjs"), main = src("modules/wodx-storyteller/scripts/main.mjs");
  assert.match(up, /Herds\.huntDiff\(scene\)/);
  assert.match(up, /action: "herds"/);
  assert.match(up, /action: "sites"/);
  assert.match(up, /caught: !!p\?\.caught/);
  assert.match(pw, /Sites\.gate\(placeId/);
  assert.match(pw, /Sites\.onDraw\(placeId, "freehold"/);
  assert.match(pw, /Sites\.onMoot/);
  assert.match(main, /herds: Herds\.api\(\), sites: Sites\.api\(\)/);
  assert.match(main, /req\.fed/);
  for ( const f of ["herds.mjs", "sites.mjs"] ) assert.match(src(`modules/wodx-storyteller/scripts/${f}`), /searchBox|data-fixed|multiple/);
});
