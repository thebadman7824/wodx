import {MODULE_ID} from "./util.mjs";

/**
 * The WoDX conditions registry. Every line's module adds its own conditions here; each one becomes a token status
 * ("wodx-<id>") and can report the dice and difficulty it changes, so combat and action rolls read them in one place.
 * Pages are V20 Dark Ages unless the entry says otherwise.
 */

const registry = new Map();

/**
 * @typedef {object} Condition
 * @property {string} id
 * @property {string} name
 * @property {string} img
 * @property {string} source             Book and page
 * @property {string} summary            The rule, in a line, for cards and tooltips
 * @property {string[]} [lines]          The lines it applies to (empty: all)
 * @property {object} [mods]             Machine-readable effects:
 *   ownDiff: +difficulty on the bearer's own actions; ownDiffVision: only on actions needing sight;
 *   attackDiceVs: +dice for anyone attacking the bearer; autoHit: attacks hit without a roll;
 *   noAction: the bearer loses its next action; noDefense: the bearer cannot defend
 */

export const STATUS_PREFIX = "wodx-";

export function registerCondition(def) {
  if ( !def?.id || !def.name ) throw new Error("A condition needs an id and a name");
  const c = {lines: [], mods: {}, img: "icons/svg/aura.svg", ...def};
  registry.set(c.id, c);
  addStatus(c);
  return c;
}

function addStatus(c) {
  const list = globalThis.CONFIG?.statusEffects;
  if ( !Array.isArray(list) ) return;
  const id = STATUS_PREFIX + c.id;
  const existing = list.find(e => e.id === id);
  const entry = {id, name: c.name, img: c.img, hud: true, description: `${c.summary} (${c.source})`};
  if ( existing ) Object.assign(existing, entry);
  else list.push(entry);
}

export function getCondition(id) {
  return registry.get(String(id).replace(new RegExp(`^${STATUS_PREFIX}`), "")) ?? null;
}

export function listConditions() {
  return [...registry.values()];
}

/** The registered conditions an actor has, read from its statuses. */
export function conditionsOf(actor) {
  const statuses = actor?.statuses ?? new Set();
  const out = [];
  for ( const c of registry.values() ) if ( statuses.has?.(STATUS_PREFIX + c.id) ) out.push(c);
  return out;
}

export function hasCondition(actor, id) {
  return !!actor?.statuses?.has?.(STATUS_PREFIX + id);
}

/** Turn a condition on or off on an actor (its tokens show the status). */
export async function setCondition(actor, id, active = true) {
  const c = getCondition(id);
  if ( !c ) throw new Error(`Unknown condition ${id}`);
  if ( typeof actor?.toggleStatusEffect !== "function" ) return false;
  await actor.toggleStatusEffect(STATUS_PREFIX + c.id, {active});
  return true;
}

/**
 * What the conditions on both sides do to an attack.
 * @returns {{attackerDice: number, attackerDiff: number, autoHit: boolean, defenderCannotDefend: boolean, notes: string[]}}
 */
export function attackModifiers(attacker, defender) {
  const out = {attackerDice: 0, attackerDiff: 0, autoHit: false, defenderCannotDefend: false, notes: []};
  for ( const c of conditionsOf(attacker) ) {
    if ( c.mods.ownDiff ) { out.attackerDiff += c.mods.ownDiff; out.notes.push(`${attacker.name}: ${c.name}, +${c.mods.ownDiff} difficulty (${c.source})`); }
    else if ( c.mods.ownDiffVision ) { out.attackerDiff += c.mods.ownDiffVision; out.notes.push(`${attacker.name}: ${c.name}, +${c.mods.ownDiffVision} difficulty (${c.source})`); }
    if ( c.mods.noAction ) out.notes.push(`${attacker.name}: ${c.name}: ${c.summary} (${c.source})`);
  }
  for ( const c of conditionsOf(defender) ) {
    if ( c.mods.attackDiceVs ) { out.attackerDice += c.mods.attackDiceVs; out.notes.push(`${defender.name}: ${c.name}, +${c.mods.attackDiceVs} dice to hit (${c.source})`); }
    if ( c.mods.autoHit ) { out.autoHit = true; out.notes.push(`${defender.name}: ${c.name}: hit automatically; damage equals the damage pool, unrolled (${c.source})`); }
    if ( c.mods.noDefense || c.mods.autoHit ) out.defenderCannotDefend = true;
    if ( c.mods.ownDiffVision ) out.notes.push(`${defender.name}: ${c.name}, +${c.mods.ownDiffVision} difficulty to defend (${c.source})`);
  }
  return out;
}

