/**
 * Gauntlet charts and the Step Sideways rules. Pure functions, unit tested in Node.
 *
 * Sources (all read from the books in the project library):
 * - Dark Ages: Werewolf, "Stepping Sideways" and the Gauntlet Difficulty and Shift Time charts (PDF pp. 93-94).
 * - Werewolf: The Apocalypse 20th Anniversary, "Walking Between Worlds", Gauntlet Chart and Shift Time (pp. 308-309);
 *   Peeking (p. 313).
 * - W20 Wyld West Expansion Pack, "The Gauntlet" (p. 7) and Umbral Storms and Broken Lands (pp. 27-28).
 * Anything not in those books is marked `ourCall` and recorded in the Chronicle Rules journal.
 */

/** Kinds of place a scene or region can be tagged with. */
export const SETTLEMENTS = {
  "": "Not set",
  laboratory: "Sterile Weaver place (laboratory, office block)",
  metropolis: "Major city, inner city",
  town: "Town or city street",
  village: "Village, hamlet, farmland",
  wilderness: "Wilderness",
  "caern-urban": "Urban caern",
  "caern-active": "Active caern",
  "caern-powerful": "Powerful caern",
  "caern-legendary": "Legendary or greatest caern",
  "broken-land": "Broken Land (Wild West)"
};

/**
 * Gauntlet charts. `procedure` picks the crossing rules: "dark-ages" or "w20".
 * A value of 0 means no roll is needed.
 */
export const CHARTS = {
  "dark-ages": {
    name: "Dark Ages: Werewolf",
    source: "Dark Ages: Werewolf, Gauntlet Difficulty chart (PDF p. 94)",
    procedure: "dark-ages",
    values: {
      laboratory: 8, metropolis: 8, town: 6, village: 5, wilderness: 4,
      "caern-urban": 3, "caern-active": 3, "caern-powerful": 2, "caern-legendary": 0
    },
    ourCall: {
      laboratory: "The book has no such place; 8 is its stated top for extreme Weaver influence.",
      "caern-urban": "The book has no urban caern; treated as an active caern."
    }
  },
  "w20": {
    name: "Werewolf 20th Anniversary",
    source: "W20 Gauntlet Chart (p. 309)",
    procedure: "w20",
    values: {
      laboratory: 9, metropolis: 8, town: 7, village: 6, wilderness: 5,
      "caern-urban": 5, "caern-active": 4, "caern-powerful": 3, "caern-legendary": 2
    },
    ourCall: {}
  },
  "wild-west": {
    name: "Wyld West",
    source: "W20 Wyld West Expansion Pack, The Gauntlet (p. 7); Broken Lands (p. 28)",
    procedure: "w20",
    values: {
      laboratory: 8, metropolis: 7, town: 6, village: 5, wilderness: 5,
      "caern-urban": 5, "caern-active": 4, "caern-powerful": 3, "caern-legendary": 2, "broken-land": 1
    },
    ourCall: {
      laboratory: "The book gives no value; one above its largest towns.",
      village: "The book says most of the West sits at 5 or 6; settled farmland takes 5.",
      wilderness: "The book says most of the West sits at 5 or 6; open country takes 5.",
      "caern-urban": "The book is silent on caerns; W20's chart is used.",
      "caern-active": "The book is silent on caerns; W20's chart is used.",
      "caern-powerful": "The book is silent on caerns; W20's chart is used.",
      "caern-legendary": "The book is silent on caerns; W20's chart is used."
    }
  }
};

export const DEFAULT_CHART = "w20";

/** Resolve the Gauntlet for a set of ratings under a chart. */
export function gauntletFor(chartId, ratings = {}) {
  const chart = CHARTS[chartId] ?? CHARTS[DEFAULT_CHART];
  const notes = [];
  let base = null;
  let source = null;
  if ( Number.isInteger(ratings.gauntlet) ) {
    base = ratings.gauntlet;
    source = "set by the Storyteller";
  } else if ( ratings.settlement && (ratings.settlement in chart.values) ) {
    base = chart.values[ratings.settlement];
    source = `${chart.name}: ${SETTLEMENTS[ratings.settlement]}`;
    if ( chart.ourCall[ratings.settlement] ) notes.push(`House rule: ${chart.ourCall[ratings.settlement]}`);
  }
  if ( base === null ) return {gauntlet: null, source: null, notes, chart};
  const modifier = Number.isInteger(ratings.modifier) ? ratings.modifier : 0;
  if ( modifier ) notes.push(`Storyteller's modifier ${modifier > 0 ? "+" : ""}${modifier}`);
  return {gauntlet: base === 0 ? 0 : Math.max(1, Math.min(10, base + modifier)), source, notes, chart};
}

/** Shift time by successes (both books agree). */
export function shiftTime(successes) {
  if ( successes >= 3 ) return {label: "Instantly", seconds: 0};
  if ( successes === 2 ) return {label: "30 seconds", seconds: 30};
  if ( successes === 1 ) return {label: "5 minutes", seconds: 300};
  return null;
}

