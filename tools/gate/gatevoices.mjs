/**
 * WoDX Voices gate (0.1.0), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatevoices.mjs?${Date.now()}`)).run()
 * Makes a scene and an NPC of its own and deletes them at the end; the viewed scene and the Voices settings are put
 * back. It never moves the clock. The browser's speech is watched, not heard: speak() is wrapped for the run.
 *   1. the module: WoDX Voices 0.1.0 or later, its api, the browser's speech present
 *   2. a talk card whispered to this user is spoken once, the NPC's words only, in its profile's pitch and speed
 *   3. the same NPC speaks in the same voice again; another NPC differs
 *   4. silent: a card whispered to someone else, a card that is not a talk card, muted, Voices off
 *   5. clean up
 * Result: Data/wodx-gate/gatevoices-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-voices";
const api = () => game.modules.get(MOD)?.api;
const newer = (a, b) => {
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for ( let i = 0; i < 3; i++ ) if ( (pa[i] ?? 0) !== (pb[i] ?? 0) ) return (pa[i] ?? 0) > (pb[i] ?? 0);
  return true;
};
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
const CARD = text => `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">Gate asks about the bridge.</p><p>${text}</p></div></div>`;

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  const keep = {enabled: game.settings.get(MOD, "enabled"), mute: game.settings.get(MOD, "mute"), gmHears: game.settings.get(MOD, "gmHears")};
  const viewed = canvas.scene?.id;
  const S = globalThis.speechSynthesis;
  const spoken = [];
  const realSpeak = S?.speak?.bind(S);
  const made = {msgs: []};
  try {
    await step("1 module", async () => {
      const m = game.modules.get(MOD);
      ok("1 module", m?.active && newer(m.version, "0.1.0") && typeof api()?.preview === "function" && !!S, {version: m?.version, speech: !!S});
    });
    if ( S ) S.speak = u => spoken.push({text: u.text, pitch: u.pitch, rate: u.rate, voice: u.voice?.name ?? null});
    await game.settings.set(MOD, "enabled", true); await game.settings.set(MOD, "mute", false); await game.settings.set(MOD, "gmHears", true);
    made.scene = await Scene.create({name: "WoDX gate: voices", width: 1000, height: 1000});
    const [a1, a2] = await createActors([{name: "Gate toll keeper", type: "Mortal", flags: {"wodx-npc": {behavior: {voice: "peasant"}}}}, {name: "Gate prince", type: "Mortal"}]);
    made.actors = [a1, a2];
    const toks = await made.scene.createEmbeddedDocuments("Token", [{name: a1.name, actorId: a1.id, actorLink: true, x: 100, y: 100}, {name: a2.name, actorId: a2.id, actorLink: true, x: 300, y: 100}]);
    const t1 = toks.find(t => t.actorId === a1.id), t2 = toks.find(t => t.actorId === a2.id);
    const post = async (tok, text, extra = {}) => {
      const m = await ChatMessage.create({speaker: {alias: tok.name, scene: made.scene.id, token: tok.id}, content: CARD(text), whisper: [game.user.id], flags: {"wodx-npc": {talk: {actor: null}}}, ...extra});
      made.msgs.push(m); await sleep(300); return m;
    };
    await step("2 spoken", async () => {
      await post(t1, "Coin first, traveller &amp; quickly.");
      const p = api().profileOf(t1);
      ok("2 spoken", spoken.length === 1 && spoken[0].text === "Coin first, traveller & quickly." && spoken[0].pitch === p.pitch && spoken[0].rate === p.rate, {spoken, profile: p});
    });
    await step("3 steady", async () => {
      await post(t1, "Again."); await post(t2, "And you.");
      const [x, y, z] = spoken.slice(-3);
      ok("3 steady", spoken.length === 3 && x.pitch === y.pitch && x.rate === y.rate && x.voice === y.voice && (z.pitch !== x.pitch || z.rate !== x.rate || z.voice !== x.voice), {spoken});
    });
    await step("4 silent", async () => {
      const n = spoken.length;
      const other = game.users.find(u => u.id !== game.user.id);
      if ( other ) await post(t1, "Not for you.", {whisper: [other.id]});
      await post(t1, "Plain chat.", {flags: {}});
      await game.settings.set(MOD, "mute", true); await post(t1, "Muted."); await game.settings.set(MOD, "mute", false);
      await game.settings.set(MOD, "enabled", false); await post(t1, "Off.");
      ok("4 silent", spoken.length === n, {extra: spoken.slice(n), otherUser: !!other});
    });
  } catch (e) { R.errors.push(e.message); }
  await step("5 clean up", async () => {
    if ( S && realSpeak ) S.speak = realSpeak;
    for ( const [k, v] of Object.entries(keep) ) await game.settings.set(MOD, k, v);
    for ( const m of made.msgs ) await m?.delete?.();
    for ( const a of made.actors ?? [] ) await a.delete();
    if ( viewed ) await game.scenes.get(viewed)?.view?.();
    await made.scene?.delete?.();
    ok("5 clean up", !game.scenes.getName("WoDX gate: voices") && !game.actors.getName("Gate toll keeper"));
  });
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatevoices-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
