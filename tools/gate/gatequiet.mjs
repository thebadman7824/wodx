/**
 * WoDX Senses 0.5.0 gate: the quiet interface and supernatural sight on the map. In Foundry, in rothenstein-wodx only,
 * as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatequiet.mjs?${Date.now()}`)).run()
 * It makes one actor ("WoDX gate: Seer", a vampire with Auspex 2) on the scene in view and deletes it at the end; the
 * client settings it changes are put back. Rothenstein's own scenes and actors are not touched; the clock never moves.
 *   1. the module: WoDX Senses 0.5.0 or later, the settings quiet and sightMap, the keybinding, the sight api
 *   2. quiet on: the body has wsn-quiet, the sidebar and hotbar are hidden, the scene controls are not
 *   3. quiet on: a roll card's "Difficulty: 6" reads "Difficulty: standard" on this screen; the message itself is unchanged
 *   4. quiet on: the state strip names the health level (Unhurt) for the selected character
 *   5. quiet off: everything is back as it was
 *   6. the seer has Heightened Senses and Aura Perception; the button steps heightened, aura, then off
 *   7. under Aura Perception the board has a filter; with sightMap off it has none
 *   8. with every WoDX module on, nothing threw
 *   9. clean up
 * Result: Data/wodx-gate/gatequiet-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-senses";
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
const shown = sel => { const el = document.querySelector(sel); return !!el && getComputedStyle(el).display !== "none"; };

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const api = game.modules.get(MOD)?.api;
  const was = {quiet: game.settings.get(MOD, "quiet"), sightMap: game.settings.get(MOD, "sightMap")};
  const errors = [];
  const onErr = e => errors.push(String(e?.message ?? e));
  window.addEventListener("error", onErr);
  let actor = null, msg = null;
  try {
    await step("1 module", async () => {
      const m = game.modules.get(MOD);
      ok("1 module", m?.active && newer(m.version, "0.5.0") && game.settings.settings.has(`${MOD}.quiet`) && game.settings.settings.has(`${MOD}.sightMap`)
        && !!game.keybindings.actions.get(`${MOD}.quietToggle`) && typeof api?.sight?.cycle === "function", {version: m?.version});
    });
    await step("2 quiet on", async () => {
      await game.settings.set(MOD, "quiet", true); await sleep(300);
      ok("2 quiet on", document.body.classList.contains("wsn-quiet") && !shown("#sidebar") && !shown("#hotbar") && shown("#scene-controls"));
    });
    await step("3 difficulty in words", async () => {
      msg = await ChatMessage.create({speaker: {alias: "WoDX gate"}, content: "<p>WoDX gate roll · Difficulty: 6 · 2 successes</p>"});
      await sleep(600);
      const el = document.querySelector(`#chat [data-message-id="${msg.id}"], .chat-log [data-message-id="${msg.id}"], [data-message-id="${msg.id}"]`);
      const shownText = el?.textContent ?? "";
      ok("3 difficulty in words", /Difficulty: standard/.test(shownText) && /Difficulty: 6/.test(msg.content), {shownText: shownText.slice(0, 120)});
    });
    await step("4 health word", async () => {
      actor = await Actor.create({name: "WoDX gate: Seer", type: "Mortal"});
      await actor.createEmbeddedDocuments("Item", [{name: "Auspex", type: "Power", system: {value: 2}}]).catch(() => null);
      const [td] = await canvas.scene.createEmbeddedDocuments("Token", [{...(await actor.getTokenDocument()).toObject(), x: 200, y: 200}]);
      await sleep(400);
      canvas.tokens.get(td.id)?.control({releaseOthers: true});
      await sleep(500);
      const strip = document.getElementById("wodx-senses-state")?.textContent ?? "";
      ok("4 health word", /Unhurt/.test(strip), {strip});
    });
    await step("5 quiet off", async () => {
      await game.settings.set(MOD, "quiet", false); await sleep(300);
      ok("5 quiet off", !document.body.classList.contains("wsn-quiet") && shown("#sidebar") && shown("#hotbar"));
    });
    await step("6 sights", async () => {
      const seq = [];
      for ( let i = 0; i < 3; i++ ) { seq.push(await api.sight.cycle(actor)); await sleep(200); }
      ok("6 sights", JSON.stringify(seq) === JSON.stringify(["heightened", "aura", null]), {seq});
    });
    await step("7 the map", async () => {
      await api.sight.cycle(actor); await api.sight.cycle(actor); await sleep(500);
      const withSight = document.getElementById("board")?.style.filter ?? "";
      await game.settings.set(MOD, "sightMap", false); await sleep(500);
      const without = document.getElementById("board")?.style.filter ?? "";
      ok("7 the map", /saturate/.test(withSight) && without === "", {withSight, without});
    });
    await step("8 no errors", async () => ok("8 no errors", !errors.length, {errors}));
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("9 clean up", async () => {
      window.removeEventListener("error", onErr);
      await game.settings.set(MOD, "quiet", was.quiet); await game.settings.set(MOD, "sightMap", was.sightMap);
      if ( msg ) await msg.delete();
      for ( const t of canvas.scene.tokens.filter(t => t.actorId === actor?.id) ) await t.delete();
      if ( actor ) await actor.delete();
      ok("9 clean up", !game.actors.getName("WoDX gate: Seer"));
    });
  }
  return save(R, "gatequiet-result.json");
}
