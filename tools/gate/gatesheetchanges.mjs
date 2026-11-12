/**
 * Features card and "changed since last session" gate (WoDX Sheets 0.13.0, Chronicle 0.43.0), in Foundry
 * (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheetchanges.mjs?${Date.now()}`)).run()
 * On a WoDX character sheet: a fresh starting point shows no strip; a Willpower change and a new item show with
 * their cause; Mark as read clears it; the features card lists a clan feature with when it fires, a stamp shows as
 * last fired, and setting it aside takes it out of force and back. Everything it changes is put back: flags,
 * a lent owner, line settings, test items. Result: Data/wodx-gate/gatesheetchanges-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-sheets", CH = "wodx-chronicle";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 5000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };
const wodx = x => x.sheet?.constructor?.name?.startsWith("Wodx");

export async function run() {
  const X = game.modules.get(MOD)?.api?.extras, SIG = game.modules.get(CH)?.api?.signatures;
  const a = game.actors.find(x => wodx(x) && x.type === "Vampire" && /toreador/i.test(String(x.system?.clan ?? ""))) ?? game.actors.find(x => wodx(x) && x.type === "Vampire") ?? game.actors.find(wodx);
  R.actor = a?.name;
  const before = a ? { snap: a.getFlag(MOD, "snap") ?? null, since: a.getFlag(MOD, "since") ?? null, off: a.flags?.[CH]?.sigOff ?? null, fired: foundry.utils.deepClone(a.flags?.[CH]?.sigFired ?? null),
    own: foundry.utils.deepClone(a.ownership), wp: a.system?.advantages?.willpower?.temporary } : {};
  const sigWas = (() => { try { return game.settings.get(CH, "sigVampire"); } catch (e) { return null; } })();
  const player = game.users.find(u => !u.isGM);
  let lent = false, el;
  const open = async () => { await a.sheet.render(true); await until(() => a.sheet.rendered && a.sheet.element?.[0]?.querySelector(".wodx-strip")); await sleep(300); el = a.sheet.element[0]; };

  try {
    await step("version and api", async () => ok("version and api", !foundry.utils.isNewerVersion("0.13.0", game.modules.get(MOD)?.version ?? "0") && !foundry.utils.isNewerVersion("0.43.0", game.modules.get(CH)?.version ?? "0")
      && !!X?.takeSnapshot && !!X?.changesOf && !!SIG?.summary && !!SIG?.setOff && !!a, { sheets: game.modules.get(MOD)?.version, chronicle: game.modules.get(CH)?.version, actor: a?.name }));

    await step("a character a player owns is tracked (an owner lent for the gate when none)", async () => {
      if ( !a.hasPlayerOwner && player ) { await a.update({ [`ownership.${player.id}`]: 3 }); lent = true; }
      ok("a character a player owns is tracked (an owner lent for the gate when none)", a.hasPlayerOwner, { lent, player: player?.name ?? null });
    });

    await step("a fresh starting point: no change strip", async () => {
      await X.takeSnapshot(a);
      await open();
      ok("a fresh starting point: no change strip", !!a.getFlag(MOD, "snap") && !el.querySelector(".wodx-changes"), { lines: X.changesOf(a).map(l => l.text) });
    });

    await step("Willpower and a new item show, with the Storyteller as cause", async () => {
      const wp = Number(a.system.advantages.willpower.temporary) || 0, to = wp > 0 ? wp - 1 : wp + 1;
      await a.update({ "system.advantages.willpower.temporary": to });
      await a.createEmbeddedDocuments("Item", [{ name: "Gate lantern", type: "Item", flags: { [MOD]: { gate: "sheetchanges" } } }]);
      await until(() => (JSON.parse(a.getFlag(MOD, "since") || "{}").wp ?? []).length > 0, 4000);
      await open();
      const txt = el.querySelector(".wodx-changes")?.textContent?.replace(/\s+/g, " ") ?? "";
      ok("Willpower and a new item show, with the Storyteller as cause", txt.includes(`Willpower: ${wp} to ${to}`) && txt.includes("Gained: Gate lantern") && /the Storyteller/.test(txt), { txt: txt.slice(0, 300) });
    });

    await step("Mark as read clears the strip", async () => {
      el.querySelector(".wodx-chg-read")?.click();
      await until(() => !X.changesOf(a).length, 4000);
      await open();
      ok("Mark as read clears the strip", !el.querySelector(".wodx-changes") && !X.changesOf(a).length, { left: X.changesOf(a).map(l => l.text) });
    });

    await step("the features card lists the clan feature with when it fires", async () => {
      if ( sigWas === false ) await game.settings.set(CH, "sigVampire", true);
      const rows = SIG.summary(a);
      await open();
      const card = el.querySelector(".wodx-features");
      ok("the features card lists the clan feature with when it fires", rows.length > 0 && !!card && !!card.querySelector(".wodx-feat-when") && !!card.querySelector(".wodx-feat-toggle"),
        { rows: rows.map(r => `${r.group}: ${r.title}`), card: !!card });
    });

    await step("a feature that fires shows when; setting it aside takes it out of force and back", async () => {
      const row = SIG.summary(a)[0];
      const engine = SIG.allRowsOf(a)[0]?.feature;
      await SIG.fired(a, engine);
      const fired = SIG.summary(a)[0]?.fired;
      await SIG.setOff(a, row.key, true);
      const offNow = SIG.summary(a)[0]?.off && !SIG.rowsOf(a).some(r => r.key === row.key);
      await open();
      const shown = !!el.querySelector(`.wodx-feat-row.off[data-feat="${row.key}"]`);
      await SIG.setOff(a, row.key, false);
      const back = SIG.rowsOf(a).some(r => r.key === row.key);
      ok("a feature that fires shows when; setting it aside takes it out of force and back", fired && offNow && shown && back, { key: row?.key, engine, fired, offNow, shown, back });
    });
  } finally {
    try { const ids = a.items.filter(i => i.flags?.[MOD]?.gate === "sheetchanges").map(i => i.id); if ( ids.length ) await a.deleteEmbeddedDocuments("Item", ids, { wodxQuiet: true }); } catch (e) { R.errors.push(`items: ${e.message}`); }
    try {
      const put = { "system.advantages.willpower.temporary": before.wp };
      put[before.snap === null ? `flags.${MOD}.-=snap` : `flags.${MOD}.snap`] = before.snap;
      put[before.since === null ? `flags.${MOD}.-=since` : `flags.${MOD}.since`] = before.since;
      put[before.off === null ? `flags.${CH}.-=sigOff` : `flags.${CH}.sigOff`] = before.off;
      put[before.fired === null ? `flags.${CH}.-=sigFired` : `flags.${CH}.sigFired`] = before.fired;
      await a.update(put, { wodxQuiet: true });
      if ( lent ) await a.update({ [`ownership.-=${player.id}`]: null }, { wodxQuiet: true });
    } catch (e) { R.errors.push(`flags: ${e.message}`); }
    try { if ( sigWas === false ) await game.settings.set(CH, "sigVampire", false); } catch (e) { R.errors.push(`setting: ${e.message}`); }
    try { await a?.sheet?.close(); } catch (e) { /* closed already */ }
  }
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheetchanges-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
