#!/bin/bash
# Firebase Admin Service Account JSON feldolgozása
# Használat: ./extract-firebase-admin.sh <service-account-file.json>

if [ -z "$1" ]; then
  echo "❌ Használat: ./extract-firebase-admin.sh <service-account-file.json>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "❌ Fájl nem található: $1"
  exit 1
fi

echo ""
echo "📋 Add hozzá ezeket a .env.local fájlhoz:"
echo ""
echo "# Firebase Admin SDK"

# Extract client_email
CLIENT_EMAIL=$(cat "$1" | grep -o '"client_email": *"[^"]*"' | cut -d'"' -f4)
echo "FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL"

# Extract private_key (escape newlines)
PRIVATE_KEY=$(cat "$1" | grep -o '"private_key": *"[^"]*"' | cut -d'"' -f4)
echo "FIREBASE_PRIVATE_KEY=\"$PRIVATE_KEY\""

echo ""
echo "✅ Másold be ezeket a .env.local végére, majd add hozzá Vercel-hez is!"
