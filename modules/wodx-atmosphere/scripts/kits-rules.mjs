/**
 * WoDX Atmosphere: the era kits' sound and art, as data and pure rules (no Foundry calls, so the harness can test them).
 *
 * Each era profile has a kit. The look (paper, type, frames) is WoDX Chronicle's; this module adds what is heard and
 * the colour of the maps:
 *
 *   Music       moods (calm, tension, combat, sorrow, wonder), one Foundry playlist each, built from the files in
 *               the kit's folder or chosen from the world's own playlists (Rothenstein's score, for the Dark Ages)
 *   Ambience    one loop per kind of place (the twelve kinds WoDX NPC tags) and per weather, picked for the scene
 *   Sounds      short cues for dawn, dusk and a notice, and birdsong and cock-crow before sunrise; procedural ones ship
 *               with the module, a kit folder can replace them
 *   Map colour  a light colour grade on the map for each era (sepia gaslight, drained plague years, neon future)
 *   Handouts    journal page templates in the era's style: manuscript, notice, broadside, newspaper, telegram and more
 *
 * Files live outside the module, in the Data folder: wodx-kits/<kit>/music/<mood>/, wodx-kits/<kit>/ambience/ and
 * wodx-kits/<kit>/sounds/, each with an optional credits.json ({file: {source, license, credit}}).
 */

export const MOODS = {
  calm: "Calm: travel, talk, the city at night",
  tension: "Tension: stalking, hiding, something wrong",
  combat: "Combat",
  sorrow: "Sorrow: loss, the Beast, the dead",
  wonder: "Wonder: the Umbra, the Dreaming, true magic",
  frenzy: "Frenzy: the Beast loose, Rötschreck (combat plays when the kit has none)"
};

/** The twelve kinds of place WoDX NPC tags, and the weather loops, in the order a scene looks for them. */
export const PLACE_KINDS = ["home", "workplace", "church", "tavern", "haven", "gate", "market", "street", "castle", "wilds", "caern", "elysium", "chantry", "other"];
export const WEATHER_LOOPS = ["thunder", "gale", "downpour", "rain", "snow", "wind", "night"];
export const CUES = {dawn: "Dawn is close", dusk: "Sunset", notice: "Something needs the Storyteller", birds: "Birdsong before dawn", cock: "Cock-crow before dawn"};
/** Cues that sound the same in every era: they ship once, in sounds/common, and a kit folder can still replace them. */
export const COMMON_CUES = ["birds", "cock"];

/**
 * Dawn dread, the mirror of the Sunset cue: the last half hour before sunrise.
 *   strength  0 at thirty minutes out, 1 at sunrise: how pale the screen's edge is
 *   birds     from twenty minutes out; cock from ten
 *   rotschreck  +1 difficulty on Rötschreck in the last ten minutes (house rule: the books give the sun its own difficulties but none for the hour before it)
 * Null outside that half hour, or when there is no dawn to come (a polar night).
 */
export const DREAD = {from: 1800, birds: 1200, cock: 600};
export function dawnDread(secondsToDawn) {
  const s = Number(secondsToDawn);
  if ( !Number.isFinite(s) || s <= 0 || s > DREAD.from ) return null;
  const strength = Math.round((1 - s / DREAD.from) * 100) / 100;
  return {strength, minutes: Math.ceil(s / 60), birds: s <= DREAD.birds, cock: s <= DREAD.cock, rotschreck: s <= DREAD.cock ? 1 : 0};
}
/**
 * Sound through walls: an ambient sound that walls stop and that is heard muffled through them (a sermon through the
 * chapel door). Foundry does the hearing; this is the setting it needs: walls on, and a low-pass for the muffled side.
 * sound: {walls, effects: {muffled: {type, intensity}}}. Returns the update, or null when it is already so.
 */
export const MUFFLE = {type: "lowpass", intensity: 5};
export function muffleChanges(sound = {}, on = true) {
  const m = sound.effects?.muffled ?? {};
  if ( !on ) return sound.walls === false ? null : {walls: false};
  if ( sound.walls === true && m.type === MUFFLE.type && Number(m.intensity) > 0 ) return null;
  return {walls: true, "effects.muffled.type": MUFFLE.type, "effects.muffled.intensity": Number(m.intensity) > 0 ? Number(m.intensity) : MUFFLE.intensity};
}
export const isMuffled = (sound = {}) => sound.walls === true && sound.effects?.muffled?.type === MUFFLE.type;

