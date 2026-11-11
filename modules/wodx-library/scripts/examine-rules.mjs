/**
 * WoDX Library 0.7.0: examining an item (Ben asked 2026-11-11, after Cataclysm DDA's item descriptions). Pure rules.
 *
 *   Examine: the good's description for the year, and the facts WoDX already keeps (category, uses, how well it hides,
 *   what it is worth here and now, how it stacks). No weight, volume or wear: those Cataclysm parts were ruled out.
 *   A closer look: Perception + the best of the category's Abilities, difficulty 6 (a house rule). Successes tell
 *   more: one, how it was made; two, where and roughly when; three, whether it is false, stolen or worn out;
 *   four, anything uncanny about it. The Storyteller's own lines on an item open at the successes they set.
 *
 * Item flag wodx-library.examine = {origin, quality, forged, forgedTell, stolen, worn, uncanny, uncannyNeed, lines:
 * [{need, text}], note}. Nothing here is needed: an item with no flag is examined from its goods entry alone.
 */
export const DIFFICULTY = 6;
export const NEEDS = {made: 1, origin: 2, truth: 3, uncanny: 4};
export const QUALITY = {poor: "Poor", plain: "Plain", good: "Good", fine: "Fine", master: "Masterwork"};

/** Abilities that help a closer look, by category, best first. Both editions' names: the character's best counts. */
export const ABILITIES = {
  coin: ["finance", "commerce", "streetwise", "academics"],
  food: ["survival", "hearthwisdom", "crafts", "craft"],
  drink: ["survival", "hearthwisdom", "crafts", "craft", "etiquette"],
  drugs: ["medicine", "streetwise", "science", "hearthwisdom"],
  vice: ["streetwise", "subterfuge", "larceny", "legerdemain"],
  kitchen: ["crafts", "craft", "hearthwisdom"],
  house: ["crafts", "craft", "hearthwisdom", "finance", "commerce"],
  cloth: ["crafts", "craft", "etiquette", "finance", "commerce"],
  hygiene: ["etiquette", "medicine", "crafts", "craft"],
  tools: ["crafts", "craft", "technology", "survival"],
  light: ["crafts", "craft", "technology", "survival"],
  fuel: ["survival", "technology", "crafts", "craft"],
  power: ["technology", "science", "computer"],
  papers: ["investigation", "academics", "scholarship", "law", "seneschal", "bureaucracy"],
  manuals: ["academics", "scholarship", "investigation"],
  maps: ["survival", "academics", "scholarship", "investigation"],
  faith: ["theology", "occult", "academics", "scholarship"],
  occult: ["occult", "enigmas", "cosmology", "lore", "academics"],
  medicine: ["medicine", "science", "hearthwisdom"],
  keepsake: ["investigation", "academics", "empathy"],
  toys: ["crafts", "craft", "performance", "expression"],
  valuables: ["finance", "commerce", "crafts", "craft", "streetwise"],
  arms: ["firearms", "melee", "archery", "crafts", "craft"],
  accessories: ["firearms", "archery", "technology", "crafts", "craft"],
  traps: ["survival", "security", "larceny", "crafts", "craft"],
  travel: ["animalken", "ride", "drive", "survival"],
  containers: ["crafts", "craft", "security", "larceny"],
  keys: ["security", "larceny", "crafts", "craft"],
  materials: ["crafts", "craft", "science", "technology"],
  seeds: ["survival", "hearthwisdom", "science"],
  tech: ["technology", "science", "computer", "crafts"]
};

