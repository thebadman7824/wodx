/**
 * Adaptive sound (WoDX Atmosphere 0.8.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateadaptive.mjs?${Date.now()}`)).run()
 * It makes a vampire of its own (owned by a player when there is one), sets this user's character to it for the
 * heartbeat steps, and puts everything back at the end. Era music is turned off while it runs, so nothing plays;
 * the heartbeat is synthesised and never awaited.
 *   1. the module: Atmosphere 0.8.0 or later, api.adaptive, the settings, the frenzy mood
 *   2. hiding: the vampire turns invisible and the tension is the hunt (unless a fight runs: then combat)
 *   3. frenzy: frenzy beats the hunt
 *   4. by hand: a tension held in the setting wins over the table
 *   5. music off: adapt does nothing
 *   6. the heartbeat: at 2 blood it beats; at 8 it stops
 *   7. clean up
 * Result: Data/wodx-gate/gateadaptive-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/7 passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateadaptive-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const M = game.modules.get(MOD), A = M?.api?.adaptive;
  const keep = {music: game.settings.get(MOD, "music"), tension: game.settings.get(MOD, "tension"), character: game.user.character?.id ?? null};
  let actor = null;
  try {
    ok("1. module", M?.active && !foundry.utils.isNewerVersion("0.8.0", M.version) && typeof A?.tension === "function" && game.settings.settings.has(`${MOD}.heartbeat`)
      && !!M.api.rules.K.MOODS.frenzy, {version: M?.version});
    await game.settings.set(MOD, "music", false);
    await game.settings.set(MOD, "tension", "auto");
    const fight = game.combats.some(c => c.started);
    if ( fight ) R.notes.push("a fight is running in this world: the hunt reads as combat");
    const player = game.users.find(u => !u.isGM);
    actor = await Actor.create({name: "WoDX gate: Adaptive Vampire", type: "Vampire", ownership: player ? {default: 0, [player.id]: 3} : {default: 3},
      system: {advantages: {bloodpool: {temporary: 10, max: 10}}}});
    const before = A.tension();
    await actor.toggleStatusEffect("invisible", {active: true}); await sleep(400);
    const hunt = A.tension();
    ok("2. hiding", hunt === (fight ? "combat" : "hunt") && (before === "quiet" || before === hunt || fight), {before, hunt});
    await actor.toggleStatusEffect(CONFIG.statusEffects.some(e => e.id === "wodx-frenzy") ? "wodx-frenzy" : "frenzy", {active: true}); await sleep(400);
    ok("3. frenzy", A.tension() === "frenzy", {tension: A.tension()});
    await game.settings.set(MOD, "tension", "quiet"); await sleep(200);
    const held = A.tension();
    await game.settings.set(MOD, "tension", "auto");
    ok("4. by hand", held === "quiet" && A.tension() === "frenzy", {held});
    const r = await A.adapt({force: true});
    ok("5. music off", r === null, {r});

    await game.user.update({character: actor.id}); await sleep(300);
    await actor.update({"system.advantages.bloodpool.temporary": 2}); await sleep(400);
    const hb = A.playing();
    await actor.update({"system.advantages.bloodpool.temporary": 8}); await sleep(400);
    const off = A.playing();
    ok("6. the heartbeat", !!hb && hb.bpm > 50 && hb.volume > 0 && off === null, {hb, off});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await game.user.update({character: keep.character});
      await game.settings.set(MOD, "tension", keep.tension);
      if ( actor ) await game.actors.get(actor.id)?.delete();
      await sleep(400);
      A?.update?.();
      await game.settings.set(MOD, "music", keep.music);
      ok("7. clean up", (!actor || !game.actors.get(actor.id)) && (game.user.character?.id ?? null) === keep.character && game.settings.get(MOD, "music") === keep.music
        && game.settings.get(MOD, "tension") === keep.tension && !A?.playing?.());
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
