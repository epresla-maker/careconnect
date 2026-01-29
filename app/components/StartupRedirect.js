"use client";
import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

// Ez a komponens biztosítja, hogy az app mindig a főoldalon induljon
// amikor a felhasználó bezárja és újra megnyitja az alkalmazást
export default function StartupRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Csak egyszer fusson le az app indulásakor
    if (hasRedirected.current) return;
    hasRedirected.current = true;

    // Ne irányítsuk át ha login/register oldalon van (még nem lépett be)
    const publicRoutes = ['/login', '/register', '/verify-email', '/privacy'];
    if (publicRoutes.some(route => pathname?.startsWith(route))) {
      return;
    }

    // Ha nem a főoldalon van, irányítsuk át
    if (pathname !== '/') {
      router.replace('/');
    }
  }, []);

  return null;
}
