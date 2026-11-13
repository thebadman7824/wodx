/**
 * Off-screen lives of supernatural NPCs (B3260-B3266). Pure: no Foundry, so the harness can test it.
 *
 * When the clock jumps a year or more, every supernatural NPC lives through the gap: vampires Embrace childer, fall
 * into torpor and wake from it, commit diablerie and meet Final Death; Garou rise in Rank and fall in battle; mages
 * grow in Arete and take apprentices; changelings age through their seemings and may lose themselves to Banality;
 * wraiths may be destroyed, fall to Oblivion or move on; mummies die and come back; hunters burn out young.
 *
 * Book basis, in WoDX's own words (V20 pdf pages):
 *   Torpor lasts by Humanity or Path: from a day at 10 to a millennium at 0 (V20 pdf p. 291; the same table as V20
 *     Dark Ages p. 350, kept in wodx-creation/data/time.mjs).
 *   A vampire who drains another of lower Generation lowers their own Generation by one, for good (V20 pdf p. 302).
 *   The Third Tradition: a Camarilla sire needs an elder's leave before Embracing (V20 pdf pp. 31-32), so Camarilla
 *     Embraces are few; the Sabbat Embraces freely and in numbers.
 *   The thinnest blood (15th Generation) cannot sire (V20 pdf p. 38); WoDX stops siring at 14th (B3262).
 * Every yearly chance below is a house reading of how often such things happen in the books' fiction (B3261). The
 * books give no such tables. The Storyteller sees every result on one card and approves it before anything is written.
 */

import {TORPOR} from "../../wodx-creation/data/time.mjs";

/** The actor types that live off-screen, and the line each one follows. */
export const LINE_OF_TYPE = {
  Vampire: "vampire", Werewolf: "garou", "Changing Breed": "garou", Mage: "mage", Changeling: "changeling",
  Wraith: "wraith", Mummy: "mummy", Demon: "demon", Hunter: "hunter"
};
const LINES = new Set(Object.values(LINE_OF_TYPE));
/** Lines that do not age. */
export const UNDYING = new Set(["vampire", "wraith", "mummy", "demon"]);
/** The years a line can be met at all (demons are loosed in 1999; the imbued hunters are WoDX's from 1999 too, but
 *  hunters of every age are kept, as the Inquisition and the societies before them). */
export const LINE_FROM = {demon: 1999};

/**
 * Yearly chances by line (house readings, B3261). death: Final Death or its like; torpor (vampires only);
 * brood: chance of a new childe, cub, apprentice or fosterling; rise: chance of a step up (Rank or Arete);
 * old: the age range [may, sure] at which a mortal-bodied one dies of age.
 */
export const RATES = {
  vampire: {death: 0.004, youngDeath: 0.012, youngYears: 50, torpor: 0.005, elderSleep: 0.006, elderAge: 300, diablerie: 0.0006},
  garou: {death: 0.03, rise: 0.06, maxRise: 5, brood: 0.015, old: [55, 80]},
  mage: {death: 0.012, rise: 0.025, maxRise: 6, brood: 0.02, old: [70, 100]},
  changeling: {death: 0.01, lost: 0.008, brood: 0.015, old: [65, 90]},
  wraith: {death: 0.004, spectre: 0.003, transcend: 0.0005},
  mummy: {death: 0.01, back: [1, 12]},
  demon: {death: 0.006},
  hunter: {death: 0.05, old: [55, 80]}
};
/** Embraces a year by sect (house, B3262). Camarilla sires wait on the Prince's leave; the Sabbat swells its ranks. */
export const EMBRACE = {camarilla: 0.005, sabbat: 0.02, anarch: 0.01, independent: 0.006, court: 0.006, none: 0.006};
/** Diablerie by sect, times the vampire rate (house, B3262). */
export const DIABLERIE_SECT = {camarilla: 0.5, sabbat: 4, anarch: 1.5, independent: 1, court: 1, none: 1};
/** WoDX's last Generation that can sire (B3262; V20 pdf p. 38 says the 15th cannot). */
export const LAST_SIRING = 14;
/** At most this many new childer, cubs, apprentices and fosterlings in one jump. */
export const BROOD_CAP = 40;

