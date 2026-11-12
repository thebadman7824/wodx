/**
 * Guild and legion features gate (WoDX Chronicle 0.35.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedead.mjs?${Date.now()}`)).run()
 * Makes its own wraiths, turns "Guild and legion features (Wraith)" on, and puts the setting, actors and chat cards back.
 *   1. the api and the setting
 *   2. a wraith with no picks has no rows; the manner of death suggests a legion; picks find guild, legion and faction
 *   3. roll effects reach the traits api: a Grim Legion wraith's Melee die
 *   4. an Oracle reads a riddle once a night (the second is refused)
 *   5. the Emerald luck: once a week
 *   6. a Penitent wraith with a derangement hears a line on a talk card
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatedead-result.json.
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
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.signatures, S = () => api().rules;
  const t0 = Date.now(), was = game.settings.get(C, "sigWraith");
  const sig = a => game.actors.get(a.id)?.flags?.[C]?.sig ?? {};
  let actors = [];
  try {
    await game.settings.set(C, "sigWraith", true);
    actors = await createActors([{name: "WoDX gate: Soldier", type: "Wraith", system: {death: "Shot in the war, 1916"}}, {name: "WoDX gate: Oracle", type: "Wraith"},
      {name: "WoDX gate: Lucky", type: "Wraith"}, {name: "WoDX gate: Mad", type: "Wraith", system: {derangement: "Paranoia"}}]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.35.0") && typeof api()?.setWraith === "function" && game.settings.get(C, "sigWraith") === true, {version: game.modules.get(C).version});
    });
    await step("2 picks", async () => {
      const s = by("Soldier"), none = api().rowsOf(s).length, sug = S().legionFor(game.actors.get(s.id).system.death)?.key;
      await api().setWraith(s, {guild: "Spooks", legion: sug, faction: "Renegades"});
      const keys = api().rowsOf(game.actors.get(s.id)).map(r => r.key);
      ok("2 picks", none === 0 && sug === "grim" && JSON.stringify(keys) === JSON.stringify(["spooks", "grim", "renegades"]), {none, sug, keys});
    });
    await step("3 roll effects", async () => {
      const T = game.modules.get(C).api.traits, fx = T.effects(game.actors.get(by("Soldier").id), {channel: "roll", tags: T.rules.rollTags("melee")});
      ok("3 roll effects", fx.some(e => e.name === "Grim Legion" && e.dice === 1), {n: fx.length});
    });
    await step("4 Oracle", async () => {
      const o = by("Oracle"); await api().setWraith(o, {guild: "Oracles"});
      const g1 = await api().glimpse(game.actors.get(o.id)), g2 = await api().glimpse(game.actors.get(o.id));
      ok("4 Oracle", !!g1 && g2 === null && sig(o).glimpseAt != null, {});
    });
    await step("5 Emerald luck", async () => {
      const l = by("Lucky"); await api().setWraith(l, {legion: "emerald"});
      const r1 = await api().luck(game.actors.get(l.id)), r2 = await api().luck(game.actors.get(l.id));
      ok("5 Emerald luck", !!r1 && r2 === null, {});
    });
    await step("6 Penitent ear", async () => {
      const m = by("Mad"); await api().setWraith(m, {legion: "penitent"});
      const line = api().hearAs(game.actors.get(m.id), {topic: "the Hierarchy", name: "the Anacreon"});
      ok("6 Penitent ear", !!line, {line});
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
      await game.settings.set(C, "sigWraith", was);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatedead-result.json");
}
