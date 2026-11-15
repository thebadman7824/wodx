/**
 * How often a power may be used, from the books (B4920-B4924). Pure: no Foundry calls.
 *
 * A limit says how long a use counts ("per"), whether it counts against one target only, and whether only a
 * failed use counts (the books that bar a second try after a failure). The table holds only powers whose own page
 * sets a limit; everything else is free to use as often as its cost allows.
 */

/** How long a use counts. Scenes are counted by the WoDX scene tally (End the scene, or a new active map). */
export const PERIODS = {
  turn: "this turn",
  scene: "this scene",
  night: "tonight",
  day: "today",
  week: "this week",
  month: "this month",
  lunar: "this lunar month",
  story: "this story"
};

const DAY = 86400;

/** The key a use is filed under for its period, from the clock, the fight and the scene tally. */
export function periodKey(per, {worldTime = 0, combat = null, scene = 0} = {}) {
  const t = Number(worldTime) || 0;
  switch (per) {
    case "turn": return combat ? `${combat.id}:${combat.round ?? 0}` : `t${scene}:${Math.floor(t / 6)}`;
    case "scene": return `s${scene}`;
    // A night runs from noon to noon, so the small hours belong to the night before
    case "night": return `n${Math.floor((t - DAY / 2) / DAY)}`;
    case "day": return `d${Math.floor(t / DAY)}`;
    case "week": return `w${Math.floor(t / (7 * DAY))}`;
    case "month": return `m${Math.floor(t / (30 * DAY))}`;
    case "lunar": return `l${Math.floor(t / (29.53 * DAY))}`;
    default: return "story";
  }
}

