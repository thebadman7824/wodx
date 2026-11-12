/**
 * WoDX NPC 0.1 (Phase 7b): the pure rules of NPC behaviour. A profile says what an NPC is like; scoreOptions weighs
 * what it could do on its turn against the fight as it stands; findPath walks a grid around walls. No Foundry calls,
 * so the harness can test it. The Combat and Actions modules resolve whatever the NPC decides.
 *
 * Wounds are the health-track index (0 unhurt, 1 Bruised … 6 Crippled, 7 Incapacitated).
 */
import * as TK from "./talk-rules.mjs";
import {ANIMAL_TEMPLATES, ANIMALS} from "./animal-rules.mjs";
import {MORTAL_TEMPLATES, MORTALS} from "./mortal-rules.mjs";

/** Temperament weights (0–2) and thresholds, per template. WoDX's readings of each line's usual conduct. */
export const TEMPLATES = {
  neonate: {label: "Kindred neonate", line: "kindred", aggression: 1, caution: 0.6, cunning: 0.5, loyalty: 0.5, cowardice: 0.3, berserk: 0.8, power: 1,
    fleeAt: 4, frenzyProne: true, fears: ["fire", "sunlight", "faith"], tactics: ["melee", "power"]},
  elder: {label: "Kindred elder", line: "kindred", aggression: 0.7, caution: 1.2, cunning: 1.6, loyalty: 0.4, cowardice: 0.2, berserk: 0.3, power: 2,
    fleeAt: 5, frenzyProne: true, fears: ["fire", "sunlight", "faith"], tactics: ["power", "willpower", "call"]},
  ghoul: {label: "Ghoul", line: "ghoul", aggression: 0.9, caution: 0.8, cunning: 0.5, loyalty: 2, cowardice: 0.4, berserk: 0.4, power: 0.6,
    fleeAt: 4, frenzyProne: false, fears: ["fire"], tactics: ["melee", "guard"]},
  garou: {label: "Garou", line: "lupine", aggression: 1.6, caution: 0.4, cunning: 0.6, loyalty: 1.2, cowardice: 0.1, berserk: 1.3, power: 1.2,
    fleeAt: 6, frenzyProne: true, fears: ["silver"], tactics: ["melee", "power"]},
  guard: {label: "Mortal guard", line: "mortal", aggression: 0.8, caution: 1, cunning: 0.4, loyalty: 1.2, cowardice: 0.6, berserk: 0, power: 0,
    fleeAt: 3, frenzyProne: false, fears: ["supernatural"], tactics: ["melee", "ranged", "call"]},
  civilian: {label: "Mortal bystander", line: "mortal", aggression: 0.2, caution: 1.5, cunning: 0.3, loyalty: 0.5, cowardice: 2, berserk: 0, power: 0,
    fleeAt: 1, frenzyProne: false, fears: ["supernatural", "violence"], tactics: ["flee", "call"]},
  hunter: {label: "Hunter", line: "hunter", aggression: 1.1, caution: 0.9, cunning: 1, loyalty: 1, cowardice: 0.2, berserk: 0, power: 1.2,
    fleeAt: 4, frenzyProne: false, fears: [], tactics: ["ranged", "power", "supernatural"]},
  spirit: {label: "Spirit", line: "spirit", aggression: 0.7, caution: 0.8, cunning: 1, loyalty: 0.5, cowardice: 0.3, berserk: 0, power: 1.6,
    fleeAt: 5, frenzyProne: false, fears: [], tactics: ["power"]},
  ghost: {label: "Ghost", line: "wraith", aggression: 0.6, caution: 1, cunning: 1.3, loyalty: 0.5, cowardice: 0.4, berserk: 0, power: 1.6,
    fleeAt: 5, frenzyProne: false, fears: [], tactics: ["power"]},
  beast: {label: "Beast or creature", line: "beast", aggression: 1.2, caution: 0.6, cunning: 0.2, loyalty: 0.3, cowardice: 0.6, berserk: 0.4, power: 0,
    fleeAt: 4, frenzyProne: false, fears: ["fire"], tactics: ["melee"]},
  // NPC 0.18.0 (B824): the rival kinds' own temperaments. WoDX readings of each line's usual conduct, house rules.
  sabbat: {label: "Sabbat pack Cainite", line: "kindred", aggression: 1.5, caution: 0.4, cunning: 0.7, loyalty: 1.3, cowardice: 0.2, berserk: 1.1, power: 1,
    fleeAt: 5, frenzyProne: true, fears: ["fire", "sunlight", "faith"], tactics: ["melee", "power", "pack"]},
  sheriff: {label: "Sheriff or enforcer", line: "kindred", aggression: 1.1, caution: 0.9, cunning: 1, loyalty: 1.4, cowardice: 0.2, berserk: 0.5, power: 1.2,
    fleeAt: 5, frenzyProne: true, fears: ["fire", "sunlight", "faith"], tactics: ["melee", "power", "call", "guard", "alive"]},
  mage: {label: "Mage", line: "mage", aggression: 0.6, caution: 1.3, cunning: 1.4, loyalty: 0.6, cowardice: 0.5, berserk: 0, power: 2,
    fleeAt: 4, frenzyProne: false, fears: [], tactics: ["power", "ranged", "call", "masquerade"]},
  technocrat: {label: "Technocrat", line: "mage", aggression: 0.9, caution: 1, cunning: 1.2, loyalty: 1.2, cowardice: 0.4, berserk: 0, power: 1,
    fleeAt: 4, frenzyProne: false, fears: [], tactics: ["ranged", "call", "pack", "masquerade"]},
  changeling: {label: "Changeling", line: "fae", aggression: 0.7, caution: 1, cunning: 1.2, loyalty: 0.8, cowardice: 0.6, berserk: 0.2, power: 1.2,
    fleeAt: 4, frenzyProne: false, fears: ["iron"], tactics: ["power", "flee", "masquerade"]},
  spectre: {label: "Spectre", line: "spirit", aggression: 1.6, caution: 0.3, cunning: 1, loyalty: 0.4, cowardice: 0.1, berserk: 1, power: 1.6,
    fleeAt: 6, frenzyProne: false, fears: [], tactics: ["power"]},
  fomor: {label: "Fomor", line: "mortal", aggression: 1.5, caution: 0.5, cunning: 0.5, loyalty: 1, cowardice: 0.3, berserk: 0.8, power: 1,
    fleeAt: 5, frenzyProne: false, fears: [], tactics: ["melee", "power"]},
  inquisitor: {label: "Inquisitor", line: "hunter", aggression: 1, caution: 1, cunning: 1, loyalty: 1.5, cowardice: 0.2, berserk: 0, power: 1,
    fleeAt: 4, frenzyProne: false, fears: [], tactics: ["melee", "supernatural", "call", "alive"]},
  soldier: {label: "Soldier or man-at-arms", line: "mortal", aggression: 1, caution: 0.8, cunning: 0.6, loyalty: 1.4, cowardice: 0.5, berserk: 0, power: 0,
    fleeAt: 4, frenzyProne: false, fears: ["supernatural"], tactics: ["melee", "ranged", "pack", "ground"]},
  mob: {label: "Mob", line: "mortal", aggression: 1.2, caution: 0.3, cunning: 0.1, loyalty: 0.6, cowardice: 1.2, berserk: 0.3, power: 0,
    fleeAt: 2, frenzyProne: false, fears: ["supernatural", "fire"], tactics: ["melee", "pack"]},
  // NPC 0.21.0 (B1000): the animal archetypes, from animal-rules.mjs
  ...ANIMAL_TEMPLATES,
  // NPC 0.23.0 (B1005): criminals, combatants and townsfolk, from mortal-rules.mjs
  ...MORTAL_TEMPLATES
};

