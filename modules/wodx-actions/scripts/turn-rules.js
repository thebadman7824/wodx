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
  "animal form": {roll: {pool: "willpower", diff: "torment", onFail: {condition: "frenzy", end: false}}, page: "DtF p. 204", text: "Willpower at Torment each turn, or the beast takes over"},
  // B4838-B4849: the fourteen from the Powers Bounds Desk, built as Ben picked on 14 November 2026
  "summon the simple form": {line: "Vampire (V20)", each: {pool: {key: "willpower", points: -1, endIfEmpty: true}}, page: "V20 p. 222", text: "a Willpower point each turn keeps the object; with none left it is gone"},
  "clenched jaw": {on: "target", each: {damage: {pool: "caster:strength+1", type: "aggravated", soak: true, diff: 3}}, onBreak: {damage: {levels: 1, type: "lethal", soak: false}}, page: "W20 p. 172", text: "the jaws bite again each turn at difficulty 3; tearing free costs a lethal level"},
  "scabwalker curse": {on: "target", each: {damage: {levels: 1, type: "bashing", soak: true}}, skip: "Not touching anything made by people this turn", page: "W20 p. 187", text: "a bashing level each turn it touches anything made by people"},
  "one fights as many": {line: "Mage (Dark Ages)", shareWounds: "highest", page: "DA Mage p. 109", text: "the mage takes only the worst harm any self took each turn"},
  "bitter fruit": {line: "Mage (Dark Ages)", on: "target", only: true, rounds: "successes", roll: {pool: "stamina", diff: 7, onFail: {damage: {levels: 1, type: "lethal", soak: false}}}, endOnHeal: true, page: "DA Mage p. 69", text: "Stamina at 7 each turn for as many turns as the successes, or an unsoakable lethal level"},
  "tripping the ire": {line: "Changeling (C20)", counter: {start: "successes", label: "dice of Ire to share"}, each: {counter: -1}, page: "C20 p. 205", text: "a pool of dice to share each round, one smaller each round"},
  "ride the flames": {line: "Demon (DtF)", counter: {start: "successes", label: "square feet of fire"}, roll: {pool: "willpower", diff: 6, onFail: {counter: -1}}, page: "DtF p. 176", text: "Willpower at 6 each turn feeds the fire, or it shrinks; at nothing the body comes back"},
  "command the wind": {line: "Demon (DtF)", high: true, area: {radius: "faith", living: true, skipMasked: true}, each: {damage: {levels: 1, type: "bashing", soak: false}}, page: "DtF p. 184", text: "a choking wind: an unsoakable bashing level each turn to every living thing within Faith yards unless masked"},
  "cyclone": {line: "Demon (DtF)", counter: {start: "successes", label: "Strength of the whirlwind"}, area: {radius: "faith"}, each: {damage: {pool: "counter", type: "bashing", soak: true}, counter: -1}, page: "DtF p. 184", text: "the whirlwind rolls its Strength as bashing on all inside each turn, one weaker each turn"},
  "earth meld": {line: "Demon (DtF)", roll: {pool: "strength+athletics", diff: 6, onFail: {note: "held fast in the earth this turn"}}, page: "DtF p. 186", text: "Strength + Athletics each turn to move through the ground"},
  "invoke the storm": {line: "Demon (DtF)", rounds: "faith", area: {radius: "faith"}, strike: {die: 9, damage: {pool: "torment", type: "lethal", soak: true}}, page: "DtF p. 200", text: "lightning strikes at random each turn (a 9 or 10 per person inside), Torment lethal dice; rolls inside two harder"},
  "naming the body's destruction": {line: "Mummy (2nd)", on: "target", levelsEq: 3, roll: {pool: "stamina", diff: 8, onFail: {damage: {levels: 1, type: "lethal", soak: true}}}, endOnHeal: true, page: "MtR p. 124", text: "Stamina at 8 each turn or a lethal level, until the wound is treated"},
  "witch's nimbus": {line: "Orpheus", touch: true, page: "Orpheus pp. 104-105", text: "whatever lands a close blow takes the nimbus's lethal levels"},
  "blood pump": {line: "Werewolf (Changing Breeds)", flag: "noBloodCap", page: "W20 CB p. 67", text: "no limit on the blood spent each turn"}
};

/**
 * The record a casting puts on: numbers the book ties to the casting (successes, Faith, Torment) worked out now, and who
 * cast it, so each turn can roll the caster's pool and size an area. ctx: {successes, faith, torment, by (caster uuid)}.
 */
export function resolveRec(rec, ctx = {}) {
  if ( !rec ) return null;
  const at = v => v === "successes" ? Math.max(1, n(ctx.successes)) : v === "faith" ? Math.max(1, n(ctx.faith)) : n(v);
  const out = {...rec, byUuid: ctx.by ?? null, torment: n(ctx.torment) || null};
  if ( rec.rounds ) out.rounds = at(rec.rounds);
  if ( rec.counter ) out.counter = {...rec.counter, value: at(rec.counter.start)};
  if ( rec.area ) out.area = {...rec.area, yards: at(rec.area.radius)};
  // Nothing to roll or apply each turn: the record only marks the effect (a burning touch, a lifted limit, shared wounds)
  out.passive = !rec.each && !rec.roll && !rec.strike;
  return out;
}

/** Does this record go on this result? high: only the high-Torment form; levelsEq: only that much harm. */
export function fits(rec, out = {}) {
  if ( !rec ) return false;
  if ( rec.high && !out.high ) return false;
  if ( rec.levelsEq && n(out.levels) !== rec.levelsEq ) return false;
  return true;
}

/** The dice a damage step rolls: a number, the record's counter, the caster's Torment, or a caster pool by name. */
export function damageDice(dmg, rec, poolOf = () => 0) {
  if ( !dmg?.pool ) return 0;
  if ( typeof dmg.pool === "number" ) return dmg.pool;
  if ( dmg.pool === "counter" ) return n(rec?.counter?.value);
  if ( dmg.pool === "torment" ) return n(rec?.torment) || 3;
  const m = String(dmg.pool).match(/^caster:([a-z+]+?)(?:\+(\d+))?$/);
  if ( m ) return Math.max(1, n(poolOf(m[1])) + n(m[2]));
  return n(poolOf(dmg.pool));
}

/** A strike roll per person: true when its one die lands at the record's number or higher. */
export const struck = (rec, die) => !!rec?.strike && n(die) >= n(rec.strike.die || 9);

/** The highest harm any copy took (One Fights as Many): levels by copy, one number back. */
export const worstOf = levels => Math.max(0, ...levels.map(n));

/** The every-turn record for a power by name, or null. */
export function everyTurnOf(name, line = "") {
  const r = EVERY_TURN[String(name ?? "").replace(/^[•\s]+/, "").replace(/\s+\d+$/, "").trim().toLowerCase()] ?? null;
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
    if ( e.note ) out.push({kind: "note", text: e.note});
    if ( e.counter ) out.push({kind: "counter", by: e.counter});
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
