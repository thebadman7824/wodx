/**
 * Sprite tokens, the rules with no Foundry in them: a sheet is 8 walk frames across and 4 facings down, each frame
 * 96 by 112 pixels, drawn by our own code (docs/DECISIONS.md B2560). A token turns to the way it moves and steps
 * through the walk by the ground it covers.
 */
export const FRAME_W = 96;
export const FRAME_H = 112;
export const FRAMES = 8;
export const ROW = {up: 0, left: 1, down: 2, right: 3};
/** The frame a still figure shows: feet together seen from front or back, both feet down seen from the side. */
export const IDLE = {up: 0, down: 0, left: 0, right: 0};
/** Where the feet stand in a frame, as a share of its height. */
export const FEET = 103 / FRAME_H;
/** The token picture: twice the square, so a person stands a little over one square tall, with the feet low in it. */
export const TOKEN = {scaleX: 2, scaleY: 2, anchorX: 0.5, anchorY: 0.745, fit: "contain"};
export const SHEETS = {
  "kindred-elder-1888": "Kindred elder, 1888",
  "garou-homid": "Garou, Homid",
  "garou-crinos": "Garou, Crinos",
  "garou-lupus": "Garou, Lupus",
  "townsman-1888": "Townsman, 1888",
  "lady-1888": "Lady, 1888"
};
const FOLDER = "modules/wodx-paperdoll/sprites/proto";
/* A character's own sprite, drawn outside the game in batches (B2586): its sheets lie in the world's own folder under
   the actor's id, and its name here is "own-" and that id. */
const OWN = {};
export const ownName = id => `own-${id}`;
export const isOwn = name => Object.hasOwn(OWN, name);
const stem = name => isOwn(name) ? `${OWN[name].folder}/${OWN[name].id}` : `${FOLDER}/${name}`;
const stamp = name => isOwn(name) && OWN[name].key ? `?k=${OWN[name].key}` : "";
export const sheetPath = name => `${stem(name)}.png${stamp(name)}`;
export const stillPath = name => `${stem(name)}-still.png`;

/** The facing for a move of (dx, dy), y growing downward. Near a diagonal the figure keeps the facing it had. */
export function facingOf(dx, dy, was = "down") {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if ( ax === 0 && ay === 0 ) return was;
  const side = dx > 0 ? "right" : "left", along = dy > 0 ? "down" : "up";
  if ( ax > ay * 1.2 ) return side;
  if ( ay > ax * 1.2 ) return along;
  return was === side || was === along ? was : (ax >= ay ? side : along);
}

/** A fresh walking state at a place. */
export const start = (pos, facing = "down") => ({x: pos.x, y: pos.y, facing, dist: 0, last: -Infinity, moving: false});

/**
 * One look at where the token is now. Returns the new state: facing, the ground covered, and whether it is walking.
 * A jump of three squares or more in one look is a placement, not a walk. A figure stands still again a moment
 * after the last movement.
 */
export function step(st, pos, grid, now, rest = 140) {
  const dx = pos.x - st.x, dy = pos.y - st.y, d = Math.hypot(dx, dy);
  if ( d >= grid * 3 ) return {...st, x: pos.x, y: pos.y, moving: false};
  if ( d > 0.01 ) return {x: pos.x, y: pos.y, facing: facingOf(dx, dy, st.facing), dist: st.dist + d, last: now, moving: true};
  return {...st, moving: st.moving && now - st.last < rest};
}

/** The frame to show: {row, col} on the sheet. One square of ground is one full walk cycle of two steps. */
export function frameOf(st, grid) {
  const row = ROW[st.facing] ?? ROW.down;
  if ( !st.moving ) return {row, col: IDLE[st.facing] ?? 0};
  return {row, col: Math.floor(st.dist / grid * FRAMES) % FRAMES};
}

/** The pixel box of a frame on its sheet. */
export const rectOf = ({row, col}) => ({x: col * FRAME_W, y: row * FRAME_H, width: FRAME_W, height: FRAME_H});

