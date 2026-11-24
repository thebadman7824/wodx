/**
 * Spreading Wyrm corruption (WoDX Otherworlds, B3270-B3276), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecorruption.mjs?${Date.now()}`)).run()
 * It makes two scratch scenes and an actor of its own and deletes them; it does not move the clock or change the
 * world setting.
 *   1. the module: the corruption API and its three approval types
 *   2. the world setting is registered and off by default
 *   3. a planned week (every roll a success): the fed works deepens to foul, taint creeps to the linked village,
 *      the tanner who lives there takes a step of taint
 *   4. applying it saves both places and the person, and asks for Gauntlet drift at the works
 *   5. Undo puts the places and the person back
 *   6. a Rite of Cleansing lifts a step and wards; a Hellhole stays at 7 or more
 *   7. Sense Wyrm: a vampire always, a clean mortal never
 *   8. the Storyteller's window opens with a row per place and closes
 *   9. B7807: with a chronicle in play that ties a place to a long clock (Rothenstein: the Ashfield), one more segment
 *      on that clock deepens the place a level and setting it back eases it again. The clock and the place's flag are
 *      put back as they were; a scratch scene stands in when the world has no scene of that name.
 *  10. clean up: scenes, actors, messages, our queue entries
 * Result: Data/wodx-gate/gatecorruption-result.json.
 */
import {handsOnStart} from "./kit.mjs";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 10;
const M = "wodx-otherworlds";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatecorruption-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

// B7212: at Balanced a Gauntlet drift is approved on sight (automation-rules QUEUE "wodx-otherworlds.drift": "auto"),
// so step 4 found no drift waiting (job 1926: "4. applied {}"). The gate starts from Hands on (tools/gate/kit.mjs).
export async function run() { const back = await handsOnStart(); try { return await body(); } finally { await back(); } }

