/**
 * The Library's shelves, manual and what's new (WoDX Library 0.2.0), in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelibrary.mjs?${Date.now()}`)).run()
 * It makes (or refreshes) the five shelf compendiums and the two journals; they stay, since they belong to the world.
 *   1. the module: Library 0.2.0 or later, api.library, the toolbar button
 *   2. the shelves: five world compendiums (the encyclopedia may still be empty), the other four with entries
 *   3. a second refresh changes nothing
 *   4. the catalogue: a Dark Ages power entry fits the Dark Ages, not Modern; Wraith 20th fits both
 *   5. the window lists entries with a search box and opens one
 *   6. the manual (players can read it; the Storyteller page is hidden) and What's new (lists this build)
 * Result: Data/wodx-gate/gatelibrary-result.json.
 */
const MOD = "wodx-library";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/6 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatelibrary-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), L = M?.api?.library;
  try {
    const controls = {tokens: {tools: {}}};
    Hooks.callAll("getSceneControlButtons", controls);
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.3.0", M.version) && typeof L?.install === "function" && !!controls.tokens.tools.wodxLibrary, {version: M?.version});
    const r1 = await L.install();
    const packs = r1.packs.map(id => game.packs.get(id));
    const sizes = await Promise.all(packs.map(async p => (await p.getIndex()).size));
    ok("2. the shelves", packs.length === 5 && packs.every(p => p?.documentName === "JournalEntry") && sizes.slice(0, 4).every(n => n > 0), {sizes, first: r1});
    const r2 = await L.install();
    ok("3. no change", r2.created === 0 && r2.remade === 0 && r2.kept > 0 && r2.kept <= sizes.reduce((a, b) => a + b, 0), {r2});
    const cat = await L.catalogue();
    const fit = (n, era) => { const e = cat.find(x => x.name === n); return e && L.rules.fits(e, {era}); };
    ok("4. by era", fit("Animalism (Dark Ages)", "dark-ages") && !fit("Animalism (Dark Ages)", "modern") && fit("Argos", "modern") && fit("Argos", "dark-ages"), {entries: cat.length});
    await L.open(); await sleep(900);
    const el = document.querySelector("#wodx-library");
    const btn = el?.querySelector("button[data-action=open]");
    btn?.click(); await sleep(900);
    const opened = foundry.applications.instances ? [...foundry.applications.instances.values()].some(a => a.document?.pack && a.document?.flags?.[MOD]?.shelf) : false;
    ok("5. the window", !!el?.querySelector("input[type=search]") && el.querySelectorAll("li.wodx-shelf-row").length > 0 && opened, {rows: el?.querySelectorAll("li.wodx-shelf-row").length});
    for ( const a of [...(foundry.applications.instances?.values() ?? [])] ) if ( a.document?.pack && a.document?.flags?.[MOD]?.shelf ) await a.close();
    await foundry.applications.instances?.get?.("wodx-library")?.close?.();
    const man = await M.api.manual.ensure(), news = await M.api.changelog.ensure();
    const gmPage = man?.pages?.find(p => p.name === "For the Storyteller");
    ok("6. manual and news", man?.ownership?.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER && gmPage?.ownership?.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE
      && (news?.pages?.find(p => p.name === "In this world")?.text?.content ?? "").includes("WoDX Library"), {manual: man?.pages?.size});
  } catch (err) { R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`); }
  return save(R);
}
