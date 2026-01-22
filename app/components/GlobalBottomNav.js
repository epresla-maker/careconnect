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

  // Chat oldalakon (lista és room) ne jelenjen meg - a chat lista saját navbart használ
  const isChatPage = pathname?.startsWith('/chat');

  useEffect(() => {
    if (!user || loading) return;
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < lastScrollY) {
        setShowBottomNav(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowBottomNav(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, user, loading]);

  // Ne renderelj semmit ha nincs user vagy chat oldalon vagyunk
  if (!user || loading || isChatPage) {
    return null;
  }

  return <BottomNavigation isVisible={showBottomNav} />;
}
