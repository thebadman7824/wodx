/**
 * Sheets gate 5 (WoDX Sheets 0.6: the second page), in Foundry (rothenstein-wodx only) as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesheet5.mjs?${Date.now()}`)).run()
 * Uses the Phase 6 test characters, as gate 4 does. Each gets four items for the run (a sword, a pistol, a coat of armor,
 * a lantern), which are deleted after, and the sheet flag wodx-sheets.sheet, which is put back. For each sheet it checks
 * the second page: Combat with the weapons and armor, Possessions, History and Description, and the line's own boxes
 * (Rituals and Paths, Rites and Fetishes, Rotes). Result: Data/wodx-gate/gatesheet5-result.json.
 */
const atLeastV = (a, b) => { const p = s => String(s ?? "0").split(".").map(n => parseInt(n, 10) || 0); const x = p(a), y = p(b); for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i]; return true; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-sheets";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };
const ITEMS = [
  { name: "Gate sword", type: "Melee Weapon", system: { difficulty: 6, damage: { attribute: "strength", bonus: 2, type: "lethal" } } },
  { name: "Gate pistol", type: "Ranged Weapon", system: { difficulty: 6, damage: { bonus: 4, type: "lethal" }, range: 20, rate: 3, clip: { value: 7, max: 7 } } },
  { name: "Gate coat", type: "Armor", system: { soak: { bashing: 1, lethal: 1, aggravated: 0 }, dexpenalty: 1 } },
  { name: "Gate lantern", type: "Item" }
];

async function check(label, a, id, words) {
  await step(label, async () => {
    if (!a) return ok(label, false, { error: "test character missing" });
    const had = a.getFlag(MOD, "sheet");
    const made = inOrder(await a.createEmbeddedDocuments("Item", ITEMS), ITEMS).map(i => i.id);
    try {
      await a.setFlag(MOD, "sheet", id);
      const e0 = R.errors.length;
      const sheet = a.sheet;
      await sheet.render(true);
      await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(`.wodx-book[data-sheet='${id}'] .wodx-page2`));
      const p2 = sheet.element?.[0]?.querySelector(".wodx-page2");
      const t = p2?.textContent.replace(/\s+/g, " ") ?? "";
      const all = ["Combat", "Gate sword (diff 6, Str+2 L)", "Gate pistol (diff 6, 4 L, range 20, rate 3, clip 7)", "Gate coat (soak 1/1/0, Dex -1)", "Possessions", "Gate lantern", "History and Description", ...words];
      const missing = all.filter(w => !t.includes(w));
      const opened = !!p2?.querySelector(`.wodx-open[data-itemid='${made[0]}']`);
      if (had) await a.setFlag(MOD, "sheet", had); else await a.unsetFlag(MOD, "sheet");
      await sleep(300);
      await sheet.close();
      const errs = R.errors.slice(e0);
      ok(label, !!p2 && !missing.length && opened && !errs.length, { actor: a.name, missing, opened, errs });
    } finally {
      await a.deleteEmbeddedDocuments("Item", made.filter(x => a.items.get(x)));
      if (!had && a.getFlag(MOD, "sheet")) await a.unsetFlag(MOD, "sheet");
    }
  });
}

export async function run() {
  if (game.world.id !== "rothenstein-wodx") { ok("world", false, { error: "Run this gate in rothenstein-wodx only" }); }
  else {
    const origErr = console.error;
    console.error = (...x) => { R.errors.push(x.map(v => v?.stack ? String(v.stack).split("\n").slice(0, 3).join(" | ") : String(v)).join(" ")); origErr.apply(console, x); };
    try {
      await step("versions", async () => ok("versions", atLeastV(game.modules.get(MOD)?.version, "0.6.0"), { sheets: game.modules.get(MOD)?.version }));
      const by = (name, type) => game.actors.find(x => x.name === name && x.type === type)
        ?? game.actors.find(x => x.type === type && x.folder?.name === "WoDX sheets test pack");
      const v = by("Ilse (6e, Kindred)", "Vampire"), w = by("Ulf (6e, Garou)", "Werewolf"), m = by("Eleanor (6m, a Hermetic adept)", "Mage");
      const g = game.actors.find(x => x.name === "Sheet test: the reeve's ghoul"), h = by("Brother Anselm (6e, hunter)", "Hunter");
      const c = by("Jamilah (6h, pooka wilder)", "Changeling"), d = by("Zaphriel (6i, a Devil)", "Demon"), u = by("Neferet (6k, a Kher-minu)", "Mummy");
      await check("V20 page two: Other Traits, Rituals, Paths, Derangements", v, "v20", ["Other Traits", "Rituals", "Paths", "Derangements"]);
      await check("Dark Ages Kindred page two", v, "kindredDA", ["Merits and Flaws", "Rituals", "Paths"]);
      await check("W20 page two: Rites, Fetishes and Talens", w, "w20", ["Other Traits", "Rites", "Fetishes and Talens"]);
      await check("Dark Ages Werewolf page two", w, "werewolfDA", ["Rites", "Fetishes and Talens"]);
      await check("M20 page two: Merits and Flaws, Rotes", m, "m20", ["Merits and Flaws", "Rotes", "Derangements"]);
      await check("Dark Ages Mage page two", m, "mageDA", ["Merits and Flaws", "Rotes"]);
      await check("V20 ghoul page two", g, "ghoul20", ["Other Traits", "Derangements"]);
      await check("Hunter: The Reckoning page two (Blessings and Curses, as the sheet names them)", h, "htr", ["Blessings and Curses", "Other Traits"]);
      await check("Dark Ages Inquisitor page two", h, "inqDA", ["Other Traits", "Derangements"]);
      await check("C20 page two", c, "c20", ["Merits and Flaws", "Other Traits"]);
      await check("Demon page two", d, "demon", ["Merits and Flaws", "Derangements"]);
      await check("Mummy page two", u, "mummy", ["Derangements"]);
    } finally { console.error = origErr; }
  }
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet5-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}

import {inOrder} from "./kit.mjs";
