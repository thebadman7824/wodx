/**
 * Sheets gate 1 (the Dark Ages: Fae sheet; markup as of WoDX Sheets 0.3 and later), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheet1.mjs?${Date.now()}`)).run()
 * Opens the 6g test changeling's sheet, checks the book's sections, clicks a Dominion dot, a Mists dot and box, and a
 * missing Ability's dot, then puts the traits back. Opens the sheet unlocked (permanent dots move only then) and
 * puts the lock back after. Leaves the sheet open for a look. Deletes only the test Ability it adds.
 * The last step (B6175) makes a mortal of its own ("Gate sheet1 roller"), puts a -1 die Dexterity effect on it through
 * WoDX Chronicle, clicks Dexterity on its sheet and Roll in the system's window, and reads the dice the card rolled;
 * the mortal is deleted after. Result: Data/wodx-gate/gatesheet1-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ACT = "wodx-actions";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };

export async function run() {
  let a, sheet, el, keep, wasLocked;
  await step("the module, and the sheet class for a Dark Ages changeling", async () => {
    a = game.actors.find(x => x.name === "Wren (6g, changeling of Spring)");
    keep = foundry.utils.deepClone(a.getFlag(ACT, "daFae"));
    sheet = a.sheet;
    ok("the module, and the sheet class for a Dark Ages changeling", game.modules.get("wodx-sheets")?.active && sheet?.constructor?.name === "WodxChangelingSheet" && sheet.wodxId === "faeDA",
      { active: game.modules.get("wodx-sheets")?.active, cls: sheet?.constructor?.name, sheet: sheet?.wodxId });
    wasLocked = sheet.locked; sheet.locked = false;
    await sheet.render(true); await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(".wodx-book[data-sheet='faeDA']"));
    el = sheet.element[0];
  });
  await step("the book's sections in order, the Dark Ages: Fae Abilities, no Arts or Realms", async () => {
    const t = el.querySelector(".tab.core").textContent.replace(/\s+/g, " ");
    // Mists and Weaving are two tracks side by side, as on the printed sheet
    const order = ["Court", "Origin", "Agenda", "Attributes", "Abilities", "Advantages", "Dominions", "Backgrounds", "Cantrips", "Willpower", "Other Traits", "Mists", "Weaving", "Health", "Experience"];
    const pos = []; let from = 0;
    for (const w of order) { const p = t.indexOf(w, from); pos.push(p); if (p >= 0) from = p + w.length; }
    ok("the book's sections in order, the Dark Ages: Fae Abilities, no Arts or Realms", pos.every(p => p >= 0) && /Legerdemain/.test(t) && /Hearth Wisdom/.test(t) && /Seneschal/.test(t) && !/Computer/.test(t) && !el.querySelector(".tab.core [data-tab='realms']"),
      { pos, computer: /Computer/.test(t), legerdemain: /Legerdemain/.test(t) });
  });
  await step("a Dominion dot sets the rating", async () => {
    el.querySelector(".wodx-dots[data-set='flag:wodx-actions.daFae.dominions.dusk'] .wodx-dot[data-i='3']").click();
    const done = await until(() => a.getFlag(ACT, "daFae")?.dominions?.dusk === 3);
    ok("a Dominion dot sets the rating", done, { dusk: a.getFlag(ACT, "daFae")?.dominions?.dusk });
  });
  await step("Mists: a dot sets the rating, a box the points (never above the rating)", async () => {
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-perm='flag:wodx-actions.daFae.mists.perm'] .wodx-dots .wodx-dot[data-i='5']").click();
    await until(() => a.getFlag(ACT, "daFae")?.mists?.perm === 5);
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-perm='flag:wodx-actions.daFae.mists.perm'] .wodx-boxes .wodx-box[data-i='4']").click();
    const done = await until(() => a.getFlag(ACT, "daFae")?.mists?.temp === 4);
    el = sheet.element[0];
    el.querySelector(".wodx-track[data-perm='flag:wodx-actions.daFae.mists.perm'] .wodx-boxes .wodx-box[data-i='9']").click();
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
  await step("a modern changeling gets the Changeling 20th sheet, not the Dark Ages one", async () => {
    const pk = game.actors.find(x => x.name === "Jamilah (6h, pooka wilder)");
    ok("a modern changeling gets the Changeling 20th sheet, not the Dark Ages one", pk && pk.sheet.wodxId === "c20", { sheet: pk?.sheet?.wodxId });
  });
  await step("a click on Dexterity rolls with WoDX's parts on it", async () => {
    const T = game.modules.get("wodx-chronicle")?.api?.traits;
    const roller = await Actor.create({ name: "Gate sheet1 roller", type: "Mortal" });
    try {
      await roller.update({ "system.attributes.dexterity.value": 4 });
      await T.addBite(roller, { key: "gate-sheet1", name: "Gate shakes", tags: ["dexterity"], dice: -1, duration: { kind: "time", seconds: 3600 }, source: "gatesheet1" });
      const rs = roller.sheet; await rs.render(true);
      await until(() => rs.rendered && rs.element?.[0]?.querySelector("label.vrollable[data-attribute='true'][data-key='dexterity']"));
      const t0 = Date.now();
      rs.element[0].querySelector("label.vrollable[data-attribute='true'][data-key='dexterity']").click();
      let dlg = null;
      await until(() => (dlg = Object.values(ui.windows).find(w => w.constructor?.name === "DialogGeneralRoll" && w.actor?.id === roller.id && w.rendered)));
      (dlg?.element?.[0] ?? dlg?.element)?.querySelector(".actionbutton")?.click();
      let m = null;
      await until(() => (m = game.messages.contents.filter(x => (x.timestamp ?? 0) >= t0 && x.speaker?.actor === roller.id).at(-1)), 8000);
      const mods = m?.flags?.["wodx-sheets"]?.rollMods ?? null;
      const W = CONFIG.worldofdarkness, explodes = W?.useexplodingDice && ["always", "nospeciality"].includes(W?.explodingDice);
      const faces = (m?.rolls ?? []).map(r => Number(r.total));
      const rolled = faces.length - (explodes ? faces.filter(f => f === 10).length : 0);
      const dex = Number(roller.system.attributes.dexterity.total ?? roller.system.attributes.dexterity.value);
      ok("a click on Dexterity rolls with WoDX's parts on it", !!m && mods?.dice === -1 && rolled === dex - 1 && /WoDX:/.test(m.content), { dex, rolled, mods, card: !!m });
      await rs.close(); await dlg?.close?.();
    } finally { await roller.delete(); }
  });
  await a.setFlag(ACT, "daFae", keep);
  if (wasLocked !== undefined) { sheet.locked = wasLocked; if (sheet.rendered) await sheet.render(false); }
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet1-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
