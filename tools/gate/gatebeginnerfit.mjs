/**
 * The Player UI Desk's fit pass with a Beginner preview on, in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatebeginnerfit.mjs?${Date.now()}`)).run()
 * Needs gateuisnap.mjs and fit-audit.mjs beside it in Data/wodx-gate.
 *   1. the Beginner preview turns on (api.playerView.preview("beginner"))
 *   2. gateuisnap runs every sheet and tab in Full view and then in Beginner view (the quick roll row, the More tab);
 *      Beginner view adds no finding of its own (the findings both views share are listed for the layout work)
 *   3. Find anything, What can I do now?, My WoDX preferences and the tour open, and fit-audit finds nothing in them
 *   4. each toolbar drawer opens, and fit-audit finds nothing in it
 *   5. the preview turns off again (preview(null))
 * If the page has wodxShot(name) (a Playwright runner can expose one), it is called for the toolbar, each window and
 * each drawer. It only opens and closes windows: no document is created, changed or deleted.
 * Result: Data/wodx-gate/gatebeginnerfit-result.json.
 */
const N = 5;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const shot = async name => { try { if ( typeof window.wodxShot === "function" ) await window.wodxShot(`beginner-${name}`); } catch { /* pictures are optional */ } };

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatebeginnerfit-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const V = game.modules.get("wodx-chronicle")?.api?.playerView;
  let audit = null;
  try { audit = (await import(`/wodx-gate/fit-audit.mjs?${Date.now()}`)).audit; } catch (e) { R.errors.push(`fit-audit.mjs: ${e.message}`); }
  const check = el => (el && audit ? audit(el) : [{kind: "missing", msg: el ? "no fit-audit" : "not drawn"}]).map(f => ({kind: f.kind, msg: f.msg, el: f.el}));
  const before = V?.current?.();
  try {
    V.preview("beginner");
    await ui.controls.render({reset: true}); await sleep(400);
    ok("1. beginner preview", V.current() === "beginner" && document.body.classList.contains("wodx-view-beginner"));
    await shot("toolbar");

    // The same sheets in Full view first, so a finding Beginner view adds stands apart from one already there
    const key = f => `${f.sheet}|${f.tab}|${f.kind}|${f.msg}`;
    let full = null, snap = null;
    V.preview("full"); await sleep(300);
    try { full = await (await import(`/wodx-gate/gateuisnap.mjs?${Date.now()}`)).run(); } catch (e) { R.errors.push(`gateuisnap full: ${e.message}`); }
    V.preview("beginner"); await sleep(300);
    try { snap = await (await import(`/wodx-gate/gateuisnap.mjs?${Date.now()}`)).run(); } catch (e) { R.errors.push(`gateuisnap: ${e.message}`); }
    const had = new Set((full?.list ?? []).map(key));
    const added = (snap?.list ?? []).filter(f => !had.has(key(f)));
    ok("2. every sheet in Beginner view", !!snap && !snap.errors && !added.length,
      {added, beginner: {sheets: snap?.sheets, findings: snap?.findings, byKind: snap?.byKind}, full: {findings: full?.findings, byKind: full?.byKind, list: full?.list}});

    const wins = [["find", () => V.find(), "wodx-find"], ["now", () => V.now(), "wodx-now"], ["prefs", () => V.prefs(), "wodx-prefs"], ["tour", () => V.tour(), "wodx-guide"]];
    const winFind = {};
    for ( const [name, open, id] of wins ) {
      try { await open(); await sleep(900); } catch (e) { R.errors.push(`${name}: ${e.message}`); }
      const app = foundry.applications.instances.get(id);
      winFind[name] = check(app?.element);
      await shot(name);
      await app?.close?.(); await sleep(200);
    }
    ok("3. the player windows fit", Object.values(winFind).every(f => !f.length), {found: winFind});

    const drawFind = {};
    for ( const g of V.rules.GROUPS ) {
      const tool = `wodxGroup${g.id[0].toUpperCase()}${g.id.slice(1)}`;
      if ( !document.querySelector(`[data-tool='${tool}']`) ) continue;
      V.openDrawer(g.id, tool); await sleep(300);
      drawFind[g.id] = check(document.querySelector(`.wodx-drawer[data-group='${g.id}']`));
      await shot(`drawer-${g.id}`);
      document.body.click(); await sleep(150);
    }
    ok("4. the drawers fit", Object.keys(drawFind).length >= 3 && Object.values(drawFind).every(f => !f.length), {found: drawFind});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    const back = V?.preview?.(null);
    await ui.controls.render({reset: true}); await sleep(300);
    ok("5. preview off", back === before, {before, after: back});
  }
  return save(R);
}
