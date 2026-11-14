/**
 * WoDX Senses gate (0.1.2), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatesenses.mjs?${Date.now()}`)).run()
 * Back the world up first.
 *
 * It makes a scene of its own ("WoDX gate: Senses tavern", tagged as a tavern, dark), two actors ("WoDX gate: Listener",
 * Perception 3, Alertness 2; "WoDX gate: Drinker", drinking by its routine flag), a hiding place with someone in it and a
 * fire on tiles, views the scene, asks, and deletes all of it and its chat cards at the end, then views the scene that was
 * on view before. Rothenstein's own scenes and actors are not touched; the clock never moves.
 *   1. the module: WoDX Senses 0.1.2 or later, its api, the line tables (12 kinds of place, 15 from Senses 0.9.0 with the mosque, synagogue and temple)
 *   2. the scene: the place reads as a tavern, indoors, and the light at the token as pitch
 *   3. a free look at hearing: the drinker and the fire are heard; the hidden one is held back on the Storyteller's copy
 *   4. looking closer rolls (blind, the Storyteller's copy carries the roll); the hidden one shows only if the successes reach it
 *   5. asking again gives the same lines with no roll
 *   6. a sound wall between the listener and the drinker: the drinker is no longer heard on a free look
 *   7. sight in the dark is blind; a light on the token makes it bright and the room shows
 *   8. the Storyteller's own line for the place comes first
 *   9. "/listen" in chat asks and posts a card
 *  10. Describe this place posts a public card
 *  11. with every WoDX module on: Interactables, NPC and Chronicle are all there and nothing threw
 *  12. clean up
 * Result: Data/wodx-gate/gatesenses-result.json.
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
const text = m => String(m?.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

export async function run() {
  const {R, ok, step} = harness();
  if ( game.world.id !== "rothenstein-wodx" ) return `Run this gate in rothenstein-wodx only (this is ${game.world.id}).`;
  const api = game.modules.get(MOD)?.api;
  const before = canvas.scene;
  const made = {actors: [], messages: [], scene: null};
  const firstMsg = game.messages.size;
  let scene = null, tokListener = null, tokDrinker = null;
  try {
    await step("1 module", async () => {
      const m = game.modules.get(MOD);
      ok("1 module", m?.active && newer(m.version, "0.1.2") && !!api?.answer && Object.keys(api.tables?.places?.kinds ?? {}).length >= 12,
        {version: m?.version, kinds: Object.keys(api?.tables?.places?.kinds ?? {}).length});
    });
    await step("2 scene", async () => {
      scene = await Scene.create({name: "WoDX gate: Senses tavern", width: 1600, height: 1200, grid: {size: 100}, environment: {darknessLevel: 1},
        flags: {"wodx-npc": {place: {kind: "tavern"}}}});
      made.scene = scene;
      // One at a time, so neither can be taken for the other
      const listener = await Actor.create({name: "WoDX gate: Listener", type: "Mortal", system: {attributes: {perception: {value: 3}}, abilities: {alertness: {value: 2}}}});
      const drinker = await Actor.create({name: "WoDX gate: Drinker", type: "Mortal", flags: {"wodx-npc": {where: {activity: "drink"}}}});
      made.actors.push(listener, drinker);
      const td1 = (await listener.getTokenDocument({x: 400, y: 400})).toObject();
      const td2 = (await drinker.getTokenDocument({x: 700, y: 400})).toObject();
      const toks = await scene.createEmbeddedDocuments("Token", [td1, td2]);
      tokListener = toks.find(t => t.actorId === listener.id);
      tokDrinker = toks.find(t => t.actorId === drinker.id);
      await scene.createEmbeddedDocuments("Tile", [
        {x: 300, y: 300, width: 100, height: 100, texture: {src: "icons/svg/door-closed.svg"}, flags: {"wodx-interactables": {hide: true, hideKind: "wardrobe", occupants: [{a: "gate", n: "Someone hiding", s: 0}]}}},
        {x: 500, y: 500, width: 100, height: 100, texture: {src: "icons/svg/fire.svg"}, flags: {"wodx-interactables": {hazard: true, hazardKind: "fire", size: "small"}}}]);
      await scene.view();
      await sleep(1500);
      const ctx = api.answer ? await api.answer({user: game.user.id, token: tokListener.uuid, sense: "touch", closer: false}) : null;
      ok("2 scene", ctx?.ctx?.place?.kind === "tavern" && ctx?.ctx?.light === "pitch" && ctx?.actorName === listener.name && tokDrinker?.actor?.name === drinker.name,
        {place: ctx?.ctx?.place, light: ctx?.ctx?.light, answeredAs: ctx?.actorName, drinkerToken: tokDrinker?.actor?.name});
    });
    let free = null;
    await step("3 free look", async () => {
      const n = game.messages.size;
      free = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "sound", closer: false});
      const s = free.sections[0];
      const st = [...game.messages].slice(n).find(m => m.flags?.[MOD]?.st);
      ok("3 free look", s.lines.some(l => /knock of cups/i.test(l)) && s.lines.some(l => /fire/i.test(l)) && /Held back: .*Wardrobe/i.test(text(st)) && st?.blind,
        {lines: s.lines, st: text(st).slice(0, 400)});
    });
    await step("4 closer", async () => {
      const n = game.messages.size;
      await api.rules && null;
      const res = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "sound", closer: true});
      const s = res.sections[0];
      const st = [...game.messages].slice(n).find(m => m.flags?.[MOD]?.st);
      const hiddenShown = s.lines.some(l => /breathing/i.test(l));
      ok("4 closer", s.rolled && st?.rolls?.length >= 1 && (s.successes >= 2) === hiddenShown && s.lines.length >= free.sections[0].lines.length,
        {successes: s.successes, botch: s.botch, hiddenShown, lines: s.lines});
      R.notes.push(`closer: ${s.successes} successes`);
      R.closer = s;
    });
    await step("5 repeat", async () => {
      const again = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "sound", closer: true});
      const s = again.sections[0];
      ok("5 repeat", !s.rolled && s.repeat && JSON.stringify(s.lines) === JSON.stringify(R.closer.lines), {rolled: s.rolled, repeat: s.repeat, lines: s.lines});
    });
    await step("6 sound wall", async () => {
      await scene.createEmbeddedDocuments("Wall", [{c: [600, 0, 600, 1200], flags: {"wodx-gate": {senses: true}}}]);
      await sleep(800);
      const res = await api.answer({user: "gate-fresh", token: tokListener.uuid, sense: "sound", closer: false, focus: ""});
      const s = res.sections[0];
      ok("6 sound wall", !s.lines.some(l => /knock of cups/i.test(l)), {lines: s.lines});
      const w = scene.walls.find(x => x.flags?.["wodx-gate"]?.senses);
      if ( w ) await w.delete();
      await sleep(500);
    });
    await step("7 light", async () => {
      const dark = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "sight", closer: false});
      await scene.createEmbeddedDocuments("AmbientLight", [{x: 450, y: 450, config: {bright: 20, dim: 30}, flags: {"wodx-gate": {senses: true}}}]);
      await sleep(1200);
      const lit = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "sight", closer: false});
      ok("7 light", dark.sections[0].diff.blind && /pitch dark/i.test(dark.sections[0].lines[0]) && lit.ctx.light === "bright" && !lit.sections[0].diff.blind,
        {dark: dark.sections[0].lines, lit: lit.sections[0].lines, litLight: lit.ctx.light});
    });
    await step("8 own line", async () => {
      await scene.update({[`flags.${MOD}`]: {own: {smell: "Gate test: the smell of the gate tavern's own line."}}});
      await sleep(300);
      const res = await api.answer({user: game.user.id, token: tokListener.uuid, sense: "smell", closer: false});
      ok("8 own line", res.sections[0].lines[0] === "Gate test: the smell of the gate tavern's own line.", {lines: res.sections[0].lines});
    });
    await step("9 command", async () => {
      const n = game.messages.size;
      canvas.tokens.get(tokListener.id)?.control({releaseOthers: true});
      const kept = Hooks.call("chatMessage", ui.chat, "/listen", {});
      await sleep(1500);
      const cards = [...game.messages].slice(n).filter(m => m.flags?.[MOD]);
      ok("9 command", kept === false && cards.length >= 1, {kept, cards: cards.length});
    });
    await step("10 describe", async () => {
      const n = game.messages.size;
      await api.describePlace({scene});
      const m = [...game.messages].slice(n).find(x => x.flags?.[MOD]?.describe);
      ok("10 describe", !!m && !(m.whisper?.length), {text: text(m).slice(0, 300)});
    });
    await step("11 alongside", async () => {
      const on = ["wodx-chronicle", "wodx-actions", "wodx-npc", "wodx-interactables", "wodx-otherworlds", "wodx-storyteller", "wodx-combat", "wodx-targeting"].filter(id => game.modules.get(id)?.active);
      const g = api.gatherSources(scene, tokListener, tokListener.actor);
      ok("11 alongside", on.includes("wodx-interactables") && on.includes("wodx-npc") && g.sources.some(s => s.key === "fire") && g.sources.some(s => s.key === "hidden"), {on, keys: g.sources.map(s => s.key)});
    });
  } catch (e) {
    R.errors.push(e.message);
  } finally {
    await step("12 clean up", async () => {
      for ( const m of [...game.messages].slice(firstMsg) ) if ( m.flags?.[MOD] || /WoDX gate/.test(m.speaker?.alias ?? "") ) await m.delete();
      if ( before && before.id !== scene?.id ) await before.view();
      await sleep(800);
      if ( scene ) await scene.delete();
      for ( const a of made.actors ) await a.delete();
      ok("12 clean up", !game.scenes.getName("WoDX gate: Senses tavern") && !game.actors.getName("WoDX gate: Listener"));
    });
  }
  return save(R, "gatesenses-result.json");
}
