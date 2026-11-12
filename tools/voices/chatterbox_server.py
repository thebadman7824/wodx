"""WoDX voice server: Chatterbox on the Storyteller's own PC, for WoDX Voices.

Run from the tools-env .venv-tts Python (it has chatterbox-tts, torch with CUDA, soundfile):

    python tools/voices/chatterbox_server.py --voices <folder>            serve on 127.0.0.1:7861
    python tools/voices/chatterbox_server.py --voices <folder> --samples <out>   render the sample set, then stop

<folder> holds the reference voices and voices.json made by fetch_voices.py. Each line copies one reference voice with
the emotion (exaggeration), pace (cfg) and variety (temperature) the module asks for. Long lines are split into
sentences and joined with short, varied pauses; silence is trimmed and loudness evened, so lines sit together.

Safety: listens on 127.0.0.1 only. Every request but the CORS preflight needs the key (header X-WoDX-Key), made on
first start and kept in <folder>/server-key.txt. Browsers may call it only from the allowed Foundry addresses.
Licence: Chatterbox is MIT (Resemble AI). Each reference voice keeps its own licence and credit in voices.json.
"""
import argparse, io, json, os, re, secrets, sys, threading, time, wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ORIGINS = {"http://localhost:30000", "http://127.0.0.1:30000", "https://localhost:30000", "https://127.0.0.1:30000", "https://wodx.online"}
MAX_TEXT = 600
SR_FALLBACK = 24000


def split_sentences(text):
    """Sentences, each kept with its closing marks; very long ones are cut at commas."""
    t = re.sub(r"\s+", " ", str(text or "")).strip()
    if not t:
        return []
    parts = re.findall(r"[^.!?…]+(?:[.!?…]+[\"'”’)]*|$)", t)
    out = []
    for p in (x.strip() for x in parts):
        if not p:
            continue
        while len(p) > 220 and "," in p[:220]:
            cut = p[:220].rfind(",") + 1
            out.append(p[:cut].strip())
            p = p[cut:].strip()
        out.append(p)
    return out


def sentence_delivery(sentence, base):
    """A sentence's own lift: an exclamation gets a little more emotion, a trailing one a little less pace."""
    ex, cfg = base["exaggeration"], base["cfg"]
    if sentence.endswith("!") or sentence.endswith("!\""):
        ex = min(1.5, ex + 0.1)
    if sentence.endswith("...") or sentence.endswith("…"):
        cfg = max(0.2, cfg - 0.05)
    return ex, cfg


def pause_after(sentence, rng):
    """Seconds of quiet after a sentence: longer after a question or a trailing line, never quite the same twice."""
    base = 0.32
    if sentence.endswith("?"):
        base = 0.42
    elif sentence.endswith("...") or sentence.endswith("…"):
        base = 0.55
    elif sentence.endswith(","):
        base = 0.18
    return base + rng.uniform(-0.06, 0.08)


def to_wav_bytes(samples, sr):
    import numpy as np
    pcm = (np.clip(samples, -1.0, 1.0) * 32767.0).astype("<i2")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


def trim_and_level(x, sr):
    """Trim quiet ends (keeping 60 ms) and bring speech to about -20 dBFS RMS with a ceiling at -1 dBFS."""
    import numpy as np
    if x.size == 0:
        return x
    frame = max(1, int(sr * 0.02))
    n = x.size // frame
    if n:
        rms = np.sqrt(np.mean(x[: n * frame].reshape(n, frame) ** 2, axis=1) + 1e-12)
        loud = np.where(rms > max(1e-4, rms.max() * 0.03))[0]
        if loud.size:
            pad = int(sr * 0.06)
            a = max(0, loud[0] * frame - pad)
            b = min(x.size, (loud[-1] + 1) * frame + pad)
            x = x[a:b]
    rms = float(np.sqrt(np.mean(x ** 2) + 1e-12))
    x = x * (0.1 / rms)
    peak = float(np.max(np.abs(x)) or 1.0)
    if peak > 0.89:
        x = x * (0.89 / peak)
    return x


class Voices:
    """The reference voices in a folder, read from voices.json: [{id, file, f0, register, rate, licence, credit}]."""

    def __init__(self, folder):
        self.folder = folder
        with open(os.path.join(folder, "voices.json"), encoding="utf-8") as f:
            data = json.load(f)
        self.list = [v for v in data.get("voices", []) if os.path.exists(os.path.join(folder, v.get("file", "")))]
        self.by_id = {v["id"]: v for v in self.list}

    def public(self):
        keep = ("id", "f0", "register", "rate", "licence", "credit", "label")
        return [{k: v[k] for k in keep if k in v} for v in self.list]

    def path(self, vid):
        v = self.by_id.get(vid)
        return os.path.join(self.folder, v["file"]) if v else None