/**
 * Count a World of Darkness roll: successes at or above the difficulty, each 1 cancels one success,
 * and a roll with no successes and at least one 1 is a botch.
 * @param {number[]} faces
 * @param {number} difficulty
 * @param {object} [options]
 * @param {boolean} [options.doubleOnes]  Umbral storm (Wyld West p. 27): each 1 counts as two 1s
 */
export function countRoll(faces, difficulty, {doubleOnes = false} = {}) {
  const successes = faces.filter(f => f >= difficulty).length;
  const ones = faces.filter(f => f === 1).length * (doubleOnes ? 2 : 1);
  const net = successes - ones;
  const botch = (successes === 0) && (ones > 0);
  return {successes, ones, net: Math.max(0, net), botch, success: net > 0};
}

/**
 * Work out the difficulty and whether the attempt is allowed.
 * @param {object} p
 * @param {string} p.procedure        "dark-ages" or "w20"
 * @param {number|null} p.gauntlet   The local Gauntlet (0 = no roll needed)
 * @param {"cross"|"peek"} p.mode
 * @param {boolean} p.inUmbra         The travelers start in the Umbra
 * @param {boolean} p.reflective      A reflective surface is at hand
 * @param {boolean} p.ownMirror       W20: a carried mirror (Storyteller's discretion, +1)
 * @param {boolean} p.pulse           W20: Gift Pulse of the Invisible (no mirror needed)
 * @param {number} p.priorFailures    Dark Ages: failed attempts at this spot
 * @param {number|null} p.secondsSinceFailure  W20: world seconds since the last failure here
 * @param {boolean} p.caught          W20: the traveler is caught in the Gauntlet
 * @param {number|null} p.secondsSinceCaught   W20: world seconds since being caught
 * @param {boolean} p.override        The Storyteller allows a blocked attempt
 */
export function planAttempt(p) {
  const lines = [];
  const blocks = [];
  if ( p.gauntlet === null || p.gauntlet === undefined ) {
    return {allowed: false, difficulty: null, automatic: false, lines, blocks: ["This place has no Gauntlet rating yet. Tag the scene or region first."]};
  }
  if ( p.gauntlet === 0 ) {
    lines.push("Legendary caern: no roll is needed (Dark Ages: Werewolf).");
    return {allowed: true, difficulty: null, automatic: true, lines, blocks};
  }

  let difficulty = p.gauntlet;
  lines.push(`Local Gauntlet ${p.gauntlet}`);

  if ( p.procedure === "dark-ages" ) {
    if ( p.reflective ) { difficulty -= 1; lines.push("Reflective surface −1"); }
    if ( p.priorFailures > 0 ) {
      difficulty += p.priorFailures;
      lines.push(`Earlier failed attempts here +${p.priorFailures}`);
    }
    difficulty = Math.min(10, difficulty);
    if ( p.mode === "peek" ) lines.push("Peeking needs only one success and takes no time.");
  } else {
    if ( p.mode === "peek" && !p.inUmbra ) {
      difficulty = Math.min(9, difficulty + 3);
      lines.push("Peeking from the physical world +3 (at most 9)");
    }
    if ( !p.reflective && !p.pulse && p.mode === "cross" && !p.caught ) {
      blocks.push("W20 needs a highly reflective surface, such as still water or a mirror, unless the Garou knows Pulse of the Invisible.");
    }
    if ( p.ownMirror && !p.pulse ) { difficulty += 1; lines.push("Carried mirror +1 (Storyteller's discretion)"); }
    if ( p.pulse ) lines.push("Pulse of the Invisible: no reflective surface needed");
    if ( !p.caught && p.secondsSinceFailure !== null && p.secondsSinceFailure !== undefined && p.secondsSinceFailure < 3600 ) {
      blocks.push(`A failed attempt here was ${Math.round(p.secondsSinceFailure / 60)} minutes ago; W20 says wait an hour.`);
    }
    if ( p.caught && p.secondsSinceCaught !== null && p.secondsSinceCaught !== undefined && p.secondsSinceCaught < 3600 ) {
      blocks.push(`Caught ${Math.round(p.secondsSinceCaught / 60)} minutes ago; W20 says wait an hour before trying again, unless another Garou frees you.`);
    }
    difficulty = Math.min(10, difficulty);
  }
  // Disconnection (W20 p. 319): each lunar cycle spent in one world makes crossing to the other 1 harder
  if ( p.mode === "cross" && p.cycles > 0 ) {
    difficulty = Math.min(10, difficulty + p.cycles);
    lines.push(`Disconnection: ${p.cycles} lunar cycle${p.cycles === 1 ? "" : "s"} in this world +${p.cycles} (W20 p. 319${p.procedure === "dark-ages" ? "; a house rule uses it in the Dark Ages too" : ""})`);
  }
  difficulty = Math.max(1, difficulty);
  const allowed = blocks.length === 0 || !!p.override;
  if ( blocks.length && p.override ) lines.push("The Storyteller allows the attempt anyway.");
  return {allowed, difficulty, automatic: false, lines, blocks};
}

