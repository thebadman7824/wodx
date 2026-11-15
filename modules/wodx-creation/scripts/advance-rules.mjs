/**
 * Era advancement (B83), the pure part: given a plain view of one character and the skip, what each line's advancer
 * proposes. No Foundry calls, so the harness tests every rule. advance.mjs reads the actor into a view and applies
 * what the Storyteller ticks.
 *
 * A proposal: {kind, label, detail, checked, data, choices?}. `choices` ([{value, label}]) puts a pick in the Pass the
 * Years window; data.choice holds the default.
 */
import {DECLINE, THICK_BLOOD, DRIFT, YEARS_XP, BACKGROUNDS, ABILITY_CONVERSION, ROAD_TO_PATH, DA_ERAS, LINE_YEARS,
  LOST_TRIBES, FAE_CROSSING, DA_RECORDS} from "../data/advance.mjs";

const cap = s => String(s ?? "").replace(/^./, c => c.toUpperCase());
const ATTR_LABEL = {strength: "Strength", dexterity: "Dexterity", stamina: "Stamina"};
export const PATH_LABEL = {humanity: "Humanity", blood: "Path of Blood", bones: "Path of the Bones", caine: "Path of Caine",
  cathari: "Path of Cathari", feralheart: "Path of the Feral Heart", accord: "Path of Honorable Accord", lilith: "Path of Lilith",
  metamorphosis: "Path of Metamorphosis", night: "Path of Night", paradox: "Path of Paradox",
  innervoice: "Path of Power and the Inner Voice", typhon: "Path of Typhon"};
const ABILITY_LABEL = {firearms: "Firearms", drive: "Drive", finance: "Finance", larceny: "Larceny", survival: "Survival",
  occult: "Occult", bureaucracy: "Bureaucracy", religion: "Religion", academics: "Academics", medicine: "Medicine",
  esoterica: "Esoterica", gremayre: "Gremayre"};

/** Lines whose body ages as a mortal's (the design doc's common clock). Ghouls age only when the vitae lapses. */
export const MORTAL_BODIED = ["mortal", "garou", "kinfolk", "mage", "hunter", "imbued", "orpheus", "changeling", "demon", "mummy"];

/** Ages in DECLINE.ages passed during the skip: older than `from`, up to and including `to`. */
export function declineAges(born, fromYear, toYear) {
  if ( born === null || born === undefined || !Number.isFinite(Number(born)) ) return [];
  const a = fromYear - born, b = toYear - born;
  return DECLINE.ages.filter(x => x > a && x <= b);
}

/** Full centuries newly completed: awake years before the skip, and after it. */
export const centuriesCrossed = (before, after, per = 100) => Math.max(0, Math.floor(after / per) - Math.floor(Math.max(0, before) / per));

/** Thick blood: Generation steps for the time awake, held at the floor. */
export function thickBlood(generation, awakeBefore, awakeAfter) {
  const g = Number(generation);
  if ( !Number.isFinite(g) ) return null;
  const steps = Math.min(centuriesCrossed(awakeBefore, awakeAfter, THICK_BLOOD.yearsPerStep), Math.max(0, g - THICK_BLOOD.floor));
  if ( steps <= 0 ) return null;
  return {steps, to: g - steps, noAnimalBlood: g - steps <= THICK_BLOOD.noAnimalBloodAt};
}

/** Experience for the years awake. */
export const yearsXP = awakeYears => Math.max(0, Math.min(YEARS_XP.cap, Math.floor(awakeYears * YEARS_XP.perYear)));

/** Is this era profile under Dark Ages rules (the Roads, Dark Ages mages and fae, inquisitors)? */
export const isDAEra = id => DA_ERAS.includes(id);

/** Does the skip leave the Dark Ages ability set (the era profile's system.mortal goes from "darkages" to another)? */
export const leavesDAAbilities = (fromEra, toEra) => fromEra?.system?.mortal === "darkages" && !!toEra?.system?.mortal && toEra.system.mortal !== "darkages";

