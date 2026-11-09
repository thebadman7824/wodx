/**
 * WoDX Paperdoll: the rules. A look (face parts, colours, clothes, mood) becomes one picture of the head, shoulders
 * and chest inside the era's ring. Every garment edge comes from the anchors measured on that head (fit-rules.mjs),
 * so clothes always sit on the character. Carried things are never drawn. Pure functions: no Foundry here.
 */

import * as FR from "./face-rules.mjs";
import * as MR from "./mouth-rules.mjs";
export * as FACE from "./face-rules.mjs";
export const MOD = "wodx-paperdoll";
export const LOOK_VERSION = 2;

/* ---- The face parts Lorelei offers ---- */
const run = (prefix, n) => Array.from({length: n}, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
/**
 * Lorelei's parts that keep a face serious enough for the chronicle: the googly eyes, winks, dot eyes, curled or
 * tufted brows, open grins, tongues, drool and the cartoon hair (twin buns, the spiked crest, the lone tuft) are left
 * out, and so are the lashed eyes whose lash reaches past the edge of the narrow face. LORELEI lists everything Lorelei has; a saved look with a part left out is moved to the nearest kept one.
 */
export const LORELEI = {eyes: run("variant", 24), eyebrows: run("variant", 13), mouth: [...run("happy", 18), ...run("sad", 9)], hair: run("variant", 48)};
const keep = (list, ...n) => list.filter(v => n.includes(Number(v.replace(/\D/g, ""))) );
const SERIOUS = {
  eyes: keep(LORELEI.eyes, 2, 4, 6, 8, 9, 10, 11, 12, 17, 20, 21, 24),
  eyebrows: keep(LORELEI.eyebrows, 2, 3, 7, 9, 10, 11, 12, 13),
  mouth: ["happy01", "happy02", "happy03", "happy04", "happy06", "happy10", "happy13", "happy14", "happy18", "sad03", "sad04", "sad05", "sad09"],
  hair: LORELEI.hair.filter(v => !["variant26", "variant27", "variant34"].includes(v))
};
/** Where a left-out part goes. */
export const NEAREST = {
  eyes: {variant01: "variant08", variant03: "variant08", variant05: "variant04", variant07: "variant24", variant13: "variant12", variant14: "variant21", variant15: "variant08", variant16: "variant12", variant18: "variant17", variant19: "variant08", variant22: "variant08", variant23: "variant11"},
  eyebrows: {variant01: "variant11", variant04: "variant10", variant05: "variant07", variant06: "variant13", variant08: "variant03"},
  mouth: {happy05: "happy02", happy07: "happy06", happy08: "happy13", happy09: "happy10", happy11: "happy13", happy12: "happy06", happy15: "happy04", happy16: "happy06", happy17: "happy14", sad01: "sad03", sad02: "sad03", sad06: "sad05", sad07: "sad05", sad08: "sad04"},
  hair: {variant26: "variant38", variant27: "variant20", variant34: "variant25"}
};
for ( const k of Object.keys(NEAREST) ) for ( const [a, b] of Object.entries(NEAREST[k]) ) if ( !SERIOUS[k].includes(b) ) NEAREST[k][a] = SERIOUS[k][0];
export const PARTS = {
  head: run("variant", 4), eyes: SERIOUS.eyes, eyebrows: SERIOUS.eyebrows, nose: run("variant", 6),
  mouth: SERIOUS.mouth, lips: Object.keys(MR.LIP_SHAPES), hair: SERIOUS.hair, beard: ["", ...run("variant", 2), ...Object.keys(FR.WHISKERS)],
  glasses: ["", ...run("variant", 5)], earrings: ["", ...run("variant", 3)],
  build: Object.keys(FR.BUILD), age: Object.keys(FR.AGES), cheeks: Object.keys(FR.CHEEKS), marks: Object.keys(FR.MARKS), scar: Object.keys(FR.SCARS), affliction: Object.keys(FR.AFFLICTIONS)
};
export const PART_LABELS = {head: "Face shape", build: "Build of the face", eyes: "Eyes", eyebrows: "Brows", nose: "Nose", mouth: "Mouth", lips: "Lip shape", hair: "Hair", beard: "Facial hair",
  age: "Age", cheeks: "Complexion", marks: "Marks", scar: "Scar", affliction: "Marked by", glasses: "Spectacles", earrings: "Earrings"};
/** Names for the choices that have them; the others are numbered. */
export const PART_NAMES = {lips: Object.fromEntries(Object.entries(MR.LIP_SHAPES).map(([k, v]) => [k, v.label])), build: Object.fromEntries(Object.entries(FR.BUILD).map(([k, v]) => [k, v.label])), age: FR.AGES, cheeks: FR.CHEEKS, marks: FR.MARKS, scar: FR.SCARS, affliction: FR.AFFLICTIONS,
  beard: {"": "None", variant01: "Full beard", variant02: "Long beard", ...FR.WHISKERS}};
/** The order the steppers come in. */
export const FACE_ORDER = ["head", "build", "eyes", "eyebrows", "nose", "mouth", "lips", "hair", "beard", "age", "cheeks", "marks", "scar", "affliction", "glasses", "earrings"];

export const SKIN = FR.SKIN;
export const HAIR = FR.HAIR;
export const LIPS = FR.LIPS;
/**
 * The colours the face is inked in, set so each feature shows against the skin (FR.showing): lips (the chosen colour,
 * or the skin's own, fuller and redder), brows (the hair, darkened), the nose line. rim: a lighter edge drawn under
 * the brows when even near black does not stand out from very dark skin.
 */
export function inksOf(look) {
  const skin = look.colors.skin, own = FR.mix(skin, "8a2a30", 0.55);
  const lips = FR.showing(look.colors.lips && FR.LIPS[look.colors.lips] ? look.colors.lips : own, skin, "lips");
  const brows = FR.showing(FR.mix(look.colors.hair, "2a1a10", 0.45), skin, "brows");
  const nose = FR.showing(FR.mix(skin, "5a2a14", 0.55), skin, "nose");
  // the three must differ from each other and from the eyes' ink, so each can be found in the drawing
  const used = new Set(["2a1a10"]), uniq = c => { let v = c; while ( used.has(v) ) v = FR.mix(v, "ffffff", 0.004).replace(/.$/, d => ((parseInt(d, 16) + 1) % 16).toString(16)); used.add(v); return v; };
  return {lips: uniq(lips.c), brows: uniq(brows.c), nose: uniq(nose.c), ratio: {lips: lips.ratio, brows: brows.ratio, nose: nose.ratio},
    rim: brows.ratio < FR.NEED.brows ? FR.mix(skin, "ffffff", 0.22) : ""};
}
/** Eye colours: the natural ones, then the strange ones. */
export const EYES = Object.fromEntries(Object.entries(FR.EYES).map(([k, v]) => [k, v.label]));
export const EYES_ORDER = Object.keys(FR.EYES);

/* ---- The picture's ground and ring, in the manner of an illuminated page ---- */
/** "" lets the character's kind choose (see themeFor). bg and star: the starred grounds. */
export const GROUNDS = {"": {label: "What fits the character"}, gold: {label: "Gold leaf"}, lapis: {label: "Lapis with gold stars", bg: "1f2f6e"},
  red: {label: "Vermilion with gold stars", bg: "8e1d1d"}, green: {label: "Verdigris with gold stars", bg: "1f4a32"},
  violet: {label: "Purple with gold stars", bg: "4a2a62"}, night: {label: "Night with silver stars", bg: "14161f", star: "c8ccd8", line: "8a90a0"},
  ember: {label: "Smoke with embers", bg: "2a0e0a", star: "e0642a", line: "8a3a20"}, parchment: {label: "Bare parchment"},
  rose: {label: "Rose with silver stars", bg: "6e2340", star: "d8d8e2", line: "b8a0b0"},
  diaper: {label: "Red and blue diaper", kind: "diaper", bg: "8e1d1d", alt: "1f2f6e"},
  vine: {label: "Green with a gold vine", kind: "vine", bg: "1c3a26"},
  lily: {label: "Azure with gold lilies", kind: "lily", bg: "24407e"},
  chequer: {label: "Bone and black chequer", kind: "chequer", bg: "1a1816", alt: "d8ccb0"},
  punched: {label: "Punched gold", kind: "punched"}};
/** The coloured ring inside the gilt one. */
export const RINGS = {"": {label: "What fits the character"}, mortal: {label: "Blue, for the living", c: "2b4a9a"}, kindred: {label: "Red, for the Kindred", c: "9a1f1f"},
  sworn: {label: "Carmine, for the blood-bound and sworn", c: "b0244a"}, creature: {label: "Green, for spirits and beasts", c: "2f6b3a"}};
/**
 * The ground and ring that fit a kind of character: type is the actor type of the system, variant its sub-kind.
 * Storyteller characters get this; players choose their own in the window.
 */
export function themeFor({type = "", variant = ""} = {}) {
  const v = String(variant).toLowerCase();
  switch ( type ) {
    case "Vampire": return {ground: "red", ring: "kindred"};
    case "Mortal": return /ghoul|revenant|retainer/.test(v) ? {ground: "rose", ring: "sworn"} : /faith|inquisit|priest/.test(v) ? {ground: "diaper", ring: "mortal"}
      : /sorcer|psychic/.test(v) ? {ground: "lily", ring: "mortal"} : {ground: "gold", ring: "mortal"};
    case "Mage": return {ground: "lapis", ring: "mortal"};
    case "Hunter": return {ground: "parchment", ring: "mortal"};
    case "Werewolf": return {ground: "green", ring: "creature"};
    case "Changing Breed": return {ground: "vine", ring: "creature"};
    case "Changeling": return {ground: "vine", ring: "creature"};
    case "Wraith": return {ground: "chequer", ring: "creature"};
    case "Demon": return {ground: "ember", ring: "creature"};
    case "Mummy": case "Exalted": return {ground: "punched", ring: "creature"};
    case "Creature": return /spirit|shadow/.test(v) ? {ground: "night", ring: "creature"} : /fae|fair|chimera/.test(v) ? {ground: "violet", ring: "creature"} : {ground: "green", ring: "creature"};
    default: return {ground: "gold", ring: "mortal"};
  }
}
/** The ground and ring this look shows: its own choice, else what fits the character. */
export function styleFor(look, who = {}) {
  const t = themeFor(who), st = look?.style ?? {};
  return {ground: GROUNDS[st.ground] && st.ground ? st.ground : t.ground, ring: RINGS[st.ring] && st.ring ? st.ring : t.ring};
}
export const DYES = {"3f6b4c": "Green", "34558c": "Woad blue", "9c3b30": "Madder red", "b8463c": "Red", "c9a640": "Weld yellow", "cbbd9b": "Undyed wool", "6b4a32": "Brown", "2a2a2e": "Black", "5b3f6b": "Violet", "f3efe4": "White linen"};
export const METALS = {"d9b04c": "Gilt", "b8bcc2": "Silver", "8a6a3a": "Bronze", "4f4943": "Iron"};
export const HEADWEAR = {none: "Nothing", veil: "Veil and wimple", fillet: "Veil, wimple and fillet"};

/** Moods: brows and a mouth from Lorelei's own set. "own" keeps the character's chosen ones. */
export const MOODS = {
  own: {label: "The character's own"},
  disgruntled: {label: "Disgruntled", eyebrows: "variant13", mouth: "sad04"},
  upset: {label: "Upset", eyebrows: "variant11", mouth: "sad03"},
  grim: {label: "Grim", eyebrows: "variant12", mouth: "sad05"},
  snarling: {label: "Snarling", eyebrows: "variant13", mouth: "sad05", expr: "snarl"},
  unconscious: {label: "Eyes closed", eyes: "variant19", eyebrows: "variant12", mouth: "sad09", expr: "slack"}
};

/** The expression the mouth shows: the mood's, else the character's own mouth. */
export const expressionFor = (look, mood = "own") => { const m = MOODS[mood] ?? MOODS.own; return m.expr ?? m.mouth ?? look?.face?.mouth ?? "happy02"; };

/** How the face is drawn: only the lips and facial hair heed it. "" when the character's gender is not known. */
export const GENDERS = {"": "Not stated", woman: "A woman", man: "A man", nonbinary: "Nonbinary"};

/* ---- The health track ---- */
export const LEVELS = ["bruised", "hurt", "injured", "wounded", "mauled", "crippled", "incapacitated"];
export const LEVEL_LABELS = ["Unhurt", "Bruised", "Hurt", "Injured", "Wounded", "Mauled", "Crippled", "Incapacitated"];
/** How far down the health track the character is: 0 unhurt, 1 Bruised ... 7 Incapacitated. */
export function healthLevel(health) {
  const d = health?.damage ?? {};
  let boxes = ["bashing", "lethal", "aggravated"].reduce((s, k) => s + (Number(d[k]) || 0), 0);
  if ( boxes <= 0 ) return 0;
  let lvl = 0;
  for ( let i = 0; i < LEVELS.length; i++ ) {
    const n = Math.max(0, Number(health?.[LEVELS[i]]?.total ?? health?.[LEVELS[i]]?.value ?? 1) || 0);
    if ( !n ) continue;
    lvl = i + 1; boxes -= n;
    if ( boxes <= 0 ) break;
  }
  return lvl;
}
/** The mood the face shows: Incapacitated closes the eyes; frenzy snarls; then the health track, when the face follows it. */
export function moodFor(look, {level = 0, frenzy = false, follow = true} = {}) {
  if ( follow && look?.followHealth !== false && level >= 7 ) return "unconscious";
  if ( frenzy && follow ) return "snarling";
  if ( follow && look?.followHealth !== false ) {
    if ( level >= 6 ) return "grim";
    if ( level >= 3 ) return "upset";
    if ( level >= 1 ) return look?.mood && look.mood !== "own" ? look.mood : "disgruntled";
  }
  return MOODS[look?.mood] ? look.mood : "own";
}

/* ---- A look ---- */
export function defaultLook(seed = "") {
  return {v: LOOK_VERSION, seed: String(seed),
    face: {head: "variant01", eyes: "variant04", eyebrows: "variant07", nose: "variant01", mouth: "happy02", hair: "variant02", beard: "", glasses: "", earrings: "", freckles: false,
      lips: "", gender: "", build: "", age: "", cheeks: "", marks: "", scar: "", affliction: ""},
    colors: {skin: "f0d6bf", hair: "5a3a28", eyes: "5a3a22", lips: ""}, style: {ground: "", ring: ""},
    clothes: {gown: "3f6b4c", mantle: true, mantleColor: "34558c", lining: "b8463c", brooch: "d9b04c", headwear: "none", veil: "f3efe4"},
    mood: "own", followHealth: true, portrait: false};
}
const pick = (v, list, d) => list.includes(v) ? v : d;
const pickKey = (v, table, d) => Object.hasOwn(table, v) ? v : d;
/** A clean look: anything unknown goes back to the default, so a bad flag never breaks the picture. */
export function normalize(raw) {
  const d = defaultLook(raw?.seed ?? "");
  const f = raw?.face ?? {}, c = raw?.colors ?? {}, cl = raw?.clothes ?? {};
  const face = {};
  for ( const k of Object.keys(PARTS) ) face[k] = pick(NEAREST[k]?.[f[k]] ?? f[k] ?? d.face[k], PARTS[k], d.face[k]);
  face.freckles = !!f.freckles;
  face.gender = pickKey(f.gender, GENDERS, "");
  const hex = (v, table, dv) => (typeof v === "string" && /^[0-9a-f]{6}$/i.test(v)) ? v.toLowerCase() : (Object.hasOwn(table, v) ? v : dv);
  return {v: LOOK_VERSION, seed: String(raw?.seed ?? ""), face,
    colors: {skin: hex(c.skin, SKIN, d.colors.skin), hair: hex(c.hair, HAIR, d.colors.hair), eyes: pickKey(c.eyes, FR.EYES, d.colors.eyes), lips: pickKey(c.lips, FR.LIPS, "")},
    style: {ground: pickKey(raw?.style?.ground, GROUNDS, ""), ring: pickKey(raw?.style?.ring, RINGS, "")},
    clothes: {gown: hex(cl.gown, DYES, d.clothes.gown), mantle: cl.mantle !== false, mantleColor: hex(cl.mantleColor, DYES, d.clothes.mantleColor),
      lining: hex(cl.lining, DYES, d.clothes.lining), brooch: pickKey(cl.brooch, METALS, d.clothes.brooch),
      headwear: pickKey(cl.headwear, HEADWEAR, "none"), veil: hex(cl.veil, DYES, d.clothes.veil)},
    mood: pickKey(raw?.mood, MOODS, "own"), followHealth: raw?.followHealth !== false, portrait: !!raw?.portrait};
}
/** Step a face part to the next or previous choice. */
export function step(look, part, by) {
  const list = PARTS[part]; if ( !list ) return look;
  const i = Math.max(0, list.indexOf(look.face[part]));
  return {...look, face: {...look.face, [part]: list[(i + by + list.length * 4) % list.length]}};
}
/** How often a kind of character comes up with a skin no human has (out of 100). */
export function fantasticChance({type = "", variant = ""} = {}) {
  const v = String(variant).toLowerCase();
  if ( type === "Changeling" ) return /kinain|mortal/.test(v) ? 0 : 60;
  if ( type === "Creature" ) return /spirit|fae|fair|shadow|chimera|demon/.test(v) ? 50 : 15;
  if ( type === "Demon" ) return 25;
  return 0;
}
/** A random look from a seed (the same seed gives the same look). who: the character's kind, as themeFor takes it. */
export function randomLook(seed, who = {}) {
  let h = hash32(String(seed), 0x9e3779b9);
  const next = n => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h % n; };
  const l = defaultLook(seed);
  for ( const k of ["head", "build", "eyes", "eyebrows", "nose", "hair"] ) l.face[k] = PARTS[k][next(PARTS[k].length)];
  // A face at rest: the quiet mouths, not the broad smile or the frowns (moods bring those)
  l.face.mouth = MR.RESTING[next(MR.RESTING.length)];
  // Most faces are grown; the rarer parts come up now and then
  const weighted = list => { let n = next(list.reduce((s, [, w]) => s + w, 0)); for ( const [v, w] of list ) { if ( n < w ) return v; n -= w; } return list[0][0]; };
  l.face.age = weighted([["youth", 3], ["", 8], ["seasoned", 5], ["middle", 4], ["old", 2], ["aged", 1]]);
  l.face.cheeks = next(100) < 45 ? "" : PARTS.cheeks[1 + next(PARTS.cheeks.length - 1)];
  l.face.marks = next(100) < 70 ? "" : PARTS.marks[1 + next(PARTS.marks.length - 1)];
  l.face.scar = next(100) < 82 ? "" : PARTS.scar[1 + next(PARTS.scar.length - 1)];
  l.face.beard = next(100) < 62 ? "" : PARTS.beard[1 + next(PARTS.beard.length - 1)];
  l.face.freckles = next(100) < 8;
  l.colors.skin = FR.SKIN_HUMAN[next(FR.SKIN_HUMAN.length)];
  const odd = fantasticChance(who);
  if ( odd && next(100) < odd ) l.colors.skin = FR.SKIN_FANTASTIC[next(FR.SKIN_FANTASTIC.length)];
  const natural = Object.keys(HAIR).filter(k => !FR.HAIR_GREY.includes(k));
  const grey = {old: 60, aged: 90, middle: 25}[l.face.age] ?? 0;
  l.colors.hair = next(100) < grey ? FR.HAIR_GREY[next(FR.HAIR_GREY.length)] : natural[next(natural.length)];
  const dyes = Object.keys(DYES).filter(k => k !== "f3efe4");
  l.clothes.gown = dyes[next(dyes.length)];
  l.clothes.mantleColor = dyes[next(dyes.length)];
  // Drawn last, so the earlier draws stay as they were: natural eyes, and now and then the marks of a hard life
  l.colors.eyes = FR.EYES_NATURAL[next(FR.EYES_NATURAL.length)];
  const hard = ["poxScars", "poxScars", "warts", "lostEye", "eyepatch", "burned", "mangled", "leprous"];
  l.face.affliction = next(100) < 6 ? hard[next(hard.length)] : "";
  l.face.lips = PARTS.lips[next(PARTS.lips.length)];
  l.face.gender = pickKey(who.gender, GENDERS, "");
  // Facial hair is rolled for men and for faces of no stated gender, as before; never for women
  if ( l.face.gender === "woman" ) l.face.beard = "";
  return l;
}

