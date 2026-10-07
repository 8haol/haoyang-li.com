#!/usr/bin/env bash
# Cut a muted 16:10 cover loop (and a matching poster) for a gallery card from any video.
#
#   scripts/cut-cover-loop.sh <slug> <source video> <start seconds> [duration seconds] [poster offset seconds]
#
# Writes public/images/work/<slug>/loop.mp4 (1280×800, H.264, no audio, ~1 MB) and cover.jpg (1600×1000).
# The site picks up loop.mp4 on its own; no YAML change needed. Check the frames for client names first.
set -euo pipefail

slug="${1:?slug}"
src="${2:?source video}"
start="${3:?start seconds}"
dur="${4:-12}"
poster="${5:-1}"

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/public/images/work/$slug"
mkdir -p "$out"

crop="crop='min(iw,ih*16/10)':'min(ih,iw*10/16)'"
fade_out="$(echo "$dur - 0.5" | bc)"

ffmpeg -v error -y -ss "$start" -t "$dur" -i "$src" -an \
  -vf "$crop,scale=1280:800:flags=lanczos,fps=30,fade=t=in:st=0:d=0.5,fade=t=out:st=$fade_out:d=0.5" \
  -c:v libx264 -preset slow -crf 27 -profile:v high -pix_fmt yuv420p -movflags +faststart "$out/loop.mp4"

ffmpeg -v error -y -ss "$(echo "$start + $poster" | bc)" -i "$src" -frames:v 1 \
  -vf "$crop,scale=1600:1000:flags=lanczos" -q:v 3 "$out/cover.jpg"

ls -lh "$out/loop.mp4" "$out/cover.jpg"
