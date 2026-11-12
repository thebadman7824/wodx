/**
 * Game time gate (Chronicle 0.39.0, Storyteller 0.40.0, Combat 3.18.0, Actions 3.50.0, Otherworlds 0.15.0), in
 * rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetime.mjs?${Date.now()}`)).run()
 * Holds the world while it runs and sets the clock back to where it started at the end. Makes its own scene
 * "WoDX gate: Time" and one actor, and deletes them after.
 *   1. the apis and settings are there (api.time, api.place, api.pace, turnSeconds, timeApart, paceMinutes off)
 *   2. spend: the answer matches howFor; the clock or the character's own time moves by the seconds; unspend
 *   3. a "Time for a long action" proposal, approved, spends its time
 *   4. a fight of 3 turns moves the time by 9 seconds when it ends
 *   5. the Clock draws the Time row and The sun on this scene; a scene's own place changes the hour and the sun
 *   6. a Moon Bridge journey card lets its time pass once (18 seconds for 5 hours)
 *   7. the table's clock: off gives no line, on gives one, set back
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatetime-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( await fn() ) return true; await sleep(100); } return !!(await fn()); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const chron = game.modules.get("wodx-chronicle")?.api, st = game.modules.get("wodx-storyteller")?.api;
  const t0 = game.time.worldTime, wasHeld = !!chron?.isHeld?.(), back = canvas.scene;
  const msgs0 = new Set(game.messages.map(m => m.id));
  const pace0 = [game.settings.get("wodx-chronicle", "paceMinutes"), game.settings.get("wodx-chronicle", "paceEvery")];
  let scene, actor, combat;
  try {
    if ( !wasHeld ) await chron.hold(true);
    scene = await Scene.create({name: "WoDX gate: Time", width: 1500, height: 1000, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actor = await Actor.create({name: "WoDX gate: Traveller", type: "Mortal", ownership: {default: 3}});
    await scene.createEmbeddedDocuments("Token", [{name: actor.name, actorId: actor.id, x: 200, y: 200, width: 1, height: 1}]);

    await step("apis and settings", async () => {
      const has = !!st?.time?.spend && !!st.time.ask && !!chron?.place?.describeAt && !!chron?.pace?.line && !!chron?.refreshClock;
      const s = {turn: game.settings.get("wodx-combat", "turnSeconds"), apart: game.settings.get("wodx-storyteller", "timeApart"), pace: pace0[0]};
      ok("apis and settings", has && Number.isFinite(Number(s.turn)) && typeof s.apart === "boolean", s);
      R.notes.push(`paceMinutes at start: ${pace0[0]}`);
    });

    await step("spend", async () => {
      const how = st.time.howFor([actor.id]);
      const w = game.time.worldTime, p = st.personalTime(actor.id);
      const r = await st.time.spend({actorIds: [actor.id], seconds: 600, label: "gate"});
      const moved = r.how === "clock" ? game.time.worldTime - w === 600 : st.personalTime(actor.id) - p === 600;
      if ( r.how === "personal" ) await st.time.unspend(r);
      const back = r.how === "personal" ? Math.abs(st.personalTime(actor.id) - Math.max(p, game.time.worldTime)) < 1 : true;
      ok("spend", r.how === how && moved && back, {how, got: r.how, line: st.time.note(r, actor.name)});
    });

    await step("a long action approved", async () => {
      const w = game.time.worldTime, p = st.personalTime(actor.id);
      await chron.propose({type: "wodx-storyteller.time", key: `gate-time-${Date.now()}`, title: "WoDX gate: an hour", data: {actorIds: [actor.id], seconds: 3600, label: "gate"}});
      const entry = chron.approvals.pending().find(e => e.title === "WoDX gate: an hour");
      if ( entry ) await chron.approvals.decide(entry.id, "approve");
      const moved = game.time.worldTime - w === 3600 || st.personalTime(actor.id) - p === 3600;
      ok("a long action approved", !!entry && moved, {queued: !!entry});
    });

    await step("fight length", async () => {
      const per = Number(game.settings.get("wodx-combat", "turnSeconds"));
      const tok = scene.tokens.contents[0];
      combat = await Combat.create({scene: scene.id, active: true});
      await combat.createEmbeddedDocuments("Combatant", [{tokenId: tok.id, sceneId: scene.id, actorId: actor.id, initiative: 10}]);
      await combat.startCombat(); await combat.nextRound(); await combat.nextRound();
      const rounds = combat.round, w = game.time.worldTime, p = st.personalTime(actor.id);
      await combat.delete(); combat = null;
      await until(() => game.time.worldTime !== w || st.personalTime(actor.id) !== p, 4000);
      const d = Math.max(game.time.worldTime - w, st.personalTime(actor.id) - p);
      ok("fight length", rounds === 3 && d === rounds * per, {rounds, per, moved: d});
    });

    await step("the Clock and a scene's place", async () => {
      chron.openClock(); await until(() => !!document.querySelector("#wodx-clock .wodx-time-row"), 4000);
      const row = !!document.querySelector("#wodx-clock .wodx-time-row"), btn = !!document.querySelector('#wodx-clock [data-action="placeHere"]');
      const home = chron.place.describeAt(scene);
      await chron.place.set(scene, {latitude: 30, offset: 1});
      const far = chron.place.describeAt(scene);
      const sun = await game.wodxActions?.sunNow?.(game.time.worldTime, scene);
      const line = await until(() => !!document.querySelector("#wodx-clock .wodx-scene-place"), 3000);
      await chron.place.set(scene, {});
      const cleared = !chron.place.describeAt(scene).ownPlace;
      const hourOk = ((home.hour + 1) % 24) === far.hour;
      ok("the Clock and a scene's place", row && btn && far.ownPlace && hourOk && far.latitude === 30 && !!sun && line && cleared, {row, btn, home: home.timeLabel, far: far.timeLabel, sun: sun?.phase, line, cleared});
      try { for ( const a of foundry.applications.instances.values() ) if ( a.id === "wodx-clock" ) await a.close(); } catch (e) { /* closed */ }
    });

    await step("journey time", async () => {
      const ow = game.modules.get("wodx-otherworlds")?.api?.journey;
      const j = ow.draw({realm: "moonbridge", hours: 5, travellers: [{actorId: actor.id, name: actor.name}]});
      await ow.approve(j);
      const msg = await (async () => { await until(() => game.messages.contents.some(m => !msgs0.has(m.id) && m.getFlag("wodx-otherworlds", "time")), 3000); return game.messages.contents.filter(m => !msgs0.has(m.id) && m.getFlag("wodx-otherworlds", "time")).pop(); })();
      const w = game.time.worldTime, p = st.personalTime(actor.id);
      await ow.passTime(msg);
      const d = Math.max(game.time.worldTime - w, st.personalTime(actor.id) - p);
      const again = await ow.passTime(msg);
      ok("journey time", !!msg && d === 18 && again === null, {moved: d});
    });

    await step("the table's clock", async () => {
      await game.settings.set("wodx-chronicle", "paceMinutes", 0);
      const off = chron.pace.line();
      await game.settings.set("wodx-chronicle", "paceMinutes", 10);
      await game.settings.set("wodx-chronicle", "paceEvery", 10);
      const on = chron.pace.line();
      ok("the table's clock", off === "" && /10 game minutes/.test(on), {on});
    });

    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-library", "wodx-storyteller", "wodx-creation"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set("wodx-chronicle", "paceMinutes", pace0[0]);
      await game.settings.set("wodx-chronicle", "paceEvery", pace0[1]);
      if ( combat ) await combat.delete();
      if ( actor ) { try { await st.setPersonal(actor.id, t0); } catch (e) { /* none */ } }
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      await game.time.set(t0);
      if ( !wasHeld ) await chron.hold(false);
      const mine = game.messages.filter(m => !msgs0.has(m.id)).filter(m => /WoDX gate|journey|fight|after the fight/i.test(m.content ?? "") || m.flags?.["wodx-otherworlds"] || m.flags?.["wodx-combat"]).map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      R.notes.push(`clock back at start: ${game.time.worldTime === t0}`);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatetime-result.json");
}
