#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Eric Voice Assistant"
echo "--------------------"

if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display dialog "Node.js is required before the voice assistant can run." buttons {"OK"} default button "OK" with icon caution'
  open "https://nodejs.org/en/download"
  exit 1
fi

if [ ! -d node_modules ]; then
  npm install
fi

if [ ! -d "$HOME/Library/Caches/ms-playwright" ]; then
  npx playwright install chromium
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

if ! grep -Eq '^TYPESAFE_API_KEY=.+$' .env; then
  KEY=$(osascript -e 'text returned of (display dialog "Paste your Jev / TypeSafe API key" default answer "" with hidden answer buttons {"Cancel", "Continue"} default button "Continue")') || exit 1
  if [ -z "$KEY" ]; then
    osascript -e 'display dialog "No API key was entered." buttons {"OK"} default button "OK" with icon caution'
    exit 1
  fi
  printf '\nTYPESAFE_API_KEY=%s\n' "$KEY" >> .env
fi

npm test

if pgrep -f "node src/server.js" >/dev/null 2>&1; then
  :
else
  nohup npm start > voice-assistant.log 2>&1 &
  sleep 3
fi

open -a "Google Chrome" "http://localhost:8787" || open "http://localhost:8787"

osascript -e 'display notification "Voice Assistant is ready. In Chrome, click Start microphone and say: Show applications." with title "Eric Voice Assistant"'
