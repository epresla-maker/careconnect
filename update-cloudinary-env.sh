#!/bin/bash
echo "🔄 Cloudinary környezeti változók frissítése..."

# Töröljük a régit és hozzáadjuk az újat
yes | vercel env rm NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production 2>/dev/null
echo "dyoq9pcdx" | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production

yes | vercel env rm CLOUDINARY_API_KEY production 2>/dev/null  
echo "246389634682434" | vercel env add CLOUDINARY_API_KEY production

yes | vercel env rm CLOUDINARY_API_SECRET production 2>/dev/null
echo "6HgJPdxZFUORtP1cG7ZpdZnkIMY" | vercel env add CLOUDINARY_API_SECRET production

yes | vercel env rm CLOUDINARY_URL production 2>/dev/null
echo "cloudinary://246389634682434:6HgJPdxZFUORtP1cG7ZpdZnkIMY@dyoq9pcdx" | vercel env add CLOUDINARY_URL production

echo "✅ Cloudinary változók frissítve!"
