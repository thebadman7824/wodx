/**
 * Full check of V20 Dark Ages (B7672-B7673), WoDX Actions, WoDX Combat and WoDX Creation: demons and ghouls.
 * In rothenstein-wodx (or any test world) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatedademons.mjs?${Date.now()}`)).run()
 *   1. the Man at the Crossroads made from the sample: a spirit with its five Charms, a demon's own Possession (pp. 401-402)
 *   2. Immunity to Fire: three aggravated levels of fire do nothing, two lethal of a blade land (p. 402)
 *   3. Reap Essence: the demon gains the target's Willpower left (p. 402)
 *   4. Teleportation: refused at full Essence; below a third it costs one and the token leaves (p. 402)
 *   5. Possession: the host fails Willpower against Gnosis (dice forced to ones) and is possessed (p. 402)
 *   6. Exorcism: Intelligence + Occult (dice forced to tens) takes the demon's last Essence and drives it out of the host (p. 402)
 *   7. a ghoul with four points of vitae cannot frenzy (p. 400)
 *   8. the Curious Barber made from the people of the book (B7674, pp. 383-392)
 * Makes its own actors and scene and removes them. Result: Data/wodx-gate/gatedademons-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const text = m => String((m?.content ?? "") + (m?.flavor ?? "")).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const elOf = app => (app?.element instanceof HTMLElement ? app.element : app?.element?.[0]) ?? null;
const windows = () => [...(foundry.applications.instances?.values?.() ?? []), ...Object.values(ui.windows)];
const titled = re => windows().find(x => re.test(x.title ?? x.options?.window?.title ?? "") && x.rendered);
const filledOf = a => { const h = a?.system?.health?.damage ?? {}; return ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(h[k]) || 0), 0); };

export async function run() {
  const G = gate("gatedademons", {stepTimeout: 90000});
  if ( G.notLive() ) return "gatedademons never runs in the Live world";
  const A = game.modules.get("wodx-actions")?.api;
  const K = A?.charms;
  const WC = game.modules.get("wodx-combat")?.api;
  const seen = new Set(game.messages.contents.map(x => x.id));
  const fresh = (test, ms = 60000) => { let m = null; return waitFor(() => (m = game.messages.contents.find(x => !seen.has(x.id) && test(x))), ms).then(() => { for ( const x of game.messages.contents ) seen.add(x.id); return m; }).catch(() => null); };
  const dice0 = CONFIG.Dice.randomUniform;
  const force = async face => {
    for ( const u of [0.01, 0.05, 0.5, 0.95, 0.99] ) { CONFIG.Dice.randomUniform = () => u; if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === face ) return true; }
    return false;
  };
  try {
    await waitFor(() => !!K?.use && !!K?.exorcise && !!WC?.soakAndApply && !!A?.frenzy, 90000);
    const R = K.rules;
    const d = R.SAMPLE_DEMONS.find(x => x.key === "crossroads");
    const scene = await G.scene({name: "WoDX gate: demons"});
    const [dem, host, priest] = await G.make(Actor, [
      R.demonActorData(d),
      {name: "Gate DA Host", type: "Mortal"},
      {name: "Gate DA Exorcist", type: "Mortal"}]);
    await dem.createEmbeddedDocuments("Item", [{name: "Possession", type: "Power", system: {type: "wod.types.charm"}}, {name: "Reap Essence", type: "Power", system: {type: "wod.types.charm"}}]);
    await host.update({"system.advantages.willpower.permanent": 4, "system.advantages.willpower.temporary": 4});
    await priest.update({"system.attributes.intelligence.value": 3, "system.abilities.occult.value": 3});
    const [dt, ht] = await G.tokens(scene, [{actor: dem, x: 4, y: 4}, {actor: host, x: 5, y: 4}, {actor: priest, x: 6, y: 4}]);
    const body = () => scene.tokens.get(dt.id)?.actor ?? dem;
    const hv = () => scene.tokens.get(ht.id)?.actor ?? host;
    const ess = () => Number(body().system?.advantages?.essence?.temporary);
    const aim = on => ht.object?.setTarget?.(on, {releaseOthers: true, groupSelection: false});

    await G.step("1. the Man at the Crossroads, a demon with its Charms", async () => {
      const keys = K.of(body()).map(x => x.key).sort();
      const want = ["demonpossession", "fireimmunity", "harvestsoul", "hellhounds", "reapessence", "teleportation", "wish"];
      G.ok("1. the Man at the Crossroads, a demon with its Charms", A.getKind(body()) === "spirit" && want.every(k => keys.includes(k)) && !keys.includes("possession") && ess() === 20,
        {kind: A.getKind(body()), keys, essence: ess()});
    });

    await G.step("2. Immunity to Fire: fire does nothing, a blade lands", async () => {
      const f0 = filledOf(body());
      await WC.soakAndApply(dt.object ?? dt, {mode: "levels", amount: 3, type: "aggravated", fireSun: true, soak: true, apply: true});
      const fireCard = await fresh(m => /Immunity to Fire/.test(text(m)), 20000);
      const afterFire = filledOf(body());
      await WC.soakAndApply(dt.object ?? dt, {mode: "levels", amount: 6, type: "lethal", soak: false, apply: true});
      await waitFor(() => filledOf(body()) > afterFire, 20000).catch(() => null);
      G.ok("2. Immunity to Fire: fire does nothing, a blade lands", afterFire === f0 && !!fireCard && filledOf(body()) > afterFire,
        {f0, afterFire, after: filledOf(body()), card: text(fireCard).slice(0, 160)});
      await body().update({"system.health.damage.lethal": 0, "system.health.damage.aggravated": 0, "system.health.damage.bashing": 0});
    });

    await G.step("3. Reap Essence: the target's Willpower left", async () => {
      await A.limits?.clear?.(body());
      aim(true);
      const e0 = ess();
      await K.use(body(), "reapessence");
      await waitFor(() => ess() === e0 + 4, 20000).catch(() => null);
      G.ok("3. Reap Essence: the target's Willpower left", ess() === e0 + 4, {before: e0, after: ess()});
    });

    await G.step("4. Teleportation: only below a third", async () => {
      await A.limits?.clear?.(body());
      await body().update({"system.advantages.essence.temporary": 20});
      const refused = await K.use(body(), "teleportation");
      const still = ess() === 20 && !dt.hidden;
      await body().update({"system.advantages.essence.temporary": 6});
      await A.limits?.clear?.(body());
      await K.use(body(), "teleportation");
      await waitFor(() => scene.tokens.get(dt.id)?.hidden === true, 20000).catch(() => null);
      G.ok("4. Teleportation: only below a third", refused === null && still && ess() === 5 && scene.tokens.get(dt.id)?.hidden === true,
        {refused, still, essence: ess(), hidden: scene.tokens.get(dt.id)?.hidden});
      await scene.tokens.get(dt.id)?.update({hidden: false});
    });

    await G.step("5. Possession: the host fails Willpower against Gnosis", async () => {
      await A.limits?.clear?.(body());
      await body().update({"system.advantages.essence.temporary": 10});
      aim(true);
      const forced = await force(1);
      try { await K.use(body(), "demonpossession"); } finally { CONFIG.Dice.randomUniform = dice0; }
      const rid = () => [...(hv().effects ?? [])].find(e => e.flags?.["wodx-actions"]?.charm === "demonpossession");
      await waitFor(() => !!rid(), 20000).catch(() => null);
      G.ok("5. Possession: the host fails Willpower against Gnosis", forced && !!rid() && ess() === 5 && hv().statuses?.has?.("wodx-possessed"),
        {forced, ridden: !!rid(), essence: ess(), statuses: [...(hv().statuses ?? [])]});
    });

    await G.step("6. Exorcism drives the demon out", async () => {
      await body().update({"system.advantages.essence.temporary": 2});
      await A.limits?.clear?.(priest);
      const forced = await force(10);
      try { await K.exorcise(priest, {target: hv(), rite: true}); } finally { CONFIG.Dice.randomUniform = dice0; }
      const card = await fresh(m => /Exorcism/.test(text(m)) && /driven off/.test(text(m)), 20000);
      const ridden = [...(hv().effects ?? [])].some(e => e.flags?.["wodx-actions"]?.charm === "demonpossession");
      const ex = body().getFlag("wodx-actions", "exiled") ?? dem.getFlag("wodx-actions", "exiled");
      G.ok("6. Exorcism drives the demon out", forced && ess() === 0 && !ridden && !!ex && !!card,
        {forced, essence: ess(), ridden, exiled: ex, card: text(card).slice(0, 200)});
    });

    await G.step("7. a ghoul with four points cannot frenzy", async () => {
      const [g] = await G.make(Actor, [{name: "Gate DA Ghoul", type: "Mortal", items: [{name: "Potence", type: "Power", system: {type: "wod.types.discipline", value: 1}}]}]);
      await g.update({"system.settings.hasbloodpool": true, "system.advantages.bloodpool.temporary": 4, "system.advantages.bloodpool.max": 10});
      A.frenzy({actor: g});
      let w = null;
      await waitFor(() => (w = titled(/^(Frenzy|Instinct) check/)), 20000);
      await new Promise(r => setTimeout(r, 300));
      elOf(w)?.querySelector?.('button[data-action="ok"]')?.click();
      const card = await fresh(m => /no frenzy/.test(text(m)) && /fewer than 5/.test(text(m)), 30000);
      G.ok("7. a ghoul with four points cannot frenzy", !!card && A.getKind(g) === "ghoul", {kind: A.getKind(g), card: text(card).slice(0, 200)});
    });
    await G.step("8. a person of the book: the Curious Barber", async () => {
      const BP = game.modules.get("wodx-creation")?.api?.bookPeople;
      const p = await BP?.make?.("curious-barber");
      const ok = !!p && p.type === "Mortal" && Number(p.system?.advantages?.willpower?.permanent) > 0;
      G.ok("8. a person of the book: the Curious Barber", ok, {name: p?.name, type: p?.type, willpower: p?.system?.advantages?.willpower?.permanent, items: p?.items?.size});
      await p?.delete?.().catch(() => null);
    });
  } catch ( err ) { G.ok("no error", false, {error: String(err?.stack ?? err)}); }
  finally {
    CONFIG.Dice.randomUniform = dice0;
  }
  return G.finish();
}
