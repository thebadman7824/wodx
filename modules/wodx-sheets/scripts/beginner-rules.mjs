/**
 * The sheet in a player's Beginner view (Sheets 0.19.0, B2812 to B2815). Pure rules, tested by the harness.
 * Nothing is taken off the sheet: zero-dot Abilities fold behind Show all, rarely used tabs sit behind More, and every
 * quick roll is also on the sheet and in the Actions menu.
 */

/** The common checks a new character starts with on the quick roll row (keys of the Actions common checks). */
export const QUICK_DEFAULT = ["notice", "react", "readperson", "endurance"];
/** At most this many quick rolls on the row. */
export const QUICK_MAX = 8;

/** The quick rolls this character shows: the player's own list when there is one, else the defaults. Pure. */
export function quickList(flag, known = null) {
  const own = Array.isArray(flag) ? flag.filter(k => typeof k === "string" && k) : null;
  const list = own ?? QUICK_DEFAULT;
  const ok = known ? list.filter(k => known.has(k)) : list;
  return [...new Set(ok)].slice(0, QUICK_MAX);
}
/** Add or take away one quick roll. Returns the new list, or null when the row is full. */
export function toggleQuick(list, key) {
  const cur = [...(list ?? [])];
  if ( cur.includes(key) ) return cur.filter(k => k !== key);
  if ( cur.length >= QUICK_MAX ) return null;
  return [...cur, key];
}

/**
 * The Actions menu entry that uses the line's powers, from the line's own menu order (MENU_PLAN act list), or null
 * for a line without powers of its own (plain mortals).
 */
const POWER_SPEC = /usediscipline|usegift|usearcanos|hunterpower|cast|cantrip|hekau|usecharm|uselore|useedge|chi|shintai|numina/i;
export function powerSpec(kind, plan = {}) {
  if ( !kind || kind === "mortal" ) return null;
  return (plan[kind]?.act ?? []).find(s => POWER_SPEC.test(s)) ?? null;
}

/** Tabs that go behind More in Beginner view (data-tab names). */
export const TUCKED_TABS = ["settings", "effect", "wodxbody"];
/** Tabs that come straight after Core in Beginner view: the line's own powers. */
export const POWER_TABS = ["discipline", "gift", "magic", "dreaming", "death", "scarab", "charms", "edge", "lore", "exaltedcharm", "numina", "power", "shapechange"];

/**
 * The order of a sheet's tab buttons in Beginner view. tabs: [data-tab or "" for a link]. Bio and Core keep their
 * places, the power tabs follow Core, then the rest in their own order; tucked tabs and links go last. Returns
 * {order: [index], tucked: [index]}.
 */
export function tabOrder(tabs = []) {
  const idx = tabs.map((t, i) => ({t, i}));
  const isTucked = x => !x.t || TUCKED_TABS.includes(x.t);
  const core = idx.findIndex(x => x.t === "core");
  const head = core >= 0 ? idx.slice(0, core + 1).filter(x => !isTucked(x)) : [];
  const pool = core >= 0 ? idx.slice(core + 1) : idx;
  const powers = pool.filter(x => POWER_TABS.includes(x.t));
  const others = pool.filter(x => !POWER_TABS.includes(x.t) && !isTucked(x));
  const tucked = idx.filter(isTucked);
  const order = [...head, ...powers, ...others, ...tucked].map(x => x.i);
  return {order, tucked: tucked.map(x => x.i)};
}

/**
 * Hover help in our own words: what a trait is for and when it is rolled. Kept short and plain. Keys are lower-case
 * names as the sheet shows them. Era words come from eraWord.
 */
