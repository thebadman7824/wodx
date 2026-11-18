/**
 * WoDX Voices gate (B6763: off means off), in Foundry, in rothenstein-wodx only, as Gamemaster Test:
 *   await (await import(`/wodx-gate/gatevoices.mjs?${Date.now()}`)).run()
 * Voices are dropped for good and stay switched off (the world setting wodx-voices.enabled, default off, needs a
 * reload). This gate checks the off state only. It needs the world loaded with Voices off and never changes a setting.
 * The engine steps are gone: Kokoro rendering and caching (7), the Kokoro talk card (8), the browser's speech of a
 * line (2, 3, 6, 9) and the voice server (10) tested a feature that is not in play, and no engine sits in
 * Data/wodx-voices-engine.
 * Makes a scene of its own (never viewed) and two NPCs, and deletes them at the end. It never moves the clock.
 *   1. the module is active, Voices is off in this world, and the switch needs a reload (B6763)
 *   2. no settings show: every WoDX Voices setting but the switch is out of the settings window
 *   3. no menu: the voice cache button is not registered
 *   4. no actor-menu entries: Voiced (plot NPC) and Not voiced stay hidden, on an NPC marked as a plot NPC and on one not
 *   5. nothing touched the voice folders: no engine loaded at start, no line rendered or played, no cache browsed or
 *      written while a talk card is posted
 *   6. a talk card from a plot NPC, whispered to this user, plays no audio (no browser speech, no sound file, no socket
 *      message) and throws nothing
 *   7. clean up
 * Result: Data/wodx-gate/gatevoices-result.json.
 */
const sleep = ms => new Promise(r => setTimeout(r, ms));
const MOD = "wodx-voices";
const api = () => game.modules.get(MOD)?.api;
const createActors = async data => { const made = await Actor.create(data); return data.map(d => made.find(a => a.name === d.name) ?? null); };
// The card as WoDX NPC's talk.mjs deliver() writes it: the answer is in <p class="wnpc-said">
const CARD = text => `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">Gate asks about the bridge.</p><p class="wnpc-said">${text}</p></div></div>`;

