"""Which way holy things face (B6348). A map's north is up, so a direction on earth is a side of the room:
  mihrab, minbar      on the qibla wall, the wall toward Mecca from the region's typical city
  torahark            on the wall toward Jerusalem
  altar, altar-table, iconostasis, altarrail    at the east end (the old custom of churches; the rail before it)
  headstone, grave    their faces to the east (the dead lie with their feet to the east)
  prayer rows         facing the mihrab (prayerrug and the like: their heads toward the qibla)
The region's latitude and longitude are read from the chronicle module's world rules, so a new region needs no
change here. The bearing is the great-circle one; the side is the nearest of the four."""
import math
import os
import re

MECCA, JERUSALEM = (21.4225, 39.8262), (31.778, 35.235)
_RULES = os.path.join(os.path.dirname(__file__), "..", "..", "..", "modules", "wodx-chronicle", "scripts", "world-rules.mjs")


def _regions():
    try: s = open(_RULES, encoding="utf-8").read()
    except OSError: return {}
    return {k: (float(a), float(b)) for k, a, b in re.findall(r'"([a-z0-9-]+)":\s*R\("[^"]*",\s*"[^"]*",\s*(-?[\d.]+),\s*(-?[\d.]+)', s)}


LATLON = _regions()


def bearing(frm, to):
    """Degrees clockwise from north, from (lat, lon) frm toward to."""
    (a1, o1), (a2, o2) = [(math.radians(a), math.radians(o)) for a, o in (frm, to)]
    y = math.sin(o2 - o1) * math.cos(a2); x = math.cos(a1) * math.sin(a2) - math.sin(a1) * math.cos(a2) * math.cos(o2 - o1)
    return math.degrees(math.atan2(y, x)) % 360


def side(deg):
    """The wall (n, e, s, w) a direction points at."""
    return "nesw"[int(((deg + 45) % 360) // 90)]


def toward(place, region):
    """The wall of a room that faces the holy place from a region: "mecca" or "jerusalem"."""
    ll = LATLON.get(region)
    if not ll: return None
    goal = MECCA if place == "mecca" else JERUSALEM
    if abs(ll[0] - goal[0]) < .3 and abs(ll[1] - goal[1]) < .3: return None
    return side(bearing(ll, goal))


QIBLA = {"mihrab", "minbar"}
JERUSALEM_WALL = {"torahark"}
EAST_END = {"altar", "altar-table", "iconostasis", "altarrail"}
FACE_EAST = {"headstone", "grave"}
QIBLA_ROWS = {"prayerrug"}


def wall_for(oid, region):
    """The side of the room an object must stand against, or None if any wall will do."""
    if oid in QIBLA: return toward("mecca", region)
    if oid in JERUSALEM_WALL: return toward("jerusalem", region)
    if oid in EAST_END: return "e"
    return None


def face_for(oid, region):
    """The way a free-standing object must face (its front), or None."""
    if oid in FACE_EAST: return "e"
    if oid in QIBLA_ROWS:
        w = toward("mecca", region); return w
    return None
