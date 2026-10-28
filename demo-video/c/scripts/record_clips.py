#!/usr/bin/env python3
"""Record the demo scenes from the headless preview page (the repo's visual harness output).

Each scene is a function that drives the page with scripted mouse and keyboard input. Frames are grabbed with CDP Page.captureScreenshot (about 40 per second) between
every input step; they are 2560x1440 JPEGs (1280x720 CSS px at device scale 2); the cursor is NOT in the frames:
its positions and clicks are logged to <scene>.json and drawn by the Remotion composition.

Usage: record_clips.py OUT_DIR [scene ...]
Needs: pip install playwright (chromium installed), ffmpeg on PATH, the rendered page from render_page.sh.
"""
from __future__ import annotations
import base64, json, math, shutil, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright, Page

ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "out/reports/visual/pages/70-release-showcase--light--sticky-3--default.html"
W, H, DSF = 1280, 720, 2
FFMPEG = shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"


class Recorder:
    def __init__(self, page: Page, name: str, out: Path):
        self.page, self.name, self.out = page, name, out
        self.cdp = page.context.new_cdp_session(page)
        self.frames: list[tuple[float, bytes]] = []
        self.cursor: list[list[float]] = []   # [t, x, y]
        self.clicks: list[float] = []
        self.marks: dict[str, float] = {}
        self.x, self.y = 640.0, 360.0
        self.t0 = 0.0

    def grab(self):
        data = self.cdp.send("Page.captureScreenshot", {"format": "jpeg", "quality": 90})["data"]
        self.frames.append((time.time(), base64.b64decode(data)))

    def start(self):
        self.t0 = time.time()
        self.grab()
        self.cursor.append([0.0, self.x, self.y])

    def now(self):
        return time.time() - self.t0

    def mark(self, label):
        self.marks[label] = self.now()

    def wait(self, ms):
        end = time.time() + ms / 1000
        while time.time() < end:
            self.grab()

    def move(self, x, y, ms=600):
        """Eased mouse move (the page sees real mousemove events, so hovers and tooltips happen)."""
        x0, y0 = self.x, self.y
        steps = max(8, int(ms / 33))
        start = time.time()
        for i in range(1, steps + 1):
            k = i / steps
            e = k * k * (3 - 2 * k)
            self.page.mouse.move(x0 + (x - x0) * e, y0 + (y - y0) * e)
            self.cursor.append([self.now(), x0 + (x - x0) * e, y0 + (y - y0) * e])
            self.grab()
            target = start + ms / 1000 * k
            while time.time() < target:
                self.grab()
        self.x, self.y = x, y

    def center(self, locator):
        locator.scroll_into_view_if_needed()
        b = locator.bounding_box()
        return b["x"] + b["width"] / 2, b["y"] + b["height"] / 2

    def click_at(self, x, y, ms=600, dwell=120):
        self.move(x, y, ms)
        self.wait(dwell)
        self.clicks.append(self.now())
        self.page.mouse.down(); self.page.mouse.up()
        self.cursor.append([self.now(), x, y])
        self.grab()

    def click(self, locator, ms=600, dx=0, dy=0, dwell=120):
        x, y = self.center(locator)
        self.click_at(x + dx, y + dy, ms, dwell)

    def smooth_scroll(self, to_y, ms=900):
        y0 = self.page.evaluate("window.scrollY")
        start = time.time()
        while True:
            k = min(1.0, (time.time() - start) / (ms / 1000))
            e = k * k * (3 - 2 * k)
            self.page.evaluate(f"window.scrollTo(0, {y0 + (to_y - y0) * e})")
            self.grab()
            if k >= 1:
                break

    def type(self, text, delay=55):
        for ch in text:
            self.page.keyboard.type(ch)
            self.wait(delay)

    def finish(self):
        self.wait(200)
        end = self.now()
        frames = self.frames
        d = self.out / self.name
        shutil.rmtree(d, ignore_errors=True); d.mkdir(parents=True)
        # Video time 0 is self.t0 (same epoch clock as the frame timestamps); the first frame is held
        # from 0 and the last frame until the end of the scene.
        end_ts = self.t0 + end
        lines = []
        for i, (ts, data) in enumerate(frames):
            (d / f"f{i:05d}.jpg").write_bytes(data)
            nxt = frames[i + 1][0] if i + 1 < len(frames) else end_ts
            cur = self.t0 if i == 0 else ts
            dur = nxt - cur
            lines.append(f"file 'f{i:05d}.jpg'\nduration {max(dur, 0.001):.4f}")
        lines.append(f"file 'f{len(frames)-1:05d}.jpg'")
        (d / "list.txt").write_text("\n".join(lines))
        mp4 = self.out / f"{self.name}.mp4"
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(d / "list.txt"),
                        "-vf", "fps=30,format=yuv420p,scale=2560:1440", "-c:v", "libx264", "-crf", "16", "-preset", "fast",
                        "-movflags", "+faststart", str(mp4)], check=True)
        # Frame clock span vs wall-clock span, to calibrate the cursor log against the video
        span = end
        meta = {"duration": span, "fps": 30, "cursor": self.cursor, "clicks": self.clicks, "marks": self.marks,
                "frames": len(frames), "wallSpan": end,
                "firstFrameLag": frames[0][0] - (self.t0)}
        (self.out / f"{self.name}.json").write_text(json.dumps(meta))
        shutil.rmtree(d)
        print(self.name, "frames", len(frames), "video s", round(span, 2), "wall s", round(end, 2))


