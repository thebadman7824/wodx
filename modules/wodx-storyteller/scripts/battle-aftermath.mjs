/**
 * WoDX Storyteller 0.45.0: what a battlefield leaves behind (Improvement Desk bt2, B2325-B2329). The pure part.
 *
 * When a battle ends, the Storyteller gets a card of the field's harvest: the spoils, the prisoners and the wounded
 * for everyone, then the night side by line. Kindred feed among the dying, with the Masquerade at risk if their
 * deeds were seen. Some of the dead rise as wraiths and the Shroud thins where so many died (Wraith 20th puts the
 * Shroud lowest at places of death and grief). Banes and Wyrm taint gather where the slaughter was worst, and the
 * Gauntlet thickens there. Entropy colours the place's Resonance for mages. The field's dreams turn to nightmare
 * for changelings. Each line can go to the Ledger (a consequence that comes due), the Legends book or the place's
 * own state (WoDX Otherworlds drift), each with an Undo.
 *
 * A field is remembered: fieldEcho() says how a battle of 1278 or 1620 is still felt in a later year, from fresh
 * graves to a chapel, a monument, battlefield tours, a museum, and in the World of Future Darkness a memorial seen
 * through the lens.
 *
 * The counts (one in a hundred of the dead rising, the Shroud a point thinner for a year and a day, two for a great
 * slaughter) and the echoes are house rules.
 */

const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = v => Math.round(n(v)).toLocaleString("en");
const DAY = 86400;

/** The dead of a battle: everyone who fell on both sides. */
export const deadOf = battle => (battle?.sides ?? []).reduce((t, s) => t + Math.max(0, n(s.start) - n(s.men)), 0);

/** How big a slaughter it was: 0 a skirmish, 1 a battle, 2 a great battle, 3 a slaughter of nations. */
export const scaleOf = dead => dead >= 10000 ? 3 : dead >= 1000 ? 2 : dead >= 50 ? 1 : 0;

/** The deeds of the battle that the living could see as more than human. */
export const seenDeeds = battle => (battle?.phases ?? []).flatMap(p => (p?.deeds ?? []).flat()).filter(d => d?.seen && n(d.successes) > 0).length;

/** Whether the living fought there: a battle in the living world always has mortal witnesses. */
const livingWitnesses = battle => (battle?.realm ?? "world") === "world";

const SPOILS = {
  medieval: "Knights are held for ransom, the rest stripped; horses, mail and weapons are the winners' to share",
  early: "The baggage train is plundered and the camp women and sutlers scatter; captured guns and colours are paraded",
  c19: "Prisoners are marched off under guard, the guns and colours taken, the field hospitals full for weeks",
  wars: "Prisoners go to the cages behind the lines; the field is picked over for boots, rations and souvenirs",
  modern: "Prisoners are processed and photographed; every phone on the field has filmed something",
  future: "Prisoners are scanned and logged; the drones count the dead before the medics arrive",
  umbra: "Spirits that lost are bound or scattered; fetishes and the trophies of the Wyrm's servants are taken",
  underworld: "The fallen are bound in chains, some to be forged into soulsteel; relics change hands"
};

/**
 * The field's harvest for a battle that has ended. `group` is battle-deeds.mjs groupOf(age id). Each line is
 * {id, line, title, text, to: {ledger?: {kind, what, days}, legend?: text, drift?: {kind, why}}}.
 */
