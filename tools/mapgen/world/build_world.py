"""WoDX world map: build the coarse grid of the whole Earth.

  python3 build_world.py <folder with the Natural Earth geojson files> [out.json | out.mjs]
  python3 build_world.py ne ../../../modules/wodx-storyteller/data/world.mjs

One square for each degree of latitude and longitude (360 by 180, about 100 km at the equator). For each square:
the ground (sea, lake, ice, mountains, plateau, desert, tundra, plain, wetland, or ordinary land), whether a great
river crosses it, and the WoDX world region it lies in. It also
keeps the named ranges, deserts, plains and seas with a middle point, for labels and for saying where a place is.

The shapes come from Natural Earth (naturalearthdata.com), which is in the public domain: ne_110m_land, ne_110m_lakes,
ne_50m_rivers_lake_centerlines (or the 110m one), ne_110m_glaciated_areas, ne_110m_admin_0_countries, ne_50m_geography_regions_polys,
ne_50m_geography_marine_polys. Nothing here comes from a game or a rulebook. The grid is rough on purpose: it is the
far view, and the 5 km country squares are made from it on demand.
"""
import json, math, os, sys

W, H = 360, 180
GROUND = {"Range/mtn": "M", "Foothills": "M", "Plateau": "P", "Desert": "D", "Tundra": "T", "Plain": "p", "Lowland": "p", "Basin": "p", "Delta": "p",
          "Valley": "p", "Wetlands": "w"}
# later letters win where shapes overlap: mountains over plateau over the rest
RANK = "pwTDPM"
# one letter for each region in the region rows (sea is ~)
CODE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


# The WoDX world region each modern country's ground falls in. The ids are WORLD_REGIONS in WoDX Chronicle's
# world-rules.mjs (Chronicle 0.48.0 has them all). That list gives each region one city and no borders: this grid is
# the one place the borders are kept. Modern countries are only a handy way to cut the land up.
BY_COUNTRY = {
    "moravia": "CZE SVK", "german-lands": "DEU AUT CHE", "british-isles": "GBR IRL", "france": "FRA", "iberia": "ESP PRT", "italy": "ITA",
    "low-countries": "BEL NLD LUX", "scandinavia": "NOR SWE FIN ISL DNK", "poland-baltic": "POL LTU LVA EST BLR",
    "carpathians-balkans": "HUN ROU BGR SRB HRV BIH SVN MNE MKD ALB KOS", "russia": "RUS UKR MDA", "aegean": "GRC CYP", "anatolia": "TUR GEO ARM",
    "levant": "SYR LBN ISR JOR IRQ PSE", "egypt": "EGY SDN", "arabia": "SAU YEM OMN ARE QAT KWT BHR", "maghreb": "MAR DZA TUN LBY SAH",
    "persia": "IRN AZE", "central-asia": "KAZ KGZ TJK TKM UZB AFG MNG", "india": "IND PAK BGD LKA", "tibet-himalaya": "NPL BTN", "china": "CHN TWN", "japan": "JPN",
    "korea": "KOR PRK", "southeast-asia": "MMR THA LAO KHM VNM", "nusantara": "MYS IDN BRN PHL TLS",
    "west-africa": "SEN GMB GNB GIN SLE LBR CIV GHA TGO BEN NGA BFA MLI NER MRT", "central-africa": "TCD CMR CAF GNQ GAB COG COD AGO",
    "east-africa": "ETH ERI DJI SOM SOL KEN UGA TZA RWA BDI SDS MDG", "southern-africa": "ZAF NAM BWA ZWE ZMB MOZ MWI LSO SWZ",
    "north-america-east": "USA", "canada": "CAN", "mexico": "MEX GTM BLZ HND SLV NIC CRI PAN", "caribbean": "CUB HTI DOM PRI BHS TTO JAM",
    "andes": "COL VEN ECU PER BOL", "southern-cone": "ARG CHL URY PRY", "brazil": "BRA GUY SUR", "australia": "AUS", "aotearoa": "NZL",
    "pacific-islands": "FJI NCL SLB VUT PNG", "arctic": "GRL", "antarctica": "ATA ATF FLK",
}
REGION_OF = {c: r for r, cs in BY_COUNTRY.items() for c in cs.split()}
REGIONS = list(BY_COUNTRY) + ["north-america-west", "siberia"]


