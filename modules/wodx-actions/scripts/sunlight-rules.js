/**
 * WoDX Actions 3.3 — the pure rules of the sunlight system: where the sun stands, how long a wall's shadow is, how
 * strong the light is after sky, twilight and clothing, the powers that protect, and when to warn of dawn.
 * No Foundry calls here, so the harness can test it.
 *
 * Sunlight damage: VtDA20 p. 359 (intensity sets the soak difficulty, exposure the levels a turn, aggravated; only
 * Fortitude soaks; the blood auto-soak doesn't work against it, p. 218). Rötschreck from sunlight p. 357.
 * The sun's position is ordinary astronomy (declination by day of year, hour angle by local solar time).
 */

const rad = Math.PI / 180;

/** Solar declination (degrees) for a day of the year, 1 … 366. */
export function declination(dayOfYear) {
    return -23.44 * Math.cos(rad * (360 / 365) * (dayOfYear + 10));
}

/**
 * The sun for a latitude, a declination and local solar hours (0 … 24): {altitude, azimuth} in degrees.
 * Azimuth is measured from north, clockwise (90 east, 180 south).
 */
export function sunPosition(latitude, decl, hours) {
    const phi = latitude * rad, d = decl * rad, H = (hours - 12) * 15 * rad;
    const sinAlt = Math.sin(phi) * Math.sin(d) + Math.cos(phi) * Math.cos(d) * Math.cos(H);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
    const az = Math.atan2(-Math.sin(H), Math.tan(d) * Math.cos(phi) - Math.sin(phi) * Math.cos(H)) / rad;
    return { altitude, azimuth: ((az % 360) + 360) % 360 };
}

/** Day, twilight (the sun just up: faint light), or night. Sunrise and sunset are at −0.833°. */
export function phaseOfSun(altitude) {
    if (altitude <= -0.833) return "night";
    if (altitude < 6) return "twilight";
    return "day";
}

/** How far a wall of a height throws its shadow on the ground (same units as the height); Infinity at sunrise. */
export function shadowLength(height, altitude) {
    if (altitude <= 0.5) return Infinity;
    return height / Math.tan(altitude * rad);
}

/** A unit vector on the map pointing toward the sun. north: the map's north as degrees clockwise from the top. */
export function sunVector(azimuth, north = 0) {
    const a = (azimuth - north) * rad;
    return { x: Math.sin(a), y: -Math.cos(a) };
}

/* ------------------------------------------------------------------ */
/*  Intensity                                                          */
/* ------------------------------------------------------------------ */

/** VtDA20 p. 359, weakest to strongest; "shade" means no sunlight at all. */
export const LADDER = ["faint", "covered", "indirect", "cloudy", "direct"];
export const LIGHTS = {
    shade: "Shade, shelter, indoors (no sunlight)",
    faint: "Faint: through a closed curtain, heavy cloud, twilight (soak 3)",
    covered: "Covered: heavy clothes, gloves, a wide hat (soak 5)",
    indirect: "Indirect: through a window or light curtains (soak 7)",
    cloudy: "A cloudy day, one ray, a reflection (soak 9)",
    direct: "Direct rays of the sun (soak 10)"
};
export const SKIES = {
    clear: { label: "Clear", cap: "direct" },
    cloudy: { label: "Cloudy", cap: "cloudy" },
    overcast: { label: "Heavy cloud or rain", cap: "faint" },
    storm: { label: "Storm, thick fog", cap: "faint" }
};
const weaker = (a, b) => LADDER[Math.min(LADDER.indexOf(a), LADDER.indexOf(b))];

/**
 * The light on a vampire: the place's light, capped by the sky, by twilight and by what she wears.
 * Returns null for no sunlight. place: a LIGHTS key; sky: a SKIES key; phase: day | twilight | night;
 * covered: heavy clothing over everything (p. 359 "covered").
 */
export function effectiveLight({ place = "direct", sky = "clear", phase = "day", covered = false } = {}) {
    if (phase === "night" || place === "shade" || !LADDER.includes(place)) return null;
    let l = place;
    l = weaker(l, SKIES[sky]?.cap ?? "direct");
    if (phase === "twilight") l = weaker(l, "faint");
    if (covered) l = weaker(l, "covered");
    return l;
}
/** Soak difficulty for an intensity (p. 359). */
export const SOAK_DIFF = { faint: 3, covered: 5, indirect: 7, cloudy: 9, direct: 10 };

/**
 * One turn in the sun: levels = exposure (1 a small part, 2 a large part, 3 half or more), less Fortitude soak
 * successes. Aggravated, unless a power makes it lethal (Woad of Taranis), when Stamina soaks too.
 */
export function sunTurn({ exposure = 3, soakSuccesses = 0 } = {}) {
    return Math.max(0, Math.max(1, Math.min(3, exposure)) - Math.max(0, soakSuccesses));
}

/* ------------------------------------------------------------------ */
/*  What protects                                                      */
/* ------------------------------------------------------------------ */

/**
 * Powers and states that change the sun's effect, from the names of active effects and the torpor flag.
 * Earth Meld (Protean 3, p. 240) and Unseen Hibernation (Abombwe 3, p. 189): out of the sun's reach.
 * Woad of Taranis (Ogham 4, p. 233): fire and sun are lethal, soaked normally, no Rötschreck.
 * Torpor in the earth (buried): safe.
 */
export function protection({ effects = [], torpor = false, buried = false } = {}) {
    const names = effects.map(e => String(e ?? "").toLowerCase());
    if (names.some(n => n.includes("earth meld"))) return { immune: true, why: "Earth Meld: she sleeps in the soil (VtDA20 p. 240)" };
    if (names.some(n => n.includes("unseen hibernation"))) return { immune: true, why: "Unseen Hibernation (VtDA20 p. 189)" };
    if (buried && torpor) return { immune: true, why: "In torpor, under the earth" };
    if (buried) return { immune: true, why: "Buried in the earth" };
    if (names.some(n => n.includes("woad of taranis"))) return { immune: false, lethal: true, noRotschreck: true, why: "Woad of Taranis: the sun is lethal, soaked normally, no Rötschreck (VtDA20 p. 233)" };
    return { immune: false };
}

/* ------------------------------------------------------------------ */
/*  Dawn warnings                                                      */
/* ------------------------------------------------------------------ */

/** Warnings before sunrise, in minutes: the largest one passed that hasn't been given yet, or null. */
export const DAWN_WARNINGS = [30, 10];
export function dawnWarning(secondsToDawn, given = []) {
    const m = secondsToDawn / 60;
    for (const w of [...DAWN_WARNINGS].sort((a, b) => a - b)) if (m <= w && !given.includes(w)) return w;
    return null;
}
