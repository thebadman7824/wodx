/**
 * WoDX Actions: demonic pacts, infernal investments and the Supplicium, from the Dark Ages Companion (2002) chapter 7
 * (B7696). Pure, no Foundry; infernal.js is the Foundry side.
 *
 *  - A pact is rated 1 to 10 by the service the demon asks (p. 176). Its rating is points the infernalist spends on
 *    investments, each costed in pact points (pp. 175-177).
 *  - Transformations (pp. 176-177): Armor, Claws, Flame, Flight, Limbs, Poison, each with its extras.
 *  - Attributes (new level + 2), Abilities (new level + 1), Disciplines (new level + 3), a single power (its level + 1),
 *    Dark Thaumaturgy (one level a pact), life (one point a year, mortals), servants (1) and bound demons (2) (p. 177).
 *    A trait rises only one level for each pact.
 *  - Each pact, each new level of Dark Thaumaturgy and each investment brings a Supplicium (p. 165): if the demon
 *    prevails, a Road point is lost with no remorse roll; at 0 the character falls to the Via Diabolis at 1 (WoDX: the
 *    Road of Sin, Path of the Devil). On the Via Diabolis, a fall to 0 brings a last Supplicium: lost, the soul goes to
 *    the Pit and the demon takes the body; won, the Via comes back to 1 (pp. 165-166).
 *  - An infernal site adds 1 to 5 dice to infernal actions (p. 166).
 */
export const BOOK = "Dark Ages Companion (2002)";
export const page = p => `DAC 2002 p. ${p}`;

/** Pact ratings (p. 176): the name and the kind of service, in WoDX's words. */
export const PACTS = [
  null,
  { name: "Malice", service: "a small task that mostly adds to the burden of sin" },
  { name: "Cruelty", service: "a petty or personal act, such as corrupting one person" },
  { name: "Immorality", service: "any deed that calls for a degeneration check" },
  { name: "Wrongdoing", service: "spreading evil or defying the Church's authority" },
  { name: "Corruption", service: "leading others into evil, or killing a great enemy of Hell such as a knight of true faith" },
  { name: "Sin", service: "founding and leading a coven, or dedicating a place to corruption" },
  { name: "Heresy", service: "undoing the Church's work and spreading riot across a wide land" },
  { name: "Supreme Task", service: "corrupting a city, turning a cathedral to evil, or a heresy that lasts ten years" },
  { name: "Life Boon", service: "a whole life given to the demon's service" },
  { name: "Soul Pact", service: "fealty and the soul on death; the demon takes no further pact after it" }
];

/**
 * The investments. cost: pact points; repeat: may be taken again; extras: optional add-ons with their own cost.
 * body: the lasting change WoDX Storyteller records (the body plan in WoDX Combat reads it).
 */
export const INVESTMENTS = {
  armor: { label: "Armor", cost: 1, repeat: true, p: 176, body: "infernalArmor",
    does: "Scales, fur or plates: +1 soak die against bashing and lethal for each time taken; every third time costs a point of Appearance for good" },
  claws: { label: "Claws", cost: 1, p: 177, body: "infernalClaws", extras: { retract: { label: "Retractable", cost: 1 } },
    does: "Lasting claws that strike for Strength + 2" },
  flame: { label: "Flame", cost: 3, p: 177, extras: { hotter: { label: "One more health level", cost: 2, repeat: true } },
    does: "Breathes fire or acid: three aggravated health levels, dodged against Dexterity + Occult" },
  flight: { label: "Flight", cost: 3, p: 177, body: "wings", extras: { barbed: { label: "Barbed wings", cost: 1 } },
    does: "Leathery wings: flies for as many turns as Strength; barbed wings strike as claws (Strength + 2)" },
  limbs: { label: "Limbs", cost: 2, repeat: true, p: 177, body: "infernalLimb",
    does: "An extra arm, tentacle or tail: one more attack a turn without splitting the pool, each extra attack at +1 difficulty" },
  poison: { label: "Poison", cost: 1, p: 177, extras: { sacs: { label: "Poison sacs", cost: 1 } },
    does: "Blood that does five soakable health levels to whoever drinks it (a soak roll for each blood point); with sacs, claws or a bite carry it" }
};

/** Pact points to raise a trait to `to` (p. 177). */
export const costOf = {
  attribute: to => to + 2,
  ability: to => to + 1,
  discipline: to => to + 3,
  power: level => level + 1,
  life: years => Math.max(1, Math.trunc(years)),
  servant: () => 1,
  boundDemon: () => 2
};

