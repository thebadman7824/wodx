/**
 * WoDX Combat 3.13.0: the body plan. No Foundry calls here.
 *
 * A body is a small tree of parts (after the way Caves of Qud builds bodies, in WoDX's own terms). The shape a character
 * is in picks the tree: a person, a four-legged beast, a bat or bird, a snake, mist, a body sunk in the earth. Lasting
 * features add parts or take them away: Vicissitude wings or talons, a lost eye or hand. Everything else follows from
 * the parts: what the body can hold and wear, its natural weapons, how it moves, what it senses first, and where a
 * blow lands. Parts have no health of their own: the health track stays as the books have it.
 *
 * House rules here (B1200-B1209): the trees, hit locations and their weights, gear coming off in shapes without hands,
 * and the maiming offer. Numbers for powers come from the books where cited; the rest wait on the body plan book check.
 */

/** Kinds of part. size: the aimed-attack size it takes (rules.js TARGETING; V20 p. 274, VtDA20 p. 346). */
export const PART_TYPES = {
  body:  {label: "Body", size: "none", integral: true, wears: "armor"},
  heart: {label: "Heart", size: "precise", integral: true, inside: true},
  back:  {label: "Back", size: "none", integral: true},
  head:  {label: "Head", size: "small", wears: "helmet"},
  face:  {label: "Face", size: "small"},
  eye:   {label: "Eye", size: "precise", senses: "sight"},
  mouth: {label: "Mouth", size: "small", speaks: true},
  arm:   {label: "Arm", size: "medium", appendage: true},
  hand:  {label: "Hand", size: "small", appendage: true, holds: 1, fist: "punch"},
  leg:   {label: "Leg", size: "medium", appendage: true, mobility: 1},
  wing:  {label: "Wing", size: "medium", appendage: true, flies: true},
  tail:  {label: "Tail", size: "medium", appendage: true},
  fin:   {label: "Fin", size: "medium", appendage: true, swims: true},
  gills: {label: "Gills", size: "small", breathesWater: true}
};

/** Laterality words. */
const SIDE = {r: "right", l: "left", rf: "right fore", lf: "left fore", rh: "right hind", lh: "left hind", m: ""};

/** A part: [id, type, side, children]. */
const P = (id, type, side = "m", kids = []) => ({id, type, side, kids});

const head = (mouth = "mouth") => P("head", "head", "m", [P("face", "face", "m", [P("eye-r", "eye", "r"), P("eye-l", "eye", "l"), P("mouth", mouth === "mouth" ? "mouth" : mouth)])]);
const arms = () => [P("arm-r", "arm", "r", [P("hand-r", "hand", "r")]), P("arm-l", "arm", "l", [P("hand-l", "hand", "l")])];
const core = (kids = []) => P("body", "body", "m", [P("heart", "heart"), P("back", "back", "m", kids.filter(k => k.type === "wing")), ...kids.filter(k => k.type !== "wing")]);

/** The trees. */
export const PLANS = {
  person:    () => core([head(), ...arms(), P("leg-r", "leg", "r"), P("leg-l", "leg", "l")]),
  beast:     () => core([head(), P("leg-rf", "leg", "rf"), P("leg-lf", "leg", "lf"), P("leg-rh", "leg", "rh"), P("leg-lh", "leg", "lh"), P("tail", "tail")]),
  winged:    () => core([head(), P("wing-r", "wing", "r"), P("wing-l", "wing", "l"), P("leg-r", "leg", "r"), P("leg-l", "leg", "l")]),
  bird:      () => core([head(), P("wing-r", "wing", "r"), P("wing-l", "wing", "l"), P("leg-r", "leg", "r"), P("leg-l", "leg", "l"), P("tail", "tail")]),
  serpent:   () => core([head(), P("tail", "tail")]),
  fish:      () => core([head(), P("gills", "gills"), P("fin-r", "fin", "r"), P("fin-l", "fin", "l"), P("tail", "tail")]),
  spider:    () => core([head(), ...["r", "l"].flatMap(s => [1, 2, 3, 4].map(n => P(`leg-${s}${n}`, "leg", s)))]),
  wingedPerson: () => core([head(), ...arms(), P("wing-r", "wing", "r"), P("wing-l", "wing", "l"), P("leg-r", "leg", "r"), P("leg-l", "leg", "l")]),
  formless:  () => null
};

