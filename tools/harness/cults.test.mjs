import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import {fileURLToPath, pathToFileURL} from "node:url";
import {dirname, join} from "node:path";

// WoDX NPC: cults and congregations that gather around a character (B3240-B3249).
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = p => readFileSync(join(root, p), "utf8");
const C = await import(pathToFileURL(join(root, "modules/wodx-npc/scripts/cult-rules.mjs")));
const DAY = 86400;
const place = {key: "Scene.s1", name: "The market"};
const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };

test("cults: words call up themes by whole words only", () => {
  assert.deepEqual(C.themesOf("Drink of my blood and be saved; the end is near."), {blood: 2, salvation: 1, doom: 1});
  assert.deepEqual(C.themesOf("An endless, bloodless sermon"), {}, "endless is not end, bloodless is not blood");
  assert.deepEqual(C.themesOf("<p>The <b>Moon</b> calls the wolves</p>"), {wild: 2});
  assert.equal(C.powerTheme("Majesty", "Presence"), "power");
  assert.equal(C.powerTheme("Mend the body", ""), "healing");
  assert.equal(C.powerTheme("Something odd", ""), "power", "an unknown power is a show of power");
});

test("cults: awe needs someone to hear, fades in a month of quiet, and forms at 10 heard by 3", () => {
  let r = C.addAwe({}, {kind: "words", place, heard: 0, themes: {blood: 1}}, 0);
  assert.equal(r.added, 0, "words nobody hears count for nothing");
  assert.equal(r.awe.places[place.key], undefined);
  r = C.addAwe({}, {kind: "power", place, heard: 2, themes: {power: 2}}, 0);
  assert.equal(r.place.pts, 3); assert.equal(r.place.touched, 2);
  assert.equal(C.readiness(r.place, 0), "", "two people are not a following");
  r = C.addAwe(r.awe, {kind: "sermon", place, heard: 4, pts: 4, themes: {salvation: 1}}, DAY);
  assert.equal(r.place.pts, 7); assert.equal(C.readiness(r.place, DAY), "ask", "the founder may ask from 5");
  r = C.addAwe(r.awe, {kind: "power", place, heard: 1}, 2 * DAY);
  assert.equal(C.readiness(r.place, 2 * DAY), "form");
  const later = C.faded(r.place, 2 * DAY + 31 * DAY);
  assert.equal(later.pts, 5, "half after 30 quiet days");
  assert.equal(C.readiness(later, 2 * DAY + 31 * DAY), "ask");
  assert.equal(C.faded(r.place, 2 * DAY + 61 * DAY).pts, 2.5);
});

test("cults: the doctrine is the three strongest themes, the line's favourites breaking ties, and reads as a creed", () => {
  assert.deepEqual(C.doctrineOf({doom: 3, blood: 3, wealth: 1, power: 2}, "blood"), ["blood", "doom", "power"]);
  assert.deepEqual(C.doctrineOf({dead: 1, beauty: 1}, "netaru"), ["dead", "beauty"]);
  const creed = C.creedText(["blood", "undying"], "Anna");
  assert.match(creed, /^They believe the blood is holy and Anna its vessel; that Anna holds the secret/);
  assert.match(C.creedText([], "Anna"), /more than a person/);
});

test("cults: each line has its own kind, words by era and book sizes", () => {
  const lines = {vampire: "blood", mummy: "netaru", demon: "thralls", changeling: "dreamers", wraith: "remembrance", mage: "cult", werewolf: "oldfaith", "kuei-jin": "kuei", hunter: "flock", mortal: "sect"};
  for ( const [line, kind] of Object.entries(lines) ) assert.equal(C.kindForLine(line), kind, line);
  assert.equal(C.kindForLine("werewolf", {wyrm: true}), "wyrm");
  assert.equal(C.CULT_KINDS.netaru.label, "Netaru");
  assert.equal(C.CULT_KINDS.blood.word(1300), "a cult of the Blood"); assert.equal(C.CULT_KINDS.blood.word(1890), "a blood cult");
  assert.equal(C.CULT_KINDS.sect.word(1400), "a heresy"); assert.equal(C.CULT_KINDS.sect.word(1990), "a cult");
  // V20 p. 114 Herd: 3, 7, 15, 30, 60
  assert.deepEqual([2, 3, 7, 14, 15, 30, 60, 500].map(m => C.dotsFor("blood", m)), [0, 1, 2, 2, 3, 4, 5, 5]);
  // M20 p. 310 Cult: 3-7, 8-12, 13-17, 18-22, 23-30
  assert.deepEqual([3, 8, 13, 18, 23].map(m => C.dotsFor("cult", m)), [1, 2, 3, 4, 5]);
  // C20 p. 169 Dreamers: 1, 2, 4, 6, 8
  assert.deepEqual([1, 3, 4, 8].map(m => C.dotsFor("dreamers", m)), [1, 2, 3, 5]);
  // Demon p. 155 Followers: counted by the inner circle
  assert.equal(C.dotsFor("thralls", 200, 0), 0); assert.equal(C.dotsFor("thralls", 30, 3), 3);
  for ( const [k, v] of Object.entries(C.CULT_KINDS) ) { assert.equal(v.sizes.length, 5, k); assert.ok(v.ref, k); assert.match(v.gives(2), /\S/, k); }
});

