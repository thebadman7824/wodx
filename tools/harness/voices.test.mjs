import { test } from "node:test";
import assert from "node:assert/strict";
import * as V from "../../modules/wodx-voices/scripts/voice-rules.mjs";

const CARD = `<div class="vta-card wodx-x wnpc wnpc-talk-card"><div class="vta-body"><p class="wodx-quiet">Mira asks about the bridge.</p><p>Coin first, traveller &amp; quickly.</p><p class="wodx-quiet wnpc-heard"><i>The water laughs.</i></p></div></div>`;

test("the spoken words are the first plain paragraph of a talk card", () => {
  assert.equal(V.spokenLine(CARD), "Coin first, traveller & quickly.");
  assert.equal(V.spokenLine(`<p class="wodx-quiet">x</p><p><i>They have nothing to say about that.</i></p>`), "");
  assert.equal(V.spokenLine(""), "");
  assert.equal(V.spokenLine(`<p class="wodx-quiet">Mira takes their leave.</p><p>Go <b>well</b>.</p>`), "Go well.");
});

test("a voice profile is steady per NPC and differs between NPCs", () => {
  const a = V.profileFor({id: "actor-a"}), b = V.profileFor({id: "actor-a"}), c = V.profileFor({id: "actor-c"});
  assert.deepEqual(a, b);
  assert.notDeepEqual([a.pitch, a.rate, a.seed], [c.pitch, c.rate, c.seed]);
  for ( const id of ["1", "2", "3", "4", "5", "6", "7", "8"] ) {
    for ( const style of [null, ...Object.keys(V.STYLE_SHIFT)] ) {
      const p = V.profileFor({id, style, age: 80});
      assert.ok(p.pitch >= 0.5 && p.pitch <= 1.6 && p.rate >= 0.7 && p.rate <= 1.3, `${id} ${style}`);
    }
  }
});

test("style and age move the voice; the Storyteller's choice wins", () => {
  const base = V.profileFor({id: "x"}), drunk = V.profileFor({id: "x", style: "drunk"}), old = V.profileFor({id: "x", age: 70});
  assert.ok(drunk.rate < base.rate);
  assert.ok(old.rate < base.rate && old.pitch < base.pitch);
  const o = V.profileFor({id: "x", override: {voice: "Microsoft Zira", pitch: 1.2, rate: 0.9}});
  assert.deepEqual([o.voice, o.pitch, o.rate], ["Microsoft Zira", 1.2, 0.9]);
  assert.equal(V.profileFor({id: "x", override: {pitch: ""}}).pitch, base.pitch);
});

test("sex is used only when known, never guessed", () => {
  assert.equal(V.profileFor({id: "x", sex: "Female"}).sex, "female");
  assert.equal(V.profileFor({id: "x", sex: "any"}).sex, null);
  assert.equal(V.profileFor({id: "x"}).sex, null);
});

const VOICES = [
  {name: "Microsoft David - English (United States)", lang: "en-US", localService: true},
  {name: "Microsoft Zira - English (United States)", lang: "en-US", localService: true},
  {name: "Microsoft Hazel - English (United Kingdom)", lang: "en-GB", localService: true},
  {name: "Google UK English Male", lang: "en-GB", localService: false},
  {name: "Microsoft Jakub - Czech (Czech)", lang: "cs-CZ", localService: true}
];

test("voices on the computer come first, English only, matched to a known sex", () => {
  for ( const id of ["a", "b", "c", "d", "e", "f"] ) {
    const v = V.pickVoice(VOICES, V.profileFor({id}));
    assert.ok(v.localService && v.lang.startsWith("en"), v.name);
    assert.equal(V.voiceSex(V.pickVoice(VOICES, V.profileFor({id, sex: "male"})).name), "male");
    assert.equal(V.voiceSex(V.pickVoice(VOICES, V.profileFor({id, sex: "female"})).name), "female");
  }
  assert.equal(V.pickVoice(VOICES, V.profileFor({id: "a", override: {voice: "Google UK English Male"}})).name, "Google UK English Male");
  assert.equal(V.pickVoice([], V.profileFor({id: "a"})), null);
  const order = [...VOICES].reverse();
  assert.equal(V.pickVoice(order, V.profileFor({id: "q"})).name, V.pickVoice(VOICES, V.profileFor({id: "q"})).name, "list order does not matter");
});

