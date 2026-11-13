/**
 * Places of power (WoDX Storyteller, B3450-B3456), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatepower.mjs?${Date.now()}`)).run()
 * It keeps the register and the setting it touches, makes one scene, one mage and two changelings of its own, and puts
 * everything back at the end. The clock never moves: the clock run is called with a stamp of its own.
 *   1. the modules: Storyteller with api.upkeep.power and its settings
 *   2. a Node, a chantry and a freehold go on the register
 *   3. the clock fills the Node to its cap, with one card
 *   4. meditation moves Quintessence into the mage, no more than the Avatar, and tends the Node tie
 *   5. gathering Tass puts it on the mage; absorbing it with Prime 3 raises Quintessence
 *   6. dreaming by the balefire gives each changeling Glamour, split, and tends the Holdings tie
 *   7. a member leaving the chantry takes their points and shrinks it
 *   8. lost balefire ranks come back over a month of the clock run
 *   9. Node, Chantry and Holdings show as ties
 *  10. the windows: Upkeep has Places of power; the register window lists the three
 *  11. clean up
 * Result: Data/wodx-gate/gatepower-result.json.
 */
const MOD = "wodx-storyteller";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 11;
const DAY = 86400, WEEK = 7 * DAY;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatepower-result.json", {type: "application/json"});
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
  const M = game.modules.get(MOD), U = M?.api?.upkeep, P = U?.power;
  const has = k => game.settings.settings.has(k);
  const SET = ["placesOfPower", "powerState"].filter(k => has(`${MOD}.${k}`));
  const keep = Object.fromEntries(SET.map(k => [k, foundry.utils.deepClone(game.settings.get(MOD, k))]));
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const scenes = [], actors = [];
  const newMsgs = () => game.messages.contents.filter(m => !msgsBefore.has(m.id));
  const place = id => P.state().list.find(x => x.id === id);
  const bg = (name, value) => ({name, type: "Feature", system: {type: "wod.types.background", value}});
  try {
    ok("1. modules", M?.active && typeof P?.meditate === "function" && typeof P?.run === "function" && SET.length === 2, {storyteller: M?.version});
    await game.settings.set(MOD, "placesOfPower", true);
    await game.settings.set(MOD, "powerState", P.rules.blankState());
    const sc = await Scene.create({name: "WoDX gate: places of power", width: 800, height: 600, padding: 0});
    scenes.push(sc);
    const [mage, fae1, fae2] = await Actor.create([
      {name: "WoDX gate: power mage", type: "Mage", system: {quintessence: {temporary: 0}, paradox: {temporary: 0}, spheres: {prime: {value: 3}}}},
      {name: "WoDX gate: power keeper", type: "Changeling", system: {advantages: {glamour: {permanent: 6, temporary: 1}, banality: {permanent: 3, temporary: 0}}}},
      {name: "WoDX gate: power guest", type: "Changeling", system: {advantages: {glamour: {permanent: 6, temporary: 1}, banality: {permanent: 3, temporary: 0}}}}]);
    actors.push(mage, fae1, fae2);
    await mage.createEmbeddedDocuments("Item", [{name: "Avatar", type: "Feature", system: {type: "wod.types.background", value: 3}}, bg("Node", 2), bg("Chantry", 2)]);
    await fae1.createEmbeddedDocuments("Item", [bg("Holdings", 3)]);

    // 2. The register
    const t0 = game.time.worldTime;
    const st = {v: 1, list: [
      {id: "gate-node", kind: "node", name: "WoDX gate: the Well", scene: sc.id, keepers: [mage.id], rating: 2, side: "mystic", tass: "water", last: t0},
      {id: "gate-chantry", kind: "chantry", name: "WoDX gate: the House", scene: sc.id, keepers: [mage.id], members: [{actor: mage.id, name: mage.name, points: 15}, {actor: "gone-npc", name: "An old member", points: 10}]},
      {id: "gate-free", kind: "freehold", name: "WoDX gate: the Inn", scene: sc.id, keepers: [fae1.id], base: 3, rating: 3, form: "hearth", banality: 3}]};
    await game.settings.set(MOD, "powerState", st);
    ok("2. the register", P.state().list.length === 3 && P.placesIn(sc.id).length === 3, {list: P.state().list.map(x => x.kind)});

    // 3. The clock fills the Node
    const r3 = await P.run({stamp: t0 + 10 * WEEK});
    const cap = P.rules.nodeCap(place("gate-node"), Number(game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.()) || 2000);
    const card3 = newMsgs().find(m => /Places of power/.test(m.content) && /is full/.test(m.content));
    ok("3. the Node fills to its cap", place("gate-node").store.quint === cap.quint && place("gate-node").store.tass === cap.tass && !!card3, {store: place("gate-node").store, cap, lines: r3?.lines});

    // 4. Meditation
    const q0 = place("gate-node").store.quint;
    const r4 = await P.meditate("gate-node", mage.id, {turns: 5});
    const nodeTie = Object.entries(game.actors.get(mage.id).flags?.[MOD]?.ties ?? {}).find(([k]) => k.startsWith("node-"));
    ok("4. meditation", r4?.ok && game.actors.get(mage.id).system.quintessence.temporary === Math.min(3, q0) && place("gate-node").store.quint === q0 - r4.take && !!nodeTie,
      {take: r4?.take, quint: game.actors.get(mage.id).system.quintessence.temporary, tie: !!nodeTie});

    // 5. Tass
    await game.actors.get(mage.id).update({"system.quintessence.temporary": 0});
    const r5 = await P.gatherTass("gate-node", mage.id, 2);
    const carried = (game.actors.get(mage.id).flags?.[MOD]?.tass ?? []).reduce((s, t) => s + t.points, 0);
    const r5b = await P.absorbTass(mage.id, 2);
    ok("5. Tass gathered and absorbed", r5?.take === 2 && carried === 2 && r5b?.ok && game.actors.get(mage.id).system.quintessence.temporary === 2
      && !(game.actors.get(mage.id).flags?.[MOD]?.tass ?? []).length, {gathered: r5?.take, carried, quint: game.actors.get(mage.id).system.quintessence.temporary});

    // 6. Dreaming by the balefire
    const r6 = await P.dream("gate-free", [fae1.id, fae2.id]);
    const g1 = game.actors.get(fae1.id).system.advantages.glamour.temporary, g2 = game.actors.get(fae2.id).system.advantages.glamour.temporary;
    const holdTie = Object.keys(game.actors.get(fae1.id).flags?.[MOD]?.ties ?? {}).some(k => k.startsWith("freehold-"));
    ok("6. dreaming by the balefire", r6?.ok && g1 === 2 && g2 === 2 && holdTie && place("gate-free").lastHarvest !== null, {g1, g2, share: r6?.share, tie: holdTie});

    // 7. A member leaves
    const r7 = await P.memberLeaves("gate-chantry", "gone-npc");
    ok("7. a member leaves", r7?.lost === 10 && P.rules.chantryPool(place("gate-chantry")) === 15 && r7?.to === "Secure squat", {lost: r7?.lost, from: r7?.from, to: r7?.to});

    // 8. Lost ranks come back
    const st8 = P.state();
    st8.list = st8.list.map(x => (x.id === "gate-free" ? {...x, rating: 1, lastRegen: t0, lastTended: t0 + 10 * WEEK, lastFade: t0} : x));
    await game.settings.set(MOD, "powerState", st8);
    await P.run({stamp: t0 + 10 * WEEK + 31 * DAY});
    ok("8. lost ranks come back", place("gate-free").rating >= 2, {rating: place("gate-free").rating});

    // 9. Ties
    const ties = U.tiesOf?.(game.actors.get(mage.id)) ?? null;
    const kinds = (Array.isArray(ties) ? ties : ties?.ties ?? []).map(t => t.kind);
    ok("9. Node and Chantry are ties", kinds.includes("node") && kinds.includes("chantry"), {kinds});

    // 10. The windows
    const up = await peek(() => U.open(), "wodx-dialog", "Places of power");
    const pw = await peek(() => P.open(), "wst-power");
    ok("10. the windows", /Places of power/.test(up) && /wst-power-t/.test(pw) && /the Well/.test(pw) && /the House/.test(pw) && /the Inn/.test(pw), {upkeep: /Places of power/.test(up), window: pw.length});
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
