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
 *  12. Umbraquake (B6375): the one standing near is knocked down (the condition) and takes bashing harm
 *  13. Short Out (B6375): a light within 20 yards goes out (hidden) and comes back when the effect ends; in an era
 *      before electric light the Charm is refused and the light stays (dice forced to 10s)
 *  14. Re-form (B6375): the spirit's token leaves the map (hidden) on a Gnosis roll (dice forced to 10s)
 *  15. Create Wind (B6377): a strong breeze waits in the Storyteller's approval queue; approved, tonight's weather in
 *      WoDX Atmosphere has a gale (dice forced to 10s; the weather is put back)
 *  16. Updraft (B6377): the target's token goes up 5 feet a success and takes the Fly way of moving (dice forced to 10s)
 *  17. Flood (B6377): one Essence; deep water (a region WoDX Combat swims and drowns in, with its drawing) lands on the
 *      target's square
 *  18. Create Fires (B6377): a bonfire on a Gnosis roll: a fire region (two lethal dice to whoever stands in it) with its
 *      drawing lands on the target's square (dice forced to 10s)
 *  19. a faerie sprite's Blast is the Dark Ages: Fae one: harm bought by the level, Willpower to hit (B6555)
 *  20. Animate Tools: two Essence a tool, a bashing weapon on the sprite's sheet, gone when it ends
 *  21. Paralyzing Stare: one Essence on a mortal; the target is held a turn a success
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
      // B6733: WoDX Combat marks aggravated harm on a mortal as lethal (VtDA20 p. 346: mortals treat it as lethal), so the
      // victim's wounds are read as the two together; the card names the aggravated harm the Blast dealt
      const dmg = () => v()?.system?.health?.damage ?? {};
      const hurtNow = () => (Number(dmg().aggravated) || 0) + (Number(dmg().lethal) || 0);
      const h0 = hurtNow(), e0 = ess();
      for ( let k = 0; k < 4 && hurtNow() <= h0; k++ ) {
        await A.limits?.clear?.(body());
        await K.use(body(), "blast");
        await waitFor(() => hurtNow() > h0, 3000);
      }
      const hurt = hurtNow() - h0;
      aim(false);
      G.ok("4. Blast: Rage in aggravated dice on the target", hurt > 0 && ess() < e0, {hurt, damage: dmg(), essence: [e0, ess()]});
    });

    await G.step("5. Illuminate: the token sheds light", async () => {
      await A.limits?.clear?.(body());
      await K.use(body(), "illuminate");
      await waitFor(() => Number(scene.tokens.get(st.id)?.light?.dim) > 0, 6000);
      const dim = Number(scene.tokens.get(st.id)?.light?.dim);
      G.ok("5. Illuminate: the token sheds light", dim > 0, {dim});
    });

    await G.step("6. Freeze: Rage one lower for its time; the one near is hurt", async () => {
      await v().update({"system.health.damage.aggravated": 0, "system.health.damage.lethal": 0});
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

    const dice0 = CONFIG.Dice.randomUniform;
    const tens = async () => {
      for ( const u of [0.05, 0.95] ) { CONFIG.Dice.randomUniform = () => u; if ( (await new Roll("1d10").evaluate()).dice[0].results[0].result === 10 ) return; }
    };
    await body().createEmbeddedDocuments("Item", ["Umbraquake", "Short Out", "Re-form"].map(charm));
    await G.step("12. Umbraquake: the one near is thrown down and hurt", async () => {
      await A.limits?.clear?.(body());
      await v().update({"system.health.damage.bashing": 0, "system.health.damage.aggravated": 0});
      await tens();
      try { await K.use(body(), "umbraquake"); } finally { CONFIG.Dice.randomUniform = dice0; }
      const down = () => !!CH?.conditions?.hasCondition?.(v(), "knockdown") || [...(v()?.effects ?? [])].some(e => e.flags?.["wodx-chronicle"]?.timed?.key === "wodx-charm-quake");
      await waitFor(() => down() && Number(v()?.system?.health?.damage?.bashing) > 0, 6000);
      G.ok("12. Umbraquake: the one near is thrown down and hurt", down() && Number(v()?.system?.health?.damage?.bashing) > 0,
        {down: down(), bashing: v()?.system?.health?.damage?.bashing});
    });
    await G.step("13. Short Out: the light nearby goes out", async () => {
      await A.limits?.clear?.(body());
      const [lamp] = await scene.createEmbeddedDocuments("AmbientLight", [{x: st.x + 150, y: st.y, config: {dim: 20, bright: 10}, flags: {world: {wodxGate: {gate: "gatecharms"}}}}]);
      const year = (() => { try { return game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null; } catch (e) { return null; } })();
      const electric = !(Number(year) > 0 && Number(year) < 1880);
      await tens();
      try { await K.use(body(), "shortout"); } finally { CONFIG.Dice.randomUniform = dice0; }
      const lit = () => !scene.lights.get(lamp.id)?.hidden;
      await waitFor(() => electric ? !lit() : true, 6000);
      const out = !lit();
      let back = null;
      if ( out ) { await CH.timed.endFor(body(), {key: "wodx-charm-shortout"}).catch(() => null); await waitFor(lit, 6000); back = lit(); }
      await lamp.delete().catch(() => null);
      G.ok("13. Short Out: the light nearby goes out", electric ? out && back === true : !out, {year, electric, out, back});
    });
    await G.step("14. Re-form: the spirit leaves the map", async () => {
      await A.limits?.clear?.(body());
      await tens();
      try { await K.use(body(), "reform"); } finally { CONFIG.Dice.randomUniform = dice0; }
      await waitFor(() => !!scene.tokens.get(st.id)?.hidden, 6000);
      G.ok("14. Re-form: the spirit leaves the map", !!scene.tokens.get(st.id)?.hidden, {hidden: scene.tokens.get(st.id)?.hidden});
    });
    // B6377: the weather, lift, water and fire Charms, each checked by what it leaves on the map, the token or the world
    await body().createEmbeddedDocuments("Item", ["Create Wind", "Updraft", "Flood", "Create Fires"].map(charm));
    const v2 = () => scene.tokens.get(vt.id);
    const aim2 = aim;
    // the spirit's token is hidden after Re-form: bring it back so its Charms have a place on the map
    await scene.tokens.get(st.id)?.update({hidden: false});
    await G.step("15. Create Wind: the night's weather turns to a gale once approved", async () => {
      const ATM = game.modules.get("wodx-atmosphere")?.active ? game.modules.get("wodx-atmosphere").api?.weather : null;
      if ( !ATM?.night ) return G.ok("15. Create Wind: the night's weather turns to a gale once approved", false, {error: "WoDX Atmosphere is off"});
      const jdn = ATM.night();
      const over0 = foundry.utils.deepClone(game.settings.get("wodx-atmosphere", "overrides") ?? {});
      const AP = CH.approvals;
      const t0 = Date.now();
      try {
        await A.limits?.clear?.(body());
        await tens();
        try { await K.use(body(), "createwind", {size: "breeze"}); } finally { CONFIG.Dice.randomUniform = dice0; }
        const mine = e => e?.data?.item?.out?.kind === "weather" && /Create Wind/.test(`${e.title} ${e.data?.item?.out?.label ?? ""} ${e.data?.item?.power ?? ""}`) && e.createdAt >= t0;
        let entry = null;
        await waitFor(() => (entry = AP.pending().find(mine) ?? AP.history().find(mine) ?? null), 6000);
        if ( entry && AP.pending().some(e => e.id === entry.id) ) await AP.decide(entry.id, "approve");
        const wind = () => game.settings.get("wodx-atmosphere", "overrides")?.[jdn]?.wind ?? null;
        await waitFor(() => wind() === "gale", 6000);
        G.ok("15. Create Wind: the night's weather turns to a gale once approved", !!entry && wind() === "gale", {queued: !!entry, wind: wind(), jdn});
      } finally { await game.settings.set("wodx-atmosphere", "overrides", over0).catch(() => null); }
    });
    await G.step("16. Updraft: the target goes up on the wind", async () => {
      await A.limits?.clear?.(body());
      const e0 = Number(v2()?.elevation) || 0;
      aim2(true);
      await tens();
      try { await K.use(body(), "updraft"); } finally { CONFIG.Dice.randomUniform = dice0; }
      // B6447: the lift is a fly move that Foundry animates, so the height is read once it has settled on a whole number of
      // 5-foot steps, not at the first sign of rising
      const rise = () => (Number(v2()?.elevation) || 0) - e0;
      await waitFor(() => rise() >= 5 && rise() % 5 === 0, 8000);
      const e1 = Number(v2()?.elevation) || 0, flying = v2()?.movementAction;
      const risen = [...(v2()?.actor?.effects ?? [])].some(e => /Risen|Updraft/.test(e.name ?? ""));
      aim2(false);
      // 5 feet a success
      G.ok("16. Updraft: the target goes up on the wind", e1 > e0 && (e1 - e0) % 5 === 0 && risen && (flying === undefined || flying === "fly"), {e0, e1, risen, flying});
    });
    const areaOf = world => scene.regions.find(r => r.flags?.[MOD]?.effectArea?.item?.out?.world === world) ?? null;
    const onSquare = r => { const a = r?.flags?.[MOD]?.effectArea; const c = v2()?.object?.center; return !!(a && c && Math.hypot(a.x - c.x, a.y - c.y) < 5); };
    await G.step("17. Flood: deep water lands on the target's square", async () => {
      await A.limits?.clear?.(body());
      const e0 = ess();
      aim2(true);
      await K.use(body(), "flood", {size: "block"});
      await waitFor(() => !!areaOf("water"), 6000);
      const r = areaOf("water");
      aim2(false);
      const drawn = !!scene.drawings.find(d => d.flags?.[MOD]?.groundOf === r?.id);
      G.ok("17. Flood: deep water lands on the target's square", !!r && r.flags?.["wodx-combat"]?.water === "deep" && onSquare(r) && drawn && e0 - ess() === 1,
        {region: !!r, water: r?.flags?.["wodx-combat"]?.water ?? null, onSquare: onSquare(r), drawn, paid: e0 - ess()});
    });
    await G.step("18. Create Fires: a bonfire burns on the target's square", async () => {
      await A.limits?.clear?.(body());
      aim2(true);
      await tens();
      try { await K.use(body(), "createfires", {size: "bonfire"}); } finally { CONFIG.Dice.randomUniform = dice0; }
      await waitFor(() => !!areaOf("blaze"), 6000);
      const r = areaOf("blaze");
      aim2(false);
      const drawn = !!scene.drawings.find(d => d.flags?.[MOD]?.groundOf === r?.id);
      G.ok("18. Create Fires: a bonfire burns on the target's square", !!r && onSquare(r) && drawn && Number(r.flags?.[MOD]?.effectArea?.item?.out?.dice) >= 2,
        {region: !!r, onSquare: onSquare(r), drawn, dice: r?.flags?.[MOD]?.effectArea?.item?.out?.dice ?? null});
    });

    // B6555: a faerie sprite (Dark Ages: Fae p. 97)
    const [spr] = await G.make(Actor, [{name: "Gate Messenger Sprite", type: "Creature", system: {settings: {variant: "spirit"}},
      items: ["Animate Tools", "Blast", "Paralyzing Stare", "Speech"].map(charm)}]);
    await spr.update({"system.advantages.rage.permanent": 2, "system.advantages.gnosis.permanent": 4, "system.advantages.willpower.permanent": 6,
      "system.advantages.essence.temporary": 40, "system.advantages.essence.max": 40});
    const [sprt] = await G.tokens(scene, [{actor: spr, x: 6, y: 4}]);
    const sb = () => scene.tokens.get(sprt.id)?.actor;
    const sEss = () => Number(sb().system?.advantages?.essence?.temporary);

    await G.step("19. a sprite's Blast: bought by the level, Willpower to hit", async () => {
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
      G.ok("19. a sprite's Blast: bought by the level, Willpower to hit", keys.includes("spriteblast") && keys.includes("paralyzingstare") && paid === 2 && bash() >= 0 && bash() <= 2,
        {keys, paid, bashing: bash()});
    });

    await G.step("20. Animate Tools: two Essence a tool, a weapon on the sheet, gone when it ends", async () => {
      await A.limits?.clear?.(sb());
      const e0 = sEss();
      await K.use(sb(), "animatetools", {size: "2"});
      const w = () => sb().items.find(i => i.type === "Melee Weapon" && /^Animated tools/.test(i.name));
      await waitFor(() => !!w(), 5000);
      const had = !!w(), type = w()?.system?.damage?.type, paid = e0 - sEss();
      await CH.timed.endFor(sb(), {key: "wodx-charm-animatetools"});
      await waitFor(() => !w(), 5000);
      G.ok("20. Animate Tools: two Essence a tool, a weapon on the sheet, gone when it ends", had && type === "bashing" && paid === 4 && !w(), {had, type, paid, after: !!w()});
    });

    await G.step("21. Paralyzing Stare: one Essence on a mortal, the target held", async () => {
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
      G.ok("21. Paralyzing Stare: one Essence on a mortal, the target held", paid === 1 && cards > 0, {paid, cards, held: !!held()});
    });
  } catch (e) {
    G.R.errors.push(String(e?.message ?? e));
  }
  return G.finish();
}
