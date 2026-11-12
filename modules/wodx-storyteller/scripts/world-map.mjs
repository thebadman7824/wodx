/**
 * WoDX Storyteller 0.55.0 (B2540 to B2549): the world map window. "The world map" in the Storyteller's hand shows
 * the whole Earth by night, a journey between two spots in the chronicle's year (or any year typed), and a closer
 * view of one square. With WoDX Otherworlds on it also shows the Penumbra, the Shadowlands and the Near Dreaming as
 * the same map in another dress, and the chart of the worlds. It makes and changes nothing: it is a map to read.
 * The rules are in world-map-rules.mjs; the chart and the dresses are WoDX Otherworlds' worlds-chart-rules.mjs.
 */
import * as WM from "./world-map-rules.mjs";
import * as C from "./core.mjs";
import {addTool} from "./hand.mjs";

const {esc} = C;
const api = name => (game.modules?.get?.(name)?.active ? game.modules.get(name).api ?? null : null);
const yearNow = () => { try { return Number(C.chron()?.eras?.currentYear?.()) || 1197; } catch (e) { return 1197; } };
const img = (svg, alt) => `<img class="wst-world-map" alt="${esc(alt)}" style="display:block;width:100%;height:auto;border:0" src="data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}">`;

/** A region's name for the lists: WoDX Chronicle's world regions when it has the id, else the id in plain words. */
export function regionLabel(id) {
  let label = null;
  try { label = C.chron()?.world?.regionOf?.(id)?.label ?? null; } catch (e) { label = null; }
  return label ?? id.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/** Read "49.2, 16.6" (north, east; south and west are negative) or a region id. Returns {lon, lat, words} or null. */
export function spotOf(text, regionId) {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(String(text ?? ""));
  if ( m && Math.abs(+m[1]) <= 90 && Math.abs(+m[2]) <= 180 ) return {lat: +m[1], lon: +m[2], words: `${m[1]}, ${m[2]}`};
  const c = WM.regionCentre(regionId);
  return c ? {...c, words: regionLabel(regionId)} : null;
}

/** What the window shows for a state {layer, from, fromAt, to, toAt, year}: {picture (svg), lines, note}. */
export function view(state) {
  const chart = api("wodx-otherworlds")?.worldsChart ?? null;
  const year = Math.round(Number(state.year)) || yearNow();
  const a = spotOf(state.fromAt, state.from), b = spotOf(state.toAt, state.to);
  if ( state.layer === "chart" && chart ) return {picture: chart.svg(), lines: [], note: "Rings run from the living world outward. Where a realm sits is WoDX's own arrangement for one chart. Draw any realm with Realm maps."};
  const dress = state.layer !== "earth" && chart ? chart.rules.mirrorDress(state.layer) : null;
  const j = a && b && (a.lon !== b.lon || a.lat !== b.lat) ? WM.journey(a, b, {year}) : null;
  const marks = [a && {...a, label: a.words}, b && j && {...b, label: b.words}].filter(Boolean);
  const picture = WM.svg({cell: 4, ...(dress ?? {title: `The world by night, ${year}`, legend: WM.EARTH_LEGEND}), marks, path: j?.surface?.path ?? null});
  const lines = [];
  if ( a ) lines.push(`From: ${WM.describe(a, {regionLabel}).words}.`);
  if ( b && j ) lines.push(`To: ${WM.describe(b, {regionLabel}).words}.`);
  if ( j ) lines.push(...WM.journeyLines(j));
  return {picture, lines, note: dress?.note ?? "Each square is about 100 km. Times are rough, for a journey told in a sentence; a trip inside Moravia still uses Travel places."};
}

export async function worldMapDialog(start = {}) {
  if ( !game.user.isGM ) return null;
  const chart = api("wodx-otherworlds")?.worldsChart ?? null;
  const regions = Object.fromEntries(WM.REGION_IDS.map(id => [id, regionLabel(id)]).sort((x, y) => x[1].localeCompare(y[1])));
  const layers = {earth: "The living world", ...(chart ? {...Object.fromEntries(Object.entries(chart.rules.MIRRORS).map(([k, m]) => [k, m.label])), chart: "The chart of the worlds"} : {})};
  const opts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${esc(k)}"${k === cur ? " selected" : ""}>${esc(v)}</option>`).join("");
  let state = {layer: "earth", from: "moravia", fromAt: "", to: "british-isles", toAt: "", year: yearNow(), ...start};
  for ( let guard = 0; guard < 100; guard++ ) {
    const v = view(state);
    const content = `<div class="wst-world" style="max-height:74vh;overflow-y:auto">
      ${img(v.picture, layers[state.layer] ?? "The world map")}
      <p class="wodx-quiet">${esc(v.note)}</p>
      ${v.lines.map(l => `<p style="margin:0.15rem 0">${esc(l)}</p>`).join("")}
      <div class="form-group"><label>Show</label><select name="layer">${opts(layers, state.layer)}</select></div>
      <div class="form-group"><label>From</label><select name="from" data-fixed>${opts(regions, state.from)}</select>
        <input type="text" name="fromAt" value="${esc(state.fromAt)}" placeholder="or north, east: 49.2, 16.6" aria-label="From, as north and east in degrees"></div>
      <div class="form-group"><label>To</label><select name="to" data-fixed>${opts(regions, state.to)}</select>
        <input type="text" name="toAt" value="${esc(state.toAt)}" placeholder="or north, east: 35.0, 135.8" aria-label="To, as north and east in degrees"></div>
      <div class="form-group"><label>Year</label><input type="number" name="year" value="${state.year}" min="-10000" max="2200" step="1"></div></div>`;
    const read = (ev, b) => { const o = new foundry.applications.ux.FormDataExtended(b.form).object; return {layer: o.layer, from: o.from, fromAt: o.fromAt ?? "", to: o.to, toAt: o.toAt ?? "", year: Math.round(Number(o.year)) || yearNow()}; };
    const res = await foundry.applications.api.DialogV2.wait({window: {title: "The world map", resizable: true}, classes: ["wodx-dialog", "wstory-dialog", "wst-hand"], position: {width: 900, height: "auto"},
      content, rejectClose: false,
      buttons: [{action: "show", label: "Show", default: true, callback: (ev, b) => ({go: "show", state: read(ev, b)})},
        {action: "closer", label: "Look closer at From", callback: (ev, b) => ({go: "closer", state: read(ev, b)})}, {action: "close", label: "Close"}]});
    if ( !res || res === "close" ) return null;
    state = res.state;
    if ( res.go === "closer" ) await closerDialog(state);
  }
  return null;
}

/** One square, about 5 km to a small square, made the same way every time. */
export async function closerDialog(state) {
  const a = spotOf(state.fromAt, state.from);
  if ( !a ) return null;
  const sq = WM.landNear(WM.squareOf(a.lon, a.lat)), v = WM.closer(sq.col, sq.row);
  const count = {};
  for ( const line of v.cells ) for ( const c of line ) count[c.land] = (count[c.land] ?? 0) + 1;
  const lands = Object.entries(count).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} ${Math.round(n * 100 / (v.size * v.size))}%`).join(", ");
  return foundry.applications.api.DialogV2.wait({window: {title: `A closer look: ${a.words}`, resizable: true}, classes: ["wodx-dialog", "wstory-dialog", "wst-hand"], position: {width: 560, height: "auto"}, rejectClose: false,
    content: `<div style="max-height:74vh;overflow-y:auto">${img(WM.closerSvg(v), "One square of the world map, closer")}
      <p>${esc(WM.describe(a, {regionLabel}).words)}.</p>
      <p class="wodx-quiet">North is up. Each small square is about ${v.kmNorth} km north to south and ${v.km} km east to west. ${esc(lands)}.${v.rivers.length ? ` The ${esc(v.rivers.join(" and the "))} runs through.` : ""}
      This view is made from the world map and is the same every time; inside Moravia the hand-made country map is the one to trust.</p></div>`,
    buttons: [{action: "close", label: "Close", default: true}]});
}

export function registerWorldMapTools() {
  addTool({key: "worldMap", label: "The world map", icon: "fa-earth-europe", run: () => worldMapDialog()});
}
