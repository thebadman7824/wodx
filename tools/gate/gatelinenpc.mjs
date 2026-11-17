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
 *   7. B6319: a changeling NPC in its freehold (Holdings 2) takes 2 Glamour for the night, and only once that night
 *   8. a wraith NPC rolls its Passion for Pathos and a demon NPC with no thralls reaps; each is marked for the night
 *   9. a Fera and a mage NPC are marked for WoDX Actions' daily Gnosis and Quintessence rolls
 *  10. B6450: a wraith whose lover is hurt rolls Willpower, and a failure adds a point of temporary Angst
 *  11. B6452: a wraith looking over a spy rolls Lifesight; a find marks the hidden loyalty found by the wraith
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

    const [ch, wr2, de2, mg] = await G.make(Actor, [
      {name: "Gate Line Changeling", type: "Changeling", system: {advantages: {glamour: {permanent: 5, temporary: 1}}},
        items: [{name: "Holdings", type: "Feature", system: {type: "wod.types.background", value: 2}}]},
      {name: "Gate Line Wraith Two", type: "Wraith", system: {advantages: {pathos: {temporary: 1, max: 10}}},
        items: [{name: "Keep the house standing", type: "Trait", system: {type: "wod.types.passion", value: 5}}]},
      {name: "Gate Line Demon Two", type: "Demon", system: {advantages: {faith: {temporary: 1, permanent: 5, max: 10}, willpower: {temporary: 6, permanent: 6}}}},
      {name: "Gate Line Mage", type: "Mage"}
    ]);
    // the sheets' own willpower, set after creation and read back in the step's data
    await game.actors.get(de2.id).update({"system.advantages.willpower.permanent": 6, "system.advantages.willpower.temporary": 6});
    const R = () => api().lines.refill;
    const night = Math.floor((game.time.worldTime - 18 * 3600) / 86400) + 9000;

    await G.step("7. Glamour from Sanctuary", async () => {
      const read = () => Number(game.actors.get(ch.id)?.system?.advantages?.glamour?.temporary ?? NaN);
      const pool = R().sheet(ch).glamour;
      await R().one(ch, night);
      const once = R().sheet(ch).glamour.temp;
      await R().one(ch, night);
      const twice = R().sheet(ch).glamour.temp;
      G.ok("7. Glamour from Sanctuary", once === pool.temp + 2 && twice === once, {before: pool, once, twice, sheet: read()});
    });

    await G.step("8. Pathos and Faith", async () => {
      const p0 = R().sheet(wr2).pathos.temp, f0 = R().sheet(de2).faith.temp;
      const w = await R().one(wr2, night), d = await R().one(de2, night);
      const p1 = R().sheet(wr2).pathos.temp, f1 = R().sheet(de2).faith.temp;
      G.ok("8. Pathos and Faith", w.some(x => x.word === "Passion") && d.some(x => x.word === "Reaping") && p1 >= p0 && f1 >= f0
        && game.actors.get(wr2.id).getFlag(MOD, "refill")?.night === night && p1 - p0 === (w.find(x => x.word === "Passion")?.gained ?? -1),
        {wraith: {p0, p1, w}, demon: {f0, f1, d, line: api().lines.of?.(game.actors.get(de2.id)), sheet: R().sheet(game.actors.get(de2.id)), adv: game.actors.get(de2.id)?.system?.advantages?.faith, wp: game.actors.get(de2.id)?.system?.advantages?.willpower, thralls: game.actors.get(de2.id)?.flags?.["wodx-actions"]?.demon?.thralls ?? null}});
    });

    await G.step("9. marked for the daily rolls", async () => {
      await R().enroll(fe); await R().enroll(mg);
      const ff = game.actors.get(fe.id).flags?.["wodx-actions"] ?? {}, mf = game.actors.get(mg.id).flags?.["wodx-actions"] ?? {};
      G.ok("9. marked for the daily rolls", !!ff.meditates && !!mf.m20?.draws && !!game.actors.get(mg.id).getFlag(MOD, "refillMarked"), {fera: ff.meditates, mage: mf.m20});
    });

    const [lw, lv, spy] = await G.make(Actor, [
      {name: "Gate Line Grieving Wraith", type: "Wraith", system: {advantages: {angst: {temporary: 2, permanent: 3}, willpower: {temporary: 3, permanent: 3}},
        attributes: {perception: {value: 5}}, abilities: {empathy: {value: 5}}}},
      {name: "Gate Line Beloved", type: "Mortal"},
      {name: "Gate Line Spy", type: "Mortal", system: {advantages: {willpower: {permanent: 3, temporary: 3}}}}
    ]);
    await lw.setFlag("wodx-sheets", "ties", [{uuid: `Actor.${lv.id}`, name: lv.name, role: "lover"}]);
    await game.actors.get(lw.id).update({"system.advantages.willpower.permanent": 3, "system.advantages.willpower.temporary": 3});
    const angstOf = () => Number(game.actors.get(lw.id)?.system?.advantages?.angst?.temporary) || 0;

    await G.step("10. the loved-one check is rolled", async () => {
      const prev = game.settings.get(MOD, "heartCards");
      await game.settings.set(MOD, "heartCards", true);
      const a0 = angstOf();
      const told = await api().hearts.tell(game.actors.get(lv.id), "harm");
      const mine = (told ?? []).find(t => t.to === lw.id);
      const r = mine?.rolled?.find(x => x.fail === "angst" && x.made);
      const a1 = angstOf();
      await game.settings.set(MOD, "heartCards", prev);
      G.ok("10. the loved-one check is rolled", !!r && a1 === a0 + (r.failed ? 1 : 0), {a0, a1, rolled: mine?.rolled ?? null, checks: mine?.checks?.map(c => c.roll ?? null) ?? null, line: api().lines.of?.(game.actors.get(lw.id)), wp: game.actors.get(lw.id)?.system?.advantages?.willpower});
    });

    await G.step("11. Lifesight seeks the hidden loyalty", async () => {
      await api().trust.setSide(spy, {faction: "gate-f", name: "The Gate Court", leader: {id: null, name: "The Gate Prince"}});
      const res = await api().trust.seekSide(game.actors.get(lw.id), game.actors.get(spy.id));
      const found = !!api().trust.sideOf(game.actors.get(spy.id))?.found?.[lw.id];
      G.ok("11. Lifesight seeks the hidden loyalty", res?.sense === "Lifesight" && found === (res.result === "found"), {res, found});
    });
  } finally {
    return G.finish();
  }
}