/** Under a veil and wimple no hair shows, so the head is drawn with close hair the veil can lie on. */
export const CLOSE_HAIR = "variant02";
export const hairFor = look => look.clothes?.headwear && look.clothes.headwear !== "none" ? CLOSE_HAIR : look.face.hair;

/** The options DiceBear's Lorelei takes for this look and mood. key: draw it in key colours for measuring. */
export function loreleiOptions(look, mood = "own", {key = false, mask = false, features = false} = {}) {
  const f = look.face, m = MOODS[mood] ?? MOODS.own;
  const o = {seed: look.seed || "wodx", head: [f.head], eyes: [m.eyes ?? f.eyes], eyebrows: [m.eyebrows ?? f.eyebrows], nose: [f.nose], mouth: [m.mouth ?? f.mouth], hair: [hairFor(look)],
    skinColor: [key ? "00ff00" : look.colors.skin], hairColor: [key ? "ff0000" : look.colors.hair],
    beardProbability: loreleiBeard(f.beard) ? 100 : 0, glassesProbability: f.glasses ? 100 : 0, earringsProbability: f.earrings ? 100 : 0,
    frecklesProbability: f.freckles ? 100 : 0, hairAccessoriesProbability: 0};
  if ( loreleiBeard(f.beard) ) o.beard = [f.beard];
  if ( f.glasses ) o.glasses = [f.glasses];
  if ( f.earrings ) o.earrings = [f.earrings];
  if ( key ) { o.mouth = ["happy05"]; o.eyebrows = ["variant07"]; o.frecklesProbability = 0; o.glassesProbability = 0; o.earringsProbability = 0; }
  if ( features ) {
    // Skin and hair green, each feature in its own colour: found and checked by fit-rules findEyes and checkFeatures
    Object.assign(o, {eyesColor: ["ff00ff"], skinColor: ["00ff00"], hairColor: ["00ff00"], mouthColor: ["0000ff"], eyebrowsColor: ["ffff00"], noseColor: ["ff8000"]});
    o.frecklesProbability = 0; o.glassesProbability = 0; o.earringsProbability = 0;
  } else if ( !key && !mask ) {
    // Inked in sepia, with lips, brows and nose in the colours of the face, as on an illuminated page
    const k = inksOf(look);
    Object.assign(o, {eyesColor: ["2a1a10"], mouthColor: [k.lips], eyebrowsColor: [k.brows], noseColor: [k.nose]});
  }
  if ( mask ) { o.skinColor = ["ffffff"]; o.hairColor = ["000000"]; o.mouthColor = ["fdfdfd"]; o.frecklesProbability = 0; o.glassesProbability = 0; o.earringsProbability = 0; }
  return o;
}
const loreleiBeard = b => /^variant0[12]$/.test(b ?? "");
/** What the measurement depends on: the same key means the same anchors. */
export const fitKey = look => [look.face.head, hairFor(look), loreleiBeard(look.face.beard) ? look.face.beard : "", look.face.build ?? ""].join("|");
/**
 * The bare face: the same head and build with close hair, measured for the outline of the face, which a long fringe
 * would otherwise cut short. The hair still decides the outline of the head (see withFace).
 */
