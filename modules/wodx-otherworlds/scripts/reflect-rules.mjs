/**
 * Umbral reflection (WoDX Otherworlds 0.9.0), the pure part. A map made by the WoDX town generator carries what each
 * place means (its sidecar: place kinds, wealth, dirty trades, burned plots, later ages' areas, and the buildings
 * those ages pulled down). This reads it the way the books describe the near worlds and gives marks for the twin
 * levels, drawn as one overlay per layer:
 *
 *   Penumbra     the spiritual state: churches and loved places loom; rich wards, mills, markets and later the
 *                railway and offices carry the Weaver's webbing, thicker in each age; dirty trades, burned plots,
 *                gallows ground and bomb sites sour toward the Wyrm; rivers, brooks, parks and wild ground grow
 *                with the Wyld; poor back lots nobody notices are faint.
 *   Shadowlands  memory and decay: buildings later ages pulled down, and burned houses, stand again as relics;
 *                churches and cemeteries thin the Shroud; dirty trades rot fastest; bomb sites may open a Nihil.
 *
 * Sources: W20 pdf 314-317 / p. 312-315 (what looks solid, webs along streets, Glens, Blights, Hellholes, neglected
 * graveyards); Umbra: The Velvet Shadow pdf 15 / p. 14; Book of the Weaver pdf 33 / p. 32; Beyond the Barriers: The
 * Book of Worlds pdf 75 / p. 74; Wraith 20th pdf 85 / p. 20. Loved places looming is a house rule (W20 speaks of
 * spiritual weight and age); so are how strong each mark is and the webbing by age. No Foundry here.
 *
 * 0.17.0: a map from under the ground (a warren or sewers from tools/mapgen/ddwarren.py, "underground" in its
 * sidecar) is read piece by piece and run by run instead: see underMarks.
 */

/** The marks, with how each is drawn and what it means. */
export const MARKS = {
  loom: {layer: "penumbra", label: "Looms in the Penumbra", note: "A place of spiritual weight: solid, larger and brighter here (house rule: loved places loom). The Gauntlet is one lower (house rule)."},
  web: {layer: "penumbra", label: "Weaver webbing", note: "Pattern webs over the place; thicker in each age."},
  blight: {layer: "penumbra", label: "Wyrm-soured", note: "A Blight in the making: Banes are drawn here."},
  wyld: {layer: "penumbra", label: "Wyld growth", note: "Lush and strange spirit growth."},
  faint: {layer: "penumbra", label: "Faint", note: "Little spiritual weight: blurred and dim (places nobody remembers fade, W20 pdf 317 / p. 315)."},
  relic: {layer: "shadowlands", label: "A relic stands here", note: "Gone in the living world, still here for the dead."},
  thin: {layer: "shadowlands", label: "The Shroud is thin", note: "Death and grief gather here; the Shroud is one lower (house rule)."},
  rot: {layer: "shadowlands", label: "Fast rot", note: "Decay runs fastest here."},
  nihil: {layer: "shadowlands", label: "A Nihil may open", note: "A wound toward Oblivion; Spectres may come through."}
};
export const LAYERS = ["penumbra", "shadowlands"];

/** How thick the Weaver's webbing lies over a town by the year (house rule; the World of Future Darkness thickest). */
export function webbing(year, {future = false} = {}) {
  const y = Number(year) || 1197;
  if ( future && y > 2025 ) return 1;
  return y < 1500 ? 0.2 : y < 1850 ? 0.45 : y < 1950 ? 0.7 : 0.9;
}

const WEB_AREAS = new Set(["station", "railway", "ring-road", "boulevard", "embankment", "offices", "quay", "warehouse", "car-park", "suburb"]);
const WYLD_AREAS = new Set(["brook", "oxbow", "old-loop", "park", "sinkhole"]);
const id = r => String(r.id ?? "");

/**
 * The marks for one layer. sidecar: the parsed .wodx.json. Returns [{kind, id, label, note, rect, points, strength}]
 * in cells, strongest first within a kind.
 */
