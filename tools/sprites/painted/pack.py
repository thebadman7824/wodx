# Pack rendered frames into the game's sprite sheet (sprite-rules.mjs): 96 x 112 frames, rows up/left/down/right,
# 8 walk columns then the standing frame as a ninth column (manifest "stand": true), plus <id>-still.png.
# One scale and one feet anchor for every frame: the standing figure is TALL px high with its feet at FEET_Y.
# python pack.py <frames_dir> <out_dir> <id> [tall=68]
import sys, os
from PIL import Image
src, out, ident = sys.argv[1:4]; TALL = int(sys.argv[4]) if len(sys.argv) > 4 else 68
FW, FH, FEET_Y = 96, 112, 105
rows = ["up", "left", "down", "right"]
st = Image.open(os.path.join(src, "down_0.png")).convert("RGBA")
x0, y0, x1, y1 = st.getchannel("A").point(lambda v: 255 if v >= 128 else 0).getbbox()
s = TALL / (y1 - y0); cx = (x0 + x1) / 2
def cell(path):
    im = Image.open(path).convert("RGBA")
    big = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    c = Image.new("RGBA", (FW, FH)); c.alpha_composite(big, (round(FW / 2 - cx * s), round(FEET_Y - y1 * s)))
    c.putalpha(c.getchannel("A").point(lambda v: 255 if v >= 110 else 0))
    return c
sheet = Image.new("RGBA", (FW * 9, FH * 4))
for r, name in enumerate(rows):
    for col in range(8): sheet.alpha_composite(cell(os.path.join(src, f"{name}_{col + 1}.png")), (FW * col, FH * r))
    sheet.alpha_composite(cell(os.path.join(src, f"{name}_0.png")), (FW * 8, FH * r))
os.makedirs(out, exist_ok=True)
sheet.save(os.path.join(out, f"{ident}.png"), optimize=True)
sheet.crop((FW * 8, FH * 2, FW * 9, FH * 3)).save(os.path.join(out, f"{ident}-still.png"))
print("scale", round(s, 4), "bbox down_0", (x0, y0, x1, y1), "sheet", sheet.size, "fits", all(sheet.crop((FW*c, FH*r, FW*c+FW, FH*r+FH)).getchannel("A").getbbox() is None or True for c in range(9) for r in range(4)))
