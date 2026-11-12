"""WoDX voice server: gather human reference voices for Chatterbox.

    python tools/voices/fetch_voices.py <folder> [--count 48] [--splits dev.clean,test.clean] [--local <dir>] [--source parquet|rows]

Takes readers from LibriTTS-R (CC BY 4.0; recordings from LibriVox, public domain), one speaker per voice. By default it
downloads one Parquet file per split from the Hugging Face hub (a few large downloads, needs pyarrow); --source rows uses
the dataset viewer instead (many small requests, which the viewer may refuse with 429). A Hugging Face token in the
HF_TOKEN environment variable is used when set, and is never needed for this public set. For each reader it prefers lines read as dialogue (quotes, exclamations, questions) and
lines whose pitch moves, since Chatterbox copies the cadence of its reference: a lively reference gives a lively NPC.
Clips of 8 to 14 seconds are built from the best one or two lines. Then it keeps the readers spread widest over pitch
and pace, so no two NPC voices sit close together. --local adds your own WAV files (only clips you have the right to use).

Writes <folder>/<id>.wav and <folder>/voices.json [{id, file, f0, register, rate, lively, licence, credit, label}].
Run from the tools-env .venv-tts Python (numpy and soundfile).
"""
import argparse, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

API = "https://datasets-server.huggingface.co/rows"
DATASET = "mythicinfinity/libritts_r"
CONFIG = "clean"
HUB = "https://huggingface.co"


def headers():
    h = {"User-Agent": "wodx-voices/1"}
    tok = os.environ.get("HF_TOKEN", "").strip()
    if tok:
        h["Authorization"] = "Bearer " + tok
    return h


def get(url, tries=6, timeout=120):
    """GET with back-off: on 429 or 5xx it waits as long as the server asks (Retry-After), else 5, 10, 20 s and so on."""
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers()), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if i == tries - 1 or (e.code != 429 and e.code < 500):
                raise
            wait = e.headers.get("Retry-After") if e.headers else None
            try:
                wait = float(wait)
            except (TypeError, ValueError):
                wait = 5 * 2 ** i
            print(f"  {e.code} from {urllib.parse.urlparse(url).netloc}; waiting {min(wait, 300):.0f} s")
            time.sleep(min(wait, 300))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(5 * (i + 1))


def download(url, dest):
    """A large file, streamed to disk, kept for the next run."""
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    tmp = dest + ".part"
    req = urllib.request.Request(url, headers=headers())
    with urllib.request.urlopen(req, timeout=300) as r, open(tmp, "wb") as f:
        total = int(r.headers.get("Content-Length") or 0)
        got = 0
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            f.write(b)
            got += len(b)
            if total:
                sys.stdout.write(f"\r  {os.path.basename(dest)}: {got >> 20} of {total >> 20} MB"); sys.stdout.flush()
    print()
    os.replace(tmp, dest)
    return dest


def parquet_files(split):
    """The Parquet files for a split: the repo's own if it has them, else the hub's converted copy."""
    try:
        info = json.loads(get(f"{HUB}/api/datasets/{DATASET}"))
        names = [s["rfilename"] for s in info.get("siblings", []) if s.get("rfilename", "").endswith(".parquet")]
        keys = {split, split.replace(".", "_"), split.replace(".", "-")}
        own = sorted(n for n in names if any(k in n for k in keys) and (CONFIG in n or "clean" in split))
        if own:
            return [f"{HUB}/datasets/{DATASET}/resolve/main/{urllib.parse.quote(n)}" for n in own]
    except Exception as e:
        print(f"  file list: {e}")
    return json.loads(get(f"{HUB}/api/datasets/{DATASET}/parquet/{CONFIG}/{split}"))


def parquet_rows(split, cache, max_files):
    """Rows of a split from its Parquet files, one row group at a time: {text_original, speaker_id, audio_bytes}."""
    import pyarrow.parquet as pq
    os.makedirs(cache, exist_ok=True)
    for url in parquet_files(split)[:max_files]:
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", urllib.parse.unquote(url.split("/")[-1]))
        path = download(url, os.path.join(cache, f"{split}-{name}"))
        f = pq.ParquetFile(path)
        cols = [c for c in ("text_original", "text_normalized", "speaker_id", "audio") if c in f.schema_arrow.names]
        for g in range(f.num_row_groups):
            for r in f.read_row_group(g, columns=cols).to_pylist():
                a = r.get("audio") or {}
                yield {"text_original": r.get("text_original") or r.get("text_normalized") or "", "speaker_id": r.get("speaker_id"),
                       "audio_bytes": a.get("bytes") if isinstance(a, dict) else None}


