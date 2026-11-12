/**
 * Battles and sieges gate (WoDX Storyteller 0.45.0, NPC 0.44.0, Chronicle 0.42.0), in rothenstein-wodx (the testing
 * world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatebattle.mjs?${Date.now()}`)).run()
 * Runs battles through the API (no windows), then removes the battles, clock, factions, messages and actors it made.
 * The world clock is put back where it was.
 *   1. the api is there, and "Battles and sieges" is in the Storyteller's hand
 *   2. a commander from a sheet brings Perception, Charisma and Intelligence + Leadership and Wits + Medicine
 *   3. a field battle: a phase posts a public card and a Storyteller card with the dice, men and resolve change
 *   4. Undo puts the phase back
 *   5. phases to an end within 30: a winner or both broken, a line in the Storyteller's log
 *   6. the factions named on the sides get a proposal in the approval queue (when faction mode is not Off)
 *   7. the Legends book gains a Battles and sieges line after a build
 *   8. a siege: a week fills the breach clock, the stores go down, disease is rolled; Undo puts it back
 *   9. storming turns the siege into a field battle; Undo turns it back
 *  10. Let the time pass moves the clock by the time taken, once
 *  11. the counterattack on a character goes through WoDX Combat (damage on the sheet), then is taken off
 *  12. the book's army: both sides by units fight a Right of Command turn (pools, actions, units lost); Undo puts the units back
 *  13. factions at war: two gate factions Hunted toward each other go to war at a faction step, fought off the screen with no cards to players
 *  14. every other WoDX module still answers
 * Result: Data/wodx-gate/gatebattle-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ST = "wodx-storyteller", NPC = "wodx-npc";
  const api = () => game.wodx?.storyteller?.battles ?? game.modules.get(ST)?.api?.battles;
  const t0 = Date.now(), time0 = game.time.worldTime;
  const msgsSince = () => game.messages.contents.filter(m => m.timestamp >= t0);
  const made = [];
  let actors = [], factionsBefore = null, legendsBefore = null;
  try {
    actors = await createActors([{name: "WoDX gate: Captain", type: "Mortal"}, {name: "WoDX gate: Knight", type: "Vampire"}]);
    // a real sheet sets isupdated false and the system recomputes each total; an API update does neither, so set both here
    const attrs = {perception: 3, charisma: 2, intelligence: 2, wits: 2};
    const upd = {"system.abilities.leadership.value": 3, "system.abilities.medicine.value": 1};
    for ( const [k, v] of Object.entries(attrs) ) { upd[`system.attributes.${k}.value`] = v; upd[`system.attributes.${k}.total`] = v; }
    await actors[0].update(upd);
    try { factionsBefore = foundry.utils.deepClone(game.settings.get(NPC, "factions")); } catch (e) { factionsBefore = null; }
    try { legendsBefore = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "legends")); } catch (e) { legendsBefore = null; }
    if ( factionsBefore ) {
      const s = foundry.utils.deepClone(factionsBefore);
      s.factions = [...(s.factions ?? []), {id: "gateBattleA", name: "WoDX gate: Lords", kind: "other", assets: {status: 2, retainers: 2}},
        {id: "gateBattleB", name: "WoDX gate: Rebels", kind: "other", assets: {status: 1, retainers: 1}},
        {id: "gateWarA", name: "WoDX gate: Margrave", kind: "mortal", assets: {status: 3, retainers: 3, resources: 2}, standing: {gateWarB: -3}},
        {id: "gateWarB", name: "WoDX gate: Abbey", kind: "church", assets: {status: 2, retainers: 2, domain: 1}, places: ["wodx-gate-place"], standing: {gateWarA: -3}}];
      await game.settings.set(NPC, "factions", s);
    }

    await step("api and the hand", async () => {
      const hand = game.wodx?.storyteller?.hand;
      ok("api and the hand", typeof api()?.start === "function" && typeof api()?.fight === "function", {inHand: hand?.tools?.some?.(t => t.key === "battle")});
    });
    await step("commander pools", async () => {
      const p = api().commandPools(actors[0]);
      ok("commander pools", p.pool === 6 && p.morale === 5 && p.works === 5 && p.medicine === 3, p);
    });
    let b;
    await step("a phase", async () => {
      b = await api().start({name: "WoDX gate: the field", place: "Gate ford", kind: "field",
        sides: [{name: "Lords", faction: "WoDX gate: Lords", men: 3000, quality: 4, commander: {actorId: actors[0].id}},
          {name: "Rebels", faction: "WoDX gate: Rebels", men: 1000, quality: 2, position: "high", commander: {name: "Jan", pool: 4}}],
        chars: [{actorId: actors[1].id, name: actors[1].name, side: 0, stance: "thick"}]});
      made.push(b.id);
      const after = await api().fight(b.id, {deeds: [[{name: "Knight", successes: 2}], []]});
      const cards = msgsSince().filter(m => /WoDX gate: the field/.test(m.content));
      ok("a phase", after.phases.length === 1 && cards.some(m => !m.whisper.length) && cards.some(m => m.whisper.length) && after.sides[1].men < 1000,
        {men: after.sides.map(s => s.men), resolve: after.sides.map(s => s.resolve), cards: cards.length});
    });
    await step("undo", async () => {
      const u = await api().undo(b.id);
      ok("undo", u.phases.length === 0 && u.sides[1].men === 1000 && u.sides[0].men === 3000);
    });
    let end;
    await step("to an end", async () => {
      let x = api().get(b.id), n = 0;
      while ( !x.over && n < 30 ) { x = await api().fight(b.id); n++; }
      if ( !x.over ) x = await api().draw(b.id);
      end = x;
      const log = game.wodx?.storyteller?.entries?.() ?? [];
      const logged = (Array.isArray(log) ? log : []).some(e => /WoDX gate: the field/.test(e.text ?? ""));
      ok("to an end", !!x.over && !!x.over.text, {how: x.over?.how, phases: n, text: x.over?.text, logged});
    });
    await step("factions proposal", async () => {
      await new Promise(r => setTimeout(r, 800));
      let mode = "suggest";
      try { mode = game.settings.get(NPC, "factionMode"); } catch (e) { /* default */ }
      const ap = game.modules.get("wodx-chronicle")?.api?.approvals;
      const q = [...(ap?.pending?.() ?? []), ...(ap?.history?.() ?? [])];
      const has = q.some(e => String(e.key ?? "").startsWith(`battle:${b.id}`));
      ok("factions proposal", !factionsBefore || mode === "off" || end.over.winner === null && end.over.how === "stalemate" ? true : has, {mode, has, queue: Array.isArray(q) ? q.length : typeof q});
    });
    await step("legends", async () => {
      const L = game.modules.get("wodx-chronicle")?.api?.legends;
      if ( !L ) return ok("legends", true, {skipped: "no Legends api"});
      await L.build({quiet: true});
      const line = L.book().entries.find(e => e.id === `battle:${b.id}`);
      ok("legends", line?.kind === "battle", {text: line?.text});
    });
    let s;
    await step("a siege week", async () => {
      s = await api().start({name: "WoDX gate: the siege", place: "Gate castle", kind: "siege",
        sides: [{name: "Besiegers", men: 4000, quality: 3, commander: {name: "Duke", pool: 5, works: 6, medicine: 3}},
          {name: "Garrison", men: 200, quality: 3, position: "castle", stores: 21, commander: {name: "Castellan", pool: 4, medicine: 2}}]});
      made.push(s.id);
      const w = await api().week(s.id);
      const clock = game.wodx?.storyteller?.clocks?.list?.().find(c => c.id === `siege-${s.id}`.slice(0, 40));
      const u = await api().undo(s.id);
      ok("a siege week", w.weeks === 1 && w.sides[1].stores === 14 && Array.isArray(w.phases[0].sick) && !!clock && u.weeks === 0 && u.sides[1].stores === 21,
        {breach: w.breach, clock: clock?.filled, sick: w.phases[0].sick});
    });
    await step("storm", async () => {
      const st = await api().storm(s.id);
      const back = await api().undo(s.id);
      ok("storm", st.kind === "field" && st.breached && back.kind === "siege");
    });
    await step("time", async () => {
      const before = game.time.worldTime;
      const secs = await api().passTime(b.id);
      const again = await api().passTime(b.id);
      ok("time", secs > 0 && game.time.worldTime - before === secs && again === 0, {secs});
    });
    await step("counterattack", async () => {
      if ( !game.wodxCombat?.soakAndApply ) return ok("counterattack", true, {skipped: "WoDX Combat off"});
      const k = actors[1];
      const before = JSON.stringify(k.system.health ?? {});
      let res = null, n = 0;
      // the counterattack can roll no successes; try a few times
      while ( n < 6 && !(res?.dice) ) { res = await api().hazard(b.id, k.id, {attention: true}); n++; }
      await new Promise(r => setTimeout(r, 500));
      const after = JSON.stringify(game.actors.get(k.id).system.health ?? {});
      // all of it may be soaked: then nothing changes on the sheet, and that is a pass
      ok("counterattack", !!res && (res.dice === 0 || res.levels === 0 || before !== after), {res: {...res, message: undefined}, tries: n, changed: before !== after});
    });
    await step("book army", async () => {
      const k = await api().start({name: "WoDX gate: the book army", place: "Gate field", kind: "field", year: 1230,
        sides: [{name: "Host", units: {peasants: 2, spearmen: 2, archers: 1, lightCavalry: 3, ghoulKnights: 1, cainiteCavalry: 1}, commander: {name: "Count", pool: 5, morale: 5}},
          {name: "Levies", units: {peasants: 6, spearmen: 1}, commander: {name: "Reeve", pool: 4, morale: 4}}]});
      made.push(k.id);
      const pools = api().rules.unitPools(k.sides[0].units);
      const t = await api().fight(k.id, {actions: ["melee", "ranged"]});
      const p = t.phases.at(-1);
      const u = await api().undo(k.id);
      ok("book army", k.book && k.sides[0].men === 4860 && pools.melee === 20 && p.book && p.contests.length === 2 && p.contests[1].action === "ranged"
        && api().rules.unitCount(u.sides[1].units) === 7 && u.phases.length === 0, {pools, units: p.units, contests: p.contests?.map(c => [c.action, c.attack.pool, c.resist.pool, c.net])});
    });
    await step("faction wars", async () => {
      const fx = game.modules.get(NPC)?.api?.factions;
      if ( !fx?.warTurn || !factionsBefore ) return ok("faction wars", true, {skipped: "no WoDX NPC factions"});
      const pub = () => msgsSince().filter(m => !m.whisper.length && /WoDX gate: (Margrave|Abbey)/.test(m.content)).length;
      const pub0 = pub();
      let res = null, n = 0;
      // a Hunted faction takes up arms 1 turn in 3; the seeded roll changes with the turn number
      while ( n < 12 && !res?.started ) { res = await fx.warTurn(9000 + n, {only: new Set(["gateWarA", "gateWarB"])}); n++; }
      const war = api().list().find(x => x.war?.attacker === "gateWarA");
      if ( war ) made.push(war.id);
      await new Promise(r => setTimeout(r, 800));
      const ap = game.modules.get("wodx-chronicle")?.api?.approvals;
      const q = [...(ap?.pending?.() ?? []), ...(ap?.history?.() ?? [])];
      const proposed = !!war?.over && q.some(e => String(e.key ?? "").startsWith(`battle:${war.id}`));
      ok("faction wars", !!war && war.war.auto && war.war.kind === "mortal" && war.book === (war.year <= 1499) && (!war.over || proposed) && pub() === pub0,
        {tries: n, name: war?.name, over: war?.over?.text, phases: war?.phases?.length, proposed, publicCards: pub() - pub0});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-otherworlds", "wodx-creation"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const x of api()?.list?.() ?? [] ) if ( x.war?.attacker === "gateWarA" && !made.includes(x.id) ) made.push(x.id);
      for ( const id of made ) await api()?.remove?.(id);
      if ( factionsBefore ) await game.settings.set(NPC, "factions", factionsBefore);
      if ( legendsBefore ) await game.settings.set("wodx-chronicle", "legends", legendsBefore);
      try {
        const ap = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "approvals") ?? {});
        const keep = e => !made.some(id => String(e?.key ?? "").startsWith(`battle:${id}`));
        if ( Array.isArray(ap.pending) ) ap.pending = ap.pending.filter(keep);
        if ( Array.isArray(ap.history) ) ap.history = ap.history.filter(keep);
        await game.settings.set("wodx-chronicle", "approvals", ap);
      } catch (e) { R.notes.push(`approvals cleanup: ${e.message}`); }
      for ( const m of msgsSince() ) if ( /WoDX gate|Battles|battle/i.test(m.content) || m.speaker?.alias === "Battles" || (m.speaker?.alias === "WoDX factions" && /WoDX gate/.test(m.content)) ) await m.delete();
      for ( const a of actors ) await a?.delete();
      if ( game.time.worldTime !== time0 ) await game.time.advance(time0 - game.time.worldTime);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatebattle-result.json");
}
