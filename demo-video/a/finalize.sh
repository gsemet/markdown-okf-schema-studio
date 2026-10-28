#!/usr/bin/env bash
# Derives the 15 s cut, the GIF, the contact sheet and the full-length copies from the rendered silent video.
# Usage: finalize.sh <render_out_dir> <deliver_dir>
set -euo pipefail
IN="$1/demo-a-silent.mp4"; OUT="$2"; F=/opt/homebrew/bin/ffmpeg
mkdir -p "$OUT"
cp "$IN" "$OUT/demo-a-silent.mp4"; cp "$1/demo-a.srt" "$1/demo-a.ass" "$OUT/"
# 15 s cut: output-time segments (title, edit, slash, charts, review, dark) with a little speed-up, hard cuts.
$F -y -loglevel error -i "$IN" -filter_complex "
[0:v]trim=0.6:1.8,setpts=PTS-STARTPTS[a];
[0:v]trim=12.0:15.4,setpts=(PTS-STARTPTS)/1.5[b];
[0:v]trim=19.8:24.0,setpts=(PTS-STARTPTS)/1.7[c];
[0:v]trim=28.0:30.2,setpts=(PTS-STARTPTS)/1.3[d];
[0:v]trim=35.8:37.8,setpts=(PTS-STARTPTS)/1.3[e];
[0:v]trim=50.4:52.8,setpts=(PTS-STARTPTS)/1.3[f];
[0:v]trim=64.4:68.6,setpts=PTS-STARTPTS[g];
[a][b][c][d][e][f][g]concat=n=7:v=1:a=0,fade=t=out:st=14.2:d=0.8[v]" -map "[v]" -r 30 -c:v libx264 -crf 19 -preset slow -pix_fmt yuv420p -movflags +faststart "$OUT/demo-a-15s.mp4"
# GIF from the 15 s cut: 960 px, 15 fps, palette.
$F -y -loglevel error -i "$OUT/demo-a-15s.mp4" -vf "fps=15,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=160:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle" "$OUT/demo-a.gif"
ls -la "$OUT"
