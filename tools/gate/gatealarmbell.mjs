/**
 * Someone walks into an alarm trigger: the place goes on alarm, its Alert zone's lamp comes on, and an hour of world
 * time later the alarm dies down and the lamp goes out (npc.alerts), in Foundry, in rothenstein-wodx, as Gamemaster
 * Test:
 *   await (await import(`/wodx-gate/gatealarmbell.mjs?${Date.now()}`)).run()
 * It makes its own scene, lamp, regions and actors and removes them; the kit puts the clock back.
 *   1. a token moved into a WoDX: Trigger region set to raise the alarm: the scene is on alarm and the Alert zone's
 *      lamp is lit on the canvas
 *   2. the clock moves an hour and a minute: the place is wary and the lamp is out
 * Result: Data/wodx-gate/gatealarmbell-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";

export async function run() {
  const G = gate("gatealarmbell", {stepTimeout: 240000});
  const since = Date.now();
  // the clock writes WoDX Chronicle's night's work journal; it is put back as it was, after the clock is
  const nightKey = "wodx-chronicle.nightWork", stored = () => game.settings.storage.get("world").getSetting?.(nightKey) ?? null;
  const nightBefore = stored()?.toObject?.() ?? null;
  // WoDX Storyteller logs the removals; its log is put back after the gate's own cleanup
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  let sc = null, lampId = null;
  const lamp = () => sc?.lights?.get(lampId) ?? null;
  const lampOnCanvas = () => canvas.lighting?.placeables?.find(l => l.document.id === lampId) ?? null;
  try {
    await G.step("1. walking into an alarm trigger: on alarm, the Alert zone's lamp lit", async () => {
      sc = await G.scene({width: 2000, height: 1500});
      const S = sc.grid.size;
      const [made] = await sc.createEmbeddedDocuments("AmbientLight", [{x: 6 * S, y: 7 * S, hidden: true, config: {bright: 1, dim: 2}}]);
      lampId = made.id;
      await sc.createEmbeddedDocuments("Region", [
        {name: "Gate Alarm zone", shapes: [{type: "rectangle", x: 4 * S, y: 5 * S, width: 6 * S, height: 6 * S, rotation: 0, hole: false}],
          behaviors: [{type: `${MOD}.alertZone`, name: "Alert zone", system: {lights: lampId, sounds: ""}}]},
        {name: "Gate Alarm bell rope", shapes: [{type: "rectangle", x: 12 * S, y: 2 * S, width: 3 * S, height: 3 * S, rotation: 0, hole: false}],
          behaviors: [{type: `${MOD}.trigger`, name: "Bell rope", system: {label: "the bell rope", does: "alarm", who: "anyone", once: false, fired: false}}]}]);
      const [walker, guard] = await G.make(Actor, [{name: "Gate Alarm Walker", type: "Mortal", ownership: {default: 3}}, {name: "Gate Alarm Guard", type: "Mortal"}]);
      const [tw] = await G.tokens(sc, [{actor: walker, x: 2, y: 2, actorLink: true}, {actor: guard, x: 7, y: 8, actorLink: true}]);
      await waitFor(() => canvas.tokens.get(tw.id) && lampOnCanvas(), 20000);
      const before = {level: sc.flags?.[MOD]?.alert?.shown ?? "calm", hidden: lamp()?.hidden};
      // the trigger: the walker's token moves onto the bell rope
      await canvas.tokens.get(tw.id).document.update({x: 13 * S, y: 3 * S}, {animate: false});
      await waitFor(() => lamp()?.hidden === false && sc.flags?.[MOD]?.alert?.shown === "alarm", 60000);
      const lit = lamp()?.hidden === false && !!lampOnCanvas() && lampOnCanvas().document.hidden === false;
      G.ok("1. walking into an alarm trigger: on alarm, the Alert zone's lamp lit",
        before.level === "calm" && before.hidden === true && sc.flags?.[MOD]?.alert?.shown === "alarm" && lit,
        {before, alert: sc.flags?.[MOD]?.alert ?? null, lit});
    });

    await G.step("2. an hour later: wary, the lamp out", async () => {
      await game.time.advance(3660);
      await waitFor(() => sc.flags?.[MOD]?.alert?.shown === "wary" && lamp()?.hidden === true, 60000);
      const out = lamp()?.hidden === true && lampOnCanvas()?.document.hidden === true;
      G.ok("2. an hour later: wary, the lamp out", sc.flags?.[MOD]?.alert?.shown === "wary" && out, {alert: sc.flags?.[MOD]?.alert ?? null, out});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    for ( const n of ["Gate Alarm Walker", "Gate Alarm Guard"] ) { const a = game.actors.getName(n); if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Alarm|on alarm|dies down|bell rope/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
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