/**
 * The shapes. plan: the tree. armor: can wear armor and clothes. weapons: natural weapons beyond the fist, as
 * {kind: {type, bonus}}; bonus is Strength + bonus. moves: ways of moving the shape gives (movement-rules keys).
 * senses: what Senses reads ("wolf", "bat"). ref: where the shape comes from.
 */
export const SHAPES = {
  person:     {label: "Person", plan: "person", armor: true},
  homid:      {label: "Homid", plan: "person", armor: true, ref: "W20"},
  glabro:     {label: "Glabro", plan: "person", armor: true, ref: "W20"},
  crinos:     {label: "Crinos", plan: "person", armor: false, speaks: "hard", ref: "W20"},
  hispo:      {label: "Hispo", plan: "beast", armor: false, speaks: false, senses: "wolf", ref: "W20"},
  lupus:      {label: "Lupus", plan: "beast", armor: false, speaks: false, senses: "wolf", ref: "W20"},
  wolf:       {label: "Wolf", plan: "beast", armor: false, speaks: false, senses: "wolf", weapons: {bite: {type: "aggravated", bonus: 1}, claw: {type: "aggravated", bonus: 1}}, ref: "Shape of the Beast, V20 p. 200; VtDA20 p. 241", note: "Running speed doubled; Perception at -2 difficulty"},
  bat:        {label: "Bat", plan: "winged", armor: false, speaks: false, senses: "bat", moves: {fly: true}, ref: "Shape of the Beast, V20 p. 200; VtDA20 p. 241", note: "Strength 1; flies up to 20 mph; hearing at -3 difficulty; attacks against it at +2 difficulty (Dark Ages: attackers lose 2 dice)"},
  rat:        {label: "Rat", plan: "beast", armor: false, speaks: false, weapons: {bite: {type: "aggravated", bonus: 0}}, ref: "Shape of the Beast, VtDA20 p. 241", note: "Strength 1; running speed doubled; attackers lose 1 die"},
  bird:       {label: "Bird", plan: "bird", armor: false, speaks: false, moves: {fly: true}},
  serpent:    {label: "Serpent", plan: "serpent", armor: false, speaks: false, moves: {swimfast: true}},
  fish:       {label: "Fish", plan: "fish", armor: false, speaks: false, moves: {swimfast: true, waterbreath: true}},
  spider:     {label: "Spider", plan: "spider", armor: false, speaks: false, moves: {wallwalk: true}},
  mist:       {label: "Mist", plan: "formless", armor: false, speaks: false, intangible: true, moves: {fly: true}, ref: "Mist Form, V20 p. 200; Lurking Mists, VtDA20 p. 242", note: "Slips through tiny openings; mundane physical attacks pass through; fire and sun 1 die less; cannot attack physically"},
  earth:      {label: "In the earth", plan: "formless", armor: false, speaks: false, hidden: true, moves: {meld: true}, ref: "Earth Meld, V20 pp. 199-200; VtDA20 pp. 240-241", note: "Cannot move; finding the vampire is at +2 difficulty"},
  zulo:       {label: "Zulo shape", plan: "person", armor: false, ref: "Horrid Form, V20 p. 242; Zulo shape, VtDA20 pp. 268-269", note: "Physical Attributes +3; Social Attributes 0 except with others in the same shape; Brawl damage +1; about 8 feet tall"},
  chiropteran: {label: "Chiropteran", plan: "wingedPerson", armor: false, moves: {fly: true}, weapons: {claw: {type: "aggravated", bonus: 2}}, ref: "Chiropteran Marauder, V20 pp. 242-243; VtDA20 p. 269", note: "Everything the Zulo shape gives; flies 25 mph; the wings carry but cannot handle things"}
};

/** Lupus and Hispo for the Changing Breeds whose animal is not four-legged. */
export const FERA_ANIMAL = {Corax: "bird", Camazotz: "bat", Nagah: "serpent", Rokea: "fish", Ananasi: "spider", Mokole: "beast"};

