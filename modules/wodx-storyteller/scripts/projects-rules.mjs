/**
 * Downtime projects (B3340-B3343): the pure part. No Foundry here, so the harness can test it.
 *
 * A downtime project is a long task (tasks-rules.mjs) a player sets up between sessions, with three things more:
 *   nights   how many nights (or days) a week the character gives it, out of a weekly budget shared by every project.
 *            Fewer nights than the kind needs stretches each roll's interval: half the time, half the speed (B3341).
 *   target   who it is aimed at, for courting someone slowly or tracking someone down.
 *   trouble  each roll may draw a complication from a table by kind and year; a botch always does (B3342). The
 *            Storyteller hears of it and decides what comes of it.
 * Rolls are V20 extended actions (V20 pdf 254-261; V20 Dark Ages p. 324), as long tasks already are. The budget, the
 * nights each kind needs, the chance of trouble and the tables are house figures (docs/PENDING-REVIEW.md).
 */

/** Nights (or days) a week a character can give to projects (B3341). A vampire loses one to the hunt. */
export const BUDGET = 7;
export const HUNT_NIGHTS = 1;
/** The chance a roll that is not a botch draws a complication (B3342). */
export const TROUBLE_CHANCE = 0.1;
/** Complications kept on a project, newest last. */
export const KEEP = 10;

/** The weekly budget for a character. kind: the actor's type; own: a Storyteller's figure for this character. */
export function budgetFor({kind = "", own = null} = {}) {
  if ( Number.isFinite(Number(own)) && own !== null && own !== "" ) return Math.max(0, Math.min(7, Math.round(Number(own))));
  return /vampire/i.test(String(kind)) ? BUDGET - HUNT_NIGHTS : BUDGET;
}

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const isLive = t => t && (t.status === "open" || t.status === "paused") && n(t.nights) > 0;

/** Nights a week given to live projects (paused ones keep their claim, as the planner shows them). */
export const nightsGiven = tasks => (tasks ?? []).filter(t => isLive(t) && t.status === "open").reduce((s, t) => s + n(t.nights), 0);

/**
 * Which open projects go past the budget. The oldest keep their nights; the newest pause first.
 * Returns the ids to pause, newest first.
 */
export function overBudget(tasks, budget) {
  const open = (tasks ?? []).filter(t => isLive(t) && t.status === "open").sort((a, b) => n(a.started) - n(b.started) || String(a.id).localeCompare(String(b.id)));
  const out = [];
  let used = 0;
  for ( const t of open ) { used += n(t.nights); if ( used > budget ) out.push(t.id); }
  return out.reverse();
}

/* ------------------------------------------------------------------ */
/*  Complications (B3342)                                              */
/* ------------------------------------------------------------------ */

/**
 * By kind: {key, text, from, to}. from and to are years (null: always). "any" rows serve every kind. Each text is
 * the start of a scene for the Storyteller, never a result: nothing here changes the sheet.
 */
export const TROUBLE = {
  any: [
    {key: "sick", text: "Ill health or an injury keeps the character from the work for a few nights."},
    {key: "watched", text: "Someone has been watching the work and asking about it."},
    {key: "neighbour", text: "A neighbour complains about the comings and goings."},
    {key: "debt", text: "The work costs more than planned, and someone offers to lend the difference."},
    {key: "rival", text: "A rival hears of the work and decides to do it first, or spoil it."}
  ],
  research: [
    {key: "closed", text: "The keeper of the books will not open them to an outsider without a favour."},
    {key: "fire", text: "Part of the collection is lost to fire, damp or theft."},
    {key: "index", text: "The book is forbidden, and asking for it draws a cleric's notice.", from: 1559, to: 1966},
    {key: "same", text: "Someone else asked for the same pages a short while ago."},
    {key: "logged", text: "The search is logged, and the log is read by someone who cares.", from: 1990}
  ],
  train: [
    {key: "leaves", text: "The teacher must leave town for a while, or will not teach until a debt is paid."},
    {key: "wrong", text: "The teacher has been teaching something subtly wrong."},
    {key: "price", text: "The teacher asks a price that is not money."}
  ],
  craft: [
    {key: "material", text: "A material goes missing or arrives spoiled."},
    {key: "copy", text: "Another maker copies the work and sells it first."},
    {key: "guild", text: "The guild says the work needs its leave.", to: 1859}
  ],
  build: [
    {key: "permit", text: "The lord, the council or the planning office objects to the building."},
    {key: "workers", text: "The workers down tools until they are paid more."},
    {key: "found", text: "Digging turns up something old that someone will want."}
  ],
  business: [
    {key: "guild", text: "A guild warden says the trade is not the character's to practise.", to: 1859},
    {key: "tax", text: "A tax collector takes a close interest in the books."},
    {key: "under", text: "A rival undercuts the price for a season."},
    {key: "road", text: "Goods are robbed on the road.", to: 1900},
    {key: "partner", text: "A partner has been skimming."},
    {key: "panic", text: "A panic in the markets shakes the business.", from: 1630}
  ],
  court: [
    {key: "family", text: "The beloved's family objects to the meetings."},
    {key: "suitor", text: "A rival suitor appears."},
    {key: "talk", text: "People talk about the two of them."},
    {key: "letter", text: "A letter goes astray, and someone else reads it.", to: 1990},
    {key: "message", text: "A private message is seen by the wrong person.", from: 1990}
  ],
  language: [
    {key: "teacher", text: "The only teacher at hand has their own reasons for teaching."},
    {key: "accent", text: "A slip of the tongue gives away where the character learned the language."}
  ],
  track: [
    {key: "noticed", text: "The quarry notices someone is following."},
    {key: "cold", text: "The trail goes cold, and someone else is asking the same questions."},
    {key: "watch", text: "The watch stops the character and asks their business.", to: 1829},
    {key: "police", text: "The police stop the character and ask their business.", from: 1829}
  ],
  herd: [
    {key: "talks", text: "One of the flock talks too much about the nights."},
    {key: "ill", text: "One of the flock falls ill."},
    {key: "preacher", text: "A preacher warns the neighbourhood against the gatherings."}
  ],
  climb: [
    {key: "rival", text: "A rival for the same seat starts asking questions about the character's past."},
    {key: "patron", text: "The one who could raise the character wants a favour first."},
    {key: "rule", text: "An old rule of the house is found that bars the character from the seat."}
  ],
  upgrade: [
    {key: "talk", text: "One of the workers talks in a tavern about the odd house and its odd hours."},
    {key: "plans", text: "A copy of the plans goes missing."},
    {key: "inspector", text: "An inspector, a reeve or a landlord's agent wants to see inside.", from: 1197}
  ],
  fetish: [{key: "spirit", text: "The spirit asked to enter the fetish wants something first."}],
  wonder: [{key: "flaw", text: "The work takes on a flaw that only shows when it is used."}]
};

