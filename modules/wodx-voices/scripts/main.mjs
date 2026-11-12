/**
 * WoDX Voices (the version is in module.json): NPCs speak aloud.
 *
 * Who and what is spoken (Ben, 12 November 2026, as in Fallout and Baldur's Gate): only NPCs marked as plot NPCs, and
 * only the lines the Storyteller wrote for them beforehand (their WoDX NPC talk sheet). Stock and generated lines,
 * barks and everyone else stay text. The Storyteller's improvised chat in character can be read too, off by default.
 * Each voiced NPC keeps one steady voice (voice-rules.mjs). Only the people who see a line hear it.
 *
 * Kokoro (0.2.0, the default engine): the active Storyteller's browser renders each line once (engine.mjs), saves it to
 * a cache folder in Data, and tells the people who see the line to play that file, from the NPC's token when its
 * scene is in view, fading with distance and muffled by walls. Players' computers only play a small file.
 * The browser's own speech is the fallback: when the engine is missing or fails, when no Storyteller is online, and
 * for an NPC given a tongue other than English (Kokoro speaks English only).
 * World setting Voices (off by default); each player has a volume and a mute.
 */
import * as V from "./voice-rules.mjs";
import * as E from "./engine.mjs";
import * as C from "./chatterbox.mjs";

const MOD = "wodx-voices";
const NPC = "wodx-npc";
const SOCKET = `module.${MOD}`;
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const synth = () => globalThis.speechSynthesis ?? null;
const route = p => (foundry.utils?.getRoute ? foundry.utils.getRoute(p) : `/${p}`);
const FP = () => foundry.applications?.apps?.FilePicker?.implementation ?? globalThis.FilePicker;
const isActiveGM = () => !!game.user?.isGM && (game.users?.activeGM ? game.users.activeGM.id === game.user.id : true);
const volume = () => Math.max(0, Math.min(1, Number(setting("volume") ?? 0.8)));

/** Lines waiting for the Storyteller's file, by message id: what to say if the file never comes. */
const pending = new Map();
/** Files already in the cache folder (the Storyteller's client). */
const known = new Set();
const stats = {renders: 0, hits: 0, plays: 0, fallbacks: 0};
let warnedFull = false;
/** When the voice server was last tried, so a stopped server costs one wait a minute, not one per line. */
let serverTried = 0;

/** The token a chat message speaks for, or null. */
function speakerToken(msg) {
  const s = msg?.speaker ?? {};
  if ( !s.token ) return null;
  return game.scenes?.get(s.scene)?.tokens?.get(s.token) ?? null;
}

/** The voice profile of a token's NPC. Linked NPCs keep one voice everywhere; each unlinked token has its own. */
export function profileOf(tokDoc) {
  const actor = tokDoc?.actor ?? null;
  const id = tokDoc?.actorLink === false ? `${tokDoc.actorId}:${tokDoc.id}` : (tokDoc?.actorId ?? actor?.id ?? "");
  const mine = actor?.flags?.[MOD] ?? {};
  const people = actor?.flags?.["wodx-creation"]?.people ?? {};
  const style = actor?.flags?.[NPC]?.behavior?.voice ?? null;
  return V.profileFor({id, sex: mine.sex ?? people.sex ?? null, age: mine.age ?? null, style, override: mine.override ?? null, temper: mine.temper ?? null});
}

/** Whether an actor is marked as a plot NPC. */
export const isPlot = actor => !!actor?.flags?.[MOD]?.plot;

/** Mark or unmark a plot NPC (the Storyteller). */
export async function setPlot(actor, on = true) {
  if ( !actor || !game.user?.isGM ) return false;
  await actor.setFlag(MOD, "plot", !!on);
  return !!on;
}

/** What a chat message says aloud, or "": a talk card's words, or the Storyteller in character as an NPC. */
function lineOf(msg, tok) {
  const talk = msg?.flags?.[NPC]?.talk;
  if ( talk ) return V.prewritten(talk) ? V.spokenLine(msg.content) : "";
  if ( !setting("stLines") ) return "";
  const IC = globalThis.CONST?.CHAT_MESSAGE_STYLES?.IC ?? 2;
  const style = msg?.style ?? msg?.type;
  const ok = V.isStorytellerLine({authorIsGM: !!(msg?.author ?? msg?.user)?.isGM, inCharacter: style === IC, hasToken: !!tok,
    hasRolls: !!(msg?.rolls?.length), playerOwned: !!tok?.actor?.hasPlayerOwner, talkCard: false});
  return ok ? V.plainText(msg.content) : "";
}