/** Tactics a profile can list, and what each does (shown in the behaviour window). */
export const TACTICS = {
  melee: "Fights hand to hand", ranged: "Shoots", power: "Uses its powers", willpower: "Spends Willpower", call: "Calls for help",
  guard: "Guards its master", flee: "Runs", supernatural: "Goes for the monster first",
  pack: "Goes for the foe an ally has already hurt", ground: "Fights harder on its own ground",
  masquerade: "Hides its nature before mortal eyes", alive: "Takes them alive", parley: "Speaks a challenge before a fight",
  // NPC 0.21.0 (B1001)
  swarm: "Many bodies on one foe", scatter: "Breaks and runs at the first sign of trouble", scavenge: "Goes for the fallen",
  stalk: "Follows unseen and strikes at one alone",
  // NPC 0.23.0 (B1006)
  cover: "Holds behind cover and shoots", formation: "Holds a line with others beside it", surrender: "Yields when beaten",
  hostage: "Grabs a bystander when cornered", lead: "Leads the others; they waver if it falls", report: "Tells someone later what it saw"
};

/** The template a line's NPC starts from. info: {kind, generation, melee, ranged}. */
export function templateFor({kind, generation = 13, melee = 0, ranged = 0, sides = [], animal = null, mortal = null}) {
  const has = re => (sides ?? []).some(x => re.test(String(x)));
  if ( has(/fomor/) ) return "fomor";
  switch ( kind ) {
    case "kindred": return has(/^sect:.*sabbat/) ? "sabbat" : generation && generation <= 8 ? "elder" : "neonate";
    case "mage": return has(/technocra|order of reason|daedalean|iteration x|progenitor|syndicate|void engineer|new world order/) ? "technocrat" : "mage";
    case "fae": return "changeling";
    case "ghoul": return "ghoul";
    case "lupine": return "garou";
    case "hunter": return has(/inquisit|leopold/) ? "inquisitor" : "hunter";
    case "spirit": return has(/spectre/) ? "spectre" : "spirit";
    case "wraith": return "ghost";
    case "beast": return ANIMALS[animal] ? animal : "beast";
    case "mortal": return MORTALS[mortal] ? mortal : Math.max(melee, ranged) >= 2 ? "guard" : "civilian";
    default: return "guard";
  }
}