/** Dangerous ages: a line's death chance is multiplied in these years (house reading of the books' history, B3263). */
export const ERA_DANGER = [
  {from: 1231, to: 1480, lines: ["vampire", "garou", "mage", "changeling"], mult: 2, what: "the Inquisition's long hunt"},
  {from: 1347, to: 1351, lines: ["vampire", "garou", "mage", "changeling", "hunter"], mult: 1.5, what: "the Black Death"},
  {from: 1394, to: 1493, lines: ["vampire"], mult: 1.5, what: "the Anarch Revolt"},
  {from: 1350, to: 1968, lines: ["changeling"], mult: 1.5, what: "the Shattering and the long Banality"},
  {from: 1914, to: 1918, lines: ["garou", "hunter", "mage"], mult: 1.3, what: "the Great War"},
  {from: 1939, to: 1945, lines: ["vampire", "garou", "mage", "hunter"], mult: 1.5, what: "the Second World War"}
];
export const dangerAt = (line, year) => ERA_DANGER.filter(d => year >= d.from && year <= d.to && d.lines.includes(line)).reduce((m, d) => m * d.mult, 1);

/** The sect a vampire's sheet names, else the sect of the age (B3262). */
export function sectOf(text, year) {
  const t = String(text ?? "").toLowerCase();
  if ( /sabbat|sword of caine/.test(t) ) return "sabbat";
  if ( /anarch/.test(t) ) return "anarch";
  if ( /camarilla|ivory tower/.test(t) ) return "camarilla";
  if ( /indep|giovanni|assamite|setite|ravnos|inconnu|autarkis/.test(t) ) return "independent";
  if ( t.trim() ) return "none";
  return year < 1435 ? "court" : "camarilla";
}

/** Years of torpor for a Humanity or Path rating (V20 pdf p. 291). */
export const torporYears = road => TORPOR.years[Math.max(0, Math.min(10, Math.round(Number(road) || 0)))] ?? 1;

/** The seeded stream the kin rules use: the same jump comes out the same for the same seed. */
export function seeded(seed) {
  let h = 1779033703 ^ String(seed).length;
  for ( const c of String(seed) ) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
/** The chance of at least one event over n years at p a year. */
const over = (p, n) => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), n);

/**
 * A person as the simulation sees them (the Foundry side reads it from the sheet, or from a brood record):
 *   {id, name, line, born, made (year Embraced or Awakened), generation, road, sect, rise (Rank or Arete),
 *    torpor: {from, to} | null, dead, keep (the Storyteller protects them), office (a seat they hold, for the report)}
 */
export function normPerson(p = {}) {
  const n = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
  return {id: String(p.id ?? ""), name: String(p.name ?? ""), line: String(p.line ?? ""), born: n(p.born), made: n(p.made),
    generation: n(p.generation), road: n(p.road) ?? 7, sect: p.sect ?? null, sectText: String(p.sectText ?? ""), rise: n(p.rise) ?? 0,
    torpor: p.torpor && n(p.torpor.to) !== null ? {from: n(p.torpor.from), to: n(p.torpor.to)} : null,
    dead: !!p.dead, keep: !!p.keep, office: p.office ? String(p.office) : null, brood: !!p.brood, clan: String(p.clan ?? ""), sireId: p.sireId ?? null};
}

const KIND_OF_BROOD = {vampire: "childe", garou: "cub", mage: "apprentice", changeling: "fosterling"};
export const BROOD_WORD = {childe: "Embraces a childe", cub: "sees a Kinfolk cub through the First Change", apprentice: "Awakens an apprentice", fosterling: "takes in a changeling after the Chrysalis"};

/**
 * Live the years from fromYear to toYear for every person. Returns {events, people, brood}:
 *   events [{id, name, year, kind, text, data}] in year order; people: the end state of each person (by id);
 *   brood: the new childer and the like, as people records {id, line, sireId, sireName, year, generation, clan, kind}.
 * Nothing is written: the Foundry side shows the events on a card and applies them on approval.
 */