export const bareLook = look => ({...look, face: {...look.face, hair: CLOSE_HAIR}, clothes: {...look.clothes, headwear: "none"}});
/** The anchors of the head with its hair, given the face outline measured on the bare face. */
export function withFace(A, bare) {
  if ( !A || !bare ) return A;
  return {...A, face: bare.face, facePath: bare.facePath, faceBox: bare.faceBox};
}
/** The build's scale, for measuring. */
export const buildOf = look => { const b = FR.buildOf(look?.face?.build); return {sx: b.sx, sy: b.sy}; };
/** Lorelei's key drawing (the whole SVG), set in the build of the face, ready to be measured. */
export function keySvg(look, key) {
  const t = FR.buildTransform(look.face.build);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 980 980" width="980" height="980"><g${t ? ` transform="${t}"` : ""}>${innerSvg(key)}</g></svg>`;
}
/**
 * The head for the picture: Lorelei's drawing (inner part) in the build of the face, with age, complexion, marks,
 * scar and facial hair on the skin. mask: Lorelei's drawing of the same face in mask colours (inner part), so
 * those parts show only on visible skin.
 */
/**
 * Fuller lips and brows that show: the mouth (found by its colour) gets a stroke of its own colour round it and a
 * soft wash of lip colour behind it; on very dark skin the brows get a lighter rim under them.
 */
/**
 * The lips this face draws: the character's own (MR.lipsOf), made a little smaller, step by step, if the mouth
 * would come too near the edge of this face (a narrow face with wide, full lips). anchors: the measured head.
 */
