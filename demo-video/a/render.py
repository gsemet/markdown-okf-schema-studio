#!/usr/bin/env python3
"""Track A editor: composes the recorded frames into the final 1920x1080 / 30 fps video.

Reads <rec>/timeline.json + frames (from record.py) and draws, per output frame: the eased camera
(crop + zoom of the 3840x2160 source, sub-pixel, no zoompan jitter), the smoothed cursor and click
ripple (from the logged mouse path), key-cap badges, burned subtitles, plus the title and end cards
with crossfades. Frames are piped to ffmpeg (H.264, yuv420p). Also writes the .srt and .ass files.
The Homebrew ffmpeg has no libass, so subtitles are burned by this script, not by `-vf ass`.

Usage: python render.py <rec_dir> <out_dir>
"""
from __future__ import annotations

import bisect
import json
import math
import pathlib
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
REPO = HERE.parent.parent
REC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(sys.argv[2])
FPS, W, H = 30, 1920, 1080
FFMPEG = "/opt/homebrew/bin/ffmpeg"
CREAM, INK, CLAY = (245, 241, 232), (43, 42, 39), (161, 78, 50)
TITLE_S, END_S, FADE_S = 3.6, 4.6, 0.8
HN = "/System/Library/Fonts/HelveticaNeue.ttc"


def font(size, bold=False):
    f = ImageFont.truetype(HN, size, index=1 if bold else 0)
    return f


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (x * 6 - 15) + 10)


tl = json.loads((REC / "timeline.json").read_text())
T0 = tl["t0"]
FRAMES = sorted(tl["frames"])
FTS = [f[0] for f in FRAMES]
VW, VH, _ = tl["view"]
REC_END = max(FTS[-1], tl.get("t_end", 0))
REC_LEN = REC_END - T0
MOUSE = tl["mouse"]
MTS = [m[0] for m in MOUSE]
CAMS = tl["cams"]
# Subtitles never overlap: a line ends when the next one starts.
_subs = sorted(tl["subs"])
for _i in range(len(_subs) - 1):
    _subs[_i][1] = min(_subs[_i][1], _subs[_i + 1][0] - 0.12)
tl["subs"] = _subs


def camera(t):
    cur = (VW / 2, VH / 2, 1.0)
    for te, x, y, z, dur in CAMS:
        if t < te:
            break
        u = (t - te) / max(dur, 1e-3)
        if u < 1:
            e = ease(u)
            return tuple(c + (n - c) * e for c, n in zip(cur, (x, y, z)))
        cur = (x, y, z)
    return cur


def mouse(t):
    if not MOUSE:
        return 0, 0
    i = bisect.bisect_right(MTS, t)
    if i == 0:
        return MOUSE[0][1], MOUSE[0][2]
    if i >= len(MOUSE):
        return MOUSE[-1][1], MOUSE[-1][2]
    a, b = MOUSE[i - 1], MOUSE[i]
    u = (t - a[0]) / max(b[0] - a[0], 1e-6)
    return a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u


# ---- cursor sprite ---------------------------------------------------------------------------
def make_cursor(px=40):
    s = 8
    pts = [(0, 0), (0, 16.5), (4.2, 12.8), (7, 19.5), (9.6, 18.4), (6.8, 11.8), (12.4, 11.8)]
    big = Image.new("RGBA", (int(24 * s), int(26 * s)), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    off = 3 * s
    poly = [(x * s + off, y * s + off) for x, y in pts]
    shadow = Image.new("RGBA", big.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon([(x + 2 * s, y + 3 * s) for x, y in poly], fill=(0, 0, 0, 110))
    from PIL import ImageFilter
    shadow = shadow.filter(ImageFilter.GaussianBlur(2.2 * s))
    big = Image.alpha_composite(big, shadow)
    d = ImageDraw.Draw(big)
    d.polygon(poly, fill=(20, 20, 20, 255))
    inner = [(x * s + off + (2.0 * s if i else 0) * 0, y * s + off) for i, (x, y) in enumerate(pts)]
    # white body: shrink the polygon toward its centroid
    cx = sum(p[0] for p in poly) / len(poly)
    cy = sum(p[1] for p in poly) / len(poly)
    body = [(cx + (x - cx) * 0.80, cy + (y - cy) * 0.80) for x, y in poly]
    # keep the tip on the hotspot
    shift = (poly[0][0] - body[0][0], poly[0][1] - body[0][1])
    body = [(x + shift[0] + 0.9 * s, y + shift[1] + 1.4 * s) for x, y in body]
    d.polygon(body, fill=(255, 255, 255, 255))
    scale = px / (20 * s)
    small = big.resize((max(1, int(big.width * scale)), max(1, int(big.height * scale))), Image.LANCZOS)
    return small, (off * scale, off * scale)


CURSOR, HOT = make_cursor(46)


# ---- overlays --------------------------------------------------------------------------------
def draw_ripple(img, x, y, u):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    r = 12 + 52 * ease(u)
    a = int(210 * (1 - u))
    d.ellipse([x - r, y - r, x + r, y + r], outline=CLAY + (a,), width=5)
    r2 = 10 + 22 * ease(u)
    d.ellipse([x - r2, y - r2, x + r2, y + r2], fill=CLAY + (int(70 * (1 - u)),))
    img.alpha_composite(layer)


def draw_key(img, label, a):
    f = font(34, True)
    d0 = ImageDraw.Draw(img)
    w = d0.textlength(label, font=f)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    bw, bh = w + 56, 64
    x0, y0 = (W - bw) / 2, 870
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], 16, fill=(30, 30, 30, int(235 * a)), outline=(255, 255, 255, int(90 * a)), width=2)
    d.text((W / 2, y0 + bh / 2 + 1), label, font=f, fill=(255, 255, 255, int(255 * a)), anchor="mm")
    img.alpha_composite(layer)


