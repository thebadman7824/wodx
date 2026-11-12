"""The country a map stands in (B2339): reads country.json, written from the Storyteller's country map by
export_country.mjs, and says what ground, river and woods lie at a spot. A spot is "town", "town:km:DIR" (DIR one of
N NE E SE S SW W NW), the same way a place is put on the map in Foundry."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
DIRS = {"N": (0, 1), "NE": (.707, .707), "E": (1, 0), "SE": (.707, -.707), "S": (0, -1), "SW": (-.707, -.707), "W": (-1, 0), "NW": (-.707, .707)}
# country ground -> the landform a town map is drawn on (land.py KINDS)
LANDFORM = {"plain": "plain", "vale": "plain", "hills": "hills", "upland": "upland", "mountain": "mountain"}
WOODS = {"plain": .1, "vale": .15, "hills": .35, "upland": .6, "mountain": .75}
_C = None


def load():
    global _C
    if _C is None: _C = json.load(open(os.path.join(HERE, "country.json"), encoding="utf8"))
    return _C


def parse(spot):
    """'brno:12:NE' -> (town, km, dir). Raises ValueError with a plain message."""
    c = load()
    bits = str(spot).split(":")
    town = bits[0].strip().lower()
    if town not in c["towns"]: raise ValueError(f"no town '{town}' on the country map; towns: {', '.join(sorted(c['towns']))}")
    km = float(bits[1]) if len(bits) > 1 and bits[1].strip() else 0.0
    d = bits[2].strip().upper() if len(bits) > 2 and bits[2].strip() else "N"
    if d not in DIRS: raise ValueError(f"direction '{d}' is not one of {', '.join(DIRS)}")
    return town, max(0.0, min(300.0, round(km, 1))), d


def cell(spot):
    c = load(); b = c["bounds"]
    town, km, d = parse(spot)
    ky = 111.2; kx = 111.2 * math.cos(math.radians((b["south"] + b["north"]) / 2))
    t = c["towns"][town]
    lon = max(b["west"], min(b["east"] - .001, t["lon"] + km * DIRS[d][0] / kx))
    lat = max(b["south"] + .001, min(b["north"], t["lat"] + km * DIRS[d][1] / ky))
    col = max(0, min(c["cols"] - 1, int(math.floor((lon - b["west"]) * kx / b["cell"]))))
    row = max(0, min(c["rows"] - 1, int(math.floor((b["north"] - lat) * ky / b["cell"]))))
    return col, row


def _dir(dx, dy):
    if not dx and not dy: return "here"
    a = math.degrees(math.atan2(dy, dx))
    # Math.round in JavaScript rounds halves up; match it so both sides agree on a diagonal
    return ["E", "NE", "N", "NW", "W", "SW", "S", "SE"][int(math.floor(a / 45 + .5)) % 8]


def land_at(spot, year=1197):
    """{land, landName, landform, river: {name, big, km, side} or None, woods, town, km, dir}"""
    c = load()
    col, row = cell(spot)
    town, km, d = parse(spot)
    kind = c["lands"][int(c["land"][row][col])]
    ln = c["landName"][row][col]
    name = None if ln == "." else c["landNames"][ord(ln) - 65]
    riv = None
    for rad in range(0, 5):
        for dr in range(-rad, rad + 1):
            for dc in range(-rad, rad + 1):
                if max(abs(dr), abs(dc)) != rad: continue
                cc, rr = col + dc, row + dr
                if cc < 0 or rr < 0 or cc >= c["cols"] or rr >= c["rows"] or c["river"][rr][cc] == "0": continue
                rn = c["riverName"][rr][cc]
                riv = {"name": c["riverNames"][ord(rn) - 65], "big": c["river"][rr][cc] == "2", "km": int(math.floor(math.hypot(dc, dr) * c["bounds"]["cell"] + .5)), "side": _dir(dc, -dr)}
                break
            if riv: break
        if riv: break
    woods = round(max(0, min(.9, WOODS[kind] * (1.3 if year < 1250 else 1 if year < 1800 else .9))), 2)
    form = "karst" if name == "the Drahany Highlands" else LANDFORM[kind]
    return {"land": kind, "landName": name, "landform": form, "river": riv, "woods": woods, "town": c["towns"][town]["name"], "km": km, "dir": d}