export function aftermathFor(battle, group = "medieval") {
  if ( !battle?.over ) return [];
  const dead = deadOf(battle), scale = scaleOf(dead), where = battle.place || battle.name || "the field";
  const loser = battle.over.winner === null ? null : battle.sides[1 - battle.over.winner];
  const prisoners = loser && battle.over.how === "rout" ? Math.round(n(loser.men) * 0.1) : 0;
  const wounded = Math.round(dead * 2);
  const out = [];
  const living = !["umbra", "underworld"].includes(group);

  out.push({id: "spoils", line: "all", title: "Spoils, prisoners and the wounded",
    text: `${SPOILS[group] ?? SPOILS.medieval}. About ${fmt(dead)} dead, ${fmt(wounded)} wounded${prisoners ? `, ${fmt(prisoners)} prisoners` : ""}.`,
    to: {legend: `About ${fmt(dead)} fell at ${where}.`}});

  if ( living && dead >= 10 ) {
    const nights = scale >= 2 ? 7 : 3, seen = seenDeeds(battle);
    out.push({id: "feeding", line: "vampire", title: "Feeding among the dying",
      text: `For ${nights} nights Kindred can feed on the dying and the wounded with little hunting: feeding rolls on the field are 2 easier (a house rule). The dead tell no one, but the living who carry the wounded can.${seen && livingWitnesses(battle) ? ` ${seen} deed${seen === 1 ? " was" : "s were"} seen as more than human: the Masquerade is at risk.` : ""}`,
      to: {ledger: {kind: "consequence", what: `The dying at ${where} are gone: the easy feeding there ends.`, days: nights}, veil: seen && livingWitnesses(battle) ? Math.min(3, seen) : 0}});
  }

  if ( dead >= 20 || group === "underworld" ) {
    const risen = group === "underworld" ? 0 : Math.max(1, Math.round(dead / 100));
    const thin = scale >= 3 ? 2 : 1;
    out.push({id: "wraiths", line: "wraith", title: group === "underworld" ? "The fallen of the dead" : "New wraiths among the fallen",
      text: group === "underworld"
        ? "Wraiths that fell are dragged into the Tempest or taken to the forges; the winners count their thralls."
        : `About ${fmt(risen)} of the dead rise as wraiths with Fetters on the field. Reapers and Spectres come for them. The Shroud at ${where} is ${thin} thinner for a year and a day (a house rule).`,
      to: group === "underworld" ? {legend: `The dead fought at ${where}.`} : {drift: {kind: "massdeath", why: `The dead of ${battle.name}`, steps: thin},
        ledger: {kind: "consequence", what: `The Shroud at ${where} heals after the battle (take the drift back).`, days: 366}}});
  }

  if ( group === "umbra" || dead >= 100 ) {
    out.push({id: "taint", line: "werewolf", title: group === "umbra" ? "The spirit ground is scarred" : "Banes and Wyrm taint",
      text: group === "umbra"
        ? "The Penumbra over the field is broken and raw. Banes feed on what is left; healing the land is a rite's work."
        : `Banes of rage, despair and rot gather where the slaughter was worst. The Gauntlet at ${where} thickens with the taint until it is cleansed.`,
      to: {drift: {kind: "taint", why: `The slaughter of ${battle.name}`}}});
  }

  if ( living && dead >= 50 ) {
    out.push({id: "resonance", line: "mage", title: "Entropy in the Resonance",
      text: `The field's Resonance turns to death and decay. Entropy Effects there come easier for a year, and the Quintessence that pools there is tainted by it (a house rule).`,
      to: {ledger: {kind: "consequence", what: `The Entropic Resonance at ${where} fades.`, days: 366}}});
    out.push({id: "nightmares", line: "changeling", title: "Dreams turn to nightmare",
      text: "The dreams of the survivors and of the villages near the field turn to the battle. Chimerae of the fallen walk there, and nightmares are easier to find than dreams of glory.",
      to: {legend: `Nightmares of ${battle.name} haunt the country round ${where}.`}});
  }

  if ( living && dead >= 50 ) {
    out.push({id: "kuei-jin", line: "kuei-jin", title: "The Yin rises",
      text: "Where so many died the Yin is strong: the place draws hungry ghosts, and any Dragon Nest near it turns to Yin for a season.",
      to: {}});
  }

  out.push({id: "memory", line: "all", title: "The place keeps the name",
    text: scale >= 1 ? `${where} will be known by the battle for centuries: songs, a name on the map, ghost stories. In later years the field shows its age (see Old fields).` : "A skirmish few will remember outside the families of the dead.",
    to: {legend: scale >= 1 ? `${where} keeps the name of ${battle.name}.` : ""}});
  return out;
}

/**
 * How an old field is felt in a later year (a house rule). Returns null for a year before the battle.
 * `branch` "future" gives the World of Future Darkness's words from 2026.
 */