test("plot NPCs and prewritten lines only (Ben, 12 November 2026)", () => {
  assert.equal(V.voiced({plot: true}), true);
  assert.equal(V.voiced({plot: false}), false);
  assert.equal(V.voiced({who: "all", plot: false}), true);
  assert.equal(V.prewritten({stock: false}), true);
  for ( const t of [{stock: true}, {stock: false, generated: true}, {stock: false, kind: "grammar"}, {}, null] ) assert.equal(V.prewritten(t), false, JSON.stringify(t));
});

test("only the people who see a line hear it", () => {
  const on = {enabled: true, userId: "u1"};
  assert.equal(V.shouldSpeak({...on}), true);
  assert.equal(V.shouldSpeak({...on, enabled: false}), false);
  assert.equal(V.shouldSpeak({...on, muted: true}), false);
  assert.equal(V.shouldSpeak({...on, whisper: ["u2", "gm"]}), false);
  assert.equal(V.shouldSpeak({...on, whisper: ["u1", "gm"]}), true);
  assert.equal(V.shouldSpeak({...on, isGM: true, gmHears: false}), false);
});

test("Kokoro voices: steady blends of one accent, a known sex kept, the Storyteller's pick parsed", () => {
  const p = V.profileFor({id: "npc-k"});
  const a = V.kokoroVoiceFor(p), b = V.kokoroVoiceFor(p);
  assert.deepEqual(a, b);
  assert.equal(a.parts.length, 2);
  assert.ok(a.parts.every(([v]) => V.KOKORO_VOICES.includes(v) && v[0] === a.accent));
  assert.ok(Math.abs(a.parts[0][1] + a.parts[1][1] - 1) < 1e-9);
  assert.match(a.id, /^[ab]_wodx_[a-z_0-9]+$/);
  for ( const id of ["1", "2", "3", "4", "5", "6"] ) {
    for ( const sex of ["female", "male"] ) {
      const k = V.kokoroVoiceFor(V.profileFor({id, sex}));
      assert.ok(k.parts.every(([v]) => v[1] === sex[0]), `${id} ${sex} ${k.id}`);
    }
  }
  assert.equal(V.kokoroVoiceFor(p, "bm_george").id, "bm_george");
  const bl = V.parseBlend("bm_george*0.6+bm_lewis");
  assert.equal(bl.id, "b_wodx_bm_george60_bm_lewis40");
  assert.equal(V.parseBlend("bm_george+af_heart"), null, "accents don't mix");
  assert.equal(V.parseBlend("nobody"), null);
  assert.equal(V.parseBlend("bm_george*1.5"), null);
  const t = V.blendTables([new Float32Array([1, 2]), new Float32Array([3, 4])], [0.25, 0.75]);
  assert.deepEqual([...t], [2.5, 3.5]);
});

test("the engine's files come from the Data folder, blends from memory, nothing else is touched", () => {
  const R = V.KOKORO_REMOTE;
  assert.deepEqual(V.engineUrl(R + "onnx/model_quantized.onnx", "/wodx-voices-engine/"), {path: "/wodx-voices-engine/hf/onnx/model_quantized.onnx"});
  assert.deepEqual(V.engineUrl(R + "voices/bm_george.bin", "/e"), {path: "/e/hf/voices/bm_george.bin"});
  assert.deepEqual(V.engineUrl(R + "voices/b_wodx_bm_george60_bm_lewis40.bin", "/e"), {blend: "b_wodx_bm_george60_bm_lewis40"});
  assert.equal(V.engineUrl("https://huggingface.co/other/model/resolve/main/x", "/e"), null);
  assert.equal(V.engineUrl("/modules/x.js", "/e"), null);
  assert.equal(V.engineUrl(R + "../../etc", "/e"), null);
});

