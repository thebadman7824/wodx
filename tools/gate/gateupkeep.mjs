/**
 * Simulated systems (Storyteller 0.12.0, Actions 3.17.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateupkeep.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actors of its own and deletes them; it does not move the clock.
 *   1. the modules: versions, the upkeep API, the two approval types
 *   2. between nights: three nights skipped put one proposal in the queue with the vampire's blood and Willpower
 *   3. approving it changes the sheet and posts a card with Undo
 *   4. Undo puts the sheet back
 *   5. ties: a custom tie forty days untended comes due on one card, and is warned only once
 *   6. Tended resets its clock
 *   7. heat: botches raise a place to Watched (+2 difficulty) and the Hunt reads the ground set for the scene
 *   8. heat: Hunted proposes the era's response
 *   9. clean up: scene, actors, messages, our queue entries
 * Result: Data/wodx-gate/gateupkeep-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 9;
const DAY = 86400;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateupkeep-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), t = game.time.worldTime;
  const Ch = game.modules.get("wodx-chronicle").api, T = game.modules.get("wodx-storyteller").api;
  const pendingBefore = new Set(Ch.approvals.pending().map(p => p.id));
  let scene = null, vamp = null, kin = null;
  try {
    const types = Ch.approvals.types().map(x => x.type);
    ok("1. modules", atLeast("wodx-storyteller", "0.12.0") && atLeast("wodx-actions", "3.17.0") && !!T?.upkeep?.huntHere
      && types.includes("wodx-storyteller.between") && types.includes("wodx-storyteller.heat"),
    {versions: ["wodx-storyteller", "wodx-actions"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    vamp = await Actor.create({name: "WoDX gate: night walker", type: "Vampire", ownership: {default: 3}});
    await vamp.update({"system.advantages.bloodpool.temporary": 8, "system.advantages.bloodpool.max": 10, "system.advantages.willpower.temporary": 1, "system.advantages.willpower.permanent": 5});
    const blood0 = vamp.system.advantages.bloodpool.temporary, wp0 = vamp.system.advantages.willpower.temporary;
    await T.upkeep.between({from: t - 3 * DAY - 60, to: t, label: "WoDX gate", actorIds: [vamp.id]});
    await sleep(500);
    const entry = Ch.approvals.pending().find(p => p.type === "wodx-storyteller.between" && !pendingBefore.has(p.id));
    const row = entry?.data?.rows?.find(r => r.id === vamp.id);
    const auto = game.settings.get("wodx-actions", "dawnDusk") === "auto", n = auto ? 2 : 3;
    ok("2. between nights proposed", !!row && row.delta.blood === -n && row.delta.willpower === Math.min(5 - wp0, n), {delta: row?.delta, auto});

    if ( entry ) await Ch.approvals.decide(entry.id, "approve");
    await sleep(500);
    const card = game.messages.contents.find(m => m.timestamp >= msgStart && m.flags?.["wodx-storyteller"]?.betweenUndo);
    ok("3. applied with Undo", vamp.system.advantages.bloodpool.temporary === blood0 - n && vamp.system.advantages.willpower.temporary === Math.min(5, wp0 + n) && !!card,
      {blood: vamp.system.advantages.bloodpool.temporary, wp: vamp.system.advantages.willpower.temporary});

    if ( card ) await T.upkeep.undo(card);
    await sleep(300);
    ok("4. Undo", vamp.system.advantages.bloodpool.temporary === blood0 && vamp.system.advantages.willpower.temporary === wp0,
      {blood: vamp.system.advantages.bloodpool.temporary, wp: vamp.system.advantages.willpower.temporary});

    kin = await Actor.create({name: "WoDX gate: kin keeper", type: "Mortal", ownership: {default: 3},
      flags: {"wodx-storyteller": {ties: {"custom-gate": {custom: true, kind: "kinfolk", name: "WoDX gate sister", every: 30, last: t - 40 * DAY}}}}});
    const due = await T.upkeep.check({force: true});
    const tieCard = game.messages.contents.some(m => m.timestamp >= msgStart && m.content.includes("WoDX gate sister"));
    const again = await T.upkeep.check({force: true});
    ok("5. tie due once", due.some(d => d.actor === kin.id) && tieCard && !again.some(d => d.actor === kin.id), {due: due.length, again: again.length});

    await T.upkeep.tend(kin.id, "custom-gate");
    const st = T.upkeep.tiesOf(kin).find(x => x.key === "custom-gate");
    ok("6. tended", st && !st.due && st.last === game.time.worldTime, {tie: st});

    scene = await Scene.create({name: "WoDX gate: alley", width: 1000, height: 1000, flags: {"wodx-storyteller": {hunt: {area: "slums", heat: 0, since: t}}}});
    for ( let i = 0; i < 3; i++ ) await T.upkeep.addHeat(scene, "botch");
    const h = T.upkeep.huntHere(scene);
    ok("7. heat and ground", h.area === "slums" && h.heat === 6 && h.band.name === "Watched" && h.extra === 2, {here: {area: h.area, heat: h.heat, band: h.band.name}});

    await T.upkeep.addHeat(scene, "botch");
    await sleep(300);
    const resp = Ch.approvals.pending().find(p => p.type === "wodx-storyteller.heat" && p.data?.sceneId === scene.id);
    ok("8. the era answers", !!resp && !!resp.data?.who, {who: resp?.data?.who});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    for ( const p of Ch.approvals.pending().filter(p => !pendingBefore.has(p.id) && /^wodx-storyteller\.(between|heat)$/.test(p.type)) ) await Ch.approvals.decide(p.id, "reject");
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && (/WoDX gate/.test(m.content) || m.flags?.["wodx-storyteller"]?.betweenUndo !== undefined || /Between nights|Hunting grounds/.test(m.speaker?.alias ?? ""))).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( scene ) await scene.delete();
    for ( const a of [vamp, kin] ) if ( a ) await a.delete();
    ok("9. clean up", !game.scenes.getName("WoDX gate: alley") && !game.actors.getName("WoDX gate: night walker"), {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("9. clean up", false); }
  return save(R);
}
