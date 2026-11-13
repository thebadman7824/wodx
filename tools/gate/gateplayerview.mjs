/**
 * Beginner and Full views, toolbar drawers, token menu groups and Find anything (WoDX Chronicle 0.52.0, Actions 3.60.0,
 * B2800 to B2806), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplayerview.mjs?${Date.now()}`)).run()
 * The Storyteller previews the Beginner view (this session only) and the gate puts Full back. It makes one Kindred
 * actor and one token on the viewed scene and deletes both.
 *   1. the modules: Chronicle 0.52.0 or later with api.playerView; Actions 3.60.0 or later with menuEntries and runSpec
 *   2. Full view: every WoDX button as before, Find anything on the bar, no drawer buttons
 *   3. Beginner view: drawer buttons; every button shown in Full is on the bar or in a drawer; X-card, Find my character on the bar
 *   4. a drawer opens beside its button with labelled buttons, a second press closes it, and a drawer button works (the Clock opens)
 *   5. the token menu: the WoDX buttons sit behind Act, Move, Look and Talk; the Actions book stays; a group opens
 *   6. Find anything finds the Clock, a setting (My view) and the Kindred's Feed action
 *   7. Actions: menuEntries lists the Kindred's menu with common checks; every spec is unique
 *   8. back to Full: the drawers are gone and the token menu is as before
 * Result: Data/wodx-gate/gateplayerview-result.json.
 */
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayerview-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

const toolsNow = () => { const c = ui.controls.controls; return (c.tokens ?? c.token)?.tools ?? {}; };
const shown = () => Object.values(toolsNow()).filter(t => t.button && t.visible !== false).map(t => t.name);
async function redraw() { await ui.controls.render({reset: true}); await sleep(300); }

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const C = game.modules.get("wodx-chronicle"), V = C?.api?.playerView, A = game.modules.get("wodx-actions");
  let actor = null, tokDoc = null;
  try {
    ok("1. modules", C?.active && !foundry.utils.isNewerVersion("0.52.0", C.version) && typeof V?.preview === "function" && !!V?.rules?.GROUPS
      && A?.active && !foundry.utils.isNewerVersion("3.60.0", A.version) && typeof A.api?.menuEntries === "function" && typeof A.api?.runSpec === "function",
      {chronicle: C?.version, actions: A?.version});

    ui.controls.activate?.({control: "tokens"});
    V.preview("full"); await redraw();
    const full = shown();
    ok("2. full view", full.includes("wodxFind") && full.includes("wodxClock") && !full.some(n => n.startsWith("wodxGroup")), {shown: full.length});

    V.preview("beginner"); await redraw();
    const beg = shown();
    const groups = beg.filter(n => n.startsWith("wodxGroup"));
    const inDrawers = Object.entries(toolsNow()).filter(([n, t]) => t.visible === false && V.rules.TOOL_GROUP[n] && full.includes(n)).map(([n]) => n);
    const lost = full.filter(n => !beg.includes(n) && !inDrawers.includes(n));
    ok("3. beginner view", groups.length >= 3 && !lost.length && beg.includes("wodxXCard") && beg.includes("wodxFindMe") && beg.includes("wodxFind") && beg.length < full.length,
      {shown: beg.length, groups, inDrawers: inDrawers.length, lost});

    V.openDrawer("time", "wodxGroupTime"); await sleep(200);
    const dr = document.querySelector(".wodx-drawer[data-group='time']");
    const labels = [...(dr?.querySelectorAll("button[data-tool-name]") ?? [])].map(b => b.textContent.trim());
    V.openDrawer("time", "wodxGroupTime"); await sleep(100);
    const closed = !document.querySelector(".wodx-drawer");
    V.openDrawer("time", "wodxGroupTime"); await sleep(100);
    document.querySelector(".wodx-drawer button[data-tool-name='wodxClock']")?.click(); await sleep(800);
    const clock = [...foundry.applications.instances.values()].find(a => /clock/i.test(a.id ?? "") || /Chronicle Clock/i.test(a.title ?? ""));
    ok("4. drawer", labels.length >= 3 && labels.every(l => l.length > 2) && closed && !!clock && !document.querySelector(".wodx-drawer"), {labels, clock: clock?.id});
    await clock?.close?.();

    const scene = canvas.scene;
    actor = await Actor.create({name: "WoDX gate: beginner", type: "Vampire"});
    [tokDoc] = await scene.createEmbeddedDocuments("Token", [{...(await actor.getTokenDocument({x: 300, y: 300})).toObject()}]);
    await sleep(500);
    const tok = tokDoc.object;
    tok.control({releaseOthers: true});
    await canvas.hud.token.bind(tok); await sleep(600);
    const hud = canvas.hud.token.element;
    const loose = [...hud.querySelectorAll(".col.left > .control-icon, .col.right > .control-icon")].filter(b => !b.dataset.action && V.rules.hudGroupOf(b.className) && V.rules.hudGroupOf(b.className) !== "keep");
    const hg = [...hud.querySelectorAll(".wodx-hud-group")];
    hg[0]?.querySelector(".wodx-hud-toggle")?.click(); await sleep(100);
    ok("5. token menu", hg.length >= 1 && !loose.length && !!hud.querySelector(".vta-hud") && !!hud.querySelector(".wodx-hud-group.open"),
      {groups: hg.map(g => g.querySelector(".wodx-hud-toggle")?.dataset.tooltip), loose: loose.map(b => b.className)});

    await V.find(); await sleep(1200);
    const app = foundry.applications.instances.get("wodx-find");
    const q = app?.element?.querySelector(".wodx-find-q");
    const look = async w => { q.value = w; q.dispatchEvent(new Event("input")); await sleep(150); return [...app.element.querySelectorAll(".wodx-find-list b")].map(b => b.textContent); };
    const fClock = q ? await look("clock") : [], fView = q ? await look("my view") : [], fFeed = q ? await look("feed") : [];
    ok("6. find anything", fClock.some(l => /Chronicle Clock/i.test(l)) && fView.some(l => /My view/i.test(l)) && fFeed.length > 0, {clock: fClock.slice(0, 5), view: fView.slice(0, 5), feed: fFeed.slice(0, 5)});
    await app?.close?.();

    const ents = await A.api.menuEntries(actor);
    const specs = ents.map(e => e.spec);
    ok("7. actions entries", ents.length > 10 && specs.some(s => s.startsWith("check:")) && new Set(specs).size === specs.length, {n: ents.length, sample: ents.slice(0, 6).map(e => e.label)});

    V.preview("full"); await redraw();
    await canvas.hud.token.bind(tok); await sleep(600);
    ok("8. back to full", !shown().some(n => n.startsWith("wodxGroup")) && !canvas.hud.token.element.querySelector(".wodx-hud-group") && shown().length === full.length,
      {shown: shown().length});
    canvas.hud.token.close?.();
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { V?.preview?.(null); } catch (e) { R.errors.push(`preview back: ${e}`); }
    try { if ( tokDoc ) await tokDoc.delete(); } catch (e) { R.errors.push(`token: ${e}`); }
    try { if ( actor ) await actor.delete(); } catch (e) { R.errors.push(`actor: ${e}`); }
  }
  return save(R);
}
