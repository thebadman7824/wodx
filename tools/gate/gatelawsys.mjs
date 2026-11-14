/**
 * The law's systems (WoDX Chronicle, B3604-B3621), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelawsys.mjs?${Date.now()}`)).run()
 * Makes one actor "WoDX gate law: Culprit" and deletes it, and every chat card it made, after. The law's heat is put
 * back as it was; the clock does not move; the Future Darkness rows are set back to the house rule.
 *   1. every part of api.law is there
 *   2. three named thefts raise the heat to a warrant, with a stage card
 *   3. an arrest brings a trial card with the land's forms of trial
 *   4. a sentence leaves its mark, and the player's lines name it
 *   5. a new self on paper: the project's difficulty, and the self on the actor
 *   6. standing before the law reads a class
 *   7. taxes: the 1630 levy in Moravia is crushing; a month's pay with the taxes kept back pays the share into the bank
 *   8. a turn of rule (no kinds, so no seats move) whispers the Storyteller its card
 *   9. the Future Darkness rows lay on only when switched on, and are marked as speculation
 *  10. every other WoDX module still answers
 * Result: Data/wodx-gate/gatelawsys-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const ch = () => game.modules.get("wodx-chronicle")?.api;
  const msgsBefore = new Set(game.messages.map(m => m.id));
  const heat0 = foundry.utils.deepClone(game.settings.get("wodx-chronicle", "lawHeat") ?? {});
  const t0 = game.time.worldTime;
  let actor = null;
  const newCards = () => game.messages.filter(m => !msgsBefore.has(m.id));
  try {
    actor = await Actor.create({name: "WoDX gate law: Culprit", type: "Mortal", ownership: {default: 0, [game.user.id]: 3}});
    const law = ch()?.law, year = Number(ch()?.eras?.currentYear?.()) || 0, region = ch()?.world?.homeland?.() ?? "moravia";
    R.notes.push({year, region, version: game.modules.get("wodx-chronicle")?.version});

    await step("every part of api.law is there", async () => {
      const parts = ["heat", "trial", "sentence", "papers", "standing", "tax", "regime"];
      ok("every part of api.law is there", parts.every(p => law?.[p]), {missing: parts.filter(p => !law?.[p])});
    });

    await step("three named thefts make a warrant", async () => {
      for ( let i = 0; i < 3; i++ ) await law.heat.add(actor, "theft", {scene: null, named: true});
      const h = law.heat.of(actor.id, region);
      ok("three named thefts make a warrant", ["warrant", "manhunt"].includes(h?.stage?.key) && newCards().some(m => /Wanted|Manhunt/.test(m.content)), {stage: h?.stage?.key, heat: h?.heat});
    });

    await step("an arrest brings a trial card", async () => {
      await law.heat.arrest(actor.id, region);
      await wait(800);
      const card = newCards().find(m => m.flags?.["wodx-chronicle"]?.lawTrial);
      ok("an arrest brings a trial card", !!card && card.content.includes("data-action"), {forms: card ? [...card.content.matchAll(/data-form="([^"]+)"/g)].map(x => x[1]) : []});
    });

    await step("a sentence leaves its mark", async () => {
      const mark = await law.sentence.pass({actorId: actor.id, name: actor.name, region, year, weight: 3}, "prison");
      const lines = ch().law.sentence.marksOf(actor);
      ok("a sentence leaves its mark", mark?.kind === "time" && lines.length === 1 && lines[0].until > year, {mark});
    });

    await step("a new self on paper", async () => {
      const p = law.papers.project(null, year);
      const self = await law.papers.addSelf(actor, {name: "Gate Other Name", quality: 3, region, year});
      ok("a new self on paper", p.diff >= 5 && p.goal >= 3 && self?.current && law.papers.selvesOf(actor).length === 1, {project: p});
    });

    await step("standing before the law reads a class", async () => {
      const s = law.standing.of(actor, region, year);
      ok("standing before the law reads a class", ["unfree", "common", "clergy", "noble", "wealthy"].includes(s?.cls), {standing: s});
    });

    await step("taxes: a crushing levy and a dodger's share", async () => {
      const tw = law.tax.here("moravia", 1630);
      const money = game.modules.get("wodx-storyteller")?.api?.upkeep?.money;
      const before = money?.purse?.(actor)?.bank ?? 0;
      await actor.setFlag("wodx-chronicle", "taxDodge", true);
      const lines = await law.tax.month({paid: {[actor.id]: 1000}});
      const after = money?.purse?.(actor)?.bank ?? 0;
      ok("taxes: a crushing levy and a dodger's share", tw.crushing && tw.levy > 0 && after > before && lines.some(l => l.includes("keeps back")), {before, after, share: law.tax.here(region, year).share});
    });

    await step("a turn of rule whispers its card", async () => {
      await law.regime.turn({region, year, cause: "form", kinds: [], chance: 0, note: "WoDX gate law turn", words: "A gate check."});
      const card = newCards().find(m => m.content.includes("WoDX gate law turn"));
      ok("a turn of rule whispers its card", !!card && (card.whisper ?? []).length > 0);
    });

    await step("the Future Darkness rows only when switched on", async () => {
      const off = law.of("moravia", 2045);
      law.rules.setFuture(true);
      const on = law.of("moravia", 2045);
      law.rules.setFuture(!!game.settings.get("wodx-chronicle", "rule.futureBranch"));
      ok("the Future Darkness rows only when switched on", on.spec && on.order.includes("corporate") && (off.spec === false || game.settings.get("wodx-chronicle", "rule.futureBranch")), {offSpec: off.spec});
    });

    await step("every other WoDX module still answers", async () => {
      const ids = ["wodx-chronicle", "wodx-storyteller", "wodx-npc", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-atmosphere", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("every other WoDX module still answers", !missing.length, {missing});
    });
  } finally {
    try { await game.settings.set("wodx-chronicle", "lawHeat", heat0); } catch (e) { R.errors.push(`heat back: ${e.message}`); }
    try { const mine = newCards().map(m => m.id); if ( mine.length ) await ChatMessage.deleteDocuments(mine); } catch (e) { R.errors.push(`cleanup messages: ${e.message}`); }
    try { if ( actor ) await actor.delete(); } catch (e) { R.errors.push(`cleanup actor: ${e.message}`); }
    if ( game.time.worldTime !== t0 ) { try { await game.time.advance(t0 - game.time.worldTime); } catch (e) { R.errors.push(`clock back: ${e.message}`); } }
  }
  return save(R, "gatelawsys-result.json");
}
