import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as PR from "../../modules/wodx-atmosphere/scripts/print-rules.mjs";
import * as K from "../../modules/wodx-atmosphere/scripts/kits-rules.mjs";

/* WoDX Atmosphere 0.9.0: printable props. */
test("a journal prints each page on its own sheet, handouts without an extra heading, pictures as images", () => {
  const ho = K.renderHandout("notice", {title: "Plague", body: "Stay within."});
  const html = PR.journalDoc({title: "Rothenstein notices", base: "https://wodx.test/", styles: ["modules/wodx-atmosphere/styles/wodx-atmosphere.css"],
    pages: [{name: "Plague notice", type: "text", html: ho}, {name: "Map of the walls", type: "image", src: "maps/walls.webp"}, {name: "Empty", type: "text", html: ""},
      {name: "Notes", type: "text", html: "<p>Third <b>page</b></p>"}]});
  assert.match(html, /^<!doctype html>/);
  assert.match(html, /<base href="https:\/\/wodx\.test\/">/);
  assert.match(html, /<link rel="stylesheet" href="modules\/wodx-atmosphere\/styles\/wodx-atmosphere\.css">/);
  assert.equal((html.match(/class="wodx-print-page"/g) ?? []).length, 3);
  assert.ok(!html.includes("<h1>Plague notice</h1>"));
  assert.match(html, /<h1>Map of the walls<\/h1><div class="wodx-print-map"><img src="maps\/walls\.webp"/);
  assert.match(html, /<h1>Notes<\/h1><p>Third <b>page<\/b><\/p>/);
  assert.match(html, /print-color-adjust: exact/);
  assert.match(PR.journalDoc({title: "Blank <x>"}), /Blank &lt;x&gt;: nothing to print/);
});
test("a map prints across the sheet when wider than tall, and says so when there is no picture", () => {
  const wide = PR.mapDoc({title: "Rothenstein by night", src: "maps/town.webp", width: 4000, height: 3000});
  assert.match(wide, /@page \{ size: landscape; \}/);
  assert.match(wide, /<img src="maps\/town\.webp" alt="Rothenstein by night"><p>Rothenstein by night<\/p>/);
  assert.match(PR.mapDoc({title: "Tower", src: "t.webp", width: 1000, height: 3000}), /size: portrait/);
  assert.match(PR.mapDoc({title: "Nothing"}), /Nothing has no map picture to print/);
  assert.equal(PR.landscape(2, 1), true);
  assert.equal(PR.landscape(1, 1), false);
});
test("era font rules get absolute urls; data and web urls are left alone; style tags in fonts are cut", () => {
  const css = `@font-face { font-family: "WX Uncial"; src: url("../fonts/uncial.woff2") format("woff2"), url(data:font/woff2;base64,AAA) format("woff2"); }`;
  const out = PR.absoluteUrls(css, "https://wodx.test/modules/wodx-chronicle/styles/wodx-theme.css");
  assert.match(out, /url\("https:\/\/wodx\.test\/modules\/wodx-chronicle\/fonts\/uncial\.woff2"\)/);
  assert.match(out, /url\(data:font\/woff2;base64,AAA\)/);
  assert.equal(PR.absoluteUrls("url(x.woff)", ""), "url(x.woff)");
  assert.ok(!PR.journalDoc({fonts: "a</style><script>", pages: [{html: "<p>x</p>"}]}).includes("</style><script>"));
});
test("printing is wired: a journal header button, the journal and scene menus, the api, Storyteller only", () => {
  const main = readFileSync(new URL("../../modules/wodx-atmosphere/scripts/main.mjs", import.meta.url), "utf8");
  assert.match(main, /Hooks\.on\("getHeaderControlsJournalEntrySheet"[\s\S]{0,120}game\.user\.isGM/);
  assert.match(main, /Hooks\.on\("getSceneContextOptions"/);
  assert.match(main, /Hooks\.on\("getJournalEntryContextOptions"/);
  assert.match(main, /print: \{journal: printJournal, scene: printScene/);
  assert.match(main, /secrets: false/);
});