/** Effect names that put a body in a shape (Protean, Vicissitude, Mage Life, Moliate and others). Checked in order. */
export const SHAPE_PATTERNS = [
  ["mist", /\b(mist form|body of mist|lurking mists|form of mist|\bmist\b)/],
  ["earth", /\bearth meld|melded? into the (earth|ground)/],
  ["chiropteran", /chiropteran/],
  ["zulo", /\bzulo\b|horrid form/],
  ["bat", /\bbats?\b/],
  ["rat", /\brats?\b/],
  ["wolf", /\bwol(f|ves)\b/],
  ["bird", /\b(raven|crow|owl|hawk|bird)\b/],
  ["serpent", /\b(snake|serpent|viper)\b/],
  ["fish", /\b(fish|shark)\b/],
  ["spider", /\bspider\b/]
];

/** Names of the powers and effects that change the whole shape. */
export const SHAPE_POWERS = /shape of the beast|mist form|lurking mists|body of mist|earth meld|horrid form|zulo|chiropteran|\b(wolf|bat|rat|bird|raven|serpent|snake|spider|fish) (form|shape)\b|\bshapeshift|\bshape change|moliate/;

/** Effects that grow natural weapons on the body the character already has. */
export const GROW_PATTERNS = [
  ["claw", /feral (claws|weapons)/, {type: "aggravated", bonus: 1, ref: "Feral Claws, V20 p. 199; Feral Weapons, VtDA20 p. 240"}]
];

/** Lasting features from the Storyteller's record (wodx-storyteller body), by key. */
export const FEATURES = {
  talons:   {label: "Bone talons", adds: [], weapons: {claw: {type: "lethal", bonus: 1}}, ref: "Bonecraft, V20 p. 242; VtDA20 p. 268"},
  spikes:   {label: "Bone spikes", adds: [], ref: "Bonecraft, V20 p. 242", note: "Close-combat attackers take their own Strength in lethal unless they score 3 or more successes; +2 damage on holds, clinches and tackles"},
  armor:    {label: "Bone armor", adds: [], ref: "Rend the Osseous Frame, VtDA20 p. 268", note: "+1 soak for each plate, each costing 1 Dexterity or 1 health level"},
  arms:     {label: "An extra pair of arms", adds: [["arm-r2", "arm", "r", [["hand-r2", "hand", "r"]]], ["arm-l2", "arm", "l", [["hand-l2", "hand", "l"]]]], ref: "Fleshcraft"},
  wings:    {label: "Wings", adds: [["wing-r", "wing", "r"], ["wing-l", "wing", "l"]], moves: {fly: true}, ref: "Fleshcraft or Bonecraft"},
  gills:    {label: "Gills", adds: [["gills", "gills", "m"]], moves: {waterbreath: true}, ref: "Fleshcraft"},
  tail:     {label: "A tail", adds: [["tail", "tail", "m"]], ref: "Fleshcraft"},
  fangs:    {label: "Fangs", adds: [], weapons: {bite: {type: "lethal", bonus: 1}}, ref: "Fleshcraft"},
  looks:    {label: "Changed looks", adds: [], ref: "Fleshcraft (V20)"},
  prosthetic: {label: "A false limb", adds: [], note: "Takes the place of a lost part: a wooden leg or hook hand in the early eras, a modern limb, a cybernetic one in the World of Future Darkness"},
  lost:     {label: "A lost part", adds: [], loses: true}
};

/** What a lost part stops, in words, for the card and the sheet. */
export const LOSS_TEXT = {
  hand: "cannot hold anything in that hand",
  arm: "cannot use that arm or its hand (a Garou in Hispo or Lupus runs at three-quarters speed, W20 p. 260)",
  leg: "moves at half speed in every form (W20 p. 260); with no legs left, only crawls",
  eye: "+3 difficulty on depth perception, shooting and throwing, +2 on sight Perception (W20 p. 259)",
  wing: "cannot fly",
  tail: "no effect on rolls",
  fin: "swims at half speed"
};

const clone = n => n ? ({...n, kids: (n.kids ?? []).map(clone)}) : null;
const mk = a => P(a[0], a[1], a[2] ?? "m", (a[3] ?? []).map(mk));

