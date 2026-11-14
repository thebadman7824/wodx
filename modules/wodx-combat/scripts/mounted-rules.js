/**
 * WoDX Combat: fighting from the saddle, after the books (decisions B4770 to B4776). Pure rules; mounted.js does the
 * Foundry side. What the book check of 12 November 2026 (project files ride-load-book-check.md) left unbuilt:
 *   - the rider using the mount's Attributes in combat actions, and the mount taking one defensive action a turn for
 *     its rider without costing the rider an action (V20 Dark Ages printed p. 399);
 *   - Stamina + Ride to keep the saddle when hit, with a fall of 2 to 4 dice (Dark Ages: Vampire pp. 244-245, Dark Ages
 *     Companion p. 38);
 *   - the lance: Ride 3 and Melee 3 to use it well, a lance charge knocking the target down or out of the saddle, and a
 *     botch (Dark Ages: Vampire pp. 244-245);
 *   - a bow shot from a moving horse at +2, at a trot or faster +4, unless the archer has the Mounted specialty
 *     (Dark Ages: Vampire pp. 244-245).
 * Hooves and a saddle only (a horse or a mule): a motorcycle has no Attributes of its own and does not dodge.
 */

/**
 * A mount's traits. V20 Dark Ages printed p. 399 gives a small and a large horse; a riding or war horse is the large
 * one. The books give no mule, so a mule or donkey takes the small horse's (house reading B4770).
 */
export const MOUNT_TRAITS = {
  horse: {label: "the horse", strength: 6, dexterity: 2, stamina: 5, athletics: 3, brawl: 1, ref: "V20 Dark Ages p. 399 (large horse)"},
  mule:  {label: "the mule", strength: 4, dexterity: 2, stamina: 3, athletics: 3, brawl: 1, ref: "V20 Dark Ages p. 399 (small horse, for a mule: house reading)"}
};

/** A beast under the rider: a saddle and hooves, at the reins. ride: WoDX Interactables' rideOf(). */
export const inSaddle = ride => !!(ride && ride.saddle && ride.hooves && ride.role === "reins");
/** Any seat on a saddled beast (the one at the reins or behind them): who can be thrown. */
export const onBeast = ride => !!(ride && ride.saddle && ride.hooves);
/** Anything sat astride that can throw its rider (a horse, a mule, a motorcycle). */
export const astride = ride => !!(ride && ride.saddle);

export function traitsOf(ride) {
  if ( !inSaddle(ride) ) return null;
  return MOUNT_TRAITS[ride.kind] ?? MOUNT_TRAITS.horse;
}

/**
 * The Attribute a blow from the saddle is struck with. In a fight the rider may use the horse's Attributes in place of
 * their own (V20 Dark Ages p. 399). WoDX reads it for blows struck from the saddle (close combat): the higher of
 * the rider's and the mount's Strength and Dexterity. Stamina stays the rider's: the blow lands on the rider's body,
 * not the horse's (house reading B4770). -> {value, mount (true when the mount's was used), note}
 */
export function strikeAttr(ride, key, riderValue = 0, {close = true} = {}) {
  const own = Math.max(0, Number(riderValue) || 0);
  const t = traitsOf(ride);
  if ( !t || !close || !["strength", "dexterity"].includes(key) ) return {value: own, mount: false, note: ""};
  const m = Number(t[key]) || 0;
  if ( m <= own ) return {value: own, mount: false, note: ""};
  return {value: m, mount: true, note: `${cap(key)} ${m} from ${t.label} in place of the rider's ${own} (${t.ref.split(" (")[0]})`};
}

/**
 * The mount's own defense for its rider: one a turn, and it costs the rider no action (V20 Dark Ages p. 399). The
 * book expects a dodge, so the beast dodges with its Dexterity + Athletics. The rider steers it, so the
 * Athletics counts for no more than the rider's Ride, as every Ability in the saddle does (house reading B4771).
 * Dodging shots is +2, as for anyone. used: the mount has already defended this turn.
 * -> {type: "mount", valid, dice, diff, notes, abilityName, why}
 */
