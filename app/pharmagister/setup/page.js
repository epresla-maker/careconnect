"use client";
import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RouteGuard from '@/app/components/RouteGuard';
import { Loader2 } from 'lucide-react';

function PharmagisterSetupContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Közös mezők
    pharmagisterRole: role || '',
    pharmaProfileComplete: false,
    
    // Gyógyszertár specifikus
    pharmacyName: '',
    pharmacyAddress: '',
    pharmacyZipCode: '',
    pharmacyCity: '',
    pharmacyPhone: '',
    pharmacyEmail: '',
    nkkNumber: '', // NNK működési nyilvántartási szám
    
    // Helyettesítő specifikus (Gyógyszerész & Szakasszisztens)
    yearsOfExperience: '',
    softwareKnowledge: [],
    hourlyRate: '',
    bio: '',
    // Profilkép beállítások
    useMainPhoto: true,
    pharmaPhotoURL: '',
  });

  const softwareOptions = [
    'Phoenix',
    'Medea',
    'Pharma+',
    'Nexon',
    'Meditech',
    'Farmdata',
    'Egyéb'
  ];

  useEffect(() => {
    if (!role || !['pharmacy', 'pharmacist', 'assistant'].includes(role)) {
      router.push('/pharmagister');
    }
    
    if (userData?.pharmagisterRole) {
      router.push('/pharmagister');
    }
  }, [role, userData, router]);

  const handleSoftwareToggle = (software) => {
    setFormData(prev => ({
      ...prev,
      softwareKnowledge: prev.softwareKnowledge.includes(software)
        ? prev.softwareKnowledge.filter(s => s !== software)
        : [...prev.softwareKnowledge, software]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      
      const dataToUpdate = {
        pharmagisterRole: role,
        pharmaProfileComplete: false, // Admin jóváhagyásig false marad
        pharmaPendingApproval: true,
        updatedAt: new Date().toISOString(),
      };

      if (role === 'pharmacy') {
        // Gyógyszertár adatok
        if (!formData.pharmacyName || !formData.pharmacyAddress || !formData.pharmacyCity || !formData.nkkNumber) {
          alert('Kérlek töltsd ki az összes kötelező mezőt (beleértve az NNK működési nyilvántartási számot)!');
          setLoading(false);
          return;
        }
        
        Object.assign(dataToUpdate, {
          pharmacyName: formData.pharmacyName,
          pharmacyAddress: formData.pharmacyAddress,
          pharmacyZipCode: formData.pharmacyZipCode,
          pharmacyCity: formData.pharmacyCity,
          pharmacyPhone: formData.pharmacyPhone,
          pharmacyEmail: formData.pharmacyEmail,
          nkkNumber: formData.nkkNumber,
        });
      } else {
        // Helyettesítő adatok (Gyógyszerész vagy Szakasszisztens)
        if (!formData.yearsOfExperience || formData.softwareKnowledge.length === 0 || !formData.nkkNumber) {
          alert('Kérlek töltsd ki az összes kötelező mezőt (beleértve az NNK működési nyilvántartási számot)!');
          setLoading(false);
          return;
        }
        
        Object.assign(dataToUpdate, {
          pharmaYearsOfExperience: formData.yearsOfExperience,
          pharmaSoftwareKnowledge: formData.softwareKnowledge,
          pharmaHourlyRate: formData.hourlyRate || null,
          pharmaBio: formData.bio,
          pharmaUseMainPhoto: formData.useMainPhoto,
          pharmaPhotoURL: formData.useMainPhoto ? (userData?.photoURL || '') : (formData.pharmaPhotoURL || ''),
          nkkNumber: formData.nkkNumber,
        });
      }

      await updateDoc(userRef, dataToUpdate);
      
      // Jóváhagyási kérelem létrehozása
      await addDoc(collection(db, 'pharmagisterApprovals'), {
        userId: user.uid,
        userEmail: user.email,
        userName: userData?.displayName || user.displayName || 'Ismeretlen',
        role: role,
        nkkNumber: formData.nkkNumber,
        status: 'pending',
        submittedAt: serverTimestamp(),
        ...dataToUpdate
      });
      
      alert('✅ Profil sikeresen beküldve!\n\n⏳ A profil aktiválásához admin jóváhagyás szükséges az NNK működési nyilvántartási szám ellenőrzése után.\n\nÉrtesítést fogsz kapni, amikor a profilod jóváhagyásra került.');
      router.push('/pharmagister');
      
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Hiba történt a profil létrehozása során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <RouteGuard>
      <div className="min-h-screen bg-gray-50 py-8 pb-40">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-3xl font-bold text-[#111827] mb-2">
              Pharmagister Profil Beállítása
            </h1>
            <p className="text-[#6B7280]">
              {role === 'pharmacy' && '🏢 Gyógyszertár profil létrehozása'}
              {role === 'pharmacist' && '👨‍⚕️ Gyógyszerész profil létrehozása'}
              {role === 'assistant' && '🧑‍⚕️ Szakasszisztens profil létrehozása'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
            {role === 'pharmacy' ? (
              // Gyógyszertár űrlap
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#111827] mb-4">Gyógyszertár Adatok</h2>
                
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Gyógyszertár neve <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pharmacyName}
                    onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] mb-2">
                      Irányítószám
                    </label>
                    <input
                      type="text"
                      value={formData.pharmacyZipCode}
                      onChange={(e) => setFormData({ ...formData, pharmacyZipCode: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] mb-2">
                      Város <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.pharmacyCity}
                      onChange={(e) => setFormData({ ...formData, pharmacyCity: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Cím (utca, házszám) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.pharmacyAddress}
                    onChange={(e) => setFormData({ ...formData, pharmacyAddress: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] mb-2">
                      Telefonszám
                    </label>
                    <input
                      type="tel"
                      value={formData.pharmacyPhone}
                      onChange={(e) => setFormData({ ...formData, pharmacyPhone: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#6B7280] mb-2">
                      Email cím
                    </label>
                    <input
                      type="email"
                      value={formData.pharmacyEmail}
                      onChange={(e) => setFormData({ ...formData, pharmacyEmail: e.target.value })}
                      className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    NNK Működési Nyilvántartási Szám <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nkkNumber}
                    onChange={(e) => setFormData({ ...formData, nkkNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    placeholder="pl. 12345-6/7890/2024"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ Az NNK szám ellenőrzése után admin jóváhagyás szükséges a profil aktiválásához
                  </p>
                </div>
              </div>
            ) : (
              // Helyettesítő űrlap (Gyógyszerész & Szakasszisztens)
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-[#111827] mb-4">Szakmai Adatok</h2>
                
                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Tapasztalat (évek) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.yearsOfExperience}
                    onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    required
                  >
                    <option value="">Válassz...</option>
                    <option value="0-1">0-1 év</option>
                    <option value="1-3">1-3 év</option>
                    <option value="3-5">3-5 év</option>
                    <option value="5-10">5-10 év</option>
                    <option value="10+">10+ év</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Szoftverismeret <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {softwareOptions.map(software => (
                      <label key={software} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.softwareKnowledge.includes(software)}
                          onChange={() => handleSoftwareToggle(software)}
                          className="w-4 h-4 text-[#111827] border-gray-300 rounded focus:ring-[#6B7280]"
                        />
                        <span className="ml-2 text-[#111827]">{software}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Órabér (Ft) <span className="text-gray-400 text-xs">(opcionális)</span>
                  </label>
                  <input
                    type="number"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    min="0"
                    placeholder="Hagyd üresen ha nem szeretnéd megadni"
                  />
                </div>

                {/* Profilkép beállítások */}
                <div className="border border-[#E5E7EB] rounded-lg p-4 bg-gray-50">
                  <label className="block text-sm font-medium text-[#6B7280] mb-3">
                    Profilkép beállítása
                  </label>
                  
                  <div className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      id="useMainPhoto"
                      checked={formData.useMainPhoto}
                      onChange={(e) => setFormData({ ...formData, useMainPhoto: e.target.checked })}
                      className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <label htmlFor="useMainPhoto" className="ml-2 text-sm text-[#111827]">
                      Fő profilkép használata
                    </label>
                  </div>
                  
                  {formData.useMainPhoto ? (
                    <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                      {userData?.photoURL ? (
                        <img 
                          src={userData.photoURL} 
                          alt="Fő profilkép" 
                          className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
                          ?
                        </div>
                      )}
                      <span className="text-sm text-gray-600">A fő profilképed lesz használva a Pharmagister-en</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-500">Külön profilkép feltöltése a Pharmagister-hez:</p>
                      <input
                        type="url"
                        value={formData.pharmaPhotoURL}
                        onChange={(e) => setFormData({ ...formData, pharmaPhotoURL: e.target.value })}
                        className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                        placeholder="Kép URL (pl. Cloudinary link)"
                      />
                      {formData.pharmaPhotoURL && (
                        <div className="flex items-center gap-3">
                          <img 
                            src={formData.pharmaPhotoURL} 
                            alt="Pharmagister profilkép" 
                            className="w-12 h-12 rounded-full object-cover border-2 border-green-500"
                            onError={(e) => e.target.style.display = 'none'}
                          />
                          <span className="text-sm text-gray-600">Pharmagister profilkép előnézet</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    Bemutatkozás
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows="4"
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    placeholder="Írj néhány mondatot magadról..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#6B7280] mb-2">
                    NNK Működési Nyilvántartási Szám <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nkkNumber}
                    onChange={(e) => setFormData({ ...formData, nkkNumber: e.target.value })}
                    className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#6B7280]"
                    placeholder="pl. 12345-6/7890/2024"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    ⚠️ Az NNK szám ellenőrzése után admin jóváhagyás szükséges a profil aktiválásához
                  </p>
                </div>
              </div>
            )}

            <div className="mt-8 flex gap-4">
              <button
                type="button"
                onClick={() => router.push('/pharmagister')}
                className="flex-1 px-6 py-3 border border-[#E5E7EB] rounded-lg text-[#111827] font-medium hover:bg-[#F3F4F6] transition-colors"
              >
                Mégse
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#111827] text-white rounded-lg font-medium hover:bg-[#374151] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  'Profil létrehozása'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RouteGuard>
  );
}

// Wrapper with Suspense boundary
export default function PharmagisterSetupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Betöltés...</p>
        </div>
      </div>
    }>
      <PharmagisterSetupContent />
    </Suspense>
  );
}