export const MODES = {suggest: "Suggest (a whispered plan with an Accept button)", auto: "Auto (acts, with an undo card)", off: "Off"};
/** The mode in force: the NPC's own, else the scene's, else the world's. */
export const modeOf = ({npc, scene, world}) => [npc, scene, world].find(m => m && MODES[m]) ?? "suggest";

/** A profile with every field filled: the template's values under the NPC's own. */
export function profileOf(saved = {}, fallbackTemplate = "guard") {
  const t = TEMPLATES[saved.template] ? saved.template : fallbackTemplate;
  return {...TEMPLATES[t], ...Object.fromEntries(Object.entries(saved).filter(([, v]) => v !== undefined && v !== null && v !== "")), template: t};
}

/**
 * What the NPC could do, scored. state:
 *   self: {kind, wounds, willpower, blood, bloodMax, selfcontrol, rage, rageMax, hasPowers, inFrenzy, delirious}
 *   enemies: [{id, name, visible, distance (yards), reach (bool), hurtMe (levels this fight), wounds, supernatural, obvious (plainly inhuman),
 *              fearSources: ["fire"…], attackDice, ranged (bool)}]
 *   allies: [{id, name, hurt (levels), isDomitor, attackerIds: [enemy ids who hurt this ally]}]
 *   offstageAllies: number of loyal NPCs not in the fight (for calling for help)
 *   bestAttackDice: the NPC's best pool against its target, canRanged: has a ranged weapon
 * Returns [{action, target?, score, why}] sorted best first. Every score says why (shown on the card).
 */
