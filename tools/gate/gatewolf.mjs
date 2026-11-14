/**
 * Tribe, auspice and breed features gate (WoDX Chronicle 0.31.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatewolf.mjs?${Date.now()}`)).run()
 * Makes its own Garou, a Kitsune and a Kinfolk mortal, turns "Tribe, auspice and breed features (Werewolf)" on, and puts
 * the setting, actors, fights and chat cards back afterwards. The clock is not moved.
 *   1. the api and the setting
 *   2. rows stack: a Get of Fenris Ahroun metis has three; a Kitsune has its own row with the Beast Courts; Kinfolk have
 *      theirs; Croatan are gone by 1600
 *   3. roll effects reach the traits api: a Red Talon's Survival die; a metis deformity's social difficulty
 *   4. a Black Fury guards the scene; harm there sends a card, and its button gives a Rage point
 *   5. a Child of Gaia offers a truce; the button takes the NPCs out of the fight
 *   6. a Shadow Lord learns a failure and spends it: a favour card for the Ledger
 *   7. a Silver Fang with Paranoia hears a line on a talk card
 *   8. a Stargazer reads the stars when the sky is clear (refused under cloud, and the second time in a month)
 *   9. a Galliard's tale: the button gives the teller Wisdom
 *  10. a Philodox ruling is posted for all; a Nagah verdict goes to the Storyteller alone
 *  11. an Ahroun goes first when a fight with a Black Spiral Dancer begins
 *  12. harm to Kinfolk sends a card for a Garou of that tribe
 *  13. every other WoDX module still answers, and a vampire has no row while the Vampire switch is off
 * Result: Data/wodx-gate/gatewolf-result.json.
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

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.signatures, S = () => api().rules;
  const t0 = Date.now(), was = {w: game.settings.get(C, "sigWerewolf"), v: game.settings.get(C, "sigVampire")};
  const sig = a => game.actors.get(a.id)?.flags?.[C]?.sig ?? {};
  const cards = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-sig"));
  const lastCard = () => cards().at(-1);
  const press = async msg => { const el = document.createElement("div"); el.innerHTML = msg.content; Hooks.callAll("renderChatMessageHTML", msg, el); el.querySelector("[data-wct-sig-act]")?.click(); };
  const wolf = (name, tribe, auspice, breed = "homid", more = {}) => ({name, type: "Werewolf", ...more,
    system: {tribe, auspice, breed, advantages: {rage: {permanent: 5, temporary: 2}}, ...(more.system ?? {})}});
  let actors = [], fights = [];
  try {
    await game.settings.set(C, "sigWerewolf", true);
    await game.settings.set(C, "sigVampire", false);
    actors = await Actor.create([
      wolf("WoDX gate: Fury", "Black Furies", "Theurge"), wolf("WoDX gate: Gaia", "Children of Gaia", "Philodox"),
      wolf("WoDX gate: Lord", "Shadow Lords", "Ragabash"), wolf("WoDX gate: Fang", "Silver Fangs", "Philodox", "homid", {system: {derangement: "Paranoia"}}),
      wolf("WoDX gate: Gazer", "Stargazers", "Theurge"), wolf("WoDX gate: Bard", "Fianna", "Galliard"),
      wolf("WoDX gate: Ahroun", "Get of Fenris", "Ahroun", "metis", {ownership: {default: 3}}), wolf("WoDX gate: Talon", "Red Talons", "Ahroun", "lupus"),
      wolf("WoDX gate: Spiral", "Black Spiral Dancers", "Ahroun"),
      {name: "WoDX gate: Kitsune", type: "Changing Breed", system: {changingbreed: "Kitsune", breed: "Roko"}},
      {name: "WoDX gate: Nagah", type: "Changing Breed", system: {changingbreed: "Nagah", breed: "Vasuki"}},
      {name: "WoDX gate: Kin", type: "Mortal", flags: {world: {wodx: {kinfolk: "fenrir"}}}},
      {name: "WoDX gate: Vampire", type: "Vampire", system: {clan: "toreador", generation: 12}}]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.31.0") && typeof api()?.rowsOf === "function" && game.settings.get(C, "sigWerewolf") === true, {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const stack = api().rowsOf(by("Ahroun")).map(r => r.key), kit = api().rowsOf(by("Kitsune"))[0], kin = api().rowOf(by("Kin"))?.key;
      const gone = S().goneBy(S().rowIn(S().TRIBES, "Croatan"), 1600);
      ok("2 rows", JSON.stringify(stack) === JSON.stringify(["fenris", "ahroun", "metis"]) && kit?.key === "kitsune" && kit.text.includes("Beast Courts") && kin === "kinfolk" && gone, {stack, kit: kit?.key, kin});
    });
    await step("3 roll effects", async () => {
      const T = game.modules.get(C).api.traits, t = by("Talon"), m = by("Ahroun");
      const surv = T.effects(t, {channel: "roll", tags: T.rules.rollTags("survival")});
      await api().setDeformity(m, "hairless");
      const soc = T.effects(m, {channel: "roll", tags: ["social"]});
      ok("3 roll effects", surv.some(e => e.name === "Red Talons" && e.dice === 1) && soc.some(e => /metis/i.test(e.name) && e.diff === 1), {surv: surv.length, soc: soc.length});
    });
    await step("4 Black Fury", async () => {
      const f = by("Fury"), sc = canvas.scene;
      await api().guardPlace(f, sc);
      const n = await api().desecrated(sc, "A shrine was broken");
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "rage");
      await press(lastCard());
      await until(() => Number(game.actors.get(f.id)?.system?.advantages?.rage?.temporary) === 3);
      ok("4 Black Fury", n === 1 && sig(f).guard?.scene === sc.id && Number(game.actors.get(f.id).system.advantages.rage.temporary) === 3, {n});
    });
    await step("5 truce", async () => {
      const g = by("Gaia"), sp = by("Spiral");
      const [c] = await Combat.create([{scene: null}]); fights.push(c.id);
      await c.createEmbeddedDocuments("Combatant", [{actorId: g.id}, {actorId: sp.id}]);
      await api().offerTruce(g, c);
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "truce");
      await press(lastCard());
      await until(() => game.combats.get(c.id)?.combatants.size === 0);
      ok("5 truce", game.combats.get(c.id)?.combatants.size === 0, {left: game.combats.get(c.id)?.combatants.size});
    });
    await step("6 Shadow Lord", async () => {
      const l = by("Lord");
      const n = await api().leverage(l, {who: "Old Grey", what: "a botched rite"});
      await api().spendLeverage(l, 0);
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "boon");
      ok("6 Shadow Lord", n === 1 && !sig(l).leverage?.length && lastCard()?.content?.includes("Old Grey"), {n});
    });
    await step("7 Silver Fang", async () => {
      const line = api().hearAs(by("Fang"), {topic: "the sept", name: "the elder"});
      ok("7 Silver Fang", !!line && api().hearAs(by("Lord"), {topic: "x"}) === null, {line});
    });
    await step("8 Stargazer", async () => {
      const g = by("Gazer"), wx = game.modules.get("wodx-atmosphere")?.api?.weather?.now?.() ?? null, clear = S().skyClear(wx);
      const r1 = await api().readSky(g), r2 = await api().readSky(g);
      ok("8 Stargazer", clear ? (!!r1 && r2 === null && sig(g).skyAt != null) : (r1 === null && sig(g).skyAt == null), {clear, sky: wx?.sky ?? null});
    });
    await step("9 Galliard", async () => {
      const b = by("Bard"), before = Number(b.system.renown?.wisdom?.temporary) || 0, perm = Number(b.system.renown?.wisdom?.permanent) || 0;
      await api().tale(b, {hero: "WoDX gate: Ahroun", what: "held the bridge"});
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "renown");
      await press(lastCard());
      await until(() => (Number(game.actors.get(b.id)?.system?.renown?.wisdom?.temporary) || 0) + (Number(game.actors.get(b.id)?.system?.renown?.wisdom?.permanent) || 0) > before + perm);
      const after = (Number(game.actors.get(b.id).system.renown?.wisdom?.temporary) || 0) + (Number(game.actors.get(b.id).system.renown?.wisdom?.permanent) || 0);
      ok("9 Galliard", after > before + perm, {before: before + perm, after});
    });
    await step("10 rulings", async () => {
      const p = await api().ruling(by("Gaia"), {between: "two cubs", verdict: "Share the kill"});
      const s = await api().ruling(by("Nagah"), {between: "a Garou", verdict: "Guilty of breaking the Litany"});
      ok("10 rulings", p && !p.whisper?.length && s && s.whisper?.length > 0, {});
    });
    await step("11 Ahroun first", async () => {
      const a = by("Ahroun"), sp = by("Spiral");
      const [c] = await Combat.create([{scene: null}]); fights.push(c.id);
      await c.createEmbeddedDocuments("Combatant", [{actorId: sp.id, initiative: 14}, {actorId: a.id, initiative: 3}]);
      await c.startCombat();
      await until(() => game.combats.get(c.id)?.combatants.find(x => x.actorId === a.id)?.initiative > 14);
      const ini = game.combats.get(c.id)?.combatants.find(x => x.actorId === a.id)?.initiative;
      ok("11 Ahroun first", ini > 14, {ini});
    });
    await step("12 Kinfolk", async () => {
      const n0 = cards().length;
      Hooks.callAll("wodxDamageApplied", by("Kin"));
      await until(() => cards().length > n0 && lastCard()?.content?.includes("Kinfolk"));
      ok("12 Kinfolk", lastCard()?.content?.includes("WoDX gate: Kin") && lastCard()?.content?.includes("Get of Fenris"), {});
    });
    await step("13 other modules", async () => {
      const mods = ["wodx-actions", "wodx-combat", "wodx-npc", "wodx-storyteller", "wodx-library"].filter(m => game.modules.get(m)?.active && !game.modules.get(m)?.api);
      ok("13 other modules", !mods.length && api().rowsOf(by("Vampire")).length === 0, {missing: mods});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      for ( const id of fights ) await game.combats.get(id)?.delete();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      await game.settings.set(C, "sigWerewolf", was.w);
      await game.settings.set(C, "sigVampire", was.v);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatewolf-result.json");
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gatewolf", runGate);