/** Is `line` allowed in `year`? {ok, why}. */
export function lineFits(line, year) {
  const w = LINE_YEARS[line];
  if ( !w ) return {ok: true};
  const ok = (w.from === null || year >= w.from) && (w.to === null || year <= w.to);
  return {ok, why: w.why};
}

/** The conversion rows that apply to a character's Dark Ages secondary Abilities with dots. */
export function conversions(secondaries = [], toEraId = null) {
  const out = [];
  // A secondary Ability's item is named by its label ("Hearth Wisdom") or by the system's key ("wod.abilities.hearthwisdom")
  const norm = s => String(s ?? "").trim().toLowerCase().replace(/^wod\.abilities\./, "").replace(/[^a-z]/g, "");
  for ( const s of secondaries ) {
    if ( !(Number(s.value) > 0) ) continue;
    const row = ABILITY_CONVERSION.find(r => norm(r.from) === norm(s.name));
    if ( !row || row.keepIn?.includes(toEraId) ) continue;
    const targets = [row.to, ...(row.or ?? [])];
    out.push({item: s, row, targets});
  }
  return out;
}

/** What a Dark Ages Road becomes: {to, choices, note} or null for a Road WoDX does not know. */
export function roadTarget(roadKey) {
  const r = ROAD_TO_PATH[roadKey];
  if ( !r ) return null;
  return {to: r.to, choices: [r.to, ...(r.or ?? [])], note: r.note ?? null};
}

/** The lost tribe a Garou belongs to, if the skip passes its end. */
export function lostTribe(tribe, fromYear, toYear) {
  const t = String(tribe ?? "").toLowerCase();
  if ( !t ) return null;
  return LOST_TRIBES.find(x => t.includes(x.tribe.toLowerCase()) && toYear >= x.goneBy && fromYear < x.goneBy) ?? null;
}

/**
 * Every proposal the advancers make for one character.
 * @param {object} v  the character's view (advance.mjs viewOf): line, born, generation, awakeBefore, attributes,
 *   road {key, rating}, conscience, secondaries, backgrounds, tribe, records {daMage, daFae, inquisitor}, forcedSheet
 * @param {object} ctx  {fromYear, toYear, years, awakeYears, fromEra, toEra, switches}
 * @returns {{changes: object[], notes: string[]}}
 */
/** B5391: the kinds of town scar that take a place with them. */
export const PLACE_LOST = {sack: "sacked", quake: "thrown down by an earthquake"};
/**
 * B5391: whether the town a place Fetter names is gone between two years: sacked or quaked (a scar in the years
 * crossed), or in ruin at the end (no people, or prosperity under a half). towns: [{name, scars, history}].
 * Returns {town, why} or null.
 */