/**
 * What happens after the roll.
 * @returns {{outcome: "success"|"failure"|"botch"|"peek", status: string|null, text: string, shift: object|null}}
 */
export function outcomeOf({procedure, mode, result, reflective, caught, trapped}) {
  if ( mode === "peek" ) {
    if ( result.success ) {
      return {outcome: "peek", status: null, shift: null,
        text: "The traveler sees across the Gauntlet. While peeking, they cannot perceive their own side."};
    }
    if ( result.botch && procedure === "w20" ) {
      return {outcome: "botch", status: "caught", shift: null, text: "Botch: caught in the Gauntlet."};
    }
    return {outcome: "failure", status: null, shift: null, text: "Nothing shows through."};
  }

  if ( result.success ) {
    const shift = shiftTime(result.net);
    return {outcome: "success", status: "crossed", shift,
      text: caught ? `Freed from the Gauntlet and through. Shift time: ${shift.label.toLowerCase()}.` : `Through. Shift time: ${shift.label.toLowerCase()}.`};
  }
  if ( !result.botch ) {
    return {outcome: "failure", status: null, shift: null,
      text: procedure === "dark-ages"
        ? "The wall is too thick. Another attempt here is 1 harder (Dark Ages: Werewolf)."
        : "The wall is too thick. Wait an hour before trying here again (W20)."};
  }
  if ( procedure === "dark-ages" ) {
    if ( reflective ) {
      return {outcome: "botch", status: null, shift: null,
        text: "Botch: the reflective surface is ruined (the mirror shatters, the pond clouds, the shield rusts), but the traveler is not trapped."};
    }
    return {outcome: "botch", status: "lost", shift: null,
      text: "Botch: the Pattern Web takes the traveler. Hours or days later they return somewhere else, with no memory of what happened."};
  }
  if ( caught ) {
    return {outcome: "botch", status: "trapped", shift: null,
      text: "Botch while caught: the traveler cannot leave on their own and is trapped until rescued (W20)."};
  }
  return {outcome: "botch", status: "caught", shift: null,
    text: "Botch: caught in the Gauntlet, half spirit and half flesh, until another Garou frees them or an hour passes for another try (W20)."};
}

/* -------------------------------------------- */
/*  Tag suggestions                             */
/* -------------------------------------------- */

const KEYWORDS = [
  [/\bcaern\b/i, "caern-active"],
  [/\b(metropolis|downtown|capital)\b/i, "metropolis"],
  [/\b(forest|woods?|grove|clearing|mountain|trail|pass|adit|mines?|mining|cave|caves|wilds?|wilderness|moor|marsh|ruins?|hermitage|ridge)\b/i, "wilderness"],
  [/\b(village|hamlet|farm|farms|fields?|mill|ferry|ford|toll-post|pasture|herdsman)\b/i, "village"],
  [/\b(town|city|market|square|street|lane|quay|gate|tavern|inn|church|cathedral|keep|castle|bailey|hall|barracks|guildhall)\b/i, "town"]
];

/** Suggest a settlement from a scene name, or "" when nothing fits. */
export function suggestSettlement(name) {
  const clean = String(name ?? "").replace(/^⚔\s*BATTLEMAP\s*·\s*/u, "");
  for ( const [re, tag] of KEYWORDS ) if ( re.test(clean) ) return tag;
  return "";
}

/** The parent scene name for a battlemap ("⚔ BATTLEMAP · X" → "X"), or null. */
export function battlemapParent(name) {
  const m = /^⚔\s*BATTLEMAP\s*·\s*(.+)$/u.exec(String(name ?? ""));
  return m ? m[1] : null;
}

/* -------------------------------------------- */
/*  Disconnection                               */
/* -------------------------------------------- */

/** One lunar cycle, new moon to new moon, in days. */
export const LUNAR_CYCLE_DAYS = 29.53059;
/** A year and a day (W20 p. 319), taken as 366 days. */
export const YEAR_AND_A_DAY_DAYS = 366;

/**
 * How long a traveler has been in one world, and what it costs.
 * @param {number|null} seconds   Time since they last crossed; null when there is no record
 * @returns {{known: boolean, days: number, cycles: number, yearAndDay: boolean}}
 */
export function disconnection(seconds) {
  if ( seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0 ) return {known: false, days: 0, cycles: 0, yearAndDay: false};
  const days = seconds / 86400;
  return {known: true, days, cycles: Math.floor(days / LUNAR_CYCLE_DAYS), yearAndDay: days >= YEAR_AND_A_DAY_DAYS};
}
