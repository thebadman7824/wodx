/**
 * WoDX NPC: one ledger for every bond that makes one person serve another (Servants and Bonds Desk x1, B5100-B5111).
 * Pure: no Foundry calls, so the harness can test it.
 *
 * Every game line binds people its own way. The older stores stay where their modules write them (the blood bond's
 * drinks on WoDX Creation's lineage, a ghoul's domitor, WoDX Actions' oaths, the Sabbat Vinculum in the faction
 * politics, a Background made real by WoDX Chronicle, a Creation ally's patron, the orders tie): the ledger reads them
 * in place, so nothing is copied and nothing goes out of step. The new kinds are kept on the servant's own sheet,
 * flags["wodx-npc"].held = {"<kind>:<masterId>": record}. Everything that asks who serves whom (the followers window,
 * the fight AI, the restraint on a blow, the map ring) reads recordsOf().
 *
 * A record: {kind, master (actor id), masterName, step (0-3: how deep), since (world seconds), last (last contact),
 * data, source}. Step 3 is always the full hold: a full blood oath, full Conditioning, Social Conditioning at
 * Alliance or past it, a chained Thrall.
 */
import {DAY} from "../../wodx-chronicle/scripts/terms.mjs";

const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const idOf = v => (v && typeof v === "object" ? (v.id ?? null) : v) || null;

/**
 * The kinds. line: the game line the bond belongs to (null for any). restrain: the roll a servant makes before
 * striking the master, by step ({difficulty, spend: a Willpower point on success, why}), or null for none.
 * obey: how a hard order is weighed by step: "free" (no loyalty roll), a number (the loyalty roll's difficulty
 * change), or 0. floor: the step at or past which the servant's opinion of the master cannot fall below warm.
 * page: where the rule comes from. house: true where WoDX reads past what the book says.
 */
export const KINDS = {
  blood: {label: "Blood bond", line: "vampire", page: "V20 Dark Ages pdf p. 343",
    restrain: s => (s >= 2 ? {difficulty: 8, spend: true, why: "the blood bond: a Willpower roll to raise a hand against the regnant"} : null),
    obey: s => (s >= 3 ? "free" : s >= 2 ? -1 : 0), floor: 3},
  vinculum: {label: "Vinculum", line: "vampire", page: "V20 p. 297 (WoDX reading B2841)",
    restrain: s => (s >= 2 ? {difficulty: 8, spend: true, why: "the Vinculum: a Willpower roll to strike a packmate it binds"} : null),
    obey: s => (s >= 3 ? -2 : s >= 2 ? -1 : 0), floor: 3},
  guanxi: {label: "Guanxi", line: "kuei-jin", page: "Kindred of the East pdf p. 69 (guanxi acts as a Vaulderie score)",
    restrain: s => (s >= 2 ? {difficulty: 8, spend: true, why: "guanxi: a Willpower roll to strike a wu-mate"} : null),
    obey: s => (s >= 3 ? -2 : s >= 2 ? -1 : 0), floor: 3},
  conditioning: {label: "Dominate Conditioning", line: "vampire", page: "V20 pdf pp. 162-163", house: true,
    restrain: s => (s >= 3 ? {difficulty: 8, spend: true, why: "full Conditioning: the subject does what the master says (house reading for a blow)"} : null),
    obey: s => (s >= 3 ? "free" : 0), floor: 3},
  social: {label: "Social Conditioning", line: "mage", page: "M20 pdf pp. 606-608",
    restrain: s => (s >= 3 ? {difficulty: 8, spend: true, why: "Social Conditioning at Alliance: the masters are trusted without question"} : null),
    obey: s => (s >= 3 ? "free" : s >= 2 ? -1 : 0), floor: 3},
  pact: {label: "Pact with a demon", line: "demon", page: "Demon: The Fallen pdf pp. 157-161",
    restrain: () => null, obey: () => 0, floor: 9},
  enchant: {label: "Enchanted", line: "changeling", page: "C20 pdf p. 461",
    restrain: () => null, obey: () => 0, floor: 9},
  fomor: {label: "Fomor of the Wyrm", line: "werewolf", page: "W20 pdf pp. 431-432", house: true,
    restrain: () => ({difficulty: 8, spend: true, why: "the Bane inside does not let its host turn on its master (house reading)"}),
    obey: () => -1, floor: 9},
  thrall: {label: "Thrall (wraith)", line: "wraith", page: "Wraith 20th pdf pp. 88, 99-103", house: true,
    restrain: s => (s >= 3 ? {difficulty: 8, spend: true, why: "a Thrall in Stygian chains cannot turn on the one who holds the chain (house reading)"} : null),
    obey: s => (s >= 3 ? "free" : 0), floor: 9},
  consort: {label: "Puppeteer's consort", line: "wraith", page: "Wraith 20th (Puppetry); WoDX reading", house: true,
    restrain: () => null, obey: () => 0, floor: 9},
  cult: {label: "Cultist", line: "mummy", page: "Mummy: The Resurrection (Cult Background)",
    restrain: () => null, obey: () => 0, floor: 9},
  revenant: {label: "Revenant family", line: "vampire", page: "V20 pdf pp. 504-508",
    restrain: () => null, obey: () => -1, floor: 9},
  kinfolk: {label: "Kinfolk", line: "werewolf", page: "W20 pdf p. 140",
    restrain: () => null, obey: () => 0, floor: 9}
};
/** The kinds the Storyteller can make by hand in the bond window, in the order shown. */
export const HAND_KINDS = ["conditioning", "social", "pact", "enchant", "fomor", "thrall", "consort", "cult", "revenant", "kinfolk"];

