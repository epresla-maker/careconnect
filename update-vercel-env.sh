#!/bin/bash

echo "🔄 Vercel Environment Variables frissítése Pharmacare Firebase-re..."

# Firebase változók törlése és újra létrehozása
vars=(
  "NEXT_PUBLIC_FIREBASE_API_KEY:AIzaSyD4I5GQQPE_OX1lK3k0x5gYDGz6NIbUQbE"
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:pharmacare-dfa3c.firebaseapp.com"
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID:pharmacare-dfa3c"
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:pharmacare-dfa3c.firebasestorage.app"
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:701125119608"
  "NEXT_PUBLIC_FIREBASE_APP_ID:1:701125119608:web:56dc6533d75850506be78d"
)

for var in "${vars[@]}"; do
  key="${var%%:*}"
  value="${var#*:}"
  
  echo "📝 Frissítés: $key"
  
  # Törlés (yes automatikus választal)
  echo "y" | vercel env rm "$key" production 2>/dev/null
  
  # Újra létrehozás
  echo "$value" | vercel env add "$key" production
done

echo "✅ Környezeti változók frissítve! Most telepítsd: vercel --prod"
