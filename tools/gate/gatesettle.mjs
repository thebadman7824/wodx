/**
 * The settlement generator (WoDX NPC 0.48.0, WoDX Interactables 0.35.2, B2520 to B2529), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesettle.mjs?${Date.now()}`)).run()
 * Needs in Data/wodx-gate/ the copies of tools/mapgen/samples/steinfeld-1995.settlement.json and
 * steinfeld-1995.wodx.json (a village of 1995 from ddsettle.py: about 114 households, two blocks of flats).
 * The household count is read from the sample itself, since a remade sample may gain or lose a cottage.
 * It makes a scene of its own the map's size, adopts the map's sidecar onto it, enters the settlement with a review
 * of its own, seeds a handful of households (not the whole village), checks what the review wrote, removes the
 * residents, and deletes its scene and journal at the end. It does not switch the Storyteller's view or the clock.
 *   1. the modules: NPC 0.48.0 or later with api.settlements, Interactables 0.35.2 or later, the People generator
 *   2. the record reads: steinfeld-1995-7, as many households and people as the map's sidecar; a broken record is refused in plain words
 *   3. adopted: every household of the record stands on the scene, a block of flats carrying all of its households
 *   4. entered: a journal of four pages no player can read, found again by the settlement's id
 *   5. the residents' plan reads the review: the struck household marked, the hidden folk on their households
 *   6. seeded: two tied households, one that works at a building on the map, and three flats of one block; the
 *      block's region lists the three flats and has no one owner
 *   7. the hidden folk: one person's sheet, one whole household's sheets and one building's region carry the note
 *   8. the ties: the first head's sheet has the relationship to the second; the worker's routine has the workplace
 *   9. removed: the residents and their records are gone, the settlement's journal stays
 *  10. clean up
 * Result: Data/wodx-gate/gatesettle-result.json.
 */
