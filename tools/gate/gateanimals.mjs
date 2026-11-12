/**
 * Animal archetypes gate (WoDX NPC 0.21.0), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateanimals.mjs?${Date.now()}`)).run()
 * Makes one Creature actor, reads its profile and routine, then deletes it. The clock is not moved.
 *   1. the api is 0.21.0, with 16 animal templates and the new place kinds
 *   2. a Creature named "grey wolf" takes the wolf template and its routine
 *   3. the actor flag wodx-npc.animal wins over the name (cat), and the cat keeps the alley at night
 *   4. a wraith foe sends a horse running; a Kindred foe does not stop a guard dog
 *   5. every other WoDX module still answers
 * Result: Data/wodx-gate/gateanimals-result.json.
 */
async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.world.id === "rothenstein-live" ) return "Not on the Live world.";
  const api = game.modules.get("wodx-npc")?.api;
  let actor;
  try {
    await step("api", async () => {
      const animals = Object.values(api.rules.TEMPLATES).filter(t => t.animal).length;
      ok("api", api.version.startsWith("0.21") && animals === 16 && !!api.routineRules.PLACE_KINDS.sewer && !!api.routineRules.PLACE_KINDS.alley, {version: api.version, animals});
    });
    actor = await Actor.create({name: "WoDX gate grey wolf", type: "Creature"});
    await step("wolf by name", async () => {
      const p = api.profileFor(actor);
      const blocks = api.routines.blocksFor(actor);
      ok("wolf by name", p.template === "wolf" && blocks.some(b => b.activity === "hunt" && b.place === "wilds"), {template: p.template, kind: game.wodxCombat?.getKind?.(actor)});
    });
    await step("flag wins", async () => {
      await actor.setFlag("wodx-npc", "animal", "cat");
      const p = api.profileFor(actor);
      const blocks = api.routines.blocksFor(actor);
      ok("flag wins", p.template === "cat" && blocks[0].place === "alley" && blocks[0].when === "night", {template: p.template});
    });
    await step("wraiths, not Kindred", async () => {
      const NR = api.rules, foe = more => ({id: "e", name: "Foe", visible: true, distance: 1, reach: true, wounds: 0, fearSources: [], attackDice: 4, ...more});
      const horse = NR.scoreOptions(NR.profileOf({}, "horse"), {self: {wounds: 0}, enemies: [foe({fearSources: ["wraith"]})], allies: []})[0].action;
      const dog = NR.scoreOptions(NR.profileOf({}, "guard-dog"), {self: {wounds: 0}, enemies: [foe({supernatural: true})], allies: []})[0].action;
      ok("wraiths, not Kindred", horse === "flee" && dog === "attack", {horse, dog});
    });
    await step("other modules", async () => {
      const ids = ["wodx-chronicle", "wodx-actions", "wodx-combat", "wodx-npc", "wodx-interactables", "wodx-library", "wodx-storyteller", "wodx-atmosphere"];
      const off = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("other modules", !off.length, {off});
    });
  } catch (e) { R.errors.push(e.message); }
  finally {
    try { if ( actor ) await actor.delete(); } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gateanimals-result.json");
}
