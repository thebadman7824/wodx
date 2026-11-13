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
export const ON_BAR = new Set(["wodxXCard", "wodxFindMe", "wodxFind"]);

/** Which drawer each WoDX player button goes in. A WoDX button not listed here stays on the bar. */
export const TOOL_GROUP = {
  wodxTalk: "now", wodxSenses: "now", wodxSight: "now", wodxCaseBoard: "now",
  wodxCreation: "mine", wodxFollowers: "mine", wodxOrders: "mine", wodxFactions: "mine", wodxGear: "mine",
  wodxClock: "time", wodxOnYourOwn: "time", wodxPassTime: "time", wodxLetters: "time", wodxDowntime: "time",
  wodxTasks: "time", wodxClocks: "time", wodxProperty: "time", wodxSolo: "time",
  wodxStepSideways: "beyond", wodxPeek: "beyond", wodxSoul: "beyond", wodxSpirits: "beyond", wodxOtherRolls: "beyond",
  wodxJack: "beyond",
  wodxLibrary: "help", wodxLegends: "help"
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
