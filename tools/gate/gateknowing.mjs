/**
 * What an NPC can tell of someone (WoDX NPC 0.33.0, B1380-B1382), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateknowing.mjs?${Date.now()}`)).run()
 * It makes a scene and actors of its own and deletes them at the end. The clock never moves. If the WoDX Masquerade
 * journal exists, its records are put back exactly as they were.
 *   1. the module: NPC 0.33.0 or later, api.rivalry.tells
 *   2. a mortal NPC cannot tell a Kindred who passes for human
 *   3. once the Kindred is plainly inhuman (the obvious tick), it can
 *   4. a Masquerade record with the mortal as a witness who saw: it can; made to forget: it cannot
 *   5. a Kindred NPC with Auspex 3 can tell by its senses
 *   6. every other WoDX module still answers
 * Result: Data/wodx-gate/gateknowing-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const G = 100;
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gateknowing-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const newer = (v, want) => { const a = String(v).split(".").map(Number), b = want.split(".").map(Number); for ( let i = 0; i < 3; i++ ) { if ( (a[i] || 0) !== b[i] ) return (a[i] || 0) > b[i]; } return true; };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const back = canvas.scene;
  const api = () => game.modules.get("wodx-npc")?.api;
  const findMasq = () => game.journal.find(x => x.getFlag?.("wodx-actions", "kind") === "masquerade");
  const masqWas = findMasq();
  const oldEntries = masqWas ? foundry.utils.deepClone(masqWas.getFlag("wodx-actions", "entries") ?? []) : null;
  let scene, actors = [], madeJournal = null, mortal, leech, elder;
  try {
    scene = await Scene.create({name: "WoDX gate: Knowing", width: 2000, height: 1200, padding: 0, grid: {type: 1, size: G, distance: 5, units: "ft"}, tokenVision: false});
    await scene.view();
    await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
    actors = await createActors([
      {name: "WoDX gate: Knowing townsman", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "civilian"}}}},
      {name: "WoDX gate: Knowing leech", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "neonate"}}}},
      {name: "WoDX gate: Knowing elder", type: "Mortal", flags: {"wodx-npc": {behavior: {template: "elder"}}}}]);
    await game.wodxCombat.setKind(actors[1], "kindred");
    await game.wodxCombat.setKind(actors[2], "kindred");
    await scene.createEmbeddedDocuments("Token", [
      {name: "townsman", actorId: actors[0].id, x: G * 2, y: G * 5, actorLink: true, disposition: 0},
      {name: "leech", actorId: actors[1].id, x: G * 4, y: G * 5, actorLink: true, disposition: -1},
      {name: "elder", actorId: actors[2].id, x: G * 6, y: G * 5, actorLink: true, disposition: -1}]);
    const tok = id => scene.tokens.find(t => t.actorId === id)?.object;
    await until(() => tok(actors[0].id) && tok(actors[1].id) && tok(actors[2].id));
    mortal = tok(actors[0].id); leech = tok(actors[1].id); elder = tok(actors[2].id);

    await step("1. api", async () => {
      const v = game.modules.get("wodx-npc")?.version;
      ok("1. api", newer(v, "0.33.0") && typeof api()?.rivalry?.tells === "function", {version: v});
    });
    await step("2. passes for human", async () => {
      const r = api().rivalry.tells(mortal, leech);
      ok("2. passes for human", r.tells === false, r);
    });
    await step("3. plainly inhuman", async () => {
      await actors[1].setFlag("wodx-npc", "obvious", true);
      const r = api().rivalry.tells(mortal, leech);
      await actors[1].unsetFlag("wodx-npc", "obvious");
      ok("3. plainly inhuman", r.tells === true && r.how === "obvious", r);
    });
    await step("4. saw it, then made to forget", async () => {
      let j = findMasq();
      if ( !j ) { j = madeJournal = await JournalEntry.create({name: "WoDX gate: Masquerade", flags: {"wodx-actions": {kind: "masquerade", entries: []}}}); }
      const base = foundry.utils.deepClone(j.getFlag("wodx-actions", "entries") ?? []);
      const rec = s => ({id: "gateknowing", date: "", by: actors[1].name, byUuid: actors[1].uuid, event: "gate", witnesses: [{name: actors[0].name, uuid: actors[0].uuid, state: s}], secret: "kindred", mode: "open", spread: false});
      await j.setFlag("wodx-actions", "entries", [...base, rec("saw")]);
      const saw = api().rivalry.tells(mortal, leech);
      await j.setFlag("wodx-actions", "entries", [...base, rec("forgot")]);
      const forgot = api().rivalry.tells(mortal, leech);
      ok("4. saw it, then made to forget", saw.tells === true && saw.how === "saw it" && forgot.tells === false, {saw, forgot});
    });
    await step("5. Auspex", async () => {
      await actors[2].createEmbeddedDocuments("Item", [{name: "Auspex", type: "Power", system: {type: "wod.types.discipline", value: 3}}]);
      const r = api().rivalry.tells(elder, leech);
      ok("5. Auspex", r.tells === true && r.how === "auspex", r);
    });
    await step("6. other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-storyteller", "wodx-senses", "wodx-library"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("6. other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      if ( masqWas ) await game.journal.get(masqWas.id)?.setFlag("wodx-actions", "entries", oldEntries);
      if ( madeJournal ) await game.journal.get(madeJournal.id)?.delete();
      if ( back && back.id !== scene?.id ) await back.view();
      if ( scene ) await scene.delete();
      for ( const x of actors ) if ( x ) await game.actors.get(x.id)?.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R);
}
