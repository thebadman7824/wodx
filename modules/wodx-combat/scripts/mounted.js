/**
 * WoDX Combat: fighting from the saddle, the Foundry side of mounted-rules.js (decisions B4770 to B4776). Reads the
 * mount a token is on from WoDX Interactables (movement.js rideOf). What it adds to an attack:
 *   - a blow from the saddle may use the mount's Strength and Dexterity (V20 Dark Ages p. 399);
 *   - the mount dodges once a turn for its rider, at no cost to the rider (V20 Dark Ages p. 399);
 *   - a rider struck rolls Stamina + Ride to keep the saddle; thrown, the token comes off the mount on the map, lies
 *     Knocked down and takes the fall (Dark Ages: Vampire pp. 244-245);
 *   - the lance (Ride 3 and Melee 3, the shock on an untrained user, the botch, the charge that unhorses);
 *   - a bow shot from a moving horse at +2 or +4 (Dark Ages: Vampire p. 244).
 * World setting "mountedCombat" (on by default) turns all of it off; the saddle's Ability cap and the charge dice
 * (B2440-B2445) stay with "movementModes".
 */
import * as MT from "./mounted-rules.js";
import * as MVJ from "./movement.js";

let D = null;
export const rules = MT;
export const mountedOn = () => {
  try { return MVJ.on() && game.settings.get(D.MOD, "mountedCombat"); } catch (e) { return false; }
};
const IX = "wodx-interactables";

/** The mount under an actor's token, or null (WoDX Interactables rideOf). */
export function rideFor(actor, tok = null) {
  if ( !D || !mountedOn() || !actor ) return null;
  try { return MVJ.rideOf(MVJ.tokenFor(actor, tok)); } catch (e) { return null; }
}

/** The Attribute a blow from the saddle is struck with: {value, note}. key: "strength" or "dexterity". */
export function strikeAttrOf(attacker, key, value, {close = true, attackerTok = null} = {}) {
  const ride = rideFor(attacker, attackerTok);
  return ride ? MT.strikeAttr(ride, key, value, {close}) : {value, mount: false, note: ""};
}

/** The mount's defense for its rider this turn, as a defense plan (mounted-rules mountDodge). */
export function mountDodgeOf(target, {ranged = false, used = false, celerity = false, targetTok = null} = {}) {
  const ride = rideFor(target, targetTok);
  if ( !MT.inSaddle(ride) ) return null;
  return MT.mountDodge(ride, {rideDots: D.ability(target, "ride"), ranged, used, celerity});
}

/** A bow shot from the saddle: {diff, note} (mounted-rules mountedShot). */
export function mountedShotOf(attacker, {bow = false, specialty = "", attackerTok = null, targetTok = null, target = null} = {}) {
  const ride = rideFor(attacker, attackerTok);
  if ( !MT.inSaddle(ride) || !bow ) return {diff: 0, note: ""};
  const at = MVJ.tokenFor(attacker, attackerTok), tt = target ? MVJ.tokenFor(target, targetTok) : null;
  const close = tt ? MVJ.reachBetween(at, tt).close : false;
  return MT.mountedShot(ride, {bow, yards: MVJ.movedYards(at), specialty: MT.mountedSpecialty(specialty), close});
}

/** Show a word over a token for everyone looking at the scene. */
function floatWord(tokDoc, word, color = "#ffd27a") {
  try {
    const o = tokDoc?.object;
    if ( !o || !globalThis.canvas?.interface ) return;
    canvas.interface.createScrollingText(o.center, word, {anchor: CONST.TEXT_ANCHOR_POINTS?.TOP, direction: CONST.TEXT_ANCHOR_POINTS?.TOP,
      distance: canvas.grid?.size ?? 100, fontSize: 26, fill: color, stroke: 0x000000, strokeThickness: 4, jitter: 0.2, duration: 2600});
  } catch (e) { /* no canvas */ }
}
export function floatFor(tokDoc, word, color) {
  floatWord(tokDoc, word, color);
  try { game.socket.emit(D.SOCKET, {mounted: "float", token: tokDoc?.uuid, word, color}); } catch (e) { /* offline */ }
}

/**
 * Take a token off its mount on the map: off the tile's seats, set down beside the beast, Knocked down. The
 * Storyteller's client does the writing (the tile is not the player's). -> true when done or asked for
 */
