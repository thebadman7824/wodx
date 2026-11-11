/**
 * Anachronism check gate (WoDX Sheets 0.8.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanachronism.mjs?${Date.now()}`)).run()
 * Makes one actor with three things dated by WoDX Library flags, reads them across a jump, posts the card, keeps one,
 * runs the clock check once with a stored year 200 years back, then puts the stored year back and deletes what it made.
 * The clock itself is not moved.
 *   1. the api and the world setting are there, and the check is on in this world
 *   2. 1500 to 1900: the longsword and the flintlock are antiques; the bread says nothing
 *   3. the card goes to the Storyteller alone, with a Keep button for each
 *   4. Keep marks the item and the next read leaves it out
 *   5. the clock check reads the jump from the stored year and stores the year now
 *   6. every other WoDX module still answers
 * Result: Data/wodx-gate/gateanachronism-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const MOD = "wodx-sheets";
  const api = () => game.modules.get(MOD)?.api?.anachronism;
  const stored = foundry.utils.deepClone(game.settings.get(MOD, "anachronismAt") ?? {});
  let actor, msgs = [];
  const lib = (firstYear, lastYear) => ({"wodx-library": {firstYear, lastYear}});
  try {
    actor = await Actor.create({name: "WoDX gate: Anachronism", type: "Mortal"});
    await actor.createEmbeddedDocuments("Item", [
      {name: "WoDX gate longsword", type: "Item", flags: lib(1100, 1600)},
      {name: "WoDX gate flintlock", type: "Item", flags: lib(1600, 1850)},
      {name: "WoDX gate bread", type: "Item"}]);
    const before = {era: "renaissance", year: 1500}, after = {era: "victorian", year: 1900};

    await step("api and setting", async () => {
      const mode = game.settings.get(MOD, "anachronism");
      ok("api and setting", typeof api()?.scan === "function" && ["auto", "on"].includes(mode), {mode});
    });
    await step("the jump", async () => {
      const found = await api().scan(before, after, [actor]);
      const got = (found[0]?.items ?? []).map(i => `${i.name}:${i.status}`).sort();
      ok("the jump", got.join() === "WoDX gate flintlock:late,WoDX gate longsword:late", {got});
    });
    await step("the card", async () => {
      const m = await api().report(before, after, [actor]);
      if ( m ) msgs.push(m);
      const gms = game.users.filter(u => u.isGM).map(u => u.id).sort();
      const n = (m?.content.match(/data-wodx-keep=/g) ?? []).length;
      ok("the card", !!m && [...(m.whisper ?? [])].sort().join() === gms.join() && n === 2, {buttons: n});
    });
    await step("keep", async () => {
      const sword = actor.items.find(i => i.name === "WoDX gate longsword");
      await api().keep(actor.id, sword.id);
      const found = await api().scan(before, after, [actor]);
      const names = (found[0]?.items ?? []).map(i => i.name);
      ok("keep", !!sword.flags?.[MOD]?.keepOutOfEra && !names.includes("WoDX gate longsword") && names.includes("WoDX gate flintlock"), {names});
    });
    await step("the clock check", async () => {
      const chron = game.modules.get("wodx-chronicle")?.api;
      const now = {era: chron?.eras?.activeEra?.()?.profile?.id ?? null, year: Number(chron?.eras?.currentYear?.()) || 0};
      await game.settings.set(MOD, "anachronismAt", {era: now.era, year: now.year - 200});
      const m = await api().check();
      if ( m ) msgs.push(m);
      const at = game.settings.get(MOD, "anachronismAt");
      ok("the clock check", at.year === now.year && at.era === now.era, {now, at, card: !!m});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      await game.settings.set(MOD, "anachronismAt", stored);
      for ( const m of msgs ) await m.delete();
      if ( actor ) await actor.delete();
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateanachronism-result.json");
}