/**
 * Personal themes: a short motif for a player character, heard by everyone at that character's spotlight moments
 * (the start of their turn in a fight, or when the Storyteller presses Spotlight). Once a minute at most, so a quick
 * round does not stack them. theme: {src, volume}; last: the real time (ms) it last played.
 */
export const THEME_GAP = 60000;
export function themeToPlay(theme, {last = 0, now = Date.now(), force = false} = {}) {
  const src = String(theme?.src ?? "").trim();
  if ( !src || !AUDIO_EXT.test(src) ) return null;
  if ( !force && now - Number(last || 0) < THEME_GAP ) return null;
  const v = Number(theme?.volume);
  return {src, volume: Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6};
}

/**
 * Places that age: the same map in other years (Rothenstein in 1200, 1348, 1620, 1890, 2020). variants: [{from, img}],
 * each shown from its year on; before the first, the map's own picture (base). Returns the picture for the year.
 */
export function ageFor({base = null, variants = []} = {}, year) {
  const y = Number(year);
  if ( !Number.isFinite(y) ) return base;
  let best = null;
  for ( const v of variants ?? [] ) {
    const f = Number(v?.from);
    if ( !v?.img || !Number.isFinite(f) || f > y ) continue;
    if ( !best || f >= Number(best.from) ) best = v;
  }
  return best ? best.img : base;
}
/** The variants kept in year order, one per year (the later entry wins), without blanks. */
export function cleanAges(variants = []) {
  const byYear = new Map();
  for ( const v of variants ?? [] ) { const f = Math.trunc(Number(v?.from)); if ( v?.img && Number.isFinite(f) ) byYear.set(f, {from: f, img: String(v.img)}); }
  return [...byYear.values()].sort((a, b) => a.from - b.from);
}

/**
 * Faces that age. Mortals age with the chronicle's year; a ghoul keeps the age at which the blood was first drunk and
 * only catches up to the true age once cut off from it (V20 Dark Ages, Ghouls); the undead, spirits and the Reborn never do.
 * A face is {born, kind, still, lost, variants: [{from: age, img}]}: kind "auto" follows the character's line.
 */
export const FACE_KINDS = {auto: "Follow the character's line", ages: "Ages with the years", ghoul: "A ghoul: ages only when cut off from the blood", never: "Does not age"};
const NEVER_AGE = ["Vampire", "Wraith", "Mummy", "Creature", "Group", "Exalted"];
/** "ages", "ghoul" or "never" for an actor's type and sheet variant, unless the face says otherwise. */
export function faceKind(type, variant, set = "auto") {
  if ( set && set !== "auto" && FACE_KINDS[set] ) return set;
  if ( type === "Mortal" && variant === "ghoul" ) return "ghoul";
  return NEVER_AGE.includes(type) ? "never" : "ages";
}
/** The age the face shows in a year: null when unknown or the character does not age. */
export function apparentAge({born, kind = "ages", still = null, lost = false} = {}, year) {
  const b = Number(born), y = Number(year);
  const blank = v => v === null || v === undefined || v === "";
  if ( blank(born) || blank(year) || !Number.isFinite(b) || !Number.isFinite(y) || kind === "never" ) return null;
  const real = Math.max(0, Math.trunc(y - b));
  if ( kind !== "ghoul" || lost ) return real;
  const s = Number(still);
  return Number.isFinite(s) && still !== null && still !== "" ? Math.min(real, Math.max(0, Math.trunc(s))) : real;
}
/** The filter's step for an age: 0 under 40, then one a decade, 5 from 80 on. */
export const faceStage = age => !Number.isFinite(Number(age)) || age === null ? 0 : Math.max(0, Math.min(5, Math.floor((Number(age) - 30) / 10)));
export const STAGE_WORDS = ["as painted", "forty", "fifty", "sixty", "seventy", "eighty and past"];
/** What a face shows in a year: {age, stage, img: the hand-made picture for that age or null}. */
export function faceFor(face = {}, year) {
  const age = apparentAge(face, year);
  if ( age === null ) return {age: null, stage: 0, img: null};
  return {age, stage: faceStage(age), img: ageFor({base: null, variants: face.variants ?? []}, age)};
}
/**
 * The aging filter on RGBA pixels (in place): colour drains toward grey and a warm, faded tone and the contrast softens,
 * more with each step. Returns the same array.
 */