/**
 * Attacks (B2580). Each sprite has an attack sheet per move it knows: six frames across, the four facings down, the
 * same frame size as the walk sheet. The first move listed is the one a blow plays when nothing says otherwise.
 */
export const ACT_FRAMES = 6;
/** How long each frame of an attack shows, in thousandths of a second: draw back, strike, hold. */
export const ACT_MS = [110, 110, 110, 90, 140, 220];
export const ACT_TOTAL = ACT_MS.reduce((a, b) => a + b, 0);
/* Besides its attacks, every sprite can take a blow, dodge, fall and die (B2588): those sheets are made from its walk. */
export const REACTS = ["hit", "dodge", "fall", "die", "block", "parry"];
/** Moves whose last frame stays on the map until the figure is helped up. */
export const HOLD = ["fall", "die", "sit", "kneel"];
/* Things a figure does that are not blows (B2610): it sits or kneels and stays so, looks about, speaks, feeds, changes form. Made from its walk. */
export const POSES = ["sit", "kneel", "search", "talk", "feed", "shift", "pick"];
/** Poses a figure leaves by itself as soon as it walks off. */
export const STAY = ["sit", "kneel"];
const OWN_MOVES = [...REACTS, ...POSES];
export const ACTS = {
  "kindred-elder-1888": ["claw", "cast", ...OWN_MOVES],
  "garou-homid": ["claw", ...OWN_MOVES],
  "garou-crinos": ["claw", ...OWN_MOVES],
  "garou-lupus": ["bite", ...OWN_MOVES],
  "townsman-1888": ["claw", "shot", ...OWN_MOVES],
  "lady-1888": ["thrust", ...OWN_MOVES]
};
export const ACT_LABELS = {claw: "Strike with the hand", cast: "Work a power", shot: "Fire", thrust: "Thrust", bite: "Bite", swing: "Swing",
  hit: "Take a blow", dodge: "Dodge", fall: "Fall", die: "Die", block: "Block", parry: "Parry",
  sit: "Sit down", kneel: "Kneel", search: "Look about", talk: "Speak", feed: "Feed", shift: "Change form", pick: "Work at a lock"};
/** How much longer than a blow a move takes: looking about and feeding are slow, speech and a change of form unhurried. */
export const ACT_SLOW = {search: 2.6, pick: 2.6, feed: 2.2, talk: 1.8, shift: 1.7, sit: 1.2, kneel: 1.2};
export const actPath = (name, act) => `${stem(name)}.${act}.png${stamp(name)}`;
/** The move a sprite plays: the one asked for if it knows it, else its first. Null when it knows none. */
export const actOf = (name, want) => { const l = ACTS[name] ?? []; return l.includes(want) ? want : (l.find(m => !OWN_MOVES.includes(m)) ?? null); };
/** A move that is never swapped for another: a reaction or a pose. */
export const isOwnMove = act => OWN_MOVES.includes(act);
/** A move the sprite must really have (a reaction is never swapped for an attack). */
export const hasAct = (name, act) => (ACTS[name] ?? []).includes(act);
/**
 * What a figure does when harm reaches it: it dies when the fight rules say dead or Final Death, falls when they say
 * it is out of the fight (unconscious, torpor, or the last health level filled), and otherwise takes the blow.
 */
export function reactFor(condition, level = 0) {
  if ( condition === "dead" || condition === "finaldeath" ) return "die";
  if ( condition === "unconscious" || condition === "torpor" || condition === "incapacitated" || level >= 7 ) return "fall";
  return "hit";
}
/**
 * How the one attacked meets a blow that did not land (B2615): with the defence the fight rules rolled when the sprite
 * has that move, else by ducking away. Null when it has neither.
 */
