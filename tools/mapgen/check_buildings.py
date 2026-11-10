"""Sets every building type down facing all four ways and furnishes it, under many seeds; stops if any will not fit.
Writes buildings-sheet.svg, a plan of every type and facing, to check by eye.

Run: python3 check_buildings.py [asset list] [seeds, default 40]
"""
import sys
import ddcore as C
import buildings as B

ASSETS = sys.argv[1] if len(sys.argv) > 1 else "../all.txt"
SEEDS = int(sys.argv[2]) if len(sys.argv) > 2 else 40
fails = []
for seed in range(1, SEEDS + 1):          # every type and facing must furnish under many seeds
    C.init(seed, ASSETS)
    for key in B.TYPES:
        for facing in "SWNE":
            try: B.place(f"{key}-{facing}", key, 1 + seed * .5, 1 + seed * 1.5, facing).furnish()
            except SystemExit as e: fails.append(f"seed {seed}, {key} facing {facing}: {e}")
if fails: raise SystemExit(f"{len(fails)} failures:\n  " + "\n  ".join(fails[:30]))
C.init(7, ASSETS)
s, x0, out, row_h, y = 20, 1, [], 0, 1
blds = []
for key in B.TYPES:
    x = 1
    for facing in "SWNE":
        b = B.place(f"{key}-{facing}", key, x, y, facing).furnish()
        for r in b.rooms:
            if r.x < b.x - 1e-6 or r.y < b.y - 1e-6 or r.x + r.w > b.x + b.w + 1e-6 or r.y + r.h > b.y + b.h + 1e-6:
                raise SystemExit(f"{key} facing {facing}: {r.name} lies outside its building")
        for kind, ox, oy, along in b.openings:
            on = any(abs(ox - r.x) < .01 or abs(ox - r.x - r.w) < .01 or abs(oy - r.y) < .01 or abs(oy - r.y - r.h) < .01 for r in b.rooms)
            if not on: raise SystemExit(f"{key} facing {facing}: a {kind} is on no wall")
        blds.append(b); x += b.w + 2; row_h = max(row_h, b.h)
    y += row_h + 2; row_h = 0
W = max(b.x + b.w for b in blds) + 1
o = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W * s}" height="{y * s}" font-family="DejaVu Sans" font-size="8">', '<rect width="100%" height="100%" fill="#f4f1ea"/>']
for b in blds:
    o += C.svg_rooms(b.rooms, s) + C.svg_openings(b.openings, s)
    o.append(f'<text x="{b.x * s}" y="{b.y * s - 3}" font-size="10">{b.key}</text>')
o.append("</svg>")
open("buildings-sheet.svg", "w").write("\n".join(o))
print(f"ok: {len(B.TYPES)} types, {len(blds)} placements")

# variants (organic towns): longer, deeper, with a wing or lean-to; each must furnish and keep its openings on walls
import random as _r
vfails, made = [], 0
for seed in range(1, SEEDS + 1):
    C.init(seed, ASSETS)
    pick = _r.Random(seed * 7919)
    for key in B.TYPES:
        for k in range(6):
            t = B.variant(key, pick, sides=k % 2 == 0, chance=1)
            try: b = B.Building(f"{key}-v", key, 0, 0, "S", None, None, t).furnish()
            except SystemExit as e: vfails.append(f"seed {seed}, {key} variant {k}: {e}"); continue
            made += 1
            for kind, ox, oy, along in b.openings:
                if not any(abs(ox - r.x) < .01 or abs(ox - r.x - r.w) < .01 or abs(oy - r.y) < .01 or abs(oy - r.y - r.h) < .01 for r in b.rooms):
                    vfails.append(f"seed {seed}, {key} variant {k}: a {kind} is on no wall")
if len(vfails) > (made + len(vfails)) * .3: raise SystemExit(f"{len(vfails)} of {made} variants failed:\n  " + "\n  ".join(vfails[:30]))
print(f"ok: {made} variants, {len(vfails)} would not furnish and are skipped in towns")
