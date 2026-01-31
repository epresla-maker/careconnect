"use client";
import { useEffect } from 'react';

export default function BadgeManager() {
  useEffect(() => {
    // Clear badge when app opens
    const clearAppBadge = async () => {
      if ('setAppBadge' in navigator) {
        try {
          await navigator.clearAppBadge();
          console.log('✅ Badge cleared on app open');
        } catch (error) {
          console.error('Badge clear error:', error);
        }
      }
    };

    clearAppBadge();

    // Also clear when window becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        clearAppBadge();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