export function defenceFor(name, defense = "") {
  const d = String(defense ?? "").toLowerCase();
  if ( (d === "block" || d === "parry") && hasAct(name, d) ) return d;
  return hasAct(name, "dodge") ? "dodge" : null;
}
/** The move for work done at a door, a lock or a device (B2616): fine work at the lock, a blow for force; null for anything else. */
export function workFor(name, action = "") {
  const a = String(action ?? "");
  if ( ["pick", "hack", "disarm", "key", "unlock", "jam"].includes(a) ) return hasAct(name, "pick") ? "pick" : null;
  if ( ["smash", "breakIt", "breach", "force", "heave"].includes(a) ) return actOf(name, null);
  if ( ["listen", "search", "look"].includes(a) ) return hasAct(name, "search") ? "search" : null;
  return null;
}
/* Ways of going (B2588): a sheet like the walk, for running and for going low. */
export const GAITS = ["run", "sneak", "climb", "swim", "fly", "ride", "jump", "crawl"];
export const GAIT = Object.fromEntries(Object.keys(ACTS).map(k => [k, [...GAITS]]));
/** The sheet a moving figure uses: low when it crawls or sneaks, running when it covers a long stretch at once, else its walk (null). */
export function gaitFor(name, {action = "walk", squares = 0, riding = false} = {}) {
  const has = GAIT[name] ?? [];
  // in the saddle the mount does the going; then the way the token itself is moved (B2611)
  if ( riding && has.includes("ride") ) return "ride";
  if ( ["climb", "swim", "fly", "jump"].includes(action) ) return has.includes(action) ? action : null;
  if ( action === "crawl" ) return has.includes("crawl") ? "crawl" : has.includes("sneak") ? "sneak" : null;
  if ( (action === "walk" || !action) && squares > RUN_SQUARES && has.includes("run") ) return "run";
  return null;
}
export const RUN_SQUARES = 6;
/** The frame of an attack so many thousandths of a second after it began; null once it is over. */
export function actFrame(elapsed, act = null) {
  if ( !(elapsed >= 0) ) return 0;
  let t = 0; const slow = ACT_SLOW[act] ?? 1;
  for ( let i = 0; i < ACT_FRAMES; i++ ) { t += ACT_MS[i] * slow; if ( elapsed < t ) return i; }
  return null;
}
/** The facing that looks from one place toward another; the side wins a dead diagonal. */
export const facingToward = (from, to, was = "down") => {
  const dx = to.x - from.x, dy = to.y - from.y;
  if ( dx === 0 && dy === 0 ) return was;
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
};

/**
 * The move for a blow (B2582): what the fight says about the weapon, matched to the moves the sprite knows. A bite
 * wants "bite", a ranged weapon "shot", bare hands and claws "claw", a pointed weapon "thrust", any other "swing".
 * A sprite that lacks the move plays the nearest it has, in the order given; its first move last.
 */
const POINTED = /spear|pike|lance|javelin|rapier|dagger|knife|stiletto|stake|fork|bayonet|foil|estoc|trident|needle/i;
export function moveFor(name, blow = {}) {
  const has = ACTS[name] ?? [];
  if ( !has.length ) return null;
  const want = blow.power ? ["cast"]
    : blow.bite ? ["bite", "claw"]
    : blow.ranged ? ["shot", "thrust", "swing"]
    : blow.brawl ? ["claw", "bite", "swing"]
    : POINTED.test(blow.weapon ?? "") ? ["thrust", "swing", "claw"] : ["swing", "thrust", "claw"];
  return want.find(m => has.includes(m)) ?? (blow.power ? null : has.find(m => !REACTS.includes(m)) ?? null);
}

/* ---- what a power looks like (B2585) ----
 * A power's effect is its own sheet laid over the figure's casting move: a colour and a shape. The look is read from
 * the power's own name and its Discipline, Gift list, Arcanos and so on, first match wins; a power that names nothing
 * telling takes the look of its kind (a Discipline, a Gift, an Arcanos), then of the character's line.
 */
