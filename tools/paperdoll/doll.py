"""Bake LPC layers into one front-facing portrait token inside a WoDX era frame.
Usage: python3 -I doll.py <lpc repo> <out dir>"""
import json, os, subprocess, sys, math
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

LPC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
SD, SS, PD = f"{LPC}/sheet_definitions", f"{LPC}/spritesheets", f"{LPC}/palette_definitions"
PAL_META = {m: json.load(open(f"{PD}/{m}/meta_{m}.json")) for m in ["body", "cloth", "hair", "metal", "eye"]}

def palette(material, name):
    """'fur_brown' or 'ulpc.fur_brown' or 'metal.ulpc.iron' -> list of hex."""
    parts = name.split(".")
    if len(parts) == 3: material, src, key = parts
    elif len(parts) == 2: src, key = parts
    else: src, key = "ulpc", parts[0]
    return json.load(open(f"{PD}/{material}/{material}_{src}.json"))[key]

def hexrgb(h): h = h.lstrip("#"); return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))

need = set()
def fetch(paths):
    for p in paths:
        if os.path.exists(p): continue
        r = subprocess.run(["git", "-C", LPC, "show", "HEAD:" + p[len(LPC)+1:]], capture_output=True)
        if r.returncode == 0:
            os.makedirs(os.path.dirname(p), exist_ok=True); open(p, "wb").write(r.stdout)

def layers_for(item, body, colors):
    """item: sheet def path; colors: variant name, or dict material-slot -> palette name."""
    d = json.load(open(f"{SD}/{item}.json"))
    out = []
    for k, L in d.items():
        if not k.startswith("layer_") or "custom_animation" in L: continue
        path = L.get(body) or L.get("male")
        if not path: continue
        if "variants" in d:
            f = f"{SS}/{path}walk/{colors}.png"
            out.append((L["zPos"], f, None))
        else:
            rc = d.get("recolors", {})
            slots = {"color_1": rc["color_1"], **{s: v for s, v in rc.items() if s.startswith("color_") and s != "color_1"}} if "color_1" in rc else ({"color_1": rc} if rc else {})
            cmap = {}
            for slot, spec in slots.items():
                want = (colors or {}).get(slot) if isinstance(colors, dict) else None
                if not want: continue
                mat = spec["material"]
                base = spec.get("base") or PAL_META[mat]["base"]
                src = palette(mat, base); dst = palette(mat, want) if "." not in want or want.count(".") < 2 else palette(mat, want)
                for a, b in zip(src, dst): cmap[hexrgb(a)] = hexrgb(b)
            out.append((L["zPos"], f"{SS}/{path}walk.png", cmap))
    return out

def recolor(img, cmap):
    if not cmap: return img
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a and (r, g, b) in cmap: px[x, y] = (*cmap[(r, g, b)], a)
    return img

def bake(parts, body):
    ls = []
    for item, colors in parts: ls += layers_for(item, body, colors)
    fetch([f for _, f, _ in ls])
    frame = Image.new("RGBA", (64, 64))
    for z, f, cmap in sorted(ls, key=lambda t: t[0]):
        if not os.path.exists(f): print("  missing", f[len(SS)+1:]); continue
        sheet = Image.open(f).convert("RGBA")
        cell = sheet.crop((0, 128, 64, 192))  # walk row 3 = facing the viewer, frame 0 = standing
        frame.alpha_composite(recolor(cell, cmap))
    return frame

FRAMES = {"dark-ages": ("round", (0x4f, 0x49, 0x43), True, False), "modern": ("square", (0x9a, 0xa3, 0xad), False, False)}