/** What each success level of a closer look shows, by category, in plain words. */
export const LINES = {
  coin: ["The striking, the metal and its weight.", "The mint and roughly when it was struck.", "Whether it is clipped, shaved, plated or false."],
  food: ["How it was grown or made and kept.", "Where it likely comes from and how old it is.", "Whether it is spoiled, watered or tampered with."],
  drink: ["How it was brewed or distilled.", "Where it was made and how long it has been kept.", "Whether it is watered, cut or drugged."],
  drugs: ["What it most likely is and how strong.", "Where it was made and by what sort of hands.", "What it is cut with, and whether a dose would harm."],
  vice: ["How it was made.", "Where it came from.", "Whether it is rigged, marked or forged."],
  kitchen: ["How it was made and how much use it has seen.", "Where and roughly when it was made.", "Whether it is cracked, mended or not what it seems."],
  house: ["How it was made and how well.", "Where and roughly when it was made.", "Whether it is mended, copied or worth less than it looks."],
  cloth: ["The cloth, the cut and the stitching.", "Where it was made and what fashion it follows.", "Whether it is mended, altered, or made to look richer than it is."],
  hygiene: ["What it is made of.", "Where it comes from.", "Whether it is cheap stuff passed off as dear, or harmful."],
  tools: ["How it was made and how well it is kept.", "Where and roughly when it was made.", "Whether it is cracked, badly mended or made to fail."],
  light: ["How it was made and what it burns.", "Where and roughly when it was made.", "Whether it is faulty or dangerous."],
  fuel: ["What it is and how well it will burn.", "Where it comes from.", "Whether it is wet, watered or adulterated."],
  power: ["How much charge it holds.", "Who made it and roughly when.", "Whether it is faulty, tampered with or about to fail."],
  papers: ["The paper or skin, the ink and the hand.", "Where and roughly when it was written, and by what sort of writer.", "Whether it is forged, altered or not what it claims."],
  manuals: ["How well it was made and how much it has been read.", "Where and when it was printed or copied.", "Whether it is a cheap copy, or its advice is wrong."],
  maps: ["How it was drawn and how carefully.", "Who drew it and roughly when.", "Whether it is out of date, wrong, or drawn to mislead."],
  faith: ["How it was made and how much it has been handled in prayer.", "Where it comes from and the tradition it belongs to.", "Whether it is a fake relic, a copy, or stolen from a shrine."],
  occult: ["How it was made and from what.", "Where it comes from and the tradition it claims.", "Whether it is a fraud, a copy, or the work of someone who believed."],
  medicine: ["What it is and how it is meant to be used.", "Where it comes from and how old it is.", "Whether it is spoiled, fake or dangerous."],
  keepsake: ["How it was made and how much it has been handled.", "Where it comes from and roughly how old it is.", "Whose it most likely was, and whether it was given or taken."],
  toys: ["How it was made and how much play it has seen.", "Where and roughly when it was made.", "Whether it is rigged, broken or a copy."],
  valuables: ["The metal, the stones and the workmanship.", "Where and roughly when it was made, and by what sort of maker.", "Whether it is false, plated, paste, or stolen and recut."],
  arms: ["How it was made and how well it is kept.", "Where and roughly when it was made.", "Whether it is faulty, tampered with or likely to fail."],
  accessories: ["How it was made and what it fits.", "Who made it and roughly when.", "Whether it is faulty or will give its user away."],
  traps: ["How it works and how well it was made.", "Who would make one like this.", "Whether it has been tampered with, or will hurt the one who sets it."],
  travel: ["How it was made and how much road it has seen.", "Where it was made or issued.", "Whether it is forged, worn through or stolen."],
  containers: ["How it was made and how strong it is.", "Where and roughly when it was made.", "Whether it has a false bottom, a hidden pocket or a forced lock."],
  keys: ["How it was cut and what sort of lock it fits.", "Who would have made it and roughly when.", "Whether it is a copy, and whether it has been used to force something."],
  materials: ["What it is and how pure.", "Where it comes from.", "Whether it is adulterated or dangerous."],
  seeds: ["What it is and whether it will grow.", "Where it comes from.", "Whether it is dead, mislabelled or diseased."],
  tech: ["How it works and what state it is in.", "Who made it and roughly when.", "Whether it has been tampered with, bugged or is about to fail."]
};

export const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** The best ability among a category's list. abilities: {key: dots}. Returns {key, dots}. */
export function bestAbility(kind, abilities = {}) {
  let best = {key: null, dots: 0};
  for ( const k of ABILITIES[kind] ?? ["investigation"] ) if ( num(abilities[k]) > best.dots ) best = {key: k, dots: num(abilities[k])};
  if ( !best.key ) best.key = (ABILITIES[kind] ?? ["investigation"])[0];
  return best;
}

/** The pool and difficulty of a closer look. */
export function closerPool(kind, {perception = 0, abilities = {}} = {}) {
  const ab = bestAbility(kind, abilities);
  return {pool: Math.max(1, num(perception) + ab.dots), ability: ab.key, dots: ab.dots, difficulty: DIFFICULTY};
}

/** Count successes on d10 faces at a difficulty: tens count once, ones take one away. Returns {successes, botch}. */
export function countSuccesses(faces = [], difficulty = DIFFICULTY) {
  const hits = faces.filter(f => f >= difficulty).length;
  const ones = faces.filter(f => f === 1).length;
  return {successes: Math.max(0, hits - ones), botch: hits === 0 && ones > 0};
}

