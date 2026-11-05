#!/bin/bash
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  echo "Setup has not been completed yet. Double-click setup-mac.command first."
  read -p "Press Enter to close..."
  exit 1
fi

if ! grep -Eq '^TYPESAFE_API_KEY=.+$' .env; then
  echo "Your Jev/TypeSafe API key is missing from .env. Run setup-mac.command first."
  read -p "Press Enter to close..."
  exit 1
fi

PORT=$(grep '^VOICE_ASSISTANT_PORT=' .env | tail -1 | cut -d= -f2)
PORT=${PORT:-8787}

npm start &
SERVER_PID=$!

cleanup() {
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

sleep 2
open -a "Google Chrome" "http://localhost:${PORT}" || open "http://localhost:${PORT}"

echo "UniDoxia Voice Assistant is running at http://localhost:${PORT}"
echo "Keep this window open while you use it. Press Control+C to stop."
wait "$SERVER_PID"
