#!/usr/bin/env python3
"""S1 compose: one continuous CDP take, no zoom, drawn cursor + click ripple, kinetic subtitles,
3 s end card (track C look). Usage: compose.py <take-dir> <out-dir>
Writes s1.mp4 (15 s, 1920x1080), s1.srt, scenes.json."""
import bisect, json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

FF = "/opt/homebrew/bin/ffmpeg"
OW, OH, FPS = 1920, 1080, 30
MAIN, END, XF = 12.0, 3.0, 0.5   # screen part, end card, cross-fade into the card
OFFSET = 0.3                     # output t=0 is take t=OFFSET
take, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
logo_path = Path(__file__).resolve().parents[2] / "images" / "logo.png"
fr = json.load(open(take / "frames.json")); ev = json.load(open(take / "events.json"))
ft = [f["t"] for f in fr["frames"]]
t0 = next(e["t"] for e in ev if e["type"] == "start")
dims = next(e for e in ev if e["type"] == "dims"); W, H = dims["w"], dims["h"]
track = [(e["t"] - t0, e["x"], e["y"]) for e in ev if e["type"] == "m"]; tt = [p[0] for p in track]
clicks = [e["t"] - t0 for e in ev if e["type"] == "click"]
K = OW / W

# (start, end, text, accent words) in output seconds
SUBS = [(0.3, 2.9, "Agents write plans in Markdown. Raw text is hard to review.", {"Markdown."}),
        (4.9, 11.7, "Read the same plan as a real page: cards, diagram, table.", {"real", "page:"})]

def font(size, bold=True):
    for path, idx in (("/System/Library/Fonts/SFNS.ttf", None), ("/System/Library/Fonts/Helvetica.ttc", 1 if bold else 0)):
        try:
            f = ImageFont.truetype(path, size, index=idx or 0)
            if idx is None:
                try: f.set_variation_by_name("Bold" if bold else "Medium")
                except Exception: pass
            return f
        except Exception: pass
    return ImageFont.load_default()

def cursor_at(s):
    i = bisect.bisect_right(tt, s) - 1
    if i < 0: return track[0][1], track[0][2]
    if i + 1 >= len(track): return track[-1][1], track[-1][2]
    a, b = track[i], track[i + 1]
    k = 0 if b[0] == a[0] else min(1, (s - a[0]) / (b[0] - a[0]))
    return a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k

def make_cursor(scale=4):
    pts = [(0, 0), (0, 17), (4.2, 13.4), (7.3, 20.5), (10, 19.3), (7, 12.4), (12.6, 12.4)]
    w, h = 18 * scale, 24 * scale
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(x * scale + 2 * scale, y * scale + 2 * scale) for x, y in pts], fill=(0, 0, 0, 120))
    im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(1.5 * scale)))
    d = ImageDraw.Draw(im)
    big = [(x * scale + scale, y * scale + scale) for x, y in pts]
    d.polygon(big, fill=(255, 255, 255, 255), outline=(255, 255, 255, 255))
    cx = sum(p[0] for p in big) / len(big); cy = sum(p[1] for p in big) / len(big)
    d.polygon([(cx + (x - cx) * 0.8, cy + (y - cy) * 0.8) for x, y in big], fill=(0, 0, 0, 255))
    return im
CUR = make_cursor()

def ripples(img, px, py, s):
    layer = None
    for c in clicks:
        age = s - c
        if 0 <= age < 0.7:
            layer = layer or Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
            p = age / 0.7; r = 14 + 60 * (1 - (1 - p) ** 3)
            ImageDraw.Draw(layer).ellipse([px - r, py - r, px + r, py + r], outline=(242, 130, 43, int(230 * (1 - p))), width=6)
    if layer: img.paste(layer, (0, 0), layer)

def spring(x):  # 0..1 with a tiny overshoot, settles
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3 * math.cos(x * 5)  * (1 - x) if x < 1 else 1.0

