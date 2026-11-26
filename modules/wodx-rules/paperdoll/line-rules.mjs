/**
 * WoDX Paperdoll: the moves only one line has (B5810 to B5819), the pure rules. sprites.mjs plays them when the thing happens in
 * play, so a player can tell by sight what a character is doing. Nothing here touches Foundry.
 */

/** The new moves and how they read in the pose window. */
export const LINE_LABELS = {
  frenzy: "Frenzy", embrace: "Feed from behind", swoon: "Swoon", daysleep: "Sleep the day in a coffin", earthsleep: "Sleep in the earth",
  cup: "Howl", howl: "Howl", dance: "Dance the rite", pray: "Pray", staff: "Raise the staff", device: "Work a device", cards: "Lay the cards",
  pour: "Pour a potion", meditate: "Meditate", ritual: "Work a ritual", brandish: "Raise the holy symbol", brace: "Brace a stake",
  study: "Study a clue", situp: "Rise from the sarcophagus", hekau: "Speak a Hekau", shake: "Shake with need", quaff: "Drink the vitae"
};
/** How much longer than a blow each takes. */
export const LINE_SLOW = {frenzy: 1.2, embrace: 2.2, swoon: 1.6, daysleep: 1.6, earthsleep: 1.6, cup: 1.4, howl: 1.6, dance: 2.4, pray: 1.4,
  staff: 1.3, device: 2.2, cards: 2.6, pour: 1.6, meditate: 3, ritual: 1.6, brandish: 1.2, brace: 1.2, study: 2.6, situp: 2.4, hekau: 1.4,
  shake: 1.4, quaff: 2.4};
/** Kept until the figure is helped up, walks off or the reason ends. */
export const LINE_HOLD = ["frenzy", "embrace", "swoon", "daysleep", "earthsleep", "dance", "pray", "device", "cards", "meditate", "ritual",
  "brandish", "brace", "study", "situp", "shake", "staff", "howl", "cup"];
/** Going round for as long as the figure stays at them. */
export const LINE_LOOP = ["frenzy", "dance", "device", "cards", "study", "shake", "meditate"];
/** The figure gets up from these when it walks (the way down played backwards). */
export const LINE_RISES = ["swoon", "daysleep", "earthsleep", "meditate", "brace", "study", "cards", "situp"];

/** The forms of a Garou in order, and the ones passed through on the way from one to another (B5813). */
export const FORMS = ["homid", "glabro", "crinos", "hispo", "lupus"];
export function stagesBetween(from, to) {
  const a = FORMS.indexOf(String(from ?? "").toLowerCase()), b = FORMS.indexOf(String(to ?? "").toLowerCase());
  if ( a < 0 || b < 0 || a === b ) return b < 0 ? [] : [FORMS[b]];
  const step = a < b ? 1 : -1, out = [];
  for ( let i = a + step; i !== b + step; i += step ) out.push(FORMS[i]);
  return out;
}
/** The form a sheet's form word names (W20 forms; Fera keep their own and are left alone). */
export function formOf(word) {
  const w = String(word ?? "").toLowerCase();
  return FORMS.find(f => w.includes(f)) ?? null;
}

/** The gesture a mage works magick with, read from the focus on the sheet (B5814): staff, prayer, device, cards, potion, else the open hand. */
export function focusMove(focus = {}, has = []) {
  const t = [focus.paradigm, focus.practice, ...(Array.isArray(focus.instruments) ? focus.instruments : [focus.instruments])].join(" ").toLowerCase();
  const pick = [
    [/staff|wand|rod\b|sceptre|scepter|sword|blade|athame|spear/, "staff"],
    [/tarot|card|divin|rune|bones\b|dice|i ching|astrolog|scry/, "cards"],
    [/potion|elixir|alchem|drug|brew|herb|tincture|philter|philtre/, "pour"],
    [/computer|device|phone|tech|machine|gadget|gizmo|hypertech|engineer|electron|cyber|program|code\b/, "device"],
    [/prayer|pray|faith|chant|mantra|hymn|god|saint|psalm|devotion|worship|dharma|meditat/, "pray"]
  ].find(([re]) => re.test(t));
  const move = pick?.[1] ?? "cast";
  return has.includes(move) ? move : "cast";
}

/**
 * What a power shown on the map does to the figure (B5810 to B5819), from WoDX Actions' wodxPowerShown: {power, group, kind, line}.
 * Returns {move, look, veil} (any may be null): move is a sheet to play, look a passing effect drawn over the figure ("ripple",
 * "halo", "ring", "motes", "smoke", "wings", "sparks", "flush", "chill"), veil a lasting state ("meld", "unseen", "ride").
 */
