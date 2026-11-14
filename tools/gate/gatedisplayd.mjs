/**
 * The display-only desk, batch D (B3440 to B3444), the checks that once needed a person, driven in two browsers:
 * rothenstein-wodx only.
 *   node tools/harness/gate-two.mjs gatedisplayd [--url https://localhost:30030]
 * Phases (each a run({phase}) call in one of the browsers):
 *   "setup"  (Gamemaster Test): makes the Player Test user if missing, a scene, the player's mortal character, a
 *            Nosferatu, an NPC drawn as a war form later, mortal onlookers and a speaker, and runs:
 *     a. Delirium: a token with no Garou sheet redrawn as a war-form sprite posts "The Delirium" for the mortal in sight
 *     b. Dress: a character with no clothes on the sheet wears the figure's clothes; against a mortal of station 1 an
 *        Etiquette roll gets "Dressed above their station +1 die"
 *     c. Uncanny marks: a Nosferatu's face has marks, the witness description names them, a mortal who comes into
 *        sight brings the Masquerade card with "Record the witnesses"; Obfuscated, the marks are gone
 *     d1. the speaker tells the player's character a line marked a lie
 *   "player" (Player Test):
 *     d2. "Read their face" under the line; clicking it posts the player's card, and the speaker's card stays hidden
 *   "finish" (Gamemaster Test): d3. the speaker's card is the Storyteller's, blind; then puts every setting back,
 *            deletes what it made, and writes Data/wodx-gate/gatedisplayd-result.json with every step.
 * The clock never moves.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TAG = "WoDX gate: display D";
const PLAYER = "Player Test";
const G = 100;
async function until(fn, ms = 5000) { const t = Date.now(); while ( Date.now() - t < ms ) { try { if ( await fn() ) return true; } catch (e) { /* not yet */ } await sleep(100); } try { return !!(await fn()); } catch (e) { return false; } }
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const setStat = (path, n) => ({[`${path}.value`]: n, [`${path}.total`]: n});
const L = () => game.modules.get("wodx-library")?.api, PD = () => game.modules.get("wodx-paperdoll")?.api;
const SHEET = `[greet] Looks up at the sky.
[offer] the weather
[the weather] Fine weather tonight. | lie`;

