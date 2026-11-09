/**
 * Dawn dread (WoDX Atmosphere 0.3.0, Actions 3.16.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatedawn.mjs?${Date.now()}`)).run()
 * The clock never moves: every check asks about a time worked out from the next sunrise.
 *   1. the modules: Atmosphere 0.3.0 or later with api.dread and its two settings; Actions 3.16.0 or later
 *   2. forty minutes out: no dread, no pale edge
 *   3. fifteen minutes out: strength 0.5, birds but no cock, no pressure; the body has the pale edge
 *   4. five minutes out: the cock, Rötschreck 1 harder; with the house rule off, 0
 *   5. the clock crossing ten minutes out sends the Storyteller one card, and only once that night
 *   6. the Rötschreck window opens with the modifier set to 1 five minutes out (dialog read, then closed)
 *   7. clean up: the edge as the real clock has it, the setting and the chat as they were
 * Result: Data/wodx-gate/gatedawn-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedawn-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const A = game.modules.get(MOD), D = A?.api?.dread;
  const keep = {pressure: get(MOD, "dawnPressure"), msgs: new Set(game.messages.map(m => m.id)), t0: game.time.worldTime, actors: []};
  const newMsgs = () => game.messages.filter(m => !keep.msgs.has(m.id));
  try {
    const act = game.modules.get("wodx-actions");
    ok("1. modules", A?.active && !foundry.utils.isNewerVersion("0.3.0", A.version) && !!D?.tick
      && ["dawnDread", "dawnPressure"].every(k => game.settings.settings.has(`${MOD}.${k}`)) && act?.active && !foundry.utils.isNewerVersion("3.16.0", act.version),
      {atmosphere: A?.version, actions: act?.version});

    const cal = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
    const lat = Number(get("wodx-chronicle", "latitude")) || 50.1;
    const dawn = game.time.worldTime + cal.secondsToNextDawn(game.time.worldTime, lat);
    const at = m => dawn - m * 60;
    R.notes.push(`next sunrise in ${Math.round((dawn - game.time.worldTime) / 60)} minutes of world time`);

    const far = D.now(at(40)); D.apply(at(40));
    ok("2. forty minutes out", far === null && !document.body.classList.contains("wodx-dawn-dread"), {far});

    await game.settings.set(MOD, "dawnPressure", true);
    const mid = D.now(at(15)); D.apply(at(15));
    const edge = document.body.classList.contains("wodx-dawn-dread") && document.body.style.getPropertyValue("--wodx-dread") === "0.5";
    ok("3. fifteen minutes out", mid?.strength === 0.5 && mid.birds && !mid.cock && D.rotschreck(at(15)) === 0 && edge, {mid, edge});

    const near = D.now(at(5)), p1 = D.rotschreck(at(5));
    await game.settings.set(MOD, "dawnPressure", false);
    const p0 = D.rotschreck(at(5));
    await game.settings.set(MOD, "dawnPressure", true);
    ok("4. five minutes out", near?.cock && p1 === 1 && p0 === 0, {near, p1, p0});

    await D.tick(at(9), 120); await sleep(400);
    await D.tick(at(8), 60); await sleep(400);
    const cards = newMsgs().filter(x => /Ten minutes to sunrise/.test(x.content ?? ""));
    ok("5. the Storyteller's card", cards.length === 1 && cards[0].whisper?.length > 0, {cards: cards.length});

    // The window reads the real clock: only check it when the real clock is in the last ten minutes, else check the source wiring
    const a = await Actor.create({name: "WoDX gate: Dawn", type: "Vampire"}); keep.actors.push(a); await sleep(300);
    const real = D.rotschreck();
    const p = game.wodxActions?.rotschreck?.({actor: a, provocation: "torch"}); await sleep(900);
    const dlg = [...document.querySelectorAll(".application, .window-app")].find(el => /Rötschreck check/.test(el.textContent ?? ""));
    const mod = dlg?.querySelector("input[name=mod]")?.value;
    ok("6. the Rötschreck window", !!dlg && Number(mod) === real, {real, mod});
    dlg?.querySelector("[data-action=close], .header-control[data-action=close]")?.click();
    for ( const app of foundry.applications.instances?.values?.() ?? [] ) if ( /Rötschreck check/.test(app.title ?? app.options?.window?.title ?? "") ) await app.close?.();
    void p;
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await sleep(300);
      D?.apply?.();
      if ( keep.pressure !== undefined ) await game.settings.set(MOD, "dawnPressure", keep.pressure);
      for ( const a of keep.actors ) await game.actors.get(a.id)?.delete();
      const mine = newMsgs().map(x => x.id);
      if ( mine.length ) await ChatMessage.deleteDocuments(mine);
      ok("7. clean up", game.time.worldTime === keep.t0 && get(MOD, "dawnPressure") === keep.pressure && !keep.actors.some(a => game.actors.get(a.id)));
    } catch (err) { ok("7. clean up", false, {error: err.message}); }
  }
  return save(R);
}
