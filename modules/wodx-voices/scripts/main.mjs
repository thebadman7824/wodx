/**
 * WoDX Voices (the version is in module.json): NPCs speak aloud.
 *
 * What is spoken: WoDX NPC talk cards (answers, greetings, farewells), and the Storyteller's own lines when the
 * Storyteller chats in character as an NPC's token (0.2.0). Each NPC keeps one steady voice (voice-rules.mjs).
 * Only the people who see a line hear it.
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
  return V.profileFor({id, sex: mine.sex ?? people.sex ?? null, age: mine.age ?? null, style, override: mine.override ?? null});
}

/** What a chat message says aloud, or "": a talk card's words, or the Storyteller in character as an NPC. */
function lineOf(msg, tok) {
  if ( msg?.flags?.[NPC]?.talk ) return V.spokenLine(msg.content);
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

/** The cached file for a line in an NPC's voice, rendering it first if needed (the Storyteller's client). */
export async function fileFor(text, profile) {
  const spec = V.kokoroVoiceFor(profile, profile.kokoro);
  const speed = V.kokoroSpeed(profile.rate);
  const path = `${cacheDir()}/${V.cacheName({voice: spec.id, speed, text})}`;
  if ( known.has(path) ) { stats.hits += 1; return {src: path, rendered: false}; }
  const t0 = performance.now();
  const blob = await E.render(text, spec, speed);
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

const useKokoro = profile => setting("engine") === "kokoro" && V.langTries(profile.lang)[0] === "en";

/** The Storyteller's client: render, then tell everyone who sees the line to play it. */
async function produce(msg, tok, text, profile, users) {
  try {
    if ( E.status.state !== "ready" ) await loadEngine();
    if ( E.status.state !== "ready" ) throw new Error(E.status.error ?? "engine not ready");
    const {src} = await fileFor(text, profile);
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

function loadEngine() {
  if ( !game.user?.isGM || setting("engine") !== "kokoro" ) return Promise.resolve(E.status);
  return E.load({dir: String(setting("engineDir") || "wodx-voices-engine"), device: setting("device") || "wasm", route});
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
  reg("engine", {name: "Voice engine", scope: "world", config: true, type: String, default: "kokoro",
    choices: {kokoro: "Kokoro (made once on the Storyteller's computer, played to everyone)", browser: "Each browser's own speech"},
    hint: "Kokoro needs its files in Foundry's Data folder (see the module's README). Without them, or when a line fails, the browser's own speech reads it.",
    onChange: () => loadEngine()});
  reg("stLines", {name: "Read the Storyteller's lines", scope: "world", config: true, type: Boolean, default: true,
    hint: "When the Storyteller chats in character as an NPC's token, the line is read in that NPC's voice."});
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
    profileOf, speak, fileFor, freshCache, rules: V, engine: E.status, stats,
    load: loadEngine,
    /** Hear an NPC token's voice (the Storyteller), in Kokoro when it is ready. */
    preview: async (tokDoc, text = "Good evening. You wanted a word?") => {
      const doc = tokDoc?.document ?? tokDoc;
      const p = profileOf(doc);
      if ( game.user?.isGM && useKokoro(p) && E.status.state === "ready" ) { const {src} = await fileFor(text, p); return playFrom(src, doc); }
      return speak(text, p);
    },
    stop: () => synth()?.cancel?.()
  };
});

Hooks.on("createChatMessage", msg => { try { onMessage(msg); } catch (e) { console.error(`${MOD} | speak`, e); } });
