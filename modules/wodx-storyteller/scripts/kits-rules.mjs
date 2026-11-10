/**
 * Scene kits, quick extras by era and downtime requests. No Foundry in this file.
 *
 *   A scene kit is a saved scene start: the scene, time that passes first, the music mood, the opening card, who is
 *   called to it. Running it does each step the modules on can do, in order, and skips the rest.
 *
 *   Quick extras are light Storyteller characters with only what a roll needs. Every extra uses the optional rule for
 *   nameless characters: four health levels, Hurt -1, Maimed -3, Incapacitated, Dead (V20 p. 284, pdf 292; V20 Dark
 *   Ages p. 351, pdf 352). Mortals soak bashing with Stamina and soak lethal only with armor (V20 p. 285, pdf 293;
 *   V20 Dark Ages p. 345, pdf 346); ghouls soak lethal too (V20 Dark Ages p. 400, pdf 401).
 *   Animals are the books' own stat blocks. Neither book has ready-made guards, thugs, police or soldiers, so the
 *   people are a house rule: a trained mortal with 2 to 3 in what the role does, armed from the weapon charts.
 *   W20 prints no Kinfolk stat blocks (only Kinfolk creation, pdf 381 on), so Kinfolk extras are built as mortals.
 */

const str = (v, n = 120) => String(v ?? "").trim().slice(0, n);
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const int = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(num(v))));

/* ---- Scene kits ---- */

export const MOODS = ["", "calm", "tension", "combat", "sorrow", "wonder", "frenzy"];
export const PULL = {none: "Nobody: only the Storyteller goes there", all: "Everyone (the scene becomes the active one)", called: "Only the characters called below"};

export function normKit(k = {}) {
  return {
    id: str(k.id, 40), name: str(k.name, 80) || "A scene", sceneId: str(k.sceneId, 40),
    minutes: int(k.minutes, 0, 60 * 24 * 7), mood: MOODS.includes(k.mood) ? k.mood : "",
    opening: k.opening === undefined ? true : !!k.opening, pull: PULL[k.pull] ? k.pull : "all",
    actorIds: [...new Set((Array.isArray(k.actorIds) ? k.actorIds : []).map(String))].slice(0, 20),
    reason: str(k.reason, 300), note: str(k.note, 500)
  };
}
export const normKits = list => (Array.isArray(list) ? list : []).map(normKit).filter(k => k.id && k.sceneId);

/** The steps a kit takes, in order, given which modules are on. */
export function kitSteps(kit, have = {}) {
  const k = normKit(kit), out = [];
  if ( k.minutes ) out.push({key: "clock", label: `Move the clock ${k.minutes} minutes`});
  if ( k.pull === "all" ) out.push({key: "activate", label: "Make the scene the active one (everyone goes)"});
  else out.push({key: "view", label: "Go to the scene yourself"});
  if ( k.pull === "called" && k.actorIds.length ) out.push({key: "convene", label: `Call ${k.actorIds.length} character${k.actorIds.length === 1 ? "" : "s"} to it`});
  if ( k.mood && have.atmosphere ) out.push({key: "mood", label: `Play the ${k.mood} music`});
  if ( k.opening && have.atmosphere ) out.push({key: "opening", label: "Show the opening card"});
  if ( k.note ) out.push({key: "note", label: "Show your note"});
  return out;
}

/* ---- Quick extras ---- */

const A = (str_, dex, sta, cha, man, app, per, int_, wit) => ({strength: str_, dexterity: dex, stamina: sta, charisma: cha, manipulation: man, appearance: app, perception: per, intelligence: int_, wits: wit});

export const EXTRA_HEALTH = "Hurt -1, Maimed -3, Incapacitated, Dead";
const DA_WEAPONS = "V20 Dark Ages p. 349 (pdf 350)";
const V20_WEAPONS = "V20 pp. 280-281 (pdf 288-289)";
const HOUSE = "House rule: no ready-made one in the books";

/**
 * Era groups: early (before 1600, V20 Dark Ages) and late (V20), "any" for both.
 * Each template: attributes, the abilities its rolls use, a weapon, Willpower, and where the numbers come from.
 * Animals: the social Attributes are not in the books' blocks and are set to 1; their health levels are the book's.
 */
