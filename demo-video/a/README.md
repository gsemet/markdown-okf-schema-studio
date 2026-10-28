# Track A: scripted headless demo video (CR 170)

Playwright Chromium drives the headless preview page of the visual harness; a CDP screencast records it at 2.4x
(3840x2160 source); `render.py` composes the 1920x1080 / 30 fps video (eased camera, cursor, click ripple,
key badges, subtitles, cards). Music: none (the video is silent).

Regenerate (from the repository root, scratch venv with `playwright` and `pillow`; ffmpeg at /opt/homebrew/bin):

    demo-video/a/build_page.sh                       # renders demo.md (v0/v1/v2) with the harness into build/
    python demo-video/a/record.py  <rec_dir>         # records frames + timeline.json
    python demo-video/a/render.py  <rec_dir> <out>   # silent MP4, .srt, .ass
    demo-video/a/finalize.sh <out> <deliver_dir>     # 15 s cut and GIF

Files: demo-a-silent.mp4 (72 s+, no audio), demo-a-15s.mp4, demo-a.gif, demo-a.srt, demo-a.ass, contact-sheet.png.
The subtitles are burned in by render.py (the Homebrew ffmpeg has no libass); the .ass is a companion file.