async function body() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), t0 = game.time.worldTime;
  const Ch = game.modules.get("wodx-chronicle").api, O = game.modules.get(M).api, C = O?.corruption;
  const pendingBefore = new Set(Ch.approvals.pending().map(p => p.id));
  const made = {scenes: [], actors: []};
  try {
    const types = Ch.approvals.types().map(x => x.type);
    ok("1. module", !!C?.plan && !!C?.rules?.weekTurn && [`${M}.corruption`, `${M}.pentex`, `${M}.ridden`].every(x => types.includes(x)),
      {version: game.modules.get(M)?.version});
    const setting = game.settings.settings.get(`${M}.wyrmCorruption`);
    ok("2. setting", setting?.default === "off", {now: game.settings.get(M, "wyrmCorruption")});

    const W = C.rules.WEEK;
    // a batch create need not hand the documents back in the order asked: take each by name
    const byName = (list, name) => list.find(d => d.name === name);
    const scs = await Scene.createDocuments([
      {name: "Gate corruption works", width: 1000, height: 1000, navigation: false},
      {name: "Gate corruption village", width: 1000, height: 1000, navigation: false}]);
    const works = byName(scs, "Gate corruption works"), village = byName(scs, "Gate corruption village");
    made.scenes.push(works.id, village.id);
    const acs = await Actor.createDocuments([
      {name: "Gate tanner", type: "Mortal", prototypeToken: {actorLink: true}},
      {name: "Gate vampire", type: "Vampire", prototypeToken: {actorLink: true}}]);
    const tanner = byName(acs, "Gate tanner"), vamp = byName(acs, "Gate vampire");
    made.actors.push(tanner.id, vamp.id);
    await works.createEmbeddedDocuments("Token", [{name: tanner.name, actorId: tanner.id, actorLink: true, x: 100, y: 100}]);
    await C.set(works, {level: 6, banes: 3, sources: [{kind: "works", since: t0}], links: [village.id]});
    await C.set(village, {level: 0, links: [works.id]});
    await C.setTaint(tanner, {level: 0, weeks: 11});

    const plan = C.plan({now: t0, last: t0 - W, rng: () => 0});
    ok("3. planned week", plan?.places?.[works.id]?.level === 7 && plan.places[village.id]?.level === 1
      && plan.people.some(p => p.actor === tanner.id && p.after.level === 1), {bands: plan?.bands, people: plan?.people?.length});

    const snap = await C.apply(plan);
    await sleep(300);
    const drift = Ch.approvals.pending().find(p => p.key?.startsWith?.(`corrupt-drift:${works.id}`));
    ok("4. applied", C.of(game.scenes.get(works.id)).level === 7 && C.of(game.scenes.get(village.id)).level === 1
      && C.taintOf(game.actors.get(tanner.id)).level === 1 && !!drift, {drift: drift?.title});

    await C.undo(snap);
    ok("5. undo", C.of(game.scenes.get(works.id)).level === 6 && C.of(game.scenes.get(village.id)).level === 0
      && C.taintOf(game.actors.get(tanner.id)).level === 0);

    const c1 = C.rules.cleanse({level: 5}, {successes: 1, now: t0});
    let h = C.rules.normPlace({level: 10});
    for ( let i = 0; i < 5; i++ ) h = C.rules.cleanse(h, {successes: 1, now: t0});
    ok("6. cleansing", c1.level === 4 && c1.ward === t0 + 4 * W && h.level === 7);

    const sv = C.senseWyrm(game.actors.get(vamp.id)), stn = C.senseWyrm(game.actors.get(tanner.id));
    ok("7. Sense Wyrm", sv === true && stn === false, {vampire: sv, tanner: stn});

    const open = C.dialog();
    await sleep(800);
    const el = [...document.querySelectorAll(".wow-corruption")].find(e => e.querySelector?.("table.wow-corruption-t"));
    const rows = el?.querySelectorAll("tbody tr").length ?? 0;
    const search = !!el?.querySelector("input[type=search], .wodx-search");
    el?.querySelector("button[data-action=cancel]")?.click();
    await Promise.race([open, sleep(1500)]);
    ok("8. window", rows >= 2 && (rows <= 5 || search), {rows, search});

    // 9. B7807: a place on a long clock
    const pack = Ch.chronicle?.current?.() ?? null;
    const L = await import("/modules/wodx-chronicle/scripts/chronicle-local-rules.mjs");
    const row = L.localOf(pack).taints[0];
    if ( !row ) ok("9. clock taint", false, {error: "no chronicle in play ties a place to a clock", chronicle: pack?.id ?? null});
    else {
      const saga = Ch.pod.saga, size = saga.rules.SAGA_CLOCKS.find(c => c.key === row.clock)?.size ?? 0;
      const re = new RegExp(row.scene, "i");
      let sc = game.scenes.find(x => re.test(x.name));
      if ( !sc ) { sc = (await Scene.createDocuments([{name: `Gate ${row.scene}`, width: 1000, height: 1000, navigation: false}]))[0]; made.scenes.push(sc.id); }
      const flagBefore = foundry.utils.deepClone(sc.flags?.[M]?.corruption ?? null);
      const clockBefore = Number(saga.state().clocks?.[row.clock]) || 0;
      const at = Math.min(clockBefore, size - 1);
      try {
        await saga.clock(row.clock, at); await O.corruption.follow(); await sleep(200);
        const l0 = C.of(game.scenes.get(sc.id)).level;
        await saga.clock(row.clock, at + 1); await O.corruption.follow(); await sleep(200);
        const l1 = C.of(game.scenes.get(sc.id)).level;
        await saga.clock(row.clock, at); await O.corruption.follow(); await sleep(200);
        const l2 = C.of(game.scenes.get(sc.id)).level;
        const want = Math.min(row.max, Math.round((at + 1) * row.per)) - Math.min(row.max, Math.round(at * row.per));
        ok("9. clock taint", l1 - l0 === want && l2 === l0, {scene: sc.name, clock: row.clock, at, levels: [l0, l1, l2], want});
      } finally {
        await saga.clock(row.clock, clockBefore); await O.corruption.follow();
        const s2 = game.scenes.get(sc.id);
        if ( s2 && !made.scenes.includes(sc.id) ) await s2.update(flagBefore ? {[`flags.${M}.corruption`]: flagBefore} : {[`flags.${M}.-=corruption`]: null});
      }
    }
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try {
      for ( const p of Ch.approvals.pending() ) if ( !pendingBefore.has(p.id) && /corrupt|pentex|ridden/.test(`${p.type} ${p.key}`) ) await Ch.approvals.decide(p.id, "deny", "gate clean-up");
      if ( made.scenes.length ) await Scene.deleteDocuments(made.scenes);
      if ( made.actors.length ) await Actor.deleteDocuments(made.actors);
      const msgs = game.messages.filter(m => m.timestamp >= msgStart && /Wyrm corruption|Gauntlet at Gate corruption/.test(m.content ?? ""));
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      ok("10. clean up", !made.scenes.some(id => game.scenes.get(id)) && !made.actors.some(id => game.actors.get(id)) && game.time.worldTime === t0);
    } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("10. clean up", false); }
  }
  return save(R);
}
