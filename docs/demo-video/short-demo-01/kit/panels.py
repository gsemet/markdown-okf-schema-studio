"""Writes one frame of the video per panel into images/, and the image line of each panel."""
import json, os, re, subprocess, sys
root = sys.argv[1]
prefix = sys.argv[2] if len(sys.argv) > 2 else "images"
os.makedirs(f"{root}/images", exist_ok=True)
video = f"{root}/output/short-demo-01.mp4"
panels = json.load(open(f"{root}/kit/remotion/src/story.json"))
board = open(f"{root}/01-storyboard.md").read()
board = re.sub(r"!\[Panel \d+\]\([^)]*panel-\d+\.png\)\n\n", "", board)
for p in panels:
    at = p["start"] + (p["end"] - p["start"]) * 0.85
    name = f"panel-{p['id']:02d}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(at), "-i", video, "-frames:v", "1", "-vf", "scale=1200:-1", f"{root}/images/{name}"], check=True)
    board = re.sub(rf"(?m)^(## {p['id']}\. .*\n\n)", rf"\1![Panel {p['id']}]({prefix}/{name})\n\n", board)
open(f"{root}/01-storyboard.md", "w").write(board)
