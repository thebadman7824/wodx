"""File downloaded music and ambience into WoDX Atmosphere's era kit folders, with a credits.json entry for each file.

Ben chose free sources only (12 November 2026, B2430). This tool knows those sources and their licences, refuses any
other, and never fetches anything: it only sorts files already downloaded by hand.

Usage, from the repo root:
    python3 tools/atmosphere/sort-downloads.py PLAN.csv --from DOWNLOADS --to KITS [--dry-run] [--no-convert]

PLAN.csv has a header row and one row per file:
    file      the downloaded file, relative to --from
    kit       an era kit id (dark-ages, victorian, modern, future-darkness, ...)
    slot      a music mood (calm, tension, combat, sorrow, wonder, frenzy), an ambience key (a place kind such as
              tavern or sewer, or a weather loop such as rain), or "scene" for music heard in the scene (a ballroom
              band, a church organ) that the Storyteller places on the map as an ambient sound
    source    scott-buckley, soundimage, tabletop-audio, kevin-macleod, musopen, freesound, pixabay, fma, own
    title     the track's title as its source gives it
    author    who made it (needed for freesound, pixabay, fma; the performer or composer for musopen)
    license   needed for freesound and fma, which license per file: CC0, CC BY 4.0, CC BY 3.0, CC BY-NC 4.0 ...
    url       the page the file came from (optional, recorded in the credits)

KITS is the Data folder's wodx-kits folder (or a copy of it). Files go to <kit>/music/<mood>/, <kit>/ambience/ or
<kit>/scene/, converted to Ogg Vorbis at about 128 kbps with ffmpeg unless they are already .ogg or --no-convert is
given. Converting the format is not an edit of the music, so it is allowed under the no-derivatives licences too;
the tool never trims, loops or mixes. Each kit's credits.json is merged, keyed by the new file name.
"""
import argparse, csv, json, os, re, shutil, subprocess, sys

MOODS = ["calm", "tension", "combat", "sorrow", "wonder", "frenzy"]
# Kept in step with modules/wodx-atmosphere/scripts/kits-rules.mjs (PLACE_KINDS, WEATHER_LOOPS, KITS)
PLACE_KINDS = ["home", "workplace", "church", "tavern", "haven", "gate", "market", "street", "castle", "wilds", "caern",
               "alley", "yard", "docks", "park", "sewer", "hospital", "station", "elysium", "chantry", "other"]
WEATHER_LOOPS = ["thunder", "gale", "downpour", "rain", "snow", "wind", "night"]
KITS = ["dark-ages", "long-night", "renaissance", "age-of-reason", "victorian", "wild-west", "great-war", "mid-century",
        "modern", "time-of-judgment", "future-darkness", "classical", "living-gods"]
AUDIO = re.compile(r"\.(ogg|oga|mp3|wav|flac|webm|m4a|opus)$", re.I)

# The free sources Ben accepted, with the licence each one uses and its credit line.
SOURCES = {
    "scott-buckley": {"name": "Scott Buckley", "site": "scottbuckley.com.au", "license": "CC BY 4.0",
                      "credit": '"{title}" by Scott Buckley (scottbuckley.com.au), CC BY 4.0'},
    "soundimage": {"name": "Soundimage.org", "site": "soundimage.org", "license": "Soundimage International Public License",
                   "credit": '"{title}" by Eric Matyas, www.soundimage.org'},
    "tabletop-audio": {"name": "Tabletop Audio", "site": "tabletopaudio.com", "license": "CC BY-NC-ND 4.0",
                       "credit": '"{title}" by Tabletop Audio (tabletopaudio.com), CC BY-NC-ND 4.0'},
    "kevin-macleod": {"name": "Kevin MacLeod", "site": "incompetech.com", "license": "CC BY 4.0",
                      "credit": '"{title}" Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0'},
    "musopen": {"name": "Musopen", "site": "musopen.org", "license": "Public domain",
                "credit": '"{title}"{by}, Musopen (musopen.org), public domain'},
    "freesound": {"name": "Freesound", "site": "freesound.org", "license": None, "needs": ["author", "license"],
                  "credit": '"{title}" by {author} (freesound.org), {license}'},
    "pixabay": {"name": "Pixabay", "site": "pixabay.com", "license": "Pixabay Content License", "needs": ["author"],
                "credit": '"{title}" by {author} (pixabay.com)'},
    "fma": {"name": "Free Music Archive", "site": "freemusicarchive.org", "license": None, "needs": ["author", "license"],
            "credit": '"{title}" by {author} (freemusicarchive.org), {license}'},
    "own": {"name": "Made for WoDX", "site": "", "license": "WoDX's own", "credit": '"{title}", made for WoDX'},
}
# Per-file licences we accept from Freesound and the Free Music Archive (Ben: CC0, CC BY and CC BY-NC; the game is
# non-commercial). FMA-Limited and the share-alike or no-derivatives variants from those two sites are refused.
OPEN_LICENSES = re.compile(r"^(CC0( 1\.0)?|CC BY( [34]\.0)?|CC BY-NC( [34]\.0)?)$", re.I)


