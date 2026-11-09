/**
 * Knowledge-gated handouts (WoDX Chronicle 0.8.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateknow.mjs?${Date.now()}`)).run()
 * It makes a journal and three characters of its own and deletes them at the end.
 *   1. the module: Chronicle 0.8.0 or later, api.know, the @Know enricher registered
 *   2. the Storyteller sees every passage, marked with who may read it
 *   3. a character who speaks Latin reads the Latin passage; one who does not sees it scrambled
 *   4. three dots of Occult read the Occult 3 passage; one dot does not
 *   5. Auspex 2 reads through the seal
 *   6. the page's passages are listed
 *   7. clean up
 * Result: Data/wodx-gate/gateknow-result.json.
 */
const MOD = "wodx-chronicle";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TEXT = "<p>@Know[Latin]{Pax tecum, frater} and @Know[Occult 3]{the serpent sign} and @Know[Auspex 2]{under the wax}</p>";

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateknow-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), K = M?.api?.know;
  let journal = null;
  const actors = [];
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.8.0", M.version) && typeof K?.render === "function"
      && CONFIG.TextEditor.enrichers.some(e => e.id === `${MOD}.know`), {version: M?.version});
    journal = await JournalEntry.create({name: "WoDX gate: Know", pages: [{name: "Letter", type: "text", text: {content: TEXT, format: 1}}]});
    const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML(TEXT);
    const d = document.createElement("div"); d.innerHTML = html;
    const spans = [...d.querySelectorAll("span.wodx-know")];
    ok("2. the Storyteller sees all", spans.length === 3 && spans.every(s => s.classList.contains("wodx-know-yes") && /Shown to characters with/.test(s.title))
      && d.textContent.includes("Pax tecum, frater"), {titles: spans.map(s => s.title)});

    const mk = async (name, up) => { const a = await Actor.create({name: `WoDX gate: ${name}`, type: "Mortal"}); actors.push(a); if ( up ) await a.update(up); return game.actors.get(a.id); };
    const scholar = await mk("Scholar", {[`flags.${MOD}.languages`]: ["Latin"], "system.abilities.occult.value": 1});
    const occultist = await mk("Occultist", {"system.abilities.occult.value": 3});
    const seer = await mk("Seer");
    await seer.createEmbeddedDocuments("Item", [{name: "Auspex", type: "Power", system: {value: 2}}]).catch(e => R.notes.push(`Auspex item: ${e.message}`));
    await sleep(300);
    const as = (spec, text, a) => K.render(spec, text, {actors: [a]});
    const l1 = as("Latin", "Pax tecum, frater", scholar), l2 = as("Latin", "Pax tecum, frater", occultist);
    ok("3. Latin", l1.readable && l1.text === "Pax tecum, frater" && !l2.readable && l2.text !== "Pax tecum, frater", {l1, l2});
    const o1 = as("Occult 3", "the serpent sign", occultist), o2 = as("Occult 3", "the serpent sign", scholar);
    ok("4. Occult 3", o1.readable && !o2.readable && o2.script, {o1, o2, scholar: K.traitsOf(scholar).dots.occult, occultist: K.traitsOf(occultist).dots.occult});
    const s1 = as("Auspex 2", "under the wax", seer), s2 = as("Auspex 2", "under the wax", scholar);
    ok("5. through the seal", s1.readable && !s2.readable, {s1, s2, dots: K.traitsOf(seer).dots});
    const p = K.passages(journal.pages.contents[0].text.content);
    ok("6. passages", p.length === 3 && p[0].needs[0].key === "latin", {p});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      if ( journal ) await game.journal.get(journal.id)?.delete();
      for ( const a of actors ) await game.actors.get(a.id)?.delete();
      ok("7. clean up", (!journal || !game.journal.get(journal.id)) && actors.every(a => !game.actors.get(a.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