/** Words for the step of a kind, for the followers window and cards. */
export function stepWord(kind, step) {
  const s = Math.max(0, Math.min(3, Math.round(num(step))));
  if ( kind === "blood" ) return ["", "One drink of the blood", "Two drinks of the blood", "Blood bound (full bond)"][s];
  if ( kind === "conditioning" ) return ["", "Conditioning begun", "Half conditioned (Dominate is easier)", "Fully conditioned"][s];
  if ( kind === "social" ) return ["", "Indoctrinated", "Programmed (stage 5 or past it)", "Conditioned to Alliance or past it"][s];
  if ( kind === "thrall" ) return ["", "A Thrall, unchained", "A Thrall, unchained", "A Thrall in Stygian chains"][s];
  if ( kind === "vinculum" || kind === "guanxi" ) return ["", "", "A strong tie", "A full tie"][s];
  return KINDS[kind]?.label ?? "";
}

/* ------------------------------------------------------------------ */
/*  Reading the ledger                                                  */
/* ------------------------------------------------------------------ */

/** The Vinculum rating to a step: 8 to 10 full, 5 to 7 strong (B2841). Guanxi uses the same scale (k1). */
export const vaulderieStep = rating => (num(rating) >= 8 ? 3 : num(rating) >= 5 ? 2 : 0);

/**
 * Guanxi toward a wu-mate (Kindred of the East pdf p. 69): 5 + the mate's Charisma, less the higher of one's own P'o
 * or Yin. Kept between 0 and 10.
 */
export const guanxi = ({mateCharisma = 0, po = 0, yin = 0} = {}) => Math.max(0, Math.min(10, 5 + num(mateCharisma) - Math.max(num(po), num(yin))));

/**
 * Every bond that has this servant serve someone. flags: the servant's flags. ctx: {id (the servant's id),
 * vinculum {"a>b": rating}, guanxi {masterId: rating}, kinOf [{id, name}] (Garou kin when the servant is Kinfolk),
 * revenantMaster {id, name} (the master of the servant's revenant family)}. Returns records, deepest first.
 */
