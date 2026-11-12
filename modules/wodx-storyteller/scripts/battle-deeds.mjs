/**
 * WoDX Storyteller 0.47.0: a deed offered to each character, each phase of a battle (Improvement Desk bt1,
 * B2350-B2354). The pure part: no Foundry calls here.
 *
 * Where a character stands in the battle (their post) and the age of war of the year pick one deed for them: a
 * banner to take, a gap to hold, a rival champion to meet, a wounded friend to carry out. Each deed names its roll
 * (an Attribute and an Ability at a difficulty) and what success buys. The successes go into the battle's Deeds, as
 * the Dark Ages Companion counts a character's successes in a mass battle (pp. 44-45 printed): each one takes a foe
 * out of the fight and tips the phase. The Storyteller can swap a deed for another or skip it.
 *
 * Supernatural characters also get deeds of their own kind (a Discipline on the enemy captain, a Gift in the press,
 * a vulgar Effect at the gate). Those are seen: in the living world with mortals looking on they risk the
 * Masquerade, which the aftermath (battle-aftermath.mjs) counts.
 *
 * For off-screen battles (factions at war, no window), leaderDeed() picks a commander's deed for a side with no
 * sheet, and deedSuccessesFor() rolls it with any random source.
 *
 * The deed table, the posts and the pick are house rules; the rolls follow the usual V20 Attribute + Ability.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const str = (v, max = 120) => String(v ?? "").trim().slice(0, max);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Where a character can stand in a battle. */
export const POSTS = {
  line: "In the line",
  command: "With the commander",
  scout: "Scouting and skirmishing",
  walls: "On the walls",
  breach: "At the gate or the breach"
};

/** The ages of war (battle-rules.mjs AGES and REALM_AGES ids) gathered into the groups the deed table uses. */
const GROUP = {feudal: "medieval", hussite: "medieval", pike: "early", musket: "early", columns: "c19", rifle: "c19",
  trench: "wars", armour: "wars", cold: "modern", network: "modern", future: "future", umbra: "umbra", underworld: "underworld"};
export const groupOf = ageId => GROUP[ageId] ?? "medieval";

/** WoDX Combat's kinds of being, gathered for the deed table: kindred, garou, mage, fae, wraith, hunter, other. */
const KIND = {kindred: "kindred", ghoul: "mortal", mortal: "mortal", hunter: "hunter", lupine: "garou", mage: "mage", fae: "fae",
  wraith: "wraith", spirit: "spirit", beast: "mortal", demon: "demon", mummy: "mummy", exalted: "mummy", "kuei-jin": "kuei-jin"};
export const kindGroup = kind => KIND[String(kind ?? "").toLowerCase()] ?? "mortal";
/** Kinds whose deeds the living can see as more than human. */
export const SUPERNATURAL_KINDS = ["kindred", "garou", "mage", "fae", "wraith", "spirit", "demon", "mummy", "kuei-jin"];

/**
 * The deeds. post: a key of POSTS or "*" (any post); groups: the age groups it fits (none: every group of the living
 * world); kinds: the kinds of being it is for (none: anyone); roll: [attribute, ability, another ability that may
 * stand in]; seen: a power the living can see.
 */
