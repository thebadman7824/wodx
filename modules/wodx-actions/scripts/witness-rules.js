/**
 * WoDX Actions 3.41.0: who an act startles, and how far word of it goes. Pure rules, no Foundry.
 *
 *   The secret   The kind of creature an act shows for what it is: the profile of whoever did it (a Cainite feeding,
 *                a Garou in Crinos, a demon's apocalyptic form, a mage's vulgar magick).
 *   Each onlooker who can see it is one of three:
 *     breach     a mortal who does not know (mortal, hunter): the Masquerade breaks and word can spread.
 *     startled   a creature of another kind, or an animal: no mortal rumour, but they have seen something they did not know.
 *     calm       their own kind, or one who already knows this kind (a ghoul of the Kindred, Kinfolk of the Garou,
 *                herd or retainers the Storyteller has ticked). Spirits, wraiths, demons and mummies are never startled:
 *                they have seen too much of the world to be (Ben's ruling, 2026-11-12).
 *   Mage: only Sleepers make vulgar magick "witnessed" (M20, Paradox), so animals are not breach witnesses there.
 *
 *   The place    open, guarded or closed. A scene or region may set it; otherwise its kind of place decides:
 *                a haven, caern or chantry is closed, an Elysium guarded, anywhere else open.
 *     open       as before: the breach is recorded and the rumour starts.
 *     guarded    Elysium. Kindred guests are calm as anywhere; mortal guests still see. The breach is recorded but
 *                no rumour goes out to the town. Feeding or violence there breaks the Prince's peace instead.
 *     closed     a private place. Witnesses are recorded so the Storyteller can deal with them; no rumour spreads.
 *   House rule (B980-B984).
 */

/** The secrets an act can show, by the actor's profile. */
export const SECRETS = {
  kindred: "a Cainite", ghoul: "a ghoul's blood-strength", lupine: "a shapechanger", mage: "magick", fae: "the fae",
  wraith: "the restless dead", spirit: "a spirit", demon: "one of the Fallen", mummy: "one of the Reborn",
  exalted: "a Kuei-jin or Exalted", hunter: "a hunter's gifts", mortal: "", beast: ""
};

/** What each kind of onlooker already takes in stride. "*" is everything. */
export const KNOWS = {
  kindred: ["kindred", "ghoul"], ghoul: ["kindred", "ghoul"], lupine: ["lupine"], mage: ["mage"], fae: ["fae"],
  wraith: ["*"], spirit: ["*"], demon: ["*"], mummy: ["*"], exalted: ["exalted"],
  hunter: [], mortal: [], beast: []
};

/** Onlookers who break a secret by seeing it: those with no world of their own to hide it in. */
export const BREACH_PROFILES = ["mortal", "hunter"];
/** Mage: only Sleepers count. */
export const SLEEPER_PROFILES = ["mortal", "hunter"];

export const PLACE_MODES = { open: "Open: word spreads", guarded: "Guarded (Elysium): Kindred keep the secret", closed: "Closed: nothing leaves these walls" };
/** The mode a kind of place has when nobody has set one. */
export const MODE_OF_KIND = { haven: "closed", caern: "closed", chantry: "closed", elysium: "guarded" };

/** A secret worth checking: the actor's profile, or null for an act that shows nothing. */
export function secretOf(profile) {
  return SECRETS[profile] ? profile : null;
}

/**
 * One onlooker's answer to a secret.
 *   who: {profile, knows?: [secrets] | "*", kinfolk?: bool}
 * Returns "breach", "startled" or "calm".
 */
export function reaction(secret, who = {}) {
  if ( !secret || !SECRETS[secret] ) return "calm";
  const p = KNOWS[who.profile] ? who.profile : "mortal";
  const own = KNOWS[p];
  const extra = who.knows === "*" ? ["*"] : Array.isArray(who.knows) ? who.knows : [];
  if ( who.kinfolk ) extra.push("lupine");
  const known = [...own, ...extra];
  if ( p === secret || known.includes("*") || known.includes(secret) ) return "calm";
  const breakers = secret === "mage" ? SLEEPER_PROFILES : BREACH_PROFILES;
  if ( breakers.includes(p) ) return "breach";
  if ( p === "beast" && secret === "mage" ) return "calm"; // an animal at a mage's vulgar magick
  return "startled";
}

/** Sort onlookers: [{...who}] -> {breach, startled, calm}, each a list of the same objects. */
export function sortOnlookers(secret, list = []) {
  const out = { breach: [], startled: [], calm: [] };
  for ( const w of list ) out[reaction(secret, w)].push(w);
  return out;
}

/** The place's mode: its own setting if valid, else from its kind, else open. */
export function placeMode(place = null) {
  const set = place?.masq;
  if ( PLACE_MODES[set] ) return set;
  return MODE_OF_KIND[place?.kind] ?? "open";
}

/** Whether word of a breach goes out to the town from a place of this mode. */
export const spreads = mode => (PLACE_MODES[mode] ? mode : "open") === "open";

/** Acts that break the Prince's peace when done in Elysium. */
const PEACE = /feed|blood|bite|kill|attack|strike|fight|frenz|wound|violen/i;
/** Whether an act by this kind breaks the peace of a guarded place (Elysium). */
export function breaksPeace(mode, secret, event = "") {
  return mode === "guarded" && (secret === "kindred" || secret === "ghoul") && PEACE.test(String(event));
}

/** The Storyteller's line for the place. */
export function placeNote(mode, secret, event = "") {
  if ( mode === "closed" ) return "A closed place: the witnesses are recorded, but no rumour goes out to the town.";
  if ( mode === "guarded" ) return breaksPeace(mode, secret, event)
    ? "Elysium: no rumour goes out to the town, but this breaks the Prince's peace. The Keeper of Elysium and the Prince will hear of it."
    : "Elysium: no rumour goes out to the town; the Kindred here keep the secret.";
  return "";
}