export const EXTRAS = [
  {key: "watch", label: "Town watchman", eras: "early", attrs: A(3, 2, 3, 2, 2, 2, 3, 2, 2), abilities: {alertness: 2, brawl: 2, melee: 2, intimidation: 1, athletics: 1}, weapon: {name: "Spear", damage: "Strength + 2", kind: "lethal"}, willpower: 4, ref: `${HOUSE}; weapon ${DA_WEAPONS}`},
  {key: "manatarms", label: "Man-at-arms", eras: "early", attrs: A(3, 3, 3, 2, 2, 2, 2, 2, 3), abilities: {melee: 3, brawl: 2, dodge: 2, alertness: 2, athletics: 2, ride: 1}, weapon: {name: "Broadsword", damage: "Strength + 2", kind: "lethal"}, armor: 2, willpower: 5, ref: `${HOUSE}; weapon ${DA_WEAPONS}`},
  {key: "bandit", label: "Bandit", eras: "early", attrs: A(3, 3, 2, 2, 2, 2, 2, 2, 3), abilities: {melee: 2, brawl: 2, stealth: 2, alertness: 2, archery: 1}, weapon: {name: "Dagger", damage: "Strength + 1", kind: "lethal"}, willpower: 3, ref: `${HOUSE}; weapon ${DA_WEAPONS}`},
  {key: "peasant", label: "Angry villager", eras: "early", attrs: A(2, 2, 3, 1, 1, 2, 2, 1, 2), abilities: {brawl: 1, melee: 1, alertness: 1}, weapon: {name: "Club", damage: "Strength + 2", kind: "bashing"}, willpower: 3, ref: `${HOUSE}; weapon ${DA_WEAPONS}`},
  {key: "police", label: "Police officer", eras: "late", attrs: A(2, 3, 3, 2, 2, 2, 3, 2, 3), abilities: {alertness: 2, brawl: 2, firearms: 2, drive: 2, intimidation: 2, investigation: 1}, weapon: {name: "Light pistol", damage: "4", kind: "lethal"}, armor: 0, willpower: 5, ref: `${HOUSE}; weapons ${V20_WEAPONS}`},
  {key: "thug", label: "Street thug", eras: "late", attrs: A(3, 2, 3, 2, 2, 2, 2, 2, 2), abilities: {brawl: 3, melee: 2, streetwise: 2, intimidation: 2, firearms: 1}, weapon: {name: "Knife", damage: "Strength + 1", kind: "lethal"}, willpower: 3, ref: `${HOUSE}; weapons ${V20_WEAPONS}`},
  {key: "guard", label: "Security guard", eras: "late", attrs: A(3, 2, 3, 2, 2, 2, 3, 2, 2), abilities: {alertness: 3, brawl: 2, firearms: 1, security: 2}, weapon: {name: "Nightstick (as a club)", damage: "Strength + 2", kind: "bashing"}, willpower: 4, ref: `${HOUSE}; weapons ${V20_WEAPONS}`},
  {key: "soldier", label: "Soldier", eras: "late", attrs: A(3, 3, 3, 2, 2, 2, 3, 2, 3), abilities: {firearms: 3, brawl: 2, dodge: 2, alertness: 2, athletics: 2, survival: 1}, weapon: {name: "Rifle", damage: "8", kind: "lethal"}, armor: 2, willpower: 5, ref: `${HOUSE}; weapons ${V20_WEAPONS}`},
  {key: "ghoul", label: "Ghoul servant", eras: "any", attrs: A(3, 2, 3, 2, 2, 2, 2, 2, 2), abilities: {brawl: 2, melee: 2, alertness: 2, intimidation: 1}, weapon: {name: "Fists or a blade", damage: "Strength + 1", kind: "lethal"}, willpower: 4, blood: 3, soakLethal: true, ref: `${HOUSE}; ghoul rules V20 p. 497 (pdf 505), V20 Dark Ages p. 400 (pdf 401)`},
  // V20 Dark Ages animals (pp. 397-399, pdf 398-400)
  {key: "dog_small_da", label: "Small dog", eras: "early", attrs: A(2, 3, 2, 1, 1, 1, 3, 1, 3), abilities: {alertness: 3, athletics: 3, brawl: 1}, weapon: {name: "Bite", damage: "2", kind: "bashing"}, willpower: 3, animal: true, health: "OK, -1, -5, Incapacitated", ref: "V20 Dark Ages p. 397 (pdf 398)"},
  {key: "dog_da", label: "Hound (greyhound)", eras: "early", attrs: A(3, 3, 3, 1, 1, 1, 3, 2, 3), abilities: {alertness: 3, athletics: 3, brawl: 2, survival: 3}, weapon: {name: "Bite 3, claw 2", damage: "3", kind: "bashing"}, willpower: 3, animal: true, health: "OK, -1, -1, -2, -5, Incapacitated", ref: "V20 Dark Ages p. 398 (pdf 399)"},
  {key: "wolf_da", label: "Wolf", eras: "early", attrs: A(3, 3, 3, 1, 1, 1, 3, 2, 3), abilities: {alertness: 2, athletics: 1, brawl: 3, stealth: 2}, weapon: {name: "Bite 4, claw 4", damage: "4", kind: "lethal"}, willpower: 3, animal: true, health: "OK, -1, -1, -3, -5, Incapacitated", ref: "V20 Dark Ages p. 399 (pdf 400)"},
  // V20 animals (pp. 389-391, pdf 397-399)
  {key: "dog_small", label: "Small dog", eras: "late", attrs: A(1, 3, 2, 1, 1, 1, 3, 1, 3), abilities: {alertness: 3, athletics: 3}, weapon: {name: "Bite", damage: "2", kind: ""}, willpower: 3, animal: true, health: "OK, -1, -5", ref: "V20 p. 389 (pdf 397)"},
  {key: "dog", label: "Dog", eras: "late", attrs: A(2, 3, 3, 1, 1, 1, 3, 2, 3), abilities: {alertness: 3, athletics: 3, survival: 3}, weapon: {name: "Bite 3, claw 2", damage: "3", kind: ""}, willpower: 3, animal: true, health: "OK, -1, -1, -2, -5, Incapacitated", ref: "V20 p. 389 (pdf 397)"},
  {key: "dog_large", label: "Guard dog (large)", eras: "late", attrs: A(4, 3, 3, 1, 1, 1, 3, 2, 3), abilities: {alertness: 3, athletics: 3, brawl: 3, survival: 3}, weapon: {name: "Bite 5, claw 4", damage: "5", kind: ""}, willpower: 5, animal: true, health: "OK, -1, -1, -2, -2, -5, Incapacitated", ref: "V20 p. 390 (pdf 398)"},
  {key: "wolf", label: "Wolf", eras: "late", attrs: A(3, 3, 3, 1, 1, 1, 3, 2, 3), abilities: {alertness: 2, athletics: 1, brawl: 3, stealth: 2}, weapon: {name: "Bite 4, claw 4", damage: "4", kind: ""}, willpower: 3, animal: true, health: "OK, -1, -1, -3, -5, Incapacitated", ref: "V20 p. 391 (pdf 399)"}
];

