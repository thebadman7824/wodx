/**
 * B6779f: the dots a change leaves to spend (the Chrysalis, the Fall, the Second Breath, the death into a wraith) are
 * read by Spend experience. Each change writes flags["wodx-creation"][change].toSpend; a dot from a pool raises one
 * matching trait by one at no experience cost and takes one from the pool. Pools with nothing on the sheet to buy
 * (a wraith's Passions and Fetters, the Shadow's points) are counted down by hand.
 *
 *   match(option)  which purchase options (actor-data.mjs purchaseOptions, or a new power) the pool pays for
 */
const isPower = cat => o => (o.kind === "power" || o.kind === "newPower") && o.cat === cat;
export const POOLS = {
  chrysalis: {label: "the Chrysalis", pools: {
    arts: {label: "Arts", match: isPower("art")},
    realms: {label: "Realms", match: isPower("realm")}}},
  fallen: {label: "the Fall", pools: {
    virtues: {label: "Virtues", match: o => o.kind === "virtue"},
    lore: {label: "Lore", match: isPower("lore")}}},
  secondBreath: {label: "the Second Breath", pools: {
    chi: {label: "Yin or Yang", match: o => o.kind === "stat" && (o.key === "yin" || o.key === "yang")},
    disciplines: {label: "Disciplines", match: o => o.kind === "discipline" || o.kind === "newDiscipline"}}},
  wraith: {label: "the death", pools: {
    arcanoi: {label: "Arcanoi", match: isPower("arcanos")},
    backgrounds: {label: "Backgrounds"},
    passions: {label: "Passions"},
    fetters: {label: "Fetters"},
    darkPassions: {label: "Dark Passions (the Shadow)"},
    shadowFreebies: {label: "the Shadow's freebie points"}}}
};

const n = v => Math.max(0, Math.floor(Number(v) || 0));

/** Every pool with dots left: [{change, pool, label, from, left, byHand}]. flags is flags["wodx-creation"]. */
export function changePools(flags = {}) {
  const out = [];
  for ( const [change, c] of Object.entries(POOLS) ) {
    const left = flags?.[change]?.toSpend;
    if ( !left || typeof left !== "object" ) continue;
    for ( const [pool, p] of Object.entries(c.pools) ) {
      if ( n(left[pool]) > 0 ) out.push({change, pool, label: p.label, from: c.label, left: n(left[pool]), byHand: !p.match});
    }
  }
  return out;
}

/** The pool that pays for this option, or null. */
export function poolFor(option, flags = {}) {
  if ( !option ) return null;
  for ( const p of changePools(flags) ) if ( !p.byHand && POOLS[p.change].pools[p.pool].match(option) ) return p;
  return null;
}

/**
 * The option as a dot from a pool: cost 0, allowed unless the trait is at its most, blocked or being learned.
 * Returns null when no pool pays for it.
 */
export function asChangeDot(option, flags = {}) {
  const p = poolFor(option, flags);
  if ( !p ) return null;
  const money = /^Needs \d+ experience/.test(String(option.reason ?? ""));
  const ok = option.ok || money;
  return {...option, cost: 0, ok, reason: ok ? "" : option.reason, fromChange: {change: p.change, pool: p.pool}};
}

/** The flag update that takes one dot from a pool: [path, value], or null when it is empty. */
export function takeOne(flags = {}, {change, pool} = {}) {
  const left = n(flags?.[change]?.toSpend?.[pool]);
  if ( !left || !POOLS[change]?.pools?.[pool] ) return null;
  return [`${change}.toSpend.${pool}`, left - 1];
}