export async function unseat(tokDoc, {why = "thrown"} = {}) {
  if ( !tokDoc ) return false;
  if ( !game.user.isGM ) {
    game.socket.emit(D.SOCKET, {mounted: "unseat", token: tokDoc.uuid, why});
    return true;
  }
  const scene = tokDoc.parent;
  let tile = null;
  for ( const t of scene?.tiles ?? [] ) {
    const f = t.flags?.[IX];
    if ( !f?.mount ) continue;
    if ( f.driver?.t === tokDoc.uuid || (Array.isArray(f.riders) && f.riders.some(r => r?.t === tokDoc.uuid)) ) { tile = t; break; }
  }
  if ( tile ) {
    const f = tile.flags[IX];
    const riders = (Array.isArray(f.riders) ? f.riders : []).filter(r => r?.t !== tokDoc.uuid);
    await tile.update({[`flags.${IX}.driver`]: f.driver?.t === tokDoc.uuid ? null : f.driver ?? null, [`flags.${IX}.riders`]: riders});
    // Down on the ground beside the beast, one square to its side (away from the way it faces is not known: the left)
    const size = scene.grid?.size ?? 100;
    const x = Math.max(0, Number(tile.x) - size), y = Number(tile.y) || 0;
    // the move is a fall, not a step: WoDX Combat does not count it against the rider's movement
    await tokDoc.update({x, y}, {wodxMove: false, animate: true});
  }
  const actor = tokDoc.actor;
  if ( actor ) await D.markFollow(actor, {name: "Knocked down", condition: "knockdown", lasts: "turn"});
  return true;
}

/**
 * Keeping the saddle (Dark Ages: Vampire pp. 244-245): roll Stamina + Ride (Drive on a motorcycle) at diff. On a
 * failure the rider is thrown: off the mount on the map, Knocked down, and the fall's dice by the ground, bashing
 * (lethal on a botch), soaked. Returns {rolls, lines, thrown, apply: async () => ...} for the attack card; apply does
 * the writing after the card is posted.
 */
export async function saddleTest(rider, {diff = 6, riderTok = null, why = "struck in the saddle"} = {}) {
  const ride = rideFor(rider, riderTok);
  if ( !MT.astride(ride) ) return null;
  const skill = ride.skill === "drive" ? "drive" : "ride";
  const stamina = D.attr(rider, "stamina"), dots = D.ability(rider, skill);
  const roll = await D.rollPool(stamina + dots, diff);
  const r = MT.saddleResult(roll);
  const rolls = roll.roll ? [roll.roll] : [];
  const label = skill === "drive" ? "Drive" : "Ride";
  const lines = [`<b>Keeping the saddle</b> (${D.esc(why)}): Stamina ${stamina} + ${label} ${dots} at ${roll.difficulty}: ${roll.botch ? "a botch" : `${roll.successes} success${roll.successes === 1 ? "" : "es"}`}, ${D.esc(r.note)} (Dark Ages: Vampire p. 244).`];
  if ( !r.thrown ) return {rolls, lines, thrown: false, apply: async () => {}};
  const n = MT.fallDice(ride.ground);
  const type = r.lethal ? "lethal" : "bashing";
  let fall = null;
  if ( n ) {
    fall = await D.soakFall(rider, type, n);
    rolls.push(...fall.rolls);
    lines.push(`<b>The fall</b> (${n} dice on ${D.esc(String(ride.ground ?? "the ground"))}, ${type}): ${fall.damage} success${fall.damage === 1 ? "" : "es"}, ${fall.soaked} soaked: <b>${fall.levels}</b> ${type} level${fall.levels === 1 ? "" : "s"}. ${D.esc(rider.name)} lies Knocked down beside the mount.`);
  } else lines.push(`${D.esc(rider.name)} goes into the water.`);
  const tok = MVJ.tokenFor(rider, riderTok);
  return {rolls, lines, thrown: true, fall, apply: async () => {
    floatFor(tok, "Thrown!", "#ff8a6a");
    await unseat(tok, {why: "thrown"});
    if ( fall?.levels ) await D.applyDamage(rider, type, fall.levels);
  }};
}

/**
 * What a blow does around the saddle, after the dice: the lance's shock and botch on the rider, a lance charge
 * knocking the target down or out of the saddle, and the target keeping the saddle when struck. Returns
 * {rolls, lines, apply} (apply after the card is posted).
 */