def open_page(browser, mode="cream", scroll=0, edit=False):
    ctx = browser.new_context(viewport={"width": W, "height": H}, device_scale_factor=DSF, color_scheme="light")
    page = ctx.new_page()
    page.goto("file://" + str(PAGE))
    page.wait_for_selector("main .myst-tab-set")
    # Diagrams render lazily when scrolled into view: visit them once, then go back to the top.
    for sel in ('.myst-vega-diagram', '.myst-mermaid-diagram'):
        page.locator(sel).first.scroll_into_view_if_needed()
        page.wait_for_selector(sel + '[data-render-state="rendered"]', timeout=20000)
    page.evaluate("window.scrollTo(0,0)")
    # Remove the hover shadows of nothing; hide the sticky headings overlay which flickers in clips
    toggle = page.locator("[data-sphinx-preview-theme-toggle]")
    clicks = {"cream": 3, "dark": 1, "white": 2, "current": 0}[mode]
    for _ in range(clicks):
        toggle.click(); page.wait_for_timeout(120)
    page.mouse.move(640, 360)
    if edit:
        page.locator("[data-sphinx-preview-edit-toggle]").click()
    if scroll:
        page.evaluate(f"window.scrollTo(0,{scroll})")
    page.wait_for_timeout(500)
    return ctx, page


def host_message(page, payload):
    page.evaluate("""(payload) => { const r = document.documentElement; window.dispatchEvent(new MessageEvent('message',
      { data: { documentId: r.getAttribute('data-sphinx-preview-document-id'), revision: 1, requestId: 1, ...payload } })); }""", payload)


# ---------------------------------------------------------------- scenes
def scene_open(b, out):
    ctx, page = open_page(b)
    r = Recorder(page, "s2_open", out); r.start()
    r.move(500, 330, 500); r.wait(500)
    r.move(640, 200, 700); r.wait(700)
    r.smooth_scroll(260, 1200); r.wait(500)
    r.smooth_scroll(0, 900); r.wait(400)
    r.finish(); ctx.close()


def scene_edit(b, out):
    ctx, page = open_page(b)
    r = Recorder(page, "s3_edit", out); r.start()
    r.wait(300)
    r.click(page.locator("[data-sphinx-preview-edit-toggle]"), 800); r.mark("editOn"); r.wait(600)
    para = page.locator("main p", has_text="We moved two checks")
    r.click(para, 800, dx=-250, dy=0); r.mark("editorOpen"); r.wait(900)
    # select the word "dashboard" in the textarea by double click, then Cmd+B
    area = page.locator(".sphinx-preview-block-editor textarea")
    area.wait_for(state="visible")
    idx = area.input_value().index("dashboard")
    area.evaluate(f"el => el.setSelectionRange({idx}, {idx + len('dashboard')})")
    r.wait(500); r.mark("selected")
    page.keyboard.press("Meta+b"); r.mark("bold"); r.wait(1100)
    r.press_done = None
    done = page.get_by_role("button", name="Done")
    r.click(done, 800); r.mark("saved")
    # Stand-in for the VS Code host re-render after the commit: apply the same edit to the block
    page.evaluate("""() => { const p = [...document.querySelectorAll('main p')].find(e => e.textContent.includes('We moved two checks'));
      if (p) p.innerHTML = p.innerHTML.replace('dashboard', '<strong>dashboard</strong>'); }""")
    r.wait(1300)
    r.finish(); ctx.close()


