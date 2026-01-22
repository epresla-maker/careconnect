"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import RouteGuard from './components/RouteGuard';
import ModernServiceFeed from './components/ModernServiceFeed';
import { LayoutGrid } from 'lucide-react';

export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [showMiClyps, setShowMiClyps] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY < 50) {
        setShowMiClyps(true);
      } else {
        setShowMiClyps(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-[40px]">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10 shadow-sm">
          <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
            {/* Logo with custom animations */}
            <div className="flex items-center gap-1 text-2xl font-bold">
              <span className="inline-block text-green-600 animate-float-0">C</span>
              <span className="inline-block text-green-600 animate-float-1">a</span>
              <span className="inline-block text-green-600 animate-float-2">r</span>
              <span className="inline-block text-green-600 animate-float-3">e</span>
              <span className="inline-block text-blue-600 animate-float-4">C</span>
              <span className="inline-block text-blue-600 animate-float-5">o</span>
              <span className="inline-block text-blue-600 animate-float-6">n</span>
              <span className="inline-block text-blue-600 animate-float-7">n</span>
              <span className="inline-block text-blue-600 animate-float-8">e</span>
              <span className="inline-block text-blue-600 animate-float-9">c</span>
              <span className="inline-block text-blue-600 animate-float-10">t</span>
            </div>

            {/* Profile Button */}
            <button
              onClick={() => router.push('/notifications')}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 hover:border-green-600 transition-colors"
            >
              {userData?.photoURL ? (
                <img 
                  src={userData.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-green-500 flex items-center justify-center text-white font-bold">
                  {userData?.displayName?.[0] || 'P'}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="max-w-xl mx-auto">
          <ModernServiceFeed />
        </div>
      </div>
    </RouteGuard>
  );
}
