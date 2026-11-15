/**
 * WoDX NPC gate: every line mends with its own power and is read as its own line (B6310-B6316), in Foundry, in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelinenpc.mjs?${Date.now()}`)).run()
 * Never moves the clock. Makes its own scene and actors.
 *   1. the line keys: a Vampire sheet with the variant kindredeast is a Kuei-jin, a Changing Breed sheet a Fera
 *   2. a hurt Kuei-jin NPC mends with Chi after a fight (Yang Chi spent, the wounds gone)
 *   3. a hurt wraith NPC mends with Pathos (two bashing or one lethal a point)
 *   4. a hurt demon NPC mends with Faith
 *   5. a hurt mortal NPC spends nothing and keeps its wounds for the clock
 *   6. a Kindred NPC still mends with blood, as before
 * Result: Data/wodx-gate/gatelinenpc-result.json.
 */
import {gate} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gatelinenpc");
  const api = () => game.modules.get(MOD)?.api;
  const C = () => game.wodxCombat ?? game.modules.get("wodx-combat")?.api;
  const hurt = async (a, d) => C()?.setDamage?.(a, {bashing: 0, lethal: 0, aggravated: 0, ...d});
  const dmg = a => { const ct = C()?.corpusTrack?.(a); const d = ct?.damage ?? a.system?.health?.damage ?? {}; return {bashing: Number(d.bashing) || 0, lethal: Number(d.lethal) || 0, aggravated: Number(d.aggravated) || 0}; };
  const fight = list => api().aftercare.afterFight({combatants: list.map(a => ({actor: a, token: null}))});
  try {
    const scene = await G.scene();
    const [kj, fe, wr, de, mo, va] = await G.make(Actor, [
      {name: "Gate Line Kuei-jin", type: "Vampire", system: {settings: {variant: "kindredeast"}, advantages: {yangchi: {permanent: 6, temporary: 6}, yinchi: {permanent: 3, temporary: 3}}}},
      {name: "Gate Line Fera", type: "Changing Breed"},
      {name: "Gate Line Wraith", type: "Wraith", system: {advantages: {pathos: {temporary: 5, max: 10}}}},
      {name: "Gate Line Demon", type: "Demon", system: {advantages: {faith: {temporary: 4, max: 10}}}},
      {name: "Gate Line Mortal", type: "Mortal"},
      {name: "Gate Line Kindred", type: "Vampire", system: {advantages: {bloodpool: {temporary: 8, max: 10}}}}
    ]);
    await G.tokens(scene, [{actor: kj, x: 2, y: 2}, {actor: wr, x: 4, y: 2}, {actor: de, x: 6, y: 2}, {actor: mo, x: 8, y: 2}, {actor: va, x: 10, y: 2}]);

    await G.step("1. line keys", async () => {
      const k = api().lines.of(kj), f = api().lines.of(fe), v = api().lines.of(va);
      G.ok("1. line keys", k === "kuei-jin" && f === "fera" && v === "vampire", {kj: k, fera: f, kindred: v});
    });

    await G.step("2. Kuei-jin mends with Chi", async () => {
      await hurt(kj, {lethal: 2});
      await fight([kj]);
      const d = dmg(kj), yang = Number(kj.system.advantages.yangchi.temporary);
      G.ok("2. Kuei-jin mends with Chi", d.lethal === 0 && yang === 4, {damage: d, yang});
    });

    await G.step("3. wraith mends with Pathos", async () => {
      await hurt(wr, {bashing: 2, lethal: 1});
      await fight([wr]);
      const d = dmg(wr), p = Number(wr.system.advantages.pathos.temporary);
      G.ok("3. wraith mends with Pathos", d.bashing === 0 && d.lethal === 0 && p === 3, {damage: d, pathos: p});
    });

    await G.step("4. demon mends with Faith", async () => {
      await hurt(de, {bashing: 3, lethal: 1});
      await fight([de]);
      const d = dmg(de), f = Number(de.system.advantages.faith.temporary);
      G.ok("4. demon mends with Faith", d.bashing === 0 && d.lethal === 0 && f === 2, {damage: d, faith: f});
    });

    await G.step("5. a mortal waits for the clock", async () => {
      await hurt(mo, {lethal: 1});
      await fight([mo]);
      G.ok("5. a mortal waits for the clock", dmg(mo).lethal === 1, {damage: dmg(mo)});
    });

    await G.step("6. the Kindred as before", async () => {
      await hurt(va, {lethal: 2});
      await fight([va]);
      const d = dmg(va), b = Number(va.system.advantages.bloodpool.temporary);
      G.ok("6. the Kindred as before", d.lethal === 0 && b === 6, {damage: d, blood: b});
    });
  } finally {
    return G.finish();
  }
}
