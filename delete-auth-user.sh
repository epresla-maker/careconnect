#!/bin/bash
# Firebase Auth user törlése manuálisan
# Használat: ./delete-auth-user.sh <email@example.com>

if [ -z "$1" ]; then
  echo "❌ Használat: ./delete-auth-user.sh <email@example.com>"
  exit 1
fi

EMAIL="$1"

echo "🔍 Keresem a felhasználót: $EMAIL"
echo ""

# Firebase CLI használata
firebase auth:export --project pharmacare-dfa3c users-temp.json 2>/dev/null

if [ -f "users-temp.json" ]; then
  USER_ID=$(cat users-temp.json | jq -r ".users[] | select(.email==\"$EMAIL\") | .localId" 2>/dev/null)
  rm users-temp.json
  
  if [ -n "$USER_ID" ]; then
    echo "✅ Felhasználó megtalálva: $USER_ID"
    echo ""
    echo "🗑️  Törlés Firebase Auth-ból..."
    
    echo "y" | firebase auth:delete --project pharmacare-dfa3c "$USER_ID"
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Felhasználó sikeresen törölve Firebase Auth-ból!"
      echo "   Most már újra lehet regisztrálni ezzel az email címmel."
    else
      echo "❌ Hiba történt a törlés során"
    fi
  else
    echo "⚠️  Nem található felhasználó ezzel az email címmel"
  fi
else
  echo "⚠️  Firebase CLI nincs telepítve vagy nincs jogosultság"
  echo "   Telepítsd: npm install -g firebase-tools"
  echo "   Login: firebase login"
fi