export function agePixels(data, stage) {
  const k = Math.max(0, Math.min(5, Math.trunc(Number(stage) || 0)));
  if ( !k ) return data;
  const grey = 0.1 * k, warm = 0.05 * k, soft = 1 - 0.04 * k, lift = 3 * k;
  for ( let i = 0; i + 3 < data.length; i += 4 ) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    let nr = r + (L - r) * grey, ng = g + (L - g) * grey, nb = b + (L - b) * grey;
    nr += (Math.min(255, L * 1.08) - nr) * warm; ng += (L * 0.96 - ng) * warm; nb += (L * 0.8 - nb) * warm;
    data[i] = clamp255((nr - 128) * soft + 128 + lift);
    data[i + 1] = clamp255((ng - 128) * soft + 128 + lift);
    data[i + 2] = clamp255((nb - 128) * soft + 128 + lift);
  }
  return data;
}
const clamp255 = v => Math.max(0, Math.min(255, Math.round(v)));
/** The file name of an aged picture: the actor, which picture, the step, a tag of the picture it was made from. */
export const agedName = (actorId, which, stage, base = "") => `${String(actorId).replace(/[^A-Za-z0-9_-]/g, "")}-${which === "token" ? "token" : "portrait"}-age${Math.trunc(stage)}-${shortHash(base)}.webp`;
/** A short tag for a picture's path, so a new portrait never reuses an old aged copy the browser has kept. */
export function shortHash(s) {
  let h = 5381;
  for ( const ch of String(s ?? "") ) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}

/** The cues a clock move of delta seconds crosses, ending toDawn seconds before sunrise. */
export function dreadCuesCrossed(toDawnAfter, delta) {
  const before = Number(toDawnAfter) + Number(delta);
  const out = [];
  if ( !(delta > 0) || !Number.isFinite(before) ) return out;
  if ( before > DREAD.birds && toDawnAfter <= DREAD.birds && toDawnAfter > 0 ) out.push("birds");
  if ( before > DREAD.cock && toDawnAfter <= DREAD.cock && toDawnAfter > 0 ) out.push("cock");
  return out;
}
export const AUDIO_EXT = /\.(ogg|oga|mp3|wav|flac|webm|m4a|opus)$/i;

/**
 * The kits. grade: the map colour (saturation, brightness and contrast as multipliers, sepia 0 to 1, hue a turn in
 * degrees), handouts: the templates offered first in this era. uses: a kit whose files are borrowed when this one has none.
 */
export const KITS = {
  "dark-ages": {name: "Dark Ages", palette: "Organ drones, chant, lute, harp, dulcimer, frame drums; modal keys",
    grade: {saturation: 0.9, brightness: 1, contrast: 1.05, sepia: 0.12, hue: 0}, handouts: ["manuscript", "notice"]},
  "long-night": {name: "Plague and Long Night", uses: "dark-ages", palette: "Tolling bells, sparse chant, wind through empty streets",
    grade: {saturation: 0.55, brightness: 0.95, contrast: 1.05, sepia: 0.15, hue: 0}, handouts: ["notice", "manuscript"]},
  "renaissance": {name: "Renaissance", uses: "dark-ages", palette: "Lute consort, recorders, viols, horns, stately dances",
    grade: {saturation: 0.9, brightness: 1, contrast: 1.05, sepia: 0.25, hue: 0}, handouts: ["engraving", "broadside", "manuscript"]},
  "age-of-reason": {name: "Age of Reason", uses: "renaissance", palette: "Harpsichord, baroque strings, chamber organ, clocks ticking in quiet rooms",
    grade: {saturation: 0.85, brightness: 1, contrast: 1.06, sepia: 0.3, hue: -2}, handouts: ["engraving", "broadside", "letter"]},
  "victorian": {name: "Victorian", palette: "String quartet, music box, pipe organ, rain on cobbles, carriages",
    grade: {saturation: 0.75, brightness: 1, contrast: 1.08, sepia: 0.35, hue: -4}, handouts: ["newspaper", "calling-card", "letter"]},
  "wild-west": {name: "Wild West", palette: "Solo fiddle, reed instruments, wind, coyotes, distant trains",
    grade: {saturation: 0.8, brightness: 1.02, contrast: 1.08, sepia: 0.3, hue: -5}, handouts: ["wanted", "broadside", "telegram", "letter"]},
  "great-war": {name: "Great War", palette: "Low brass, field drums, distant artillery, gramophone crackle",
    grade: {saturation: 0.5, brightness: 0.97, contrast: 1.1, sepia: 0.2, hue: 0}, handouts: ["telegram", "field-order", "letter"]},
  "mid-century": {name: "Mid-century", uses: "modern", palette: "Big band and jazz on the wireless, trams, air-raid sirens, a radio between stations",
    grade: {saturation: 0.7, brightness: 0.98, contrast: 1.1, sepia: 0.12, hue: 2}, handouts: ["telegram", "newspaper", "letter"]},
  "modern": {name: "Modern", palette: "Dark ambient, industrial pads, synthesized bass, rain and sirens",
    grade: {saturation: 0.85, brightness: 1, contrast: 1.12, sepia: 0, hue: 4}, handouts: ["email", "printout", "newspaper"]},
  "time-of-judgment": {name: "Time of Judgment", uses: "modern", palette: "Modern, with choir and bell motifs breaking through",
    grade: {saturation: 1.1, brightness: 0.96, contrast: 1.12, sepia: 0.2, hue: -12}, handouts: ["email", "printout", "newspaper"]},
  "future-darkness": {name: "Future Darkness", palette: "Synthwave and industrial",
    grade: {saturation: 1.15, brightness: 1, contrast: 1.15, sepia: 0, hue: 8}, handouts: ["terminal", "feed", "email"]},
  "classical": {name: "Classical", uses: "dark-ages", palette: "Lyre, aulos, frame drums",
    grade: {saturation: 0.95, brightness: 1.02, contrast: 1.04, sepia: 0.1, hue: 0}, handouts: ["tablet", "manuscript"]},
  "living-gods": {name: "Age of Living Gods", uses: "dark-ages", palette: "Harp, sistrum, reed pipes, temple drums",
    grade: {saturation: 1, brightness: 1.03, contrast: 1.04, sepia: 0.12, hue: -3}, handouts: ["tablet", "manuscript"]}
};

