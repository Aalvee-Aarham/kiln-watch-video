#!/usr/bin/env bash
# Concats act1 + act2 + act3 + the live demo + act4 renders into one kiln-watch-full.mp4
# (3:59). All five are 1920x1080/30fps h264+aac, so a stream-copy concat
# (no re-encode) is correct and lossless.
# ffmpeg is taken from PATH. If it's installed somewhere else, run: FFMPEG=/path/to/ffmpeg bash merge.sh
set -e
cd "$(dirname "$0")"
FF="${FFMPEG:-$(command -v ffmpeg || true)}"
[ -n "$FF" ] || { echo "ffmpeg not found. Install it or set FFMPEG=/path/to/ffmpeg"; exit 1; }
FFPROBE="$(dirname "$FF")/ffprobe"

A1="act1 using brag/composition/renders/act1-final.mp4"
A2="act2/renders/act2-final.mp4"
A3="act3/renders/act3-final.mp4"
AD="demo/renders/demo-final.mp4"
A4="act4/renders/act4-final.mp4"

for f in "$A1" "$A2" "$A3" "$AD" "$A4"; do
  [ -f "$f" ] || { echo "MISSING: $f"; exit 1; }
done

# paths in the list are relative to the list file's folder (this folder)
printf "file '%s'\n" "$A1" "$A2" "$A3" "$AD" "$A4" > _concat.txt
cat _concat.txt

"$FF" -y -f concat -safe 0 -i _concat.txt -c copy "kiln-watch-full.mp4"
rm -f _concat.txt
echo "=== probe ==="
"$FFPROBE" -v error -show_entries format=duration -of default=nw=1 "kiln-watch-full.mp4" || true