export function live(peopleIn = [], fromYear, toYear, {rand = null, seed = "fates", cap = BROOD_CAP} = {}) {
  const from = Math.round(Number(fromYear)), to = Math.round(Number(toYear));
  const r = rand ?? seeded(`${seed}:${from}:${to}`);
  const people = (peopleIn ?? []).map(normPerson).filter(p => p.id && LINES.has(p.line));
  const events = [], brood = [];
  if ( !(to > from) ) return {events, people: Object.fromEntries(people.map(p => [p.id, p])), brood};
  // Long jumps go in steps, so a jump of centuries stays quick (at most about 400 steps)
  const step = Math.max(1, Math.ceil((to - from) / 400));
  const say = (p, year, kind, text, data = {}) => events.push({id: p.id, name: p.name, year, kind, text, data});
  let made = 0;

  for ( let start = from; start < to; start += step ) {
    const year = Math.min(start + step, to), n = year - start;
    for ( const p of [...people] ) {
      if ( p.dead || p.keep ) continue;
      if ( LINE_FROM[p.line] && year < LINE_FROM[p.line] ) continue;
      if ( p.born !== null && p.born > year ) continue;
      if ( p.made !== null && p.made > year ) continue;
      const R = RATES[p.line] ?? {};
      const danger = dangerAt(p.line, year);

      // Torpor: the sleeper wakes when the years for their Humanity or Path have passed
      if ( p.torpor ) {
        if ( year >= p.torpor.to ) { say(p, Math.max(p.torpor.to, year - n + 1), "wake", `wakes from torpor after ${plural(Math.max(1, p.torpor.to - p.torpor.from), "year")}`); p.torpor = null; }
        else continue; // asleep: nothing else happens to them
      }

      // Age, for lines that age
      if ( !UNDYING.has(p.line) && R.old && p.born !== null ) {
        const age = year - p.born;
        if ( age >= R.old[1] || (age >= R.old[0] && r() < over(1 / Math.max(1, R.old[1] - R.old[0]), n)) ) {
          p.dead = true; say(p, year, "death", `dies of age at ${age}`, {cause: "age"}); continue;
        }
      }

      // Death in the dark
      let death = R.death ?? 0;
      if ( p.line === "vampire" && p.made !== null && year - p.made < (R.youngYears ?? 0) ) death = R.youngDeath;
      if ( r() < over(death * danger, n) ) {
        if ( p.line === "mummy" ) {
          const back = Math.round(R.back[0] + r() * (R.back[1] - R.back[0]));
          p.torpor = {from: year, to: year + back};
          say(p, year, "mummyDeath", `is slain and goes down to the Underworld, to rise again in about ${back} years`, {back});
          continue;
        }
        p.dead = true;
        const why = ERA_DANGER.find(d => year >= d.from && year <= d.to && d.lines.includes(p.line));
        say(p, year, "death", `${DEATH_WORD[p.line] ?? "dies"}${why ? ` in ${why.what}` : ""}`, {cause: why?.what ?? "unknown"});
        continue;
      }

      if ( p.line === "vampire" ) {
        const sect = p.sect ?? sectOf(p.sectText, year);
        const age = p.made !== null ? year - p.made : 0;
        // Torpor from wounds and hunger, or the long sleep of the old
        const sleep = (R.torpor ?? 0) + (age >= (R.elderAge ?? 1e9) ? R.elderSleep : 0);
        if ( r() < over(sleep, n) ) {
          const span = torporYears(p.road);
          if ( span < 1 ) { say(p, year, "torpor", `falls into torpor for ${TORPOR.labels[Math.round(p.road)] ?? "a short while"} and rises again`, {years: 0}); continue; }
          const yrs = Math.round(span);
          p.torpor = {from: year, to: year + yrs};
          say(p, year, "torpor", `falls into torpor; with ${p.road} in Humanity or Path the sleep lasts about ${plural(yrs, "year")}`, {years: yrs});
          continue;
        }
        // Diablerie: a simulated vampire of lower Generation first, else a stranger
        if ( r() < over((R.diablerie ?? 0) * (DIABLERIE_SECT[sect] ?? 1), n) ) {
          const prey = people.filter(q => q !== p && q.line === "vampire" && !q.dead && !q.keep && q.generation !== null && p.generation !== null && q.generation < p.generation);
          const victim = prey.length && r() < 0.35 ? prey[Math.floor(r() * prey.length)] : null;
          const lower = victim ? true : r() < 0.3;
          const before = p.generation;
          if ( lower && p.generation !== null && p.generation > 4 ) p.generation -= 1;
          if ( victim ) { victim.dead = true; say(victim, year, "death", `is drained to Final Death by ${p.name}`, {cause: "diablerie", by: p.id}); }
          say(p, year, "diablerie", `commits diablerie${victim ? ` on ${victim.name}` : " on a stranger"}${lower && before !== p.generation ? `; Generation ${before} to ${p.generation}` : ""}`,
            {victim: victim?.id ?? null, generation: p.generation});
        }
        // The Embrace
        if ( !p.fresh && made < cap && (p.generation === null || p.generation < LAST_SIRING) && r() < over(EMBRACE[sect] ?? 0.01, n) ) {
          made++;
          const c = newBrood(p, year, "childe", {generation: p.generation === null ? null : p.generation + 1, sect, n: `${made}${Math.floor(r() * 46656).toString(36)}`});
          brood.push(c); people.push({...normPerson({...c, brood: true}), fresh: true});
          say(p, year, "brood", `${BROOD_WORD.childe}${c.generation ? ` of the ${c.generation}th Generation` : ""}${sect === "camarilla" && !/prince/i.test(p.office ?? "") ? " with the Prince's leave" : ""}`, {brood: c.id});
        }
        continue;
      }

      if ( p.line === "wraith" ) {
        if ( r() < over(R.spectre * danger, n) ) { p.dead = true; say(p, year, "spectre", "falls to the Shadow and becomes a Spectre", {cause: "oblivion"}); continue; }
        if ( r() < over(R.transcend, n) ) { p.dead = true; say(p, year, "transcend", "resolves the last Fetters and Transcends", {cause: "transcendence"}); continue; }
        continue;
      }

      if ( p.line === "changeling" && r() < over((R.lost ?? 0) * danger, n) ) {
        p.dead = true; say(p, year, "undoing", "forgets the fae self to Banality and lives on as a mortal", {cause: "banality"}); continue;
      }

      // Rank or Arete
      if ( R.rise && p.rise < R.maxRise && r() < over(R.rise, n) ) {
        p.rise += 1;
        say(p, year, "rise", p.line === "garou" ? `rises to Rank ${p.rise}` : `reaches Arete ${p.rise}`, {rise: p.rise});
      }
      // Cubs, apprentices, fosterlings
      if ( !p.fresh && R.brood && made < cap && r() < over(R.brood, n) ) {
        made++;
        const kind = KIND_OF_BROOD[p.line];
        const c = newBrood(p, year, kind, {n: `${made}${Math.floor(r() * 46656).toString(36)}`});
        brood.push(c); people.push({...normPerson({...c, brood: true}), fresh: true});
        say(p, year, "brood", BROOD_WORD[kind], {brood: c.id});
      }
    }
  }
  events.sort((a, b) => a.year - b.year);
  return {events, people: Object.fromEntries(people.map(p => [p.id, p])), brood};
}

