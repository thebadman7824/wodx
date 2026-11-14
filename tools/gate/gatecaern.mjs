/**
 * Living caerns (WoDX Storyteller, B3470-B3476), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatecaern.mjs?${Date.now()}`)).run()
 * It keeps the register and the setting it touches, makes one scene and one Garou of its own, and puts everything back
 * at the end. The clock never moves: the clock run is called with a stamp of its own.
 *   1. the modules: Storyteller with api.upkeep.power.caern
 *   2. a caern goes on the register, with a sept and a Master of the Rite
 *   3. the Moot Rite takes Gnosis from the Garou and fills the caern
 *   4. a month without a moot: the caern lapses and the scene's Gauntlet drifts up
 *   5. a moot ends the lapse and the drift comes back down
 *   6. a raid lost: the caern loses a level and the Wyrm's taint steps the drift
 *   7. a caern war won by the challengers: the sept changes and the offices fall empty
 *   8. long untended, the caern dies
 *   9. a caern lost to the Wyrm is taken back at level 1
 *  10. the window lists the caern with its acts
 *  11. clean up
 * Result: Data/wodx-gate/gatecaern-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 11;
const DAY = 86400, MONTH = 30 * DAY;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatecaern-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
async function peek(open, cls, text = null) {
  const p = open();
  await sleep(600);
  const app = [...(foundry.applications.instances?.values?.() ?? [])].reverse().find(a => a.options?.classes?.includes?.(cls) && (!text || a.element?.innerHTML?.includes(text)));
  const html = app?.element?.innerHTML ?? "";
  await app?.close?.();
  await Promise.race([p, sleep(500)]);
  return html;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), P = M?.api?.upkeep?.power, K = P?.caern;
  const drift = game.modules.get("wodx-otherworlds")?.active ? game.modules.get("wodx-otherworlds")?.api?.drift : null;
  const has = k => game.settings.settings.has(k);
  const SET = ["placesOfPower", "powerState"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const scenes = [], actors = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const cn = () => P.state().list.find(x => x.id === "gate-caern");
  const setCaern = async patch => { const st = P.state(); st.list = st.list.map(x => (x.id === "gate-caern" ? {...x, ...patch} : x)); await game.settings.set(MOD, "powerState", st); };
  const dv = sc => (drift ? drift.of(game.scenes.get(sc.id)).value : null);
  try {
    ok("1. modules", M?.active && ["moot", "open", "raid", "war", "reclaim", "raise"].every(k => typeof K?.[k] === "function") && SET.length === 2, {storyteller: M?.version, otherworlds: !!drift});
    await game.settings.set(MOD, "placesOfPower", true);
    await game.settings.set(MOD, "powerState", P.rules.blankState());
    const sc = await Scene.create({name: "WoDX gate: the caern", width: 800, height: 600, padding: 0});
    scenes.push(sc);
    const wolf = await Actor.create({name: "WoDX gate: caern Theurge", type: "Werewolf", system: {auspice: "Theurge", renown: {rank: 3}, advantages: {gnosis: {permanent: 8, temporary: 8}}}});
    actors.push(wolf);

    // 2. The register
    const t0 = game.time.worldTime;
    await game.settings.set(MOD, "powerState", {v: 1, list: [{id: "gate-caern", kind: "caern", name: "WoDX gate: the Spring", scene: sc.id, keepers: [wolf.id],
      level: 2, type: "rage", totem: "Stag", sept: "Sept of the Gate", garou: 6, offices: {rite: wolf.id}, lastMoot: t0, lastRaidCheck: t0, raids: false}]});
    ok("2. the register", cn()?.kind === "caern" && cn()?.offices?.rite === wolf.id && P.placesIn(sc.id).length === 1, {caern: cn()});

    // 3. The moot
    const r3 = await K.moot("gate-caern", [wolf.id], {extra: 4});
    const g3 = game.actors.get(wolf.id).system.advantages.gnosis.temporary;
    ok("3. the Moot Rite", r3?.ok && r3.full && g3 === 2 && cn().charge === 10 && newMsgs().some(m => /moot at/.test(m.content)), {gnosis: g3, charge: cn().charge});

    // 4. A month without a moot
    const d0 = dv(sc);
    await P.run({stamp: t0 + MONTH + DAY});
    ok("4. a lapse", cn().status === "lapsed" && (drift ? dv(sc) === d0 + 1 : true), {status: cn().status, drift: [d0, dv(sc)]});

    // 5. The moot ends the lapse
    await game.actors.get(wolf.id).update({"system.advantages.gnosis.temporary": 8});
    const r5 = await K.moot("gate-caern", [wolf.id], {extra: 4});
    ok("5. consecrated again", r5?.wasLapsed && cn().status === "held" && (drift ? dv(sc) === d0 : true), {status: cn().status, drift: dv(sc)});

    // 6. A raid lost
    await setCaern({raid: {foe: "wyrm", strength: 2, at: t0, what: "fomori from the mill"}});
    const r6 = await K.raid("gate-caern", {outcome: "lost"});
    ok("6. a raid lost", r6?.ok && cn().level === 1 && !cn().raid && (drift ? dv(sc) === d0 + 1 : true), {level: cn().level, drift: dv(sc)});

    // 7. A caern war
    await setCaern({level: 3, garou: 0, offices: {}});
    const r7 = await K.war("gate-caern", {sept: "Sept of the Hill", garou: 200, rank: 6, defRank: 0});
    ok("7. a caern war", r7?.won && cn().sept === "Sept of the Hill" && !Object.keys(cn().offices).length && cn().level === 2, {us: r7?.us, them: r7?.them, sept: cn().sept});

    // 8. Long untended, the caern dies
    await setCaern({level: 1, status: "held", lastMoot: t0, missed: 0});
    await P.run({stamp: t0 + 4 * MONTH});
    ok("8. the caern dies", cn().status === "dead" && newMsgs().some(m => /caern dies/.test(m.content)), {status: cn().status});

    // 9. Taken back from the Wyrm
    await setCaern({status: "wyrm", level: 0});
    const r9 = await K.reclaim("gate-caern", {garou: 200, rank: 6});
    ok("9. taken back", r9?.won && cn().status === "lapsed" && cn().level === 1, {status: cn().status});

    // 10. The window
    const pw = await peek(() => P.open(), "wst-power", "the Spring");
    ok("10. the window", /caern of Rage/.test(pw) && /Hold the moot/.test(pw) && /New caern/.test(pw), {window: pw.length});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      for ( const k of SET ) await game.settings.set(MOD, k, keep[k]);
      const mine = newMsgs().map(m => m.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      for ( const s of scenes ) await game.scenes.get(s.id)?.delete();
      for ( const x of actors ) await game.actors.get(x.id)?.delete();
      ok("11. clean up", !P.state().list.some(x => x.id.startsWith("gate-")) && scenes.every(s => !game.scenes.get(s.id)) && actors.every(x => !game.actors.get(x.id)));
    } catch (err) { ok("11. clean up", false, {error: err.message}); }
  }
  return save(R);
}
