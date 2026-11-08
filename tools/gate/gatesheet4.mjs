/**
 * Sheets gate 4 (WoDX Sheets 0.4: the later eras), in Foundry (rothenstein-wodx) as a Gamemaster:
 *   await (await import(`/wodx-gate/gatesheet4.mjs?${Date.now()}`)).run()
 * Uses the Phase 6 test characters (and makes any that are missing in the folder "WoDX sheets test pack"). The world is in the
 * Dark Ages, so each character is given the later-era sheet for the run with the flag wodx-sheets.sheet, which is put back
 * after. A character the system has not yet given a sheet type asks for one the first time its sheet opens (the system's
 * own "Set sheet type" window): answer it with the general type. Opens each sheet, checks the printed sheet's sections in order, that the system's own tabs are still there and
 * nothing logged an error, clicks one dot and puts it back. Deletes nothing. Result: Data/wodx-gate/gatesheet4-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-sheets", ACT = "wodx-actions";
const R = { started: new Date().toISOString(), steps: [], errors: [] };
const ok = (name, pass, detail = {}) => R.steps.push({ name, pass: !!pass, ...detail });
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, { error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ") }); } }
const until = async (test, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await test()) return true; await sleep(100); } return false; };

async function actor(name, type, fallback, system = {}) {
  let a = game.actors.find(x => x.name === name && x.type === type);
  if (a) return a;
  let folder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX sheets test pack");
  if (!folder) folder = await Folder.create({ name: "WoDX sheets test pack", type: "Actor" });
  return game.actors.find(x => x.folder?.id === folder.id && x.name === fallback) ?? Actor.create({ name: fallback, type, folder: folder.id, system });
}

async function check(label, a, id, { words, cls, dot = null, read = null, bio = null }) {
  await step(label, async () => {
    const had = a.getFlag(MOD, "sheet");
    await a.setFlag(MOD, "sheet", id);
    const e0 = R.errors.length;
    const sheet = a.sheet;
    sheet.locked = false;
    await sheet.render(true);
    await until(() => sheet.rendered && sheet.element?.[0]?.querySelector(`.wodx-book[data-sheet='${id}']`));
    const el = sheet.element[0];
    const core = el.querySelector(".tab.core");
    const t = core?.textContent.replace(/\s+/g, " ") ?? "";
    const pos = words.map(w => t.indexOf(w));
    const ordered = pos.every((p, k) => p >= 0 && (k === 0 || p > pos[k - 1]));
    const tabs = ["combat", "gear", "note"].every(x => el.querySelector(`.tab[data-tab='${x}']`));
    const bioOk = bio ? (el.querySelector(".tab.bio .wodx-bio-extra")?.textContent ?? "").includes(bio) : true;
    let clicked = null;
    if (dot) {
      const before = foundry.utils.getProperty(a, read);
      const i = Number(before) === 3 ? 2 : 3;
      el.querySelector(`.wodx-dots[data-set='${dot}'] .wodx-dot[data-i='${i}']`)?.click();
      clicked = await until(() => Number(foundry.utils.getProperty(a, read)) === i);
      await a.update({ [read]: before ?? 0 });
    }
    // Put the flag back first: changing it re-renders an open sheet, so the sheet is closed after
    if (had) await a.setFlag(MOD, "sheet", had); else await a.unsetFlag(MOD, "sheet");
    await sleep(300);
    await sheet.close();
    const errs = R.errors.slice(e0);
    ok(label, sheet.constructor.name === cls && ordered && tabs && bioOk && clicked !== false && !errs.length,
      { actor: a.name, cls: sheet.constructor.name, missing: words.filter((w, k) => pos[k] < 0), pos, tabs, bioOk, clicked, errs });
  });
}

export async function run() {
  const origErr = console.error;
  console.error = (...x) => { R.errors.push(x.map(v => v?.stack ? String(v.stack).split("\n").slice(0, 3).join(" | ") : String(v)).join(" ")); origErr.apply(console, x); };
  try {
    await step("versions", async () => ok("versions", game.modules.get(MOD)?.api?.version === "0.4.0" && /^3\.1\d\./.test(game.wodxActions.version),
      { sheets: game.modules.get(MOD)?.api?.version, actions: game.wodxActions.version }));
    const v = await actor("Ilse (6e, Kindred)", "Vampire", "Sheet test: a Brujah of the nights now");
    await check("V20: Clan, Generation, Sire, the V20 Abilities, Disciplines, Backgrounds, Virtues, Humanity, Blood Pool, Weakness", v, "v20",
      { cls: "WodxVampireSheet", words: ["Clan", "Generation", "Sire", "Streetwise", "Larceny", "Technology", "Disciplines", "Backgrounds", "Virtues", "Merits and Flaws", "Weakness"] });
    const g = await actor("Sheet test: the reeve's ghoul", "Mortal", "Sheet test: the reeve's ghoul");
    await check("a V20 ghoul: the Kindred sheet with the domitor", g, "ghoul20", { cls: "WodxMortalSheet", words: ["Domitor", "Firearms", "Disciplines", "Virtues", "Merits and Flaws"] });
    const w = await actor("Ulf (6e, Garou)", "Werewolf", "Sheet test: a Glass Walker");
    await check("W20: Breed, Pack Totem, Primal Urge, Rituals, Backgrounds, Gifts, Renown and Rank", w, "w20",
      { cls: "WodxWerewolfSheet", words: ["Breed", "Pack Totem", "Primal Urge", "Rituals", "Technology", "Backgrounds", "Gifts", "Rank"], dot: "system.renown.rank", read: "system.renown.rank" });
    const m = await actor("Eleanor (6m, a Hermetic adept)", "Mage", "Sheet test: a Virtual Adept");
    await check("M20: Essence, Affiliation, Sect, Art, Esoterica, the nine Spheres, Backgrounds, Other Traits, Arete, the Quintessence wheel", m, "m20",
      { cls: "WodxMageSheet", words: ["Essence", "Affiliation", "Sect", "Martial Arts", "Esoterica", "Spheres", "Correspondence", "Time", "Backgrounds", "Other Traits"],
        dot: "system.spheres.time.value", read: "system.spheres.time.value" });
    const c = await actor("Jamilah (6h, pooka wilder)", "Changeling", "Sheet test: a pooka");
    await check("C20: Court, Legacies, House, Seeming, Kith, Motley, Kenning, Gremayre, Arts, Realms, Birthright, Antithesis, the Tempers", c, "c20",
      { cls: "WodxChangelingSheet", words: ["Court", "Legacies", "House", "Seeming", "Kith", "Motley", "Kenning", "Gremayre", "Backgrounds", "Arts", "Realms", "Actor", "Time", "Birthright/Frailty", "Antithesis", "Ravaging/Musing Threshold"],
        bio: "Motley" });
    const r = await actor("Ada (6e, wraith)", "Wraith", "Sheet test: a Restless dead");
    await check("Wraith 20: Shadow, Life, Death, Regret, Persuasion, Meditation, Passions, Arcanoi, Corpus, Fetters, then the Shadow's page", r, "wr20",
      { cls: "WodxWraithSheet", words: ["Shadow", "Life", "Death", "Regret", "Persuasion", "Meditation", "Bureaucracy", "Backgrounds", "Passions", "Arcanoi", "Fetters", "The Shadow", "Psyche", "Thorns", "Dark Passions"] });
    const h = await actor("Brother Anselm (6e, hunter)", "Hunter", "Sheet test: a Defender");
    await check("Hunter: The Reckoning: Primary Virtue, Creed, Starting Conviction, Intuition, Demolitions, Research, Edges, the three Virtues, Derangements", h, "htr",
      { cls: "WodxHunterSheet", words: ["Primary Virtue", "Creed", "Starting Conviction", "Intuition", "Demolitions", "Research", "Backgrounds", "Edges", "Derangements"] });
    const d = await actor("Zaphriel (6i, a Devil)", "Demon", "Sheet test: a Devil");
    await check("Demon: House, Faction, Visage, Religion, Lore (the sheet's lores), Virtues, the apocalyptic form, Faith and Torment", d, "demon",
      { cls: "WodxDemonSheet", words: ["House", "Faction", "Visage", "Religion", "Backgrounds", "Lore", "Lore of Flame", "Apocalyptic Form"] });
    const u = await actor("Neferet (6k, a Kher-minu)", "Mummy", "Sheet test: one of the Reborn");
    await check("Mummy: Amenti, Hamartia, Inheritance, Cosmology, the six Hekau, Merits and Flaws, Other Traits", u, "mummy",
      { cls: "WodxMummySheet", words: ["Amenti", "Hamartia", "Inheritance", "Cosmology", "Backgrounds", "Hekau", "Amulets", "Alchemy", "Nomenclature", "Merits and Flaws", "Other Traits"] });
    const k = await actor("Tanaka Hiroko (6j, a Devil-Tiger)", "Vampire", "Sheet test: a Kuei-jin", { settings: { variant: "kindredeast" } });
    await check("Kindred of the East: P'o Nature, Balance, Direction, Wu, Martial Arts, Rituals, Disciplines, Rites, the Dharma, Imbalance", k, "kote",
      { cls: "WodxVampireSheet", words: ["P'o Nature", "Balance", "Direction", "Wu", "Martial Arts", "Rituals", "Disciplines", "Backgrounds", "Rites", "The Dharma", "Imbalance"] });
    const o = await actor("Craig (6l, a Poltergeist skimmer)", "Mortal", "Sheet test: a skimmer", { settings: { variant: "orpheus" } });
    await check("Orpheus: Shade, Lament, Role, Intrigue, Horrors, Stains, the default Abilities, Vitality and Spite", o, "orpheus",
      { cls: "WodxMortalSheet", words: ["Shade", "Lament", "Role", "Intrigue", "Backgrounds", "Horrors", "Stains", "Default Abilities", "Dead-Eyes"] });
    await step("without the flag, the Dark Ages characters keep their era's sheets; the fallen, the Reborn and the Kuei-jin keep their own", async () => {
      const ids = { ilse: v.sheet.wodxId, ulf: w.sheet.wodxId, zaph: d.sheet.wodxId, nef: u.sheet.wodxId, tanaka: k.sheet.wodxId, craig: o.sheet.wodxId };
      ok("without the flag, the Dark Ages characters keep their era's sheets; the fallen, the Reborn and the Kuei-jin keep their own",
        ids.ilse === "kindredDA" && ids.ulf === "werewolfDA" && ids.zaph === "demon" && ids.nef === "mummy" && ids.tanaka === "kote" && ids.craig === "orpheus", ids);
    });
  } finally { console.error = origErr; }
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatesheet4-result.json", { type: "application/json" });
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, { notify: false });
  return R.summary;
}