const MOD = "wodx-npc", IX = "wodx-interactables", SHEETS = "wodx-sheets";
const N = 10, SID = "steinfeld-1995-7", NAME = "WoDX gate: Steinfeld";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesettle-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), I = game.modules.get(IX), S = M?.api?.settlements, X = M?.api?.residents, A = I?.api?.adopt;
  const ppl = game.modules.get("wodx-creation")?.api?.people;
  let scene = null, journal = null;
  const hadFolder = !!game.folders.find(f => f.type === "JournalEntry" && f.name === "WoDX settlements" && !f.folder);
  try {
    ok("1. modules", M?.active && I?.active && !foundry.utils.isNewerVersion("0.48.0", M.version) && !foundry.utils.isNewerVersion("0.35.2", I.version)
      && typeof S?.enter === "function" && typeof S?.read === "function" && typeof X?.seed === "function" && typeof A?.apply === "function" && typeof ppl?.generate === "function",
      {npc: M?.version, interactables: I?.version});
    if ( S.entryFor(SID) ) { ok("2. record", false, {error: `${SID} is already entered in this world; remove it under Settlements first`}); return save(R); }

    const rec = await S.read(`/wodx-gate/steinfeld-1995.settlement.json?${Date.now()}`);
    let refused = "";
    try { await S.read(JSON.stringify({format: "wodx-settlement", version: 1, id: "bad id!", name: "x", households: []})); } catch (e) { refused = e.message; }
    const people = rec.households.reduce((s, h) => s + h.people.length, 0);
    const text = await (await fetch(`/wodx-gate/steinfeld-1995.wodx.json?${Date.now()}`, {cache: "no-store"})).text();
    const side = JSON.parse(text), H = rec.households.length, sideH = side.households?.length;
    ok("2. record", rec.id === SID && rec.year === 1995 && H > 100 && H === sideH && people > 200 && rec.population === people && side.population === people && rec.ties.length > 0 && refused.length > 0,
      {id: rec.id, households: H, sidecar: sideH, people, sidecarPeople: side.population, ties: rec.ties.length, refused});

    const sc = A.rules.parseSidecar(text).data;
    scene = await Scene.create({name: NAME, width: sc.cells[0] * 100, height: sc.cells[1] * 100, padding: 0, grid: {size: 100, distance: 5}});
    const got = await A.plan(scene, text);
    await A.apply(scene, got.p); await sleep(500);
    const onScene = X.households(scene);
    const ids = new Set(rec.households.map(h => h.id));
    const block = scene.regions.contents.find(r => (r.flags?.[IX]?.households?.length ?? 0) > 1);
    const flats = onScene.filter(h => h.region === block?.uuid);
    ok("3. adopted", onScene.length === H && onScene.every(h => ids.has(h.household.id)) && flats.length === 48 && flats.every(h => h.shared === 48)
      && sc.settlement?.id === SID, {households: onScene.length, block: block?.name, flats: flats.length, errors: got.errors});

    // the review: one household struck, three hidden folk of the gate's choosing, every tie kept
    const tie = rec.ties.find(t => t.kind !== "works-at" && !/panel-block/.test(t.a) && !/panel-block/.test(t.b));
    const job = rec.ties.find(t => t.kind === "works-at" && ![tie.a, tie.b].includes(t.a) && !/panel-block/.test(t.a) && onScene.some(h => h.household.id === t.a)
      && scene.regions.contents.some(r => r.flags?.[IX]?.adoptId === t.place));
    const flatIds = flats.slice(0, 3).map(h => h.household.id);
    const tied = new Set(rec.ties.flatMap(t => [t.a, t.b]));
    const struck = rec.households.find(h => !tied.has(h.id) && !/panel-block/.test(h.id));
    const hOf = id => rec.households.find(h => h.id === id);
    const folkOf = (key, id, label) => ({id: `${key}-gate`, key, label, household: id, building: hOf(id).building, where: hOf(id).label, note: "Set by the gate.", on: true});
    const review = S.rules.normReview(rec, {struck: [struck.id], ties: {},
      folk: [folkOf("mage", tie.a, "A mage"), folkOf("kinfolk", flatIds[0], "A Kinfolk household"), folkOf("wraith", tie.b, "A haunted building")]});
    journal = await S.enter(rec, review); await sleep(300);
    const player = game.users.find(u => !u.isGM);
    const e = S.entryFor(SID);
    ok("4. entered", !!journal && journal.pages.size === 4 && journal.folder?.name === "WoDX settlements" && journal.ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
      && (!player || !journal.testUserPermission(player, "LIMITED")) && e?.review?.struck?.[0] === struck.id && e.review.folk.length === 3 && S.entries().some(x => x.record.id === SID),
      {name: journal?.name, pages: journal?.pages?.map(p => p.name), player: player?.name ?? "no player user to test with"});

    const list = X.plan(scene);
    const row = id => list.find(h => h.household.id === id);
    ok("5. plan reads the review", list.length === H && row(struck.id)?.settled?.struck === true && row(tie.a)?.settled?.folk?.[0]?.key === "mage"
      && row(flatIds[0])?.settled?.folk?.[0]?.key === "kinfolk" && row(tie.b)?.settled?.folk?.[0]?.key === "wraith" && row(flatIds[1])?.settled?.struck === false
      && list.every(h => h.settled?.settlement === SID), {struck: struck.id});

    const want = [tie.a, tie.b, job.a, ...flatIds];
    const made = await X.seed(scene, list, want.map(id => ({index: row(id).index, ghoulOf: null}))); await sleep(500);
    const of = id => made.filter(a => a.flags?.[MOD]?.resident?.household === id);
    const head = id => of(id).find(a => a.flags[MOD].resident.master);
    const expect = want.reduce((s, id) => s + hOf(id).people.length, 0);
    const rb = block.flags?.[MOD]?.residents;
    const single = fromUuidSync(row(tie.a).region);
    ok("6. seeded", made.length === expect && want.every(id => of(id).length === hOf(id).people.length && head(id)) && rb?.houses?.length === 3
      && rb.actors.length === flatIds.reduce((s, id) => s + hOf(id).people.length, 0) && !rb.ownerSet && !block.flags?.[MOD]?.place?.owner
      && (row(tie.a).shared !== 1 || single.flags?.[MOD]?.place?.owner === head(tie.a).name || !!row(tie.a).owner)
      && X.households(scene).filter(h => h.seeded.length).length === want.length,
      {made: made.length, expect, blockHouses: rb?.houses?.length, names: made.slice(0, 6).map(a => a.name)});

    const hid = a => a.flags?.[MOD]?.resident?.hidden;
    const haunted = fromUuidSync(row(tie.b).region);
    ok("7. hidden folk", hid(head(tie.a))?.key === "mage" && of(tie.a).filter(hid).length === 1 && of(flatIds[0]).length >= 1 && of(flatIds[0]).every(a => hid(a)?.key === "kinfolk")
      && haunted.flags?.[MOD]?.residents?.hidden?.key === "wraith" && of(tie.b).every(a => !hid(a)) && of(flatIds[1]).every(a => !hid(a))
      && hid(head(tie.a)).settlement === SID, {mage: head(tie.a)?.name, kinfolk: of(flatIds[0]).map(a => a.name), haunted: haunted.name});

    const role = S.rules.tieRole(tie).role;
    const ties = head(tie.a).flags?.[SHEETS]?.ties ?? [];
    const workAt = scene.regions.contents.find(r => r.flags?.[IX]?.adoptId === job.place);
    ok("8. ties and work", ties.some(t => t.uuid === `Actor.${head(tie.b).id}` && t.role === role) && head(job.a).flags[MOD].routine.roles.work === workAt.uuid
      && await S.writeTies(SID) === 0, {tie: `${tie.kind}: ${tie.note}`, role, worksAt: workAt?.name});

    const gone = await X.remove(scene); await sleep(400);
    ok("9. removed", gone === made.length && made.every(a => !game.actors.get(a.id)) && scene.regions.contents.every(r => !r.flags?.[MOD]?.residents)
      && S.residentsOf(SID).length === 0 && !!S.entryFor(SID), {gone});
  } catch (err) {
    R.errors.push(String(err?.stack ?? err));
  }
  try {
    if ( scene ) { await X?.remove?.(scene); }
    const f = scene ? game.folders.find(x => x.type === "Actor" && x.getFlag(MOD, "residents") === scene.uuid) : null;
    if ( f ) await f.delete();
    const parent = game.folders.find(x => x.type === "Actor" && x.name === "WoDX residents" && !x.folder);
    if ( parent && !parent.children?.length && !parent.contents?.length ) await parent.delete();
    journal ??= S?.entryFor?.(SID)?.journal && scene ? S.entryFor(SID).journal : null;
    if ( journal ) await journal.delete();
    const jf = game.folders.find(x => x.type === "JournalEntry" && x.name === "WoDX settlements" && !x.folder);
    if ( jf && !hadFolder && !jf.contents?.length ) await jf.delete();
    const left = scene ? game.actors.filter(a => a.flags?.[MOD]?.resident?.scene === scene.uuid).length : 0;
    if ( scene ) await scene.delete();
    ok("10. clean up", left === 0 && !game.scenes.getName(NAME) && !S?.entryFor?.(SID));
  } catch (err) { R.errors.push(String(err?.stack ?? err)); ok("10. clean up", false); }
  return save(R);
}