def slug(s):
    s = re.sub(r"[^a-z0-9]+", "-", str(s).lower()).strip("-")
    return s[:60] or "track"


def dest_for(row):
    """Where a row's file goes, relative to the kits folder, without its extension; or raise ValueError."""
    kit, slot = row["kit"].strip(), row["slot"].strip().lower()
    if kit not in KITS:
        raise ValueError(f"unknown kit {kit!r}")
    name = slug(row.get("title") or os.path.splitext(os.path.basename(row["file"]))[0])
    if slot in MOODS:
        return f"{kit}/music/{slot}/{name}"
    if slot in PLACE_KINDS or slot in WEATHER_LOOPS:
        # Atmosphere reads the first word of an ambience file's name as its key
        return f"{kit}/ambience/{slot}-{name}"
    if slot == "scene":
        return f"{kit}/scene/{name}"
    raise ValueError(f"unknown slot {slot!r}")


def credit_for(row):
    """The credits.json entry for a row; or raise ValueError when the source or its licence isn't accepted."""
    src = SOURCES.get(row.get("source", "").strip().lower())
    if not src:
        raise ValueError(f"source {row.get('source')!r} is not one of the free sources chosen ({', '.join(SOURCES)})")
    for k in src.get("needs", []):
        if not (row.get(k) or "").strip():
            raise ValueError(f"{src['name']} needs the {k} column")
    lic = src["license"] or row["license"].strip()
    if src["license"] is None and not OPEN_LICENSES.match(lic):
        raise ValueError(f"{src['name']} licence {lic!r} is not CC0, CC BY or CC BY-NC")
    title = (row.get("title") or "").strip() or os.path.splitext(os.path.basename(row["file"]))[0]
    author = (row.get("author") or "").strip()
    credit = src["credit"].format(title=title, author=author, license=lic, by=f" ({author})" if author else "")
    out = {"source": src["name"], "license": lic, "credit": credit, "title": title}
    if author: out["author"] = author
    if (row.get("url") or "").strip(): out["url"] = row["url"].strip()
    return out


def plan(rows):
    """Check every row. Returns (jobs, problems): jobs as dicts with src, dest (no extension), credit."""
    jobs, problems, seen_amb = [], [], {}
    for n, row in enumerate(rows, start=2):
        try:
            if not AUDIO.search(row.get("file", "")):
                raise ValueError("not an audio file")
            dest = dest_for(row)
            jobs.append({"line": n, "src": row["file"], "dest": dest, "credit": credit_for(row)})
            if "/ambience/" in dest:
                key = (row["kit"].strip(), row["slot"].strip().lower())
                if key in seen_amb:
                    problems.append(f"line {n}: {key[0]} already has a {key[1]} loop (line {seen_amb[key]}); "
                                    "Atmosphere plays only the first, so this one waits as a spare")
                seen_amb.setdefault(key, n)
        except (ValueError, KeyError) as e:
            problems.append(f"line {n}: {e}")
    return jobs, problems


def run(plan_path, src_root, kits_root, dry=False, convert=True, ffmpeg="ffmpeg"):
    with open(plan_path, newline="", encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    jobs, problems = plan(rows)
    hard = [p for p in problems if "waits as a spare" not in p]
    for p in problems: print(("REFUSED " if p in hard else "NOTE ") + p)
    credits = {}
    done = 0
    for j in jobs:
        src = os.path.join(src_root, j["src"])
        if not os.path.isfile(src):
            print(f"MISSING line {j['line']}: {src}"); continue
        ext = os.path.splitext(src)[1].lower()
        to_ogg = convert and ext != ".ogg"
        out = os.path.join(kits_root, j["dest"] + (".ogg" if to_ogg else ext))
        print(f"{'would file' if dry else 'filing'} {j['src']} -> {os.path.relpath(out, kits_root)}")
        kit = j["dest"].split("/")[0]
        credits.setdefault(kit, {})[os.path.basename(out)] = j["credit"]
        if dry: done += 1; continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        if to_ogg:
            subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-i", src, "-vn", "-c:a", "libvorbis", "-q:a", "4", out],
                           check=True)
        else:
            shutil.copyfile(src, out)
        done += 1
    if not dry:
        for kit, entries in credits.items():
            path = os.path.join(kits_root, kit, "credits.json")
            have = {}
            if os.path.isfile(path):
                with open(path, encoding="utf-8") as f: have = json.load(f)
            have.update(entries)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f: json.dump(have, f, indent=2, ensure_ascii=False)
    print(f"{done} of {len(rows)} files {'would be ' if dry else ''}filed; {len(hard)} refused")
    return 0 if not hard else 1


if __name__ == "__main__":
    a = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    a.add_argument("plan"); a.add_argument("--from", dest="src", required=True); a.add_argument("--to", dest="kits", required=True)
    a.add_argument("--dry-run", action="store_true"); a.add_argument("--no-convert", action="store_true")
    a.add_argument("--ffmpeg", default="ffmpeg")
    o = a.parse_args()
    sys.exit(run(o.plan, o.src, o.kits, o.dry_run, not o.no_convert, o.ffmpeg))