export function recordsOf(flags = {}, ctx = {}) {
  const f = flags ?? {};
  const out = [];
  const add = r => { if ( r.master && r.master !== ctx.id ) out.push({step: 0, since: 0, last: 0, data: {}, masterName: "", ...r}); };
  const lb = f["wodx-creation"]?.lineage?.bonds ?? {};
  for ( const [id, b] of Object.entries(lb) ) {
    const d = Math.min(3, Math.max(0, Math.round(num(b?.drinks))));
    if ( d > 0 ) add({kind: "blood", master: id, masterName: b?.name ?? "", step: d, last: num(b?.last), source: "lineage"});
  }
  for ( const o of Object.values(f["wodx-actions"]?.oaths ?? {}) ) {
    const id = o?.id ?? String(o?.uuid ?? "").split("Actor.").pop()?.split(".")[0];
    const s = Math.min(3, num(o?.stage));
    if ( id && s > 0 && !out.some(r => r.kind === "blood" && r.master === id && r.step >= s) ) add({kind: "blood", master: id, masterName: o?.name ?? "", step: s, source: "oath"});
  }
  for ( const [k, v] of Object.entries(ctx.vinculum ?? {}) ) {
    const [a, b] = k.split(">");
    const s = vaulderieStep(v);
    if ( a === ctx.id && b && s ) add({kind: "vinculum", master: b, step: s, data: {rating: num(v)}, source: "factions"});
  }
  for ( const [id, v] of Object.entries(ctx.guanxi ?? {}) ) {
    const s = vaulderieStep(v);
    add({kind: "guanxi", master: id, step: s, data: {rating: num(v)}, source: "wu"});
  }
  for ( const g of ctx.kinOf ?? [] ) add({kind: "kinfolk", master: g.id, masterName: g.name ?? "", step: 1, source: "kin"});
  if ( ctx.revenantMaster?.id ) add({kind: "revenant", master: ctx.revenantMaster.id, masterName: ctx.revenantMaster.name ?? "", step: 1, source: "family"});
  for ( const [key, r] of Object.entries(f["wodx-npc"]?.held ?? {}) ) {
    if ( !r || !KINDS[r.kind] ) continue;
    const master = idOf(r.master) ?? key.split(":")[1];
    add({...r, master, step: Math.max(0, Math.min(3, Math.round(num(r.step)))), source: "held", key});
  }
  return out.sort((x, y) => y.step - x.step);
}

/** The records that tie the servant to one master. */
export const toward = (records, masterId) => (records ?? []).filter(r => r.master === masterId);

/** Everyone this servant serves through the ledger, as ids. */
export const mastersIn = records => [...new Set((records ?? []).filter(r => r.step > 0 || r.kind !== "blood").map(r => r.master))];

/**
 * The roll a servant must win before striking this master, the hardest the bonds ask (x2), or null. treatment: the
 * master's recent kindness (negative) or abuse (positive), from the attitude log, -2 to +2 (V20 Dark Ages pdf p. 343).
 */
export function restraint(records, masterId, {treatment = 0} = {}) {
  let best = null;
  for ( const r of toward(records, masterId) ) {
    const x = KINDS[r.kind]?.restrain?.(r.step, r);
    if ( !x ) continue;
    const difficulty = Math.max(3, Math.min(10, num(x.difficulty) + (r.kind === "blood" && r.step >= 3 ? Math.min(2, Math.max(0, num(r.data?.timesFed))) : 0) - num(treatment)));
    if ( !best || difficulty > best.difficulty ) best = {kind: r.kind, step: r.step, difficulty, spend: !!x.spend, why: x.why, page: KINDS[r.kind].page};
  }
  return best;
}

/**
 * How a hard order from this master is weighed (v4): {free: true} when the bond carries it with no roll, else
 * {shift} to add to the loyalty roll's difficulty (negative is easier), with the reason.
 */
export function orderWeight(records, masterId) {
  let shift = 0, free = false, why = "";
  for ( const r of toward(records, masterId) ) {
    const o = KINDS[r.kind]?.obey?.(r.step, r);
    if ( o === "free" ) { free = true; why = stepWord(r.kind, r.step) || KINDS[r.kind].label; break; }
    if ( num(o) < shift ) { shift = num(o); why = stepWord(r.kind, r.step) || KINDS[r.kind].label; }
  }
  return free ? {free: true, shift: 0, why} : {free: false, shift, why};
}

/** True when the servant's opinion of the master cannot fall below warm (a full oath, full Conditioning, Alliance). */
export const warmFloor = (records, masterId) => toward(records, masterId).some(r => r.step >= (KINDS[r.kind]?.floor ?? 9));

/* ------------------------------------------------------------------ */
/*  What a servant is called                                            */
/* ------------------------------------------------------------------ */