export function scoreOptions(profile, state) {
  const p = profile, s = state.self ?? {}, out = [];
  const enemies = (state.enemies ?? []).filter(e => e.visible !== false);
  const unseen = (state.enemies ?? []).length - enemies.length;
  const allies = state.allies ?? [];
  const fearHere = (e) => (e.fearSources ?? []).filter(f => (p.fears ?? []).includes(f));
  // Fear of the supernatural needs it to show: a Kindred who passes for human frightens no one until it does
  const anyFear = enemies.some(e => fearHere(e).length) || ((p.fears ?? []).includes("supernatural") && enemies.some(e => e.obvious));
  const outnumbered = enemies.length > allies.length + 1;
  const tac = t => (p.tactics ?? []).includes(t);
  // The Masquerade (or the Veil, or the Consensus): mortals watching and a foe who passes for human
  const hiding = tac("masquerade") && Number(state.witnesses ?? 0) > 0 && !enemies.some(e => e.obvious);
  const herd = Number(p.herd ?? 0), terr = Number(p.territory ?? 0), hung = Number(p.hunger ?? 0);
  // NPC 0.23.0 (B1006): morale, for the archetypes that carry it. The line wavers when its leader falls or half of it is down.
  const morale = p.morale === undefined || p.morale === null ? null : Number(p.morale);
  const waver = morale !== null && (!!state.leaderDown || Number(state.sideDown ?? 0) >= 0.5);
  if ( s.surrendered ) return [{action: "wait", score: 10, why: "has yielded and waits on the victors"}];

  // The Delirium, or a bystander facing violence, overrides the rest (WoDX reading of the line rules)
  if ( s.delirious ) out.push({action: "flee", score: 20, why: "The Delirium: the sight of a Crinos sends a mortal running"});

  // Attack each visible enemy
  for ( const e of enemies ) {
    const r = [];
    let sc = 2 * p.aggression + (Number(e.attackDice ?? state.bestAttackDice ?? 3) * 0.35);
    if ( e.hurtMe ) { sc += 1.5 + 0.5 * e.hurtMe; r.push(`they hurt this NPC (${e.hurtMe} level${e.hurtMe === 1 ? "" : "s"})`); }
    if ( e.wounds >= 4 ) { sc += 1 * (1 + p.cunning / 2); r.push("they are badly hurt"); }
    const guard = allies.find(a => a.isDomitor && (a.attackerIds ?? []).includes(e.id));
    if ( guard ) { sc += 2.5 * p.loyalty; r.push(`they attacked ${guard.name}, whom this NPC serves`); }
    const ally = allies.find(a => !a.isDomitor && (a.attackerIds ?? []).includes(e.id));
    if ( ally ) { sc += 0.8 * p.loyalty; r.push(`they attacked ${ally.name}`); }
    if ( (p.tactics ?? []).includes("supernatural") && e.supernatural ) { sc += 2; r.push("a hunter goes for the monster first"); }
    if ( tac("pack") && e.hurtByAllies ) { sc += 1.5 * (0.5 + p.loyalty / 2); r.push("the pack goes for the one already bleeding"); }
    if ( tac("ground") && s.onGround ) { sc += 1; r.push("on its own ground"); }
    // NPC 0.21.0 (B1001): the animal tactics and traits
    if ( tac("swarm") && allies.length >= 2 ) { sc += 1 + (e.hurtByAllies ? 1 : 0); r.push("the swarm closes on one foe"); }
    if ( tac("scavenge") && e.wounds >= 5 ) { sc += 1.5; r.push("goes for the fallen"); }
    if ( tac("stalk") && e.alone === true ) { sc += 1.5; r.push("this one stands alone"); }
    if ( tac("stalk") && e.alone === false ) sc -= 1;
    if ( terr && s.onGround ) { sc += terr; r.push("defends its own patch"); }
    if ( hung && s.hungry ) { sc += 1.5 * hung; r.push("hungry"); }
    if ( herd && !allies.length ) sc -= 0.5 * herd;
    if ( tac("formation") && allies.length >= 2 && !outnumbered ) { sc += 0.8; r.push("holds the line with the others"); }
    if ( tac("cover") && state.canRanged && !e.reach ) { sc += 1.5; r.push("shoots from cover"); }
    if ( waver ) sc -= 1;
    if ( tac("alive") && (e.supernatural || e.wounds >= 4) ) { sc += e.wounds >= 4 ? 1 : 0.3; r.push("aims to take them alive (stake, bind or seize)"); }
    const f = fearHere(e);
    if ( f.length ) { sc -= 4 * (1 + p.caution / 2); r.push(`afraid of their ${f.join(" and ")}`); }
    if ( !e.reach && !state.canRanged ) { sc -= 0.8; r.push("must close in first"); }
    out.push({action: e.reach || !state.canRanged ? "attack" : "shoot", target: e.id, score: sc, why: r.length ? r.join("; ") : "the nearest foe"});
  }

  // Flee
  {
    let sc = p.cowardice;
    const r = [];
    const bear = p.fleeAt + (tac("ground") && s.onGround ? 1 : 0) + (terr >= 1 && s.onGround ? 1 : 0);
    if ( s.wounds >= bear ) { sc += 6 + (s.wounds - bear); r.push(`wounded past what this NPC will bear (${s.wounds} ≥ ${bear})`); }
    if ( hiding ) { sc += 2; r.push(`${state.witnesses} mortal witness${state.witnesses === 1 ? "" : "es"}: better to slip away`); }
    if ( outnumbered ) { sc += 1.5 * (p.caution); r.push("outnumbered"); }
    if ( anyFear ) { sc += 2 + 1.5 * p.caution; r.push("faces what it fears"); }
    if ( (p.fears ?? []).includes("violence") && enemies.length ) { sc += 3; r.push("not a fighter"); }
    if ( herd && outnumbered ) { sc += 1.5 * herd; r.push("the herd gives way"); }
    if ( herd && Number(state.alliesFled ?? 0) > 0 ) { sc += 2 * herd; r.push("the others are running"); }
    if ( tac("scatter") && enemies.length ) { sc += 2; r.push("scatters"); }
    if ( hung && s.hungry ) sc -= hung;
    if ( waver ) { sc += 2.5 * (2 - morale); r.push(state.leaderDown ? "their leader is down" : "half their side is down"); }
    if ( tac("formation") && allies.length >= 2 && !waver ) sc -= 1.5;
    if ( s.inFrenzy ) sc -= 10;
    if ( r.length ) out.push({action: "flee", score: sc, why: r.join("; ")});
  }

  // NPC 0.23.0: yield, or grab a bystander
  if ( tac("surrender") && enemies.length && (s.wounds >= p.fleeAt || waver || (outnumbered && s.wounds >= Math.max(1, p.fleeAt - 1))) ) {
    const r = [s.wounds >= p.fleeAt && "beaten", waver && "the fight has gone out of them", outnumbered && "outnumbered"].filter(Boolean);
    out.push({action: "surrender", score: 4 + p.cowardice + (morale === null ? 0 : 2 - morale) - p.aggression, why: `yields: ${r.join(", ")}`});
  }
  if ( tac("hostage") && enemies.length && Number(state.witnesses ?? 0) > 0 && s.wounds >= Math.max(1, p.fleeAt - 1) ) {
    out.push({action: "hostage", score: 3 + p.cunning, why: "cornered, with a bystander within reach"});
  }

  // Full defence when hurt and cornered or cautious
  if ( s.wounds >= Math.max(1, p.fleeAt - 1) && enemies.some(e => e.reach) ) {
    out.push({action: "defend", score: 2 + 2 * p.caution, why: "hurt, with a foe in reach: dodges and blocks all turn"});
  }

  // Willpower for an automatic success, when the pool is thin
  if ( s.willpower > 0 && enemies.length && Number(state.bestAttackDice ?? 0) <= 4 ) {
    out.push({action: "willpower", score: 1 + p.cunning + (s.wounds >= 2 ? 0.5 : 0), why: "a thin dice pool: Willpower buys a success"});
  }

  // The Beast or Rage (a frenzy check the Storyteller rolls)
  if ( p.frenzyProne && !s.inFrenzy ) {
    const r = [];
    let sc = 0;
    if ( s.kind === "kindred" || s.kind === "ghoul" ) {
      const line = 7 - Number(s.selfcontrol ?? 3);
      if ( Number(s.blood ?? 10) < line ) { sc += 4; r.push(`hungry (blood ${s.blood} under ${line})`); }
      if ( s.wounds >= 3 ) { sc += 1.5; r.push("badly hurt"); }
      if ( enemies.some(e => fearHere(e).includes("fire") || fearHere(e).includes("faith")) ) { sc += 2; r.push("fire or Faith: the Red Fear"); }
    }
    if ( s.kind === "lupine" ) {
      if ( Number(s.rage ?? 0) >= 4 ) { sc += 3 + (Number(s.rage) - 4); r.push(`Rage ${s.rage}`); }
      if ( s.wounds >= 2 ) { sc += 1; r.push("wounded"); }
    }
    if ( sc > 0 ) out.push({action: "frenzy", score: sc * (0.6 + p.berserk / 2), why: `the Beast pushes: ${r.join("; ")}`});
  }

  // A power (Discipline, Gift, Arcanos, Numen, Edge): the Storyteller picks which
  if ( s.hasPowers && p.power > 0 && enemies.length ) {
    out.push({action: "power", score: 1.5 * p.power + (p.cunning > 1 ? 0.5 : 0) - (hiding ? 3 : 0),
      why: hiding ? "this NPC fights with its powers, though mortals are watching" : "this NPC fights with its powers"});
  }

  // Call for help
  if ( (state.offstageAllies ?? 0) > 0 && enemies.length && ((p.tactics ?? []).includes("call") || s.wounds >= 2 || outnumbered) ) {
    out.push({action: "call", score: 1 + p.loyalty + (outnumbered ? 1.5 : 0) + (s.wounds >= 2 ? 1 : 0), why: `${state.offstageAllies} ally or allies within call`});
  }

  // Nobody to fight
  if ( !enemies.length ) out.push({action: unseen ? "search" : "wait", score: 1, why: unseen ? `${unseen} foe(s) unseen (Obfuscate, darkness or hiding)` : "no foe in sight"});

  return out.sort((a, b) => b.score - a.score).map(o => ({...o, score: Math.round(o.score * 10) / 10}));
}

