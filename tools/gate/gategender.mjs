/**
 * One shared gender (B3500-B3503), in Foundry, in rothenstein-wodx, as Gamemaster Test, on lane 2 or 3:
 *   await (await import(`/wodx-gate/gategender.mjs?${Date.now()}`)).run()
 * It never moves the clock. It makes actors, deletes them, and deletes its chat cards.
 *   1. api.gender is there
 *   2. every old record is read: a People generator sex, a baby's sex, the sheet's own line first
 *   3. a player character's gender is never used by a rule; a Storyteller character's is
 *   4. the sheet shows an optional Gender line, and what is typed there is kept
 *   5. marriage law in 1300: two men run by the Storyteller are refused; a player character of the same written gender is not
 *   6. clean up
 * Needs one user who is not a Gamemaster to own the player character; without one, steps 3 and 5 say so and fail.
 * Result: Data/wodx-gate/gategender-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gategender-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const t0 = game.time.worldTime, msgs = new Set(game.messages.map(m => m.id)), made = [];
  const G = game.modules.get("wodx-chronicle")?.api?.gender, npc = game.modules.get("wodx-npc")?.api;
  const player = game.users.find(u => !u.isGM);
  // adults in the world's own year, so the age floor never stands in the way of step 5
  const now = game.modules.get("wodx-chronicle")?.api?.eras?.currentYear?.() ?? 1300;
  try {
    ok("1. api.gender", typeof G?.forRules === "function" && typeof G?.of === "function", {player: player?.name ?? null});
    const own = player ? {default: 0, [player.id]: 3} : {default: 0};
    const [gen, baby, written, pc, npcB] = await Actor.createDocuments([
      {name: "Gate Gender Generated", type: "Mortal", flags: {"wodx-creation": {people: {sex: "male"}, chronology: {bornYear: now - 26}}}},
      {name: "Gate Gender Baby", type: "Mortal", flags: {"wodx-creation": {sex: "female"}}},
      {name: "Gate Gender Written", type: "Mortal", flags: {"wodx-chronicle": {gender: "nonbinary"}, "wodx-creation": {people: {sex: "male"}}}},
      {name: "Gate Gender Player", type: "Mortal", ownership: own, flags: {"wodx-chronicle": {gender: "male"}, "wodx-creation": {chronology: {bornYear: now - 30}}}},
      {name: "Gate Gender Storyteller Man", type: "Mortal", flags: {"wodx-creation": {people: {sex: "male"}, chronology: {bornYear: now - 30}}}}]);
    made.push(gen, baby, written, pc, npcB);
    const [npcA] = await Actor.createDocuments([{name: "Gate Gender Storyteller Man 2", type: "Mortal", flags: {"wodx-creation": {people: {sex: "male"}, chronology: {bornYear: now - 28}}}}]);
    made.push(npcA);
    ok("2. every record read", G.of(gen) === "male" && G.of(baby) === "female" && G.of(written) === "nonbinary", {gen: G.of(gen), baby: G.of(baby), written: G.of(written)});
    ok("3. rules: player none, Storyteller's kept", !!player && pc.hasPlayerOwner && G.forRules(pc) === "" && G.of(pc) === "male" && G.forRules(gen) === "male" && G.forRules(written) === "",
      {pcOwned: pc.hasPlayerOwner, pcRules: G.forRules(pc), gen: G.forRules(gen)});
    {
      const sheet = pc.sheet; await sheet.render(true); await sleep(1200);
      const el = sheet.element?.[0] ?? sheet.element, input = el?.querySelector?.(".wodx-gender-field input");
      const shown = input?.value;
      if ( input ) { input.value = "Two-spirit"; input.dispatchEvent(new Event("change", {bubbles: true})); await sleep(800); }
      const kept = pc.flags?.["wodx-chronicle"]?.gender;
      await sheet.close(); await G.set(pc, "male");
      ok("4. sheet line", shown === "male" && kept === "Two-spirit", {shown, kept, found: !!input});
    }
    if ( npc?.hearts?.marry ) {
      const region = game.modules.get("wodx-chronicle").api.world?.homeland?.() ?? "moravia";
      const a = await npc.hearts.marry(npcA, npcB, {region, year: 1300});
      const b = player ? await npc.hearts.marry(pc, gen, {region, year: 1300}) : null;
      ok("5. marriage law", a?.ok === false && b?.ok === true, {storytellers: a ? {ok: a.ok, why: a.why} : null, player: b ? {ok: b.ok, why: b.why} : null, region});
    } else ok("5. marriage law", false, {why: "no WoDX NPC hearts api"});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  finally {
    for ( const x of made ) await x.delete().catch(() => null);
    await sleep(500);
    for ( const m of game.messages.filter(m => !msgs.has(m.id)) ) await m.delete().catch(() => null);
    ok("6. clean up", game.time.worldTime === t0 && !made.some(x => game.actors.get(x.id)));
  }
  return save(R);
}
