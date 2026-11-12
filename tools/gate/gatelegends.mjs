/**
 * Legends book gate (WoDX Chronicle 0.31.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelegends.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It holds the world, works on its own throwaway actors, scene, Ledger entry and faction, and puts back the book,
 * the Ledger, the factions, the session mark and the hold at the end.
 *   1. the module: WoDX Chronicle 0.31.0 or later with the legends API
 *   2. a build writes the journal "Legends of the Chronicle", open to everyone, with an About page
 *   3. a death and an Embrace on a gate actor become lines; the Embrace waits for the Storyteller
 *   4. a boon the Ledger marks kept becomes a line (WoDX Storyteller on)
 *   5. a scene that changes hands gives "passed from ... to ..." (WoDX Storyteller on)
 *   6. a court seat that changes holder gives "took" and "lost" lines (WoDX NPC on)
 *   7. the Legends window opens with a search box, and the person filter narrows it
 *   8. unticking a line takes it out of the players' journal
 *   9. a session ending in WoDX Storyteller brings the book up to date
 *  10. put everything back
 * Result: Data/wodx-gate/gatelegends-result.json.
 */
const M = "wodx-chronicle", ST = "wodx-storyteller", NPC = "wodx-npc", CR = "wodx-creation";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clone = v => foundry.utils.deepClone(v);

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) {
    ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"});
    return save(R, "gatelegends-result.json");
  }
  const api = game.modules.get(M)?.api;
  const on = id => !!game.modules.get(id)?.active;
  const get = (m, k) => { try { return clone(game.settings.get(m, k)); } catch (e) { return undefined; } };
  const saved = {legends: get(M, "legends"), held: !!api?.isHeld?.(), ledger: on(ST) ? get(ST, "ledger") : undefined,
    session: on(ST) ? get(ST, "session") : undefined, factions: on(NPC) ? get(NPC, "factions") : undefined};
  const made = {actors: [], scenes: []};
  const t = game.time.worldTime;
  const lines = () => api.legends.book().entries;
  const journal = () => game.journal.find(j => j.getFlag(M, "kind") === "legends");
  const jText = () => journal()?.pages.contents.map(p => p.text?.content ?? "").join(" ") ?? "";
  try {
    const mod = game.modules.get(M);
    ok("1. module", mod?.active && newer(mod.version, "0.31.0") && !!api?.legends?.build, {version: mod?.version});
    await api.hold(true);
    await api.legends.build();
    const j = journal();
    ok("2. journal", !!j && j.ownership.default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER && !!j.pages.getName("About this book"), {pages: j?.pages.size});

    const [dead, childe] = await Actor.createDocuments([
      {name: "Gate Legend Dead", type: "Mortal", flags: {[CR]: {chronology: {died: t - 86400 * 400, cause: "a gate's fever"}}}},
      {name: "Gate Legend Childe", type: "Vampire", flags: {[CR]: {chronology: {embraced: t - 86400 * 30}, lineage: {sire: {id: null, name: "Gate Legend Sire"}}}}}
    ]);
    made.actors.push(dead.id, childe.id);
    await api.legends.build();
    const d = lines().find(e => e.id === `death:${dead.id}`), em = lines().find(e => e.id === `embrace:${childe.id}`);
    ok("3. death and Embrace", !!d && d.shown && !!em && !em.shown && /Gate Legend Sire Embraced Gate Legend Childe/.test(em.text) && /Gate Legend Dead/.test(jText()) && !/Gate Legend Childe/.test(jText()),
      {death: d, embrace: em});

    if ( on(ST) ) {
      const led = clone(saved.ledger ?? {entries: []});
      led.entries = [...(led.entries ?? []), {id: "gatelegendboon", kind: "boon", size: "minor", status: "kept", from: {name: "Gate Debtor"}, to: {name: "Gate Creditor"},
        what: "A gate favour", made: t, history: [{at: t, what: "Marked Kept or paid."}]}];
      await game.settings.set(ST, "ledger", led); await sleep(300);
      await api.legends.build();
      ok("4. boon kept", lines().some(e => e.id === "ledger:gatelegendboon:kept" && /minor boon owed by Gate Debtor to Gate Creditor/.test(e.text)));

      const [sc] = await Scene.createDocuments([{name: "Gate Legend Haven", flags: {[ST]: {owner: {id: "", kind: "name", name: "Gate Owner One"}}}}]);
      made.scenes.push(sc.id);
      await api.legends.build();
      await sc.update({[`flags.${ST}.owner`]: {id: "", kind: "name", name: "Gate Owner Two"}}); await sleep(200);
      await api.legends.build();
      ok("5. holding changed hands", lines().some(e => e.text === "Gate Legend Haven passed from Gate Owner One to Gate Owner Two."));
    } else R.notes.push("WoDX Storyteller is off: steps 4, 5 and 9 skipped");

    if ( on(NPC) ) {
      const st = clone(saved.factions ?? {factions: []});
      const f = {id: "gatelegendcourt", name: "Gate Legend Court", kind: "kindred", members: [dead.id, childe.id], polity: "dark-ages-court",
        politics: {offices: {seneschal: [dead.id]}}};
      st.factions = [...(st.factions ?? []), f];
      await game.settings.set(NPC, "factions", st); await sleep(300);
      await api.legends.build();
      st.factions.find(x => x.id === f.id).politics.offices.seneschal = [childe.id];
      await game.settings.set(NPC, "factions", st); await sleep(300);
      await api.legends.build();
      const off = lines().filter(e => e.kind === "office" && e.faction === "Gate Legend Court").map(e => e.text);
      ok("6. court seat", off.some(x => /Gate Legend Childe took the seat of/.test(x)) && off.some(x => /Gate Legend Dead lost the seat of/.test(x)), {off});
    } else R.notes.push("WoDX NPC is off: step 6 skipped");

    await api.legends.open(); await sleep(600);
    const app = [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.classList.contains("wodx-legends-app"));
    const count = () => app?.element.querySelectorAll(".wodx-legend-row").length ?? 0;
    const all = count();
    const box = app?.element.querySelector('input[name="person"]');
    if ( box ) { box.value = "Gate Legend Dead"; box.dispatchEvent(new Event("change")); await sleep(600); }
    const some = count();
    ok("7. window and filter", !!app && !!app.element.querySelector("input.wodx-search") && all >= 2 && some >= 1 && some < all, {all, some});
    await app?.close();

    await api.legends.setShown(`death:${dead.id}`, false); await sleep(400);
    ok("8. hidden from players", !/Gate Legend Dead died/.test(jText()));

    if ( on(ST) ) {
      const [late] = await Actor.createDocuments([{name: "Gate Legend Late", type: "Mortal", flags: {[CR]: {chronology: {died: t - 3600}}}}]);
      made.actors.push(late.id);
      await game.settings.set(ST, "session", {at: t, real: Date.now()}); await sleep(1500);
      ok("9. session end builds", lines().some(e => e.id === `death:${late.id}`));
    }
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( made.actors.length ) await Actor.deleteDocuments(made.actors);
      if ( made.scenes.length ) await Scene.deleteDocuments(made.scenes);
      if ( saved.ledger !== undefined ) await game.settings.set(ST, "ledger", saved.ledger);
      if ( saved.session !== undefined ) await game.settings.set(ST, "session", saved.session);
      if ( saved.factions !== undefined ) await game.settings.set(NPC, "factions", saved.factions);
      await sleep(1500);
      await game.settings.set(M, "legends", saved.legends);
      await api.legends.build({quiet: true}); await sleep(300);
      await api?.hold?.(saved.held);
      const left = lines().filter(e => /Gate Legend|gatelegend/.test(`${e.text} ${e.id} ${e.faction}`));
      ok("10. put back", !left.length && game.time.worldTime === t && !!api?.isHeld?.() === saved.held && !/Gate Legend/.test(jText()), {left: left.map(e => e.id)});
    } catch (err) { ok("10. put back", false, {error: err.message}); }
  }
  return save(R, "gatelegends-result.json");
}
