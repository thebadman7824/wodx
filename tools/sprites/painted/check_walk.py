# Frame check: each walk frame (side view) next to the recorded person's pose it was copied from, as a stick figure.
# python check_walk.py <frames_dir> <out.png>
import json, sys, os
from PIL import Image, ImageDraw
d, outp = sys.argv[1], sys.argv[2]
rec = json.load(open(os.path.join(d, "mocap_joints.json")))
W, Hh = 220, 300
sheet = Image.new("RGB", (W * 8, Hh * 2), (107, 107, 107))
bones = [("LeftUpLeg", "LeftLeg"), ("LeftLeg", "LeftFoot"), ("RightUpLeg", "RightLeg"), ("RightLeg", "RightFoot"),
         ("LeftArm", "LeftForeArm"), ("LeftForeArm", "LeftHand"), ("RightArm", "RightForeArm"), ("RightForeArm", "RightHand"),
         ("Hips", "Neck1"), ("Neck1", "Head")]
for i, P in enumerate(rec):
    im = Image.open(os.path.join(d, f"left_{i + 1}.png")).convert("RGBA")
    bg = Image.new("RGBA", im.size, (107, 107, 107, 255)); bg.alpha_composite(im)
    sheet.paste(bg.crop((56, 20, 456, 500)).resize((W, Hh)).convert("RGB"), (W * i, 0))
    dr = ImageDraw.Draw(sheet); s = Hh / 2.0 / max(1e-6, P["Head"][2] - min(P["LeftFoot"][2], P["RightFoot"][2]))
    ox, oy = W * i + W / 2, Hh + Hh * 0.35
    pt = lambda k: (ox + P[k][1] * s, oy - P[k][2] * s)   # walking toward -y, drawn facing left like the 'left' row
    for a, b in bones:
        col = (255, 120, 90) if a.startswith("Left") else (120, 190, 255) if a.startswith("Right") else (235, 235, 235)
        dr.line([pt(a), pt(b)], fill=col, width=4)
sheet.save(outp); print("saved", outp)