/** Kinds of follower the followers window shows for ledger bonds, after followers-rules' own. */
export const FOLLOWER_KINDS = {kinfolk: "Kinfolk", revenant: "Revenant", cultist: "Cultist", thrall: "Thrall", fomor: "Fomor", enchanted: "Enchanted",
  conditioned: "Conditioned", pact: "Thrall by pact", consort: "Consort", acolyte: "Acolyte", consor: "Consor", wumate: "Wu-mate"};
const KIND_TO_FOLLOWER = {kinfolk: "kinfolk", revenant: "revenant", cult: "cultist", thrall: "thrall", fomor: "fomor", enchant: "enchanted",
  conditioning: "conditioned", social: "conditioned", pact: "pact", consort: "consort", guanxi: "wumate"};

/** The follower kind a ledger record makes, or null where the older kinds already say it (ghoul, retainer). */
export const followerKindOf = r => KIND_TO_FOLLOWER[r?.kind] ?? null;

/**
 * M20's words for a mage's people (desk m2; M20 lexicon pdf p. 142): a loyal mortal ally or retainer is an acolyte,
 * an especially able one a consor. consor: the follower knows hedge magic or is marked a consor.
 */
export function mageWord(kind, {masterLine = "", consor = false} = {}) {
  if ( masterLine !== "mage" ) return kind;
  if ( kind === "ally" || kind === "retainer" || kind === "follower" ) return consor ? "consor" : "acolyte";
  return kind;
}

/* ------------------------------------------------------------------ */
/*  Dominate Conditioning (desk v1; V20 pdf pp. 162-163)                */
/* ------------------------------------------------------------------ */

/**
 * The successes Conditioning needs: the book has the Storyteller set five to ten times Self-Control (or Instinct)
 * in secret, fewer for a yielding Nature, more for a wilful one. WoDX starts at seven times, moved by the Nature
 * (house middle). nature: "yielding", "wilful" or "".
 */
export function conditioningNeed(selfControl, nature = "") {
  const per = nature === "yielding" ? 5 : nature === "wilful" ? 10 : 7;
  return Math.max(5, per * Math.max(1, num(selfControl)));
}
/** The step a tally has reached: 1 under half, 2 at half (Dominate is 1 easier, house figure), 3 at the full total. */
export const conditioningStep = (tally, need) => (num(tally) >= num(need) ? 3 : num(tally) * 2 >= num(need) ? 2 : num(tally) > 0 ? 1 : 0);
/** The roll: Charisma + Leadership, difficulty the subject's current Willpower points, once a scene. */
export const conditioningRoll = ({charisma = 0, leadership = 0, willpowerNow = 0} = {}) => ({dice: num(charisma) + num(leadership), difficulty: Math.max(2, Math.min(10, num(willpowerNow) || 2))});
/** Dominate against the subject: 1 easier for its master at half (house figure), 2 harder for everyone else once full. */
export function dominateShift(records, casterId) {
  let shift = 0;
  for ( const r of records ?? [] ) {
    if ( r.kind !== "conditioning" ) continue;
    if ( r.master === casterId && r.step >= 2 ) shift = Math.min(shift, -1);
    if ( r.master !== casterId && r.step >= 3 ) shift = Math.max(shift, 2);
  }
  return shift;
}
/**
 * When Conditioning wears off: the subject must be kept wholly away from the master for six months, less a week for
 * each dot of permanent Willpower. Returns the world time it ends, from the last contact.
 */
export const conditioningFadesAt = (lastContact, willpower) => num(lastContact) + Math.max(7, 182 - 7 * num(willpower)) * DAY;

/* ------------------------------------------------------------------ */
/*  Social Conditioning (desk m1; M20 pdf pp. 606-608)                  */
/* ------------------------------------------------------------------ */