export const HELP = {
  // Attributes
  strength: "How hard you hit and how much you can lift. Added to the damage of blows and thrown things.",
  dexterity: "Speed and steady hands. Rolled to strike, dodge, shoot, sneak and pick a pocket.",
  stamina: "How much you can take. Rolled to keep going, hold your breath or shake off poison; it soaks blows.",
  charisma: "How easily people warm to you. Rolled to lead, charm and win a crowd.",
  manipulation: "Getting people to do what you want, honestly or not. Rolled to persuade, lie and bargain.",
  appearance: "First looks. Counts when a stranger sizes you up, and in seduction.",
  perception: "Noticing. Rolled to spot, hear, search and read a person.",
  intelligence: "Learning and reasoning. Rolled to recall, work out a puzzle and use what you studied.",
  wits: "Thinking fast. Rolled to react in time, answer back and improvise.",
  // Talents
  alertness: "Staying on guard. Paired with Perception to notice danger or a hidden thing.",
  athletics: "Running, climbing, swimming, jumping and throwing.",
  awareness: "A feel for the uncanny: magic at work, a ghost nearby, something wrong in a place.",
  brawl: "Fighting with fists, feet, teeth and claws.",
  dodge: "Getting out of the way of a blow or a shot.",
  empathy: "Reading moods and motives; telling what someone feels.",
  expression: "Saying it well, in speech, song, verse or on paper.",
  intimidation: "Frightening people into backing down or obeying.",
  leadership: "Getting a group to follow you and keep its nerve.",
  streetwise: "Knowing the street: who sells what, who to avoid, where to hide.",
  subterfuge: "Lying well, and seeing through other people's lies.",
  primalurge: "The wolf within: instinct, senses and changing shape without thinking.",
  kenning: "The fae sense for Glamour, dreams and the changeling world.",
  // Skills
  "animal ken": "Calming, training and reading animals.",
  crafts: "Making and mending things with your hands.",
  drive: "Handling a car, cart or any vehicle of the day.",
  etiquette: "Manners: what to say and do in polite company, and whom to bow to.",
  firearms: "Shooting guns: aiming, firing and clearing a jam.",
  archery: "Shooting a bow or crossbow.",
  melee: "Fighting with a blade, a club or any weapon held in the hand.",
  performance: "Playing, singing, acting or dancing for an audience.",
  ride: "Riding a horse or other mount, and keeping your seat in a fight.",
  security: "Locks, alarms and getting in where you should not.",
  larceny: "Picking locks and pockets, and other thieves' work.",
  stealth: "Moving unseen and unheard.",
  survival: "Living off the land: shelter, food, water and finding the way.",
  technology: "Working, fixing and building machines and electrics.",
  commerce: "Trade: buying low, selling high and judging what a thing is worth.",
  hearthwisdom: "Folk lore: charms, omens, cures and how to keep the uncanny at bay.",
  // Knowledges
  academics: "Book learning: history, letters and the arts.",
  computer: "Using and programming computers.",
  finance: "Money, banking and following where the money went.",
  investigation: "Searching a scene, following clues and finding records.",
  law: "The law of the land, the courts, and how to work them.",
  linguistics: "Other tongues, and how languages relate.",
  medicine: "Treating wounds and sickness.",
  occult: "Hidden lore: rites, curses, the supernatural and what is only rumour.",
  politics: "Who holds power, who wants it, and how deals are struck.",
  science: "How the world works: chemistry, physics and the rest.",
  theology: "Faith and doctrine, the Church's teaching and its quarrels.",
  seneschal: "Running a household or a domain: servants, stores and accounts.",
  enigmas: "Riddles, puzzles and seeing the pattern others miss.",
  cosmology: "The shape of the other worlds and how they join.",
  // Advantages and pools
  willpower: "Your will. Spend a point for an extra success or to stand firm; roll it to resist.",
  humanity: "How much of your humanity is left. The lower it falls, the stronger the Beast.",
  road: "Your Road: the moral code a medieval Cainite holds to against the Beast.",
  conscience: "Your sense of right and wrong. Rolled when you do something you may regret.",
  conviction: "Faith in your own code. Rolled when you act against common morals.",
  "self-control": "Holding the Beast or your temper back. Rolled to resist frenzy.",
  instinct: "Riding the Beast instead of fighting it.",
  courage: "Facing fear: fire, sunlight, the terrible. Rolled to stand your ground.",
  "blood pool": "Blood in your body. Spent to heal, to rise by day and to power Disciplines.",
  rage: "Garou fury. Spent for extra actions and to change shape at once; too much brings frenzy.",
  gnosis: "Your tie to the spirit world. Spent and rolled for Gifts, fetishes and stepping sideways.",
  arete: "Your understanding of magic. It limits how much you can do with the Spheres.",
  quintessence: "Raw magical power. Spent to make magic easier.",
  paradox: "The world pushing back against vulgar magic. It builds up and can strike.",
  glamour: "The stuff of dreams. Spent to work Arts and to touch the Dreaming.",
  banality: "The dull weight of disbelief. The more you carry, the less the Dreaming answers you.",
  pathos: "Emotion a wraith draws from the living. Spent to work Arcanoi.",
  corpus: "A wraith's ghostly body. Lost to harm instead of health levels.",
  angst: "The Shadow's strength. It grows when the wraith gives in to despair or rage.",
  faith: "The power of true belief. Rolled to drive back the unholy."
};

/** The help line for a trait label, or "". The label is matched without case and without dots or colons. */
export function helpFor(label = "", {year = null} = {}) {
  const k = String(label).toLowerCase().replace(/[:.]/g, "").replace(/\s+/g, " ").trim();
  if ( k === "humanity" && Number.isFinite(year) && year < 1450 && HELP.road ) return `${HELP.humanity} In these nights it is called the Road of Humanity.`;
  return HELP[k] ?? HELP[k.replace(/\s/g, "")] ?? "";
}

/** The first sentence of an item's own description, as plain text, for a power's hover. */
export function firstSentence(html = "", n = 200) {
  const t = String(html).replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
  if ( !t ) return "";
  const m = t.match(/^(.{20,}?[.!?])(\s|$)/);
  const s = m ? m[1] : t;
  return s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, "")}...` : s;
}
