"""WoDX pixel map drawer (B5730-B5735): records a map while it is drawn and writes it out as everything Foundry needs.

    rec = Recorder("Farmhouse", cells=(20, 14), seed=77, place="yard")
    m = rec.m                       # a px.Map: draw on it with px and props as usual
    rec.wall(4, 3, 16, 3, th=26, kind="wood")
    props.door(m, 7, 10, 8, 10, 26, name="Front door")     # an openable: recorded, cut out later
    rec.light("bake-oven", "Bake oven", (4.1, 3.1, 1.4, 1.4), dim=3, bright=1)
    rec.region("house", "Farmhouse", (4, 3, 12, 7), place="home")
    rec.finish("out/farmhouse")

finish() writes, in the folder given (named after its last part):
    <name>.png        the map with every openable left out (no leaf in a doorway, no shutters, no chest), daylight paint
    art/<id>-<state>.png   each openable in each state (closed, open), transparent round it, all the same size
    <name>.dd2vtt     Universal VTT: size, walls (split where doors and windows are), portals; what mapimport.mjs reads
    <name>.wodx.json  the WoDX sidecar (WoDX Interactables adopt-rules.mjs): openings with their pictures, containers
                      with theirs, lights, regions, and every named object in "key" (what a player would call it, where)
In Foundry, mapimport.mjs makes the scene and its walls, and adopting the sidecar lays a tile over each openable whose
picture follows its state (B5733), so a shut door shows shut and an opened chest shows open, for every player.
"""
import json, os, re

import numpy as np
from PIL import Image

import px
import props
from px import Map, T

STATES = ("closed", "open")
# What WoDX Interactables makes of each kind of openable (interact-rules.mjs CONTAINERS; adopt-rules.mjs openings)
CONTAINER = {"chest": {"kind": "chest", "lock": "cheap"}, "barrel": {"kind": "box", "lock": "none"},
             "crate": {"kind": "box", "lock": "none"}, "sack": {"kind": "box", "lock": "none"}}
WORDS = {"chest": "Chest", "barrel": "Cask", "crate": "Crate", "sack": "Sack", "door": "Door", "window": "Window"}


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")[:60] or "thing"