test("cache names are steady per line and voice; speed and recipients", () => {
  const a = V.cacheName({voice: "x", speed: 1, text: "Hello."});
  assert.equal(a, V.cacheName({voice: "x", speed: 1, text: "Hello."}));
  assert.notEqual(a, V.cacheName({voice: "y", speed: 1, text: "Hello."}));
  assert.notEqual(a, V.cacheName({voice: "x", speed: 1.1, text: "Hello."}));
  assert.match(a, /^[0-9a-z]+\.wav$/);
  for ( const r of [0.7, 1, 1.3] ) { const k = V.kokoroSpeed(r); assert.ok(k >= 0.8 && k <= 1.25); }
  assert.deepEqual(V.recipients(["p", "gm", "p"], ["a", "b"]), ["p", "gm"]);
  assert.deepEqual(V.recipients([], ["a", "b"]), ["a", "b"]);
});

test("the Storyteller's lines as an NPC, and an NPC's own tongue", () => {
  const base = {authorIsGM: true, inCharacter: true, hasToken: true};
  assert.equal(V.isStorytellerLine(base), true);
  for ( const k of ["authorIsGM", "inCharacter", "hasToken"] ) assert.equal(V.isStorytellerLine({...base, [k]: false}), false, k);
  for ( const k of ["hasRolls", "playerOwned", "talkCard"] ) assert.equal(V.isStorytellerLine({...base, [k]: true}), false, k);
  assert.equal(V.plainText("<p>Leave the <b>lamp</b>.<br>Now.</p>"), "Leave the lamp. Now.");
  assert.deepEqual(V.langTries(null), ["en"]);
  assert.deepEqual(V.langTries("Czech"), ["cs", "en"]);
  assert.deepEqual(V.langTries("la"), ["la", "it", "en"]);
  const vs = [...VOICES, {name: "Microsoft Hedda - German", lang: "de-DE", localService: true}];
  assert.equal(V.pickVoice(vs, V.profileFor({id: "x", override: {lang: "cs"}})).lang, "cs-CZ");
  assert.equal(V.pickVoice(vs, V.profileFor({id: "x", override: {lang: "de"}})).lang, "de-DE");
  assert.ok(V.pickVoice(vs, V.profileFor({id: "x", override: {lang: "la"}})).lang.startsWith("en"), "no Latin or Italian voice: English");
  assert.equal(V.profileFor({id: "x", override: {kokoro: "bm_george", lang: "cs"}}).kokoro, "bm_george");
});