def portrait(frame, kit, ghost=False, size=512):
    """Crop head and shoulders, scale up with hard pixels, set inside the era frame."""
    bb = frame.getbbox(); top = bb[1]
    crop = frame.crop((14, top - 3, 50, top + 33))       # 36 px square: head to chest
    sc = size * 0.78 / 36
    art = crop.resize((round(36 * sc),) * 2, Image.NEAREST)
    if ghost:
        r, g, b, a = art.split()
        grey = Image.merge("RGB", (r, g, b)).convert("L")
        tint = Image.merge("RGB", (grey.point(lambda v: min(255, int(v * .85) + 30)), grey.point(lambda v: min(255, int(v * .95) + 34)), grey.point(lambda v: min(255, int(v * 1.05) + 48))))
        art = Image.merge("RGBA", (*tint.split(), a.point(lambda v: int(v * .72))))
        glow = art.filter(ImageFilter.GaussianBlur(10)); glow.putalpha(glow.split()[3].point(lambda v: int(v * .6)))
        art = Image.alpha_composite(glow, art)
    shape, col, double, _ = FRAMES[kit]
    tok = Image.new("RGBA", (size, size))
    mask = Image.new("L", (size, size)); md = ImageDraw.Draw(mask)
    lw = max(2, round(size * 0.045)); rr = round(size * 0.08)
    inset = lw  # inside the ring
    if shape == "round": md.ellipse((inset, inset, size - inset, size - inset), fill=255)
    else: md.rounded_rectangle((inset, inset, size - inset, size - inset), rr, fill=255)
    bg = Image.new("RGBA", (size, size))
    g = ImageDraw.Draw(bg)
    for i in range(size // 2, 0, -2):  # dark radial ground, a candle-lit night
        t = i / (size / 2); c = (int(52 - 30 * t), int(44 - 26 * t), int(46 - 26 * t), 255) if kit == "dark-ages" else (int(40 - 24 * t), int(46 - 28 * t), int(56 - 32 * t), 255)
        g.ellipse((size / 2 - i, size * .42 - i, size / 2 + i, size * .42 + i), fill=c)
    inner = Image.new("RGBA", (size, size)); inner.alpha_composite(bg)
    inner.alpha_composite(art, ((size - art.width) // 2, size - art.height - inset + round(size * .02)))
    tok.paste(inner, (0, 0), mask)
    d = ImageDraw.Draw(tok)
    rgba = (*col, 242)
    if shape == "round":
        d.ellipse((lw / 2, lw / 2, size - lw / 2, size - lw / 2), outline=rgba, width=lw)
        if double: d.ellipse((lw * 1.6, lw * 1.6, size - lw * 1.6, size - lw * 1.6), outline=(*col, 150), width=max(1, lw // 4))
    else:
        d.rounded_rectangle((lw / 2, lw / 2, size - lw / 2, size - lw / 2), rr, outline=rgba, width=lw)
        if double: d.rounded_rectangle((lw * 1.6, lw * 1.6, size - lw * 1.6, size - lw * 1.6), rr, outline=(*col, 150), width=max(1, lw // 4))
    return tok

CHARS = {
  "wilhelm-eisenfang": dict(kit="dark-ages", body="male", parts=[
      ("body/body", {"color_1": "light"}), ("head/heads/human/heads_human_male", {"color_1": "light", "color_2": "gray"}),
      ("legs/pants/legs_pants", {"color_1": "brown"}), ("feet/boots/feet_boots_basic", {"color_1": "leather"}),
      ("torso/torso_chainmail", {"color_1": "iron"}), ("torso/jacket/torso_jacket_tabard", "gray"),
      ("torso/waist/belt_leather", "leather"), ("hair/long/hair_long", {"color_1": "ginger"}), ("hair/beards/beards_beard", {"color_1": "ginger"}),
      ("weapons/blunt/weapon_blunt_waraxe", "waraxe")]),
  "wilhelm-eisenfang-crinos": dict(kit="dark-ages", body="male", parts=[
      ("body/body", {"color_1": "fur_copper"}), ("head/heads/beast/heads_wolf_male", {"color_1": "fur_copper"}),
      ("legs/pants/legs_pants", {"color_1": "brown"}), ("torso/waist/belt_leather", "leather")]),
  "ilse": dict(kit="modern", body="female", parts=[
      ("body/body", {"color_1": "light"}), ("head/heads/undead/heads_vampire", None),
      ("legs/pants/legs_pants", {"color_1": "navy"}), ("feet/boots/feet_boots_basic", {"color_1": "black"}),
      ("torso/shirts/shortsleeve/torso_clothes_tshirt", {"color_1": "red"}), ("torso/vest/torso_clothes_vest_open", "black"),
      ("hair/short/hair_messy1", {"color_1": "black"})]),
  "ada-brandt": dict(kit="dark-ages", body="female", ghost=True, parts=[
      ("body/body", {"color_1": "light"}), ("head/heads/human/heads_human_female", {"color_1": "light", "color_2": "brown"}),
      ("torso/shirts/torso_clothes_blouse_longsleeve", "white"), ("torso/dresses/dress_bodice", "slate"),
      ("legs/skirts/legs_skirts_plain", {"color_1": "slate"}), ("hair/braids/hair_braid", {"color_1": "light_brown"})]),
}

if __name__ == "__main__":
    for name, c in CHARS.items():
        print(name)
        f = bake(c["parts"], c["body"])
        f.resize((256, 256), Image.NEAREST).save(f"{OUT}/{name}-sprite.png")
        # Held weapons cover the face in the front-facing frame, so the portrait leaves them out.
        p = bake([x for x in c["parts"] if not x[0].startswith("weapons/")], c["body"])
        tok = portrait(p, c["kit"], c.get("ghost", False))
        tok.save(f"{OUT}/{name}.webp", quality=92); tok.save(f"{OUT}/{name}.png")
