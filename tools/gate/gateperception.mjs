/**
 * Per-character senses gate (WoDX Senses 0.3.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gateperception.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes a scene of its own ("WoDX gate: senses") with four actors of its own and deletes all of it at the end.
 * It never moves the clock. The Storyteller sees every token, so what a player sees is checked through the rules.
 *   1. the module: Senses 0.3.0 or later with api.perception and its three settings
 *   2. the scene: a Cainite (frenzy, Rötschreck), a Garou in Lupus, a hidden vampire (Obfuscate), a player character
 *   3. frenzy puts the red edge on the screen; Rötschreck drains the colour; both off clears it
 *   4. a token walks past the Garou in Lupus: its trail shows; in Homid it does not
 *   5. the Obfuscated NPC is concealed; a player character never is
 *   6. Who sees through it? rolls for the player character, whispers the Storyteller, keeps the seen-by list
 *   7. the token HUD has the button on the concealed token only
 *   8. clean up
 * Result: Data/wodx-gate/gateperception-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-senses";
const newer = (a, b) => !foundry.utils.isNewerVersion(b, a);

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
  if ( game.world.id !== "rothenstein-wodx" ) { ok("0. world", false, {error: "Run this gate in rothenstein-wodx only"}); return save(R, "gateperception-result.json"); }
  const P = game.modules.get(MOD)?.api?.perception;
  const viewed = canvas.scene?.id;
  const msgsBefore = new Set(game.messages.map(m => m.id));
  let scene = null;
  const actors = [];
  const tok = {};
  const player = game.users.find(u => !u.isGM);
  try {
    const m = game.modules.get(MOD);
    ok("1. module", m?.active && newer(m.version, "0.3.0") && !!P?.whoSees && ["screen", "trails", "unseen"].every(k => game.settings.settings.has(`${MOD}.${k}`)), {version: m?.version});

    const mk = async (name, type, more = {}) => { const a = await Actor.create({name: `WoDX gate: ${name}`, type, ...more}); actors.push(a); return a; };
    const cainite = await mk("Cainite", "Vampire"), wolf = await mk("Wolf", "Werewolf"), hidden = await mk("Hidden", "Vampire"), pc = await mk("Player", "Mortal", player ? {ownership: {[player.id]: 3}} : {});
    await hidden.createEmbeddedDocuments("Item", [{name: "Obfuscate", type: "Power", system: {type: "wod.types.discipline", value: 2}}]);
    await pc.update({"system.attributes.perception.value": 5, "system.attributes.perception.total": 5});
    scene = await Scene.create({name: "WoDX gate: senses", width: 2000, height: 1200, grid: {size: 100, distance: 5, units: "ft"}, padding: 0, tokenVision: false});
    const place = (a, x, y) => ({...a.prototypeToken.toObject(), actorId: a.id, actorLink: true, name: a.name.replace("WoDX gate: ", ""), x, y});
    await scene.createEmbeddedDocuments("Token", [place(cainite, 300, 300), place(wolf, 600, 300), place(hidden, 900, 300), place(pc, 1200, 300)]);
    await scene.view(); await sleep(1500);
    for ( const t of canvas.tokens.placeables ) tok[t.name] = t;
    ok("2. scene", Object.keys(tok).length === 4, {tokens: Object.keys(tok)});

    tok.Cainite.control({releaseOthers: true}); await sleep(300);
    await cainite.toggleStatusEffect("wodx-frenzy", {active: true}); await sleep(500);
    const red = document.getElementById("wodx-senses-screen")?.className ?? "";
    await cainite.toggleStatusEffect("wodx-rotschreck", {active: true}); await sleep(500);
    const pale = document.getElementById("wodx-senses-screen")?.className ?? "";
    const drained = document.body.classList.contains("wsn-drained");
    await cainite.toggleStatusEffect("wodx-frenzy", {active: false}); await cainite.toggleStatusEffect("wodx-rotschreck", {active: false});
    // the overlay fades out before it is removed: wait up to 3 s
    // the element itself can stay for the state edges (the quiet interface always names the health level): only the frenzy and Rotschreck looks must go
    const isGone = () => !/wsn-(frenzy|rotschreck)/.test(document.getElementById("wodx-senses-screen")?.className ?? "") && !document.body.classList.contains("wsn-drained");
    for ( let t = 0; t < 30 && !isGone(); t++ ) await sleep(100);
    const gone = isGone();
    ok("3. screen", /wsn-frenzy/.test(red) && /wsn-rotschreck/.test(pale) && drained && gone, {red, pale, drained, gone});

    await wolf.update({"system.shapes.lupus.isactive": true, "system.shapes.homid.isactive": false}); await sleep(300);
    tok.Wolf.control({releaseOthers: true}); await sleep(300);
    await tok.Cainite.document.update({x: 500, y: 400}); await sleep(300);
    await tok.Cainite.document.update({x: 500, y: 500}); await sleep(600);
    const lupus = P.trailSteps().length;
    await wolf.update({"system.shapes.lupus.isactive": false, "system.shapes.homid.isactive": true}); await sleep(300);
    const homid = P.trailSteps().length;
    ok("4. scent trails", lupus >= 2 && homid === 0, {lupus, homid});

    await hidden.toggleStatusEffect("wodx-obfuscated", {active: true}); await sleep(400);
    ok("5. concealed", P.concealed(tok.Hidden) && !P.concealed(tok.Player) && !P.concealed(tok.Cainite), {hidden: P.concealed(tok.Hidden), player: P.concealed(tok.Player), hasOwner: pc.hasPlayerOwner});

    const r = await P.whoSees(tok.Hidden); await sleep(500);
    const row = r?.results?.find(x => x.name === "Player");
    const card = game.messages.filter(m => !msgsBefore.has(m.id)).find(m => /Who sees/.test(m.content ?? ""));
    const list = tok.Hidden.document.getFlag(MOD, "seenBy") ?? [];
    ok("6. who sees", !!row && !!card && (row.noticed ? list.includes(pc.id) : !list.includes(pc.id)) && /Obfuscate 2/.test(row.why), {row, list});

    tok.Hidden.control({releaseOthers: true}); await canvas.hud.token.bind(tok.Hidden); await sleep(600);
    const onHidden = !!canvas.hud.token.element?.querySelector?.(".wsn-who");
    tok.Player.control({releaseOthers: true}); await canvas.hud.token.bind(tok.Player); await sleep(600);
    const onPlayer = !!canvas.hud.token.element?.querySelector?.(".wsn-who");
    await canvas.hud.token.close();
    ok("7. HUD", onHidden && !onPlayer, {onHidden, onPlayer, player: !!player});
  } catch (err) {
    R.errors.push(`${err.message} | ${String(err.stack).split("\n").slice(0, 3).join(" | ")}`);
  } finally {
    if ( viewed && game.scenes.get(viewed) ) await game.scenes.get(viewed).view();
    await sleep(800);
    if ( scene ) await scene.delete();
    for ( const a of actors ) await a.delete();
    const mine = game.messages.filter(m => !msgsBefore.has(m.id)).map(m => m.id);
    if ( mine.length ) await ChatMessage.deleteDocuments(mine);
    P?.refreshScreen?.();
    ok("8. clean up", !game.scenes.getName("WoDX gate: senses") && !game.actors.some(a => a.name.startsWith("WoDX gate: ")) && !document.getElementById("wodx-senses-screen"));
  }
  return save(R, "gateperception-result.json");
}
