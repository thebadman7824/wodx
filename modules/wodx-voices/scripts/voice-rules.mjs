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
 * Returns {seed, sex, pitch, rate, voice, kokoro, lang, chatterbox, temper}: voice (a browser voice), kokoro (a Kokoro voice
 * or blend), lang (the NPC's tongue, for the browser's speech), chatterbox (a server voice) and temper (how the NPC
 * usually speaks, TEMPERS) are set only when the Storyteller chose them.
 */
export function profileFor({id = "", sex = null, age = null, style = null, override = null, temper = null} = {}) {
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
  return {seed, sex: k, pitch: round2(clamp(pitch, 0.5, 1.6)), rate: round2(clamp(rate, 0.7, 1.3)), voice: o.voice ? String(o.voice) : null,
    kokoro: o.kokoro ? String(o.kokoro) : null, lang: o.lang ? String(o.lang) : null,
    chatterbox: o.chatterbox ? String(o.chatterbox) : null, temper: TEMPERS[temper] ? temper : null};
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
 * Pick a voice for a profile from a list of {name, lang, localService}: English, unless the Storyteller gave the NPC
 * a tongue of its own (langTries);
 * voices on the computer itself come before network voices, so nothing leaves the machine when it can be helped.
 * A known sex narrows the list when any voice matches it. Returns a voice from the list, or null.
 */
export function pickVoice(voices = [], profile = {}, {lang = null} = {}) {
  let all = [];
  for ( const l of langTries(lang ?? profile.lang) ) { all = (voices ?? []).filter(v => v && String(v.lang ?? "").toLowerCase().startsWith(l)); if ( all.length ) break; }
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

/* ------------------------------------------------------------------ */
/* Kokoro (0.2.0): voices, blends, the engine's files, the cache       */
/* ------------------------------------------------------------------ */

/** Kokoro's English voices (v1.0). First letter: a American, b British; second: f female, m male. */
export const KOKORO_VOICES = [
  "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica", "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky",
  "am_adam", "am_echo", "am_eric", "am_fenrir", "am_liam", "am_michael", "am_onyx", "am_puck",
  "bf_alice", "bf_emma", "bf_isabella", "bf_lily",
  "bm_daniel", "bm_fable", "bm_george", "bm_lewis"
];
const kSex = v => (v[1] === "f" ? "female" : v[1] === "m" ? "male" : null);

/**
 * The Kokoro voice for a profile: two voices of one accent blended, so every NPC sounds like no one else.
 * The Storyteller may name one voice ("bm_george") or a blend ("bm_george*0.6+bm_lewis"), in override.kokoro.
 * Returns {id, accent, parts: [[voice, weight], ...]}; id is a plain voice name or "<accent>_wodx_<a><pct>_<b><pct>".
 */
export function kokoroVoiceFor(profile = {}, chosen = null) {
  const spec = chosen ? parseBlend(chosen) : null;
  if ( spec ) return spec;
  const seed = profile.seed ?? 0;
  const accent = (hashSeed(seed, "accent") % 2) ? "b" : "a";
  let pool = KOKORO_VOICES.filter(v => v[0] === accent);
  if ( profile.sex ) pool = pool.filter(v => kSex(v) === profile.sex);
  const a = pool[hashSeed(seed, "k1") % pool.length];
  const rest = pool.filter(v => v !== a);
  const b = rest[hashSeed(seed, "k2") % rest.length];
  const w = 50 + (hashSeed(seed, "kw") % 31);
  return {id: `${accent}_wodx_${a}${w}_${b}${100 - w}`, accent, parts: [[a, w / 100], [b, (100 - w) / 100]]};
}

/** "bm_george" or "bm_george*0.6+bm_lewis" to a voice spec; null when it names no Kokoro voice or mixes accents. */
export function parseBlend(text) {
  const bits = String(text ?? "").split("+").map(s => s.trim()).filter(Boolean);
  if ( !bits.length || bits.length > 3 ) return null;
  const parts = [];
  for ( const b of bits ) {
    const [v, w] = b.split("*").map(s => s.trim());
    if ( !KOKORO_VOICES.includes(v) ) return null;
    parts.push([v, w === undefined ? null : Number(w)]);
  }
  if ( new Set(parts.map(([v]) => v[0])).size > 1 ) return null;
  const given = parts.filter(([, w]) => w !== null).reduce((s, [, w]) => s + w, 0);
  const open = parts.filter(([, w]) => w === null).length;
  if ( parts.some(([, w]) => w !== null && !(w > 0 && w <= 1)) || given > 1 + 1e-9 ) return null;
  const fill = open ? (1 - given) / open : 0;
  const norm = parts.map(([v, w]) => [v, w === null ? fill : w]);
  const total = norm.reduce((s, [, w]) => s + w, 0);
  if ( !(total > 0) ) return null;
  if ( norm.length === 1 ) return {id: norm[0][0], accent: norm[0][0][0], parts: [[norm[0][0], 1]]};
  const id = `${norm[0][0][0]}_wodx_${norm.map(([v, w]) => `${v}${Math.round(w / total * 100)}`).join("_")}`;
  return {id, accent: norm[0][0][0], parts: norm.map(([v, w]) => [v, w / total])};
}

/** A blended style table: the weighted sum of the parts' tables (each a Float32Array of the same length). */
export function blendTables(tables, weights) {
  const n = tables[0]?.length ?? 0;
  const out = new Float32Array(n);
  tables.forEach((t, j) => { const w = weights[j]; for ( let i = 0; i < n; i++ ) out[i] += t[i] * w; });
  return out;
}

/** Where the Kokoro library looks for its files online. WoDX serves them from the engine folder instead. */
export const KOKORO_REMOTE = "https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/";

/**
 * The local file for a URL the Kokoro library asks for, or null to leave the request alone.
 * {blend: id} when it asks for a blended voice WoDX made, which never exists as a file.
 */
export function engineUrl(url, base) {
  const u = String(url ?? "");
  if ( !u.startsWith(KOKORO_REMOTE) ) return null;
  const rest = u.slice(KOKORO_REMOTE.length).split("?")[0];
  if ( rest.includes("..") ) return null;
  const m = rest.match(/^voices\/([ab]_wodx_[a-z0-9_]+)\.bin$/);
  if ( m ) return {blend: m[1]};
  return {path: `${String(base).replace(/\/+$/, "")}/hf/${rest}`};
}

/** The cache file name for a line in a voice: steady, short, safe on every filesystem. */
export function cacheName({engine = "kokoro", voice = "", speed = 1, text = ""} = {}) {
  const a = hashSeed(engine, voice, speed.toFixed(2), text).toString(36);
  const b = hashSeed(text, voice, "2").toString(36);
  return `${a}${b}.wav`;
}

/** Kokoro's speed for a profile's rate: Kokoro runs a little slow at 1, so the browser's 0.7-1.3 maps near 1. */
export const kokoroSpeed = rate => Math.round(Math.min(1.25, Math.max(0.8, 0.5 + Number(rate ?? 1) * 0.5)) * 100) / 100;

/** The people who see a chat message: its whisper list, or everyone. */
export function recipients(whisper = [], everyone = []) {
  return Array.isArray(whisper) && whisper.length ? [...new Set(whisper)] : [...new Set(everyone)];
}

/**
 * Whether a chat message is the Storyteller speaking as an NPC: written by a Storyteller, in character, as a token,
 * no dice, and the token's actor has no player owner. WoDX talk cards are read on their own path.
 */
export function isStorytellerLine({authorIsGM = false, inCharacter = false, hasToken = false, hasRolls = false, playerOwned = false, talkCard = false} = {}) {
  return authorIsGM && inCharacter && hasToken && !hasRolls && !playerOwned && !talkCard;
}

/** The plain words of a chat message's content. */
export function plainText(html) {
  return decode(String(html ?? "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
}

/**
 * The browser languages to try for an NPC's tongue, best first. English is the default; Latin has no voices of its
 * own, so Italian reads it (closest sound of the voices browsers ship).
 */
export function langTries(lang) {
  const l = String(lang ?? "").trim().toLowerCase();
  if ( !l || l.startsWith("en") ) return ["en"];
  if ( l === "la" || l === "lat" || l === "latin" ) return ["la", "it", "en"];
  const map = {czech: "cs", german: "de", deutsch: "de", italian: "it", french: "fr", spanish: "es", polish: "pl", hungarian: "hu", slovak: "sk",
    english: "en", portuguese: "pt", dutch: "nl", swedish: "sv", danish: "da", russian: "ru", greek: "el", romanian: "ro", serbian: "sr", turkish: "tr",
    arabic: "ar", persian: "fa", hebrew: "h\u0065", hindi: "hi", urdu: "ur", bengali: "bn", tamil: "ta", mandarin: "zh", cantonese: "zh-HK", japanese: "ja",
    korean: "ko", vietnamese: "vi", thai: "th", malay: "ms", javanese: "id", swahili: "sw", amharic: "am", zulu: "zu", afrikaans: "af"};
  return [(map[l] ?? l).toLowerCase(), "en"];
}

/* ------------------------------------------------------------------ */
/* Plot NPCs and prewritten lines (Ben, 12 November 2026)               */
/* ------------------------------------------------------------------ */

/** Whether an NPC speaks aloud at all: plot NPCs only, unless the world says every NPC. */
export const voiced = ({who = "plot", plot = false} = {}) => (who === "all" ? true : !!plot);

/**
 * Whether a WoDX NPC talk card carries a line the Storyteller wrote beforehand (the NPC's talk sheet), not a stock
 * or generated one. Cards say stock: true for stock lines; generated lines say generated: true (or kind "grammar").
 */
export const prewritten = (talk = {}) => !!talk && talk.stock === false && !talk.generated && talk.kind !== "grammar" && talk.kind !== "stock";

/* ------------------------------------------------------------------ */
/* Chatterbox (0.3.0): a voice server on the Storyteller's own PC      */
/* ------------------------------------------------------------------ */

/** How an NPC usually speaks (flags.wodx-voices.temper), set by the Storyteller. Shifts to the delivery below. */
export const TEMPERS = {
  even: {label: "Even", ex: 0, cfg: 0, temp: 0},
  calm: {label: "Calm, measured", ex: -0.15, cfg: 0.05, temp: -0.05},
  warm: {label: "Warm", ex: 0.1, cfg: -0.05, temp: 0},
  cold: {label: "Cold, clipped", ex: -0.1, cfg: 0.1, temp: -0.05},
  fiery: {label: "Fiery", ex: 0.3, cfg: -0.1, temp: 0.05},
  nervous: {label: "Nervous", ex: 0.15, cfg: -0.15, temp: 0.1},
  weary: {label: "Weary", ex: -0.1, cfg: -0.2, temp: 0}
};

const step05 = n => Math.round(n * 20) / 20;

/**
 * How a line is delivered: Chatterbox's emotion (exaggeration), pace (cfg: lower is slower and looser) and variety
 * (temperature). Read from the line itself (exclamations, questions, trailing off, shouted words), how the NPC regards
 * the character it speaks to (step -3 Hunted to +3 Honoured), its wounds (health levels lost) and its temper.
 * Rounded to steps of 0.05, so the same line in the same mood is rendered once.
 * Returns {exaggeration, cfg, temperature, tone} where tone names the strongest cue, for the log and tests.
 */
export function deliveryFor({text = "", step = 0, wounds = 0, temper = null} = {}) {
  const t = String(text ?? "");
  let ex = 0.5, cfg = 0.5, temp = 0.8, tone = "even";
  const bangs = (t.match(/!/g) ?? []).length;
  const asks = (t.match(/\?/g) ?? []).length;
  const trails = /(\.\.\.|…)\s*$/.test(t.trim()) || (t.match(/\.\.\.|…/g) ?? []).length >= 2;
  const shout = (t.match(/\b[A-Z]{3,}\b/g) ?? []).filter(w => !/^(I{2,3}|IV|VI{0,3}|IX|XI{0,3})$/.test(w)).length;
  if ( bangs ) { ex += Math.min(0.4, 0.15 * bangs); cfg -= 0.05; tone = "exclaims"; }
  if ( shout ) { ex += 0.2; tone = "shouts"; }
  if ( asks && !bangs ) { ex += 0.05; temp += 0.05; if ( tone === "even" ) tone = "asks"; }
  if ( trails ) { cfg -= 0.15; ex -= 0.05; if ( tone === "even" ) tone = "trails off"; }
  const s = Math.max(-3, Math.min(3, Math.round(Number(step) || 0)));
  if ( s <= -2 ) { ex += bangs || shout ? 0.15 : -0.05; cfg += 0.1; if ( tone === "even" ) tone = "hostile"; }
  else if ( s >= 2 ) { ex += 0.1; cfg -= 0.05; if ( tone === "even" ) tone = "warm"; }
  const w = Math.max(0, Number(wounds) || 0);
  if ( w >= 5 ) { ex += 0.35; cfg -= 0.2; tone = "in pain"; }
  else if ( w >= 3 ) { ex += 0.2; cfg -= 0.1; tone = "hurt"; }
  const tm = TEMPERS[temper] ?? null;
  if ( tm ) { ex += tm.ex; cfg += tm.cfg; temp += tm.temp; }
  return {exaggeration: step05(clamp(ex, 0.25, 1.5)), cfg: step05(clamp(cfg, 0.2, 0.8)), temperature: step05(clamp(temp, 0.6, 1)), tone};
}

/** A server voice's register from its speaking pitch (median F0 in Hz). */
export const registerOf = f0 => (Number(f0) < 145 ? "low" : Number(f0) > 185 ? "high" : "mid");

/**
 * The server voice for a profile, from the list the server sends ([{id, f0, register, rate}]). The Storyteller's
 * choice (override.chatterbox) wins when the server has it. A known sex narrows to the registers that sex usually
 * speaks in (male low or mid, female high or mid), so nothing is assumed when the sex is not known.
 * Old NPCs lean to the slower readers. Returns a voice id, or null when the list is empty.
 */
export function serverVoiceFor(profile = {}, voices = [], chosen = null) {
  const list = (voices ?? []).filter(v => v && v.id).sort((a, b) => String(a.id).localeCompare(String(b.id)));
  if ( !list.length ) return null;
  if ( chosen && list.some(v => v.id === chosen) ) return chosen;
  const reg = v => v.register ?? registerOf(v.f0);
  let pool = list;
  if ( profile.sex === "male" ) { const m = list.filter(v => reg(v) !== "high"); if ( m.length ) pool = m; }
  if ( profile.sex === "female" ) { const m = list.filter(v => reg(v) !== "low"); if ( m.length ) pool = m; }
  if ( Number(profile.rate) < 0.9 ) {
    const slow = [...pool].sort((a, b) => (Number(a.rate) || 0) - (Number(b.rate) || 0)).slice(0, Math.max(1, Math.ceil(pool.length / 2)));
    if ( slow.length ) pool = slow.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  }
  return pool[hashSeed(profile.seed ?? 0, "cb") % pool.length].id;
}

/** The voice server's address for a fetch: http(s) only, no trailing slash; "" when it is not a web address. */
export function serverBase(url) {
  const u = String(url ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^\s/]+(:\d+)?(\/[^\s]*)?$/i.test(u) ? u : "";
}

/** The cache's voice key for a Chatterbox line: the server voice and the delivery. */
export const serverVoiceKey = (voice, d = {}) => `cb_${voice}_${Number(d.exaggeration ?? 0.5).toFixed(2)}_${Number(d.cfg ?? 0.5).toFixed(2)}_${Number(d.temperature ?? 0.8).toFixed(2)}`;
