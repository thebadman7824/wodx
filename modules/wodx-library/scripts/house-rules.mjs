/**
 * WoDX Library: household things and tack on the road (B3905; tables in data/goods-house.mjs). No Foundry calls here.
 * roadKit(items): what a character carries for the road, read by WoDX Storyteller's hardship and WoDX Interactables'
 * chase: {cold, heat, saddle, bridle, urge, names: {cold, heat, saddle, bridle, urge}}.
 */
import {WARM, SHADE, TACK} from "../data/goods-house.mjs";

const bare = s => String(s ?? "").toLowerCase().replace(/\s*\(\d+\)\s*$/, "").trim();
const WARM_SET = new Set(WARM), SHADE_SET = new Set(SHADE);

export function roadKit(items = []) {
  const out = {cold: false, heat: false, saddle: false, bridle: false, urge: false, names: {}};
  for ( const i of items ?? [] ) {
    const n = bare(i?.name);
    const set = (k, name) => { out[k] = true; out.names[k] ??= name; };
    if ( WARM_SET.has(n) ) set("cold", i.name);
    if ( SHADE_SET.has(n) ) set("heat", i.name);
    const t = TACK[n];
    if ( t ) for ( const k of ["saddle", "bridle", "urge"] ) if ( t[k] ) set(k, i.name);
  }
  return out;
}

