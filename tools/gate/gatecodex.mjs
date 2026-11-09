/**
 * A player codex (WoDX Storyteller 0.7.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecodex.mjs?${Date.now()}`)).run()
 * It makes a character and a journal of its own, and deletes them and the character's codex at the end.
 *   1. the module: Storyteller 0.7.0 or later, api.codex
 *   2. revealing a two-page journal makes the codex in WoDX codices with both pages, the text page dated
 *   3. changing a page and revealing it again changes the copy; no second copy
 *   4. the codex opens for nobody else by default
 *   5. the journal's header has Reveal to a codex
 *   6. clean up
 * Result: Data/wodx-gate/gatecodex-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/6 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatecodex-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), X = M?.api?.codex;
  let actor = null, source = null;
  const codex = () => game.journal.find(j => j.flags?.[MOD]?.codex === actor?.id);
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.7.0", M.version) && typeof X?.reveal === "function", {version: M?.version});
    actor = await Actor.create({name: "WoDX gate: Learner", type: "Mortal"});
    source = await JournalEntry.create({name: "WoDX gate: Lore", pages: [
      {name: "The bell", type: "text", text: {content: "<p>It rang under the river.</p>", format: 1}, sort: 1},
      {name: "The map", type: "image", src: "icons/svg/mystery-man.svg", sort: 2}]});
    const n1 = await X.reveal(source, [actor]); await sleep(400);
    const c = codex();
    const text = c?.pages?.find(p => p.name === "The bell")?.text?.content ?? "";
    ok("2. revealed", n1[actor.id] === 2 && c?.folder?.name === "WoDX codices" && c.name === "Codex: WoDX gate: Learner" && c.pages.size === 2
      && /It rang under the river/.test(text) && /Learned /.test(text) && c.pages.find(p => p.name === "The map")?.src === "icons/svg/mystery-man.svg", {n1, pages: c?.pages?.size, text});

    const page = source.pages.find(p => p.name === "The bell");
    await page.update({"text.content": "<p>It rang twice under the river.</p>"});
    await X.reveal(game.journal.get(source.id).pages.get(page.id), [actor]); await sleep(400);
    const t2 = codex()?.pages?.find(p => p.name === "The bell")?.text?.content ?? "";
    ok("3. again", codex().pages.size === 2 && /rang twice/.test(t2), {pages: codex().pages.size});

    ok("4. private", codex().ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, {ownership: codex().ownership});

    const sheet = game.journal.get(source.id).sheet;
    await sheet.render({force: true}); await sleep(800);
    let controls = [];
    try { controls = sheet._getHeaderControls?.() ?? []; } catch (e) { R.notes.push(`header controls: ${e.message}`); }
    const inMenu = controls.some(x => x.action === "wodxRevealCodex") || !!sheet.element?.querySelector?.("[data-action=wodxRevealCodex]");
    ok("5. header", inMenu, {actions: controls.map(x => x.action)});
    await sheet.close();
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( codex() ) await codex().delete();
      if ( source ) await game.journal.get(source.id)?.delete();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      ok("6. clean up", !game.journal.get(source?.id ?? "") && (!actor || !game.actors.get(actor.id)));
    } catch (err) { ok("6. clean up", false, {error: err.message}); }
  }
  return save(R);
}
