/**
 * Off-screen lives of supernatural NPCs gate (B3260-B3266), in Foundry, in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatefates.mjs?${Date.now()}`)).run()
 * The gate never moves the clock. It makes gate actors and deletes them, and puts back the brood and npcFates settings.
 *   1. the api and the settings (npcFates off by default)
 *   2. sheets read as the rules see them: line, Generation, sect, Rank, Arete
 *   3. a 300-year plan has events and writes nothing
 *   4. an NPC the Storyteller keeps has no events
 *   5. applying: torpor sets the condition and chronology; Generation drops; Rank and Arete rise
 *   6. applying: waking clears torpor; death files the NPC in WoDX · The Dead
 *   7. a brood record is kept and Bring into play makes a Vampire tied to the sire
 *   8. the approval type is registered and the skip handler is quiet with the setting off
 *   9. clean up
 * Result: Data/wodx-gate/gatefates-result.json.
 */
const npc = () => game.modules.get("wodx-npc").api;
const chron = () => game.modules.get("wodx-chronicle").api;
const YEAR = 365.25 * 86400;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  const t0 = game.time.worldTime;
  const keepBrood = foundry.utils.deepClone(game.settings.get("wodx-npc", "brood"));
  const keepOn = game.settings.get("wodx-npc", "npcFates");
  const hadDead = !!game.folders.find(f => f.type === "Actor" && f.name === "WoDX · The Dead");
  const made = [];
  let vamp, wolf, mage, kept, plan;
  try {
    await step("1. api", async () => {
      const f = npc().fates;
      ok("1. the api and the settings (npcFates off by default)", typeof f?.plan === "function" && typeof f?.apply === "function" && typeof f?.bring === "function"
        && game.settings.settings.get("wodx-npc.npcFates")?.default === false && game.settings.settings.has("wodx-npc.brood"), {v: game.modules.get("wodx-npc").version});
    });

    await step("2. sheets", async () => {
      [vamp] = await Actor.createDocuments([{name: "Gate Bishop Fates", type: "Vampire", system: {generation: 9, sect: "Sabbat"},
        flags: {"wodx-creation": {chronology: {embraced: Math.max(0, t0 - 100 * YEAR)}}}}]);
      [wolf] = await Actor.createDocuments([{name: "Gate Moon-Eye Fates", type: "Werewolf", system: {renown: {rank: 1}}, flags: {"wodx-creation": {chronology: {bornYear: 1180}}}}]);
      [mage] = await Actor.createDocuments([{name: "Gate Kaspar Fates", type: "Mage", system: {advantages: {arete: {permanent: 2}}}, flags: {"wodx-creation": {chronology: {bornYear: 1170}}}}]);
      [kept] = await Actor.createDocuments([{name: "Gate Kept Fates", type: "Vampire", system: {generation: 8}, flags: {"wodx-npc": {fates: {keep: true}}}}]);
      made.push(vamp, wolf, mage, kept);
      // A new Mage sheet starts at Arete 1 whatever the create data says, so set it after
      await mage.update({"system.advantages.arete.permanent": 2});
      const pv = npc().fates.personOf(vamp, 1200), pw = npc().fates.personOf(wolf, 1200), pm = npc().fates.personOf(mage, 1200);
      const checks = {vampLine: pv.line === "vampire", vampGeneration: pv.generation === 9, vampSect: /sabbat/i.test(pv.sectText), vampRoad: pv.road === 7,
        wolfLine: pw.line === "garou", wolfRank: pw.rise === 1, mageLine: pm.line === "mage", mageArete: pm.rise === 2};
      ok("2. sheets read as the rules see them: line, Generation, sect, Path, Rank, Arete", Object.values(checks).every(Boolean),
        {failed: Object.keys(checks).filter(k => !checks[k]), pv, pw, pm, raw: {gen: vamp.system.generation, genmod: vamp.system.generationmod, rank: wolf.system.renown?.rank, arete: mage.system.advantages?.arete}});
    });

    await step("3. plan", async () => {
      plan = npc().fates.plan(t0, t0 + 300 * YEAR);
      const mine = plan.result.events.filter(e => [vamp.id, wolf.id, mage.id].includes(e.id));
      ok("3. a 300-year plan has events and writes nothing", mine.length > 0 && !vamp.getFlag("wodx-creation", "chronology")?.torpor && game.time.worldTime === t0,
        {events: mine.length, sample: plan.lines.slice(0, 5)});
      ok("4. an NPC the Storyteller keeps has no events", !plan.result.events.some(e => e.id === kept.id));
    });

    await step("5. apply", async () => {
      const d = {from: t0, to: t0 + 300 * YEAR, fromYear: plan.fromYear, toYear: plan.toYear,
        changes: {[vamp.id]: {torpor: {from: plan.fromYear + 10, to: plan.fromYear + 60}, generation: 8}, [wolf.id]: {rise: 3}, [mage.id]: {rise: 4}},
        brood: [{id: "bgatefates1", line: "vampire", kind: "childe", sireId: vamp.id, sireName: vamp.name, year: plan.fromYear + 5, made: plan.fromYear + 5, born: plan.fromYear - 17, generation: 10, sect: "Sabbat", name: "Gate Childe Fates"}],
        people: []};
      await npc().fates.apply(d);
      const c = vamp.getFlag("wodx-creation", "chronology") ?? {};
      ok("5. applying: torpor sets the condition and chronology; Generation drops; Rank and Arete rise",
        !!c.torpor && !!chron().conditions?.hasCondition?.(vamp, "torpor") && Number(vamp.system.generation) === 8 && Number(wolf.system.renown.rank) === 3
        && Number(mage.system.advantages.arete.permanent) === 4, {torpor: c.torpor, gen: vamp.system.generation});
    });

    await step("6. wake and die", async () => {
      await npc().fates.apply({from: t0, to: t0 + YEAR, fromYear: plan.fromYear, toYear: plan.fromYear + 1, changes: {[vamp.id]: {wake: true}, [wolf.id]: {dead: plan.fromYear + 1}}});
      const dead = game.folders.find(f => f.type === "Actor" && f.name === "WoDX · The Dead");
      ok("6. applying: waking clears torpor; death files the NPC in WoDX · The Dead", !vamp.getFlag("wodx-creation", "chronology")?.torpor
        && !chron().conditions?.hasCondition?.(vamp, "torpor") && wolf.folder?.id === dead?.id && Number.isFinite(Number(wolf.getFlag("wodx-creation", "chronology")?.died)));
    });

    await step("7. brood", async () => {
      const rec = npc().fates.brood().find(b => b.id === "bgatefates1");
      const a = rec ? await npc().fates.bring(rec.id) : null;
      if ( a ) made.push(a);
      ok("7. a brood record is kept and Bring into play makes a Vampire tied to the sire", !!rec && a?.type === "Vampire" && a.getFlag("wodx-creation", "lineage")?.sire?.id === vamp.id
        && Number(a.system.generation) === 10, {name: a?.name});
    });

    await step("8. approval and hook", async () => {
      // Call this module's own skip handler, not the wodxSkipEnd hook: the hook would wake every module's jump work
      await game.settings.set("wodx-npc", "npcFates", false);
      const mine = () => (chron().approvals?.pending?.() ?? []).filter(e => e?.type === "wodx-npc.npc-fates").length;
      const before = mine();
      await npc().fates.onSkipEnd({from: t0, to: t0 + 50 * YEAR, label: "gate"});
      const after = mine();
      const types = (chron().approvals?.types?.() ?? []).map(t => t?.type ?? t);
      ok("8. the approval type is registered and the skip handler is quiet with the setting off", after === before && types.includes("wodx-npc.npc-fates"), {before, after, registered: types.includes("wodx-npc.npc-fates")});
    });
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  finally {
    await step("9. clean up", async () => {
      for ( const a of made ) await a.delete();
      await game.settings.set("wodx-npc", "brood", keepBrood);
      await game.settings.set("wodx-npc", "npcFates", keepOn);
      if ( !hadDead ) { const f = game.folders.find(x => x.type === "Actor" && x.name === "WoDX · The Dead"); if ( f && !f.contents.length ) await f.delete(); }
      ok("9. clean up", game.time.worldTime === t0 && !game.actors.some(a => / Fates$/.test(a.name)));
    });
  }
  return save(R, "gatefates-result.json");
}
