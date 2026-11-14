"""The asset catalogue: every Dungeondraft asset Ben has, tagged from its path alone with the general piece it can
stand for (table, seat, bed...), the ages it fits (settle.py's), a style, a worth from 0 to 5 (the everyday goods
scale) and whether it lasts through every age (a barrel, a sack). Palettes are built from it.

Rules are in catalogue_rules.json. Pack names come from ddcore.pack_info (Forgotten Adventures' own table, the PC's
pack table for the rest). Nothing is unpacked: only the paths are read.

Run: python3 catalogue.py --assets A,B --out catalogue.json --unclear unclear.tsv"""
import argparse
import json
import os
import re
import sys

import ddcore as C

BANDS = ["medieval", "early", "reform", "industrial", "republic", "socialist", "modern", "future"]
RULES = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "catalogue_rules.json"), encoding="utf-8"))
_PACKS = [(re.compile(p["match"]), p) for p in RULES["packs"]]
_VETO = set(RULES["veto_words"])
_NOT = [n.split() for n in RULES["not_pieces"]]
_PIECE_WORDS = [(piece, [w.split() for w in ws]) for piece, ws in RULES["piece_words"]]
_FOLDERS = [(re.compile(rx, re.I), piece) for rx, piece in RULES["folders"]]
_LASTING = re.compile(RULES["lasting"], re.I)
_UP = [(re.compile(rx, re.I), n) for rx, n in RULES["worth_up"].items()]
_DOWN = [(re.compile(rx, re.I), n) for rx, n in RULES["worth_down"].items()]
_EARLIEST = [(re.compile(rx, re.I), b) for rx, b in RULES.get("earliest", {}).items()]   # no inventions before their age
_SKIP = re.compile(RULES["skip_folders"], re.I)
_SKIP_NAME = re.compile(RULES["skip_names"], re.I)       # fantasy races, magic: not in the World of Darkness's furniture
_SKIP_PACK = re.compile(RULES["skip_packs"], re.I)
_KINDS = {"walls": "wall", "tilesets": "floor", "patterns": "floor", "portals": "door"}
_NAMES = {}
# measured picture sizes (pixels, 256 to a square), read off the packs on the PC; the newest table wins
SIZE_TABLES = ["/mnt/project-files/asset-sizes-2026-11-11.tsv", "/mnt/project-files/map-furnishing/sizes/asset-sizes-2026-11-13.tsv"]
_MEASURED = None


def measured():
    global _MEASURED
    if _MEASURED is None:
        _MEASURED = {}
        for t in SIZE_TABLES:
            if not os.path.exists(t): continue
            for line in open(t, encoding="utf-8-sig"):
                p = line.rstrip("\n").split("\t")
                if len(p) >= 3 and p[0] != "path":
                    try: _MEASURED[p[0]] = (round(int(p[1]) / 256, 2), round(int(p[2]) / 256, 2))
                    except ValueError: pass
    return _MEASURED


def size_of(path, fname):
    """(cells, sized): the measured size, else the size in the name, else one square (not sized: a guess)."""
    m = measured().get(path)
    if m: return tuple(m), True
    if re.search(r"_(\d+)x(\d+)(?:_\w+)?\.(?:webp|png)$", fname): return tuple(C.cells_of(fname)), True
    return (1, 1), False


def words(stem):
    """The words of a file name, lower case: Horse_Chestnut_Tree_Tiny_01_A -> horse chestnut tree tiny a."""
    stem = re.sub(r"_(Ashen|Light|Dark)(?=_|$)", "", stem)                 # a wood finish is not a lamp
    return [w.lower() for w in re.findall(r"[A-Z]+(?![a-z])|[A-Z]?[a-z]+", stem)]


def _has(ws, phrase):
    n = len(phrase)
    for i in range(len(ws) - n + 1):
        if all(ws[i + k] == p or ws[i + k] in (p + "s", p + "es") for k, p in enumerate(phrase)): return True
    return False


def piece_by_words(stem):
    """The piece a name stands for, by whole words; None for a name that is no furniture (veto_words, not_pieces);
    "?" when no word is known."""
    ws = words(stem)
    if _VETO & set(ws) or any(_has(ws, n) for n in _NOT): return None
    return next((piece for piece, phrases in _PIECE_WORDS if any(_has(ws, ph) for ph in phrases)), "?")


def pack_name(pid):
    if pid not in _NAMES: _NAMES[pid] = C.pack_info(pid)[0]
    return _NAMES[pid]


