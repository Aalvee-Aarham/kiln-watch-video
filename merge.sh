#!/usr/bin/env bash
# Concats act1-master.mp4 + act2-final.mp4 + act3-final.mp4 + act4-final.mp4 into one
# kiln-watch-full.mp4. All four are 1920x1080/30fps h264+aac, so a stream-copy concat
# (no re-encode) is correct and lossless.
set -e
cd "$(dirname "$0")"
FFDIR="/c/Users/User/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin"
FF="$FFDIR/ffmpeg.exe"

A1="act1 using brag/composition/renders/act1-final.mp4"
A2="act2/renders/act2-final.mp4"
A3="act3/renders/act3-final.mp4"
A4="act4/renders/act4-final.mp4"

for f in "$A1" "$A2" "$A3" "$A4"; do
  [ -f "$f" ] || { echo "MISSING: $f"; exit 1; }
done

cat > /tmp/_concat.txt <<EOF
file '$(cygpath -w "$(pwd)/$A1" | sed "s#\\\\#/#g")'
file '$(cygpath -w "$(pwd)/$A2" | sed "s#\\\\#/#g")'
file '$(cygpath -w "$(pwd)/$A3" | sed "s#\\\\#/#g")'
file '$(cygpath -w "$(pwd)/$A4" | sed "s#\\\\#/#g")'
EOF
cat /tmp/_concat.txt

"$FF" -y -f concat -safe 0 -i /tmp/_concat.txt -c copy "kiln-watch-full.mp4"
echo "=== probe ==="
"$FFDIR/ffprobe.exe" -v error -show_entries format=duration -of default=nw=1 "kiln-watch-full.mp4"
