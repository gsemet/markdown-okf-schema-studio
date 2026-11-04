"""Reads the storyboard tables into kit/remotion/src/story.json, so that its texts drive the video."""
import json, re, sys
board, out = sys.argv[1], sys.argv[2]
panels = []
for block in re.split(r"^## (?=\d+\. )", open(board).read(), flags=re.M)[1:]:
    block = block.split("\n## ")[0]
    fields = {}
    for name, value in re.findall(r"^\| ([^|]+?) \| (.+?) \|$", block, flags=re.M):
        fields[name.replace(" *(filmed)*", "")] = None if value == "-" else value
    start, end = re.match(r"([\d.]+) to ([\d.]+) s", fields["Time"]).groups()
    panels.append({"id": int(block.split(".")[0]), "start": float(start), "end": float(end), **fields})
json.dump(panels, open(out, "w"), indent=1)
