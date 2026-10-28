#!/usr/bin/env python3
"""S1 v2 horizontal compose (1920x1080, 30 fps): cover 1.5 s, one CDP take sped up 10 %, drawn cursor +
click ripple, calm fade-only subtitles in a strip BELOW the window (they never cover content),
3 s end card. Usage: compose.py <take-dir> <out-dir>. Writes s1-h.mp4, s1-h.srt, cover.png."""
import bisect, json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import numpy as np

FF = "/opt/homebrew/bin/ffmpeg"
OW, OH, FPS = 1920, 1080, 30
WH = 940                      # window region height; the strip below (140 px) holds the subtitles
SPEED, COVER, END, XF = 1.21, 1.5, 3.0, 0.5
take, out = Path(sys.argv[1]), Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
logo_path = Path(__file__).resolve().parents[2] / "images" / "logo.png"
fr = json.load(open(take / "frames.json")); ev = json.load(open(take / "events.json"))
ft = [f["t"] for f in fr["frames"]]
t0 = next(e["t"] for e in ev if e["type"] == "start")
t_stop = next(e["t"] for e in ev if e["type"] == "stop") - t0
dims = next(e for e in ev if e["type"] == "dims"); W = dims["w"]
K = OW / W
track = [(e["t"] - t0, e["x"], e["y"]) for e in ev if e["type"] == "m"]; tt = [p[0] for p in track]
clicks = [e["t"] - t0 for e in ev if e["type"] == "click"]
scene = {e["name"]: e["t"] - t0 for e in ev if e["type"] == "scene"}
FIRST_SHOT = scene["clicked"] + 0.05      # the right pane is an empty editor group until the preview opens
SK_A, SK_B = scene["clicked"] + 0.3, scene["ready"] - 0.05   # jump cut over the "Preview pending" load
SKIP = SK_B - SK_A
def take_time(s): return s if s < SK_A else s + SKIP    # output-side take time -> real take time
def out_time(s): return s if s <= SK_A else (SK_A if s < SK_B else s - SKIP)
MAIN = (t_stop - SKIP) / SPEED + 0.4      # a short hold on the last frame

# take-time windows -> subtitle (two lines at most, they say why)
SUBS = [(0.4, scene["clicked"] - 0.4, "Agents write rich Markdown: grids, diagrams, charts."),
        (scene["ready"] + 0.1, scene["diagram"] - 0.1, "Most editors show raw text. The Studio shows the page."),
        (scene["diagram"] + 0.1, scene["table"] - 0.1, "Sequence diagrams and charts, rendered in place."),
        (scene["table"] + 0.2, t_stop - 0.2, "Wide tables get room. Text stays easy to read.")]
TITLE = "Your agent's analysis, as a real page"

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
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0)); sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
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

def spring(x):
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3 * math.cos(x * 5) * (1 - x) if x < 1 else 1.0

SUBF = font(46); STRIP = (10, 28, 33)
def strip(img, text, a):
    """Subtitle in the strip under the window: fixed position, fade only (no motion, no jitter)."""
    d = ImageDraw.Draw(img, "RGBA")
    w = d.textlength(text, font=SUBF)
    layer = Image.new("RGBA", (OW, OH - WH), (0, 0, 0, 0)); ld = ImageDraw.Draw(layer)
    ld.text(((OW - w) / 2, (OH - WH - 56) / 2), text, font=SUBF, fill=(255, 255, 255, int(255 * a)))
    img.paste(layer, (0, WH), layer)

def backdrop():
    y = np.linspace(0, 1, OH)[:, None]; x = np.linspace(0, 1, OW)[None, :]
    t = np.clip(0.6 * x + 0.4 * (1 - y), 0, 1)[..., None]
    c0 = np.array([8, 47, 55.]); c1 = np.array([17, 112, 127.])
    im = Image.fromarray((c0 * (1 - t) + c1 * t).astype(np.uint8), "RGB")
    ImageDraw.Draw(im).rectangle([0, OH - 10, OW, OH], fill=(242, 130, 43))
    return im
