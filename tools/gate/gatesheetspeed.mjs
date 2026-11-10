/**
 * Sheet speed gate (fork 7.3.2-wodx.7, WoDX Sheets 0.6.2), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheetspeed.mjs?${Date.now()}`)).run()
 * Times sheet redraws, counts the saves one Attribute change causes, checks the recompute still works out totals,
 * that no redraw prints the actor to the console, and that the Core tab shows the right layout with and without a
 * WoDX sheet. Puts every value back. Result: Data/wodx-gate/gatesheetspeed-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(50); } return false; };

async function timeRenders(sheet, n = 5) {
  const ms = [];
  for (let i = 0; i < n; i++) { const t = performance.now(); await sheet.render(true); await until(() => sheet.rendered); ms.push(Math.round(performance.now() - t)); }
  return { ms, avg: Math.round(ms.reduce((a, b) => a + b, 0) / ms.length) };
}

export async function run() {
  const wodx = game.actors.find(x => x.name === "Wren (6g, changeling of Spring)") ?? game.actors.find(x => x.sheet?.wodxId);
  const plain = game.actors.find(x => !["PC", "Group"].includes(x.type) && x.isOwner && x.sheet && !x.sheet.wodxId);
  R.actors = { wodx: wodx?.name, plain: plain?.name ?? null };

  await step("the fork and WoDX Sheets versions", async () => {
    ok("the fork and WoDX Sheets versions", game.system.version === "7.3.2-wodx.7" && game.modules.get("wodx-sheets")?.version === "0.6.2",
      { system: game.system.version, sheets: game.modules.get("wodx-sheets")?.version });
  });

  await step("redraws print nothing of the actor to the console", async () => {
    const orig = console.log; let objs = 0;
    console.log = (...args) => { if (args.some(x => x && typeof x === "object" && (x.documentName === "Actor" || x.system))) objs++; return orig.apply(console, args); };
    try { R.timeWodx = await timeRenders(wodx.sheet); if (plain) R.timePlain = await timeRenders(plain.sheet); }
    finally { console.log = orig; }
    ok("redraws print nothing of the actor to the console", objs === 0, { prints: objs, wodx: R.timeWodx, plain: R.timePlain ?? null });
  });

  await step("a WoDX sheet's Core tab is the book's sheet and nothing else", async () => {
    const core = wodx.sheet.element[0].querySelector(".tab.core");
    ok("a WoDX sheet's Core tab is the book's sheet and nothing else", !!core?.querySelector(".wodx-book") && core.children.length === 1,
      { book: !!core?.querySelector(".wodx-book"), children: core?.children.length });
  });

  await step("a sheet in the system's own layout still draws its Core tab", async () => {
    if (!plain) { ok("a sheet in the system's own layout still draws its Core tab", true, { skipped: "no actor shows the system layout in this era" }); return; }
    const core = plain.sheet.element[0].querySelector(".tab.core");
    ok("a sheet in the system's own layout still draws its Core tab", !core.querySelector(".wodx-book") && core.querySelectorAll(".resource-value, .attribute, [data-key]").length > 5,
      { marks: core.querySelectorAll(".resource-value, .attribute, [data-key]").length });
  });

  for (const a of [wodx, plain].filter(Boolean)) {
    const label = a === wodx ? "WoDX sheet" : "system sheet";
    await step(`${label}: one Attribute change makes two saves and the totals follow`, async () => {
      const before = a.system.attributes.strength.value, total0 = a.system.attributes.strength.total;
      let saves = 0; const id = Hooks.on("updateActor", doc => { if (doc.id === a.id) saves++; });
      const t = performance.now();
      try {
        const next = before >= 5 ? before - 1 : before + 1;
        await a.update({ "system.attributes.strength.value": next, "system.settings.isupdated": false });
        await until(() => a.system.settings.isupdated === true && a.system.attributes.strength.total !== total0, 4000);
        await sleep(1200);
        const ms = Math.round(performance.now() - t), total1 = a.system.attributes.strength.total;
        ok(`${label}: one Attribute change makes two saves and the totals follow`, saves <= 2 && total1 === total0 + (next - before) && a.system.settings.isupdated === true,
          { saves, ms, before, next, total0, total1 });
      } finally {
        Hooks.off("updateActor", id);
        await a.update({ "system.attributes.strength.value": before, "system.settings.isupdated": false });
        await until(() => a.system.attributes.strength.total === total0, 4000);
      }
    });
  }

  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheetspeed-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
