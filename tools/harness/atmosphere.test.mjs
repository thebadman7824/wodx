import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync, existsSync} from "node:fs";

/*
 * WoDX Atmosphere: the weather generator, lighting from the clock and the era kits' rules, and the weather's part in
 * WoDX Senses. The gate in Foundry checks scenes, the sky setting, playlists and sounds.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const W = await import(join(root, "modules/wodx-atmosphere/scripts/weather-rules.mjs"));
const K = await import(join(root, "modules/wodx-atmosphere/scripts/kits-rules.mjs"));
const S = await import(join(root, "modules/wodx-senses/scripts/senses-rules.mjs"));
const {gregorianToJDN} = await import(join(root, "modules/wodx-chronicle/scripts/calendar-math.mjs"));
const eras = JSON.parse(readFileSync(join(root, "modules/wodx-chronicle/data/eras.json"), "utf8"));
const senses = JSON.parse(readFileSync(join(root, "modules/wodx-senses/data/world.json"), "utf8"));
const year = (seed, climate, y, fn) => { const j0 = gregorianToJDN(y, 1, 1); for ( let i = 0; i < 365; i++ ) fn(W.weatherFor(seed, climate, j0 + i), i); };

/* ---------------- the weather ---------------- */

test("the same seed, climate and night give the same weather; another seed gives other weather", () => {
  const j = gregorianToJDN(1210, 3, 3);
  assert.deepEqual(W.weatherFor("rothenstein", "central-europe", j), W.weatherFor("rothenstein", "central-europe", j));
  let differ = 0;
  for ( let i = 0; i < 30; i++ ) if ( W.weatherFor("a", "central-europe", j + i).label !== W.weatherFor("b", "central-europe", j + i).label ) differ++;
  assert.ok(differ > 10, `${differ} of 30 nights differ`);
});

test("every climate has twelve months of figures in range", () => {
  for ( const [id, c] of Object.entries(W.CLIMATES) ) {
    for ( const k of ["t", "wet", "storm", "fog"] ) assert.equal(c[k].length, 12, `${id} ${k}`);
    for ( const k of ["wet", "storm", "fog"] ) for ( const v of c[k] ) assert.ok(v >= 0 && v < 1, `${id} ${k} ${v}`);
    assert.ok(c.label && c.range > 0);
  }
  assert.equal(W.climateForRegion("americas"), "american-east");
  assert.equal(W.climateForRegion("europe"), "central-europe");
});

test("over ten years the share of wet days is close to the climate's figures", () => {
  for ( const climate of ["central-europe", "mediterranean", "desert"] ) {
    let wet = 0, n = 0, julyWet = 0, julyN = 0;
    for ( let y = 1900; y < 1910; y++ ) year("ten", climate, y, d => { n++; if ( d.precip !== "none" ) wet++; if ( d.month === 7 ) { julyN++; if ( d.precip !== "none" ) julyWet++; } });
    const want = W.CLIMATES[climate].wet.reduce((a, b) => a + b, 0) / 12;
    assert.ok(Math.abs(wet / n - want) < 0.06, `${climate}: ${(wet / n).toFixed(2)} wet, want about ${want.toFixed(2)}`);
    const wantJuly = W.CLIMATES[climate].wet[6];
    assert.ok(Math.abs(julyWet / julyN - wantJuly) < 0.12, `${climate} July ${(julyWet / julyN).toFixed(2)} want ${wantJuly}`);
  }
});

test("rain comes in spells: a wet day is followed by another more often than the month's share", () => {
  let after = 0, wetDays = 0, prev = null;
  for ( let y = 1890; y < 1896; y++ ) year("spells", "maritime-europe", y, d => { const w = d.precip !== "none"; if ( prev ) { wetDays++; if ( w ) after++; } prev = w; });
  assert.ok(after / wetDays > 0.6, `${(after / wetDays).toFixed(2)}`);
});

test("snow falls only when it is cold, never in a Mediterranean summer, and lies after cold days", () => {
  let snow = 0, lying = 0;
  for ( let y = 1200; y < 1205; y++ ) year("cold", "central-europe", y, d => {
    if ( d.precip === "snow" ) { snow++; assert.ok(Math.min(d.tempNight, (d.tempNight + d.tempDay) / 2) <= -1, `snow at ${d.tempNight}`); }
    if ( d.snowLying ) lying++;
    if ( d.month >= 6 && d.month <= 8 ) assert.notEqual(d.precip, "snow");
  });
  assert.ok(snow > 40, `${snow} snowy days in five Bohemian years`);
  assert.ok(lying > snow, "snow lies longer than it falls");
  year("cold", "mediterranean", 1950, d => { if ( d.month >= 5 && d.month <= 9 ) assert.notEqual(d.precip, "snow"); });
});