/**
 * Token frames by kit: a ring or a square drawn round each token in the era's material. color as a number (0xRRGGBB),
 * width a share of the token's size. double draws a thin inner line; glow a soft outer one. House look.
 */
export const FRAMES = {
  "dark-ages": {label: "Black iron", shape: "round", color: 0x4f4943, double: true},
  "long-night": {label: "Tarnished bone", shape: "round", color: 0x8f8a7a},
  "renaissance": {label: "Gilt", shape: "round", color: 0xb08d3c, double: true},
  "victorian": {label: "Brass", shape: "square", color: 0xa07a3a, double: true},
  "wild-west": {label: "Saddle leather", shape: "square", color: 0x7a5230},
  "great-war": {label: "Gunmetal", shape: "square", color: 0x6b6b4f},
  "modern": {label: "Chrome", shape: "square", color: 0x9aa3ad},
  "time-of-judgment": {label: "Old blood", shape: "round", color: 0x8a1c1c, glow: true},
  "future-darkness": {label: "Neon", shape: "square", color: 0x2fd6ff, glow: true},
  "classical": {label: "Bronze", shape: "round", color: 0x9b6b3a},
  "living-gods": {label: "Gold and lapis", shape: "round", color: 0xc9a227, double: true}
};
/** Who gets a frame. Fixed list. */
export const FRAME_WHO = {off: "Nobody", characters: "The players' characters", all: "Every token with a character"};

/** The frame for a kit, falling back along the kit chain. */
export function frameFor(kit) {
  for ( const k of kitChain(kit) ) if ( FRAMES[k] ) return {kit: k, width: 0.045, ...FRAMES[k]};
  return {kit: "dark-ages", width: 0.045, ...FRAMES["dark-ages"]};
}
/** Does a token get a frame? who: off, characters or all. */
export function framed(who, {hasActor = false, playerOwned = false} = {}) {
  if ( who === "all" ) return hasActor;
  if ( who === "characters" ) return hasActor && playerOwned;
  return false;
}
/** The shapes to draw for a frame on a token w by h pixels: [{kind, x, y, w, h, r, width, color, alpha}]. */
export function frameShapes(f, w, h) {
  const lw = Math.max(2, Math.round(Math.min(w, h) * f.width));
  const out = [];
  const add = (inset, width, alpha) => {
    if ( f.shape === "round" ) out.push({kind: "circle", x: w / 2, y: h / 2, r: Math.min(w, h) / 2 - inset, width, color: f.color, alpha});
    else out.push({kind: "rect", x: inset, y: inset, w: w - inset * 2, h: h - inset * 2, r: Math.round(Math.min(w, h) * 0.08), width, color: f.color, alpha});
  };
  if ( f.glow ) add(-lw, lw * 2, 0.25);
  add(lw / 2, lw, 0.95);
  if ( f.double ) add(lw * 1.6, Math.max(1, Math.round(lw / 3)), 0.8);
  return out;
}

