"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Bell, MessageCircle, Calendar, CheckCircle, Loader2 } from 'lucide-react';
import RouteGuard from '@/app/components/RouteGuard';

export default function NotificationsSettingsPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const [saving, setSaving] = useState(false);
  
  const pharmaRole = userData?.pharmagisterRole;
  
  const [settings, setSettings] = useState({
    pushEnabled: true,
    emailEnabled: true,
    newMessage: true,
    newApplication: true,
    applicationStatus: true,
    newDemand: true,
    reminders: true,
  });

  useEffect(() => {
    if (userData?.notificationSettings) {
      setSettings(prev => ({
        ...prev,
        ...userData.notificationSettings
      }));
    }
  }, [userData]);

  const handleToggle = async (key) => {
    const newSettings = {
      ...settings,
      [key]: !settings[key]
    };
    setSettings(newSettings);
    
    // Save to Firestore
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationSettings: newSettings
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      // Revert on error
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const Toggle = ({ enabled, onToggle }) => (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        enabled 
          ? 'bg-[#6B46C1]' 
          : darkMode ? 'bg-gray-600' : 'bg-gray-300'
      }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
        enabled ? 'translate-x-5' : 'translate-x-0.5'
      }`} />
    </button>
  );

  const notificationTypes = [
    {
      key: 'newMessage',
      icon: MessageCircle,
      title: 'Új üzenetek',
      description: 'Értesítés új chat üzenetekről',
      color: 'text-blue-600',
      bgColor: darkMode ? 'bg-blue-900/30' : 'bg-blue-100',
      showFor: ['pharmacy', 'pharmacist', 'assistant', null] // mindenki
    },
    {
      key: 'newApplication',
      icon: CheckCircle,
      title: 'Új jelentkezések',
      description: 'Értesítés, ha valaki jelentkezik az igényedre',
      color: 'text-green-600',
      bgColor: darkMode ? 'bg-green-900/30' : 'bg-green-100',
      showFor: ['pharmacy'] // csak gyógyszertáraknak
    },
    {
      key: 'applicationStatus',
      icon: Bell,
      title: 'Jelentkezés státusza',
      description: 'Értesítés, ha elfogadták vagy elutasították a jelentkezésed',
      color: 'text-orange-600',
      bgColor: darkMode ? 'bg-orange-900/30' : 'bg-orange-100',
      showFor: ['pharmacist', 'assistant'] // csak helyettesítőknek
    },
    {
      key: 'newDemand',
      icon: Calendar,
      title: 'Új igények',
      description: 'Értesítés új helyettesítési igényekről a környéken',
      color: 'text-purple-600',
      bgColor: darkMode ? 'bg-purple-900/30' : 'bg-purple-100',
      showFor: ['pharmacist', 'assistant'] // csak helyettesítőknek
    },
    {
      key: 'reminders',
      icon: Bell,
      title: 'Emlékeztetők',
      description: 'Közelgő helyettesítések emlékeztetői',
      color: 'text-teal-600',
      bgColor: darkMode ? 'bg-teal-900/30' : 'bg-teal-100',
      showFor: ['pharmacy', 'pharmacist', 'assistant', null] // mindenki
    }
  ].filter(item => item.showFor.includes(pharmaRole));

  return (
    <RouteGuard>
      <div className={`min-h-screen pb-24 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="flex items-center px-4 py-3">
            <button
              onClick={() => router.back()}
              className={`p-2 -ml-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} rounded-full transition-colors`}
            >
              <ArrowLeft className={`w-5 h-5 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`} />
            </button>
            <h1 className={`text-lg font-semibold ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Értesítések</h1>
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-auto text-[#6B46C1]" />}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Global Settings */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm overflow-hidden`}>
            <div className={`px-4 py-2 ${darkMode ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-100'} border-b`}>
              <h3 className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                Általános
              </h3>
            </div>
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                    <Bell className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Push értesítések</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Értesítések a telefonra</p>
                  </div>
                </div>
                <Toggle enabled={settings.pushEnabled} onToggle={() => handleToggle('pushEnabled')} />
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'}`}>
                    <MessageCircle className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>E-mail értesítések</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Értesítések e-mailben</p>
                  </div>
                </div>
                <Toggle enabled={settings.emailEnabled} onToggle={() => handleToggle('emailEnabled')} />
              </div>
            </div>
          </div>

          {/* Notification Types */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm overflow-hidden`}>
            <div className={`px-4 py-2 ${darkMode ? 'bg-gray-700/50 border-gray-700' : 'bg-gray-50 border-gray-100'} border-b`}>
              <h3 className={`text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                Értesítés típusok
              </h3>
            </div>
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
              {notificationTypes.map((item) => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${item.bgColor}`}>
                      <item.icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    <div>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.title}</p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
                    </div>
                  </div>
                  <Toggle enabled={settings[item.key]} onToggle={() => handleToggle(item.key)} />
                </div>
              ))}
            </div>
          </div>

          {/* Info */}
          <div className={`${darkMode ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-purple-200'} border rounded-xl p-4`}>
            <p className={`text-sm ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              💡 A push értesítések működéséhez engedélyezd az értesítéseket a böngésző beállításaiban is.
            </p>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
