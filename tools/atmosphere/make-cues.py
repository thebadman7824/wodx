"""Make WoDX Atmosphere's interface cues: short procedural sounds, three per era kit (dawn, dusk, notice), and two
shared by every era in sounds/common (birdsong and cock-crow before dawn). Pass a kit name, or common, to make only those.
Pure synthesis with NumPy (additive partials with decay envelopes), encoded to Ogg Vorbis by ffmpeg.
Run from the repo root:  python3 tools/atmosphere/make-cues.py
They are the project's own, with no outside source; the credits journal lists them as such."""
import numpy as np, subprocess, os, sys

SR = 44100
OUT = os.path.join("modules", "wodx-atmosphere", "sounds")

def env(n, attack=0.005, decay=1.0):
    t = np.arange(n) / SR
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)

def partials(freq, ratios, amps, dur, decays, detune=0.0):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    for r, a, d in zip(ratios, amps, decays):
        f = freq * r * (1 + detune * np.sin(2 * np.pi * 0.7 * t))
        out += a * np.sin(2 * np.pi * f * t) * env(n, 0.003, d)
    return out

def bell(freq, dur=3.0, dark=False):
    # Church bell partials: hum, prime, tierce, quint, nominal
    r = [0.5, 1.0, 1.2, 1.5, 2.0, 2.5, 3.0]
    a = [0.5, 1.0, 0.6, 0.35, 0.45, 0.2, 0.12]
    d = [2.5, 1.8, 1.4, 1.0, 0.8, 0.5, 0.35]
    if dark: d = [x * 1.4 for x in d]
    return partials(freq, r, a, dur, d)

def pluck(freq, dur=1.2, bright=0.5):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    for k in range(1, 9):
        out += (bright ** (k - 1)) / k * np.sin(2 * np.pi * freq * k * t) * np.exp(-t * (2 + k * 1.5))
    return out

def chime(freq, dur=1.6):
    return partials(freq, [1, 2.76, 5.4, 8.9], [1, 0.4, 0.2, 0.08], dur, [0.9, 0.5, 0.3, 0.15])

def triangle(freq, dur=1.5):
    return partials(freq, [1, 2.7, 4.1, 5.6, 7.2], [1, 0.7, 0.5, 0.35, 0.25], dur, [1.0, 0.8, 0.6, 0.45, 0.3])

def clicks(times, dur=1.0):
    n = int(SR * dur); out = np.zeros(n)
    rng = np.random.default_rng(7)
    for t0 in times:
        i = int(t0 * SR); m = int(0.012 * SR)
        burst = rng.standard_normal(m) * np.exp(-np.arange(m) / (0.002 * SR))
        tone = np.sin(2 * np.pi * 1800 * np.arange(m) / SR) * np.exp(-np.arange(m) / (0.004 * SR))
        out[i:i + m] += (0.5 * burst + tone)[: max(0, min(m, n - i))]
    return out

def brass(freq, dur=1.6):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    a = np.clip(t / 0.08, 0, 1) * np.clip((dur - t) / 0.4, 0, 1)
    for k in range(1, 7):
        out += (1 / k ** 1.2) * np.sin(2 * np.pi * freq * k * t)
    return out * a

def pad(freqs, dur=2.0, saw=False):
    n = int(SR * dur); t = np.arange(n) / SR; out = np.zeros(n)
    a = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.8, 0, 1)
    for f in freqs:
        for k in range(1, 8 if saw else 3):
            out += (1 / k) * np.sin(2 * np.pi * f * k * t + 0.3 * k) * (1 if saw else 0.6)
    return out * a

def blip(freqs, step=0.09, dur=0.7):
    n = int(SR * dur); out = np.zeros(n)
    for i, f in enumerate(freqs):
        s = int(i * step * SR); m = int(0.08 * SR); t = np.arange(m) / SR
        sq = np.sign(np.sin(2 * np.pi * f * t)) * 0.4 + np.sin(2 * np.pi * f * t) * 0.6
        out[s:s + m] += (sq * np.exp(-t / 0.03))[: max(0, min(m, n - s))]
    return out

def seq(*parts, gap=0.0):
    out = []
    for p in parts:
        out.append(p); out.append(np.zeros(int(gap * SR)))
    return np.concatenate(out)

def mixat(total, items):
    out = np.zeros(int(total * SR))
    for t0, x in items:
        i = int(t0 * SR); m = min(len(x), len(out) - i); out[i:i + m] += x[:m]
    return out