def rows(split, limit_rows):
    off = 0
    while off < limit_rows:
        q = urllib.parse.urlencode({"dataset": DATASET, "config": CONFIG, "split": split, "offset": off, "length": 100})
        data = json.loads(get(f"{API}?{q}"))
        batch = data.get("rows", [])
        if not batch:
            return
        for r in batch:
            yield r.get("row", {})
        off += len(batch)
        if off >= data.get("num_rows_total", off):
            return


def text_score(t):
    """How much a line reads as speech to someone: quotes, exclamations, questions, a moderate length."""
    s = 0.0
    s += 2.0 if re.search(r"[\"“”]", t) else 0.0
    s += 1.5 * min(2, t.count("!")) + 1.0 * min(2, t.count("?"))
    s += 0.3 * min(4, t.count(","))
    words = len(t.split())
    s -= 0.0 if 14 <= words <= 40 else 1.0
    return s


def f0_track(x, sr):
    """Pitch per 40 ms frame by autocorrelation, 70 to 400 Hz; 0 where unvoiced."""
    import numpy as np
    n = int(sr * 0.04)
    hop = n // 2
    lo, hi = int(sr / 400), int(sr / 70)
    out = []
    for a in range(0, len(x) - n, hop):
        f = x[a:a + n] - np.mean(x[a:a + n])
        e = float(np.dot(f, f))
        if e < 1e-4:
            out.append(0.0)
            continue
        ac = np.correlate(f, f, mode="full")[n - 1:]
        seg = ac[lo:hi]
        k = int(np.argmax(seg)) + lo
        out.append(sr / k if ac[k] / (ac[0] + 1e-9) > 0.35 else 0.0)
    return np.array(out)


def measure(x, sr, words):
    import numpy as np
    tr = f0_track(x, sr)
    v = tr[tr > 0]
    if v.size < 10:
        return None
    f0 = float(np.median(v))
    semis = 12 * np.log2(v / f0)
    return {"f0": round(f0, 1), "lively": round(float(np.std(semis)), 2), "rate": round(words / (len(x) / sr), 2)}


def decode(raw):
    import numpy as np, soundfile as sf
    x, sr = sf.read(io.BytesIO(raw), dtype="float32")
    if x.ndim > 1:
        x = x.mean(axis=1)
    return x.astype(np.float32), sr


def edge_trim(x, sr, keep=0.05):
    """A reference clip without its quiet or noisy edges: Chatterbox copies what the clip starts with."""
    import numpy as np
    fr = max(1, int(sr * 0.01))
    n = x.size // fr
    if n < 10:
        return x
    rms = np.sqrt(np.mean(x[: n * fr].reshape(n, fr) ** 2, axis=1) + 1e-12)
    on = np.where(rms > rms.max() * 0.06)[0]
    if not on.size:
        return x
    a = max(0, on[0] * fr - int(sr * keep))
    b = min(x.size, (on[-1] + 1) * fr + int(sr * keep))
    return x[a:b]


def register(f0):
    return "low" if f0 < 145 else "high" if f0 > 185 else "mid"


