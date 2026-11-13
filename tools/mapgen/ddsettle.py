"""WoDX settlement generator: one command for a whole place in a chosen year.

  python3 ddsettle.py --name Linberg --seed 7 --size town --year 1880 --out out/
  python3 ddsettle.py --size village --seed 1197 --out out/                 (a village of 1197)
  python3 ddsettle.py --size city --year 2050 --at brno:12:NE --sewers --out out/

It runs the town generator (ddtown.py, organic layout) for the year: the medieval plan grown through every age up
to it, the buildings of each age, and from 1781 the households and trades of the year (settle.py). Beside the
Dungeondraft maps, their sidecars and the plan it writes <name>.settlement.json, the record of the whole place:
every household with its trade, standing and people, the offices of the age, and the ties between households.
With --sewers it also lays the sewers under each map (ddwarren.py), from 1860 on, in towns and larger.

In Foundry: export each map from Dungeondraft and adopt it (WoDX Interactables), bring the record in under
Settlements in the Storyteller's hand (WoDX NPC) and review it, then seed the residents on each map.

The buildings and ages are those of Moravia and the Bohemian crown lands. With --region (any WoDX Chronicle region)
the households from 1781 take that region's trades: who ruled it after 1918 and the names its way of life gives
(settle.py). Buildings of other lands are not built yet.

The asset lists: WODX_FA_ASSETS and WODX_NEW_ASSETS, or --assets a,b.
"""
import argparse, glob, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FA = os.environ.get("WODX_FA_ASSETS", "/mnt/project-files/maps/farmstead-dd/fa-asset-paths.txt")
NEW = os.environ.get("WODX_NEW_ASSETS", "/mnt/project-files/dd-assets-new-paths.txt")


def main():
    ap = argparse.ArgumentParser(description="One settlement for one year: maps, sidecars, plan and the settlement record.")
    ap.add_argument("--name")
    ap.add_argument("--seed", type=int, default=1197)
    ap.add_argument("--size", choices=("village", "town", "city", "metropolis"), default="village")
    ap.add_argument("--year", type=int, default=1197, help="1197 to 2099")
    ap.add_argument("--region", default="moravia", help="the WoDX Chronicle region the place stands in (france, japan, mexico...): from 1781 its households take that region's trades (settle.py, B3290). The buildings stay those of the Bohemian crown lands")
    ap.add_argument("--at", help="where it stands on the country map: town, or town:km:DIR (brno:12:NE)")
    ap.add_argument("--part", type=int, help="the largest side of one map, in squares; 0 keeps one map")
    ap.add_argument("--sewers", action="store_true", help="also lay the sewers under each map (from 1860, towns and larger)")
    ap.add_argument("--assets", help="asset lists, comma separated; default the Forgotten Adventures list and, when present, the modern and future packs")
    ap.add_argument("--out", default=".")
    a = ap.parse_args()
    if not 1197 <= a.year <= 2099: raise SystemExit("--year must be from 1197 to 2099")
    assets = a.assets or (f"{FA},{NEW}" if os.path.exists(NEW) else FA)
    os.makedirs(a.out, exist_ok=True)
    before = set(glob.glob(os.path.join(a.out, "*.wodx.json")))
    cmd = [sys.executable, os.path.join(HERE, "ddtown.py"), "--seed", str(a.seed), "--size", a.size, "--settle", "--plan", "--assets", assets, "--out", a.out]
    if a.year > 1197: cmd += ["--year", str(a.year)]
    if a.name: cmd += ["--name", a.name]
    if a.at: cmd += ["--at", a.at]
    if a.region != "moravia": cmd += ["--region", a.region]
    if a.part is not None: cmd += ["--part", str(a.part)]
    r = subprocess.run(cmd)
    if r.returncode: raise SystemExit(r.returncode)
    if a.sewers:
        if a.year < 1860 or a.size == "village": print("  no sewers: they come from 1860, in towns and larger")
        else:
            for sc in sorted(set(glob.glob(os.path.join(a.out, "*.wodx.json"))) - before):
                r = subprocess.run([sys.executable, os.path.join(HERE, "ddwarren.py"), "--kind", "sewer", "--under", sc, "--seed", str(a.seed), "--assets", assets, "--out", a.out])
                if r.returncode: print(f"  note: no sewer under {os.path.basename(sc)}")


if __name__ == "__main__":
    main()