/** Defence difficulty from the defender's own conditions (a blinded defender is at +2). */
export function defenseDifficulty(defender) {
  let d = 0;
  for ( const c of conditionsOf(defender) ) d += (c.mods.ownDiff ?? 0) + (c.mods.ownDiffVision ?? 0);
  return d;
}

/* -------------------------------------------- */
/*  The shared conditions                       */
/* -------------------------------------------- */

const VDA = "V20 Dark Ages";
export const CORE_CONDITIONS = [
  {id: "blinded", name: "Blinded", img: "icons/svg/blind.svg", source: `${VDA} p. 348`,
    summary: "Attacks against them gain two dice; they are at +2 difficulty on anything needing sight, defence included.",
    mods: {attackDiceVs: 2, ownDiffVision: 2}},
  {id: "crippled", name: "Crippled limb", img: "icons/svg/bones.svg", source: `${VDA} p. 348`,
    summary: "+2 difficulty on actions using that limb while the damage that caused it remains.",
    mods: {}},
  {id: "dazed", name: "Dazed", img: "icons/svg/daze.svg", source: `${VDA} p. 348`,
    summary: "A single attack did more damage after soak than Stamina (Stamina + 2 for the supernatural): they spend their next turn shaking it off.",
    mods: {noAction: true}},
  {id: "held", name: "Held", img: "icons/svg/net.svg", source: `${VDA} p. 348`,
    summary: "Struggling but immobilized: attacks against them gain two dice.",
    mods: {attackDiceVs: 2}},
  {id: "immobilized", name: "Completely immobilized", img: "icons/svg/padlock.svg", source: `${VDA} p. 348`,
    summary: "Tied, staked or paralyzed: they are hit automatically, for the damage pool without a roll.",
    mods: {autoHit: true}},
  {id: "staked", name: "Staked", img: "icons/svg/sword.svg", source: `${VDA} pp. 13, 348`, lines: ["vampire"],
    summary: "A wooden stake through the heart paralyzes a vampire (p. 13): completely immobilized until it is pulled out.",
    mods: {autoHit: true, noAction: true}},
  {id: "knockdown", name: "Knocked down", img: "icons/svg/falling.svg", source: `${VDA} p. 348`,
    summary: "On the ground. Standing is Dexterity + Athletics at difficulty 6: a failure loses the action; a success costs 2 Initiative next turn.",
    mods: {}},
  {id: "incapacitated", name: "Incapacitated", img: "icons/svg/unconscious.svg", source: `${VDA} p. 350`,
    summary: "Cannot move and is likely unconscious.",
    mods: {noAction: true, noDefense: true}},
  {id: "torpor", name: "Torpor", img: "icons/svg/sleep.svg", source: `${VDA} p. 351`, lines: ["vampire"],
    summary: "A deathlike sleep; its length comes from the Road. One more aggravated level means Final Death.",
    mods: {noAction: true, noDefense: true}},
  {id: "frenzy", name: "Frenzy", img: "icons/svg/terror.svg", source: `${VDA} pp. 356–357`, lines: ["vampire", "ghoul", "werewolf"],
    summary: "The Beast rules: they ignore wound penalties and go for their enemies, then anyone near. A scene usually suffices.",
    mods: {}},
  {id: "rotschreck", name: "Rötschreck", img: "icons/svg/fire.svg", source: `${VDA} p. 358`, lines: ["vampire"],
    summary: "The Red Fear: they flee fire or sunlight by any means.",
    mods: {}}
];

export function registerCoreConditions() {
  for ( const c of CORE_CONDITIONS ) registerCondition(c);
}

/** The Chronicle Rules page listing every registered condition. */
export function conditionsHTML() {
  const esc = v => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<p>Each condition is a token status. WoDX Combat reads them when it builds an attack.</p>
    <table><thead><tr><th>Condition</th><th>Rule</th><th>Source</th></tr></thead><tbody>
    ${listConditions().map(c => `<tr><td>${esc(c.name)}</td><td>${esc(c.summary)}</td><td>${esc(c.source)}</td></tr>`).join("")}
    </tbody></table>`;
}

export {MODULE_ID};
