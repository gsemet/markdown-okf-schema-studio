#!/usr/bin/env python3
"""Screen-Studio style post-processing of a CDP screencast take.

Reads <take>/frames.json + events.json (written by record.mjs) and renders:
  * a smooth auto-zoom/pan camera (critically damped) that follows the logged cursor,
  * a drawn cursor with smoothing and click ripple,
  * burned subtitles (+ .srt), a macOS-like window frame with shadow,
  * title and end cards, speed ramps for typing.
Output: raw frames piped to ffmpeg (H.264, yuv420p, 1920x1080, 30 fps).

Usage: compose.py <take-dir> <out-dir> [--limit-seconds N]
"""
import bisect
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

FFMPEG = "/opt/homebrew/bin/ffmpeg"
OW, OH, FPS = 1920, 1080, 30
TITLE_S, END_S, XFADE = 3.6, 4.6, 0.5
FULL_FILL = 0.925  # share of the output width the whole window takes at "zoom out"
MAX_ZOOM = 1.9

take = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
limit = float(sys.argv[sys.argv.index("--limit-seconds") + 1]) if "--limit-seconds" in sys.argv else None

fr = json.load(open(take / "frames.json"))
events = json.load(open(take / "events.json"))
ftimes = [f["t"] for f in fr["frames"]]
t0 = next(e["t"] for e in events if e["type"] == "start")
t_end = next(e["t"] for e in events if e["type"] == "stop")
dims = next(e for e in events if e["type"] == "dims")
W, H = dims["w"], dims["h"]


def fonts(size, bold=False):
    for path, idx in (("/System/Library/Fonts/SFNS.ttf", None), ("/System/Library/Fonts/Helvetica.ttc", 1 if bold else 0)):
        try:
            f = ImageFont.truetype(path, size, index=idx or 0)
            if idx is None:
                try:
                    f.set_variation_by_name("Bold" if bold else "Medium")
                except Exception:
                    pass
            return f
        except Exception:
            continue
    return ImageFont.load_default()


# ------------------------------------------------------------------ timeline (speed ramps)
marks = sorted([(e["t"] - t0, e) for e in events if e["type"] in ("speed", "cut")], key=lambda x: x[0])
segs = []  # (src_start, src_end, factor) ; factor None = cut
cur, fac, cutting = 0.0, 1.0, False
for s, e in marks:
    segs.append((cur, s, None if cutting else fac))
    cur = s
    if e["type"] == "speed":
        fac = e["f"]
    else:
        cutting = e["on"]
segs.append((cur, t_end - t0, None if cutting else fac))
segs = [(a, b, f) for a, b, f in segs if b > a]

# Idle compression: when the cursor rests for more than IDLE_KEEP seconds, play the rest of the
# pause IDLE_SPEED times faster (waiting for renders, reading time beyond what is needed).
IDLE_KEEP, IDLE_SPEED, IDLE_MIN = 1.9, 3.0, 2.6
active = sorted(set([p[0] for p in [(e["t"] - t0,) for e in events if e["type"] in ("m", "click")]]))
gaps = []
for a, b in zip(active, active[1:] + [t_end - t0]):
    if b - a > IDLE_MIN:
        gaps.append((a + IDLE_KEEP, b - 0.25))
split = []
for a, b, f in segs:
    pts = [(a, f)]
    for g0, g1 in gaps:
        lo, hi = max(a, g0), min(b, g1)
        if hi > lo:
            pts += [(lo, "fast"), (hi, "normal")]
    pts.sort(key=lambda p: p[0])
    cursor_t, fast = a, False
    for t, kind in pts[1:]:
        if t > cursor_t:
            split.append((cursor_t, t, None if f is None else (f * IDLE_SPEED if fast else f)))
        cursor_t = t
        fast = kind == "fast"
    if b > cursor_t:
        split.append((cursor_t, b, None if f is None else (f * IDLE_SPEED if fast else f)))
segs = split
cum = [0.0]
for a, b, f in segs:
    cum.append(cum[-1] + (0 if f is None else (b - a) / f))
