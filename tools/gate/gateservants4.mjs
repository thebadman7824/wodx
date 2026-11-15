/**
 * Servants and bonds, step four (B5100-B5129): the lone player and approvals that do something, in Foundry, in rothenstein-wodx,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateservants4.mjs?${Date.now()}`)).run()
 * It makes scratch actors and a scene and deletes them, and puts the approval queue and the standing rules back. It does not move the clock.
 *   1. every servant approval kind is registered and none is barred from a standing rule, so the Lone Chronicle switch covers them all
 *   2. with the standing rules on (as the Lone Chronicle sets them), a proposed bond is made at once
 *   3. a proposed Conditioning scene rolls at once and the tally grows
 *   4. an attack on someone an oath binds you to breaks the oath at once
 *   5. a proposed Parted Mists spends the Glamour and makes the Enchantment last
 *   6. a proposed pact links the thrall and puts the gifts on the sheet
 *   7. a True Name called brings the demon beside the caller on the map
 * Result: Data/wodx-gate/gateservants4-result.json.
 */
import {gate} from "./kit.mjs";
import {NEVER_AUTO} from "/modules/wodx-chronicle/scripts/approvals-rules.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const TYPES = ["wodx-npc.bind", "wodx-npc.condition", "wodx-actions.partedMists", "wodx-actions.oathBroken", "wodx-actions.pact", "wodx-actions.pressName"];

export async function run() {
  const G = gate("gateservants4");
  const C = game.modules.get("wodx-chronicle")?.api, X = game.wodxActions?.servantActions?.(), S = game.modules.get("wodx-npc")?.api?.servants;
  const keep = {auto: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "autoApprove") ?? {}),
    approvals: foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals"))};
  const held = a => game.actors.get(a.id)?.flags?.["wodx-npc"]?.held ?? {};
  try {
    await G.step("1. every kind can stand approved", async () => {
      const known = (C?.approvals?.types?.() ?? []).map(t => t.type ?? t);
      const missing = TYPES.filter(t => !known.includes(t)), barred = TYPES.filter(t => NEVER_AUTO.includes(t));
      G.ok("1. every kind can stand approved", !missing.length && !barred.length, {missing, barred});
    });
    await game.settings.set("wodx-chronicle", "autoApprove", {...keep.auto, ...Object.fromEntries(TYPES.map(t => [t, true]))});
    const scene = await G.scene();
    const [master, mortal, fae, fae2, sworn, friend, demon] = await G.make(Actor, [
      {name: "Gate Servants4 Elder", type: "Vampire", system: {attributes: {charisma: {value: 5}}, abilities: {leadership: {value: 5}}}},
      {name: "Gate Servants4 Mortal", type: "Mortal", system: {advantages: {willpower: {permanent: 2, temporary: 1}}}},
      {name: "Gate Servants4 Changeling", type: "Changeling", system: {advantages: {glamour: {permanent: 6, temporary: 6}}}},
      {name: "Gate Servants4 Changeling Two", type: "Changeling", system: {advantages: {glamour: {permanent: 5, temporary: 5}}}},
      {name: "Gate Servants4 Sworn", type: "Changeling", system: {advantages: {willpower: {permanent: 5, temporary: 5}}}},
      {name: "Gate Servants4 Friend", type: "Changeling"},
      {name: "Gate Servants4 Demon", type: "Demon"}]);
    await G.tokens(scene, [{actor: master, x: 2, y: 2}, {actor: mortal, x: 3, y: 2}, {actor: fae, x: 4, y: 2}, {actor: fae2, x: 5, y: 2}]);

    await G.step("2. a bond, approved on sight", async () => {
      await C.propose({type: "wodx-npc.bind", key: `gate4:bind:${mortal.id}`, title: "gate", data: {servant: mortal.id, master: master.id, kind: "cult", step: 1, data: {}}});
      await wait(600);
      G.ok("2. a bond, approved on sight", !!held(mortal)[`cult:${master.id}`], {held: Object.keys(held(mortal))});
    });
    await G.step("3. Conditioning, rolled on sight", async () => {
      await C.propose({type: "wodx-npc.condition", key: `gate4:cond:${mortal.id}`, title: "gate", data: {master: master.id, subject: mortal.id, nature: ""}});
      await wait(800);
      const rec = held(mortal)[`conditioning:${master.id}`];
      G.ok("3. Conditioning, rolled on sight", !!rec && Number.isFinite(Number(rec.data?.tally)), {tally: rec?.data?.tally ?? null});
    });
    await G.step("4. an oath broken on sight", async () => {
      await sworn.setFlag("wodx-actions", "c20oaths", [{kind: "crossedBlades", terms: "brothers in arms", parties: [friend.name], successes: 0, at: 0}]);
      await X.onAttack(sworn, {target: friend});
      await wait(800);
      const o = game.actors.get(sworn.id).getFlag("wodx-actions", "c20oaths")?.[0];
      G.ok("4. an oath broken on sight", !!o?.broken, {broken: o?.broken ?? null});
    });
    await G.step("5. the Parted Mists on sight", async () => {
      await C.propose({type: "wodx-actions.partedMists", key: `gate4:mists:${mortal.id}`, title: "gate", data: {target: mortal.id, lead: fae.id, givers: [{id: fae.id, glamour: 2}, {id: fae2.id, glamour: 1}]}});
      await wait(800);
      const rec = held(mortal)[`enchant:${fae.id}`];
      G.ok("5. the Parted Mists on sight", rec?.data?.lasting === true && game.actors.get(fae.id).system.advantages.glamour.temporary === 4, {lasting: rec?.data?.lasting ?? null});
    });
    await G.step("6. a pact on sight", async () => {
      await C.propose({type: "wodx-actions.pact", key: `gate4:pact:${mortal.id}`, title: "gate", data: {demon: demon.id, thrall: mortal.id, potential: 3, terms: "a cure", picks: [{k: "innate"}], offered: 1}});
      await wait(800);
      const th = game.actors.get(demon.id).getFlag("wodx-actions", "demon")?.thralls ?? [];
      const gifts = game.actors.get(mortal.id).items.filter(i => i.flags?.["wodx-actions"]?.pactGift);
      G.ok("6. a pact on sight", th.some(t => t.actorId === mortal.id) && gifts.length >= 1, {thralls: th.length, gifts: gifts.length});
    });
    await G.step("7. a True Name brings the demon to the map", async () => {
      await C.propose({type: "wodx-actions.pressName", key: `gate4:press:${mortal.id}`, title: "gate", data: {caller: mortal.id, demon: demon.id, cmd: "kneel", scene: scene.id}});
      await wait(1200);
      G.ok("7. a True Name brings the demon to the map", scene.tokens.some(t => t.actorId === demon.id), {tokens: scene.tokens.size});
    });
  } catch (e) {
    G.R.errors.push(String(e?.stack ?? e));
  } finally {
    await game.settings.set("wodx-chronicle", "autoApprove", keep.auto);
    await game.settings.set("wodx-chronicle", "approvals", keep.approvals);
    return G.finish();
  }
}
