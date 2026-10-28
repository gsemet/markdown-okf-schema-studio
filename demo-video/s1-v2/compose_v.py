#!/usr/bin/env python3
"""S1 v2 vertical compose (1080x1920, 30 fps): portrait cover 1.5 s, raw-source pass, top-to-bottom wipe to the
preview pass (both sped up 10 %), big fade-only subtitles in the top band (never over the page, never in the
bottom 20 % or right 12 %), 3 s end card. Usage: compose_v.py <raw-take-dir> <preview-take-dir> <out-dir>.
Writes s1-v.mp4, s1-v.srt, cover-v.png."""
import bisect, json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

FF = "/opt/homebrew/bin/ffmpeg"
OW, OH, FPS = 1080, 1920, 30
BAND = 300                    # top band for subtitles; the 1080x1620 window capture sits below it
SPEED, COVER, END, XF, WIPE, HOLD_RAW = 1.1, 1.5, 3.0, 0.5, 0.7, 0.3
raw_dir, pre_dir, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]); out.mkdir(parents=True, exist_ok=True)
logo_path = Path(__file__).resolve().parents[2] / "images" / "logo.png"

def load(d):
    fr = json.load(open(d / "frames.json")); ev = json.load(open(d / "events.json"))
    t0 = next(e["t"] for e in ev if e["type"] == "start")
    return {"dir": d, "frames": fr["frames"], "ft": [f["t"] for f in fr["frames"]], "t0": t0,
            "stop": next(e["t"] for e in ev if e["type"] == "stop") - t0,
            "scene": {e["name"]: e["t"] - t0 for e in ev if e["type"] == "scene"}, "cache": (-1, None)}
RAW, PRE = load(raw_dir), load(pre_dir)
def frame_at(T, s):
    s = min(max(s, 0), T["stop"]); fi = max(0, bisect.bisect_right(T["ft"], T["t0"] + s) - 1)
    if T["cache"][0] != fi:
        im = Image.open(T["dir"] / f"f_{T['frames'][fi]['n']:06d}.jpg").convert("RGB")
        T["cache"] = (fi, im.resize((OW, OH - BAND), Image.LANCZOS))
    return T["cache"][1]

LR = RAW["stop"] / SPEED + HOLD_RAW            # raw pass on screen
LP = PRE["stop"] / SPEED + 0.3                 # preview pass on screen
MAIN = LR + WIPE + LP
def pre_t(u): return (u - LR - WIPE) * SPEED   # preview take time at main time u
sc = PRE["scene"]
SUBS = [(0.2, LR + 0.2, "Your agent wrote this."),
        (LR + WIPE + 0.1, LR + WIPE + sc["cards"] / SPEED - 0.1, "Here is what you read."),
        (LR + WIPE + sc["cards"] / SPEED + 0.1, LR + WIPE + sc["diagram"] / SPEED - 0.1, "Key figures as cards."),
        (LR + WIPE + sc["diagram"] / SPEED + 0.1, LR + WIPE + sc["chart"] / SPEED - 0.1, "Sequence diagrams..."),
        (LR + WIPE + sc["chart"] / SPEED + 0.1, LR + WIPE + sc["table"] / SPEED - 0.1, "...and charts, rendered in place."),
        (LR + WIPE + sc["table"] / SPEED + 0.1, MAIN - 0.2, "Wide tables scroll. Text stays readable.")]
SUBF_SIZE = 64

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
SUBF = font(SUBF_SIZE); STRIP = (10, 28, 33)

def wrap(d, text, f, maxw):
    words, lines, cur = text.split(), [], ""
    for w in words:
        t = (cur + " " + w).strip()
        if cur and d.textlength(t, font=f) > maxw: lines.append(cur); cur = w
        else: cur = t
    lines.append(cur); assert len(lines) <= 2, text
    return lines
def sub(img, text, a):
    d = ImageDraw.Draw(img, "RGBA"); lines = wrap(d, text, SUBF, 900)   # inside the right 12 % safe zone
    lh = 82; y = (BAND - lh * len(lines)) / 2 - 4
    for i, l in enumerate(lines):
        w = d.textlength(l, font=SUBF)
        d.text(((OW - 130 - w) / 2 + 65, y + i * lh), l, font=SUBF, fill=(255, 255, 255, int(255 * a)))