export function lipsFor(look, mood = "own", eyes = null, anchors = null) {
  const L = MR.lipsOf(look);
  if ( !anchors?.face?.length || !eyes?.pupils?.length ) return L;
  const ex = expressionFor(look, mood), at = MR.mouthPlace(eyes), b = buildOf(look);
  for ( let k = 1; k >= 0.6; k -= 0.04 ) {
    const l = {...L, w: L.w * k, full: L.full * k, thin: L.thin * Math.max(k, 0.8)};
    if ( MR.mouthFits(MR.mouthShape(ex, at, l), anchors.face, b) ) return l;
  }
  return {...L, w: L.w * 0.6, full: L.full * 0.6};
}
export function inkHead(head, look, eyes = null, mood = "own", lips = null) {
  const k = inksOf(look);
  const at = hex => new RegExp(`<path([^>]*?) d="([^"]+)"([^>]*?) fill="#${hex}"\\/>`, "g");
  // Lips: Lorelei's mouth gives way to WoDX's own, drawn to fit under the nose and between the eyes (mouth-rules)
  let done = false;
  let s = String(head).replace(at(k.lips), () => {
    if ( done ) return "";
    done = true;
    return MR.mouthSvg(expressionFor(look, mood), MR.mouthPlace(eyes), {lips: k.lips, skin: look.colors.skin, shape: lips ?? MR.lipsOf(look)});
  });
  if ( k.rim ) s = s.replace(at(k.brows), (m, d) => `<path d="${d}" fill="none" stroke="#${k.rim}" stroke-width="5" stroke-linejoin="round"/>${m}`);
  return s;
}
export function headLayers({look, head, mask, eyes = null, mood = "own", anchors = null}) {
  const lips = lipsFor(look, mood, eyes, anchors);
  head = inkHead(head, look, eyes, mood, lips);
  const t = FR.buildTransform(look.face.build);
  const {skin: on, defs} = FR.skinLayers(look.face, look.colors);
  const af = FR.affliction(look.face.affliction, look.colors.skin, eyes), skin = on + af.head;
  // In the mask, black is nudged off pure black, so the sepia inking of the picture leaves the mask alone
  const m = skin ? `<mask id="wpd-skin" maskUnits="userSpaceOnUse" x="-100" y="-100" width="1200" height="1200">${String(mask ?? "").replaceAll("viewboxMask", "wpd-vbm")
    .replace(/(<path\b[^>]*?)fill="#fff"/gi, '$1fill="#000"').replace(/(fill|stroke)="#000(000)?"/gi, '$1="#010101"')
    // Lorelei's mouth counts as skin; WoDX's own mouth is cut out of it, unless a moustache is to lie over it
    .replace(/<path([^>]*?) d="([^"]+)"([^>]*?) fill="#fdfdfd"\/>/i, (all, pre, d, post) => `<path${pre} d="${d}"${post} fill="#ffffff"/>${FR.WHISKERS[look.face.beard] ? "" : MR.mouthSilhouette(expressionFor(look, mood), MR.mouthPlace(eyes), "#010101", lips)}`)}</mask>` : "";
  const iris = mood === "unconscious" ? "" : FR.irises(eyes, look.colors.eyes, {skip: /^(lostEye|eyepatch)$/.test(look.face.affliction) ? [0] : []});
  return `<defs>${defs}${m}</defs><g${t ? ` transform="${t}"` : ""}>${head}${iris}${skin ? `<g mask="url(#wpd-skin)">${skin}</g>` : ""}${af.over}</g>`;
}

/** What the features drawing depends on: the same key means the same eyes found and the same check. */
export const featureKey = (look, mood = "own") => { const o = loreleiOptions(look, mood, {features: true}); return [fitKey(look), o.eyes, o.eyebrows, o.mouth, o.nose].join("|"); };

/**
 * A face is built in stages, and each is checked before the next is drawn on it:
 * 1. head: the head in its build is measured (neck, shoulders, face outline);
 * 2. features: eyes, brows, nose and mouth sit on that face (fit-rules checkFeatures), and the pupils are found;
 * 2a. mouth: the mouth drawn by WoDX lies inside the face outline, with room to spare;
 * 2b. colours: lips, brows and nose stand out from the skin (inksOf);
 * 3. skin: age, complexion, marks, scars, facial hair and afflictions lie under the mask of visible skin;
 * 4. over the eye: the lost eye or the patch has an eye to cover;
 * 5. clothes: the neckline sits on the neck and below the face;
 * 6. ring: headwear stays inside the ring.
 * Returns the list of stages, each {stage, ok, why}. A failed stage names what went wrong.
 */
export function stagesOf({look, anchors: A, features, eyes, crop, mood = "own"}) {
  const out = [], add = (stage, ok, why = "") => out.push({stage, ok: !!ok, why: ok ? "" : why});
  add("head", A && A.face?.length >= 20 && A.faceBox?.w > 150 && A.blobTop > A.faceBox?.y, "the head could not be measured");
  const bad = features ? Object.entries(features.parts).filter(([, p]) => !p.ok).map(([k]) => k) : ["features not drawn"];
  add("features", features?.ok, `off the face: ${bad.join(", ")}`);
  const k = inksOf(look), dim = ["lips", "nose"].filter(p => k.ratio[p] < FR.NEED[p]).concat(k.ratio.brows < FR.NEED.brows && !k.rim ? ["brows"] : []);
  const mouth = eyes?.pupils?.length ? MR.mouthShape(expressionFor(look, mood), MR.mouthPlace(eyes), lipsFor(look, mood, eyes, A)) : null;
  add("mouth", !eyes?.pupils?.length || mouth && MR.mouthFits(mouth, A?.face, buildOf(look)), "the mouth runs off the face");
  add("colours", !dim.length, `blends into the skin: ${dim.join(", ")}`);
  add("skin", true);
  const over = /^(lostEye|eyepatch)$/.test(look.face.affliction ?? "");
  add("over the eye", !over || eyes?.eyes?.some(e => e.side === 0), "no near eye to cover");
  const sh = A?.shoulder;
  add("clothes", sh && sh.l[0] < A.neckMid && A.neckMid < sh.r[0] && sh.dip[1] > A.faceBox.y + A.faceBox.h * 0.7, "the neckline does not meet the neck");
  add("ring", !crop || crop.clearance >= 0, "the headwear crosses the ring");
  return out;
}

/* ---- Hashing (file names for baked pictures) ---- */
export function hash32(s, seed = 0x811c9dc5) {
  let h = seed >>> 0;
  for ( let i = 0; i < s.length; i++ ) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export const hashOf = s => hash32(s).toString(16).padStart(8, "0") + hash32(s, 0x1b873593).toString(16).padStart(8, "0");

/* ---- Drawing ---- */
const K = "#000", W = 14, w = 9;
const f0 = n => Math.round(n);
const ink = (d, fill = "none", sw = W) => `<path d="${d}" fill="${fill}" stroke="${K}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]); };
const split = (c, t) => {
  const [p0, p1, p2, p3] = c, L = (a, b) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const a = L(p0, p1), b = L(p1, p2), cc = L(p2, p3), d = L(a, b), e = L(b, cc), f = L(d, e);
  return [f, e, cc, p3];
};
const xAtY = (c, y) => { let best = 0, bd = 1e9; for ( let t = 0; t <= 1; t += 0.002 ) { const q = bez(...c, t); if ( Math.abs(q[1] - y) < bd ) { bd = Math.abs(q[1] - y); best = q[0]; } } return best; };
const C = c => ` C${f0(c[1][0])} ${f0(c[1][1])} ${f0(c[2][0])} ${f0(c[2][1])} ${f0(c[3][0])} ${f0(c[3][1])}`;
const rev = c => [c[3], c[2], c[1], c[0]];
const through = pts => {
  let d = "";
  for ( let i = 0; i < pts.length - 1; i++ ) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C${f0(p1[0] + (p2[0] - p0[0]) / 6)} ${f0(p1[1] + (p2[1] - p0[1]) / 6)} ${f0(p2[0] - (p3[0] - p1[0]) / 6)} ${f0(p2[1] - (p3[1] - p1[1]) / 6)} ${f0(p2[0])} ${f0(p2[1])}`;
  }
  return d;
};
const hx = v => `#${v}`;
const BOT = 1400;

/** The shared lines every garment sits on: neckline and shoulder line, from the anchors. */
function frameOf(A) {
  const P = (x, y) => [x, y], mirror = c => c.map(([x, y]) => [2 * A.neckMid - x, y]);
  const nl = A.shoulder.l, nr = A.shoulder.r, dip = A.shoulder.dip;
  const neckL = [nl, P(nl[0] + 50, dip[1] - 6), P(dip[0] - 70, dip[1]), dip];
  const neckR = [dip, P(dip[0] + 70, dip[1]), P(nr[0] - 50, dip[1] - 6), nr];
  const shL = [nl, P(nl[0] - 90, nl[1] + 14), P(nl[0] - 160, nl[1] + 70), P(nl[0] - 182, nl[1] + 170)];
  const shR = mirror(shL);
  const armL = [shL[3], P(shL[3][0] - 26, shL[3][1] + 110), P(shL[3][0] - 40, 1250), P(shL[3][0] - 46, BOT)];
  return {P, mirror, nl, nr, dip, neckL, neckR, shL, shR, armL, armR: mirror(armL)};
}

