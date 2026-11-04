"""Turns the screencast frames into a 30 fps clip and writes the timing data of the composition."""
import json, subprocess, sys
take, public = sys.argv[1], sys.argv[2]
meta = json.load(open(f"{take}/frames.json"))
events = json.load(open(f"{take}/events.json"))
frames = meta["frames"]
t0 = frames[0]["t"]
with open(f"{take}/list.txt", "w") as out:
    for cur, nxt in zip(frames, frames[1:]):
        out.write(f"file 'f_{cur['n']:06d}.jpg'\nduration {nxt['t'] - cur['t']:.4f}\n")
    out.write(f"file 'f_{frames[-1]['n']:06d}.jpg'\nduration 0.5\nfile 'f_{frames[-1]['n']:06d}.jpg'\n")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"{take}/list.txt",
                "-vf", "fps=30,scale=2880:-2", "-c:v", "libx264", "-crf", "14", "-pix_fmt", "yuv420p",
                f"{public}/clip.mp4"], check=True)
rel = lambda e: round(e["t"] - t0, 3)
spans = {}
for i, e in enumerate(events):
    if e["type"] == "panel":
        stop = next(x for x in events[i + 1:] if x["type"] in ("panel", "close", "end"))
        spans[str(e["id"])] = [rel(e), rel(stop)]
def until(i, mark):
    """A mark stays until the next unmark of its panel, or to the end of the take."""
    stop = next((x for x in events[i + 1:] if x["type"] == "unmark" and x["id"] == mark["id"]), None)
    return rel(stop) if stop else 1e9

data = {
    "size": meta["size"][:2],
    "mouse": [{"t": rel(e), "x": e["x"], "y": e["y"]} for e in events if e["type"] == "m"],
    "clicks": [{"t": rel(e), "x": e["x"], "y": e["y"]} for e in events if e["type"] == "click"],
    "spans": spans,
    "marks": [{"id": e["id"], "t": rel(e), "until": until(i, e), **e["rect"]} for i, e in enumerate(events) if e["type"] == "mark"],
    "zooms": {str(e["id"]): e["rect"] for e in events if e["type"] == "zoom"},
}
json.dump(data, open(f"{public}/../src/take.json", "w"))
for k, (a, b) in spans.items():
    n = sum(1 for f in frames if a <= f["t"] - t0 < b)
    print(k, "frames per second", round(n / (b - a), 1))
print({k: round(v[1] - v[0], 2) for k, v in spans.items()})
