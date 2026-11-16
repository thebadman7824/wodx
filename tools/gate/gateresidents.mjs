/**
 * The residents of a generated town (WoDX NPC 0.46.0, B2500 to B2504), in Foundry, in rothenstein-wodx only, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gateresidents.mjs?${Date.now()}`)).run()
 * It makes a scene of its own with three buildings carrying households as an adopted town map leaves them (a smithy,
 * a cottage, a chapel), seeds them, checks the sheets, routines and records, removes them, and deletes the scene,
 * the folder and the test Cainite at the end. It views its own scene for step 5b and goes back; it does not change the clock.
 *   1. the modules: NPC 0.46.0 or later with api.residents; WoDX Creation's People generator on
 *   2. the plan: 3 households, 9 people, every one named, kin of one sex sharing one family name, routines that exist,
 *      the chapel's priest a Christian man (NPC 0.47.1)
 *   3. seeded: 9 sheets in the residents folder, each with its routine on, its building as home or work, its household
 *   4. the records: each region lists its residents; the smithy's owner is the smith
 *   5. the routines read the places: a resident's home block resolves to its building
 *  5b. on the map: with the scene viewed and its routines on Auto, the routine tick puts each resident whose hour is
 *      in one of the buildings there as a token inside that building (the view goes back afterwards)
 *   6. the Scenes sidebar menu has Seed the residents and Remove the residents
 *   7. Remove the residents deletes the 9 sheets and clears the records and the owner it filled in
 *   8. a household made the ghouls of a Cainite: its sheets are ghouls, then removed
 *   9. clean up
 * Result: Data/wodx-gate/gateresidents-result.json.
 */
const MOD = "wodx-npc";
const N = 10;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateresidents-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

