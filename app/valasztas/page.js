"use client";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/context/ToastContext';
import RouteGuard from '@/app/components/RouteGuard';

export default function ValasztasPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const handleSelection = async (module) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (module === 'pharmagister') {
        await updateDoc(userRef, {
          pharmagisterRole: 'pharmacy', // Default role
        });
        showToast('Pharmagister kiválasztva!', 'success');
        router.push('/pharmagister/setup');
      } else if (module === 'tutomagister') {
        await updateDoc(userRef, {
          tutomagisterRole: 'client', // Default role
        });
        showToast('Tutomagister kiválasztva!', 'success');
        router.push('/tutomagister/setup');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      showToast('Hiba történt!', 'error');
    }
  };

  return (
    <RouteGuard>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 p-4">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Válassz szolgáltatást
            </h1>
            <p className="text-gray-600">
              Melyik platformot szeretnéd használni?
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pharmagister */}
            <button
              onClick={() => handleSelection('pharmagister')}
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <div className="text-6xl mb-4">💊</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Pharmagister
              </h2>
              <p className="text-gray-600 mb-4">
                Gyógyszertári helyettesítési platform
              </p>
              <ul className="text-left text-sm text-gray-500 space-y-2">
                <li>✓ Helyettesítési igények feladása</li>
                <li>✓ Gyógyszerész/szakasszisztens keresése</li>
                <li>✓ NNK validáció</li>
                <li>✓ Értékelési rendszer</li>
              </ul>
            </button>

            {/* Tutomagister */}
            <button
              onClick={() => handleSelection('tutomagister')}
              className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1"
            >
              <div className="text-6xl mb-4">❤️</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Tutomagister
              </h2>
              <p className="text-gray-600 mb-4">
                Idősgondozási és ápolási platform
              </p>
              <ul className="text-left text-sm text-gray-500 space-y-2">
                <li>✓ Ápoló/gondozó keresése</li>
                <li>✓ Megbízások feladása</li>
                <li>✓ NNK validáció</li>
                <li>✓ Tapasztalatok megosztása</li>
              </ul>
            </button>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
