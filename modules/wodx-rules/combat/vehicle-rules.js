/**
 * WoDX Combat: fighting with and around vehicles (decisions B4790 to B4799). Pure rules; vehicles.js does the Foundry
 * side. The vehicle a token is aboard comes from WoDX Interactables' rideOf(), with its body for the year
 * (chase-rules bodyOf: Durability, Structure, mass, shelter). From Mage: The Ascension 20th Anniversary pp. 459-463:
 *   - Durability: the health levels of damage it takes to get through the body; less bounces off. Structure: the damage
 *     it takes before it is wrecked;
 *   - those inside a closed vehicle are shielded by it unless the attack scores 4 or more successes (a shot through a
 *     window); military vehicles and aircraft shield them fully;
 *   - ramming: the vehicle's Durability in bashing dice, a die for every 10 mph, and its mass (cars +1, lorries +3,
 *     military +5); those inside a vehicle in a crash take it less the Durability, halved when strapped in;
 *   - the fuel tank: 3 or more successes on the attack and 6 or more levels of damage set it off, 12 dice of
 *     aggravated fire;
 *   - the driving pool never passes the vehicle's Maneuver.
 * The rest are house readings, named where they are used.
 */

/** Successes on the attack that find a way through a closed vehicle to the one inside (Mage 20th p. 459). */
export const SHOT_THROUGH = 4;
/** The fuel: successes on the attack and levels of damage that set it off, and the dice of fire (Mage 20th p. 459). */
export const FUEL_SUCCESSES = 3;
export const FUEL_LEVELS = 6;
export const FUEL_DICE = 12;
/** A yard a turn (three seconds) is about 0.68 mph; the book's 10 mph is about 14 yards a turn. */
export const YD_PER_MPH = 1.47;
export const RAM_DIFF = 6;

export const mphOf = yards => Math.max(0, Math.round((Number(yards) || 0) / YD_PER_MPH));

/** A vehicle with a body (not a beast, not on foot). ride: WoDX Interactables' rideOf(). */
export const hasBody = ride => !!(ride && ride.body && Number(ride.body.structure) > 0);
/** At the wheel, the helm, the controls or the reins of something with a body. */
export const atWheel = ride => hasBody(ride) && ride.role === "reins";

/**
 * Whether a blow at someone aboard a vehicle reaches them, or goes into the vehicle. sameVehicle: the attacker is
 * aboard it too (nothing is in the way). ram: the blow is a vehicle ramming it (it always strikes the body).
 * -> {shielded (the vehicle takes it), through (4 successes found a window), note}
 */
export function shelter(ride, {attackSuccesses = 0, sameVehicle = false, ram = false} = {}) {
  const none = {shielded: false, through: false, note: ""};
  if ( !hasBody(ride) || sameVehicle ) return none;
  const label = ride.label ?? "the vehicle";
  if ( ram ) return {shielded: true, through: false, note: `The ${lc(label)} takes the blow.`};
  if ( !ride.body.shelter ) return none;
  if ( ride.body.full ) return {shielded: true, through: false, note: `Inside the ${lc(label)}: its armour takes every blow from outside (Mage 20th pp. 461-462).`};
  if ( (Number(attackSuccesses) || 0) >= SHOT_THROUGH ) return {shielded: false, through: true, note: `${SHOT_THROUGH} or more successes: the shot finds a window of the ${lc(label)} (Mage 20th p. 459).`};
  return {shielded: true, through: false, note: `Fewer than ${SHOT_THROUGH} successes: the ${lc(label)} takes it, not the one inside (Mage 20th p. 459).`};
}

/**
 * Damage to a vehicle's body. levels: health levels of damage (the damage roll's successes; a body does not soak).
 * Up to its Durability bounces off; the rest comes off its Structure (house reading B4791). lostBefore: Structure lost
 * already. -> {lost (this blow), total, wrecked, bounced, structure}
 */
export function hullBlow(body, levels = 0, lostBefore = 0) {
  const dur = Math.max(0, Number(body?.durability) || 0), max = Math.max(0, Number(body?.structure) || 0);
  const l = Math.max(0, Math.round(Number(levels) || 0)), before = Math.max(0, Math.round(Number(lostBefore) || 0));
  const lost = Math.max(0, l - dur);
  const total = Math.min(max, before + lost);
  return {lost, total, wrecked: max > 0 && total >= max, bounced: lost === 0, structure: max, durability: dur};
}