export async function run() {
  const R = {started: new Date().toISOString(), steps: [], errors: []};
  const ok = (name, pass, detail = {}) => R.steps.push({name, pass: !!pass, ...detail});
  const step = async (name, fn) => { try { await fn(); } catch (e) { ok(name, false, {error: e.message}); } };
  const made = {msgs: [], actors: []};
  // Watch what Voices could do while the card goes by: speech, sound, files, socket, errors
  const S = globalThis.speechSynthesis, AH = foundry.audio?.AudioHelper, FPI = foundry.applications?.apps?.FilePicker?.implementation;
  const seen = {spoken: [], played: [], browsed: [], uploaded: [], made: [], socket: [], errors: []};
  // B7250: the Voices api keeps its counters and engine states in memory for the whole page. A gate before this one on
  // the lane may have switched Voices on to test it (gatetruthnpc step 6 speaks with the browser engine, and putting its
  // settings back points the engine at the voice server again, which is not running). Step 5 asks whether anything
  // happened while this gate ran, so it reads the counters and states against where they stood when it started.
  const A0 = game.modules.get(MOD)?.api;
  const start = {stats: {...(A0?.stats ?? {})}, engine: A0?.engine?.state ?? null, server: A0?.server?.state ?? null};
  const real = {speak: S?.speak, play: AH?.play, browse: FPI?.browse, upload: FPI?.upload, mkdir: FPI?.createDirectory, emit: game.socket?.emit, error: console.error};
  const voicesError = (...a) => a.some(x => /wodx-voices/i.test(String(x?.stack ?? x?.message ?? x)));
  const onError = ev => { if ( voicesError(ev?.error ?? ev?.message, ev?.filename) ) seen.errors.push(String(ev?.error?.message ?? ev?.message)); };
  const onReject = ev => { if ( voicesError(ev?.reason) ) seen.errors.push(String(ev?.reason?.message ?? ev?.reason)); };
  const watch = () => {
    if ( S ) S.speak = u => { seen.spoken.push(u?.text ?? ""); };
    if ( AH ) AH.play = (o, ...rest) => { seen.played.push(o?.src ?? ""); return null; };
    if ( FPI ) {
      FPI.browse = (src, target, ...rest) => { seen.browsed.push(String(target)); return real.browse.call(FPI, src, target, ...rest); };
      FPI.upload = (src, path, file, ...rest) => { seen.uploaded.push(`${path}/${file?.name ?? ""}`); return real.upload.call(FPI, src, path, file, ...rest); };
      FPI.createDirectory = (src, target, ...rest) => { seen.made.push(String(target)); return real.mkdir.call(FPI, src, target, ...rest); };
    }
    if ( game.socket ) game.socket.emit = (name, ...rest) => { if ( name === `module.${MOD}` ) seen.socket.push(rest[0]); return real.emit.call(game.socket, name, ...rest); };
    console.error = (...a) => { if ( voicesError(...a) ) seen.errors.push(a.map(String).join(" ")); return real.error.apply(console, a); };
    globalThis.addEventListener?.("error", onError); globalThis.addEventListener?.("unhandledrejection", onReject);
  };
  const unwatch = () => {
    if ( S && real.speak ) S.speak = real.speak;
    if ( AH && real.play ) AH.play = real.play;
    if ( FPI ) { FPI.browse = real.browse; FPI.upload = real.upload; FPI.createDirectory = real.mkdir; }
    if ( game.socket && real.emit ) game.socket.emit = real.emit;
    console.error = real.error;
    globalThis.removeEventListener?.("error", onError); globalThis.removeEventListener?.("unhandledrejection", onReject);
  };
  try {
    await step("1 Voices is off", async () => {
      const m = game.modules.get(MOD), sw = game.settings.settings.get(`${MOD}.enabled`);
      const on = (() => { try { return game.settings.get(MOD, "enabled"); } catch (e) { return null; } })();
      ok("1 Voices is off", !!m?.active && on === false && sw?.requiresReload === true && sw?.config === true,
        {version: m?.version, enabled: on, requiresReload: sw?.requiresReload ?? null,
          ...(on ? {error: "Voices is on in this world: turn it off in the settings, reload, and run the gate again"} : {})});
    });
    await step("2 no settings show", async () => {
      const shown = [...game.settings.settings.values()].filter(s => s.namespace === MOD && s.config && s.key !== "enabled").map(s => s.key);
      const all = [...game.settings.settings.values()].filter(s => s.namespace === MOD).length;
      ok("2 no settings show", shown.length === 0 && all > 5, {shown, registered: all});
    });
    await step("3 no menu", async () => {
      const menus = [...(game.settings.menus?.keys?.() ?? [])].filter(k => k.startsWith(`${MOD}.`));
      ok("3 no menu", menus.length === 0, {menus});
    });
    const [plot, plain] = await createActors([{name: "Gate voices plot NPC", type: "Mortal", flags: {[MOD]: {plot: true}}}, {name: "Gate voices passer-by", type: "Mortal"}]);
    made.actors.push(plot, plain);
    await step("4 no actor-menu entries", async () => {
      const options = [];
      Hooks.callAll("getActorContextOptions", ui.actors, options);
      const ours = options.filter(o => /voiced/i.test(String(o.name ?? o.label ?? "")));
      const li = a => { const el = document.createElement("li"); el.dataset.entryId = a.id; el.dataset.documentId = a.id; return el; };
      const visible = [];
      for ( const o of ours ) for ( const a of [plot, plain] ) {
        let v; try { v = typeof o.condition === "function" ? !!o.condition(li(a)) : o.condition !== false; } catch (e) { v = `threw: ${e.message}`; }
        if ( v ) visible.push({entry: o.name ?? o.label, actor: a.name, v});
      }
      ok("4 no actor-menu entries", ours.length === 2 && visible.length === 0, {entries: ours.map(o => o.name ?? o.label), visible});
    });
    made.scene = await Scene.create({name: "WoDX gate: voices", width: 1000, height: 1000});
    const [tok] = await made.scene.createEmbeddedDocuments("Token", [{name: plot.name, actorId: plot.id, actorLink: true, x: 100, y: 100}]);
    watch();
    try {
      const m = await ChatMessage.create({speaker: {alias: tok.name, scene: made.scene.id, token: tok.id}, content: CARD("Coin first, traveller."),
        whisper: [game.user.id], flags: {"wodx-npc": {talk: {actor: null, stock: false}}}});
      made.msgs.push(m);
      await sleep(2500);
    } finally { unwatch(); }
    await step("5 nothing touched the voice folders", async () => {
      const A = api(), st = A?.stats ?? {};
      const engine = A?.engine?.state ?? null, server = A?.server?.state ?? null;
      const folders = [...seen.browsed, ...seen.uploaded, ...seen.made].filter(p => /wodx-voices/.test(p));
      const grew = ["renders", "hits", "plays", "fallbacks"].filter(k => (Number(st[k]) || 0) > (Number(start.stats[k]) || 0));
      // off, or as an earlier gate left it and not moved since (named, so the lane's history shows)
      const still = (now, was) => now === "off" || now === was;
      ok("5 nothing touched the voice folders", folders.length === 0 && still(engine, start.engine) && still(server, start.server) && !grew.length,
        {folders, engine, server, grew, stats: {...st}, ...(start.engine !== "off" || start.server !== "off" || Object.values(start.stats).some(Boolean)
          ? {before: start, note: "an earlier gate on this lane used Voices; only changes during this gate count"} : {})});
    });
    await step("6 a talk card plays nothing and throws nothing", async () => {
      ok("6 a talk card plays nothing and throws nothing", !seen.spoken.length && !seen.played.length && !seen.socket.length && !seen.errors.length,
        {spoken: seen.spoken, played: seen.played, socket: seen.socket, errors: seen.errors});
    });
  } catch (e) { R.errors.push(e.message); unwatch(); }
  await step("7 clean up", async () => {
    for ( const m of made.msgs ) await m?.delete?.();
    for ( const a of made.actors ) await a?.delete?.();
    await made.scene?.delete?.();
    ok("7 clean up", !game.scenes.getName("WoDX gate: voices") && !game.actors.getName("Gate voices plot NPC") && !game.actors.getName("Gate voices passer-by"));
  });
  R.finished = new Date().toISOString();
  R.summary = `${R.steps.filter(s => s.pass).length}/${R.steps.length} passed`;
  const file = new File([JSON.stringify(R, null, 1)], "gatevoices-result.json", {type: "application/json"});
  await foundry.applications.apps.FilePicker.implementation.upload("data", "wodx-gate", file, {}, {notify: false});
  return R.summary;
}