def draw_subtitle(img, text, a):
    f = font(40, True)
    lines = text.split("\n")
    d0 = ImageDraw.Draw(img)
    widths = [d0.textlength(l, font=f) for l in lines]
    bw, lh = max(widths) + 64, 54
    bh = lh * len(lines) + 26
    x0, y0 = (W - bw) / 2, H - 52 - bh
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle([x0, y0, x0 + bw, y0 + bh], 22, fill=(24, 22, 20, int(208 * a)))
    for i, l in enumerate(lines):
        d.text((W / 2, y0 + 13 + lh * i + lh / 2), l, font=f, fill=(255, 250, 240, int(255 * a)), anchor="mm")
    img.alpha_composite(layer)


# ---- cards -----------------------------------------------------------------------------------
LOGO = Image.open(REPO / "images" / "logo.png").convert("RGBA")


def card_base():
    img = Image.new("RGBA", (W, H), CREAM + (255,))
    d = ImageDraw.Draw(img)
    for i in range(0, H, 2):  # soft vertical vignette
        k = abs(i - H / 2) / (H / 2)
        d.line([(0, i), (W, i)], fill=(int(245 - 9 * k * k), int(241 - 11 * k * k), int(232 - 14 * k * k), 255), width=2)
    return img


def text_layer(items, t, slide=26):
    """items: (text, font, color, y, delay). Fades and slides up with a stagger."""
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for text, f, color, y, delay in items:
        u = ease((t - delay) / 0.7)
        d.text((W / 2, y + slide * (1 - u)), text, font=f, fill=color + (int(255 * u),), anchor="mm")
    return layer


