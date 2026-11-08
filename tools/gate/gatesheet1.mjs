/**
 * Sheets gate 1 (WoDX Sheets 0.1, the Dark Ages: Fae sheet), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheet1.mjs?${Date.now()}`)).run()
 * Opens the 6g test changeling's sheet, checks the book's sections, clicks a Dominion dot, a Mists dot and box, and a
 * missing Ability's dot, then puts the traits back. Leaves the sheet open for a look. Deletes only the test Ability
 * it adds. Result: Data/wodx-gate/gatesheet1-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ACT = "wodx-actions";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };

export async function run() {
  let a, sheet, el, keep;
  await step("the module, and the sheet class for a Dark Ages changeling", async () => {
    a = game.actors.find(x => x.name === "Wren (6g, changeling of Spring)");
    keep = foundry.utils.deepClone(a.getFlag(ACT, "daFae"));
    sheet = a.sheet;
    ok("the module, and the sheet class for a Dark Ages changeling", game.modules.get("wodx-sheets")?.active && sheet?.constructor?.name === "WodxChangelingSheet" && sheet.isDA,
      { active: game.modules.get("wodx-sheets")?.active, cls: sheet?.constructor?.name });
    await sheet.render(true); await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(".wodx-fae-da"));
    el = sheet.element[0];
  });
  await step("the book's sections in order, the Dark Ages: Fae Abilities, no Arts or Realms", async () => {
    const t = el.textContent.replace(/\s+/g, " ");
    const order = ["Court", "Origin", "Agenda", "Abilities", "Dominions", "Backgrounds", "Cantrips", "Other Traits", "Mists & Weaving", "Health"];
    const pos = order.map(w => t.indexOf(w));
    ok("the book's sections in order, the Dark Ages: Fae Abilities, no Arts or Realms", pos.every((p, k) => p >= 0 && (k === 0 || p > pos[k - 1])) && /Legerdemain/.test(t) && /Hearth Wisdom/.test(t) && /Seneschal/.test(t) && !/Computer/.test(t) && !el.querySelector(".tab.core [data-tab='realms']"),
      { pos });
  });
  await step("a Dominion dot sets the rating", async () => {
    el.querySelector(".wodx-dots[data-flag='dominions.dusk'] .wodx-dot[data-i='3']").click();
    const done = await until(() => a.getFlag(ACT, "daFae")?.dominions?.dusk === 3);
    ok("a Dominion dot sets the rating", done, { dusk: a.getFlag(ACT, "daFae")?.dominions?.dusk });
  });
  await step("Mists: a dot sets the rating, a box the points (never above the rating)", async () => {
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-flag='mists'] .wodx-dots .wodx-dot[data-i='5']").click();
    await until(() => a.getFlag(ACT, "daFae")?.mists?.perm === 5);
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-flag='mists'] .wodx-boxes .wodx-box[data-i='4']").click();
    const done = await until(() => a.getFlag(ACT, "daFae")?.mists?.temp === 4);
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-flag='mists'] .wodx-boxes .wodx-box[data-i='9']").click();
    await sleep(800);
    const m = a.getFlag(ACT, "daFae")?.mists;
    ok("Mists: a dot sets the rating, a box the points (never above the rating)", done && m.perm === 5 && m.temp === 5, { mists: m, imbalanceShown: /imbalance/.test(sheet.element[0].textContent) });
  });
  await step("a missing Ability: the first dot adds Archery as a skill", async () => {
    el = sheet.element[0];
    const had = a.items.find(i => i.name === "Archery");
    if (!had) el.querySelector(".wodx-dots[data-add-ability='Archery'] .wodx-dot[data-i='2']").click();
    const done = await until(() => a.items.find(i => i.name === "Archery")?.system?.value === (had ? had.system.value : 2));
    const it = a.items.find(i => i.name === "Archery");
    await until(() => !!sheet.element[0].querySelector(`.resource-value[data-key='${it?.id}']`));
    ok("a missing Ability: the first dot adds Archery as a skill", done && it?.system?.type === "wod.types.skillsecondability" && !!sheet.element[0].querySelector(`.resource-value[data-key='${it.id}']`), { item: it?.system?.type });
    if (it && !had) await it.delete();
  });
  await step("the system's own tabs are still there (combat, gear, notes)", async () => {
    el = sheet.element[0];
    ok("the system's own tabs are still there (combat, gear, notes)", ["combat", "gear", "note", "dreaming"].every(t => el.querySelector(`.tab[data-tab='${t}']`)), {});
  });
  await step("a modern changeling keeps the system's Changeling 20th layout", async () => {
    const pk = game.actors.find(x => x.name === "Jamilah (6h, pooka wilder)");
    ok("a modern changeling keeps the system's Changeling 20th layout", pk && !pk.sheet.isDA && /changeling-sheet\.html$/.test(pk.sheet.template), { template: pk?.sheet?.template });
  });
  await a.setFlag(ACT, "daFae", keep);
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet1-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
