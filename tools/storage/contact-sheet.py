"""Contact sheet for a picture set (B3951): one PNG of labelled thumbnails, so a large set stays on the PC and a cloud
thread looks at the sheet instead of thousands of files.

    python tools/storage/contact-sheet.py <folder> --out <sheet.png> [--max 120] [--thumb 160] [--cols 10] [--grep part]

Takes up to --max images spread evenly through the folder (sorted by path, subfolders included) and labels each with
its path under the folder. Needs Pillow (the PC's tools-env venv and the cloud container have it). Run it on the PC at
below-normal priority (rule 14) and copy only the sheet to the shared folder.
"""
import argparse, os, sys
from PIL import Image, ImageDraw

EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff")

def pick(folder, n, grep=None):
    files = []
    for d, _, names in os.walk(folder):
        for f in names:
            if f.lower().endswith(EXT) and (not grep or grep in os.path.join(d, f)):
                files.append(os.path.join(d, f))
    files.sort()
    if len(files) <= n:
        return files, len(files)
    step = len(files) / n
    return [files[int(i * step)] for i in range(n)], len(files)

def sheet(folder, out, n=120, thumb=160, cols=10, grep=None):
    files, total = pick(folder, n, grep)
    if not files:
        raise SystemExit("No images under " + folder)
    cols = min(cols, len(files))
    rows = (len(files) + cols - 1) // cols
    label = 14
    img = Image.new("RGB", (cols * thumb, rows * (thumb + label) + 20), (24, 24, 28))
    draw = ImageDraw.Draw(img)
    draw.text((4, 4), "%s: %d of %d images" % (os.path.basename(os.path.abspath(folder)), len(files), total), fill=(230, 230, 230))
    for i, f in enumerate(files):
        x, y = (i % cols) * thumb, 20 + (i // cols) * (thumb + label)
        try:
            t = Image.open(f)
            t.thumbnail((thumb - 4, thumb - 4))
            img.paste(t.convert("RGBA"), (x + 2 + (thumb - 4 - t.width) // 2, y + 2 + (thumb - 4 - t.height) // 2), t.convert("RGBA"))
        except Exception:
            draw.text((x + 4, y + thumb // 2), "unreadable", fill=(220, 80, 80))
        name = os.path.relpath(f, folder)
        draw.text((x + 2, y + thumb), name[-(thumb // 6):], fill=(200, 200, 200))
    img.save(out, optimize=True)
    return len(files), total

if __name__ == "__main__":
    a = argparse.ArgumentParser()
    a.add_argument("folder"); a.add_argument("--out", required=True)
    a.add_argument("--max", type=int, default=120); a.add_argument("--thumb", type=int, default=160)
    a.add_argument("--cols", type=int, default=10); a.add_argument("--grep")
    o = a.parse_args()
    shown, total = sheet(o.folder, o.out, o.max, o.thumb, o.cols, o.grep)
    print("Wrote %s: %d of %d images." % (o.out, shown, total))
