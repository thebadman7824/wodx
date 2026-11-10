/**
 * WoDX Storyteller: starting a chronicle on the world template. Pure: the text of the journals the wizard writes, the
 * plan of what it will make, and the names. No Foundry calls, so the harness can test it.
 *
 * The wizard (setup.mjs) asks for the chronicle's name, opening date, region, climate and the lines at the table, then
 * makes or updates, by a flag and never twice: the Storyteller screen, the era primer for the players, the group actor,
 * Session Zero and the Chronicle Rules (through WoDX Chronicle). A dry run shows the plan first.
 */

export const TEMPLATE_VERSION = 1;

/** The game lines a table can bring, and what a group of them is called. */
export const LINES = {
  vampire: {label: "Vampire (Cainites, Kindred)", group: "Coterie"},
  werewolf: {label: "Werewolf (Garou and the Changing Breeds)", group: "Pack"},
  mage: {label: "Mage", group: "Cabal"},
  changeling: {label: "Changeling (the fae)", group: "Motley"},
  wraith: {label: "Wraith (the restless dead)", group: "Circle"},
  hunter: {label: "Hunter (inquisitors, hunters, the imbued)", group: "Cell"},
  demon: {label: "Demon (the Fallen)", group: "Court"},
  mummy: {label: "Mummy (the Reborn)", group: "Cult"},
  kote: {label: "Kindred of the East", group: "Wu"},
  mortal: {label: "Mortals, ghouls and the gifted", group: "Company"}
};

/** The group actor's name: "The Coterie" for one line, "The Company" for a mixed table. */
export function groupName(lines = [], chronicle = "") {
  const known = lines.filter(l => LINES[l]);
  const word = known.length === 1 ? LINES[known[0]].group : "Company";
  return chronicle ? `The ${word} of ${chronicle}` : `The ${word}`;
}

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"})[c]);
const ps = list => list.map(p => `<p>${esc(p)}</p>`).join("");

/**
 * Era primers in WoDX's own words. players: what any character of the time knows. storyteller: what to keep in mind.
 * Drawn from the V20-era books' settings (Dark Ages, Victorian Age, Wild West, the modern lines); no 5th edition.
 */
