/**
 * WoDX NPC: factions that go to war by themselves (B2211-B2216). The pure part; no Foundry calls here.
 *
 * Ben asked on 12 November 2026 for battles and sieges that start without the Storyteller, mainly from disputes
 * between factions, and for two kinds of war: those fought by mortals and those fought by the supernatural. Both
 * begin for the same reasons; a supernatural war lets more powers into the fighting.
 *
 * At each faction turn, a faction that stands Hostile (-2) or Hunted (-3) toward a rival that holds a place may take
 * up arms for it (pickWar). The war is fought with WoDX Storyteller's battles (forcesFor builds the two sides from
 * the factions' Backgrounds), off the screen: a battle in the field is fought to its end that turn, a siege goes a
 * week a turn. What it changes waits in the approval queue (warChanges, beside the battle's usual Status, Retainers
 * and standing). A war at a place where a player character stands stops instead and waits for the Storyteller.
 *
 * Mortal or supernatural (warKind): the war is supernatural when both sides are of a hidden kind (Kindred, Garou,
 * mages, fae, the dead), or hunters fight one. Then the hidden side fields its own (Cainite cavalry, ghoul knights,
 * a Garou pack: Spoils of War p. 44), its leader's powers add to each phase (powerPool), and the fighting may breach
 * the Masquerade where it happens. A hidden faction against a mortal one fights through its mortal followers, as the
 * Masquerade and its like demand: a mortal war, with no powers and no breach.
 */

import {HIDDEN_KINDS, standingOf, MAX_DOTS, activeIn} from "./faction-rules.mjs";

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** The chance each faction turn that a faction at odds with a rival takes up arms (a house rule). */
export const WAR_CHANCE = {"-2": 1 / 6, "-3": 1 / 3};
/** The year the book's units stop fitting the way war is fought (pike and shot, B2201). */
export const BOOK_UNTIL = 1499;

export const isHidden = f => HIDDEN_KINDS.has(f?.kind);
/** "supernatural" or "mortal" (see above). */
export function warKind(a, b) {
  if ( isHidden(a) && isHidden(b) ) return "supernatural";
  if ( (a?.kind === "hunters" && isHidden(b)) || (b?.kind === "hunters" && isHidden(a)) ) return "supernatural";
  return "mortal";
}

/** The men a faction can field: Retainers, or Herd for Kindred, who send their herds as levies. */
export const strengthOf = f => Math.max(n(f?.assets?.retainers), f?.kind === "kindred" ? n(f?.assets?.herd) : 0);

/**
 * Pick at most one new war this turn. A faction can start one when it is awake, not run by players (they give their
 * own orders), not at war already, has men to field, and stands Hostile or worse toward a rival that holds a place
 * and is not at war either. Factions are taken by Status, as in the turn; the first whose roll comes up starts it.
 *   ctx: {rand, year, busy: Set of faction ids at war, places: [{id, name}], only: Set of faction ids to consider (a test), or null}
 * Returns {attacker, defender, place, placeName, kind, siege} or null.
 */
export function pickWar(state, {rand = Math.random, year = null, busy = new Set(), places = [], only = null} = {}) {
  const live = (state?.factions ?? []).filter(f => (!only || only.has(f.id)) && !f.dormant && !busy.has(f.id) && activeIn(f, year));
  const order = [...live].sort((a, b) => n(b.assets?.status) - n(a.assets?.status) || String(a.name).localeCompare(String(b.name)));
  for ( const f of order ) {
    if ( f.owners?.length || strengthOf(f) < 1 ) continue;
    const rivals = live.filter(g => g.id !== f.id && (g.places ?? []).length && standingOf(f, g.id) <= -2)
      .sort((a, b) => standingOf(f, a.id) - standingOf(f, b.id));
    for ( const g of rivals ) {
      const chance = WAR_CHANCE[String(Math.max(-3, standingOf(f, g.id)))] ?? 0;
      if ( rand() >= chance ) continue;
      const place = g.places[Math.floor(rand() * g.places.length) % g.places.length];
      const kind = warKind(f, g);
      return {attacker: f.id, defender: g.id, place, placeName: places.find(p => p.id === place)?.name ?? "", kind, siege: n(g.assets?.domain) >= 3};
    }
  }
  return null;
}

/**
 * The book's units for a faction in the Dark Ages (Spoils of War p. 44; how a faction's dots become units is a house
 * rule). r = the men it can field (strengthOf), s = Status.
 */