class Engine:
    """Chatterbox, loaded once, one line at a time. Conditionals are kept per voice, so a voice is read in once."""

    def __init__(self, device):
        import torch
        from chatterbox.tts import ChatterboxTTS
        self.torch = torch
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device
        self.model = ChatterboxTTS.from_pretrained(device=device)
        self.sr = getattr(self.model, "sr", SR_FALLBACK)
        self.conds = {}
        self.lock = threading.Lock()

    def _use(self, vid, path, ex):
        if vid not in self.conds:
            self.model.prepare_conditionals(path, exaggeration=ex)
            self.conds[vid] = self.model.conds
        self.model.conds = self.conds[vid]

    def render(self, text, vid, path, d, seed=0):
        import numpy as np, random
        rng = random.Random(seed)
        out = []
        with self.lock:
            for i, s in enumerate(split_sentences(text)):
                ex, cfg = sentence_delivery(s, d)
                self._use(vid, path, ex)
                self.torch.manual_seed((int(seed) + i * 7919) % 2147483647)
                wav = self.model.generate(s, exaggeration=ex, cfg_weight=cfg, temperature=d["temperature"])
                x = wav.squeeze().detach().cpu().numpy().astype("float32")
                x = trim_and_level(x, self.sr)
                out.append(x)
                out.append(np.zeros(int(self.sr * pause_after(s, rng)), dtype="float32"))
        if not out:
            return b""
        y = np.concatenate(out[:-1]) if len(out) > 1 else out[0]
        return to_wav_bytes(y, self.sr)


def num(v, lo, hi, default):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, x))


def make_handler(engine, voices, key, origins):
    class H(BaseHTTPRequestHandler):
        server_version = "WoDXVoices/1"

        def log_message(self, fmt, *args):
            sys.stderr.write("%s %s\n" % (time.strftime("%H:%M:%S"), fmt % args))

        def _cors(self):
            o = self.headers.get("Origin")
            if o and o in origins:
                self.send_header("Access-Control-Allow-Origin", o)
                self.send_header("Vary", "Origin")

        def _send(self, code, body=b"", ctype="application/json"):
            self.send_response(code)
            self._cors()
            self.send_header("Content-Type", ctype)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def _json(self, code, obj):
            self._send(code, json.dumps(obj).encode("utf-8"))

        def _ok(self):
            o = self.headers.get("Origin")
            if o and o not in origins:
                self._json(403, {"error": "origin not allowed"})
                return False
            if not secrets.compare_digest(self.headers.get("X-WoDX-Key", ""), key):
                self._json(401, {"error": "key"})
                return False
            return True

        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-WoDX-Key")
            self.send_header("Access-Control-Allow-Private-Network", "true")
            self.send_header("Access-Control-Max-Age", "600")
            self.end_headers()

        def do_GET(self):
            if not self._ok():
                return
            if self.path == "/health":
                return self._json(200, {"ok": True, "device": engine.device, "sr": engine.sr, "voices": len(voices.list)})
            if self.path == "/voices":
                return self._json(200, {"voices": voices.public()})
            self._json(404, {"error": "not found"})

        def do_POST(self):
            if not self._ok():
                return
            if self.path != "/render":
                return self._json(404, {"error": "not found"})
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n <= 0 or n > 8192:
                    return self._json(413, {"error": "size"})
                req = json.loads(self.rfile.read(n).decode("utf-8"))
                text = str(req.get("text", "")).strip()[:MAX_TEXT]
                vid = str(req.get("voice", ""))
                path = voices.path(vid)
                if not text or not path:
                    return self._json(400, {"error": "text or voice"})
                d = {"exaggeration": num(req.get("exaggeration"), 0.25, 1.5, 0.5), "cfg": num(req.get("cfg"), 0.2, 0.8, 0.5),
                     "temperature": num(req.get("temperature"), 0.5, 1.0, 0.8)}
                t0 = time.time()
                body = engine.render(text, vid, path, d, int(num(req.get("seed"), 0, 2147483646, 0)))
                self.log_message("render %s %.1fs %d chars", vid, time.time() - t0, len(text))
                self._send(200, body, "audio/wav")
            except Exception as e:  # report, keep serving
                self.log_message("render failed: %r", e)
                self._json(500, {"error": "render failed"})

    return H


def load_key(folder):
    p = os.path.join(folder, "server-key.txt")
    if os.path.exists(p):
        with open(p, encoding="utf-8") as f:
            k = f.read().strip()
        if k:
            return k, False
    k = secrets.token_urlsafe(24)
    with open(p, "w", encoding="utf-8") as f:
        f.write(k + "\n")
    return k, True


# The sample set: the same lines through different voices and moods, to judge uniqueness and delivery.
SAMPLES = [
    ("tollkeeper", {"want": "low", "text": "Coin first, traveller. The bridge does not care where you are going, and neither do I.", "step": 0}),
    ("prince", {"want": "low", "text": "You come to my court unannounced... and you expect courtesy? Kneel. Then we will talk.", "step": -1, "temper": "cold"}),
    ("streetkid", {"want": "mid", "text": "Whoa, whoa! I didn't see nothing, okay? I was just here for the fries!", "step": 0, "temper": "nervous"}),
    ("abbess", {"want": "high", "text": "Sit, child. The fever took half the village this spring. We pray, and we bury, and we pray again.", "step": 2, "temper": "weary"}),
    ("wounded", {"want": "mid", "text": "They came out of the dark... I couldn't stop them. Please, you have to warn the others!", "wounds": 5}),
    ("innkeeper", {"want": "high", "text": "Ha! Back again? Your usual table is free, and the stew is better than last time, I promise.", "step": 3, "temper": "warm"}),
    ("guard", {"want": "low", "text": "Halt! Not one step further. State your name and your business, NOW.", "step": -2, "temper": "fiery"}),
    ("scholar", {"want": "mid", "text": "Interesting. The seal is older than the house itself. Who told you to bring it to me?", "step": 1, "temper": "calm"}),
]