export const DEATH_WORD = {vampire: "meets Final Death", garou: "falls fighting the Wyrm", mage: "dies, of Paradox or an enemy", changeling: "dies",
  wraith: "is destroyed in the Tempest", demon: "is cast back into the Abyss", hunter: "dies on the hunt"};

/** A new childe, cub, apprentice or fosterling: a record with no sheet until the Storyteller brings it into play. */
export function newBrood(p, year, kind, {generation = null, sect = null, n = 1} = {}) {
  const tag = String(n);
  const age = kind === "fosterling" ? 14 : kind === "cub" ? 15 : 22;
  return {id: `b${year}${p.id.slice(0, 6)}${tag}`, line: p.line, kind, sireId: p.id, sireName: p.name, year, made: year,
    born: year - age, generation, sect, clan: p.clan, name: `${p.name || "Someone"}'s ${kind}`};
}

/** One line per person, for the approval card: "Name: 1650 Embraces a childe; 1702 falls into torpor ...". */
export function summary(result, {limit = 60} = {}) {
  const by = new Map();
  for ( const e of result?.events ?? [] ) { if ( !by.has(e.id) ) by.set(e.id, {name: e.name, bits: []}); by.get(e.id).bits.push(`${e.year} ${e.text}`); }
  return [...by.values()].slice(0, limit).map(v => `${v.name || "Someone unnamed"}: ${v.bits.join("; ")}.`);
}

/** What changes on each sheet, worked out from the end state: {id: {dead, torpor, generation, rise, wake}}. */
export function sheetChanges(result, before = []) {
  const out = {};
  for ( const b of before.map(normPerson) ) {
    const a = result?.people?.[b.id];
    if ( !a || a.brood ) continue;
    const ch = {};
    if ( a.dead && !b.dead ) ch.dead = (result.events.find(e => e.id === b.id && (e.kind === "death" || e.kind === "spectre" || e.kind === "transcend" || e.kind === "undoing"))?.year) ?? true;
    if ( (a.torpor?.to ?? null) !== (b.torpor?.to ?? null) ) { if ( a.torpor ) ch.torpor = a.torpor; else ch.wake = true; }
    if ( a.generation !== b.generation && a.generation !== null ) ch.generation = a.generation;
    if ( a.rise !== b.rise ) ch.rise = a.rise;
    if ( Object.keys(ch).length ) out[b.id] = ch;
  }
  return out;
}
