/**
 * Open world by era gate (WoDX Storyteller 0.22.0, NPC 0.13.0, Chronicle 0.16.0), in rothenstein-wodx (the testing
 * world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateoworld.mjs?${Date.now()}`)).run()
 * Makes two scenes "WoDX gate: Road A" and "WoDX gate: Road B", three NPCs and a traveller; deletes all of it after.
 * While it runs only its own two scenes are open for travel (the window marks places), so it puts nothing back but
 * what it made. The clock does not move.
 *   1. versions and api
 *   2. a trip by distance: 9 km on a country road on foot, by the year, the weather and the dark
 *   3. hand-typed minutes still win
 *   4. the fastest way open is picked when none is asked, and a train with no line falls back
 *   5. routines: the year's age and its hours for a labourer
 *   6. the rumour mill: big news, the year's media, and the twist setting
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gateoworld-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const st = () => game.modules.get("wodx-storyteller")?.api;
  const scenes = [], actors = [];
  let rumourId = null;
  try {
    const [A, B] = await Scene.create([{name: "WoDX gate: Road A", width: 1000, height: 1000, padding: 0}, {name: "WoDX gate: Road B", width: 1000, height: 1000, padding: 0}]);
    scenes.push(A, B);
    const made = await Actor.create([{name: "WoDX gate: Traveller", type: "Mortal"}, {name: "WoDX gate: Gossip one", type: "Mortal"},
      {name: "WoDX gate: Gossip two", type: "Mortal"}, {name: "WoDX gate: Gossip three", type: "Mortal"}]);
    actors.push(...made);
    await A.createEmbeddedDocuments("Token", made.map((a, i) => ({name: a.name, actorId: a.id, x: 100 * (i + 1), y: 100})));
    await st().setTravel(A, {on: true});
    await st().setTravel(B, {on: true, km: 9, road: "road"});
    const ctx = st().tripContext(st().personalTime(made[0].id));
    R.notes.push({year: ctx.year, night: ctx.night, weather: ctx.weather ? {precip: ctx.weather.precip, snowLying: ctx.weather.snowLying, fog: ctx.weather.fog} : null});

    await step("versions and api", async () => {
      const v = id => game.modules.get(id)?.version;
      ok("versions and api", v("wodx-storyteller") === "0.22.0" && v("wodx-npc") === "0.13.0" && v("wodx-chronicle") === "0.16.0"
        && typeof st().tripContext === "function" && !!st().roads?.MODES && typeof st().rumours?.media === "function",
        {st: v("wodx-storyteller"), npc: v("wodx-npc"), chron: v("wodx-chronicle")});
    });
    await step("a trip by distance", async () => {
      const p = st().planTrip(made[0], B.id, {mode: "foot"});
      const base = 120, max = base * 2.5 * 1.5;
      ok("a trip by distance", p?.trip?.by === "distance" && p.trip.mode === "foot" && p.minutes >= base && p.minutes <= max,
        {minutes: p?.minutes, by: p?.trip?.by, mode: p?.trip?.mode, why: p?.trip?.why, words: st().tripWords(p)});
    });
    await step("hand-typed minutes win", async () => {
      await st().setTravel(B, {on: true, km: 9, road: "road", minutes: 45});
      const p = st().planTrip(made[0], B.id, {mode: "foot"});
      ok("hand-typed minutes win", p?.minutes === 45 && p.trip.by === "place", {minutes: p?.minutes, by: p?.trip?.by});
      await st().setTravel(B, {on: true, km: 9, road: "road", minutes: null});
    });
    await step("fastest way and fallback", async () => {
      const fast = st().planTrip(made[0], B.id);
      const want = st().roads.modesFor("road", ctx.year, {future: ctx.future})[0]?.id;
      await st().setTravel(B, {on: true, km: 90, road: "road"});
      const train = st().planTrip(made[0], B.id, {mode: "train"});
      ok("fastest way and fallback", fast?.trip?.mode === want && train?.trip?.mode && train.trip.mode !== "train",
        {fast: fast?.trip?.mode, want, train: train?.trip?.mode});
    });
    await step("routines by age", async () => {
      const Rr = await import("/modules/wodx-npc/scripts/routine-rules.mjs");
      const year = Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 0;
      const age = Rr.ageOf(year);
      const blocks = Rr.blocksOf({preset: "labourer"}, "civilian", year);
      ok("routines by age", !!Rr.AGES[age] && blocks.length > 0 && Rr.checkBlocks(blocks).length === 0 && !!Rr.PRESETS.factory && !!Rr.PRESETS.student,
        {year, age, blocks: blocks.length});
    });
    await step("the rumour mill by age", async () => {
      const m = st().rumours.media();
      const garble = game.settings.settings.has("wodx-storyteller.rumourGarble");
      const r = await st().rumours.start({text: "WoDX gate: they say the bridge is haunted", tellers: [made[1].id], big: true});
      rumourId = r?.id;
      await st().rumours.tick({force: true, once: r.id});
      await sleep(300);
      const now = st().rumours.list().find(x => x.id === r.id);
      ok("the rumour mill by age", !!m?.label && garble && now?.big === true && now.knownBy.length >= 2,
        {media: m?.id, known: now?.knownBy?.length, big: now?.big});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-atmosphere"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( rumourId ) await st().rumours.remove(rumourId);
      for ( const s of scenes ) await s.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateoworld-result.json");
}
