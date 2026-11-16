/**
 * The day's sleep gate (WoDX Actions, B4890-B4899), rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedaysleep.mjs?${Date.now()}`)).run()
 * Makes its own scene and a vampire, moves the clock to the middle of a day and back, and puts the settings back.
 * Nothing calls the day-sleep tick: the clock moves and the token steps are the triggers (B6159).
 *   1. the api and the settings (day sleep, healing on rising, New Night and the sun's burns by themselves)
 *   2. by day the vampire falls asleep by itself: the flag, the sleep marker on the token, a Dawn card
 *   3. hurt while asleep: the Awakening roll runs by itself (a card), and the vampire is awake or asleep by its result
 *   4. at the rising hour the vampire rises by itself, the marker comes off, and a lethal wound heals with blood
 *   5. marked to stay awake: the next day the Road is rolled by itself (a "fights the dawn" card)
 *   6. a step into the open on a scene marked outdoors by day: aggravated damage lands, and the burning marker shows
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatedaysleep-result.json.
 */
import {gate, waitFor, newestMessage} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatedaysleep");
  if ( game.world.id !== "rothenstein-wodx" ) { G.ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return G.save(); }
  const keep = {};
  for ( const k of ["daySleep", "riseHeal", "sunDamage", "dawnDusk", "sky"] ) { try { keep[k] = game.settings.get(MOD, k); } catch (e) { keep[k] = undefined; } }
  const t0 = Date.now();
  try {
    const A = game.modules.get(MOD)?.api;
    const DS = A?.daySleep?.();
    await G.step("1. api and settings", async () => {
      G.ok("1. api and settings", !!DS?.tick && !!DS?.onHurt && keep.daySleep !== undefined && keep.riseHeal !== undefined,
        {settings: keep, defaults: {dawnDusk: game.settings.settings.get(`${MOD}.dawnDusk`)?.default, sunDamage: game.settings.settings.get(`${MOD}.sunDamage`)?.default}});
    });
    if ( !DS ) return;
    await game.settings.set(MOD, "daySleep", true);
    await game.settings.set(MOD, "riseHeal", true);

    const scene = await G.scene({activate: true});
    const vamp = await G.make(Actor, {name: "WoDX gate: day sleeper", type: "Vampire", ownership: {default: 3}, prototypeToken: {actorLink: true}});
    await vamp.update({"system.advantages.bloodpool.temporary": 8, "system.advantages.bloodpool.max": 10, "system.advantages.path.permanent": 5,
      "system.health.damage.lethal": 1, "system.advantages.virtues.selfcontrol.permanent": 3});
    const [tok] = await G.tokens(scene, [{actor: vamp, x: 3, y: 3}]);
    await new Promise(r => setTimeout(r, 400));

    // the middle of a day: step the clock to a time with the sun up and three hours or more to sunset
    const toDay = async () => {
      for ( let i = 0; i < 60; i++ ) {
        const s = await DS.sunClock();
        if ( s.isNight === false && s.toDusk > 3 * 3600 ) return s;
        await game.time.advance(1800);
      }
      return DS.sunClock();
    };
    const sleeping = () => !!vamp.getFlag(MOD, "daySleep");
    const marker = () => vamp.statuses?.has?.("sleep");

    await G.step("2. asleep by day", async () => {
      const s = await toDay(); // the clock alone: no tick call
      // the flag and the marker land first; the Dawn card follows once the clock's run has looked at everyone
      const fell = m => /falls into the day's sleep/.test(m.content ?? "") && m.content.includes(vamp.name);
      await waitFor(() => sleeping() && marker() && !!newestMessage(t0, fell), 10000);
      const card = newestMessage(t0, fell);
      G.ok("2. asleep by day", sleeping() && marker() && !!card, {sun: s, flag: vamp.getFlag(MOD, "daySleep"), marker: marker()});
    });

    await G.step("3. hurt while asleep", async () => {
      const since = Date.now();
      await vamp.update({"system.health.damage.bashing": 1});
      const card = await waitFor(() => newestMessage(since, m => /is hurt in the day's sleep/.test(m.content ?? "")), 8000);
      const consistent = sleeping() ? marker() : !marker() && !!vamp.getFlag(MOD, "daytime");
      G.ok("3. hurt while asleep", card && consistent && Number(vamp.system.health.damage.bashing) === 1, {asleep: sleeping(), daytime: vamp.getFlag(MOD, "daytime") ?? null, bashing: vamp.system.health.damage.bashing});
      await vamp.update({"system.health.damage.bashing": 0});
      if ( !sleeping() ) { await vamp.unsetFlag(MOD, "daytime"); await game.time.advance(60); await waitFor(sleeping, 8000); }
    });

    await G.step("4. rises at the hour, heals with blood", async () => {
      const wakeAt = vamp.getFlag(MOD, "daySleep")?.wakeAt;
      const blood0 = vamp.system.advantages.bloodpool.temporary;
      if ( wakeAt ) await game.time.advance(wakeAt - game.time.worldTime + 60);
      // the wound heals first and the blood is paid after it: wait for both
      await waitFor(() => !sleeping() && !marker() && vamp.system.health.damage.lethal === 0 && vamp.system.advantages.bloodpool.temporary < blood0, 12000);
      G.ok("4. rises at the hour, heals with blood", !!wakeAt && !sleeping() && !marker() && vamp.system.health.damage.lethal === 0 && vamp.system.advantages.bloodpool.temporary < blood0,
        {wakeAt, lethal: vamp.system.health.damage.lethal, blood: [blood0, vamp.system.advantages.bloodpool.temporary]});
    });

    await G.step("5. the dawn vigil", async () => {
      await vamp.setFlag(MOD, "dawnVigil", true);
      const since = Date.now();
      await toDay();
      const card = await waitFor(() => newestMessage(since, m => /fights the dawn/.test(m.content ?? "") || (m.flavor ?? "").includes("fights the dawn")), 10000);
      G.ok("5. the dawn vigil", card && (sleeping() || !!vamp.getFlag(MOD, "daytime")), {asleep: sleeping(), daytime: vamp.getFlag(MOD, "daytime") ?? null});
    });

    await G.step("6. burned in the sun, the marker shows", async () => {
      await game.settings.set(MOD, "sunDamage", "apply");
      if ( keep.sky !== undefined ) await game.settings.set(MOD, "sky", "clear");
      // the Chronicle's day starts before sunrise; the sun only burns once it is up (above the horizon), so wait for it
      let sun = await A.sunNow();
      for ( let i = 0; i < 24 && sun.phase !== "day"; i++ ) { await game.time.advance(1800); await new Promise(r => setTimeout(r, 150)); sun = await A.sunNow(); }
      await scene.setFlag(MOD, "light", "outdoors");
      const a0 = Number(vamp.system.health.damage.aggravated) || 0;
      // a step into the open by day (the token move is the trigger), no applySun call
      await tok.update({x: tok.x + scene.grid.size});
      await waitFor(() => (Number(vamp.system.health.damage.aggravated) || 0) > a0, 10000);
      G.ok("6. burned in the sun, the marker shows", (Number(vamp.system.health.damage.aggravated) || 0) > a0 && vamp.statuses?.has?.("burning"),
        {sun: {phase: sun.phase, altitude: sun.altitude, timeLabel: sun.timeLabel}, exposure: (() => { try { const e = A.sunExposure(tok, sun); return {exposed: !!e?.exposed, why: e?.why ?? ""}; } catch (e) { return String(e); } })(), aggravated: [a0, vamp.system.health.damage.aggravated], statuses: [...(vamp.statuses ?? [])]});
      await scene.setFlag(MOD, "light", "indoors");
    });

    await G.step("7. other modules answer", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-combat", "wodx-storyteller", "wodx-solo"].filter(id => game.modules.get(id)?.active);
      G.ok("7. other modules answer", ids.every(id => !!game.modules.get(id).api), {ids});
    });
  } catch (e) {
    G.R.errors.push(e?.message ?? String(e));
  } finally {
    for ( const [k, v] of Object.entries(keep) ) if ( v !== undefined ) { try { await game.settings.set(MOD, k, v); } catch (e) { /* gone */ } }
    return G.finish();
  }
}