/** Every part of a tree, flat, with a parent id. */
export function flatten(tree, parent = null, out = []) {
  if ( !tree ) return out;
  out.push({id: tree.id, type: tree.type, side: tree.side, parent});
  for ( const k of tree.kids ?? [] ) flatten(k, tree.id, out);
  return out;
}

/** A part's name in words: "left hand", "right fore leg". */
export function partLabel(p) {
  const t = PART_TYPES[p?.type]?.label ?? String(p?.type ?? "");
  const s = SIDE[p?.side] ?? "";
  return (s ? `${s} ${t.toLowerCase()}` : t).replace(/^./, c => c.toUpperCase());
}

const lc = s => String(s ?? "").toLowerCase();

/**
 * Which shape the body is in. view: {shapeFlag, garouForm, shifter, feraKey, effects: [{name, description}]}.
 * A Storyteller's flag wins, then a shapechanger's form, then an effect's name. {key, why}
 */
export function shapeOf(view = {}) {
  if ( view.shapeFlag && SHAPES[view.shapeFlag] ) return {key: view.shapeFlag, why: "set by the Storyteller"};
  for ( const e of view.effects ?? [] ) {
    const name = lc(e?.name), text = lc(`${e?.name ?? ""} ${e?.description ?? ""}`);
    // Only a shape power counts, so a Gift that names a wolf does not turn anyone into one
    if ( e?.key !== "wodx-effect-shape" && !SHAPE_POWERS.test(name) ) continue;
    for ( const [key, re] of SHAPE_PATTERNS ) if ( re.test(text) ) return {key, why: e?.name ?? ""};
    if ( /shape of the beast/.test(name) ) return {key: "wolf", why: e?.name ?? ""};
  }
  if ( view.shifter && view.garouForm && SHAPES[view.garouForm] ) {
    const animal = FERA_ANIMAL[view.feraKey];
    if ( animal && ["hispo", "lupus"].includes(view.garouForm) ) return {key: animal, why: `${view.feraKey} ${view.garouForm}`, form: view.garouForm};
    return {key: view.garouForm, why: "form"};
  }
  return {key: "person", why: ""};
}

/** Normalise one Storyteller body change into a feature: {key, part, lost, label}. */
export function featureOf(change = {}) {
  const key = FEATURES[change.feature] ? change.feature : (change.lost ? "lost" : null);
  if ( !key ) return null;
  return {key, part: change.lostPart || null, label: FEATURES[key].label, what: String(change.what ?? "")};
}

/**
 * The whole body. view as for shapeOf, plus features: [{key, part}] from featureOf.
 * Returns {shape, label, intangible, hidden, tree, parts, lost, holds, hands, armor, speaks, weapons, moves, senses,
 * notes}.
 */