SUBF = font(52)
def subtitle(img, text, accents, u, u0, u1):
    words = text.split()
    d = ImageDraw.Draw(img, "RGBA")
    sp = 14; maxw = 1480
    lines, cur, w_cur = [], [], 0
    for w in words:
        wl = d.textlength(w, font=SUBF)
        if cur and w_cur + sp + wl > maxw: lines.append(cur); cur, w_cur = [], 0
        cur.append(w); w_cur += (sp if len(cur) > 1 else 0) + wl
    lines.append(cur); assert len(lines) <= 2, text
    lh = 66
    widths = [sum(d.textlength(w, font=SUBF) for w in l) + sp * (len(l) - 1) for l in lines]
    bw, bh = max(widths) + 70, lh * len(lines) + 34
    x0, y1 = (OW - bw) / 2, OH - 64; y0 = y1 - bh
    fade_out = min(1, max(0, (u1 - u) / 0.3)); fade_in = min(1, (u - u0) / 0.2)
    a = min(fade_out, fade_in)
    layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([x0, y0, x0 + bw, y1], 24, fill=(10, 28, 33, int(215 * a)), outline=(255, 255, 255, int(30 * a)), width=2)
    k = 0
    for li, l in enumerate(lines):
        x = (OW - widths[li]) / 2; y = y0 + 16 + li * lh
        for w in l:
            p = spring((u - u0 - k * 0.07) / 0.45); k += 1
            col = (255, 176, 106) if w in accents else (255, 255, 255)
            ld.text((x, y + (1 - p) * 22), w, font=SUBF, fill=col + (int(255 * a * min(1, p * 1.2)),))
            x += d.textlength(w, font=SUBF) + sp
    img.paste(layer, (0, 0), layer)

def backdrop():
    y = np.linspace(0, 1, OH)[:, None]; x = np.linspace(0, 1, OW)[None, :]
    t = np.clip(0.6 * x + 0.4 * (1 - y), 0, 1)[..., None]
    c0 = np.array([8, 47, 55.]); c1 = np.array([17, 112, 127.])
    im = Image.fromarray((c0 * (1 - t) + c1 * t).astype(np.uint8), "RGB")
    ImageDraw.Draw(im).rectangle([0, OH - 10, OW, OH], fill=(242, 130, 43))
    return im
BG = backdrop(); LOGO = Image.open(logo_path).convert("RGBA").resize((200, 200), Image.LANCZOS)

def end_card(t):
    img = BG.copy(); d = ImageDraw.Draw(img, "RGBA")
    p = spring(t / 0.7)
    lg = LOGO.resize((int(200 * max(.01, p)),) * 2, Image.LANCZOS)
    img.paste(lg, (OW // 2 - lg.width // 2, 250 + (200 - lg.height) // 2), lg)
    f1, f2 = font(96), font(52, False)
    def centered(text, f, y, col, delay):
        pp = spring((t - delay) / 0.6); w = d.textlength(text, font=f)
        d.text(((OW - w) / 2, y + (1 - pp) * 30), text, font=f, fill=col + (int(255 * min(1, pp)),))
    centered("Markdown OKF-Schema Studio", f1, 500, (255, 255, 255), 0.25)
    bar = int(560 * spring((t - 0.5) / 0.6))
    d.rounded_rectangle([OW / 2 - bar / 2, 640, OW / 2 + bar / 2, 646], 3, fill=(242, 130, 43, 255))
    centered("Free on the VS Code Marketplace", f2, 690, (214, 235, 238), 0.7)
    return img

ff = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out / "s1.mp4")], stdin=subprocess.PIPE)
cache_i, cache = -1, None
total = int((MAIN + END) * FPS)
for n in range(total):
    u = n / FPS
    if u < MAIN + XF:   # screen part (continues under the cross-fade)
        s = min(u + OFFSET, fr["frames"][-1]["t"] - t0)
        fi = max(0, bisect.bisect_right(ft, t0 + s) - 1)
        if fi != cache_i:
            cache = Image.open(take / f"f_{fr['frames'][fi]['n']:06d}.jpg").convert("RGB").resize((OW, OH), Image.LANCZOS); cache_i = fi
        img = cache.copy()
        cx, cy = cursor_at(s); px, py = cx * K, cy * K
        ripples(img, px, py, s)
        press = 1.0
        for c in clicks:
            if 0 <= s - c < 0.16: press = 0.8 + 0.2 * (s - c) / 0.16
        cw = int(CUR.width / 4 * 2.3 * press), int(CUR.height / 4 * 2.3 * press)
        spr = CUR.resize(cw, Image.LANCZOS); img.paste(spr, (round(px - 4), round(py - 4)), spr)
        for u0, u1, text, acc in SUBS:
            if u0 <= u <= u1: subtitle(img, text, acc, u, u0, u1); break
        if u >= MAIN:
            img = Image.blend(img, end_card(0), (u - MAIN) / XF)
    else:
        img = end_card(u - MAIN - XF + 0.5 * 0)
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()

def srt(sec):
    ms = int(round(sec * 1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
with open(out / "s1.srt", "w") as f:
    for i, (a, b, text, _) in enumerate(SUBS, 1): f.write(f"{i}\n{srt(a)} --> {srt(b)}\n{text}\n\n")
json.dump({"main": MAIN, "end": [MAIN, MAIN + END]}, open(out / "scenes.json", "w"))
print("done")