const fits = (row, year) => !year || ((row.from == null || year >= row.from) && (row.to == null || year <= row.to));

/** The rows that can come up for a kind in a year. */
export const troubleFor = (kind, year = 0) => [...(TROUBLE[kind] ?? []), ...TROUBLE.any].filter(r => fits(r, year));

/**
 * One roll's complication, or null. roll: {botch}; rand: () => [0, 1). A botch always draws one; otherwise
 * TROUBLE_CHANCE. Rows the project has had lately are skipped where there is a choice.
 */
export function drawTrouble(task, roll, {year = 0, rand = Math.random, chance = TROUBLE_CHANCE} = {}) {
  if ( task?.trouble === false ) return null;
  if ( !roll?.botch && !(rand() < chance) ) return null;
  const seen = new Set((task?.complications ?? []).slice(-3).map(c => c.key));
  const rows = troubleFor(task?.kind, year);
  const fresh = rows.filter(r => !seen.has(r.key));
  const pick = (fresh.length ? fresh : rows);
  if ( !pick.length ) return null;
  const row = pick[Math.min(pick.length - 1, Math.floor(rand() * pick.length))];
  return {key: row.key, text: row.text, botch: !!roll?.botch};
}

/** Add a complication to a project's list, keeping the last KEEP. */
export const addTrouble = (list, c, at) => [...(Array.isArray(list) ? list : []), {...c, at}].slice(-KEEP);

/* ------------------------------------------------------------------ */
/*  What a finished project leaves (B3343)                             */
/* ------------------------------------------------------------------ */

/**
 * What the Storyteller is told when a project ends. Backgrounds and traits never rise by themselves (B850): the
 * Storyteller awards them. Returns {text, background} where background names the dot suggested, or "".
 */
export function outcomeOf(task, targetName = "") {
  const who = targetName || "them";
  switch ( task?.kind ) {
    case "business": return {text: `The business is running. A dot of Resources is the Storyteller's to award, or a venture can be opened on the market.`, background: "Resources"};
    case "herd": return {text: "A flock is gathered. A dot of Herd is the Storyteller's to award.", background: "Herd"};
    case "language": return {text: "The language is learned. The Storyteller adds it to the sheet.", background: ""};
    case "track": return {text: `The trail leads to ${who}. The Storyteller says where ${who === "them" ? "they are" : "they are found"}.`, background: ""};
    case "court": return {text: `The long courtship of ${who} has run its course. Where it stands now is in the warmth between them.`, background: ""};
    case "train": return {text: "The teaching is done. The experience can now be spent on what was taught.", background: ""};
    case "climb": return {text: "The climb is done. The Storyteller is asked for the next seat.", background: ""};
    case "upgrade": return {text: "The works are done. The Storyteller is asked to put them in.", background: ""};
    case "research": return {text: "The research is done. The Storyteller says what was found.", background: ""};
    default: return {text: "The project is finished.", background: ""};
  }
}

/** A courting roll's effect on warmth (WoDX NPC hearts): a success is time well spent, a botch a slight. */
export function courtEvent(roll) {
  if ( roll?.botch ) return "slight";
  return n(roll?.successes) > 0 ? "time" : null;
}

/** A short line for the planner. */
export function budgetLine(name, given, budget) {
  const left = budget - given;
  return `${name}: ${given} of ${budget} night${budget === 1 ? "" : "s"} a week given${left > 0 ? `, ${left} free` : left < 0 ? `, ${-left} too many` : ""}.`;
}