export function bodyOf(view = {}) {
  const sh = shapeOf(view), S = SHAPES[sh.key];
  let tree = clone(PLANS[S.plan]?.() ?? null);
  const notes = [], weapons = {}, moves = {...(S.moves ?? {})}, lost = [];
  if ( S.note ) notes.push(`${S.label}: ${S.note} (${S.ref}).`);
  for ( const [k, w] of Object.entries(S.weapons ?? {}) ) weapons[k] = {...w, why: S.label};
  // Effects that grow weapons (Feral Claws) on a body with hands or paws
  for ( const e of view.effects ?? [] ) {
    const text = lc(`${e?.name ?? ""} ${e?.description ?? ""}`);
    for ( const [k, re, w] of GROW_PATTERNS ) if ( re.test(text) && tree ) weapons[k] = {...w, why: e?.name ?? ""};
  }
  for ( const f of view.features ?? [] ) {
    const F = FEATURES[f?.key];
    if ( !F || !tree ) continue;
    if ( F.loses ) { lost.push(f.part); continue; }
    if ( F.adds?.length && S.plan !== "formless" ) {
      const ids = new Set(flatten(tree).map(p => p.id));
      for ( const a of F.adds ) {
        if ( ids.has(a[0]) ) continue;
        const part = mk(a);
        const host = a[1] === "wing" ? findPart(tree, "back") : (a[1] === "gills" ? findPart(tree, "face") ?? tree : tree);
        (host ?? tree).kids.push(part);
      }
    }
    for ( const [k, w] of Object.entries(F.weapons ?? {}) ) if ( !weapons[k] ) weapons[k] = {...w, why: F.label};
    Object.assign(moves, F.moves ?? {});
    if ( F.note ) notes.push(`${F.label}: ${F.note}.`);
  }
  // Lost parts go, with everything on them
  for ( const id of lost ) tree = prune(tree, id);
  const parts = flatten(tree);
  const hands = parts.filter(p => p.type === "hand").length;
  const has = t => parts.some(p => p.type === t);
  if ( moves.fly && S.plan !== "formless" && !has("wing") ) { delete moves.fly; notes.push("No wings left: cannot fly."); }
  if ( !has("mouth") ) delete weapons.bite;
  if ( !hands && !["beast", "spider"].includes(S.plan) ) delete weapons.claw;
  const legs = parts.filter(p => p.type === "leg").length;
  const fullLegs = flatten(clone(PLANS[S.plan]?.() ?? null)).filter(p => p.type === "leg").length;
  const mobility = !fullLegs ? 1 : (legs === fullLegs ? 1 : legs === 0 ? 0 : 0.5);
  return {
    shape: sh.key, form: sh.form ?? null, label: S.label, why: sh.why, ref: S.ref ?? "",
    intangible: !!S.intangible, hidden: !!S.hidden, tree, parts, lost: lost.filter(Boolean),
    hands, holds: hands > 0 && !S.intangible, armor: !!S.armor && !!tree,
    speaks: S.speaks === undefined ? has("mouth") : (S.speaks && has("mouth")), speakHard: S.speaks === "hard",
    weapons, moves, mobility, senses: S.senses ?? null, notes
  };
}

export function findPart(tree, id) {
  if ( !tree ) return null;
  if ( tree.id === id ) return tree;
  for ( const k of tree.kids ?? [] ) { const f = findPart(k, id); if ( f ) return f; }
  return null;
}

function prune(tree, id) {
  if ( !tree ) return null;
  tree.kids = (tree.kids ?? []).filter(k => k.id !== id || k.type === "body").map(k => prune(k, id)).filter(Boolean);
  return tree;
}

/* -------------------------------------------------------------- */
/*  Hit locations (house rule B1203)                               */
/* -------------------------------------------------------------- */

/** How likely an unaimed blow is to land on each kind of part. Parts inside a larger part are reached only by aiming. */
export const HIT_WEIGHTS = {body: 4, head: 1, arm: 1, leg: 1.5, wing: 1, tail: 0.5, fin: 0.5};

/** The parts an unaimed blow can land on, with weights. Parts on a beast's four legs share the leg weight. */
export function hitTable(body) {
  if ( !body?.tree || body.intangible || body.hidden ) return [];
  const top = body.parts.filter(p => HIT_WEIGHTS[p.type] && (p.type === "body" || ["body", "back"].includes(p.parent)));
  const out = [];
  const legs = top.filter(p => p.type === "leg");
  for ( const p of top ) {
    let w = HIT_WEIGHTS[p.type];
    if ( p.type === "leg" && legs.length > 2 ) w = (HIT_WEIGHTS.leg * 2) / legs.length;
    out.push({id: p.id, type: p.type, label: partLabel(p), weight: w});
  }
  const total = out.reduce((s, x) => s + x.weight, 0) || 1;
  return out.map(x => ({...x, chance: Math.round((x.weight / total) * 100)}));
}

/** Pick a location: r in [0, 1). aimed: a part id or a size ("medium", "small", "precise"). */
export function hitLocation(body, {aimed = null, r = Math.random()} = {}) {
  if ( !body?.tree ) return null;
  if ( aimed && body.parts.some(p => p.id === aimed) ) {
    const p = body.parts.find(x => x.id === aimed);
    return {id: p.id, type: p.type, label: partLabel(p), aimed: true, size: PART_TYPES[p.type]?.size ?? "none"};
  }
  if ( aimed && ["medium", "small", "precise"].includes(aimed) ) {
    const of = body.parts.filter(p => PART_TYPES[p.type]?.size === aimed);
    if ( of.length ) { const p = of[Math.min(of.length - 1, Math.floor(r * of.length))]; return {id: p.id, type: p.type, label: partLabel(p), aimed: true, size: aimed}; }
  }
  const t = hitTable(body);
  if ( !t.length ) return null;
  const total = t.reduce((s, x) => s + x.weight, 0);
  let x = r * total;
  for ( const e of t ) { if ( (x -= e.weight) < 0 ) return {id: e.id, type: e.type, label: e.label, aimed: false, size: PART_TYPES[e.type]?.size ?? "none"}; }
  const e = t[t.length - 1];
  return {id: e.id, type: e.type, label: e.label, aimed: false, size: PART_TYPES[e.type]?.size ?? "none"};
}

