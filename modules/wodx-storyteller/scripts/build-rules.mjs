/**
 * WoDX Storyteller 0.25.0: putting up a building. No Foundry calls here.
 *
 * A building is a long task in stages (groundwork, walls, roof, fitting out), each an extended action of its own
 * (V20 pp. 251-252; V20 Dark Ages p. 324) on Dexterity + Crafts. Hired hands, retainers and allied NPCs each add a
 * die (house rule, B843). Each stage is paid for when it starts, from the builder's purse; with too little money the
 * work waits. When the last stage is done the place exists: a Region on the scene tagged with its kind and owner,
 * and the matching map from the building kit when the kit has one.
 *
 * The kinds, their years and their kit keys follow WoDX's map generator (tools/mapgen buildings.py and eratypes.py),
 * so a finished build can use the same plans. Values are months of a working wage (money-rules wageAt); stage
 * lengths and costs are house figures, not the books.
 */

/** How it is built: the stages, each with successes needed and the time for one roll. */
export const METHODS = {
  timber: {label: "Timber and wattle", interval: "day", stages: [["Groundwork", 3], ["Frame and walls", 6], ["Roof", 4], ["Fitting out", 3]]},
  stone: {label: "Stone", interval: "week", stages: [["Foundations", 6], ["Walls", 12], ["Roof", 6], ["Fitting out", 5]]},
  great: {label: "Great stone work", interval: "month", stages: [["Foundations", 10], ["Walls", 20], ["Vaults and roof", 10], ["Fitting out", 8]]},
  brick: {label: "Brick", interval: "week", stages: [["Foundations", 6], ["Walls and floors", 12], ["Roof", 5], ["Fitting out", 6]]},
  concrete: {label: "Concrete and steel", interval: "week", stages: [["Foundations", 5], ["Frame", 10], ["Walls and glazing", 6], ["Fitting out", 6]]},
  prefab: {label: "Prefabricated", interval: "day", stages: [["Groundwork", 3], ["Putting it up", 5], ["Fitting out", 3]]},
  printed: {label: "Printed", interval: "day", stages: [["Site", 2], ["Printing", 6], ["Fitting out", 3]]}
};

/**
 * Each kind: label, place (the place kind its Region gets), from/to years, method (or [[year, method], ...] when it
 * changes), value in months of wage, earns: the share of its value it brings each month when let or worked
 * (house rule), kit: the map generator's type key, or null when the kit has no plan for it.
 */