/** Whether a hit sets the fuel off: a motor vehicle, 3+ successes to hit, 6+ levels of damage (Mage 20th p. 459). */
export function fuelGoes(ride, {attackSuccesses = 0, levels = 0} = {}) {
  return !!(hasBody(ride) && ride.motor && (Number(attackSuccesses) || 0) >= FUEL_SUCCESSES && (Number(levels) || 0) >= FUEL_LEVELS);
}

/**
 * Ramming: Durability + a die a 10 mph + mass, bashing (Mage 20th p. 459). yards: ground the vehicle covered this turn.
 * -> {dice, parts: [labels], mph}
 */
export function ramDice(ride, yards = 0) {
  if ( !hasBody(ride) ) return {dice: 0, parts: [], mph: 0};
  const mph = mphOf(yards), speed = Math.floor(mph / 10), b = ride.body;
  const parts = [`Durability ${b.durability}`];
  if ( speed ) parts.push(`${mph} mph +${speed}`);
  if ( b.mass ) parts.push(`its mass +${b.mass}`);
  return {dice: b.durability + speed + (b.mass || 0), parts, mph};
}

/**
 * Seat belts and harness: aircraft always; cars and lorries from 1970 (house reading B4793, when belts were worn).
 */
export function strapped(ride, year = ride?.year ?? 0) {
  if ( !hasBody(ride) ) return false;
  if ( ride.air ) return true;
  return ["car", "truck"].includes(ride.kind) && (Number(year) || 0) >= 1970;
}

/**
 * What a crash does to someone inside: the impact's dice less the vehicle's Durability (and a lorry's extra guard),
 * halved when strapped in (Mage 20th p. 459). Nothing for those on a vehicle with no closed body: they take the
 * whole blow as anyone in the way would. -> dice of bashing
 */
export function crashDice(ride, impactDice = 0, {year = ride?.year ?? 0} = {}) {
  if ( !hasBody(ride) ) return 0;
  const b = ride.body;
  const left = Math.max(0, (Number(impactDice) || 0) - (b.shelter ? b.durability + (b.guard || 0) : 0));
  return strapped(ride, year) ? Math.floor(left / 2) : left;
}

/**
 * The driving pool, held to the vehicle's Maneuver (Mage 20th p. 458; V20 core printed p. 259). -> {dice, held}
 */
export function maneuverCap(ride, dice = 0) {
  const d = Math.max(0, Math.round(Number(dice) || 0)), m = ride?.maneuver;
  if ( m === null || m === undefined || !Number.isFinite(Number(m)) ) return {dice: d, held: false};
  return {dice: Math.min(d, Number(m)), held: d > Number(m)};
}

/**
 * Swerving: someone at the wheel defends by moving the vehicle, Dexterity + its driving Ability held to the Maneuver,
 * at 6, +2 against shots, as a dodge (house reading B4794). Everyone else aboard is sat down and cannot dodge: the
 * body shields them, or the swerve does. -> plan {type: "swerve", valid, dice, diff, notes, abilityName, why}
 */
export function swerve(ride, {dex = 0, dots = 0, ranged = false, wounds = 0} = {}) {
  if ( !atWheel(ride) ) return {type: "swerve", valid: false, why: "not at the wheel of a vehicle"};
  if ( ride.wrecked ) return {type: "swerve", valid: false, why: "it is wrecked"};
  const raw = Math.max(0, (Number(dex) || 0) + (Number(dots) || 0) + (Number(wounds) || 0));
  const cap = maneuverCap(ride, raw);
  const skill = skillLabel(ride.skill);
  const notes = [`Dexterity + ${skill}${cap.held ? `, held to its Maneuver ${ride.maneuver}` : ""}`];
  let diff = 6;
  if ( ranged ) { diff += 2; notes.push("swerving from shots +2 diff"); }
  return {type: "swerve", valid: cap.dice > 0, dice: cap.dice, diff, notes, abilityName: skill, why: cap.dice > 0 ? "" : "no dice"};
}

/** Aboard and sat down: no dodge on foot (B4794). Who is at the wheel swerves instead. */
export const seated = ride => hasBody(ride) && !ride.saddle;

/** The Ability's name. */
export const skillLabel = s => s === "drive" ? "Drive" : s === "pilot" ? "Pilot" : s === "athletics" ? "Athletics" : "Ride";

/** A ram is a weapon on the attack menu only at the wheel of a motor vehicle, or reins of a cart or carriage. */
export const canRam = ride => atWheel(ride) && !ride.air && !ride.water && !ride.wrecked;

function lc(s) { return String(s ?? "").replace(/^[A-Z](?=[a-z])/, c => c.toLowerCase()); }
