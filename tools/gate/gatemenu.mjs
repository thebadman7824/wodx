/**
 * The menu search, tours and check flavor (WoDX Actions 3.14.0, Chronicle 0.5.2), in Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatemenu.mjs?${Date.now()}`)).run()
 * It makes one test mortal and deletes it, with its cards.
 *   1. versions
 *   2. the menu opens; "Also found" is hidden while the search box is empty
 *   3. typing "perception" shows Notice something under Also found
 *   4. using it opens the Common checks dialog on that check
 *   5. a Notice something card carries one of the check's own flavor lines
 *   6. both tours are registered and the player's starts and stops
 *   7. put back
 * Result: Data/wodx-gate/gatemenu-result.json.
 */
const A = "wodx-actions", CH = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const dialogs = () => [...foundry.applications.instances.values()].filter(a => a.rendered);

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gatemenu-result.json"); }
  const msgsBefore = new Set(game.messages.map(m => m.id));
  let actor;
  try {
    ok("1. versions", newer(game.modules.get(A)?.version, "3.14.0") && newer(game.modules.get(CH)?.version, "0.5.2"),
      {actions: game.modules.get(A)?.version, chronicle: game.modules.get(CH)?.version});
    actor = await Actor.create({name: "Gate menu mortal", type: "Mortal"});
    await sleep(800);
    const api = game.wodxActions ?? game.modules.get(A)?.api;
    api.menu({actor}); await sleep(800);
    const wrap = document.querySelector(".wodx-menu2");
    const also = wrap?.querySelector(".vta-elsewhere");
    ok("2. menu, extras hidden", !!wrap && !!also && also.offsetParent === null);
    const find = wrap?.querySelector(".vta-menu-find");
    find.value = "perception"; find.dispatchEvent(new Event("input", {bubbles: true})); await sleep(300);
    const hit = [...(also?.querySelectorAll("button[data-k]") ?? [])].find(b => b.dataset.k === "check:notice");
    ok("3. Notice something found", wrap.classList.contains("is-searching") && !!hit && hit.offsetParent !== null);
    hit?.click(); await sleep(900);
    const dlg = dialogs().find(d => d.element?.querySelector?.("select[name=check]"));
    const sel = dlg?.element.querySelector("select[name=check]")?.value;
    ok("4. Common checks dialog on the check", sel === "notice", {selected: sel});
    await dlg?.close(); await sleep(300);

    const F = await import(`/modules/${A}/scripts/flavor.js`);
    const theme = F.theme(`${actor.name}: Notice something`, "");
    const line = F.line(theme, "success", {name: actor.name});
    ok("5. check flavor", theme === "check:notice" && F.CHECK_POOLS.notice.success.some(x => x.replaceAll("{name}", actor.name) === line), {theme, line});

    const tp = game.tours.get(`${CH}.wodx-players`), ts = game.tours.get(`${CH}.wodx-storyteller`);
    let started = false;
    if ( tp ) { await tp.start(); await sleep(600); started = !!document.querySelector(".tour, #tooltip.tour, .tour-overlay, aside.tour"); tp.exit?.(); await sleep(300); }
    ok("6. tours", !!tp && !!ts && started, {player: !!tp, storyteller: !!ts, started});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const d of dialogs() ) if ( d.element?.classList?.contains("wodx-menu-dialog") || d.element?.querySelector?.(".wodx-menu2") ) await d.close();
      await actor?.delete();
      const cards = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
      if ( cards.length ) await ChatMessage.deleteDocuments(cards);
      ok("7. put back", !game.actors.get(actor?.id), {removedCards: cards.length});
    } catch (err) { ok("7. put back", false, {error: err.message}); }
  }
  return save(R, "gatemenu-result.json");
}