test("cults: a new cult starts from the people who were touched, with their doctrine", () => {
  const p = C.normPlace({key: place.key, name: place.name, pts: 11, touched: 6, themes: {blood: 4, undying: 2}});
  const c = C.newCult({id: "c1", founder: {id: "a1", name: "Anna Kral"}, kind: "blood", place, awePlace: p, now: 100, year: 1400});
  assert.equal(c.members, 6); assert.equal(c.devotion, 2); assert.equal(c.secret, true); assert.equal(c.exposure, 0);
  assert.equal(c.name, "Blood cult of Anna");
  assert.match(c.log[0].text, /a cult of the Blood gathers around Anna Kral at The market/);
  assert.equal(C.newCult({id: "c2", founder: {id: "m", name: "Khem"}, kind: "netaru", place, awePlace: p}).name, "The Netaru of Khem");
});

test("cults: the weekly turn grows a tended cult, wears down a neglected one, and keeps to the size of the place", () => {
  let c = C.normCult({id: "c", kind: "cult", members: 10, devotion: 2, founder: {id: "a", name: "A"}, place});
  let r = C.cultTurn(c, {now: 7 * DAY, year: 1990, rand: () => 0.99, attention: 4});
  assert.equal(r.cult.devotion, 3, "tended faith rises");
  assert.ok(r.cult.members > 10, "and it grows");
  // Neglect: four quiet weeks, a step of devotion
  c = C.normCult({...c, devotion: 2});
  for ( let i = 0; i < 4; i++ ) c = C.cultTurn(c, {now: (i + 1) * 7 * DAY, year: 1990, rand: () => 0.99}).cult;
  assert.equal(c.devotion, 1);
  r = C.cultTurn(c, {now: 40 * DAY, year: 1990, rand: () => 0.99});
  assert.ok(r.cult.members < c.members, "low devotion, people drift away");
  // A medieval town keeps a cult small
  const big = C.normCult({id: "b", kind: "blood", members: 39, devotion: 5, place});
  assert.equal(C.cultTurn(big, {year: 1300, rand: () => 0.99, attention: 5}).cult.members, 40);
  assert.equal(C.capFor(1300), 40); assert.equal(C.capFor(1990), 600); assert.equal(C.capFor(1990, 2000), 100);
  // A founder gone wears it down twice as fast
  let g = C.normCult({id: "g", kind: "sect", members: 20, devotion: 3, place});
  for ( let i = 0; i < 2; i++ ) g = C.cultTurn(g, {year: 1600, rand: () => 0.99, founderGone: true}).cult;
  assert.equal(g.devotion, 2);
});

test("cults: notice grows by size and openness; crossing into 'someone moves' is big, a failing big cult may split", () => {
  const open = C.normCult({id: "o", kind: "sect", members: 60, devotion: 3, exposure: 9, secret: false, band: "watched", place});
  const r = C.cultTurn(open, {year: 1700, rand: () => 0.1});
  assert.equal(r.cult.exposure, 10);
  assert.ok(r.events.some(e => e.kind === "band" && e.band === "moved" && e.big));
  assert.equal(C.bandOf(4).key, "talk"); assert.equal(C.bandOf(7).key, "watched"); assert.equal(C.bandOf(3).key, "hidden");
  const weak = C.normCult({id: "w", kind: "sect", members: 30, devotion: 1, exposure: 0, place});
  const s = C.cultTurn(weak, {year: 1700, rand: seq([0.99, 0.1])});
  assert.ok(s.events.some(e => e.kind === "split" && e.big));
  const parts = C.split(weak, {id: "w2", now: 5});
  assert.equal(parts.rest.members + parts.rival.members, 30); assert.equal(parts.rival.parent, "w"); assert.equal(parts.rest.devotion, 0);
  const raid = C.raided(open, {now: 9});
  assert.equal(raid.members, 30); assert.equal(raid.exposure, 5); assert.equal(raid.devotion, 2);
});