export async function afterBlow({attacker, attackerTok = null, target = null, targetTok = null, w, hit = false, botch = false, damageSuccesses = 0, charge = 0, knockedDown = false} = {}) {
  const out = {rolls: [], lines: [], applies: []};
  if ( !D || !mountedOn() ) return {...out, apply: async () => {}};
  const aRide = rideFor(attacker, attackerTok), tRide = target ? rideFor(target, targetTok) : null;
  const take = r => { if ( !r ) return; out.rolls.push(...r.rolls); out.lines.push(...r.lines); out.applies.push(r.apply); };
  let targetThrownAsked = false;
  // The lance, from the saddle
  if ( MT.isLance(w) && MT.inSaddle(aRide) ) {
    const lb = MT.lanceBlow({rideDots: D.ability(attacker, "ride"), meleeDots: D.ability(attacker, "melee"), hit, botch, charge, damageSuccesses});
    for ( const n of lb.notes ) out.lines.push(`<b>Lance:</b> ${D.esc(n)} (Dark Ages: Vampire p. 245).`);
    if ( lb.backfire ) {
      const f = await D.soakFall(attacker, "bashing", lb.backfire);
      out.rolls.push(...f.rolls);
      out.lines.push(`The jolt: ${f.damage} success${f.damage === 1 ? "" : "es"}, ${f.soaked} soaked: <b>${f.levels}</b> bashing to ${D.esc(attacker.name)}.`);
      if ( f.levels ) out.applies.push(() => D.applyDamage(attacker, "bashing", f.levels));
    }
    if ( lb.botchDice ) {
      const f = await D.soakFall(attacker, "lethal", lb.botchDice);
      out.rolls.push(...f.rolls);
      out.lines.push(`The botch: ${f.damage} success${f.damage === 1 ? "" : "es"}, ${f.soaked} soaked: <b>${f.levels}</b> lethal to ${D.esc(attacker.name)}.`);
      if ( f.levels ) out.applies.push(() => D.applyDamage(attacker, "lethal", f.levels));
      take(await saddleTest(attacker, {diff: lb.botchSaddleDiff, riderTok: attackerTok, why: "a botched lance"}));
    }
    if ( lb.knock && target ) {
      const pool = D.attr(target, "strength") + D.ability(target, "athletics");
      const kr = await D.rollPool(pool, 6);
      if ( kr.roll ) out.rolls.push(kr.roll);
      const stays = !kr.botch && kr.successes > 0;
      out.lines.push(`<b>Against the lance:</b> ${D.esc(target.name)} rolls Strength + Athletics (${pool}) at 6: ${kr.botch ? "a botch" : `${kr.successes} success${kr.successes === 1 ? "" : "es"}`}, ${stays ? "and keeps their feet" : MT.astride(tRide) ? "and is unhorsed" : "and is knocked down"}.`);
      if ( !stays ) {
        targetThrownAsked = true;
        if ( MT.astride(tRide) ) {
          // Unhorsed: no saddle roll saves them, the fall is taken as for a thrown rider
          const tok = MVJ.tokenFor(target, targetTok), n = MT.fallDice(tRide.ground);
          const f = n ? await D.soakFall(target, "bashing", n) : null;
          if ( f ) { out.rolls.push(...f.rolls); out.lines.push(`<b>The fall</b> (${n} dice): <b>${f.levels}</b> bashing to ${D.esc(target.name)}.`); }
          out.applies.push(async () => { floatFor(tok, "Unhorsed!", "#ff8a6a"); await unseat(tok, {why: "unhorsed"}); if ( f?.levels ) await D.applyDamage(target, "bashing", f.levels); });
        } else {
          const tok = MVJ.tokenFor(target, targetTok);
          out.applies.push(async () => { floatFor(tok, "Knocked down!", "#ff8a6a"); await D.markFollow(target, {name: "Knocked down", condition: "knockdown", lasts: "turn"}); });
        }
      }
    }
  }
  // A rider struck keeps the saddle, or not (any blow with damage dice that hit; a knockdown maneuver throws outright)
  if ( target && MT.astride(tRide) && hit && !targetThrownAsked ) {
    if ( knockedDown ) {
      const tok = MVJ.tokenFor(target, targetTok);
      out.lines.push(`${D.esc(target.name)} is knocked out of the saddle.`);
      out.applies.push(async () => { floatFor(tok, "Thrown!", "#ff8a6a"); await unseat(tok, {why: "knocked down"}); });
    } else if ( damageSuccesses > 0 ) take(await saddleTest(target, {diff: MT.saddleDiff(damageSuccesses), riderTok: targetTok}));
  }
  return {rolls: out.rolls, lines: out.lines, apply: async () => { for ( const f of out.applies ) { try { await f(); } catch (e) { console.warn(`${D.MOD} | saddle`, e); } } }};
}

/** The Storyteller's side of a player's request (the tile and a knocked-down rider), and the floating words. */
async function onSocket(p) {
  if ( !p?.mounted ) return;
  const tokDoc = p.token ? await fromUuid(p.token).catch(() => null) : null;
  if ( p.mounted === "float" ) return floatWord(tokDoc, p.word, p.color);
  const gm = game.users.activeGM ?? game.users.filter(u => u.isGM && u.active).sort((a, b) => a.id.localeCompare(b.id))[0];
  if ( p.mounted === "unseat" && gm?.id === game.user.id ) await unseat(tokDoc, {why: p.why});
}

export function setupMounted(deps) {
  D = deps;
  game.settings.register(D.MOD, "mountedCombat", {
    name: "Fighting from the saddle (the books' mounted combat)",
    hint: "A blow from the saddle may use the horse's Strength and Dexterity, the horse dodges once a turn for its rider, a rider struck rolls Stamina + Ride to stay on (thrown, the token comes off the horse and lies knocked down), the lance needs Ride 3 and Melee 3 and its charge unhorses, and a bow shot from a moving horse is +2 or +4. V20 Dark Ages p. 399 and Dark Ages: Vampire pp. 244-245. Needs the ways of moving setting and WoDX Interactables' mounts.",
    scope: "world", config: true, type: Boolean, default: true
  });
  Hooks.once("ready", () => game.socket.on(D.SOCKET, p => { if ( p?.mounted ) onSocket(p); }));
  return {rideFor, strikeAttrOf, mountDodgeOf, mountedShotOf, saddleTest, afterBlow, unseat, on: mountedOn, rules: MT};
}