def region_at(code, lon, lat):
    """The region of a land square: by its country, with the large countries cut where their regions part."""
    if lat <= -60: return "antarctica"
    if code == "RUS": return "russia" if lon < 60 and lon > 0 else "arctic" if lat >= 70 and lon >= 60 else "siberia"
    if code == "CAN": return "arctic" if lat >= 60 else "canada"
    if code == "USA":
        if lat >= 66: return "arctic"
        if lon < -150 and lat < 30: return "pacific-islands"
        return "north-america-west" if lon < -100 else "north-america-east"
    if code == "CHN" and 78 <= lon <= 103 and 27.5 <= lat <= 36.5: return "tibet-himalaya"
    if code == "CHL" and lat > -27: return "andes"
    if code == "FRA" and lon < -30: return "brazil"
    if code == "NOR" and lat >= 74: return "arctic"
    if code == "CHL" and lat < -56: return "antarctica"
    return REGION_OF.get(code, "")


def polys(geom):
    """Every polygon of a geometry as a list of rings (the first is the outline, the rest are holes)."""
    if not geom: return []
    if geom["type"] == "Polygon": return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon": return list(geom["coordinates"])
    return []


def inside_ring(x, y, ring):
    n, c = len(ring), False
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: c = not c
        j = i
    return c


class Shape:
    def __init__(self, rings, props=None):
        self.rings, self.props = rings, props or {}
        xs = [p[0] for p in rings[0]]; ys = [p[1] for p in rings[0]]
        self.box = (min(xs), min(ys), max(xs), max(ys))

    def has(self, x, y):
        b = self.box
        if x < b[0] or x > b[2] or y < b[1] or y > b[3]: return False
        return inside_ring(x, y, self.rings[0]) and not any(inside_ring(x, y, r) for r in self.rings[1:])


def load(folder, name):
    with open(os.path.join(folder, name + ".geojson"), encoding="utf8") as f: d = json.load(f)
    out = []
    for ft in d["features"]:
        for rings in polys(ft.get("geometry")): out.append(Shape(rings, ft.get("properties") or {}))
    return out, d["features"]


def centre(shapes):
    b = [min(s.box[0] for s in shapes), min(s.box[1] for s in shapes), max(s.box[2] for s in shapes), max(s.box[3] for s in shapes)]
    return round((b[0] + b[2]) / 2, 1), round((b[1] + b[3]) / 2, 1)


def build(folder):
    land, _ = load(folder, "ne_110m_land")
    lakes, _ = load(folder, "ne_110m_lakes")
    ice, _ = load(folder, "ne_110m_glaciated_areas")
    lands, _ = load(folder, "ne_50m_geography_regions_polys")
    states, _ = load(folder, "ne_110m_admin_0_countries")
    seas, _ = load(folder, "ne_50m_geography_marine_polys")
    ground = [["~"] * W for _ in range(H)]
    country = [[""] * W for _ in range(H)]
    for r in range(H):
        y = 89.5 - r
        for c in range(W):
            x = -179.5 + c
            if not any(s.has(x, y) for s in land): continue
            g = "."
            if any(s.has(x, y) for s in lakes): g = "l"
            elif y < -60 or any(s.has(x, y) for s in ice): g = "i"
            else:
                best = -1
                for s in lands:
                    k = GROUND.get(s.props.get("FEATURECLA"))
                    if k and RANK.index(k) > best and s.has(x, y): best = RANK.index(k)
                if best >= 0: g = RANK[best]
            ground[r][c] = g
            for s in states:
                if s.has(x, y): country[r][c] = s.props.get("ADM0_A3") or ""; break
    # a land square no country shape covers (coasts are rough at this size) takes its nearest neighbour's country
    for _ in range(3):
        for r in range(H):
            for c in range(W):
                if ground[r][c] != "~" and not country[r][c]:
                    for dr, dc in ((0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (-1, -1), (1, -1), (-1, 1)):
                        rr, cc = r + dr, (c + dc) % W
                        if 0 <= rr < H and country[rr][cc]: country[r][c] = country[rr][cc]; break
    # the great rivers: every square a river line passes through
    fine = os.path.join(folder, "ne_50m_rivers_lake_centerlines.geojson")
    with open(fine if os.path.exists(fine) else os.path.join(folder, "ne_110m_rivers_lake_centerlines.geojson"), encoding="utf8") as f: rv = json.load(f)
    rivers = {}
    for ft in rv["features"]:
        name = (ft["properties"].get("name_en") or ft["properties"].get("name") or "").strip()
        g = ft.get("geometry") or {}
        lines = [g["coordinates"]] if g.get("type") == "LineString" else g.get("coordinates", []) if g.get("type") == "MultiLineString" else []
        if not name or (ft["properties"].get("scalerank") or 0) > 5: continue
        cells = rivers.setdefault(name, [])
        for line in lines:
            for (x0, y0), (x1, y1) in zip(line, line[1:]):
                n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) * 4))
                for i in range(n + 1):
                    x, y = x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n
                    c, r = int(math.floor(x + 180)) % W, min(H - 1, max(0, int(math.floor(90 - y))))
                    if [c, r] not in cells: cells.append([c, r])
    names = []
    seen = {}
    for s in lands:
        k, n = s.props.get("FEATURECLA"), (s.props.get("NAME_EN") or s.props.get("NAME") or "").strip()
        if n and k in GROUND: seen.setdefault((n, GROUND[k]), []).append(s)
    for (n, k), ss in sorted(seen.items()): names.append([n, k, *centre(ss)])
    seen = {}
    for s in seas:
        n = (s.props.get("name_en") or s.props.get("name") or s.props.get("NAME_EN") or s.props.get("NAME") or "").strip()
        if n and (s.props.get("scalerank", s.props.get("SCALERANK", 9)) or 0) <= 3: seen.setdefault(n, []).append(s)
    for n, ss in sorted(seen.items()): names.append([n, "~", *centre(ss)])
    region = [[region_at(country[r][c], -179.5 + c, 89.5 - r) if ground[r][c] != "~" else "" for c in range(W)] for r in range(H)]
    lost = sorted({country[r][c] for r in range(H) for c in range(W) if ground[r][c] != "~" and not region[r][c]})
    if lost: raise SystemExit(f"no region for: {lost}")
    codes = sorted({c for row in country for c in row if c})
    return {"format": "wodx-world", "version": 1, "cols": W, "rows": H, "source": "Natural Earth, public domain",
            "ground": ["".join(row) for row in ground], "regions": REGIONS,
            "region": ["".join(CODE[REGIONS.index(x)] if x else "~" for x in row) for row in region],
            "rivers": {k: v for k, v in sorted(rivers.items()) if len(v) >= 3}, "names": names}


