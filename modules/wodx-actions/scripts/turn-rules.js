/**
 * WoDX Actions: what happens each turn while a power holds (B4832-B4834). Pure rules, no Foundry; the Foundry side is
 * turns.js. Before this, a power whose book says "each turn" (a burrowing claw, a Willpower roll to hold a beast form
 * in check, a mind lost in the mists) only said so on its card. Now its timed effect carries an everyTurn record and
 * WoDX rolls or applies it on the affected character's turn in a fight:
 *   each   {damage: {levels, type, soak}} | {heal: {levels}} | {pool: {key, points}}   happens every turn, no roll
 *   roll   {who: "self", pool, diff, onFail: {...each, condition, end}, onWin: {end}}   a roll every turn
 * The specs below come from each power's book page (the power data's own summaries, which were page-checked).
 */

const n = v => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

/** Powers whose book rules act each turn, by name (lower case). */
export const EVERY_TURN = {
  "silver claws": {each: {pool: {key: "rage", points: 1}}, page: "DA:W p. 126", text: "a Rage point each turn the claws are silver"},
  "claws of the glassblower": {on: "target", each: {damage: {levels: 1, type: "aggravated", soak: true}}, page: "DA:W p. 130", text: "an aggravated level each turn until the glass is dug out"},
  "heart claw": {on: "target", each: {damage: {levels: 1, type: "lethal", soak: false}}, page: "W20 p. 173", text: "an unsoakable lethal level each turn until the claw is dug out"},
  "combat healing": {each: {heal: {levels: 1}}, page: "W20 p. 171", text: "heals one bashing or lethal level each turn of a fight"},
  "lost in the mists": {on: "target", roll: {pool: "willpower", diff: 8, onWin: {end: true}}, page: "C20 p. 200", text: "Willpower at 8 each turn to find the way out"},
  "scry": {on: "target", roll: {pool: "willpower", diff: 6, onFail: {damage: {levels: 1, type: "bashing", soak: true}}}, page: "DtF p. 182", line: "Demon (DtF)", text: "the watched one rolls Willpower at 6 each turn or takes a bashing level"},
  "animal form": {roll: {pool: "willpower", diff: "torment", onFail: {condition: "frenzy", end: false}}, page: "DtF p. 204", text: "Willpower at Torment each turn, or the beast takes over"}
};

/** The every-turn record for a power by name, or null. */
export function everyTurnOf(name, line = "") {
  const r = EVERY_TURN[String(name ?? "").replace(/^[•\s]+/, "").trim().toLowerCase()] ?? null;
  return r && (!r.line || !line || r.line === line) ? r : null;
}

/** Lasting harm (the Harm keyword's "lasts"): one more level each turn for the turns left. */
export function lastingHarm(out) {
  const turns = n(out?.lasting);
  if ( turns < 2 ) return null;
  return {on: "target", rounds: turns - 1, each: {damage: {levels: 1, type: out.type ?? "lethal", soak: out.soak !== false}}, text: `one more ${out.type ?? "lethal"} level each turn for ${turns - 1} turn${turns === 2 ? "" : "s"}`};
}

/** What one turn does: the steps the Foundry side runs. roll: {successes, botch} when the record has a roll. */
export function stepOf(rec, roll = null) {
  if ( !rec ) return [];
  const out = [];
  const add = e => {
    if ( !e ) return;
    if ( e.damage ) out.push({kind: "damage", ...e.damage});
    if ( e.heal ) out.push({kind: "heal", ...e.heal});
    if ( e.pool ) out.push({kind: "pool", ...e.pool});
    if ( e.condition ) out.push({kind: "condition", condition: e.condition});
    if ( e.end ) out.push({kind: "end"});
  };
  add(rec.each);
  if ( rec.roll && roll ) {
    const won = n(roll.successes) > 0 && !roll.botch;
    add(won ? rec.roll.onWin : rec.roll.onFail);
  }
  return out;
}

/** The roll's difficulty: a number, or the character's Torment. */
export const rollDiff = (diff, {torment = 0} = {}) => Math.max(3, Math.min(10, diff === "torment" ? (n(torment) || 6) : n(diff) || 6));
