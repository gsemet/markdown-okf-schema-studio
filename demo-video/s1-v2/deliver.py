#!/usr/bin/env python3
"""Contact sheets (both formats) and the horizontal GIF (<= 10 MB) from the composed MP4s.
Usage: deliver.py <h-dir> <v-dir>   (each holds s1-h.mp4 / s1-v.mp4)"""
import subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
FF = "/opt/homebrew/bin/ffmpeg"; hd, vd = Path(sys.argv[1]), Path(sys.argv[2])
subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(hd / "s1-h.mp4"), "-vf",
    "fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=160:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
    str(hd / "s1-h.gif")], check=True)
def dur(mp4):
    return float(subprocess.check_output(["/opt/homebrew/bin/ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp4)]))
def sheet(mp4, out, times, tw, th, cols):
    tiles = []; k = (dur(mp4) - 0.3) / max(times)   # spread the stills over the whole video
    for t in [round(t * k, 1) for t in times]:
        p = out.parent / "_c.png"
        subprocess.run([FF, "-y", "-loglevel", "error", "-ss", str(t), "-i", str(mp4), "-frames:v", "1", "-vf", f"scale={tw}:{th}", str(p)], check=True)
        tiles.append((t, Image.open(p).copy())); p.unlink()
    rows = (len(tiles) + cols - 1) // cols
    im = Image.new("RGB", (cols * (tw + 12) + 12, rows * (th + 40) + 12), (24, 26, 34))
    f = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20); d = ImageDraw.Draw(im)
    for i, (t, tile) in enumerate(tiles):
        x, y = 12 + (i % cols) * (tw + 12), 12 + (i // cols) * (th + 40)
        im.paste(tile, (x, y)); d.text((x, y + th + 8), f"t = {t:g} s", font=f, fill=(235, 235, 240))
    im.save(out)
sheet(hd / "s1-h.mp4", hd / "s1-h-contact-sheet.png", [0.8, 2.5, 4.5, 6.5, 8, 10, 12, 14, 16, 18, 20, 21.5], 640, 360, 3)
sheet(vd / "s1-v.mp4", vd / "s1-v-contact-sheet.png", [0.8, 2, 3.5, 5, 7, 9, 11, 13, 15, 17, 19, 22], 270, 480, 6)
