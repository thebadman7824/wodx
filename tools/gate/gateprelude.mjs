/**
 * Prelude and Embrace scene templates (WoDX Storyteller 0.9.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateprelude.mjs?${Date.now()}`)).run()
 * It makes two characters of its own, and deletes them, its journals and its scene at the end.
 *   1. the module: Storyteller 0.9.0 or later, api.prelude
 *   2. a vampire's prelude as the sheet suggests: The Embrace, a journal in WoDX preludes only the Storyteller can open
 *   3. its text: the three parts and the Creation button to record it with
 *   4. a ghoul's sheet suggests the first draught; a line chosen by hand wins over the sheet
 *   5. with a scene: a bare scene with a note that opens the journal, not in navigation
 *   6. the dialog is reachable from Draw for the story and lists every line
 *   7. clean up
 * Result: Data/wodx-gate/gateprelude-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateprelude-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), P = M?.api?.prelude;
  const actors = [], journals = [], scenes = [];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.9.0", M.version) && typeof P?.make === "function" && typeof P?.dialog === "function", {version: M?.version});
    const vamp = await Actor.create({name: "WoDX gate: Prelude Vampire", type: "Vampire"});
    const ghoul = await Actor.create({name: "WoDX gate: Prelude Ghoul", type: "Mortal", system: {settings: {variant: "ghoul"}}});
    actors.push(vamp, ghoul);

    const a = await P.make({actorId: vamp.id}); journals.push(a.journal.id);
    await sleep(200);
    const ja = game.journal.get(a.journal.id);
    ok("2. the Embrace", ja?.name === "The Embrace: WoDX gate: Prelude Vampire" && ja.folder?.name === "WoDX preludes" && ja.ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
      && ja.flags?.[MOD]?.prelude === "vampire", {name: ja?.name, folder: ja?.folder?.name});
    const text = ja?.pages.contents[0]?.text?.content ?? "";
    ok("3. its text", ["Before", "The turn", "After", "When it ends"].every(h => text.includes(`<h2>${h}</h2>`)) && text.includes("Embrace a mortal (WoDX Creation)"), {len: text.length});

    const b = await P.make({actorId: ghoul.id}); journals.push(b.journal.id);
    const c = await P.make({actorId: ghoul.id, line: "werewolf"}); journals.push(c.journal.id);
    ok("4. by sheet and by hand", b.journal.flags?.[MOD]?.prelude === "ghoul" && /^The first draught/.test(b.journal.name) && c.journal.flags?.[MOD]?.prelude === "werewolf",
      {ghoul: b.journal.name, chosen: c.journal.name});

    const d = await P.make({actorId: vamp.id, scene: true}); journals.push(d.journal.id); if ( d.scene ) scenes.push(d.scene.id);
    await sleep(200);
    const sc = game.scenes.get(d.scene?.id);
    const note = sc?.notes?.contents?.[0];
    ok("5. with a scene", !!sc && sc.navigation === false && sc.folder?.name === "WoDX preludes" && note?.entryId === d.journal.id, {scene: sc?.name, notes: sc?.notes?.size});

    // The dialog: answer the chooser with "prelude", capture the prelude window, close it
    const {DialogV2} = foundry.applications.api;
    const wait = DialogV2.wait, seen = [];
    DialogV2.wait = async cfg => { seen.push(cfg); return seen.length === 1 ? "prelude" : "close"; };
    try { await game.modules.get(MOD).api.draw(); }
    finally { DialogV2.wait = wait; }
    const pre = seen.find(s => s.window?.title === "A prelude");
    const html = pre?.content ?? "";
    ok("6. from Draw for the story", seen[0]?.buttons?.some(x => x.action === "prelude") && !!pre && P.lines.every(k => html.includes(`value="${k}"`)) && html.includes("data-fixed"),
      {titles: seen.map(s => s.window?.title)});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const id of scenes ) await game.scenes.get(id)?.delete();
      for ( const id of journals ) await game.journal.get(id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      R.notes.push("an empty WoDX preludes folder may be left in place");
      ok("7. clean up", scenes.every(id => !game.scenes.get(id)) && journals.every(id => !game.journal.get(id)) && actors.every(x => !game.actors.get(x.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
