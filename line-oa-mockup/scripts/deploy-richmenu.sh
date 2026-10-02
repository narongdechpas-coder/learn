#!/usr/bin/env bash
# Create both rich menus, upload images, set the pre-verification menu as default.
# Usage: CHANNEL_ACCESS_TOKEN=xxx LIFF_ID=xxx ./scripts/deploy-richmenu.sh
# After a partner verifies, link the main menu to that user:
#   curl -X POST -H "Authorization: Bearer $CHANNEL_ACCESS_TOKEN" \
#     https://api.line.me/v2/bot/user/{userId}/richmenu/{MAIN_ID}
# Requires: curl, jq
set -euo pipefail
: "${CHANNEL_ACCESS_TOKEN:?set CHANNEL_ACCESS_TOKEN}"
: "${LIFF_ID:?set LIFF_ID}"
cd "$(dirname "$0")/../richmenu"
AUTH="Authorization: Bearer $CHANNEL_ACCESS_TOKEN"

create() {  # $1 = json file, prints richMenuId
  sed "s/{LIFF_ID}/$LIFF_ID/g" "$1" |
    curl -sS -X POST https://api.line.me/v2/bot/richmenu -H "$AUTH" -H "Content-Type: application/json" -d @- |
    jq -r '.richMenuId'
}
upload() {  # $1 = id, $2 = png
  curl -sS -X POST "https://api-data.line.me/v2/bot/richmenu/$1/content" -H "$AUTH" -H "Content-Type: image/png" --data-binary @"$2" >/dev/null
}

PRE_ID=$(create richmenu-pre.json);  upload "$PRE_ID"  richmenu-pre.png
MAIN_ID=$(create richmenu-main.json); upload "$MAIN_ID" richmenu-main.png

curl -sS -X POST "https://api.line.me/v2/bot/user/all/richmenu/$PRE_ID" -H "$AUTH" >/dev/null
for pair in "partner-pre:$PRE_ID" "partner-main:$MAIN_ID"; do
  curl -sS -X POST https://api.line.me/v2/bot/richmenu/alias -H "$AUTH" -H "Content-Type: application/json" \
    -d "{\"richMenuAliasId\":\"${pair%%:*}\",\"richMenuId\":\"${pair#*:}\"}" >/dev/null
done

echo "partner-pre  (default): $PRE_ID"
echo "partner-main:           $MAIN_ID"
