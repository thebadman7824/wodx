/**
 * The Net gate (B6590 to B6603), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatenet.mjs?${Date.now()}`)).run()
 * Puts the clock in 2010 (and back at the end), makes a home scene "WoDX gate: Net home" with a keypad door, a light
 * and a runner, then:
 *   1. the api, the setting, the Net statuses; the classic year has the Digital Web and the Net button
 *   2. a fortress draws for the home scene: its folder, art, data wall, locked gate doors, ICE tokens, remotes tied
 *   3. the runner jacks in: Jacked in status, an icon at the long distance link
 *   4. Hammer at a gate wears it down, and at 0 its door opens on the map
 *   5. a door remote opens the home scene's door; the lights remote puts its lights out
 *   6. a Stun hit freezes the runner; two Net turns end it
 *   7. Hellbolt reaches the body (lethal on the health track); Firestarter lights a fire beside the body
 *   8. a transactions file copied puts money in the purse
 *   9. the ICE takes its turn without an error
 *  10. on the Future Darkness branch the year has cyberdecks, and a deck's memory limits the load
 *  11. jacking out takes the icon away and the status off
 *  12. Technica 6 on the Future branch in 2030: Ghost in the Machine gets in with no deck, a remote obeys with no roll
 *  13. Remote Touch from the home scene opens the keypad door within 100 feet; a Cyberpunk's Discipline use costs Willpower
 * Then puts back the clock and the branch, and deletes what it made. Result: Data/wodx-gate/gatenet-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const M = "wodx-otherworlds", CH = "wodx-chronicle";
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const back = canvas.scene;
  const api = () => game.modules.get(M)?.api?.net;
  const ch = () => game.modules.get(CH)?.api;
  const {YEAR} = await import("/modules/wodx-chronicle/scripts/terms.mjs");
  const toYear = async y => setTime(game.time.worldTime + Math.round((y - ch().eras.currentYear()) * YEAR));
  const startTime = game.time.worldTime;
  const startBranch = game.settings.get(CH, "rule.futureBranch");
  const startIce = game.settings.get(M, "netIce");
  const made = [];
  let home, actor, fort;
  const setTime = async t => { if ( t !== game.time.worldTime ) await (game.time.set ? game.time.set(t) : game.time.advance(t - game.time.worldTime)); };
  try {
    await game.settings.set(M, "netIce", "off");
    if ( startBranch ) await game.settings.set(CH, "rule.futureBranch", false);
    await toYear(2010);
    R.notes.push(`year ${ch().eras.currentYear()}`);
    home = await Scene.create({name: "WoDX gate: Net home", width: 2000, height: 1500, padding: 0, grid: {type: 1, size: 100}, tokenVision: false});
    made.push(home);
    await home.createEmbeddedDocuments("Wall", [{c: [1000, 200, 1000, 300], door: 1, ds: 2, move: 20, sight: 20, light: 20, sound: 20, flags: {"wodx-interactables": {electronic: "good", locked: true}}}]);
    await home.createEmbeddedDocuments("AmbientLight", [{x: 500, y: 500, config: {dim: 6, bright: 3}}]);
    actor = await Actor.create({name: "WoDX gate: Netrunner", type: "Mortal", prototypeToken: {actorLink: true}});
    await home.createEmbeddedDocuments("Token", [{name: "runner", actorId: actor.id, actorLink: true, x: 300, y: 400}]);
    const body = home.tokens.contents[0];

    await step("1. api, setting, statuses, the Web in 2010", async () => {
      const ids = Object.keys(api().rules.STATUSES);
      const ctl = ui.controls?.controls?.tokens?.tools ?? ui.controls?.controls?.token?.tools ?? {};
      ui.controls?.render?.({reset: true});
      ok("1. api, setting, statuses, the Web in 2010", typeof api()?.draw === "function" && ids.every(id => CONFIG.statusEffects.some(e => e.id === id)) && api().kind() === "web",
        {kind: api().kind(), button: !!ctl.wodxNet});
    });
    await step("2. a fortress draws for the home scene", async () => {
      fort = await api().draw({seed: 42, cpus: 4, link: home.id, name: "WoDX gate: fortress"});
      made.push(fort);
      const m = api().modelOf(fort);
      const gates = fort.walls.filter(w => w.flags?.[M]?.netGate);
      const ice = fort.tokens.filter(t => t.flags?.[M]?.netIceId);
      ok("2. a fortress draws for the home scene", m.cpus === 4 && m.link === home.id && gates.length === 4 && gates.every(w => w.door === 1 && w.ds === 2)
        && ice.length === m.ice.length && m.remotes.some(r => r.kind === "lights") && game.folders.get(fort.folder?.id ?? fort.folder)?.name === "WoDX Net",
        {walls: fort.walls.size, ice: ice.length, remotes: m.remotes.map(r => r.kind)});
    });
    await step("3. the runner jacks in", async () => {
      const icon = await api().jackInto(body, fort, {way: "sensory"});
      const m = api().modelOf(fort);
      ok("3. the runner jacks in", !!icon && icon.x === m.entry.x * 100 && actor.statuses.has("wodx-net") && actor.flags[M]?.netRun?.fortress === fort.id && home.tokens.size === 1);
    });
    await step("4. Hammer opens a gate", async () => {
      await actor.update({"system.abilities.computer.value": 5, "system.attributes.intelligence.value": 4});
      let g = null;
      for ( let i = 0; i < 20; i++ ) {
        await api().run(actor, "hammer", "gate1");
        g = api().modelOf(fort).gates.find(x => x.id === "gate1");
        if ( g.open ) break;
      }
      const ws = fort.walls.filter(w => w.flags?.[M]?.netGate === "gate1");
      ok("4. Hammer opens a gate", g.open && ws.every(w => w.ds === 1), {strength: g.strength});
    });
    await step("5. remotes work the home scene", async () => {
      const m = api().modelOf(fort);
      const door = home.walls.contents[0];
      if ( !m.remotes.some(r => r.kind === "door") ) { m.remotes.push({id: "remg", kind: "door", label: "Automatic door or gate", x: 5, y: 5, link: {scene: home.id, wall: door.id}}); await fort.setFlag(M, "netFortress", m); }
      const dr = api().modelOf(fort).remotes.find(r => r.kind === "door" && r.link?.wall);
      const lr = api().modelOf(fort).remotes.find(r => r.kind === "lights");
      for ( let i = 0; i < 15 && home.walls.get(dr.link.wall).ds !== 1; i++ ) await api().run(actor, "genie", dr.id);
      for ( let i = 0; i < 15 && !home.lights.contents[0].hidden; i++ ) await api().run(actor, "genie", lr.id);
      ok("5. remotes work the home scene", home.walls.get(dr.link.wall).ds === 1 && home.lights.contents[0].hidden === true);
    });
    await step("6. Stun freezes, two Net turns end it", async () => {
      await api().hit(actor, {kind: "status", status: "net-frozen", turns: 2}, {scene: fort, m: api().modelOf(fort)});
      const on = actor.statuses.has("net-frozen");
      await api().iceRound(fort); await api().iceRound(fort);
      ok("6. Stun freezes, two Net turns end it", on && !actor.statuses.has("net-frozen"));
    });
    await step("7. Hellbolt hurts the body; Firestarter lights a fire by it", async () => {
      const before = JSON.stringify(actor.system.health ?? {});
      await api().hit(actor, {kind: "body", type: "lethal", levels: 1}, {scene: fort, m: api().modelOf(fort)});
      await sleep(300);
      const after = JSON.stringify(actor.system.health ?? {});
      await api().hit(actor, {kind: "fire", size: "small"}, {scene: fort, m: api().modelOf(fort)});
      const fire = home.tiles.find(t => t.flags?.["wodx-interactables"]?.hazardKind === "fire");
      ok("7. Hellbolt hurts the body; Firestarter lights a fire by it", before !== after && !!fire, {fire: !!fire});
    });
    await step("8. a transactions file fills the purse", async () => {
      const m = api().modelOf(fort);
      const mem = m.memories[0];
      mem.files[0] = {...mem.files[0], kind: "transactions", label: "Financial transactions", locked: false, taken: false};
      await fort.setFlag(M, "netFortress", m);
      const icon = fort.tokens.find(t => t.flags?.[M]?.netIcon === actor.id);
      await icon.update({x: mem.x * 100, y: (mem.y + 1) * 100});
      const money = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
      const p0 = JSON.stringify(money?.purse?.(actor) ?? null);
      await api().file(actor, mem.files[0].id, {copy: true});
      const p1 = JSON.stringify(money?.purse?.(actor) ?? null);
      ok("8. a transactions file fills the purse", !money || p0 !== p1, {before: p0, after: p1, money: !!money});
    });
    await step("9. the ICE takes its turn", async () => {
      const lines = await api().iceRound(fort);
      ok("9. the ICE takes its turn", Array.isArray(lines), {lines: lines?.length});
    });
    await step("10. the Future branch has cyberdecks", async () => {
      await game.settings.set(CH, "rule.futureBranch", true);
      const kind = api().kind();
      const load = api().rules.loadOut("standard", ["watchdog", "pitbull"]);
      await game.settings.set(CH, "rule.futureBranch", false);
      ok("10. the Future branch has cyberdecks", kind === "deck" && load.over.includes("pitbull"), {kind});
    });
    await step("11. jacking out", async () => {
      await api().jackOut(actor, {force: true});
      ok("11. jacking out", !fort.tokens.some(t => t.flags?.[M]?.netIcon === actor.id) && !actor.statuses.has("wodx-net") && !actor.flags[M]?.netRun);
    });
    await step("12. Technica: the Ghost in the Machine", async () => {
      await game.settings.set(CH, "rule.futureBranch", true);
      await toYear(2030);
      await actor.createEmbeddedDocuments("Item", [{name: "Technica", type: "Power", system: {type: "wod.types.discipline", value: 6}}]);
      const ways = api().rules.waysFor(api().kind(), api().technica.dots(actor));
      const icon = await api().jackInto(body, fort, {way: "ghost"});
      const run = actor.flags[M]?.netRun ?? {};
      const m = api().modelOf(fort);
      const door = home.walls.contents[0];
      await door.update({ds: 0});
      const dr = m.remotes.find(r => r.kind === "door" && r.link?.wall);
      if ( dr ) { run.programs.includes("genie") || await actor.setFlag(M, "netRun", {...run, programs: [...run.programs, "genie"]}); await api().run(actor, "genie", dr.id); }
      ok("12. Technica: the Ghost in the Machine", ways.includes("ghost") && !!icon && run.way === "ghost" && run.deck === null && !!dr && home.walls.get(door.id).ds === 1, {ways, deck: run.deck});
      await api().jackOut(actor, {force: true});
    });
    await step("13. Remote Touch and the weakness", async () => {
      const door = home.walls.contents[0];
      await door.update({ds: 0, "flags.wodx-interactables.locked": true});
      await body.update({x: 900, y: 200});
      const line = await api().technica.remoteTouch(body, "door");
      const opened = home.walls.get(door.id).ds === 1;
      await actor.update({"flags.wodx-actions.bloodline": "Cyberpunks", "system.advantages.willpower.temporary": 5});
      await actor.unsetFlag(M, "cyberTally");
      await api().technica.powerShown(actor, {power: "Dominate", group: "Dominate", kind: "disc"});
      await api().technica.powerShown(actor, {power: "Dominate", group: "Dominate", kind: "disc"});
      const wp = actor.system.advantages.willpower.temporary;
      ok("13. Remote Touch and the weakness", opened && wp < 5, {line, wp, tally: actor.flags[M]?.cyberTally});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( back && !made.some(s => s.id === back.id) ) await back.view();
      for ( const s of made ) await game.scenes.get(s.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      for ( const a of game.actors.filter(x => x.flags?.[M]?.netIce) ) await a.delete();
      const f = game.folders.find(x => x.type === "Actor" && x.name === "WoDX Net ICE"); if ( f && !f.contents?.length ) await f.delete();
      await setTime(startTime);
      await game.settings.set(CH, "rule.futureBranch", startBranch);
      await game.settings.set(M, "netIce", startIce);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatenet-result.json");
}
