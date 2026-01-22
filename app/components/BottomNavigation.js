"use client";
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { MessageCircle, Bell, Settings, LayoutGrid, Home } from 'lucide-react';
import { useDashboardBadges } from '@/hooks/useDashboardBadges';

export default function BottomNavigation({ isVisible = true }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData, loading } = useAuth();
  const { darkMode } = useTheme();
  const badges = useDashboardBadges(user, userData);

  // Ne jelenjen meg, ha nincs bejelentkezve a felhasználó vagy még tölt
  if (!user || loading) {
    return null;
  }

  const navItems = [
    {
      icon: Home,
      label: 'Főoldal',
      path: '/'
    },
    {
      icon: MessageCircle,
      label: 'Üzenetek',
      path: '/chat',
      badge: badges.messages
    },
    {
      icon: Bell,
      label: 'Értesítések',
      path: '/notifications',
      badge: badges.notifications
    },
    {
      icon: LayoutGrid,
      label: 'Pharmagister',
      path: '/pharmagister',
      isLarge: true
    },
    {
      icon: Settings,
      label: 'Beállítások',
      path: '/settings'
    }
  ];

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 border-t transition-transform duration-300 z-50 ${
        darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-[#E5E7EB]'
      } ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}
    >
      <div className="grid grid-cols-5 gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors touch-manipulation ${
                isActive
                  ? 'text-emerald-600'
                  : darkMode 
                    ? 'text-gray-400 active:bg-gray-800' 
                    : 'text-[#6B7280] active:bg-[#F3F4F6]'
              }`}
            >
              {item.badge > 0 && (
                <div className="absolute top-1 right-1/4 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {item.badge}
                </div>
              )}
              
              {item.showAvatar && userData?.photoURL ? (
                <img 
                  src={userData.photoURL} 
                  alt="Profil"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <Icon 
                  className={item.isLarge ? "w-8 h-8" : "w-6 h-6"} 
                  strokeWidth={2}
                />
              )}
              
              <span className={`mt-1 font-medium ${item.isLarge ? 'text-[0.65rem]' : 'text-[0.5625rem]'}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
