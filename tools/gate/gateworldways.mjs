/**
 * Passers-by, residents, clergy and trades by region (Chronicle 0.51.0, NPC 0.51.0, Creation 0.23.0; B2670 to B2673),
 * in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateworldways.mjs?${Date.now()}`)).run()
 * Makes two scenes ("WoDX gate: Cairo ways" in Egypt with a house of worship and a weaver's house, and "WoDX gate:
 * Brno ways" in the homeland with a chapel) and deletes them after. Nothing is seeded; the clock does not move.
 *   1. versions and api
 *   2. every region has a way of life; Cairo's scene reads as Egypt, the Brno one as the homeland
 *   3. Cairo's street (the served rules) has a dervish and no tavern drunk; passers-by carry Egypt's tags
 *   4. Cairo's house of worship plans an imam of a Muslim people; the Brno chapel plans a Christian priest
 *   5. the People generator draws Egypt's own trades for its era, with a sheet for each
 *   6. every other WoDX module still answers
 *   7. NPC 0.52.0 (B2674): local looks; Persia and Morocco, China and Korea walk different streets in every age, a
 *      looks-only change keeps the kind, and Moravia's street is untouched
 * Result: Data/wodx-gate/gateworldways-result.json.
 */
const N = 7;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateworldways-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const HOUSES = [
  {id: "ways-worship", label: "House of worship", kind: "church", rect: [100, 100, 400, 300], hh: {id: "ways-worship-hh", label: "House of worship", trade: "priest",
    people: ["priest", "servant"].map(role => ({role}))}},
  {id: "ways-weaver", label: "Weaver's house", kind: "home", rect: [600, 100, 300, 300], hh: {id: "ways-weaver-hh", label: "Weaver's household", trade: "weaver",
    people: ["weaver", "partner"].map(role => ({role}))}}
];

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const v = id => game.modules.get(id)?.version, older = (a, id) => foundry.utils.isNewerVersion(a, v(id) ?? "0");
  const chron = () => game.modules.get("wodx-chronicle")?.api, npc = () => game.modules.get("wodx-npc")?.api;
  const scenes = [];
  const t0 = game.time.worldTime;
  try {
    const PR = await import(`/modules/wodx-npc/scripts/passerby-rules.mjs?${Date.now()}`);
    const RS = await import(`/modules/wodx-npc/scripts/resident-rules.mjs?${Date.now()}`);
    const made = await Scene.create([{name: "WoDX gate: Cairo ways", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}},
      {name: "WoDX gate: Brno ways", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}}]);
    const cairo = made.find(s => s.name.endsWith("Cairo ways")), brno = made.find(s => s.name.endsWith("Brno ways"));
    scenes.push(cairo, brno);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    for ( const s of [cairo, brno] ) await s.createEmbeddedDocuments("Region", HOUSES.map(h => ({name: h.label,
      shapes: [{type: "rectangle", x: h.rect[0], y: h.rect[1], width: h.rect[2], height: h.rect[3], rotation: 0, hole: false}],
      flags: {"wodx-interactables": {adoptId: h.id, household: h.hh}, "wodx-npc": {place: {kind: h.kind}}}})));
    await sleep(300);
    const year = Number(chron()?.eras?.currentYear?.()) || 1197;
    R.notes.push(`year ${year}, homeland ${chron()?.world?.homeland?.()}`);

    await step("1. versions and api", async () => {
      ok("1. versions and api", !older("0.51.0", "wodx-chronicle") && !older("0.51.0", "wodx-npc") && !older("0.23.0", "wodx-creation")
        && typeof chron()?.world?.rules?.sphereFor === "function" && typeof PR.streetTable === "function" && typeof RS.localClergy === "function",
        {chronicle: v("wodx-chronicle"), npc: v("wodx-npc"), creation: v("wodx-creation")});
    });
    await step("2. ways of life", async () => {
      const W = chron().world.rules, ids = Object.keys(W.WORLD_REGIONS);
      const all = ids.every(id => [1197, 1600, 1900, 2050].every(y => W.SPHERES[W.sphereFor(id, y)]));
      const here = chron().world.here(cairo)?.id, home = chron().world.here(brno)?.id;
      ok("2. ways of life", all && here === "egypt" && home === chron().world.homeland(), {regions: ids.length, cairo: here, brno: home});
    });
    await step("3. Cairo's street", async () => {
      const t = PR.streetTable(1300, "egypt");
      const p = PR.makePasserby({year, hour: 11, region: "egypt"});
      const m = PR.makePasserby({year, hour: 11, region: chron().world.homeland()});
      ok("3. Cairo's street", /dervish/.test(t.friar?.who ?? "") && !/tavern/.test(t.reveller?.who ?? "") && p.tags.includes("egypt") && !m.tags.includes("egypt"),
        {cairo: p.name, cairoTags: p.tags, home: m.name, homeTags: m.tags});
    });
    await step("4. clergy by faith", async () => {
      const X = npc().residents;
      const plan = s => X.plan(s).find(h => h.household.label === "House of worship")?.people?.[0];
      const imam = plan(cairo), priest = plan(brno);
      const RR = npc().routineRules;
      const muslim = o => (RR.originFaith?.(o) ?? "islamic") === "islamic";
      ok("4. clergy by faith", imam?.plan?.trade === "imam" && imam.sex === "male" && muslim(imam.origin) && priest?.plan?.trade === "priest" && priest.origin !== "jewish",
        {cairo: imam ? `${imam.name}, ${imam.plan.trade}, ${imam.sex}, ${imam.origin}` : null, brno: priest ? `${priest.name}, ${priest.plan.trade}, ${priest.sex}, ${priest.origin}` : null});
    });
    await step("5. trades of Egypt", async () => {
      const ppl = game.modules.get("wodx-creation")?.api?.people;
      const g = chron().gen, ctx = {...g.context(), culture: "egypt"};
      const table = g.lookup(ctx)("people.trade");
      const drawn = Array.from({length: 12}, (_, row) => ppl.generate({batch: 990001, row, culture: "egypt"}).trade);
      const euro = ["knight", "village priest", "member of a religious house"];
      const sheets = await import(`/modules/wodx-creation/data/people.mjs?${Date.now()}`);
      ok("5. trades of Egypt", /Egypt|Levant|Anatolia|Arabia|Maghreb/.test(table?.name ?? "") && !drawn.some(t => euro.includes(t)) && drawn.every(t => sheets.TRADE_SHEETS[t]),
        {table: table?.name, drawn});
    });
    await step("6. other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-creation", "wodx-storyteller", "wodx-interactables", "wodx-senses"];
      const bad = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("6. other modules", !bad.length, {missingApi: bad});
    });
    await step("7. local looks", async () => {
      const LL = await import(`/modules/wodx-npc/scripts/passerby-local.mjs?${Date.now()}`);
      const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
      const ys = [1300, 1600, 1850, 1950, 2000, 2050];
      const fezIsfahan = ys.filter(y => same(PR.streetTable(y, "persia"), PR.streetTable(y, "maghreb")));
      const korea = [1300, 1600].filter(y => same(PR.streetTable(y, "china"), PR.streetTable(y, "korea")));
      const fez = PR.streetTable(1300, "maghreb"), moravia = PR.streetTable(1300, "moravia");
      const drawn = Array.from({length: 8}, (_, i) => PR.makePasserby({year: 1600, hour: 11, region: "persia", rng: () => (i + 0.5) / 8}).name);
      ok("7. local looks", !older("0.52.0", "wodx-npc") && !fezIsfahan.length && !korea.length && fez.tanner?.cat === "worker"
        && fez.burgher?.cat === "gentry" && moravia === PR.PEOPLE.medieval && Object.keys(LL.LOCAL_LOOKS).length >= 30,
        {npc: v("wodx-npc"), sameYears: fezIsfahan, sameKorea: korea, regions: Object.keys(LL.LOCAL_LOOKS).length, isfahan1600: drawn});
    });
  } catch (e) { R.errors.push({error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); }
  finally {
    for ( const s of scenes ) { try { await s?.delete(); } catch (e) { R.errors.push({error: `cleanup: ${e.message}`}); } }
    if ( game.time.worldTime !== t0 ) { try { await game.time.advance(t0 - game.time.worldTime); } catch (e) { R.errors.push({error: `clock: ${e.message}`}); } }
  }
  return save(R);
}
