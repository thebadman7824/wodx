/**
 * WoDX Voices: the pure rules (no Foundry). What a talk card says aloud, and the steady voice each NPC speaks in.
 *
 * A voice profile is worked out once from the NPC's seed (its actor id), its sex when the sheet or the people
 * generator knows it, its age when given, and the kind of person it speaks as (WoDX NPC's Voice). With no sex known,
 * the voice is picked by seed alone from every voice, so nothing is assumed. The Storyteller's own choice wins.
 */

/** FNV-1a: a steady number from any text. */
export function hashSeed(...parts) {
  let h = 2166136261;
  for ( const ch of parts.map(p => String(p ?? "")).join("|") ) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/** A number in [0, 1) from a seed and a salt, so pitch and speed do not move together. */
const frac = (seed, salt) => (hashSeed(seed, salt) % 10007) / 10007;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round2 = v => Math.round(v * 100) / 100;

const ENTITIES = {"&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&#x27;": "'", "&nbsp;": " "};
const decode = s => s.replace(/&(?:amp|lt|gt|quot|#39|#x27|nbsp);/g, m => ENTITIES[m]);

/**
 * The words an NPC speaks on a WoDX NPC talk card: the first paragraph with no class (the quiet lines are the
 * stage directions, a Malkavian's other hearing and notes). "" when the NPC has nothing to say.
 */
export function spokenLine(html) {
  for ( const m of String(html ?? "").matchAll(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/gi) ) {
    if ( /\bclass\s*=/.test(m[1] ?? "") ) continue;
    const inner = m[2];
    if ( /^\s*<i>[\s\S]*<\/i>\s*$/.test(inner) ) return "";
    const text = decode(inner.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
    if ( text ) return text;
  }
  return "";
}

/** How the kind of person shifts the voice: speed and pitch, small steps. Keys follow WoDX NPC's voices. */
export const STYLE_SHIFT = {
  noble: {rate: -0.06, pitch: -0.02},
  clergy: {rate: -0.08, pitch: -0.03},
  scholar: {rate: -0.04, pitch: 0},
  merchant: {rate: 0.04, pitch: 0.02},
  soldier: {rate: 0.02, pitch: -0.05},
  criminal: {rate: 0.05, pitch: -0.03},
  servant: {rate: 0.03, pitch: 0.03},
  peasant: {rate: -0.02, pitch: 0},
  corporate: {rate: 0.06, pitch: 0},
  street: {rate: 0.08, pitch: 0.03},
  beggar: {rate: -0.05, pitch: 0.04},
  drunk: {rate: -0.14, pitch: -0.04},
  child: {rate: 0.1, pitch: 0.3}
};

/** "female", "male" or null: a sex WoDX can be sure of, from the Storyteller's choice or the people generator. */
export function knownSex(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "female" || s === "male" ? s : null;
}

/**
 * The NPC's voice profile. override: the Storyteller's choice {voice, pitch, rate}, any part of it.
 * Returns {seed, sex, pitch, rate, voice}: voice is a voice name only when the Storyteller chose one.
 */
export function profileFor({id = "", sex = null, age = null, style = null, override = null} = {}) {
  const seed = hashSeed("wodx-voice", id);
  const k = knownSex(sex);
  let pitch = 0.88 + frac(seed, "pitch") * 0.24;
  let rate = 0.9 + frac(seed, "rate") * 0.16;
  const sh = STYLE_SHIFT[style] ?? null;
  if ( sh ) { pitch += sh.pitch; rate += sh.rate; }
  const a = Number(age);
  if ( Number.isFinite(a) && a >= 60 ) { rate -= 0.08; pitch -= 0.05; }
  const o = override ?? {};
  if ( Number.isFinite(Number(o.pitch)) && o.pitch !== null && o.pitch !== "" ) pitch = Number(o.pitch);
  if ( Number.isFinite(Number(o.rate)) && o.rate !== null && o.rate !== "" ) rate = Number(o.rate);
  return {seed, sex: k, pitch: round2(clamp(pitch, 0.5, 1.6)), rate: round2(clamp(rate, 0.7, 1.3)), voice: o.voice ? String(o.voice) : null};
}

/** First names in the voices Windows, Chrome, Edge and macOS ship, by the sex they sound. Used only to match a known sex. */
const FEMALE = ["zira", "hazel", "susan", "heera", "catherine", "linda", "hedda", "katja", "samantha", "karen", "moira", "tessa", "fiona", "serena", "victoria", "ava", "allison", "libby", "sonia", "natasha", "aria", "jenny", "emma", "michelle", "sara", "clara", "maisie", "female", "vlasta", "eva"];
const MALE = ["david", "mark", "george", "richard", "james", "stefan", "jakub", "daniel", "alex", "fred", "oliver", "arthur", "ryan", "guy", "christopher", "eric", "thomas", "rishi", "brian", "william", "male", "antonin", "conrad", "killian"];

/** "female", "male" or null for a voice, read from its name. */
export function voiceSex(name) {
  const words = String(name ?? "").toLowerCase().split(/[^a-z]+/).filter(Boolean);
  if ( words.some(w => FEMALE.includes(w)) ) return "female";
  if ( words.some(w => MALE.includes(w)) ) return "male";
  return null;
}

/**
 * Pick a voice for a profile from a list of {name, lang, localService}. English only for now (desk item 8);
 * voices on the computer itself come before network voices, so nothing leaves the machine when it can be helped.
 * A known sex narrows the list when any voice matches it. Returns a voice from the list, or null.
 */
export function pickVoice(voices = [], profile = {}, {lang = "en"} = {}) {
  const all = (voices ?? []).filter(v => v && String(v.lang ?? "").toLowerCase().startsWith(lang));
  if ( !all.length ) return null;
  if ( profile.voice ) { const v = all.find(x => x.name === profile.voice); if ( v ) return v; }
  const local = all.filter(v => v.localService !== false);
  let pool = local.length ? local : all;
  if ( profile.sex ) { const m = pool.filter(v => voiceSex(v.name) === profile.sex); if ( m.length ) pool = m; }
  pool = [...pool].sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return pool[(profile.seed ?? 0) % pool.length];
}

/** Whether this client speaks a talk card: on in the world, not muted, and the line meant for this user. */
export function shouldSpeak({enabled = false, muted = false, isGM = false, gmHears = true, whisper = [], userId = ""} = {}) {
  if ( !enabled || muted ) return false;
  if ( isGM && !gmHears ) return false;
  if ( Array.isArray(whisper) && whisper.length && !whisper.includes(userId) ) return false;
  return true;
}
