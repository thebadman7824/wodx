/**
 * WoDX fork: what a recompute actually changed, as a dotted update ("system.x.y": value). The system's after-save
 * recompute used to write the whole actor back; sending only the changed values keeps the save small and leaves
 * the items, effects and flags alone. Arrays count as one value. Pure, so the harness tests it.
 */
const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a, b) => a === b || (typeof a === "object" && typeof b === "object" && JSON.stringify(a) === JSON.stringify(b));

export function systemChanges(before, after, prefix = "system") {
  const out = {};
  const walk = (b, a, path) => {
    for (const k of Object.keys(a ?? {})) {
      const p = `${path}.${k}`, av = a[k], bv = b?.[k];
      if ( isObj(av) && isObj(bv) ) walk(bv, av, p);
      else if ( !same(av, bv) ) out[p] = av;
    }
  };
  walk(before, after, prefix);
  return out;
}
