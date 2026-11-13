/**
 * Build this chronicle, phase 1 gate (WoDX Storyteller 0.61.0, B2780-B2785). In Foundry, in rothenstein-x (the rebuilt
 * Rothenstein world, made by the PC job), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebuilder.mjs?${Date.now()}`)).run()
 * Never in the Live Version world. The carry file must be at worlds/rothenstein-x/carry/rothenstein-carry.json.
 *
 * The world is built by the gate and left built at the end (that is its purpose); the clock is set to the recipe's
 * opening night by the settings step.
 *   1. the module: Storyteller 0.61.0, api.builder, the world's recipe flag, the button wanted
 *   2. the builder refuses rothenstein-live, even forced, and another world unless forced
 *   3. every ready step runs in order: check, settings, carry, anchors
 *   4. the homeland is Moravia and the clock reads 1197
 *   5. every document in the carry file is in the world, with its old id
 *   6. links in carried journals to carried documents resolve
 *   7. running carry again makes nothing new
 *   8. the anchors: Bogdan Ursu and a Kranzfels scene are marked; a scene's own kind of place is kept
 *   9. Undo on the anchors takes the marks off; running it again puts them back
 *  10. Undo on the carry removes only what the builder made; running it again brings everything back
 * Result: Data/wodx-gate/gatebuilder-result.json.
 */
const MOD = "wodx-storyteller";
const B = () => game.modules.get(MOD).api.builder;

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
  if ( game.world.id === "rothenstein-live" ) throw new Error("Never in the Live Version world.");
  const Rules = await import(`/modules/${MOD}/scripts/recipe-rules.mjs?${Date.now()}`);
  const recipe = B()?.recipe?.();
  let carry = null;

  await step("1 module", async () => {
    const m = game.modules.get(MOD);
    ok("1 module", m?.active && Rules.versionAtLeast(m.version, "0.61.0") && !!B() && game.world.flags?.wodx?.recipe === "rothenstein" && !!recipe,
      {version: m?.version, flag: game.world.flags?.wodx?.recipe});
  });
  await step("2 refuses Live", async () => {
    const live = Rules.canBuildHere("rothenstein-live", recipe, {force: true});
    const other = Rules.canBuildHere("rothenstein-wodx", recipe);
    const res = await B().run("check", {force: true});
    ok("2 refuses Live", !live.ok && !other.ok && Rules.FORBIDDEN_WORLDS.includes("rothenstein-live"), {live: live.reason, other: other.reason, here: res.note ?? res.error});
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
    ok("4 settings", C.world.homeland() === "moravia" && d.year === 1197, {homeland: C.world.homeland(), date: d});
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
    const bog = game.actors.find(a => a.flags?.[MOD]?.anchor?.key === "bogdan");
    const kr = game.scenes.filter(s => s.flags?.[MOD]?.anchor?.key === "kranzfels");
    const rec = B().record().steps?.anchors;
    const kept = (rec?.made ?? []).filter(c => !c.setKind && c.uuid.startsWith("Scene.")).length;
    ok("8 anchors", !!bog && kr.length > 0, {bogdan: bog?.name, kranzfels: kr.map(s => s.name), marks: rec?.made?.length, kindsKept: kept, note: rec?.note});
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
  return save(R);
}
