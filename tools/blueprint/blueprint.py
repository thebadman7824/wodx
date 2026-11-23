"""WoDX map blueprints: every map planned as a plan drawing first, filled with approved object art later.

A blueprint is one JSON file per map (format "wodx-blueprint", version 1; see README.md). It holds the layout only:
the size in 5 ft squares, walls, doors, windows, buildings and rooms, an object slot for every piece of furniture at
its true size, the lights, the exits to other maps, and the map's era stages. No pictures.

    python3 blueprint.py seed-scene SCENE.json PLAN.json [--id ID] [--tier N]   seed from a Foundry scene export
    python3 blueprint.py seed-pixelmap MAPDIR PLAN.json [--id ID] [--tier N] [--scene SCENE.json]
                                                     seed from a tools/pixelmap output folder (exits and layers from the scene)
    python3 blueprint.py render PLAN.json OUT.png [--px N]                      draw the blueprint
    python3 blueprint.py check PLAN.json [...]                                  check a blueprint against the rules
    python3 blueprint.py sheet OUT.png PLAN.png [...]                           a contact sheet of rendered blueprints

Needs Python 3 and Pillow only.
"""
import json, math, os, re, sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SQ_FT = 5.0
CAT = json.load(open(os.path.join(HERE, "catalogue.json")))["objects"]
# era stages: the profile ids of modules/wodx-chronicle/data/eras.json a European map passes through, in order
ERA_STAGES = ["dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "great-war", "mid-century",
              "modern", "future-darkness"]


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")[:60] or "thing"


# ---------------------------------------------------------------- catalogue

_WORDS = sorted(((w, k) for k, o in CAT.items() for w in o["words"]), key=lambda t: -len(t[0]))


def _singular(w):
    if w.endswith("ss") or len(w) < 4: return w
    if w.endswith(("ches", "shes", "xes")): return w[:-2]
    return w[:-1] if w.endswith("s") else w


def match(name):
    """The catalogue object a name means, or None. Longest phrase wins, on whole words."""
    n = " " + re.sub(r"[^a-z' -]+", " ", name.lower().replace("-", " ")) + " "
    n += " ".join(_singular(w) for w in n.split()) + " "                # "desks" also reads as "desk"
    for w, k in _WORDS:
        if re.search(r"(?<![a-z])" + re.escape(w.replace("-", " ")) + r"(?![a-z])", n):
            return k
    return None


def size_sq(obj):
    w, d = CAT[obj]["ft"]
    return w / SQ_FT, d / SQ_FT


def slot(obj, cx, cy, label=None, facing="S", auto=True, sid=None):
    w, d = size_sq(obj)
    if facing in ("E", "W"): w, d = d, w
    return {"id": sid or slug(label or obj), "obj": obj, "label": label or CAT[obj]["label"],
            "rect": [round(cx - w / 2, 3), round(cy - d / 2, 3), round(w, 3), round(d, 3)],
            "facing": facing, "art": CAT[obj]["art"], "auto": auto}


def _uniq(items):
    seen, out = {}, []
    for it in items:
        b = it["id"]; i = seen.get(b, 0) + 1; seen[b] = i
        if i > 1: it["id"] = f"{b}-{i}"
        out.append(it)
    return out


def blank(id_, name, cells, tier, source):
    return {"format": "wodx-blueprint", "version": 1, "id": id_, "name": name, "chronicle": "rothenstein",
            "tier": tier, "cells": list(cells), "square_ft": SQ_FT, "art_grid_px": 128, "source": source,
            "layers": ["material"], "walls": [], "doors": [], "buildings": [], "rooms": [], "slots": [],
            "lights": [], "labels": [], "exits": [],
            "eras": [{"era": e, "state": "drawn" if e == "dark-ages" else "to plan"} for e in ERA_STAGES],
            "open": []}


# ---------------------------------------------------------------- seeding from a Foundry scene export

def _wall_kind(w, length):
    if w.get("door"): return None
    if w["sight"] == 0 and w["light"] == 0: return "fence"
    if w["sight"] == 10: return "window" if length <= 1.6 else "hedge"
    return "solid"


