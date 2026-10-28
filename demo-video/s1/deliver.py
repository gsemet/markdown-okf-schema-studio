#!/usr/bin/env python3
"""GIF (<=10 MB) and a contact sheet (one frame every 2 s) from s1.mp4. Usage: deliver.py <out-dir>"""
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
FF = "/opt/homebrew/bin/ffmpeg"; out = Path(sys.argv[1])
subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(out / "s1.mp4"), "-vf",
    "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    str(out / "s1.gif")], check=True)
times = [1, 3, 5, 7, 9, 11, 13, 14.5]
tiles = []
for t in times:
    p = out / f"_c{t}.png"
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", str(t), "-i", str(out / "s1.mp4"), "-frames:v", "1", "-vf", "scale=640:-1", str(p)], check=True)
    tiles.append((t, Image.open(p).copy())); p.unlink()
cols, tw, th = 2, 640, 360; rows = (len(tiles) + 1) // 2
sheet = Image.new("RGB", (cols * tw + 36, rows * (th + 40) + 12), (24, 26, 34))
f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20); d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(tiles):
    x, y = 12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 40)
    sheet.paste(im, (x, y)); d.text((x, y + th + 8), f"t = {t:g} s", font=f, fill=(235, 235, 240))
sheet.save(out / "s1-contact-sheet.png")