export function mountDodge(ride, {rideDots = 0, ranged = false, used = false, celerity = false} = {}) {
  const t = traitsOf(ride);
  if ( !t ) return {type: "mount", valid: false, why: "not in the saddle"};
  if ( used ) return {type: "mount", valid: false, why: `${t.label} has already moved its rider out of harm's way this turn`};
  const ath = Math.min(t.athletics, Math.max(0, Number(rideDots) || 0));
  const notes = [`${t.label}'s Dexterity ${t.dexterity} + Athletics ${ath}${ath < t.athletics ? ` (held to the rider's Ride ${ath})` : ""}, at no cost to the rider (${t.ref.split(" (")[0]})`];
  let diff = 6;
  if ( ranged && !celerity ) { diff += 2; notes.push("dodging missiles +2 diff"); }
  return {type: "mount", valid: true, dice: t.dexterity + ath, diff, notes, abilityName: `Athletics, ${t.label}'s`, label: t.label};
}

/**
 * Whether the automatic defense should be the mount's. It costs the rider nothing, so it goes first unless the rider's
 * own best defense is clearly better (a whole expected success or more).
 */
export function preferMount(mountExpected = 0, riderExpected = 0) {
  return (Number(mountExpected) || 0) > 0 && (Number(riderExpected) || 0) - (Number(mountExpected) || 0) < 1;
}

/**
 * Keeping the saddle when struck (Dark Ages: Vampire pp. 244-245): Stamina + Ride (Drive on a motorcycle), and the
 * suggested difficulty is the attacker's successes on the damage before soak. Below 2 is no test at all: WoDX starts
 * at 3 so that a glancing blow still asks a roll (house reading B4772); 10 at most. -> difficulty
 */
export function saddleDiff(damageSuccesses = 0) {
  return Math.max(3, Math.min(10, Math.round(Number(damageSuccesses) || 0)));
}

/**
 * The fall: 2 to 4 dice by the ground (Dark Ages Companion p. 38; Dark Ages: Vampire pp. 244-245), bashing and
 * soakable, lethal on a botched saddle roll. The ground is WoDX Interactables' chase ground: soft fields 2, a road or
 * town streets 3, rough ground, rocks or a crowd 4 (house reading B4772). Into water: no dice.
 */
export const FALL_DICE = {open: 2, road: 3, streets: 3, crowd: 4, rough: 4, indoors: 3, water: 0};
export const fallDice = (ground = "streets") => FALL_DICE[ground] ?? 3;

/**
 * The saddle roll's result. successes, botch: the Stamina + Ride roll. -> {kept, thrown, lethal, note}
 */
export function saddleResult({successes = 0, botch = false} = {}) {
  if ( botch ) return {kept: false, thrown: true, lethal: true, note: "a botch: thrown hard, and the fall is lethal"};
  if ( (Number(successes) || 0) > 0 ) return {kept: true, thrown: false, lethal: false, note: "stays in the saddle"};
  return {kept: false, thrown: true, lethal: false, note: "thrown from the saddle"};
}

/** A lance: the mounted weapon by its name (never a fire lance, the early gun). */
export const isLance = w => /\blance\b/i.test(String(w?.name ?? "")) && !/fire[- ]?lance/i.test(String(w?.name ?? "")) && !w?.ranged;

/**
 * The lance from the saddle (Dark Ages: Vampire pp. 244-245).
 *  - Using one well needs Ride 3 and Melee 3. Otherwise a hit jars the user as well: bashing dice equal to the lethal
 *    the lance dealt (WoDX reads it as the damage successes before soak, house reading B4773).
 *  - A botch: 4 lethal dice to the user, and Stamina + Ride at 6 to stay mounted.
 *  - A lance charge (the rider covered ground this turn, the mounted charge) that hits: the target rolls Strength +
 *    Athletics at 6 or goes down, and a rider is unhorsed and takes the fall's 2 to 4 dice besides the lance's.
 * opts: {rideDots, meleeDots, hit, botch, charge (charge dice this blow), damageSuccesses}
 * -> {skilled, backfire (bashing dice to the user), botchDice, botchSaddleDiff, knock (the target must roll), notes}
 */
export const LANCE_SKILL = 3;
export const LANCE_BOTCH_DICE = 4;
export function lanceBlow({rideDots = 0, meleeDots = 0, hit = false, botch = false, charge = 0, damageSuccesses = 0} = {}) {
  const skilled = (Number(rideDots) || 0) >= LANCE_SKILL && (Number(meleeDots) || 0) >= LANCE_SKILL;
  const notes = [];
  const out = {skilled, backfire: 0, botchDice: 0, botchSaddleDiff: 0, knock: false, notes};
  if ( botch ) {
    out.botchDice = LANCE_BOTCH_DICE; out.botchSaddleDiff = 6;
    notes.push(`a botched lance: ${LANCE_BOTCH_DICE} lethal dice to the rider, and Stamina + Ride at 6 to stay mounted`);
    return out;
  }
  if ( !hit ) return out;
  if ( !skilled && damageSuccesses > 0 ) {
    out.backfire = Math.round(Number(damageSuccesses) || 0);
    notes.push(`no Ride ${LANCE_SKILL} and Melee ${LANCE_SKILL}: the shock runs back up the lance, ${out.backfire} bashing ${out.backfire === 1 ? "die" : "dice"} to the rider`);
  }
  if ( (Number(charge) || 0) > 0 ) {
    out.knock = true;
    notes.push("a lance charge: the target rolls Strength + Athletics at 6 or is knocked down, and a rider is unhorsed");
  }
  return out;
}

/**
 * A bow shot from a horse (Dark Ages: Vampire pp. 244-245): +2 while the horse moves, +4 at a trot or faster, none with
 * the archer's Mounted specialty. WoDX counts the yards ridden this turn: any at all is moving, half the mount's pace
 * or more is a trot or faster (house reading B4774). The book's figure replaces the saddle's own +1 on shots
 * (house rule B2441), which a still horse keeps. close: the shot is at someone in reach (the saddle's +1 was not
 * counted). -> {diff (to add to the attack), note}
 */
export function mountedShot(ride, {bow = false, yards = 0, specialty = false, close = false} = {}) {
  if ( !inSaddle(ride) || !bow ) return {diff: 0, note: ""};
  const moved = Math.max(0, Number(yards) || 0), pace = Math.max(1, Number(ride.yards) || 0);
  if ( !moved ) return {diff: 0, note: ""};
  const fast = moved >= pace / 2;
  const book = specialty ? 0 : fast ? 4 : 2;
  const house = close ? 0 : 1;
  const diff = book - house;
  const how = fast ? "at a trot or faster" : "from a moving horse";
  const note = specialty ? `Shooting ${how} with the Mounted specialty: no penalty (Dark Ages: Vampire p. 244)`
    : `Shooting ${how}: +${book} difficulty in place of the saddle's +1 (Dark Ages: Vampire p. 244)`;
  return {diff, note};
}
/** Whether a specialty text names riding: "Mounted", "From horseback", "Horse archery". */
export const mountedSpecialty = s => /mount|horseback|horse|saddle/i.test(String(s ?? ""));

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
