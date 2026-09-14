#!/bin/zsh
#
# Screenshot the running app at a real device size.
#
#   pnpm dev
#   scripts/screenshot.sh 390 844 /tmp/phone.png
#   scripts/screenshot.sh 1280 800 /tmp/desktop.png
#   scripts/screenshot.sh 900 420 /tmp/landscape.png   # the wide-short layout
#
# Why the iframe: headless Chrome refuses to make its viewport narrower than
# 500px. Ask for 390 and it silently gives you 500 and scales the image, so
# the screenshot looks like the layout is overflowing when it is not. Loading
# the app in a fixed-size iframe inside a larger window gives it a genuine
# 390px viewport, and `100dvh` resolves against the iframe.
#
# This exists because the redesign was built blind for five commits. Look at
# the thing you are building.
#
set -e

W=${1:-390}
H=${2:-844}
OUT=${3:-/tmp/opentune-$W.png}
URL=${4:-http://localhost:3000}

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ ! -x $CHROME ]]; then
  echo "Chrome not found at $CHROME" >&2
  exit 1
fi

DIR=$(dirname "$OUT")
HARNESS="$DIR/.screenshot-harness.html"
cat > "$HARNESS" <<HTML
<body style="margin:0;background:#222">
<iframe src="$URL" style="width:${W}px;height:${H}px;border:0;display:block"></iframe>
</body>
HTML

"$CHROME" --headless --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=2 --window-size=$((W + 40)),$((H + 40)) \
  --virtual-time-budget=5000 --screenshot="$OUT" "file://$HARNESS" 2>/dev/null

rm -f "$HARNESS"
echo "wrote $OUT (${W}x${H})"
