/**
 * Beginner and Full views for players (B2810 to B2816). Pure rules: no Foundry calls here, so the harness can test
 * them. The view only changes where things are shown; every button and action stays reachable, in a drawer, a token
 * menu group, or the Find anything search.
 */

export const VIEWS = {beginner: "Beginner", full: "Full"};

/**
 * The view one player sees. mine: the player's own pick ("" follows the Storyteller), byUser: the Storyteller's pick
 * for this player, fallback: the world's default for players nobody has picked for.
 */
export function viewFor({mine = "", byUser = "", fallback = "full"} = {}) {
  if ( VIEWS[mine] ) return mine;
  if ( VIEWS[byUser] ) return byUser;
  return VIEWS[fallback] ? fallback : "full";
}

/** The toolbar drawers in Beginner view, in order. X-card and Find my character are never put in a drawer. */
export const GROUPS = [
  {id: "now", label: "Right now", icon: "fa-solid fa-hand", hint: "Talk, notice, your sight, the case board"},
  {id: "mine", label: "Me and mine", icon: "fa-solid fa-user", hint: "Experience, followers, orders, factions, gear"},
  {id: "time", label: "Time and tasks", icon: "fa-solid fa-hourglass", hint: "The clock, travel, waiting, letters, long work"},
  {id: "beyond", label: "Beyond the world", icon: "fa-solid fa-door-open", hint: "The Umbra, the Shadowlands, the Net, the spirits"},
  {id: "help", label: "Help and story", icon: "fa-solid fa-book-open", hint: "The Library, legends of the chronicle"}
];

/** Always on the bar, in every view. */
export const ON_BAR = new Set(["wodxXCard", "wodxFindMe", "wodxFind", "wodxNow"]);

/** Which drawer each WoDX player button goes in. A WoDX button not listed here stays on the bar. */
export const TOOL_GROUP = {
  wodxTalk: "now", wodxSenses: "now", wodxSight: "now", wodxCaseBoard: "now",
  wodxCreation: "mine", wodxPrefs: "mine", wodxFollowers: "mine", wodxCults: "mine", wodxOrders: "mine", wodxFactions: "mine", wodxGear: "mine", wodxDress: "mine",
  wodxClock: "time", wodxOnYourOwn: "time", wodxPassTime: "time", wodxLetters: "time", wodxDowntime: "time",
  wodxTasks: "time", wodxClocks: "time", wodxProperty: "time", wodxSolo: "time",
  wodxStepSideways: "beyond", wodxPeek: "beyond", wodxSoul: "beyond", wodxSpirits: "beyond", wodxOtherRolls: "beyond",
  wodxJack: "beyond",
  wodxLibrary: "help", wodxGlossary: "help", wodxLegends: "help"
};

/**
 * Which lines a button belongs to (the Actions line profile: kindred, ghoul, lupine, mage, fae, wraith, hunter,
 * demon, mummy, exalted, beast, mortal, spirit). A button not listed fits every line. A Storyteller ruling still
 * works: a button that does not fit is under More in its drawer, never gone.
 */
export const TOOL_LINES = {
  wodxStepSideways: ["lupine", "spirit"],
  wodxPeek: ["lupine", "spirit", "mage"],
  wodxSpirits: ["lupine", "mage", "spirit"],
  wodxOtherRolls: ["lupine", "mage", "fae", "wraith", "spirit"],
  wodxSoul: ["kindred", "ghoul", "lupine", "mage", "fae", "wraith", "hunter", "demon", "mummy", "exalted", "spirit"],
  wodxSight: ["kindred", "ghoul", "lupine", "wraith"]
};

/** Buttons that belong to a span of years (the Net opens in 1990, as Otherworlds says). */
export const TOOL_YEARS = {wodxJack: {from: 1990}};

/** Does this button fit the character now? kind: line profile ("" when there is no character), year: chronicle year. */
export function fits(name, {kind = "", year = null} = {}) {
  const lines = TOOL_LINES[name];
  if ( lines && kind && !lines.includes(kind) ) return false;
  const span = TOOL_YEARS[name];
  if ( span && Number.isFinite(year) ) {
    if ( span.from != null && year < span.from ) return false;
    if ( span.to != null && year > span.to ) return false;
  }
  return true;
}

