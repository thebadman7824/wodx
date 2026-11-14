/**
 * NPCs who talk to each other where they can be overheard (NPC 0.53.0, B2750 to B2753), in rothenstein-wodx (the
 * testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateoverheard.mjs?${Date.now()}`)).run()
 * Makes four scenes ("WoDX gate: Overheard Brno", "... Cairo" in Egypt, "... earshot", "... street") and their actors, and deletes them after. The world settings it touches are put back; the clock does not move.
 *   1. versions and api
 *   2. two NPCs side by side and a character beside them: they talk, the character gets the whisper, the scene keeps it
 *   3. Cairo: the talk reads as Egypt (region, way of life, no Moravian words), in the year of the chronicle
 *   4. earshot: a character 12 squares off hears nothing; moved to 3 squares, they hear it (setting on, chance 1)
 *   5. the scene's own switch stops it; force (the window's button) still works
 *   6. passers-by keep to street talk over eight exchanges
 *   7. the Overheard talk window opens with its record and a search box, and the token tool is there
 * Result: Data/wodx-gate/gateoverheard-result.json.
 */
// a batch create need not hand the documents back in the order asked: put them back in that order by name
const inOrder = (docs, data) => data.map(d => docs.find(x => x.name === d.name));

const N = 7;
const MOD = "wodx-npc";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateoverheard-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const v = id => game.modules.get(id)?.version, older = (a, id) => foundry.utils.isNewerVersion(a, v(id) ?? "0");
  const npc = () => game.modules.get(MOD)?.api;
  const G = 100, scenes = [], actors = [], msgs = [];
  const t0 = game.time.worldTime;
  const keep = {overheard: game.settings.get(MOD, "overheard"), chance: game.settings.get(MOD, "overheardChance")};
  const mark = () => new Set(game.messages.contents.map(m => m.id));
  const fresh = before => game.messages.contents.filter(m => !before.has(m.id) && m.flags?.[MOD]?.overheard);
  try {
    const OR = await import(`/modules/wodx-npc/scripts/overheard-rules.mjs?${Date.now()}`);
    const sceneData = ["Brno", "Cairo", "earshot", "street"].map(n => ({name: `WoDX gate: Overheard ${n}`, width: 2000, height: 1200, padding: 0.1, grid: {size: G, distance: 5}}));
    const made = inOrder(await Scene.createDocuments(sceneData), sceneData);
    scenes.push(...made);
    const [brno, cairo, ear, street] = made;
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    const actorData = [1, 2, 3, 4].map(i => ({name: `WoDX gate: Overheard speaker ${i}`, type: "Mortal"})).concat([{name: "WoDX gate: Overheard listener", type: "Mortal"}]);
    const mk = inOrder(await Actor.createDocuments(actorData), actorData);
    actors.push(...mk);
    const listener = mk.at(-1);
    const player = game.users.find(u => !u.isGM);
    if ( player ) await listener.update({[`ownership.${player.id}`]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER});
    else R.notes.push("no player user in the world: the exchanges go to the Storyteller only and step 4 is skipped");
    const pcOK = listener.hasPlayerOwner;
    R.notes.push(`year ${game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()}, homeland ${game.modules.get("wodx-chronicle")?.api?.world?.homeland?.()}, listener has a player: ${pcOK}`);
    const place = async (scene, list) => scene.createEmbeddedDocuments("Token", list.map(([a, x, y, extra = {}]) => ({name: a.name, actorId: a.id, actorLink: a === listener, x: x * G, y: y * G, ...extra})));

    await step("1. versions and api", async () => {
      ok("1. versions and api", !older("0.53.0", MOD) && typeof npc()?.overheard?.run === "function" && typeof npc()?.openOverheard === "function"
        && typeof OR.exchange === "function" && OR.TOPICS.includes("times"), {npc: v(MOD)});
    });

    await step("2. a pair talks and the character hears it", async () => {
      await place(brno, [[mk[0], 5, 5], [mk[1], 6, 5], [listener, 7, 6]]);
      const before = mark();
      const r = await npc().overheard.run(brno, {force: true});
      await sleep(300);
      const got = fresh(before);
      const log = npc().overheard.log(brno);
      ok("2. a pair talks and the character hears it", r.ok && r.lines.length === 2 && got.length >= 1 && (!pcOK || got.some(m => m.flags[MOD].overheard.listener === listener.id))
        && log.length === 1 && log[0].lines.length === 2 && !r.lines.some(l => OR.unfilled(l)), {r: {topic: r.topic, lines: r.lines, heard: r.heard, why: r.why}, messages: got.length, log});
      msgs.push(...got.map(m => m.id));
    });

    await step("3. Cairo talks as Egypt", async () => {
      await place(cairo, [[mk[0], 5, 5], [mk[1], 6, 5], [listener, 7, 6]]);
      const rs = [];
      for ( const topic of ["watch", "work"] ) { const before = mark(); rs.push(await npc().overheard.run(cairo, {force: true, topic})); msgs.push(...fresh(before).map(m => m.id)); }
      const text = rs.flatMap(r => r.lines ?? []).join(" ");
      const sh = rs[0]?.shared ?? {};
      ok("3. Cairo talks as Egypt", rs.every(r => r.ok) && sh.region === "egypt" && sh.sphere === "islamic" && !/reeve|castellan|Wenceslas/.test(text),
        {shared: {region: sh.region, sphere: sh.sphere, year: sh.year, times: sh.times, media: sh.media, money: sh.money}, lines: rs.map(r => r.lines)});
    });

    await step("4. earshot", async () => {
      await game.settings.set(MOD, "overheard", true);
      await game.settings.set(MOD, "overheardChance", 1);
      const [, , me] = await place(ear, [[mk[2], 5, 5], [mk[3], 6, 5], [listener, 18, 5]]);
      const wasPaused = game.paused;
      if ( wasPaused ) await game.togglePause(false, {broadcast: true});
      await sleep(200);
      const far = await npc().overheard.run(ear);
      await me.update({x: 9 * G, y: 5 * G}, {animate: false});
      await sleep(1800); // the move itself may trigger a look; either way one exchange is enough
      const near = npc().overheard.log(ear).length ? {ok: true, by: "move"} : await npc().overheard.run(ear);
      if ( wasPaused ) await game.togglePause(true, {broadcast: true});
      if ( !pcOK ) ok("4. earshot", true, {skipped: "no player user owns the listener, so nobody can be in earshot"});
      else ok("4. earshot", !far.ok && near.ok && npc().overheard.log(ear).length >= 1, {far: far.why, near: near.ok ? (near.by ?? near.topic) : near.why, paused: wasPaused});
    });

    await step("5. the scene's own switch", async () => {
      await brno.update({[`flags.${MOD}.overheard.off`]: true});
      const off = await npc().overheard.run(brno);
      const forced = await npc().overheard.run(brno, {force: true});
      ok("5. the scene's own switch", !off.ok && /off/i.test(off.why ?? "") && forced.ok, {off: off.why, forced: forced.ok});
    });

    await step("6. passers-by keep to street talk", async () => {
      const pb = {flags: {[MOD]: {passerby: {gate: true}}}};
      await place(street, [[mk[2], 5, 5, pb], [mk[3], 6, 5, pb], [listener, 7, 6]]);
      const topics = [];
      for ( let i = 0; i < 8; i++ ) { const r = await npc().overheard.run(street, {force: true}); topics.push(r.ok ? r.topic : `none: ${r.why}`); }
      ok("6. passers-by keep to street talk", topics.every(t => OR.PASSERBY_TOPICS.includes(t)), {topics});
    });

    await step("7. the window and the tool", async () => {
      const p = npc().openOverheard(brno);
      await sleep(600);
      const el = document.querySelector(".wnpc-overheard-window");
      const rows = el?.querySelectorAll(".wnpc-oh-row")?.length ?? 0, search = !!el?.querySelector("input.wodx-search");
      el?.querySelector("button[data-action='cancel']")?.click();
      await Promise.race([p, sleep(1500)]);
      const controls = {};
      Hooks.callAll("getSceneControlButtons", controls);
      const tool = !!(controls.tokens ?? controls.token)?.tools?.wodxOverheard || !!ui.controls?.controls?.tokens?.tools?.wodxOverheard;
      ok("7. the window and the tool", !!el && rows >= 1 && search && tool, {rows, search, tool});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e).slice(0, 600));
  } finally {
    try { await game.settings.set(MOD, "overheard", keep.overheard); await game.settings.set(MOD, "overheardChance", keep.chance); } catch (e) { R.errors.push(`settings: ${e.message}`); }
    try {
      const ids = new Set(scenes.map(s => s.id));
      const gone = game.messages.contents.filter(m => msgs.includes(m.id) || ids.has(m.flags?.[MOD]?.overheard?.scene)).map(m => m.id);
      if ( gone.length ) await ChatMessage.deleteDocuments(gone);
    } catch (e) { R.errors.push(`messages: ${e.message}`); }
    try { if ( scenes.length ) await Scene.deleteDocuments(scenes.map(s => s.id)); } catch (e) { R.errors.push(`scenes: ${e.message}`); }
    try { if ( actors.length ) await Actor.deleteDocuments(actors.map(a => a.id)); } catch (e) { R.errors.push(`actors: ${e.message}`); }
    if ( game.time.worldTime !== t0 ) { R.notes.push(`clock moved by ${game.time.worldTime - t0}s; put back`); await game.time.advance(t0 - game.time.worldTime); }
  }
  return save(R);
}