async function save(R) {
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed${R.errors?.length ? `, ${R.errors.length} error(s)` : ""}`;
  // The runner's comment carries only this line: name what failed, with its detail
  const bad = R.steps.filter(s => !s.pass);
  if ( bad.length ) R.summary += `; failed: ${bad.map(s => JSON.stringify(s).slice(0, 400)).join(" ; ")}`;
  const file = new File([JSON.stringify(R, null, 1)], "gatedisplayd-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}

export async function run({phase = "setup", ids = null, playerSteps = []} = {}) {
  if ( game.world.id !== "rothenstein-wodx" ) return {error: "Run this gate in rothenstein-wodx only"};
  if ( phase === "setup" ) return setup();
  if ( phase === "player" ) return player(ids);
  if ( phase === "finish" ) return finish(ids, playerSteps);
  return {error: `no phase ${phase}`};
}

/* ---------------- Storyteller side ---------------- */

async function setup() {
  const R = {started: new Date().toISOString(), world: game.world.id, steps: [], errors: [], notes: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( !game.user.isGM ) return {error: "setup runs as Gamemaster Test"};
  const set = (m, k) => { try { return game.settings.get(m, k); } catch (e) { return undefined; } };
  const ids = {back: canvas.scene?.id ?? null, t0: Date.now(),
    keep: {autoDelirium: set("wodx-actions", "autoDelirium"), eventPrompts: set("wodx-actions", "eventPrompts")}};
  if ( ids.keep.autoDelirium !== undefined ) await game.settings.set("wodx-actions", "autoDelirium", true);
  if ( ids.keep.eventPrompts !== undefined ) await game.settings.set("wodx-actions", "eventPrompts", true);
  let user = game.users.find(u => u.name === PLAYER);
  if ( !user ) user = await User.create({name: PLAYER, role: CONST.USER_ROLES.PLAYER});
  ids.user = user.id;
  // Far apart: the war form and its onlooker (left), the player and the speaker (middle), the Nosferatu and its
  // onlooker (right). The witness range is 60 feet (1,200 px here), so no group sees another.
  const scene = await Scene.create({name: `${TAG} scene`, width: 6000, height: 2000, padding: 0, grid: {type: 1, size: G, distance: 5}, tokenVision: false,
    ownership: {default: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER}, navigation: false});
  ids.scene = scene.id;
  await scene.view();
  await until(() => canvas.ready && canvas.scene?.id === scene.id, 10000);
  const LIMITED = CONST.DOCUMENT_OWNERSHIP_LEVELS.LIMITED;
  const [pc, beast, seer1, speaker, nosf, seer2] = await createActors([
    {name: `${TAG} PC`, type: "Mortal", ownership: {default: 0, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER}},
    {name: `${TAG} war form`, type: "Mortal"},
    {name: `${TAG} onlooker`, type: "Mortal"},
    {name: `${TAG} speaker`, type: "Mortal", ownership: {default: LIMITED}, flags: {"wodx-npc": {behavior: {talk: SHEET, template: "civilian"}}}},
    {name: `${TAG} Nosferatu`, type: "Vampire", system: {clan: "Nosferatu"}},
    {name: `${TAG} passer-by`, type: "Mortal"}]);
  ids.actors = [pc, beast, seer1, speaker, nosf, seer2].map(a => a.id);
  ids.pc = pc.id; ids.speaker = speaker.id; ids.nosf = nosf.id;
  await pc.update({...setStat("system.attributes.perception", 3), "system.abilities.empathy.value": 2});
  await speaker.update({...setStat("system.attributes.manipulation", 2), "system.abilities.subterfuge.value": 1});
  await user.update({character: pc.id});
  await scene.createEmbeddedDocuments("Token", [
    {name: "war form", actorId: beast.id, actorLink: true, x: G * 2, y: G * 5},
    {name: "onlooker", actorId: seer1.id, actorLink: true, x: G * 5, y: G * 5},
    {name: "pc", actorId: pc.id, actorLink: true, x: G * 28, y: G * 5},
    {name: "speaker", actorId: speaker.id, actorLink: true, x: G * 29, y: G * 5},
    {name: "Nosferatu", actorId: nosf.id, actorLink: true, x: G * 58, y: G * 15},
    {name: "passer-by", actorId: seer2.id, actorLink: true, x: G * 44, y: G * 15}]);
  const tok = id => scene.tokens.find(t => t.actorId === id);
  await until(() => ids.actors.every(id => tok(id)?.object));
  const fresh = re => game.messages.contents.filter(m => m.timestamp >= ids.t0 && re.test(m.content ?? ""));

  await step("a. Delirium", async () => {
    const t = tok(beast.id);
    await t.setFlag("wodx-paperdoll", "sprite", "garou-crinos");
    const seen = await until(() => fresh(/The Delirium/).some(m => m.content.includes(tok(seer1.id).name)), 6000);
    const card = fresh(/The Delirium/).at(-1);
    await t.unsetFlag("wodx-paperdoll", "sprite");
    ok("a. Delirium", seen && card?.whisper?.length > 0 && card.whisper.every(id => game.users.get(id)?.isGM) && /Run the Delirium/.test(card.content),
      {card: card ? card.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200) : null});
  });
  await step("b. Dress", async () => {
    const DH = await import("/modules/wodx-actions/scripts/deeper-hooks.js");
    const plain = L().look.of(pc)?.station;
    await pc.setFlag("wodx-paperdoll", "figure", {skin: "d8aa84", hair: "3b2a20", hairStyle: "short", slots: {body: {n: "a frock coat"}, head: {n: "a top hat"}}});
    const look = L().look.of(pc), npcSt = L().look.station(speaker, "civilian");
    canvas.tokens.releaseAll();
    tok(speaker.id).object.setTarget(true, {releaseOthers: true});
    const vs = DH.dressedFor(pc);
    const m = DH.modsFor(pc, {}, {abilityKey: "etiquette", abilityLabel: "Etiquette"});
    const brawl = DH.modsFor(pc, {}, {abilityKey: "brawl", abilityLabel: "Brawl"});
    tok(speaker.id).object.setTarget(false);
    await pc.unsetFlag("wodx-paperdoll", "figure");
    const after = L().look.of(pc)?.station;
    ok("b. Dress", look?.station > plain && npcSt === 1 && vs === "fine" && m.parts.includes("Dressed above their station +1 die") && m.dice === 1 && !brawl.parts.length && after === plain,
      {plain, dressed: look?.station, worn: (look?.worn ?? []).slice?.(0, 4), npcStation: npcSt, vs, parts: m.parts, after});
  });
  await step("c. Uncanny marks", async () => {
    const marks = PD().faces.uncanny(nosf);
    const desc = L().look.describe(nosf);
    const t = tok(nosf.id);
    await t.update({x: G * 46, y: G * 15});
    const seen = await until(() => fresh(/Record the witnesses/).some(m => m.content.includes(tok(seer2.id).name)), 6000);
    const card = fresh(/Record the witnesses/).at(-1);
    await nosf.createEmbeddedDocuments("ActiveEffect", [{name: "Obfuscated", img: "icons/svg/invisible.svg", statuses: ["wodx-obfuscated"]}]);
    await until(() => nosf.statuses?.has?.("wodx-obfuscated"), 3000);
    const hidden = PD().faces.uncanny(nosf);
    ok("c. Uncanny marks", marks.length > 0 && desc?.marks?.uncanny?.length > 0 && desc.marks.face === "monstrous" && seen && card.whisper.every(id => game.users.get(id)?.isGM) && hidden.length === 0,
      {marks, text: desc?.text, card: card ? card.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 200) : null, hidden});
  });
  await step("d1. a line marked a lie", async () => {
    const talk = game.modules.get("wodx-npc")?.api?.talk;
    const r = await talk.serve("ask", {sceneId: scene.id, npcTokenId: tok(speaker.id).id, meTokenId: tok(pc.id).id, topic: "the weather"}, user.id);
    const msg = game.messages.contents.filter(m => m.flags?.["wodx-npc"]?.talk && m.timestamp >= ids.t0).at(-1);
    ids.talkMsg = msg?.id ?? null;
    ok("d1. a line marked a lie", r?.ok && /Fine weather/.test(r.said ?? "") && msg?.flags["wodx-npc"].talk.lie === true && msg.whisper.includes(user.id),
      {said: r?.said, why: r?.why, talk: msg?.flags?.["wodx-npc"]?.talk});
  });
  ids.R = R;
  return ids;
}

async function finish(ids, playerSteps = []) {
  const R = ids?.R ?? {started: new Date().toISOString(), steps: [], errors: [], notes: []};
  R.steps.push(...(playerSteps ?? []));
  R.steps.push(await (async () => {
    const name = "d3. the speaker's card is the Storyteller's only";
    try {
      await until(() => game.messages.contents.some(m => m.timestamp >= ids.t0 && /keeps a straight face/.test(m.content ?? "")), 6000);
      const m = game.messages.contents.filter(m => m.timestamp >= ids.t0 && /keeps a straight face/.test(m.content ?? "")).at(-1);
      const gmOnly = !!m && m.whisper.length > 0 && m.whisper.every(id => game.users.get(id)?.isGM);
      return {name, pass: gmOnly && m.blind === true && /marked a lie/.test(m.content), blind: m?.blind, whisper: m?.whisper?.length ?? 0};
    } catch (e) { return {name, pass: false, error: e.message}; }
  })());
  try {
    const k = ids.keep;
    if ( k.autoDelirium !== undefined ) await game.settings.set("wodx-actions", "autoDelirium", k.autoDelirium);
    if ( k.eventPrompts !== undefined ) await game.settings.set("wodx-actions", "eventPrompts", k.eventPrompts);
    await game.users.get(ids.user)?.update({character: null});
    for ( const m of game.messages.contents.filter(m => m.timestamp >= ids.t0 && (ids.actors.includes(m.speaker?.actor) || m.speaker?.scene === ids.scene
      || /The Delirium|Record the witnesses|keeps a straight face/.test(m.content ?? ""))) ) await m.delete();
    for ( const id of ids.actors ) await game.actors.get(id)?.delete();
    if ( ids.back ) await game.scenes.get(ids.back)?.view();
    await game.scenes.get(ids.scene)?.delete();
    R.steps.push({name: "clean up", pass: !ids.actors.some(id => game.actors.get(id)) && !game.scenes.get(ids.scene)});
  } catch (e) { R.steps.push({name: "clean up", pass: false, error: e.message}); }
  return save(R);
}

/* ---------------- Player side ---------------- */

async function player(ids) {
  const steps = [];
  const ok = (name, pass, detail = {}) => steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message, stack: String(e.stack).split("\n").slice(0, 3).join(" | ")}); } };
  if ( game.user.isGM || game.user.name !== PLAYER ) return [{name: "player", pass: false, error: `signed in as ${game.user.name}`}];
  await step("d2. Read their face", async () => {
    await until(() => game.messages.get(ids.talkMsg), 8000);
    const m = game.messages.get(ids.talkMsg);
    const since = Date.now();
    const el = await m.renderHTML();
    document.body.append(el);
    const btn = el.querySelector(".wodx-face64-read");
    const label = btn?.textContent ?? null;
    btn?.click();
    const posted = await until(() => game.messages.contents.some(x => x.timestamp >= since && /reads .* face/.test(x.content ?? "") && x.speaker?.actor === ids.pc), 8000);
    const mine = game.messages.contents.filter(x => x.timestamp >= since && /reads .* face/.test(x.content ?? "")).at(-1);
    await sleep(800);
    const leak = game.messages.contents.filter(x => x.timestamp >= since && /keeps a straight face/.test(x.content ?? "") && x.visible);
    const marked = (game.actors.get(ids.pc)?.flags?.["wodx-paperdoll"]?.faceReads ?? []).includes(ids.talkMsg);
    el.remove();
    ok("d2. Read their face", label === "Read their face" && posted && mine?.whisper?.includes(game.user.id) && leak.length === 0 && marked,
      {button: label, card: mine ? mine.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 240) : null, leak: leak.length, marked});
  });
  return steps;
}