/**
 * Sort the shown WoDX buttons for Beginner view. tools: [{name, title, icon}] already allowed for this player (the
 * Storyteller's hides and Storyteller-only buttons are left out before this). Returns {bar: [names], drawers:
 * {groupId: {fit: [tool], more: [tool]}}}. Buttons not in TOOL_GROUP stay on the bar.
 */
export function sortTools(tools = [], ctx = {}) {
  const bar = []; const drawers = {};
  for ( const g of GROUPS ) drawers[g.id] = {fit: [], more: []};
  for ( const t of tools ) {
    const g = TOOL_GROUP[t.name];
    if ( ON_BAR.has(t.name) || !g ) { bar.push(t.name); continue; }
    (fits(t.name, ctx) ? drawers[g].fit : drawers[g].more).push(t);
  }
  return {bar, drawers};
}

/**
 * Token menu groups in Beginner view (Act, Move, Look, Talk). cls: the button's class list as text. Returns the group
 * id, "keep" for a button left where it is (the Actions book, Foundry's own), or null for a button not from WoDX.
 */
export const HUD_GROUPS = [
  {id: "act", label: "Act", icon: "fa-solid fa-hand-fist"},
  {id: "move", label: "Move", icon: "fa-solid fa-person-walking"},
  {id: "look", label: "Look", icon: "fa-solid fa-eye"},
  {id: "talk", label: "Talk", icon: "fa-solid fa-comments"}
];
export function hudGroupOf(cls = "") {
  const c = ` ${String(cls)} `;
  if ( / vta-hud /.test(c) || / wodx-hud-group/.test(c) ) return "keep";
  if ( !/ (vt[a-z]-|wix-|wnpc-|wsn-|wodx-)/.test(c) ) return null;
  if ( / (vtc-room|vtc-burden-btn|wodx-sprite-pose|wix-carry-hud) /.test(c) ) return "move";
  if ( / (wsn-[a-z-]+|wix-hud) /.test(c) ) return "look";
  if ( / (wnpc-faces-hud|wnpc-talk[a-z-]*) /.test(c) ) return "talk";
  return "act";
}

/**
 * Find anything: score each entry against the words typed. entries: [{label, hint, kind}]. Every word must appear in
 * the label or the hint; a match at the start of the label scores higher. Returns the best `limit` entries.
 */
export function search(entries = [], q = "", limit = 40) {
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  if ( !words.length ) return [];
  const out = [];
  for ( const e of entries ) {
    const label = String(e.label ?? "").toLowerCase();
    const text = `${label} ${String(e.hint ?? "").toLowerCase()} ${String(e.kindLabel ?? "").toLowerCase()}`;
    if ( !words.every(w => text.includes(w)) ) continue;
    let score = 0;
    for ( const w of words ) {
      if ( label.startsWith(w) ) score += 4;
      else if ( new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(label) ) score += 3;
      else if ( label.includes(w) ) score += 2;
      else score += 1;
    }
    out.push({e, score});
  }
  out.sort((a, b) => b.score - a.score || String(a.e.label).localeCompare(String(b.e.label)));
  return out.slice(0, limit).map(x => x.e);
}

/** The kinds of thing Find anything lists, as shown beside each result. */
export const KINDS = {tool: "Button", action: "Action", page: "Library and journals", setting: "Setting"};

/* Quieter chat (B2820): world cards fold to one line for players in Beginner view. */
export const WORLD_ALIASES = ["Weather", "The dawn"];
/**
 * Is this chat message a world card (weather, the dawn, overheard talk, an NPC's passing remark, an NPC routine)?
 * Rolls and anything with dice are never folded. m: {flags, alias, rolls, html}.
 */
