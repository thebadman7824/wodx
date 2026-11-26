/**
 * An NPC's hours follow its archetype: a cutpurse works the market crowd by day and the taproom at night, and its token
 * walks there on the map as the clock turns (npc.archetypes), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatearchetypehours.mjs?${Date.now()}`)).run()
 * It makes its own scene (a market, a tavern and an alley), one Mortal with the archetype "cutpurse" and a routine of no
 * preset of its own, and removes them; the kit puts the clock back.
 *   1. the clock to 10:00 on a weekday: the cutpurse's token stands in the market
 *   2. the clock to 19:00: the token stands in the tavern
 * Result: Data/wodx-gate/gatearchetypehours-result.json.
 */
import {gate, waitFor} from "./kit.mjs";

const MOD = "wodx-npc";
const PLACES = [
  {key: "market", label: "Gate Archetype Market", rect: [100, 100, 400, 300]},
  {key: "tavern", label: "Gate Archetype Tavern", rect: [700, 100, 400, 300]},
  {key: "alley", label: "Gate Archetype Alley", rect: [100, 600, 400, 300]}
];

export async function run() {
  const G = gate("gatearchetypehours", {stepTimeout: 240000});
  const since = Date.now();
  // the clock writes WoDX Chronicle's night's work journal; it is put back as it was, after the clock is
  const nightKey = "wodx-chronicle.nightWork", stored = () => game.settings.storage.get("world").getSetting?.(nightKey) ?? null;
  const nightBefore = stored()?.toObject?.() ?? null;
  const log = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "log"));
  const N = game.modules.get(MOD).api;
  let sc = null, npc = null;
  const region = key => sc?.regions?.find(r => r.name === PLACES.find(p => p.key === key)?.label) ?? null;
  const tok = () => canvas.tokens?.placeables?.find(t => t.document.actorId === npc?.id) ?? null;
  const standsIn = key => { const t = tok(), r = region(key); return !!t && !!r && [...(t.document.regions ?? [])].some(x => x.id === r.id); };
  // seconds from now to the next hour h on a day the cutpurse works the market (Monday to Saturday)
  const until = async h => {
    await N.routines.loadCalendar();
    const d = N.routines.describer();
    const now = game.time.worldTime;
    for ( let k = 0; k < 9; k++ ) {
      const cur = d(now);
      let dt = (((h - cur.hour) * 3600 - (cur.minute ?? 0) * 60) % 86400 + 86400) % 86400 + k * 86400;
      if ( dt < 600 ) continue;
      const at = d(now + dt);
      if ( at.dayOfWeek !== 6 && !at.feast ) return dt;
    }
    return null;
  };
  try {
    await G.step("1. 10:00 on a weekday: the cutpurse stands in the market", async () => {
      sc = await G.scene({width: 1500, height: 1000});
      await sc.createEmbeddedDocuments("Region", PLACES.map(p => ({name: p.label,
        shapes: [{type: "rectangle", x: p.rect[0], y: p.rect[1], width: p.rect[2], height: p.rect[3], rotation: 0, hole: false}],
        flags: {[MOD]: {place: {kind: p.key}}}})));
      await sc.setFlag(MOD, "routineMode", "auto");
      // setup: a cutpurse by archetype, a routine with no preset of its own, its places named on this scene
      const roles = Object.fromEntries(PLACES.map(p => [p.key, region(p.key)?.uuid]));
      npc = await G.make(Actor, {name: "Gate Archetype Tobias", type: "Mortal", prototypeToken: {actorLink: true},
        flags: {[MOD]: {archetype: "cutpurse", routine: {on: true, mode: null, preset: null, age: null, roles, blocks: null}}}});
      await G.tokens(sc, [{actor: npc, x: 13, y: 8}]);
      const preset = N.profileFor(npc)?.template ?? null;
      // the trigger: the clock to the next weekday 10:00
      const dt = await until(10);
      await game.time.advance(dt);
      await waitFor(() => standsIn("market"), 60000);
      G.ok("1. 10:00 on a weekday: the cutpurse stands in the market", preset === "cutpurse" && standsIn("market"),
        {template: preset, advanced: dt, where: N.routines.whereOf(game.actors.get(npc.id))?.place ?? null, market: region("market")?.uuid ?? null,
          at: tok() ? {x: tok().document.x, y: tok().document.y} : null});
    });

    await G.step("2. 19:00: the cutpurse stands in the tavern", async () => {
      await game.time.advance(9 * 3600);
      await waitFor(() => standsIn("tavern"), 60000);
      G.ok("2. 19:00: the cutpurse stands in the tavern", standsIn("tavern"),
        {where: N.routines.whereOf(game.actors.get(npc.id))?.place ?? null, tavern: region("tavern")?.uuid ?? null,
          at: tok() ? {x: tok().document.x, y: tok().document.y} : null});
    });
  } catch (e) {
    G.R.errors.push(`${e?.message ?? e}`);
  } finally {
    const a = game.actors.getName("Gate Archetype Tobias");
    if ( a ) { try { await a.delete(); } catch (e) { G.R.notes.push(`actor: ${e?.message ?? e}`); } }
    await new Promise(r => setTimeout(r, 8000));
    for ( const x of game.messages.contents.filter(x => (x.timestamp ?? 0) >= since && /Gate Archetype/.test(`${x.speaker?.alias ?? ""} ${x.content ?? ""}`)) ) { try { await x.delete(); } catch (e) { /* leave it */ } }
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
