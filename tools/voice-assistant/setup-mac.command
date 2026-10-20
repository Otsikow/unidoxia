#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "UniDoxia Voice Assistant - Mac Setup"
echo "===================================="

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Please install Node.js 20 or newer from https://nodejs.org and run this file again."
  read -p "Press Enter to close..."
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20 or newer is required. Current version: $(node -v)"
  read -p "Press Enter to close..."
  exit 1
fi

echo "1/4 Installing dependencies..."
npm install

echo "2/4 Installing Playwright Chromium..."
npx playwright install chromium

if [ ! -f .env ]; then
  cp .env.example .env
fi

echo "3/4 Opening the private configuration file..."
echo "Add your TYPESAFE_API_KEY after the equals sign, save, and close the editor."
open -a TextEdit .env

read -p "When you have saved .env, press Enter here to continue..."

if ! grep -Eq '^TYPESAFE_API_KEY=.+$' .env || grep -Eq '^TYPESAFE_API_KEY=(your_key_here)?$' .env; then
  echo "No Jev/TypeSafe API key was detected in .env. Setup cannot continue yet."
  read -p "Press Enter to close..."
  exit 1
fi

echo "4/4 Running safety tests..."
npm test

echo ""
echo "Setup passed. Double-click start-mac.command whenever you want to use the assistant."
read -p "Press Enter to close..."
