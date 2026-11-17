"""Blind naming test on the PC (B6521). A local picture model (Ollama, qwen2.5vl) is shown each drawing with no name
and asked what it is, the same test the cloud checker runs (object-identity rules, 2026-11-15). Standard library only.

    python tools/vision/blind.py PICTURES_DIR [--names names.json] [--out results.json] [--model qwen2.5vl:7b]

PICTURES_DIR holds PNG files. names.json maps a picture's id (file name without .png, or without a trailing -seed)
to its true name, or to a list of accepted names. With no names file only what the model said is recorded.
Verdict per picture: pass (a true name and sure 4+), unsure (a true name, sure 3), fail (anything else).
Before each picture it waits up to 30 seconds for a gap in the local image model's queue (ComfyUI, port 8188);
past that the two share the graphics card. The picture model is unloaded at the end."""
import base64, json, os, re, sys, time, urllib.request

OLLAMA = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
COMFY = "http://127.0.0.1:8188"
ASK = ("This picture is one map object from a tabletop role-playing game map, drawn in pixel art and seen from "
       "straight above, the size it would be on a 5 foot square grid. Name the single object it shows, as a player "
       "would call it. Reply with JSON only: {\"name\": \"...\", \"sure\": 1-5, \"clues\": \"what in the picture tells you\"}.")


def call(url, body=None, timeout=600):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())


def comfy_busy():
    try:
        q = call(COMFY + "/queue", timeout=5)
        return bool(q.get("queue_running") or q.get("queue_pending"))
    except Exception:
        return False  # not running: nothing to share with


def words(s): return set(re.findall(r"[a-z]+", str(s).lower().replace("-", " ")))


STOP = {"a", "an", "the", "of", "on", "with", "in", "and", "for", "by"}
PREP = {"on", "with", "in", "of", "for", "by", "and"}


def head(t):
    """The naming part of a true name: "cauldron on a tripod" is named by "cauldron"."""
    ws = re.findall(r"[a-z]+", str(t).lower().replace("-", " "))
    for i, x in enumerate(ws):
        if x in PREP and i: return set(ws[:i]) - STOP
    return set(ws) - STOP


def matches(said, truths):
    w = words(said)
    has = lambda x: x in w or x + "s" in w or x + "es" in w or x.rstrip("s") in w
    alts = [a for t in truths for a in re.split(r"\s+or\s+", str(t))]  # "beehive or skep": either name
    return any((tw := head(t)) and all(has(x) for x in tw) for t in alts)


def verdict(said, sure, truths):
    if not truths: return None
    if not matches(said, truths): return "fail"
    return "pass" if sure >= 4 else "unsure" if sure == 3 else "fail"


def truth_for(stem, names):
    for key in (stem, re.sub(r"-\d+$", "", stem)):
        if key in names:
            v = names[key]
            if isinstance(v, list): return v
            if isinstance(v, dict): return [v.get("name")] + v.get("aliases", [])
            return [v]
    return []


def ask(model, path):
    img = base64.b64encode(open(path, "rb").read()).decode()
    r = call(OLLAMA + "/api/generate", {"model": model, "prompt": ASK, "images": [img], "format": "json",
                                        "stream": False, "keep_alive": "2m", "options": {"temperature": 0}})
    try: a = json.loads(r.get("response", "{}"))
    except ValueError: a = {"name": r.get("response", ""), "sure": 1, "clues": "not JSON"}
    try: sure = int(a.get("sure", 1))
    except (TypeError, ValueError): sure = 1
    return {"said": str(a.get("name", "")), "sure": max(1, min(5, sure)), "clues": str(a.get("clues", ""))}


def main(argv):
    if not argv or argv[0].startswith("-"): print(__doc__); return 2
    opt = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
    folder, model = argv[0], opt("--model", "qwen2.5vl:7b")
    names = json.load(open(opt("--names"), encoding="utf-8-sig")) if opt("--names") else {}
    out = opt("--out", os.path.join(folder, "blind-local.json"))
    res = json.load(open(out, encoding="utf-8-sig")) if os.path.exists(out) else {}
    pics = sorted(f for f in os.listdir(folder) if f.lower().endswith(".png"))
    try:
        for i, f in enumerate(pics):
            stem = f[:-4]
            if stem in res: continue
            waited = 0
            while comfy_busy() and waited < 30: time.sleep(0.5); waited += 0.5  # a gap between drawings, else share
            t0 = time.time(); a = ask(model, os.path.join(folder, f))
            truths = truth_for(stem, names)
            a.update({"truth": truths, "verdict": verdict(a["said"], a["sure"], truths), "secs": round(time.time() - t0, 1)})
            res[stem] = a
            json.dump(res, open(out, "w", encoding="utf8"), indent=1)
            print(f"{i + 1}/{len(pics)} {stem}: {a['said']} (sure {a['sure']}) {a['verdict'] or ''} {a['secs']}s", flush=True)
    finally:
        try: call(OLLAMA + "/api/generate", {"model": model, "keep_alive": 0}, timeout=30)
        except Exception: pass
    for a in res.values(): a["verdict"] = verdict(a["said"], a["sure"], a.get("truth") or [])  # rules may have changed
    json.dump(res, open(out, "w", encoding="utf8"), indent=1)
    tally = {}
    for a in res.values(): tally[a["verdict"] or "no name given"] = tally.get(a["verdict"] or "no name given", 0) + 1
    print("tally", json.dumps(tally)); return 0


if __name__ == "__main__": sys.exit(main(sys.argv[1:]))
