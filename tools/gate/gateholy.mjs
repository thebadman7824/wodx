/**
 * Herd pools, shared holy ground and day jobs (WoDX Storyteller B3570-B3586, WoDX NPC B3590-B3593), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateholy.mjs?${Date.now()}`)).run()
 * It keeps the settings it touches, makes one scene, a vampire, a mage, a Garou and a mortal of its own, and puts
 * everything back at the end. The clock never moves.
 *   1. the modules: Storyteller with api.upkeep.herds and .sites, NPC with openDayJobs
 *   2. a district's pool comes from its hunting ground and the age
 *   3. feeding past the pool thins the district with a card, and Hunt reads the extra difficulty
 *   4. a site ties a Node and a caern; meditating draws on its strength and the caern's keeper gets a card
 *   5. a weak site gives half
 *   6. a moot fills the site a little
 *   7. a day job on a dot of Influence becomes a long task on the master
 *   8. the job ending gives a card and removes its record
 *   9. the windows: Upkeep has Herds by district and Holy ground; the Followers window has Day jobs
 *  10. clean up
 * Result: Data/wodx-gate/gateholy-result.json.
 */
const ST = "wodx-storyteller", NPC = "wodx-npc";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 10;
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateholy-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function peek(open, cls, text = null) {
  const p = open();
  await sleep(700);
  const app = [...(foundry.applications.instances?.values?.() ?? [])].reverse().find(a => a.options?.classes?.includes?.(cls) && (!text || a.element?.innerHTML?.includes(text)));
  const html = app?.element?.innerHTML ?? "";
  await app?.close?.();
  await Promise.race([p, sleep(500)]);
  return html;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(ST), U = M?.api?.upkeep, H = U?.herds, S = U?.sites, P = U?.power, N = game.modules.get(NPC)?.api;
  const has = k => game.settings.settings.has(k);
  const SET = ["herdPools", "holyGround", "siteState", "placesOfPower", "powerState", "heat"].filter(k => has(`${ST}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(ST, k))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const scenes = [], actors = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const bg = (name, value) => ({name, type: "Feature", system: {type: "wod.types.background", value}});
  try {
    ok("1. modules", M?.active && typeof H?.feed === "function" && typeof S?.gate === "function" && typeof N?.openDayJobs === "function", {storyteller: M?.version, npc: game.modules.get(NPC)?.version});
    await game.settings.set(ST, "herdPools", true);
    await game.settings.set(ST, "holyGround", true);
    await game.settings.set(ST, "placesOfPower", true);
    await game.settings.set(ST, "siteState", S.rules.blankState());
    await game.settings.set(ST, "powerState", P.rules.blankState());
    const sc = await Scene.create({name: "WoDX gate: holy ground", width: 800, height: 600, padding: 0, flags: {[ST]: {hunt: {area: "slums", heat: 0, since: game.time.worldTime}}}});
    scenes.push(sc);
    const [vamp, mage, garou, master] = await createActors([
      {name: "WoDX gate: holy vampire", type: "Vampire"},
      {name: "WoDX gate: holy mage", type: "Mage", system: {quintessence: {temporary: 0}, paradox: {temporary: 0}, spheres: {prime: {value: 1}}}},
      {name: "WoDX gate: holy garou", type: "Werewolf"},
      {name: "WoDX gate: holy master", type: "Mortal"}]);
    actors.push(vamp, mage, garou, master);
    await mage.createEmbeddedDocuments("Item", [{name: "Avatar", type: "Feature", system: {type: "wod.types.background", value: 5}}, bg("Node", 4)]);
    await master.createEmbeddedDocuments("Item", [bg("Influence", 2)]);

    // 2. The pool
    const pool = H.pool(sc);
    ok("2. a district's pool", pool.total >= 2 && pool.classes.some(c => c.key === "poor") && !pool.classes.some(c => c.key === "nobles"), {pool});

    // 3. Over-hunting
    let crossed = null;
    for ( let i = 0; i < pool.total * 2 + 1; i++ ) { const r = await H.feed({scene: game.scenes.get(sc.id), who: vamp.name}); crossed = r?.crossed?.key ?? crossed; }
    const card3 = newMsgs().find(m => /Herds/.test(m.speaker?.alias ?? "") || /wst-herd/.test(m.content));
    const here = U.huntHere(game.scenes.get(sc.id));
    ok("3. over-hunting thins the district", crossed === "stripped" && !!card3 && here.herd === 3 && /herd/.test(here.band.name), {crossed, herd: here.herd, band: here.band.name});

    // 4. A site with a Node and a caern
    const t0 = game.time.worldTime;
    await game.settings.set(ST, "powerState", {v: 1, list: [
      {id: "gate-hnode", kind: "node", name: "WoDX gate: the Spring", scene: sc.id, keepers: [mage.id], rating: 4, side: "mystic", tass: "water", store: {quint: 20, tass: 10}, last: t0},
      {id: "gate-hcaern", kind: "caern", name: "WoDX gate: the Stones", scene: sc.id, keepers: [garou.id], level: 2, status: "held", lastMoot: t0}]});
    await game.settings.set(ST, "siteState", {v: 1, list: [{id: "gate-site", name: "WoDX gate: the Hill", scene: sc.id, places: ["gate-hnode", "gate-hcaern"], elysium: {keeper: vamp.id}, claims: {caern: {faction: "The Sept of the Hill"}, node: {faction: "A chantry"}}}]});
    const v0 = S.view("gate-site");
    const before = newMsgs().length;
    const r4 = await P.meditate("gate-hnode", mage.id, {turns: 3});
    const v4 = S.view("gate-site");
    const card4 = newMsgs().slice(before).find(m => /wst-site/.test(m.content));
    ok("4. drawing on shared ground", r4?.ok && r4.take > 0 && v4.site.strength === v0.max - r4.take && !!card4, {take: r4?.take, max: v0.max, strength: v4.site.strength, roles: v4.roles.map(r => r.role)});

    // 5. Weak gives half
    const st5 = S.state(); st5.list[0].strength = Math.floor(v0.max * 0.4); await game.settings.set(ST, "siteState", st5);
    const g5 = S.gate("gate-hnode", 4);
    ok("5. a weak site gives half", g5?.factor === 0.5 && g5.take === 2, {gate: g5});

    // 6. A moot
    const s6 = S.view("gate-site").site.strength;
    await S.moot("gate-hcaern", 10);
    ok("6. a moot fills the site", S.view("gate-site").site.strength === Math.min(v0.max, s6 + 5), {before: s6, after: S.view("gate-site").site.strength});

    // 7. A day job on Influence
    const agents = N.dayJobs.agentsOf(game.actors.get(master.id));
    const r7 = await N.dayJobs.start({masterId: master.id, agent: "bg:influence", job: "scrub", channel: N.dayJobs.rules.channelsFor(2000)[0]?.key, sceneId: sc.id, note: "gate"});
    const task = r7?.task, meta = game.actors.get(master.id).flags?.[NPC]?.dayJobs?.[task?.id];
    ok("7. a day job becomes a long task", r7?.ok && task?.errand === "job:scrub" && task.dice === 2 && task.attr === "manipulation" && !!meta && agents.some(a => a.key === "bg:influence"), {agents: agents.map(a => a.key), task: task?.name, meta});

    // 8. The job ends
    const before8 = newMsgs().length;
    await N.dayJobs.onTaskDone({actor: game.actors.get(master.id), task: {...task, status: "done"}});
    const card8 = newMsgs().slice(before8).find(m => /wnpc-dayjob/.test(m.content));
    ok("8. the job ending", !!card8 && !game.actors.get(master.id).flags?.[NPC]?.dayJobs?.[task?.id], {card: !!card8});
    try { await M.api.tasks.remove(game.actors.get(master.id), task.id); } catch (e) { /* gone */ }

    // 9. The windows
    const up = await peek(() => U.open(), "wodx-dialog", "Herds by district");
    const fw = await peek(() => N.openFollowers(game.actors.get(master.id)), "wnpc-followers-dialog");
    ok("9. the windows", /Herds by district/.test(up) && /Holy ground/.test(up) && /data-dayjobs/.test(fw), {upkeep: up.length, followers: /data-dayjobs/.test(fw)});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(ST, k, keep[k]);
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("10. clean up", scenes.every(s => !game.scenes.get(s.id)) && actors.every(x => !game.actors.get(x.id)) && !S.state().list.some(x => x.id.startsWith("gate-")));
    } catch (err) { ok("10. clean up", false, {error: err.message}); }
  }
  return save(R);
}