/** The ten stages, in WoDX's words, with what each makes the subject do. */
export const SOCIAL_STAGES = [
  null,
  {name: "Indoctrination", does: "A willing convert to the masters' cause."},
  {name: "Submission", does: "Lets the masters' minor magic work on them without resistance."},
  {name: "Suspicion", does: "Sees people as the masters' allies or enemies."},
  {name: "Ostracism", does: "Shuns anyone the masters cast out."},
  {name: "Pacifism", does: "A code word from the masters stops any violence at once."},
  {name: "Conspiracy", does: "A code word sets them working in secret against a chosen enemy."},
  {name: "Alliance", does: "Trusts the masters wholly; no longer a witness against their vulgar magic."},
  {name: "Rejection", does: "Forgets anyone the masters tell them to forget."},
  {name: "Devotion", does: "Will betray anyone for the masters."},
  {name: "Reverence", does: "Loves the masters; nothing of the old self resists."}
];
/** The groups that may run it, and how long each roll takes (a day, two days, a week). No lone mage or cabal. */
export const SOCIAL_GROUPS = {
  union: {label: "The Technocratic Union (PsychOps)", days: 1, from: 1900},
  reason: {label: "The Order of Reason", days: 7, from: 1325, until: 1899, house: true},
  nephandi: {label: "Nephandi", days: 2, from: 1197},
  other: {label: "Another organisation", days: 7, from: 1197}
};
/** The groups that can run it in a year (the Order of Reason before 1900, the Union after; house reading B5106). */
export const socialGroupsIn = year => Object.entries(SOCIAL_GROUPS).filter(([, g]) => num(year) >= g.from && (!g.until || num(year) <= g.until)).map(([k]) => k);
/** A stage to a ledger step: 1 to 4 is 1, 5 and 6 are 2 (the code words), 7 or past it is 3. */
export const socialStep = stage => (num(stage) >= 7 ? 3 : num(stage) >= 5 ? 2 : num(stage) >= 1 ? 1 : 0);
/**
 * One roll of the programme past the first stage: the agents' Enlightenment (Arete) against the subject's permanent
 * Willpower, both at 6, extended and resisted. eased: successes from a mundane softening or brutal roll, which lower
 * the difficulty by one each (most 3). Returns {stage, broke, botch}.
 */
export function socialRollResult({stage = 1, agentSuccesses = 0, subjectSuccesses = 0, agentBotch = false, subjectBotch = false} = {}) {
  if ( agentBotch ) return {stage, ruined: true, why: "a botch by the agents: this subject can never be conditioned, only removed"};
  if ( subjectBotch ) return {stage: 10, broke: true, why: "the subject breaks"};
  const net = num(agentSuccesses) - num(subjectSuccesses);
  if ( net > 0 ) return {stage: Math.min(10, num(stage) + 1), why: "the programme gains a stage"};
  return {stage, held: true, why: "the subject holds out for this stretch"};
}
export const socialDifficulty = eased => Math.max(3, 6 - Math.min(3, Math.max(0, num(eased))));

/* ------------------------------------------------------------------ */
/*  Who keeps servants by era (desk x4)                                 */
/* ------------------------------------------------------------------ */

/**
 * The servants an NPC master of a line keeps, by year. Each row: {kind (ledger kind, or "ghoul"), count [low, high],
 * step, from, until, note}. Read by the world builder and the yearly tick; the Storyteller sees a card and can undo it.
 */
export const KEEPERS = {
  vampire: [
    {kind: "ghoul", count: [1, 3], step: 3, from: 1197, note: "Elders keep blood-bound ghouls (V20 Dark Ages pdf p. 399)."},
    {kind: "conditioning", count: [0, 2], step: 3, from: 1197, need: {discipline: "dominate", dots: 4}, note: "Dominate 4 lets the master condition retainers (V20 pdf p. 162)."},
    {kind: "revenant", count: [0, 2], step: 1, from: 1197, need: {clan: /tzimisce|sabbat|giovanni/i}, note: "Revenant families serve the Fiends and the Sabbat (V20 pdf p. 504)."}
  ],
  mage: [{kind: "social", count: [0, 3], step: 3, from: 1325, need: {group: /technocra|union|order of reason|daedal|nephand/i}, note: "Organisations condition their agents and captives (M20 pdf p. 606)."}],
  werewolf: [{kind: "kinfolk", count: [1, 4], step: 1, from: 1197, note: "Kinfolk stand by their Garou kin (W20 pdf p. 140)."}],
  wyrm: [{kind: "fomor", count: [1, 4], step: 1, from: 1197, note: "Black Spiral hives and Wyrm cults keep fomori; Pentex from 1916 (W20 pdf p. 431, 463)."}],
  demon: [{kind: "pact", count: [1, 3], step: 1, from: 1197, note: "The Fallen keep thralls by pact (Demon pdf p. 157)."}],
  wraith: [{kind: "thrall", count: [0, 2], step: 3, from: 1197, need: {group: /hierarch|legion|stygia/i}, note: "The Hierarchy keeps Thralls in chains (Wraith 20th pdf p. 99)."}],
  mummy: [{kind: "cult", count: [2, 6], step: 1, from: 1197, note: "A mummy's cult keeps the vessel between lives."}],
  "kuei-jin": [{kind: "cult", count: [0, 3], step: 1, from: 1197, note: "Kuei-jin courts keep mortal blood cults; Kuei-jin cannot make ghouls (KotE pdf p. 11)."}],
  changeling: [{kind: "enchant", count: [0, 2], step: 1, from: 1197, note: "Changelings bring mortals into the Dreaming (C20 pdf p. 461)."}]
};