class Recorder:
    def __init__(self, name, cells, seed=1, place=None):
        if px.Q != 1: raise SystemExit("The recorder draws at the full grain only (unset PIXELMAP_COARSE).")
        self.name, self.cells, self.seed, self.place = name, tuple(cells), seed, place
        self.m = Map(cells[0], cells[1], seed=seed)
        self.walls, self.things, self.lights, self.regions, self.key, self.ids = [], [], [], [], [], set()
        props.REC = self

    # ---- recording ----
    def _id(self, base):
        b = slug(base); i, out = 1, b
        while out in self.ids: i += 1; out = f"{b}-{i}"
        self.ids.add(out); return out

    def wall(self, x0, y0, x1, y1, th=26, kind="wood"):
        """A wall drawn and kept as a Foundry wall (squares, along its middle line)."""
        self.m.wall(x0, y0, x1, y1, th=th, kind=kind); self.walls.append((x0, y0, x1, y1))

    def note(self, name, x, y):
        """A named object at a square: the key a player's eye and later game logic read."""
        self.key.append({"name": name, "x": round(x, 2), "y": round(y, 2)})

    def openable(self, kind, box, draw, name=None, flags=None, opening=None):
        label = name or WORDS.get(kind, kind.title())
        o = {"kind": kind, "box": box, "draw": draw, "label": label, "flags": flags or {}, "opening": opening,
             "id": self._id(label)}
        self.things.append(o)
        x0, y0, x1, y1 = box; self.note(label, (x0 + x1) / 2 / T, (y0 + y1) / 2 / T)

    def light(self, id_, label, rect, dim=3, bright=1, color="#ff9a3c", kind="torch", on=True):
        self.lights.append({"id": self._id(id_), "label": label, "rect": [round(v, 3) for v in rect],
                            "flags": {"light": True, "lightKind": kind, "title": label},
                            "light": {"dim": dim, "bright": bright, "color": color, "on": on}})

    def region(self, id_, label, rect, place):
        self.regions.append({"id": self._id(id_), "label": label, "rect": list(rect), "place": {"kind": place}})

    # ---- writing ----
    def _cut(self, o, art):
        """Draw one openable in each state over the finished map, keep only the pixels it changed, and put the map back."""
        img = self.m.img; W, H = img.size
        x0, y0, x1, y1 = max(0, o["box"][0]), max(0, o["box"][1]), min(W, o["box"][2]), min(H, o["box"][3])
        keep = img.crop((x0, y0, x1, y1)); base = np.asarray(keep.convert("RGB")).astype(int)
        shots = {}
        for st in STATES:
            o["draw"](state=st)
            now = img.crop((x0, y0, x1, y1)).convert("RGB"); a = np.asarray(now).astype(int)
            mask = (np.abs(a - base).sum(2) > 6).astype(np.uint8) * 255
            shots[st] = Image.fromarray(np.dstack([a, mask]).astype(np.uint8), "RGBA")
            img.paste(keep, (x0, y0))
        boxes = [s.getbbox() for s in shots.values() if s.getbbox()]
        if not boxes: return None
        bx0, by0 = min(b[0] for b in boxes), min(b[1] for b in boxes); bx1, by1 = max(b[2] for b in boxes), max(b[3] for b in boxes)
        paths = {}
        for st, s in shots.items():
            p = f"art/{o['id']}-{st}.png"; s.crop((bx0, by0, bx1, by1)).save(os.path.join(art, os.path.basename(p)), optimize=True); paths[st] = p
        r = [(x0 + bx0) / T, (y0 + by0) / T, (bx1 - bx0) / T, (by1 - by0) / T]
        return paths, [round(v, 3) for v in r]

    def _walls_split(self, openings):
        """Each wall as Foundry wall pieces, with the stretch at every door or window cut out (that is a portal)."""
        out = []
        for x0, y0, x1, y1 in self.walls:
            horiz = abs(y0 - y1) < 1e-6; a, b = sorted((x0, x1) if horiz else (y0, y1)); line = y0 if horiz else x0
            cuts = []
            for o in openings:
                c = o["c"]
                if horiz and abs(c[1] - c[3]) < 1e-6 and abs(c[1] - line) < 1e-3: cuts.append(tuple(sorted((c[0], c[2]))))
                if not horiz and abs(c[0] - c[2]) < 1e-6 and abs(c[0] - line) < 1e-3: cuts.append(tuple(sorted((c[1], c[3]))))
            pos, runs = a, []
            for ca, cb in sorted(cuts):
                if cb <= a or ca >= b: continue
                if ca > pos: runs.append((pos, ca))
                pos = max(pos, cb)
            if pos < b: runs.append((pos, b))
            for s, e in runs: out.append([(s, line), (e, line)] if horiz else [(line, s), (line, e)])
        return [[{"x": round(p[0], 3), "y": round(p[1], 3)} for p in seg] for seg in out]

    def finish(self, outdir):
        props.REC = None
        name = os.path.basename(os.path.normpath(outdir)); art = os.path.join(outdir, "art"); os.makedirs(art, exist_ok=True)
        for f in os.listdir(art):
            if f.endswith(".png"): os.remove(os.path.join(art, f))
        openings, features = [], []
        for o in self.things:
            got = self._cut(o, art)
            if not got: continue
            paths, rect = got
            if o["opening"]:
                op = o["opening"]; win = op["kind"] == "shutter"
                openings.append({"id": o["id"], "label": o["label"], "c": [round(v, 3) for v in op["c"]], "inside": [round(v, 3) for v in op["inside"]],
                                 "barInside": bool(op["exterior"]), "flags": {"kind": op["kind"], "material": "wood", "lock": "none", **o["flags"]},
                                 "art": paths, "artRect": rect, "startOpen": win})
            else:
                fl = {"container": True, "items": "", "fillPlace": "home", **CONTAINER.get(o["kind"], {"kind": "box", "lock": "none"}), **o["flags"]}
                features.append({"id": o["id"], "label": o["label"], "rect": rect, "flags": fl, "art": paths})
        features += self.lights
        self.m.save(os.path.join(outdir, f"{name}.png"))
        W, H = self.cells
        vtt = {"format": 0.3, "resolution": {"map_origin": {"x": 0, "y": 0}, "map_size": {"x": W, "y": H}, "pixels_per_grid": T},
               "line_of_sight": self._walls_split(openings), "objects_line_of_sight": [],
               "portals": [{"position": {"x": (o["c"][0] + o["c"][2]) / 2, "y": (o["c"][1] + o["c"][3]) / 2},
                            "bounds": [{"x": o["c"][0], "y": o["c"][1]}, {"x": o["c"][2], "y": o["c"][3]}],
                            "rotation": 0 if o["c"][1] == o["c"][3] else 1.5708, "closed": not o["startOpen"], "freestanding": False} for o in openings],
               "environment": {"baked_lighting": False, "ambient_light": "ffffffff"}, "lights": [], "image": ""}
        json.dump(vtt, open(os.path.join(outdir, f"{name}.dd2vtt"), "w"), indent=1)
        side = {"format": "wodx-map", "version": 1, "name": self.name, "map": f"{name}.png", "cells": [W, H], "seed": self.seed,
                **({"place": {"kind": self.place}} if self.place else {}), "drawer": "tools/pixelmap",
                "openings": openings, "features": features, "regions": self.regions, "key": self.key}
        json.dump(side, open(os.path.join(outdir, f"{name}.wodx.json"), "w"), indent=1)
        return side
