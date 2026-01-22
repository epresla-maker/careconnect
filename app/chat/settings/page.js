"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import ChatBottomNavigation from "@/app/components/ChatBottomNavigation";

export default function ChatSettingsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [settings, setSettings] = useState({
    onlineStatus: true,
    darkMode: false,
    notifications: true,
    readReceipts: true,
    mediaAutoDownload: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadSettings();
  }, [user]);

  // Apply dark mode to body
  useEffect(() => {
    if (settings.darkMode) {
      document.body.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '';
    }
    
    // Cleanup when leaving page
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [settings.darkMode]);

  const loadSettings = async () => {
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSettings({
          onlineStatus: data.chatSettings?.onlineStatus ?? true,
          darkMode: data.chatSettings?.darkMode ?? false,
          notifications: data.chatSettings?.notifications ?? true,
          readReceipts: data.chatSettings?.readReceipts ?? true,
          mediaAutoDownload: data.chatSettings?.mediaAutoDownload ?? true,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key, value) => {
    try {
      setSettings(prev => ({ ...prev, [key]: value }));
      await updateDoc(doc(db, "users", user.uid), {
        [`chatSettings.${key}`]: value
      });
      
      // Show success feedback
      const settingNames = {
        onlineStatus: '"Elérhető" állapot',
        darkMode: 'Sötét mód',
        notifications: 'Értesítések',
        readReceipts: 'Olvasási visszaigazolás',
        mediaAutoDownload: 'Média automatikus letöltés'
      };
      
      console.log(`✅ ${settingNames[key]} ${value ? 'bekapcsolva' : 'kikapcsolva'}`);
    } catch (error) {
      console.error("Error updating setting:", error);
      // Revert on error
      setSettings(prev => ({ ...prev, [key]: !value }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center pb-40">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-40 ${settings.darkMode ? 'bg-black' : 'bg-gray-100'} ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${settings.darkMode ? 'bg-black border-gray-800' : 'bg-white border-gray-300'} border-b`}>
        <div className="flex items-center gap-4 p-4">
          <button
            onClick={() => router.back()}
            className={`${settings.darkMode ? 'text-white hover:text-cyan-400' : 'text-gray-900 hover:text-cyan-600'} transition-colors`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-xl font-bold">Beállítások</h1>
        </div>
      </div>

      {/* Profile Section - Simple, non-clickable */}
      <div className="flex items-center gap-4 px-4 py-6 border-b border-gray-800 pointer-events-none select-none">
        {userData?.photoURL ? (
          <Image
            src={userData.photoURL}
            alt={userData.displayName || "Profil"}
            width={64}
            height={64}
            className="rounded-full"
            unoptimized
          />
        ) : (
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
            <span className="text-2xl text-gray-400">
              {userData?.displayName?.charAt(0) || "?"}
            </span>
          </div>
        )}
        <div>
          <h2 className="text-xl font-semibold">{userData?.displayName || "Felhasználó"}</h2>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="px-4 space-y-4 mt-4">
        {/* Online Status */}
        <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm`}>
          <button
            onClick={() => updateSetting('onlineStatus', !settings.onlineStatus)}
            className={`w-full flex items-center gap-4 p-4 ${settings.darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
          >
            <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-green-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>"Élrhető" állapot</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{settings.onlineStatus ? 'Be' : 'Ki'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>

        {/* Dark Mode */}
        <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm`}>
          <button
            onClick={() => updateSetting('darkMode', !settings.darkMode)}
            className={`w-full flex items-center gap-4 p-4 ${settings.darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
          >
            <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-purple-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Sötét mód</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{settings.darkMode ? 'Be' : 'Ki'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>

        {/* Notifications */}
        <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm`}>
          <button
            onClick={() => updateSetting('notifications', !settings.notifications)}
            className={`w-full flex items-center gap-4 p-4 ${settings.darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
          >
            <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-yellow-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Értesítések és hangok</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{settings.notifications ? 'Be' : 'Ki'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>

        {/* Read Receipts */}
        <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm`}>
          <button
            onClick={() => updateSetting('readReceipts', !settings.readReceipts)}
            className={`w-full flex items-center gap-4 p-4 ${settings.darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
          >
            <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-blue-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Olvasási visszaigazolás</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{settings.readReceipts ? 'Be' : 'Ki'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>

        {/* Media Auto Download */}
        <div className={`${settings.darkMode ? 'bg-gray-900' : 'bg-white'} rounded-2xl overflow-hidden shadow-sm`}>
          <button
            onClick={() => updateSetting('mediaAutoDownload', !settings.mediaAutoDownload)}
            className={`w-full flex items-center gap-4 p-4 ${settings.darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} transition-colors`}
          >
            <div className={`${settings.darkMode ? 'bg-gray-800' : 'bg-gray-100'} p-2 rounded-full`}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-pink-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold ${settings.darkMode ? 'text-white' : 'text-gray-900'}`}>Média automatikus letöltése</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{settings.mediaAutoDownload ? 'Be' : 'Ki'}</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        </div>
      </div>

      {/* Bottom padding for safe area */}
      <div className="h-20"></div>

      {/* Chat specifikus bottom navigation */}
      <ChatBottomNavigation 
        isVisible={true} 
        onMenuOpen={() => router.push('/chat')} 
      />
    </div>
  );
}