/** Whether this client should hear a line meant for these users. */
function hears(users) {
  return V.shouldSpeak({enabled: !!setting("enabled"), muted: !!setting("mute"), isGM: !!game.user?.isGM,
    gmHears: setting("gmHears") !== false, whisper: users ?? [], userId: game.user?.id ?? ""});
}

/** Speak a line in a profile's voice with the browser's speech. Returns the voice used, or null. */
export function speak(text, profile) {
  const S = synth();
  if ( !S || !text ) return null;
  const voice = V.pickVoice(S.getVoices?.() ?? [], profile);
  const u = new SpeechSynthesisUtterance(text);
  if ( voice ) u.voice = voice;
  u.lang = voice?.lang ?? V.langTries(profile.lang)[0];
  u.pitch = profile.pitch; u.rate = profile.rate; u.volume = volume();
  S.speak(u);
  stats.fallbacks += 1;
  return voice;
}

/** Play a cached file, from the token when its scene is in view. */
function playFrom(src, tokDoc) {
  stats.plays += 1;
  const tok = tokDoc?.object;
  const here = tok && canvas?.ready && canvas.scene?.id === tokDoc.parent?.id;
  try {
    if ( setting("fromToken") && here && typeof canvas.sounds?.playAtPosition === "function" ) {
      return canvas.sounds.playAtPosition(src, tok.center, Number(setting("hearRange")) || 30,
        {volume: volume(), walls: true, easing: true, gmAlways: true});
    }
  } catch (e) { console.warn(`${MOD} | from the token`, e); }
  return (foundry.audio?.AudioHelper ?? globalThis.AudioHelper)?.play?.({src, volume: volume(), autoplay: true, loop: false}, false);
}

const cacheRoot = () => String(setting("cacheDir") || "wodx-voices-cache").replace(/^\/+|\/+$/g, "");
const cacheDir = () => `${cacheRoot()}/g${Number(setting("cacheGen")) || 1}`;

async function ensureDir() {
  for ( const p of [cacheRoot(), cacheDir()] ) {
    try { await FP().createDirectory("data", p, {}); } catch (e) { /* already there */ }
  }
}

async function fillKnown() {
  known.clear();
  try { const r = await FP().browse("data", cacheDir()); for ( const f of r?.files ?? [] ) known.add(decodeURIComponent(String(f)).replace(/^\/+/, "")); } catch (e) { /* none yet */ }
}

/** Health levels an actor has lost. */
function woundsOf(actor) {
  const d = actor?.system?.health?.damage ?? {};
  return ["bashing", "lethal", "aggravated"].reduce((n, k) => n + (Number(d[k]) || 0), 0);
}

/** What colours a line's delivery: how the NPC regards the character it speaks to, and its wounds. */
function moodOf(msg, tok) {
  const pc = msg?.flags?.[NPC]?.talk?.actor ?? null;
  const npc = game.actors?.get?.(tok?.actorId) ?? tok?.actor ?? null;
  const step = pc ? Number(npc?.flags?.[NPC]?.attitude?.[pc]?.step ?? 0) : 0;
  return {step: Number.isFinite(step) ? step : 0, wounds: woundsOf(tok?.actor)};
}

/**
 * The cached file for a line in an NPC's voice, rendering it first if needed (the Storyteller's client).
 * engine "chatterbox": the voice server, with the delivery from the line and mood; otherwise Kokoro.
 */
