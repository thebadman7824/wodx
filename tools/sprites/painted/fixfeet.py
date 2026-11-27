# Footwear fix on a reference draft: soles and heels in light tan (modern rubber or stacked leather look)
# are repainted in the shoe's own upper leather, so the shoe reads as a one-piece turnshoe.
# python fixfeet.py in.png out.png [bottom_fraction=0.12]
import sys
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; frac = float(sys.argv[3]) if len(sys.argv) > 3 else 0.12
a = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
bg = np.median(np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3)]), axis=0)
fg = np.abs(a - bg).sum(2) > 40
ys = np.where(fg.any(1))[0]; top, bot = ys[0], ys[-1]
y0 = int(bot - (bot - top) * frac)
reg = a[y0:bot + 1]; m = fg[y0:bot + 1]
r, g, b = reg[..., 0], reg[..., 1], reg[..., 2]
mx = reg.max(2); mn = reg.min(2); sat = (mx - mn) / np.maximum(mx, 1)
tan = m & (r > 90) & (r > g) & (g > b) & (sat > 0.25)
upper = m & ~tan & (mx < 90)
col = np.median(reg[upper], axis=0) if upper.any() else np.array([45, 35, 28.])
lum = reg[tan].mean(1, keepdims=True); lum = (lum - lum.min()) / max(1, lum.max() - lum.min())
reg[tan] = col * (0.75 + 0.5 * lum)
a[y0:bot + 1] = reg
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(dst)
print("feet region", y0, bot, "repainted px", int(tan.sum()), "leather", col.round())