test("the eras: the Maunder low and 1816 run cold, the medieval warm spell and the future run warm", () => {
  assert.ok(W.eraShift(1680).t < W.eraShift(1600).t);
  assert.ok(W.eraShift(1600).t < W.eraShift(1900).t);
  assert.ok(W.eraShift(1220).t > W.eraShift(1500).t);
  assert.ok(W.eraShift(1816, 7).t < W.eraShift(1816, 1).t);
  assert.ok(W.eraShift(2090).t > W.eraShift(2000).t);
  assert.ok(W.eraShift(2090).storms > 1);
  const mean = y => { let s = 0; year("era", "central-europe", y, d => { s += d.mean; }); return s / 365; };
  assert.ok(mean(2080) - mean(1690) > 2, "Future Darkness is warmer than the Maunder low");
});

test("fog only on still dry nights; storms are heavy; the sky matches WoDX Actions' choices", () => {
  for ( let y = 1890; y < 1893; y++ ) year("fog", "central-europe", y, d => {
    assert.ok(W.SKIES.includes(d.sky));
    assert.ok(W.WINDS.includes(d.wind));
    if ( d.fog !== "none" ) { assert.equal(d.precip, "none"); assert.equal(d.wind, "calm"); }
    if ( d.fog === "thick" ) assert.equal(d.sky, "storm");
    if ( d.precip !== "none" ) assert.ok(["overcast", "storm"].includes(d.sky));
    if ( d.thunder ) assert.equal(d.sky, "storm");
    assert.equal(d.moonHidden, d.sky === "overcast" || d.sky === "storm");
  });
});

test("the scene effect is one of Foundry's weather effects or none", () => {
  const ok = ["", "leaves", "rain", "rainStorm", "fog", "snow", "blizzard"];
  for ( let y = 1890; y < 1892; y++ ) for ( const c of Object.keys(W.CLIMATES) ) year("fx", c, y, d => assert.ok(ok.includes(d.effect), d.effect));
  assert.equal(W.sceneEffect({precip: "snow", intensity: "heavy", fog: "none"}), "blizzard");
  assert.equal(W.sceneEffect({precip: "none", fog: "thick"}), "fog");
});

test("a night set by hand is used as it is, with its words rebuilt", () => {
  const j = gregorianToJDN(1890, 11, 5);
  const d = W.weatherFor("s", "central-europe", j, {override: {sky: "storm", precip: "none", fog: "thick", wind: "calm", tempNight: 2, tempDay: 6, thunder: false, snowLying: false, intensity: null}});
  assert.equal(d.set, true);
  assert.equal(d.fog, "thick");
  assert.ok(d.tags.includes("fog"));
  assert.match(d.label, /Thick fog/);
  assert.equal(d.effect, "fog");
});

test("the words are plain: no dashes for pauses and no gendered pronouns", () => {
  for ( const c of Object.keys(W.CLIMATES) ) year("words", c, 1900, d => {
    assert.ok(!/—|--/.test(d.label), d.label);
    assert.ok(!/\b(he|she|him|her|his|hers)\b/i.test(d.label), d.label);
    for ( const m of W.modifiers(d) ) assert.ok(!/—/.test(m.label + m.applies));
  });
});

test("weather that matters: fog for sight and the Shroud, rain for scent, snow keeps tracks, nothing indoors", () => {
  const fog = W.finish({sky: "storm", precip: "none", fog: "thick", wind: "calm", tempNight: 4, tempDay: 8, snowLying: false});
  const ids = W.modifiers(fog).map(m => `${m.id}:${m.n}`);
  assert.ok(ids.includes("sight:2") && ids.includes("shroud:-1"), ids.join());
  const rain = W.finish({sky: "overcast", precip: "rain", intensity: "heavy", fog: "none", wind: "breeze", tempNight: 8, tempDay: 12});
  assert.ok(W.modifiers(rain).some(m => m.id === "scent" && m.n === 2));
  const snow = W.finish({sky: "clear", precip: "none", fog: "none", wind: "calm", tempNight: -6, tempDay: -1, snowLying: true});
  assert.ok(W.modifiers(snow).some(m => m.id === "tracks" && m.n === -1));
  assert.equal(W.modifiers(rain, {indoor: true}).length, 0);
});

test("lighting from the clock: full day, full night, clouds darken the day, a clear full moon lightens the night", () => {
  assert.equal(W.darknessFor({altitude: 30}), 0);
  assert.equal(W.darknessFor({altitude: -30, moon: 0}), 0.9);
  assert.ok(W.darknessFor({altitude: -30, moon: 1}) < W.darknessFor({altitude: -30, moon: 1, sky: "overcast"}));
  assert.ok(W.darknessFor({altitude: 30, sky: "storm"}) > W.darknessFor({altitude: 30}));
  const dusk = W.darknessFor({altitude: -3});
  assert.ok(dusk > 0 && dusk < 0.9);
  // Prague, midsummer noon and midnight
  const j = gregorianToJDN(1900, 6, 21);
  assert.ok(W.sunAltitude(j, 12, 50.1) > 60);
  assert.ok(W.sunAltitude(j, 0, 50.1) < -10);
});

