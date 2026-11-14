/**
 * Looks on the map (B3758): what players see when the world changes. Pure rules, no Foundry calls.
 *
 * A look is a record kept on its scene (flags.wodx-chronicle.looks): {id, kind, at, until, fade, source, made}.
 *   at     {x, y, radius} in pixels, or {shape: a region's uuid}, or null for the whole scene
 *   until  {rounds}, {seconds} or {worldTime}; null lasts until it is ended
 * Each player's computer draws the looks itself, at that player's own level (client setting fxLevel):
 *   full   the effect modules' moving looks (Sequencer and JB2A, Token Magic FX, FXMaster weather)
 *   light  the same, fainter and fewer: one animation per area, weather at half strength, no screen shake
 *   off    only the plain coloured shape drawn on the map, and still weather
 * With no effect module on, every level falls back to the drawn shape and Foundry's own scene weather.
 */

export const LEVELS = {full: "Full", light: "Light", off: "Off"};
export const DEFAULT_LEVEL = "full";

/**
 * The kinds. area: drawn as a shape on the map; scene: over the whole scene. colour: the drawn shape's fill.
 * seq: the JB2A animation names to look for in Sequencer's database, best first. tmfx: the Token Magic FX filter on
 * the drawn shape. weather: FXMaster particles and filters, and Foundry's own scene weather when FXMaster is off.
 */
export const KINDS = {
  water:  {label: "Deep water", area: true, colour: "#2f6f9f", seq: ["water", "liquid", "bubbles"], tmfx: "flood"},
  flood:  {label: "Flood", area: true, colour: "#2f6f9f", seq: ["water", "liquid"], tmfx: "flood",
    weather: {particles: [{type: "rain", options: {density: 0.4, speed: 1.2, direction: 75}}], core: "rain"}},
  fire:   {label: "Fire", area: true, colour: "#c8501e", seq: ["flames", "fire", "ground_fire", "explosion"], tmfx: "fire",
    weather: {particles: [{type: "embers", options: {density: 0.5}}], core: null}},
  smoke:  {label: "Smoke", area: true, colour: "#5d5d5d", seq: ["smoke", "fog_cloud", "fog"], tmfx: "smoke"},
  rubble: {label: "Broken ground", area: true, colour: "#6b5536", seq: ["ground_cracks", "impact", "boulder"], tmfx: null},
  taint:  {label: "Wyrm taint", area: true, colour: "#3b4a1e", seq: ["toxic_cloud", "poison", "darkness"], tmfx: "smoke",
    weather: {filters: [{type: "color", options: {color: {value: "#7a8a3a", apply: true}, saturation: 0.6, contrast: 1.05}}], core: null}},
  plague: {label: "Sickness", area: false, colour: "#6f7a3a", seq: ["toxic_cloud", "poison"], tmfx: null,
    weather: {particles: [{type: "fog", options: {density: 0.15}}], filters: [{type: "color", options: {color: {value: "#9aa86a", apply: true}, saturation: 0.7}}], core: "fog"}},
  storm:  {label: "Storm", area: false, colour: "#3a4a6a", seq: ["lightning"], tmfx: null,
    weather: {particles: [{type: "clouds", options: {density: 0.5}}, {type: "rain", options: {density: 0.6, speed: 1.5, direction: 70}}],
      filters: [{type: "lightning", options: {frequency: 4000, spark_duration: 300, brightness: 1.5}}], core: "rainStorm"}},
  rain:   {label: "Rain", area: false, colour: "#4a5a7a", seq: [], tmfx: null,
    weather: {particles: [{type: "rain", options: {density: 0.3}}], core: "rain"}},
  fog:    {label: "Fog", area: false, colour: "#8a8a8a", seq: ["fog"], tmfx: null,
    weather: {particles: [{type: "fog", options: {density: 0.3}}], core: "fog"}},
  snow:   {label: "Snow", area: false, colour: "#d8dde6", seq: [], tmfx: null,
    weather: {particles: [{type: "snowstorm", options: {density: 0.5}}], core: "blizzard"}},
  quake:  {label: "Earthquake", area: false, colour: "#6b5536", seq: ["ground_cracks"], tmfx: null, shake: {ms: 1600, px: 14}},
  calm:   {label: "Calm", area: false, colour: "#9ab8d8", seq: [], tmfx: null,
    weather: {filters: [{type: "color", options: {color: {value: "#cfe0ff", apply: true}, saturation: 0.9}}], core: null}}
};

