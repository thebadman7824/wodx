/**
 * The law of the land (WoDX Chronicle, B3490-B3492), in rothenstein-wodx (the testing world), as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelaw.mjs?${Date.now()}`)).run()
 * Makes two scenes "WoDX gate law: Brno" and "WoDX gate law: Cairo"; deletes them and every chat card it made after.
 * The clock does not move; the lawYear setting is put back.
 *   1. api.law is there
 *   2. the record for a homeland scene is the rules' record for the homeland and the year
 *   3. a scene in another region reads that region's law (Cairo: the stand-in until the Islamic family is written)
 *   4. the Law here card is whispered and names who rules
 *   5. a clock jump note lists what changed (lawYear set back a century, then restored)
 *   6. the Law here button is in the token controls
 *   7. every other WoDX module still answers
 * Result: Data/wodx-gate/gatelaw-result.json.
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
  const ch = () => game.modules.get("wodx-chronicle")?.api;
  const scenes = [], msgsBefore = new Set(game.messages.map(m => m.id));
  const t0 = game.time.worldTime, seen0 = game.settings.get("wodx-chronicle", "lawYear");
  try {
    const made = await Scene.create([{name: "WoDX gate law: Brno", width: 1000, height: 1000, padding: 0}, {name: "WoDX gate law: Cairo", width: 1000, height: 1000, padding: 0}]);
    const brno = made.find(x => x.name.endsWith("Brno")), cairo = made.find(x => x.name.endsWith("Cairo"));
    scenes.push(brno, cairo);
    await cairo.update({"flags.wodx-chronicle.place.region": "egypt"});
    const year = Number(ch()?.eras?.currentYear?.()) || 0, home = ch()?.world?.homeland?.();
    R.notes.push({year, homeland: home, version: game.modules.get("wodx-chronicle")?.version});

    await step("api.law is there", async () => {
      const a = ch()?.law;
      ok("api.law is there", typeof a?.here === "function" && typeof a?.card === "function" && typeof a?.of === "function" && !!a?.rules?.FAMILIES?.latin);
    });
    await step("a homeland scene reads the homeland's law", async () => {
      const got = ch().law.here(brno, year), want = ch().law.of(home, year);
      ok("a homeland scene reads the homeland's law", got.region === home && got.rule.ruler === want.rule.ruler && got.crimes.length === want.crimes.length,
        {region: got.region, ruler: got.rule.ruler, family: got.family});
    });
    await step("a scene abroad reads its own region", async () => {
      const got = ch().law.here(cairo, year);
      ok("a scene abroad reads its own region", got.region === "egypt" && (got.family !== "custom" || got.guess === true), {family: got.family, guess: got.guess});
    });
    await step("the Law here card is whispered", async () => {
      const before = game.messages.size;
      await ch().law.card({scene: brno, full: true});
      const m = game.messages.contents.at(-1);
      ok("the Law here card is whispered", game.messages.size === before + 1 && /Law here/.test(m?.content ?? "") && m?.whisper?.includes(game.user.id), {});
    });
    await step("a clock jump note lists what changed", async () => {
      await game.settings.set("wodx-chronicle", "lawYear", Math.max(1, year - 100));
      const changes = await ch().law.checkYear();
      const want = ch().law.changes(home, Math.max(1, year - 100), year);
      ok("a clock jump note lists what changed", changes.length === want.length && game.settings.get("wodx-chronicle", "lawYear") === year, {n: changes.length});
    });
    await step("the Law here button is in the token controls", async () => {
      const controls = ui.controls?.controls ?? {};
      const tokens = controls.tokens ?? controls.token ?? (Array.isArray(controls) ? controls.find(c => c.name === "token" || c.name === "tokens") : null);
      const tools = tokens?.tools ?? {};
      const has = Array.isArray(tools) ? tools.some(t => t.name === "wodxLaw") : !!tools.wodxLaw;
      ok("the Law here button is in the token controls", has);
    });
    await step("every other WoDX module still answers", async () => {
      const ids = ["wodx-chronicle", "wodx-storyteller", "wodx-npc", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-interactables", "wodx-senses", "wodx-atmosphere", "wodx-otherworlds", "wodx-library", "wodx-sheets"];
      const missing = ids.filter(id => game.modules.get(id)?.active && !game.modules.get(id)?.api);
      ok("every other WoDX module still answers", !missing.length, {missing});
    });
  } catch (e) {
    R.errors.push(String(e?.stack ?? e));
  } finally {
    try { const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id); if ( mine.length ) await ChatMessage.deleteDocuments(mine); } catch (e) { R.errors.push(`cleanup messages: ${e.message}`); }
    try { await game.settings.set("wodx-chronicle", "lawYear", seen0); } catch (e) { R.errors.push(`restore lawYear: ${e.message}`); }
    try { if ( scenes.length ) await Scene.deleteDocuments(scenes.filter(Boolean).map(s => s.id)); } catch (e) { R.errors.push(`cleanup scenes: ${e.message}`); }
    if ( game.time.worldTime !== t0 ) R.errors.push("the clock moved");
  }
  return save(R, "gatelaw-result.json");
}
