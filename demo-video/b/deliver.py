#!/usr/bin/env python3
"""Derive the 15 s cut, the GIF and the contact sheet from the main render.
Usage: deliver.py <out-dir>   (expects demo-b.mp4 + scenes.json from compose.py)"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FF = "/opt/homebrew/bin/ffmpeg"
out = Path(sys.argv[1])
sc = json.load(open(out / "scenes.json"))
S = sc["scenes"]
dur = sc["duration"]
# (start, length) in the main timeline
cut = [
    (1.0, 2.0),                      # title
    (S["preview"] + 2.6, 2.8),       # open the preview
    (S["edit"] + 3.4, 3.0),          # edit where you read
    (S["slash"] + 3.2, 2.4),         # slash menu
    (S["myst"] + 3.0, 1.7),          # tabs
    (S["navigation"] + 7.0, 2.1),    # dark theme
    (sc["end"][0] + 0.3, 1.0),       # end card
]
parts, labels = [], ""
for i, (a, l) in enumerate(cut):
    parts.append(f"[0:v]trim=start={a:.3f}:duration={l:.3f},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.12,fade=t=out:st={l-0.12:.3f}:d=0.12[v{i}]")
    labels += f"[v{i}]"
fc = ";".join(parts) + f";{labels}concat=n={len(cut)}:v=1:a=0[v]"
subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(out / "demo-b.mp4"), "-filter_complex", fc, "-map", "[v]",
                "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                str(out / "demo-b-15s.mp4")], check=True)
# GIF from the 15 s cut
subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(out / "demo-b-15s.mp4"),
                "-vf", "fps=12,scale=800:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
                str(out / "demo-b.gif")], check=True)
# contact sheet: one frame per scene
picks = [("Title", 2.4), ("Preview", S["preview"] + 6.0), ("Edit", S["edit"] + 6.0), ("Slash menu", S["slash"] + 5.5),
         ("MyST", S["myst"] + 4.0), ("Diagrams", S["diagrams"] + 4.0), ("Review", S["review"] + 8.5),
         ("Navigation", S["navigation"] + 3.5), ("Dark theme", S["navigation"] + 8.5), ("End card", sc["end"][0] + 2.5)]
tiles = []
for name, t in picks:
    p = out / f"_c_{name.replace(' ', '_')}.png"
    subprocess.run([FF, "-y", "-loglevel", "error", "-ss", f"{min(t, dur - 0.1):.2f}", "-i", str(out / "demo-b.mp4"), "-frames:v", "1",
                    "-vf", "scale=640:-1", str(p)], check=True)
    tiles.append((name, Image.open(p)))
    p.unlink()
cols, tw, th = 2, 640, 360
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (cols * tw + (cols + 1) * 12, rows * (th + 40) + 12), (24, 26, 34))
font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
d = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(tiles):
    x = 12 + (i % cols) * (tw + 12)
    y = 12 + (i // cols) * (th + 40)
    sheet.paste(im, (x, y))
    d.text((x, y + th + 8), f"{i + 1}. {name}", font=font, fill=(235, 235, 240))
sheet.save(out / "demo-b-contact-sheet.png")
print("cut", sum(l for _, l in cut), "s")
