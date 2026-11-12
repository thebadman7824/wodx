/**
 * The case board (WoDX Interactables 0.32.0) and What they could know (WoDX Library 0.17.0), in Foundry, in
 * rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecase.mjs?${Date.now()}`)).run()
 * It makes a scratch board, scene, tile and actor and deletes them; it does not move the clock. The open-case and
 * clue settings are put back.
 *   1. the modules, versions and APIs
 *   2. a new board is owned by every player and becomes the open case when there is none
 *   3. cards: a person and a note pinned, joined by a line; a hidden card is left out of the player's view
 *   4. the window opens, draws the cards and the line, and closes
 *   5. a clue examined through Interact goes on the open case with what was learned
 *   6. the board's look follows the clock's year (rules)
 *   7. What they could know: suggestions for the actor, the window opens and closes
 *   8. clean up
 * Result: Data/wodx-gate/gatecase-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 8;
const MOD = "wodx-interactables";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatecase-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const msgStart = Date.now(), viewed = canvas.scene;
  const IA = game.modules.get(MOD)?.api, CB = IA?.caseBoard, C = CB?.rules;
  const KN = game.modules.get("wodx-library")?.api?.know;
  const openBefore = game.settings.get(MOD, "caseBoard"), cluesBefore = game.settings.get(MOD, "caseClues");
  let board = null, scene = null, actor = null;
  const folderBefore = !!game.folders.find(f => f.type === "JournalEntry" && f.name === C?.BOARD_FOLDER);
  try {
    ok("1. modules", atLeast(MOD, "0.32.0") && atLeast("wodx-library", "0.17.0") && !!CB?.newBoard && !!CB?.pinClue && !!KN?.open && !!KN?.rules?.listFor,
      {versions: [MOD, "wodx-library", "wodx-storyteller", "wodx-chronicle"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    // 2. A new board
    await game.settings.set(MOD, "caseBoard", "");
    board = await CB.newBoard("WoDX gate: the missing courier");
    ok("2. new board", !!board && board.ownership.default === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER && CB.openBoard()?.id === board.id
      && board.folder?.name === C.BOARD_FOLDER, {open: CB.openBoard()?.name});

    // 3. Cards and a line
    actor = await Actor.create({name: "WoDX gate: the courier", type: "Mortal", ownership: {default: 0}, system: {attributes: {intelligence: {value: 3}}}});
    await CB.change(board, b => C.addCard(b, {kind: "person", ref: actor.uuid, title: actor.name}).board);
    await CB.change(board, b => C.addCard(b, {kind: "note", title: "WoDX gate: a secret", hidden: true}).board);
    await CB.change(board, b => C.link(b, "c1", "c2", "knows"));
    const stored = C.normalize(board.flags[MOD].board);
    const seen = C.visibleTo(stored, false);
    ok("3. cards and a line", stored.cards.length === 2 && stored.links.length === 1 && seen.cards.length === 1 && seen.links.length === 0,
      {cards: stored.cards.map(c => c.title), links: stored.links});

    // 4. The window
    await CB.open(board.id);
    await sleep(800);
    const el = document.getElementById("wodx-case-board");
    const drawn = el?.querySelectorAll(".wix-case-card").length ?? 0, lines = el?.querySelectorAll(".wix-case-link").length ?? 0;
    ok("4. window", drawn === 2 && lines === 1, {drawn, lines, title: el?.querySelector(".window-title")?.textContent});

    // 5. A clue examined through Interact
    await game.settings.set(MOD, "caseClues", true);
    scene = await Scene.create({name: "WoDX gate: the courier's room", width: 1200, height: 800, grid: {size: 100}, tokenVision: false});
    const [tile] = await scene.createEmbeddedDocuments("Tile", [{x: 300, y: 300, width: 100, height: 100, texture: {src: "icons/svg/book.svg"},
      flags: {[MOD]: {kind: "clue", clue: true, texts: ["WoDX gate: a torn letter.", "Signed with a seal.", "", ""]}}}]);
    const pinned = await CB.pinClue({label: "Torn letter"}, tile, ["WoDX gate: a torn letter.", "Signed with a seal."], actor);
    const after = C.normalize(board.flags[MOD].board);
    const clue = after.cards.find(c => c.kind === "clue");
    const again = await CB.pinClue({label: "Torn letter"}, tile, ["WoDX gate: a torn letter."], actor);
    ok("5. found clue pinned", pinned && !again && !!clue && /seal/.test(clue.text) && clue.ref === tile.uuid && C.normalize(board.flags[MOD].board).cards.length === 3,
      {clue, again});
    if ( IA?.attempt ) R.notes.push("A full Interact examine (the roll) is covered by gate-interact step 16; this step calls the pin directly.");

    // 6. Look by year
    ok("6. look by year", C.lookFor(1197).key === "parchment" && C.lookFor(1888).key === "pinboard" && C.lookFor(2030).key === "display"
      && !!C.lookFor(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? 0)?.title, {});

    // 7. What they could know
    const entries = [{id: "g-a", title: "Gate A", kind: "term", lines: ["vampire"], eras: ["dark-ages"]},
      {id: "g-b", title: "Gate B", kind: "event", lines: ["vampire"], eras: ["modern"], date: {from: 2004}}];
    const rows = KN.rules.listFor(entries, {line: "vampire", year: 1250, dots: KN.dotsOf(actor)}, {onlyKnown: false});
    await KN.open(actor.id);
    await sleep(1500);
    const kel = document.getElementById("wodx-know");
    const listed = kel?.querySelectorAll(".wodx-know-list > li").length ?? 0;
    ok("7. what they could know", rows.length === 1 && rows[0].e.id === "g-a" && !!kel && listed >= 1, {rows: rows.map(r => [r.e.id, r.why]), listed});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    for ( const id of ["wodx-case-board", "wodx-know"] ) await foundry.applications.instances?.get?.(id)?.close?.();
    await game.settings.set(MOD, "caseBoard", openBefore);
    await game.settings.set(MOD, "caseClues", cluesBefore);
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && /WoDX gate/.test(m.content)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( viewed && canvas.scene?.id !== viewed.id ) await viewed.view();
    if ( scene ) await scene.delete();
    if ( board ) await board.delete();
    if ( actor ) await actor.delete();
    const folder = game.folders.find(f => f.type === "JournalEntry" && f.name === C?.BOARD_FOLDER);
    if ( folder && !folderBefore && !folder.contents.length ) await folder.delete();
    ok("8. clean up", !game.journal.getName("Case board: WoDX gate: the missing courier") && !game.actors.getName("WoDX gate: the courier")
      && game.settings.get(MOD, "caseBoard") === openBefore, {});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("8. clean up", false); }
  return save(R);
}