/** Dark Ages, about 1200: a wool gown with a round neck; a mantle over the shoulders held by a ring brooch. */
export function gown(A, cl) {
  const {P, mirror, nl, dip, neckL, neckR, shL, shR, armL, armR} = frameOf(A);
  const out = [ink(`M${f0(armL[3][0])} ${BOT}` + C(rev(armL)) + C(rev(shL)) + C(neckL) + C(neckR) + C(shR) + C(armR) + " Z", hx(cl.gown)),
    ink(`M${f0(nl[0])} ${f0(nl[1])}` + C(neckL) + C(neckR), "none", w)];
  if ( !cl.mantle ) {
    out.push(ink(`M${f0(A.neckMid)} ${f0(dip[1] + 40)} C${f0(A.neckMid - 2)} 1150 ${f0(A.neckMid - 6)} 1300 ${f0(A.neckMid - 8)} ${BOT}`, "none", w));
    return out.join("");
  }
  const mL = split(shL, 0.33), mR = mirror(mL);
  const frontL = [mL[0], P(mL[0][0] + 26, mL[0][1] + 90), P(mL[0][0] + 50, 1200), P(mL[0][0] + 58, BOT)], frontR = mirror(frontL);
  const lin = 14, shift = (c, dx) => c.map(([x, y], i) => [x + (i ? dx : dx * 0.4), y]);
  const cy = dip[1] + 225, xl = xAtY(frontL, cy), xr = xAtY(frontR, cy);
  out.push(
    ink(`M${f0(mL[0][0])} ${f0(mL[0][1])}` + C(mL) + C(armL) + ` L${f0(frontL[3][0])} ${BOT}` + C(rev(frontL)) + " Z", hx(cl.mantleColor)),
    ink(`M${f0(mR[0][0])} ${f0(mR[0][1])}` + C(mR) + C(armR) + ` L${f0(frontR[3][0])} ${BOT}` + C(rev(frontR)) + " Z", hx(cl.mantleColor)),
    ink(`M${f0(frontL[0][0])} ${f0(frontL[0][1])}` + C(frontL) + ` L${f0(frontL[3][0] - lin)} ${BOT}` + C(rev(shift(frontL, -lin))) + " Z", hx(cl.lining), w),
    ink(`M${f0(frontR[0][0])} ${f0(frontR[0][1])}` + C(frontR) + ` L${f0(frontR[3][0] + lin)} ${BOT}` + C(rev(shift(frontR, lin))) + " Z", hx(cl.lining), w),
    ink(`M${f0(armL[0][0] + 40)} ${f0(armL[0][1] + 140)} C${f0(armL[0][0] + 50)} 1250 ${f0(armL[0][0] + 60)} 1330 ${f0(armL[0][0] + 64)} ${BOT}`, "none", w),
    ink(`M${f0(armR[0][0] - 40)} ${f0(armR[0][1] + 140)} C${f0(armR[0][0] - 50)} 1250 ${f0(armR[0][0] - 60)} 1330 ${f0(armR[0][0] - 64)} ${BOT}`, "none", w),
    ink(`M${f0(A.neckMid)} ${f0(cy + 50)} C${f0(A.neckMid - 2)} 1200 ${f0(A.neckMid - 6)} 1320 ${f0(A.neckMid - 8)} ${BOT}`, "none", w),
    ink(`M${f0(xl)} ${f0(cy)} C${f0(xl + 60)} ${f0(cy + 22)} ${f0(xr - 60)} ${f0(cy + 22)} ${f0(xr)} ${f0(cy)}`, "none", w),
    `<circle cx="${f0(A.neckMid)}" cy="${f0(cy + 16)}" r="26" fill="${hx(cl.brooch)}" stroke="${K}" stroke-width="${W}"/>`,
    `<circle cx="${f0(A.neckMid)}" cy="${f0(cy + 16)}" r="9" fill="${K}"/>`,
    `<path d="M${f0(A.neckMid)} ${f0(cy - 20)} L${f0(A.neckMid)} ${f0(cy + 52)}" stroke="${K}" stroke-width="${w}" stroke-linecap="round"/>`);
  return out.join("");
}

/** The fillet: a stiff pleated linen band standing upright on the crown, over the veil. */
export function filletBox(A) {
  const top = A.crown + 30, bottom = top + 86;
  // as wide as the veil where the band's lower edge meets it, never wider than the head
  let x0 = A.neckMid - 236, x1 = A.neckMid + 320;
  const T = A.headTop;
  for ( let i = 0; i < T.length - 1; i++ ) {
    const [ax, ay] = T[i], [bx, by] = T[i + 1];
    if ( (ay - bottom) * (by - bottom) > 0 || ay === by ) continue;
    const x = ax + (bx - ax) * (bottom - ay) / (by - ay);
    if ( x < A.neckMid + 42 ) x0 = Math.max(x0, x + 4); else x1 = Math.min(x1, x - 4);
  }
  return {x0, x1, top, bottom};
}

/**
 * Veil and wimple as two pieces, as worn about 1200. The wimple wraps the chin and throat, pinned up at the
 * temples, and lies over the gown; the veil follows the outline of head and hair down to the shoulders, over it.
 * Returns {svg, tops}: tops are the highest points drawn, for the ring check.
 */
export function headwear(A, cl) {
  if ( !cl.headwear || cl.headwear === "none" ) return {svg: "", tops: []};
  const {mirror, nr, neckL, neckR, shL} = frameOf(A);
  const F = A.face, TEMPLE = 815 + (470 - 815) * (A.build?.sy ?? 1);
  const lowerIdx = F.map((p, i) => i).filter(i => F[i][1] >= TEMPLE);
  const lower = lowerIdx.map(i => F[i]);
  const iL = lowerIdx[lowerIdx.length - 1], iR = lowerIdx[0];
  const upper = [];
  { const a = F[iL], b = F[iR], peak = A.faceBox.y - 38; for ( let k = 0; k <= 12; k++ ) { const t = k / 12; upper.push([a[0] + (b[0] - a[0]) * t, (a[1] + (b[1] - a[1]) * t) - ((a[1] + b[1]) / 2 - peak) * Math.sin(Math.PI * t) ** 0.4]); } }
  const TR = lower[0], TL = lower[lower.length - 1];
  const tuck = 30;
  const drop = x => 42 * Math.max(0, 1 - Math.abs(x - A.neckMid) / (nr[0] - A.neckMid + 60)) ** 0.7;
  const onL = bez(...shL, 0.45), onR = [2 * A.neckMid - onL[0], onL[1]];
  const hemL = shL.map(([x, y]) => [x, y + tuck]), hemR = mirror(hemL);
  const nRr = rev(neckR).map(([x, y]) => [x, y + tuck + drop(x)]), nLr = rev(neckL).map(([x, y]) => [x, y + tuck + drop(x)]);
  const pinR = [TR[0] + 70, TR[1] - 110], pinL = [TL[0] - 70, TL[1] - 110];
  let wd = `M${f0(pinR[0])} ${f0(pinR[1])} L${f0(TR[0] + 4)} ${f0(TR[1] - 60)} L${f0(TR[0])} ${f0(TR[1])}` + through(lower) + ` L${f0(TL[0] - 4)} ${f0(TL[1] - 60)} L${f0(pinL[0])} ${f0(pinL[1])}`;
  wd += ` C${f0(pinL[0] - 40)} ${f0(pinL[1] + 120)} ${f0(onL[0] + 40)} ${f0(onL[1] - 120)} ${f0(onL[0])} ${f0(onL[1] + tuck)}`;
  wd += C(split(rev(hemL), 0.55)) + C(rev(nLr)) + C(rev(nRr)) + C(rev(split(rev(hemR), 0.55)));
  wd += ` C${f0(onR[0] - 40)} ${f0(onR[1] - 120)} ${f0(pinR[0] + 40)} ${f0(pinR[1] + 120)} ${f0(pinR[0])} ${f0(pinR[1])} Z`;
  const chin = lower.filter(([x]) => x > TL[0] + 60 && x < TR[0] - 60);
  const pleats4 = [0.2, 0.4, 0.6, 0.8].map(t => chin[Math.round(t * (chin.length - 1))]).filter(Boolean).map(([x, y]) => {
    const dx = x - A.neckMid, dy = y - 520, m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
    const a = [x + ux * 30, y + uy * 30], b = [x + ux * 78, y + uy * 78], bend = [(a[0] + b[0]) / 2 + uy * 8, (a[1] + b[1]) / 2 - ux * 8];
    return `<path d="M${f0(a[0])} ${f0(a[1])} Q${f0(bend[0])} ${f0(bend[1])} ${f0(b[0])} ${f0(b[1])}" stroke="${K}" stroke-width="${w}" stroke-linecap="round" fill="none"/>`;
  }).join("");

  const top = A.headTop, L0 = top[0], R0 = top[top.length - 1];
  const tan = (p, q, k) => { const dx = p[0] - q[0], dy = p[1] - q[1], m = Math.hypot(dx, dy) || 1; return [p[0] + dx / m * k, p[1] + dy / m * k]; };
  const cR = tan(R0, top[top.length - 2], 140), cL = tan(L0, top[1], 140);
  const outR = [onR[0] + 20, onR[1] + 14], outL = [onL[0] - 20, onL[1] + 14];
  const inR = [onR[0] - 34, onR[1] + 22], inL = [onL[0] + 34, onL[1] + 22];
  const tR = [TR[0] + 8, TR[1] - 40], tL = [TL[0] - 8, TL[1] - 40];
  let vd = `M${f0(L0[0])} ${f0(L0[1])}` + through(top);
  vd += ` C${f0(cR[0])} ${f0(cR[1])} ${f0(outR[0] + 10)} ${f0(outR[1] - 160)} ${f0(outR[0])} ${f0(outR[1])} L${f0(inR[0])} ${f0(inR[1])}`;
  vd += ` C${f0(inR[0])} ${f0(inR[1] - 220)} ${f0(tR[0] + 70)} ${f0(tR[1] + 60)} ${f0(tR[0])} ${f0(tR[1])}`;
  vd += ` L${f0(upper[upper.length - 2][0])} ${f0(upper[upper.length - 2][1])}` + through(upper.slice(1, -1).reverse()) + ` L${f0(tL[0])} ${f0(tL[1])}`;
  vd += ` C${f0(tL[0] - 70)} ${f0(tL[1] + 60)} ${f0(inL[0])} ${f0(inL[1] - 220)} ${f0(inL[0])} ${f0(inL[1])} L${f0(outL[0])} ${f0(outL[1])}`;
  vd += ` C${f0(outL[0] - 10)} ${f0(outL[1] - 160)} ${f0(cL[0])} ${f0(cL[1])} ${f0(L0[0])} ${f0(L0[1])} Z`;
  const vfold = s => { const o = s > 0 ? outR : outL, t = s > 0 ? R0 : L0;
    return ink(`M${f0(t[0] - s * 46)} ${f0(t[1] + 40)} C${f0(t[0] - s * 40)} ${f0(t[1] + 200)} ${f0(o[0] - s * 40)} ${f0(o[1] - 160)} ${f0(o[0] - s * 52)} ${f0(o[1] - 8)}`, "none", w); };
  const parts = [ink(wd, "#fbfaf6"), pleats4, ink(vd, hx(cl.veil)), vfold(1), vfold(-1)];
  const tops = top.slice();
  if ( cl.headwear === "fillet" ) {
    const b = filletBox(A), N = 16, lo = [], hi = [];
    for ( let k = 0; k <= N; k++ ) { const t = k / N, s = Math.sin(Math.PI * t), x = b.x0 + (b.x1 - b.x0) * t; lo.push([x, b.bottom + 16 * s]); hi.push([x, b.top - 8 * s]); }
    parts.push(ink(`M${f0(lo[0][0])} ${f0(lo[0][1])}` + through(lo) + ` L${f0(hi[N][0])} ${f0(hi[N][1])}` + through(hi.slice().reverse()) + " Z", "#ffffff"));
    parts.push(lo.map((p, i) => i === 0 || i === N ? "" : `<path d="M${f0(p[0])} ${f0(p[1] - 6)} L${f0(hi[i][0])} ${f0(hi[i][1] + 6)}" stroke="${K}" stroke-width="5" stroke-linecap="round"/>`).join(""));
    tops.push(...hi);
  }
  return {svg: parts.join(""), tops};
}