def scene_slash(b, out):
    ctx, page = open_page(b, edit=True, scroll=320)
    r = Recorder(page, "s4_slash", out); r.start(); r.wait(300)
    para = page.locator("main p", has_text="The retry budget")
    bb = para.bounding_box()
    r.move(bb["x"] + 120, bb["y"] + 10, 800); r.wait(250)
    # the "+" insertion point hanging below that paragraph
    idx = page.evaluate("""(by) => { const bs = [...document.querySelectorAll('button[aria-label="Insert a block here"]')];
      let best = 0, d = 1e9; bs.forEach((b, i) => { const dd = Math.abs(b.getBoundingClientRect().y - by); if (dd < d) { d = dd; best = i; } }); return best; }""",
        bb["y"] + bb["height"])
    r.click(page.locator('button[aria-label="Insert a block here"]').nth(idx), 600)
    r.mark("open"); r.wait(700)
    r.type("/", 80); r.wait(900); r.mark("menu")
    r.type("adm", 190); r.wait(900); r.mark("filtered")
    r.click(page.locator("[data-slash-id]", has_text="Tip admonition").first, 700); r.mark("inserted"); r.wait(500)
    r.type("Everything you write stays plain Markdown.", 38); r.mark("typed"); r.wait(1500)
    r.finish(); ctx.close()


def scene_tabs(b, out):
    ctx, page = open_page(b, scroll=330)
    r = Recorder(page, "s5_tabs", out); r.start(); r.wait(400)
    tabs = page.locator("main .myst-tab-set > .myst-tab-list > .myst-tab")
    r.move(520, 300, 600); r.wait(300)
    r.click(tabs.nth(0), 700); r.mark("py"); r.wait(1100)
    r.click(tabs.nth(2), 600); r.mark("sh"); r.wait(1100)
    r.click(tabs.nth(1), 600); r.mark("node"); r.wait(800)
    card = page.locator("main .myst-card")
    x, y = r.center(card)
    r.move(x, y, 800); r.wait(900)
    r.finish(); ctx.close()


def scene_diagrams(b, out):
    ctx, page = open_page(b, scroll=0)
    chart = page.locator(".myst-vega-diagram").first
    cy = page.evaluate("(() => { const b = document.querySelector('.myst-vega-diagram').getBoundingClientRect(); return b.top + scrollY; })()")
    page.evaluate(f"window.scrollTo(0,{cy - 190})"); page.wait_for_timeout(300)
    r = Recorder(page, "s6_diagrams", out); r.start(); r.wait(300)
    r.move(700, 400, 700); r.wait(1200); r.mark("chart")
    my = page.evaluate("(() => { const b = document.querySelector('.myst-mermaid-diagram').getBoundingClientRect(); return b.top + scrollY; })()")
    r.smooth_scroll(my - 170, 1400); r.mark("mermaid"); r.move(760, 330, 600); r.wait(1700)
    r.finish(); ctx.close()


def scene_review(b, out):
    ctx, page = open_page(b, scroll=320)
    page.evaluate("document.querySelector('[data-sphinx-preview-toolbar]') && 0")
    r = Recorder(page, "s7_review", out); r.start(); r.wait(300)
    host_message(page, {"type": "previewComments", "threads": [{
        "id": "t1", "anchor": {"line": 15, "endLine": 15, "quote": "consecutive calls fail", "prefix": "three ", "suffix": ", and"},
        "resolved": False, "createdAt": "yesterday",
        "comments": [{"id": "c1", "author": "Marie Dubois", "createdAt": "yesterday", "body": "Is three failures the right limit for the client?"},
                     {"id": "c2", "author": "Tom Becker", "createdAt": "this morning", "body": "Yes for interactive calls; batch jobs set their own budget."}]}]})
    r.wait(700); r.mark("thread")
    host_message(page, {"type": "previewIncomingChanges", "enabled": True, "ranges": [{"start": 13, "end": 13}]})
    r.wait(800); r.mark("bar")
    r.move(520, 430, 600)
    r.click(page.locator("mark[data-okf-comment-thread]").first, 700); r.mark("popover"); r.wait(2200)
    r.finish(); ctx.close()


def scene_nav(b, out):
    ctx, page = open_page(b, scroll=0)
    r = Recorder(page, "s8_nav", out); r.start(); r.wait(300)
    r.click(page.locator("[data-sphinx-preview-toc-toggle]"), 700); r.mark("toc"); r.wait(1500)
    r.click(page.locator("nav[data-sphinx-preview-toc] button", has_text="When a vehicle"), 700)
    r.mark("tocjump"); r.wait(1800)
    r.click(page.locator("[data-sphinx-preview-toc-toggle]"), 700); r.wait(500)
    theme = page.locator("[data-sphinx-preview-theme-toggle]")
    r.click(theme, 700); r.wait(200)   # cream -> current(light)
    r.click_at(r.x, r.y, 50, 100); r.mark("dark"); r.wait(1700)
    r.finish(); ctx.close()


SCENES = {"open": scene_open, "edit": scene_edit, "slash": scene_slash, "tabs": scene_tabs,
          "diagrams": scene_diagrams, "review": scene_review, "nav": scene_nav}

if __name__ == "__main__":
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    want = sys.argv[2:] or list(SCENES)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--allow-file-access-from-files"])
        for name in want:
            SCENES[name](b, out)
        b.close()