const D = (id, post, name, text, roll, diff, buys, more = {}) => ({id, post, name, text, roll, diff, buys, ...more});
const LIVING = ["medieval", "early", "c19", "wars", "modern", "future"];
export const DEEDS = [
  // In the line
  D("hold-gap", "line", "Hold the gap", "The line gives beside you; a gap opens wide enough for the enemy to pour through.", ["stamina", "melee", "brawl"], 7, "The line holds, and the side keeps its ground", {groups: LIVING}),
  D("take-banner", "line", "Take their banner", "Their standard is a few yards off in the press, its bearer tiring.", ["strength", "melee", "brawl"], 7, "The banner falls and the men around it lose heart", {groups: ["medieval", "early", "c19"]}),
  D("meet-champion", "line", "Meet their champion", "A known fighter on the other side is cutting through your people and calls for a match.", ["dexterity", "melee"], 7, "Their champion goes down in front of both lines", {groups: ["medieval", "early"]}),
  D("shield-wall", "line", "Lock the shields", "The front rank wavers as the charge comes in.", ["strength", "melee"], 6, "The charge breaks on the wall", {groups: ["medieval"]}),
  D("push-pike", "line", "Push of pike", "Two pike blocks meet and lean into each other; whoever gives a step gives the field.", ["strength", "melee"], 7, "Your block drives theirs back a pace, then another", {groups: ["early"]}),
  D("hold-volley", "line", "Hold the volley", "They come on at the walk. Fire too soon and the volley is wasted.", ["wits", "firearms"], 7, "One close volley tears their front rank apart", {groups: ["early", "c19"]}),
  D("trench-raid", "line", "Clear the next bay", "A raid into their trench: one bay at a time, grenades and spades.", ["dexterity", "brawl", "melee"], 7, "The bay is yours, with prisoners", {groups: ["wars"]}),
  D("hold-street", "line", "Hold the street", "Their armour noses down the street; you have a corner and a launcher.", ["wits", "firearms"], 7, "The lead vehicle burns and blocks the way", {groups: ["wars", "modern"]}),
  D("drone-down", "line", "Bring the drone down", "A drone hangs over the street, calling fire on whatever moves.", ["perception", "firearms", "technology"], 8, "The drone drops and the street goes blind for them", {groups: ["modern", "future"]}),
  D("carry-friend", "*", "Carry a friend out", "Someone you know is down and bleeding in the open.", ["stamina", "athletics"], 6, "They live, and the side sees that nobody is left behind", {groups: LIVING}),
  // With the commander
  D("rally", "command", "Rally the wavering", "A company on the flank starts to look over its shoulder.", ["charisma", "leadership"], 7, "They turn back to the fight"),
  D("read-field", "command", "Read the field", "Dust, smoke and confusion; somewhere the enemy is moving their reserve.", ["perception", "tactics", "leadership"], 7, "The commander moves first and the blow lands on empty ground"),
  D("runner", "command", "Get the order through", "The order has to reach the far wing before it is too late.", ["dexterity", "ride", "athletics"], 6, "The wing moves in time", {groups: ["medieval", "early", "c19"]}),
  D("signals", "command", "Keep the signals open", "The field telephone line is cut and the radios are full of noise.", ["intelligence", "technology", "academics"], 7, "The guns fire where they should", {groups: ["wars", "modern", "future"]}),
  D("guard-commander", "command", "Guard the commander", "Riders, a sniper, a sudden rush: someone is going for the commander.", ["wits", "alertness"], 7, "The commander lives and keeps command"),
  // Scouting and skirmishing
  D("find-ford", "scout", "Find the ford", "There is a way round, if someone can find it before the enemy does.", ["perception", "survival"], 6, "The side can turn their flank", {groups: ["medieval", "early", "c19"]}),
  D("pick-officers", "scout", "Pick off the officers", "From cover you can see who gives the orders over there.", ["dexterity", "archery", "firearms"], 7, "Their orders stop coming"),
  D("steal-horses", "scout", "Cut their horses loose", "Their horse lines are behind a hedge, lightly watched.", ["dexterity", "stealth"], 7, "Their riders fight on foot", {groups: ["medieval", "early", "c19"]}),
  D("watch-road", "scout", "Watch the road", "Something is coming down the road, and nobody knows whose it is.", ["perception", "alertness"], 6, "Word comes back in time to meet it"),
  D("spot-guns", "scout", "Spot their guns", "Their battery is hidden somewhere beyond the ridge.", ["perception", "alertness"], 7, "Your guns find them", {groups: ["early", "c19", "wars", "modern"]}),
  // On the walls
  D("drop-ladder", "walls", "Throw down the ladder", "A ladder hits the wall beside you and men are already climbing.", ["strength", "athletics", "melee"], 6, "The ladder goes over with the men on it"),
  D("burn-tower", "walls", "Burn the siege tower", "Their tower creaks toward the wall; pitch and fire are at hand.", ["dexterity", "archery", "athletics"], 7, "The tower burns before it reaches the wall", {groups: ["medieval"]}),
  D("counter-mine", "walls", "Break into their mine", "Listen at a bowl of water: they are digging under the wall.", ["intelligence", "crafts", "academics"], 7, "The mine is found and flooded", {groups: ["medieval", "early"]}),
  D("hold-rampart", "walls", "Hold the rampart", "Their storm party is on the rampart; it is hand to hand.", ["stamina", "melee", "brawl"], 7, "They are thrown back into the ditch"),
  // At the gate or the breach
  D("first-breach", "breach", "First through the breach", "The breach is open but full of rubble, smoke and their best men.", ["strength", "athletics"], 8, "A foothold inside the walls"),
  D("ram-gate", "breach", "Keep the ram swinging", "Arrows, stones and boiling water come down on the ram crew.", ["stamina", "athletics"], 7, "The gate gives", {groups: ["medieval"]}),
  D("petard", "breach", "Set the charge", "The charge has to go against the gate under their fire.", ["dexterity", "crafts", "demolitions"], 7, "The gate is blown in", {groups: ["early", "c19", "wars", "modern", "future"]}),
  // The Umbra
  D("u-spirit-line", "*", "Hold against the Banes", "A tide of Banes comes over the shattered spirit ground.", ["stamina", "brawl", "melee"], 7, "The Banes break on you", {groups: ["umbra"]}),
  D("u-land", "*", "Wake the land", "The spirits of the hill and the stream are watching which side to take.", ["charisma", "enigmas", "empathy"], 7, "The land's spirits take your side", {groups: ["umbra"]}),
  D("u-totem", "command", "Call the totem", "The pack's totem is near, if it is called with the right respect.", ["charisma", "rituals", "expression"], 7, "The totem's favour runs through the line", {groups: ["umbra"]}),
  // The Underworld
  D("w-hold-tempest", "*", "Hold the shore of the Tempest", "Spectres boil out of the storm at the edge of the Necropolis.", ["stamina", "melee", "brawl"], 7, "The Spectres are thrown back into the storm", {groups: ["underworld"]}),
  D("w-free-thralls", "*", "Free the thralls", "Renegades drag a line of chained wraiths behind their lines.", ["dexterity", "stealth"], 7, "The thralls are free and fight beside you", {groups: ["underworld"]}),
  D("w-legion", "command", "Keep the legion in order", "Fear of the Oblivion spreads through the ranks.", ["charisma", "leadership"], 7, "The legion holds its ranks", {groups: ["underworld"]}),
  // Deeds of their own kind (any post, the living world)
  D("k-dominate", "*", "Command the enemy captain", "Their captain looks your way for a moment; a word and a look could turn them.", ["manipulation", "leadership", "intimidation"], 7, "The captain gives the wrong order", {kinds: ["kindred"], seen: true, groups: LIVING}),
  D("k-presence", "*", "Make them flee in terror", "Let them see what you are, for a heartbeat, and they will run.", ["charisma", "intimidation"], 7, "A whole rank breaks and runs", {kinds: ["kindred", "kuei-jin"], seen: true, groups: LIVING}),
  D("k-feed", "*", "Feed in the press", "There is blood everywhere; a quick drink and no one will notice. Perhaps.", ["dexterity", "brawl"], 6, "Blood regained, and a foe less", {kinds: ["kindred"], seen: true, groups: LIVING}),
  D("g-crinos", "*", "Into the press as war form", "Rage is high. In war form you could tear a hole through their line.", ["strength", "brawl"], 6, "A hole torn in their line, and the Delirium spreads", {kinds: ["garou"], seen: true, groups: LIVING}),
  D("m-vulgar", "*", "Work a great Effect", "A wall of fire, a sudden fog, the ground opening: the field is yours to change.", ["intelligence", "occult", "academics"], 7, "The field turns against them", {kinds: ["mage"], seen: true, groups: LIVING}),
  D("m-coincidental", "*", "Help luck along", "A misfire, a stumble, a powder keg that catches: nothing anyone could call magic.", ["wits", "occult", "academics"], 6, "Their bad luck turns the phase", {kinds: ["mage"], groups: LIVING}),
  D("f-glamour", "*", "Wake the dreams of glory", "The fighters around you want a song and a legend; give them one.", ["charisma", "expression", "performance"], 6, "Your side fights like heroes of a tale", {kinds: ["fae"], groups: LIVING}),
  D("w-skin", "*", "Reach through the Shroud", "The Shroud is thin where so many die; a touch from the other side could turn a blade.", ["wits", "occult"], 7, "A blade turns, a horse shies, a gun jams", {kinds: ["wraith"], seen: true, groups: LIVING}),
  D("h-sense", "*", "Find the monster in their ranks", "Something on the other side is not human, and it is killing your people.", ["perception", "occult", "alertness"], 7, "The thing is found and faced", {kinds: ["hunter"], groups: LIVING}),
  D("s-spirit", "*", "Call the spirits of war", "Spirits of slaughter gather over every battlefield; some can be bargained with.", ["charisma", "occult", "enigmas"], 7, "The spirits of war take a side", {kinds: ["spirit", "demon", "mummy"], seen: true, groups: LIVING})
];
const BY_ID = new Map(DEEDS.map(d => [d.id, d]));
export const deedById = id => BY_ID.get(id) ?? null;

