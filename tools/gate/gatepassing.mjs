/**
 * Gate for the Games by Hyper ideas (Storyteller 0.25.0, NPC 0.16.0, Interactables 0.24.0), in rothenstein-wodx (the
 * testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepassing.mjs?${Date.now()}`)).run()
 * Makes its own scene "WoDX gate: Passing", two actors, two tokens and a journal; views the scene, then goes back,
 * deletes all it made and puts the settings back. The clock never moves.
 *   1. versions and the api
 *   2. hardship weather: a scene left on "From the sky" reads Atmosphere; a level set by hand wins
 *   3. bodies: a body marked ten days ago has aged past fresh and takes its tint
 *   4. bodies: finding one posts the Storyteller's card and remembers the finder
 *   5. standing spills over (rules on the live module): friend and enemy move, Undo puts it back
 *   6. calls to passers-by: the rules and the setting are there, off by default
 *   7. a clue's codex page: due once at the set successes
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatepassing-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100, DAY = 86400;
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const newer = (v, min) => { const a = String(v).split(".").map(Number), b = min.split(".").map(Number); for ( let i = 0; i < 3; i++ ) { if ( (a[i] || 0) !== (b[i] || 0) ) return (a[i] || 0) > (b[i] || 0); } return true; };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ST = "wodx-storyteller", NPC = "wodx-npc", IX = "wodx-interactables";
  const S = () => game.modules.get(ST)?.api;
  const back = canvas.scene;
  const was = {remains: game.settings.get(ST, "remains"), heat: game.settings.get(ST, "heat")};
  let scene, actors = [], journal, body, pcTok;
  try {
    scene = await Scene.create({name: "WoDX gate: Passing", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: G}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await Actor.create([{name: "WoDX gate: Passing body", type: "Mortal"}, {name: "WoDX gate: Passing finder", type: "Mortal"}]);
    await scene.createEmbeddedDocuments("Token", [{name: "body", actorId: actors[0].id, x: G * 5, y: G * 5}, {name: "finder", actorId: actors[1].id, x: G, y: G}]);
    body = scene.tokens.find(t => t.actorId === actors[0].id); pcTok = scene.tokens.find(t => t.actorId === actors[1].id);

    await step("1 versions and api", async () => {
      const m = id => game.modules.get(id);
      ok("1 versions and api", newer(m(ST)?.version, "0.25.0") && newer(m(NPC)?.version, "0.16.0") && newer(m(IX)?.version, "0.24.0")
        && typeof S()?.remains?.mark === "function" && typeof S()?.hardship?.weatherOf === "function" && typeof m(NPC)?.api?.talk?.onPass === "function",
        {versions: [m(ST)?.version, m(NPC)?.version, m(IX)?.version]});
    });
    await step("2 hardship weather", async () => {
      const H = S().hardship;
      await scene.unsetFlag(ST, "weather");
      const auto = H.weatherOf(scene);
      const day = game.modules.get("wodx-atmosphere")?.api?.weather?.now?.() ?? null;
      const expect = H.rules.severityFromDay(day);
      await H.weather(scene, "severe");
      const hand = H.weatherOf(scene);
      await H.weather(scene, "auto");
      ok("2 hardship weather", auto === expect && hand === "severe" && H.weatherOf(scene) === expect && !!H.rules.WEATHER[auto], {auto, hand, sky: day?.label ?? null});
    });
    await step("3 bodies age", async () => {
      await game.settings.set(ST, "remains", true);
      await S().remains.mark(body, {since: game.time.worldTime - 10 * DAY, place: "open", cause: "drained"});
      await S().remains.tick();
      await until(() => body.flags?.[ST]?.remains?.shown);
      const st = S().remains.stage(body);
      ok("3 bodies age", st && st.id !== "fresh" && body.flags[ST].remains.shown === st.id && (st.tint ? body.texture.tint?.css === st.tint || String(body.texture.tint) === st.tint : true),
        {stage: st?.id, tint: String(body.texture.tint)});
    });
    await step("4 a body found", async () => {
      await game.settings.set(ST, "heat", false);
      const before = game.messages.size;
      await S().remains.found(body, actors[1]);
      const msg = game.messages.contents.at(-1);
      ok("4 a body found", game.messages.size === before + 1 && !!msg?.flags?.[ST]?.remains && (body.flags[ST].remains.found ?? []).includes(actors[1].id),
        {text: msg?.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300)});
      await msg?.delete();
    });
    await step("5 standing spills", async () => {
      const F = game.modules.get(NPC)?.api?.factions?.rules;
      const st = F.normState({factions: [{id: "a", name: "A", standing: {}}, {id: "b", name: "B", standing: {a: 2}}, {id: "c", name: "C", standing: {a: -2}}]});
      const ch = F.spillFrom(st, "a", "pc", 1);
      const r = F.applyChanges(st, ch), u = F.applyChanges(r.state, r.inverse);
      ok("5 standing spills", ch.length === 2 && r.state.factions[1].people.pc === 1 && r.state.factions[2].people.pc === -1 && !(u.state.factions[1].people?.pc)
        && game.settings.settings.has(`${NPC}.spillover`) && game.settings.settings.get(`${NPC}.spillover`).default === false);
    });
    await step("6 calls to passers-by", async () => {
      const TK = game.modules.get(NPC)?.api?.talk?.rules;
      ok("6 calls to passers-by", TK?.mayCallOut?.({last: null, now: 1, chance: 1, roll: 0}) === true && TK.mayCallOut({last: 0, now: 10, chance: 1, roll: 0}) === false
        && game.settings.settings.get(`${NPC}.passGreet`)?.default === false);
    });
    await step("7 clue codex page", async () => {
      journal = await JournalEntry.create({name: "WoDX gate: Passing clue", pages: [{name: "What the ledger shows", type: "text", text: {content: "<p>Gate.</p>"}}]});
      const page = journal.pages.contents[0];
      const IR = game.modules.get(IX)?.api?.rules;
      const o = IR.describeClue({clue: true, codexPage: page.uuid, codexAt: 1});
      ok("7 clue codex page", !IR.codexDue(o, actors[1].id, 0) && IR.codexDue(o, actors[1].id, 1) && !IR.codexDue({...o, codexed: {[actors[1].id]: true}}, actors[1].id, 3)
        && !!(await fromUuid(o.codexPage)));
    });
    await step("8 other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", NPC, IX, "wodx-otherworlds", "wodx-atmosphere"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("8 other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set(ST, "remains", was.remains);
      await game.settings.set(ST, "heat", was.heat);
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      if ( journal ) await journal.delete();
      for ( const j of game.journal.filter(j => j.flags?.[ST]?.codex && actors.some(a => a.id === j.flags[ST].codex)) ) await j.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatepassing-result.json");
}
