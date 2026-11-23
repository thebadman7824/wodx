"""Seed, check and draw every blueprint the inventory can seed (tiers 1 to 3).

    python3 seed_all.py SCENES_DIR PIXELMAP_DIR OUT_PNG_DIR [--tiers 1,2,3] [--keep]

SCENES_DIR: a scene export (one folder per scene, <slug>/<slug>.json), as the testbed export of 15 Nov 2026.
PIXELMAP_DIR: tools/pixelmap outputs, one folder per drawer (forest_road, lt_market, ...), each with its sidecar.
Writes plans/rothenstein/<id>.json and OUT_PNG_DIR/<id>.png. A plan that already exists and has been edited by hand
("seeded": false) is never overwritten; --keep skips every plan that exists.
"""
import json, os, sys

import blueprint as B

HERE = os.path.dirname(os.path.abspath(__file__))


def main():
    scenes, pm, out = sys.argv[1:4]
    tiers = {int(t) for t in B._arg("--tiers", "1,2,3").split(",")}
    keep = "--keep" in sys.argv
    inv = json.load(open(os.path.join(HERE, "inventory.json")))
    plans = os.path.join(HERE, "plans", "rothenstein"); os.makedirs(plans, exist_ok=True); os.makedirs(out, exist_ok=True)
    report = []
    for m in inv["maps"]:
        if m["tier"] not in tiers or ":" not in m["seed"]: continue
        dst = os.path.join(plans, f"{m['id']}.json")
        if os.path.exists(dst):
            old = json.load(open(dst))
            if keep or not old.get("seeded", True): report.append((m["id"], "kept")); continue
        parts = dict(p.split(":", 1) for p in m["seed"].split("+"))
        scene = os.path.join(scenes, parts["scene"], parts["scene"] + ".json") if "scene" in parts else None
        if "pixelmap" in parts and not os.path.exists(os.path.join(pm, parts["pixelmap"], parts["pixelmap"] + ".wodx.json")):
            report.append((m["id"], "skipped: no pixelmap output")); continue
        if "pixelmap" in parts:
            bp = B.seed_pixelmap(os.path.join(pm, parts["pixelmap"]), m["id"], m["tier"], scene)
        else:
            bp = B.seed_scene(scene, m["id"], m["tier"])
        bp["name"] = m["name"]; bp["seeded"] = True
        if m.get("on"): bp["on"] = m["on"]
        json.dump(bp, open(dst, "w"), indent=1, ensure_ascii=False)
        B.render(bp, os.path.join(out, f"{m['id']}.png"))
        probs = B.check(bp)
        report.append((m["id"], f"{len(bp['walls'])} walls, {len(bp['doors'])} doors, {len(bp['slots'])} slots, "
                                f"{len(bp['lights'])} lights, {len(bp['exits'])} exits, {len(probs)} problems"))
    for r in report: print(*r, sep="  ")


if __name__ == "__main__":
    main()