/** The plain facts of an item from its goods entry. good: a goods entry; extra {value, price, quality}. */
export function factsOf(good, {kinds = {}, values = {}, conceal = {}, uses = null, tier = null, price = null, quality = null} = {}) {
  if ( !good ) return [];
  const out = [];
  out.push(["Kind", kinds[good.kind] ?? good.kind]);
  const u = uses ?? good.uses ?? [];
  if ( u.length ) out.push(["Used to", u.join(", ")]);
  if ( good.conceal ) out.push(["Hides in", conceal[good.conceal] ?? good.conceal]);
  const t = tier ?? good.value;
  if ( price ) out.push(["Worth here", price]);
  else if ( values[t] ) out.push(["Worth", `${values[t].label}: ${values[t].wage}`]);
  if ( good.stack ) out.push(["Stacks", `as ${good.stack.plural}`]);
  if ( quality && QUALITY[quality] ) out.push(["Made", QUALITY[quality]]);
  return out;
}

/** What a closer look finds. Returns [{need, text, secret}] for every line the successes open, in order. */
export function findings(kind, successes = 0, flag = {}, owner = null) {
  const s = num(successes), f = flag ?? {};
  const base = LINES[kind] ?? ["How it was made.", "Where it comes from.", "Whether it is what it seems."];
  const out = [];
  if ( s >= NEEDS.made ) {
    out.push({need: 1, text: base[0]});
    if ( f.quality && QUALITY[f.quality] ) out.push({need: 1, text: `The work is ${QUALITY[f.quality].toLowerCase()}.`});
  }
  if ( s >= NEEDS.origin ) {
    out.push({need: 2, text: base[1]});
    if ( f.origin ) out.push({need: 2, text: String(f.origin)});
  }
  if ( s >= NEEDS.truth ) {
    out.push({need: 3, text: base[2]});
    if ( f.forged ) out.push({need: 3, secret: true, text: f.forgedTell ? `It is not genuine: ${f.forgedTell}` : "It is not genuine. Someone made it to pass as something it is not."});
    if ( f.stolen || owner?.stolen ) out.push({need: 3, secret: true, text: "There are signs it was stolen: a mark scratched off, a name cut away, or a fit made for someone else."});
    if ( f.worn ) out.push({need: 3, text: "It is worn and will not last much longer."});
    if ( !f.forged && !f.stolen && !owner?.stolen && !f.worn ) out.push({need: 3, text: "Nothing about it is false."});
  }
  const un = Math.max(NEEDS.uncanny, num(f.uncannyNeed) || NEEDS.uncanny);
  if ( f.uncanny && s >= un ) out.push({need: un, secret: true, text: String(f.uncanny)});
  for ( const l of Array.isArray(f.lines) ? f.lines : [] ) if ( l?.text && s >= Math.max(1, num(l.need) || 1) ) out.push({need: Math.max(1, num(l.need) || 1), secret: true, text: String(l.text)});
  return out.sort((a, b) => a.need - b.need);
}

/** "3: A line" per row, as the Storyteller writes extra lines, to [{need, text}]. */
export function parseLines(text = "") {
  return String(text).split("\n").map(l => /^\s*(\d+)\s*[:.)]\s*(.+)$/.exec(l) ?? (l.trim() ? [null, "1", l.trim()] : null))
    .filter(Boolean).map(m => ({need: Math.max(1, Math.min(10, Number(m[1]))), text: m[2].trim().slice(0, 400)})).slice(0, 12);
}
export const joinLines = (lines = []) => lines.map(l => `${l.need}: ${l.text}`).join("\n");

/** The good a name refers to: "a bronze coin (7)" or "7 bronze coins" or "a bronze coin". */
export function goodOf(name, goods = []) {
  const s = String(name ?? "").trim();
  const bare = s.replace(/\s*\(\d+\)\s*$/, "");
  const byName = goods.find(g => g.name === bare || g.name.toLowerCase() === bare.toLowerCase());
  if ( byName ) return byName;
  const m = /^(\d+)\s+(.+)$/.exec(bare);
  if ( m ) return goods.find(g => g.stack?.plural && g.stack.plural.toLowerCase() === m[2].toLowerCase()) ?? null;
  return null;
}