export function reflect(sidecar, layer = "penumbra", {year = null, future = false} = {}) {
  const sc = sidecar ?? {};
  // A map grown to a later age cannot show an earlier one: read it no earlier than the year it was drawn for.
  const y = Math.max(Number(year ?? sc.umbral?.year ?? 1197) || 1197, Number(sc.umbral?.year) || 0);
  const places = sc.umbral?.places ?? {};
  const out = [];
  const add = (kind, r, strength, label = null, note = null) => {
    if ( MARKS[kind].layer !== layer ) return;
    out.push({kind, id: `${kind}:${id(r)}`, label: label ?? `${MARKS[kind].label}: ${r.label ?? id(r)}`, note: note ?? MARKS[kind].note,
      rect: (r.rect ?? []).map(Number), points: Array.isArray(r.points) ? r.points.map(Number) : null, strength: Math.max(0, Math.min(1, strength))});
  };
  const web = webbing(y, {future});
  if ( sc.underground ) {
    for ( const r of sc.regions ?? [] ) for ( const [kind, strength, label, note] of underMarks(r.area, sc.dress, web) ) add(kind, r, strength, label ?? null, note ?? null);
    const order = Object.keys(MARKS);
    return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.strength - a.strength);
  }
  for ( const r of sc.regions ?? [] ) {
    const kind = r.place?.kind, area = r.area, p = places[id(r)] ?? {}, rid = id(r);
    if ( kind === "church" || p.type === "chapel" || rid === "market-cross" ) { add("loom", r, 0.9); add("thin", r, 0.6); continue; }
    if ( kind === "tavern" ) add("loom", r, 0.5);
    if ( kind === "market" ) { add("loom", r, 0.4); add("web", r, web * 0.8); }
    if ( p.dirty ) { add("blight", r, 0.7); add("rot", r, 0.8); continue; }
    if ( rid.startsWith("burned-") ) { add("blight", r, 0.4); add("relic", r, 0.7, `Relic: the house that burned here`, "A house lost to fire stands again for the dead."); continue; }
    if ( area === "bomb-site" || area === "car-park" ) { add("blight", r, 0.8); add("relic", r, 0.8, `Relic: the street before the bombs`); add("nihil", r, 0.5); continue; }
    if ( area === "cemetery" ) { add("thin", r, 0.9); add("blight", r, 0.3, null, "A graveyard decays toward the Wyrm when it is neglected (W20 pdf 314 / p. 312)."); continue; }
    if ( WEB_AREAS.has(area) ) { add("web", r, web); continue; }
    if ( WYLD_AREAS.has(area) || /^river-/.test(rid) ) { add("wyld", r, area === "park" ? 0.35 : 0.6 * (1.2 - web)); continue; }
    if ( p.wealth === "rich" || p.type === "townhouse" ) add("web", r, web * 0.7);
    else if ( p.type === "workshop" || p.type === "storehouse" || kind === "workplace" ) add("web", r, web * 0.5);
    if ( p.wealth === "poor" ) add("faint", r, 0.5);
    if ( r.place?.private && p.wealth !== "rich" ) add("faint", r, 0.25);
  }
  // Where one spot lost several buildings over the ages, only the most recent one stands again as a relic
  const gone = (sc.umbral?.gone ?? []).filter(g => Number(g.year) <= y).sort((a, b) => Number(b.year) - Number(a.year));
  const overlap = (a, b) => {
    const [ax, ay, aw, ah] = a.rect ?? [0, 0, 0, 0], [bx, by, bw, bh] = b.rect ?? [0, 0, 0, 0];
    const ix = Math.max(0, Math.min(ax + aw, bx + bw) - Math.max(ax, bx)), iy = Math.max(0, Math.min(ay + ah, by + bh) - Math.max(ay, by));
    return ix * iy > 0.3 * Math.min(aw * ah, bw * bh);
  };
  const kept = [];
  for ( const g of gone ) if ( !kept.some(k => overlap(k, g)) ) kept.push(g);
  for ( const g of kept ) {
    // A house rebuilt in a later style is a faint relic under the new one (drawn, no region); a building cleared away is a strong one.
    if ( String(g.why ?? "").startsWith("rebuild-") ) add("relic", g, 0.35, `Relic: the older ${String(g.label).toLowerCase()}`, `Rebuilt in ${g.year}; the older house still stands for the dead.`);
    else add("relic", g, 0.8, `Relic: ${g.label}`, `Pulled down in ${g.year}${g.why ? ` (${String(g.why).replace(/-/g, " ")})` : ""}; still standing for the dead.`);
  }
  const order = Object.keys(MARKS);
  return out.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || b.strength - a.strength);
}