def _light_kind(cfg):
    a = (cfg.get("animation") or {}).get("type") or ""
    c = (cfg.get("color") or "").lower()
    if a in ("torch", "flame", "fire"): return "fire"
    if a in ("ghost", "pulse", "energy", "fog") or c.startswith(("#8", "#9", "#a0", "#6", "#7")): return "eerie"
    return "lamp"


def seed_scene(path, id_=None, tier=3):
    d = json.load(open(path))
    g = d["grid"]["size"]; W, H = round(d["width"] / g), round(d["height"] / g)
    lv = {l["_id"]: l["name"] for l in d.get("levels", [])}
    base = next((k for k, v in lv.items() if v == "Level"), None)
    on_base = lambda o: not o.get("levels") or base in o.get("levels", []) or not base
    bp = blank(id_ or slug(d["name"]), d["name"], (W, H), tier,
               {"kind": "foundry-scene-export", "file": os.path.relpath(path, "/mnt/project-files") if path.startswith("/mnt/project-files") else path,
                "grid_px": g})
    bp["layers"] = ["material"] + [v.lower() for v in lv.values() if v != "Level"]
    q = lambda v: round(v / g, 3)
    for w in d["walls"]:
        if not on_base(w): continue
        c = [q(v) for v in w["c"]]; ln = math.hypot(c[2] - c[0], c[3] - c[1])
        if w.get("door"):
            bp["doors"].append({"c": c, "kind": "secret" if w["door"] == 2 else ("gate" if ln > 1.6 else "door"),
                                "locked": w.get("ds") == 2})
        else:
            bp["walls"].append({"c": c, "kind": _wall_kind(w, ln)})
    for l in d["lights"]:
        if not on_base(l): continue
        cfg = l["config"]
        bp["lights"].append({"x": q(l["x"]), "y": q(l["y"]), "kind": _light_kind(cfg),
                             "bright": round(cfg.get("bright", 0) / SQ_FT, 2), "dim": round(cfg.get("dim", 0) / SQ_FT, 2),
                             "color": cfg.get("color")})
    for n in d["notes"]:
        if not on_base(n): continue
        bp["labels"].append({"x": q(n["x"]), "y": q(n["y"]), "text": _label(n["text"])})
    seen = set()
    for t in d.get("tiles", []):
        src = (t.get("texture") or {}).get("src") or ""
        if "/roofs/" not in src: continue
        tw, th = t["width"], t["height"]                               # a tile's x, y is its centre (texture anchor 0.5)
        ax, ay = (t.get("texture") or {}).get("anchorX", 0.5), (t.get("texture") or {}).get("anchorY", 0.5)
        r = [q(t["x"] - tw * ax), q(t["y"] - th * ay), q(tw), q(th)]
        k = tuple(round(v, 1) for v in r)
        if k in seen: continue
        seen.add(k)
        bp["buildings"].append({"id": f"b{len(bp['buildings']) + 1:02d}", "label": "", "rect": r, "use": "", "roof": True})
    for r in d["regions"]:
        if not on_base(r) and base: continue
        nm = r["name"]
        for s in r["shapes"][:1]:
            if s.get("type") != "rectangle": continue
            rect = [q(s["x"]), q(s["y"]), q(s["width"]), q(s["height"])]
            m = re.match(r"(Exit|Arrive): ([^ ]+)(?: \u2192 ([^ ]+))?", nm)
            if m:
                if "(" in nm: continue
                bp["exits"].append({"kind": m.group(1).lower(), "name": m.group(2), "to": m.group(3), "rect": rect})
            elif nm != "Region":
                bp["rooms"].append({"id": slug(nm), "label": nm, "rect": rect, "use": ""})
    _name_buildings(bp)
    furnish_rooms(bp)
    furnish_buildings(bp)
    bp["slots"] = _uniq(bp["slots"])
    return bp


def _inside(r, x, y, pad=0.0):
    return r[0] - pad <= x <= r[0] + r[2] + pad and r[1] - pad <= y <= r[1] + r[3] + pad


def _label(text):
    """A note's first line, short, cut before any gendered word or long dash (the repo's writing rules)."""
    t = text.split("\n")[0][:80]
    m = re.search(r"(?i)\b(he|she|his|her|hers|him|himself|herself)\b|\u2014", t)
    return (t[:m.start()].rstrip(" ,;:") + "...") if m else t