/** The points a pact leaves, given what was bought from it. pact: {rating, spent: [{cost}]} */
export const pointsLeft = pact => Math.max(0, (Number(pact?.rating) || 0) - (pact?.spent ?? []).reduce((s, x) => s + (Number(x.cost) || 0), 0));

/**
 * Can this be bought from this pact? buy: {kind, key, to, from, extra, years}. owned: investments the character has
 * ({key: count, "key.extra": count}). Returns {ok, cost, why}.
 */
export function canBuy(pact, buy, owned = {}) {
  if ( !pact ) return { ok: false, cost: 0, why: "No pact to spend" };
  const left = pointsLeft(pact);
  let cost = 0;
  const raised = (pact.spent ?? []).some(x => x.kind === buy.kind && x.key === buy.key && ["attribute", "ability", "discipline", "darkThaum"].includes(buy.kind));
  switch ( buy.kind ) {
    case "investment": {
      const I = INVESTMENTS[buy.key];
      if ( !I ) return { ok: false, cost: 0, why: "No such investment" };
      if ( buy.extra ) {
        const X = I.extras?.[buy.extra];
        if ( !X ) return { ok: false, cost: 0, why: "No such extra" };
        if ( !(owned[buy.key] > 0) ) return { ok: false, cost: X.cost, why: `${X.label} needs ${I.label} first` };
        if ( !X.repeat && owned[`${buy.key}.${buy.extra}`] > 0 ) return { ok: false, cost: X.cost, why: `${X.label} is already taken` };
        cost = X.cost;
      } else {
        if ( !I.repeat && owned[buy.key] > 0 ) return { ok: false, cost: I.cost, why: `${I.label} is already taken` };
        cost = I.cost;
      }
      break;
    }
    case "attribute": case "ability": case "discipline": {
      if ( (Number(buy.to) || 0) !== (Number(buy.from) || 0) + 1 ) return { ok: false, cost: 0, why: "A trait rises one level for each pact" };
      if ( buy.to > 5 ) return { ok: false, cost: 0, why: "Already at 5" };
      cost = costOf[buy.kind](buy.to);
      break;
    }
    case "power": cost = costOf.power(Number(buy.to) || 1); break;
    case "darkThaum": {
      if ( (Number(buy.to) || 0) !== (Number(buy.from) || 0) + 1 ) return { ok: false, cost: 0, why: "Dark Thaumaturgy rises one level for each pact" };
      cost = Number(buy.to) || 1;
      break;
    }
    case "life": cost = costOf.life(buy.years); break;
    case "servant": cost = 1; break;
    case "boundDemon": cost = 2; break;
    default: return { ok: false, cost: 0, why: "Unknown purchase" };
  }
  if ( raised ) return { ok: false, cost, why: "This pact has already raised that trait" };
  if ( cost > left ) return { ok: false, cost, why: `Costs ${cost}, the pact has ${left} left` };
  return { ok: true, cost, why: "" };
}

/** What the Armor investment gives, taken `times`: soak dice and the Appearance it has cost. */
export const armorOf = times => ({ soak: Math.max(0, times), appearanceLost: Math.floor(Math.max(0, times) / 3) });

/** The Flame's harm: 3 aggravated levels and one more for each "hotter" extra. */
export const flameLevels = hotter => 3 + Math.max(0, Number(hotter) || 0);

/**
 * The Supplicium's outcome when the demon prevails. state: {rating, devil (already on the Via Diabolis)}.
 * Returns {rating, fall: bool (to the Via Diabolis), final: bool (the last Supplicium is due)}.
 */
export function suppliciumLost(state = {}) {
  const r = Math.max(0, (Number(state.rating) || 0) - 1);
  if ( r > 0 ) return { rating: r, fall: false, final: false };
  if ( !state.devil ) return { rating: 1, fall: true, final: false };
  return { rating: 0, fall: false, final: true };
}

/** The last Supplicium (p. 166): won, the Via comes back to 1; lost, the soul is taken and the demon has the body. */
export const finalSupplicium = won => won ? { rating: 1, damned: false } : { rating: 0, damned: true };

/** Is this Road and Path the Via Diabolis as WoDX reads it? road: {key, path} */
export const onViaDiabolis = road => road?.key === "sin" && /devil/i.test(String(road?.path ?? ""));

/** An infernal site's dice (p. 166): a faint one 1, a hideous altar used each midnight 5. */
export const siteDice = level => Math.min(5, Math.max(0, Math.trunc(Number(level) || 0)));
