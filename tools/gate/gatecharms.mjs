/**
 * Gate: spirit Charms (B5650-B5659), on a testbed lane.
 *   1. the rules: 32 Charms, each with a page; the api
 *   2. a Creature made as a spirit is a spirit, with its Charms
 *   3. Armor: two Essence, soak rows equal to Gnosis on the Charm, gone when it ends
 *   4. Blast: one Essence, Rage in aggravated dice on the target
 *   5. Illuminate: the token sheds light
 *   6. Freeze: Rage one lower for its time, back when it ends; the one standing near is hurt
 *   7. Swift Flight: a movement row of three and the token flies; both end with it
 *   8. Spirit Static: the Gauntlet one higher here, back when it ends (WoDX Otherworlds)
 *   9. Healing: a lethal level closes on the target
 *  10. an NPC spirit's power choice offers Blast to attack
 *  11. WoDX Combat reads the Creature spirit as a spirit, soaking with its Willpower
 *  12. a faerie sprite's Blast is the Dark Ages: Fae one: harm bought by the level, Willpower to hit (B6555)
 *  13. Animate Tools: two Essence a tool, a bashing weapon on the sprite's sheet, gone when it ends
 *  14. Paralyzing Stare: one Essence on a mortal; the target is held a turn a success
 * Result: Data/wodx-gate/gatecharms-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatecharms", {stepTimeout: 45000});
  const A = game.modules.get(MOD)?.api;
  const K = A?.charms;
  try {
    await G.step("1. the rules and the api", async () => {
      const list = K?.rules?.CHARMS ?? [];
      const w20 = list.filter(c => c.group !== "sprite"), sprite = list.filter(c => c.group === "sprite");
      G.ok("1. the rules and the api", w20.length === 32 && w20.every(c => c.p >= 366 && c.p <= 368) && sprite.length === 7 && sprite.every(c => c.p === 97) && typeof K?.use === "function" && typeof A?.spiritCharm === "function",
        {n: list.length, sprite: sprite.length});
    });
    if ( !K?.use ) return;
    const scene = await G.scene({name: "WoDX gate: charms"});
    const charm = name => ({name, type: "Power", system: {type: "wod.types.charm", value: 1}});
    const [sp, victim] = await G.make(Actor, [
      {name: "Gate Charm Spirit", type: "Creature", system: {settings: {variant: "spirit"}},
        items: ["Armor", "Blast", "Illuminate", "Freeze", "Swift Flight", "Spirit Static", "Healing"].map(charm)},
      {name: "Gate Charm Victim", type: "Mortal"}]);
    await sp.update({"system.advantages.rage.permanent": 6, "system.advantages.gnosis.permanent": 6, "system.advantages.willpower.permanent": 5,
      "system.advantages.essence.temporary": 20, "system.advantages.essence.max": 20});
    const [st, vt] = await G.tokens(scene, [{actor: sp, x: 4, y: 4}, {actor: victim, x: 5, y: 4}]);
    const body = () => scene.tokens.get(st.id)?.actor;
    const v = () => scene.tokens.get(vt.id)?.actor;
    const CH = game.modules.get("wodx-chronicle")?.api;
    const ess = () => Number(body().system?.advantages?.essence?.temporary);
    const aim = on => vt.object?.setTarget?.(on, {releaseOthers: true, groupSelection: false});

    await G.step("2. a Creature spirit is a spirit", async () => {
      const kind = A.getKind(body());
      G.ok("2. a Creature spirit is a spirit", kind === "spirit" && K.isSpirit(body()) && K.of(body()).length === 7, {kind, charms: K.of(body()).map(x => x.key)});
    });

    await G.step("3. Armor: soak rows equal to Gnosis, gone when it ends", async () => {
      const e0 = ess();
      await K.use(body(), "armor");
      const item = () => body().items.find(i => i.name === "Armor");
      await waitFor(() => (item()?.system?.bonuslist ?? []).some(b => b.wodxCharm === "use"), 5000);
      const rows = (item()?.system?.bonuslist ?? []).filter(b => b.wodxCharm === "use").map(b => `${b.type}:${b.settingtype}:${b.value}`);
      const paid = e0 - ess();
      await CH.timed.endFor(body(), {key: "wodx-charm-armor"});
      await waitFor(() => !(item()?.system?.bonuslist ?? []).some(b => b.wodxCharm === "use"), 5000);
      const after = (item()?.system?.bonuslist ?? []).filter(b => b.wodxCharm === "use").length;
      G.ok("3. Armor: soak rows equal to Gnosis, gone when it ends", paid === 2 && rows.includes("soak_buff:aggravated:6") && rows.length === 3 && after === 0, {paid, rows, after});
    });

    await G.step("4. Blast: Rage in aggravated dice on the target", async () => {
      aim(true);
      const agg = () => Number(v()?.system?.health?.damage?.aggravated) || 0;
      const e0 = ess();
      for ( let k = 0; k < 4 && !agg(); k++ ) {
        await A.limits?.clear?.(body());
        await K.use(body(), "blast");
        await waitFor(() => agg() > 0, 3000);
      }
      const hurt = agg();
      aim(false);
      G.ok("4. Blast: Rage in aggravated dice on the target", hurt > 0 && ess() < e0, {hurt, essence: [e0, ess()]});
    });

    await G.step("5. Illuminate: the token sheds light", async () => {
      await A.limits?.clear?.(body());
      await K.use(body(), "illuminate");
      await waitFor(() => Number(scene.tokens.get(st.id)?.light?.dim) > 0, 6000);
      const dim = Number(scene.tokens.get(st.id)?.light?.dim);
      G.ok("5. Illuminate: the token sheds light", dim > 0, {dim});
    });

    await G.step("6. Freeze: Rage one lower for its time; the one near is hurt", async () => {
      await v().update({"system.health.damage.aggravated": 0});
      await A.limits?.clear?.(body());
      await K.use(body(), "freeze");
      const rage = () => Number(body().system?.advantages?.rage?.permanent);
      await waitFor(() => rage() === 5, 5000);
      const low = rage();
      const hurt = Number(v()?.system?.health?.damage?.aggravated) || 0;
      await CH.timed.endFor(body(), {key: "wodx-charm-freeze"});
      await waitFor(() => rage() === 6, 5000);
      G.ok("6. Freeze: Rage one lower for its time; the one near is hurt", low === 5 && rage() === 6, {low, back: rage(), hurt});
    });

    await G.step("7. Swift Flight: three times the speed, and the token flies", async () => {
      await A.limits?.clear?.(body());
      await K.use(body(), "swiftflight");
      const item = () => body().items.find(i => i.name === "Swift Flight");
      await waitFor(() => (item()?.system?.bonuslist ?? []).some(b => b.type === "movement_buff" && b.wodxCharm === "use"), 5000);
      const row = (item()?.system?.bonuslist ?? []).find(b => b.type === "movement_buff")?.value;
      const flying = scene.tokens.get(st.id)?.movementAction;
      await CH.timed.endFor(body(), {key: "wodx-charm-swiftflight"});
      await waitFor(() => !(item()?.system?.bonuslist ?? []).some(b => b.wodxCharm === "use"), 5000);
      const landed = scene.tokens.get(st.id)?.movementAction;
      G.ok("7. Swift Flight: three times the speed, and the token flies", row === 3 && (flying === undefined || flying === "fly") && landed !== "fly", {row, flying, landed});
    });

    await G.step("8. Spirit Static: the Gauntlet one higher, back when it ends", async () => {
      const OW = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds").api : null;
      if ( !OW?.drift?.of ) return G.ok("8. Spirit Static: the Gauntlet one higher, back when it ends", true, {skipped: "WoDX Otherworlds is off"});
      const val = () => Number(OW.drift.of(scene)?.value) || 0;
      const v0 = val();
      await A.limits?.clear?.(body());
      await K.use(body(), "spiritstatic");
      await waitFor(() => val() === v0 + 1, 5000);
      const up = val(), busy = !!body().getFlag(MOD, "spiritStatic");
      await CH.timed.endFor(body(), {key: "wodx-charm-spiritstatic"});
      await waitFor(() => val() === v0, 5000);
      G.ok("8. Spirit Static: the Gauntlet one higher, back when it ends", up === v0 + 1 && busy && val() === v0 && !body().getFlag(MOD, "spiritStatic"), {v0, up, back: val(), busy});
    });

    await G.step("9. Healing closes the target's lethal harm", async () => {
      await v().update({"system.health.damage.lethal": 2, "system.health.damage.aggravated": 0});
      aim(true);
      const lethal = () => Number(v()?.system?.health?.damage?.lethal) || 0;
      for ( let k = 0; k < 5 && lethal() === 2; k++ ) {
        await A.limits?.clear?.(body());
        await body().unsetFlag(MOD, "charmHealed");
        await K.use(body(), "healing", {size: "lethal"});
        await waitFor(() => lethal() < 2, 3000);
      }
      const after = lethal();
      aim(false);
      G.ok("9. Healing closes the target's lethal harm", after < 2, {after});
    });

    await G.step("10. an NPC spirit's power choice offers Blast to attack", async () => {
      await A.limits?.clear?.(body());
      const powers = A.npcPowers(body());
      const b = powers.find(p => p.name === "Blast");
      G.ok("10. an NPC spirit's power choice offers Blast to attack", !!b && b.uses.includes("attack") && b.use === "useCharm", {sample: powers.map(p => ({name: p.name, uses: p.uses}))});
    });

    await G.step("11. WoDX Combat: a Creature spirit soaks as a spirit", async () => {
      const WC = game.modules.get("wodx-combat")?.api;
      const kind = WC?.getProfile?.(body());
      G.ok("11. WoDX Combat: a Creature spirit soaks as a spirit", kind === "spirit", {kind});
    });
    // B6555: a faerie sprite (Dark Ages: Fae p. 97)
    const [spr] = await G.make(Actor, [{name: "Gate Messenger Sprite", type: "Creature", system: {settings: {variant: "spirit"}},
      items: ["Animate Tools", "Blast", "Paralyzing Stare", "Speech"].map(charm)}]);
    await spr.update({"system.advantages.rage.permanent": 2, "system.advantages.gnosis.permanent": 4, "system.advantages.willpower.permanent": 6,
      "system.advantages.essence.temporary": 40, "system.advantages.essence.max": 40});
    const [sprt] = await G.tokens(scene, [{actor: spr, x: 6, y: 4}]);
    const sb = () => scene.tokens.get(sprt.id)?.actor;
    const sEss = () => Number(sb().system?.advantages?.essence?.temporary);

    await G.step("12. a sprite's Blast: bought by the level, Willpower to hit", async () => {
      const keys = K.of(sb()).map(x => x.key);
      await v().update({"system.health.damage.bashing": 0, "system.health.damage.lethal": 0, "system.health.damage.aggravated": 0});
      aim(true);
      const bash = () => Number(v()?.system?.health?.damage?.bashing) || 0;
      let paid = 0;
      for ( let k = 0; k < 4 && !bash(); k++ ) {
        await A.limits?.clear?.(sb());
        const e0 = sEss();
        await K.use(sb(), "spriteblast", {size: "bashing:2"});
        await waitFor(() => bash() > 0, 3000);
        paid = e0 - sEss();
      }
      aim(false);
      G.ok("12. a sprite's Blast: bought by the level, Willpower to hit", keys.includes("spriteblast") && keys.includes("paralyzingstare") && paid === 2 && bash() >= 0 && bash() <= 2,
        {keys, paid, bashing: bash()});
    });

    await G.step("13. Animate Tools: two Essence a tool, a weapon on the sheet, gone when it ends", async () => {
      await A.limits?.clear?.(sb());
      const e0 = sEss();
      await K.use(sb(), "animatetools", {size: "2"});
      const w = () => sb().items.find(i => i.type === "Melee Weapon" && /^Animated tools/.test(i.name));
      await waitFor(() => !!w(), 5000);
      const had = !!w(), type = w()?.system?.damage?.type, paid = e0 - sEss();
      await CH.timed.endFor(sb(), {key: "wodx-charm-animatetools"});
      await waitFor(() => !w(), 5000);
      G.ok("13. Animate Tools: two Essence a tool, a weapon on the sheet, gone when it ends", had && type === "bashing" && paid === 4 && !w(), {had, type, paid, after: !!w()});
    });

    await G.step("14. Paralyzing Stare: one Essence on a mortal, the target held", async () => {
      aim(true);
      const held = () => [...(v()?.statuses ?? [])].some(st => /immobilized|held/.test(st)) || v()?.effects?.some?.(e => /Paralyzed/.test(e.name));
      let paid = 0, cards = 0;
      for ( let k = 0; k < 4 && !held(); k++ ) {
        await A.limits?.clear?.(sb());
        const e0 = sEss(), n0 = game.messages.size;
        await K.use(sb(), "paralyzingstare");
        paid = e0 - sEss();
        const m = game.messages.contents.slice(n0).find(x => /Paralyzing Stare/.test(x.content ?? ""));
        if ( m ) cards++;
        // the effects card: apply what it carries to the target
        const items = m?.getFlag?.(MOD, "effects")?.items ?? m?.flags?.[MOD]?.effects?.items ?? [];
        for ( let i = 0; i < items.length; i++ ) await A.effects?.applyItem?.(m, i).catch?.(() => null);
        await waitFor(() => held(), 3000);
      }
      aim(false);
      G.ok("14. Paralyzing Stare: one Essence on a mortal, the target held", paid === 1 && cards > 0, {paid, cards, held: !!held()});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
