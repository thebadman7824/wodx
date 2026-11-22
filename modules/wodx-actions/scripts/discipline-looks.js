/**
 * WoDX Actions (Dark Ages depth desk item 7, B7641-B7643): Disciplines you can see on the map. The pure part; effects.js
 * marks the token when a power is worked (WoDX Actions' wodxPowerShown) and WoDX Chronicle's token looks draw it.
 *
 * The books say what each power does and, for some, what onlookers see (Presence's awe, Dominate's eyes, Obtenebration's
 * shadows, the Tzimisce flesh that moves); the colours, glows and how long a look lasts are WoDX's own (show, don't tell).
 * A look is short: it shows the power being worked, not the power lasting. What stays (Obfuscate's unseen, Earth Meld,
 * a Protean form) is drawn elsewhere or waits for the Storyteller.
 * Who sees it (B7642): powers worked in the open are seen by everyone; powers worked inside the senses or the mind
 * (Auspex) only by the one who works them and the Storyteller; Obfuscate shows nothing, since showing it would undo it.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** How long a look lasts, in seconds (WoDX reading). */
export const LOOK_SECONDS = 6;

/**
 * The looks by Discipline, then by power family (a family is a pattern on the power's name). Each look is a token look
 * ({tint, aura: {color, alpha, radius}, shake, flicker}) with seen: "all" | "self" | "none".
 */
export const DISCIPLINE_LOOKS = {
  animalism: {re: /animalism/i, base: {aura: {color: 0x6b7b3a, alpha: 0.26, radius: 0.72}}, seen: "all",
    families: [{re: /summon|call|beckon|quell the beast|drawing out/i, look: {aura: {color: 0x7a8a40, alpha: 0.34, radius: 0.9}, flicker: true}}]},
  auspex: {re: /auspex/i, base: {aura: {color: 0xc8d8ff, alpha: 0.22, radius: 0.66}}, seen: "self",
    families: [{re: /aura/i, look: {aura: {color: 0xe0c8ff, alpha: 0.26, radius: 0.7}, flicker: true}}]},
  celerity: {re: /celerity/i, base: {aura: {color: 0xfff0d0, alpha: 0.15, radius: 0.64}, shake: 3}, seen: "all", families: []},
  chimerstry: {re: /chimerstry/i, base: {aura: {color: 0xb0ffe0, alpha: 0.26, radius: 0.74}, flicker: true}, seen: "all", families: []},
  dementation: {re: /dementation/i, base: {aura: {color: 0x9a40c0, alpha: 0.26, radius: 0.7}, flicker: true, shake: 1}, seen: "all", families: []},
  dominate: {re: /dominate/i, base: {aura: {color: 0xd02040, alpha: 0.22, radius: 0.62}}, seen: "all",
    families: [{re: /possess/i, look: {aura: {color: 0xa01030, alpha: 0.32, radius: 0.7}, flicker: true}}]},
  fortitude: {re: /fortitude/i, base: {tint: 0xc0c0c8}, seen: "all", families: []},
  mortis: {re: /mortis|cappadocian|necromancy/i, base: {aura: {color: 0x405048, alpha: 0.3, radius: 0.7}, tint: 0xb8c4b8}, seen: "all", families: []},
  obfuscate: {re: /obfuscate/i, base: null, seen: "none", families: []},
  obtenebration: {re: /obtenebration/i, base: {aura: {color: 0x101018, alpha: 0.5, radius: 0.9}}, seen: "all",
    families: [{re: /arms of ahriman|tenebrous|nocturne|shadow play/i, look: {aura: {color: 0x08080c, alpha: 0.6, radius: 1.2}, flicker: true}}]},
  potence: {re: /potence/i, base: {tint: 0xffd0b0, shake: 1}, seen: "all", families: []},
  presence: {re: /presence/i, base: {aura: {color: 0xffd890, alpha: 0.3, radius: 0.8}}, seen: "all",
    families: [{re: /dread gaze|terror/i, look: {aura: {color: 0x801010, alpha: 0.34, radius: 0.78}, flicker: true}},
      {re: /majesty/i, look: {aura: {color: 0xffe8a8, alpha: 0.4, radius: 1.0}}}]},
  protean: {re: /protean/i, base: {aura: {color: 0xc03020, alpha: 0.2, radius: 0.66}, tint: 0xffe0c0}, seen: "all", families: []},
  quietus: {re: /quietus/i, base: {aura: {color: 0x204020, alpha: 0.3, radius: 0.68}, flicker: true}, seen: "all", families: []},
  serpentis: {re: /serpentis/i, base: {aura: {color: 0xa0a040, alpha: 0.26, radius: 0.7}}, seen: "all", families: []},
  thaumaturgy: {re: /thaumaturgy|path of blood|lure of flames|movement of the mind|hearth path/i, base: {aura: {color: 0xb01010, alpha: 0.3, radius: 0.72}, flicker: true}, seen: "all",
    families: [{re: /lure of flames|flame|fire/i, look: {aura: {color: 0xff7020, alpha: 0.36, radius: 0.8}, flicker: true}}]},
  vicissitude: {re: /vicissitude/i, base: {tint: 0xe0a090, shake: 1}, seen: "all", families: []}
};

/** The Discipline a worked power belongs to: from the group first, then the power's own name. */
export function disciplineOf(info = {}) {
  const g = String(info.group ?? ""), p = String(info.power ?? "");
  for ( const [k, d] of Object.entries(DISCIPLINE_LOOKS) ) if ( d.re.test(g) ) return k;
  for ( const [k, d] of Object.entries(DISCIPLINE_LOOKS) ) if ( d.re.test(p) ) return k;
  return null;
}

/**
 * The look for a power worked: {key, family, look, seen, seconds} or null. info: wodxPowerShown's {power, group, kind}.
 * A power whose Discipline is unknown, or one that shows nothing (Obfuscate), has no look.
 */
export function lookForPower(info = {}) {
  const key = disciplineOf(info);
  if ( !key ) return null;
  const d = DISCIPLINE_LOOKS[key];
  if ( d.seen === "none" || !d.base ) return null;
  const fam = d.families.find(f => f.re.test(`${info.power ?? ""}`)) ?? null;
  return {key, family: fam ? String(fam.re.source) : null, look: fam?.look ?? d.base, seen: d.seen, seconds: LOOK_SECONDS};
}

/** Does this viewer see the look? seen "all": everyone; "self": the one who worked it (an owner) and the Storyteller. */
export function visibleTo(seen, {isGM = false, isOwner = false} = {}) {
  if ( seen === "all" ) return true;
  if ( seen === "self" ) return !!isGM || !!isOwner;
  return false;
}

/** Is a mark still showing? mark: {key, until} (ms since the epoch), now: ms. */
export const live = (mark, now) => !!mark?.key && n(mark.until) > n(now);
