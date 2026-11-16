/**
 * WoDX Otherworlds: running the Net (B6590 to B6606). Pure rules; net.mjs does the Foundry side.
 *
 * Two Nets share the one status (jacked in, crossing.mjs):
 *  - the classic timeline's Digital Web (Mage 20th printed pp. 466-474): sensory visits from 1990 with VR gear,
 *    astral and holistic immersion for mages;
 *  - the Future Darkness branch's Net (World of Future Darkness, after Cyberpunk 2020's Net chapter, core pdf 131-178):
 *    cyberdecks from 2005 (CP2020 timeline, pdf 182), data fortresses of CPUs, memories, data walls, code gates, ICE
 *    and remotes, Netwatch and the long distance links.
 * Cyberpunk numbers are halved, rounded up, into dots (B6592), as the article halves a system's Intelligence.
 * Every effect names what reads it: a status, damage through WoDX Combat, a Realspace door or light, a secret, money.
 */

const n = v => Math.max(0, Math.trunc(Number(v) || 0));
/** CP2020 strength to WoD dots (B6592): half, rounded up, never below 1 for a real program. */
export const dots = cp => (n(cp) ? Math.max(1, Math.ceil(n(cp) / 2)) : 0);
const succ = (dice, diff = 6) => (dice ?? []).filter(d => d >= diff).length;
const ones = dice => (dice ?? []).filter(d => d === 1).length;
/** Successes less 1s (V20 core: 1s cancel), and whether it botched. */
export function tally(dice, diff = 6) {
  const s = succ(dice, diff), o = ones(dice);
  return {successes: Math.max(0, s - o), botch: s === 0 && o > 0};
}

/* ------------------------------------------------------------------ */
/*  Which Net, and how a character gets in (B6590, B6591)             */
/* ------------------------------------------------------------------ */

export const WEB_FROM = 1990;      // the classic Digital Web (house rule, as NET_FROM)
export const DECK_FROM = 2005;     // the cybermodem (CP2020 pdf 182), Future Darkness branch
export const ICON_FROM = 2014;     // Ihara-Grubb icons for everyone (CP2020 pdf 136)
/** The Net a year and branch have: "deck" (Future branch from 2005), "web" (from 1990), or null. */
export function netKind(year, future = false) {
  const y = n(year);
  if ( future && y >= DECK_FROM ) return "deck";
  if ( y >= WEB_FROM ) return "web";
  return null;
}

/**
 * The ways in (M20 Web Systems chart; CP2020 pdf 138 for the deck interfaces). diff: added to every difficulty in the
 * Net; roll: the roll to get in ({pool, diff, need, extended, seconds}), null when none is needed; spheres: what a mage
 * needs; body: "still" (the mind goes, the body lies still), "gone" (the body goes in, holistic); paradox: vulgar.
 * keyboard: anti-personnel ICE cannot reach the user (all but Firestarter).
 */
export const ACCESS = {
  sensory:  {label: "Sensory (VR gear)", net: "web", diff: 1, mental: true, roll: null, body: "still"},
  astral:   {label: "Astral immersion", net: "web", diff: 0, mental: true, spheres: {correspondence: 2},
             roll: {pool: ["intelligence", "computer"], diff: 7, need: 3}, body: "still"},
  holistic: {label: "Holistic immersion", net: "web", diff: 0, spheres: {life: 4, correspondence: 2, forces: 2}, vulgar: true,
             roll: {pool: ["intelligence", "computer"], diff: 7, need: 5, extended: true, seconds: 30}, body: "gone"},
  plugs:    {label: "Cyberdeck, interface plugs", net: "deck", diff: 0, roll: null, body: "still"},
  trodes:   {label: "Cyberdeck, 'trodes", net: "deck", diff: 1, roll: null, body: "still"},
  keyboard: {label: "Cyberdeck, keyboard and screen", net: "deck", diff: 2, keyboard: true, roll: null, body: "awake"}
};
/** The ways in open in a Net. */
export const accessFor = kind => Object.keys(ACCESS).filter(k => ACCESS[k].net === kind);
/** Whether a character has the spheres for a way in. spheres: {name: dots}. */
export function hasSpheres(way, spheres = {}) {
  const need = ACCESS[way]?.spheres ?? {};
  return Object.entries(need).every(([k, v]) => n(spheres[k]) >= v);
}
/** The Data Sphere (a Virtual Adept chantry's Web link) makes astral immersion difficulty 6 (M20 p. 467). */
export function accessRoll(way, {dataSphere = false} = {}) {
  const r = ACCESS[way]?.roll;
  if ( !r ) return null;
  return {...r, diff: way === "astral" && dataSphere ? 6 : r.diff};
}
/** Mental visitors use Intelligence for Strength and Wits for Dexterity in the Net (M20 chart). */
export function netTraits(way, a = {}) {
  if ( !ACCESS[way]?.mental ) return {...a};
  return {...a, strength: n(a.intelligence), dexterity: n(a.wits)};
}

/* ------------------------------------------------------------------ */
/*  Icons (M20 p. 468) and decks (CP2020 pdf 137-138)                 */
/* ------------------------------------------------------------------ */

/** A new icon: Intelligence + Computer at 5, three successes; base Appearance 1, Intimidation 0, one dot a success beyond. */
export function iconMake(successes, put = "appearance") {
  const s = n(successes);
  if ( s < 3 ) return {made: false};
  const extra = s - 2;
  return {made: true, appearance: 1 + (put === "appearance" ? extra : 0), intimidation: put === "intimidation" ? extra : 0};
}

/**
 * Decks (CP2020 pdf 137-138), in dots: speed (CP 0 to 5, halved up), memory in MU, data walls (halved up). cell: a
 * cellular deck, dropped on a 1 to 25 in 100 in a moving vehicle. sp: armour a combat deck gives (SP 20 is Armor 1).
 */
