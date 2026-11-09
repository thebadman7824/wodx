/**
 * WoDX Targeting gate (0.1.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatetarget.mjs?${Date.now()}`)).run()
 * run({look: true}) holds the area list open for 20 seconds so the ticked boxes can be checked by eye.
 * Back the world up first.
 *
 * It makes a scene of its own ("WoDX gate: targeting") with five actors of its own, views it, and deletes all of it
 * at the end; the scene that was viewed is viewed again, and the Targeting setting and the user's targets are put
 * back. Rothenstein's own actors and scenes are not touched. It never moves the clock.
 *   1. the modules: WoDX Targeting 0.1.0, WoDX Actions 3.12.0, WoDX Combat 3.7.5; the power tags loaded
 *   2. the scene: a Cainite, two ghouls (one in reach), a hurt ally, a neutral villager, a foe hidden by the Storyteller
 *   3. the ranking: a hostile power picks the ghoul in reach; healing picks the hurt ally; never the hidden foe or the villager
 *   4. Suggest: with Dominate chosen, the Discipline window names the ghoul in reach and sets nothing; another power changes the panel
 *      (Celerity: the user; Awe: everyone in the area); using the window makes the choice the user's target
 *   5. Automatic (the Storyteller): nothing is set for Celerity (the user), then Dominate sets the target at once
 *   6. a target set by hand is kept and named
 *   7. the attack window opens on the ghoul in reach, with the others to switch to
 *   8. Off: no panel
 *   9. clean up
 * Result: Data/wodx-gate/gatetarget-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-targeting";
const api = () => game.modules.get(MOD)?.api;

async function save(R, name) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], name, {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
function harness() {
  const R = {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 4).join(" | ")}); } };
  return {R, ok, step};
}
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const ids = () => [...game.user.targets].map(t => t.id).sort();
/** The newest open window holding a target panel, waited for. */
async function panel(ms = 4000) {
  const t0 = Date.now();
  while ( Date.now() - t0 < ms ) {
    const all = [...document.querySelectorAll(".application .wodx-aim")];
    if ( all.length ) return all.at(-1);
    await sleep(100);
  }
  return null;
}
async function closeAll() {
  for ( const app of [...foundry.applications.instances.values()] ) {
    if ( app instanceof foundry.applications.api.DialogV2 && app.element?.querySelector?.(".wodx-aim, .vtc-dialog, form") && app.rendered ) await app.close();
  }
  await sleep(200);
}
const setMode = m => game.settings.set(MOD, "mode", m);