def _pack_rule(path, pid):
    """The pack rule for a path: the pack's own name, or (for a megapack) a sub-folder name such as "[WFW] Modern"."""
    name = pack_name(pid)
    folders = path.split("/")[3:-1]
    for rx, rule in _PACKS:
        if any(rx.search(f) for f in folders if f.startswith("[")): return rule, name
    for rx, rule in _PACKS:
        if rx.search(name): return rule, name
    return None, name


def tag(path):
    """Tags for one asset path, or None when no rule knows it (it then goes on the unclear list)."""
    parts = path.strip().split("/")
    if len(parts) < 4 or parts[1] != "textures": return None
    pid, kind, fname = parts[0], parts[2], parts[-1]
    if not re.search(r"\.(png|webp|jpg)$", fname, re.I) or re.search(r"_end\.(png|webp)$", fname): return None
    rule, pname = _pack_rule(path, pid)
    if rule is None or _SKIP_PACK.search(pname): return None
    stem = re.sub(r"\.(png|webp|jpg)$", "", fname, flags=re.I)
    if kind in _KINDS:
        piece = _KINDS[kind]
    elif kind == "objects":
        if _SKIP.search("/".join(parts[3:-1])) or _SKIP_NAME.search(fname): return None
        piece = piece_by_words(stem)
        if piece is None: return None
        if piece == "?": piece = next((p for rx, p in _FOLDERS if rx.search("/".join(parts[3:-1]))), None)
        if piece is None: return None
    else:
        return None
    bands, style = list(rule["bands"]), rule["style"]
    m = re.search(r"_Wood_(Ashen|Light|Dark)_", fname, re.I) or re.search(r"(Ashen|Light|Dark)_[A-Z]\.(png|webp)$", fname)
    if m and style == "fa":
        w = RULES["wood"][m.group(1).capitalize()]
        bands, style = list(w["bands"]), w["style"]
    first = next((BANDS.index(b) for rx, b in _EARLIEST if rx.search(stem) or rx.search("/".join(parts[3:-1]))), 0)
    if first:
        later = [b for b in bands if BANDS.index(b) >= first]
        bands = later or BANDS[first:first + 2]                       # a pack of an older age still lends its piece later
    worth = rule["worth"] + sum(n for rx, n in _UP if rx.search(stem)) - sum(n for rx, n in _DOWN if rx.search(stem))
    cells, sized = size_of(path.strip(), fname)
    regions = rule.get("regions")
    if set(words(stem)) & set(RULES.get("asia_words", [])): regions = ["east-asia"]      # bamboo and tatami stay in Asia
    return {"path": path.strip(), "name": fname, "pack": pid, "pack_name": pname, "kind": kind, "piece": piece,
            "style": style, "bands": bands, "worth": max(0, min(5, worth)), "lasting": bool(_LASTING.search(stem)),
            "cells": cells, "sized": sized, "regions": regions}


def piece_of(fname):
    """The general piece an asset name stands for (by name only), or None."""
    stem = re.sub(r"\.(png|webp|jpg)$", "", fname.rsplit("/", 1)[-1], flags=re.I)
    if _SKIP_NAME.search(stem): return None
    p = piece_by_words(stem)
    return None if p == "?" else p


def build(paths):
    """Tags for every path a rule knows, de-duplicated by path."""
    seen, out = set(), []
    for p in paths:
        p = p.strip()
        if not p or p in seen: continue
        seen.add(p)
        t = tag(p)
        if t: out.append(t)
    return out


def read_paths(asset_list):
    return [l.strip() for f in str(asset_list).split(",") if f for l in open(f, encoding="utf-8-sig") if "/textures/" in l]


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--assets", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--unclear")
    a = ap.parse_args(argv)
    paths = read_paths(a.assets)
    cat = build(paths)
    json.dump(cat, open(a.out, "w", encoding="utf-8"), indent=0)
    if a.unclear:
        known = {t["path"] for t in cat}
        with open(a.unclear, "w", encoding="utf-8") as f:
            for p in paths:
                if p not in known and "/textures/objects/" in p: f.write(f"{pack_name(p.split('/')[0])}\t{p}\n")
    need = ("table", "seat", "bed", "light", "wall", "floor")
    print(f"{len(cat)} of {len(paths)} assets tagged")
    for b in BANDS:
        n = {k: sum(1 for t in cat if b in t["bands"] and t["piece"] == k) for k in need}
        gaps = [k for k, v in n.items() if not v]
        print(f"{b:11s} " + " ".join(f"{k}:{v}" for k, v in n.items()) + (f"  GAPS {gaps}" if gaps else ""))


if __name__ == "__main__":
    sys.exit(main())
