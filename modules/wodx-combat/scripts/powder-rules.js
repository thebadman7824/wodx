/**
 * WoDX Combat 3.24.0: black powder, misfires and wet powder (B2712 to B2714). Pure, harness-tested.
 *
 * V20 has one rule for every gun: a botched attack goes badly wrong, and a firearm reloads in a turn
 * (V20 p. 278). The books for the earlier ages treat the old locks as slow and chancy in the wet. WoDX reads that as
 * follows (house rule "Black powder"; the Storyteller can overrule any line):
 *
 *   hand cannon   from about 1380   a lit match; the match goes out in heavy rain; misfires on any 1 in the wet
 *   matchlock     from about 1450   the same
 *   wheellock     from about 1500   no match; misfires on any 1 in the wet; the spring can fail on a botch
 *   flintlock     from about 1610   no match; misfires on any 1 in the wet
 *   percussion    from about 1820   a sealed cap: rain does not stop it; plain V20 botch
 *   cartridge     from about 1860   the same
 *
 * In the wet means rain, sleet or hail falling on an outdoor scene, or wading or standing in water. Heavy rain (a
 * downpour, a storm) also soaks a black-powder gun's pan: a misfire there leaves the powder wet, and wet powder will
 * not fire until the gun is cleaned and loaded again with dry powder. Powder kept covered (an oilcloth, a cap over
 * the lock, a shelter) counts as dry. Every black-powder lock also misfires on a botch, as V20 has it.
 * When a gun names no lock, the year chooses one: the lock most guns of that age used.
 */

export const LOCKS = {
  handgonne: {label: "hand cannon", from: 1380, match: true, black: true},
  matchlock: {label: "matchlock", from: 1450, match: true, black: true},
  wheellock: {label: "wheellock", from: 1500, match: false, black: true},
  flintlock: {label: "flintlock", from: 1610, match: false, black: true},
  percussion: {label: "percussion cap", from: 1820, match: false, black: false},
  cartridge: {label: "cartridge", from: 1860, match: false, black: false}
};

const NAMED = [
  [/\b(hand ?cannon|handgonne|handgun of the|culverin|petronel|pot-de-fer|fire ?lance|hu dun pao|tanegashima(?! flint))\b/i, "handgonne"],
  [/\b(match ?lock|arquebus|harquebus|hackbut|caliver|tanegashima|teppo|toradar|jezail of the match|musket of the match)\b/i, "matchlock"],
  [/\b(wheel ?lock|wheel-lock|puffer|dag)\b/i, "wheellock"],
  [/\b(flint ?lock|flint-lock|snaphance|snaphaunce|snaplock|miquelet|brown bess|charleville|blunderbuss|fusil|jezail|kentucky|pennsylvania rifle|baker rifle)\b/i, "flintlock"],
  [/\b(percussion|cap ?lock|cap-and-ball|colt (navy|army|walker|dragoon)|pepperbox|minie|minié|enfield (pattern )?1853|springfield (model )?1861)\b/i, "percussion"],
  [/\b(cartridge|breech-?load\w*|bolt|lever|winchester|henry|mauser|lee-?enfield|springfield (model )?1903|martini|repeat\w*|automatic|semi-?auto\w*|machine|smg|sub-?machine|assault|uzi|mac-?10|tommy|thompson|glock|beretta|walther|luger|ak-?47|ak-?74|m16|m4|ar-?15|magnum|pump|laser|gauss|rail ?gun|smartgun)\b/i, "cartridge"]
];
/** Names that are guns at all (as rules.js fightNoise reads them), for weapons with no lock in the name. */
const GUNLIKE = /\b(gun|pistol|revolver|rifle|carbine|musket|arquebus|harquebus|caliver|blunderbuss|fusil|shotgun|smg|uzi|tommy|glock|colt|beretta|handgonne|hand cannon|culverin|flintlock|matchlock|wheellock|derringer|magnum|petronel|jezail|hackbut|dag)\b/i;
/** Never guns, whatever the sheet says. */
const NOT_GUN = /\b(bow|crossbow|arbalest|sling|dart|javelin|spear|throw\w*|knife|stone|net|bolas|blowpipe|blowgun|staff sling|grenade|bomb|petard|molotov)\b/i;

/** The lock most guns used in a year. */
export function lockForYear(year, {pistol = false} = {}) {
  const y = Number(year) || 0;
  if ( y && y < 1450 ) return "handgonne";
  if ( y && y < 1610 ) return pistol && y >= 1520 ? "wheellock" : "matchlock";
  if ( y && y < 1700 ) return pistol ? "wheellock" : "matchlock";
  if ( y && y < 1840 ) return "flintlock";
  if ( y && y < 1870 ) return "percussion";
  return "cartridge";
}

