/**
 * Player immersion (Interactables 0.16.0, Senses 0.4.0, Chronicle 0.9.0, Storyteller 0.11.0, Atmosphere 0.10.0,
 * NPC 0.7.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateimmersion.mjs?${Date.now()}`)).run()
 * It makes a scratch scene and actor of its own, moves the clock an hour and puts it back, and deletes what it made.
 *   1. the modules: versions and APIs
 *   2. carried light: a torch lights the token in the scene's units, and the token's own light is kept
 *   3. carried light: an hour and a bit later it has burned out and the token's own light is back
 *   4. the state on screen: a hurt character reads "Badly hurt", and the screen shows the edge and the words
 *   5. era time: the house rule is on, and the clock's year gives the right style
 *   6. letters: a messenger letter is stored, then delivered when the clock reaches it
 *   7. the opening card shows the place and fades out
 *   8. faces: the met list is kept on the actor, and a stranger's words are what a player would see
 *   9. clean up: scene, actor, letters, messages, the clock
 * Result: Data/wodx-gate/gateimmersion-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const STEPS = 9;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${STEPS} passed${R.errors.length ? `, ${R.errors.length} error(s)` : ""}`;
  const file = new File([JSON.stringify(R, null, 1)], "gateimmersion-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
const atLeast = (id, v) => { const m = game.modules.get(id); return !!m?.active && !foundry.utils.isNewerVersion(v, m.version); };

async function runGate(K) {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R); }
  const t0 = game.time.worldTime, msgStart = Date.now();
  const lettersBefore = foundry.utils.deepClone(game.settings.get("wodx-storyteller", "letters") ?? []);
  const sceneBefore = canvas.scene;
  let scene = null, actor = null, other = null;
  try {
    const I = game.modules.get("wodx-interactables").api, S = game.modules.get("wodx-senses").api, T = game.modules.get("wodx-storyteller").api;
    const A = game.modules.get("wodx-atmosphere").api, N = game.modules.get("wodx-npc").api;
    ok("1. modules", atLeast("wodx-interactables", "0.16.0") && atLeast("wodx-senses", "0.4.0") && atLeast("wodx-chronicle", "0.9.0") && atLeast("wodx-storyteller", "0.11.0")
      && atLeast("wodx-atmosphere", "0.10.0") && atLeast("wodx-npc", "0.7.0") && !!I?.carry && !!S?.perception?.stateOf && !!T?.letters && !!A?.opening && !!N?.faces,
    {versions: ["wodx-interactables", "wodx-senses", "wodx-chronicle", "wodx-storyteller", "wodx-atmosphere", "wodx-npc"].map(id => `${id} ${game.modules.get(id)?.version}`)});

    scene = await Scene.create({name: "WoDX gate: immersion", width: 1000, height: 1000, grid: {size: 100, distance: 5, units: "ft"}});
    actor = await Actor.create({name: "WoDX gate: lamp bearer", type: "Mortal"});
    other = await Actor.create({name: "WoDX gate: stranger", type: "Mortal"});
    const [tok] = await scene.createEmbeddedDocuments("Token", [{name: actor.name, actorId: actor.id, x: 200, y: 200, light: {bright: 0, dim: 2}}]);
    await I.carry.carry(tok, "fresh", "torch");
    const s1 = tok.flags["wodx-interactables"]?.carried;
    ok("2. a torch lit", s1?.lit && tok.light.dim === 39 && s1.before?.dim === 2, {dim: tok.light.dim, before: s1?.before});

    await game.time.advance(3700);
    await sleep(1500);
    const s2 = tok.flags["wodx-interactables"]?.carried;
    ok("3. burned out", s2 && !s2.lit && s2.left === 0 && tok.light.dim === 2, {state: s2, dim: tok.light.dim});

    // The system works the penalty out from the damage, so the gate sets damage (4 lethal: Wounded, −2 on the V20 chart)
    await actor.update({"system.health.damage.lethal": 4, "system.health.damage.woundpenalty": -2, "system.health.damage.woundlevel": "Wounded"});
    const edges = S.perception.rules.stateEdges(S.perception.stateOf(actor));
    const was = game.user.character;
    let screen = false, words = "";
    try {
      // The screen follows a controlled token before the assigned character, so let go of any first
      for ( const t of [...(canvas.tokens?.controlled ?? [])] ) t.release();
      await game.user.update({character: actor.id});
      await sleep(200);
      for ( const t of [...(canvas.tokens?.controlled ?? [])] ) t.release();
      R.notes.push(`character now ${game.user.character?.id}, controlled ${canvas.tokens?.controlled?.length ?? 0}`);
      S.perception.refreshScreen();
      screen = document.getElementById("wodx-senses-screen")?.className ?? "";
      words = document.getElementById("wodx-senses-state")?.textContent ?? "";
    } finally { await game.user.update({character: was?.id ?? null}); S.perception.refreshScreen(); }
    ok("4. state on screen", edges[0]?.id === "wound2" && /wsn-state-wound2/.test(screen) && /Badly hurt/.test(words), {edges, screen, words});

    const R2 = await import("/modules/wodx-chronicle/scripts/reckoning-rules.mjs");
    const C2 = await import("/modules/wodx-chronicle/scripts/calendar.mjs");
    const d = C2.describeTime(game.time.worldTime, game.settings.get("wodx-chronicle", "latitude"));
    const eraId = game.modules.get("wodx-chronicle").api?.eras?.activeEra?.()?.profile?.id ?? "";
    const told = R2.reckon(d, {eraId});
    ok("5. era time", game.settings.get("wodx-chronicle", "rule.eraReckoning") === true && told.style === R2.styleFor(d.year, eraId) && !!told.time, {year: d.year, told});

    const sent = await T.letters.send({userId: game.user.id, from: actor.id, to: "", toName: "WoDX gate: the abbot", how: "messenger", reach: "near", text: "WoDX gate letter"});
    const stored = (game.settings.get("wodx-storyteller", "letters") ?? []).find(l => l.id === sent?.id);
    await game.time.advance(3700);
    await sleep(1500);
    const after = (game.settings.get("wodx-storyteller", "letters") ?? []).find(l => l.id === sent?.id);
    const card = game.messages.contents.some(m => m.timestamp >= msgStart && m.content.includes("WoDX gate letter") && m.content.includes("reaches"));
    ok("6. letters", stored?.state === "way" && after?.state === "done" && card, {stored: stored?.state, after: after?.state, card});

    A.opening.show(scene);
    await sleep(400);
    const el = document.getElementById("watmo-opening");
    const shown = !!el && el.textContent.includes("WoDX gate: immersion");
    await sleep(6800);
    ok("7. opening card", shown && !document.getElementById("watmo-opening"), {shown});

    await other.update({"flags.wodx-npc.metBy": [actor.id], "flags.wodx-npc.stranger": "A hooded rider"});
    const FR = await import("/modules/wodx-npc/scripts/faces-rules.mjs");
    const f = other.flags["wodx-npc"];
    ok("8. faces", FR.metList(f).includes(actor.id) && FR.nameFor({name: other.name, flags: f, mine: ["nobody"]}) === "A hooded rider"
      && FR.nameFor({name: other.name, flags: f, mine: [actor.id]}) === other.name, {flags: f});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); }
  try {
    await game.settings.set("wodx-storyteller", "letters", lettersBefore);
    const mine = game.messages.contents.filter(m => m.timestamp >= msgStart && /WoDX gate/.test(m.content)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    if ( scene ) await scene.delete();
    for ( const a of [actor, other] ) if ( a ) await a.delete();
    await game.time.advance(t0 - game.time.worldTime);
    sceneBefore?.view?.();
    ok("9. clean up", game.time.worldTime === t0 && !game.scenes.getName("WoDX gate: immersion"), {clock: game.time.worldTime - t0});
  } catch (e) { R.errors.push(String(e?.stack ?? e)); ok("9. clean up", false); }
  return save(R);
}

// The gate kit (B3733): its own scratch scene, cleaned up after.
import {kitRun} from "./kit.mjs";
export const run = kitRun("gateimmersion", runGate);