/* ------------------------------------------------------------------ */
/*  Paths around walls                                                 */
/* ------------------------------------------------------------------ */

/**
 * A* over grid cells. start and goal: {i, j}. passable(a, b): can a token step from cell a to the neighbouring cell b
 * (walls, closed doors). maxSteps: stop the search there. Diagonals cost 1.5 (as 5/10/5 counting roughly does).
 * Returns the list of cells from start to goal, or null.
 */
export function findPath(start, goal, passable, {maxNodes = 4000, diagonals = true, neighbors = null, heuristic = null} = {}) {
  const key = c => `${c.i},${c.j}`;
  const h = heuristic ?? (c => { const di = Math.abs(c.i - goal.i), dj = Math.abs(c.j - goal.j); return Math.max(di, dj) + 0.5 * Math.min(di, dj); });
  const steps = neighbors ?? (diagonals ? squareSteps : orthoSteps);
  const open = new Map([[key(start), {c: start, g: 0, f: h(start), from: null}]]);
  const closed = new Map();
  let n = 0;
  while ( open.size && n++ < maxNodes ) {
    let best = null;
    for ( const v of open.values() ) if ( !best || v.f < best.f ) best = v;
    open.delete(key(best.c));
    closed.set(key(best.c), best);
    if ( best.c.i === goal.i && best.c.j === goal.j ) {
      const path = [];
      for ( let v = best; v; v = v.from ) path.unshift(v.c);
      return path;
    }
    for ( const {c, cost} of steps(best.c) ) {
      if ( closed.has(key(c)) || !passable(best.c, c) ) continue;
      const g = best.g + cost;
      const have = open.get(key(c));
      if ( !have || g < have.g ) open.set(key(c), {c, g, f: g + h(c), from: best});
    }
  }
  return null;
}

