/**
 * Beginner and Full views, toolbar drawers, token menu groups and Find anything (WoDX Chronicle 0.52.0, Actions 3.62.0,
 * B2810 to B2826), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplayerview.mjs?${Date.now()}`)).run()
 * The Storyteller previews the Beginner view (this session only) and the gate puts Full back. It makes one Kindred
 * actor and one token on the viewed scene and deletes both.
 *   1. the modules: Chronicle 0.52.0 or later with api.playerView; Actions 3.62.0 or later with menuEntries and runSpec
 *   2. Full view: every WoDX button as before, Find anything on the bar, no drawer buttons
 *   3. Beginner view: drawer buttons; every button shown in Full is on the bar or in a drawer; X-card, Find my character on the bar
 *   4. a drawer opens beside its button with labelled buttons, a second press closes it, and a drawer button works (the Clock opens)
 *   5. the token menu: the WoDX buttons sit behind Act, Move, Look and Talk; the Actions book stays; a group opens
 *   6. Find anything finds the Clock, a setting (My view) and the Kindred's Feed action
 *   7. Actions: menuEntries lists the Kindred's menu with common checks; every spec is unique
 *   8. back to Full: the drawers are gone and the token menu is as before
 *   9. Beginner Actions menu: a Common row of five, the groups folded behind Every action, a line under each button
 *  10. a roll card says the result in a sentence first, with the dice folded
 *  11. a weather card folds to one line for a Beginner player; a roll card does not
 *  12. the Action window folds More options in Beginner view and opens it in Full view
 *  13. Sheets 0.19.0: the Kindred's Core tab opens with Quick rolls (four checks and Your powers) in Beginner view
 *  14. a quick roll rolls at once (one new chat card, no window); zero Abilities fold behind Show all, which opens them
 *  15. the More tab button tucks Settings and Effects, and opens them; the power tab follows Core
 *  16. hover help on Dexterity; Full view shows the sheet with none of these
 *  17. What can I do now? is on the bar in both views; with the Kindred's token selected it reads "in the scene",
 *      offers Look around and has the three I am stuck buttons; Look around rolls (one new card)
 *  18. a fight with the token: "a fight is starting" with Roll initiative; with initiative set and the turn its own,
 *      Attack and End my turn are offered (the fight is deleted after)
 * Result: Data/wodx-gate/gateplayerview-result.json.
 */