/**
 * Marks of the health track, drawn on the skin under clothes and veil, kept inside the measured face outline.
 * Placed by fractions of the face's box, so they sit the same on every face shape. House rule art: one set per level.
 */
export function damageMarks(A, level, skin0) {
  const {skin, over} = damageLayers(A, level, skin0);
  return skin + over;
}
/** The marks in two parts: skin (on the skin, to lie under the mask of visible skin) and over (the bandage). */
/**
 * The colour going from the face at Mauled and worse: the skin's own colour drained of warmth, at its own lightness,
 * so a face greys rather than whitens (a light wash over dark skin read as a white film).
 */
function pallor(B, skin, level) {
  const v = Math.round(FR.lum(skin) * 255).toString(16).padStart(2, "0"), grey = FR.mix(`${v}${v}${v}`, "7a8a84", 0.08);
  const c = FR.mix(skin, grey, 0.75), o = level >= 7 ? 0.5 : level >= 6 ? 0.38 : 0.24;
  return `<rect x="${B.x - 40}" y="${B.y - 40}" width="${B.w + 80}" height="${B.h + 80}" fill="#${c}" fill-opacity="${o}"/>`;
}
export function damageLayers(A, level, skin = "c99a6e") {
  if ( !level ) return {skin: "", over: ""};
  const B = A.faceBox, X = fx => f0(B.x + B.w * fx), Y = fy => f0(B.y + B.h * fy), S = v => f0(v * B.w / 400);
  const out = [];
  const blood = "#9a2a22", cut = (a, b, c, d, wd = 6) => `<path d="M${X(a)} ${Y(b)} L${X(c)} ${Y(d)}" stroke="${blood}" stroke-opacity=".85" stroke-width="${wd}" stroke-linecap="round"/>`;
  // Bruised: a soft bruise on one cheekbone and a light graze over the other brow
  const deep = level >= 3 ? 0.75 : 0.55;
  out.push(`<ellipse cx="${X(0.19)}" cy="${Y(0.54)}" rx="${S(62 + 6 * Math.min(level, 5))}" ry="${S(44 + 4 * Math.min(level, 5))}" fill="url(#wpd-bruise)" transform="rotate(-12 ${X(0.19)} ${Y(0.54)})"/>`);
  out.push(`<ellipse cx="${X(0.7)}" cy="${Y(0.05)}" rx="${S(46)}" ry="${S(26)}" fill="#c96a5c" fill-opacity=".25" transform="rotate(-18 ${X(0.7)} ${Y(0.05)})"/>`);
  for ( const [a, b, c, d] of [[0.67, 0.04, 0.8, 0], [0.68, 0.07, 0.83, 0.03], [0.71, 0.1, 0.82, 0.07]] )
    out.push(`<path d="M${X(a)} ${Y(b)} L${X(c)} ${Y(d)}" stroke="#b5483e" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"/>`);
  // Hurt: a split lip at the corner of the mouth
  if ( level >= 2 ) out.push(cut(0.4, 0.7, 0.42, 0.75, 7), `<circle cx="${X(0.42)}" cy="${Y(0.77)}" r="${S(5)}" fill="${blood}"/>`);
  // Injured: a black eye round the bruised side
  if ( level >= 3 ) out.push(`<ellipse cx="${X(0.27)}" cy="${Y(0.37)}" rx="${S(70)}" ry="${S(46)}" fill="url(#wpd-blackeye)"/>`);
  // Wounded: a cut over the brow, bleeding down the temple
  if ( level >= 4 ) out.push(cut(0.62, 0.12, 0.86, 0.04, 8), `<path d="M${X(0.86)} ${Y(0.05)} C${X(0.88)} ${Y(0.14)} ${X(0.86)} ${Y(0.22)} ${X(0.88)} ${Y(0.3)}" stroke="${blood}" stroke-opacity=".8" stroke-width="${S(9)}" stroke-linecap="round" fill="none"/>`);
  // Mauled: a second cut across the cheek, and the colour going from the face
  if ( level >= 5 ) out.push(cut(0.62, 0.5, 0.78, 0.62, 7), pallor(B, skin, level));
  // Crippled: a linen bandage across the brow
  const top = [];
  if ( level >= 6 ) top.push(`<path d="M${X(-0.1)} ${Y(0.08)} C${X(0.3)} ${Y(-0.02)} ${X(0.7)} ${Y(-0.02)} ${X(1.1)} ${Y(0.1)} L${X(1.1)} ${Y(0.19)} C${X(0.7)} ${Y(0.07)} ${X(0.3)} ${Y(0.07)} ${X(-0.1)} ${Y(0.17)} Z" fill="#efe8d8" stroke="${K}" stroke-width="${w}" stroke-linejoin="round"/>`,
    `<ellipse cx="${X(0.78)}" cy="${Y(0.1)}" rx="${S(16)}" ry="${S(10)}" fill="${blood}" fill-opacity=".7"/>`);
  const defs = `<radialGradient id="wpd-bruise" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#6e4a86" stop-opacity="${deep}"/><stop offset=".6" stop-color="#8d5a7e" stop-opacity="${deep - 0.2}"/><stop offset="1" stop-color="#b9ad5c" stop-opacity="0"/></radialGradient>`
    + `<radialGradient id="wpd-blackeye" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#3a2440" stop-opacity="0"/><stop offset=".45" stop-color="#3a2440" stop-opacity=".55"/><stop offset=".75" stop-color="#5b3a66" stop-opacity=".35"/><stop offset="1" stop-color="#5b3a66" stop-opacity="0"/></radialGradient>`;
  return {skin: `<defs>${defs}<clipPath id="wpd-face"><path d="${A.facePath}"/></clipPath></defs><g clip-path="url(#wpd-face)">${out.join("")}</g>`,
    over: top.length ? `<g clip-path="url(#wpd-face)">${top.join("")}</g>` : ""};
}

