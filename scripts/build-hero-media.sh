#!/usr/bin/env bash
# Builds the homepage hero media from the raw shop walkthrough clips.
#
#   scripts/build-hero-media.sh <portrait.mov> <landscape.mov>
#
# Bakes in the look ahead of time so the browser only plays plain video:
#   - bloom: the brightest parts (ceiling lights, floor reflections) are
#     blurred and screened back on top, so what's there glows
#   - a soft white light flash on each cut, nothing in between
#   - the loop's end cross-fades into its start so it repeats without a jump
# Outputs (public/media): hero-{intro,loop}-{portrait,landscape}.{mp4,webm}
# plus a poster image for each.
set -euo pipefail

PORTRAIT=${1:?portrait clip}
LANDSCAPE=${2:?landscape clip}
OUT=public/media
mkdir -p "$OUT"

INTRO_END=6     # outside → sign → door → first look inside
LOOP_END=29.5   # inside walkthrough
SEAM=1          # loop cross-fade length
# Cuts in the source (seconds), found with ffmpeg scene detection.
CUTS=(4.43 10.37 16.0 17.83)

flashes() { # $1 = offset subtracted from cut times
  local expr="0"
  for c in "${CUTS[@]}"; do
    expr+="+0.11*exp(-pow((t-($c-$1))/0.16\,2))"
  done
  echo "$expr"
}

look() { # $1 = blur sigma, $2 = time offset
  echo "split[base][hl];\
[hl]lutyuv=y='clip((val-172)*2.6\,0\,255)':u=128:v=128,gblur=sigma=$1[glow];\
[base][glow]blend=c0_mode=screen:c0_opacity=0.8:c1_mode=normal:c2_mode=normal,\
eq=contrast=1.04:saturation=1.05:brightness='$(flashes "$2")':eval=frame,\
colortemperature=temperature=6000:mix=0.25,vignette=angle=PI/6"
}

encode() { # $1 = output name, $2 = CRF (H.264), rest = ffmpeg input/filter args
  local name=$1 crf=$2; shift 2
  ffmpeg -v error -y "$@" -an -map "[v]" \
    -c:v libx264 -preset slow -crf $crf -profile:v high -pix_fmt yuv420p -movflags +faststart \
    "$OUT/$name.mp4"
  ffmpeg -v error -y -i "$OUT/$name.mp4" -an \
    -c:v libvpx-vp9 -crf $((crf + 12)) -b:v 0 -row-mt 1 -deadline good -cpu-used 2 \
    "$OUT/$name.webm"
}

build() { # $1 = source, $2 = orientation, $3 = scale filter, $4 = blur sigma
  local src=$1 o=$2 scale=$3 sigma=$4
  # Intro: first 6 s.
  encode "hero-intro-$o" 25 -i "$src" -filter_complex \
    "[0:v]trim=0:$INTRO_END,setpts=PTS-STARTPTS,$scale,$(look "$sigma" 0),format=yuv420p[v]"
  # Loop: 6 s → end, last second cross-faded into the first.
  local len; len=$(echo "$LOOP_END - $INTRO_END" | bc)
  encode "hero-loop-$o" 29 -i "$src" -filter_complex \
    "[0:v]trim=$INTRO_END:$LOOP_END,setpts=PTS-STARTPTS,$scale,$(look "$sigma" "$INTRO_END"),format=yuv420p,split[a][b];\
[b]trim=0:$SEAM,setpts=PTS-STARTPTS[head];\
[a]trim=$SEAM:$len,setpts=PTS-STARTPTS[body];\
[body][head]xfade=transition=fade:duration=$SEAM:offset=$(echo "$len - 2*$SEAM" | bc)[v]"
  # Posters: first frame of each, as JPEG (the browser shows it until video plays).
  ffmpeg -v error -y -i "$OUT/hero-intro-$o.mp4" -frames:v 1 -q:v 4 "$OUT/hero-intro-$o.jpg"
  ffmpeg -v error -y -i "$OUT/hero-loop-$o.mp4" -frames:v 1 -q:v 4 "$OUT/hero-loop-$o.jpg"
}

build "$PORTRAIT" portrait "scale=720:1280:flags=lanczos" 22
build "$LANDSCAPE" landscape "scale=1280:-2:flags=lanczos,unsharp=5:5:0.4" 26
ls -la "$OUT"