export const DECKS = {
  standard:  {label: "Standard cyberdeck", speed: 0, mu: 10, walls: 1, cost: 1000},
  portable:  {label: "Portable cyberdeck", speed: 0, mu: 10, walls: 1, cost: 2000},
  cellular:  {label: "Cellular cyberdeck", speed: 0, mu: 10, walls: 1, cell: true, cost: 4000},
  combat:    {label: "Combat deck", speed: 0, mu: 10, walls: 1, armor: 1, cost: 3000},
  kirama:    {label: "Kirama LPD-12", speed: 2, mu: 20, walls: 1, cell: true, cost: 8025},
  elysia:    {label: "SGI Elysia", speed: 2, mu: 20, walls: 4, cost: 4260},
  parraline: {label: "Parraline 5750", speed: 1, mu: 10, walls: 3, cost: 3600}
};
/** WoFD: a deck's speed adds actions. One extra action for each two dots of speed (B6592). */
export const deckActions = speed => 1 + Math.floor(n(speed) / 2);
/** Net initiative (WoFD): Wits + Computer + the deck's speed + a die; a system rolls Intelligence + a die. */
export const runnerInit = ({wits = 0, computer = 0, speed = 0}, die) => n(wits) + n(computer) + n(speed) + n(die);
export const systemInit = (intelligence, die) => n(intelligence) + n(die);

/* ------------------------------------------------------------------ */
/*  Programs and ICE (CP2020 pdf 141-145), in dots (B6593)            */
/* ------------------------------------------------------------------ */

/**
 * cls: the class; str: the CP2020 strength (dots = dots(str)); mu: memory units; hit: what it does when it gets through.
 * hit kinds (read by net.mjs):
 *  wall/gate: breaks a data wall or code gate down by its successes;  alert: rolls the alarm on a die (alarm: faces);
 *  decrypt: opens a code gate or a locked file;  detect: finds runners in sight; trace: traces the line (law heat);
 *  cut: traces and cuts the line (jacks the runner out);  deck: the runner's deck, a status for some turns;
 *  persona: damage to the icon (bashing, WoFD B5821);  body: damage to the body (feedback, M20: lethal or aggravated);
 *  mind: Intelligence points lost, healing like the damage named (M20 hard de-rez precedent);
 *  status: a status for some turns;  fire: a fire at the body in Realspace;  hound: comes back at the next log-on;
 *  hide: stealth;  shield: soak added;  reflect: turns the named programs back;  antiIce: damage to a program's strength;
 *  control: works a remote;  util: a utility (no roll).
 * keyboardSafe: anti-personnel that a keyboard user is immune to (all but Firestarter, pdf 138).
 */