export async function fileFor(text, profile, mood = {}, engine = "kokoro") {
  let path, make;
  if ( engine === "chatterbox" ) {
    const voice = V.serverVoiceFor(profile, C.status.voices, profile.chatterbox);
    if ( !voice ) throw new Error("the voice server has no voices");
    const d = V.deliveryFor({text, step: mood.step, wounds: mood.wounds, temper: profile.temper});
    path = `${cacheDir()}/${V.cacheName({engine: "cb", voice: V.serverVoiceKey(voice, d), speed: 1, text})}`;
    make = () => C.render(text, voice, d, profile.seed);
  } else {
    const spec = V.kokoroVoiceFor(profile, profile.kokoro);
    const speed = V.kokoroSpeed(profile.rate);
    path = `${cacheDir()}/${V.cacheName({voice: spec.id, speed, text})}`;
    make = () => E.render(text, spec, speed);
  }
  if ( known.has(path) ) { stats.hits += 1; return {src: path, rendered: false}; }
  const t0 = performance.now();
  const blob = await make();
  await ensureDir();
  const name = path.split("/").pop();
  await FP().upload("data", cacheDir(), new File([blob], name, {type: "audio/wav"}), {}, {notify: false});
  known.add(path);
  stats.renders += 1;
  const bytes = (Number(setting("cacheBytes")) || 0) + blob.size;
  game.settings.set(MOD, "cacheBytes", bytes).catch(() => null);
  const cap = (Number(setting("cacheMB")) || 0) * 1048576;
  if ( cap && bytes > cap && !warnedFull ) {
    warnedFull = true;
    ChatMessage.create({speaker: {alias: "WoDX Voices"}, whisper: game.users.filter(u => u.isGM).map(u => u.id),
      content: `<p>The voice cache holds about ${Math.round(bytes / 1048576)} MB, over the ${setting("cacheMB")} MB set. Start a fresh cache in the module settings; the old folder, Data/${cacheDir()}, can then be deleted by hand.</p>`}).catch(() => null);
  }
  return {src: path, rendered: true, ms: Math.round(performance.now() - t0)};
}

/** Whether a line is rendered on the Storyteller's computer: Kokoro and the voice server speak English only. */
const useKokoro = profile => ["kokoro", "chatterbox"].includes(setting("engine")) && V.langTries(profile.lang)[0] === "en";

/** A file for the line: the voice server first when chosen, then Kokoro, else an error (the browser's speech reads it). */
async function bestFile(text, profile, mood) {
  if ( setting("engine") === "chatterbox" ) {
    try {
      if ( C.status.state !== "ready" && Date.now() - serverTried > 60000 ) { serverTried = Date.now(); await loadServer(); }
      if ( C.status.state === "ready" ) return await fileFor(text, profile, mood, "chatterbox");
    } catch (e) { console.warn(`${MOD} | voice server`, e); }
  }
  if ( E.status.state !== "ready" ) await loadKokoro();
  if ( E.status.state !== "ready" ) throw new Error(E.status.error ?? "engine not ready");
  return fileFor(text, profile, mood, "kokoro");
}

/** The Storyteller's client: render, then tell everyone who sees the line to play it. */
async function produce(msg, tok, text, profile, users) {
  try {
    const {src} = await bestFile(text, profile, moodOf(msg, tok));
    game.socket?.emit(SOCKET, {t: "play", id: msg.id, src, scene: tok.parent?.id, token: tok.id, users});
    if ( hears(users) ) playFrom(src, tok);
  } catch (e) {
    console.warn(`${MOD} | Kokoro`, e);
    game.socket?.emit(SOCKET, {t: "fallback", id: msg.id, users});
    if ( hears(users) ) speak(text, profile);
  }
}

function onMessage(msg) {
  if ( !setting("enabled") ) return;
  const tok = speakerToken(msg);
  if ( !tok ) return;
  if ( !V.voiced({who: setting("who"), plot: isPlot(tok.actor)}) ) return;
  const text = lineOf(msg, tok);
  if ( !text ) return;
  const profile = profileOf(tok);
  const users = V.recipients(msg.whisper ?? [], game.users?.map?.(u => u.id) ?? []);
  if ( !useKokoro(profile) ) { if ( hears(users) ) speak(text, profile); return; }
  if ( isActiveGM() ) { produce(msg, tok, text, profile, users); return; }
  if ( !game.users?.activeGM ) { if ( hears(users) ) speak(text, profile); return; }
  if ( !hears(users) ) return;
  pending.set(msg.id, {text, profile});
  setTimeout(() => pending.delete(msg.id), 60000);
}