export const BUILDINGS = {
  "cottage": {label: "Cottage", place: "home", from: -10000, to: 1950, method: [[-10000, "timber"], [1700, "brick"]], value: 12, kit: "cottage"},
  "byre-house": {label: "Byre-house", place: "home", from: -10000, to: 1900, method: "timber", value: 18, kit: "byre-house"},
  "barn": {label: "Barn", place: "workplace", from: -10000, to: 2099, method: [[-10000, "timber"], [1900, "prefab"]], value: 6, kit: "barn"},
  "coop": {label: "Coop or shed", place: "workplace", from: -10000, to: 2099, method: "timber", value: 1, kit: "coop"},
  "smithy": {label: "Smithy", place: "workplace", from: -10000, to: 1950, method: [[-10000, "timber"], [1500, "stone"]], value: 24, earns: 0.02, kit: "smithy"},
  "tavern": {label: "Tavern", place: "tavern", from: -10000, to: 1900, method: [[-10000, "timber"], [1500, "stone"]], value: 60, earns: 0.02, kit: "tavern"},
  "chapel": {label: "Chapel", place: "church", from: -10000, to: 2099, method: "stone", value: 80, kit: "chapel"},
  "townhouse": {label: "House and shop", place: "home", from: 1197, to: 1700, method: [[1197, "timber"], [1400, "stone"]], value: 60, earns: 0.01, kit: "townhouse"},
  "workshop": {label: "Workshop", place: "workplace", from: -10000, to: 1900, method: "timber", value: 24, earns: 0.02, kit: "workshop"},
  "bakehouse": {label: "Bakehouse", place: "workplace", from: -10000, to: 1900, method: "stone", value: 24, earns: 0.02, kit: "bakehouse"},
  "storehouse": {label: "Storehouse", place: "workplace", from: -10000, to: 1950, method: "timber", value: 12, kit: "storehouse"},
  "guardhouse": {label: "Guardhouse", place: "gate", from: 1197, to: 1800, method: "stone", value: 20, kit: "guardhouse"},
  "water-mill": {label: "Water mill", place: "workplace", from: 1197, to: 1900, method: "stone", value: 120, earns: 0.02, kit: null},
  "manor": {label: "Manor house", place: "home", from: 1197, to: 1918, method: "stone", value: 400, kit: null},
  "keep": {label: "Keep or small castle", place: "castle", from: 1197, to: 1600, method: "great", value: 2000, kit: null},
  "church": {label: "Stone church", place: "church", from: 1197, to: 2099, method: "great", value: 600, kit: null},
  "arcade-house": {label: "Arcaded house", place: "home", from: 1450, to: 1700, method: "stone", value: 120, earns: 0.01, kit: "arcade-house"},
  "sgraffito-house": {label: "Sgraffito house", place: "home", from: 1500, to: 1650, method: "stone", value: 120, kit: "sgraffito-house"},
  "town-hall": {label: "Town hall", place: "workplace", from: 1450, to: 1800, method: "great", value: 600, kit: "town-hall"},
  "ghetto-house": {label: "House in the Jewish quarter", place: "home", from: 1450, to: 1850, method: "stone", value: 50, kit: "ghetto-house"},
  "baroque-house": {label: "Baroque burgher house", place: "home", from: 1650, to: 1820, method: "stone", value: 150, kit: "baroque-house"},
  "post-inn": {label: "Post inn", place: "tavern", from: 1600, to: 1860, method: "stone", value: 200, earns: 0.02, kit: "post-inn"},
  "manufactory": {label: "Cloth manufactory", place: "workplace", from: 1700, to: 1840, method: "brick", value: 400, earns: 0.02, kit: "manufactory"},
  "mill": {label: "Textile mill", place: "workplace", from: 1840, to: 1960, method: "brick", value: 1500, earns: 0.02, kit: "mill"},
  "tenement": {label: "Courtyard tenement", place: "home", from: 1860, to: 1914, method: "brick", value: 300, earns: 0.015, kit: "tenement"},
  "villa": {label: "Villa", place: "home", from: 1860, to: 1914, method: "brick", value: 250, kit: "villa"},
  "school": {label: "School", place: "workplace", from: 1870, to: 1960, method: "brick", value: 400, kit: "school"},
  "office-block": {label: "Office block", place: "workplace", from: 1900, to: 2099, method: "concrete", value: 2000, earns: 0.015, kit: null},
  "hut": {label: "Army hut", place: "workplace", from: 1914, to: 1950, method: "prefab", value: 30, kit: "hut"},
  "bunker": {label: "Bunker", place: "haven", from: 1914, to: 2099, method: "concrete", value: 300, kit: null},
  "bata-house": {label: "Brick family house", place: "home", from: 1924, to: 1950, method: "brick", value: 40, kit: "bata-house"},
  "func-villa": {label: "Functionalist villa", place: "home", from: 1928, to: 1948, method: "concrete", value: 200, kit: "func-villa"},
  "dept-store": {label: "Department store", place: "market", from: 1930, to: 1990, method: "concrete", value: 1200, earns: 0.02, kit: "dept-store"},
  "culture-house": {label: "House of culture", place: "tavern", from: 1950, to: 1990, method: "concrete", value: 800, kit: "culture-house"},
  "panel-block": {label: "Panel block", place: "home", from: 1958, to: 1990, method: "prefab", value: 3000, earns: 0.015, kit: "panel-block"},
  "petrol-station": {label: "Petrol station shop", place: "workplace", from: 1990, to: 2060, method: "prefab", value: 150, earns: 0.02, kit: "petrol-station"},
  "suburban-house": {label: "Detached house", place: "home", from: 1992, to: 2099, method: "concrete", value: 120, kit: "suburban-house"},
  "hypermarket": {label: "Supermarket", place: "market", from: 1995, to: 2099, method: "prefab", value: 2500, earns: 0.02, kit: "hypermarket"},
  "printed-house": {label: "Printed house", place: "home", from: 2020, to: 2099, method: "printed", value: 30, kit: "printed-house"},
  "capsule-tower": {label: "Capsule tower", place: "home", from: 2030, to: 2099, method: "concrete", value: 2000, earns: 0.015, kit: "capsule-tower"},
  "vertical-farm": {label: "Vertical farm", place: "workplace", from: 2035, to: 2099, method: "concrete", value: 1500, earns: 0.02, kit: "vertical-farm"}
};
/** Upkeep each month, a share of the value (house rule). */
export const UPKEEP = 0.01;
/** Most dice workers can add. */
export const MAX_WORKERS = 10;