test("a year of weather takes little time to make", () => {
  const t0 = Date.now();
  year("speed", "central-europe", 1900, () => null);
  assert.ok(Date.now() - t0 < 1500, `${Date.now() - t0} ms`);
});

/* ---------------- the era kits ---------------- */

test("every era profile has a kit, and every kit chain ends in a kit with shipped cues", () => {
  const shipped = ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"];
  for ( const p of eras.profiles ) {
    const kit = K.kitFor(p);
    assert.ok(K.KITS[kit], p.id);
    const chain = K.kitChain(kit);
    assert.ok(chain.some(k => shipped.includes(k)), `${p.id} ${chain}`);
  }
  for ( const k of shipped ) for ( const cue of Object.keys(K.CUES) ) assert.ok(existsSync(join(root, `modules/wodx-atmosphere/sounds/${k}/${cue}.ogg`)), `${k}/${cue}`);
  assert.deepEqual(K.kitChain("long-night"), ["long-night", "dark-ages"]);
});

test("the kit folder's files are sorted into moods, ambience and cues", () => {
  const files = ["wodx-kits/victorian/music/calm/02%20Nocturne.ogg", "wodx-kits/victorian/music/calm/01-waltz.mp3", "wodx-kits/victorian/music/combat/a.ogg",
    "wodx-kits/victorian/music/party/x.ogg", "wodx-kits/victorian/ambience/tavern-busy.ogg", "wodx-kits/victorian/ambience/rain.ogg",
    "wodx-kits/victorian/ambience/seagulls.ogg", "wodx-kits/victorian/sounds/dawn.wav", "wodx-kits/victorian/credits.json"];
  const s = K.sortFiles("victorian", files);
  assert.deepEqual(s.music.calm, ["wodx-kits/victorian/music/calm/01-waltz.mp3", "wodx-kits/victorian/music/calm/02%20Nocturne.ogg"]);
  assert.equal(s.music.combat.length, 1);
  assert.equal(s.ambience.tavern, "wodx-kits/victorian/ambience/tavern-busy.ogg");
  assert.equal(s.ambience.rain, "wodx-kits/victorian/ambience/rain.ogg");
  assert.equal(s.cues.dawn, "wodx-kits/victorian/sounds/dawn.wav");
  assert.equal(s.other.length, 2);
  assert.equal(K.trackName("wodx-kits/x/02%20Nocturne.ogg"), "02 Nocturne");
  assert.equal(K.sortFiles("victorian", ["my-kits/victorian/music/calm/a.ogg"], "my-kits").music.calm.length, 1);
});

test("ambience: the place's loop, and out of doors the weather's", () => {
  const have = ["tavern", "street", "rain", "wind", "night"];
  assert.deepEqual(K.ambienceFor({kind: "tavern", indoor: true, tags: ["rain"]}, have), ["tavern"]);
  assert.deepEqual(K.ambienceFor({kind: "market", indoor: false, tags: ["rain", "wind"]}, have), ["street", "rain"]);
  assert.deepEqual(K.ambienceFor({kind: "wilds", indoor: false, tags: [], night: true}, have), ["night"]);
  assert.deepEqual(K.ambienceFor({kind: "wilds", indoor: false, tags: []}, []), []);
});

test("the map grade is a CSS filter, empty at no strength", () => {
  assert.equal(K.gradeCss(K.KITS.victorian.grade, 0), "");
  assert.match(K.gradeCss(K.KITS.victorian.grade), /sepia\(0\.35\)/);
  assert.match(K.gradeCss(K.KITS["long-night"].grade, 0.5), /saturate\(0\.775\)/);
  for ( const k of Object.values(K.KITS) ) assert.ok(!/NaN|undefined/.test(K.gradeCss(k.grade)));
});

test("handouts: every kind renders, text is never read as HTML, and each kit offers its own first", () => {
  for ( const id of Object.keys(K.HANDOUTS) ) {
    const h = K.renderHandout(id, {title: "A <script>", body: "One.\n\nTwo\nlines.", from: "X & Y", date: "1 May"});
    assert.ok(h.includes(`wodx-ho-${id}`));
    assert.ok(!h.includes("<script>"));
    assert.ok(h.includes("X &amp; Y"));
    assert.ok(h.includes("<p>One.</p>") && h.includes("Two<br>lines."));
  }
  for ( const [k, kit] of Object.entries(K.KITS) ) {
    for ( const h of kit.handouts ) assert.ok(K.HANDOUTS[h], `${k} ${h}`);
    assert.equal(K.handoutsFor(k)[0], kit.handouts[0]);
    assert.equal(K.handoutsFor(k).length, Object.keys(K.HANDOUTS).length);
  }
  const css = readFileSync(join(root, "modules/wodx-atmosphere/styles/wodx-atmosphere.css"), "utf8");
  for ( const id of Object.keys(K.HANDOUTS) ) assert.ok(css.includes(`.wodx-ho-${id}`), `style for ${id}`);
});