def title_card(t):
    img = card_base()
    u = ease(t / 0.8)
    logo = LOGO.resize((180, 180), Image.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda v: int(v * u)))
    img.alpha_composite(logo, ((W - 180) // 2, 250 + int(20 * (1 - u))))
    img.alpha_composite(text_layer([
        ("Markdown OKF Schema Studio 1.0", font(92, True), INK, 540, 0.35),
        ("Read, review and edit rich Markdown in one page", font(44), CLAY, 640, 0.75),
    ], t))
    return img


def end_card(t):
    img = card_base()
    u = ease(t / 0.8)
    logo = LOGO.resize((120, 120), Image.LANCZOS)
    logo.putalpha(logo.getchannel("A").point(lambda v: int(v * u)))
    img.alpha_composite(logo, ((W - 120) // 2, 210))
    img.alpha_composite(text_layer([
        ("Install it from the VS Code Marketplace", font(64, True), INK, 400, 0.2),
        ("marketplace.visualstudio.com  /  GaetanSemet.markdown-okf-schema-studio", font(34), CLAY, 490, 0.55),
        ("Works with your coding agent", font(52, True), INK, 650, 1.0),
        ("Add the agent plugin: /plugin marketplace add gsemet/markdown-okf-schema-studio", font(32), (90, 86, 78), 725, 1.3),
        ("github.com/gsemet/markdown-okf-schema-studio", font(30), (90, 86, 78), 880, 1.7),
    ], t))
    return img


# ---- recording frame -------------------------------------------------------------------------
_cache = {"i": -1, "img": None}


def source(t):
    i = max(0, bisect.bisect_right(FTS, t) - 1)
    if _cache["i"] != i:
        _cache["img"] = Image.open(REC / "frames" / FRAMES[i][1]).convert("RGB")
        _cache["i"] = i
    return _cache["img"]


def rec_frame(t):
    src = source(t)
    cx, cy, z = camera(t)
    cw, ch = VW / z, VH / z
    x0 = min(max(cx - cw / 2, 0), VW - cw)
    y0 = min(max(cy - ch / 2, 0), VH - ch)
    sx, sy = src.width / VW, src.height / VH
    img = src.resize((W, H), Image.LANCZOS, box=(x0 * sx, y0 * sy, (x0 + cw) * sx, (y0 + ch) * sy)).convert("RGBA")
    mx, my = mouse(t)
    ox, oy = (mx - x0) / cw * W, (my - y0) / ch * H
    for tc, x, y in tl["clicks"]:
        u = (t - tc) / 0.6
        if 0 <= u < 1:
            draw_ripple(img, (x - x0) / cw * W, (y - y0) / ch * H, u)
    img.alpha_composite(CURSOR, (int(ox - HOT[0]), int(oy - HOT[1])))
    for tk, label in tl["keys"]:
        if label and 0 <= t - tk < 1.5:
            a = min(1, (t - tk) / 0.15) * min(1, (1.5 - (t - tk)) / 0.3)
            draw_key(img, label, a)
    return img


def subtitle_alpha(t):
    out = []
    for a, b, text in tl["subs"]:
        if a - 0.0 <= t <= b:
            out.append((text, min(1, (t - a) / 0.25, (b - t) / 0.25)))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    total_s = TITLE_S + REC_LEN + END_S - 2 * FADE_S + 0  # cards overlap the recording by FADE_S
    n = int(total_s * FPS)
    rec_start = TITLE_S - FADE_S                      # output time at which the recording starts
    end_start = rec_start + REC_LEN - FADE_S          # output time at which the end card starts
    n = int((end_start + END_S) * FPS)
    # subtitles file times are in output time
    subs = [(a - T0 + rec_start, b - T0 + rec_start, text) for a, b, text in tl["subs"]]
    write_subs(subs)
    video = OUT / "demo-a-silent.mp4"
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
           "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    for k in range(n):
        T = k / FPS
        layers = []
        if T < TITLE_S:
            layers.append((title_card(T), 1.0 if T < TITLE_S - FADE_S else 1.0))
        base = None
        rt = T - rec_start
        if 0 <= rt <= REC_LEN:
            frame = rec_frame(T - rec_start + T0)
            for text, a in subtitle_alpha(T - rec_start + T0):
                draw_subtitle(frame, text, a)
            base = frame
        if T < TITLE_S and base is not None:
            a = ease((T - rec_start) / FADE_S)
            base = Image.blend(title_card(T), base, a)
        elif T < TITLE_S:
            base = title_card(T)
        if T >= end_start:
            card = end_card(T - end_start)
            a = ease((T - end_start) / FADE_S)
            base = Image.blend(base, card, a) if base is not None else card
        proc.stdin.write(base.convert("RGB").tobytes())
        if k % 150 == 0:
            print(f"{k}/{n}", flush=True)
    proc.stdin.close()
    proc.wait()
    print("wrote", video, f"{n / FPS:.1f}s")


def stamp(s, srt=True):
    h, m, sec = int(s // 3600), int(s % 3600 // 60), s % 60
    return f"{h:02d}:{m:02d}:{sec:06.3f}".replace(".", "," if srt else ".") if srt else f"{h}:{m:02d}:{sec:05.2f}"


def write_subs(subs):
    (OUT / "demo-a.srt").write_text("".join(
        f"{i}\n{stamp(a)} --> {stamp(b)}\n{t}\n\n" for i, (a, b, t) in enumerate(subs, 1)), encoding="utf-8")
    ass = ["[Script Info]", "ScriptType: v4.00+", f"PlayResX: {W}", f"PlayResY: {H}", "",
           "[V4+ Styles]",
           "Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding",
           "Style: Default,Helvetica Neue,40,&H00F0FAFF,&H000000FF,&H00141618,&HC8141618,-1,0,0,0,100,100,0,0,3,14,0,2,60,60,52,1", "",
           "[Events]", "Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text"]
    for a, b, t in subs:
        ass.append(f"Dialogue: 0,{stamp(a, False)},{stamp(b, False)},Default,,0,0,0,,{t.replace(chr(10), chr(92) + 'N')}")
    (OUT / "demo-a.ass").write_text("\n".join(ass) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