export async function run({look = false} = {}) {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const keep = {mode: game.settings.get(MOD, "mode"), mine: game.settings.get(MOD, "mine"), targets: [...game.user.targets].map(t => t.id), scene: canvas.scene?.id};
  let scene = null;
  const actors = [];
  const tok = {};
  try {
    await step("1 modules", async () => {
      const m = id => game.modules.get(id);
      const tags = Object.values(api()?.table ?? {}).reduce((n, x) => n + Object.keys(x).length, 0);
      ok("1 modules", m(MOD)?.active && newer(m(MOD).version, "0.1.1") && newer(m("wodx-actions").version, "3.12.0") && newer(m("wodx-combat").version, "3.7.5") && tags >= 931,
        {targeting: m(MOD)?.version, actions: m("wodx-actions")?.version, combat: m("wodx-combat")?.version, tags});
    });

    await step("2 scene", async () => {
      const mk = async (name, type, more = {}) => { const a = await Actor.create({name: `WoDX gate: ${name}`, type, ...more}); actors.push(a); return a; };
      const hero = await mk("Anezka", "Vampire");
      await hero.createEmbeddedDocuments("Item", [["Dominate", 3], ["Presence", 1], ["Celerity", 1]].map(([n, v]) => ({name: n, type: "Power", system: {type: "wod.types.discipline", value: v}})));
      const ghoulA = await mk("Ghoul A", "Mortal"), ghoulB = await mk("Ghoul B", "Mortal"), ally = await mk("Bogdan", "Mortal"), villager = await mk("Villager", "Mortal"), hidden = await mk("Hidden one", "Mortal");
      await ally.update({"system.health.damage.lethal": 3});
      scene = await Scene.create({name: "WoDX gate: targeting", width: 2000, height: 1200, grid: {size: 100, distance: 5, units: "ft"}, padding: 0, tokenVision: false});
      const D = CONST.TOKEN_DISPOSITIONS;
      const place = (a, x, y, disposition, hiddenTok = false) => ({...a.prototypeToken.toObject(), actorId: a.id, actorLink: true, name: a.name.replace("WoDX gate: ", ""), x, y, disposition, hidden: hiddenTok});
      await scene.createEmbeddedDocuments("Token", [place(hero, 500, 500, D.FRIENDLY), place(ghoulA, 1000, 500, D.HOSTILE), place(ghoulB, 600, 500, D.HOSTILE),
        place(ally, 500, 700, D.FRIENDLY), place(villager, 500, 400, D.NEUTRAL), place(hidden, 400, 500, D.HOSTILE, true)]);
      await scene.view();
      await sleep(1500);
      for ( const t of canvas.tokens.placeables ) tok[t.name] = t;
      tok.Anezka.control({releaseOthers: true});
      ok("2 scene", Object.keys(tok).length === 6 && canvas.scene.id === scene.id, {tokens: Object.keys(tok)});
    });
    const hero = () => tok.Anezka.actor;

    await step("3 ranking", async () => {
      canvas.tokens.setTargets([], {mode: "replace"});
      const h = api().rank(hero(), "h.s"), x = api().rank(hero(), "x.s");
      const named = [h.pick, ...h.others].map(c => c?.name);
      ok("3 ranking", h.pick?.name === "Ghoul B" && /engaged/.test(h.pick.why) && x.pick?.name === "Bogdan" && !named.includes("Hidden one") && !named.includes("Villager"),
        {hostile: h.pick, others: named, heal: x.pick});
    });

    await step("4 suggest", async () => {
      await setMode("suggest");
      canvas.tokens.setTargets([], {mode: "replace"});
      game.wodxActions.useDiscipline({actor: hero()});
      const box = await panel();
      const app = box?.closest(".application");
      const sel = app?.querySelector("[name=power]");
      const choose = async v => { const o = [...sel.options].find(x => x.value.startsWith(v)); sel.value = o?.value; sel.dispatchEvent(new Event("change", {bubbles: true})); await sleep(200); return box.textContent; };
      // The window opens on the first power in the list (Celerity here), so each power is chosen before it is read.
      const first = await choose("dominate-command");
      const nothingSet = game.user.targets.size === 0;
      const onSelf = await choose("celerity");
      const area = await choose("presence-awe");
      const boxes = [...box.querySelectorAll("ul.wodx-aim-area input[type=checkbox]")];
      const areaRows = boxes.length;
      const ticks = boxes.map(b => ({checked: b.checked, ...Object.fromEntries(["appearance", "accent-color", "background-color", "opacity", "visibility", "width"].map(k => [k, getComputedStyle(b).getPropertyValue(k)]))}));
      if ( look ) { ui.notifications.info("Look at the ticked boxes in the area list now (20 seconds)."); await sleep(20000); }
      await choose("dominate-command");
      app.querySelector("button[data-action=ok]")?.click();
      await sleep(800);
      await closeAll();
      ok("4 suggest", /Suggested: Ghoul B/.test(first) && nothingSet && /Anezka/.test(onSelf) && /In the area/.test(area) && areaRows >= 3 && ids().length === 1 && game.user.targets.first()?.name === "Ghoul B",
        {first: first.slice(0, 160), onSelf: onSelf.slice(0, 100), area: area.slice(0, 100), areaRows, ticks, after: [...game.user.targets].map(t => t.name)});
    });

    await step("5 automatic", async () => {
      await setMode("auto");
      canvas.tokens.setTargets([], {mode: "replace"});
      game.wodxActions.useDiscipline({actor: hero()});
      const box = await panel();
      const sel = box?.closest(".application")?.querySelector("[name=power]");
      await sleep(300);
      const onOpen = [...game.user.targets].map(t => t.name);
      const o = [...sel.options].find(x => x.value.startsWith("dominate-command"));
      sel.value = o?.value; sel.dispatchEvent(new Event("change", {bubbles: true}));
      await sleep(300);
      const set = [...game.user.targets].map(t => t.name);
      const text = box?.textContent ?? "";
      await closeAll();
      // Celerity (the first power) works on its user, so nothing is set on open; Dominate then targets Ghoul B at once.
      ok("5 automatic", onOpen.length === 0 && set.length === 1 && set[0] === "Ghoul B" && /Targeted/.test(text), {onOpen, set, text: text.slice(0, 120)});
    });

    await step("6 hand-set", async () => {
      await setMode("suggest");
      canvas.tokens.setTargets([], {mode: "replace"});
      tok["Ghoul A"].setTarget(true, {releaseOthers: true});
      await sleep(200);
      game.wodxActions.useDiscipline({actor: hero()});
      const box = await panel();
      const text = box?.textContent ?? "";
      await closeAll();
      ok("6 hand-set", /Ghoul A/.test(text) && /set by hand/.test(text) && ids().length === 1 && game.user.targets.first()?.name === "Ghoul A", {text: text.slice(0, 120)});
    });

    await step("7 attack", async () => {
      canvas.tokens.setTargets([], {mode: "replace"});
      game.wodxCombat.attack({attacker: tok.Anezka});
      const box = await panel();
      const text = box?.textContent ?? "";
      const alts = [...(box?.querySelectorAll("button[data-aim]") ?? [])].map(b => b.textContent);
      await closeAll();
      ok("7 attack", /Ghoul B/.test(text) && alts.includes("Ghoul A") && alts.includes("No target") && !alts.includes("Hidden one"), {text: text.slice(0, 120), alts});
    });

    await step("8 off", async () => {
      await setMode("off");
      canvas.tokens.setTargets([], {mode: "replace"});
      game.wodxActions.useDiscipline({actor: hero()});
      await sleep(1200);
      const any = !!document.querySelector(".application .wodx-aim");
      await closeAll();
      ok("8 off", !any);
    });
  } catch (e) { R.errors.push(String(e.stack ?? e)); }
  finally {
    await step("9 clean up", async () => {
      await closeAll();
      await game.settings.set(MOD, "mode", keep.mode);
      await game.settings.set(MOD, "mine", keep.mine);
      if ( keep.scene && game.scenes.get(keep.scene) ) await game.scenes.get(keep.scene).view();
      await sleep(1000);
      if ( scene ) await scene.delete();
      for ( const a of actors ) await a.delete();
      canvas.tokens?.setTargets?.(keep.targets.filter(id => canvas.tokens.get(id)), {mode: "replace"});
      ok("9 clean up", !game.scenes.getName("WoDX gate: targeting") && !game.actors.some(a => a.name.startsWith("WoDX gate: ")) && game.settings.get(MOD, "mode") === keep.mode);
    });
  }
  return save(R, "gatetarget-result.json");
}