/** Neighbouring cells with their step cost. Square grids: diagonals 1.5 (5/10/5 counted roughly). Other grids pass
 *  their own, such as Foundry's adjacent offsets on a hex grid at cost 1. */
export const squareSteps = c => [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.5], [1, -1, 1.5], [-1, 1, 1.5], [-1, -1, 1.5]]
  .map(([di, dj, cost]) => ({c: {i: c.i + di, j: c.j + dj}, cost}));
export const orthoSteps = c => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([di, dj]) => ({c: {i: c.i + di, j: c.j + dj}, cost: 1}));
/** The cost of one step on a square grid. */
export const squareCost = (a, b) => (a.i !== b.i && a.j !== b.j) ? 1.5 : 1;

/** The first cells of a path that fit in a move of `budget` (step cost by `cost`, square-grid diagonals 1.5 by default). */
export function trimPath(path, budget, cost = squareCost) {
  if ( !path?.length ) return [];
  const out = [path[0]];
  let used = 0;
  for ( let k = 1; k < path.length; k++ ) {
    const d = cost(path[k - 1], path[k]);
    if ( used + d > budget + 1e-6 ) break;
    used += d;
    out.push(path[k]);
  }
  return out;
}
/** A path's full cost. */
export const pathCost = (path, cost = squareCost) => (path ?? []).slice(1).reduce((t, c, k) => t + cost(path[k], c), 0);

/** Cells around a target's footprint ({i, j, w, h} in cells), nearest to the mover first. */
export function besideCells(target, mover) {
  const w = target.w ?? 1, h = target.h ?? 1, cells = [];
  for ( let i = target.i - 1; i <= target.i + h; i++ ) for ( let j = target.j - 1; j <= target.j + w; j++ ) {
    if ( i >= target.i && i < target.i + h && j >= target.j && j < target.j + w ) continue;
    cells.push({i, j});
  }
  return cells.sort((a, b) => Math.hypot(a.i - mover.i, a.j - mover.j) - Math.hypot(b.i - mover.i, b.j - mover.j));
}

/** Every cell reachable within `budget` steps (diagonals 1.5): Map "i,j" -> {c, g, from}. For fleeing. */
export function reachable(start, passable, budget, {maxNodes = 3000, neighbors = squareSteps} = {}) {
  const key = c => `${c.i},${c.j}`;
  const seen = new Map([[key(start), {c: start, g: 0, from: null}]]);
  const queue = [seen.get(key(start))];
  while ( queue.length && seen.size < maxNodes ) {
    queue.sort((a, b) => a.g - b.g);
    const v = queue.shift();
    for ( const {c, cost} of neighbors(v.c) ) {
      const g = v.g + cost;
      if ( g > budget + 1e-6 ) continue;
      const have = seen.get(key(c));
      if ( have && have.g <= g ) continue;
      if ( !passable(v.c, c) ) continue;
      const n = {c, g, from: v};
      seen.set(key(c), n);
      queue.push(n);
    }
  }
  return seen;
}
/** The path to a cell found by reachable(). */
export const pathTo = node => { const p = []; for ( let v = node; v; v = v.from ) p.unshift(v.c); return p; };

