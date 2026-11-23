/**
 * Demonic pacts, infernal investments and the Supplicium (B7696), Dark Ages Companion (2002) ch. 7. WoDX Actions,
 * WoDX Combat (the body plan), WoDX Creation (poisoned vitae).
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedainfernal.mjs?${Date.now()}`)).run()
 *   1. the Infernal pacts window records a pact of Corruption (5) and buys Armor with its Record button: one soak die
 *      on the sheet, 4 points left, a Supplicium card (pp. 175-177)
 *   2. "The demon prevails" on that card takes a Road point (p. 165)
 *   3. Claws from the same pact: the body plan has lethal claws at Strength + 2 (p. 177)
 *   4. a Road at 1 falls to the Via Diabolis (Road of Sin, Path of the Devil) at 1 (p. 165)
 *   5. on the Via at 1 the demon prevails again: the last Supplicium, and "The infernalist endures" brings it to 1 (p. 166)
 *   6. a mortal drinks the infernalist's poisoned blood: five lethal levels, soak dice forced to ones (p. 177)
 * Makes its own actors and removes them. Result: Data/wodx-gate/gatedainfernal-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const road = a => Number(a?.system?.advantages?.path?.permanent ?? -1);
const filled = a => { const h = a?.system?.health?.damage ?? {}; return ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(h[k]) || 0), 0); };

export async function run() {
  const G = gate("gatedainfernal", {stepTimeout: 150000});
  if ( G.notLive() ) return "gatedainfernal never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const IP = A?.infernalPacts;
  const dice0 = CONFIG.Dice.randomUniform;
  let supCard = null;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 60000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  const click = async (m, ix) => {
    await ui.chat?.render?.(true);
    await new Promise(r => setTimeout(r, 500));
    const el = document.querySelector(`[data-message-id="${m?.id}"] button[data-ix="${ix}"]`);
    el?.click();
    return !!el;
  };
  try {
    await waitFor(() => !!IP?.window && !!game.wodxCombat?.body, 90000);
    const [inf, mortal] = await G.make(Actor, [
      {name: "Gate Infernalist", type: "Vampire", system: {advantages: {path: {permanent: 3, value: 3}}}},
      {name: "Gate Drinker", type: "Mortal"}]);
    await inf.update({"system.advantages.path.permanent": 3, "system.advantages.path.value": 3, "system.attributes.appearance.value": 3});

    await G.step("1. the window records a pact and buys Armor", async () => {
      IP.window(inf);
      let w = null;
      await waitFor(() => (w = titled(/^Infernal pacts: Gate Infernalist/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      const el = elOf(w);
      el.querySelector('[name="demon"]').value = "Gate Demon";
      el.querySelector('[name="rating"]').value = "5";
      el.querySelector('[name="service"]').value = "Corrupt the abbot";
      el.querySelector('[name="buy"]').value = "inv:armor";
      el.querySelector('button[data-action="ok"]')?.click();
      await waitFor(() => (inf.getFlag("wodx-actions", "infernal")?.owned?.armor ?? 0) >= 1 && inf.items.some(i => i.name === "Infernal armor"), 90000).catch(() => null);
      const card = await fresh(m => /Supplicium: Gate Infernalist/.test(text(m)) && /Armor/.test(text(m)), 60000);
      const st = IP.state(inf), arm = inf.items.find(i => i.name === "Infernal armor");
      const soak = (arm?.system?.bonuslist ?? []).filter(b => b.type === "soak_buff").map(b => b.value);
      G.ok("1. the window records a pact and buys Armor", st.pacts.length === 1 && st.pacts[0].left === 4 && soak.length === 2 && soak.every(v => v === 1) && !!card,
        {pacts: st.pacts, soak, card: !!card});
      supCard = card;
    });

    await G.step("2. the demon prevails: a Road point", async () => {
      const ok = await click(supCard, "prevails");
      await waitFor(() => road(inf) === 2, 60000).catch(() => null);
      G.ok("2. the demon prevails: a Road point", ok && road(inf) === 2, {clicked: ok, road: road(inf)});
    });

    await G.step("3. Claws: the body plan has lethal claws at Strength + 2", async () => {
      const pid = IP.state(inf).pacts[0].id;
      const r = await IP.spend(inf, pid, {kind: "investment", key: "claws"});
      await waitFor(() => game.wodxCombat.body.of(inf)?.weapons?.claw, 30000).catch(() => null);
      const claw = game.wodxCombat.body.of(inf)?.weapons?.claw;
      G.ok("3. Claws: the body plan has lethal claws at Strength + 2", r?.ok && claw?.type === "lethal" && claw?.bonus === 2 && IP.state(inf).pacts[0].left === 3, {r, claw});
    });

    await G.step("4. a Road at 1 falls to the Via Diabolis", async () => {
      await inf.update({"system.advantages.path.permanent": 1, "system.advantages.path.value": 1});
      await IP.prevails(inf);
      const rd = inf.getFlag("wodx-actions", "road");
      G.ok("4. a Road at 1 falls to the Via Diabolis", rd?.key === "sin" && rd?.path === "Path of the Devil" && road(inf) === 1, {road: rd, rating: road(inf)});
    });

    await G.step("5. the last Supplicium, endured", async () => {
      await IP.prevails(inf);
      const card = await fresh(m => /The last Supplicium: Gate Infernalist/.test(text(m)), 60000);
      const at0 = road(inf);
      const ok = await click(card, "finalWon");
      await waitFor(() => road(inf) === 1, 60000).catch(() => null);
      G.ok("5. the last Supplicium, endured", !!card && at0 === 0 && ok && road(inf) === 1 && !IP.state(inf).damned, {card: !!card, at0, clicked: ok, road: road(inf)});
    });

    await G.step("6. poisoned blood: five lethal levels to the drinker", async () => {
      const pid = IP.state(inf).pacts[0].id;
      await IP.spend(inf, pid, {kind: "investment", key: "poison"});
      CONFIG.Dice.randomUniform = () => 0.99;
      const before = filled(mortal);
      await game.modules.get("wodx-creation").api.giveVitae(mortal, inf, {points: 1});
      await waitFor(() => filled(mortal) - before >= 5, 60000).catch(() => null);
      CONFIG.Dice.randomUniform = dice0;
      const card = await fresh(m => /blood is poisoned/.test(text(m)), 30000);
      G.ok("6. poisoned blood: five lethal levels to the drinker", filled(mortal) - before >= 5 && !!card, {before, after: filled(mortal), health: mortal.system?.health?.damage, card: !!card});
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
  }
  return G.finish();
}
