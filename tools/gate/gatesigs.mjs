/**
 * Clan features gate (WoDX Chronicle 0.30.0 or later), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesigs.mjs?${Date.now()}`)).run()
 * Makes its own vampires and a mortal, turns "Clan features (Vampire)" on, and puts the setting, actors and chat cards
 * back afterwards. The clock is not moved: weeks are made by setting a Muse's last visit back.
 *   1. the api and the setting
 *   2. each clan finds its row (Toreador, Followers of Set, Brujah, Gangrel, Ventrue)
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
 *  14. a Nosferatu talks to a mortal: a true face card with a breach button; a page of secrets is made
 *  15. a Tremere order from a Regent to an apprentice (seven ranks apart): Refuse costs two Willpower
 *  16. a Ventrue's influence: a boon card once a month (the second is refused)
 *  17. an Assamite contract kept raises standing; an overdue one fails at the tick
 *  18. a Giovanni binds and calls a wraith
 *  20. a ghoul unfed for two months gets a card; a Grimaldi revenant finds its family row; a family founded by the Storyteller is kept (the list is put back)
 *  19. bloodlines: a True Brujah finds its own row and roll effects; a Gargoyle talking to a mortal gets a breach card
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

async function runGate(K) {
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
      vamp("WoDX gate: Ravnos", "ravnos"), vamp("WoDX gate: Caitiff", "caitiff"), vamp("WoDX gate: Nosferatu", "nosferatu"),
      vamp("WoDX gate: Tremere", "tremere"), vamp("WoDX gate: Tremere Regent", "tremere"), vamp("WoDX gate: Assamite", "assamite"), vamp("WoDX gate: Giovanni", "giovanni"),
      vamp("WoDX gate: True Brujah", "custom", "True Brujah"), vamp("WoDX gate: Gargoyle", "custom", "Gargoyle"),
      {name: "WoDX gate: Ghoul", type: "Mortal", flags: {world: {wodx: {profile: "ghoul"}}}}, {name: "WoDX gate: Grimaldi", type: "Mortal", flags: {world: {wodx: {profile: "ghoul"}}, [C]: {family: "Grimaldi"}}}]);
    const by = n => actors.find(a => a.name === `WoDX gate: ${n}`);
    await step("1 api", async () => {
      ok("1 api", atLeast(game.modules.get(C).version, "0.30.0") && typeof api()?.tick === "function" && game.settings.get(C, "sigVampire") === true,
        {version: game.modules.get(C).version});
    });
    await step("2 rows", async () => {
      const keys = ["Toreador", "Setite", "Brujah", "Gangrel", "Ventrue"].map(n => api().rowOf(by(n))?.key ?? null);
      ok("2 rows", JSON.stringify(keys) === JSON.stringify(["toreador", "setite", "brujah", "gangrel", "ventrue"]), {keys});
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
    await step("14 Nosferatu", async () => {
      const nf = by("Nosferatu"), m = by("Mark");
      Hooks.callAll("wodxSocial", {actor: nf, npc: m, act: "persuade", result: "win"});
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "breach");
      const face = lastCard()?.flags?.[C]?.sigAct?.key === "breach";
      const page = await api().secret(nf, {about: "the gate", text: "a test"});
      ok("14 Nosferatu", face && !!page?.flags?.[C]?.secret && api().rules.isSecretPage(page.name), {face, page: page?.name});
    });
    await step("15 Tremere order", async () => {
      const ap = by("Tremere"), rg = by("Tremere Regent");
      await api().setRank(rg, 7); await api().setRank(ap, 0);
      await ap.update({"system.advantages.willpower.permanent": 10, "system.advantages.willpower.temporary": 5});
      await api().order(rg, ap, "Fetch the folio");
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "refuse");
      const msg = lastCard(), el = document.createElement("div"); el.innerHTML = msg.content;
      Hooks.callAll("renderChatMessageHTML", msg, el);
      el.querySelector("[data-wct-sig-act]")?.click();
      await until(() => Number(game.actors.get(ap.id)?.system?.advantages?.willpower?.temporary) === 3);
      const wp = Number(game.actors.get(ap.id)?.system?.advantages?.willpower?.temporary);
      ok("15 Tremere order", wp === 3 && (await api().order(ap, rg, "no")) === null, {wp});
    });
    await step("16 Ventrue influence", async () => {
      const v = by("Ventrue");
      const one = await api().influence(v), two = await api().influence(v);
      ok("16 Ventrue influence", !!one && two === null && lastCard()?.flags?.[C]?.sigAct?.key === "boon", {one, two});
    });
    await step("17 Assamite contract", async () => {
      const as = by("Assamite");
      const c1 = await api().contract(as, {target: "the reeve", price: 50, days: 10});
      const r = await api().settle(as, c1.id, true);
      const c2 = await api().contract(as, {target: "the bailiff", price: 10, days: 1});
      const list = sig(as).contracts.map(c => c.id === c2.id ? {...c, due: game.time.worldTime - 1} : c);
      await as.update({[`flags.${C}.sig.contracts`]: list});
      await api().tick({force: true});
      await until(() => sig(as).contracts?.find(c => c.id === c2.id)?.status === "failed");
      ok("17 Assamite contract", r?.standing === 2 && r?.tithe === 5 && sig(as).contracts.find(c => c.id === c2.id)?.status === "failed" && sig(as).standing === 1, {standing: sig(as).standing});
    });
    await step("18 Giovanni dead", async () => {
      const g = by("Giovanni");
      const w = await api().bindWraith(g, {name: "Old Marta", fetter: "a wedding ring"});
      const called = await api().callWraith(g, w.id);
      ok("18 Giovanni dead", called?.name === "Old Marta" && sig(g).servants?.length === 1, {servants: sig(g).servants});
    });
    await step("19 bloodlines", async () => {
      const tb = by("True Brujah"), gg = by("Gargoyle"), m = by("Mark");
      const key = api().rowOf(tb)?.key, fx = api().effects(tb);
      Hooks.callAll("wodxSocial", {actor: gg, npc: m, act: "persuade", result: "win"});
      await until(() => lastCard()?.flags?.[C]?.sigAct?.key === "breach" && lastCard()?.content?.includes("Gargoyle"));
      ok("19 bloodlines", key === "truebrujah" && fx.some(e => e.tags.includes("empathy")) && lastCard()?.content?.includes("Gargoyle"), {key, fx: fx.length});
    });
    await step("20 ghouls", async () => {
      const gh = by("Ghoul"), gr = by("Grimaldi"), fams = game.settings.get(C, "sigFamilies");
      const kind = api().rowOf(gh)?.feature;
      await gh.update({[`flags.${C}.sig`]: {ghoul: {fedAt: game.time.worldTime - 61 * 86400, warned: 0}}});
      await api().tick({force: true});
      await until(() => sig(gh).ghoul?.warned === 2);
      const fam = api().rowOf(gr)?.key;
      const made = await api().foundFamily({name: "Gatewardens", trait: "war", disciplines: "Potence, Fortitude", year: 1197});
      const kept = game.settings.get(C, "sigFamilies").some(f => f.key === "gatewardens");
      await game.settings.set(C, "sigFamilies", fams);
      ok("20 ghouls", kind === "ghoul" && sig(gh).ghoul?.warned === 2 && fam === "family-grimaldi" && made?.approved && kept, {kind, fam, warned: sig(gh).ghoul?.warned});
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

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gatesigs", runGate);