video_len = cum[-1]
if limit:
    video_len = min(video_len, limit)


def src_time(u):
    """Output time within the screen part -> source time."""
    for i, (a, b, f) in enumerate(segs):
        if f is not None and u <= cum[i + 1] + 1e-9:
            return a + (u - cum[i]) * f
    return segs[-1][1]


def out_time(s):
    """Source time -> output time within the screen part."""
    for i, (a, b, f) in enumerate(segs):
        if s <= b:
            if f is None:
                return cum[i]
            return cum[i] + max(0.0, s - a) / f
    return cum[-1]


# ------------------------------------------------------------------ cursor track, clicks, zooms, subs
track = [(e["t"] - t0, e["x"], e["y"]) for e in events if e["type"] == "m"]
tt = [p[0] for p in track]
clicks = [e["t"] - t0 for e in events if e["type"] == "click"]
zooms = [(e["t"] - t0, e["rect"], e.get("follow", 0.35)) for e in events if e["type"] == "zoom"]
zt = [z[0] for z in zooms]
scenes = [(e["t"] - t0, e["name"]) for e in events if e["type"] == "scene"]
subs_raw = [(e["t"] - t0, e["text"]) for e in events if e["type"] == "sub"]


def cursor_at(s):
    if not track:
        return W / 2, H / 2
    i = bisect.bisect_right(tt, s) - 1
    if i < 0:
        return track[0][1], track[0][2]
    if i + 1 >= len(track):
        return track[-1][1], track[-1][2]
    a, b = track[i], track[i + 1]
    k = 0 if b[0] == a[0] else min(1, (s - a[0]) / (b[0] - a[0]))
    return a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k


def zoom_target(s, cx, cy):
    """Viewport (center x, center y, width) in window css px wanted at source time s."""
    full = (W / 2, H / 2, W / FULL_FILL)
    i = bisect.bisect_right(zt, s) - 1
    rect = zooms[i][1] if i >= 0 else None
    if rect is None:
        return full
    follow = zooms[i][2]
    vw = max(rect["w"], rect["h"] * 16 / 9, W / MAX_ZOOM)
    vw = min(vw, W)
    vh = vw * 9 / 16
    rcx, rcy = rect["x"] + rect["w"] / 2, rect["y"] + rect["h"] / 2
    tx = rcx + follow * (cx - rcx)
    ty = rcy + follow * (cy - rcy)
    tx = min(max(tx, vw / 2), W - vw / 2)
    ty = min(max(ty, vh / 2), H - vh / 2)
    return (tx, ty, vw)


# subtitles in output time (screen part): shown from their event until the next one / scene end
subs = []
for i, (s, text) in enumerate(subs_raw):
    u0 = out_time(s)
    nxt_u = out_time(subs_raw[i + 1][0]) if i + 1 < len(subs_raw) else out_time(t_end - t0)
    u1 = min(nxt_u - 0.05, u0 + 3.6)
    if u1 - u0 < 1.0:
        continue  # too short to read: the next subtitle replaces it
    subs.append((u0, u1, text))

# ------------------------------------------------------------------ sprites and backdrop
def make_bg():
    y = np.linspace(0, 1, OH)[:, None]
    x = np.linspace(0, 1, OW)[None, :]
    c0 = np.array([36, 30, 74], dtype=float)
    c1 = np.array([20, 92, 124], dtype=float)
    t = np.clip(0.55 * x + 0.45 * y, 0, 1)[..., None]
    img = c0 * (1 - t) + c1 * t
    return Image.fromarray(img.astype(np.uint8), "RGB")


BG = make_bg()


