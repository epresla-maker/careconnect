"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Bell, X } from 'lucide-react';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationBanner() {
  const { user } = useAuth();
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    
    // Check if user dismissed the banner
    const dismissed = localStorage.getItem('push-banner-dismissed');
    if (dismissed) return;
    
    // Check if notifications are supported and not already granted
    if ('Notification' in window && Notification.permission === 'default') {
      // Check if already subscribed
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      // Only show banner if not subscribed
      if (!subscription) {
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        alert('Az értesítések engedélyezése szükséges.');
        setLoading(false);
        return;
      }
      
      // Get service worker
      const registration = await navigator.serviceWorker.ready;
      
      // Subscribe
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      
      // Save to server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          subscription: subscription.toJSON()
        })
      });
      
      if (response.ok) {
        console.log('✅ Push notifications enabled');
        setShowBanner(false);
        localStorage.setItem('push-banner-dismissed', 'true');
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (error) {
      console.error('Push subscription error:', error);
      alert('Hiba történt: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('push-banner-dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl shadow-2xl p-4 z-50 animate-slide-down">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="bg-white/20 p-2 rounded-lg">
          <Bell className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold mb-1">Értesítések bekapcsolása</h3>
          <p className="text-sm text-white/90 mb-3">
            Ne maradj le az új igényekről és üzenetekről!
          </p>
          <button
            onClick={handleEnable}
            disabled={loading}
            className="w-full bg-white text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Engedélyezés...' : 'Engedélyezem'}
          </button>
        </div>
      </div>
    </div>
  );
}
