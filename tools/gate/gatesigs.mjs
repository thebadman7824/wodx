/**
 * Clan features gate (WoDX Chronicle 0.27.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesigs.mjs?${Date.now()}`)).run()
 * Makes its own vampires and a mortal, turns "Clan features (Vampire)" on, and puts the setting, actors and chat cards
 * back afterwards. The clock is not moved: weeks are made by setting a Muse's last visit back.
 *   1. the api and the setting
 *   2. each clan finds its row (Toreador, Followers of Set, Brujah, Gangrel; a Ventrue has none)
 *   3. a Muse unseen for two weeks: Obsession 2 after the tick, and a card with Undo
 *   4. Undo on that card puts Obsession back to 0
 *   5. a Setite's won charm (wodxSocial) moves the mortal's Corruption to 1; a gift of brandy after the vice is set
 *      to drink (wodxTrade) moves it to 2
 *   6. a Brujah's Cause: three kept tempers make a Rant, and spending it empties it
 *   7. a Gangrel's frenzy leaves a mark that heals in 30 days, and its roll effects show
 *   8. a Malkavian with Paranoia: a glimpse a night (the second is refused) and a heard line for a talk card
 *   9. every other WoDX module still answers
 *  10. a Tzimisce carrying soil rests; without it the next night halves every pool
 *  11. a Lasombra in a scene marked watched: an empty frame card, if the year has cameras (the scene mark is put back)
 *  12. a Ravnos with a vice of lying: a persuasion is a chance (prompt), a deceit feeds the vice
 *  13. a thin-blooded Caitiff is rolled for this year's odd gift
 * Result: Data/wodx-gate/gatesigs-result.json.
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

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const C = "wodx-chronicle", api = () => game.modules.get(C)?.api?.signatures;
  const t0 = Date.now(), was = game.settings.get(C, "sigVampire");
  const sig = a => game.actors.get(a.id)?.flags?.[C]?.sig ?? {};
  const lastCard = () => game.messages.contents.filter(m => m.timestamp >= t0 && m.content?.includes("wct-sig")).at(-1);
  const vamp = (name, clan, custom = "") => ({name, type: "Vampire", system: {clan, custom: {clan: custom}, generation: 12}});
  let actors = [];
  try {
    await game.settings.set(C, "sigVampire", true);
    actors = await Actor.create([vamp("WoDX gate: Toreador", "toreador"), vamp("WoDX gate: Setite", "custom", "Followers of Set"),
      vamp("WoDX gate: Brujah", "brujah"), vamp("WoDX gate: Gangrel", "gangrel"), vamp("WoDX gate: Ventrue", "ventrue"),
      {name: "WoDX gate: Malkavian", type: "Vampire", system: {clan: "malkavian", generation: 12, derangement: "Paranoia"}},
      {name: "WoDX gate: Mark", type: "Mortal"}, vamp("WoDX gate: Tzimisce", "tzimisce"), vamp("WoDX gate: Lasombra", "lasombra"),
      vamp("WoDX gate: Ravnos", "ravnos"), vamp("WoDX gate: Caitiff", "caitiff")]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.27.0") && typeof api()?.tick === "function" && game.settings.get(C, "sigVampire") === true,
        {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const keys = ["Toreador", "Setite", "Brujah", "Gangrel", "Ventrue"].map(n => api().rowOf(by(n))?.key ?? null);
      ok("2 rows", JSON.stringify(keys) === JSON.stringify(["toreador", "setite", "brujah", "gangrel", null]), {keys});
    });
    await step("3 Muse tick", async () => {
      const t = by("Toreador"), m = await api().addMuse(t, {name: "The portrait", kind: "work"});
      const muses = sig(t).muses.map(x => ({...x, seen: game.time.worldTime - 15 * 86400, counted: game.time.worldTime - 15 * 86400}));
      await t.update({[`flags.${C}.sig.muses`]: muses});
      await api().tick({force: true});
      await until(() => sig(t).muses?.[0]?.obsession === 2);
      R.notes.push({muse: m?.name});
      ok("3 Muse tick", sig(t).muses?.[0]?.obsession === 2 && !!lastCard()?.flags?.[C]?.sigUndo, {obsession: sig(t).muses?.[0]?.obsession});
    });
    await step("4 Undo", async () => {
      const t = by("Toreador"), msg = lastCard();
      const el = document.createElement("div"); el.innerHTML = msg.content;
      Hooks.callAll("renderChatMessageHTML", msg, el);
      el.querySelector("[data-wct-sig-undo]")?.click();
      await until(() => sig(t).muses?.[0]?.obsession === 0);
      ok("4 Undo", sig(t).muses?.[0]?.obsession === 0, {obsession: sig(t).muses?.[0]?.obsession});
    });
    await step("5 Corruption", async () => {
      const s = by("Setite"), m = by("Mark");
      Hooks.callAll("wodxSocial", {actor: s, npc: m, act: "charm", result: "win"});
      await until(() => api().corruption(m)[s.id]?.step === 1);
      const one = api().corruption(m)[s.id]?.step;
      await api().setVice(m, s, "drink");
      Hooks.callAll("wodxTrade", {actor: s, npc: m, mode: "give", give: "a flask of brandy", want: null});
      await until(() => api().corruption(m)[s.id]?.step === 2);
      ok("5 Corruption", one === 1 && api().corruption(m)[s.id]?.step === 2 && api().corruption(m)[s.id]?.vice === "drink", {one, rec: api().corruption(m)[s.id]});
    });
    await step("6 Cause and Rant", async () => {
      const b = by("Brujah");
      await api().setCause(b, {key: "city"});
      let r; for ( let i = 0; i < 3; i++ ) r = await api().keptTemper(b);
      const ready = r?.ready, spent = await api().spendRant(b);
      ok("6 Cause and Rant", ready === true && spent === true && sig(b).cause?.rant === 0, {cause: sig(b).cause});
    });
    await step("7 Gangrel mark", async () => {
      const g = by("Gangrel");
      await g.update({"system.conditions.isfrenzy": true});
      await until(() => (sig(g).marks ?? []).length === 1);
      const mk = sig(g).marks?.[0], fx = api().effects(g);
      ok("7 Gangrel mark", !!mk && mk.until - mk.at === 30 * 86400 && fx.length > 0, {mark: mk, effects: fx.length});
      await g.update({"system.conditions.isfrenzy": false});
    });
    await step("8 Malkavian", async () => {
      const k = by("Malkavian");
      const g1 = await api().glimpse(k), g2 = await api().glimpse(k);
      const heard = api().hearAs(k, {topic: "News", name: "Old Jan", npcId: "x"});
      ok("8 Malkavian", !!g1?.text && g2 === null && typeof heard === "string" && !/[{}]/.test(heard), {g1, heard});
    });
    await step("9 other modules", async () => {
      const off = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-library"].includes(m.id)).map(m => m.id);
      ok("9 other modules", !!game.wodxCombat && off.length === 0, {off});
    });
    await step("10 Tzimisce soil", async () => {
      const z = by("Tzimisce");
      await z.update({[`flags.${C}.sig`]: {soil: {}}});
      const item = await api().giveSoil(z, "gate");
      await api().tick({force: true});
      await until(() => sig(z).soil?.checked != null);
      const rested = sig(z).soil?.short === 0;
      await item.delete();
      await z.update({[`flags.${C}.sig.soil.checked`]: game.time.worldTime - 86400});
      await api().tick({force: true});
      await until(() => sig(z).soil?.short === 1);
      const fx = api().effects(z);
      ok("10 Tzimisce soil", rested && sig(z).soil?.short === 1 && fx.some(e => e.halve), {soil: sig(z).soil});
    });
    await step("11 Lasombra frame", async () => {
      const l = by("Lasombra"), scene = canvas.scene, had = scene?.flags?.[C]?.camera ?? null;
      const year = api().year?.() ?? null;
      await api().setCamera(scene, true);
      const cam = await api().emptyFrame(l, scene);
      const again = await api().emptyFrame(l, scene);
      await api().setCamera(scene, had);
      const want = api().rules.cameraAt(year ?? 0);
      ok("11 Lasombra frame", year == null ? true : (want ? !!cam && again === null : cam === null), {year, cam: cam?.label ?? null, again});
    });
    await step("12 Ravnos vice", async () => {
      const r = by("Ravnos"), m = by("Mark");
      await api().setRavnosVice(r, "lying");
      await r.update({[`flags.${C}.sig.ravnos.fedAt`]: game.time.worldTime - 15 * 86400});
      Hooks.callAll("wodxSocial", {actor: r, npc: m, act: "persuade", result: "win"});
      await until(() => sig(r).ravnos?.askedAt != null);
      const asked = sig(r).ravnos?.askedAt != null;
      Hooks.callAll("wodxSocial", {actor: r, npc: m, act: "con", result: "win"});
      await until(() => sig(r).ravnos?.fedAt >= game.time.worldTime);
      ok("12 Ravnos vice", asked && sig(r).ravnos?.fedAt >= game.time.worldTime, {ravnos: sig(r).ravnos});
    });
    await step("13 Caitiff gift roll", async () => {
      const c = by("Caitiff");
      await c.createEmbeddedDocuments("Item", [{name: "Thin Blood", type: "Item"}]);
      await c.update({[`flags.${C}.sig`]: {odd: {}}});
      await api().tick({force: true});
      await until(() => sig(c).odd?.year != null);
      ok("13 Caitiff gift roll", Number.isFinite(sig(c).odd?.year), {odd: sig(c).odd});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try {
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const x of actors ) await game.actors.get(x?.id)?.delete();
      await game.settings.set(C, "sigVampire", was);
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatesigs-result.json");
}
