#!/usr/bin/env python3
"""Track A recorder: drives the headless preview page with scripted, human-paced input and records it.

Chromium (Playwright) opens demo-video/a/build/v0.html, the page the repo's visual harness renders.
A CDP screencast captures the viewport at 2.4x device scale (3840x2160 frames, with timestamps).
Everything the editor needs to compose the video is logged next to the frames in `timeline.json`:
mouse samples, clicks, key chords, camera moves (zoom targets), subtitles and scene markers.
The harness has no VS Code host, so a small stand-in host answers the page's saves with the
pre-rendered "after" states (v1, v2), exactly the way the real host patches the page.

Usage: uv run --with playwright python record.py [out_dir]
"""
from __future__ import annotations

import base64
import json
import math
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
BUILD = HERE / "build"
OUT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "/private/tmp/claude-502/cr170-a/rec")
VIEW_W, VIEW_H, SCALE = 1600, 900, 2.4


def ease(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * x * (x * (x * 6 - 15) + 10)  # smootherstep


class Recorder:
    def __init__(self, page, client):
        self.page, self.client = page, client
        self.frames: list[list] = []
        self.log = {"mouse": [], "clicks": [], "keys": [], "cams": [], "subs": [], "scenes": []}
        self.mx, self.my = VIEW_W * 0.72, VIEW_H * 0.55
        self.t0 = 0.0
        (OUT / "frames").mkdir(parents=True, exist_ok=True)
        client.on("Page.screencastFrame", self._frame)

    def _frame(self, params):
        n = len(self.frames)
        path = OUT / "frames" / f"{n:06d}.jpg"
        path.write_bytes(base64.b64decode(params["data"]))
        self.frames.append([params["metadata"]["timestamp"], path.name])
        self.client.send("Page.screencastFrameAck", {"sessionId": params["sessionId"]})

    # -- primitives -------------------------------------------------------------------------
    def wait(self, ms):
        self.page.wait_for_timeout(ms)

    def rect(self, selector, nth=0):
        r = self.page.evaluate(
            """([s, n]) => { const e = document.querySelectorAll(s)[n]; if (!e) return null;
            const r = e.getBoundingClientRect(); return {x: r.left, y: r.top, w: r.width, h: r.height}; }""",
            [selector, nth])
        if r is None:
            raise RuntimeError(f"no element {selector}[{nth}]")
        return r

    def center(self, selector, nth=0, fx=0.5, fy=0.5):
        r = self.rect(selector, nth)
        return r["x"] + r["w"] * fx, r["y"] + r["h"] * fy

    def cam(self, x, y, zoom, dur=0.9):
        self.log["cams"].append([time.time(), x, y, zoom, dur])

    def cam_on(self, selector, zoom, nth=0, dur=0.9, dx=0, dy=0, fx=0.5, fy=0.5):
        x, y = self.center(selector, nth, fx, fy)
        self.cam(x + dx, y + dy, zoom, dur)

    def sub(self, text, dur):
        self.log["subs"].append([time.time(), time.time() + dur, text])

    def scene(self, name):
        self.log["scenes"].append([time.time(), name])

    def glide(self, x, y, dur=None):
        sx, sy = self.mx, self.my
        dist = math.hypot(x - sx, y - sy)
        dur = dur if dur is not None else max(0.35, min(0.95, 0.25 + dist / 1400))
        nx, ny = (-(y - sy), x - sx)
        norm = math.hypot(nx, ny) or 1
        bend = min(60, dist * 0.08)
        cx, cy = (sx + x) / 2 + nx / norm * bend, (sy + y) / 2 + ny / norm * bend
        start = time.time()
        while True:
            u = (time.time() - start) / dur
            e = ease(u)
            px = (1 - e) ** 2 * sx + 2 * (1 - e) * e * cx + e * e * x
            py = (1 - e) ** 2 * sy + 2 * (1 - e) * e * cy + e * e * y
            self.page.mouse.move(px, py)
            self.log["mouse"].append([time.time(), px, py])
            if u >= 1:
                break
        self.mx, self.my = x, y

    def click_at(self, x, y, count=1, dur=None):
        self.glide(x, y, dur)
        self.wait(110)
        self.log["clicks"].append([time.time(), x, y])
        self.page.mouse.click(x, y, click_count=count)
        self.log["mouse"].append([time.time(), x, y])
        self.wait(160)

    def click(self, selector, nth=0, count=1, fx=0.5, fy=0.5, dur=None):
        x, y = self.center(selector, nth, fx, fy)
        self.click_at(x, y, count, dur)

    def button_center(self, text, sel="button"):
        r = self.page.evaluate(
            """([text, sel]) => { const e = [...document.querySelectorAll(sel)].find(b => b.textContent.trim() === text && b.getClientRects().length);
            if (!e) return null; const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }""",
            [text, sel])
        if r is None:
            raise RuntimeError(f"no {sel} with text {text!r}")
        return r[0], r[1]

    def chord(self, keys, label):
        self.log["keys"].append([time.time(), label])
        self.page.keyboard.press(keys)

    def type(self, text, per=42):
        self.page.keyboard.type(text, delay=per)

    def scroll_to(self, selector, nth=0, top=170, dur_ms=900):
        """Smooth scroll so the element's top sits `top` px below the viewport top."""
        self.page.evaluate(
            """([s, n, top]) => { const e = document.querySelectorAll(s)[n];
            window.scrollTo({top: scrollY + e.getBoundingClientRect().top - top, behavior: 'smooth'}); }""",
            [selector, nth, top])
        self.wait(dur_ms)

    # -- stand-in host ----------------------------------------------------------------------
    def patch(self, variant, changed_text):
        """Answer a save like the real host: patch the content with the pre-rendered state."""
        html = (BUILD / f"{variant}.html").read_text(encoding="utf-8")
        self.page.evaluate(
            """([html, changed]) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const contentHtml = doc.getElementById('sphinx-myst-preview-content').innerHTML;
            const root = document.documentElement;
            const version = Number(root.getAttribute('data-sphinx-preview-document-version'));
            const request = Number(root.getAttribute('data-sphinx-preview-request-id'));
            const tmp = document.createElement('div'); tmp.innerHTML = contentHtml;
            const hit = [...tmp.querySelectorAll('[data-line]')].find(e => e.textContent.includes(changed));
            const line = Number(hit.getAttribute('data-line'));
            window.dispatchEvent(new MessageEvent('message', { data: {
              type: 'previewContentPatch',
              documentId: root.getAttribute('data-sphinx-preview-document-id'),
              revision: version, requestId: request,
              next: { revision: version + 1, requestId: request + 1 },
              contentHtml, status: 'success', label: 'Preview ready', diagnostics: [],
              updatedRanges: [{ start: line, end: Number(hit.getAttribute('data-end-line') || line) }],
            } }));
            window.__lastLine = [line, Number(hit.getAttribute('data-end-line') || line)];
            }""", [html, changed_text])

    def host_message(self, data):
        self.page.evaluate(
            """(data) => { const root = document.documentElement;
            window.dispatchEvent(new MessageEvent('message', { data: { ...data,
              documentId: root.getAttribute('data-sphinx-preview-document-id'),
              revision: Number(root.getAttribute('data-sphinx-preview-document-version')),
              requestId: Number(root.getAttribute('data-sphinx-preview-request-id')) } })); }""", data)


def run(rec: Recorder):
    p = rec.page
    # ---- prepare (not recorded): cream theme, top of the page ----
    for _ in range(4):
        if p.evaluate('document.querySelector("[data-sphinx-preview-theme-toggle]").dataset.themeMode') == "cream":
            break
        p.evaluate('document.querySelector("[data-sphinx-preview-theme-toggle]").click()')
    p.evaluate("window.scrollTo(0, 0)")
    p.add_style_tag(content="html { scroll-behavior: auto; } ::selection { background: #f0cfa4; }")
    p.wait_for_function("[...document.querySelectorAll('.myst-mermaid-diagram')].every(d => d.dataset.renderState)")
    p.wait_for_timeout(1500)  # diagrams and chart drawn

    p.evaluate("window.visualMessages.length = 0")
    rec.client.send("Page.startScreencast", {
        "format": "jpeg", "quality": 90, "maxWidth": int(VIEW_W * SCALE), "maxHeight": int(VIEW_H * SCALE), "everyNthFrame": 1})
    rec.wait(400)
    rec.t0 = time.time()
    rec.cam(VIEW_W / 2, VIEW_H / 2, 1.0, 0.01)

    # ---- scene 2: open preview (the styled page) ----
    rec.scene("preview")
    rec.sub("Open any Markdown file, press Open Preview.\nYou get a styled page, not raw text.", 3.4)
    rec.cam_on("[data-okf-properties]", 1.45, dur=1.1, dy=60)
    rec.glide(560, 330, 1.0)
    rec.wait(900)
    rec.sub("Front matter becomes a clean properties table.", 2.6)
    rec.glide(620, 235, 0.7)
    rec.wait(600)
    rec.cam(VIEW_W / 2, 560, 1.18, 1.0)
    rec.glide(700, 470, 0.9)
    rec.wait(700)

    # ---- scene 3: edit where you read ----
    rec.scene("edit")
    rec.sub("Edit where you read.\nSwitch on edit mode, click a paragraph, type.", 3.6)
    rec.cam_on("[data-sphinx-preview-edit-toggle]", 1.4, dur=1.0, dx=-420, dy=150)
    rec.click("[data-sphinx-preview-edit-toggle]")
    rec.wait(300)
    para = "main > p[data-sphinx-source-line]"
    rec.cam_on(para, 1.55, nth=1, dur=1.0, dy=10)
    rec.click(para, nth=1, fx=0.8, fy=0.7)
    rec.page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible")
    rec.wait(400)
    rec.chord("End", "")
    rec.cam_on(".sphinx-preview-block-editor", 1.5, dur=0.8, dy=-10)
    rec.type(" We saved 27 minutes", per=48)
    rec.wait(250)
    rec.sub("Select, press Cmd+B: bold, right in the page.", 3.0)
    rec.chord("Alt+Shift+ArrowLeft", "")
    rec.chord("Alt+Shift+ArrowLeft", "")
    rec.wait(450)
    rec.chord("Meta+b", "Cmd + B")
    rec.wait(700)
    rec.chord("End", "")
    rec.type(" per vehicle.", per=48)
    rec.wait(500)
    rec.sub("Save, and the page updates in place.", 2.6)
    rec.chord("Meta+Enter", "Cmd + Enter")
    rec.wait(150)
    rec.patch("v1", "We saved")
    rec.wait(1500)

    # ---- scene 4: slash menu ----
    rec.scene("slash")
    rec.sub("Type / for the slash menu:\ntables, admonitions, diagrams and more.", 3.8)
    rec.scroll_to(para, nth=2, top=260, dur_ms=1000)
    rec.cam(VIEW_W / 2, 470, 1.25, 0.9)
    rec.click(para, nth=2, fx=0.85, fy=0.5)
    rec.page.locator(".sphinx-preview-block-editor textarea").wait_for(state="visible")
    rec.wait(300)
    rec.chord("End", "")
    rec.chord("Enter", "")
    rec.cam_on(".sphinx-preview-block-editor", 1.35, dur=0.9, dy=70)
    rec.type("/", per=60)
    rec.wait(600)
    rec.type("tip", per=170)
    rec.wait(800)
    rec.chord("Enter", "")
    rec.wait(500)
    rec.type("Start charging while the inspection is still running.", per=34)
    rec.wait(500)
    rec.sub("Save: a styled Tip admonition lands in the document.", 2.8)
    rec.chord("Meta+Enter", "Cmd + Enter")
    rec.wait(150)
    rec.patch("v2", "Start charging")
    rec.cam_on(".admonition.tip", 1.5, dur=1.0)
    rec.wait(1700)
    rec.click("[data-sphinx-preview-edit-toggle]", dur=0.8)   # back to reading
    rec.wait(300)

    # ---- scene 5: MyST cards and tabs ----
    rec.scene("myst")
    rec.sub("MyST cards and tabs render natively.\nClick a tab to switch.", 3.4)
    rec.scroll_to(".myst-card, .card, [data-myst-card], .sd-card, section > div:has(> .card-header)" if False else "h2", nth=0, top=130, dur_ms=1000)
    rec.cam(VIEW_W / 2, 470, 1.25, 0.9)
    rec.wait(500)
    rec.click_at(*rec.button_center("Python"))
    rec.wait(1100)
    rec.click_at(*rec.button_center("Shell"))
    rec.wait(1100)
    rec.click_at(*rec.button_center("Node"))
    rec.wait(900)

    # ---- scene 6: charts and diagrams ----
    rec.scene("charts")
    rec.sub("Vega-Lite charts and Mermaid diagrams, drawn in the page.", 3.4)
    rec.cam(VIEW_W / 2, VIEW_H / 2, 1.0, 0.7)
    rec.scroll_to(".myst-vega-diagram", top=190, dur_ms=1300)
    rec.cam_on(".myst-vega-diagram", 1.5, dur=1.0)
    rec.glide(*rec.center(".myst-vega-diagram", fx=0.55, fy=0.35), dur=0.9)
    rec.wait(900)
    rec.glide(*rec.center(".myst-vega-diagram", fx=0.8, fy=0.55), dur=0.8)
    rec.wait(900)
    rec.cam(VIEW_W / 2, VIEW_H / 2, 1.0, 0.7)
    rec.scroll_to(".myst-mermaid-diagram", top=140, dur_ms=1300)
    rec.cam_on(".myst-mermaid-diagram", 1.45, dur=1.0)
    rec.glide(*rec.center(".myst-mermaid-diagram", fx=0.4, fy=0.5), dur=0.9)
    rec.wait(1700)

    # ---- scene 7: review ----
    rec.scene("review")
    rec.sub("Review in context: comment on any sentence.", 3.2)
    rec.cam(VIEW_W / 2, VIEW_H / 2, 1.0, 0.7)
    rec.scroll_to("h1", top=110, dur_ms=1400)
    rec.cam(VIEW_W / 2 + 40, 350, 1.4, 1.0)
    first = "main > p[data-sphinx-source-line]"
    x, y = rec.center(first, 0, 0.45, 0.4)
    rec.glide(x - 140, y, 0.9)
    rec.page.mouse.click(x - 140, y, click_count=3)
    rec.log["clicks"].append([time.time(), x - 140, y])
    rec.wait(700)
    rec.click_at(*rec.button_center("Comment"))
    rec.wait(500)
    rec.cam(1000, 450, 1.2, 0.9)
    rec.type("Can we add the night shift numbers?", per=42)
    rec.wait(500)
    rec.click_at(*rec.button_center("Save"))
    rec.wait(150)
    rec.page.evaluate(
        """() => {
        const p = document.querySelector('main > p[data-sphinx-source-line]');
        const line = Number(p.getAttribute('data-line'));
        window.__thread = { id: 't1', anchor: { line, endLine: Number(p.getAttribute('data-end-line') || line),
          quote: p.textContent.trim().split('. ')[0] + '.', prefix: '', suffix: '' }, resolved: false, createdAt: 'just now',
          comments: [{ id: 'c1', author: 'Ana', createdAt: 'just now', body: 'Can we add the night shift numbers?' }] };
        }""")
    rec.host_message({"type": "previewComments", "threads": [rec.page.evaluate("window.__thread")]})
    rec.host_message({"type": "previewCommentResult", "ok": True, "kind": "create", "threadId": "t1"})
    rec.wait(900)
    rec.sub("The change bar marks what you edited since the last commit.", 3.4)
    rec.cam(690, 450, 1.12, 1.0)
    rec.page.evaluate(
        """() => {
        const root = document.getElementById('sphinx-myst-preview-content');
        const pick = [[...root.querySelectorAll('p')].find(e => e.textContent.includes('We saved')),
          root.querySelector('.admonition.tip')].map(e => e.closest('[data-line]') || e);
        window.__ranges = pick.map(e => ({ start: Number(e.getAttribute('data-line')),
          end: Number(e.getAttribute('data-end-line') || e.getAttribute('data-line')) }));
        }""")
    rec.host_message({"type": "previewIncomingChanges", "enabled": True, "ranges": rec.page.evaluate("window.__ranges")})
    rec.click_at(*rec.center("mark[data-okf-comment-thread]", 0, 0.5, 0.5))
    rec.wait(1200)
    rec.cam(690, 480, 1.12, 1.0)
    rec.glide(260, 470, 0.9)
    rec.wait(1600)
    rec.chord("Escape", "")

    # ---- scene 8: navigation, toolbar, theme ----
    rec.scene("navigate")
    rec.sub("A table of contents, a toolbar that rolls up,\nand a theme for every taste.", 4.0)
    rec.cam(1100, 330, 1.35, 1.0)
    rec.click("[title='Show table of contents']")
    rec.wait(900)
    rec.click_at(*rec.button_center("The trend", sel="[data-sphinx-preview-toc-entry] button"))
    rec.wait(1100)
    rec.cam(1150, 200, 1.5, 0.9)
    rec.click("[data-sphinx-preview-toolbar-collapse]")
    rec.wait(900)
    rec.click("[data-sphinx-preview-toolbar-collapse]")
    rec.wait(900)
    rec.sub("Cream by default. Dark when you want it.", 3.2)
    for _ in range(4):
        if rec.page.evaluate('document.querySelector("[data-sphinx-preview-theme-toggle]").dataset.themeMode') == "dark":
            break
        rec.click("[data-sphinx-preview-theme-toggle]", dur=0.8)
        rec.wait(1300)
    rec.cam(VIEW_W / 2, VIEW_H / 2, 1.0, 1.2)
    rec.glide(1000, 600, 1.0)
    rec.wait(3800)
    return rec


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(args=[f"--force-device-scale-factor={SCALE}", "--hide-scrollbars", "--allow-file-access-from-files"])
        ctx = browser.new_context(viewport={"width": VIEW_W, "height": VIEW_H}, device_scale_factor=SCALE)
        page = ctx.new_page()
        client = ctx.new_cdp_session(page)
        page.goto("file://" + str(BUILD / "v0.html"))
        page.wait_for_timeout(1500)
        rec = Recorder(page, client)
        try:
            run(rec)
        except Exception:
            page.screenshot(path=str(OUT / 'fail.png'))
            raise
        finally:
            rec.wait(500)
            client.send("Page.stopScreencast")
            rec.log["t_end"] = time.time()
            rec.log["frames"] = rec.frames
            rec.log["t0"] = rec.t0
            rec.log["view"] = [VIEW_W, VIEW_H, SCALE]
            (OUT / "timeline.json").write_text(json.dumps(rec.log))
            browser.close()
    print("frames:", len(rec.frames), "first ts - t0:", rec.frames[0][0] - rec.t0, "span:", rec.frames[-1][0] - rec.frames[0][0])


if __name__ == "__main__":
    main()
