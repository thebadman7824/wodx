/**
 * WoDX Voices (the version is in module.json): NPCs speak their talk lines aloud.
 *
 * First build: the browser's own speech. When WoDX NPC posts a talk card (an answer, a greeting, a farewell), each
 * client that receives it reads the NPC's words in that NPC's steady voice (voice-rules.mjs). A whispered answer
 * reaches only the people it was whispered to, so only they hear it. Later builds render the line once with Kokoro
 * in the Storyteller's browser and play the file from the token; this one stays as the fallback.
 * World setting Voices (off by default); each player has a volume and a mute.
 */
import * as V from "./voice-rules.mjs";

const MOD = "wodx-voices";
const NPC = "wodx-npc";
const setting = k => { try { return game.settings.get(MOD, k); } catch (e) { return null; } };
const synth = () => globalThis.speechSynthesis ?? null;

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

/** Speak a line in a profile's voice with the browser's speech. Returns the voice used, or null. */
export function speak(text, profile) {
  const S = synth();
  if ( !S || !text ) return null;
  const voice = V.pickVoice(S.getVoices?.() ?? [], profile);
  const u = new SpeechSynthesisUtterance(text);
  if ( voice ) u.voice = voice;
  u.lang = voice?.lang ?? "en";
  u.pitch = profile.pitch; u.rate = profile.rate;
  u.volume = Math.max(0, Math.min(1, Number(setting("volume") ?? 0.8)));
  S.speak(u);
  return voice;
}

function onTalkCard(msg) {
  if ( !msg?.flags?.[NPC]?.talk ) return;
  const ok = V.shouldSpeak({enabled: !!setting("enabled"), muted: !!setting("mute"), isGM: !!game.user?.isGM,
    gmHears: setting("gmHears") !== false, whisper: msg.whisper ?? [], userId: game.user?.id ?? ""});
  if ( !ok ) return;
  const tok = speakerToken(msg);
  if ( !tok ) return;
  const text = V.spokenLine(msg.content);
  if ( text ) speak(text, profileOf(tok));
}

Hooks.once("init", () => {
  game.settings.register(MOD, "enabled", {
    name: "Voices", scope: "world", config: true, type: Boolean, default: false, requiresReload: false,
    hint: "NPCs speak their talk answers, greetings and farewells aloud, each in a voice of its own. Only the people who see a line hear it."
  });
  game.settings.register(MOD, "gmHears", {
    name: "Storyteller hears every line", scope: "world", config: true, type: Boolean, default: true,
    hint: "The Storyteller sees every talk card, so hears every line too. Turn off to hear none."
  });
  game.settings.register(MOD, "volume", {
    name: "Voice volume", scope: "client", config: true, type: Number, default: 0.8, range: {min: 0, max: 1, step: 0.05}
  });
  game.settings.register(MOD, "mute", {
    name: "Mute NPC voices", scope: "client", config: true, type: Boolean, default: false
  });
});

Hooks.once("ready", () => {
  // Some browsers fill the voice list late; asking once wakes it.
  try { synth()?.getVoices?.(); } catch (e) { /* no speech here */ }
  game.modules.get(MOD).api = {
    profileOf, speak, rules: V,
    /** Hear an NPC token's voice (for the Storyteller, from a macro until the picker arrives). */
    preview: (tokDoc, text = "Good evening. You wanted a word?") => speak(text, profileOf(tokDoc?.document ?? tokDoc)),
    stop: () => synth()?.cancel?.()
  };
});

Hooks.on("createChatMessage", msg => { try { onTalkCard(msg); } catch (e) { console.error(`${MOD} | speak`, e); } });