/**
 * Under the ground (0.17.0): what one piece of a warren or one run of a sewer means in the near worlds. area: the
 * region's area in the sidecar (ddwarren.py); dress: what the map is dressed as; web: the Weaver's webbing that year.
 * Returns [[mark, strength, label?, note?]]. All of it is a house rule, read from the same pages as the town above:
 * built works carry webbing, filth and lairs sour toward the Wyrm, buried water still runs with the Wyld, a fall or a
 * walled-up way stands as it was for the dead, and where something died badly a Nihil may open.
 */
export function underMarks(area, dress, web = 0.2) {
  if ( dress === "labyrinth" ) {            // a reach of the Labyrinth has no living-world twin: only how near Oblivion each piece lies
    return area === "den" || area === "flooded" ? [["nihil", 0.9], ["rot", 0.9]] : area === "collapse" ? [["nihil", 0.6], ["rot", 0.9]] : [["rot", 0.7]];
  }
  if ( dress === "spiral" ) {               // a Black Spiral cavern is a Blight through and through
    return area === "flooded" ? [["blight", 1, null, "Balefire: the Wyrm's own light burns in the pool."]] : area === "den" ? [["blight", 1], ["thin", 0.6]] : [["blight", 0.8]];
  }
  switch ( area ) {
    case "main-sewer": case "junction": return [["web", web], ["blight", 0.45, null, "Filth runs here night and day: Banes gather along it."], ["rot", 0.6]];
    case "side-sewer": return [["web", web * 0.7], ["blight", 0.3], ["rot", 0.5]];
    case "outfall": return [["blight", 0.6, null, "Where the town's filth meets the river."], ["rot", 0.7]];
    case "culvert": return [["wyld", 0.35, null, "A buried brook still runs wild under its cover."], ["faint", 0.4]];
    case "cesspit": return [["blight", 0.5], ["rot", 0.8]];
    case "den": return [["blight", 0.6, null, "A lair: whatever dens here draws Banes."], ["thin", 0.5]];
    case "flooded": return [["wyld", 0.4], ["rot", 0.5]];
    case "collapse": return [["relic", 0.7, "Relic: the passage before the fall", "The way stands whole again for the dead."], ["nihil", 0.5]];
    case "cap": return [["relic", 0.4, "Relic: the way that was closed", "The closed way stands open for the dead."]];
    case "vault": case "chamber": return [["faint", 0.3]];
    case "passage": return [["faint", 0.4]];
    default: return [];
  }
}

/* ------------------------------------------------------------------ drawing */
const LOOK = {
  loom: {fill: "#dfe8ff", glow: true},
  web: {stroke: "#e8f0ff", web: true},
  blight: {fill: "#4a5a1a", blot: true},
  wyld: {fill: "#7fd06a", glow: true},
  faint: {fill: "#0a0c14", flat: true},
  relic: {fill: "#b8c4bc", relic: true},
  thin: {fill: "#a6dcb6", glow: true},
  rot: {fill: "#3a3a2a", blot: true},
  nihil: {fill: "#000000", nihil: true}
};
const f1 = v => (Math.round(v * 10) / 10).toString();
const polyPts = (m, s) => {
  if ( m.points?.length >= 6 ) { const out = []; for ( let i = 0; i + 1 < m.points.length; i += 2 ) out.push(`${f1(m.points[i] * s)},${f1(m.points[i + 1] * s)}`); return out.join(" "); }
  const [x, y, w, h] = m.rect;
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => `${f1(a * s)},${f1(b * s)}`).join(" ");
};

/**
 * One layer's overlay as an SVG with a clear background, cells wide by high at `cell` pixels a cell. The twin level
 * keeps its own art underneath; this only adds the meaning.
 */