def spring(x):
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3 * math.cos(x * 5) * (1 - x) if x < 1 else 1.0
def backdrop():
    y = np.linspace(0, 1, OH)[:, None]; x = np.linspace(0, 1, OW)[None, :]
    t = np.clip(0.5 * x + 0.5 * (1 - y), 0, 1)[..., None]
    c0 = np.array([8, 47, 55.]); c1 = np.array([17, 112, 127.])
    im = Image.fromarray((c0 * (1 - t) + c1 * t).astype(np.uint8), "RGB")
    ImageDraw.Draw(im).rectangle([0, OH - 10, OW, OH], fill=(242, 130, 43)); return im
BG = backdrop(); LOGO = Image.open(logo_path).convert("RGBA").resize((220, 220), Image.LANCZOS)
def card(t, lines):
    """Text stays inside the safe zones: between y 420 and 1450, x 70..950."""
    img = BG.copy(); d = ImageDraw.Draw(img, "RGBA"); p = spring(t / 0.7)
    lg = LOGO.resize((int(220 * max(.01, p)),) * 2, Image.LANCZOS)
    img.paste(lg, (470 - lg.width // 2, 520 + (220 - lg.height) // 2), lg)
    y = 820
    for i, (text, size, bold, col) in enumerate(lines):
        f = font(size, bold); pp = spring((t - 0.25 - 0.2 * i) / 0.6)
        for j, l in enumerate(wrap(d, text, f, 880)):
            w = d.textlength(l, font=f)
            d.text((470 - w / 2, y + (1 - pp) * 30), l, font=f, fill=col + (int(255 * min(1, pp)),)); y += int(size * 1.2)
        y += 24
        if i == 0:
            bar = int(500 * spring((t - 0.5) / 0.6)); d.rounded_rectangle([470 - bar / 2, y, 470 + bar / 2, y + 7], 3, fill=(242, 130, 43, 255)); y += 50
    return img
def cover(t): return card(t, [("Your agent wrote this.", 92, True, (255, 255, 255)), ("Markdown OKF-Schema Studio", 54, False, (214, 235, 238))])
def end_card(t): return card(t, [("Markdown OKF-Schema Studio", 84, True, (255, 255, 255)), ("Free on the VS Code Marketplace", 52, False, (214, 235, 238))])
cover(1.4).save(out / "cover-v.png")

def screen(img_win, a_text=None):
    img = Image.new("RGB", (OW, OH), STRIP); img.paste(img_win, (0, BAND)); return img
ff = subprocess.Popen([FF, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{OW}x{OH}", "-r", str(FPS), "-i", "-",
                       "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out / "s1-v.mp4")], stdin=subprocess.PIPE)
total = int((COVER + MAIN + XF + END) * FPS)
for n in range(total):
    g = n / FPS
    if g < COVER: img = cover(g)
    elif g < COVER + MAIN + XF:
        u = g - COVER
        if u < LR: win = frame_at(RAW, u * SPEED)
        elif u < LR + WIPE:
            a = frame_at(RAW, RAW["stop"]); b = frame_at(PRE, 0)
            edge = int((u - LR) / WIPE * (OH - BAND + 60)) - 60; arr = np.array(a); arrb = np.array(b)
            rows = np.arange(OH - BAND)[:, None]; m = np.clip((edge - rows) / 60 + 1, 0, 1)[..., None]   # soft top-to-bottom edge
            win = Image.fromarray((arrb * m + arr * (1 - m)).astype(np.uint8))
        else: win = frame_at(PRE, pre_t(u))
        img = screen(win)
        for a0, b0, text in SUBS:
            if a0 <= u <= b0: sub(img, text, min(1, (u - a0) / 0.25, (b0 - u) / 0.25)); break
        if u >= MAIN: img = Image.blend(img, end_card(0), (u - MAIN) / XF)
    else: img = end_card(g - COVER - MAIN - XF)
    ff.stdin.write(img.tobytes())
ff.stdin.close(); ff.wait()
def srt(sec):
    ms = int(round(sec * 1000)); return f"{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}"
with open(out / "s1-v.srt", "w") as f:
    for i, (a, b, text) in enumerate(SUBS, 1): f.write(f"{i}\n{srt(COVER + a)} --> {srt(COVER + b)}\n{text}\n\n")
print("done", COVER + MAIN + XF + END)