/** Where to run: the reachable cell farthest from the nearest foe (fewest steps breaks a tie). foes: [{i, j}]. */
export function fleeCell(map, foes, dist = (a, b) => Math.max(Math.abs(a.i - b.i), Math.abs(a.j - b.j))) {
  let best = null;
  for ( const n of map.values() ) {
    const d = foes.length ? Math.min(...foes.map(f => dist(f, n.c))) : 0;
    if ( !best || d > best.d || (d === best.d && n.g < best.n.g) ) best = {n, d};
  }
  return best?.n ?? null;
}

/**
 * Who hurt whom in this fight, from WoDX Combat's attack cards (applied damage only):
 * cards [{combatId, attacker, target, levels, applied}] -> Map target -> Map attacker -> levels.
 */
export function harmLog(cards, combatId) {
  const out = new Map();
  for ( const d of cards ) {
    if ( !d || d.combatId !== combatId || !d.applied || !d.levels || !d.attacker || !d.target ) continue;
    const m = out.get(d.target) ?? new Map();
    m.set(d.attacker, (m.get(d.attacker) ?? 0) + Number(d.levels));
    out.set(d.target, m);
  }
  return out;
}

/** The actions WoDX can carry out by itself; the rest need the Storyteller's roll or choice. */
export const SELF_ACTING = ["attack", "shoot", "flee", "defend", "wait", "search", "surrender"];
export const ACTION_LABEL = {attack: "Attack", shoot: "Shoot", flee: "Flee", defend: "Full defence", willpower: "Attack, spending Willpower",
  frenzy: "Frenzy check", power: "Use a power", call: "Call for help", wait: "Wait", search: "Search for the unseen",
  surrender: "Surrender", hostage: "Take a hostage"};

/** Auto mode acts on the best option it can carry out itself; a better one that needs the Storyteller stops it. */
export function autoChoice(options) {
  const top = options[0];
  if ( !top ) return {act: null};
  if ( SELF_ACTING.includes(top.action) ) return {act: top};
  return {act: null, needsStoryteller: top};
}

/**
 * Aim a "Use a power" option with WoDX Targeting's ranking (the same picker the power windows use): a hostile power
 * at line of sight, the tag WoDX gives an NPC's attack powers until the Storyteller picks the real one.
 *   ranked: target-rules rank() output, or null when WoDX Targeting is off. Returns a new option.
 */
export const POWER_AIM = "h.s";
export function aimPower(opt, ranked) {
  if ( opt?.action !== "power" || !ranked?.pick || ranked.pick.self ) return opt;
  return {...opt, target: ranked.pick.id, label: `${opt.label} on ${ranked.pick.name}`, why: `${opt.why}; aimed at ${ranked.pick.name} (${ranked.pick.why})`};
}

/**
 * A square lattice laid over a gridless scene, so NPCs can walk it like a square grid (NPC 0.6.0). size: the scene's
 * grid size in pixels. Same calls as Foundry's grid for what WoDX uses: getOffset, getTopLeftPoint, getCenterPoint.
 */
export function latticeGrid(size = 100) {
  const s = Math.max(1, Number(size) || 100);
  return {
    size: s, lattice: true,
    getOffset: p => ({i: Math.floor(Number(p?.y ?? 0) / s), j: Math.floor(Number(p?.x ?? 0) / s)}),
    getTopLeftPoint: c => ({x: c.j * s, y: c.i * s}),
    getCenterPoint: c => ({x: (c.j + 0.5) * s, y: (c.i + 0.5) * s})
  };
}

/** The point d pixels beyond b on the line from a through b (b itself when a and b are the same point). */
export function pastPoint(a, b, d = 3) {
  const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
  if ( !len ) return {x: b.x, y: b.y};
  return {x: b.x + dx / len * d, y: b.y + dy / len * d};
}

/** The distance from point p to the segment [x0, y0, x1, y1]. */
export function segmentDistance(p, c) {
  const [x0, y0, x1, y1] = c, dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p.x - x0) * dx + (p.y - y0) * dy) / L)) : 0;
  return Math.hypot(p.x - (x0 + t * dx), p.y - (y0 + t * dy));
}
/**
 * On a gridless lattice a cell whose centre lies on a wall (within eps pixels) is closed: a path may not slide along
 * the wall line. walls: [{c, move, door, ds}]; a wall that does not block movement, or an open door, does not count.
 */
export function onWall(p, walls = [], eps = 4) {
  return walls.some(w => Array.isArray(w.c) && w.move !== 0 && !(w.door > 0 && w.ds === 1) && segmentDistance(p, w.c) <= eps);
}

/* ------------------------------------------------------------------ */
/*  Phases (NPC 0.9.0)                                                 */
/* ------------------------------------------------------------------ */