export const PROGRAMS = {
  // Intrusion
  hammer:       {label: "Hammer", cls: "intrusion", str: 4, mu: 1, hit: "wall", alarm: 10},
  jackhammer:   {label: "Jackhammer", cls: "intrusion", str: 2, mu: 2, hit: "wall", alarm: 3},
  worm:         {label: "Worm", cls: "intrusion", str: 2, mu: 5, hit: "wall", alarm: 2, turns: 2},
  // Decryption
  codecracker:  {label: "Codecracker", cls: "decryption", str: 3, mu: 2, hit: "decrypt"},
  wizardsbook:  {label: "Wizard's Book", cls: "decryption", str: 4, mu: 2, hit: "decrypt", vsGate: 6},
  raffles:      {label: "Raffles", cls: "decryption", str: 5, mu: 3, hit: "decrypt"},
  // Detection and alarm
  watchdog:     {label: "Watchdog", cls: "detection", str: 4, mu: 5, hit: "detect", ice: true},
  bloodhound:   {label: "Bloodhound", cls: "detection", str: 3, mu: 5, hit: "trace", ice: true, mobile: true},
  pitbull:      {label: "Pit Bull", cls: "detection", str: 2, mu: 6, hit: "cut", ice: true, mobile: true},
  seeya:        {label: "SeeYa", cls: "detection", str: 3, mu: 1, hit: "detect"},
  hiddenvirtue: {label: "Hidden Virtue", cls: "detection", str: 3, mu: 1, hit: "detect"},
  speedtrap:    {label: "Speedtrap", cls: "detection", str: 4, mu: 4, hit: "detect"},
  // Anti-system: the deck
  flatline:     {label: "Flatline", cls: "antisystem", str: 3, mu: 2, hit: "deck", status: "net-deck-dead", turns: 0, ice: true},
  poisonflat:   {label: "Poison Flatline", cls: "antisystem", str: 2, mu: 2, hit: "deck", status: "net-deck-dead", turns: 0, ice: true},
  krash:        {label: "Krash", cls: "antisystem", str: 3, mu: 2, hit: "deck", status: "net-deck-down", turns: "1d6+1", ice: true},
  deckrash:     {label: "DecKrash", cls: "antisystem", str: 4, mu: 2, hit: "deck", status: "net-deck-down", turns: "1d6+1", ice: true},
  murphy:       {label: "Murphy", cls: "antisystem", str: 3, mu: 2, hit: "deck", status: "net-deck-murphy", turns: "1d6", ice: true},
  virizz:       {label: "Virizz", cls: "antisystem", str: 4, mu: 2, hit: "deck", status: "net-deck-slow", turns: "1d6", ice: true},
  viral15:      {label: "Viral 15", cls: "antisystem", str: 4, mu: 2, hit: "deck", status: "net-deck-wipe", turns: 0, ice: true},
  // Evasion and stealth
  invisibility: {label: "Invisibility", cls: "stealth", str: 3, mu: 1, hit: "hide"},
  stealth:      {label: "Stealth", cls: "stealth", str: 4, mu: 3, hit: "hide"},
  replicator:   {label: "Replicator", cls: "stealth", str: 3, mu: 2, hit: "hide", vsDogs: 4},
  // Protection
  shield:       {label: "Shield", cls: "protection", str: 3, mu: 1, hit: "shield"},
  forceshield:  {label: "Force Shield", cls: "protection", str: 4, mu: 2, hit: "shield"},
  reflector:    {label: "Reflector", cls: "protection", str: 5, mu: 2, hit: "reflect", turns: ["stun", "hellbolt", "knockout"]},
  armor:        {label: "Armor", cls: "protection", str: 4, mu: 2, hit: "shield", less: 2},
  flak:         {label: "Flak", cls: "protection", str: 4, mu: 2, hit: "hide", vsDogs: 2},
  // Anti-IC
  killer2:      {label: "Killer II", cls: "antiice", str: 2, mu: 5, hit: "antiIce", ice: true, mobile: true},
  killer4:      {label: "Killer IV", cls: "antiice", str: 4, mu: 5, hit: "antiIce", ice: true, mobile: true},
  killer6:      {label: "Killer VI", cls: "antiice", str: 6, mu: 5, hit: "antiIce", ice: true, mobile: true},
  manticore:    {label: "Manticore", cls: "antiice", str: 2, mu: 3, hit: "antiIce", ice: true, vs: "demon"},
  hydra:        {label: "Hydra", cls: "antiice", str: 3, mu: 3, hit: "antiIce", ice: true, vs: "demon"},
  dragon:       {label: "Dragon", cls: "antiice", str: 4, mu: 3, hit: "antiIce", ice: true, vs: "demon"},
  aardvark:     {label: "Aardvark", cls: "antiice", str: 4, mu: 3, hit: "antiIce", ice: true, vs: "worm"},
  // Anti-personnel: black ICE (B6597)
  stun:         {label: "Stun", cls: "antipersonnel", str: 3, mu: 3, hit: "status", status: "net-frozen", turns: "1d6", ice: true},
  hellbolt:     {label: "Hellbolt", cls: "antipersonnel", str: 4, mu: 4, hit: "body", damage: "lethal", ice: true},
  sword:        {label: "Sword", cls: "antipersonnel", str: 3, mu: 4, hit: "persona", ice: true},
  brainwipe:    {label: "Brainwipe", cls: "antipersonnel", str: 3, mu: 4, hit: "mind", heals: "lethal", ice: true},
  zombie:       {label: "Zombie", cls: "antipersonnel", str: 5, mu: 4, hit: "mind", heals: "aggravated", ice: true},
  liche:        {label: "Liche", cls: "antipersonnel", str: 4, mu: 4, hit: "mind", heals: "aggravated", ice: true},
  firestarter:  {label: "Firestarter", cls: "antipersonnel", str: 4, mu: 4, hit: "fire", ice: true, reachesKeyboard: true},
  hellhound:    {label: "Hellhound", cls: "antipersonnel", str: 6, mu: 6, hit: "body", damage: "aggravated", hound: true, trace: true, ice: true, mobile: true},
  spazz:        {label: "Spazz", cls: "antipersonnel", str: 4, mu: 3, hit: "status", status: "net-spazzed", turns: "1d6", ice: true},
  glue:         {label: "Glue", cls: "antipersonnel", str: 5, mu: 4, hit: "status", status: "net-frozen", turns: "1d10", traceAfter: 4, ice: true},
  knockout:     {label: "Knockout", cls: "antipersonnel", str: 4, mu: 3, hit: "status", status: "unconscious", hours: "1d6", ice: true},
  jackattack:   {label: "Jack Attack", cls: "antipersonnel", str: 3, mu: 3, hit: "status", status: "net-trapped", turns: "1d6", ice: true},
  // Controllers: work a remote (B6599)
  viddymaster:  {label: "Viddy Master", cls: "controller", str: 4, mu: 3, hit: "control", works: ["videoboard", "camera"]},
  soundmachine: {label: "Soundmachine", cls: "controller", str: 4, mu: 3, hit: "control", works: ["microphone"]},
  opensesame:   {label: "Open Sesame", cls: "controller", str: 3, mu: 2, hit: "control", works: ["door"]},
  genie:        {label: "Genie", cls: "controller", str: 5, mu: 3, hit: "control", works: ["door", "elevator"]},
  hotwire:      {label: "Hotwire", cls: "controller", str: 3, mu: 3, hit: "control", works: ["vehicle"]},
  dee2:         {label: "Dee-2", cls: "controller", str: 3, mu: 3, hit: "control", works: ["vehicle", "manipulator"]},
  crystalball:  {label: "Crystal Ball", cls: "controller", str: 4, mu: 3, hit: "control", works: ["camera", "microphone"]},
  newsat8:      {label: "News At 8", cls: "controller", str: 4, mu: 3, hit: "control", works: ["videoboard"]},
  phonehome:    {label: "Phone Home", cls: "controller", str: 5, mu: 3, hit: "control", works: ["terminal", "printer"]},
  // Utilities
  databaser:    {label: "Databaser", cls: "utility", str: 0, mu: 8, hit: "util"},
  alias:        {label: "Alias", cls: "utility", str: 0, mu: 6, hit: "util"},
  rerezz:       {label: "Re-Rezz", cls: "utility", str: 0, mu: 3, hit: "util"},
  netmap:       {label: "NetMap", cls: "utility", str: 0, mu: 4, hit: "util", bonus: 1},
  filepacker:   {label: "File Packer", cls: "utility", str: 0, mu: 4, hit: "util"}
};
export const DEMONS = {
  imp:      {label: "Imp", str: 3, mu: 3, carries: 2},
  afreet:   {label: "Afreet", str: 3, mu: 4, carries: 3},
  succubus: {label: "Succubus", str: 4, mu: 4, carries: 4},
  balron:   {label: "Balron", str: 5, mu: 5, carries: 4}
};
export const programDots = id => dots(PROGRAMS[id]?.str ?? DEMONS[id]?.str ?? 0);
/** What a deck can carry: the programs' MU add up to the deck's memory at most. */
export function loadOut(deck, ids = []) {
  const D = DECKS[deck] ?? DECKS.standard;
  const out = [], over = [];
  let used = 0;
  for ( const id of ids ) {
    const p = PROGRAMS[id] ?? DEMONS[id];
    if ( !p ) continue;
    if ( used + p.mu > D.mu ) { over.push(id); continue; }
    used += p.mu; out.push(id);
  }
  return {loaded: out, over, used, free: D.mu - used};
}

