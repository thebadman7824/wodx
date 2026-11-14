import "./win-paths.mjs";
import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const T = await import(join(root, "modules/wodx-chronicle/scripts/player-tools.mjs"));

test("player interface: every screen part has a unique key, a label and selectors", () => {
  const keys = T.UI_PARTS.map(p => p.key);
  assert.equal(new Set(keys).size, keys.length);
  for ( const p of T.UI_PARTS ) {
    assert.ok(p.label);
    assert.ok(T.partSelectors(p).length > 0, p.key);
  }
});

test("player interface: chat, settings, notifications, the controls and the X-card can never be hidden", () => {
  const all = T.UI_PARTS.flatMap(p => T.partSelectors(p)).join(" ");
  for ( const bad of ["chat", "settings", "#notifications", "#scene-controls", "#ui-left", "#sidebar,", "wodxXCard"] ) assert.ok(!all.includes(bad), bad);
  assert.ok(!T.UI_PARTS.some(p => ["chat", "settings"].includes(p.tab)));
  assert.match(T.UI_KEPT, /Chat.*Settings.*notifications.*scene controls.*X-card/);
});

test("player interface: a part is hidden only for the player it was hidden for, and never for the Storyteller", () => {
  const ui = {u1: {hotbar: false, journal: false, actors: true}, u2: {}};
  assert.deepEqual(T.uiHidden(ui, "u1"), ["hotbar", "journal"]);
  assert.deepEqual(T.uiHidden(ui, "u2"), []);
  assert.deepEqual(T.uiHidden(ui, "u3"), []);
  assert.deepEqual(T.uiHidden(ui, "u1", true), []);
  assert.deepEqual(T.uiHidden(null, "u1"), []);
});

test("player interface: only unticked parts are saved", () => {
  const ticks = {u1: Object.fromEntries(T.UI_PARTS.map(p => [p.key, p.key !== "nav"])), u2: Object.fromEntries(T.UI_PARTS.map(p => [p.key, true]))};
  assert.deepEqual(T.uiFromTicks(ticks), {u1: {nav: false}});
  assert.deepEqual(T.uiFromTicks({}), {});
});

test("player interface: the style sheet has one hiding rule per part, tied to its body class", () => {
  const css = T.uiCss();
  const rules = css.split("\n");
  assert.equal(rules.length, T.UI_PARTS.length);
  for ( const p of T.UI_PARTS ) {
    const r = rules.find(x => x.includes(`body.${T.uiClass(p.key)} `));
    assert.ok(r && r.endsWith("{ display: none !important; }"), p.key);
  }
  assert.ok(css.includes('body.wodx-ui-no-journal #sidebar-tabs [data-tab="journal"]'));
});