export const isKind = k => Object.hasOwn(KINDS, k);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** A clean look record from what a caller gives, or null when the kind is unknown. */
export function normLook({kind, at = null, until = null, fade = 600, id = null, source = "", label = ""} = {}, {now = 0, round = 0, newId = () => Math.random().toString(36).slice(2, 10)} = {}) {
  if ( !isKind(kind) ) return null;
  let where = null;
  if ( at?.shape ) where = {shape: String(at.shape)};
  else if ( at && Number.isFinite(Number(at.x)) && Number.isFinite(Number(at.y)) ) where = {x: num(at.x), y: num(at.y), radius: Math.max(10, num(at.radius) || 150)};
  let end = null;
  if ( until?.worldTime !== undefined ) end = {worldTime: num(until.worldTime)};
  else if ( until?.seconds !== undefined ) end = {worldTime: now + Math.max(1, num(until.seconds))};
  else if ( until?.rounds !== undefined ) end = {round: round + Math.max(1, num(until.rounds))};
  return {id: String(id || `look-${newId()}`), kind, at: where, until: end, fade: Math.max(0, Math.min(5000, num(fade))), source: String(source ?? ""),
    label: String(label || KINDS[kind].label), made: now};
}

/** True when a look has run out, by the world clock or the combat round. */
export function expired(look, {now = 0, round = null} = {}) {
  const u = look?.until;
  if ( !u ) return false;
  if ( u.worldTime !== undefined ) return now >= u.worldTime;
  if ( u.round !== undefined ) return round !== null && round >= u.round;
  return false;
}

/**
 * What one player's computer draws for one look at that player's level, given which modules are on:
 * {shape, seq, tmfx, weather, coreWeather, shake, alpha}. The drawn shape is a document everyone shares, so it is
 * kept at every level; the rest is local to the player.
 */
export function renderPlan(look, level = DEFAULT_LEVEL, mods = {}) {
  const K = KINDS[look?.kind];
  if ( !K ) return null;
  const lv = LEVELS[level] ? level : DEFAULT_LEVEL;
  const area = !!look.at;
  const plan = {shape: area, seq: null, tmfx: null, weather: null, coreWeather: null, shake: null, alpha: 1};
  if ( lv === "off" ) return plan;
  const faint = lv === "light";
  plan.alpha = faint ? 0.55 : 1;
  if ( mods.sequencer && K.seq.length && (area || look.kind === "quake") ) plan.seq = {names: K.seq, alpha: faint ? 0.5 : 0.9, copies: faint ? 1 : 3};
  if ( mods.tokenmagic && area && K.tmfx ) plan.tmfx = {type: K.tmfx, strength: faint ? 0.5 : 1};
  if ( K.shake && !faint ) plan.shake = {...K.shake};
  return plan;
}

/** The scene-wide weather a look asks for (the Storyteller's side, shared by everyone): FXMaster's when it is on, else core. */
export function weatherPlan(look, mods = {}) {
  const W = KINDS[look?.kind]?.weather;
  if ( !W || look.at ) return null;
  if ( mods.fxmaster ) return {fxmaster: {particles: W.particles ?? [], filters: W.filters ?? []}};
  return W.core ? {core: W.core} : null;
}

/** How strong the shared weather shows on one player's computer: 1, a fraction, or 0 to hide it. */
export const weatherAlpha = level => (level === "off" ? 0 : level === "light" ? 0.5 : 1);

/** The best matching animation path out of a list of database paths, for a list of names best first. */
export function pickPath(paths = [], names = []) {
  for ( const n of names ) {
    const re = new RegExp(`(^|[._])${n.replace(/[^a-z0-9_]/gi, "")}([._]|$)`, "i");
    const hit = paths.find(p => re.test(p));
    if ( hit ) return hit;
  }
  return null;
}