/* ---------------- the weather in WoDX Senses ---------------- */

test("Senses: weather lines show only in that weather, and rain lines wait for rain", () => {
  const TABLES = {conditions: senses.conditions};
  const base = {era: "industrial", part: "night", sky: "overcast", indoor: false, moon: "full"};
  const snowy = S.conditionLines(TABLES, "sight", {...base, wx: ["snow", "cold"]});
  assert.ok(snowy.some(l => /Snow/.test(l.t)), "snow lines");
  assert.ok(!snowy.some(l => /^Rain/.test(l.t)), "no rain lines in snow");
  const rainy = S.conditionLines(TABLES, "sight", {...base, wx: ["rain"]});
  assert.ok(rainy.some(l => /^Rain/.test(l.t)));
  // Without WoDX Atmosphere the sky alone decides, as before
  const old = S.conditionLines(TABLES, "sight", base);
  assert.ok(old.some(l => /^Rain/.test(l.t)));
  for ( const tag of ["snow", "sleet", "hail", "fog", "mist", "wind", "snow-lying", "cold", "hot", "leaves"] ) assert.ok(senses.conditions.weather[tag], tag);
});

test("Senses: fog and mist make sight harder out of doors, rain masks scent, storms drown sound", () => {
  const fog = S.difficulty("sight", {light: "bright", indoor: false, wx: ["fog"]});
  assert.equal(fog.diff, 8);
  assert.equal(S.difficulty("sight", {light: "bright", indoor: true, wx: ["fog"]}).diff, 6);
  assert.equal(S.difficulty("sight", {light: "bright", indoor: false, wx: ["mist"]}).diff, 7);
  assert.equal(S.difficulty("smell", {indoor: false, wx: ["rain", "downpour"]}).diff, 8);
  assert.equal(S.difficulty("sound", {indoor: false, wx: ["gale"]}).diff, 7);
  // Without Atmosphere, the old sky steps stand
  assert.equal(S.difficulty("sound", {indoor: false, sky: "overcast"}).diff, 7);
});

/* ---------------- the world template: Start a chronicle ---------------- */

const Setup = await import(join(root, "modules/wodx-storyteller/scripts/setup-rules.mjs"));

test("template: every era profile has a primer, and the Storyteller screen pages are plain", () => {
  for ( const p of eras.profiles ) {
    assert.ok(Setup.PRIMERS[p.id], p.id);
    const html = Setup.playerPrimer(p) + Setup.eraPage(p, {lines: ["vampire", "mage"], date: "Monday, 1 May 1890"});
    assert.ok(html.includes(p.name.replace(/&/g, "&amp;")));
  }
  const text = [Setup.ROLLS_PAGE, Setup.HEALTH_PAGE, Setup.TOOLS_PAGE, ...Object.values(Setup.PRIMERS).flatMap(p => [...p.players, ...p.storyteller])].join(" ");
  assert.ok(!/\b(he|she|him|her|his|hers|himself|herself)\b/i.test(text.replace(/<[^>]+>/g, " ")), "no gendered pronouns");
  assert.ok(!/\s—\s|--/.test(text), "no dashes for pauses");
  assert.ok(!/\bV5\b|5th edition|Second Inquisition/i.test(text), "nothing from 5th edition");
});

test("template: the group's name, and a plan that never makes a second copy", () => {
  assert.equal(Setup.groupName(["vampire"]), "The Coterie");
  assert.equal(Setup.groupName(["vampire", "werewolf"], "Rothenstein"), "The Company of Rothenstein");
  assert.equal(Setup.groupName([]), "The Company");
  const fresh = Object.fromEntries(Setup.plan({}).map(p => [p.key, p.action]));
  assert.deepEqual(fresh, {rules: "update", sessionZero: "make", screen: "make", primer: "make", group: "make"});
  const again = Object.fromEntries(Setup.plan({screen: {version: Setup.TEMPLATE_VERSION}, primer: {version: 0}, group: {id: "g"}, sessionZero: {id: "s"}}).map(p => [p.key, p.action]));
  assert.deepEqual(again, {rules: "update", sessionZero: "keep", screen: "keep", primer: "update", group: "keep"});
  for ( const id of Setup.WODX_MODULES ) assert.ok(existsSync(join(root, "modules", id, "module.json")), id);
});
