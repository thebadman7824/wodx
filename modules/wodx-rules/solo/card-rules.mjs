/**
 * WoDX Solo: card scenes, the rest of step 3 of The Lone Chronicle (B6040 to B6044). Pure rules, no Foundry, so the
 * harness can test them; card.mjs does the Foundry side.
 *
 * Most towns on the country map (WoDX Storyteller's data/country.mjs) have no map drawn in the world. A lone player can
 * still go there: the seat makes a card scene for the town the first time, a plain square of ground with a grid and a
 * card in the middle that says where the character is (the town, the year and hour, the weather, the lie of the land,
 * the river and the road), and the trip there is the Travel window's own trip, with its time, fares and road
 * encounters. Looking around takes half an hour and may bring the town's people onto the card scene.
 */

/** The card scene's ground: a dark square with a grid, lit, so the card can be read and tokens can stand on it. */
export const CARD_SCENE = {
  width: 2400, height: 1600, padding: 0.1, backgroundColor: "#16120d",
  grid: {size: 100, type: 1},
  tokenVision: false,
  environment: {darknessLevel: 0.35, globalLight: {enabled: true}},
  initial: {x: 1200, y: 800, scale: 0.8}
};
/** The card drawn on the scene, in pixels from the top left of the map (padding not counted). */
export const CARD_BOX = {x: 500, y: 150, width: 1400, height: 700};
/** Where the character stands when they arrive: below the card, in the middle. */
export const CARD_ARRIVE = {x: 1150, y: 1100};
/** Looking around takes this long on the character's own clock. */
export const LOOK_MINUTES = 30;

const DIR_WORDS = {N: "north", NE: "north-east", E: "east", SE: "south-east", S: "south", SW: "south-west", W: "west", NW: "north-west"};
const ROAD_WORDS = {road: "a road", highway: "a highway", motorway: "a motorway"};

/**
 * The towns a lone player may go to that have no map: those standing in the year, less those a scene already sits at.
 * towns: [{id, name, since}]; mapped: town ids with a scene of their own. -> [{id, name}] by name
 */
export function cardTowns({towns = [], year = 0, mapped = []} = {}) {
  const have = new Set(mapped);
  const y = Number(year) || 0;
  return towns.filter(t => t?.id && !have.has(t.id) && y >= (Number(t.since) || 0))
    .map(t => ({id: t.id, name: String(t.name ?? t.id)}))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The town a scene sits at on the country map (only the town itself, not a spot some km off), or null. */
export function sceneTown(travel) {
  const at = travel?.at;
  if ( !at?.town ) return null;
  return (Number(at.km) || 0) === 0 ? String(at.town) : null;
}

/** One in ten, in words, for how wooded the land is. */
function woodsWords(w) {
  const n = Math.round((Number(w) || 0) * 10);
  if ( n <= 1 ) return "Little woodland; open fields all round.";
  if ( n <= 3 ) return "Copses and hedges between the fields.";
  if ( n <= 6 ) return "Woods close in on the fields from every side.";
  return "Deep forest, broken only by clearings and the track.";
}

/**
 * The card's words. name: the town; year; time: the hour in words; weather: a sentence or null; land: Storyteller
 * country landAt(). -> {title, lines}
 */
export function cardLines({name = "", year = 0, time = "", weather = null, land = null} = {}) {
  const lines = [];
  const when = [year ? `The year ${year}` : "", time].filter(Boolean).join(", ");
  if ( when ) lines.push(`${when}.`);
  if ( weather ) lines.push(String(weather).trim());
  if ( land ) {
    lines.push(`${land.landName ? `${land.landName}: ` : ""}${land.words ?? "open country"}.`);
    const r = land.river;
    if ( r?.name ) lines.push(r.km ? `The ${r.name} runs ${r.km} km to the ${DIR_WORDS[r.side] ?? "side"}.` : `The ${r.name} runs through the town.`);
    lines.push(woodsWords(land.woods));
    lines.push(land.road ? `The best way in is ${ROAD_WORDS[land.road] ?? "a road"}.` : "No made road comes here; tracks and paths only.");
  }
  lines.push("No map of this place is drawn. Look around to see who is about, or ask the oracle what you find.");
  return {title: String(name), lines};
}

/** The card as the text of a drawing on the scene. */
export const cardText = card => [card.title.toUpperCase(), "", ...card.lines].join("\n");
