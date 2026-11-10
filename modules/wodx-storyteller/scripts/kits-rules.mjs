/**
 * Scene kits, quick extras by era and downtime requests. No Foundry in this file.
 *
 *   A scene kit is a saved scene start: the scene, time that passes first, the music mood, the opening card, who is
 *   called to it. Running it does each step the modules on can do, in order, and skips the rest.
 *
 *   Quick extras are light Storyteller characters with only what a roll needs. The numbers are a draft by the usual
 *   spread of a trained mortal (2 to 3 in what the role does) until each book's ready-made characters are checked.
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

/** Era groups: before the gun (to 1600) and after. Each template: attributes, the abilities its rolls use, a weapon. */
export const EXTRAS = [
  {key: "watch", label: "Town watchman", eras: "early", attrs: A(3, 2, 3, 2, 2, 2, 3, 2, 2), abilities: {alertness: 2, brawl: 2, melee: 2, intimidation: 1, athletics: 1}, weapon: {name: "Spear or club", damage: "Strength + 2", kind: "lethal"}, willpower: 4},
  {key: "manatarms", label: "Man-at-arms", eras: "early", attrs: A(3, 3, 3, 2, 2, 2, 2, 2, 3), abilities: {melee: 3, brawl: 2, dodge: 2, alertness: 2, athletics: 2, ride: 1}, weapon: {name: "Sword", damage: "Strength + 2", kind: "lethal"}, armor: 2, willpower: 5},
  {key: "bandit", label: "Bandit", eras: "early", attrs: A(3, 3, 2, 2, 2, 2, 2, 2, 3), abilities: {melee: 2, brawl: 2, stealth: 2, alertness: 2, archery: 1}, weapon: {name: "Knife or axe", damage: "Strength + 1", kind: "lethal"}, willpower: 3},
  {key: "peasant", label: "Angry villager", eras: "early", attrs: A(2, 2, 3, 1, 1, 2, 2, 1, 2), abilities: {brawl: 1, melee: 1, alertness: 1}, weapon: {name: "Pitchfork or cudgel", damage: "Strength + 1", kind: "bashing"}, willpower: 3},
  {key: "police", label: "Police officer", eras: "late", attrs: A(2, 3, 3, 2, 2, 2, 3, 2, 3), abilities: {alertness: 2, brawl: 2, firearms: 2, drive: 2, intimidation: 2, investigation: 1}, weapon: {name: "Pistol", damage: "4", kind: "lethal"}, armor: 0, willpower: 5},
  {key: "thug", label: "Street thug", eras: "late", attrs: A(3, 2, 3, 2, 2, 2, 2, 2, 2), abilities: {brawl: 3, melee: 2, streetwise: 2, intimidation: 2, firearms: 1}, weapon: {name: "Knife", damage: "Strength + 1", kind: "lethal"}, willpower: 3},
  {key: "guard", label: "Security guard", eras: "late", attrs: A(3, 2, 3, 2, 2, 2, 3, 2, 2), abilities: {alertness: 3, brawl: 2, firearms: 1, security: 2}, weapon: {name: "Nightstick", damage: "Strength + 1", kind: "bashing"}, willpower: 4},
  {key: "soldier", label: "Soldier", eras: "late", attrs: A(3, 3, 3, 2, 2, 2, 3, 2, 3), abilities: {firearms: 3, brawl: 2, dodge: 2, alertness: 2, athletics: 2, survival: 1}, weapon: {name: "Rifle", damage: "8", kind: "lethal"}, armor: 2, willpower: 5},
  {key: "ghoul", label: "Ghoul servant", eras: "any", attrs: A(3, 2, 3, 2, 2, 2, 2, 2, 2), abilities: {brawl: 2, melee: 2, alertness: 2, intimidation: 1}, weapon: {name: "Fists or a blade", damage: "Strength + 1", kind: "lethal"}, willpower: 4, blood: 3},
  {key: "dog", label: "Guard dog", eras: "any", attrs: A(2, 3, 3, 1, 1, 1, 3, 1, 3), abilities: {brawl: 2, alertness: 3, athletics: 2, dodge: 1}, weapon: {name: "Bite", damage: "Strength + 1", kind: "lethal"}, willpower: 3, animal: true},
  {key: "wolf", label: "Wolf", eras: "any", attrs: A(3, 3, 3, 1, 1, 1, 3, 1, 3), abilities: {brawl: 3, alertness: 3, athletics: 2, stealth: 2, survival: 3}, weapon: {name: "Bite", damage: "Strength + 1", kind: "lethal"}, willpower: 3, animal: true}
];

/** The templates for a year: early ones before 1600, late ones from 1600 (when firearms are on the sheet by default), "any" always. */
export function extrasFor(year) {
  const y = Number(year);
  const early = Number.isFinite(y) ? y < 1600 : true;
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
    flags: {"wodx-storyteller": {extra: {key: tpl.key, weapon: tpl.weapon, armor: tpl.armor ?? 0, animal: !!tpl.animal}}}};
}

/** A line for the extra's card: the pools a Storyteller rolls most. */
export function extraSummary(tpl) {
  const p = (a, b) => poolOn(tpl, a, b);
  const atk = Math.max(p("dexterity", "brawl"), p("dexterity", "melee"), p("dexterity", "firearms"), p("dexterity", "archery"));
  return `Attack ${atk}, Notice ${p("perception", "alertness")}, Dodge ${p("dexterity", "dodge")}, Soak ${num(tpl.attrs.stamina) + num(tpl.armor)}; ${tpl.weapon.name} ${tpl.weapon.damage} ${tpl.weapon.kind}; Willpower ${tpl.willpower}`;
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
