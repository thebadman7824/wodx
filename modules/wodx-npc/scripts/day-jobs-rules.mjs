/**
 * WoDX NPC (B3590-B3596): day jobs for a character's mortal agents. Pure rules, no Foundry.
 *
 * A character sends an ally, a contact, a retainer, a ghoul, or a dot of Influence on a job at a place by day: watch
 * it, scrub the records, stir a crowd, buy up a debt, sabotage the works, or hide a body. The job works through one
 * of the powers of the age and land (the guilds, the Church, the lords and the mercenary companies in the early
 * centuries; the police, the press, the banks, the technology firms and the corporations later), which sets the
 * sphere of Influence it touches. It runs as a long task on WoDX Storyteller's clock; when it ends, the faction that
 * holds that sphere in the place reacts.
 *
 * Book basis: Allies, Contacts, Retainers and Influence are the V20 Backgrounds (V20 pp. 112-116); Influence may stand
 * in for an Ability on a roll to sway the mortal world (V20 p. 115), and Dark Ages Influence works through the powers
 * of a medieval town (V20 Dark Ages p. 181). The job list, the pools, the goals and the faction reactions are house
 * rules (B3591-B3594), kept in the shape of the errands followers already run (order-rules ERRANDS).
 */

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, n = 120) => String(v ?? "").slice(0, n);

/** The jobs. hostile: a done job costs the faction holding the sphere; every ruined one turns it against the master. */
export const JOBS = {
  watch: {label: "Watch a place", attr: "perception", abilities: ["alertness", "streetwise"], goal: 3, interval: "hour", hostile: false,
    done: "knows who came and went, and when.", ruined: "was noticed watching, and the people watched know someone is curious."},
  scrub: {label: "Scrub the records", attr: "intelligence", abilities: ["bureaucracy", "law", "academics"], goal: 4, interval: "day", hostile: true,
    done: "has the record gone or changed: the trail ends here.", ruined: "was seen at the records, and a clerk remembers who asked."},
  stir: {label: "Stir up a crowd", attr: "charisma", abilities: ["leadership", "expression", "streetwise"], goal: 4, interval: "day", hostile: true,
    done: "has a crowd out on the street, angry at whoever it was pointed at.", ruined: "lost the crowd, which turned on the one stirring it."},
  debt: {label: "Buy up a debt", attr: "manipulation", abilities: ["finance", "commerce"], goal: 3, interval: "day", hostile: false, costly: true,
    done: "now holds the debt: the debtor owes its master, and a debt is a hold.", ruined: "paid, and was cheated: the money is gone and the debt is elsewhere."},
  sabotage: {label: "Sabotage the works", attr: "dexterity", abilities: ["crafts", "larceny", "technology", "security"], goal: 4, interval: "day", hostile: true,
    done: "has the works stopped for a while: a mill, a press, a line, a server room.", ruined: "was caught in the act, and talks unless someone silences it."},
  hide: {label: "Hide a body", attr: "wits", abilities: ["streetwise", "survival", "larceny"], goal: 3, interval: "hour", hostile: false, breachOnRuin: true,
    done: "has put it where no one will look.", ruined: "was seen, or the body was found: a breach for the Storyteller to weigh."}
};

/**
 * The powers a job can work through, by year, with the sphere they touch (keys of WoDX NPC's spheres of Influence,
 * faction-rules SPHERES; the first one the age has is used). from and to are years.
 */
export const CHANNELS = [
  {key: "guild", label: "The guilds and their wardens", spheres: ["guild"], from: 0, to: 1799},
  {key: "church", label: "The Church", spheres: ["church"], from: 0, to: Infinity},
  {key: "lords", label: "The lords and their stewards", spheres: ["crown"], from: 0, to: 1799},
  {key: "mercenaries", label: "The mercenary companies", spheres: ["military"], from: 0, to: 1699},
  {key: "garrison", label: "The garrison and the watch", spheres: ["military"], from: 1700, to: 1829},
  {key: "moneylenders", label: "Moneylenders and bankers", spheres: ["guild"], from: 0, to: 1799},
  {key: "streets", label: "The streets and the taverns", spheres: ["folk", "street"], from: 0, to: Infinity},
  {key: "underworld", label: "The underworld", spheres: ["underworld"], from: 0, to: Infinity},
  {key: "learned", label: "The universities and learned societies", spheres: ["university"], from: 1450, to: 1913},
  {key: "pamphlets", label: "Printers and pamphleteers", spheres: ["university", "media"], from: 1500, to: 1829},
  {key: "police", label: "The police", spheres: ["police"], from: 1830, to: Infinity},
  {key: "press", label: "The press", spheres: ["media"], from: 1830, to: 1949},
  {key: "media", label: "Television, radio and the papers", spheres: ["media"], from: 1950, to: 2022},
  {key: "networks", label: "The networks and the feeds", spheres: ["media", "net"], from: 2023, to: Infinity},
  {key: "banks", label: "The banks and the exchange", spheres: ["finance"], from: 1800, to: Infinity},
  {key: "officials", label: "Ministries and officials", spheres: ["bureaucracy", "political"], from: 1800, to: Infinity},
  {key: "industry", label: "The mills, mines and factories", spheres: ["industry"], from: 1800, to: 1969},
  {key: "corporations", label: "The corporations", spheres: ["industry", "finance"], from: 1900, to: Infinity},
  {key: "technology", label: "The technology firms", spheres: ["net", "industry"], from: 1970, to: Infinity}
];

