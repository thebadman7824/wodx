/**
 * WoDX Interactables: loose gear on the map (B6086 to B6089). Pure rules; loose.mjs does the Foundry side.
 *
 *   Setting down  A character puts things from their sheet on the ground where they stand: they become a pile of
 *                 gear on that square, drawn as a heap of the things in it. Things set down on a square that already
 *                 has a pile join it (B6086).
 *   The pile      Anyone in reach picks it up from the Interact menu (all of it, as the items they were, with their
 *                 own settings); a heavy pile is hauled like a sack from the Carry and drag menu, at its real
 *                 weight. Once picked up, the heap is gone from the map (B6086).
 *   What goes     Things a character carries: items, armor, weapons and fetishes. Natural weapons, installed
 *                 cyberware, traits and powers stay (B6088).
 *   The heap      One block of colour for each thing, by what it is made of, piled from the bottom of the square up;
 *                 a heavier pile is drawn bigger (B6087).
 */

const num = v => Number(v) || 0;

/** Is a tile's flags a pile of loose gear (set down, or made by the Storyteller with the kind Gear on the ground)? */
export const isPile = (f = {}) => !!(f && f.container && (f.pile || f.kind === "pile"));

/** Sheet types that can be set down. */
export const PUT_DOWN = new Set(["Item", "Armor", "Melee Weapon", "Ranged Weapon", "Fetish"]);

/** Can a thing be set down? v: weight.mjs viewOf, or {type, natural, installed, kind}. */
export function canSetDown(v = {}) {
  if ( !PUT_DOWN.has(v.type) ) return false;
  if ( v.natural ) return false;
  if ( v.installed ) return false;
  return true;
}

/** The flags of a new pile of loose gear. loose: [{name, data}]; at: the square's top left; size: the grid. */
export function pileFlags(loose = [], {title = ""} = {}) {
  return {container: true, kind: "pile", ds: "open", lock: "none", pile: true, noMarker: true, title,
    items: loose.map(l => l.name), loose, taken: false};
}

/** Things set down on a pile: a picked-up pile starts afresh, a standing one keeps what it had. */
export function addToPile(f = {}, loose = []) {
  const keep = f.taken ? [] : (Array.isArray(f.loose) ? f.loose : []);
  const plain = f.taken ? [] : (Array.isArray(f.items) ? f.items : String(f.items ?? "").split(/\r?\n/)).map(s => String(s).trim()).filter(Boolean)
    .filter(n => !keep.some(k => k.name === n));
  const all = [...keep, ...loose];
  return {items: [...plain, ...all.map(l => l.name)], loose: all, taken: false, ds: "open"};
}

/** The square a point stands in: its top left, by the grid. */
export const squareOf = (p, size = 100) => ({x: Math.floor(num(p.x) / size) * size, y: Math.floor(num(p.y) / size) * size});

/**
 * Taking a pile's things: a line that was set down comes back as the item it was. lines: the pile's names; loose:
 * [{name, data}]. -> [{line, data (or null: look it up by name)}], each loose entry used once.
 */
export function matchLoose(lines = [], loose = []) {
  const left = [...(Array.isArray(loose) ? loose : [])];
  return lines.map(line => {
    const i = left.findIndex(l => l?.name === line);
    if ( i < 0 ) return {line, data: null};
    const [l] = left.splice(i, 1);
    return {line, data: l.data ?? null};
  });
}

/** What a thing is made of, for its colour in the heap. */
export const COLOURS = {steel: 0x8a8f98, iron: 0x5d6168, wood: 0x7a5a36, leather: 0x6b4428, cloth: 0x7d3b3b, paper: 0xd8cca8,
  gold: 0xcfa846, glass: 0x4f7d57, food: 0xb88a3e, light: 0xe0a347, tech: 0x3a4048, bone: 0xd9d2c0, other: 0x9a8466};