def mjs(w):
    """The grid as a module for WoDX Storyteller (modules/wodx-storyteller/data/world.mjs)."""
    rows = lambda key: "[\n" + ",\n".join(json.dumps(r) for r in w[key]) + "]"
    rivers = "{\n" + ",\n".join(f"  {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, separators=(',', ':'))}" for k, v in w["rivers"].items()) + "}"
    names = "[\n" + ",\n".join("  " + json.dumps(n, ensure_ascii=False, separators=(",", ":")) for n in w["names"]) + "]"
    return f'''/**
 * WoDX Storyteller: the whole Earth as a coarse grid, one square for each degree (360 by 180, about 100 km at the
 * equator). MADE BY tools/mapgen/world/build_world.py from Natural Earth (public domain); do not edit by hand.
 * GROUND: ~ sea, l lake, i ice, M mountains, P plateau, D desert, T tundra, p plain, w wetland, . other land.
 * REGION: one letter for each square's world region (REGION_IDS by REGION_CODE's order), ~ for sea.
 * Row 0 is 89.5 north, column 0 is 179.5 west.
 */
export const COLS = {w["cols"]}, ROWS = {w["rows"]};
export const REGION_CODE = {json.dumps(CODE[:len(w["regions"])])};
export const REGION_IDS = {json.dumps(w["regions"])};
export const GROUND = {rows("ground")};
export const REGION = {rows("region")};
/** The great rivers: name, then the squares [column, row] each runs through. */
export const RIVERS = {rivers};
/** Named ranges, plateaus, deserts, plains and seas: [name, kind (a GROUND letter), east, north]. */
export const NAMES = {names};
'''


if __name__ == "__main__":
    if len(sys.argv) < 2: raise SystemExit(__doc__)
    w = build(sys.argv[1])
    out = sys.argv[2] if len(sys.argv) > 2 else "world.json"
    with open(out, "w", encoding="utf8") as f: f.write(mjs(w) if out.endswith(".mjs") else json.dumps(w, separators=(",", ":")))
    land = sum(row.count(ch) for row in w["ground"] for ch in ".lipwTDPM")
    print(f"ok: {land} land squares of {W * H}, {len(w['regions'])} regions, {len(w['rivers'])} rivers, {len(w['names'])} names -> {out}")