/** Local names for the powers that change most from land to land, by the faith the land keeps (WoDX Chronicle). */
export const LOCAL = {
  church: {orthodox: "The Church and the monasteries", islamic: "The mosques, the waqfs and the qadi's court", jewish: "The synagogue and the community's elders",
    hindu: "The temples and their priests", theravada: "The monasteries and the sangha", tibetan: "The monasteries and their lamas", chinese: "The temples and the clan halls", own: "The priests and the shrines"},
  lords: {islamic: "The emir's court and its officers", hindu: "The raja's court and the landholders", chinese: "The magistrate's yamen and its clerks", tibetan: "The great houses and their stewards", own: "The chiefs and their councils"},
  guild: {islamic: "The bazaar's trade guilds", chinese: "The merchant guilds and huiguan", hindu: "The merchant castes and their councils", own: "The traders and the market folk"},
  mercenaries: {islamic: "The mamluks and hired horsemen", chinese: "The garrison troops and hired braves", own: "The war bands for hire"}
};

/** The powers open in a year and land, each with its local name and the sphere key it touches in that age. */
export function channelsFor(year, faith = "western", spheresHere = null) {
  const y = num(year);
  return CHANNELS.filter(c => y >= c.from && y <= c.to).map(c => {
    const sphere = spheresHere ? c.spheres.find(k => k in spheresHere) ?? null : c.spheres[0];
    return {key: c.key, label: LOCAL[c.key]?.[faith] ?? c.label, sphere};
  }).filter(c => !spheresHere || c.sphere);
}

/** The kinds of agent. NPC agents roll their own sheet; a Background dot rolls the master's Manipulation + the dots. */
export const AGENTS = {ally: "An ally", contact: "A contact", retainer: "A retainer", ghoul: "A ghoul", herd: "One of the herd", influence: "A dot of Influence", allies: "Allies (the Background)", contacts: "Contacts (the Background)", retainers: "Retainers (the Background)"};
export const BACKGROUND_AGENTS = {allies: /^allies?$/i, contacts: /^contacts?$/i, retainers: /^retainers?$/i, influence: /^influence$/i};

/**
 * The long task for a job (the shape WoDX Storyteller's long tasks take, as order-rules errandTask does).
 * agent: {kind, sheet (an NPC's abilities), dots (a Background's rating)}.
 */
export function jobTask(key, {agent = {}, place = "", channel = null, masterName = "", note = "", cost = 0} = {}) {
  const j = JOBS[key];
  if ( !j ) return null;
  const bg = BACKGROUND_AGENTS[agent.kind];
  const ability = bg ? "" : j.abilities.find(k => agent.sheet?.[k] !== undefined) ?? j.abilities[0];
  const where = place ? ` at ${str(place, 60)}` : "";
  const via = channel?.label ? `, through ${channel.label.charAt(0).toLowerCase()}${channel.label.slice(1)}` : "";
  return {kind: "other", name: `${masterName ? `For ${masterName}: ` : ""}${j.label.toLowerCase()}${where}${via}${note ? ` (${str(note, 60)})` : ""}`.slice(0, 200),
    attr: bg ? "manipulation" : j.attr, ability, dice: bg ? Math.max(1, Math.round(num(agent.dots))) : 0, diff: 6, goal: j.goal, interval: j.interval,
    errand: `job:${key}`, cost: j.costly ? Math.max(0, Math.round(num(cost))) : 0, place: str(place, 160)};
}
export const jobOfTask = task => (String(task?.errand ?? "").startsWith("job:") ? String(task.errand).slice(4) : null);

/**
 * The faction a job lands on: the one named, else whichever holds the most Influence in the sphere, leaving out the
 * master's own. factions: [{id, name, members, owners, assets: {influence}}].
 */
export function targetFaction(factions = [], {sphere = null, picked = null, masterId = null} = {}) {
  const mine = f => (f.members ?? []).includes(masterId) || (f.owners ?? []).includes(masterId) || f.leader === masterId;
  if ( picked ) return factions.find(f => f.id === picked) ?? null;
  if ( !sphere ) return null;
  return factions.filter(f => !mine(f) && !f.dormant && num(f.assets?.influence?.[sphere]) > 0)
    .sort((a, b) => num(b.assets.influence[sphere]) - num(a.assets.influence[sphere]))[0] ?? null;
}

/**
 * What the faction does when a job ends. Returns {lose (a dot of the sphere, through the approval queue), standing
 * (a step in how the faction regards the master), breach (a Masquerade breach to report), text}.
 */
export function reaction(key, status, faction = null, {sphereName = ""} = {}) {
  const j = JOBS[key];
  if ( !j ) return {lose: false, standing: 0, breach: false, text: ""};
  const who = faction?.name ?? "";
  if ( status === "done" ) {
    if ( j.hostile && faction ) return {lose: true, standing: 0, breach: false, text: `${who} loses ground in ${sphereName || "its sphere"} if the Storyteller approves.`};
    return {lose: false, standing: 0, breach: false, text: ""};
  }
  return {lose: false, standing: faction ? -1 : 0, breach: !!j.breachOnRuin,
    text: [faction ? `${who} learns who was behind it and thinks less of its master.` : "", j.breachOnRuin ? "A breach goes to the Storyteller." : ""].filter(Boolean).join(" ")};
}

/** The result line for the card. */
export const resultText = (key, status) => (JOBS[key] ? (status === "done" ? JOBS[key].done : JOBS[key].ruined) : "");
