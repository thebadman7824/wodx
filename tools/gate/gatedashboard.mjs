/**
 * The Storyteller's dashboard (WoDX Storyteller 0.10.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedashboard.mjs?${Date.now()}`)).run()
 * It makes a character of its own (owned by a player when there is one, so it counts as a player's character), a
 * beat, a dream and a ledger entry, and deletes them all at the end. The clock never moves.
 *   1. the module: Storyteller 0.10.0 or later, api.dashboard, the toolbar button
 *   2. the party: the character is listed with its wounds
 *   3. clocks: the beat and the dream ahead, soonest first, and the next dawn
 *   4. open threads: a beat waiting on a place
 *   5. consequences: the overdue debt comes first
 *   6. the window opens, lists them and changes nothing
 *   7. clean up
 * Result: Data/wodx-gate/gatedashboard-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedashboard-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), S = M?.api;
  const t0 = game.time.worldTime;
  let actor = null, beatTime = null, beatPlace = null, dream = null, entryIds = [];
  try {
    const controls = {tokens: {tools: {}}};
    Hooks.callAll("getSceneControlButtons", controls);
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.10.0", M.version) && typeof S?.dashboard?.open === "function" && !!controls.tokens.tools.wodxDashboard, {version: M?.version});

    const player = game.users.find(u => !u.isGM);
    if ( !player ) R.notes.push("no player user: the character is made with default ownership OWNER so it counts as a player's character");
    const ownership = player ? {default: 0, [player.id]: 3} : {default: 3};
    actor = await Actor.create({name: "WoDX gate: Dashboard Vampire", type: "Vampire", ownership, system: {health: {damage: {bashing: 0, lethal: 2, aggravated: 1}}}});
    await sleep(300);
    const before = JSON.stringify({beats: game.settings.get(MOD, "beats"), ledger: game.settings.get(MOD, "ledger")});
    beatTime = await S.saveBeat({name: "WoDX gate: the bell at midnight", on: "time", time: t0 + 7200});
    beatPlace = await S.saveBeat({name: "WoDX gate: someone at the mill", on: "place", place: "nowhere-gate"});
    dream = await S.dreams.save({actorId: actor.id, title: "WoDX gate: the drowned bell", text: "Water.", at: t0 + 3600});
    const e1 = await S.ledger.save({kind: "debt", from: {id: actor.id, name: actor.name}, to: {name: "WoDX gate: the miller"}, what: "WoDX gate: overdue", due: t0 - 86400});
    const e2 = await S.ledger.save({kind: "oath", from: {id: actor.id, name: actor.name}, to: {name: "WoDX gate: the priest"}, what: "WoDX gate: later", due: t0 + 86400 * 5});
    await sleep(300);
    const ids = S.ledger.state().entries.filter(e => /^WoDX gate:/.test(e.what)).map(e => e.id);
    entryIds = ids;
    R.notes.push(`saved ${[e1, e2].filter(Boolean).length} ledger entries`);

    const g = S.dashboard.gather();
    const me = g.party.find(r => r.id === actor.id);
    ok("2. the party", !!me && me.wounds.lethal === 2 && me.wounds.aggravated === 1 && !!me.blood, {row: me});
    const mine = g.clocks.filter(c => /WoDX gate/.test(c.what));
    ok("3. clocks", mine.length === 2 && mine[0].kind === "dream" && mine[1].kind === "beat" && g.clocks.some(c => c.kind === "dawn"), {clocks: mine.map(c => c.what)});
    ok("4. open threads", g.threads.some(x => x.what === "Beat: WoDX gate: someone at the mill"), {threads: g.threads.length});
    const due = g.consequences.filter(e => /^WoDX gate:/.test(e.what));
    ok("5. consequences", due.length === 2 && due[0].what === "WoDX gate: overdue" && due[0].overdue && !due[1].overdue, {due: due.map(e => e.what)});

    const snap = JSON.stringify({beats: game.settings.get(MOD, "beats"), ledger: game.settings.get(MOD, "ledger")});
    S.dashboard.open(); await sleep(900);
    const el = document.querySelector("#wodx-dashboard");
    const txt = el?.textContent ?? "";
    const after = JSON.stringify({beats: game.settings.get(MOD, "beats"), ledger: game.settings.get(MOD, "ledger")});
    ok("6. the window", txt.includes("WoDX gate: Dashboard Vampire") && txt.includes("the bell at midnight") && txt.includes("WoDX gate: overdue") && snap === after && before !== snap,
      {len: txt.length, searchBoxes: el?.querySelectorAll("input[type=search]").length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await foundry.applications.instances?.get?.("wodx-dashboard")?.close?.();
      for ( const b of S?.beats?.() ?? [] ) if ( /^WoDX gate:/.test(b.name) ) await S.deleteBeat(b.id);
      for ( const d of S?.dreams?.list?.() ?? [] ) if ( /^WoDX gate:/.test(d.title) ) await S.dreams.remove(d.id);
      const led = foundry.utils.deepClone(game.settings.get(MOD, "ledger"));
      if ( led?.entries ) { led.entries = led.entries.filter(e => !/^WoDX gate:/.test(e.what ?? "")); await game.settings.set(MOD, "ledger", led); }
      if ( actor ) await game.actors.get(actor.id)?.delete();
      ok("7. clean up", !(S?.beats?.() ?? []).some(b => /^WoDX gate:/.test(b.name)) && !(S?.dreams?.list?.() ?? []).some(d => /^WoDX gate:/.test(d.title))
        && !S?.ledger?.state?.().entries.some(e => /^WoDX gate:/.test(e.what)) && (!actor || !game.actors.get(actor.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