/* ---- Lasting changes to the body (WoDX Storyteller's record, the ones that show) ---- */
/** The parts the picture can show, and each source's colour: a reshaped seam, a pale scar, a demon's glow. */
export const CHANGE_PARTS = ["face", "head", "eyes", "mouth", "skin", "whole"];
const CHANGE_INK = {vicissitude: "#8b4f45", metis: "#6d5a48", moliate: "#5d6b78", visage: "#e0682a", taint: "#3d4a2a", scar: "#efe0cc", other: "#6a4a3a"};
/** The changes worth drawing, from the record [{source, part, shows}]: one per part, newest wins, sorted for the key. */
export function changesToDraw(list) {
  const by = {};
  for ( const c of Array.isArray(list) ? list : [] ) {
    if ( !c || c.shows === false || !CHANGE_PARTS.includes(c.part) ) continue;
    by[c.part] = CHANGE_INK[c.source] ? c.source : "other";
  }
  return Object.keys(by).sort().map(part => ({part, source: by[part]}));
}
/** The marks of lasting changes, on the skin, inside the face outline (as the marks of the health track). */
export function changeLayers(A, changes) {
  const list = changesToDraw(changes);
  if ( !list.length ) return "";
  const B = A.faceBox, X = fx => f0(B.x + B.w * fx), Y = fy => f0(B.y + B.h * fy), S = v => f0(v * B.w / 400);
  const out = [];
  for ( const {part, source} of list ) {
    const c = CHANGE_INK[source], glow = source === "visage", op = source === "scar" ? 0.9 : 0.7;
    const line = (d, wd = 6) => `<path d="${d}" fill="none" stroke="${c}" stroke-opacity="${op}" stroke-width="${S(wd)}" stroke-linecap="round"${glow ? ' filter="url(#wpd-glow)"' : ""}/>`;
    if ( part === "face" ) {
      // A seam along the far cheekbone, with the stitch marks of flesh worked by hand
      out.push(line(`M${X(0.6)} ${Y(0.42)} C${X(0.7)} ${Y(0.5)} ${X(0.78)} ${Y(0.58)} ${X(0.82)} ${Y(0.7)}`, 7));
      for ( const t of [0.25, 0.5, 0.75] ) { const x = 0.6 + 0.22 * t, y = 0.42 + 0.28 * t; out.push(line(`M${X(x - 0.03)} ${Y(y + 0.02)} L${X(x + 0.03)} ${Y(y - 0.02)}`, 4)); }
    } else if ( part === "head" ) {
      // Ridges along the brow: bone pushed up under the skin
      for ( const x of [0.3, 0.7] ) out.push(line(`M${X(x - 0.08)} ${Y(0.06)} Q${X(x)} ${Y(-0.04)} ${X(x + 0.08)} ${Y(0.06)}`, 8));
    } else if ( part === "eyes" ) {
      for ( const x of [0.3, 0.7] ) out.push(`<ellipse cx="${X(x)}" cy="${Y(0.38)}" rx="${S(48)}" ry="${S(26)}" fill="${c}" fill-opacity="${glow ? 0.45 : 0.3}"${glow ? ' filter="url(#wpd-glow)"' : ""}/>`);
    } else if ( part === "mouth" ) {
      out.push(line(`M${X(0.32)} ${Y(0.74)} L${X(0.26)} ${Y(0.8)}`, 5), line(`M${X(0.68)} ${Y(0.74)} L${X(0.74)} ${Y(0.8)}`, 5));
    } else if ( part === "skin" ) {
      // Veins or patches spreading from the jaw
      out.push(line(`M${X(0.12)} ${Y(0.85)} C${X(0.16)} ${Y(0.7)} ${X(0.1)} ${Y(0.62)} ${X(0.16)} ${Y(0.5)}`, 4), line(`M${X(0.88)} ${Y(0.85)} C${X(0.84)} ${Y(0.72)} ${X(0.9)} ${Y(0.64)} ${X(0.85)} ${Y(0.54)}`, 4));
    } else if ( part === "whole" ) {
      out.push(`<rect x="${B.x - 40}" y="${B.y - 40}" width="${B.w + 80}" height="${B.h + 80}" fill="${c}" fill-opacity="${glow ? 0.18 : 0.12}"/>`);
    }
  }
  const defs = list.some(x => x.source === "visage") ? `<filter id="wpd-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${S(6)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>` : "";
  return `<defs>${defs}<clipPath id="wpd-face-ch"><path d="${A.facePath}"/></clipPath></defs><g clip-path="url(#wpd-face-ch)">${out.join("")}</g>`;
}