/** The colour for a thing by its kind and name. */
export function colourOf({kind = "", type = "", name = ""} = {}) {
  const k = String(kind).toLowerCase(), n = String(name).toLowerCase();
  if ( type === "Armor" || /^armor/.test(k) ) return /leather|hide|quilt|ichcah|clothing|class one/.test(n) ? COLOURS.leather : COLOURS.iron;
  if ( type === "Melee Weapon" || type === "Ranged Weapon" || /melee|ranged|thrown|arms/.test(k) ) return /bow|staff|club|spear|pitchfork|stake|branch|chair|table/.test(n) ? COLOURS.wood : COLOURS.steel;
  if ( /coin|valuables/.test(k) ) return COLOURS.gold;
  if ( /cloth|hygiene/.test(k) ) return COLOURS.cloth;
  if ( /papers|manuals|maps/.test(k) ) return COLOURS.paper;
  if ( /drink|medicine|drugs/.test(k) ) return COLOURS.glass;
  if ( /food|seeds/.test(k) ) return COLOURS.food;
  if ( /light|fuel/.test(k) ) return COLOURS.light;
  if ( /tech|power|cyber/.test(k) ) return COLOURS.tech;
  if ( /tools|traps|kitchen/.test(k) ) return COLOURS.wood;
  if ( /containers|travel/.test(k) ) return COLOURS.leather;
  if ( /occult|faith|keepsake/.test(k) ) return COLOURS.bone;
  return COLOURS.other;
}