def spread_pick(cands, count):
    """Keep `count` voices far apart in pitch, pace and liveliness, liveliest first among near twins."""
    import math
    cands = sorted(cands, key=lambda c: -c["lively"])
    keep = []
    def dist(a, b):
        return math.sqrt((12 * math.log2(a["f0"] / b["f0"])) ** 2 + (2 * (a["rate"] - b["rate"])) ** 2 + (2 * (a["lively"] - b["lively"])) ** 2)
    while cands and len(keep) < count:
        if not keep:
            keep.append(cands.pop(0))
            continue
        best = max(range(len(cands)), key=lambda i: min(dist(cands[i], k) for k in keep) + 0.5 * cands[i]["lively"])
        keep.append(cands.pop(best))
    return keep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--count", type=int, default=48)
    ap.add_argument("--splits", default="dev.clean,test.clean")
    ap.add_argument("--rows", type=int, default=6000, help="rows read per split")
    ap.add_argument("--per-speaker", type=int, default=3, help="lines tried per reader")
    ap.add_argument("--local", help="a folder of your own WAV clips to add")
    ap.add_argument("--source", default="parquet", choices=["parquet", "rows"], help="Parquet files (default) or the dataset viewer")
    ap.add_argument("--files", type=int, default=1, help="Parquet files read per split")
    ap.add_argument("--cache", help="where the Parquet files are kept (default <folder>/_download)")
    a = ap.parse_args()
    import numpy as np, soundfile as sf
    os.makedirs(a.folder, exist_ok=True)

    by_spk = {}
    cache = a.cache or os.path.join(a.folder, "_download")
    for split in (x.strip() for x in a.splits.split(",") if x.strip()):
        n = 0
        src_rows = parquet_rows(split, cache, a.files) if a.source == "parquet" else rows(split, a.rows)
        for r in src_rows:
            t = r.get("text_original") or r.get("text_normalized") or ""
            spk = str(r.get("speaker_id", "") or "")
            if a.source == "parquet":
                src = r.get("audio_bytes")
            else:
                audio = r.get("audio") or []
                src = audio[0].get("src") if audio and isinstance(audio[0], dict) else None
            if not (spk and src):
                continue
            lst = by_spk.setdefault(spk, [])
            lst.append((text_score(t), t, src))
            if len(lst) > a.per_speaker * 6:
                lst.sort(key=lambda z: -z[0]); del lst[a.per_speaker * 3:]
            n += 1
        print(f"{split}: {n} lines")
    print(f"{len(by_spk)} readers")

    cands = []
    for spk, lines in sorted(by_spk.items()):
        lines.sort(key=lambda z: -z[0])
        got = []
        for score, t, src in lines[: a.per_speaker * 3]:
            if len(got) >= a.per_speaker:
                break
            try:
                x, sr = decode(src if isinstance(src, (bytes, bytearray)) else get(src))
            except Exception:
                continue
            dur = len(x) / sr
            if dur < 3 or dur > 15:
                continue
            m = measure(x, sr, len(t.split()))
            if m:
                got.append((m["lively"] + 0.3 * score, x, sr, m, dur))
        if not got:
            continue
        got.sort(key=lambda z: -z[0])
        x, sr, m, dur = got[0][1], got[0][2], got[0][3], got[0][4]
        if dur < 8 and len(got) > 1:
            gap = np.zeros(int(sr * 0.35), dtype=np.float32)
            x = np.concatenate([x, gap, got[1][1][: int(sr * (14 - dur))]])
        x = x[: int(sr * 14)]
        cands.append({"id": f"lsr{spk}", "x": x, "sr": sr, **m})
        sys.stdout.write("."); sys.stdout.flush()
    print()

    if a.local and os.path.isdir(a.local):
        for name in sorted(os.listdir(a.local)):
            if not name.lower().endswith(".wav"):
                continue
            x, sr = decode(open(os.path.join(a.local, name), "rb").read())
            m = measure(x[: int(sr * 14)], sr, 30) or {"f0": 150.0, "lively": 1.0, "rate": 2.5}
            cands.append({"id": "own_" + re.sub(r"[^a-z0-9]+", "_", name[:-4].lower()), "x": x[: int(sr * 14)], "sr": sr, "own": True, **m})

    keep = spread_pick(cands, a.count)
    out = []
    for c in keep:
        fn = c["id"] + ".wav"
        sf.write(os.path.join(a.folder, fn), edge_trim(c["x"], c["sr"]), c["sr"], subtype="PCM_16")
        own = c.get("own")
        out.append({"id": c["id"], "file": fn, "f0": c["f0"], "register": register(c["f0"]), "rate": c["rate"], "lively": c["lively"],
                    "licence": "your own clip" if own else "CC BY 4.0",
                    "credit": "" if own else f"LibriTTS-R (Koizumi et al., 2023), speaker {c['id'][3:]}, from LibriVox recordings",
                    "label": f"{register(c['f0'])} voice, {c['f0']:.0f} Hz"})
    with open(os.path.join(a.folder, "voices.json"), "w", encoding="utf-8") as f:
        json.dump({"source": f"{DATASET} ({CONFIG}: {a.splits})", "voices": out}, f, indent=1)
    with open(os.path.join(a.folder, "NOTICE.txt"), "w", encoding="utf-8") as f:
        f.write("Reference voices from LibriTTS-R, licensed CC BY 4.0 (https://www.openslr.org/141/).\n"
                "Y. Koizumi et al., LibriTTS-R: A Restored Multi-Speaker Text-to-Speech Corpus, 2023.\n"
                "Built from LibriVox public-domain audiobook recordings. Speaker numbers are in voices.json.\n")
    regs = {r: sum(1 for v in out if v["register"] == r) for r in ("low", "mid", "high")}
    print(f"Kept {len(out)} voices: {regs}. Written to {a.folder}")


if __name__ == "__main__":
    main()
