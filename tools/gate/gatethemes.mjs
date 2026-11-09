/**
 * Personal themes (WoDX Atmosphere 0.5.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatethemes.mjs?${Date.now()}`)).run()
 * It makes one actor owned by a player and deletes it at the end. Audio is started, never awaited.
 *   1. the module: Atmosphere 0.5.0 or later, api.themes, the setting
 *   2. a theme set on the character shows in the Atmosphere window with Spotlight
 *   3. it plays once; again at once, nothing (once a minute); Spotlight plays it anyway
 *   4. cleared, it plays nothing; with the setting off, nothing either
 *   5. clean up
 * Result: Data/wodx-gate/gatethemes-result.json.
 */
const MOD = "wodx-atmosphere";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatethemes-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const A = game.modules.get(MOD), T = A?.api?.themes;
  const keep = {themes: game.settings.get(MOD, "themes")};
  let actor = null;
  try {
    ok("1. module", A?.active && !foundry.utils.isNewerVersion("0.5.0", A.version) && !!T?.play && game.settings.settings.has(`${MOD}.themes`), {version: A?.version});
    const player = game.users.find(u => !u.isGM);
    if ( !player ) R.notes.push("no player user in this world: the actor has no player owner");
    actor = await Actor.create({name: "WoDX gate: Theme", type: "Mortal", ownership: player ? {default: 0, [player.id]: 3} : {default: 0}});
    await sleep(300);
    await game.settings.set(MOD, "themes", true);
    await T.set(actor, "sounds/notify.wav", 0.4);
    A.api.open(); await sleep(900);
    const row = [...document.querySelectorAll("#wodx-atmosphere table.watmo-themes tr")].find(tr => /WoDX gate: Theme/.test(tr.textContent));
    ok("2. in the window", actor.hasPlayerOwner && /notify\.wav/.test(row?.textContent ?? "") && !!row?.querySelector("[data-action=spotlight]"), {row: row?.textContent?.trim()});
    const a = T.play(actor), b = T.play(actor), c = T.play(actor, {force: true});
    ok("3. once a minute, Spotlight anyway", a?.src === "sounds/notify.wav" && a.volume === 0.4 && b === null && c?.src === "sounds/notify.wav", {a, b, c});
    await T.set(actor, "");
    const d = T.play(actor, {force: true});
    await T.set(actor, "sounds/notify.wav");
    await game.settings.set(MOD, "themes", false);
    const e = T.play(actor, {force: true});
    ok("4. cleared, or turned off", d === null && e === null && !!actor.flags?.[MOD]?.theme?.src, {d, e});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    try {
      await game.settings.set(MOD, "themes", keep.themes);
      await foundry.applications.instances?.get?.("wodx-atmosphere")?.close?.();
      if ( actor ) await game.actors.get(actor.id)?.delete();
      ok("5. clean up", (!actor || !game.actors.get(actor.id)) && game.settings.get(MOD, "themes") === keep.themes);
    } catch (err) { ok("5. clean up", false, {error: err.message}); }
  }
  return save(R);
}
