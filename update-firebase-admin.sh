#!/bin/bash
# Firebase Admin Service Account teljes frissítése
# Használat: ./update-firebase-admin.sh <service-account-file.json>

set -e

if [ -z "$1" ]; then
  echo "❌ Használat: ./update-firebase-admin.sh <service-account-file.json>"
  echo "   Például: ./update-firebase-admin.sh ~/Downloads/pharmacare-firebase-adminsdk.json"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "❌ Fájl nem található: $1"
  exit 1
fi

JSON_FILE="$1"

echo "🔧 Firebase Admin SDK frissítése..."
echo ""

# Extract values
CLIENT_EMAIL=$(cat "$JSON_FILE" | grep -o '"client_email": *"[^"]*"' | cut -d'"' -f4)
PRIVATE_KEY=$(cat "$JSON_FILE" | grep -o '"private_key": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$CLIENT_EMAIL" ] || [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Nem sikerült kiolvasni a credentials-t a JSON-ből!"
  exit 1
fi

echo "✅ Credentials beolvasva:"
echo "   Email: $CLIENT_EMAIL"
echo ""

# 1. Lokális .env.local frissítése
echo "📝 1. Lokális .env.local frissítése..."

if [ -f ".env.local" ]; then
  # Törlés régi értékek
  sed -i '' '/^FIREBASE_CLIENT_EMAIL=/d' .env.local
  sed -i '' '/^FIREBASE_PRIVATE_KEY=/d' .env.local
fi

# Új értékek hozzáadása
echo "" >> .env.local
echo "# Firebase Admin SDK (Updated: $(date))" >> .env.local
echo "FIREBASE_CLIENT_EMAIL=\"$CLIENT_EMAIL\"" >> .env.local
echo "FIREBASE_PRIVATE_KEY=\"$PRIVATE_KEY\"" >> .env.local

echo "   ✅ .env.local frissítve"
echo ""

# 2. Vercel környezeti változók frissítése
echo "📤 2. Vercel production környezeti változók frissítése..."
echo ""

# FIREBASE_CLIENT_EMAIL törlése és újra létrehozása
echo "   🔄 FIREBASE_CLIENT_EMAIL frissítése..."
echo "y" | vercel env rm FIREBASE_CLIENT_EMAIL production 2>/dev/null || true
echo "$CLIENT_EMAIL" | vercel env add FIREBASE_CLIENT_EMAIL production

echo "   🔄 FIREBASE_PRIVATE_KEY frissítése..."
echo "y" | vercel env rm FIREBASE_PRIVATE_KEY production 2>/dev/null || true
echo "$PRIVATE_KEY" | vercel env add FIREBASE_PRIVATE_KEY production

echo ""
echo "✅ Minden frissítve!"
echo ""
echo "📋 Következő lépések:"
echo "   1. Tesztelés lokálisan: npm run dev"
echo "   2. Deploy production-ra: vercel --prod"
echo ""