const y0 = v => Number(v) || 0;
export const methodAt = (b, year) => {
  if ( typeof b?.method === "string" ) return b.method;
  let m = b?.method?.[0]?.[1] ?? "timber";
  for ( const [from, k] of b?.method ?? [] ) if ( y0(year) >= from ) m = k;
  return m;
};

/** The kinds that can be put up in a year, oldest first. */
export function buildingsAt(year) {
  const y = y0(year);
  return Object.entries(BUILDINGS).filter(([, b]) => y >= b.from && y <= b.to).map(([key, b]) => ({key, ...b, method: methodAt(b, y)}));
}

/**
 * The long task for a building. wage: the monthly wage now (money-rules wageAt). Each stage carries its share of
 * the cost in the smallest unit. Returns {ok, why, task}.
 */
export function buildTask(key, year, {wage = 0, workers = 0, owner = null, scene = "", name = ""} = {}) {
  const b = BUILDINGS[key];
  if ( !b ) return {ok: false, why: "No such kind of building."};
  const y = y0(year);
  if ( y < b.from ) return {ok: false, why: `Nobody builds a ${b.label.toLowerCase()} before about ${b.from}.`};
  if ( y > b.to ) return {ok: false, why: `Nobody builds a ${b.label.toLowerCase()} after about ${b.to}.`};
  const mk = methodAt(b, y), m = METHODS[mk];
  const total = Math.round(b.value * y0(wage));
  const share = Math.round(total / m.stages.length);
  const stages = m.stages.map(([n, goal], i) => ({name: n, goal, cost: i === m.stages.length - 1 ? total - share * (m.stages.length - 1) : share}));
  return {ok: true, why: "", task: {kind: "build", name: name || `Build a ${b.label.toLowerCase()}`, attr: "dexterity", ability: "crafts", diff: 6,
    goal: stages[0].goal, interval: m.interval, delicate: false, building: key, stages, stage: 0, paidStage: -1,
    workers: Math.max(0, Math.min(MAX_WORKERS, Math.round(y0(workers)))), owner, scene, cost: total,
    note: `${m.label}: ${stages.map(s => s.name.toLowerCase()).join(", ")}.`}};
}

/** After a successful roll: the stage it finished moves the build on. Returns the patch or null. */
export function nextStage(task) {
  const st = task?.stages ?? [];
  const i = y0(task?.stage);
  if ( !st.length || i >= st.length - 1 ) return null;
  return {stage: i + 1, goal: st[i + 1].goal, total: 0};
}

/** Value, upkeep and income each month for a holding, in the smallest unit. */
export function holdingMoney(key, wage, {value = null, upkeep = null, earns = null} = {}) {
  const b = BUILDINGS[key] ?? {value: 0};
  const v = Number.isFinite(value) ? value : Math.round(y0(b.value) * y0(wage));
  return {value: v, upkeep: Number.isFinite(upkeep) ? upkeep : Math.round(v * UPKEEP),
    income: Number.isFinite(earns) ? earns : Math.round(v * (b.earns ?? 0))};
}

/** Building kit keys, for the PC job that makes their maps. */
export const KIT_KEYS = [...new Set(Object.values(BUILDINGS).map(b => b.kit).filter(Boolean))];

/** What a working place supplies its market with (a goods category), by kind of building. */
export const WORKS = {smithy: "tools", tavern: "drink", "post-inn": "drink", workshop: "house", bakehouse: "food", "water-mill": "food",
  townhouse: "cloth", "arcade-house": "cloth", manufactory: "cloth", mill: "cloth", "dept-store": "house", hypermarket: "food",
  "petrol-station": "fuel", "vertical-farm": "food", barn: "food"};