test("cults: initiation and ordination, one in the inner circle for every ten", () => {
  let c = C.normCult({id: "c", kind: "thralls", members: 12, place});
  assert.equal(C.innerRoom(12), 1); assert.equal(C.innerRoom(2), 0); assert.equal(C.innerRoom(35), 3);
  c = C.ordain(c, {id: "n1", name: "Petr"});
  assert.equal(c.named[0].rank, "ordained"); assert.equal(c.ordained, 1);
  assert.equal(C.ordain(c, {id: "n2", name: "Jana"}), null, "no room for a second");
  c = C.ordain(c, {id: "n2", name: "Jana"}, "initiate");
  assert.equal(c.named.length, 2);
  assert.equal(C.summary(c, 2000).dots, 1, "Demon Followers count the inner circle");
});

test("cults: long skips keep an undying founder's cult and end a forgotten one", () => {
  const c = C.normCult({id: "c", kind: "sect", members: 40, devotion: 3, place});
  const gone = C.quietYears(c, 52 * 30, {founderGone: true, now: 1});
  assert.ok(gone.ended, "a mortal founder gone thirty years: faded away");
  const kept = C.quietYears({...c, kind: "blood"}, 52 * 30, {undying: true, now: 1});
  assert.equal(kept.ended, null); assert.equal(kept.devotion, 1);
  assert.deepEqual(C.turnsDue(0, 100 * 7 * DAY), {due: 0, quiet: 0});
  assert.deepEqual(C.turnsDue(1, 1 + 100 * 7 * DAY), {due: 12, quiet: 88});
});

test("cults: which NPCs gather cults by themselves", () => {
  assert.equal(C.npcCultKind("Vampire Followers of Set")?.kind, "blood");
  assert.equal(C.npcCultKind("Demon Devil Namaru")?.kind, "thralls");
  assert.equal(C.npcCultKind("Werewolf Black Spiral Dancers")?.kind, "wyrm");
  assert.equal(C.npcCultKind("Mage Cult of Ecstasy")?.kind, "cult");
  assert.equal(C.npcCultKind("Mortal wandering preacher")?.kind, "sect");
  assert.equal(C.npcCultKind("Vampire Tzimisce", 1300)?.kind, "blood");
  assert.equal(C.npcCultKind("Vampire Tzimisce", 1700), null, "the Fiends' serf-faith is a Dark Ages trait");
  assert.equal(C.npcCultKind("Vampire Ventrue"), null);
});

test("cults: the Foundry side is wired, off by default, and players act by socket", () => {
  const main = src("modules/wodx-npc/scripts/main.mjs"), cults = src("modules/wodx-npc/scripts/cults.mjs");
  assert.match(main, /buildCults\(/); assert.match(main, /cults\.registerSettings\(\)/); assert.match(main, /cults\.registerHandler\(\)/);
  assert.match(main, /openCults: cults\.open/); assert.match(main, /tokens\.tools\.wodxCults/);
  assert.match(cults, /"cultsOn", \{[^}]*default: false/);
  for ( const h of ["createChatMessage", "wodxPowerShown", "wodxBreach", "wodxFed", "wodxSocial", "wodxSkipEnd", "updateWorldTime"] ) assert.match(cults, new RegExp(`Hooks\\.on\\("${h}"`), h);
  for ( const t of ["cult.preach", "cult.gather", "cult.ask"] ) assert.match(cults, new RegExp(`"${t.replace(".", "\\.")}"`), t);
  assert.match(cults, /Hooks\.callAll\("wodxCultNoticed"/);
  assert.match(cults, /testUserPermission\(u, "OWNER"\)/, "a player acts only for their own character");
});

test("cults: awe keyed by scene uuid survives the flag (stored as a list, keyed again on reading)", () => {
  const r = C.addAwe({}, {kind: "power", place: {key: "Scene.abc123", name: "Market"}, heard: 3, themes: {healing: 2}}, 1000);
  const stored = {v: r.awe.v, places: Object.values(r.awe.places)};
  // What a Foundry flag update does to dotted keys: "Scene.abc123" becomes {Scene: {abc123: ...}}; a list has none
  assert.ok(JSON.stringify(Object.keys(stored)).indexOf(".") < 0);
  const back = C.normAwe(JSON.parse(JSON.stringify(stored)));
  assert.equal(back.places["Scene.abc123"]?.pts, 3);
  assert.equal(back.places["Scene.abc123"]?.touched, 3);
  const cults = src("modules/wodx-npc/scripts/cults.mjs");
  assert.doesNotMatch(cults, /setFlag\(MOD, "awe", (res\.awe|awe)\)/, "awe goes through saveAwe, never as a keyed object");
});
