/**
 * Writes tools/mapgen/country.json from the Storyteller's country map, so the map generators (Python) stand on the
 * same ground a trip crosses. Run after any change to modules/wodx-storyteller/data/country.mjs:
 *   node tools/mapgen/export_country.mjs
 * The harness (country.test.mjs) fails when the file is out of date.
 */
import {writeFileSync} from "node:fs";
import * as C from "../../modules/wodx-storyteller/scripts/country-rules.mjs";
import * as D from "../../modules/wodx-storyteller/data/country.mjs";

export function build() {
  const g = C.grid();
  const names = [...new Set(g.landName.filter(Boolean))], rivers = [...new Set(g.riverName.filter(Boolean))];
  const rows = (f) => Array.from({length: g.rows}, (_, r) => Array.from({length: g.cols}, (_, c) => f((r * g.cols) + c)).join(""));
  return {format: "wodx-country", version: 1, bounds: D.BOUNDS, cols: g.cols, rows: g.rows, lands: C.LANDS, landNames: names, riverNames: rivers,
    land: rows(i => g.land[i]), river: rows(i => g.river[i]),
    landName: rows(i => (g.landName[i] ? String.fromCharCode(65 + names.indexOf(g.landName[i])) : ".")),
    riverName: rows(i => (g.riverName[i] ? String.fromCharCode(65 + rivers.indexOf(g.riverName[i])) : ".")),
    towns: Object.fromEntries(Object.entries(D.TOWNS).map(([id, [name, lon, lat, from]]) => [id, {name, lon, lat, from}]))};
}
if ( process.argv[1]?.endsWith("export_country.mjs") ) {
  const out = new URL("./country.json", import.meta.url);
  writeFileSync(out, JSON.stringify(build(), null, 1) + "\n");
  console.log("wrote", out.pathname);
}