export const PRIMERS = {
  "dark-ages": {
    players: ["Europe lives by the feudal order: lords and vassals, the Church, the guilds of the towns. Most people never travel more than a day from where they were born, and a stranger is noticed.",
      "Nights are truly dark. Towns shut their gates at sunset, curfew bells ring, and nobody walks abroad without a reason and a light.",
      "Faith is everywhere. Saints' days, fasts and feasts set the year, and a priest's word carries weight."],
    storyteller: ["Cainite society is feudal too: princes hold cities, lords hold domains, and oaths of fealty bind them. A Cainite's Road matters as much as their clan.",
      "Crusade, heresy and the founding of the Inquisition in 1231 put pressure on everyone who hides. Travel is slow, news slower, and a letter can take weeks."]
  },
  "long-night": {
    players: ["The Great Mortality has come. Whole streets stand empty, the dead are carted out each morning, and frightened people turn on their neighbours: Jewish quarters are attacked and strangers driven out.",
      "Flagellants walk from town to town. Fields go untended and prices rise; the old order of lord and serf is shaken."],
    storyteller: ["Herds die with the living. Plague dampens the mortal world's wonder, and the fae suffer for it. Among the Cainites old clans weaken, and in 1444 the Cappadocians fall.",
      "This is an age of endings: play the empty town, the burned house, the survivor who no longer cares."]
  },
  "renaissance": {
    players: ["Trade, printing and new learning are changing the world. Cities grow rich; artists and scholars find patrons; ships reach new lands.",
      "Faith splits: reformers and the old Church quarrel, and wars follow. The first firearms are loud, slow and frightening."],
    storyteller: ["The Camarilla forms in 1486 and the Convention of Thorns ends the Anarch revolt in 1493; those who refuse become the Sabbat.",
      "For mages this is the Sorcerers Crusade: the Order of Reason's science against the old traditions. Witch trials are a real danger to anyone found out."]
  },
  "victorian": {
    players: ["Steam, gaslight and the telegraph. Railways cross the land, factories fill the cities with smoke, and newspapers print every scandal.",
      "Society runs on manners and class. A calling card, a good name and the right club open doors; poverty and the workhouse wait below."],
    storyteller: ["The Camarilla's Masquerade is old and firm. Science and spiritualism both fascinate the age: seances, mesmerists, secret societies and the first hunters with a method.",
      "Humanity is the common morality, with Paths for those who walk them. The British Empire spans the globe, and its ports bring every kind of stranger."]
  },
  "wild-west": {
    players: ["The frontier: cattle trails, mining towns, the railroad pushing west. Law is a sheriff and a judge who rides through now and then.",
      "Distances are huge and people are few. A horse, a gun and water matter more than a name back east."],
    storyteller: ["The Camarilla's hold is thin out here; Anarchs, independents and the Sabbat roam. The land belongs first to the native nations and their spirits, and the Garou fight over it.",
      "Gold rushes, range wars and the Ghost Dance give strong backgrounds. Telegraph lines follow the railroad; beyond them, news travels by rider."]
  },
  "great-war": {
    players: ["The world is at war. Trenches cross France and Belgium, millions die, and telegrams bring the news home. Rationing, censorship and suspicion of foreigners are everywhere.",
      "Machine guns, gas, aircraft and tanks are new and terrible. Soldiers come back changed, if they come back."],
    storyteller: ["Mass death thins the Shroud and fills the Underworld. No-man's-land is a feeding ground and a hiding place.",
      "Borders and loyalties are tested for the Kindred too, as princes' cities fall into enemy hands or are bombed."]
  },
  "modern": {
    players: ["The world of the 1990s: cities that never sleep, crime and corruption, television and the first mobile phones and computers.",
      "Most people believe nothing supernatural exists, and they are encouraged to."],
    storyteller: ["Gothic-punk: the city is bigger, darker and stranger than the real one. The Camarilla and the Sabbat wage their Jyhad; Anarchs hold the West Coast.",
      "Records, cameras and phones make the Masquerade harder to keep each year."]
  },
  "time-of-judgment": {
    players: ["Something is wrong with the world. Strange skies, failing harvests, rumours of red stars and of the dead walking.",
      "The news is full of disasters and nobody can say why."],
    storyteller: ["The end-times of the old lines. Each line has its own apocalypse; use the one the table brings, and decide early how far the world will fall.",
      "Everything the characters have built can be lost in a night. Make each choice count."]
  },
  "future-darkness": {
    players: ["The world of tomorrow: megacities, corporations stronger than nations, cyberware, the Net. The rich live in towers; everyone else lives in their shadow.",
      "Surveillance is everywhere and data is money."],
    storyteller: ["Old powers adapt or die. Cyberware costs Humanity. The Masquerade must survive cameras on every corner and minds that can be hacked.",
      "World of Future Darkness's bridge rules sit on top of V20; see the Chronicle Rules journal for what is switched on."]
  },
  "time-of-future-judgement": {
    players: ["The last year of the century. Every feed carries a new disaster, and each one seems to set off the next.",
      "The old powers are out in the open, and they are failing."],
    storyteller: ["The Future Darkness branch ends here. Pick one Cascade in Dated events: a chain of endings, each one the cause of the next, with most of every line's endings inside it.",
      "Let the characters change where the chain breaks or holds. The Cascade's last event says how the world ends if nobody does."]
  },
  "classical": {
    players: ["The ancient world: city-states and empires, temples to many gods, slaves and citizens, roads and legions.",
      "Omens, oracles and sacrifice are part of daily life."],
    storyteller: ["The Kindred of the ancient cities live openly among cults and patrons. The rules are the Dark Ages rules with the period's setting; decide early which books' lore applies."]
  },
  "living-gods": {
    players: ["The age of the god-kings: temples, priesthoods, the river's flood and the desert's edge.",
      "The gods walk in festival and in story, and the dead are honoured with great care."],
    storyteller: ["The deep past of the Reborn and of the oldest Kindred. The rules are the Dark Ages rules with the period's setting; much here is the Storyteller's to decide."]
  }
};

