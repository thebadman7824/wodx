/**
 * Printable props (WoDX Atmosphere 0.9.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateprint.mjs?${Date.now()}`)).run()
 * It makes a handout of its own and borrows the first scene that has a map picture (read only), builds the print
 * pages without opening the print window, and deletes its handout and frames at the end.
 *   1. the module: Atmosphere 0.9.0 or later, api.print
 *   2. the handout's print page: the era style sheet, the handout itself, Storyteller secrets left out
 *   3. the page loads in a hidden frame and the handout's style applies there (its paper colour)
 *   4. a scene's map: the picture, the right way round
 *   5. the journal header has Print or save as PDF; the journal and scene menus have it too
 *   6. a scene with no picture says so and opens nothing
 *   7. clean up
 * Result: Data/wodx-gate/gateprint-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateprint-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), P = M?.api?.print;
  let journal = null, bare = null;
  const frames = [];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.9.0", M.version) && typeof P?.journalHtml === "function", {version: M?.version});
    journal = await M.api.handout({template: "notice", title: "WoDX gate: plague notice", body: "Stay within the walls.\n\nBy order.", from: "The council", date: "St. Martin's Eve"});
    const page = journal.pages.contents[0];
    await page.update({"text.content": `${page.text.content}<section class="secret" id="secret-gate"><p>WoDX gate: only the Storyteller</p></section>`});
    const html = await P.journalHtml(journal);
    ok("2. the handout's page", html.includes("wodx-atmosphere.css") && html.includes("wodx-ho-notice") && html.includes("Stay within the walls") && !html.includes("only the Storyteller"),
      {len: html.length});

    const f = await P.html(html, {dry: true}); frames.push(f);
    await sleep(800);
    const ho = f.contentDocument?.querySelector(".wodx-handout");
    const bg = ho ? f.contentWindow.getComputedStyle(ho).backgroundColor : "";
    ok("3. in the frame", !!ho && bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent", {bg});

    const scene = game.scenes.find(s => s.background?.src);
    if ( scene ) {
      const m = P.sceneHtml(scene);
      const want = scene.width > scene.height ? "landscape" : "portrait";
      ok("4. a map", m.includes(scene.background.src) && m.includes(`size: ${want}`), {scene: scene.name, want});
    } else { R.notes.push("no scene with a map picture in this world"); ok("4. a map", false, {error: "no scene with a picture"}); }

    const controls = [];
    Hooks.callAll("getHeaderControlsJournalEntrySheet", {document: journal, options: {actions: {}}}, controls);
    const jm = [], sm = [];
    Hooks.callAll("getJournalEntryContextOptions", {}, jm);
    Hooks.callAll("getSceneContextOptions", {}, sm);
    ok("5. buttons", controls.some(c => c.action === "wodxPrint") && jm.some(o => o.name === "Print or save as PDF") && sm.some(o => o.name === "Print the map"),
      {header: controls.map(c => c.action), journalMenu: jm.length, sceneMenu: sm.length});

    bare = await Scene.create({name: "WoDX gate: no picture", width: 800, height: 600, padding: 0});
    const before = document.querySelectorAll("iframe.wodx-print-frame").length;
    const r = P.scene(game.scenes.get(bare.id), {dry: true});
    ok("6. no picture", r === null && document.querySelectorAll("iframe.wodx-print-frame").length === before);
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const f of frames ) f?.remove?.();
      if ( journal ) await game.journal.get(journal.id)?.delete();
      if ( bare ) await game.scenes.get(bare.id)?.delete();
      ok("7. clean up", (!journal || !game.journal.get(journal.id)) && (!bare || !game.scenes.get(bare.id)) && frames.every(f => !f?.isConnected));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