export function powerMove(info = {}, has = []) {
  const w = `${info.power ?? ""} ${info.group ?? ""} ${info.kind ?? ""}`.toLowerCase(), line = String(info.line ?? "").toLowerCase();
  const first = (...l) => l.find(m => has.includes(m)) ?? null;
  const out = {move: null, look: null, veil: null};
  if ( /earth ?meld|meld with the earth/.test(w) ) out.veil = "meld";
  else if ( /unseen presence|cloak of shadows|vanish from|obfuscate/.test(w) ) out.veil = "unseen";
  else if ( /puppetry|skinrid/.test(w) ) out.veil = "ride";
  else if ( /second sight|discern|witness|illuminat|aura percep|heightened senses/.test(w) && /hunter|imbued|mortal/.test(line + " " + w) ) { out.move = first("search"); out.look = "ring"; }
  else if ( /true faith|\bfaith\b|rebuke|repel|ward\b|holy|exorcis/.test(w) ) { out.move = first("brandish", "pray"); out.look = "halo"; }
  else if ( /hekau|nomenclature|effigy|ushabti|celestial|necromancy of the dead|alchemy/.test(w) && /mummy|hekau/.test(line + " " + w) ) { out.move = first("hekau"); out.look = "glyph"; }
  else if ( /apocalyptic|revelation|true form|visage/.test(w) && /demon|fallen/.test(line + " " + w) ) out.look = "wings";
  else if ( /howl|call of the wyld|call of the wild|song of/.test(w) ) out.move = first("howl", "cup");
  else if ( /\brite\b|rite of|moot/.test(w) ) out.move = first("dance", "kneel");
  else if ( /cantrip|enchant|glamour|wyrd|chicanery|wayfare|primal|soothsay|sovereign|legerdemain|naturae/.test(w) || line === "changeling" ) out.look = "motes";
  else if ( /catharsis|spectre|shadow/.test(w) && line === "wraith" ) out.look = "smoke";
  else if ( /ritual|extended/.test(w) ) out.move = first("ritual");
  else if ( /meditat/.test(w) ) out.move = first("meditate");
  return out;
}

/**
 * The pose a character's own state holds it in (B5810, B5811, B5817), from facts read off the actor: {daySleep, torpor, frenzy,
 * need, slumber, has, bed, open}. Returns {pose, look} or null. Day sleep is in a coffin indoors or by a coffin, in the earth out
 * of doors; torpor the same, grey; frenzy the crouch (a Crinos claws the air); a ghoul in need shakes; a Wraith in Slumber
 * fades almost out where it lies.
 */
export function lineHold({daySleep = false, torpor = false, frenzy = false, need = false, slumber = false, has = [], coffin = false, open = false} = {}) {
  const first = (...l) => l.find(m => has.includes(m)) ?? null;
  if ( torpor || daySleep ) {
    const pose = open && !coffin ? first("earthsleep", "daysleep", "sleep") : first("daysleep", "earthsleep", "sleep");
    return pose ? {pose, look: torpor ? "grey" : null} : null;
  }
  if ( frenzy ) { const pose = first("frenzy", "claw"); return pose ? {pose, look: "red"} : null; }
  if ( need ) { const pose = first("shake"); return pose ? {pose, look: null} : null; }
  if ( slumber ) { const pose = first("sleep", "sit"); return pose ? {pose, look: "faint"} : null; }
  return null;
}

/** Who sees a changeling's fae mien (B5819): the Storyteller, changelings and Kinain, and anyone enchanted. Everyone else sees the mortal seeming. */
export function seesFae({isGM = false, line = "", enchanted = false} = {}) {
  return !!isGM || !!enchanted || /changeling|kinain/i.test(String(line ?? ""));
}

/**
 * A passing look drawn over a figure at t thousandths of a second into it: {alpha, tint, dy, dx, scale} for the figure, and
 * whether the look is over. Looks are short (about a second) except the lasting veils and holds, which never end on their own.
 */
export const LOOK_MS = {ripple: 1100, halo: 1600, ring: 1600, motes: 1600, smoke: 2000, wings: 1400, sparks: 900, flush: 900, chill: 1500, glyph: 1400, sink: 1000, rise: 1000};
export function lookAt(kind, t, {own = false} = {}) {
  const ms = LOOK_MS[kind], u = ms ? Math.min(1, Math.max(0, t / ms)) : 0, out = {alpha: 1, tint: null, dy: 0, dx: 0, scale: 1, done: ms ? t >= ms : false};
  const pulse = Math.sin(u * Math.PI);
  switch ( kind ) {
    case "flush": out.tint = mix(0xffffff, 0xff5a5a, pulse); break;
    case "chill": out.tint = mix(0xffffff, 0x9aa4b0, pulse); out.dx = Math.round(Math.sin(t / 30) * pulse); break;
    case "sparks": out.dx = Math.round(Math.sin(t / 25) * 2 * (1 - u)); break;
    case "ripple": out.alpha = 1 - u * .95; out.scale = 1 + Math.sin(t / 60) * .03 * (1 - u); break;
    case "sink": out.alpha = 1 - u; out.dy = u; break;          // dy is the share of the figure's height it has gone down
    case "rise": out.alpha = u; out.dy = 1 - u; break;
    case "grey": out.tint = 0x8a8a8a; break;
    case "red": out.tint = 0xffb0b0; break;
    case "faint": out.alpha = .3; break;
    case "meld": out.alpha = own ? .25 : 0; out.dy = own ? .7 : 1; break;
    case "unseen": out.alpha = own ? .35 : 0; break;
    case "ride": out.alpha = own ? .3 : 0; break;
    case "drift": out.alpha = .85; out.dy = -(2 + Math.sin(t / 420) * 1.5) / 100; break;   // a Wraith goes a little above the ground
    default: break;
  }
  return out;
}
/** A colour between two, 0 to 1. */
export function mix(a, b, u) {
  const c = (x, s) => (x >> s) & 255, m = s => Math.round(c(a, s) + (c(b, s) - c(a, s)) * u);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}
/** Looks a held pose keeps for as long as it is held (torpor grey, frenzy red, Slumber faint). */
export const LOOK_HOLD = ["grey", "red", "faint"];
/** Veils that hide a figure for a while: kept on the token until it is lifted. */
export const VEILS = ["meld", "unseen", "ride"];
