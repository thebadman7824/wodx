/**
 * Sheets gate 2 (WoDX Sheets 0.2: every Dark Ages sheet), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheet2.mjs?${Date.now()}`)).run()
 * Makes (or reuses) one test actor per line in the folder "WoDX sheets test pack", opens each sheet, checks the book's
 * sections and that the system's own tabs are still there, clicks one dot and puts it back. The fae sheet is checked on
 * the 6g changeling. Closes each sheet after; deletes nothing. Result: Data/wodx-gate/gatesheet2-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ACT = "wodx-actions";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };

async function pack() {
  let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX sheets test pack");
  if (!folder) folder = await Folder.create({ name: "WoDX sheets test pack", type: "Actor" });
  const mk = async (name, type) => game.actors.find(x => x.folder?.id === folder.id && x.name === name) ?? Actor.create({ name, type, folder: folder.id });
  const out = {
    mage: await mk("Sheet test: a Hermetic of Rothenstein", "Mage"), inq: await mk("Sheet test: an inquisitor of the Oculi Dei", "Hunter"),
    garou: await mk("Sheet test: a Get of Fenris", "Werewolf"), kindred: await mk("Sheet test: a Tzimisce of the Carpathians", "Vampire"),
    ghoul: await mk("Sheet test: the reeve's ghoul", "Mortal")
  };
  await out.mage.setFlag(ACT, "daMage", { fellowship: "hermes", foundation: 2, pillars: { anima: 1, corona: 0, primus: 2, vires: 1 } });
  await out.inq.setFlag(ACT, "inquisitor", { order: "oculi", faith: 1, wisdom: 1, zeal: 0, piety: 6 });
  await game.wodxActions.setKind(out.ghoul, "ghoul");
  return out;
}

async function check(label, actor, { words, cls, dot = null, read = null }) {
  await step(label, async () => {
    const sheet = actor.sheet;
    sheet.locked = false; // the system's sheets open locked; permanent dots move only when unlocked
    await sheet.render(true);
    await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(".wodx-book"));
    const el = sheet.element[0];
    const core = el.querySelector(".tab.core");
    const t = core?.textContent.replace(/\s+/g, " ") ?? "";
    const pos = words.map(w => t.indexOf(w));
    const ordered = pos.every((p, k) => p >= 0 && (k === 0 || p > pos[k - 1]));
    const tabs = ["combat", "gear", "note"].every(x => el.querySelector(`.tab[data-tab='${x}']`));
    let clicked = null;
    if (dot) {
      const before = foundry.utils.getProperty(actor, read);
      const i = Number(before) === 3 ? 2 : 3;
      el.querySelector(`.wodx-dots[data-set='${dot}'] .wodx-dot[data-i='${i}']`)?.click();
      const changed = await until(() => Number(foundry.utils.getProperty(actor, read)) === i);
      clicked = changed;
      await actor.update({ [read]: before ?? 0 });
    }
    ok(label, sheet.constructor.name === cls && ordered && tabs && clicked !== false, { cls: sheet.constructor.name, pos, tabs, clicked, id: sheet.wodxId });
    await sheet.close();
  });
}

export async function run() {
  const t = await pack();
  const wren = game.actors.find(x => x.name === "Wren (6g, changeling of Spring)");
  if (wren) await check("Dark Ages: Fae: Court, Origin, Abilities, Dominions, Mists and Weaving; Oaths on the Dreaming tab", wren,
    { cls: "WodxChangelingSheet", words: ["Court", "Origin", "Agenda", "Abilities", "Dominions", "Backgrounds", "Cantrips", "Other Traits", "Mists", "Weaving"],
      dot: "flag:wodx-actions.daFae.dominions.dawn", read: "flags.wodx-actions.daFae.dominions.dawn" });
  await check("Dark Ages: Mage: Fellowship, Herbalism, Foundation with its Aura, the Hermetic Pillars, Quintessence, Backlash", t.mage,
    { cls: "WodxMageSheet", words: ["Fellowship", "Cabal", "Mentor", "Herbalism", "Theology", "Backgrounds", "Foundation", "Aura", "Pillars", "Vires", "Backlash"],
      dot: "flag:wodx-actions.daMage.pillars.corona", read: "flags.wodx-actions.daMage.pillars.corona" });
  await check("Dark Ages: Inquisitor: Order, Chapter, Virtues and Superior Virtues, Piety, Callous", t.inq,
    { cls: "WodxHunterSheet", words: ["Impulse", "Order", "Chapter", "Seneschal", "Theology", "Virtues", "Superior Virtues", "Zeal", "Holy Art", "Piety", "Callous"],
      dot: "flag:wodx-actions.inquisitor.wisdom", read: "flags.wodx-actions.inquisitor.wisdom" });
  await check("Dark Ages: Werewolf: Breed, Pack Totem, Primal Urge, Rituals, Gifts, Rage and Gnosis", t.garou,
    { cls: "WodxWerewolfSheet", words: ["Breed", "Auspice", "Tribe", "Pack Totem", "Primal Urge", "Rituals", "Backgrounds", "Gifts", "Blessings and Curses"] });
  await check("V20 Dark Ages: Clan, Generation, Sire, Disciplines, Virtues, Road, Blood Pool, Weakness, then the second page", t.kindred,
    { cls: "WodxVampireSheet", words: ["Clan", "Generation", "Sire", "Legerdemain", "Seneschal", "Disciplines", "Backgrounds", "Virtues", "Weakness", "Merits and Flaws", "Rituals", "Paths", "Derangements"] });
  await check("a Dark Ages ghoul: the Kindred sheet with the domitor", t.ghoul,
    { cls: "WodxMortalSheet", words: ["Domitor", "Disciplines", "Virtues", "Merits and Flaws"] });
  await step("a plain mortal keeps the system's own layout", async () => {
    const m = game.actors.find(a => a.type === "Mortal" && game.wodxActions.getKind(a) === "mortal");
    ok("a plain mortal keeps the system's own layout", !m || !m.sheet.wodxId, { name: m?.name, id: m?.sheet?.wodxId ?? null });
  });
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet2-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
