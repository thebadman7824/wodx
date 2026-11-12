// WoDX Creation 0.9.0: revenant birth, the Chrysalis, a Fallen in a host, the Second Breath (pure rules).
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import * as SR from "../../modules/wodx-creation/scripts/states-rules.mjs";

test("revenant: Potence 1 and one family Discipline, or two family Disciplines", () => {
  const a = SR.revenantStart({family: "grimaldi"});
  assert.deepEqual(a.disciplines, {potence: 1, celerity: 1});
  assert.deepEqual(a.blood, {max: 10, start: 1, perNight: 1});
  const b = SR.revenantStart({family: "grimaldi", way: "alternate", picks: ["fortitude", "dominate"]});
  assert.deepEqual(b.disciplines, {fortitude: 1, dominate: 1});
  const c = SR.revenantStart({family: "enrathi", picks: ["potence"]});
  assert.deepEqual(c.disciplines, {potence: 2}, "a family with Potence may take a second dot of it");
  const d = SR.revenantStart({family: "zantosa", picks: ["celerity"]});
  assert.equal(d.errors.length, 1);
  assert.ok(!("celerity" in d.disciplines));
  assert.equal(SR.revenantStart({family: "nobody"}).errors.length, 1);
  assert.equal(Object.keys(SR.FAMILIES).length, 12);
  for ( const f of Object.values(SR.FAMILIES) ) { assert.equal(f.disciplines.length, 3); assert.match(f.page, /pdf \d+ \/ printed \d+/); }
});

test("Chrysalis: Willpower 4, Glamour 4, Banality 3 and the seeming's step", () => {
  assert.deepEqual(SR.chrysalisStart({willpower: 2}), {willpower: 4, glamour: 5, banality: 3, arts: 3, realms: 5, seeming: "childling"});
  assert.equal(SR.chrysalisStart({seeming: "grump"}).willpower, 5);
  assert.equal(SR.chrysalisStart({seeming: "grump"}).glamour, 4);
  assert.equal(SR.chrysalisStart({seeming: "wilder", wilder: "willpower"}).willpower, 5);
  assert.equal(SR.chrysalisStart({seeming: "wilder"}).glamour, 5);
  assert.equal(SR.chrysalisStart({willpower: 7, seeming: "grump"}).willpower, 8, "a higher mortal Willpower stays");
});

test("Fallen: Faith 3, Torment by House, Virtues from the host, Willpower the two highest", () => {
  const f = SR.fallenStart({house: "devourers", conscience: 4, courage: 2});
  assert.equal(f.faith, 3); assert.equal(f.torment, 4);
  assert.deepEqual(f.virtues, {conscience: 3, conviction: 1, courage: 2});
  assert.equal(f.willpower, 5);
  assert.equal(SR.fallenStart({house: "fiends"}).torment, 3);
  assert.equal(SR.fallenWillpower({conscience: 2, conviction: 4, courage: 3}), 7);
  assert.equal(Object.keys(SR.HOUSES).length, 7);
});

test("a new host: difficulty by the body; a willing thrall needs no roll", () => {
  assert.deepEqual(SR.possession("willing"), {taken: true, successes: null, botch: false, diff: null});
  assert.equal(SR.possession("ordinary", [8, 3, 2]).taken, true);
  assert.equal(SR.possession("ordinary", [7, 7, 7]).taken, false);
  assert.equal(SR.possession("thrall", [6, 1]).taken, false, "a 1 cancels");
  assert.equal(SR.possession("object", [1, 3]).botch, true);
  assert.equal(SR.possession("attuned", [6]).diff, 6);
});

test("Second Breath: Yin 1, Yang 1, Hun 1, P'o 3, Dharma 1, Willpower 5 to Hun + 5", () => {
  const s = SR.secondBreathStart({willpower: 3});
  assert.equal(s.willpower, 5); assert.equal(s.willpowerMost, 6);
  assert.deepEqual([s.yin, s.yang, s.hun, s.po, s.dharma], [1, 1, 1, 3, 1]);
  assert.equal(SR.secondBreathStart({willpower: 9}).willpower, 6);
});

test("the four wizards are wired into the Creation window and the api", () => {
  const apps = readFileSync(new URL("../../modules/wodx-creation/scripts/apps.mjs", import.meta.url), "utf8");
  const main = readFileSync(new URL("../../modules/wodx-creation/scripts/main.mjs", import.meta.url), "utf8");
  const states = readFileSync(new URL("../../modules/wodx-creation/scripts/states.mjs", import.meta.url), "utf8");
  for ( const a of ["revenant", "chrysalis", "fallen", "possess", "secondBreath"] ) assert.match(apps, new RegExp(`data-action="${a}"`));
  for ( const f of ["revenantBirth", "chrysalis", "fallenHost", "possess", "secondBreath"] ) assert.match(main, new RegExp(`${f}: states\\.${f}`));
  // Every growable list in the new dialogs has a search box; fixed ones are marked
  const dlg = states.slice(states.indexOf("The four dialogs"));
  for ( const sel of dlg.match(/<select name="[^"]+"[^>]*>/g) ) {
    const name = sel.match(/name="([^"]+)"/)[1];
    assert.ok(/data-fixed/.test(sel) || dlg.includes(`select[name=${name}]`), `select ${name} needs a search box or data-fixed`);
  }
  assert.equal(JSON.parse(readFileSync(new URL("../../modules/wodx-creation/module.json", import.meta.url), "utf8")).version, "0.10.4");
});