test("in Foundry: talk cards, the Storyteller's lines, Kokoro's shared file and the fallbacks", async () => {
  const hooks = {};
  const spoken = [], played = [], emitted = [];
  let socketFn = null;
  const settings = {enabled: true, gmHears: true, volume: 0.5, mute: false, engine: "browser", who: "plot", stLines: true, fromToken: false, hearRange: 30, cacheGen: 1, cacheBytes: 0, cacheMB: 500, engineDir: "wodx-voices-engine", cacheDir: "wodx-voices-cache", device: "wasm"};
  const actor = {id: "npc1", hasPlayerOwner: false, flags: {"wodx-npc": {behavior: {voice: "noble"}}, "wodx-voices": {plot: true}}};
  const pcActor = {id: "pc1", hasPlayerOwner: true, flags: {}};
  const tok = {id: "t1", actorId: "npc1", actorLink: true, actor, parent: {id: "s1"}};
  const pcTok = {id: "t2", actorId: "pc1", actorLink: true, actor: pcActor, parent: {id: "s1"}};
  globalThis.CONST = {CHAT_MESSAGE_STYLES: {OTHER: 0, OOC: 1, IC: 2, EMOTE: 3}};
  globalThis.Hooks = {once: (k, f) => (hooks[k] ??= []).push(f), on: (k, f) => (hooks[k] ??= []).push(f)};
  globalThis.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  globalThis.speechSynthesis = {getVoices: () => VOICES, speak: u => spoken.push(u), cancel() {}};
  globalThis.foundry = {utils: {getRoute: p => `/${p}`}, audio: {AudioHelper: {play: o => played.push(o)}}, applications: {apps: {FilePicker: {implementation: {browse: async () => ({files: []}), createDirectory: async () => null, upload: async () => null}}}}};
  globalThis.canvas = {ready: false};
  globalThis.ChatMessage = {create: async () => null};
  const mod = {};
  const gm = {id: "gm", isGM: true}, me = {id: "u1", isGM: false};
  const users = [gm, me, {id: "u2", isGM: false}];
  users.activeGM = gm;
  globalThis.game = {
    user: me, users,
    settings: {register() {}, registerMenu() {}, get: (m, k) => settings[k], set: async (m, k, v) => { settings[k] = v; }},
    modules: {get: () => mod},
    socket: {on: (n, f) => { socketFn = f; }, emit: (n, d) => emitted.push(d)},
    scenes: {get: id => (id === "s1" ? {tokens: {get: t => ({t1: tok, t2: pcTok})[t] ?? null}} : null)}
  };
  await import("../../modules/wodx-voices/scripts/main.mjs");
  for ( const f of [...hooks.init, ...hooks.ready] ) await f();
  const fire = m => hooks.createChatMessage.forEach(f => f(m));
  const talk = {id: "m1", speaker: {scene: "s1", token: "t1"}, content: CARD, whisper: ["u1", "gm"], flags: {"wodx-npc": {talk: {actor: "pc", stock: false}}}};

  // the browser's own speech
  fire(talk);
  assert.equal(spoken.length, 1);
  assert.equal(spoken[0].text, "Coin first, traveller & quickly.");
  const p = V.profileFor({id: "npc1", style: "noble"});
  assert.deepEqual([spoken[0].pitch, spoken[0].rate, spoken[0].volume], [p.pitch, p.rate, 0.5]);
  fire({...talk, whisper: ["u2", "gm"]});
  fire({...talk, flags: {}});
  settings.mute = true; fire(talk); settings.mute = false;
  settings.enabled = false; fire(talk); settings.enabled = true;
  fire({...talk, flags: {"wodx-npc": {talk: {actor: "pc", stock: true}}}});
  fire({...talk, flags: {"wodx-npc": {talk: {actor: "pc", stock: false, generated: true}}}});
  actor.flags["wodx-voices"].plot = false; fire(talk);
  settings.who = "all"; fire(talk); settings.who = "plot"; actor.flags["wodx-voices"].plot = true;
  assert.equal(spoken.length, 2, "not for this user, not a talk card, a stock or generated line, muted, or off: silent; not a plot NPC: silent unless every NPC speaks");
  spoken.pop();

  // the Storyteller in character as an NPC (Improvement Desk vo1)
  const st = {id: "m2", speaker: {scene: "s1", token: "t1"}, content: "<p>The gate stays shut.</p>", whisper: [], style: 2, author: gm, flags: {}};
  fire(st);
  assert.equal(spoken.at(-1).text, "The gate stays shut.");
  const n = spoken.length;
  fire({...st, style: 1});
  fire({...st, author: me});
  fire({...st, speaker: {scene: "s1", token: "t2"}});
  fire({...st, rolls: [{}]});
  settings.stLines = false; fire(st); settings.stLines = true;
  assert.equal(spoken.length, n, "out of character, a player, a player's character, dice, or switched off: silent");

  // Kokoro on: a player waits for the Storyteller's file, then plays it
  settings.engine = "kokoro";
  fire(talk);
  assert.equal(spoken.length, n, "a player does not speak while the Storyteller renders");
  socketFn({t: "play", id: "m1", src: "wodx-voices-cache/g1/abc.wav", scene: "s1", token: "t1", users: ["u1", "gm"]});
  assert.equal(played.at(-1).src, "wodx-voices-cache/g1/abc.wav");
  assert.equal(played.at(-1).volume, 0.5);
  socketFn({t: "play", id: "m9", src: "x.wav", scene: "s1", token: "t1", users: ["u2", "gm"]});
  assert.equal(played.length, 1, "a file for someone else is not played");
  fire({...talk, id: "m3"});
  socketFn({t: "fallback", id: "m3", users: ["u1", "gm"]});
  assert.equal(spoken.at(-1).text, "Coin first, traveller & quickly.", "the Storyteller's engine failed: the browser reads it");

  // an NPC with a tongue of its own is read by the browser even with Kokoro on
  actor.flags["wodx-voices"] = {plot: true, override: {lang: "cs"}};
  const before = spoken.length;
  fire({...talk, id: "m4"});
  assert.equal(spoken.length, before + 1);
  actor.flags["wodx-voices"] = {plot: true};

  // the Storyteller's client with no engine files: it tells the players to fall back, and reads the line itself
  game.user = gm;
  globalThis.fetch = async () => ({ok: false, status: 404});
  fire({...talk, id: "m5"});
  for ( let i = 0; i < 50 && !emitted.length; i++ ) await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(emitted.at(-1), {t: "fallback", id: "m5", users: ["u1", "gm"]});
  assert.equal(spoken.at(-1).text, "Coin first, traveller & quickly.");
  assert.equal(mod.api.engine.state, "failed");
  assert.match(mod.api.engine.error, /fetch-engine/);
  assert.equal(typeof mod.api.preview, "function");

  // the voice server on the Storyteller's PC (0.3.0): the line goes to the server with the NPC's voice and delivery,
  // is cached, and the players are told to play it; the NPC regards the character warmly, so the delivery says so
  settings.engine = "chatterbox"; settings.serverUrl = "http://127.0.0.1:7861/"; settings.serverKey = "k3y";
  actor.flags["wodx-npc"].attitude = {pc: {step: 3}};
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    calls.push({url: String(url), init});
    if ( init.headers?.["X-WoDX-Key"] !== "k3y" ) return {ok: false, status: 401};
    if ( String(url).endsWith("/health") ) return {ok: true, json: async () => ({ok: true, device: "cuda"})};
    if ( String(url).endsWith("/voices") ) return {ok: true, json: async () => ({voices: [{id: "lsr84", f0: 118, register: "low", rate: 2.4}, {id: "lsr652", f0: 205, register: "high", rate: 2.9}]})};
    if ( String(url).endsWith("/render") ) return {ok: true, blob: async () => new Blob([new Uint8Array(44)], {type: "audio/wav"})};
    return {ok: false, status: 404};
  };
  emitted.length = 0;
  fire({...talk, id: "m6", content: "<p>Welcome back, friend!</p>"});
  for ( let i = 0; i < 50 && !emitted.length; i++ ) await new Promise(r => setTimeout(r, 10));
  assert.equal(emitted.at(-1)?.t, "play", "the server's file is shared");
  assert.match(emitted.at(-1).src, /^wodx-voices-cache\/g1\/[a-z0-9]+\.wav$/);
  const body = JSON.parse(calls.find(c => c.url === "http://127.0.0.1:7861/render").init.body);
  assert.equal(body.text, "Welcome back, friend!");
  assert.ok(["lsr84", "lsr652"].includes(body.voice));
  assert.deepEqual([body.exaggeration, body.cfg], [V.deliveryFor({text: "Welcome back, friend!", step: 3}).exaggeration, V.deliveryFor({text: "Welcome back, friend!", step: 3}).cfg]);
  assert.equal(mod.api.server.state, "ready");
  // the same line again comes from the cache
  const renders = calls.filter(c => c.url.endsWith("/render")).length;
  emitted.length = 0;
  fire({...talk, id: "m7", content: "<p>Welcome back, friend!</p>"});
  for ( let i = 0; i < 50 && !emitted.length; i++ ) await new Promise(r => setTimeout(r, 10));
  assert.equal(calls.filter(c => c.url.endsWith("/render")).length, renders, "a cached line is not rendered again");
  assert.equal(emitted.at(-1)?.t, "play");
  // the server stops: Kokoro is tried next, and without it the players fall back to their own speech
  globalThis.fetch = async () => ({ok: false, status: 503});
  emitted.length = 0;
  fire({...talk, id: "m8", content: "<p>Another thing.</p>"});
  for ( let i = 0; i < 50 && !emitted.length; i++ ) await new Promise(r => setTimeout(r, 10));
  assert.deepEqual(emitted.at(-1), {t: "fallback", id: "m8", users: ["u1", "gm"]});
  delete actor.flags["wodx-npc"].attitude;
});