export const slug = s => String(s ?? "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/[’']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * The limits. name: the power's name (slugged); disc: every power of that Discipline or Art.
 * target: counts against one target only. onFail: only a failed use counts. family: a failure bars every power of
 * that family against the target, not just this one.
 */
export const LIMITS = [
  {name: "tread-upon-the-grave", per: "scene", page: "V20 p. 167; VtDA p. 281", why: "a try at Tread upon the Grave works once a scene in one place"},
  {name: "blood-of-potency", per: "night", page: "V20 p. 214", why: "Blood of Potency works once a night"},
  {name: "vengeance-of-samiel", per: "turn", page: "V20 p. 475", why: "Vengeance of Samiel strikes once a turn"},
  {name: "samiels-vengeance", per: "turn", page: "VtDA p. 264", why: "Samiel's Vengeance strikes once a turn"},
  {disc: "dementation", per: "night", target: true, page: "VtDA p. 213", why: "each level of Dementation works once a night on one victim"},
  {name: "unburden-the-bestial-soul", per: "night", target: true, onFail: true, page: "VtDA p. 261", why: "after a failed try the Salubri cannot try again on that soul until the next night"},
  {name: "compel-soul", per: "night", target: true, onFail: true, family: "necromancy", page: "VtDA p. 287",
    why: "a ghost that beats Compel Soul is safe from all the vampire's Necromancy for the rest of the night"},
  {name: "strength-of-will", per: "scene", page: "W20 p. 172; WtDA p. 127", why: "Strength of Will works once a scene"},
  {name: "fair-fortune", per: "scene", page: "W20 p. 179", why: "Fair Fortune works once a scene"},
  {name: "might-of-thor", per: "scene", page: "W20 p. 181; WtDA p. 133", why: "Might of Thor works once a scene"},
  {name: "exceptional-swordplay", per: "turn", page: "WtDA p. 141", why: "Exceptional Swordplay works once a turn"},
  {name: "armor-of-the-tortoise", per: "scene", page: "W20 Changing Breeds p. 150", why: "Armor of the Tortoise works once a scene"},
  {name: "gift-of-rage", per: "scene", page: "W20 Changing Breeds p. 174", why: "Gift of Rage works once a scene"},
  {name: "lunas-favor", per: "scene", page: "W20 Changing Breeds p. 241", why: "Luna's Favor works once a scene"},
  {name: "shadow-sway", per: "scene", page: "W20 Changing Breeds p. 275", why: "Shadow Sway works once a scene"},
  {name: "renewal", per: "lunar", target: true, page: "C20 p. 227", why: "Renewal works on one target once a lunar month"},
  {name: "purge", disc: "castigate", per: "scene", target: true, page: "Wraith 20th p. 157", why: "a Pardoner may Purge one wraith once a scene"},
  {name: "expose", per: "scene", page: "Hunter: The Reckoning p. 162", why: "Expose works once a scene"},
  {name: "expose-judgment", per: "scene", page: "Hunter: The Reckoning p. 162", why: "Expose works once a scene"},
  {name: "judgment-expose", per: "scene", page: "Hunter: The Reckoning p. 162", why: "Expose works once a scene"}
];

/** The family a power belongs to, for limits that bar a whole family (Necromancy after Compel Soul). */
export function familyOf(power = {}) {
  const d = slug(power.disc ?? power.d ?? "");
  if ( d.startsWith("necromancy") ) return "necromancy";
  return d || null;
}

/** The level from which a power is a great one: the house cooldown and Drained (Ben's Power Limits Desk picks). */
export const GREAT_LEVEL = 5;

/** House rule (B4922): a power of level 5 or more with no limit of its own works once a scene. */
export const HOUSE = {per: "scene", house: true, page: "WoDX house rule", why: "a power of the fifth level or higher works once a scene"};

/** The power's level, from whatever the line's record calls it. */
export const levelOf = (power = {}) => Number(power.level ?? power.l ?? power.lvl ?? 0) || 0;

/** The limit for a power, by name first, then by its Discipline or Art, then the house rule for great powers. */
export function limitOf(power = {}) {
  const n = slug(power.name ?? power.n ?? "");
  const d = slug(power.disc ?? power.d ?? "");
  if ( !n && !d ) return null;
  return LIMITS.find(l => l.name && l.name === n && (!l.disc || d.startsWith(l.disc)))
    ?? LIMITS.find(l => !l.name && l.disc && d.startsWith(l.disc))
    ?? (levelOf(power) >= GREAT_LEVEL ? HOUSE : null);
}

/** Drained (B4923, house rule): +1 difficulty on the bearer's own rolls for the rest of the scene after a great power ends. */
export const DRAINED = {id: "drained", name: "Drained", img: "icons/svg/degen.svg", source: "WoDX house rule",
  summary: "+1 difficulty on own rolls until the scene ends, after a power of the fifth level or higher", mods: {ownDiff: 1}};
export const drains = (power = {}) => levelOf(power) >= GREAT_LEVEL;

/** The key a power's uses are filed under: one key per power, a whole Discipline sharing it per level. */
export const useKey = (power = {}) => slug(power.name ?? power.n ?? "") || slug(power.disc ?? power.d ?? "");

/**
 * Whether a use is allowed now. uses: the actor's filed uses {key: [{p, t, fail, fam}]}. targets: target uuids.
 * Returns {ok, why, barred: [uuid]}; with a per-target limit only the barred targets are refused.
 */
export function check(uses = {}, power = {}, ctx = {}, targets = []) {
  const out = {ok: true, why: "", barred: []};
  // A family bar (Compel Soul lost) holds whatever power of the family is used
  const fam = familyOf(power);
  if ( fam ) {
    for ( const list of Object.values(uses) ) for ( const u of list ?? [] ) {
      if ( u.fam !== fam || !u.fail || !u.t || u.p !== periodKey("night", ctx) ) continue;
      if ( targets.includes(u.t) && !out.barred.includes(u.t) ) out.barred.push(u.t);
      out.why ||= u.why ?? "";
    }
  }
  const lim = limitOf(power);
  if ( lim ) {
    const p = periodKey(lim.per, ctx), list = (uses[useKey(power)] ?? []).filter(u => u.p === p && (!lim.onFail || u.fail));
    if ( lim.target ) {
      for ( const t of targets ) if ( list.some(u => u.t === t) && !out.barred.includes(t) ) out.barred.push(t);
    } else if ( list.length ) {
      out.ok = false;
      out.why = `${cap(lim.why)} (${lim.page}): already used ${PERIODS[lim.per]}.`;
      return out;
    }
    if ( out.barred.length ) out.why = `${cap(lim.why)} (${lim.page}).`;
  }
  if ( out.barred.length && out.barred.length >= targets.length ) out.ok = false;
  return out;
}

const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

/**
 * File a use. Returns the new uses object (old periods dropped). fail: the use failed (or the target won).
 * A use with a family bar files the family so check() can refuse the rest of it.
 */
export function record(uses = {}, power = {}, ctx = {}, {targets = [], fail = false} = {}) {
  const lim = limitOf(power), key = useKey(power);
  const fam = lim?.family && fail ? lim.family : null;
  if ( !lim || !key ) return uses;
  const p = periodKey(lim.per, ctx);
  const next = {...uses};
  const kept = (next[key] ?? []).filter(u => u.p === p || u.fam);
  const add = (lim.target ? (targets.length ? targets : [null]) : [null])
    .map(t => ({p, t, fail: !!fail, ...(fam ? {fam, why: `${cap(lim.why)} (${lim.page}).`} : {})}));
  next[key] = [...kept, ...add].slice(-40);
  return next;
}

/** Drop uses whose period has passed, so the flag stays small. Story uses stay until the Storyteller clears them. */
export function prune(uses = {}, ctx = {}) {
  const out = {};
  for ( const [k, list] of Object.entries(uses) ) {
    const keep = (list ?? []).filter(u => {
      if ( u.p === "story" ) return true;
      const per = {t: "turn", s: "scene", n: "night", d: "day", w: "week", m: "month", l: "lunar"}[String(u.p)[0]];
      if ( u.fam ) return u.p === periodKey("night", ctx);
      return per ? u.p === periodKey(per, ctx) : true;
    });
    if ( keep.length ) out[k] = keep;
  }
  return out;
}