const HOUSES = [
  {id: "smithy-1", label: "Smithy", kind: "workplace", rect: [100, 100, 400, 300], hh: {id: "smithy-1-household", label: "Smithy household", trade: "smith",
    people: ["smith", "partner", "child", "child", "apprentice"].map(role => ({role}))}},
  {id: "cottage-2", label: "Cottage", kind: "home", rect: [600, 100, 300, 300], hh: {id: "cottage-2-household", label: "Cottage household", trade: "weaver",
    people: ["weaver", "partner"].map(role => ({role}))}},
  {id: "chapel-3", label: "Chapel", kind: "church", rect: [100, 500, 400, 300], hh: {id: "chapel-3-household", label: "Chapel household", trade: "priest",
    people: ["priest", "servant"].map(role => ({role}))}}
];

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), X = M?.api?.residents, ppl = game.modules.get("wodx-creation")?.api?.people;
  let scene = null, vamp = null;
  try {
    ok("1. modules", M?.active && !foundry.utils.isNewerVersion("0.46.0", M.version) && typeof X?.open === "function" && typeof ppl?.generate === "function", {version: M?.version});
    scene = await Scene.create({name: "WoDX gate: Residents", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}});
    await scene.createEmbeddedDocuments("Region", HOUSES.map(h => ({name: h.label,
      shapes: [{type: "rectangle", x: h.rect[0], y: h.rect[1], width: h.rect[2], height: h.rect[3], rotation: 0, hole: false}],
      flags: {"wodx-interactables": {adoptId: h.id, household: h.hh}, [MOD]: {place: {kind: h.kind}}}})));
    await sleep(300);

    const list = X.plan(scene);
    const people = list.flatMap(h => h.people);
    // Bynames (ben or bat, ibn or bint) and clans that pass from the mother are not shared family names: a Jewish
    // household with a woman at its head keeps each member's own byname (resident-rules kinFamily), so it is not tested
    const byname = /^(ben|bat|ibn|bint|bin|binti) |clan/i;
    const sameFamily = list.every(h => {
      if ( h.people.some(p => byname.test(String(p.family ?? ""))) ) return true;
      // B6252: in a year when the name is a byname of the person's own, kin keep their own names
      if ( h.people[0]?.nameCustom?.hereditary === false ) return true;
      const kin = h.people.filter(p => p.plan.kin || p.plan.master);
      const bySex = s => new Set(kin.filter(p => p.sex === s).map(p => p.family));
      return bySex("male").size <= 1 && bySex("female").size <= 1;
    });
    const presets = M.api.routineRules.PRESETS;
    const priest = list.find(h => h.household.trade === "priest")?.people?.[0];
    const priestOk = priest?.sex === "male" && priest?.origin !== "jewish";
    // A person of a year and people who bore one name alone has a one-word name (B6250)
    const named = p => p.name && (p.name.trim().includes(" ") || p.nameCustom?.form === "given" || (p.nameCustom?.unset === "given" && !p.nameCustom?.hereditary));
    ok("2. plan", priestOk && list.length === 3 && people.length === 9 && people.every(named) && sameFamily && people.every(p => presets[p.plan.preset]),
      {priest: priest ? `${priest.name}, ${priest.sex}, ${priest.origin}` : null, customs: list.map(h => h.people[0]?.nameCustom?.form ?? "tables"), households: list.map(h => ({label: h.household.label, people: h.people.map(p => `${p.name} (${p.plan.label}, ${p.plan.preset})`)}))});

    // B6250-B6252: each person's name carries the year's custom where the people has one (the harness checks the
    // household side, name-customs.test.mjs)
    const yr = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? null;
    const dated = people.filter(p => ["czech", "german", "jewish"].includes(p.origin));
    ok("2b. names follow the year's custom", yr === null || (dated.every(p => p.nameCustom && ["given", "byname", "settling", "family"].includes(p.nameCustom.form)) ),
      {year: yr, forms: dated.slice(0, 6).map(p => `${p.name}: ${p.nameCustom?.form}${p.nameCustom?.hereditary ? ", passed down" : ""}`)});

    const made = await X.seed(scene, list, list.map(h => ({index: h.index, ghoulOf: null})));
    await sleep(300);
    const regions = Object.fromEntries(scene.regions.contents.map(r => [r.flags?.["wodx-interactables"]?.adoptId, r]));
    const folder = game.folders.find(f => f.type === "Actor" && f.getFlag(MOD, "residents") === scene.uuid);
    const good = made.every(a => {
      const f = a.flags?.[MOD] ?? {};
      const reg = scene.regions.contents.find(r => r.uuid === f.resident?.region);
      return f.routine?.on && reg && (f.routine.roles?.home === reg.uuid || f.routine.roles?.work === reg.uuid) && f.behavior?.household === reg.flags["wodx-interactables"].household.label
        && a.folder?.id === folder?.id && a.prototypeToken?.actorLink;
    });
    ok("3. seeded", made.length === 9 && !!folder && good, {names: made.map(a => a.name), folder: folder?.name});

    const smithy = regions["smithy-1"];
    const smith = made.find(a => a.flags[MOD].resident.region === smithy.uuid && a.flags[MOD].resident.master);
    const recs = HOUSES.map(h => regions[h.id].flags?.[MOD]?.residents?.actors?.length ?? 0);
    ok("4. records", recs.join() === "5,2,2" && smithy.flags[MOD].place.owner === smith?.name && X.households(scene).every(h => h.seeded.length), {recs, owner: smithy.flags[MOD].place.owner});

    const RRr = M.api.routineRules;
    const homeOf = a => RRr.resolvePlace({place: "home"}, {places: scene.regions.contents.map(r => ({id: r.uuid, kind: r.flags[MOD].place.kind})), roles: a.flags[MOD].routine.roles, seed: a.id}).place;
    const blocks = a => RRr.blocksOf(a.flags[MOD].routine, a.flags[MOD].behavior.template, game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.());
    ok("5. routines read the places", made.filter(a => a.flags[MOD].routine.roles.home).every(a => homeOf(a) === a.flags[MOD].resident.region) && made.every(a => blocks(a).length > 0));

    // 5b: the effect in play: the routine tick places the residents' tokens in their buildings
    const viewed = canvas?.scene?.id ?? null;
    try {
      await scene.view();
      for ( let i = 0; i < 100 && !(canvas?.ready && canvas.scene?.id === scene.id); i++ ) await sleep(200);
      await scene.setFlag(MOD, "routineMode", "auto");
      await M.api.routines.tick("jump", {scene});
      await sleep(1500);
      const here = new Set(scene.regions.contents.map(r => r.uuid));
      const due = made.filter(a => here.has(game.actors.get(a.id)?.flags?.[MOD]?.where?.place));
      const inside = due.filter(a => scene.tokens.contents.some(t => t.actorId === a.id && [...(t.regions ?? [])].some(r => r.uuid === game.actors.get(a.id).flags[MOD].where.place)));
      ok("5b. residents stand in their buildings", due.length > 0 && inside.length === due.length,
        {due: due.map(a => a.name), inside: inside.map(a => a.name), tokens: scene.tokens.size});
    } finally {
      for ( const t of scene.tokens.contents ) await t.delete().catch(() => null);
      await scene.unsetFlag(MOD, "routineMode").catch(() => null);
      if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
    }

    const opts = [];
    Hooks.callAll("getSceneContextOptions", ui.scenes, opts);
    const li = document.createElement("li"); li.dataset.entryId = scene.id;
    const seedOpt = opts.find(o => o.name === "Seed the residents"), remOpt = opts.find(o => o.name === "Remove the residents");
    ok("6. scene menu", !!seedOpt && !!remOpt && seedOpt.condition(li) && remOpt.condition(li), {names: opts.map(o => o.name).filter(n => /resident/i.test(n))});

    const ids = made.map(a => a.id);
    const gone = await X.remove(scene); await sleep(300);
    ok("7. removed", gone === 9 && ids.every(id => !game.actors.get(id)) && scene.regions.contents.every(r => !r.flags?.[MOD]?.residents) && !regions["smithy-1"].flags[MOD].place.owner, {gone});

    vamp = await Actor.create({name: "WoDX gate: Cainite", type: CONFIG.worldofdarkness?.sheettype?.vampire ?? "Vampire"});
    const list2 = X.plan(scene);
    const cot = list2.find(h => h.household.id === "cottage-2-household");
    const ghouls = await X.seed(scene, list2, [{index: cot.index, ghoulOf: vamp.id}]); await sleep(300);
    const isGhoul = a => a.system?.settings?.variant === "ghoul";
    ok("8. ghoul household", ghouls.length === 2 && ghouls.every(isGhoul), {variants: ghouls.map(a => a.system?.settings?.variant)});
    await X.remove(scene);
  } catch (err) {
    R.errors.push(String(err?.stack ?? err));
  }
  try {
    if ( scene ) { await X?.remove?.(scene); await scene.delete(); }
    if ( vamp ) await vamp.delete();
    const left = game.actors.filter(a => a.flags?.[MOD]?.resident?.scene === scene?.uuid).length;
    const f = game.folders.find(x => x.type === "Actor" && x.getFlag(MOD, "residents") === scene?.uuid);
    if ( f ) await f.delete();
    const parent = game.folders.find(x => x.type === "Actor" && x.name === "WoDX residents" && !x.folder);
    if ( parent && !parent.children?.length && !parent.contents?.length ) await parent.delete();
    ok("9. clean up", left === 0 && !game.scenes.getName("WoDX gate: Residents"));
  } catch (err) { R.errors.push(String(err?.stack ?? err)); ok("9. clean up", false); }
  return save(R);
}