def _name_buildings(bp):
    """Give each roofed building the name of the place a note inside it names, and a use guessed from it."""
    for b in bp["buildings"]:
        for lab in bp["labels"]:
            if _inside(b["rect"], lab["x"], lab["y"], 0.5):
                m = re.search(r"\(([^)]+)\)", lab["text"])
                if m and not b["label"]: b["label"] = m.group(1).split(",")[0]
                lab["used"] = True
                if " lives here" in lab["text"]: b["use"] = b["use"] or "home"
        b["use"] = b["use"] or _use_of(b["label"])


USES = [("mill", "mill"), ("smith", "smithy"), ("forge", "smithy"), ("chapel", "church"), ("church", "church"),
        ("hall", "hall"), ("inn", "inn"), ("tavern", "inn"), ("barn", "barn"), ("stable", "stable"), ("granary", "store"),
        ("store", "store"), ("shed", "store"), ("hut", "home"), ("house", "home"), ("cottage", "home"), ("farm", "home")]


def _use_of(label):
    l = (label or "").lower()
    for w, u in USES:
        if w in l: return u
    return ""


PLURAL = re.compile(r"(?<!s)s$")


def furnish_rooms(bp):
    """A slot for each named spot whose name means a catalogue object, at its true size inside the spot."""
    for r in bp["rooms"]:
        obj = match(r["label"])
        if not obj:
            continue
        x, y, w, h = r["rect"]; ow, od = size_sq(obj)
        many = bool(PLURAL.search(r["label"].split()[-1].lower())) and obj not in ("shelf", "stairs")
        if many and w >= ow * 2 and h >= od:
            cap = 2 if max(CAT[obj]["ft"]) >= 6 else 4                     # big pieces: two at most, small ones up to four a row
            nx = max(1, min(cap, int(w // (ow + 0.3)))); ny = max(1, min(cap // 2 or 1, int(h // (od + 0.3))))
            for i in range(nx):
                for j in range(ny):
                    cx = x + (i + 0.5) * w / nx; cy = y + (j + 0.5) * h / ny
                    bp["slots"].append(slot(obj, cx, cy, r["label"] + f" {i * ny + j + 1}"))
        else:
            fac = "E" if h > w * 1.6 and od < ow else "S"
            bp["slots"].append(slot(obj, x + w / 2, y + h / 2, r["label"], facing=fac))


KITS = {
    "home": ["hearth", "bed-box", "table", "chest", "bench", "shelf", "cask"],
    "inn": ["hearth", "table", "table", "bench", "bench", "counter", "cask", "cask"],
    "mill": ["millstones", "sack", "sack", "sack", "bed-box", "hearth"],
    "smithy": ["forge", "anvil", "workbench", "trough", "woodpile"],
    "church": ["altar", "font", "bench", "bench", "lectern", "crucifix"],
    "hall": ["hearth", "table-long", "chair", "bench", "bench", "chest"],
    "store": ["sack", "sack", "crate", "cask", "crate", "sack"],
    "barn": ["haystack", "cart", "sack"],
    "stable": ["stall-horse", "stall-horse", "trough", "haystack"],
}


def _clash(r, rects, pad=0.15):
    for o in rects:
        if r[0] < o[0] + o[2] + pad and o[0] < r[0] + r[2] + pad and r[1] < o[1] + o[3] + pad and o[1] < r[1] + r[3] + pad:
            return True
    return False


def _seg_hits_rect(c, r, pad=0.08):
    """Does wall segment c cross the inside of rect r (shrunk by pad)?"""
    x0, y0, x1, y1 = r[0] + pad, r[1] + pad, r[0] + r[2] - pad, r[1] + r[3] - pad
    if x1 <= x0 or y1 <= y0: return False
    ax, ay, bx, by = c
    for i in range(21):
        t = i / 20; x, y = ax + (bx - ax) * t, ay + (by - ay) * t
        if x0 < x < x1 and y0 < y < y1: return True
    return False


def furnish_buildings(bp):
    """Lay a starting kit for each roofed building's use along its inner walls, keeping each doorway clear.
    Every such slot is marked auto, for the per-map furnishing pass to move or replace."""
    for b in bp["buildings"]:
        if not b["use"]:
            b["use"] = "home"; bp["open"].append(f"building {b['id']} ({b['label'] or 'unnamed'}): use guessed as a home")
        kit = KITS.get(b["use"])
        if not kit: continue
        inner = [w["c"] for w in bp["walls"] if w["kind"] in ("solid", "window")]
        x, y, w, h = b["rect"]; e = 0.45                               # roof eaves overhang the walls
        ix, iy, iw, ih = x + e, y + e, w - 2 * e, h - 2 * e
        if iw < 2 or ih < 2: continue
        taken = [s["rect"] for s in bp["slots"]]
        for dr in bp["doors"]:
            mx, my = (dr["c"][0] + dr["c"][2]) / 2, (dr["c"][1] + dr["c"][3]) / 2
            if _inside([ix, iy, iw, ih], mx, my, 0.6): taken.append([mx - 1.0, my - 1.0, 2.0, 2.0])
        for obj in kit:
            ow, od = size_sq(obj)
            spots = []
            if obj in ("hearth", "millstones", "forge", "haystack") or obj == "table" and b["use"] != "home":
                spots.append((ix + iw / 2, iy + ih / 2, "S"))
            t = 0.0
            while t <= 1.0001:
                spots += [(ix + ow / 2 + t * (iw - ow), iy + od / 2 + 0.05, "S"),
                          (ix + ow / 2 + t * (iw - ow), iy + ih - od / 2 - 0.05, "N"),
                          (ix + od / 2 + 0.05, iy + ow / 2 + t * (ih - ow), "E"),
                          (ix + iw - od / 2 - 0.05, iy + ow / 2 + t * (ih - ow), "W")]
                t += 0.125
            for cx, cy, fac in spots:
                s = slot(obj, cx, cy, f"{CAT[obj]['label']} ({b['label'] or b['id']})", facing=fac)
                r = s["rect"]
                if r[0] < ix - 1e-6 or r[1] < iy - 1e-6 or r[0] + r[2] > ix + iw + 1e-6 or r[1] + r[3] > iy + ih + 1e-6: continue
                if _clash(r, taken): continue
                if any(_seg_hits_rect(c, r) for c in inner): continue
                bp["slots"].append(s); taken.append(r); break


# ---------------------------------------------------------------- seeding from tools/pixelmap output

def seed_pixelmap(mapdir, id_=None, tier=2, scene=None):
    name = os.path.basename(os.path.normpath(mapdir))
    if mapdir.endswith(".wodx.json"):                                   # a lone sidecar (tools/mapgen writes no dd2vtt)
        side = json.load(open(mapdir)); vtt = None; name = os.path.basename(mapdir)[:-10]
    else:
        side = json.load(open(os.path.join(mapdir, f"{name}.wodx.json")))
        vp = os.path.join(mapdir, f"{name}.dd2vtt")
        vtt = json.load(open(vp)) if os.path.exists(vp) else None
    W, H = side["cells"]
    bp = blank(id_ or slug(side["name"]), side["name"], (W, H), tier,
               {"kind": "pixelmap", "drawer": f"tools/pixelmap/maps/{name}.py", "seed": side.get("seed")})
    if vtt:
        for seg in vtt["line_of_sight"]:
            bp["walls"].append({"c": [seg[0]["x"], seg[0]["y"], seg[-1]["x"], seg[-1]["y"]], "kind": "solid"})
    else:                                                              # walls round each building's region
        bp["source"] = {"kind": "mapgen", "drawer": "tools/mapgen", "seed": side.get("seed"), "era": side.get("era")}
        for r in side["regions"]:
            if (r.get("place") or {}).get("kind", "other") in ("street", "market", "other", "gate"): continue
            if re.search(r"\b(street|road|lane|market|square)\b", r["label"].lower()): continue
            x, y, w, h = r["rect"]
            for c in ([x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]):
                bp["walls"].append({"c": c, "kind": "solid"})
    for o in side["openings"]:
        k = o["flags"]["kind"]
        if k == "shutter": bp["walls"].append({"c": o["c"], "kind": "window"})
        else: bp["doors"].append({"c": o["c"], "kind": "door", "locked": o["flags"].get("lock") not in (None, "none")})
    for r in side["regions"]:
        bp["rooms"].append({"id": r["id"], "label": r["label"], "rect": r["rect"], "use": (r.get("place") or {}).get("kind", "")})
    for r in side.get("roofs", []):
        bp["buildings"].append({"id": r["id"].replace("roof-", ""), "label": r["label"].replace("Roof (", "").rstrip(")"),
                                "rect": r["rect"], "use": "", "roof": True})
    for f in side["features"]:
        if f.get("flags", {}).get("light"):
            lt = f["light"]; x, y, w, h = f["rect"]
            bp["lights"].append({"x": round(x + w / 2, 3), "y": round(y + h / 2, 3), "kind": "fire",
                                 "bright": lt["bright"], "dim": lt["dim"], "color": lt["color"]})
            continue
        obj = match(f["label"]) or "thing"
        x, y, w, h = f["rect"]
        s = slot(obj, x + w / 2, y + h / 2, f["label"], auto=False, sid=f["id"])
        bp["slots"].append(s)
    have = {(round(s["rect"][0] + s["rect"][2] / 2, 1), round(s["rect"][1] + s["rect"][3] / 2, 1)) for s in bp["slots"]}
    for k in side.get("key", []):
        if k["name"].startswith(("Door", "Window")): continue
        if (round(k["x"], 1), round(k["y"], 1)) in have: continue
        obj = match(k["name"])
        if obj:
            bp["slots"].append(slot(obj, k["x"], k["y"], k["name"], auto=False))
        else:
            bp["labels"].append({"x": k["x"], "y": k["y"], "text": k["name"]})
    bp["slots"] = _uniq(bp["slots"])
    if scene:
        sc = seed_scene(scene, bp["id"], tier)
        bp["exits"], bp["layers"] = sc["exits"], sc["layers"]
        bp["labels"] += [l for l in sc["labels"] if not l.get("used")]
        bp["source"]["scene"] = sc["source"]["file"]
        if not bp["lights"]: bp["lights"] = sc["lights"]
    return bp


# ---------------------------------------------------------------- checks

def check(bp):
    """The rules a blueprint must meet before it is filled with art. Returns a list of problems (empty is good)."""
    out = []
    W, H = bp["cells"]
    for s in bp["slots"]:
        if s["obj"] not in CAT: out.append(f"slot {s['id']}: unknown object {s['obj']}"); continue
        x, y, w, h = s["rect"]
        if x < -0.01 or y < -0.01 or x + w > W + 0.01 or y + h > H + 0.01: out.append(f"slot {s['id']}: off the map")
        ew, ed = size_sq(s["obj"])
        if sorted((round(w, 2), round(h, 2))) != sorted((round(ew, 2), round(ed, 2))):
            out.append(f"slot {s['id']}: not its true size ({w:.2f} x {h:.2f}, want {ew:.2f} x {ed:.2f})")
    for dr in bp["doors"]:
        mx, my = (dr["c"][0] + dr["c"][2]) / 2, (dr["c"][1] + dr["c"][3]) / 2
        for s in bp["slots"]:
            if s.get("auto") and _inside(s["rect"], mx, my, 0.3): out.append(f"slot {s['id']}: blocks a doorway at {mx:.1f},{my:.1f}")
    if bp["walls"] and not bp["lights"]: out.append("no lights: every map needs Foundry lighting")
    if not any(e["state"] == "drawn" for e in bp["eras"]): out.append("no era stage is drawn")
    return out


# ---------------------------------------------------------------- drawing

INK = {"bg": (16, 42, 77), "grid": (34, 70, 112), "grid5": (52, 92, 138), "wall": (236, 242, 250),
       "fence": (150, 190, 225), "window": (120, 220, 255), "hedge": (110, 190, 140), "door": (255, 176, 74),
       "secret": (255, 100, 160), "building": (140, 170, 205), "room": (95, 135, 180),
       "keep": (120, 230, 140), "pending": (250, 215, 90), "todo": (200, 210, 225),
       "fire": (255, 170, 70), "lamp": (255, 230, 160), "eerie": (170, 140, 255), "exit": (255, 110, 200),
       "label": (205, 220, 240), "title": (255, 255, 255)}


def _font(px):
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(f): return ImageFont.truetype(f, px)
    return ImageFont.load_default()


def _dash(dr, a, b, fill, width, on=6, off=5):
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    if L < 1: return
    ux, uy = (b[0] - a[0]) / L, (b[1] - a[1]) / L; t = 0
    while t < L:
        e = min(L, t + on); dr.line([(a[0] + ux * t, a[1] + uy * t), (a[0] + ux * e, a[1] + uy * e)], fill=fill, width=width); t = e + off


def render(bp, out, px=None):
    W, H = bp["cells"]
    px = px or max(16, min(48, int(1800 / max(W, H))))
    head, foot = 56, 64
    img = Image.new("RGB", (W * px, H * px + head + foot), INK["bg"])
    dr = ImageDraw.Draw(img)
    X = lambda v: v * px; Y = lambda v: v * px + head
    for i in range(W + 1): dr.line([(X(i), Y(0)), (X(i), Y(H))], fill=INK["grid5"] if i % 5 == 0 else INK["grid"], width=1)
    for j in range(H + 1): dr.line([(X(0), Y(j)), (X(W), Y(j))], fill=INK["grid5"] if j % 5 == 0 else INK["grid"], width=1)
    f_s, f_m, f_l = _font(max(9, px // 3)), _font(max(11, px // 2)), _font(22)
    for b in bp["buildings"]:
        x, y, w, h = b["rect"]
        for a, c in (((x, y), (x + w, y)), ((x + w, y), (x + w, y + h)), ((x + w, y + h), (x, y + h)), ((x, y + h), (x, y))):
            _dash(dr, (X(a[0]), Y(a[1])), (X(c[0]), Y(c[1])), INK["building"], 1, 3, 4)
        if b["label"]: dr.text((X(x) + 3, Y(y) + 2), b["label"], fill=INK["building"], font=f_s)
    for r in bp["rooms"]:
        x, y, w, h = r["rect"]
        dr.rectangle([X(x), Y(y), X(x + w), Y(y + h)], outline=INK["room"], width=1)
        dr.text((X(x) + 3, Y(y + h) - px // 3 - 4), r["label"], fill=INK["room"], font=f_s)
    for l in bp["lights"]:
        c = INK.get(l["kind"], INK["lamp"]); cx, cy = X(l["x"]), Y(l["y"])
        rd, rb = l["dim"] * px, l["bright"] * px
        if rb > 2: dr.ellipse([cx - rb, cy - rb, cx + rb, cy + rb], outline=c, width=1)
        dr.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=c)
    for s in bp["slots"]:
        x, y, w, h = s["rect"]; c = INK[s["art"]]
        box = [X(x), Y(y), X(x + w), Y(y + h)]
        dr.rectangle(box, outline=c, width=2 if not s.get("auto") else 1)
        f = {"N": (0.5, 0), "S": (0.5, 1), "E": (1, 0.5), "W": (0, 0.5)}[s.get("facing", "S")]
        fx, fy = X(x + w * f[0]), Y(y + h * f[1]); dr.ellipse([fx - 2, fy - 2, fx + 2, fy + 2], fill=c)
        if w * px > 26 and h * px > 10:
            dr.text((box[0] + 2, box[1] + 1), s["obj"], fill=c, font=f_s)
    for w in bp["walls"]:
        a, b = (X(w["c"][0]), Y(w["c"][1])), (X(w["c"][2]), Y(w["c"][3])); k = w["kind"]
        if k == "solid": dr.line([a, b], fill=INK["wall"], width=max(3, px // 8))
        elif k == "window": dr.line([a, b], fill=INK["window"], width=max(3, px // 8))
        elif k == "hedge": _dash(dr, a, b, INK["hedge"], 2, 4, 3)
        else: _dash(dr, a, b, INK["fence"], 2, 6, 4)
    for d in bp["doors"]:
        a, b = (X(d["c"][0]), Y(d["c"][1])), (X(d["c"][2]), Y(d["c"][3]))
        c = INK["secret"] if d["kind"] == "secret" else INK["door"]
        dr.line([a, b], fill=c, width=max(4, px // 6))
        if d.get("locked"): dr.rectangle([(a[0] + b[0]) / 2 - 3, (a[1] + b[1]) / 2 - 3, (a[0] + b[0]) / 2 + 3, (a[1] + b[1]) / 2 + 3], fill=(255, 60, 60))
    for e in bp["exits"]:
        x, y, w, h = e["rect"]; c = INK["exit"]
        dr.rectangle([X(x), Y(y), X(x + w), Y(y + h)], outline=c, width=2)
        t = ("to " + (e["to"] or "?")) if e["kind"] == "exit" else "arrive"
        dr.text((X(x) + 3, Y(y) + 2), t, fill=c, font=f_s)
    for l in bp["labels"]:
        if l.get("used"): continue
        dr.text((X(l["x"]) + 5, Y(l["y"]) - 5), l["text"][:42], fill=INK["label"], font=f_s)
    # title block and legend
    dr.rectangle([0, 0, img.width, head - 1], fill=(10, 28, 54))
    dr.text((10, 8), f"{bp['name']}", fill=INK["title"], font=f_l)
    n_keep = sum(s["art"] == "keep" for s in bp["slots"]); n_pend = sum(s["art"] == "pending" for s in bp["slots"])
    dr.text((10, 34), f"Blueprint {bp['id']} · tier {bp['tier']} · {W} x {H} squares of 5 ft ({W * 5} x {H * 5} ft) · "
                      f"{len(bp['slots'])} object slots ({n_keep} with approved art, {n_pend} pending) · layers: {', '.join(bp['layers'])}",
            fill=INK["label"], font=f_s)
    y0 = H * px + head + 10; x0 = 10
    leg = [("wall", "wall"), ("window", "window"), ("fence", "fence or edge"), ("door", "door"), ("secret", "secret door"),
           ("keep", "slot: approved art"), ("pending", "slot: art pending"), ("todo", "slot: no art yet"),
           ("fire", "fire light"), ("eerie", "eerie light"), ("exit", "exit"), ("building", "roofed building")]
    for k, t in leg:
        dr.rectangle([x0, y0 + 4, x0 + 14, y0 + 14], outline=INK[k], width=3)
        dr.text((x0 + 18, y0 + 2), t, fill=INK["label"], font=f_s); x0 += 30 + int(dr.textlength(t, font=f_s))
        if x0 > img.width - 140: x0 = 10; y0 += 18
    sx = img.width - 5 * px - 20; sy = H * px + head + foot - 18
    dr.line([(sx, sy), (sx + 5 * px, sy)], fill=INK["title"], width=3)
    dr.text((sx, sy - 16), "25 ft", fill=INK["title"], font=f_s)
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    img.save(out, optimize=True)
    return out


def sheet(out, pngs, cols=4, cell=520):
    ims = [Image.open(p).convert("RGB") for p in pngs]
    rows = math.ceil(len(ims) / cols)
    S = Image.new("RGB", (cols * cell, rows * cell), INK["bg"])
    for i, im in enumerate(ims):
        im.thumbnail((cell - 10, cell - 10))
        S.paste(im, ((i % cols) * cell + 5, (i // cols) * cell + 5))
    S.save(out, optimize=True)
    return out


def _arg(flag, default=None):
    a = sys.argv
    return a[a.index(flag) + 1] if flag in a else default


def main():
    if len(sys.argv) < 3: raise SystemExit(__doc__)
    cmd = sys.argv[1]
    if cmd in ("seed-scene", "seed-pixelmap"):
        src, dst = sys.argv[2], sys.argv[3]
        tier = int(_arg("--tier", 3)); id_ = _arg("--id")
        bp = seed_scene(src, id_, tier) if cmd == "seed-scene" else seed_pixelmap(src, id_, tier, _arg("--scene"))
        json.dump(bp, open(dst, "w"), indent=1, ensure_ascii=False)
        print(dst, len(bp["walls"]), "walls", len(bp["doors"]), "doors", len(bp["slots"]), "slots")
    elif cmd == "render":
        print(render(json.load(open(sys.argv[2])), sys.argv[3], int(_arg("--px", 0)) or None))
    elif cmd == "check":
        bad = 0
        for p in sys.argv[2:]:
            probs = check(json.load(open(p)))
            for pr in probs: print(f"{p}: {pr}")
            bad += bool(probs)
        sys.exit(1 if bad else 0)
    elif cmd == "sheet":
        print(sheet(sys.argv[2], sys.argv[3:]))
    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
