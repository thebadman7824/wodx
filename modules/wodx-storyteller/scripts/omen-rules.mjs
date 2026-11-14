/**
 * Dreams and omens from what is coming (B3369-B3373). Pure, no Foundry.
 *
 * The world gives signals of what is about to happen: a dated event of the chronicle near its day, an NPC's grudge
 * against a character close to acting, hunters closing in on a region, a plague on its way, a rival near a haven. Each
 * signal is {kind, about (a character id or ""), region, weight 1-3, words}. A character with a gift for it (Auspex,
 * the Oracular Ability Merit, a Malkavian, a Theurge, the fae, a mage's Dream, a Visionary hunter from 1999, a mummy)
 * may dream of it in symbols drawn from a table by kind and way of life (B3370). Some dreams lie (B3371). Reading a
 * dream is Perception or Intelligence + Enigmas or Occult at 7 (W20 pdf 283; V20 pdf 501 for Oracular Ability), and
 * more successes give plainer meaning (B3372). A great sign can also show in the world as an omen (B3373). Every
 * dream and omen is the Storyteller's to see, change or refuse before it comes. The symbols are WoDX's own; the chances
 * are house figures.
 */

export const DAY = 86400;
export const COOLDOWN = 7 * DAY;
export const READ_DIFF = 7;
export const FALSE_CHANCE = 0.1;
export const KINDS = ["grudge", "hunters", "plague", "war", "fire", "flood", "death", "change"];

/** Symbols by kind: every way of life shares the first list; some ways add their own. */
export const SYMBOLS = {
  grudge: {any: ["a dog that follows at a distance and will not come closer", "a knife baked into a loaf of bread", "a face at the window that is gone when you look", "a guest who smiles and does not eat", "a ledger with one line written over and over"],
    latin: ["a confession heard by someone who is not a priest"], islamic: ["a gift wrapped in cloth that is too heavy for what it holds"], sinic: ["an ancestor's tablet turned to face the wall"], japanese: ["a mask on the wall that turns to follow you"], indic: ["a cobra coiled under the threshold, waiting"]},
  hunters: {any: ["torches moving on the hill", "a hound with a person's eyes", "footsteps in the street that stop when yours do", "a door marked in chalk", "a net drawn slowly through dark water"],
    latin: ["a bell rung backward", "a book of names with yours half written"], orthodox: ["an icon that weeps when you pass"], islamic: ["a lamp carried by many hands toward your door"], northern: ["ravens circling over the place you sleep"]},
  plague: {any: ["a cart with no driver", "black flowers in the well", "a crowd that coughs in one voice", "rats leaving a house in daylight", "a red cross on a door"],
    sinic: ["a paper boat of the dead drifting up the river"], indic: ["a goddess's shrine left without flowers"], latin: ["a procession that whips itself through the streets"]},
  war: {any: ["iron rain on the roofs", "a field of boots with no one in them", "a flag burning without smoke", "horses running riderless through the square", "bread turning to ash in the hand"],
    latin: ["a comet over the cathedral"], japanese: ["a broken bow string singing in the dark"], northern: ["wolves at the edge of the village fire"]},
  fire: {any: ["red birds roosting on the roof", "the walls of a house breathing in and out", "a candle that will not go out", "smoke under the door and no fire to be found", "warm ash in a cold room"]},
  flood: {any: ["fish swimming in the street", "the river running the wrong way", "a boat tied to a chimney", "mud on the stairs rising a step each night"]},
  death: {any: ["a chair set at the table for no one", "a clock that stops at the same hour", "a white bird at the window", "a coffin made to someone's measure", "a mirror covered in black cloth"],
    latin: ["the death knell rung for a name you know"], sinic: ["white clothes laid out on a bed"], islamic: ["a grave dug facing the right way, waiting"], indic: ["a pyre built and not yet lit"]},
  change: {any: ["a crow on the bell tower", "the stars in the wrong places", "a stranger's shoes left at your door", "a key that fits every lock but yours", "a road that was not there yesterday"],
    japanese: ["a fox at the shrine gate, watching"], orthodox: ["the bells ringing at the wrong hour"]}
};

/** Signs in the world for a great signal (B3373): weather, birds, beasts. */
export const OMENS = {
  any: ["Crows gather on the roofs and do not leave.", "A cold wind blows through the town though the trees are still.", "Dogs howl all night at nothing anyone can see.", "Milk sours in every house on the same morning."],
  plague: ["Rats come out by daylight, slow and unafraid."], war: ["A red glow lights the sky to the east before dawn."], fire: ["Swallows leave the eaves all at once."], flood: ["The frogs sing out of season."], death: ["An owl calls by day."]
};

/** What a dream means at each depth of reading: [what kind of thing, more, plain]. {who} and {where} are filled in. */
export const MEANINGS = {
  grudge: ["Someone means the dreamer ill.", "An old wrong is not forgotten, by someone the dreamer knows.", "{who} holds a grudge and is close to acting on it."],
  hunters: ["Danger is coming from people, not beasts.", "Someone is asking questions about the dreamer's kind.", "Hunters are closing in on {where}."],
  plague: ["Sickness is near.", "A sickness is on the road toward the dreamer's town.", "Plague is coming to {where}."],
  war: ["Violence is coming, to many and not to one.", "Soldiers and fighting are near.", "War or rising is coming to {where}."],
  fire: ["Something the dreamer holds is in danger.", "A fire is coming, set by a hand.", "{who} means to burn a place of the dreamer's."],
  flood: ["The water is coming.", "A flood threatens the low streets.", "The river will rise at {where}."],
  death: ["Someone will die.", "A death close to the dreamer is near.", "{who} is near death."],
  change: ["Something great is about to change.", "The world is about to turn on its hinge.", "{what}"]
};