export const FX_COLOURS = ["blood", "shadow", "fire", "lightning", "spirit", "wraith", "glamour", "radiance", "chi", "sand", "conviction", "mind"];
export const FX_SHAPES = ["bolt", "jag", "tendril", "spark", "wave", "gaze", "glyph"];
export const fxPath = fx => `${FOLDER}/fx/${fx}.png`;
export const fxOk = fx => { const [c, s, more] = String(fx ?? "").split("-"); return !more && FX_COLOURS.includes(c) && FX_SHAPES.includes(s); };
const FX_WORDS = [
  [/lightning|thunder|storm|tempest|electri|spark/, "lightning-jag"],
  [/fire|flame|burn|blaze|pyre|ember|ignit|inferno|sun\b|solar/, "fire-bolt"],
  [/shadow|obtenebrat|abyss|dark|night|shroud|gloom|umbra\b|tenebr/, "shadow-tendril"],
  [/dominat|command|mesmer|presence|majesty|entranc|awe\b|dread|terror|fear|mind|thought|telepath|auspex|dementat|madness|chimerstry|obfuscat|forget|memory|puppet|keening|will\b/, "mind-gaze"],
  [/blood|thaumaturg|vitae|quietus|sanguin|vicissitude|flesh|bone/, "blood-bolt"],
  [/serpent|venom|poison|plague|rot|decay|corrupt|wyrm|bane\b/, "chi-tendril"],
  [/sand|dust|desert|stone|earth|quake/, "sand-wave"],
  [/wind|gale|breath|howl|roar|shout|cry\b|voice|song|scream/, "spirit-wave"],
  [/frost|ice|cold|winter|chill/, "wraith-jag"],
  [/ward|seal|circle|sigil|rune|bind|banish|exorcis|rite\b/, "radiance-glyph"],
  [/heal|mend|bless|holy|faith|prayer|true faith|light\b|radian|dawn/, "radiance-spark"],
  [/death|grave|corpse|necro|oblivion|ghost|shade|wither/, "wraith-tendril"],
  [/dream|glamour|chimer|illusion|trick|wyrd|fae\b|faerie|mist/, "glamour-spark"],
  [/spirit|gnosis|gaia|luna|totem|ancestor|moon/, "spirit-spark"]
];
const FX_KIND = {disc: "blood-spark", gift: "spirit-spark", w20: "wraith-tendril", gw: "wraith-tendril", evo: "radiance-wave", hekau: "sand-glyph",
  horror: "wraith-spark", edge: "conviction-wave", numina: "mind-glyph"};
const FX_LINE = {kindred: "blood-spark", ghoul: "blood-spark", lupine: "spirit-spark", mage: "radiance-glyph", fae: "glamour-spark", wraith: "wraith-tendril",
  spirit: "spirit-wave", demon: "radiance-wave", mummy: "sand-glyph", hunter: "conviction-wave", exalted: "chi-wave", beast: "spirit-wave", mortal: "mind-glyph"};
/* The look a figure's own power takes when nothing says which power it is (a move played by hand). */
export const FX_OWN = {"kindred-elder-1888": "blood-bolt"};
/** The effect sheet for a power: {power, group, kind, line, fx}. `fx`, when a module names a look itself, wins. */
export function fxFor(info = {}) {
  if ( fxOk(info.fx) ) return info.fx;
  const words = `${info.power ?? ""} ${info.group ?? ""}`.toLowerCase();
  if ( words.trim() ) for ( const [re, fx] of FX_WORDS ) if ( re.test(words) ) return fx;
  return FX_KIND[info.kind] ?? FX_LINE[info.line] ?? "mind-glyph";
}

/* ---- a sprite for every character (B2586) ----
 * The game writes a roster of its characters (rosterOf for each), tools/sprites/batch.py draws them outside the game,
 * and the game learns the sheets from the manifest that the batch leaves beside them.
 */