export function unitsFor(f, kind) {
  const r = Math.max(1, strengthOf(f)), s = n(f?.assets?.status);
  const sup = kind === "supernatural";
  switch ( f?.kind ) {
    case "kindred":
      return sup ? {ghoulKnights: r, cainiteCavalry: Math.max(1, Math.ceil(s / 2)), peasants: Math.ceil(n(f.assets?.herd) / 2)}
        : {peasants: r, spearmen: Math.ceil(r / 2)};
    case "garou":
      return sup ? {garouPack: Math.max(1, Math.ceil(s / 2)), kinfolkWolves: r, spearmen: Math.ceil(r / 3)} : {peasants: r, skirmishers: Math.ceil(r / 2)};
    case "mages": case "fae": case "spirits":
      return {spearmen: r, archers: Math.ceil(r / 2)};
    case "mercenaries":
      return {swordsmen: r, crossbowmen: Math.ceil(r / 2), lightCavalry: Math.max(1, s)};
    case "folk":
      return {peasants: r + 1, archers: Math.ceil(r / 3)};
    case "church": case "mortal":
      return {peasants: r, spearmen: Math.ceil(r / 2), archers: Math.floor(r / 2), heavyCavalry: Math.max(1, s)};
    case "hunters":
      return {spearmen: r, crossbowmen: Math.ceil(r / 2), heavyCavalry: Math.ceil(s / 2)};
    default:
      return {peasants: r, spearmen: Math.ceil(r / 2), lightCavalry: Math.ceil(s / 2)};
  }
}

/** A siege's walls by the year: a castle, then the bastion fort, then concrete. */
export const wallsFor = year => (n(year) >= 1914 ? "bunker" : n(year) >= 1650 ? "starfort" : "castle");

/**
 * One side of the battle for WoDX Storyteller. In the Dark Ages (to 1499, in the living world) a side is the book's
 * units; later, men and quality (B2200): men 100 times 3 for each dot past the first, quality from Status and
 * Resources (mercenaries one better), the supernatural in its ranks from its Status in a supernatural war.
 *   leader: {actorId, name} or null
 */
export function forcesFor(f, kind, {year = 1197, realm = "world", defends = false, siege = false, leader = null} = {}) {
  const r = Math.max(1, strengthOf(f)), s = n(f?.assets?.status), res = n(f?.assets?.resources);
  const side = {name: f.name, faction: f.name, defends};
  if ( n(year) <= BOOK_UNTIL || realm !== "world" ) side.units = unitsFor(f, kind);
  else {
    side.men = Math.round(100 * 3 ** (r - 1));
    side.quality = clamp(1 + Math.ceil((s + res) / 3) + (f.kind === "mercenaries" ? 1 : 0), 1, 5);
  }
  side.supernatural = kind === "supernatural" && (isHidden(f) || f.kind === "hunters") ? clamp(Math.ceil(s / 2) + 1, 1, 5) : 0;
  if ( defends ) {
    side.position = siege ? wallsFor(year) : n(f.assets?.domain) >= 1 ? "high" : "open";
    if ( siege ) side.stores = 14 * (res + 1);
  }
  side.commander = leader?.actorId ? {actorId: leader.actorId, name: leader.name ?? ""} : {name: `${f.name}'s captain`, pool: clamp(2 + s, 2, 8), morale: clamp(2 + s, 2, 8), works: clamp(2 + res, 2, 8), medicine: 3};
  return side;
}

/** A faction's kind as WoDX Combat names a kind of being, for the battle deeds table when the leader has no sheet. */
export const COMBAT_KIND = {kindred: "kindred", garou: "lupine", mages: "mage", fae: "fae", spirits: "wraith", hunters: "hunter"};
/** The dice a hidden side's leader throws into each phase with their powers (a house rule until the deeds table): Status + 3, at 6, to 10. */
export const powerPool = f => clamp(n(f?.assets?.status) + 3, 3, 10);
/** Which sides of a supernatural war use powers: the hidden ones, and hunters. */
export const usesPowers = (f, kind) => kind === "supernatural" && (isHidden(f) || f?.kind === "hunters");

/**
 * What a war adds to the battle's usual changes (battleChanges) once it is over: the place it was fought for goes to
 * the attacker when the attacker wins (a big change, the Storyteller's to approve); a supernatural war in the living
 * world leaves a breach of the Masquerade where it was fought, worse after a long fight.
 */
export function warChanges(state, battle) {
  const w = battle?.war, o = battle?.over;
  if ( !w || !o ) return [];
  const out = [];
  const att = state.factions.find(f => f.id === w.attacker), def = state.factions.find(f => f.id === w.defender);
  if ( o.winner === 0 && att && def && w.place && (def.places ?? []).includes(w.place) ) out.push({op: "place", place: w.place, from: def.id, to: att.id});
  if ( w.kind === "supernatural" && (battle.realm ?? "world") === "world" && w.place ) {
    const phases = (battle.phases ?? []).filter(p => p.kind === "phase").length;
    const blame = o.winner === 1 ? att : o.winner === 0 ? def : att;
    const who = isHidden(blame) ? blame : isHidden(att) ? att : def;
    if ( who ) out.push({op: "breach", faction: who.id, place: w.place, severity: phases > 6 ? 2 : 1, event: `${battle.name}: the fighting was seen`});
  }
  return out;
}

/** The battle's name and place. */
export function warName(att, def, placeName, siege) {
  return siege ? `The siege of ${placeName || def.name}` : `${att.name} against ${def.name}${placeName ? ` at ${placeName}` : ""}`;
}

export {MAX_DOTS};