CUES = {
    "dark-ages": {"dawn": lambda: mixat(4.0, [(0, bell(220)), (1.6, bell(220))]),
                  "dusk": lambda: bell(165, 4.0, dark=True),
                  "notice": lambda: pluck(392, 1.0) + 0.6 * np.pad(pluck(523, 0.85), (int(0.15 * SR), 0))[: int(SR * 1.0)]},
    "long-night": {"dawn": lambda: mixat(5.0, [(0, bell(147, 3.5, True)), (2.2, bell(147, 2.8, True))]),
                   "dusk": lambda: bell(110, 5.0, dark=True),
                   "notice": lambda: bell(330, 1.6)},
    "renaissance": {"dawn": lambda: mixat(2.2, [(0, pluck(392, 1.2, 0.6)), (0.25, pluck(494, 1.2, 0.6)), (0.5, pluck(587, 1.6, 0.6))]),
                    "dusk": lambda: mixat(2.2, [(0, pluck(587, 1.2, 0.6)), (0.3, pluck(494, 1.2, 0.6)), (0.6, pluck(392, 1.6, 0.6))]),
                    "notice": lambda: pluck(659, 0.9, 0.7)},
    "victorian": {"dawn": lambda: mixat(2.4, [(0, chime(784)), (0.35, chime(988)), (0.7, chime(1175))]),
                  "dusk": lambda: mixat(2.4, [(0, chime(1175)), (0.35, chime(988)), (0.7, chime(784))]),
                  "notice": lambda: chime(1319, 1.2)},
    "wild-west": {"dawn": lambda: mixat(2.5, [(0, triangle(1200)), (0.2, triangle(1200)), (0.4, triangle(1200))]),
                  "dusk": lambda: triangle(900, 2.4),
                  "notice": lambda: triangle(1500, 1.0)},
    "great-war": {"dawn": lambda: brass(196, 1.4) + 0.7 * np.pad(brass(262, 1.0), (int(0.4 * SR), 0))[: int(1.4 * SR)],
                  "dusk": lambda: brass(147, 2.0),
                  "notice": lambda: clicks([0, 0.08, 0.16, 0.4, 0.48], 0.8)},
    "modern": {"dawn": lambda: pad([110, 165], 2.2), "dusk": lambda: pad([82.4, 123.5], 2.6),
               "notice": lambda: pad([440], 0.6) * 0.8},
    "future-darkness": {"dawn": lambda: blip([523, 659, 784, 1047]), "dusk": lambda: blip([1047, 784, 659, 523]),
                        "notice": lambda: blip([880, 1320], 0.07, 0.4)},
}

def chirp(f0, f1, dur=0.09, wobble=0.0):
    n = int(SR * dur); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * (t / dur) + wobble * np.sin(2 * np.pi * 38 * t)
    ph = 2 * np.pi * np.cumsum(f) / SR
    a = np.sin(np.pi * t / dur) ** 2
    return (np.sin(ph) + 0.2 * np.sin(2 * ph)) * a

def birdsong(dur=5.0):
    rng = np.random.default_rng(11); items = []; t = 0.2
    while t < dur - 0.6:
        k = rng.integers(2, 6); base = rng.uniform(2600, 4200)
        for j in range(k):
            items.append((t + j * 0.11, 0.6 * chirp(base * rng.uniform(0.95, 1.1), base * rng.uniform(1.15, 1.5), rng.uniform(0.06, 0.1), 120)))
        t += k * 0.11 + rng.uniform(0.35, 0.9)
    far = mixat(dur, [(t0 + 0.05, 0.25 * x) for t0, x in items[::2]])
    return mixat(dur, items) + far

def cockcrow():
    # Four notes, a rasping harmonic voice: short, short, the long rise, the fall
    def voice(f0, f1, dur):
        n = int(SR * dur); t = np.arange(n) / SR
        f = f0 + (f1 - f0) * np.sin(0.5 * np.pi * t / dur) + 6 * np.sin(2 * np.pi * 31 * t)
        ph = 2 * np.pi * np.cumsum(f) / SR
        a = np.clip(t / 0.03, 0, 1) * np.clip((dur - t) / 0.08, 0, 1)
        out = sum((1 / k ** 0.9) * np.sin(k * ph) for k in range(1, 10))
        return out * a * (1 + 0.15 * np.random.default_rng(3).standard_normal(n))
    return mixat(2.4, [(0, voice(520, 600, 0.18)), (0.24, voice(560, 640, 0.18)), (0.5, voice(600, 760, 0.8)), (1.35, voice(740, 480, 0.7))])

COMMON = {"birds": birdsong, "cock": cockcrow}

def write(path, x):
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.5  # about -6 dBFS peak
    fade = int(0.02 * SR); x[-fade:] *= np.linspace(1, 0, fade)
    pcm = (x * 32767).astype("<i2").tobytes()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
                    "-c:a", "libvorbis", "-q:a", "3", path], input=pcm, check=True)

only = sys.argv[1] if len(sys.argv) > 1 else None
for kit, cues in {**CUES, "common": COMMON}.items():
    if only and kit != only: continue
    os.makedirs(os.path.join(OUT, kit), exist_ok=True)
    for cue, fn in cues.items():
        write(os.path.join(OUT, kit, f"{cue}.ogg"), fn())
print("cues written")
