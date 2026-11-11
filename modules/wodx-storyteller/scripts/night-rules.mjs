/**
 * WoDX Storyteller: the night's draw and the story aids, with no Foundry in them.
 *
 *   The night     One draw for a night: an encounter for each kind of place and world layer in play, opened by the
 *                 time of night, and a rumour. Seeded by the night's date, so the same chronicle gets the same night
 *                 again; a re-roll counts up a nonce.
 *   Story aids    Dreams, visions, auguries and foreshadowings built from the chronicle's own places and people (what
 *                 the log and the world hold), and relics, fetishes and talismans with a suggested rating.
 * Everything here is a prompt for the Storyteller. The tables are WoDX's, kept as Roll Tables the Storyteller edits.
 */
import * as G from "../../wodx-chronicle/scripts/gen-core.mjs";

/** The parts of the night, by the hour (0 to 24). */
export function partOfNight(hours) {
  const h = ((Number(hours) % 24) + 24) % 24;
  if ( h >= 3 && h < 12 ) return "late";
  if ( h >= 22 || h < 3 ) return "deep";
  return "early";
}
export const PARTS = {early: "Early in the night", deep: "The dead hours", late: "Before dawn"};

/** Kinds of place a night draws for. Fixed list. */
export const PLACES = {town: "In town", wilds: "On the roads and in the wilds"};
/** The world layers, and which lines at the table bring each into the draw. */
export const LAYERS = {physical: "The physical world", penumbra: "The Penumbra", shadowlands: "The Shadowlands"};
const LAYER_LINES = {penumbra: ["werewolf", "mage", "changeling"], shadowlands: ["wraith"]};

/** The layers in play for the chronicle's lines (from Start a chronicle). The physical world is always drawn. */
export function layersFor(lines = []) {
  const set = new Set(lines ?? []);
  return ["physical", ...Object.entries(LAYER_LINES).filter(([, ls]) => ls.some(l => set.has(l))).map(([k]) => k)];
}

/** A seeded pick from a list, or the fallback when it is empty. */
export const pickOr = (rand, list, fallback) => (list?.length ? G.pick(rand, list) : fallback);

/**
 * Compose a night. randFor(key) gives a seeded stream for one part, so each part keeps its result when another is
 * re-rolled. tables: (id) => table. vars: {place, person, places, people}.
 */
export function composeNight({randFor, tables, part = "early", places = ["town", "wilds"], layers = ["physical"], vars = {}} = {}) {
  const open = G.draw(`night.hour.${part}`, {rand: randFor(`hour:${part}`), tables})?.text ?? "";
  const encounters = [];
  for ( const p of places ) {
    const r = G.draw(`night.encounter.${p}`, {rand: randFor(`enc:${p}`), tables});
    if ( r ) encounters.push({layer: "physical", place: p, label: PLACES[p] ?? p, text: r.text});
  }
  for ( const l of layers.filter(x => x !== "physical") ) {
    const r = G.draw(`night.encounter.${l}`, {rand: randFor(`enc:${l}`), tables});
    if ( r ) encounters.push({layer: l, place: null, label: LAYERS[l], text: r.text});
  }
  const rr = randFor("rumour");
  const fill = {place: vars.place ?? pickOr(rr, vars.places, "the old mill"), person: vars.person ?? pickOr(rr, vars.people, "a neighbour")};
  const rumour = G.draw("night.rumour", {rand: rr, tables, vars: fill})?.text ?? "";
  return {part, partLabel: PARTS[part], opening: open, encounters, rumour};
}

/** The story aids. Fixed list. */
export const AIDS = {
  dream: {label: "A dream", table: "aid.dream", whisper: true},
  vision: {label: "A vision", table: "aid.vision", whisper: true},
  augury: {label: "An augury", table: "aid.augury", whisper: true},
  foreshadow: {label: "A foreshadowing", table: "aid.foreshadow", whisper: true},
  relic: {label: "A relic", table: "aid.relic", rating: "Faith potential"},
  fetish: {label: "A fetish", table: "aid.fetish", rating: "Level"},
  talisman: {label: "A talisman", table: "aid.talisman", rating: "Rating"}
};

/** A suggested rating, 1 to 5, low ones far more often (house rule). */
export function suggestRating(rand) {
  const r = G.drawResult(rand, [{v: 1, weight: 8}, {v: 2, weight: 6}, {v: 3, weight: 4}, {v: 4, weight: 2}, {v: 5, weight: 1}]);
  return r?.v ?? 1;
}

/** Compose one aid. vars: {actor, place, person, places, people}. */
export function composeAid({kind, rand, tables, vars = {}} = {}) {
  const a = AIDS[kind];
  if ( !a ) return null;
  const fill = {actor: vars.actor ?? "The character", place: vars.place ?? pickOr(rand, vars.places, "a place long gone"),
    person: vars.person ?? pickOr(rand, vars.people, "someone half remembered")};
  const r = G.draw(a.table, {rand, tables, vars: fill});
  if ( !r ) return null;
  const out = {kind, label: a.label, text: r.text, place: fill.place, person: fill.person};
  if ( a.rating ) {
    out.rating = suggestRating(rand);
    out.ratingLabel = a.rating;
    out.text = r.text.charAt(0).toUpperCase() + r.text.slice(1);
  }
  return out;
}

/**
 * The chronicle's own places and people, for a character first: those in its log entries, then the rest.
 * entries: the tracker's log; scenes: [{name}]; actors: [{id, name, pc}].
 */
export function fragments({entries = [], scenes = [], actors = [], actor = null, notAPlace = /battle ?map|\bcombat\b|\btest\b|\(gate|^WoDX gate/i} = {}) {
  const mine = actor ? entries.filter(e => e.actor === actor) : entries;
  const seen = new Set();
  const uniq = list => list.filter(x => x && !seen.has(x) && seen.add(x));
  const places = uniq([...mine.map(e => e.place), ...scenes.map(s => s.name)].filter(p => p && !notAPlace.test(p)));
  seen.clear();
  const known = new Set(mine.flatMap(e => [e.with, e.npc].flat()).filter(Boolean));
  const people = uniq([...actors.filter(a => !a.pc && known.has(a.name)).map(a => a.name), ...actors.filter(a => !a.pc && !/^WoDX gate/i.test(a.name)).map(a => a.name)]);
  return {places: places.slice(0, 40), people: people.slice(0, 40)};
}

/** A plain-text summary of a night, for the queue's detail and the log. */
export function nightText(n) {
  const enc = n.encounters.map(e => `${e.label}: ${e.text}`).join(" ");
  const pulls = (n.pulls ?? []).filter(p => p.text).map(p => ` ${p.name} (${p.actorName}): ${p.text}`).join("");
  return `${n.opening} ${enc}${n.rumour ? ` Rumour: ${n.rumour}` : ""}${pulls}`.trim();
}
