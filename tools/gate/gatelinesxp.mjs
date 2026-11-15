/**
 * WoDX Creation gate: every line spends experience by its own book and learns by the learning rule (B6270-B6279), in
 * Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelinesxp.mjs?${Date.now()}`)).run()
 * Makes its own scene and actors and removes them; the clock is put back at the end (the kit does it).
 *   1. a Mage's spend window opens, with Arete and the affinity Sphere at M20's costs
 *   2. a Sphere from a mentor of the same Tradition: the experience goes at once, the token carries the study mark
 *   3. the study runs on the clock until it is done: the Sphere rises
 *   4. a Garou learns a Gift from a spirit: it is on the sheet when the study is done
 *   5. a Wraith's new Arcanos, waived by the Storyteller, is on the sheet at once
 * Result: Data/wodx-gate/gatelinesxp-result.json.
 */
import {gate} from "./kit.mjs";

const C = "wodx-creation", ST = "wodx-storyteller";
const wait = ms => new Promise(r => setTimeout(r, ms));
const settle = async (fn, ms = 6000) => { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await wait(150); } return !!(await fn()); };
/** Easy rolls, made due now, as gateowners does (moving the clock starts the hook's own tick, which holds the next). */
async function easy(a, id) {
  const S = game.modules.get(ST).api;
  await a.update({[`flags.${ST}.tasks.${id}.diff`]: 2, [`flags.${ST}.tasks.${id}.goal`]: 1, [`flags.${ST}.tasks.${id}.dice`]: 10});
  for ( let i = 0; i < 6 && a.flags?.[ST]?.tasks?.[id]?.status !== "done"; i++ ) {
    await a.update({[`flags.${ST}.tasks.${id}.next`]: game.time.worldTime});
    await S.tasks.tick({force: true});
  }
}

export async function run() {
  const G = gate("gatelinesxp");
  const keep = [];
  try {
    const api = game.modules.get(C)?.api;
    for ( const [m, k] of [[C, "learning"], [ST, "longTasks"]] ) if ( game.settings.settings.has(`${m}.${k}`) ) keep.push([m, k, game.settings.get(m, k)]);
    await game.settings.set(C, "learning", true);
    if ( game.settings.settings.has(`${ST}.longTasks`) ) await game.settings.set(ST, "longTasks", true);
    const scene = await G.scene();
    const [mage, master, wolf, wraith] = await G.make(Actor, [{name: "Gate Lines Apprentice", type: "Mage"}, {name: "Gate Lines Master", type: "Mage"},
      {name: "Gate Lines Cub", type: "Werewolf"}, {name: "Gate Lines Shade", type: "Wraith"}]);
    await mage.update({"system.affiliation": "Order of Hermes", "system.affinity": "Forces", "system.spheres.forces.value": 1, "system.advantages.arete.permanent": 2});
    await master.update({"system.affiliation": "Order of Hermes", "system.spheres.forces.value": 4, "system.advantages.arete.permanent": 5});
    await wolf.update({"system.advantages.gnosis.permanent": 2, "system.advantages.rage.permanent": 3});
    await G.tokens(scene, [{actor: mage, x: 2, y: 2}, {actor: master, x: 3, y: 2}, {actor: wolf, x: 5, y: 2}, {actor: wraith, x: 7, y: 2}]);
    await api.award([mage, wolf, wraith], 40, "Gate lines");
    const forces = () => api.data.purchaseOptions(mage).find(o => o.kind === "power" && o.key === "sphere:forces");
    const studying = a => !!a.statuses?.has?.("wodx-studying");

    await G.step("1. a Mage's spend window", async () => {
      const app = await api.spend(mage);
      await wait(400);
      const el = app?.element;
      const text = el?.textContent ?? "";
      const f = forces(), arete = api.data.purchaseOptions(mage).find(o => o.kind === "stat" && o.key === "arete");
      G.ok("1. a Mage's spend window", !!el && /Spheres/.test(text) && /Arete/.test(text) && f?.cost === 7 && arete?.cost === 16,
        {open: !!el, forces: f?.cost, arete: arete?.cost, spheres: /Spheres/.test(text)});
      await app?.close?.();
    });

    let rec = null;
    await G.step("2. a Sphere from a mentor", async () => {
      const p = forces();
      const r = await api.xp.spend(mage, {...p, source: {kind: "teacher", id: master.id, name: master.name}});
      rec = r.ok ? api.learn.records(mage)[r.learning] : null;
      await settle(() => studying(mage), 3000);
      G.ok("2. a Sphere from a mentor", r.ok && Number(mage.system.spheres.forces.value) === 1 && studying(mage), {ok: r.ok, reason: r.reason, mark: studying(mage)});
    });

    await G.step("3. the Sphere rises", async () => {
      if ( !rec ) return G.ok("3. the Sphere rises", false, {error: "no study"});
      await easy(mage, rec.taskId);
      await settle(() => Number(mage.system.spheres.forces.value) === 2 && !studying(mage));
      G.ok("3. the Sphere rises", Number(mage.system.spheres.forces.value) === 2 && !studying(mage), {forces: mage.system.spheres.forces.value, mark: studying(mage)});
    });

    await G.step("4. a Gift from a spirit", async () => {
      const item = {name: "Gate Gift of Listening", type: "Power", system: {type: "wod.types.gift", level: 1}};
      const g = api.data.newPowerOption(wolf, "gift", item.name, {own: true, level: 1, item});
      const r = await api.xp.spend(wolf, {...g, source: {kind: "spirit", name: "A spirit summoned to teach the Gift"}});
      const w = r.ok ? api.learn.records(wolf)[r.learning] : null;
      if ( w ) {
        await easy(wolf, w.taskId);
      }
      const has = () => wolf.items.some(i => i.name === item.name && i.system?.type === "wod.types.gift");
      await settle(has);
      G.ok("4. a Gift from a spirit", r.ok && g.cost === 3 && has(), {ok: r.ok, reason: r.reason, cost: g?.cost, gift: has()});
    });

    await G.step("5. a new Arcanos, waived", async () => {
      await api.learn.setWaived(wraith, true);
      const p = api.data.newPowerOption(wraith, "arcanos", "Gate Argos");
      const r = await api.xp.spend(wraith, p);
      await api.learn.setWaived(wraith, false);
      const it = wraith.items.find(i => i.name === "Gate Argos");
      G.ok("5. a new Arcanos, waived", r.ok && p.cost === 7 && it?.system?.type === "wod.types.arcanoi" && Number(it.system.value) === 1, {ok: r.ok, reason: r.reason, cost: p?.cost, item: it?.system?.type});
    });
  } finally {
    for ( const [m, k, v] of keep ) { try { await game.settings.set(m, k, v); } catch (e) { /* kept */ } }
    return G.finish();
  }
}