/**
 * The lock of a weapon: {lock, label, black, match, named} or null when it is not a gun.
 * w: {name, ranged, desc, shots}; year: the chronicle year. A lock named in the weapon's name or description wins;
 * a gun that names none takes the year's lock. A weapon newer than the year is still read by its name.
 */
export function gunLock(w = {}, year = 0) {
  const name = String(w?.name ?? ""), text = `${name} ${String(w?.desc ?? "")}`;
  if ( !w?.ranged || NOT_GUN.test(name) ) return null;
  let lock = null, named = false;
  for ( const [re, k] of NAMED ) if ( re.test(name) ) { lock = k; named = true; break; }
  if ( !lock ) for ( const [re, k] of NAMED ) if ( re.test(text) && k !== "cartridge" ) { lock = k; named = true; break; }
  if ( !lock ) {
    if ( !GUNLIKE.test(text) ) return null;
    lock = lockForYear(year, {pistol: /\bpistol|dag\b/i.test(name)});
  }
  return {lock, ...LOCKS[lock], named};
}

const RAIN = ["rain", "sleet", "hail", "downpour"];
const HEAVY = ["downpour", "thunder"];
/**
 * The wet where the shooter stands: {wet, heavy, why}. weather: Atmosphere's weather (tags or the raw fields);
 * indoor: the scene is indoors; water: the shooter wades or stands in water (WoDX Combat movement).
 */
export function wetness({tags = [], indoor = false, water = false, sky = null, intensity = null} = {}) {
  const t = new Set(tags ?? []);
  if ( sky === "storm" ) t.add("thunder");
  if ( intensity === "heavy" && t.has("rain") ) t.add("downpour");
  const rain = !indoor && RAIN.some(x => t.has(x));
  const heavy = rain && HEAVY.some(x => t.has(x));
  if ( water ) return {wet: true, heavy, why: "standing in water"};
  if ( heavy ) return {wet: true, heavy: true, why: "heavy rain"};
  if ( rain ) return {wet: true, heavy: false, why: t.has("sleet") ? "sleet" : t.has("hail") ? "hail" : "rain"};
  return {wet: false, heavy: false, why: ""};
}

/**
 * Can the gun fire at all? {ok, why}. state: the weapon's flags {wet (powder wet), matchOut}; wet: wetness();
 * covered: the shooter keeps the powder and match covered.
 */
export function canFire(g, state = {}, wet = {}, {covered = false} = {}) {
  if ( !g?.black ) return {ok: true, why: ""};
  if ( state.wet ) return {ok: false, why: `the powder in the ${g.label} is wet: clean it and load dry powder (a reload) before it will fire`};
  if ( g.match && (state.matchOut || (wet.heavy && !covered)) )
    return {ok: false, why: `the match of the ${g.label} is out${wet.heavy && !state.matchOut ? " in the heavy rain" : ""}: light it again (a turn, with a flame at hand) or keep it covered`};
  return {ok: true, why: ""};
}

/**
 * After the attack roll: does the gun misfire? faces: the attack dice; botch: the roll botched; wet: wetness();
 * covered: powder kept covered. Returns {misfire, why, wetPowder, matchOut}: a misfire fires nothing (the attack misses
 * and the charge is spent); wetPowder: the powder is now wet; matchOut: the match went out.
 */
export function misfire(g, faces = [], botch = false, wet = {}, {covered = false} = {}) {
  const none = {misfire: false, why: "", wetPowder: false, matchOut: false};
  if ( !g?.black ) return none;
  if ( botch ) return {misfire: true, why: `a botch: the ${g.label} misfires (a flash in the pan, a hang fire, or worse)`,
    wetPowder: !!wet.heavy && !covered, matchOut: g.match && !!wet.wet && !covered};
  const ones = (faces ?? []).filter(f => f === 1).length;
  if ( wet.wet && !covered && ones > 0 ) return {misfire: true, why: `${wet.why}: a 1 on the dice and the damp ${g.label} misfires`,
    wetPowder: !!wet.heavy, matchOut: g.match && !!wet.heavy};
  return none;
}

/** The chance a gun misfires on a roll of n dice in the wet (any 1), for the attack window's note. */
export const misfireChance = n => 1 - Math.pow(0.9, Math.max(0, Math.round(Number(n) || 0)));

/** A short note for the attack window: "" for a modern gun or a dry night. */
export function powderNote(g, wet = {}, state = {}, dice = 0, {covered = false} = {}) {
  if ( !g?.black ) return "";
  const fire = canFire(g, state, wet, {covered});
  if ( !fire.ok ) return `Black powder: ${fire.why}.`;
  if ( wet.wet && !covered ) return `Black powder in the ${wet.why}: the ${g.label} misfires on any 1${dice ? ` (about ${Math.round(misfireChance(dice) * 100)}% with ${dice} dice)` : ""}${wet.heavy ? ", and a misfire soaks the powder" : ""}. Covered powder counts as dry.`;
  return `Black powder: the ${g.label} misfires on a botch.`;
}