/** The era primer for the players, as journal page HTML. profile: an era profile from WoDX Chronicle. */
export function playerPrimer(profile) {
  const p = PRIMERS[profile?.id] ?? PRIMERS["dark-ages"];
  return `<h2>${esc(profile?.name ?? "The era")}</h2>${ps(p.players)}<p class="wodx-quiet">The Storyteller can add to this page or change it.</p>`;
}

/** The era page of the Storyteller screen. */
export function eraPage(profile, {lines = [], date = "", region = "", climate = ""} = {}) {
  const p = PRIMERS[profile?.id] ?? PRIMERS["dark-ages"];
  const years = Number.isFinite(profile?.start) ? `${profile.start} to ${profile.end}` : "years set by the Storyteller";
  const ours = (profile?.ourCall ?? []).map(x => `<li>${esc(x)}</li>`).join("");
  return `<h2>${esc(profile?.name ?? "The era")} (${esc(years)})</h2>
    ${date ? `<p><b>Opening date:</b> ${esc(date)}${region ? `. <b>Region:</b> ${esc(region)}` : ""}${climate ? `. <b>Climate:</b> ${esc(climate)}` : ""}.</p>` : ""}
    <p><b>Rules from:</b> ${esc(profile?.basis ?? "")}</p>
    <p><b>Switched on for this era:</b> ${esc(profile?.switches ?? "")}</p>
    ${ours ? `<p><b>House calls for this era:</b></p><ul>${ours}</ul>` : ""}
    ${ps(p.storyteller)}
    <h3>Lines at the table</h3><ul>${(lines.length ? lines : ["mortal"]).map(l => `<li>${esc(LINES[l]?.label ?? l)}</li>`).join("")}</ul>
    <p class="wodx-quiet">The Chronicle Rules journal lists every switch in force; it changes by itself when the era does.</p>`;
}

/** The rolls page: V20's core system, in WoDX's own words. */
export const ROLLS_PAGE = `<h2>Rolls</h2>
<p>A roll is a pool of ten-sided dice, usually an Attribute plus an Ability. Each die that shows the difficulty or more is a success. Each 1 takes away a success. No successes and at least one 1 is a botch.</p>
<table><thead><tr><th>Difficulty</th><th>How hard</th></tr></thead><tbody>
<tr><td>3</td><td>Easy</td></tr><tr><td>4</td><td>Routine</td></tr><tr><td>5</td><td>Straightforward</td></tr><tr><td>6</td><td>Standard</td></tr>
<tr><td>7</td><td>Challenging</td></tr><tr><td>8</td><td>Difficult</td></tr><tr><td>9</td><td>Extremely difficult</td></tr><tr><td>10</td><td>Nearly impossible</td></tr></tbody></table>
<p class="wodx-quiet">V20 difficulty chart (pdf 257 / p. 249).</p>
<table><thead><tr><th>Successes</th><th>Result</th></tr></thead><tbody>
<tr><td>1</td><td>Marginal: it barely works</td></tr><tr><td>2</td><td>Moderate</td></tr><tr><td>3</td><td>Complete</td></tr><tr><td>4</td><td>Exceptional</td></tr><tr><td>5 or more</td><td>Phenomenal</td></tr></tbody></table>
<ul>
<li><b>Willpower:</b> spend one point before rolling for one automatic success.</li>
<li><b>Specialties:</b> with four or more dots and a specialty that applies, each 10 counts as two successes.</li>
<li><b>Several actions in one turn:</b> split the pool, smallest pool first; WoDX Combat does this for attacks.</li>
<li><b>Extended rolls:</b> roll each turn or hour until the successes add up; a botch can lose the lot.</li>
<li><b>Teamwork:</b> two or more characters roll separately and add their successes, when the task allows it.</li>
<li><b>No roll at all:</b> if the task is easy for the character and nothing is at stake, it simply happens.</li>
</ul>`;