def make_cursor(scale=4):
    pts = [(0, 0), (0, 17), (4.2, 13.4), (7.3, 20.5), (10, 19.3), (7, 12.4), (12.6, 12.4)]
    w, h = 18 * scale, 24 * scale
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(x * scale + 2 * scale, y * scale + 2 * scale) for x, y in pts], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(1.5 * scale))
    im = Image.alpha_composite(im, sh)
    d = ImageDraw.Draw(im)
    big = [(x * scale + scale, y * scale + scale) for x, y in pts]
    d.polygon(big, fill=(0, 0, 0, 255))
    inner = [(x * scale + scale, y * scale + scale) for x, y in pts]
    cxp = sum(p[0] for p in inner) / len(inner)
    cyp = sum(p[1] for p in inner) / len(inner)
    shrink = [(cxp + (p[0] - cxp) * 0.78, cyp + (p[1] - cyp) * 0.78) for p in inner]
    d.polygon(shrink, fill=(255, 255, 255, 255))
    return im


CURSOR = make_cursor()
SUB_FONT = fonts(40, bold=False)


def draw_subtitle(img, text, alpha):
    d = ImageDraw.Draw(img, "RGBA")
    words, lines, line = text.split(), [], ""
    for w in words:
        cand = (line + " " + w).strip()
        if d.textlength(cand, font=SUB_FONT) > 1500 and line:
            lines.append(line)
            line = w
        else:
            line = cand
    lines.append(line)
    lines = lines[:2]
    lh = 54
    tw = max(d.textlength(l, font=SUB_FONT) for l in lines)
    bw, bh = tw + 64, lh * len(lines) + 28
    x0, y1 = (OW - bw) / 2, OH - 52
    y0 = y1 - bh
    layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([x0, y0, x0 + bw, y1], 22, fill=(12, 14, 22, int(205 * alpha)))
    for i, l in enumerate(lines):
        w = ld.textlength(l, font=SUB_FONT)
        ld.text(((OW - w) / 2, y0 + 14 + i * lh), l, font=SUB_FONT, fill=(255, 255, 255, int(255 * alpha)))
    img.paste(layer, (0, 0), layer)


def window_frame(src, vx, vy, vw):
    """Render the camera view: window image (css W x H) seen through viewport (vx, vy, vw)."""
    vh = vw * 9 / 16
    k = OW / vw
    sx = src.width / W
    canvas = BG.copy()
    ix0, iy0 = max(0.0, vx), max(0.0, vy)
    ix1, iy1 = min(float(W), vx + vw), min(float(H), vy + vh)
    if ix1 <= ix0 or iy1 <= iy0:
        return canvas, k
    crop = src.crop((round(ix0 * sx), round(iy0 * sx), round(ix1 * sx), round(iy1 * sx)))
    ox, oy = (ix0 - vx) * k, (iy0 - vy) * k
    ow_, oh_ = max(1, round((ix1 - ix0) * k)), max(1, round((iy1 - iy0) * k))
    crop = crop.resize((ow_, oh_), Image.LANCZOS if ow_ < crop.width else Image.BICUBIC)
    filling = ix0 <= vx + 0.5 and iy0 <= vy + 0.5 and ix1 >= vx + vw - 0.5 and iy1 >= vy + vh - 0.5
    if filling:
        canvas.paste(crop, (round(ox), round(oy)))
        return canvas, k
    # shadow (small, blurred, upscaled) + rounded window
    rad = 14 * k
    sc = 4
    sh = Image.new("L", (OW // sc, OH // sc), 0)
    ImageDraw.Draw(sh).rounded_rectangle([(ox) / sc, (oy + 14 * k) / sc, (ox + ow_) / sc, (oy + oh_ + 14 * k) / sc], rad / sc, fill=150)
    sh = sh.filter(ImageFilter.GaussianBlur(14 * k / sc)).resize((OW, OH), Image.BILINEAR)
    black = Image.new("RGB", (OW, OH), (0, 0, 0))
    canvas = Image.composite(black, canvas, sh)
    mask = Image.new("L", (ow_ * 2, oh_ * 2), 0)
    # only round corners that are real window corners
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, ow_ * 2 - 1, oh_ * 2 - 1], rad * 2, fill=255)
    mask = mask.resize((ow_, oh_), Image.LANCZOS)
    canvas.paste(crop, (round(ox), round(oy)), mask)
    return canvas, k