export function fieldEcho(field, year, {branch = "classic"} = {}) {
  const fy = n(field?.year), y = n(year);
  if ( !fy || !y || y < fy ) return null;
  const since = y - fy, dead = n(field.dead), scale = scaleOf(dead), where = field.place || field.name;
  const haunted = dead >= 1000 || (dead >= 100 && since < 200);
  let text;
  if ( since < 1 ) text = "Fresh graves, the smell of it, crows and scavengers, and the wounded in every barn for miles.";
  else if ( since < 40 ) text = "The survivors remember. Bones and broken arms still turn up under the plough.";
  else if ( y < 1800 ) text = "A chapel or a wayside cross for the dead, a name on the land, and stories told at night.";
  else if ( y < 1860 ) text = scale >= 2 ? "A monument stands on the field, and the curious come to walk it." : "A cross and a name; the old folk tell stories of it.";
  else if ( y < 1914 ) text = scale >= 2 ? "A monument and an ossuary; tourists come by rail to walk the field with a guidebook." : "A stone by the road, and a story in the local almanac.";
  else if ( y < 1960 ) text = scale >= 2 ? "A memorial, a small museum and guided walks; schoolchildren are brought each year." : "A plaque, and a line in the guidebooks.";
  else if ( y < 2026 || branch !== "future" ) text = scale >= 2 ? "A visitor centre, re-enactors on the anniversary, and metal detectorists at night." : "A plaque and a footpath; detectorists still find buttons and shot.";
  else text = scale >= 2 ? "A memorial seen through the lens: the battle plays out over the field for anyone with the overlay, sponsored." : "A pin on the map; the ground has been scanned for anything worth selling.";
  return {text, haunted, thinShroud: dead >= 10000, since, where};
}

/** The fields worth remembering, as a small record: {battleId, name, place, year, dead, realm}. */
export const fieldOf = battle => battle?.over ? {battleId: battle.id, name: battle.name, place: battle.place, year: battle.year, dead: deadOf(battle), realm: battle.realm ?? "world"} : null;

/** The old fields of a list of battles for a year, newest first: [{field, echo}]. */
export function oldFields(battles = [], year, opts = {}) {
  return battles.map(fieldOf).filter(f => f && f.realm === "world" && f.year && f.year < n(year) && f.dead >= 10)
    .map(field => ({field, echo: fieldEcho(field, year, opts)})).filter(x => x.echo).sort((a, b) => b.field.year - a.field.year).slice(0, 50);
}

/** A clean aftermath record on a battle: {sent: [{id, ledgerId, driftScene, driftSteps, veil, legend}]}. */
export function normAftermath(a) {
  if ( !a || typeof a !== "object" ) return null;
  const sent = (Array.isArray(a.sent) ? a.sent : []).slice(0, 30).map(s => ({
    id: String(s.id ?? "").slice(0, 40), to: ["ledger", "legend", "drift"].includes(s.to) ? s.to : "ledger",
    ledgerId: String(s.ledgerId ?? "").slice(0, 60), driftScene: String(s.driftScene ?? "").slice(0, 40), driftSteps: Math.max(0, Math.round(n(s.driftSteps))),
    veil: Math.max(0, Math.round(n(s.veil))), legend: String(s.legend ?? "").slice(0, 300)
  })).filter(s => s.id);
  return {sent};
}

/** The Ledger entry for a line sent there, due `days` after `at`. */
export function ledgerEntryFor(line, battle, at = 0) {
  const l = line?.to?.ledger;
  if ( !l ) return null;
  return {id: `field-${battle.id}-${line.id}`.slice(0, 60), kind: l.kind ?? "consequence", what: l.what, made: at, due: at + Math.max(1, n(l.days)) * DAY,
    notes: `After ${battle.name}${battle.place ? ` at ${battle.place}` : ""}.`};
}

/** The Legends book's extra lines for a battle (what was sent there). */
export const legendExtras = battle => (normAftermath(battle?.aftermath)?.sent ?? []).filter(s => s.to === "legend" && s.legend).map(s => s.legend);
