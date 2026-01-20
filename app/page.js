"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Ha nincs bejelentkezve, irányítsd a login oldalra
        router.push('/login');
      } else if (userData) {
        // Ha van userData, irányítsd a megfelelő modulhoz
        if (userData.pharmagisterRole) {
          router.push('/pharmagister');
        } else if (userData.tutomagisterRole) {
          router.push('/tutomagister');
        } else {
          // Ha egyik sincs, irányítsd a választó oldalra
          router.push('/valasztas');
        }
      }
    }
  }, [user, userData, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Betöltés...</p>
      </div>
    </div>
  );
}
