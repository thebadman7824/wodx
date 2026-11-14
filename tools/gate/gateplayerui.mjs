/**
 * Player interface (WoDX Chronicle, B4120-B4123), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateplayerui.mjs?${Date.now()}`)).run()
 * The Storyteller previews a player's hidden screen parts on their own screen (this session only); the gate puts the
 * screen back and restores the playerUi setting it found.
 *   1. the module: Chronicle with api.playerTools.previewUi, UI_PARTS and the playerUi setting
 *   2. the window is titled Player interface and has a Screen parts tick for every part and every player
 *   3. previewing hotbar, player list, scene navigation and the Journal tab hides each of them on screen
 *   4. chat, Settings, notifications and the scene controls stay on screen while every part is hidden
 *   5. an open sidebar tab that gets hidden sends the sidebar back to chat
 *   6. a saved setting hides the macro bar for Player Test only; the Storyteller's own screen keeps it
 *   7. preview off: every part is back on screen
 * Result: Data/wodx-gate/gateplayerui-result.json.
 */
const N = 7;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateplayerui-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

/** Is anything matching one of these selectors drawn? */
const drawn = sels => sels.some(s => [...document.querySelectorAll(s)].some(el => getComputedStyle(el).display !== "none" && el.getClientRects().length));
const hiddenAll = sels => { const els = sels.flatMap(s => [...document.querySelectorAll(s)]); return els.length > 0 && els.every(el => getComputedStyle(el).display === "none"); };

async function runGate() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const C = game.modules.get("wodx-chronicle"), P = C?.api?.playerTools;
  let before = null;
  try { before = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "playerUi") ?? {}); } catch (e) { /* step 1 fails */ }
  try {
    ok("1. module", C?.active && typeof P?.previewUi === "function" && Array.isArray(P?.UI_PARTS) && before !== null, {chronicle: C?.version});
    const sel = k => P.partSelectors(P.UI_PARTS.find(p => p.key === k));

    // 2. the window
    const players = game.users.filter(u => !u.isGM);
    const open = C.api.openPlayerTools();
    let win = null;
    for ( let i = 0; i < 20 && !win; i++ ) { await sleep(200); win = [...foundry.applications.instances.values()].find(a => a.options?.window?.title === "Player interface"); }
    const boxes = win?.element?.querySelectorAll('input[name^="p."]')?.length ?? 0;
    ok("2. window", !!win && boxes === P.UI_PARTS.length * players.length && !!win.element.querySelector(".wodx-ui-head"), {boxes, want: P.UI_PARTS.length * players.length});
    await win?.close(); await open;

    // 3. preview four parts
    P.previewUi(["hotbar", "players", "nav", "journal"]); await sleep(300);
    const hid = {hotbar: hiddenAll(sel("hotbar")), players: hiddenAll(sel("players")), nav: hiddenAll(sel("nav")), journal: hiddenAll(sel("journal"))};
    ok("3. parts hidden", Object.values(hid).every(Boolean), hid);

    // 4. what always stays
    P.previewUi(P.UI_PARTS.map(p => p.key)); await sleep(300);
    const stay = {chat: drawn(['#sidebar-tabs [data-tab="chat"]', '#sidebar [data-tab="chat"]']), settings: drawn(['#sidebar-tabs [data-tab="settings"]', '#sidebar [data-tab="settings"]']),
      controls: drawn(["#scene-controls"]), notifications: !!document.querySelector("#notifications")};
    ok("4. always shown", Object.values(stay).every(Boolean), stay);

    // 5. the open tab goes back to chat
    P.previewUi(null);
    ui.sidebar.changeTab("journal", "primary"); await sleep(300);
    P.previewUi(["journal"]); await sleep(300);
    const nowTab = ui.sidebar.tabGroups?.primary ?? ui.sidebar.activeTab;
    ok("5. back to chat", nowTab === "chat", {tab: nowTab});

    // 6. the setting: Player Test only
    P.previewUi(null);
    const pt = game.users.find(u => u.name === "Player Test") ?? players[0];
    await game.settings.set("wodx-chronicle", "playerUi", {...before, [pt.id]: {hotbar: false}}); await sleep(400);
    ok("6. setting", P.uiHidden(game.settings.get("wodx-chronicle", "playerUi"), pt.id).includes("hotbar")
      && !document.body.classList.contains(P.uiClass("hotbar")) && drawn(sel("hotbar")), {player: pt?.name});

    // 7. all back
    await game.settings.set("wodx-chronicle", "playerUi", before); before = null; await sleep(300);
    P.previewUi(null); await sleep(200);
    const left = P.UI_PARTS.filter(p => document.body.classList.contains(P.uiClass(p.key))).map(p => p.key);
    ok("7. all back", !left.length && drawn(sel("hotbar")), {left});
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { P?.previewUi?.(null); } catch (e) { R.errors.push(`preview back: ${e}`); }
    try { if ( before !== null ) await game.settings.set("wodx-chronicle", "playerUi", before); } catch (e) { R.errors.push(`setting back: ${e}`); }
  }
  return save(R);
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gateplayerui", runGate);
