/**
 * The faith calendar and the hunt (NPC 0.54.0, Actions 3.58.0, Chronicle 0.51.1; B2710, B2711) and black powder
 * (Combat 3.24.0; B2712 to B2714), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatehuntpowder.mjs?${Date.now()}`)).run()
 * Makes two scenes ("WoDX gate: Cairo hunt" in Egypt and "WoDX gate: Brno hunt" at home), one resident and one
 * gunman, and deletes them after. The clock is only read (times ahead are passed in, never set).
 *   1. versions and api
 *   2. a night of Ramadan in Cairo is named and makes the hunt easier
 *   3. Good Friday at home is named, as strict, by custom or light for the year
 *   4. the curfew at 23:00 where the homeland's towns keep one in this year
 *   5. a Jewish resident makes the Brno scene's Jewish year a named quarter change with no step
 *   6. the hunt window shows the odds and every change by name
 *   7. black powder: the lock by name and year, a reload dries wet powder, the macro lights the match
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatehuntpowder-result.json.
 */
const N = 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${N} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatehuntpowder-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const v = id => game.modules.get(id)?.version, older = (a, id) => foundry.utils.isNewerVersion(a, v(id) ?? "0");
  const chron = () => game.modules.get("wodx-chronicle")?.api;
  const scenes = [], actors = [];
  const t0 = game.time.worldTime, DAY = 86400;
  try {
    const HC = await import(`/modules/wodx-npc/scripts/hunt-calendar.mjs?${Date.now()}`);
    const HR = await import(`/modules/wodx-npc/scripts/hunt-calendar-rules.mjs?${Date.now()}`);
    const made = await Scene.create([{name: "WoDX gate: Cairo hunt", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}},
      {name: "WoDX gate: Brno hunt", width: 1200, height: 1000, padding: 0.1, grid: {size: 100, distance: 5}}]);
    const cairo = made.find(s => s.name.endsWith("Cairo hunt")), brno = made.find(s => s.name.endsWith("Brno hunt"));
    scenes.push(cairo, brno);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    await sleep(300);
    const year = Number(chron()?.eras?.currentYear?.()) || 1197, home = chron()?.world?.homeland?.();
    R.notes.push(`year ${year}, homeland ${home}, feastFast ${chron()?.church?.today?.()?.active}`);
    // The first time ahead, a day at a time for 400 days, at a local hour, where test(day) holds
    const findTime = (scene, hour, test) => {
      for ( let k = 0; k < 400; k++ ) {
        const t = t0 + k * DAY;
        const d = chron().place.describeAt(scene, t);
        const at = t + ((hour - d.hour) * 3600) - d.minute * 60;
        const c = chron().church.on(chron().place.describeAt(scene, at), {scene});
        if ( test(c) ) return at;
      }
      return null;
    };

    await step("1. versions and api", async () => {
      ok("1. versions and api", !older("0.54.0", "wodx-npc") && !older("3.58.0", "wodx-actions") && !older("3.24.0", "wodx-combat") && !older("0.51.1", "wodx-chronicle")
        && typeof HC.calendarFor === "function" && typeof game.wodxCombat?.lightMatch === "function" && typeof game.wodxCombat?.powder?.gunLock === "function",
        {npc: v("wodx-npc"), actions: v("wodx-actions"), combat: v("wodx-combat"), chronicle: v("wodx-chronicle")});
    });
    await step("2. a night of Ramadan in Cairo", async () => {
      const at = findTime(cairo, 21, c => c.season === "Ramadan");
      const cal = at === null ? null : HC.calendarFor(cairo, {area: "market", crowd: 2, time: at});
      const r = cal?.changes.find(c => c.key === "ramadan");
      ok("2. a night of Ramadan in Cairo", !!r && r.n === -1 && cal.n <= 0 && cal.active, {at, cal});
    });
    await step("3. Good Friday at home", async () => {
      const at = findTime(brno, 22, c => /Good Friday|Great Friday/.test(`${c.fast ?? ""} ${c.day ?? ""}`));
      const day = at === null ? null : chron().church.on(chron().place.describeAt(brno, at), {scene: brno});
      const cal = at === null ? null : HC.calendarFor(brno, {area: "market", crowd: 2, time: at});
      const s = cal?.changes.find(c => c.key === "strictest");
      const want = day?.observance === "strict" ? 2 : day?.observance === "custom" ? 1 : null;
      ok("3. Good Friday at home", at !== null && (want === null ? !s : s?.n === want && /Good Friday|Great Friday/.test(s.why)), {at, observance: day?.observance, cal});
    });
    await step("4. the curfew", async () => {
      const keeps = HR.keepsCurfew(home, year);
      const at = findTime(brno, 23, c => !c.revel);
      const cal = HC.calendarFor(brno, {area: "market", crowd: 1, time: at});
      const cur = cal.changes.find(c => c.key === "curfew");
      ok("4. the curfew", keeps ? cur?.n === 1 : !cur, {keeps, cal});
    });
    await step("5. a Jewish quarter", async () => {
      const [a] = await Actor.create([{name: "WoDX gate: Jewish resident", type: "Mortal", flags: {"wodx-npc": {resident: {scene: brno.uuid, faith: "jewish"}}}}]);
      actors.push(a);
      const minor = HC.minorFaiths(brno, chron().church.faithOf(brno, year).faith);
      // The quarter is named only on a day its year marks; look for one ahead
      let found = null;
      for ( let k = 0; k < 400 && !found; k++ ) {
        const cal = HC.calendarFor(brno, {area: "market", crowd: 2, time: t0 + k * DAY + 3600 * 3});
        found = cal.changes.find(c => c.minor) ?? null;
      }
      ok("5. a Jewish quarter", minor.some(m => m.faith === "jewish") && !!found && found.n === 0 && /in its own quarter/.test(found.why), {minor, found});
    });
    await step("6. the hunt window", async () => {
      const [vamp] = await Actor.create([{name: "WoDX gate: hunter", type: "Vampire"}]);
      actors.push(vamp);
      const p = game.wodxActions.hunt({actor: vamp});
      await sleep(1200);
      const el = [...document.querySelectorAll(".application, .dialog, .window-app")].find(e => /WoDX Hunt/.test(e.textContent) && e.querySelector("select[name=area]"));
      const odds = el?.querySelector(".vta-odds")?.textContent ?? "";
      const cal = el?.querySelector(".wodx-hunt-calendar")?.textContent ?? "(no calendar changes tonight)";
      el?.querySelector("[data-action=close], .header-control[data-action=close], button[data-action=cancel]")?.click();
      await Promise.race([p, sleep(800)]);
      ok("6. the hunt window", /Odds/.test(odds) && /prey in the first hour/.test(odds) && /Market district|Slums|neighborhood|patrolled/.test(odds), {odds, cal});
    });
    await step("7. black powder", async () => {
      const PW = game.wodxCombat.powder;
      const [gunman] = await Actor.create([{name: "WoDX gate: musketeer", type: "Mortal"}]);
      actors.push(gunman);
      const [gun] = await gunman.createEmbeddedDocuments("Item", [{name: "Matchlock arquebus", type: "Ranged Weapon", system: {clip: {value: 0, max: 1}}}]);
      await gun.setFlag("wodx-combat", "powder", {wet: true, matchOut: true});
      await game.wodxCombat.reload({actor: gunman, weaponId: gun.id});
      const afterReload = gun.getFlag("wodx-combat", "powder");
      await game.wodxCombat.lightMatch({actor: gunman, weaponId: gun.id});
      const afterLight = gun.getFlag("wodx-combat", "powder");
      const locks = {arquebus: PW.gunLock({name: "Matchlock arquebus", ranged: true}, year)?.lock, musket1630: PW.gunLock({name: "Musket", ranged: true}, 1630)?.lock,
        musket1750: PW.gunLock({name: "Musket", ranged: true}, 1750)?.lock, glock: PW.gunLock({name: "Glock 17", ranged: true}, 1995)?.lock, bow: PW.gunLock({name: "Longbow", ranged: true}, 1400)};
      ok("7. black powder", afterReload?.wet === false && afterLight?.matchOut === false && locks.arquebus === "matchlock" && locks.musket1630 === "matchlock"
        && locks.musket1750 === "flintlock" && locks.glock === "cartridge" && locks.bow === null && game.settings.get("wodx-combat", "blackPowder") === true,
        {afterReload, afterLight, locks});
    });
    await step("8. other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-npc", "wodx-actions", "wodx-combat", "wodx-storyteller", "wodx-atmosphere", "wodx-interactables", "wodx-senses"];
      const bad = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api && !(id === "wodx-combat" && game.wodxCombat));
      ok("8. other modules", !bad.length, {missingApi: bad});
    });
  } catch (e) { R.errors.push({error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); }
  finally {
    for ( const a of actors ) { try { await a?.delete(); } catch (e) { R.errors.push({error: `cleanup: ${e.message}`}); } }
    for ( const s of scenes ) { try { await s?.delete(); } catch (e) { R.errors.push({error: `cleanup: ${e.message}`}); } }
    for ( const m of game.messages.contents.filter(m => /WoDX gate: musketeer/.test(m.speaker?.alias ?? "")) ) { try { await m.delete(); } catch (e) { /* leave it */ } }
    if ( game.time.worldTime !== t0 ) { try { await game.time.advance(t0 - game.time.worldTime); } catch (e) { R.errors.push({error: `clock: ${e.message}`}); } }
  }
  return save(R);
}