function onSocket(data) {
  if ( !data || !setting("enabled") ) return;
  const p = pending.get(data.id);
  pending.delete(data.id);
  if ( !hears(data.users) ) return;
  if ( data.t === "play" ) playFrom(data.src, game.scenes?.get(data.scene)?.tokens?.get(data.token) ?? null);
  else if ( data.t === "fallback" && p ) speak(p.text, p.profile);
}

function loadKokoro() {
  if ( !game.user?.isGM ) return Promise.resolve(E.status);
  return E.load({dir: String(setting("engineDir") || "wodx-voices-engine"), device: setting("device") || "wasm", route});
}

function loadServer() {
  if ( !game.user?.isGM ) return Promise.resolve(C.status);
  return C.load({url: setting("serverUrl"), key: setting("serverKey")});
}

/** Get the chosen engine ready (the Storyteller). Kokoro waits until the voice server fails, to spare memory. */
function loadEngine() {
  if ( !game.user?.isGM ) return Promise.resolve(null);
  if ( setting("engine") === "chatterbox" ) return loadServer();
  if ( setting("engine") === "kokoro" ) return loadKokoro();
  return Promise.resolve(null);
}

/** Start a fresh cache folder. Foundry can't delete files from the browser, so the old folder stays until removed by hand. */
async function freshCache() {
  if ( !game.user?.isGM ) return null;
  const old = cacheDir();
  await game.settings.set(MOD, "cacheGen", (Number(setting("cacheGen")) || 1) + 1);
  await game.settings.set(MOD, "cacheBytes", 0);
  warnedFull = false;
  await ensureDir(); await fillKnown();
  ui.notifications?.info?.(`Voices: a fresh cache in Data/${cacheDir()}. The old one, Data/${old}, can be deleted by hand.`);
  return cacheDir();
}

/** The settings button: asks, then starts a fresh cache. */
class FreshCache {
  render() {
    const D = foundry.applications?.api?.DialogV2;
    const ask = D ? D.confirm({window: {title: "Start a fresh voice cache"}, content: "<p>New lines will be saved in a new folder. The old folder stays in Data until you delete it.</p>"}) : Promise.resolve(true);
    Promise.resolve(ask).then(ok => (ok ? freshCache() : null));
    return this;
  }
}

Hooks.once("init", () => {
  const reg = (k, o) => game.settings.register(MOD, k, o);
  reg("enabled", {name: "Voices", scope: "world", config: true, type: Boolean, default: false,
    hint: "NPCs speak their talk answers, greetings and farewells aloud, and the Storyteller's lines when chatting in character as an NPC. Each NPC keeps a voice of its own. Only the people who see a line hear it.",
    onChange: () => loadEngine()});
  reg("engine", {name: "Voice engine", scope: "world", config: true, type: String, default: "chatterbox",
    choices: {chatterbox: "Voice server on the Storyteller's PC (most natural, needs the server running)",
      kokoro: "Kokoro (made once on the Storyteller's computer, played to everyone)", browser: "Each browser's own speech"},
    hint: "The voice server and Kokoro are set up as the module's README says. When the server is not running, Kokoro reads the line; without Kokoro, the browser's own speech.",
    onChange: () => loadEngine()});
  reg("who", {name: "Who speaks aloud", scope: "world", config: true, type: String, default: "plot",
    choices: {plot: "Plot NPCs only (marked in the Actors list)", all: "Every NPC"},
    hint: "Plot NPCs are marked with Voiced (plot NPC) on the right-click menu in the Actors list. Only the lines written on their talk sheet are read; stock and generated lines stay text."});
  reg("stLines", {name: "Read the Storyteller's improvised lines", scope: "world", config: true, type: Boolean, default: false,
    hint: "When the Storyteller chats in character as a voiced NPC's token, the line is read in that NPC's voice. Off by default: only prewritten lines are voiced."});
  reg("fromToken", {name: "Sound from the token", scope: "world", config: true, type: Boolean, default: true,
    hint: "A line plays from the NPC on the map, fading with distance and muffled by walls, when that scene is in view."});
  reg("hearRange", {name: "How far a voice carries", scope: "world", config: true, type: Number, default: 30, range: {min: 5, max: 120, step: 5},
    hint: "In the scene's grid units."});
  reg("gmHears", {name: "Storyteller hears every line", scope: "world", config: true, type: Boolean, default: true,
    hint: "The Storyteller sees every talk card, so hears every line too. Turn off to hear none."});
  reg("device", {name: "Kokoro runs on", scope: "world", config: true, type: String, default: "wasm",
    choices: {wasm: "The processor (steady)", webgpu: "The graphics card (faster, needs WebGPU)"}, onChange: () => null});
  reg("engineDir", {name: "Kokoro files folder", scope: "world", config: true, type: String, default: "wodx-voices-engine",
    hint: "A folder in Foundry's Data folder."});
  reg("cacheDir", {name: "Voice cache folder", scope: "world", config: true, type: String, default: "wodx-voices-cache",
    hint: "A folder in Foundry's Data folder, outside every world."});
  reg("serverUrl", {name: "Voice server address", scope: "client", config: true, type: String, default: "http://127.0.0.1:7861",
    hint: "Where tools/voices/chatterbox_server.py listens on this computer. Only the Storyteller's browser uses it.", onChange: () => loadEngine()});
  reg("serverKey", {name: "Voice server key", scope: "client", config: true, type: String, default: "",
    hint: "The key the server shows when it starts (also in its key file). Kept in this browser only.", onChange: () => loadEngine()});
  reg("cacheMB", {name: "Voice cache size warning (MB)", scope: "world", config: true, type: Number, default: 500, range: {min: 50, max: 5000, step: 50}});
  reg("cacheGen", {scope: "world", config: false, type: Number, default: 1});
  reg("cacheBytes", {scope: "world", config: false, type: Number, default: 0});
  reg("volume", {name: "Voice volume", scope: "client", config: true, type: Number, default: 0.8, range: {min: 0, max: 1, step: 0.05}});
  reg("mute", {name: "Mute NPC voices", scope: "client", config: true, type: Boolean, default: false});
  game.settings.registerMenu?.(MOD, "fresh", {name: "Voice cache", label: "Start a fresh cache", icon: "fas fa-broom", type: FreshCache, restricted: true});
});