/** The health page. */
export const HEALTH_PAGE = `<h2>Health and damage</h2>
<table><thead><tr><th>Health level</th><th>Dice penalty</th></tr></thead><tbody>
<tr><td>Bruised</td><td>0</td></tr><tr><td>Hurt</td><td>-1</td></tr><tr><td>Injured</td><td>-1</td></tr><tr><td>Wounded</td><td>-2</td></tr>
<tr><td>Mauled</td><td>-2</td></tr><tr><td>Crippled</td><td>-5</td></tr><tr><td>Incapacitated</td><td>No actions</td></tr></tbody></table>
<ul>
<li><b>Bashing</b> (fists, falls, clubs): mortals and vampires soak it with Stamina; vampires halve what gets through.</li>
<li><b>Lethal</b> (blades, bullets): mortals cannot soak it without armour; vampires and other supernatural beings soak it with Stamina.</li>
<li><b>Aggravated</b> (fire, sunlight, the claws and fangs of the supernatural): vampires soak it only with Fortitude; Garou soak it with Stamina; mortals cannot. Each line's book has the last word.</li>
<li>Damage dice are the weapon's, plus one for each success on the attack after the first.</li>
</ul>
<p class="wodx-quiet">WoDX Combat applies soak and damage by the line's own book; this page is the short form.</p>`;

/** Where the WoDX tools are. */
export const TOOLS_PAGE = `<h2>WoDX tools</h2>
<ul>
<li><b>Chronicle Clock</b> (the moon in the token controls): the date, sun and moon, time skips, house rules, the approval queue, Session Zero, the X-card.</li>
<li><b>The Storyteller's tracker</b> (binoculars): every character's place and time, convening a scene, beats, the night's summary.</li>
<li><b>The Ledger</b> (scales): oaths, debts, boons, consequences and the Veil.</li>
<li><b>Weather and atmosphere</b> (a cloud and moon, with WoDX Atmosphere on): the night's weather, the scene's light, the era's music and handouts.</li>
<li><b>Place senses</b> (a quill, with WoDX Senses on): your own lines for what a place looks, sounds and smells like.</li>
<li><b>Interactables</b>: doors, locks, windows, traps and the rest on the map; the Interact button on a token.</li>
<li><b>Rules on the sheet</b>: each line's menu on the character sheet rolls its powers, with the page under each card.</li>
</ul>`;

/**
 * What the wizard will do, for the dry run and the real one. have: what already exists, by key ({screen, primer,
 * group, sessionZero}: {version} or null). Returns [{key, label, action: "make" | "update" | "keep"}].
 */
export function plan(have = {}, {version = TEMPLATE_VERSION} = {}) {
  const items = [
    ["rules", "The Chronicle Rules journal (rewritten for the era)"],
    ["sessionZero", "Session Zero (checklist, lines and veils, the X-card)"],
    ["screen", "The Storyteller screen (the era, rolls, health, the WoDX tools)"],
    ["primer", "The era primer for the players"],
    ["group", "The group actor"]
  ];
  return items.map(([key, label]) => {
    if ( key === "rules" ) return {key, label, action: "update"};
    const h = have[key];
    if ( !h ) return {key, label, action: "make"};
    if ( key === "group" || key === "sessionZero" ) return {key, label, action: "keep"};
    return {key, label, action: (Number(h.version) || 0) < version ? "update" : "keep"};
  });
}

/** The WoDX modules a template world turns on, in load order. */
export const WODX_MODULES = ["wodx-chronicle", "wodx-otherworlds", "wodx-creation", "wodx-actions", "wodx-combat", "wodx-sheets", "wodx-npc",
  "wodx-storyteller", "wodx-interactables", "wodx-targeting", "wodx-senses", "wodx-atmosphere"];
