/**
 * News, travel and the week by world region (Chronicle 0.50.0, Storyteller 0.57.0, NPC 0.49.0; B2570 to B2572), in
 * rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateregions.mjs?${Date.now()}`)).run()
 * Makes two scenes "WoDX gate: Cairo" and "WoDX gate: Brno" and three NPCs; deletes all of it after. The clock does not move.
 *   1. versions and api
 *   2. the rumour mill reads the homeland's years
 *   3. a trip's context carries the region of the scene it starts from
 *   4. the ways open differ by region in the same year where the years differ
 *   5. routines: an NPC living on a scene in Egypt keeps Friday prayer; one whose routine picks the Jewish year keeps the Sabbath
 *   6. routines: a Western NPC keeps the hours as written, and a tick runs
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gateregions-result.json.
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
  const st = () => game.modules.get("wodx-storyteller")?.api;
  const ch = () => game.modules.get("wodx-chronicle")?.api;
  const npc = () => game.modules.get("wodx-npc")?.api;
  const scenes = [], actors = [];
  const t0 = game.time.worldTime;
  try {
    const made0 = await Scene.create([{name: "WoDX gate: Cairo", width: 1000, height: 1000, padding: 0}, {name: "WoDX gate: Brno", width: 1000, height: 1000, padding: 0}]);
    const cairo = made0.find(x => x.name.endsWith("Cairo")), brno = made0.find(x => x.name.endsWith("Brno"));
    scenes.push(cairo, brno);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    const routine = {on: true, mode: null, preset: "merchant", age: null, roles: {}, blocks: null};
    const made = await createActors([
      {name: "WoDX gate: Cairo merchant", type: "Mortal", flags: {"wodx-npc": {routine, resident: {scene: cairo.uuid}}}},
      {name: "WoDX gate: Sabbath merchant", type: "Mortal", flags: {"wodx-npc": {routine: {...routine, faith: "jewish"}, resident: {scene: brno.uuid}}}},
      {name: "WoDX gate: Brno merchant", type: "Mortal", flags: {"wodx-npc": {routine, resident: {scene: brno.uuid}}}}]);
    actors.push(...made);
    const year = Number(ch()?.eras?.currentYear?.()) || 0, home = ch()?.world?.homeland?.();
    R.notes.push({year, homeland: home});

    await step("versions and api", async () => {
      const v = id => game.modules.get(id)?.version;
      ok("versions and api", !foundry.utils.isNewerVersion("0.50.0", v("wodx-chronicle")) && !foundry.utils.isNewerVersion("0.57.0", v("wodx-storyteller"))
        && !foundry.utils.isNewerVersion("0.49.0", v("wodx-npc")) && !!st().roads?.REGION_ROADS && typeof npc()?.routines?.keepOf === "function"
        && typeof ch()?.church?.faithOf === "function", {chron: v("wodx-chronicle"), st: v("wodx-storyteller"), npc: v("wodx-npc")});
    });
    await step("the rumour mill reads the homeland", async () => {
      const Media = await import("/modules/wodx-chronicle/scripts/media-rules.mjs");
      const fut = !!game.settings.get("wodx-chronicle", "rule.futureBranch");
      const want = Media.mediaFor(year, {future: fut, region: home});
      ok("the rumour mill reads the homeland", st().rumours.media()?.id === want.id, {got: st().rumours.media()?.id, want: want.id});
    });
    await step("a trip's context carries the region", async () => {
      const a = st().tripContext(t0, cairo), b = st().tripContext(t0, brno), c = st().tripContext(t0);
      ok("a trip's context carries the region", a.region === "egypt" && b.region === home && c.region === home, {a: a.region, b: b.region, c: c.region});
    });
    await step("the ways differ by region", async () => {
      const Road = st().roads, ids = (r, y) => Road.modesFor("rail", y, {region: r}).map(m => m.id).join(",");
      ok("the ways differ by region", ids("british-isles", 1830).includes("train") && !ids("moravia", 1830).includes("train")
        && !ids("tibet-himalaya", 1990).includes("train") && ids(home, year) === ids(home, year), {gb1830: ids("british-isles", 1830), mor1830: ids("moravia", 1830)});
    });
    await step("routines by faith", async () => {
      const k1 = npc().routines.keepOf(made[0]), k2 = npc().routines.keepOf(made[1]);
      const b1 = npc().routines.blocksFor(made[0]), b2 = npc().routines.blocksFor(made[1]);
      const pray = bs => bs.find(b => b.place === "church" && Array.isArray(b.days) && b.days.length === 1);
      ok("routines by faith", k1.faith === "islamic" && k2.faith === "jewish" && pray(b1)?.days?.[0] === 4 && pray(b2)?.days?.[0] === 5,
        {k1, k2, cairo: pray(b1), sabbath: pray(b2)});
    });
    await step("a Western NPC keeps its hours, and a tick runs", async () => {
      const k = npc().routines.keepOf(made[2]);
      const RR = await import("/modules/wodx-npc/scripts/routine-rules.mjs");
      const plain = RR.blocksOf(made[2].flags["wodx-npc"].routine, "civilian", year);
      const same = k.faith !== "western" || JSON.stringify(plain) === JSON.stringify(npc().routines.blocksFor(made[2]));
      const r = await npc().routines.tick("jump", {scene: null, post: false});
      ok("a Western NPC keeps its hours, and a tick runs", same && !!r, {faith: k.faith});
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
  return save(R, "gateregions-result.json");
}
