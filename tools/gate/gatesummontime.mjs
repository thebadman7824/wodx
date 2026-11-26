/**
 * A summoned being stands on the map for the time its power gives, and leaves the map once the clock passes it
 * (actions.summons), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesummontime.mjs?${Date.now()}`)).run()
 * It makes its own scene, summoner and summoned being and removes them (and the plain summoned base it made); the kit
 * puts the clock back.
 *   1. a spirit called for an hour is a token on the canvas with its "Summoned" timer; two hours of world time later its
 *      token is gone from the canvas
 * Result: Data/wodx-gate/gatesummontime-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-actions";

export async function run() {
  const G = gate("gatesummontime", {stepTimeout: 240000});
  const since = Date.now();
  // the clock writes WoDX Chronicle's night's work journal; it is put back as it was, after the clock is
  const nightKey = "wodx-chronicle.nightWork", stored = () => game.settings.storage.get("world").getSetting?.(nightKey) ?? null;
  const nightBefore = stored()?.toObject?.() ?? null;
  const basesBefore = new Set(game.actors.filter(a => a.getFlag(MOD, "summonBase")).map(a => a.id));
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  try {
    await G.step("1. called for an hour: on the canvas, then gone once the clock passes it", async () => {
      const S = game.modules.get(MOD).api.summons;
      const sc = await G.scene({width: 1500, height: 1000});
      const caller = await G.make(Actor, {name: "Gate Summon Time Caller", type: "Demon", system: {advantages: {willpower: {permanent: 5, temporary: 5}}}});
      await G.tokens(sc, [{actor: caller, x: 2, y: 2}]);
      // setup: the power's result, a spirit that stays one hour, placed where the card's item was clicked
      const rec = await S.bring({out: {label: "Gate Summon Time spirit", summon: S.rules.resolve({what: "spirit", profile: "called", lasts: {kind: "hours", n: 1}}, {successes: 1})}, caster: caller.uuid},
        {src: null, at: {x: 650, y: 450}, casterName: caller.name, scene: sc});
      const mine = () => (canvas.tokens?.placeables ?? []).filter(t => t.document.flags?.[MOD]?.summon?.id === rec?.summon);
      await waitFor(() => mine().length > 0, 30000);
      const shown = mine().length;
      const timed = mine().some(t => t.actor?.effects?.some(e => e.flags?.["wodx-chronicle"]?.timed?.revert?.key === "wodx-actions.summonEnd"));
      // the trigger: the clock passes its hour
      await game.time.advance(2 * 3600);
      await waitFor(() => mine().length === 0, 60000);
      G.ok("1. called for an hour: on the canvas, then gone once the clock passes it", shown > 0 && timed && mine().length === 0,
        {shown, timed, left: mine().length, summon: rec?.summon ?? null, note: rec?.note ?? null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const a of game.actors.filter(a => a.getFlag(MOD, "summonBase") && !basesBefore.has(a.id)) ) { try { await a.delete(); } catch (e) { /* gone */ } }
    const a = game.actors.getName("Gate Summon Time Caller");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Summon Time/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
    try { await game.settings.set("wodx-storyteller", "log", log); } catch (e) { G.R.notes.push(`log: ${e?.message ?? e}`); }
    const out = await G.finish();
    await new Promise(r => setTimeout(r, 3000));
    try {
      const now = stored();
      if ( !nightBefore && now ) await now.delete();
      else if ( nightBefore && now && JSON.stringify(now.value) !== JSON.stringify(nightBefore.value) ) await now.update({value: nightBefore.value});
      else if ( nightBefore && !now ) await game.settings.storage.get("world").documentClass.create(nightBefore);
    } catch (e) { /* the lane's own pass puts it back */ }
    return out;
  }
}
