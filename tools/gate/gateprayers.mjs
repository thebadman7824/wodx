/**
 * The five daily prayers, Ramadan's nights and houses of worship (NPC 0.50.0, Senses 0.9.0, Interactables 0.35.3,
 * Otherworlds 0.23.1; B2660 to B2662), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateprayers.mjs?${Date.now()}`)).run()
 * Makes three scenes ("WoDX gate: Cairo" in Egypt, "WoDX gate: Al-Azhar" tagged as a mosque, "WoDX gate: Brno") and
 * two NPCs; deletes all of it after. The clock does not move.
 *   1. versions and api
 *   2. a Cairo merchant's routine holds the five prayers and Ramadan's blocks; the routine window's hours do not
 *   3. at the hour of the dawn prayer (by the describer's own sunrise) the merchant prays at home
 *   4. the church role of a Muslim NPC finds the mosque; a Brno merchant's finds no mosque
 *   5. a Western NPC keeps the hours as written, with no prayers
 *   5b. (NPC 0.65.0) a Jewish merchant goes to the synagogue's two services, a Hindu one keeps the shrine at dawn and
 *       dusk, and Beijing in 1970 keeps no rite by default
 *   6. Senses has lines for the mosque, the synagogue and the temple
 *   7. a routine tick runs
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gateprayers-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const npc = () => game.modules.get("wodx-npc")?.api;
  const scenes = [], actors = [];
  const t0 = game.time.worldTime;
  try {
    const RR = await import(`/modules/wodx-npc/scripts/routine-rules.mjs?${Date.now()}`);
    const made0 = await Scene.create([{name: "WoDX gate: Cairo", width: 1000, height: 1000, padding: 0},
      {name: "WoDX gate: Al-Azhar", width: 1000, height: 1000, padding: 0}, {name: "WoDX gate: Brno", width: 1000, height: 1000, padding: 0}]);
    const [cairo, azhar, brno] = ["Cairo", "Al-Azhar", "Brno"].map(n => made0.find(x => x.name.endsWith(n)));
    scenes.push(cairo, azhar, brno);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt", "flags.wodx-npc.place": {kind: "home", owner: "", private: false}});
    await azhar.update({"flags.wodx-chronicle.place.region": "egypt", "flags.wodx-npc.place": {kind: "mosque", owner: "", private: false}});
    const routine = {on: true, mode: null, preset: "merchant", age: null, roles: {home: cairo.uuid}, blocks: null};
    const made = await createActors([
      {name: "WoDX gate: Cairo merchant", type: "Mortal", flags: {"wodx-npc": {routine, resident: {scene: cairo.uuid}}}},
      {name: "WoDX gate: Brno merchant", type: "Mortal", flags: {"wodx-npc": {routine: {...routine, roles: {}}, resident: {scene: brno.uuid}}}}]);
    actors.push(...made);
    const [m1, m2] = made;
    const r = () => npc().routines;

    await step("versions and api", async () => {
      const v = id => game.modules.get(id)?.version, older = (a, id) => foundry.utils.isNewerVersion(a, v(id) ?? "0");
      ok("versions and api", !older("0.50.0", "wodx-npc") && !older("0.9.0", "wodx-senses") && !older("0.35.3", "wodx-interactables") && !older("0.23.1", "wodx-otherworlds")
        && typeof RR.withPrayers === "function" && !!RR.PLACE_KINDS.mosque,
        {npc: v("wodx-npc"), senses: v("wodx-senses"), inter: v("wodx-interactables"), ow: v("wodx-otherworlds")});
    });
    await step("the prayers are laid over the routine", async () => {
      const k = r().keepOf(m1), b = r().blocksFor(m1);
      const prayers = b.filter(x => x.prayer).map(x => x.prayer);
      const shown = RR.blocksOf(m1.flags["wodx-npc"].routine, "civilian", game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.(), k, {prayers: false});
      ok("the prayers are laid over the routine", k.faith === "islamic" && prayers.length === 9 && !shown.some(x => x.prayer), {keep: k, prayers});
    });
    await step("the dawn prayer at home, by the day's sunrise", async () => {
      await r().loadCalendar();
      const describe = r().describer("islamic"), d = describe(t0);
      const m = /^(\d{1,2}):(\d{2})$/.exec(d.sunrise ?? "");
      const rise = m ? Number(m[1]) * 3600 + Number(m[2]) * 60 : 6 * 3600;
      const midnight = t0 - (d.hour * 3600 + d.minute * 60 + (d.second ?? 0));
      const t = midnight + rise - 70 * 60;
      const at = RR.placeAt(r().blocksFor(m1), t, describe, {places: r().listPlaces(), roles: m1.flags["wodx-npc"].routine.roles, seed: m1.id, faith: "islamic"});
      ok("the dawn prayer at home, by the day's sunrise", at.block?.prayer === "dawn" && at.place === cairo.uuid && typeof d.ramadan === "boolean",
        {sunrise: d.sunrise, ramadan: d.ramadan, block: at.block?.label, place: at.place});
    });
    await step("the church role finds the mosque", async () => {
      const places = r().listPlaces();
      const a = RR.resolvePlace({place: "church"}, {places, roles: {}, seed: m1.id, faith: "islamic"}).place;
      const b = RR.resolvePlace({place: "church"}, {places, roles: {}, seed: m2.id, faith: "western"}).place;
      ok("the church role finds the mosque", a === azhar.uuid && b !== azhar.uuid, {muslim: a, western: b});
    });
    await step("a Western NPC keeps its hours", async () => {
      const k = r().keepOf(m2), b = r().blocksFor(m2);
      ok("a Western NPC keeps its hours", k.faith !== "islamic" && !b.some(x => x.prayer), {keep: k});
    });
    await step("the other faiths' daily worship", async () => {
      const keys = (keep, y = 1700) => RR.blocksOf({preset: "merchant"}, "civilian", y, keep).filter(x => x.prayer).map(x => x.prayer);
      const got = {jewish: keys({faith: "jewish", region: "moravia"}), hindu: keys({faith: "hindu", region: "india"}), china1970: keys({faith: "chinese", region: "china"}, 1970)};
      ok("the other faiths' daily worship", typeof RR.withWorship === "function" && JSON.stringify(got) === JSON.stringify({jewish: ["shacharit", "mincha"], hindu: ["puja", "lamp"], china1970: []}), {got});
    });
    await step("Senses has lines for the houses of worship", async () => {
      const kinds = game.modules.get("wodx-senses")?.api?.tables?.places?.kinds ?? {};
      ok("Senses has lines for the houses of worship", ["mosque", "synagogue", "temple"].every(k => kinds[k]?.sight?.length && kinds[k]?.sound?.length));
    });
    await step("a routine tick runs", async () => {
      const out = await r().tick("jump", {scene: null, post: false});
      ok("a routine tick runs", !!out, {updates: out?.updates?.length});
    });
    await step("every other WoDX module still answers", async () => {
      const ids = ["wodx-chronicle", "wodx-storyteller", "wodx-npc", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-atmosphere", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("every other WoDX module still answers", !missing.length, {missing});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { if ( actors.length ) await Actor.deleteDocuments(actors.filter(Boolean).map(a => a.id)); } catch (e) { R.errors.push(`cleanup actors: ${e.message}`); }
    try { if ( scenes.length ) await Scene.deleteDocuments(scenes.filter(Boolean).map(s => s.id)); } catch (e) { R.errors.push(`cleanup scenes: ${e.message}`); }
    if ( game.time.worldTime !== t0 ) R.errors.push("the clock moved");
  }
  return save(R, "gateprayers-result.json");
}
