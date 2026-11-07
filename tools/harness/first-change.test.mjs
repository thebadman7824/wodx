import assert from "node:assert/strict";
import {test} from "node:test";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {installMock} from "./foundry-mock.mjs";
import {installActors, Coll} from "./actors-mock.mjs";

/* Phase 6b: the First Change (WoDX Creation), on sheets shaped like upstream's */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const mock = installMock({dataRoot: root});
await installActors(root);
globalThis.canvas = {tokens: {controlled: []}};
const M = "wodx-creation";

await import(join(root, "modules/wodx-chronicle/scripts/main.mjs"));
await import(join(root, "modules/wodx-creation/scripts/main.mjs"));
game.modules.set(M, {});
const api = () => game.modules.get(M).api;

const GX = await import(join(root, "modules/wodx-actions/scripts/garou.js"));
await GX.loadData();
game.wodxActions = {garouRules: GX, gifts: () => GX.gifts(), giftItem: g => GX.giftItem(g)};

test("ready", async () => {
  await Hooks.callAll("init");
  mock.setupTime();
  await Hooks.callAll("ready");
  await mock.settle();
  assert.ok(api().firstChange);
});

test("starting traits follow breed, auspice and tribe (DA:W pp. 80–85)", async () => {
  const FC = await import(join(root, "modules/wodx-creation/scripts/first-change.mjs"));
  const st = FC.startingTraits({breed: "lupus", auspice: "galliard", tribe: "fenrir"}, GX.data().garou);
  assert.deepEqual([st.rage, st.gnosis, st.willpower], [4, 5, 3]);
  assert.deepEqual(st.renown, {glory: 2, honor: 0, wisdom: 1});
  assert.ok(st.gifts.includes("Beast Speech") && st.gifts.includes("Hare's Leap"));
  assert.match(st.notes.join(" "), /Contacts/);
  const rag = FC.startingTraits({breed: "homid", auspice: "ragabash", tribe: "bone-gnawers"}, GX.data().garou);
  assert.deepEqual(rag.renown, {glory: 1, honor: 1, wisdom: 1}, "Ragabash: three of any");
  assert.equal(rag.willpower, 4);
});

test("the First Change makes a Werewolf from the mortal and keeps the mortal, linked", async () => {
  const mortal = await Actor.create({name: "Konrad", type: "Mortal", system: {}});
  mortal.system.attributes.strength.value = 4;
  mortal.system.abilities.brawl.value = 3;
  mortal.system.advantages.willpower.permanent = 5;
  mortal.system.nature = "Survivor";
  await mortal.createEmbeddedDocuments("Item", [{name: "Wood axe", type: "Melee Weapon", system: {}}]);
  const scene = {id: "s1", tokens: [{id: "t1", actorId: mortal.id}], async updateEmbeddedDocuments(type, list) { for ( const u of list ) this.tokens.find(t => t.id === u._id).actorId = u.actorId; }};
  game.scenes.set(scene.id, scene);
  const lib = GX.gifts();
  const picks = ["Smell of Man", "Razor Claws", "Resist Pain"].map(n => GX.findGift(n).id);
  const wolf = await api().firstChange(mortal, {breed: "homid", auspice: "ahroun", tribe: "fenrir", gifts: picks});
  assert.equal(wolf.type, "Werewolf");
  assert.equal(wolf.system.attributes.strength.value, 4);
  assert.equal(wolf.system.abilities.brawl.value, 3);
  assert.equal(wolf.system.abilities.primalurge.value, 1, "at least one dot of Primal-Urge");
  assert.equal(wolf.system.abilities.primalurge.isvisible, true);
  assert.equal(wolf.system.nature, "Survivor");
  assert.deepEqual([wolf.system.advantages.rage.permanent, wolf.system.advantages.gnosis.permanent, wolf.system.advantages.willpower.permanent], [5, 1, 5],
    "Ahroun Rage 5, homid Gnosis 1; the mortal's Willpower 5 beats the Fenrir 3");
  assert.equal(wolf.system.renown.rank, 1);
  assert.equal(wolf.system.renown.glory.permanent, 3);
  assert.equal(wolf.system.tribe, "custom");
  assert.equal(wolf.system.custom.tribe, "Fenrir");
  const info = GX.info(wolf);
  assert.deepEqual([info.breed, info.auspice, info.tribe], ["homid", "ahroun", "fenrir"], "WoDX Actions reads what the wizard wrote");
  assert.ok(wolf.items.find(i => i.name === "Wood axe"), "the mortal's items come across");
  const gifts = wolf.items.filter(i => i.system?.type === "wod.types.gift").map(i => i.name).sort();
  assert.deepEqual(gifts, ["Razor Claws", "Resist Pain", "Smell of Man"]);
  assert.equal(mortal.getFlag(M, "lineage").became.id, wolf.id);
  assert.equal(wolf.getFlag(M, "lineage").formerly.id, mortal.id);
  assert.equal(mortal.folder?.name, "WoDX · Before the First Change");
  assert.equal(scene.tokens[0].actorId, wolf.id, "the token now shows the Garou");
  assert.ok(game.actors.get(mortal.id), "the mortal is kept");
  assert.ok(mock.log.chat.some(c => /The First Change/.test(c.content)));
  await assert.rejects(api().firstChange(mortal, {}), /not a mortal who can/, "only once");
  assert.ok(lib.length > 100);
});

test("the 6b test pack: asks first, makes Garou, Fera and mortals in their own folder that WoDX Actions reads", async () => {
  const {makeTestPack} = await import(join(root, "modules/wodx-actions/scripts/garou-testpack.js"));
  mock.DialogV2.queue(() => false);
  assert.equal(await makeTestPack(), null, "declined: nothing made");
  assert.equal(game.folders.find(f => f.name === "WoDX 6b test pack"), undefined);
  mock.DialogV2.queue(() => true);
  const made = await makeTestPack();
  assert.equal(made.length, 10);
  const thorn = made.find(a => a.name.startsWith("Thorn"));
  const i = GX.info(thorn);
  assert.deepEqual([i.breed, i.auspice, i.tribe, i.form], ["metis", "theurge", "shadow-lords", "crinos"]);
  assert.equal(thorn.items.filter(x => x.system?.type === "wod.types.gift").length, 3);
  assert.ok(thorn.items.find(x => x.system?.type === "wod.types.talen"));
  const rook = made.find(a => a.name.startsWith("Old Rook"));
  assert.equal(GX.info(rook).feraKey, "Corax");
  assert.deepEqual(GX.banesOf(rook), ["gold"]);
  const hedda = made.find(a => a.name.startsWith("Hedda"));
  assert.equal(hedda.flags.world.wodx.kinfolk, "fenrir");
  assert.ok(!Array.isArray(await makeTestPack({confirm: false})), "not twice");
});