/** How strongly a character dreams true: 0 none, 1 a little, 2 gifted, 3 very gifted. */
export function giftOf({type = "", clan = "", auspice = "", creed = "", powers = [], traits = [], backgrounds = [], year = 0} = {}) {
  const T = String(type).toLowerCase(), P = powers.map(p => String(p).toLowerCase()), K = new Set(traits.map(String));
  let g = 0;
  if ( P.some(p => /^auspex$/.test(p)) ) g += 1;
  if ( P.some(p => /oneiromancy|dream/.test(p)) ) g += 1;
  if ( K.has("oracular-ability") ) g += 2;
  if ( /malkav/i.test(clan) ) g += 1;
  if ( /theurge/i.test(auspice) ) g += 1;
  if ( /changeling|kith/.test(T) ) g += 1;
  if ( /mummy|amenti/.test(T) ) g += 1;
  if ( /visionary/i.test(creed) && (!year || year >= 1999) ) g += 1;
  const dream = backgrounds.find(b => /^dream\b/i.test(String(b?.name ?? "")));
  if ( dream && Number(dream.value) > 0 ) g += Number(dream.value) >= 3 ? 2 : 1;
  return Math.min(3, g);
}

/** The chance a dreamer dreams of a signal tonight. */
export function chanceFor(signal, dreamer) {
  const g = Number(dreamer?.gift) || 0;
  if ( !g ) return 0;
  const w = Math.max(1, Math.min(3, Number(signal?.weight) || 1));
  const near = signal?.about && signal.about === dreamer.id ? 0.4 : signal?.region && signal.region === dreamer.region ? 0.15 : 0.03;
  return Math.min(0.9, near * g * (0.5 + w / 2));
}

const pickOf = (list, rand) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];

/** The symbols for a kind in a way of life. */
export const symbolsFor = (kind, way = "") => [...(SYMBOLS[kind]?.any ?? SYMBOLS.change.any), ...(SYMBOLS[kind]?.[way] ?? [])];

/**
 * Tonight's dreams. signals: the world's; dreamers: [{id, gift, region, way, last}]; returns
 * [{dreamer, signal, symbols: [two], lie}] at most one per dreamer, none within COOLDOWN of their last.
 * A lie (B3371) borrows the symbols of another kind; tainted regions lie more.
 */
export function tonight({signals = [], dreamers = [], now = 0, rand = Math.random, tainted = () => false} = {}) {
  const out = [];
  for ( const d of dreamers ) {
    if ( !d?.gift || (d.last && now - d.last < COOLDOWN) ) continue;
    const ranked = [...signals].sort((a, b) => chanceFor(b, d) - chanceFor(a, d));
    for ( const s of ranked ) {
      if ( !(rand() < chanceFor(s, d)) ) continue;
      const lie = rand() < FALSE_CHANCE + (tainted(d.region) ? 0.2 : 0);
      const kind = lie ? pickOf(KINDS.filter(k => k !== s.kind), rand) : s.kind;
      const pool = symbolsFor(kind, d.way);
      const a = pickOf(pool, rand);
      const b = pickOf(pool.filter(x => x !== a), rand) ?? a;
      out.push({dreamer: d.id, signal: s, symbols: [a, b], lie, kind});
      break;
    }
  }
  return out;
}

/** The words of a dream. */
export const dreamWords = symbols => {
  const [a, b] = symbols ?? [];
  return [`In the dream there is ${a}.`, b ? `Then, without any change of place, ${b}.` : "", "You wake with the taste of it still in your mouth."].filter(Boolean).join(" ");
};

/**
 * What a reading says. omen: {kind, who, where, what, lie}. 0 successes: nothing; 1: the kind; 2: more; 3+: plain. A
 * lying dream read with 4 or more shows itself for what it is.
 */
export function reading(omen = {}, successes = 0) {
  const s = Math.max(0, Math.round(Number(successes) || 0));
  if ( s <= 0 ) return "The dream will not open. It is only a dream, or not yet.";
  if ( omen.lie && s >= 4 ) return "The dream is false: something sent it, meaning to mislead.";
  const m = MEANINGS[omen.kind] ?? MEANINGS.change;
  const line = m[Math.min(2, s - 1)];
  return line.replace("{who}", omen.who || "Someone the dreamer knows").replace("{where}", omen.where || "the dreamer's town").replace("{what}", omen.what || "Something great is about to change.");
}

/** A sign in the world for a great signal (weight 3), or null. */
export function omenFor(signal, rand = Math.random) {
  if ( (Number(signal?.weight) || 0) < 3 ) return null;
  return pickOf([...(OMENS[signal.kind] ?? []), ...OMENS.any], rand);
}

/** A chronicle event's kind, read from its name and summary. */
export function kindOfEvent(ev = {}) {
  const t = `${ev.id ?? ""} ${ev.name ?? ""} ${ev.summary ?? ""}`.toLowerCase();
  if ( /plague|pox|influenza|\bflu\b|cholera|sickness/.test(t) ) return "plague";
  if ( /war|siege|battle|revolt|rising|riot|invasion|crusade/.test(t) ) return "war";
  if ( /fire|burn/.test(t) ) return "fire";
  if ( /flood/.test(t) ) return "flood";
  if ( /death|dies|killed|murder|fall of/.test(t) ) return "death";
  return "change";
}