def delivery(text, step=0, wounds=0, temper=None):
    """The module's deliveryFor (voice-rules.mjs), mirrored for the sample set."""
    tempers = {"calm": (-0.15, 0.05, -0.05), "warm": (0.1, -0.05, 0), "cold": (-0.1, 0.1, -0.05), "fiery": (0.3, -0.1, 0.05),
               "nervous": (0.15, -0.15, 0.1), "weary": (-0.1, -0.2, 0)}
    ex, cfg, temp = 0.5, 0.5, 0.8
    bangs, asks = text.count("!"), text.count("?")
    trails = text.strip().endswith("...") or text.count("...") >= 2
    shout = len([w for w in re.findall(r"\b[A-Z]{3,}\b", text)])
    if bangs:
        ex += min(0.4, 0.15 * bangs); cfg -= 0.05
    if shout:
        ex += 0.2
    if asks and not bangs:
        ex += 0.05; temp += 0.05
    if trails:
        cfg -= 0.15; ex -= 0.05
    if step <= -2:
        ex += 0.15 if (bangs or shout) else -0.05; cfg += 0.1
    elif step >= 2:
        ex += 0.1; cfg -= 0.05
    if wounds >= 5:
        ex += 0.35; cfg -= 0.2
    elif wounds >= 3:
        ex += 0.2; cfg -= 0.1
    if temper in tempers:
        a, b, c = tempers[temper]; ex += a; cfg += b; temp += c
    r = lambda v, lo, hi: round(max(lo, min(hi, v)) * 20) / 20
    return {"exaggeration": r(ex, 0.25, 1.5), "cfg": r(cfg, 0.2, 0.8), "temperature": r(temp, 0.6, 1.0)}


def render_samples(engine, voices, out, picks=None):
    import shutil, subprocess
    os.makedirs(out, exist_ok=True)
    ff = shutil.which("ffmpeg")
    picks = picks or {}
    used = set(picks.values())
    report = []

    def choose(want):
        """The liveliest voice not used yet in the register wanted, else in any register."""
        pool = [v for v in voices.list if v["id"] not in used]
        fit = [v for v in pool if v.get("register") == want] or pool or voices.list
        return max(fit, key=lambda v: float(v.get("lively", 0)))["id"]

    for i, (name, s) in enumerate(SAMPLES):
        vid = picks.get(name) or choose(s.get("want"))
        used.add(vid)
        d = delivery(s["text"], s.get("step", 0), s.get("wounds", 0), s.get("temper"))
        t0 = time.time()
        wav = engine.render(s["text"], vid, voices.path(vid), d, seed=1000 + i)
        secs = time.time() - t0
        base = os.path.join(out, f"npc-voice-cb-{i + 1:02d}-{name}")
        with open(base + ".wav", "wb") as f:
            f.write(wav)
        if ff:
            subprocess.run([ff, "-y", "-loglevel", "error", "-i", base + ".wav", "-c:a", "libopus", "-b:a", "48k", base + ".ogg"], check=False)
            if os.path.exists(base + ".ogg"):
                os.remove(base + ".wav")
        report.append(f"{name}: voice {vid}, {d}, {secs:.1f}s")
    with open(os.path.join(out, "report.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(report) + "\n")
    print("\n".join(report))


def main():
    ap = argparse.ArgumentParser(description="WoDX voice server (Chatterbox)")
    ap.add_argument("--voices", required=True, help="folder with voices.json and the reference clips")
    ap.add_argument("--port", type=int, default=7861)
    ap.add_argument("--device", default="auto", help="auto, cuda or cpu")
    ap.add_argument("--origin", action="append", default=[], help="another Foundry address allowed to call the server")
    ap.add_argument("--samples", help="render the sample set into this folder and stop")
    ap.add_argument("--pick", action="append", default=[], help="sample=voiceid, to choose a sample's voice")
    a = ap.parse_args()
    voices = Voices(a.voices)
    if not voices.list:
        sys.exit("No reference voices found; run fetch_voices.py first.")
    engine = Engine(a.device)
    if a.samples:
        render_samples(engine, voices, a.samples, dict(p.split("=", 1) for p in a.pick if "=" in p))
        return
    key, new = load_key(a.voices)
    srv = ThreadingHTTPServer(("127.0.0.1", a.port), make_handler(engine, voices, key, ORIGINS | set(a.origin)))
    print(f"WoDX voice server on http://127.0.0.1:{a.port} ({engine.device}, {len(voices.list)} voices).")
    print(("New key: " if new else "Key: ") + key + "  (paste into Foundry: Configure Settings, WoDX Voices, Voice server key)")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
