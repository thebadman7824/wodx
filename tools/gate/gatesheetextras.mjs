/**
 * Sheet extras gate (WoDX Sheets 0.7.0), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheetextras.mjs?${Date.now()}`)).run()
 * On the 6g test changeling (or another WoDX sheet): the strip, Possessions, Ties, the Storyteller's notes, the
 * header buttons, containers and sizes, out-of-era flags, history and Undo, give (with contents) and leave on the map.
 * Everything it makes is tagged and removed at the end: test items, a temp scene, the notes page (and the notes entry
 * and left-things folder when the gate made them). Result: Data/wodx-gate/gatesheetextras-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-sheets", TAG = { [MOD]: { gate: "sheetextras" } };
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };

export async function run() {
  const X = game.modules.get(MOD)?.api?.extras;
  const XR = await import(`/modules/${MOD}/scripts/extras-rules.mjs`);
  const a = game.actors.find(x => x.name === "Wren (6g, changeling of Spring)") ?? game.actors.find(x => x.sheet?.constructor?.name?.startsWith("Wodx"));
  const b = game.actors.find(x => x.id !== a?.id && x.sheet?.constructor?.name?.startsWith("Wodx") && x.isOwner);
  const hadNotes = !!game.journal.find(j => j.getFlag(MOD, "stNotes")), hadFolder = !!game.folders.find(f => f.type === "Item" && f.getFlag(MOD, "left"));
  let scene = null, purse, coins, sword, watch, el;
  R.actors = { a: a?.name, b: b?.name };
  const open = async () => { await a.sheet.render(true); await until(() => a.sheet.rendered && a.sheet.element?.[0]?.querySelector(".wodx-strip")); el = a.sheet.element[0]; };
  const tagged = act => act.items.filter(i => i.flags?.[MOD]?.gate === "sheetextras");

  try {
    await step("version and api", async () => ok("version and api", game.modules.get(MOD)?.version === "0.7.0" && !!X?.decorate && !!a && !!b, { v: game.modules.get(MOD)?.version, a: a?.name, b: b?.name }));

    await step("the sheet shows the strip, Possessions, Ties, the Storyteller's notes and the header buttons", async () => {
      await open();
      const hdr = a.sheet.element[0].closest(".app")?.querySelector(".window-header") ?? a.sheet.element[0].querySelector(".window-header");
      const r = { strip: !!el.querySelector(".wodx-strip .wodx-strip-cell[data-key='health']"), poss: !!el.querySelector(".tab.gear .wodx-possessions"),
        tiesNav: !!el.querySelector("[data-tab='wodxties']"), ties: !!el.querySelector(".tab.wodxties .wodx-ties"), notes: !!el.querySelector(".tab.note .wodx-st-notes"),
        history: !!hdr?.querySelector(".wodx-history-btn"), print: !!hdr?.querySelector(".wodx-print"), search: !!el.querySelector(".wodx-possessions input.wodx-search") };
      ok("the sheet shows the strip, Possessions, Ties, the Storyteller's notes and the header buttons", Object.values(r).every(Boolean), r);
    });

    await step("containers: things nest, a too-big thing is refused, a stack counts", async () => {
      await a.createEmbeddedDocuments("Item", [
        { name: "Gate purse", type: "Item", system: { iscontainer: true }, flags: { [MOD]: { gate: "sheetextras", holds: "P" } } },
        { name: "Gate coins", type: "Item", flags: { [MOD]: { gate: "sheetextras", qty: 12, conceal: "P", coin: { denom: "Pfennig" } } } },
        { name: "Gate sword", type: "Melee Weapon", system: { conceal: "N" }, flags: TAG },
        { name: "a pocket watch on a chain", type: "Item", flags: TAG }
      ]);
      // Foundry need not hand them back in order: find each by name
      const by = n => a.items.find(i => i.name === n && i.flags?.[MOD]?.gate === "sheetextras");
      [purse, coins, sword, watch] = ["Gate purse", "Gate coins", "Gate sword", "a pocket watch on a chain"].map(by);
      await coins.update({ [`flags.${MOD}.in`]: purse.id });
      await sleep(600); await open();
      const row = el.querySelector(`[data-in='${purse.id}'] [data-wodx-item='${coins.id}']`);
      const refuse = XR.canPut(sword, purse, [...a.items]);
      ok("containers: things nest, a too-big thing is refused, a stack counts", !!row && !refuse.ok && /12/.test(row?.textContent ?? "") && XR.moneyOf([...a.items]).some(m => m.denom === "Pfennig" && m.count >= 12),
        { nested: !!row, refused: refuse.why, row: row?.textContent?.replace(/\s+/g, " ").trim() });
    });

    await step("out of era: a pocket watch is flagged in the Dark Ages, not in the modern era", async () => {
      const era = game.modules.get("wodx-chronicle")?.api?.eras?.activeEra?.()?.profile?.id;
      const r = el.querySelector(`[data-wodx-item='${watch.id}']`);
      const flagged = r?.classList.contains("off-era");
      const cy = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? 0;
      const info = X.look(watch).eraInfo, status = XR.eraStatus(info, era, cy);
      const expect = !!status && status !== "ok";
      ok("out of era: a pocket watch is flagged in the Dark Ages, not in the modern era", !!info && !!r && flagged === expect, { era, year: cy, status, flagged, known: !!info });
    });

    await step("history: a change is listed and Undo puts it back", async () => {
      const before = XR.qtyOf(a.items.get(coins.id));
      await a.items.get(coins.id).update({ [`flags.${MOD}.qty`]: before + 5 });
      const list = X.historyOf(a.id);
      const i = list.findIndex(e => e.kind === "item" && e.id === coins.id);
      await X.undo(a, i);
      await until(() => XR.qtyOf(a.items.get(coins.id)) === before, 3000);
      ok("history: a change is listed and Undo puts it back", i >= 0 && XR.qtyOf(a.items.get(coins.id)) === before, { i, label: list[i]?.label, qty: XR.qtyOf(a.items.get(coins.id)) });
    });

    await step("the Storyteller's notes save to a Storyteller-only journal", async () => {
      await X.saveStNotes(a, "Gate note");
      const j = game.journal.find(x => x.getFlag(MOD, "stNotes"));
      const p = j?.pages.find(pg => pg.getFlag(MOD, "actor") === a.id);
      ok("the Storyteller's notes save to a Storyteller-only journal", !!p && X.stNotesOf(a) === "Gate note" && (j.ownership?.default ?? 0) === 0, { page: !!p, text: X.stNotesOf(a), ownership: j?.ownership });
      if ( p ) await p.delete();
    });

    await step("give: the purse and its coins move together", async () => {
      await X.doGive({ from: a.id, item: purse.id, to: b.uuid });
      await sleep(800);
      const p2 = b.items.find(i => i.name === "Gate purse"), c2 = b.items.find(i => i.name === "Gate coins");
      ok("give: the purse and its coins move together", !!p2 && !!c2 && c2.flags[MOD].in === p2.id && !a.items.get(purse.id) && !a.items.get(coins.id), { gave: !!p2, inside: c2?.flags?.[MOD]?.in === p2?.id });
    });

    await step("leave: a thing left on the map becomes an open box at the token", async () => {
      scene = await Scene.create({ name: "Gate: sheet extras", width: 1000, height: 800, grid: { size: 100 }, flags: TAG });
      await scene.createEmbeddedDocuments("Token", [{ actorId: a.id, x: 400, y: 300, name: a.name }]);
      await X.doLeave({ from: a.id, item: sword.id, scene: scene.id, x: 450, y: 350 });
      await sleep(800);
      const tile = scene.tiles.find(t => t.flags?.["wodx-interactables"]?.container);
      const refs = String(tile?.flags?.["wodx-interactables"]?.items ?? "").split("\n").filter(Boolean);
      const left = refs.length ? await fromUuid(refs[0]) : null;
      ok("leave: a thing left on the map becomes an open box at the token", !!tile && tile.flags["wodx-interactables"].ds === "open" && left?.name === "Gate sword" && !a.items.get(sword.id),
        { tile: !!tile, refs: refs.length, left: left?.name });
      if ( left ) await left.delete();
    });
  } finally {
    // Put everything back
    try { for ( const act of [a, b].filter(Boolean) ) { const ids = [...tagged(act), ...act.items.filter(i => ["Gate purse", "Gate coins", "Gate sword"].includes(i.name))].map(i => i.id); if ( ids.length ) await act.deleteEmbeddedDocuments("Item", [...new Set(ids)]); } } catch (e) { R.errors.push(`items: ${e.message}`); }
    try { if ( scene ) await scene.delete(); } catch (e) { R.errors.push(`scene: ${e.message}`); }
    try { if ( !hadNotes ) await game.journal.find(j => j.getFlag(MOD, "stNotes"))?.delete(); } catch (e) { R.errors.push(`notes: ${e.message}`); }
    try { const fo = game.folders.find(f => f.type === "Item" && f.getFlag(MOD, "left")); if ( fo && !hadFolder && !fo.contents.length ) await fo.delete(); } catch (e) { R.errors.push(`folder: ${e.message}`); }
    try { await a?.sheet?.close(); } catch (e) { /* closed already */ }
  }
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheetextras-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