def draw_cursor(img, px, py, k, s):
    scale_c = min(2.0, max(1.0, math.sqrt(k)) * 1.5)
    cw = int(CURSOR.width / 4 * scale_c * 1.15)
    ch = int(CURSOR.height / 4 * scale_c * 1.15)
    # press feedback
    press = 1.0
    for c in clicks:
        if 0 <= s - c < 0.16:
            press = 0.82 + 0.18 * (s - c) / 0.16
    cw2, ch2 = max(1, int(cw * press)), max(1, int(ch * press))
    spr = CURSOR.resize((cw2, ch2), Image.LANCZOS)
    img.paste(spr, (round(px - 3 * scale_c), round(py - 3 * scale_c)), spr)


def draw_ripples(img, px, py, k, s):
    layer = None
    for c in clicks:
        age = s - c
        if 0 <= age < 0.65:
            if layer is None:
                layer = Image.new("RGBA", (OW, OH), (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            p = age / 0.65
            r = (10 + 46 * (1 - (1 - p) ** 3)) * max(1.0, math.sqrt(k))
            a = int(210 * (1 - p))
            d.ellipse([px - r, py - r, px + r, py + r], outline=(255, 255, 255, a), width=max(2, int(4 * (1 - p) + 1)))
            d.ellipse([px - r * 0.55, py - r * 0.55, px + r * 0.55, py + r * 0.55], fill=(255, 190, 70, int(90 * (1 - p))))
    if layer is not None:
        img.paste(layer, (0, 0), layer)


def smooth_damp(cur, target, vel, smooth, dt):
    omega = 2.0 / smooth
    x = omega * dt
    e = 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x)
    change = cur - target
    temp = (vel + omega * change) * dt
    vel = (vel - omega * temp) * e
    return target + (change + temp) * e, vel


# ------------------------------------------------------------------ cards
def card_frame(kind, t, dur):
    img = BG.copy()
    d = ImageDraw.Draw(img, "RGBA")
    p = min(1, t / 0.9)
    ease = 1 - (1 - p) ** 3
    fade_out = min(1, max(0, (dur - t) / 0.4))
    a = int(255 * min(1, t / 0.6) * fade_out) if kind == "title" else int(255 * min(1, t / 0.6))
    if kind == "title":
        big, small = fonts(92, True), fonts(44)
        title = "Markdown OKF Schema Studio 1.0"
        tag = "Read, review and edit rich Markdown in one page"
        wt = d.textlength(title, font=big)
        d.text(((OW - wt) / 2, 400 + (1 - ease) * 40), title, font=big, fill=(255, 255, 255, a))
        wg = d.textlength(tag, font=small)
        d.text(((OW - wg) / 2, 540 + (1 - ease) * 50), tag, font=small, fill=(210, 224, 240, int(a * 0.9)))
        bar = int(260 * ease)
        d.rounded_rectangle([OW / 2 - bar / 2, 622, OW / 2 + bar / 2, 628], 3, fill=(255, 190, 70, a))
    else:
        big, mid, small = fonts(76, True), fonts(40), fonts(34)
        lines = [
            ("Try it in VS Code", big, (255, 255, 255)),
            ("Search “Markdown OKF-Schema Studio” in the VS Code Marketplace", mid, (210, 224, 240)),
            ("marketplace.visualstudio.com/items?itemName=GaetanSemet.markdown-okf-schema-studio", fonts(30), (255, 190, 70)),
            ("Works with your coding agent: Claude Code and Copilot plugin included", mid, (210, 224, 240)),
        ]
        y = 330 + (1 - ease) * 30
        for text, f, col in lines:
            w = d.textlength(text, font=f)
            d.text(((OW - w) / 2, y), text, font=f, fill=col + (a,))
            y += f.size * 1.9
        fo = min(1, max(0, (dur - t) / 0.6))
        if fo < 1:
            img = Image.blend(Image.new("RGB", (OW, OH), (0, 0, 0)), img, fo)
    return img


# ------------------------------------------------------------------ main render loop
ff = subprocess.Popen(
    [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
     "-c:v", "libx264", "-preset", "medium", "-crf", "22", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out / "demo-b.mp4")],
    stdin=subprocess.PIPE,
)
n_title = int(TITLE_S * FPS)
n_end = int(END_S * FPS)
n_main = int(video_len * FPS)
n_x = int(XFADE * FPS)
total = n_title + n_main + n_end
cam = None
vel = [0.0, 0.0, 0.0]
smooth_cursor = None
cache_i, cache_img = -1, None
scene_out = {}
for name_t, name in scenes:
    scene_out[name] = TITLE_S + out_time(name_t)
