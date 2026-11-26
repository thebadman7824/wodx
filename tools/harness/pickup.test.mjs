// Desk pick inv3 (26 Nov): Drop and Pick up on the sheet, and a simple icon for each kind of thing in a pile (loose-rules.mjs)
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const L = await import(join(root, "modules/wodx-rules/interactables/loose-rules.mjs"));

test("each kind of thing has its own icon", () => {
  assert.equal(L.iconOf({type: "Melee Weapon", name: "Sword"}), "weapon");
  assert.equal(L.iconOf({type: "Armor", name: "Mail"}), "armor");
  assert.equal(L.iconOf({kind: "cloth", name: "Wool tunic"}), "clothing");
  assert.equal(L.iconOf({name: "Silver pennies (7)"}), "coin");
  assert.equal(L.iconOf({kind: "food", name: "Bread"}), "food");
  assert.equal(L.iconOf({kind: "tools", name: "Hammer"}), "tool");
  assert.equal(L.iconOf({name: "Something odd"}), "other");
  for ( const k of L.ICON_KINDS ) {
    assert.equal(L.ICONS[k].length, 8, k);
    assert.ok(L.ICONS[k].every(l => l.length === 8 && /^[#.]+$/.test(l)), k);
    assert.ok(Number.isInteger(L.ICON_COLOURS[k]), k);
  }
});

test("a pile shows one icon a kind, the commonest first, at most four, inside its square", () => {
  const rows = [{type: "Melee Weapon", name: "Knife"}, {kind: "cloth", name: "Hose"}, {kind: "cloth", name: "Shoes"},
    {kind: "food", name: "Bread"}, {kind: "tools", name: "Awl"}, {name: "Silver pennies (3)"}];
  const ic = L.iconsOf(rows, 100);
  assert.equal(ic.length, 4);
  assert.equal(ic[0].kind, "clothing");
  assert.equal(ic[0].count, 2);
  for ( const i of ic ) for ( const [cx, cy] of i.cells ) {
    const x = i.x + cx * i.px, y = i.y + cy * i.px;
    assert.ok(x >= 0 && y >= 0 && x + i.px <= 100 && y + i.px <= 100);
  }
  assert.equal(L.iconsOf([{type: "Armor", name: "Mail"}], 100).length, 1);
  assert.deepEqual(L.iconsOf([], 100), []);
});

test("picking up some things leaves the rest, each as the item it was", () => {
  const f = L.pileFlags([{name: "Knife", data: {name: "Knife", type: "Melee Weapon", system: {damage: 1}}}, {name: "Bread", data: {name: "Bread", type: "Item"}}]);
  const one = L.takeFromPile(f, [0]);
  assert.deepEqual(one.taken.map(t => t.line), ["Knife"]);
  assert.equal(one.taken[0].data.system.damage, 1, "it comes back with its own settings");
  assert.deepEqual(one.flags.items, ["Bread"]);
  assert.equal(one.flags.loose.length, 1);
  assert.equal(one.flags.taken, false);
  const all = L.takeFromPile(f, [0, 1, 9, -1, "x"]);
  assert.equal(all.taken.length, 2);
  assert.equal(all.flags.taken, true, "an empty pile is gone");
  const plain = L.takeFromPile({container: true, kind: "pile", items: "Rope\nSack"}, [1]);
  assert.deepEqual(plain.taken, [{line: "Sack", data: null}]);
  assert.deepEqual(plain.flags.items, ["Rope"]);
});

test("the sheet has Drop and Pick up, and they use the pile on the map", () => {
  const H = readFileSync(join(root, "modules/wodx-sheets/scripts/extras-html.mjs"), "utf8");
  assert.match(H, /data-act="leave" title="Drop it here, on the map"/);
  assert.match(H, /data-act="pick-up"/);
  const X = readFileSync(join(root, "modules/wodx-sheets/scripts/extras.mjs"), "utf8");
  assert.match(X, /loose\.setDown\(tok\.document, \[it\.id\]\)/);
  assert.match(X, /loose\.openPickUp\(tok\.document\)/);
  const S = readFileSync(join(root, "modules/wodx-interactables/scripts/loose.mjs"), "utf8");
  assert.match(S, /msg\.op === "pickup"/, "a player's pick-up goes through the Storyteller's computer");
  assert.match(S, /L\.iconsOf\(rows, size\)/, "piles are drawn as icons");
  assert.match(S, /openPickUp\};/);
});
