/**
 * WoDX Interactables 0.32.0: the case board, the pure part. A shared board for the coterie: found clues, people,
 * places, encyclopaedia entries and notes, set out as cards and joined by lines with a few words on them. The board
 * lives in a journal's flags (case.mjs); everything here is plain data, so the harness tests it without Foundry.
 *
 * A board: {v, cards: [{id, kind, title, text, ref, x, y, hidden, by}], links: [{id, a, b, label}]}
 *   kind    one of KINDS
 *   ref     the UUID of what the card stands for (a clue's tile, an actor, a journal or page, a scene), or "" for a note
 *   x, y    the card's top-left corner on the board, in board pixels
 *   hidden  only the Storyteller sees it, until it is earned
 *   by      who put it there (a user's name), shown small
 */

export const BOARD_V = 1;
export const BOARD_FOLDER = "WoDX case boards";
export const KINDS = {clue: "Clue", person: "Person", place: "Place", entry: "Lore", note: "Note"};
export const CARD_W = 180, CARD_H = 130, BOARD_W = 1600, BOARD_H = 1000;
const MAX_TEXT = 600, MAX_TITLE = 80, MAX_LABEL = 60, MAX_CARDS = 200;

const str = (v, n) => String(v ?? "").trim().slice(0, n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
export const boardName = name => `Case board: ${str(name, 60) || "an open case"}`;

/** A fresh id that does not clash with the ids already used. */
export function nextId(used = [], prefix = "c") {
  const have = new Set(used);
  for ( let i = 1; i < 10000; i++ ) { const id = `${prefix}${i}`; if ( !have.has(id) ) return id; }
  return `${prefix}${Date.now()}`;
}

export function emptyBoard() { return {v: BOARD_V, cards: [], links: []}; }

/** A board as stored, made safe: unknown kinds become notes, positions stay on the board, links to missing cards go. */
export function normalize(b) {
  const out = emptyBoard();
  const seen = new Set();
  for ( const c of Array.isArray(b?.cards) ? b.cards : [] ) {
    const id = str(c?.id, 20);
    if ( !id || seen.has(id) || out.cards.length >= MAX_CARDS ) continue;
    seen.add(id);
    out.cards.push({id, kind: KINDS[c.kind] ? c.kind : "note", title: str(c.title, MAX_TITLE) || KINDS[c.kind] || "Note",
      text: str(c.text, MAX_TEXT), ref: str(c.ref, 200), x: clamp(c.x, 0, BOARD_W - CARD_W), y: clamp(c.y, 0, BOARD_H - CARD_H),
      hidden: !!c.hidden, by: str(c.by, 40)});
  }
  const pairs = new Set();
  for ( const l of Array.isArray(b?.links) ? b.links : [] ) {
    const a = str(l?.a, 20), bb = str(l?.b, 20), key = [a, bb].sort().join("|");
    if ( !seen.has(a) || !seen.has(bb) || a === bb || pairs.has(key) ) continue;
    pairs.add(key);
    out.links.push({id: str(l.id, 20) || nextId(out.links.map(x => x.id), "l"), a, b: bb, label: str(l.label, MAX_LABEL)});
  }
  return out;
}

/** The first free spot on a grid of card-sized cells, left to right then down, so new cards do not land on old ones. */
export function freeSpot(board) {
  const cols = Math.floor(BOARD_W / (CARD_W + 20)), rows = Math.floor(BOARD_H / (CARD_H + 20));
  const taken = (x, y) => (board?.cards ?? []).some(c => Math.abs(c.x - x) < CARD_W && Math.abs(c.y - y) < CARD_H);
  for ( let r = 0; r < rows; r++ ) for ( let q = 0; q < cols; q++ ) {
    const x = 20 + q * (CARD_W + 20), y = 20 + r * (CARD_H + 20);
    if ( !taken(x, y) ) return {x, y};
  }
  return {x: 20 + ((board?.cards?.length ?? 0) * 12) % (BOARD_W - CARD_W - 40), y: 20};
}

/**
 * Add a card. A card for something already on the board (same ref) is not added twice: its text grows instead when
 * the new one says more (a clue examined again with more successes). Returns {board, card, added}.
 */
export function addCard(board, card = {}) {
  const b = normalize(board);
  const ref = str(card.ref, 200);
  const old = ref ? b.cards.find(c => c.ref === ref) : null;
  if ( old ) {
    const text = str(card.text, MAX_TEXT);
    if ( text && text.length > old.text.length && text.startsWith(old.text.slice(0, 20)) ) old.text = text;
    else if ( text && !old.text.includes(text) ) old.text = str(old.text ? `${old.text}\n${text}` : text, MAX_TEXT);
    if ( card.hidden === false ) old.hidden = false;
    return {board: b, card: old, added: false};
  }
  if ( b.cards.length >= MAX_CARDS ) return {board: b, card: null, added: false};
  const spot = (card.x === undefined || card.y === undefined) ? freeSpot(b) : {x: card.x, y: card.y};
  const made = normalize({cards: [{...card, id: nextId(b.cards.map(c => c.id)), ...spot}]}).cards[0];
  b.cards.push(made);
  return {board: b, card: made, added: true};
}

export function moveCard(board, id, x, y) {
  const b = normalize(board);
  const c = b.cards.find(k => k.id === id);
  if ( c ) { c.x = clamp(x, 0, BOARD_W - CARD_W); c.y = clamp(y, 0, BOARD_H - CARD_H); }
  return b;
}

/** Change a card's words (title, text) or its hidden switch. */
export function editCard(board, id, patch = {}) {
  const b = normalize(board);
  const c = b.cards.find(k => k.id === id);
  if ( !c ) return b;
  if ( patch.title !== undefined ) c.title = str(patch.title, MAX_TITLE) || c.title;
  if ( patch.text !== undefined ) c.text = str(patch.text, MAX_TEXT);
  if ( patch.hidden !== undefined ) c.hidden = !!patch.hidden;
  return b;
}

/** Take a card off, with its lines. */
export function removeCard(board, id) {
  const b = normalize(board);
  b.cards = b.cards.filter(c => c.id !== id);
  b.links = b.links.filter(l => l.a !== id && l.b !== id);
  return b;
}

/** Join two cards. Joining them again changes the words on the line; a card is never joined to itself. */
export function link(board, a, bId, label = "") {
  const b = normalize(board);
  if ( a === bId || !b.cards.some(c => c.id === a) || !b.cards.some(c => c.id === bId) ) return b;
  const old = b.links.find(l => (l.a === a && l.b === bId) || (l.a === bId && l.b === a));
  if ( old ) { old.label = str(label, MAX_LABEL); return b; }
  b.links.push({id: nextId(b.links.map(l => l.id), "l"), a, b: bId, label: str(label, MAX_LABEL)});
  return b;
}

export function unlink(board, id) {
  const b = normalize(board);
  b.links = b.links.filter(l => l.id !== id);
  return b;
}

/** What one viewer sees: the Storyteller sees everything; a player sees no hidden card and no line to one. */
export function visibleTo(board, isGM = false) {
  const b = normalize(board);
  if ( isGM ) return b;
  const shown = new Set(b.cards.filter(c => !c.hidden).map(c => c.id));
  return {...b, cards: b.cards.filter(c => shown.has(c.id)), links: b.links.filter(l => shown.has(l.a) && shown.has(l.b))};
}

/** The card for something dropped on the board, from Foundry's drag data ({type, uuid}) and the document's name. */
export function cardFromDrop(data = {}, name = "") {
  const type = String(data?.type ?? "");
  const uuid = str(data?.uuid, 200);
  const title = str(name, MAX_TITLE);
  if ( !uuid ) return null;
  if ( type === "Actor" ) return {kind: "person", ref: uuid, title: title || "Someone"};
  if ( type === "Scene" ) return {kind: "place", ref: uuid, title: title || "A place"};
  if ( type === "JournalEntry" || type === "JournalEntryPage" ) return {kind: "entry", ref: uuid, title: title || "A page"};
  if ( type === "Item" ) return {kind: "clue", ref: uuid, title: title || "A thing"};
  if ( type === "Tile" ) return {kind: "clue", ref: uuid, title: title || "A clue"};
  return null;
}

/** The card a found clue makes: its name, and what the finder learned (the texts the successes reached). */
export function clueCard(name, texts = [], ref = "", finder = "") {
  const words = (texts ?? []).map(t => str(t, MAX_TEXT)).filter(Boolean).join("\n");
  return {kind: "clue", ref: str(ref, 200), title: str(name, MAX_TITLE) || "A clue", text: words, by: str(finder, 40)};
}

/**
 * How the board looks and what it is called in the chronicle's year. Every era keeps its notes in its own way:
 * a scribe's parchment and thread, a commonplace book's pinned leaves, the detective's pinboard and string, the
 * corkboard of the late twentieth century, and a lit display in the World of Future Darkness.
 */
export const LOOKS = [
  {until: 1449, key: "parchment", title: "The findings", line: "thread", hint: "Notes on parchment, joined with red thread."},
  {until: 1799, key: "commonplace", title: "The commonplace board", line: "thread", hint: "Leaves pinned to a board, joined with thread."},
  {until: 1945, key: "pinboard", title: "The case board", line: "string", hint: "Cards pinned up and joined with string."},
  {until: 2022, key: "corkboard", title: "The case board", line: "string", hint: "Photos and notes on cork, joined with string."},
  {until: Infinity, key: "display", title: "The case display", line: "link", hint: "Panels on a lit display, joined by links."}
];
export function lookFor(year) {
  const y = Number(year);
  if ( !Number.isFinite(y) || y <= 0 ) return LOOKS[3];
  return LOOKS.find(l => y <= l.until) ?? LOOKS[LOOKS.length - 1];
}

/**
 * The starter layout (Interactables 0.39.0, B2832): three note cards across the top as column heads, Who, Where and
 * What we know, so a new board shows where things go. They are ordinary notes; move, change or take them off.
 */
export const STARTER = [
  {title: "Who", text: "The people in this: drop them below."},
  {title: "Where", text: "The places: drop scenes and maps below."},
  {title: "What we know", text: "Clues and what they tell us."}
];
export function starterBoard(board = emptyBoard()) {
  let b = normalize(board);
  const gap = Math.floor((BOARD_W - 3 * CARD_W) / 4);
  STARTER.forEach((s, i) => { b = addCard(b, {kind: "note", title: s.title, text: s.text, x: gap + i * (CARD_W + gap), y: 20}).board; });
  return b;
}