const N = 18;
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

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const C = game.modules.get("wodx-chronicle"), V = C?.api?.playerView, A = game.modules.get("wodx-actions");
  let actor = null, tokDoc = null;
  try {
    ok("1. modules", C?.active && !foundry.utils.isNewerVersion("0.52.0", C.version) && typeof V?.preview === "function" && !!V?.rules?.GROUPS
      && A?.active && !foundry.utils.isNewerVersion("3.62.0", A.version) && typeof A.api?.menuEntries === "function" && typeof A.api?.runSpec === "function",
      {chronicle: C?.version, actions: A?.version});

    ui.controls.activate?.({control: "tokens"});
    V.preview("full"); await redraw();
    const full = shown();
    ok("2. full view", full.includes("wodxFind") && full.includes("wodxClock") && !full.some(n => n.startsWith("wodxGroup")), {shown: full.length});

    V.preview("beginner"); await redraw();
    const beg = shown();
    const groups = beg.filter(n => n.startsWith("wodxGroup"));
    // Foundry drops hidden buttons from the controls, so the drawers say what they hold
    const inDrawers = (V.drawers?.() ?? []).filter(n => V.rules.TOOL_GROUP[n] && full.includes(n));
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

    // Step 2 of the desk (B2817 to B2821), still in the Beginner preview
    const dlg = () => [...foundry.applications.instances.values()].filter(a => a.element?.querySelector?.(".wodx-menu2, form [name=diff]"));
    A.api.menu({actor}); await sleep(1200);
    const mw = dlg().find(a => a.element.querySelector(".wodx-menu2"));
    const m2 = mw?.element.querySelector(".wodx-menu2");
    const front = [...(m2?.querySelectorAll(".vta-front button[data-k]") ?? [])].map(b => b.dataset.k);
    ok("9. beginner actions menu", front.length === 5 && m2.classList.contains("vta-folded") && !!m2.querySelector(".vta-all-toggle") && !!m2.querySelector(".vta-btn-line"),
      {front, lines: m2?.querySelectorAll(".vta-btn-line").length ?? 0});
    await mw?.close?.();

    const msgs = [];
    const el = id => ui.chat.element?.querySelector(`[data-message-id="${id}"]`) ?? document.querySelector(`#chat [data-message-id="${id}"]`);
    const card = `<div class="vta-card wodx-x"><header class="vta-head"><h3>WoDX gate roll</h3><span class="vta-verdict good">2 successes</span></header><div class="vta-body"><div class="vta-sec"><b>Wits + Alertness</b>: 5 dice, diff 6<div class="vta-parts">gate</div><div class="vta-dice"><span class="vta-die hit">8</span></div><div class="vta-res good">2 successes</div></div></div></div>`;
    msgs.push(await ChatMessage.create({content: card, whisper: [game.user.id], speaker: {alias: "WoDX gate"}}));
    msgs.push(await ChatMessage.create({content: "<p>WoDX gate: a cold wind off the hills, and rain later in the night, heavy by the small hours.</p>", whisper: [game.user.id], speaker: {alias: "Weather"}}));
    await sleep(800);
    const rc = el(msgs[0].id), wc = el(msgs[1].id);
    ok("10. plain roll card", /^Success: it works, well enough/.test(rc?.querySelector(".vta-plain")?.textContent ?? "") && !!rc?.querySelector("details.vta-fold .vta-dice"),
      {plain: rc?.querySelector(".vta-plain")?.textContent});
    ok("11. quieter chat", !!wc?.querySelector("details.wodx-world-fold > summary") && !rc?.querySelector("details.wodx-world-fold"), {summary: wc?.querySelector("details.wodx-world-fold > summary")?.textContent});
    for ( const m of msgs ) await m.delete();

    A.api.action({actor}); await sleep(1000);
    let aw = dlg().find(a => a.element.querySelector("details.vta-more-opts"));
    const begFold = aw ? !aw.element.querySelector("details.vta-more-opts").open : null;
    await aw?.close?.();
    V.preview("full"); await sleep(200);
    A.api.action({actor}); await sleep(1000);
    aw = dlg().find(a => a.element.querySelector("details.vta-more-opts"));
    const fullOpen = aw ? aw.element.querySelector("details.vta-more-opts").open : null;
    await aw?.close?.();
    ok("12. more options", begFold === true && fullOpen === true, {begFold, fullOpen});

    // Step 3 of the desk: the sheet (B2822 to B2825)
    const SH = game.modules.get("wodx-sheets");
    V.preview("beginner"); await sleep(200);
    await actor.sheet.render(true); await sleep(1500);
    let sh = actor.sheet.element?.[0] ?? actor.sheet.element;
    const qr = [...(sh?.querySelectorAll(".wodx-quickrolls button.wodx-quick") ?? [])];
    ok("13. quick rolls", !foundry.utils.isNewerVersion("0.19.0", SH?.version ?? "0") && qr.length === 5 && !!sh.querySelector(".wodx-quick-power"),
      {sheets: SH?.version, buttons: qr.map(b => b.textContent.trim())});
    const nMsg = game.messages.size, nApps = foundry.applications.instances.size;
    qr[0]?.click(); await sleep(1500);
    const rolled = game.messages.contents.slice(nMsg);
    const show = sh?.querySelector(".wodx-showall");
    const zero = sh?.querySelector(".wodx-zero");
    const hidden = zero ? getComputedStyle(zero).display === "none" : null;
    show?.click(); await sleep(100);
    const shownNow = zero ? getComputedStyle(zero).display !== "none" : null;
    ok("14. quick roll and Show all", rolled.length === 1 && foundry.applications.instances.size === nApps && hidden === true && shownNow === true,
      {cards: rolled.length, hidden, shownNow, show: show?.textContent});
    for ( const m of rolled ) await m.delete();
    const nav = sh?.querySelector("nav.sheet-tabs[data-group='primary']");
    const set = nav?.querySelector("[data-tab='settings']");
    const tuckedHidden = set ? getComputedStyle(set).display === "none" : null;
    nav?.querySelector(".wodx-tab-more")?.click(); await sleep(100);
    const tuckedShown = set ? getComputedStyle(set).display !== "none" : null;
    const tabs = [...(nav?.children ?? [])].map(x => x.dataset.tab ?? "");
    ok("15. more tabs", tuckedHidden === true && tuckedShown === true && tabs[tabs.indexOf("core") + 1] === "discipline", {tabs});
    const dex = [...(sh?.querySelectorAll("label") ?? [])].find(l => /^\s*Dexterity\s*$/i.test(l.textContent));
    const help = dex?.dataset.tooltip ?? "";
    await actor.sheet.close(); await sleep(300);
    V.preview("full"); await sleep(200);
    await actor.sheet.render(true); await sleep(1500);
    sh = actor.sheet.element?.[0] ?? actor.sheet.element;
    const plainFull = !sh?.querySelector(".wodx-quickrolls, .wodx-showall, .wodx-tab-more");
    await actor.sheet.close();
    ok("16. hover help, and Full view untouched", /dodge/i.test(help) && plainFull, {help, plainFull});

    // 17-18. What can I do now? (B2826)
    const onBarFull = shown().includes("wodxNow");
    V.preview("beginner"); await redraw();
    const onBarBeg = shown().includes("wodxNow");
    tok.control({releaseOthers: true}); await sleep(200);
    const nowEl = async () => { await V.now(); await sleep(900); return document.getElementById("wodx-now"); };
    let nw = await nowEl();
    const moment1 = nw?.querySelector("[data-moment]")?.dataset.moment;
    const labels1 = [...(nw?.querySelectorAll("button[data-i] b") ?? [])].map(b => b.textContent);
    const stuckN = nw?.querySelectorAll("button[data-stuck]").length ?? 0;
    const before = game.messages.size;
    nw?.querySelector("button[data-i]")?.click(); await sleep(2000);
    const cards = game.messages.contents.slice(before);
    ok("17. what can I do now", onBarFull && onBarBeg && moment1 === "scene" && labels1.includes("Look around") && stuckN === 3 && cards.length === 1,
      {onBarFull, onBarBeg, moment1, labels1, stuckN, cards: cards.length});
    for ( const m of cards ) await m.delete();
    let fight = null;
    try {
      fight = await Combat.create({scene: canvas.scene.id, active: true});
      await fight.createEmbeddedDocuments("Combatant", [{tokenId: tok.id, sceneId: canvas.scene.id, actorId: actor.id}]);
      await sleep(500); nw = await nowEl();
      const moment2 = nw?.querySelector("[data-moment]")?.dataset.moment;
      const labels2 = [...(nw?.querySelectorAll("button[data-i] b") ?? [])].map(b => b.textContent);
      await fight.combatants.contents[0].update({initiative: 10});
      await fight.startCombat(); await sleep(800); nw = await nowEl();
      const moment3 = nw?.querySelector("[data-moment]")?.dataset.moment;
      const labels3 = [...(nw?.querySelectorAll("button[data-i] b") ?? [])].map(b => b.textContent);
      ok("18. what can I do now in a fight", moment2 === "fightStart" && labels2.includes("Roll initiative") && moment3 === "fightTurn"
        && labels3.includes("Attack") && labels3.includes("End my turn"), {moment2, labels2, moment3, labels3});
    } finally {
      if ( fight ) await fight.delete();
      await foundry.applications.instances.get("wodx-now")?.close();
      V.preview("full"); await redraw();
    }

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

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gateplayerview", runGate);