/** The parts an attacker can aim at, grouped by size, for the attack dialog. */
export function aimOptions(body) {
  if ( !body?.tree ) return [];
  return body.parts.filter(p => ["medium", "small", "precise"].includes(PART_TYPES[p.type]?.size))
    .map(p => ({id: p.id, label: partLabel(p), size: PART_TYPES[p.type].size}));
}

/**
 * Should the Storyteller be offered a maiming (house rule B1204)? A blow of 3 or more lethal or aggravated levels after
 * soak to a part that can be lost (a limb, hand, eye, wing, tail or fin). The same three that a stake needs to reach
 * the heart (V20 Dark Ages p. 347). Never automatic: the Storyteller decides.
 */
export function maimOffer(loc, {levels = 0, type = "bashing", aimed = false} = {}) {
  if ( !loc || type === "bashing" || levels < 3 ) return null;
  const T = PART_TYPES[loc.type];
  if ( !T?.appendage && loc.type !== "eye" ) return null;
  return {part: loc.id, label: loc.label, stops: LOSS_TEXT[loc.type] ?? "", cripple: true, aimed: !!loc.aimed || aimed};
}

/* -------------------------------------------------------------- */
/*  Gear in a new shape (house rule B1205)                          */
/* -------------------------------------------------------------- */

/**
 * What comes off when a body changes shape. items: [{id, kind: "weapon"|"armor", equipped, dedicated}].
 * Dedicated items (Rite of Talisman Dedication) stay with a shapechanger. Returns the ids to unequip, with reasons.
 */
export function gearToDrop(body, items = []) {
  const out = [];
  for ( const i of items ) {
    if ( !i?.equipped || i.dedicated ) continue;
    if ( i.kind === "weapon" && !body.holds ) out.push({id: i.id, why: body.intangible ? "a body of mist holds nothing" : "no hands to hold it"});
    else if ( i.kind === "armor" && !body.armor ) out.push({id: i.id, why: "it does not fit this shape"});
  }
  return out;
}

/** The plan in words, for the sheet: [{label, depth, lost, added, holds, weapon}]. */
export function outline(body, view = {}) {
  if ( !body?.tree ) return [];
  const base = new Set(flatten(clone(PLANS[SHAPES[body.shape].plan]?.() ?? null)).map(p => p.id));
  const out = [];
  const walk = (n, d) => {
    const T = PART_TYPES[n.type] ?? {};
    const w = n.type === "hand" ? body.weapons.claw : (n.type === "mouth" ? body.weapons.bite : null);
    out.push({id: n.id, label: partLabel(n), depth: d, added: !base.has(n.id), holds: !!T.holds, weapon: w ? `${n.type === "mouth" ? "Bite" : "Claw"} (Strength + ${w.bonus}, ${w.type})` : ""});
    for ( const k of n.kids ?? [] ) walk(k, d + 1);
  };
  walk(body.tree, 0);
  for ( const id of body.lost ) {
    const b = flatten(clone(PLANS[SHAPES[body.shape].plan]?.() ?? null)).find(p => p.id === id);
    if ( b ) out.push({id, label: partLabel(b), depth: 1, lost: true, stops: LOSS_TEXT[b.type] ?? ""});
  }
  return out;
}

/** Ways of moving the body gives, in the shape movement-rules abilities() returns. */
export function movesOf(body) {
  const m = body?.moves ?? {};
  return {fly: !!m.fly, swimfast: !!m.swimfast, waterbreath: !!m.waterbreath, wallwalk: !!m.wallwalk, meld: !!m.meld};
}