/* ------------------------------------------------------------------ */
/*  Fortress actions (B6595): WoFD program tests and Net combat       */
/* ------------------------------------------------------------------ */

/**
 * A runner's program against the system (WoFD programTest): Computer + the program's dots against the system's
 * Intelligence + the defence's dots (a wall's or gate's strength, a detection program's), both at 6 plus the way in's
 * difficulty for the runner. More successes wins; the margin is how far it went.
 */
export function contest({computer = 0, program = 0, access = "plugs", extra = 0}, {intelligence = 0, defence = 0}, runnerDice, systemDice) {
  const rd = Math.min(10, 6 + (ACCESS[access]?.diff ?? 0) + n(extra));
  const r = tally(runnerDice, rd), s = tally(systemDice, 6);
  const win = !r.botch && r.successes > s.successes;
  return {runnerPool: n(computer) + n(program), systemPool: n(intelligence) + n(defence), runnerDiff: rd,
    runner: r.successes, system: s.successes, win, margin: win ? r.successes - s.successes : 0, botch: r.botch};
}
/** A wall or gate after an intrusion: its strength less the margin; open at 0. */
export function breach(strength, margin) {
  const left = Math.max(0, n(strength) - n(margin));
  return {left, open: left === 0};
}
/** Whether an intrusion program sets off the alarm: a d10 at or above 11 less the program's alarm faces (pdf 141). */
export const alarmSounds = (id, die) => { const a = PROGRAMS[id]?.alarm ?? 0; return a >= 10 || (a > 0 && n(die) > 10 - a); };
/** Anti-IC: a program's strength (dots) less the hit's margin; de-rezzed at 0 (pdf 157). */
export const antiIce = (strength, margin) => ({left: Math.max(0, n(strength) - n(margin)), derezzed: n(strength) - n(margin) <= 0});

/**
 * What a piece of ICE does when its exchange gets through (B6597). id: the program; levels: the damage dice's
 * successes after soak (net.mjs rolls them); turns: a rolled number for a timed status. keyboard: the runner's way in.
 * Returns {kind, ...} for net.mjs to apply, or {kind: "none", why}.
 */
export function iceHit(id, {levels = 0, turns = 0, access = "plugs", reflected = []} = {}) {
  const P = PROGRAMS[id];
  if ( !P ) return {kind: "none", why: "unknown"};
  if ( reflected.includes(id) ) return {kind: "reflected"};
  if ( ACCESS[access]?.keyboard && P.cls === "antipersonnel" && !P.reachesKeyboard ) return {kind: "none", why: "keyboard"};
  switch ( P.hit ) {
    case "persona": return {kind: "persona", type: "bashing", levels: n(levels)};
    case "body": return {kind: "body", type: P.damage, levels: n(levels), hound: !!P.hound, trace: !!P.trace};
    case "mind": return {kind: "mind", points: Math.max(1, n(levels)), heals: P.heals};
    case "status": return {kind: "status", status: P.status, turns: n(turns), hours: P.hours ? n(turns) : 0, traceAfter: P.traceAfter ?? 0};
    case "fire": return {kind: "fire", size: n(levels) >= 3 ? "large" : "small"};
    case "deck": return {kind: "deck", status: P.status, turns: n(turns)};
    case "trace": return {kind: "trace"};
    case "cut": return {kind: "cut"};
    case "detect": return {kind: "detect"};
    case "antiIce": return {kind: "antiIce", margin: n(levels), vs: P.vs ?? null};
    default: return {kind: "none", why: "no hit"};
  }
}

/* ------------------------------------------------------------------ */
/*  Data fortresses (B6594): the Fast Fortress tables, pdf 168-169     */
/* ------------------------------------------------------------------ */

export const FILES = {
  interoffice:  {label: "Inter-office mail", gives: "lead"},
  database:     {label: "Database", gives: "lead"},
  business:     {label: "Business records", gives: "paydata"},
  transactions: {label: "Financial transactions", gives: "money"},
  greyops:      {label: "Grey operations", gives: "secret"},
  blackops:     {label: "Black operations", gives: "secret", black: true}
};
const FILE_ROLL = ["interoffice", "database", "business", "transactions", "greyops", "blackops"];
export const REMOTES = {
  microphone: {label: "Microphone", does: "listen"},
  camera:     {label: "TV camera", does: "camera"},
  terminal:   {label: "Extra terminal", does: "terminal"},
  videoboard: {label: "Videoboard", does: "message"},
  printer:    {label: "Printer", does: "print"},
  alarm:      {label: "Alarm", does: "alarm"},
  vehicle:    {label: "Remote vehicle or robot", does: "vehicle"},
  door:       {label: "Automatic door or gate", does: "door"},
  elevator:   {label: "Elevator", does: "door"},
  manipulator:{label: "Manipulator or autofactory", does: "machine"},
  lights:     {label: "Building lights", does: "lights"}
};
const REMOTE_ROLL = ["microphone", "camera", "terminal", "videoboard", "printer", "alarm", "vehicle", "door", "elevator", "manipulator"];
const DEF_ROLL = [
  [4, ["watchdog", "watchdog", "bloodhound", "bloodhound", "pitbull", "pitbull"]],
  [6, ["killer", "killer", "manticore", "manticore", "aardvark", "aardvark"]],
  [8, ["flatline", "poisonflat", "krash", "viral15", "deckrash", "murphy"]],
  [10, ["stun", "hellbolt", "brainwipe", "knockout", "zombie", "hellhound"]]
];
export const PERSONALITY = ["Friendly and curious", "Hostile and wary", "Steady and businesslike", "Detached and watchful", "Machine-like", "Remote and lofty"];
export const REACTION = ["neutral", "neutral", "kill", "watch", "report", "talk"];
export const AI_ICON = ["Human", "Geometric", "Mythic", "A voice only", "Machine", "Humanoid"];
export const VIRTUALS = ["Conference room", "Office", "Rec area", "Building", "City", "World"];