export function overlaySvg(marks, cells, {cell = 50} = {}) {
  const [cw, ch] = cells ?? [40, 30];
  const W = Math.round(cw * cell), H = Math.round(ch * cell);
  const o = [`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`, "<defs>"];
  for ( const [k, L] of Object.entries(LOOK) ) if ( L.glow ) o.push(`<radialGradient id="g-${k}"><stop offset="0" stop-color="${L.fill}" stop-opacity="0.8"/><stop offset="1" stop-color="${L.fill}" stop-opacity="0"/></radialGradient>`);
  o.push(`<pattern id="p-web" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><path d="M0 0L${cell} ${cell}M${cell} 0L0 ${cell}M${cell / 2} 0V${cell}M0 ${cell / 2}H${cell}" stroke="#e8f0ff" stroke-width="${f1(cell * 0.02)}" fill="none"/></pattern>`);
  o.push(`<filter id="soft"><feGaussianBlur stdDeviation="${f1(cell * 0.25)}"/></filter></defs>`);
  marks.forEach((m, i) => {
    const L = LOOK[m.kind];
    const [x, y, w, h] = m.rect;
    const cx = (x + w / 2) * cell, cy = (y + h / 2) * cell, r = Math.max(w, h) * cell * (m.kind === "loom" ? 0.9 : 0.7);
    const a = f1(m.strength);
    if ( L.glow ) o.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" fill="url(#g-${m.kind})" opacity="${a}"/>`);
    if ( m.kind === "loom" ) o.push(`<polygon points="${polyPts(m, cell)}" fill="none" stroke="#f4f8ff" stroke-opacity="${a}" stroke-width="${f1(cell * 0.12)}"/>`);
    if ( L.web ) o.push(`<polygon points="${polyPts(m, cell)}" fill="url(#p-web)" opacity="${f1(m.strength * 0.7)}"/>`);
    if ( L.blot ) o.push(`<polygon points="${polyPts(m, cell)}" fill="${L.fill}" opacity="${f1(m.strength * 0.6)}" filter="url(#soft)"/>`);
    if ( L.flat ) o.push(`<polygon points="${polyPts(m, cell)}" fill="${L.fill}" opacity="${f1(m.strength * 0.6)}" filter="url(#soft)"/>`);
    if ( L.relic ) o.push(`<polygon points="${polyPts(m, cell)}" fill="${L.fill}" fill-opacity="${f1(m.strength * 0.45)}" stroke="#e8f4ea" stroke-opacity="0.8" stroke-width="${f1(cell * 0.08)}" stroke-dasharray="${f1(cell * 0.3)} ${f1(cell * 0.15)}"/>`);
    if ( L.nihil ) o.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(cell * 1.2)}" fill="#000" stroke="#7a3aa0" stroke-width="${f1(cell * 0.15)}" opacity="${a}"/>`);
    void i;
  });
  o.push("</svg>");
  return o.join("");
}

/** A short count of the marks for a card: "3 loom, 12 web, 2 blight". */
export function summary(marks) {
  const n = {};
  for ( const m of marks ) n[m.kind] = (n[m.kind] ?? 0) + 1;
  const SHORT = {loom: "looming", web: "webbed", blight: "Wyrm-soured", wyld: "Wyld-grown", faint: "faint", relic: "relics", thin: "thin Shroud", rot: "fast rot", nihil: "possible Nihil"};
  return Object.entries(n).map(([k, v]) => `${v} ${SHORT[k]}`).join(", ") || "nothing to show";
}

/** Regions to put on the twin level for the marks that matter in play (looming, relics, thin Shroud, Nihils, Blights). */
export function regionsFor(marks, gridSize = 100) {
  const g = Number(gridSize) || 100;
  const keep = new Set(["loom", "relic", "thin", "nihil", "blight"]);
  const COL = {loom: "#dfe8ff", relic: "#b8c4bc", thin: "#a6dcb6", nihil: "#7a3aa0", blight: "#6a7a2a"};
  return marks.filter(m => keep.has(m.kind) && m.strength >= 0.4).map(m => ({name: m.label.slice(0, 120), color: COL[m.kind],
    shapes: [m.points?.length >= 6 ? {type: "polygon", points: m.points.map(v => Math.round(v * g))} : {type: "rectangle", x: m.rect[0] * g, y: m.rect[1] * g, width: m.rect[2] * g, height: m.rect[3] * g, rotation: 0}],
    elevation: {bottom: null, top: null}, flags: {"wodx-otherworlds": {reflection: m.kind, note: m.note, markId: m.id}}}));
}