/** The templates for a year: early ones before 1600, late ones from 1600 (when firearms are on the sheet by default), "any" always. */
export function extrasFor(year) {
  const y = Number(year);
  const early = Number.isFinite(y) && year !== null && year !== "" ? y < 1600 : true;
  return EXTRAS.filter(e => e.eras === "any" || (early ? e.eras === "early" : e.eras === "late"));
}

/** The dice for an Attribute + Ability on a template. */
export const poolOn = (tpl, attr, ability) => num(tpl?.attrs?.[attr]) + num(tpl?.abilities?.[ability]);

/** Plain actor data for a template (the fields the worldofdarkness system reads), named "label n". */
export function extraActorData(tpl, {n = 1, type = "Mortal", folder = null} = {}) {
  const system = {attributes: {}, abilities: {}, advantages: {willpower: {permanent: tpl.willpower ?? 3, temporary: tpl.willpower ?? 3}}};
  for ( const [k, v] of Object.entries(tpl.attrs) ) system.attributes[k] = {value: v};
  for ( const [k, v] of Object.entries(tpl.abilities) ) system.abilities[k] = {value: v, isvisible: true};
  if ( tpl.blood ) system.advantages.bloodpool = {temporary: tpl.blood, max: tpl.blood};
  return {name: `${tpl.label}${n > 1 ? ` ${n}` : ""}`, type, folder, system,
    prototypeToken: {actorLink: false, name: tpl.label, disposition: -1},
    flags: {"wodx-storyteller": {extra: {key: tpl.key, weapon: tpl.weapon, armor: tpl.armor ?? 0, animal: !!tpl.animal, health: tpl.health ?? EXTRA_HEALTH, ref: tpl.ref ?? ""}}}};
}

/** A line for the extra's card: the pools a Storyteller rolls most, soak, health and the weapon. */
export function extraSummary(tpl) {
  const p = (a, b) => poolOn(tpl, a, b);
  const atk = Math.max(p("dexterity", "brawl"), p("dexterity", "melee"), p("dexterity", "firearms"), p("dexterity", "archery"));
  const soak = num(tpl.attrs.stamina) + num(tpl.armor);
  const soakText = tpl.animal || tpl.soakLethal ? `Soak ${soak}` : `Soak ${soak} bashing${tpl.armor ? `, ${num(tpl.armor)} lethal from armor` : ", none against lethal"}`;
  const dmg = `${tpl.weapon.name}${tpl.animal ? ` (damage ${tpl.weapon.damage}${tpl.weapon.kind ? ` ${tpl.weapon.kind}` : ""})` : ` ${tpl.weapon.damage} ${tpl.weapon.kind}`}`;
  return `Attack ${atk}, Notice ${p("perception", "alertness")}, Dodge ${p("dexterity", "dodge")}, ${soakText}; ${dmg}; Willpower ${tpl.willpower}; health ${tpl.health ?? EXTRA_HEALTH}`;
}

/* ---- Downtime requests ---- */

export const DOWNTIME_KINDS = {
  feed: "Hunt or feed", study: "Study or train", visit: "Visit someone", influence: "Work influence or contacts",
  craft: "Make or mend something", letters: "Write letters", travel: "Travel", other: "Something else"
};

export function normDowntime(d = {}) {
  return {actorId: str(d.actorId, 40), kind: DOWNTIME_KINDS[d.kind] ? d.kind : "other", what: str(d.what, 1000),
    nights: int(d.nights || 1, 1, 60), userId: str(d.userId, 40)};
}

/** The queue's title for a request. */
export const downtimeTitle = (d, name) => `Downtime: ${name || "a character"}, ${DOWNTIME_KINDS[d.kind].toLowerCase()} (${d.nights} night${d.nights === 1 ? "" : "s"})`;