/**
 * An NPC can change how it fights when something becomes true: badly hurt, out of Blood, in frenzy, in Crinos. Each
 * phase is a line the Storyteller writes in the behaviour window:
 *
 *   Cornered: wounds >= mauled => aggression 2, caution 0, fleeAt 8
 *   Starving: blood <= 1; kind kindred => template neonate, tactics melee
 *
 * Before "=>" is a WoDX Chronicle "Only when" list (";" between tests); after it, the changes, separated by commas.
 * The first phase whose list passes is in force; none: the profile as saved. Thresholds are the Storyteller's.
 */
export const PHASE_KEYS = ["template", "aggression", "caution", "cunning", "loyalty", "cowardice", "berserk", "power", "herd", "territory", "hunger", "morale", "fleeAt", "tactics", "fears"];

/** Phase text to {phases: [{name, when, changes}], problems}. */
export function parsePhases(text) {
  const phases = [], problems = [];
  for ( const raw of String(text ?? "").split(/\r?\n/) ) {
    const line = raw.replace(/#.*$/, "").trim();
    if ( !line ) continue;
    const m = /^([^:]{1,60}):\s*(.+?)\s*=>\s*(.+)$/.exec(line);
    if ( !m ) { problems.push(`"${line}": write Name: tests => changes`); continue; }
    const changes = {};
    for ( const part of m[3].split(",").map(s => s.trim()).filter(Boolean) ) {
      const [k0, ...v] = part.split(/\s+/);
      const k = PHASE_KEYS.find(x => x.toLowerCase() === k0.toLowerCase());
      if ( !k ) { problems.push(`"${part}": not something a phase can change (${PHASE_KEYS.join(", ")})`); continue; }
      if ( k === "template" ) {
        if ( !TEMPLATES[v[0]] ) { problems.push(`"${part}": no template called ${v[0] ?? ""} (${Object.keys(TEMPLATES).join(", ")})`); continue; }
        changes.template = v[0];
      } else if ( k === "tactics" || k === "fears" ) changes[k] = v.map(x => x.toLowerCase()).filter(Boolean);
      else {
        const n = Number(v[0]);
        if ( !Number.isFinite(n) ) { problems.push(`"${part}": needs a number`); continue; }
        changes[k] = k === "fleeAt" ? Math.max(1, Math.min(8, Math.round(n))) : Math.max(0, Math.min(2, n));
      }
    }
    phases.push({name: m[1].trim(), when: m[2].trim(), changes});
  }
  return {phases, problems};
}

/** The first phase that passes. check: when-text => boolean. Returns the phase or null. */
export function phaseNow(phases = [], check = () => false) {
  for ( const p of phases ?? [] ) { try { if ( check(p.when) ) return p; } catch (e) { /* a list that cannot be read is skipped */ } }
  return null;
}

/** A profile with a phase's changes laid over it. A new template replaces the base, then the phase's own numbers win. */
export function withPhase(profile, phase) {
  if ( !phase ) return profile;
  const base = phase.changes.template ? {...TEMPLATES[phase.changes.template], template: phase.changes.template} : {};
  return {...profile, ...base, ...Object.fromEntries(Object.entries(phase.changes).filter(([k]) => k !== "template")), phase: phase.name};
}

/* ------------------------------------------------------------------ */
/*  Talk sheets (NPC 0.9.0)                                            */
/* ------------------------------------------------------------------ */

/**
 * A talk sheet is the Storyteller's own crib for an NPC: what they will say or do for whom. One line each:
 *   kind kindred => Will not speak of the abbot to a Cainite.
 *   carries bishop's seal => Opens the archive and names the night porter.
 *   Grumbles about the price of salt.
 * Before "=>" is a WoDX Chronicle "Only when" list about the character they talk to (";" between tests); a line with
 * no "=>" is always there. Only the Storyteller sees it. WoDX writes none of it: these are the Storyteller's words.
 * Lines that start with a [topic] are also answers on the player's topic menu (NPC 0.10.0, talk-rules.mjs).
 */
export function parseTalk(text) {
  // NPC 0.10.0: lines in [brackets] are topic-menu lines (talk-rules.mjs); they show here with their topic
  return TK.parseSheet(text).lines;
}

/** The lines that apply. check: when-text => boolean; null: no one to check against (every line, marked). */
export function talkFor(lines = [], check = null) {
  return (lines ?? []).map(l => ({...l, fits: !l.when ? true : check ? !!check(l.when) : null})).filter(l => l.fits !== false);
}
