/**
 * Hunter, Mummy, Demon, Kuei-jin and Orpheus features gate (WoDX Chronicle 0.36.0 or later), in rothenstein-wodx, as
 * Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesmall.mjs?${Date.now()}`)).run()
 * Makes its own characters, turns the five small-line settings on, and puts the settings, actors and chat cards back.
 *   1. the api and the five settings
 *   2. rows from the sheets' own fields: a Hunter's creed, a Mummy's Amenti, a Demon's House and faction stacked
 *   3. a Kuei-jin (a Vampire with the kuei-jin variant) picks a Dharma in the window's place (setSplat)
 *   4. an Avenger's fight die counts only against a monster
 *   5. a Faustian's pact: leverage spent as a favour
 *   6. a Breach reaches the Society of Leopold (the Watchers card)
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatesmall-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { if ( fn() ) return true; await sleep(100); } return !!fn(); }

const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.signatures;
  const KEYS = ["sigHunter", "sigMummy", "sigDemon", "sigKueijin", "sigOrpheus"];
  const t0 = Date.now(), was = Object.fromEntries(KEYS.map(k => [k, game.settings.get(C, k)]));
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-sig"));
  const lastCard = () => cards().at(-1);
  let actors = [];
  try {
    for ( const k of KEYS ) await game.settings.set(C, k, true);
    actors = await createActors([{name: "WoDX gate: Avenger", type: "Hunter", system: {creed: "Avenger"}}, {name: "WoDX gate: Leopold", type: "Hunter", system: {creed: "Society of Leopold"}},
      {name: "WoDX gate: Mummy", type: "Mummy", system: {amenti: "Kher-minu"}}, {name: "WoDX gate: Demon", type: "Demon", system: {house: "Devils", faction: "Faustian"}},
      {name: "WoDX gate: Jade", type: "Vampire", flags: {world: {wodx: {profile: "kuei-jin"}}}}]);
    const by = n => game.actors.get(actors.find(a => a?.name === `WoDX gate: ${n}`)?.id);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.36.0") && typeof api()?.setSplat === "function" && KEYS.every(k => game.settings.get(C, k) === true), {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const h = api().rowOf(by("Avenger"))?.key, m = api().rowOf(by("Mummy"))?.key, d = api().rowsOf(by("Demon")).map(r => r.key);
      ok("2 rows", h === "avenger" && m === "kherminu" && JSON.stringify(d) === JSON.stringify(["devils", "faustians"]), {h, m, d});
    });
    await step("3 Kuei-jin pick", async () => {
      const none = api().rowsOf(by("Jade")).length, r = await api().setSplat(by("Jade"), "Resplendent Crane");
      ok("3 Kuei-jin pick", none === 0 && r?.key === "crane" && api().rowOf(by("Jade"))?.key === "crane", {none});
    });
    await step("4 Avenger", async () => {
      const T = game.modules.get(C).api.traits, a = by("Avenger");
      const vs = T.effects(a, {channel: "roll", tags: T.rules.rollTags("melee"), against: "vampire"}), vm = T.effects(a, {channel: "roll", tags: T.rules.rollTags("melee"), against: "mortal"});
      ok("4 Avenger", vs.some(e => e.name === "Avengers") && !vm.some(e => e.name === "Avengers"), {vs: vs.length, vm: vm.length});
    });
    await step("5 Faustian pact", async () => {
      const d = by("Demon"); await api().leverage(d, {who: "Herr Brandt", what: "a soul for his mill"}); await api().spendLeverage(d, 0);
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "boon");
      ok("5 Faustian pact", lastCard()?.content?.includes("Herr Brandt"), {});
    });
    await step("6 Inquisition hears", async () => {
      const n0 = cards().length;
      Hooks.callAll("wodxBreach", {entry: {}, by: {uuid: by("Demon").uuid, name: "WoDX gate: Demon"}});
      await until(() => cards().length > n0 && lastCard()?.content?.includes("Watchers"));
      ok("6 Inquisition hears", lastCard()?.content?.includes("Inquisitors") && lastCard()?.content?.includes("WoDX gate: Leopold"), {});
    });
    await step("7 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("7 other modules", !mods.length, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      for ( const k of KEYS ) await game.settings.set(C, k, was[k]);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatesmall-result.json");
}
