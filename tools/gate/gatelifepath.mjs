/**
 * Lifepath gate (WoDX Creation 0.11.0, Storyteller 0.34.1), in rothenstein-wodx, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatelifepath.mjs?${Date.now()}`)).run()
 * Makes its own characters and removes them, the people it made, the prelude journal and its chat cards afterwards.
 * The clock is not moved.
 *   1. the api and versions
 *   2. a character sheet gets the Lifepath button
 *   3. the window guesses a Toreador, plays every scene and saves the record with a chat card
 *   4. a person from the past becomes an NPC with a note, and the record names them
 *   5. the Embrace carries the lifepath to the new vampire
 *   6. the Storyteller's prelude journal shows the lifepath
 *   7. every line plays to the end in 1197, 1620, 1916, 2005 and 2050 (the Fallen from 1999)
 *   8. every other WoDX module still answers
 * Result: Data/wodx-gate/gatelifepath-result.json.
 */
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const atLeast = (v, min) => { const a = String(v ?? "").split(/[.-]/).map(Number), b = min.split(".").map(Number); for (let i = 0; i < b.length; i++) { if ((a[i] || 0) !== b[i]) return (a[i] || 0) > b[i]; } return true; };
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
  const M = "wodx-creation", api = () => game.modules.get(M)?.api;
  const t0 = Date.now();
  const made = [], journals = [];
  const flag = a => game.actors.get(a.id)?.flags?.[M]?.lifepath ?? null;
  const play = async app => {
    for ( let i = 0; i < 20 && app.element?.querySelector("[data-action=pick]"); i++ ) {
      app.element.querySelector("[data-action=pick]").click();
      await sleep(150);
    }
  };
  try {
    const [vamp, mortal] = await createActors([{name: "WoDX gate: Lifepath Toreador", type: "Vampire", system: {clan: "toreador", generation: 12}},
      {name: "WoDX gate: Lifepath Mortal", type: "Mortal"}]);
    made.push(vamp, mortal);

    await step("1 api", async () => ok("1 api", atLeast(game.modules.get(M).version, "0.11.0") && typeof api()?.lifepath === "function" && !!api()?.lifepathRules
      && atLeast(game.modules.get("wodx-storyteller")?.version, "0.34.1"), {creation: game.modules.get(M).version, storyteller: game.modules.get("wodx-storyteller")?.version}));

    await step("2 sheet button", async () => {
      const buttons = [], controls = [];
      Hooks.callAll("getActorSheetHeaderButtons", {actor: vamp}, buttons);
      Hooks.callAll("getHeaderControlsActorSheetV2", {actor: vamp}, controls);
      ok("2 sheet button", [...buttons, ...controls].some(b => b.label === "Lifepath"));
    });

    await step("3 play and save", async () => {
      const app = await api().lifepath(vamp);
      await sleep(400);
      const guessed = app.setup.line === "vampire" && app.setup.splat === "toreador";
      app.element.querySelector("[data-action=begin]").click();
      await sleep(300);
      await play(app);
      const end = !!app.element.querySelector("[data-action=save]");
      app.element.querySelectorAll("input[name=person]").forEach(i => { i.checked = false; });
      app.element.querySelector("[data-action=save]").click();
      await sleep(1200);
      const rec = flag(vamp);
      const card = game.messages.contents.some(m => m.timestamp >= t0 && m.content?.includes("Lifepath: WoDX gate: Lifepath Toreador"));
      ok("3 play and save", guessed && end && rec?.path?.steps?.length === 7 && rec.kept.length > 0 && card, {guessed, end, steps: rec?.path?.steps?.length, kept: rec?.kept?.length, card});
    });

    await step("4 a person becomes an NPC", async () => {
      const rec = flag(vamp);
      const p = rec.people[0] ?? {role: "a test friend", note: "", year: rec.path.birthYear};
      if ( !rec.people.length ) await vamp.update({[`flags.${M}.lifepath.people`]: [{...p, actorId: null, name: null}]});
      const npcs = await api().makeLifepathPeople({actorId: vamp.id, people: [p]});
      made.push(...npcs);
      const npc = npcs[0];
      const back = flag(vamp).people.find(q => q.role === p.role);
      ok("4 a person becomes an NPC", !!npc && npc.flags?.[M]?.pastOf?.id === vamp.id && String(npc.system?.notes).includes("past") && back?.actorId === npc.id,
        {npc: npc?.name, role: p.role});
    });

    await step("5 the Embrace carries it", async () => {
      await mortal.update({[`flags.${M}.lifepath`]: flag(vamp)});
      const out = await api().embrace(mortal, {clanName: "Toreador", generation: 13});
      const v = out?.vampire ?? out;
      if ( v?.id ) made.push(v);
      ok("5 the Embrace carries it", !!game.actors.get(v?.id)?.flags?.[M]?.lifepath?.path, {vampire: v?.name});
    });

    await step("6 prelude journal", async () => {
      const res = await game.modules.get("wodx-storyteller")?.api?.prelude?.make({actorId: vamp.id});
      if ( res?.journal ) journals.push(res.journal);
      const text = res?.journal?.pages?.contents?.[0]?.text?.content ?? "";
      ok("6 prelude journal", text.includes("<h2>Lifepath</h2>") && text.includes("Born "), {length: text.length});
    });

    await step("7 every line, every era", async () => {
      const Rl = api().lifepathRules, bad = [];
      for ( const line of Object.keys(Rl.LINES) ) for ( const y of [1197, 1620, 1916, 2005, 2050] ) {
        if ( !Rl.lineOpen(line, y).ok ) continue;
        let p = Rl.newPath({line, birthYear: y - 25, turnYear: y, seed: `gate${line}${y}`, splat: Rl.splatsFor(line, y)[0]?.key});
        for ( let i = 0; i < 20 && !Rl.done(p); i++ ) { if ( !Rl.currentEvent(p) ) bad.push(`${line} ${y} ${Rl.stageNow(p)}`); p = Rl.choose(p, 0); }
      }
      ok("7 every line, every era", !bad.length && !Rl.lint().length, {bad});
    });

    await step("8 other modules", async () => {
      const off = game.modules.filter(m => m.id.startsWith("wodx-") && m.active && !m.api && !["wodx-library"].includes(m.id)).map(m => m.id);
      ok("8 other modules", !!game.wodxCombat && off.length === 0, {off});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    try {
      for ( const w of Object.values(ui.windows ?? {}) ) if ( w?.constructor?.name === "LifepathApp" ) await w.close();
      for ( const a of foundry.applications.instances?.values?.() ?? [] ) if ( a?.constructor?.name === "LifepathApp" ) await a.close();
      const msgs = game.messages.filter(m => m.timestamp >= t0);
      if ( msgs.length ) await ChatMessage.deleteDocuments(msgs.map(m => m.id));
      for ( const j of journals ) await game.journal.get(j.id)?.delete();
      for ( const x of made ) await game.actors.get(x?.id)?.delete();
      // The Embrace kept the mortal in its folder; it was one of ours and is already gone
    } catch (e) { R.errors.push(`cleanup: ${e.message}`); }
  }
  return save(R, "gatelifepath-result.json");
}