export function isWorldCard({flags = {}, alias = "", rolls = 0, html = ""} = {}) {
  if ( rolls ) return false;
  if ( /vta-dice|vta-res|vta-sec/.test(String(html)) ) return false;
  const npc = flags?.["wodx-npc"] ?? {};
  if ( npc.overheard || npc.bark || npc.routine ) return true;
  if ( flags?.["wodx-atmosphere"] ) return true;
  return WORLD_ALIASES.includes(String(alias));
}
/** The one line a folded card shows: its first words, cut at a word near n characters. */
export function oneLine(text = "", n = 90) {
  const t = String(text).replace(/\s+/g, " ").trim();
  if ( t.length <= n ) return t;
  const cut = t.slice(0, n);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > n / 2 ? cut.slice(0, sp) : cut).replace(/[,;:.]$/, "")}...`;
}

/* What can I do now? (B2826): the moment, and the three to six things that make sense in it. */

/**
 * The moment the player is in. ctx: {hasActor, onScene (a token of the character on the scene being viewed), inFight
 * (that token is in the running fight), myTurn, needsInit (in the fight without initiative), beyond (the token
 * stands in the Umbra, the Shadowlands, the Dreaming or on a realm scene)}. Returns a key of MOMENTS.
 */
export function moment(ctx = {}) {
  if ( !ctx.hasActor ) return "nobody";
  if ( ctx.inFight ) return ctx.needsInit ? "fightStart" : ctx.myTurn ? "fightTurn" : "fightWait";
  if ( !ctx.onScene ) return "between";
  return ctx.beyond ? "beyond" : "scene";
}

/**
 * Per moment: a heading in plain words and the things to offer, best first. Each thing names how it runs: tool (a
 * toolbar button, offered only when this player has it), spec (an Actions menu entry), check (an Actions common
 * check), call (a named helper in player-view.mjs). The first six that this player can use are shown.
 */
export const MOMENTS = {
  nobody: {head: "You have no character yet.", items: [
    {call: "askChar", label: "Ask the Storyteller for a character", hint: "A short note goes to the Storyteller."},
    {tool: "wodxCreation", label: "Make or grow a character"},
    {tool: "wodxLibrary", label: "Read about the world", hint: "The Library: the lines, the eras, the rules in brief."}]},
  fightStart: {head: "A fight is starting.", items: [
    {call: "initiative", label: "Roll initiative", hint: "Your place in the order of the fight."},
    {call: "sheet", label: "Look over your sheet"}]},
  fightTurn: {head: "It is your turn in the fight.", items: [
    {call: "attack", label: "Attack", hint: "Pick a target and a weapon, or fists."},
    {call: "quickAttack", label: "Quick attack", hint: "Your best attack on the target, at once."},
    {spec: "power", label: "Use one of your powers"},
    {spec: "action", label: "Try something else", hint: "Any roll: you say what, the dice say how well."},
    {call: "endTurn", label: "End my turn"}]},
  fightWait: {head: "The fight goes on; it is not your turn.", items: [
    {call: "order", label: "See the fight order"},
    {call: "sheet", label: "Check your health and pools"},
    {check: "react", label: "React in time", hint: "When something comes at you out of turn."},
    {spec: "power", label: "Use one of your powers"}]},
  beyond: {head: "You are past the edge of the everyday world.", items: [
    {check: "notice", label: "Look around"},
    {tool: "wodxOtherRolls", label: "Rolls for this place", hint: "Crossing back, the Gauntlet, the Shroud, the Mists."},
    {tool: "wodxStepSideways", label: "Step back across"},
    {tool: "wodxTalk", label: "Talk to someone here"},
    {spec: "power", label: "Use one of your powers"},
    {tool: "wodxFindMe", label: "Find my character"}]},
  scene: {head: "You are in the scene.", items: [
    {check: "notice", label: "Look around", hint: "Notice what is there to notice."},
    {tool: "wodxTalk", label: "Talk to someone", hint: "The person you target, or the nearest one."},
    {spec: "action", label: "Try something", hint: "Any roll: you say what, the dice say how well."},
    {spec: "power", label: "Use one of your powers"},
    {tool: "wodxPassTime", label: "Let time pass"},
    {call: "sheet", label: "Open your sheet"}]},
  between: {head: "Your character is not on this scene.", items: [
    {tool: "wodxFindMe", label: "Go to my character", hint: "The scene where your token is."},
    {tool: "wodxDowntime", label: "Say what your character does meanwhile"},
    {tool: "wodxLetters", label: "Send a letter or a message"},
    {tool: "wodxPassTime", label: "Let time pass"},
    {tool: "wodxCreation", label: "Spend experience"},
    {call: "sheet", label: "Open your sheet"}]}
};

/** At most this many things for one moment, before the I am stuck row. */
export const NOW_MAX = 6;

/**
 * The things to show. have: {tools: Set of toolbar button names this player has, actions: bool (Actions is on),
 * power: the Actions entry for the line's powers or null, calls: Set of helper names that can run here}. Pure.
 */
export function nowItems(key, have = {}) {
  const m = MOMENTS[key] ?? MOMENTS.scene;
  const tools = have.tools ?? new Set(), calls = have.calls ?? new Set();
  const ok = it => {
    if ( it.tool ) return tools.has(it.tool);
    if ( it.spec === "power" ) return !!(have.actions && have.power);
    if ( it.spec || it.check ) return !!have.actions;
    if ( it.call ) return calls.has(it.call);
    return false;
  };
  return {head: m.head, items: m.items.filter(ok).slice(0, NOW_MAX).map(it => (it.spec === "power" ? {...it, spec: have.power} : it))};
}

/** The I am stuck row, the last row in every moment. With solo play on, the seat fixes it; else the Storyteller is told. */
export const STUCK_ROW = [
  {id: "lead", label: "I do not know what to do next", solo: "lead"},
  {id: "token", label: "My token is stuck", solo: "token"},
  {id: "fight", label: "A fight or a window is hung", solo: "fight"}
];

/** The Actions entry that uses the line's own powers, out of the entries the menu lists (the same words as Sheets). */
const POWER_SPEC = /usediscipline|usegift|usearcanos|hunterpower|cast|cantrip|hekau|usecharm|uselore|useedge|chi|shintai|numina/i;
export function powerFrom(specs = []) { return specs.find(s => POWER_SPEC.test(String(s))) ?? null; }

/* My WoDX preferences (B2836): one window for the player's own settings, with three presets. */

/** What a preset touches: the screen and sound effects. Reading aids (text size, colour-blind colours, the quiet interface, odds) are never changed. */
const FX = /colour on the map|sound|cue|dread|card when|frame|heartbeat|decay|looks of|motion|map effects|talking faces|music|scent trails|sight on my map|state on my screen|frenzy and/i;
const KEEP = /text size|colour-blind|quiet interface|odds|words under|targeting|voice|folder|address|my view/i;
export const PRESETS = {
  light: {label: "Light", hint: "Fewer effects and sounds; good for a slow machine."},
  standard: {label: "Standard", hint: "Everything as WoDX ships it."},
  full: {label: "Full", hint: "Every effect and sound on."}
};
const LESS = /^(off|none|no|never|reduced|less|low|quiet|minimal|still)$/i;
const MORE = /^(full|all|on|always|more|high|rich|everything)$/i;

/** Is this setting one the presets change? s: {name, type ("Boolean", "String", "Number"), choices}. */
export const presetTouches = (s = {}) => FX.test(String(s.name ?? "")) && !KEEP.test(String(s.name ?? ""));

/**
 * The value a preset gives one setting, or undefined to leave it. s: {name, type, choices (object or null), default}.
 * Light turns a switch off and picks the quietest choice, Full the opposite, Standard the default.
 */
export function presetValue(s = {}, preset = "standard") {
  if ( !presetTouches(s) ) return undefined;
  if ( preset === "standard" ) return s.default;
  const light = preset === "light";
  if ( s.type === "Boolean" ) return !light;
  if ( s.choices && typeof s.choices === "object" ) {
    const keys = Object.keys(s.choices);
    const want = light ? LESS : MORE;
    return keys.find(k => want.test(k)) ?? keys.find(k => want.test(String(s.choices[k]).split(/[\s(,:]/)[0])) ?? undefined;
  }
  if ( s.type === "Number" && /volume/i.test(String(s.name)) ) return light ? 0 : undefined;
  return undefined;
}