/** A seeded number source (mulberry32), so a seed always draws the same fortress. */
export function rng(seed) {
  let a = n(seed) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const die = (r, s) => 1 + Math.floor(r() * s);

/** The killer level a fortress rolls: a d6 picks Killer II, IV or VI (the book's three). */
const killerOf = d => (d <= 2 ? "killer2" : d <= 4 ? "killer4" : "killer6");

/**
 * Draw a fortress (Fast Fortress, pdf 168-169), on a grid. opts: {seed, name, cpus (else 1d6)}. CP strengths halve
 * into dots; the system's Intelligence is netSystem's (3 dots for each 2 CPUs). Returns the model:
 * {seed, name, cpus, intelligence, computer, ai, wall, gates[], memories[{id, x, y, files[]}], ice[], remotes[],
 *  virtual, cols, rows, cells (walls), entry}.
 */
export function fortress({seed = 1, name = "", cpus = 0} = {}) {
  const r = rng(seed);
  const c = n(cpus) ? Math.min(7, n(cpus)) : die(r, 6);
  const intelligence = Math.max(1, Math.floor(c * 3 / 2));
  const wallCp = Math.floor(die(r, 6) / 2) + c;
  const ai = c * 3 >= 12;
  const out = {seed: n(seed), name: name || `System ${n(seed) % 10000}`, cpus: c, intelligence, computer: 5, ai, wall: dots(wallCp)};
  if ( ai ) out.mind = {personality: PERSONALITY[die(r, 6) - 1], reaction: REACTION[die(r, 6) - 1], icon: AI_ICON[die(r, 6) - 1]};
  // the grid: a square inside a ring of data wall, room for the CPUs and memories, a margin outside for the patrols
  const side = 9 + 2 * Math.ceil(c / 2);
  out.cols = side + 6; out.rows = side + 6;
  const x0 = 3, y0 = 3, x1 = x0 + side - 1, y1 = y0 + side - 1;
  out.box = {x0, y0, x1, y1};
  // gates: one a CPU, set in the wall round the sides
  const sides = ["n", "e", "s", "w"];
  out.gates = Array.from({length: c}, (_, i) => {
    const s = sides[i % 4], k = Math.floor(i / 4), off = Math.floor(side / 2) + (k ? (k % 2 ? 2 : -2) * Math.ceil(k / 2) : 0);
    const at = s === "n" ? [x0 + off, y0] : s === "s" ? [x0 + off, y1] : s === "e" ? [x1, y0 + off] : [x0, y0 + off];
    return {id: `gate${i + 1}`, x: at[0], y: at[1], side: s, strength: dots(Math.floor(die(r, 6) / 2) + c), open: false};
  });
  // CPUs in the middle; each brings four memories round it
  const cx = Math.floor((x0 + x1) / 2), cy = Math.floor((y0 + y1) / 2);
  out.cpuCells = Array.from({length: c}, (_, i) => ({x: cx - Math.floor(c / 2) + i, y: cy}));
  out.memories = [];
  for ( let i = 0; i < c * 4; i++ ) {
    const row = i % 2 ? cy + 2 + Math.floor(i / (2 * c)) : cy - 2 - Math.floor(i / (2 * c));
    const col = cx - Math.floor(c / 2) + (Math.floor(i / 2) % c);
    const files = [];
    for ( let k = 0; k < 2; k++ ) {
      const kind = FILE_ROLL[die(r, 6) - 1];
      files.push({id: `f${i + 1}${k ? "b" : "a"}`, kind, label: FILES[kind].label, locked: r() < 0.3, lock: 0});
    }
    for ( const f of files ) if ( f.locked ) f.lock = dots(Math.floor(die(r, 6) / 2) + c);
    out.memories.push({id: `mem${i + 1}`, x: Math.min(x1 - 1, Math.max(x0 + 1, col)), y: Math.min(y1 - 1, Math.max(y0 + 1, row)), files});
  }
  // defences: 1d6 + CPUs
  const nd = die(r, 6) + c;
  out.ice = [];
  for ( let i = 0; i < nd; i++ ) {
    const t = die(r, 10), sub = die(r, 6) - 1;
    let id = DEF_ROLL.find(([max]) => t <= max)[1][sub];
    if ( id === "killer" ) id = killerOf(die(r, 6));
    const P = PROGRAMS[id];
    // patrols (killers, hounds) walk one square outside the wall; the rest stand by the CPUs and memories
    const inside = !P.mobile;
    const pos = inside ? {x: cx + (i % 5) - 2, y: cy + (i % 2 ? 1 : -1)} : ringCell(out.box, i, nd);
    out.ice.push({id: `ice${i + 1}`, program: id, label: P.label, strength: dots(P.str), x: pos.x, y: pos.y, mobile: !!P.mobile, up: true});
  }
  // remotes: 1d6 of them, along the inner side of the wall
  const nr = die(r, 6);
  out.remotes = Array.from({length: nr}, (_, i) => {
    const kind = REMOTE_ROLL[die(r, 10) - 1];
    return {id: `rem${i + 1}`, kind, label: REMOTES[kind].label, x: x0 + 1 + (i * 2) % (side - 2), y: y1 - 1, link: null};
  });
  if ( die(r, 6) >= 5 ) out.virtual = {kind: VIRTUALS[die(r, 6) - 1], realism: ["Simple", "Simple", "Contextual", "Fractal", "Photorealistic", "Beyond real"][die(r, 6) - 1]};
  out.entry = {x: Math.floor(out.cols / 2), y: out.rows - 1};
  return out;
}
function ringCell(b, i, nTotal) {
  const per = 2 * (b.x1 - b.x0 + 2) + 2 * (b.y1 - b.y0 + 2);
  const step = Math.max(1, Math.floor(per / Math.max(1, nTotal)));
  let k = (i * step) % per;
  const w = b.x1 - b.x0 + 2, h = b.y1 - b.y0 + 2;
  if ( k < w ) return {x: b.x0 - 1 + k, y: b.y0 - 1};
  k -= w; if ( k < h ) return {x: b.x1 + 1, y: b.y0 - 1 + k};
  k -= h; if ( k < w ) return {x: b.x1 + 1 - k, y: b.y1 + 1};
  k -= w; return {x: b.x0 - 1, y: b.y1 + 1 - k};
}
/** The wall cells of a fortress, as segments in grid units [[x1, y1, x2, y2]], with the gates left as doors. */
export function wallSegments(m) {
  const {x0, y0, x1, y1} = m.box, segs = [];
  const gate = (x, y) => m.gates.find(g => g.x === x && g.y === y);
  const push = (ax, ay, bx, by, g) => segs.push({c: [ax, ay, bx, by], gate: g?.id ?? null});
  for ( let x = x0; x <= x1; x++ ) { push(x, y0, x + 1, y0, gate(x, y0)); push(x, y1 + 1, x + 1, y1 + 1, gate(x, y1)); }
  for ( let y = y0; y <= y1; y++ ) { push(x0, y, x0, y + 1, gate(x0, y)); push(x1 + 1, y, x1 + 1, y + 1, gate(x1, y)); }
  return segs;
}

/** Placeholder art (B6605): a dark grid, the wall in cyan, CPUs and memories as plain marked squares. Art will be redrawn. */
export function svg(m, px = 100) {
  const W = m.cols * px, H = m.rows * px, b = m.box;
  const rect = (x, y, w, h, fill, stroke = "none", extra = "") => `<rect x="${x * px}" y="${y * px}" width="${w * px}" height="${h * px}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
  const lines = [];
  for ( let x = 0; x <= m.cols; x++ ) lines.push(`<line x1="${x * px}" y1="0" x2="${x * px}" y2="${H}"/>`);
  for ( let y = 0; y <= m.rows; y++ ) lines.push(`<line x1="0" y1="${y * px}" x2="${W}" y2="${y * px}"/>`);
  const txt = (x, y, t, size = 18, fill = "#8ff") => `<text x="${(x + 0.5) * px}" y="${(y + 0.62) * px}" font-family="monospace" font-size="${size}" fill="${fill}" text-anchor="middle">${String(t).replace(/[<&>]/g, "")}</text>`;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    rect(0, 0, m.cols, m.rows, "#03080b"),
    `<g stroke="#0d3a3a" stroke-width="2">${lines.join("")}</g>`,
    rect(b.x0, b.y0, b.x1 - b.x0 + 1, b.y1 - b.y0 + 1, "#061a1c", "#2ff", `stroke-width="10"`),
    ...m.gates.map(g => rect(g.x, g.y, 1, 1, "#3a2a00", "#fc3", `stroke-width="8"`) + txt(g.x, g.y, "GATE", 16, "#fc3")),
    ...m.cpuCells.map(c => rect(c.x + 0.1, c.y + 0.1, 0.8, 0.8, "#0a3", "#5f8", `stroke-width="6"`) + txt(c.x, c.y, "CPU", 20, "#dfd")),
    ...m.memories.map(mm => rect(mm.x + 0.15, mm.y + 0.15, 0.7, 0.7, "#123", "#4af", `stroke-width="4"`) + txt(mm.x, mm.y, "MEM", 16, "#9cf")),
    ...m.remotes.map(rm => rect(rm.x + 0.2, rm.y + 0.2, 0.6, 0.6, "#311", "#f86", `stroke-width="4"`) + txt(rm.x, rm.y, rm.kind.slice(0, 4).toUpperCase(), 14, "#fba")),
    rect(m.entry.x, m.entry.y, 1, 1, "#022", "#0ff", `stroke-dasharray="12 8" stroke-width="6"`),
    txt(m.entry.x, m.entry.y, "LDL", 18, "#0ff"),
    `</svg>`
  ];
  return parts.join("");
}

/* ------------------------------------------------------------------ */
/*  What files give (B6598)                                           */
/* ------------------------------------------------------------------ */

/**
 * A file read or copied: what it gives the world. kind: FILES key; die: a d10 for the size of a money or paydata file.
 * Sums are in months' wages of a one-dot worker of the year and land (WoDX Storyteller money), so they fit every era:
 *  money: a transfer out of a transactions file, a die times half a month's wage, into the runner's purse (law heat:
 *         theft); paydata: business records sold to a fence, a die times a quarter of a month's wage;
 *  secret: grey ops a secret of the owner (a crime), black ops a weighty one; lead: a database or the office mail
 *         gives up a secret of someone the system knows (WoDX NPC secrets: a Ledger hook, a Lone Chronicle lead).
 */
export function fileGives(kind, die = 5) {
  const F = FILES[kind];
  if ( !F ) return {gives: "nothing"};
  const d = Math.max(1, Math.min(10, n(die)));
  if ( F.gives === "money" ) return {gives: "money", wages: d / 2, heat: "theft"};
  if ( F.gives === "paydata" ) return {gives: "money", wages: d / 4, fenced: true};
  if ( F.gives === "secret" ) return {gives: "secret", weight: F.black ? 2 : 1, kind: "crime"};
  return {gives: "lead", weight: 1, of: kind === "database" ? "anyone" : "owner"};
}

/* ------------------------------------------------------------------ */
/*  Long distance links, trace and Netwatch (B6600; pdf 135, 150-151) */
/* ------------------------------------------------------------------ */

/** The Net's regions (pdf 133-134) and the trace value each hop through them adds (house values). */
export const REGIONS = {
  atlantis: {label: "Atlantis (North America east)", ldl: 2}, rustbelt: {label: "Rustbelt", ldl: 1}, olympia: {label: "Olympia (US west)", ldl: 2},
  pacifica: {label: "Pacifica", ldl: 2}, tokyochiba: {label: "TokyoChiba", ldl: 3}, afrikani: {label: "Afrikani", ldl: 1},
  eurotheatre: {label: "EuroTheatre", ldl: 3}, sovspace: {label: "SovSpace (with Prague, Vienna and Budapest)", ldl: 2}, orbitsville: {label: "Orbitsville", ldl: 4}
};
/** The trace on a route: the sum of the hops' values. */
export const routeTrace = (hops = []) => hops.reduce((s, h) => s + (REGIONS[h]?.ldl ?? 1), 0);
/**
 * A trace (pdf 150): the tracing program's dots + a d10 against the route's trace + a d10. Traced: the runner's
 * location is known (WoDX Chronicle law heat, "break").
 */
export const traced = (strength, route, dTrace, dRoute) => n(strength) + n(dTrace) > n(route) + n(dRoute);
/**
 * Crossing a long distance link (pdf 150-151): a d10 at or above the link's security passes. Else a d6:
 * 1 to 4 cut off and charged; 5 Netwatch takes the runner's code; 6 a bust attempt.
 */
export function ldlCross(level, d10, d6) {
  if ( n(d10) >= n(level) ) return {pass: true};
  const s = n(d6);
  if ( s <= 4 ) return {pass: false, what: "cut"};
  if ( s === 5 ) return {pass: false, what: "code"};
  return {pass: false, what: "bust"};
}

/* ------------------------------------------------------------------ */
/*  Whiteout and de-rez (B6601, B6602; M20 printed pp. 470-473)        */
/* ------------------------------------------------------------------ */

export const WHITEOUT_AT = 5;
/** Whether a mage's Paradox in the Web brings a Whiteout. */
export const whiteoutDue = pool => n(pool) >= WHITEOUT_AT;
/** The Whiteout's roll: a die per Paradox point at 6, at 4 when Forces or Prime were thrown about (not in a war sector). */
export const whiteoutDiff = ({heavy = false, warzone = false} = {}) => (heavy && !warzone ? 4 : 6);
/** What a Whiteout does by its successes: who it reaches (self, 20 ft, 50 ft, sector) and how (soft, hard). */
export function whiteoutSeverity(successes) {
  const s = n(successes);
  if ( s <= 0 ) return {reach: "none"};
  if ( s === 1 ) return {reach: "self", self: "soft"};
  if ( s === 2 ) return {reach: "self", self: "hard"};
  if ( s === 3 ) return {reach: 20, self: "soft", others: "soft"};
  if ( s === 4 ) return {reach: 50, self: "hard", others: "hard"};
  if ( s === 5 ) return {reach: "sector", self: "hard", others: "soft"};
  if ( s === 6 ) return {reach: "sector", self: "lost", others: "hard", down: true};
  if ( s < 10 ) return {reach: "sector", self: "dump", others: "hard", down: true, harm: true};
  return {reach: "sector", self: "gone", others: "hard", down: true, forever: true};
}
/** How long the sector stays down, in seconds, by the Paradox pool (null: for good). */
export function whiteoutLasts(pool) {
  const p = n(pool);
  if ( p <= 3 ) return 50;
  if ( p <= 6 ) return 3 * 60;
  if ( p <= 10 ) return 3 * 3600;
  if ( p <= 13 ) return 86400;
  if ( p <= 16 ) return 7 * 86400;
  if ( p <= 20 ) return 30 * 86400;
  return null;
}
/** Above 10 points the lag warns everyone near: Wits + Computer at 8 to drop out; a failure takes half, a botch all. */
export const lagWarns = pool => n(pool) > 10;
export function lagEscape(dice) {
  const t = tally(dice, 8);
  return t.botch ? "full" : t.successes ? "out" : "half";
}
/**
 * A de-rez. kind: soft or hard; access: the way in; dice: the soak or Stamina roll's dice where one is made.
 * Soft: 1 to 3 bashing, no soak (holistic 1 to 4, soaked, +2 difficulties an hour or two); hard: 2 lethal, soaked at
 * 7 (not holistic), and Stamina at 7 or lose 2 Intelligence that heal as lethal. restricted: a soft de-rez there costs
 * a dot of Intelligence for as long.
 */
export function derez(kind, {access = "sensory", severity = 2, soakDice = [], staminaDice = [], restricted = false} = {}) {
  const holo = ACCESS[access]?.body === "gone";
  if ( kind === "soft" ) {
    const lv = Math.max(1, Math.min(holo ? 4 : 3, n(severity)));
    const soaked = holo ? tally(soakDice, 6).successes : 0;
    return {type: "bashing", levels: Math.max(0, lv - soaked), out: false, dazed: holo ? 2 : 0, mind: restricted ? 1 : 0, mindHeals: "time"};
  }
  const soaked = holo ? 0 : tally(soakDice, 7).successes;
  const st = tally(staminaDice, 7);
  return {type: "lethal", levels: Math.max(0, 2 - soaked), out: true, mind: st.successes ? 0 : 2, mindHeals: "lethal"};
}
/**
 * Icon death (M20 p. 473): Stamina at 7. Success: unconscious, the icon's wounds come through as bashing less the
 * successes; failure: lethal and a coma; botch: aggravated. A holistic visitor who dies online dies.
 */
export function iconDeath({access = "sensory", iconLevels = 0, staminaDice = [], restricted = false} = {}) {
  if ( ACCESS[access]?.body === "gone" ) return {dies: true};
  const t = tally(staminaDice, 7);
  const lv = n(iconLevels);
  const base = t.botch ? {type: "aggravated", levels: lv, coma: true} : t.successes ? {type: "bashing", levels: Math.max(0, lv - t.successes), coma: false} : {type: "lethal", levels: lv, coma: true};
  return {...base, unconscious: true, dazed: 3, mind: restricted ? 2 : 0};
}

/* ------------------------------------------------------------------ */
/*  The Net statuses (read by net.mjs, the token HUD and WoDX Combat)  */
/* ------------------------------------------------------------------ */

export const STATUSES = {
  "net-frozen":      {label: "Frozen in the Net", img: "icons/svg/frozen.svg", hint: "Cannot act or jack out."},
  "net-trapped":     {label: "Cannot jack out", img: "icons/svg/net.svg", hint: "Jacking out fails until it ends."},
  "net-spazzed":     {label: "Reflexes scrambled", img: "icons/svg/daze.svg", hint: "Dexterity rolls at +2 difficulty."},
  "net-deck-down":   {label: "Deck crashed", img: "icons/svg/lightning.svg", hint: "No programs run until it ends."},
  "net-deck-dead":   {label: "Deck burned out", img: "icons/svg/fire.svg", hint: "The deck needs repair before it runs again."},
  "net-deck-murphy": {label: "Deck running wild", img: "icons/svg/explosion.svg", hint: "Each program run picks a random program instead."},
  "net-deck-slow":   {label: "Deck slowed", img: "icons/svg/clockwork.svg", hint: "The deck's speed counts 0."},
  "net-deck-wipe":   {label: "Deck memory wiped", img: "icons/svg/degen.svg", hint: "Every program but the last is erased."},
  "net-traced":      {label: "Traced", img: "icons/svg/target.svg", hint: "The runner's location is known."},
  "net-hounded":     {label: "Hunted by a Hellhound", img: "icons/svg/terror.svg", hint: "The Hellhound strikes at the next log-on."},
  "net-dazed":       {label: "Net shock", img: "icons/svg/stoned.svg", hint: "+2 to all difficulties for an hour or two."}
};
/** The difficulty added to a runner's rolls by the Net statuses on them. */
export function statusDiff(statuses = []) {
  const s = new Set(statuses);
  return (s.has("net-dazed") ? 2 : 0);
}
/** The deck's speed with statuses: slowed counts 0. */
export const speedWith = (speed, statuses = []) => (statuses.includes("net-deck-slow") ? 0 : n(speed));
/** Whether a runner can run programs and act at all. */
export function canAct(statuses = []) {
  const s = new Set(statuses);
  return {act: !s.has("net-frozen") && !s.has("unconscious"), programs: !s.has("net-deck-down") && !s.has("net-deck-dead"), jackOut: !s.has("net-trapped") && !s.has("net-frozen")};
}

/* ------------------------------------------------------------------ */
/*  ICE on its own (B6596): what each piece does on its turn           */
/* ------------------------------------------------------------------ */

/** Grid distance (squares, diagonal as one). */
export const dist = (a, b) => Math.max(Math.abs(n(a.x) - n(b.x)), Math.abs(n(a.y) - n(b.y)));
export const SIGHT = 20;
/**
 * A piece of ICE's turn. ice: {program, x, y, mobile, up}; runners: [{id, x, y, hidden (a stealth margin), alerted}];
 * alarm: the fortress is alerted. reaction: an AI's reaction ("kill", "watch", "report", "talk", "neutral").
 * Returns {act: "attack"|"move"|"alarm"|"wait"|"report"|"talk", target, to: {x, y}}.
 */
export function iceTurn(ice, runners = [], {alarm = false, reaction = "kill"} = {}) {
  if ( !ice?.up ) return {act: "wait"};
  const P = PROGRAMS[ice.program] ?? {};
  const seen = runners.filter(r => !r.hidden && dist(ice, r) <= SIGHT).sort((a, b) => dist(ice, a) - dist(ice, b));
  if ( !seen.length ) return {act: "wait"};
  const t = seen[0];
  if ( reaction === "watch" && !alarm ) return {act: "wait", target: t.id};
  if ( reaction === "report" && !alarm ) return {act: "report", target: t.id};
  if ( reaction === "talk" && !alarm ) return {act: "talk", target: t.id};
  if ( P.hit === "detect" ) return alarm ? {act: "wait"} : {act: "alarm", target: t.id};
  if ( !alarm && reaction === "neutral" && P.cls !== "detection" ) return {act: "wait"};
  const reach = P.mobile ? 1 : 2;
  if ( dist(ice, t) <= reach ) return {act: "attack", target: t.id};
  if ( !P.mobile ) return {act: P.ice && dist(ice, t) <= SIGHT ? "attack" : "wait", target: t.id};
  const step = Math.min(5, dist(ice, t) - 1);
  const dx = Math.sign(t.x - ice.x), dy = Math.sign(t.y - ice.y);
  return {act: "move", target: t.id, to: {x: ice.x + dx * Math.min(step, Math.abs(t.x - ice.x)), y: ice.y + dy * Math.min(step, Math.abs(t.y - ice.y))}};
}
