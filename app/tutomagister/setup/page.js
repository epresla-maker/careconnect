"use client";
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import RouteGuard from '@/app/components/RouteGuard';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArrowLeft, Check } from 'lucide-react';

function TutomagisterSetupContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  
  const [selectedRole, setSelectedRole] = useState(roleParam || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Ha már be van állítva a szerepkör, visszairányítás
  useEffect(() => {
    if (userData?.tutomagisterRole) {
      router.push('/tutomagister');
    }
    // Csak Full Tag státuszú tagok és adminok regisztrálhatnak szakmai app-okba
    if (userData && userData.status !== 'Full Tag' && !userData.isAdmin) {
      alert('⚠️ Csak Full Tag státuszú tagok regisztrálhatnak szakmai alkalmazásokba!');
      router.push('/dashboard');
    }
  }, [userData, router]);

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      setError('Kérlek válassz szerepkört!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tutomagisterRole: selectedRole,
        tutoProfileComplete: false,
        updatedAt: new Date().toISOString()
      });

      // Átirányítás a Tutomagister oldalra
      router.push('/tutomagister');
    } catch (err) {
      console.error('Error setting Tutomagister role:', err);
      setError('Hiba történt a szerepkör beállítása során.');
      setLoading(false);
    }
  };

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 pb-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => router.push('/tutomagister')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Vissza</span>
            </button>
          </div>

          {/* Header */}
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-3xl shadow-2xl p-8 mb-6">
            <h1 className="text-4xl font-bold text-white mb-2">
              Tutomagister Beállítás ❤️
            </h1>
            <p className="text-pink-100 text-lg">Válaszd ki a szerepköröd</p>
          </div>

          {/* Role Selection */}
          <div className="bg-gray-800 rounded-3xl shadow-2xl border border-gray-700 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Ki vagy az idősellátás területén?</h2>
            
            {error && (
              <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-200">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Megbízó/Család */}
              <button
                onClick={() => setSelectedRole('client')}
                disabled={loading}
                className={`p-8 rounded-2xl border-2 transition-all group ${
                  selectedRole === 'client'
                    ? 'bg-rose-600 border-rose-500 shadow-xl scale-105'
                    : 'bg-gray-900 border-gray-700 hover:border-rose-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">👨‍👩‍👧</div>
                <h3 className="font-bold text-xl mb-2 text-white flex items-center justify-center gap-2">
                  Megbízó / Család
                  {selectedRole === 'client' && <Check className="w-6 h-6" />}
                </h3>
                <p className="text-sm text-gray-300">
                  Ápolót, gondozót keresek hozzátartozóm részére
                </p>
                <div className="mt-4 text-xs text-gray-400">
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>Igényt adhatok fel</li>
                    <li>Kereshetek ápolókat</li>
                    <li>Jelentkezéseket fogadhatok</li>
                  </ul>
                </div>
              </button>

              {/* Ápoló/Gondozó */}
              <button
                onClick={() => setSelectedRole('caregiver')}
                disabled={loading}
                className={`p-8 rounded-2xl border-2 transition-all group ${
                  selectedRole === 'caregiver'
                    ? 'bg-rose-600 border-rose-500 shadow-xl scale-105'
                    : 'bg-gray-900 border-gray-700 hover:border-rose-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🧑‍⚕️</div>
                <h3 className="font-bold text-xl mb-2 text-white flex items-center justify-center gap-2">
                  Ápoló / Gondozó
                  {selectedRole === 'caregiver' && <Check className="w-6 h-6" />}
                </h3>
                <p className="text-sm text-gray-300">
                  Ápolást, gondozást vállalok szakképzettséggel
                </p>
                <div className="mt-4 text-xs text-gray-400">
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>Igényekre jelentkezhetek</li>
                    <li>Profilt építhetek</li>
                    <li>Referenciákat gyűjthetek</li>
                  </ul>
                </div>
              </button>
            </div>

            {/* Info Box */}
            <div className="bg-rose-900/30 border-l-4 border-rose-500 p-6 mb-6 rounded-r-xl">
              <h4 className="font-bold text-white mb-2">💡 Fontos tudnivaló</h4>
              <p className="text-gray-300 text-sm">
                A szerepkör beállítása után részletes profilt tudsz majd kitölteni, amely segít 
                a megfelelő párosítás létrejöttében. Mindkét szerepkör esetében fontos a precíz 
                és őszinte adatszolgáltatás.
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={handleRoleSelect}
              disabled={!selectedRole || loading}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                !selectedRole || loading
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white shadow-lg hover:scale-105'
              }`}
            >
              {loading ? 'Beállítás...' : 'Szerepkör mentése és tovább'}
            </button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

// Wrapper with Suspense boundary
export default function TutomagisterSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Betöltés...</p>
        </div>
      </div>
    }>
      <TutomagisterSetupContent />
    </Suspense>
  );
}
