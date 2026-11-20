/**
 * The story chronicle in play (Chronicle Packs Desk, Ben's picks a1-a4, b1, f1, f2; 18 Nov 2026).
 *
 * WoDX's story engines (the saga, fronts, twists, reveals and encounters) hold no story of their own. A chronicle
 * module (wodx-rothenstein is the first) registers its data here, and the engines read it through these live
 * bindings. With nothing registered every list is empty and the engines stay idle.
 *
 * Pure: no Foundry calls, so the harness can register a chronicle and test the engines with it.
 *
 * A chronicle pack: {id, title, manifest, saga: {SAGA, SAGA_CLOCKS, SAGA_ENDINGS, FIRST_BOOK},
 *   fronts: {FRONTS, JUDGEMENTS, ROLES, COURIER_GAP, CLUES, CHAPTERS, WEEK},
 *   twists: {CHAINS, TWISTS, PAIRS, ORDER, LAST_CHAPTER, CHAPTERS, WEEK},
 *   reveals: {REVEALS, JUDGED_FAVOURS, MURDERS, COLD}, encounters: {ENCOUNTERS, KINDS, LAST}}.
 * Several may register (desk a4); one is in play at a time.
 */
import {WEEK as TERMS_WEEK, DAY} from "./terms.mjs";

const EMPTY_SAGA = Object.freeze({key: "", title: "", where: "", region: "", origin: null, books: []});

/* The saga */
export let SAGA = EMPTY_SAGA;
export let SAGA_CLOCKS = [];
export let SAGA_ENDINGS = {};
/** The book whose ending later books answer, and in whose run fronts, twists and encounters play. */
export let FIRST_BOOK = "";
/** Story-chain keys of the saga's books start with this (kept as saga:<saga key>: so saved runs still match). */
export let SAGA_PREFIX = "saga::";

/* Fronts, roles and clues */
export let FRONTS = [];
export let JUDGEMENTS = [];
export let ROLES = [];
export let COURIER_GAP = 7 * DAY;
export let CLUES = [];
/** The first book's chapters, in order. */
export let CHAPTERS = [];
/** How far apart twists and front steps fall (the chronicle's own pace). */
export let WEEK = TERMS_WEEK;

/* Twists */
export let CHAINS = [];
export let TWISTS = [];
export let PAIRS = [];
export let ORDER = [];
export let LAST_CHAPTER = "";

/* Reveals */
export let REVEALS = {};
export let JUDGED_FAVOURS = [];
export let MURDERS = [];
export let COLD = null;

/* Encounters */
export let ENCOUNTERS = [];
export let KINDS = {};
/** The chapter an encounter with no best chapters closes after. */
export let LAST_ENCOUNTER = "";

const packs = new Map();
let inPlay = null;

/** Every registered chronicle, in the order they registered. */
export const chronicles = () => [...packs.values()];
/** The chronicle in play, or null. */
export const current = () => (inPlay ? packs.get(inPlay) ?? null : null);
/** The id of the chronicle in play, or "". */
export const currentId = () => inPlay ?? "";

function load(p) {
  const s = p?.saga ?? {}, f = p?.fronts ?? {}, t = p?.twists ?? {}, r = p?.reveals ?? {}, e = p?.encounters ?? {};
  SAGA = s.SAGA ?? EMPTY_SAGA;
  SAGA_CLOCKS = s.SAGA_CLOCKS ?? [];
  SAGA_ENDINGS = s.SAGA_ENDINGS ?? {};
  FIRST_BOOK = s.FIRST_BOOK ?? "";
  SAGA_PREFIX = `saga:${SAGA.key ?? ""}:`;
  FRONTS = f.FRONTS ?? [];
  JUDGEMENTS = f.JUDGEMENTS ?? [];
  ROLES = f.ROLES ?? [];
  COURIER_GAP = f.COURIER_GAP ?? 7 * DAY;
  CLUES = f.CLUES ?? [];
  CHAPTERS = f.CHAPTERS ?? t.CHAPTERS ?? [];
  WEEK = f.WEEK ?? t.WEEK ?? TERMS_WEEK;
  CHAINS = t.CHAINS ?? [];
  TWISTS = t.TWISTS ?? [];
  PAIRS = t.PAIRS ?? [];
  ORDER = t.ORDER ?? [];
  LAST_CHAPTER = t.LAST_CHAPTER ?? "";
  REVEALS = r.REVEALS ?? {};
  JUDGED_FAVOURS = r.JUDGED_FAVOURS ?? [];
  MURDERS = r.MURDERS ?? [];
  COLD = r.COLD ?? null;
  ENCOUNTERS = e.ENCOUNTERS ?? [];
  KINDS = e.KINDS ?? {};
  LAST_ENCOUNTER = e.LAST ?? "";
}

/**
 * Register a chronicle pack. The first one registered goes into play unless another is already in play.
 * Registering the same id again replaces it (and reloads it if it is in play). Returns the pack.
 */
export function registerChronicle(pack) {
  if ( !pack?.id ) throw new Error("A chronicle pack needs an id.");
  packs.set(pack.id, pack);
  if ( !inPlay || inPlay === pack.id ) useChronicle(pack.id);
  return pack;
}

/** Put a registered chronicle in play by id; "" or an unknown id puts none in play. Returns the pack or null. */
export function useChronicle(id = "") {
  const p = id ? packs.get(id) ?? null : null;
  inPlay = p ? p.id : null;
  load(p);
  return p;
}

/** Take a chronicle off the register (the harness uses this; a module that is off never registers). */
export function unregisterChronicle(id) {
  packs.delete(id);
  if ( inPlay === id ) useChronicle(chronicles()[0]?.id ?? "");
}