/** The post a character stands at, from their stance and the battle (a siege's walls and breach). */
export function postFor(char = {}, battle = {}) {
  if ( POSTS[char.post] ) return char.post;
  if ( char.stance === "command" ) return "command";
  if ( char.stance === "rear" ) return "scout";
  const siege = battle.kind === "siege" || battle.breached || (battle.phases ?? []).some(p => p?.kind === "assault");
  if ( siege ) return char.side === 1 ? "walls" : "breach";
  return "line";
}

/** Every deed that fits a post, an age group and a kind of being (their own kind's deeds first). */
export function deedsFor({post = "line", group = "medieval", kind = "mortal"} = {}) {
  const k = kindGroup(kind);
  const fits = d => (d.post === "*" || d.post === post) && (d.groups ? d.groups.includes(group) : LIVING.includes(group)) && (!d.kinds || d.kinds.includes(k));
  const all = DEEDS.filter(fits);
  return [...all.filter(d => d.kinds), ...all.filter(d => !d.kinds)];
}

/** A small stable hash, so the same character gets the same offer for the same phase. */
export function hash(s) {
  let h = 2166136261;
  for ( const c of String(s) ) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

/**
 * Pick one deed. `seed` makes it stable; `skip` lists deed ids already shown (Swap). A supernatural character gets
 * a deed of their own kind about one time in three. Returns null when nothing fits.
 */
export function pickDeed({post = "line", group = "medieval", kind = "mortal", seed = "", skip = []} = {}) {
  let list = deedsFor({post, group, kind}).filter(d => !skip.includes(d.id));
  if ( !list.length ) list = deedsFor({post, group, kind});
  if ( !list.length ) return null;
  const h = hash(seed);
  const own = list.filter(d => d.kinds), plain = list.filter(d => !d.kinds);
  const pool = own.length && (h % 3 === 0 || !plain.length) ? own : plain.length ? plain : own;
  return pool[(h >>> 3) % pool.length];
}

/* ---- Offers kept on a battle ---- */

/** A clean offers record: {phase, list: [{actorId, side, post, deedId, shown, skip, rolled}]}. */
export function normOffers(o) {
  if ( !o || typeof o !== "object" ) return null;
  const list = (Array.isArray(o.list) ? o.list : []).filter(x => x?.actorId && BY_ID.has(x.deedId)).slice(0, 20).map(x => ({
    actorId: str(x.actorId, 40), name: str(x.name), side: x.side === 1 ? 1 : 0, post: POSTS[x.post] ? x.post : "line", deedId: x.deedId,
    shown: (Array.isArray(x.shown) ? x.shown : []).filter(id => BY_ID.has(id)).slice(-12), skip: !!x.skip,
    rolled: x.rolled ? {successes: Math.max(0, Math.round(n(x.rolled.successes))), botch: !!x.rolled.botch, pool: Math.max(0, Math.round(n(x.rolled.pool))),
      faces: Array.isArray(x.rolled.faces) ? x.rolled.faces.slice(0, 30).map(n) : []} : null
  }));
  return {phase: Math.max(1, Math.round(n(o.phase)) || 1), list};
}

/** The phase number the next fight will be. */
export const nextPhase = battle => (battle?.phases ?? []).filter(p => p?.kind === "phase" || p?.kind === "book").length + 1;

/**
 * Offer each character in the battle a deed for the next phase. `chars` = [{actorId, name, side, stance, post, kind}]
 * (kind from WoDX Combat). Keeps the offers already made for that phase.
 */
export function makeOffers(battle, ageId, chars = battle?.chars ?? []) {
  const phase = nextPhase(battle), group = groupOf(ageId);
  const old = normOffers(battle?.offers);
  const keep = old && old.phase === phase ? old.list : [];
  const list = chars.filter(c => c?.actorId).map(c => {
    const had = keep.find(x => x.actorId === c.actorId);
    if ( had ) return had;
    const post = postFor(c, battle);
    const d = pickDeed({post, group, kind: c.kind, seed: `${battle?.id}:${phase}:${c.actorId}`});
    return d ? {actorId: c.actorId, name: str(c.name), side: c.side === 1 ? 1 : 0, post, deedId: d.id, shown: [d.id], skip: false, rolled: null} : null;
  }).filter(Boolean);
  return normOffers({phase, list});
}

const mapOffer = (offers, actorId, fn) => normOffers({...offers, list: (offers?.list ?? []).map(x => x.actorId === actorId ? fn(x) : x)});

/** Swap a character's deed for another that fits (not one already shown, while any are left). */
export function swapOffer(offers, actorId, ageId, kind = "mortal", {post = null} = {}) {
  return mapOffer(offers, actorId, x => {
    const p = POSTS[post] ? post : x.post;
    const shown = p === x.post ? x.shown : [];
    const d = pickDeed({post: p, group: groupOf(ageId), kind, seed: `${actorId}:${offers.phase}:${shown.length}:${p}`, skip: shown});
    return d ? {...x, post: p, deedId: d.id, shown: [...shown, d.id], rolled: null} : x;
  });
}
export const skipOffer = (offers, actorId, skip = true) => mapOffer(offers, actorId, x => ({...x, skip: !!skip}));
export const recordRoll = (offers, actorId, roll) => mapOffer(offers, actorId, x => ({...x, rolled: roll ? {...roll} : null, skip: false}));

/** The rolled deeds of the offers as settlePhase wants them: [[{name, successes}], [...]]; skipped ones left out. */
export function offerDeeds(offers) {
  const out = [[], []];
  for ( const x of normOffers(offers)?.list ?? [] ) {
    if ( x.skip || !x.rolled ) continue;
    const d = deedById(x.deedId);
    out[x.side].push({name: `${x.name || "A character"}: ${d?.name ?? "a deed"}`, successes: x.rolled.botch ? 0 : x.rolled.successes, deedId: x.deedId, actorId: x.actorId, seen: !!d?.seen});
  }
  return out;
}

/** Join the rolled offers onto the deeds typed in by hand. */
export const joinDeeds = (typed = [[], []], offers = null) => {
  const o = offerDeeds(offers);
  return [0, 1].map(i => [...(typed[i] ?? []), ...o[i]]);
};

/* ---- Off-screen deeds (faction wars) ---- */

/**
 * A leader's deed for a side with no window and no sheet: a commander's deed, or one of their kind when the side has
 * supernatural help (side.supernatural 2 or more) and a kind is given. The pool is the commander's Perception +
 * Leadership (side.commander.pool) for command deeds, or `pool` when given. Returns {deed, pool, difficulty, seen}.
 */
export function leaderDeed(side = {}, ageId = "feudal", {kind = null, seed = "", pool = null} = {}) {
  const group = groupOf(ageId);
  const sup = n(side.supernatural) >= 2 && kind && SUPERNATURAL_KINDS.includes(kindGroup(kind));
  const deed = sup ? pickDeed({post: "command", group, kind, seed: `own:${seed}`}) : null;
  const d = deed?.kinds ? deed : pickDeed({post: "command", group, kind: "mortal", seed});
  if ( !d ) return null;
  const dice = clamp(Math.round(n(pool ?? side.commander?.pool ?? 4)) || 4, 1, 15);
  return {deed: d, pool: dice, difficulty: d.diff, seen: !!d.seen};
}

/**
 * Roll a deed with any random source (rng() in [0, 1), Math.random by default): V20 successes, 1s take one each,
 * a botch when no die succeeded and a 1 came up. Returns {successes, botch, faces, pool}.
 */
export function deedSuccessesFor(pool, difficulty = 6, rng = Math.random) {
  const dice = clamp(Math.round(n(pool)), 0, 30), diff = clamp(Math.round(n(difficulty)) || 6, 2, 10);
  const faces = Array.from({length: dice}, () => 1 + Math.floor(clamp(n(rng()), 0, 0.9999) * 10));
  const hits = faces.filter(f => f >= diff).length, ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0, faces, pool: dice};
}

/** The dice for a deed from a character's numbers: an Attribute plus the better of its Abilities. */
export function deedPool(deed, attrOf = () => 0, abilityOf = () => 0) {
  const [attr, ...abil] = deed?.roll ?? [];
  return Math.max(1, n(attrOf(attr)) + Math.max(0, ...abil.map(a => n(abilityOf(a)))));
}

/** The words of a deed for a card. */
export function deedWords(deed, name = "") {
  if ( !deed ) return "";
  const [attr, ...abil] = deed.roll;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  return `${name ? `${name}: ` : ""}${deed.name}. ${deed.text} Roll ${cap(attr)} + ${abil.map(cap).join(" or ")} at ${deed.diff}. Success: ${deed.buys}.`;
}