export function placeGone(fetterName, towns = [], fromYear = 0, toYear = 0) {
  const name = String(fetterName ?? "").toLowerCase();
  for ( const t of towns ) {
    const tn = String(t?.name ?? "").trim();
    if ( tn.length < 3 || !name.includes(tn.toLowerCase()) ) continue;
    const scar = (t.scars ?? []).find(x => PLACE_LOST[x?.kind] && Number(x.year) > Number(fromYear) && Number(x.year) <= Number(toYear));
    if ( scar ) return {town: tn, why: `${tn} was ${PLACE_LOST[scar.kind]} in ${scar.year}`};
    const at = [...(t.history ?? [])].filter(h => Number(h.year) <= Number(toYear)).sort((a, b) => a.year - b.year).at(-1);
    if ( at && Number(at.year) > Number(fromYear) && (Number(at.people) <= 0 || Number(at.prosperity) < 0.5) ) return {town: tn, why: `${tn} lies in ruin by ${at.year}`};
  }
  return null;
}
export function propose(v, ctx) {
  const changes = [];
  const notes = [];
  const sw = ctx.switches ?? {};
  const add = (kind, label, detail, checked, data = {}, choices = null) => changes.push({kind, label, detail, checked, data, ...(choices ? {choices} : {})});
  const eraChanges = !!ctx.toEra && ctx.fromEra?.id !== ctx.toEra?.id;
  const leavingDA = eraChanges && isDAEra(ctx.fromEra?.id) && !isDAEra(ctx.toEra?.id);
  const awake = Math.max(0, Number(ctx.awakeYears ?? ctx.years) || 0);

  // A line out of its years: refused unless the Storyteller keeps the character with the sheet flag
  const fits = lineFits(v.line, ctx.toYear);
  if ( !fits.ok && !v.forcedSheet ) {
    add("adv.outOfEra", `Out of era in ${ctx.toYear}`, `${fits.why}. Tick to keep this character anyway, as the Storyteller's choice (the sheet flag keeps its sheet).`, false);
  }

  // Mortal decline (switch): a Physical dot at each age passed, the player's pick
  if ( sw.decline && MORTAL_BODIED.includes(v.line) ) {
    for ( const age of declineAges(v.born, ctx.fromYear, ctx.toYear) ) {
      const opts = DECLINE.physical.filter(a => Number(v.attributes?.[a]) > 1)
        .sort((a, b) => Number(v.attributes[b]) - Number(v.attributes[a]))
        .map(a => ({value: a, label: `${ATTR_LABEL[a]} (${v.attributes[a]} → ${Number(v.attributes[a]) - 1})`}));
      if ( !opts.length ) { notes.push(`Turns ${age}: no Physical Attribute above 1 to lose`); continue; }
      add("adv.decline", `Turns ${age}: loses a Physical dot`, `The player picks which (${DECLINE.source}).`, true, {age, choice: opts[0].value}, opts);
    }
  }

  // Vampires: thick blood and morality drift (both switches, off by default)
  if ( v.line === "vampire" ) {
    const before = Number(v.awakeBefore) || 0;
    if ( sw.thickBlood ) {
      const tb = thickBlood(v.generation, before, before + awake);
      if ( tb ) add("adv.thickBlood", `The blood thickens: ${ordinal(v.generation)} → ${ordinal(tb.to)} Generation`,
        `${tb.steps} full ${tb.steps === 1 ? "century" : "centuries"} awake; a dot of ${v.road?.label ?? "Humanity or Road"} for each step${tb.noAnimalBlood ? "; animal blood no longer feeds them" : ""} (${THICK_BLOOD.source}).`,
        true, {to: tb.to, steps: tb.steps, noAnimalBlood: tb.noAnimalBlood});
    }
    if ( sw.drift ) {
      const rolls = centuriesCrossed(before, before + awake, DRIFT.yearsPerRoll);
      if ( rolls > 0 ) add("adv.drift", `The centuries wear: ${rolls} ${rolls === 1 ? "roll" : "rolls"} of ${v.conscienceLabel ?? "Conscience"}`,
        `Difficulty ${DRIFT.difficulty}; each failure costs a dot of ${v.road?.label ?? "Humanity or Road"} (${DRIFT.source}).`, true, {rolls});
    }
  }

  // Experience for the years (switch)
  // Only the lines WoDX knows; a wraith's years are not lived, and a creature keeps no experience
  if ( sw.xp && awake >= 1 && v.line && v.line !== "wraith" ) {
    const n = yearsXP(awake);
    if ( n > 0 ) add("adv.xp", `${n} experience for the years`, `${YEARS_XP.perYear} a year awake and active, at most ${YEARS_XP.cap} a skip; spend it on what the years suggest (${YEARS_XP.source}).`, true, {amount: n});
  }

  // Backgrounds: a dot per untended decade, and the societal ones reset in a new era. Shown unticked (B83).
  const decades = Math.floor((Number(ctx.years) || 0) / BACKGROUNDS.yearsPerDot);
  for ( const b of v.backgrounds ?? [] ) {
    const name = String(b.name).toLowerCase();
    const value = Number(b.value) || 0;
    if ( value <= 0 ) continue;
    if ( eraChanges && BACKGROUNDS.societal.some(s => name.includes(s)) ) {
      add("adv.bgReset", `${b.name} resets in ${ctx.toEra.name}`, `${value} → 0: it belonged to a society that is gone (${BACKGROUNDS.source}).`, false, {itemId: b.id, to: 0});
    } else if ( decades > 0 && BACKGROUNDS.decays.some(s => name.includes(s)) ) {
      const to = Math.max(0, value - decades);
      add("adv.bgDecay", `${b.name} fades if untended`, `${value} → ${to}: a dot per decade not tended in play (${BACKGROUNDS.source}).`, false, {itemId: b.id, to});
    }
  }

  // Dark Ages Abilities to their later counterparts (switch): offered, the old Ability kept at 0
  if ( sw.convert && leavesDAAbilities(ctx.fromEra, ctx.toEra) ) {
    for ( const c of conversions(v.secondaries, ctx.toEra?.id) ) {
      const opts = c.targets.map(t => ({value: t, label: `${ABILITY_LABEL[t] ?? cap(t)} (${Number(v.abilities?.[t]) || 0} → ${Math.min(5, (Number(v.abilities?.[t]) || 0) + Number(c.item.value))})`}));
      add("adv.convert", `${c.item.name} ${c.item.value} becomes a later Ability`, `${c.row.note ? `${c.row.note}. ` : ""}${c.item.name} stays on the sheet at 0, so this can be undone by hand (house rule).`,
        true, {itemId: c.item.id, dots: Number(c.item.value), choice: c.targets[0]}, opts);
    }
  }

  // Leaving the Dark Ages: the Road becomes Humanity or a V20 Path; the Dark Ages records are converted and archived
  if ( leavingDA ) {
    if ( v.line === "vampire" && v.road?.key ) {
      const t = roadTarget(v.road.key);
      if ( t ) add("adv.road", `${v.road.label ?? "The Road"} ${v.road.rating ?? ""} becomes ${PATH_LABEL[t.to]}`.replace(/\s+/g, " "),
        `The rating carries over${t.note ? `; ${t.note}` : ""} (house rule).`, true, {choice: t.to, rating: v.road.rating},
        t.choices.length > 1 ? t.choices.map(k => ({value: k, label: PATH_LABEL[k]})) : null);
      // B5022: a Road with no row in the table goes to Humanity, or Honorable Accord, by the Storyteller's tick
      else add("adv.road", `${v.road.label ?? "The Road"} ${v.road.rating ?? ""} becomes ${PATH_LABEL.humanity}`.replace(/\s+/g, " "),
        "No V20 Path matches it: Humanity by default, or Honorable Accord (house rule).", true, {choice: "humanity", rating: v.road.rating},
        ["humanity", "accord"].map(k => ({value: k, label: PATH_LABEL[k]})));
    }
    if ( v.records?.daMage && v.records.daMage.system !== "m20" ) {
      add("adv.daMage", "The Dark Ages mage becomes a Mage 20th mage", `${DA_RECORDS.daMage}. The old record is kept, marked archived.`, true);
    }
    if ( v.records?.inquisitor ) {
      add("adv.inquisitor", "The inquisitor becomes a mortal hunter", `${DA_RECORDS.inquisitor}. The old record is kept, marked archived.`, true);
    }
  }
  // Dark Ages fae across the Shattering: Rebirth or Return, the Storyteller's pick (Rebirth by default)
  if ( v.records?.daFae && ctx.fromYear < FAE_CROSSING.shattering && ctx.toYear >= FAE_CROSSING.shattering ) {
    add("adv.daFae", "The Shattering", `${DA_RECORDS.daFae}. ${FAE_CROSSING.source}.`, true, {choice: "rebirth", resurgence: FAE_CROSSING.resurgence},
      FAE_CROSSING.options);
  }

  // Line notes the Storyteller acts on by hand
  if ( v.line === "garou" ) {
    const lost = lostTribe(v.tribe, ctx.fromYear, ctx.toYear);
    // B5022: a lost tribe's member joins what the tribe became, or is marked the last of it
    if ( lost ) add("adv.lostTribe", `The ${lost.tribe} are gone by ${lost.goneBy}`, `${lost.why}${lost.became ? `; the character goes with them and becomes one of the ${lost.became}` : "; the character is marked the last of the tribe"}.`, true, {tribe: lost.tribe, became: lost.became ?? ""});
  }
  // B5022: a Fetter that names someone now dead is lost, and a Harrowing follows (Wraith 20th p. 308)
  if ( v.line === "wraith" ) for ( const f of v.fetters ?? [] ) {
    const who = (v.deadNames ?? []).find(d => d && String(f.name ?? "").toLowerCase().includes(String(d).toLowerCase()));
    if ( who ) add("adv.fetterLost", `The Fetter "${f.name}" is lost`, `${who} has died: the Fetter goes, and a Harrowing follows (Wraith 20th p. 308).`, true, {itemId: f.id, who});
  }
  // B5391: Ben's pick (15 November 2026): a Fetter that names a town is checked against the town over time; a town
  // sacked, thrown down by a quake or left in ruin across the years takes the place with it, and a Harrowing follows
  // B6104: a sealed Fetterguard keeps the first Fetters it holds likenesses of from that harm (Wraith 20th p. 428)
  if ( v.line === "wraith" ) for ( const [i, f] of (v.fetters ?? []).entries() ) {
    if ( (v.deadNames ?? []).some(d => d && String(f.name ?? "").toLowerCase().includes(String(d).toLowerCase())) ) continue;
    const gone = placeGone(f.name, v.towns ?? [], ctx.fromYear, ctx.toYear);
    if ( gone && i < (Number(v.fetterguard) || 0) ) { notes.push(`The Fetter "${f.name}" is unharmed although ${gone.why}: its likeness is sealed in the Fetterguard (Wraith 20th p. 428)`); continue; }
    if ( gone ) add("adv.fetterLost", `The Fetter "${f.name}" is lost`, `${gone.why}: the place is gone, and a Harrowing follows (Wraith 20th pp. 49, 308).`, true, {itemId: f.id, who: gone.town, why: `${gone.why}, and the place with it`});
  }
  if ( v.line === "wraith" && eraChanges ) notes.push("Fetters that name a town are checked against the town over time: a town sacked, quaked or in ruin takes the place with it (Wraith 20th p. 49)");
  if ( v.line === "kuei-jin" ) notes.push("Does not age; progress is by Dharma, not by years (Kindred of the East pdf pp. 30–31)");
  if ( v.line === "demon" ) {
    // B5022: a host past the age a body gives out dies across the years, and the demon seeks another (house age)
    const age = v.born === null || v.born === undefined ? null : ctx.toYear - Number(v.born);
    if ( age !== null && age >= HOST_LIFESPAN ) add("adv.hostDies", `The host's body gives out at ${age}`, "The demon must find another body: the possession roll is made (Demon p. 171; DtF pdf 260).", true);
    else notes.push("The host ages as a mortal; when it dies the demon must find another body (Demon p. 171)");
  }
  if ( v.line === "mummy" ) notes.push("Between deaths the body ages as a mortal's (house rule)");
  if ( v.line === "orpheus" ) notes.push("The projector's body ages; spirits do not");

  return {changes, notes};
}

/** B5022: the age at which a Fallen's host dies across the years (house figure). */
export const HOST_LIFESPAN = 85;

export function ordinal(n) {
  const x = Number(n);
  if ( !Number.isFinite(x) ) return String(n ?? "?");
  const s = ["th", "st", "nd", "rd"], m = x % 100;
  return `${x}${s[(m - 20) % 10] || s[m] || s[0]}`;
}
