import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

/* B6414: the archive of the dead by itself, and links that follow */
const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const AR = await import(join(root, "modules/wodx-creation/scripts/archive-rules.mjs"));

test("due: dead or kept long enough, never when the setting is off or the actor must stay", () => {
  assert.equal(AR.due({kind: "dead"}, {diedYear: 1190, nowYear: 1200, years: 10}), true);
  assert.equal(AR.due({kind: "dead"}, {diedYear: 1191, nowYear: 1200, years: 10}), false);
  assert.equal(AR.due({kind: "dead"}, {diedYear: 1100, nowYear: 1200, years: 0}), false);
  assert.equal(AR.due({kind: "dead", stay: "a player's character"}, {diedYear: 1100, nowYear: 1200, years: 10}), false);
  assert.equal(AR.due({kind: "dead"}, {diedYear: null, nowYear: 1200, years: 1}), false);
  assert.equal(AR.due({kind: "copy"}, {copyYear: 1195, nowYear: 1200, years: 5}), true);
  assert.equal(AR.due({kind: "copy"}, {copyYear: null, diedYear: 1100, nowYear: 1200, years: 5}), false);
  assert.equal(AR.AUTO_YEARS[AR.AUTO_DEFAULT] !== undefined, true);
});

test("relink: world links go to the archive and come back", () => {
  const id = "abcdefghijklmnop";
  const t = `<p>@UUID[Actor.${id}]{Old Hans} and @Actor[${id}] and <a data-uuid="Actor.${id}">x</a>, not @UUID[Actor.zzzzzzzzzzzzzzzz]</p>`;
  const there = AR.relink(t, [id], true);
  assert.ok(!there.includes(`@UUID[Actor.${id}]`) && !there.includes(`@Actor[${id}]`));
  assert.equal(there.split(`Compendium.world.wodx-archive.Actor.${id}`).length - 1, 3);
  assert.ok(there.includes("@UUID[Actor.zzzzzzzzzzzzzzzz]"));
  const back = AR.relink(there, [id], false);
  assert.ok(back.includes(`@UUID[Actor.${id}]{Old Hans}`) && back.includes(`data-uuid="Actor.${id}"`));
  assert.equal(AR.relink("nothing here", [id], true), "nothing here");
});

test("B6770: links in a character's bio boxes and an item's text follow the actor too", () => {
  const id = "abcdefghijklmnop";
  const actor = {system: {notes: `<p>Owes @UUID[Actor.${id}]{Old Hans} a debt</p>`, appearance: "plain", bio: {background: `@Actor[${id}]`}}};
  const up = AR.relinkFields(actor, AR.ACTOR_TEXT, [id], true);
  assert.equal(up["system.notes"], `<p>Owes @UUID[Compendium.world.wodx-archive.Actor.${id}]{Old Hans} a debt</p>`);
  assert.equal(up["system.bio.background"], `@UUID[Compendium.world.wodx-archive.Actor.${id}]`);
  assert.equal("system.appearance" in up, false);
  const item = {system: {description: `<p>A ring from @UUID[Compendium.world.wodx-archive.Actor.${id}]{Old Hans}</p>`}};
  assert.equal(AR.relinkFields(item, AR.ITEM_TEXT, [id], false)["system.description"], `<p>A ring from @UUID[Actor.${id}]{Old Hans}</p>`);
  assert.equal(AR.relinkFields({system: {notes: "nothing"}}, AR.ACTOR_TEXT, [id], true), null);
  assert.ok(AR.ACTOR_TEXT.includes("system.notes") && AR.ITEM_TEXT.includes("system.description"));
});

test("one look a day", () => {
  assert.equal(AR.newDay(0, 3600), false);
  assert.equal(AR.newDay(0, 86400), true);
});