/* ---- The ring ---- */
export const DEFAULT_FRAME = {kit: "dark-ages", shape: "round", color: 0x4f4943, double: true, width: 0.045};
const V = 1360;
/** Where the picture sits: centred on the face, lowered when headwear would cross the ring. */
export function cropFor(A, frame, tops = [], margin = 30) {
  const lw = V * (frame.width ?? 0.045), r = V / 2, x0 = f0(A.neckMid + 42 - r);
  const inner = r - lw * 1.9 - margin;
  const clearance = y0 => {
    let worst = Infinity;
    for ( const [x, y] of tops ) {
      const c = frame.shape === "round" ? inner - Math.hypot(x - (x0 + r), y - (y0 + r)) : (y - (y0 + r - inner));
      worst = Math.min(worst, c);
    }
    return worst;
  };
  let y0 = -70;
  while ( clearance(y0) < 0 && y0 > -260 ) y0 -= 10;
  return {x0, y0, lw, r, clearance: tops.length ? clearance(y0) : Infinity};
}
const hexColor = n => typeof n === "number" ? `#${n.toString(16).padStart(6, "0")}` : String(n);
const INK = "#2a1a10";
/** The filters and patterns of the illuminated finish. cx, cy: the centre, for the turn of the starred lattice. */
function finishDefs(ground, cx, cy) {
  const g = GROUNDS[ground] ?? GROUNDS.gold;
  return `<filter id="wpd-gold" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.006 0.009" numOctaves="5" seed="7"/><feComponentTransfer><feFuncR type="gamma" exponent="1.8"/><feFuncG type="gamma" exponent="1.8"/></feComponentTransfer><feColorMatrix values="1.45 0.2 0 0 0.16  1.05 0.15 0 0 0.06  0.2 0.05 0 0 -0.06  0 0 0 0 1"/></filter>`
    + `<filter id="wpd-leaf" x="0" y="0" width="1" height="1"><feTurbulence type="turbulence" baseFrequency="0.035" numOctaves="2" seed="11"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.93  0 0 0 0 0.6  1.6 0 0 0 -0.55"/></filter>`
    + `<filter id="wpd-paper" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="5"/><feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  0 0 0 -1.1 0.75"/></filter>`
    + `<filter id="wpd-fibre" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.02 0.5" numOctaves="2" seed="9"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 -1.2 0 0.62"/></filter>`
    + `<filter id="wpd-cloth" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.06 0.9" numOctaves="2" seed="3" result="n"/><feColorMatrix in="n" values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.12  0 0 -1.4 0 1.05" result="w"/><feComposite in="w" in2="SourceGraphic" operator="in" result="wt"/><feBlend in="wt" in2="SourceGraphic" mode="multiply"/></filter>`
    + groundPattern(g, cx, cy)
    + (g.bg && !g.kind ? `<pattern id="wpd-stars" patternUnits="userSpaceOnUse" width="70" height="70" patternTransform="rotate(45 ${cx} ${cy})"><rect width="70" height="70" fill="#${g.bg}"/><path d="M0 0H70M0 0V70" stroke="#${g.line ?? "d9b04c"}" stroke-opacity=".35" stroke-width="2"/><circle cx="35" cy="35" r="4.5" fill="#${g.star ?? "e6c25a"}"/></pattern>` : "")
    + `<linearGradient id="wpd-gilt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f2d27a"/><stop offset=".45" stop-color="#b98a2e"/><stop offset=".7" stop-color="#e8c463"/><stop offset="1" stop-color="#8f6620"/></linearGradient>`;
}
/** The patterned grounds: a diaper of lozenges, a vine scroll, lilies, a chequer, and gold with punched work. */
function groundPattern(g, cx, cy) {
  const G = "e6c25a", L = "d9b04c", rot = `patternTransform="rotate(45 ${cx} ${cy})"`;
  switch ( g.kind ) {
    case "diaper": return `<pattern id="wpd-pat" patternUnits="userSpaceOnUse" width="120" height="120" ${rot}><rect width="120" height="120" fill="#${g.bg}"/>`
      + `<rect width="60" height="60" fill="#${g.alt}"/><rect x="60" y="60" width="60" height="60" fill="#${g.alt}"/><path d="M0 0H120M0 60H120M0 0V120M60 0V120" stroke="#${L}" stroke-width="4"/>`
      + [[30, 30], [90, 90], [90, 30], [30, 90]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#${G}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.5" fill="#${G}"/>`).join("") + `</pattern>`;
    case "vine": return `<pattern id="wpd-pat" patternUnits="userSpaceOnUse" width="160" height="160"><rect width="160" height="160" fill="#${g.bg}"/>`
      + `<path d="M0 80 C40 20 80 140 120 80 S160 20 160 80" fill="none" stroke="#${L}" stroke-width="5"/>`
      + `<path d="M40 52 c-14 -20 4 -34 16 -22 c8 8 -2 18 -9 12 M100 108 c14 20 -4 34 -16 22 c-8 -8 2 -18 9 -12" fill="none" stroke="#${L}" stroke-width="4" stroke-linecap="round"/>`
      + `<path d="M60 64 q14 -16 26 -4 q-12 14 -26 4 Z M140 96 q-14 16 -26 4 q12 -14 26 -4 Z" fill="#${G}"/><circle cx="20" cy="130" r="4" fill="#${G}"/><circle cx="100" cy="30" r="4" fill="#${G}"/></pattern>`;
    case "lily": return `<pattern id="wpd-pat" patternUnits="userSpaceOnUse" width="110" height="110"><rect width="110" height="110" fill="#${g.bg}"/>`
      + [[27, 27], [82, 82]].map(([x, y]) => `<g transform="translate(${x} ${y})" fill="#${G}"><path d="M0 -20 C7 -10 7 -2 0 4 C-7 -2 -7 -10 0 -20 Z"/>`
        + `<path d="M-3 2 C-10 -8 -20 -6 -18 2 C-16 8 -8 6 -4 4 Z M3 2 C10 -8 20 -6 18 2 C16 8 8 6 4 4 Z"/><rect x="-9" y="4" width="18" height="4" rx="2"/><path d="M-2 8 L0 18 L2 8 Z"/></g>`).join("") + `</pattern>`;
    case "chequer": return `<pattern id="wpd-pat" patternUnits="userSpaceOnUse" width="100" height="100"><rect width="100" height="100" fill="#${g.bg}"/>`
      + `<rect width="50" height="50" fill="#${g.alt}"/><rect x="50" y="50" width="50" height="50" fill="#${g.alt}"/><path d="M0 0H100M0 50H100M0 0V100M50 0V100" stroke="#8a8070" stroke-width="2"/></pattern>`;
    case "punched": return `<pattern id="wpd-pat" patternUnits="userSpaceOnUse" width="44" height="44" ${rot}><circle cx="11" cy="11" r="4" fill="#5a3a0e" fill-opacity=".45"/>`
      + `<circle cx="33" cy="33" r="4" fill="#5a3a0e" fill-opacity=".45"/><circle cx="33" cy="11" r="1.8" fill="#fff3c0" fill-opacity=".5"/><circle cx="11" cy="33" r="1.8" fill="#fff3c0" fill-opacity=".5"/></pattern>`;
    default: return "";
  }
}
function groundSvg(ground, x0, y0) {
  const g = GROUNDS[ground] ?? GROUNDS.gold, box = `x="${x0}" y="${y0}" width="${V}" height="${V}"`;
  if ( g.kind === "punched" ) return `<rect ${box} fill="#8f6418"/><rect ${box} filter="url(#wpd-gold)"/><rect ${box} filter="url(#wpd-leaf)" opacity=".3"/><rect ${box} fill="url(#wpd-pat)"/>`;
  if ( g.kind ) return `<rect ${box} fill="url(#wpd-pat)"/><rect ${box} filter="url(#wpd-paper)" opacity=".35"/>`;
  if ( g.bg ) return `<rect ${box} fill="url(#wpd-stars)"/><rect ${box} filter="url(#wpd-paper)" opacity=".5"/>`;
  if ( ground === "parchment" ) return `<rect ${box} fill="#e2cfa4"/><rect ${box} filter="url(#wpd-paper)" opacity=".9"/><rect ${box} filter="url(#wpd-fibre)" opacity=".5"/>`;
  return `<rect ${box} fill="#8f6418"/><rect ${box} filter="url(#wpd-gold)"/><rect ${box} filter="url(#wpd-leaf)" opacity=".3"/>`;
}
/** The gilt trim along the neckline, with red beads. */
function trim(A) {
  const sh = A.shoulder;
  if ( !sh?.l || !sh?.r || !sh?.dip ) return "";
  const d = `M${f0(sh.l[0])} ${f0(sh.l[1])} C${f0(sh.l[0] + 50)} ${f0(sh.dip[1] - 6)} ${f0(sh.dip[0] - 70)} ${f0(sh.dip[1])} ${f0(sh.dip[0])} ${f0(sh.dip[1])} C${f0(sh.dip[0] + 70)} ${f0(sh.dip[1])} ${f0(sh.r[0] - 50)} ${f0(sh.dip[1] - 6)} ${f0(sh.r[0])} ${f0(sh.r[1])}`;
  return `<g transform="translate(0 16)"><path d="${d}" fill="none" stroke="${INK}" stroke-width="30" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#d9b04c" stroke-width="20" stroke-linecap="round"/></g>`
    + [0.15, 0.3, 0.45, 0.55, 0.7, 0.85].map(t => `<circle cx="${f0(sh.l[0] + (sh.r[0] - sh.l[0]) * t)}" cy="${f0(sh.dip[1] + 16 - 40 * Math.pow(Math.abs(t - 0.5) * 2, 2))}" r="5" fill="#9a1f1f"/>`).join("");
}

/**
 * The whole picture as SVG, finished as an illuminated page: a gilt, starred or patterned ground, sepia ink and
 * a gilt ring with a coloured ring inside it. head: from headLayers. style: {ground, ring} (see styleFor). ring:
 * draw the ring in (when the token frames of WoDX Atmosphere are not drawing it). Returns {svg, crop}.
 */
export function compose({look, head, anchors: A, frame = DEFAULT_FRAME, ring = true, level = 0, style = null, changes = []}) {
  const st = style ?? styleFor(look);
  const hw = headwear(A, look.clothes);
  const crop = cropFor(A, frame, hw.tops);
  const {x0, y0, lw, r} = crop, cx = x0 + r, cy = y0 + r, round = frame.shape !== "square";
  // A circle (or the rounded square of a square frame) set in from the edge
  const at = (inset, attrs) => round ? `<circle cx="${cx}" cy="${cy}" r="${r - inset}" ${attrs}/>`
    : `<rect x="${x0 + inset}" y="${y0 + inset}" width="${V - 2 * inset}" height="${V - 2 * inset}" rx="${Math.max(0, V * 0.08 - inset * 0.3)}" ${attrs}/>`;
  const inner = ring ? lw * 1.9 : lw;
  let ringSvg = "";
  if ( ring ) {
    const line = "#3a2a12";
    ringSvg = at(lw * 0.55, `fill="none" stroke="url(#wpd-gilt)" stroke-width="${lw * 1.1}"`)
      + at(lw * 0.05, `fill="none" stroke="${line}" stroke-width="3"`) + at(lw * 1.1, `fill="none" stroke="${line}" stroke-width="3"`)
      + at(lw * 1.5, `fill="none" stroke="#${(RINGS[st.ring] ?? RINGS.mortal).c}" stroke-width="${lw * 0.75}"`)
      + at(lw * 1.88, `fill="none" stroke="${line}" stroke-width="3"`)
      + at(lw * 0.55, `fill="none" stroke="#fff7d0" stroke-opacity=".5" stroke-width="2" stroke-dasharray="2 18"`);
  }
  const box = `x="${x0}" y="${y0}" width="${V}" height="${V}"`;
  // No paper grain over the figure: it laid a pale film on faces and robes. The grounds keep their own.
  const grain = "";
  const hasVeil = look.clothes.headwear && look.clothes.headwear !== "none";
  // The marks of the health track lie under the mask of visible skin (in Lorelei's space, so the build is undone
  // inside it), so a fringe or a beard stays over them; the bandage goes over everything on the head
  const dmRaw = damageLayers(A, level, look.colors.skin), ch = changeLayers(A, changes);
  const dm = {skin: ch + dmRaw.skin, over: dmRaw.over}, bt = FR.buildTransform(look.face.build), b = FR.buildOf(look.face.build);
  const inv = bt ? `translate(${FR.PIVOT[0]} ${FR.PIVOT[1]}) scale(${1 / b.sx} ${1 / b.sy}) translate(${-FR.PIVOT[0]} ${-FR.PIVOT[1]})` : "";
  const marks = !dm.skin ? "" : String(head).includes('id="wpd-skin"')
    ? `<g${bt ? ` transform="${bt}"` : ""}><g mask="url(#wpd-skin)"><g${inv ? ` transform="${inv}"` : ""}>${dm.skin}</g></g></g>` : dm.skin;
  let figure = `<g>${head}</g>${marks}${dm.over}<g filter="url(#wpd-cloth)">${gown(A, look.clothes)}</g>${hw.svg ? `<g filter="url(#wpd-cloth)">${hw.svg}</g>` : ""}${hasVeil ? "" : trim(A)}`;
  // Lorelei's black and the garment lines become a warm sepia ink
  figure = figure.replace(/(fill|stroke)="#000(000)?"/g, `$1="${INK}"`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${V} ${V}" width="512" height="512">`
    + `<defs>${finishDefs(st.ground, cx, cy)}<clipPath id="wpd-clip">${at(inner, "")}</clipPath></defs><g clip-path="url(#wpd-clip)">`
    + groundSvg(st.ground, x0, y0) + figure + grain + `</g>${ringSvg}</svg>`;
  return {svg, crop};
}
/** Lorelei's SVG without its outer tag and metadata, to place inside the picture. */
export const innerSvg = s => String(s).replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<metadata>[\s\S]*?<\/metadata>/, "");

/** The key for one baked picture: everything that changes what is drawn. */
export function bakeKey({look, mood, level, frame, ring, style, changes = []}) {
  const l = normalize(look), st = style ?? styleFor(l);
  const ch = changesToDraw(changes);
  return hashOf(JSON.stringify([LOOK_VERSION, l.seed, l.face, l.colors, l.clothes, mood, level, frame?.kit, frame?.shape, frame?.color, !!ring, st.ground, st.ring, ...(ch.length ? [ch] : [])]));
}