subs_final = []

def write(img):
    ff.stdin.write(img.tobytes())

for n in range(total):
    if n < n_title:
        img = card_frame("title", n / FPS, TITLE_S)
        # crossfade into the first screen frame is handled at the start of the main part
        write(img)
        continue
    if n >= n_title + n_main:
        img = card_frame("end", (n - n_title - n_main) / FPS, END_S)
        write(img)
        continue
    u = (n - n_title) / FPS
    s = src_time(u)
    ts = t0 + s
    fi = max(0, bisect.bisect_right(ftimes, ts) - 1)
    if fi != cache_i:
        cache_img = Image.open(take / f"f_{fr['frames'][fi]['n']:06d}.jpg").convert("RGB")
        cache_i = fi
    cx, cy = cursor_at(s)
    if smooth_cursor is None:
        smooth_cursor = [cx, cy]
    a = 1 - math.exp(-1 / FPS / 0.045)
    smooth_cursor[0] += (cx - smooth_cursor[0]) * a
    smooth_cursor[1] += (cy - smooth_cursor[1]) * a
    tx, ty, tw = zoom_target(s, smooth_cursor[0], smooth_cursor[1])
    if cam is None:
        cam = [tx, ty, math.log(tw)]
    dt = 1 / FPS
    cam[0], vel[0] = smooth_damp(cam[0], tx, vel[0], 0.55, dt)
    cam[1], vel[1] = smooth_damp(cam[1], ty, vel[1], 0.55, dt)
    cam[2], vel[2] = smooth_damp(cam[2], math.log(tw), vel[2], 0.7, dt)
    vw = math.exp(cam[2])
    vh = vw * 9 / 16
    vx, vy = cam[0] - vw / 2, cam[1] - vh / 2
    if vw < W:  # keep the zoomed view inside the window
        vx = min(max(vx, 0), W - vw)
        vy = min(max(vy, 0), H - vh)
    img, k = window_frame(cache_img, vx, vy, vw)
    px, py = (smooth_cursor[0] - vx) * k, (smooth_cursor[1] - vy) * k
    draw_ripples(img, px, py, k, s)
    draw_cursor(img, px, py, k, s)
    for u0, u1, text in subs:
        if u0 - 0.05 <= u <= u1:
            al = min(1, (u - u0 + 0.05) / 0.25, (u1 - u) / 0.25)
            draw_subtitle(img, text, max(0, al))
            break
    if n - n_title < n_x:
        t = (n - n_title) / n_x
        img = Image.blend(card_frame("title", TITLE_S - 0.01, TITLE_S), img, t) if False else img
    write(img)
    if n % 150 == 0:
        print(f"frame {n}/{total}", flush=True)

ff.stdin.close()
ff.wait()

# subtitles file (output timeline = title card + screen part)
def srt_t(sec):
    ms = int(round(sec * 1000))
    return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"

with open(out / "demo-b.srt", "w") as f:
    for i, (u0, u1, text) in enumerate(subs, 1):
        f.write(f"{i}\n{srt_t(TITLE_S + u0)} --> {srt_t(TITLE_S + u1)}\n{text}\n\n")
json.dump({"title": [0, TITLE_S], "scenes": scene_out, "end": [TITLE_S + video_len, TITLE_S + video_len + END_S],
           "duration": TITLE_S + video_len + END_S}, open(out / "scenes.json", "w"), indent=1)
print("done", TITLE_S + video_len + END_S, "s")
