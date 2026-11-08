/**
 * Era advancement gate (WoDX Creation 0.6.0, B83), in Foundry as a Gamemaster, in wodx-template only:
 *   await (await import(`/wodx-gate/gateera.mjs?${Date.now()}`)).run()
 * Makes a test vampire and a test mortal in "WoDX era test pack", passes the years from now to 1840 for those two
 * alone, checks what changed, then puts the clock and the era back and removes what it made. The world's other
 * characters are not in the plan. Result: Data/wodx-gate/gateera-result.json.
 */
const C = "wodx-creation", CH = "wodx-chronicle";
const R = {started: new Date().toISOString(), steps: [], errors: []};
const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
async function step(name, fn) { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } }
const api = () => game.modules.get(C).api;
const chron = () => game.modules.get(CH).api;

export async function run() {
  if ( game.world.id !== "wodx-template" ) {
    ui.notifications.error("The era advancement gate only runs in wodx-template: it moves the clock to 1840.");
    return {refused: game.world.id};
  }
  const origErr = console.error;
  console.error = (...a) => { R.errors.push(a.map(x => x?.stack ? String(x.stack).split("\n").slice(0, 4).join(" | ") : String(x)).join(" ")); origErr.apply(console, a); };
  const startTime = game.time.worldTime;
  const startEra = game.settings.get(CH, "activeEra");
  const made = [];
  let folder, plan, vamp, mortal;
  try {
    await step("1. House rules: the five Passing the years switches, with B83's defaults", async () => {
      const want = {yearsThickBlood: false, yearsMortalDecline: true, yearsMoralityDrift: false, yearsExperience: true, yearsConvertAbilities: true};
      const seen = Object.fromEntries(Object.keys(want).map(k => [k, game.settings.get(CH, `rule.${k}`)]));
      ok("1. House rules: the five Passing the years switches, with B83's defaults", JSON.stringify(seen) === JSON.stringify(want), {seen});
    });

    await step("2. Test characters made, in the Dark Ages", async () => {
      if ( startEra !== "dark-ages" ) await game.settings.set(CH, "activeEra", "dark-ages");
      folder = await Folder.create({name: "WoDX era test pack", type: "Actor"});
      const year = api().time.yearOf(game.time.worldTime);
      vamp = await Actor.create({name: "Wenzel (era test)", type: "Vampire", folder: folder.id,
        system: {generation: 10, advantages: {path: {permanent: 6, custom: "Road of Kings"}}}});
      mortal = await Actor.create({name: "Ota (era test)", type: "Mortal", folder: folder.id});
      made.push(vamp.id, mortal.id);
      await new Promise(r => setTimeout(r, 1500));
      await api().lineage.setChronology(vamp, {embraced: api().time.addYears(game.time.worldTime, -50)});
      await api().lineage.setChronology(mortal, {bornYear: year - 30});
      const archery = vamp.items.find(i => i.type === "Trait" && /archery/i.test(i.name));
      if ( archery ) await archery.update({"system.value": 3});
      else await vamp.createEmbeddedDocuments("Item", [{name: game.i18n.localize("wod.abilities.archery"), type: "Trait", system: {type: "wod.types.skillsecondability", value: 3, max: 5}}]);
      ok("2. Test characters made, in the Dark Ages", !!vamp && !!mortal, {year});
    });

    await step("3. The plan offers the Ability, the Road with a pick, experience, and the mortal's death", async () => {
      const year = api().time.yearOf(game.time.worldTime);
      plan = api().time.planSkip({from: game.time.worldTime, to: api().time.addYears(game.time.worldTime, 1840 - year), actors: [vamp, mortal]});
      const vr = plan.rows.find(r => r.actorId === vamp.id), mr = plan.rows.find(r => r.actorId === mortal.id);
      const kinds = vr?.changes.map(c => c.kind) ?? [];
      const road = vr?.changes.find(c => c.kind === "adv.road");
      ok("3. The plan offers the Ability, the Road with a pick, experience, and the mortal's death",
        plan.toEra?.id === "victorian" && kinds.includes("adv.convert") && road?.choices?.map(o => o.value).join() === "innervoice,accord"
          && kinds.includes("adv.xp") && mr?.changes.some(c => c.kind === "death"),
        {toEra: plan.toEra?.id, kinds, mortal: mr?.changes.map(c => c.kind)});
    });

    await step("4. Passed with Honorable Accord picked: Firearms 3, Archery 0, the Path at the same rating, 10 experience", async () => {
      const road = plan.rows.find(r => r.actorId === vamp.id).changes.find(c => c.kind === "adv.road");
      await api().time.applyPlan(plan, {choices: {[vamp.id]: {[road.id]: "accord"}}, label: "Era advancement gate"});
      const v = game.actors.get(vamp.id);
      const archery = v.items.find(i => i.type === "Trait" && /archery/i.test(i.name));
      const seen = {firearms: v.system.abilities.firearms.value, archery: archery?.system.value, path: v.system.advantages.path.label,
        rating: v.system.advantages.path.permanent, xp: v.items.filter(i => i.type === "Experience").map(i => i.system.amount), year: api().time.yearOf(game.time.worldTime)};
      ok("4. Passed with Honorable Accord picked: Firearms 3, Archery 0, the Path at the same rating, 10 experience",
        seen.firearms === 3 && seen.archery === 0 && seen.path === "wod.advantages.path.accord" && seen.rating === 6 && seen.xp.includes(10) && seen.year === 1840, seen);
    });

    await step("5. Snapshots in WoDX · Before the years, left out of the next plan", async () => {
      const snaps = game.actors.filter(a => made.includes(a.getFlag(C, "snapshotOf")?.id));
      for ( const s of snaps ) made.push(s.id);
      const next = api().time.planSkip({from: game.time.worldTime, to: api().time.addYears(game.time.worldTime, 5)});
      const snapArch = snaps.find(s => s.getFlag(C, "snapshotOf").id === vamp.id)?.items.find(i => /archery/i.test(i.name))?.system.value;
      ok("5. Snapshots in WoDX · Before the years, left out of the next plan",
        snaps.length === 2 && snaps.every(s => s.folder?.name === "WoDX · Before the years") && snapArch === 3 && !next.rows.some(r => snaps.some(s => s.id === r.actorId)),
        {snaps: snaps.map(s => s.name), snapArch});
    });

    await step("6. The era history, the years awake, and the Time Skips page with the pick", async () => {
      const c = api().data.chronology(game.actors.get(vamp.id));
      const j = game.journal.find(x => x.getFlag(C, "kind") === "time-skips");
      const page = j?.pages.find(p => /to 1840/.test(p.name));
      ok("6. The era history, the years awake, and the Time Skips page with the pick",
        c.eras?.map(e => e.era).join() === "dark-ages,victorian" && c.awakeYears >= 50 && /Path of Honorable Accord/.test(page?.text?.content ?? ""),
        {eras: c.eras, awakeYears: c.awakeYears, page: page?.name});
      R.page = page?.id; R.journal = j?.id;
    });
  } finally {
    await step("7. Put back: the clock, the era and the test characters", async () => {
      const now = game.time.worldTime;
      if ( now !== startTime ) await (game.time.set ? game.time.set(startTime) : game.time.advance(startTime - now));
      await game.settings.set(CH, "activeEra", startEra);
      for ( const id of made ) await game.actors.get(id)?.delete();
      await folder?.delete();
      const snapFolder = game.folders.find(f => f.type === "Actor" && f.name === "WoDX · Before the years");
      if ( snapFolder && !game.actors.some(a => a.folder?.id === snapFolder.id) ) await snapFolder.delete();
      if ( R.journal && R.page ) await game.journal.get(R.journal)?.pages.get(R.page)?.delete();
      ok("7. Put back: the clock, the era and the test characters", game.time.worldTime === startTime && game.settings.get(CH, "activeEra") === startEra
        && !made.some(id => game.actors.get(id)), {worldTime: game.time.worldTime, startTime});
    });
    console.error = origErr;
  }
  R.passed = R.steps.filter(s => s.pass).length;
  R.total = R.steps.length;
  const f = new File([JSON.stringify(R, null, 1)], "gateera-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", f, {}, {notify: false});
  console.log("GATE ERA", R);
  ui.notifications.info(`Era advancement gate: ${R.passed} of ${R.total}`);
  return R;
}