/** The kit for an era profile (by its id, else the profile's own kit name). */
export function kitFor(profile) {
  if ( !profile ) return "dark-ages";
  if ( KITS[profile.id] ) return profile.id;
  return KITS[profile.kit] ? profile.kit : "dark-ages";
}
/** The kit and the kits it borrows from, nearest first. */
export function kitChain(kit) {
  const out = [];
  let k = kit;
  while ( k && KITS[k] && !out.includes(k) ) { out.push(k); k = KITS[k].uses; }
  return out;
}

export const kitFolder = (kit, root = "wodx-kits") => `${root}/${kit}`;
export const playlistName = (kit, mood) => `WoDX · ${KITS[kit]?.name ?? kit} · ${(MOODS[mood] ?? mood).split(":")[0]}`;
export const ambienceName = kit => `WoDX · ${KITS[kit]?.name ?? kit} · Ambience`;
export const folderName = kit => `WoDX · ${KITS[kit]?.name ?? kit}`;

/** A track's name from its file: "rain-out.ogg" -> "rain out". */
export const trackName = path => decodeURIComponent(String(path).split("/").pop()).replace(AUDIO_EXT, "").replace(/[_-]+/g, " ").trim();

/**
 * Sort a kit folder's files (as Foundry lists them) into moods, ambience keys and cues.
 * files: paths. Returns {music: {mood: [paths]}, ambience: {key: path}, cues: {cue: path}, other: [paths]}.
 */
export function sortFiles(kit, files, root = "wodx-kits") {
  const base = kitFolder(kit, root) + "/";
  const out = {music: {}, ambience: {}, cues: {}, other: []};
  for ( const f of files ?? [] ) {
    const p = String(f);
    if ( !AUDIO_EXT.test(p) ) continue;
    const dec = decodeURIComponent(p);
    const i = dec.indexOf(base);
    const rel = (i >= 0 ? dec.slice(i + base.length) : dec).split("/");
    const key = trackName(rel[rel.length - 1]).toLowerCase();
    if ( rel[0] === "music" && rel.length >= 3 && MOODS[rel[1]] ) (out.music[rel[1]] ??= []).push(p);
    else if ( rel[0] === "ambience" ) {
      const k = key.split(" ")[0];
      if ( PLACE_KINDS.includes(k) || WEATHER_LOOPS.includes(k) ) out.ambience[k] ??= p;
      else out.other.push(p);
    } else if ( rel[0] === "sounds" && CUES[key] ) out.cues[key] = p;
    else out.other.push(p);
  }
  for ( const m of Object.keys(out.music) ) out.music[m].sort();
  return out;
}

/**
 * Which ambience loops a scene plays, from what the kit has: one for the place and, out of doors, one for the weather.
 * place: {kind, indoor}, tags: the weather tags, night: true at night, have: the keys the kit has.
 */
export function ambienceFor({kind = "other", indoor = false, tags = [], night = true} = {}, have = []) {
  const has = k => have.includes(k);
  const out = [];
  if ( has(kind) ) out.push(kind);
  else if ( !indoor && has("street") && ["market", "gate"].includes(kind) ) out.push("street");
  else if ( has("other") ) out.push("other");
  if ( !indoor ) {
    const w = WEATHER_LOOPS.filter(k => k !== "night").find(k => tags.includes(k) && has(k));
    if ( w ) out.push(w);
    else if ( night && has("night") && !out.length ) out.push("night");
  }
  return out;
}

/** The mood to play when nothing else asks: combat while a fight runs, else calm. */
export function moodFor({combat = false, chosen = null} = {}) {
  if ( combat ) return "combat";
  return MOODS[chosen] ? chosen : "calm";
}

/**
 * The map colour grade as a CSS filter for the board, at a strength from 0 (none) to 1. CSS filter functions run on the
 * graphics card, so the grade costs next to nothing; "" when there is nothing to do.
 */