BG = backdrop(); LOGO = Image.open(logo_path).convert("RGBA").resize((200, 200), Image.LANCZOS)

def card(t, lines):
    """lines: [(text, size, bold, colour)] under the logo."""
    img = BG.copy(); d = ImageDraw.Draw(img, "RGBA")
    p = spring(t / 0.7)
    lg = LOGO.resize((int(200 * max(.01, p)),) * 2, Image.LANCZOS)
    img.paste(lg, (OW // 2 - lg.width // 2, 230 + (200 - lg.height) // 2), lg)
    y = 480
    for i, (text, size, bold, col) in enumerate(lines):
        f = font(size, bold); pp = spring((t - 0.25 - 0.2 * i) / 0.6); w = d.textlength(text, font=f)
        d.text(((OW - w) / 2, y + (1 - pp) * 30), text, font=f, fill=col + (int(255 * min(1, pp)),))
        y += int(size * 1.5)
        if i == 0:
            bar = int(560 * spring((t - 0.5) / 0.6))
            d.rounded_rectangle([OW / 2 - bar / 2, y, OW / 2 + bar / 2, y + 6], 3, fill=(242, 130, 43, 255)); y += 40
    return img
def cover(t): return card(t, [(TITLE, 84, True, (255, 255, 255)), ("Markdown OKF-Schema Studio", 52, False, (214, 235, 238))])
def end_card(t): return card(t, [("Markdown OKF-Schema Studio", 96, True, (255, 255, 255)), ("Free on the VS Code Marketplace", 52, False, (214, 235, 238))])
cover(1.4).save(out / "cover.png")

ff = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out / "s1-h.mp4")], stdin=subprocess.PIPE)
sample = None; cache_i, cache = -1, None
total = int((COVER + MAIN + XF + END) * FPS)
for n in range(total):
    g = n / FPS
    if g < COVER:
        img = cover(g)
    elif g < COVER + MAIN + XF:
        u = g - COVER
        s = min(take_time(u * SPEED), t_stop)
        fi = max(0, bisect.bisect_right(ft, t0 + s) - 1)
        if fi != cache_i:
            frame = Image.open(take / f"f_{fr['frames'][fi]['n']:06d}.jpg").convert("RGB")
            cache = frame.resize((OW, WH), Image.LANCZOS); cache_i = fi
            if sample is None: sample = cache.getpixel((OW - 60, WH - 40))
        img = Image.new("RGB", (OW, OH), STRIP); img.paste(cache, (0, 0))
        if s < FIRST_SHOT or SK_A < s < SK_B:   # hide the empty editor group on the right until the preview opens
            ImageDraw.Draw(img).rectangle([int(OW * 0.4) + 6, 54, OW - 6, WH - 8], fill=sample)
        cx, cy = cursor_at(s); px, py = cx * K, cy * K
        ripples(img, px, py, s)
        press = 1.0
        for c in clicks:
            if 0 <= s - c < 0.16: press = 0.8 + 0.2 * (s - c) / 0.16
        cw = int(CUR.width / 4 * 2.3 * press), int(CUR.height / 4 * 2.3 * press)
        spr = CUR.resize(cw, Image.LANCZOS); img.paste(spr, (round(px - 4), round(py - 4)), spr)
        for a, b, text in SUBS:
            if a <= s <= b:
                strip(img, text, min(1, (s - a) / 0.25, (b - s) / 0.25)); break
        if u >= MAIN: img = Image.blend(img, end_card(0), (u - MAIN) / XF)
    else:
        img = end_card(g - COVER - MAIN - XF + 0.0)
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()

def srt(sec):
    ms = int(round(sec * 1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
with open(out / "s1-h.srt", "w") as f:
    for i, (a, b, text) in enumerate(SUBS, 1): f.write(f"{i}\n{srt(COVER + out_time(a) / SPEED)} --> {srt(COVER + out_time(b) / SPEED)}\n{text}\n\n")
json.dump({"cover": COVER, "main": MAIN, "end": [COVER + MAIN, COVER + MAIN + END + XF]}, open(out / "scenes.json", "w"))
print("done", COVER + MAIN + END + XF)