/** The keeper rows that fit a master in a year. master: {line, year, disciplines {name: dots}, clan, group}. */
export function keeperRows({line = "", year = 1197, disciplines = {}, clan = "", group = "", wyrm = false} = {}) {
  const rows = [...(KEEPERS[line] ?? []), ...(wyrm ? KEEPERS.wyrm : [])];
  return rows.filter(r => num(year) >= r.from && (!r.until || num(year) <= r.until)).filter(r => {
    const n = r.need;
    if ( !n ) return true;
    if ( n.discipline && num(disciplines?.[n.discipline]) < n.dots ) return false;
    if ( n.clan && !n.clan.test(String(clan)) ) return false;
    if ( n.group && !n.group.test(String(group)) ) return false;
    return true;
  });
}
/** How many of a row to keep, from a die in [0, 1). */
export const keeperCount = (row, r = 0.5) => Math.floor(num(row.count?.[0]) + Math.max(0, Math.min(0.999, r)) * (num(row.count?.[1]) - num(row.count?.[0]) + 1));

/* ------------------------------------------------------------------ */
/*  On the map (desk x3)                                                */
/* ------------------------------------------------------------------ */

/** The short effect when a bond forms or deepens: a colour and a shape. thread: a line between the two tokens. */
export const FX = {
  blood: {color: 0x9b0d1a, thread: true, label: "a thread of blood"},
  vinculum: {color: 0x9b0d1a, thread: true, label: "a thread of blood"},
  guanxi: {color: 0x3f8f6a, thread: true, label: "a thread of jade light"},
  conditioning: {color: 0x7a3fa0, thread: true, label: "a violet pull between the eyes"},
  social: {color: 0x4a6fa5, thread: false, label: "a cold blue flicker"},
  pact: {color: 0xe0a32a, thread: false, label: "a sigil flaring on the skin"},
  enchant: {color: 0xb9f2ff, thread: false, label: "a glimmer of chimerical light"},
  fomor: {color: 0x1d1d12, thread: false, label: "a wisp of black smoke"},
  thrall: {color: 0x5d6670, thread: true, label: "a chain of Stygian steel"},
  consort: {color: 0x8fa3b8, thread: true, label: "a ghostly hand on the shoulder"},
  cult: {color: 0xc9a227, thread: false, label: "a flash of gold"},
  revenant: {color: 0x9b0d1a, thread: false, label: "a dark flush"},
  kinfolk: {color: 0x7f5a2e, thread: false, label: "a warm glow"}
};
/** The ring a master (and the Storyteller) sees on a servant's token: the deepest bond's colour. */
export function ringFor(records, viewerMasterIds = [], isGM = false) {
  const mine = (records ?? []).filter(r => isGM || viewerMasterIds.includes(r.master));
  if ( !mine.length ) return null;
  const r = mine.sort((a, b) => b.step - a.step)[0];
  return {aura: {color: FX[r.kind]?.color ?? 0x888888, alpha: 0.22 + 0.06 * Math.max(0, Math.min(3, r.step)), radius: 0.62}, kind: r.kind};
}
