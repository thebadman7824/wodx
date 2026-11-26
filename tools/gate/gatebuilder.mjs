/**
 * Build this chronicle, phase 1 gate (WoDX Storyteller 0.61.0, B2780-B2785). It tests whichever chronicle is in play
 * (Chronicle Packs Desk, last step; Ben 22 Nov 2026): the recipe is the one the builder reads (the world's recipe flag,
 * else the chronicle in play's), and every name, place and date the gate checks comes from that recipe. In Foundry, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebuilder.mjs?${Date.now()}`)).run()
 * Never in a Live world. In the recipe's own world (rothenstein-x for WoDX Rothenstein, made by the PC job) the carry
 * file must be where the recipe says (recipe.carry.file).
 *
 * The world is built by the gate and left built at the end (that is its purpose); the clock is set to the recipe's
 * opening night by the settings step.
 *   1. the module: Storyteller 0.61.0, api.builder, the world's recipe flag, the button wanted
 *   2. the builder refuses every Live world, even forced, and another world unless forced
 *   3. every ready step runs in order: check, settings, carry, cast, anchors, ways
 *   4. the homeland is the recipe's and the clock reads the recipe's opening year
 *   5. every document in the carry file is in the world, with its old id
 *   6. links in carried journals to carried documents resolve
 *   7. running carry again makes nothing new
 *   8. the anchors: the recipe's first person and first place anchors are marked; a scene's own kind of place is kept
 *   9. Undo on the anchors takes the marks off; running it again puts them back
 *  10. Undo on the carry removes only what the builder made; running it again brings everything back
 *  11. the cast (B7806): run again after the carry came back, every person in the recipe's cast is in the world and
 *      every sheet holds its Road; Undo deletes only the people it made and puts the sheets back; running it again
 *      makes them once more
 * Result: Data/wodx-gate/gatebuilder-result.json.
 *
 * On a testbed world (rothenstein-wodx and the lanes) the build itself is not wanted, so the gate checks only what
 * holds in any world: the module and its api, that the builder refuses Live even when forced, and that running every
 * step here refuses and makes nothing. The full ten steps run only in the recipe's own world. In a world with no
 * recipe at all (wodx-clean: no chronicle in play) the gate registers a small chronicle of its own whose recipe builds
 * a world that does not exist, runs the testbed checks with it, and takes it off again, so the chronicle in play
 * (none) is the same at the end.
 */
const MOD = "wodx-storyteller";
const B = () => game.modules.get(MOD).api.builder;
// The same module the builder imports, so a chronicle registered here is the one the builder reads
const CD = () => import("/modules/wodx-chronicle/scripts/chronicle-data.mjs");
const FIX = "gate-builder-chronicle";
/** The gate's own recipe: valid in shape, for a world that is never made. */
const FIX_RECIPE = {id: FIX, version: 1, title: "Gate builder chronicle", world: "wodx-gate-builder-nowhere", homeland: "moravia",
  opening: {year: 1197, month: 1, day: 1, hour: 21}, climate: "auto", lines: ["vampire", "mortal"],
  carry: {from: "wodx-gate-builder-old", file: "worlds/wodx-gate-builder-nowhere/carry/carry.json"}, anchors: {places: [], people: []}, doors: []};
const FIX_PACK = {id: FIX, title: FIX_RECIPE.title, manifest: {id: FIX, title: FIX_RECIPE.title, live: []}, recipe: FIX_RECIPE};

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatebuilder-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const {isLiveWorld} = await import(`/modules/wodx-chronicle/scripts/live-worlds.mjs`);
  if ( isLiveWorld(game.world) ) throw new Error("Never in a Live world.");
  const Rules = await import(`/modules/wodx-rules/storyteller/recipe-rules.mjs?${Date.now()}`);
  const C = await CD();
  const inPlay = C.currentId();
  // No recipe here (no chronicle in play, or one without a recipe): the gate's own chronicle stands in for the run
  let own = false;
  // The builder writes what it ran to the Storyteller's log; the gate puts it back (gate rule: put back what you change)
  let log0 = null; try { log0 = foundry.utils.deepClone(game.settings.get(MOD, "log")); } catch (e) { log0 = null; }
  if ( !B()?.recipe?.() ) { C.registerChronicle(FIX_PACK); C.useChronicle(FIX); own = true; }
  try { await body(R, ok, step, Rules, own); } finally {
    if ( own ) { C.unregisterChronicle(FIX); C.useChronicle(inPlay); }
    R.chronicle = {before: inPlay || null, after: C.currentId() || null, own};
    if ( C.currentId() !== inPlay ) ok("chronicle in play put back", false, R.chronicle);
    if ( log0 !== null && !R.mode?.startsWith?.("build") ) { try { await game.settings.set(MOD, "log", log0); } catch (e) { R.errors.push(`log: ${e.message}`); } }
  }
  return save(R);
}

