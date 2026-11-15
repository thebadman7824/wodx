import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {readFileSync, existsSync} from "node:fs";

/*
 * Recorded cues (B6260-B6264): the kit folders' faith and common cues, the lookup that keeps the generated ones as the
 * fallback, and the Freesound fetch tool's licence checks.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const K = await import(join(root, "modules/wodx-atmosphere/scripts/kits-rules.mjs"));
const F = await import(join(root, "tools/atmosphere/fetch-cues.mjs"));

test("a kit folder's faith cues and the common folder's heartbeat are sorted as cues", () => {
  const s = K.sortFiles("dark-ages", ["wodx-kits/dark-ages/sounds/dawn.ogg", "wodx-kits/dark-ages/sounds/dawn-islamic.ogg",
    "wodx-kits/dark-ages/sounds/dusk-orthodox.ogg", "wodx-kits/dark-ages/sounds/dawn-martian.ogg", "wodx-kits/dark-ages/sounds/heart.ogg"]);
  assert.equal(s.cues.dawn, "wodx-kits/dark-ages/sounds/dawn.ogg");
  assert.equal(s.cues["dawn-islamic"], "wodx-kits/dark-ages/sounds/dawn-islamic.ogg");
  assert.equal(s.cues["dusk-orthodox"], "wodx-kits/dark-ages/sounds/dusk-orthodox.ogg");
  assert.equal(s.cues["dawn-martian"], undefined);
  assert.ok(s.other.includes("wodx-kits/dark-ages/sounds/dawn-martian.ogg"));
  const c = K.sortFiles("common", ["wodx-kits/common/sounds/heart.ogg", "wodx-kits/common/sounds/birds.ogg"]);
  assert.deepEqual(c.cues, {heart: "wodx-kits/common/sounds/heart.ogg", birds: "wodx-kits/common/sounds/birds.ogg"});
});

test("the land's faith cue wins, then the kit's own, then the common folder, else null (the generated cue plays)", () => {
  const idx = {"dark-ages": {cues: {dawn: "da/dawn.ogg", "dawn-islamic": "da/dawn-islamic.ogg"}}, "long-night": {cues: {dawn: "ln/dawn.ogg"}},
    common: {cues: {birds: "c/birds.ogg", heart: "c/heart.ogg"}}};
  const chain = K.kitChain("long-night");
  assert.equal(K.cueFile(idx, chain, "dawn", "western"), "ln/dawn.ogg");
  assert.equal(K.cueFile(idx, chain, "dawn", "islamic"), "da/dawn-islamic.ogg");
  assert.equal(K.cueFile(idx, chain, "dawn", "hindu"), "ln/dawn.ogg");
  assert.equal(K.cueFile(idx, chain, "birds", "islamic"), "c/birds.ogg");
  assert.equal(K.cueFile(idx, K.kitChain("victorian"), "dusk", null), null);
  assert.equal(K.cueFile({}, chain, "dawn", "islamic"), null);
  assert.deepEqual(K.cueKeys("dusk", "own"), ["dusk"]);
});

test("the generated cues stay in the module as the fallback", () => {
  for ( const k of ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"] )
    for ( const c of ["dawn", "dusk", "notice"] ) assert.ok(existsSync(join(root, `modules/wodx-atmosphere/sounds/${k}/${c}.ogg`)), `${k}/${c}`);
  for ( const c of ["birds", "cock"] ) assert.ok(existsSync(join(root, `modules/wodx-atmosphere/sounds/common/${c}.ogg`)));
  const main = readFileSync(join(root, "modules/wodx-atmosphere/scripts/main.mjs"), "utf8");
  assert.match(main, /thump\(heart\.ctx/, "the generated heartbeat stays as the fallback");
});

test("only CC0 and CC BY are taken from Freesound", () => {
  assert.equal(F.licenseOf("http://creativecommons.org/publicdomain/zero/1.0/"), "CC0 1.0");
  assert.equal(F.licenseOf("https://creativecommons.org/licenses/by/4.0/"), "CC BY 4.0");
  assert.equal(F.licenseOf("https://creativecommons.org/licenses/by/3.0/"), "CC BY 3.0");
  assert.equal(F.licenseOf("https://creativecommons.org/licenses/by-nc/4.0/"), null);
  assert.equal(F.licenseOf("https://creativecommons.org/licenses/sampling+/1.0/"), null);
});

test("a Freesound page gives its author, title, licence and preview; a page with two licences is refused", () => {
  const html = `<html><head><title>Freesound - Rooster, Crowing, A.wav by InspectorJ</title>
    <meta property="og:title" content="Rooster, Crowing, A.wav by InspectorJ" />
    <meta property="og:url" content="https://freesound.org/people/InspectorJ/sounds/384188/" />
    <meta property="og:audio" content="https://cdn.freesound.org/previews/384/384188_5121236-hq.mp3" /></head>
    <body><a href="http://creativecommons.org/licenses/by/4.0/">Attribution 4.0</a></body></html>`;
  const p = F.parseSoundPage(html, "https://freesound.org/s/384188/");
  assert.equal(p.id, 384188);
  assert.equal(p.author, "InspectorJ");
  assert.equal(p.title, "Rooster, Crowing, A.wav");
  assert.equal(p.license, "CC BY 4.0");
  assert.equal(p.preview, "https://cdn.freesound.org/previews/384/384188_5121236-hq.ogg");
  const two = F.parseSoundPage(html.replace("</body>", `<a href="https://creativecommons.org/licenses/by-nc/4.0/">x</a></body>`));
  assert.equal(two.license, null);
  const c = F.creditFor(p, 5);
  assert.match(c.credit, /^"Rooster, Crowing, A\.wav" by InspectorJ \(freesound\.org\), CC BY 4\.0; cut to 5 s/);
  assert.equal(c.tool, "fetch-cues");
});

test("the manifest names only known kits, cues and faiths, every cue of every shipped kit, and no file twice", () => {
  const m = JSON.parse(readFileSync(join(root, "tools/atmosphere/real-cues.json"), "utf8"));
  const jobs = F.expand(m);
  const dests = jobs.map(j => j.dest);
  assert.equal(new Set(dests).size, dests.length);
  for ( const k of ["dark-ages", "long-night", "renaissance", "victorian", "wild-west", "great-war", "modern", "future-darkness"] )
    for ( const c of ["dawn", "dusk", "notice"] ) assert.ok(dests.includes(`${k}/sounds/${c}.ogg`), `${k}/${c}`);
  for ( const c of ["birds", "cock", "heart"] ) assert.ok(dests.includes(`common/sounds/${c}.ogg`));
  assert.deepEqual(F.FAITHS, K.CUE_FAITHS);
  for ( const j of jobs ) {
    assert.ok(j.ids.length && j.ids.every(Number.isInteger), j.dest);
    assert.ok(j.len > 0 && j.len <= 10, j.dest);
    assert.ok(K.KITS[j.kit] || j.kit === K.COMMON_KIT, j.dest);
  }
  assert.throws(() => F.destFor("victorian", "heart"));
  assert.match(F.filterFor(5), /atrim=0:5,afade=t=out:st=3\.75:d=1\.25/);
});
