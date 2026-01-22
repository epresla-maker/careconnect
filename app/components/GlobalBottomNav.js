"use client";
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import BottomNavigation from './BottomNavigation';

export default function GlobalBottomNav() {
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // Ne jelenjen meg, ha nincs bejelentkezve a felhasználó vagy még tölt
  if (!user || loading) {
    return null;
  }

  // Chat oldalakon (lista és room) ne jelenjen meg - a chat lista saját navbart használ
  const isChatPage = pathname?.startsWith('/chat');

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY) {
        // Lefelé húzás - mutasd a navigációt
        setShowBottomNav(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Felfelé görgetés - rejtsd el a navigációt
        setShowBottomNav(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Első betöltéskor is ellenőrizzük
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Ha chat oldalon vagyunk, ne jelenjen meg (a chat oldal saját navbart használ)
  if (isChatPage) {
    return null;
  }

  return (
    <>
      {/* Fő bottom navigation */}
      <BottomNavigation isVisible={showBottomNav} />
    </>
  );
}