/** Take in a batch's manifest: every sprite in it becomes "own-<actor id>". Returns how many were learned. */
export function learn(folder, manifest) {
  for ( const k of Object.keys(OWN) ) { delete OWN[k]; delete SHEETS[k]; delete ACTS[k]; delete GAIT[k]; }
  let n = 0;
  for ( const [id, e] of Object.entries(manifest?.sprites ?? {}) ) {
    if ( !/^[A-Za-z0-9]+$/.test(id) ) continue;
    const name = ownName(id);
    OWN[name] = {folder, id, key: /^[0-9a-f]+$/.test(e?.key ?? "") ? e.key : ""};
    SHEETS[name] = String(e?.name ?? id);
    ACTS[name] = (Array.isArray(e?.acts) ? e.acts : []).filter(a => Object.hasOwn(ACT_LABELS, a));
    GAIT[name] = (Array.isArray(e?.gaits) ? e.gaits : []).filter(g => GAITS.includes(g));
    n++;
  }
  return n;
}
/** The sprites a token may be given by hand: the test figures, and the token's own character if it was drawn. */
export const offered = actorId => Object.entries(SHEETS).filter(([k]) => !isOwn(k) || k === ownName(actorId));
const POWERED = /vampire|werewolf|changing ?breed|mage|changeling|wraith|hunter|demon|mummy|exalted|spirit/i;
/**
 * One character for the roster, from plain facts: {id, name, type, skin, hair, beard, year, figure, items: [{name, type, worn, gear, natural}]}.
 * Worn things that are not weapons are its dress, worn weapons are in its hands, and a creature is drawn as the
 * animal its name says.
 */
export function rosterOf(c = {}) {
  // only real things count: merits, powers and form bonuses can be "active" too, and teeth and claws are not carried
  const arms = i => i.type === "Melee Weapon" || i.type === "Ranged Weapon";
  const NATURAL = /^(fangs?|bite|claws?\b.*|.*\bclaws|strike|constrict|kick|punch|grapple|tackle|stone fist|horns?|tail|talons?|gore|trample|sting|hoo(f|ves))( \(.*\))?$/i;
  const items = (c.items ?? []).filter(i => i?.worn && i.name && (arms(i) ? !i.natural && !NATURAL.test(i.name) : (i.type === "Armor" || i.gear)));
  const hex = v => /^[0-9a-f]{6}$/i.test(v ?? "") ? v.toLowerCase() : null;
  const out = {id: String(c.id ?? ""), name: String(c.name ?? ""), kind: /^creature$/i.test(c.type ?? "") ? "animal" : "person"};
  if ( out.kind === "person" ) {
    // what it is, for the looks of the fae and of ghosts (B2614): the sheet's line and, for a changeling, its kith
    if ( c.type ) out.line = String(c.type);
    // a child is drawn shorter, with a larger head (B3480); the band comes from figure-rules growthOf
    if ( ["youth", "young", "child", "small"].includes(c.growth) ) out.growth = c.growth;
    const kith = String(c.kith ?? "").split(".").pop().trim();
    if ( kith && kith !== "custom" ) out.kith = kith.toLowerCase();
    out.look = {skin: hex(c.skin), hair: hex(c.hair), ...(c.beard ? {beard: true} : {})};
    if ( Number.isFinite(c.year) ) out.year = c.year;
    out.worn = items.filter(i => !arms(i)).map(i => i.name).sort();
    out.held = items.filter(arms).map(i => i.name).sort();
    out.powers = POWERED.test(c.type ?? "");
    // how it dies: a Cainite crumbles to ash, a wraith or a spirit fades, anything else falls and lies still
    out.death = /vampire/i.test(c.type ?? "") ? "ash" : /wraith|spirit/i.test(c.type ?? "") ? "fade" : "die";
    // a figure the player put together (B2587) is what is drawn: its skin, hair and pieces, not the things marked as worn
    const f = c.figure;
    if ( f && typeof f === "object" ) {
      const pair = p => hex(p.c) ? [String(p.n), hex(p.c)] : String(p.n);
      const order = ["legs", "feet", "body", "belt", "neck", "over", "hands", "face", "head", "extra"];
      out.look = {skin: hex(f.skin) ?? out.look.skin, hair: hex(f.hair) ?? out.look.hair, hairStyle: ["short", "long", "bun", "bald"].includes(f.hairStyle) ? f.hairStyle : "short"};
      out.worn = order.filter(s => f.slots?.[s]?.n).map(s => pair(f.slots[s]));
      out.held = ["hand", "offhand"].filter(s => f.slots?.[s]?.n).map(s => String(f.slots[s].n));
      out.figure = true;
    }
  }
  return out;
}