Hooks.once("ready", () => {
  try { synth()?.getVoices?.(); } catch (e) { /* no speech here */ }
  game.socket?.on?.(SOCKET, data => { try { onSocket(data); } catch (e) { console.error(`${MOD} | socket`, e); } });
  if ( game.user?.isGM ) { fillKnown(); if ( setting("enabled") ) loadEngine(); }
  game.modules.get(MOD).api = {
    profileOf, speak, fileFor, freshCache, isPlot, setPlot, rules: V, engine: E.status, server: C.status, stats,
    load: loadEngine,
    /** Hear an NPC token's voice (the Storyteller), in Kokoro when it is ready. */
    preview: async (tokDoc, text = "Good evening. You wanted a word?") => {
      const doc = tokDoc?.document ?? tokDoc;
      const p = profileOf(doc);
      if ( game.user?.isGM && useKokoro(p) ) {
        try { const {src} = await bestFile(text, p, {step: 0, wounds: woundsOf(doc?.actor)}); return playFrom(src, doc); } catch (e) { /* speech below */ }
      }
      return speak(text, p);
    },
    stop: () => synth()?.cancel?.()
  };
});

/** The right-click menu in the Actors list: mark a plot NPC. Foundry 13+ and older hook names both. */
function plotOption(options) {
  const actorOf = li => game.actors?.get((li?.dataset ?? li?.[0]?.dataset)?.entryId ?? (li?.dataset ?? li?.[0]?.dataset)?.documentId);
  options.push({
    name: "Voiced (plot NPC)", icon: '<i class="fas fa-microphone"></i>',
    condition: li => game.user?.isGM && !!actorOf(li) && !isPlot(actorOf(li)),
    callback: li => setPlot(actorOf(li), true)
  }, {
    name: "Not voiced", icon: '<i class="fas fa-microphone-slash"></i>',
    condition: li => game.user?.isGM && isPlot(actorOf(li)),
    callback: li => setPlot(actorOf(li), false)
  });
}
Hooks.on("getActorContextOptions", (app, options) => plotOption(options));
Hooks.on("getActorDirectoryEntryContext", (app, options) => plotOption(options));

Hooks.on("createChatMessage", msg => { try { onMessage(msg); } catch (e) { console.error(`${MOD} | speak`, e); } });