test("the voice server: delivery from the line, regard, wounds and temper; a voice per NPC from the server's list", () => {
  const even = V.deliveryFor({text: "The road is long."});
  assert.deepEqual(even, {exaggeration: 0.5, cfg: 0.5, temperature: 0.8, tone: "even"});
  const shout = V.deliveryFor({text: "Get out! NOW!"});
  assert.ok(shout.exaggeration > even.exaggeration + 0.3 && shout.tone === "shouts");
  assert.equal(V.deliveryFor({text: "Chapter IV of the book."}).tone, "even", "Roman numerals are not shouting");
  const trail = V.deliveryFor({text: "It was long ago..."});
  assert.ok(trail.cfg < even.cfg && trail.tone === "trails off");
  assert.equal(V.deliveryFor({text: "Leave.", step: -3}).tone, "hostile");
  assert.equal(V.deliveryFor({text: "Welcome.", step: 2}).tone, "warm");
  const hurt = V.deliveryFor({text: "Help me.", wounds: 5});
  assert.ok(hurt.exaggeration >= 0.85 && hurt.cfg <= 0.3 && hurt.tone === "in pain");
  assert.ok(V.deliveryFor({text: "Yes.", temper: "fiery"}).exaggeration > V.deliveryFor({text: "Yes.", temper: "calm"}).exaggeration);
  const wild = V.deliveryFor({text: "NO! NO! NO! NO!", wounds: 9, temper: "fiery", step: -3});
  assert.ok(wild.exaggeration <= 1.5 && wild.cfg >= 0.2, "kept in the server's range");
  for ( const d of [even, shout, trail, hurt, wild] ) for ( const k of ["exaggeration", "cfg", "temperature"] ) assert.equal(Math.round(d[k] * 20), d[k] * 20, "steps of 0.05");

  const list = [{id: "b", f0: 120, rate: 2.2}, {id: "a", f0: 210, rate: 3}, {id: "c", f0: 165, rate: 2.6}, {id: "d", f0: 130, rate: 3.1}];
  assert.equal(V.registerOf(120), "low"); assert.equal(V.registerOf(165), "mid"); assert.equal(V.registerOf(210), "high");
  const p = V.profileFor({id: "npc9"});
  assert.equal(V.serverVoiceFor(p, list), V.serverVoiceFor(p, [...list].reverse()), "steady whatever order the server lists them in");
  for ( let i = 0; i < 30; i++ ) {
    assert.notEqual(V.serverVoiceFor(V.profileFor({id: `m${i}`, sex: "male"}), list), "a");
    assert.notEqual(V.serverVoiceFor(V.profileFor({id: `f${i}`, sex: "female"}), list), "b");
  }
  const many = new Set(Array.from({length: 40}, (_, i) => V.serverVoiceFor(V.profileFor({id: `n${i}`}), list)));
  assert.equal(many.size, 4, "unknown sex: every voice is open");
  assert.equal(V.serverVoiceFor(p, list, "d"), "d", "the Storyteller's pick wins");
  assert.equal(V.serverVoiceFor(p, list, "gone"), V.serverVoiceFor(p, list), "a pick the server lacks is ignored");
  assert.equal(V.serverVoiceFor(p, []), null);
  assert.equal(V.profileFor({id: "x", temper: "weary"}).temper, "weary");
  assert.equal(V.profileFor({id: "x", temper: "made up"}).temper, null);
  assert.equal(V.serverBase("http://127.0.0.1:7861/"), "http://127.0.0.1:7861");
  assert.equal(V.serverBase("javascript:alert(1)"), "");
  assert.equal(V.serverVoiceKey("lsr84", {exaggeration: 0.5, cfg: 0.45, temperature: 0.8}), "cb_lsr84_0.50_0.45_0.80");
});