const hash = s => { let h = 2166136261; for ( const c of String(s) ) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/**
 * The heap, as blocks inside a square of size px: [{x, y, w, h, colour}], x and y from the square's top left. rows:
 * [{name, kind, type, kg}]. Pixel steps of size/16; the same things always make the same heap. The heap is wider
 * and taller the more it weighs (a knife is a sliver, a suit of mail most of the square).
 */
export function heapOf(rows = [], size = 100) {
  const px = Math.max(1, Math.round(size / 16));
  const out = [];
  const total = rows.reduce((t, r) => t + Math.max(0, num(r.kg)), 0);
  // The heap's width: from 6 pixels for a pocketful to 14 for 40 kg or more
  const span = Math.max(6, Math.min(14, Math.round(6 + Math.log2(1 + total) * 1.6)));
  const left = Math.floor((16 - span) / 2);
  const cols = new Array(span).fill(0);
  rows.slice(0, 24).forEach((r, i) => {
    const h = hash(`${r.name}:${i}`);
    const w = Math.max(1, Math.min(span, Math.round(1 + Math.log2(1 + Math.max(0, num(r.kg))) * 1.4)));
    const tall = Math.max(1, Math.min(3, Math.round(Math.log2(2 + num(r.kg)) / 1.5)));
    // Lay it where the heap is lowest, nudged by the hash so it does not look stacked by hand
    let best = 0, low = Infinity;
    for ( let c = 0; c <= span - w; c++ ) {
      const top = Math.max(...cols.slice(c, c + w)) + ((h >> (c % 8)) & 1) * 0.5;
      if ( top < low ) { low = top; best = c; }
    }
    const base = Math.max(...cols.slice(best, best + w));
    for ( let c = best; c < best + w; c++ ) cols[c] = base + tall;
    out.push({x: (left + best) * px, y: size - 2 * px - (base + tall) * px, w: w * px, h: tall * px, colour: colourOf(r)});
  });
  return out;
}

/** How a pile reads on the map: "Gear on the ground, about 12 kg". */
export function pileLabel(title, kg) {
  const w = num(kg);
  return `${title || "Gear on the ground"}${w > 0 ? `, ${w < 1 ? "under a kilo" : `about ${w >= 10 ? Math.round(w) : Math.round(w * 10) / 10} kg`}` : ""}`;
}

/* ---------------------------------------------------------------- Simple icons and picking up (desk pick inv3, 26 Nov) */

/**
 * The kind of icon a thing shows on the ground. A pile shows one small icon for each kind it holds, until the object
 * art is drawn: weapon, armor, clothing, coin, food, drink, tool, light, paper, bag, other.
 */
export const ICON_KINDS = ["weapon", "armor", "clothing", "coin", "food", "drink", "tool", "light", "paper", "bag", "other"];
export function iconOf({kind = "", type = "", name = ""} = {}) {
  const k = String(kind).toLowerCase(), n = String(name).toLowerCase();
  if ( type === "Armor" || /^armor/.test(k) ) return "armor";
  if ( type === "Melee Weapon" || type === "Ranged Weapon" || /melee|ranged|thrown|arms/.test(k) ) return "weapon";
  if ( /coin|valuables/.test(k) || /\b(pennies|penny|coins?|denarii|groschen|shillings?|florins?|ducats?|dollars?)\b/.test(n) ) return "coin";
  if ( /cloth|hygiene/.test(k) ) return "clothing";
  if ( /papers|manuals|maps/.test(k) ) return "paper";
  if ( /drink|medicine|drugs/.test(k) ) return "drink";
  if ( /food|seeds/.test(k) ) return "food";
  if ( /light|fuel/.test(k) ) return "light";
  if ( /tools|traps|kitchen|tech|power|cyber/.test(k) ) return "tool";
  if ( /containers|travel/.test(k) ) return "bag";
  return "other";
}
/** 8 by 8 pixel icons, "#" filled. Plain shapes a player reads at a glance; full object art replaces them later. */
export const ICONS = {
  weapon: ["......##", ".....##.", "....##..", "#..##...", ".###....", "..#.....", ".#.#....", "#......."],
  armor: ["##....##", "########", "########", ".######.", ".######.", ".######.", "..####..", "........"],
  clothing: ["..#..#..", ".##..##.", "########", "#.####.#", "..####..", "..####..", "..####..", "........"],
  coin: ["..####..", ".#....#.", "#..##..#", "#.#..#.#", "#.#..#.#", "#..##..#", ".#....#.", "..####.."],
  food: ["....#...", "...#....", ".######.", "########", "########", "########", ".######.", "..####.."],
  drink: ["...##...", "...##...", "..####..", ".######.", ".######.", ".######.", ".######.", "..####.."],
  tool: ["###.....", "###.....", ".#......", ".##.....", "..##....", "...##...", "....##..", ".....##."],
  light: ["...#....", "..###...", "..###...", "...#....", "..###...", "..###...", "..###...", ".#####.."],
  paper: ["######..", "#....##.", "#.##..#.", "#.....#.", "#.###.#.", "#.....#.", "#.###.#.", "#######."],
  bag: ["..####..", "...##...", ".######.", "########", "########", "########", "########", ".######."],
  other: ["........", "..####..", ".#....#.", ".#....#.", ".#....#.", ".#....#.", "..####..", "........"]
};
/** The colour of each kind's icon, from the colours of what such things are made of. */
export const ICON_COLOURS = {weapon: COLOURS.steel, armor: COLOURS.iron, clothing: COLOURS.cloth, coin: COLOURS.gold, food: COLOURS.food,
  drink: COLOURS.glass, tool: COLOURS.wood, light: COLOURS.light, paper: COLOURS.paper, bag: COLOURS.leather, other: COLOURS.other};

/**
 * The icons of a pile inside a square of size px: [{kind, count, x, y, px, cells: [[cx, cy]...], colour}]. One icon for
 * each kind, the commonest first, at most four (a two by two set); an icon is 8 pixels of size/32 each.
 */
export function iconsOf(rows = [], size = 100) {
  const counts = new Map();
  for ( const r of rows ) { const k = iconOf(r); counts.set(k, (counts.get(k) ?? 0) + 1); }
  const kinds = [...counts.entries()].sort((a, b) => b[1] - a[1] || ICON_KINDS.indexOf(a[0]) - ICON_KINDS.indexOf(b[0])).slice(0, 4);
  const px = Math.max(1, Math.round(size / 32)), icon = 8 * px, gap = px * 2;
  const cols = kinds.length === 1 ? 1 : 2, rowsN = Math.ceil(kinds.length / cols);
  const w = cols * icon + (cols - 1) * gap, h = rowsN * icon + (rowsN - 1) * gap;
  const x0 = Math.round((size - w) / 2), y0 = Math.round((size - h) / 2);
  return kinds.map(([kind, count], i) => {
    const cells = [];
    ICONS[kind].forEach((line, cy) => [...line].forEach((c, cx) => { if ( c === "#" ) cells.push([cx, cy]); }));
    return {kind, count, x: x0 + (i % cols) * (icon + gap), y: y0 + Math.floor(i / cols) * (icon + gap), px, cells, colour: ICON_COLOURS[kind]};
  });
}

/**
 * Picking some things up from a pile, not all of them. picks: indexes into the pile's lines. Returns {flags, taken}:
 * the pile's new flags (taken when nothing is left) and [{line, data}] for each thing picked up.
 */
export function takeFromPile(f = {}, picks = []) {
  const lines = (Array.isArray(f.items) ? f.items : String(f.items ?? "").split(/\r?\n/)).map(s => String(s).trim()).filter(Boolean);
  const matched = matchLoose(lines, f.loose ?? []);
  const want = new Set(picks.map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < lines.length));
  const taken = matched.filter((_, i) => want.has(i)), left = matched.filter((_, i) => !want.has(i));
  return {taken, flags: {items: left.map(m => m.line), loose: left.filter(m => m.data).map(m => ({name: m.line, data: m.data})), taken: left.length === 0}};
}