async function body(R, ok, step, Rules, own) {
  const recipe = B()?.recipe?.();
  let carry = null;
  const live = Rules.FORBIDDEN_WORLDS;
  const refusesLive = () => live.length > 0 && live.every(w => !Rules.canBuildHere(w, recipe, {force: true}).ok);
  const home = recipe && game.world.flags?.wodx?.recipe === recipe.id && Rules.canBuildHere(game.world.id, recipe).ok;
  R.mode = home ? "build" : "testbed";
  R.recipe = recipe?.id ?? null;

  if ( !home ) {
    await step("1 module", async () => {
      const m = game.modules.get(MOD);
      ok("1 module", m?.active && Rules.versionAtLeast(m.version, "0.61.0") && !!B() && !!recipe, {version: m?.version, recipe: recipe?.id, own});
    });
    await step("2 refuses Live", async () => {
      const here = Rules.canBuildHere(game.world.id, recipe);
      ok("2 refuses Live", refusesLive() && !here.ok, {live, reasons: live.map(w => Rules.canBuildHere(w, recipe, {force: true}).reason), here: here.reason});
    });
    await step("3 nothing built here", async () => {
      const count = () => game.scenes.size + game.journal.size + game.actors.size + game.items.size;
      const t0 = game.time.worldTime, n0 = count();
      const out = await B().runAll();
      const made = ["Scene", "JournalEntry", "Actor", "Item"].flatMap(t => [...game.collections.get(t)]).filter(d => d.flags?.[MOD]?.built).length;
      ok("3 nothing built here", count() === n0 && game.time.worldTime === t0 && !made && !out.some(o => o.ok && o.id !== "check"),
        {out: out.map(o => ({id: o.id, ok: o.ok, note: o.note ?? o.wait ?? o.error})), made});
    });
    R.notes.push(`Testbed mode in ${game.world.id}: the build steps run only in ${recipe?.world ?? "the recipe's world"}.`);
    return;
  }

  await step("1 module", async () => {
    const m = game.modules.get(MOD);
    ok("1 module", m?.active && Rules.versionAtLeast(m.version, "0.61.0") && !!B() && game.world.flags?.wodx?.recipe === recipe.id && !!recipe,
      {version: m?.version, flag: game.world.flags?.wodx?.recipe});
  });
  await step("2 refuses Live", async () => {
    const other = Rules.canBuildHere(recipe.carry?.from ?? `${recipe.world}-other`, recipe);
    const res = await B().run("check", {force: true});
    ok("2 refuses Live", refusesLive() && !other.ok, {live, other: other.reason, here: res.note ?? res.error});
  });
  await step("3 run every step", async () => {
    const out = await B().runAll();
    const plan = B().plan();
    const phase1 = plan.filter(p => p.phase === 1);
    ok("3 run every step", phase1.every(p => p.state === "done"), {out: out.map(o => ({id: o.id, ok: o.ok, note: o.note ?? o.wait ?? o.error})), plan: phase1.map(p => `${p.id}:${p.state}`)});
  });
  await step("4 settings", async () => {
    const C = game.modules.get("wodx-chronicle").api;
    const cal = await import(`/modules/wodx-chronicle/scripts/calendar.mjs`);
    const d = cal.getEngine().timeToDate(game.time.worldTime);
    ok("4 settings", C.world.homeland() === recipe.homeland && d.year === recipe.opening.year, {homeland: C.world.homeland(), wants: recipe.homeland, date: d});
  });
  await step("5 carried", async () => {
    carry = await (await fetch(`/${recipe.carry.file}?${Date.now()}`)).json();
    const missing = [];
    let n = 0;
    for ( const [type, list] of Object.entries(carry.docs ?? {}) ) {
      const coll = game.collections.get(type);
      for ( const d of list ) { n++; if ( !coll?.get(d._id) ) missing.push(`${type}.${d._id} ${d.name}`); }
    }
    ok("5 carried", n > 0 && !missing.length, {inFile: n, missing: missing.slice(0, 20), missingCount: missing.length});
  });
  await step("6 links", async () => {
    const carried = new Set(Object.entries(carry.docs ?? {}).flatMap(([t, l]) => l.map(d => `${t}.${d._id}`)));
    let checked = 0; const broken = [];
    for ( const j of game.journal ) {
      for ( const p of j.pages ) {
        for ( const m of String(p.text?.content ?? "").matchAll(/@UUID\[(\w+)\.(\w{16})(?:\.[^\]]*)?\]/g) ) {
          if ( !carried.has(`${m[1]}.${m[2]}`) ) continue;
          checked++;
          if ( !fromUuidSync(`${m[1]}.${m[2]}`) ) broken.push(`${j.name}: ${m[0]}`);
        }
      }
    }
    ok("6 links", !broken.length, {checked, broken: broken.slice(0, 20)});
  });
  await step("7 again", async () => {
    const before = game.scenes.size + game.journal.size + game.actors.size + game.items.size;
    const res = await B().again("carry");
    const after = game.scenes.size + game.journal.size + game.actors.size + game.items.size;
    ok("7 again", res.ok && before === after, {before, after, note: res.note});
  });
  await step("8 anchors", async () => {
    const who = recipe.anchors?.people?.[0]?.key, where = recipe.anchors?.places?.[0]?.key;
    const person = game.actors.find(a => a.flags?.[MOD]?.anchor?.key === who);
    const places = game.scenes.filter(s => s.flags?.[MOD]?.anchor?.key === where);
    const rec = B().record().steps?.anchors;
    const kept = (rec?.made ?? []).filter(c => !c.setKind && c.uuid.startsWith("Scene.")).length;
    ok("8 anchors", !!who && !!where && !!person && places.length > 0, {person: who, actor: person?.name, place: where, scenes: places.map(s => s.name), marks: rec?.made?.length, kindsKept: kept, note: rec?.note});
  });
  await step("9 undo anchors", async () => {
    const n0 = (B().record().steps?.anchors?.made ?? []).length;
    const u = await B().undo("anchors");
    const left = [...game.scenes, ...game.actors].filter(d => d.flags?.[MOD]?.anchor).length;
    const r = await B().run("anchors");
    const n1 = (B().record().steps?.anchors?.made ?? []).length;
    ok("9 undo anchors", u.ok && left === 0 && r.ok && n1 === n0, {undo: u.note, left, again: r.note});
  });
  await step("10 undo carry", async () => {
    const hand = await JournalEntry.create({name: "WoDX gate: made by hand", flags: {"wodx-gate": {builder: true}}});
    const u = await B().undo("carry");
    const left = ["Scene", "JournalEntry", "Actor", "Item"].flatMap(t => [...game.collections.get(t)]).filter(d => d.flags?.[MOD]?.built?.step === "carry").length;
    const handKept = !!game.journal.get(hand.id);
    await hand.delete();
    const r = await B().run("carry");
    await B().again("anchors");
    const missing = Object.entries(carry.docs ?? {}).flatMap(([t, l]) => l.filter(d => !game.collections.get(t)?.get(d._id))).length;
    ok("10 undo carry", u.ok && left === 0 && handKept && r.ok && missing === 0, {undo: u.note, left, handKept, again: r.note, missing});
  });
  await step("11 cast", async () => {
    const cast = recipe.cast ?? {people: [], sheets: []};
    const rows = () => [...game.actors].map(a => ({id: a.id, name: a.name, playerOwned: !!a.hasPlayerOwner, road: Rules.roadOn(a.system), variant: a.system?.settings?.variant ?? null}));
    // The carry came back in step 10 with the old sheets, so the cast runs again to set them
    const again = await B().again("cast");
    const left = Rules.castPlan(recipe, rows());
    const madeBy = [...game.actors].filter(a => a.flags?.[MOD]?.built?.step === "cast");
    const ghouls = cast.people.filter(p => p.variant === "ghoul").every(p => game.actors.find(a => a.name.toLowerCase().includes((p.match ?? p.name).toLowerCase()))?.system?.settings?.variant === "ghoul");
    const changed = (B().record().steps?.cast?.made ?? []).filter(m => !m.made).length;
    const u = await B().undo("cast");
    const gone = [...game.actors].filter(a => a.flags?.[MOD]?.built?.step === "cast").length;
    const back = Rules.castPlan(recipe, rows());
    const r = await B().run("cast");
    const after = Rules.castPlan(recipe, rows());
    ok("11 cast", again.ok && !left.make.length && !left.set.length && ghouls && u.ok && gone === 0
      && back.set.length === changed && back.make.length === madeBy.length
      && r.ok && !after.make.length && !after.set.length,
      {again: again.note ?? again.error, made: madeBy.map(a => a.name), ghouls, undo: u.note, gone, changed, backSet: back.set.map(x => x.name), again2: r.note, after});
  });
}