export function gradeCss(grade, strength = 1) {
  const g = grade ?? {};
  const s = Math.max(0, Math.min(1, Number(strength) || 0));
  const lerp = (a, b) => Math.round((a + (b - a) * s) * 1000) / 1000;
  const parts = [];
  const sat = lerp(1, g.saturation ?? 1), sep = lerp(0, g.sepia ?? 0), bri = lerp(1, g.brightness ?? 1), con = lerp(1, g.contrast ?? 1), hue = lerp(0, g.hue ?? 0);
  if ( sat !== 1 ) parts.push(`saturate(${sat})`);
  if ( sep ) parts.push(`sepia(${sep})`);
  if ( hue ) parts.push(`hue-rotate(${hue}deg)`);
  if ( bri !== 1 ) parts.push(`brightness(${bri})`);
  if ( con !== 1 ) parts.push(`contrast(${con})`);
  return parts.join(" ");
}

/* ------------------------------------------------------------------ */
/*  Handouts                                                           */
/* ------------------------------------------------------------------ */

/** The handout templates: label, the eras they suit, and the fields the form asks for. */
export const HANDOUTS = {
  manuscript: {label: "Manuscript leaf", eras: "Dark Ages to the Renaissance", from: "Written by", date: "Dated"},
  notice: {label: "Proclamation or plague notice", eras: "Dark Ages, the Long Night", from: "By order of", date: "Given on"},
  engraving: {label: "Engraved broadsheet", eras: "Renaissance", from: "Printed by", date: "Printed"},
  broadside: {label: "Broadside", eras: "Renaissance to the Wild West", from: "Printed by", date: "Dated"},
  newspaper: {label: "Newspaper column", eras: "Victorian to Modern", from: "Newspaper", date: "Edition"},
  "calling-card": {label: "Calling card", eras: "Victorian", from: "Name on the card", date: "At home on"},
  letter: {label: "Letter", eras: "Any era with paper and ink", from: "Signed", date: "Dated"},
  wanted: {label: "Wanted poster", eras: "Wild West", from: "Offered by", date: "Reward"},
  telegram: {label: "Telegram", eras: "Victorian to the Great War", from: "From", date: "Sent"},
  "field-order": {label: "Field order", eras: "Great War", from: "Signed", date: "Time of issue"},
  email: {label: "Email", eras: "Modern and after", from: "From", date: "Sent"},
  printout: {label: "Printout or file", eras: "Modern and after", from: "File", date: "Printed"},
  terminal: {label: "Terminal screen", eras: "Future Darkness", from: "Host", date: "Timestamp"},
  feed: {label: "News feed", eras: "Future Darkness", from: "Feed", date: "Posted"},
  tablet: {label: "Tablet or inscription", eras: "Classical, the Age of Living Gods", from: "Carved for", date: "In the year"}
};

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);

/** Handout templates in the order an era offers them: its own first, then the rest. */
export function handoutsFor(kit) {
  const own = KITS[kit]?.handouts ?? [];
  return [...own, ...Object.keys(HANDOUTS).filter(k => !own.includes(k))];
}

/**
 * A handout page's HTML. Body text keeps its paragraphs (blank lines) and line breaks; nothing in it is read as HTML.
 * The classes are styled by styles/wodx-atmosphere.css.
 */
export function renderHandout(id, {title = "", body = "", from = "", date = ""} = {}) {
  const t = HANDOUTS[id] ? id : "letter";
  const paras = String(body ?? "").split(/\r?\n\s*\r?\n/).map(p => p.trim()).filter(Boolean)
    .map(p => `<p>${esc(p).replace(/\r?\n/g, "<br>")}</p>`).join("");
  const meta = (label, v) => v ? `<p class="wodx-ho-meta"><span>${esc(label)}:</span> ${esc(v)}</p>` : "";
  const h = HANDOUTS[t];
  const head = t === "telegram" ? `<p class="wodx-ho-banner">TELEGRAM</p>` : t === "wanted" ? `<p class="wodx-ho-banner">WANTED</p>`
    : t === "terminal" ? `<p class="wodx-ho-banner">&gt; ACCESS GRANTED</p>` : "";
  return `<div class="wodx-handout wodx-ho-${t}">${head}${title ? `<h2>${esc(title)}</h2>` : ""}${t === "email" || t === "terminal" || t === "feed" ? meta(h.from, from) + meta(h.date, date) : ""}${paras}${t === "email" || t === "terminal" || t === "feed" ? "" : meta(h.from, from) + meta(h.date, date)}</div>`;
}
