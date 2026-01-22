"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { 
  ArrowLeft, 
  User, 
  Bell, 
  Shield, 
  HelpCircle, 
  LogOut, 
  ChevronRight,
  Moon,
  Sun,
  Smartphone
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function SettingsPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const settingsSections = [
    {
      title: 'Fiók',
      items: [
        {
          icon: User,
          label: 'Profil szerkesztése',
          onClick: () => router.push('/profile/edit'),
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        }
      ]
    },
    {
      title: 'Alkalmazás',
      items: [
        {
          icon: Bell,
          label: 'Értesítések',
          onClick: () => router.push('/settings/notifications'),
          color: 'text-orange-600',
          bgColor: 'bg-orange-100'
        },
        {
          icon: theme === 'dark' ? Moon : Sun,
          label: 'Téma',
          value: theme === 'dark' ? 'Sötét' : theme === 'light' ? 'Világos' : 'Rendszer',
          onClick: () => {
            const themes = ['light', 'dark', 'system'];
            const currentIndex = themes.indexOf(theme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            setTheme(nextTheme);
          },
          color: 'text-purple-600',
          bgColor: 'bg-purple-100'
        }
      ]
    },
    {
      title: 'Támogatás',
      items: [
        {
          icon: HelpCircle,
          label: 'Súgó',
          onClick: () => router.push('/help'),
          color: 'text-teal-600',
          bgColor: 'bg-teal-100'
        },
        {
          icon: Shield,
          label: 'Adatvédelem',
          onClick: () => router.push('/privacy'),
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 ml-2">Beállítások</h1>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          {userData?.photoURL ? (
            <img 
              src={userData.photoURL} 
              alt={userData.displayName || 'Profil'}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <User className="w-8 h-8 text-emerald-600" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">
              {userData?.displayName || 'Felhasználó'}
            </h2>
            <p className="text-sm text-gray-500">{user.email}</p>
            {userData?.role && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full">
                {userData.role === 'pharmacist' ? 'Gyógyszerész' : userData.role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="mt-4 space-y-4 px-4">
        {settingsSections.map((section) => (
          <div key={section.title} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {section.title}
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${item.bgColor}`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="flex-1 text-left text-gray-900">{item.label}</span>
                  {item.value ? (
                    <span className="text-sm text-gray-500">{item.value}</span>
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-white rounded-xl shadow-sm px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors"
        >
          <div className="p-2 rounded-lg bg-red-100">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="flex-1 text-left text-red-600 font-medium">Kijelentkezés</span>
        </button>
      </div>

      {/* App Version */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400">CareConnect v1.0.0</p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kijelentkezés</h3>
            <p className="text-gray-600 mb-6">Biztosan ki szeretnél jelentkezni?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Mégse
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Kijelentkezés
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
