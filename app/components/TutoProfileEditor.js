"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Save, X, Plus } from 'lucide-react';

export default function TutoProfileEditor() {
  const { user, userData } = useAuth();
  const tutoRole = userData?.tutomagisterRole;
  
  // Megbízó/Család mezők
  const [familyName, setFamilyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [careRecipientAge, setCareRecipientAge] = useState('');
  const [careRecipientCondition, setCareRecipientCondition] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState([]);
  
  // Ápoló/Gondozó mezők
  const [caregiverPhone, setCaregiverPhone] = useState('');
  const [caregiverCity, setCaregiverCity] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [nkkNumber, setNkkNumber] = useState('');
  
  // Speciális ápolói mezők
  const [szakkepesitesek, setSzakkepesitesek] = useState([]);
  const [specialisEllatas, setSpecialisEllatas] = useState([]);
  const [elvarrtMunkarend, setElvarrtMunkarend] = useState([]);
  const [kiegesitoKeszsegek, setKiegesitoKeszsegek] = useState([]);
  
  // Custom/Egyéb mezők
  const [showCustomSzakkepe, setShowCustomSzakkepe] = useState(false);
  const [customSzakkepe, setCustomSzakkepe] = useState('');
  const [showCustomEllatas, setShowCustomEllatas] = useState(false);
  const [customEllatas, setCustomEllatas] = useState('');
  const [showCustomMunkarend, setShowCustomMunkarend] = useState(false);
  const [customMunkarend, setCustomMunkarend] = useState('');
  const [showCustomKeszseg, setShowCustomKeszseg] = useState(false);
  const [customKeszseg, setCustomKeszseg] = useState('');
  
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [nkkApproved, setNkkApproved] = useState(false);
  const [originalNkkNumber, setOriginalNkkNumber] = useState('');

  // Betöltés userData-ból
  useEffect(() => {
    if (!userData) return;

    if (tutoRole === 'client') {
      setFamilyName(userData.tutoFamilyName || '');
      setContactPerson(userData.tutoContactPerson || userData.displayName || '');
      setPhoneNumber(userData.tutoPhoneNumber || '');
      setCity(userData.tutoCity || '');
      setAddress(userData.tutoAddress || '');
      setCareRecipientAge(userData.tutoCareRecipientAge || '');
      setCareRecipientCondition(userData.tutoCareRecipientCondition || '');
      setSpecialNeeds(userData.tutoSpecialNeeds || []);
      setBio(userData.tutoBio || '');
    } else if (tutoRole === 'caregiver') {
      setCaregiverPhone(userData.tutoPhoneNumber || '');
      setCaregiverCity(userData.tutoCity || '');
      setYearsOfExperience(userData.tutoYearsOfExperience || '');
      setHourlyRate(userData.tutoHourlyRate || '');
      setNkkNumber(userData.tutoNkkNumber || '');
      setOriginalNkkNumber(userData.tutoNkkNumber || '');
      setNkkApproved(userData.tutoNkkApproved || false);
      setSzakkepesitesek(userData.tutoSzakkepesitesek || []);
      setSpecialisEllatas(userData.tutoSpecialisEllatas || []);
      setElvarrtMunkarend(userData.tutoElvarrtMunkarend || []);
      setKiegesitoKeszsegek(userData.tutoKiegesitoKeszsegek || []);
      setBio(userData.tutoBio || '');
    }
  }, [userData, tutoRole]);

  const handleSave = async () => {
    setLoading(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (tutoRole === 'client') {
        await updateDoc(userRef, {
          tutoFamilyName: familyName,
          tutoContactPerson: contactPerson,
          tutoPhoneNumber: phoneNumber,
          tutoCity: city,
          tutoAddress: address,
          tutoCareRecipientAge: careRecipientAge,
          tutoCareRecipientCondition: careRecipientCondition,
          tutoSpecialNeeds: specialNeeds,
          tutoBio: bio,
          tutoProfileComplete: true,
          updatedAt: new Date().toISOString()
        });
      } else if (tutoRole === 'caregiver') {
        // NNK szám validáció
        if (!nkkNumber || nkkNumber.trim() === '') {
          setErrorMessage('❌ Az NNK működési nyilvántartási szám megadása kötelező!');
          setLoading(false);
          return;
        }

        const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

        // Ellenőrizzük, hogy változott-e az NNK szám
        const nkkChanged = originalNkkNumber !== nkkNumber;
        const needsApproval = nkkChanged && !nkkApproved;

        const updateData = {
          tutoPhoneNumber: caregiverPhone,
          tutoCity: caregiverCity,
          tutoYearsOfExperience: yearsOfExperience,
          tutoHourlyRate: hourlyRate,
          tutoNkkNumber: nkkNumber,
          tutoSzakkepesitesek: szakkepesitesek,
          tutoSpecialisEllatas: specialisEllatas,
          tutoElvarrtMunkarend: elvarrtMunkarend,
          tutoKiegesitoKeszsegek: kiegesitoKeszsegek,
          tutoBio: bio,
          updatedAt: new Date().toISOString()
        };

        // Ha NNK szám változott és nincs jóváhagyva, akkor pending státusz
        if (needsApproval) {
          updateData.tutoProfileComplete = false;
          updateData.tutoPendingApproval = true;
          updateData.tutoNkkApproved = false;
        } else if (nkkApproved) {
          // Ha NNK már jóváhagyott és nem változott, profil complete marad
          updateData.tutoProfileComplete = true;
          updateData.tutoPendingApproval = false;
        }

        console.log('📝 Mentendő adatok:', updateData);
        await updateDoc(userRef, updateData);
        console.log('✅ Firestore updateDoc sikeres');

        // Jóváhagyási kérelem létrehozása CSAK ha NNK változott
        if (needsApproval) {
          console.log('📋 NNK jóváhagyási kérelem létrehozása...');
          await addDoc(collection(db, 'tutomagisterApprovals'), {
            userId: user.uid,
            userEmail: user.email,
            userName: userData.displayName || user.displayName || 'Ismeretlen',
            role: 'caregiver',
            nkkNumber: nkkNumber,
            status: 'pending',
            submittedAt: serverTimestamp()
          });
          console.log('✅ Jóváhagyási kérelem létrehozva');
        } else {
          console.log('ℹ️ NNK nem változott, nincs új jóváhagyási kérelem');
        }
      }

      console.log('✅ Profil mentés befejezve');
      setSuccessMessage('✅ Profilod sikeresen mentve!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('❌ Error saving Tutomagister profile:', err);
      console.error('Error details:', err.message, err.code);
      setErrorMessage(`❌ Hiba történt a mentés során: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Array kezelő függvények
  const addItem = (array, setArray, value) => {
    if (value && !array.includes(value)) {
      setArray([...array, value]);
    }
  };

  const removeItem = (array, setArray, value) => {
    setArray(array.filter(item => item !== value));
  };

  // Opciók a különböző mezőkhöz
  const szakkepeOpts = [
    'Ápoló - OKJ 54',
    'Szociális gondozó és ápoló - OKJ 55',
    'Szociális asszisztens - OKJ 54',
    'Mentőápoló',
    'Védőnő',
    'Szociális munkás',
    'Gyógypedagógus',
    'Egyéb egészségügyi végzettség'
  ];

  const specialisEllatOpts = [
    'Demenciával élők gondozása',
    'Ágyban fekvő betegek',
    'Stroke utáni rehabilitáció',
    'Parkinson-kór',
    'Diabetes kezelés',
    'Szívbetegségek',
    'Terminális ellátás (hospice)',
    'Inkontinencia kezelés',
    'PEG szonda kezelés',
    'Légzésterápia',
    'Sebkezelés'
  ];

  const munkarendOpts = [
    '24 órás bentlakás',
    'Heti 5 nap bentlakás',
    '12 órás váltott műszak',
    'Nappali műszak (8-20h)',
    'Éjszakai műszak (20-8h)',
    'Hétvégi műszak',
    'Eseti kisegítés',
    'Óránkénti megbízás'
  ];

  const kiegeszKeOpts = [
    'B kategóriás jogosítvány',
    'Főzési készség',
    'Angol nyelvtudás',
    'Német nyelvtudás',
    'Számítógép kezelés',
    'Gyógyszer adagolás',
    'Injekciózás',
    'Vérnyomásmérés',
    'Vércukorszint mérés',
    'Gyógytorna alapismeretek'
  ];

  // Megbízó/Család űrlap
  if (tutoRole === 'client') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Megbízói Profil Szerkesztése 👨‍👩‍👧</h2>

        {successMessage && (
          <div className="p-4 bg-green-900/30 border border-green-500 rounded-xl text-green-200">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Alapadatok */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Alapadatok</h3>
          
          <div>
            <label className="block text-rose-300 font-semibold mb-2">Család/Megbízó neve</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="pl. Nagy család"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Kapcsolattartó neve</label>
            <input
              type="text"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="pl. Nagy Péter"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Telefonszám</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+36 30 123 4567"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-rose-300 font-semibold mb-2">Város</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="pl. Budapest"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-rose-300 font-semibold mb-2">Cím</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="pl. Fő utca 1."
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Gondozott adatai */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Gondozott adatai</h3>
          
          <div>
            <label className="block text-rose-300 font-semibold mb-2">Gondozott életkora</label>
            <input
              type="number"
              value={careRecipientAge}
              onChange={(e) => setCareRecipientAge(e.target.value)}
              placeholder="pl. 78"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Egészségi állapot leírása</label>
            <textarea
              value={careRecipientCondition}
              onChange={(e) => setCareRecipientCondition(e.target.value)}
              placeholder="Rövid leírás az egészségi állapotról, betegségekről..."
              rows={4}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Speciális ellátási igények</label>
            <div className="flex gap-2 mb-3 flex-wrap">
              {specialNeeds.map((need) => (
                <span
                  key={need}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/50 text-white rounded-lg text-sm"
                >
                  {need}
                  <button
                    onClick={() => removeItem(specialNeeds, setSpecialNeeds, need)}
                    className="hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <select
              onChange={(e) => {
                addItem(specialNeeds, setSpecialNeeds, e.target.value);
                e.target.value = '';
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Válassz egy ellátási igényt --</option>
              {specialisEllatOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">További információk</h3>
          
          <div>
            <label className="block text-rose-300 font-semibold mb-2">Rövid bemutatkozás / üzenet ápolóknak</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Bemutatkozás, elvárások, lakókörnyezet, családi háttér..."
              rows={5}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Mentés gomb */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Mentés...' : 'Profil mentése'}
        </button>
      </div>
    );
  }

  // Ápoló/Gondozó űrlap
  if (tutoRole === 'caregiver') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Ápolói/Gondozói Profil Szerkesztése 🧑‍⚕️</h2>

        {successMessage && (
          <div className="p-4 bg-green-900/30 border border-green-500 rounded-xl text-green-200">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Alapadatok */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Alapadatok</h3>
          
          <div>
            <label className="block text-rose-300 font-semibold mb-2">Név</label>
            <div className="w-full p-3 bg-gray-800 border border-gray-600 rounded-xl text-white flex items-center justify-between">
              <span>{userData?.displayName || 'Nincs megadva'}</span>
              <span className="text-xs text-gray-400 italic">Közösségi profilból</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">💡 A nevedet a Settings oldalon módosíthatod</p>
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Telefonszám</label>
            <input
              type="tel"
              value={caregiverPhone}
              onChange={(e) => setCaregiverPhone(e.target.value)}
              placeholder="+36 30 123 4567"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">Város</label>
            <input
              type="text"
              value={caregiverCity}
              onChange={(e) => setCaregiverCity(e.target.value)}
              placeholder="Jelenlegi tartózkodási helyed"
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-rose-300 font-semibold mb-2">Tapasztalat (év)</label>
              <input
                type="number"
                value={yearsOfExperience}
                onChange={(e) => setYearsOfExperience(e.target.value)}
                placeholder="pl. 5"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-rose-300 font-semibold mb-2">Óradíj (Ft/óra)</label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                placeholder="pl. 2500"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-rose-300 font-semibold mb-2">
              NNK Működési Nyilvántartási Szám <span className="text-red-400">*</span>
            </label>
            {nkkApproved ? (
              <>
                <div className="w-full p-3 bg-gray-800 border border-green-600 rounded-xl text-white flex items-center justify-between">
                  <span>{nkkNumber}</span>
                  <span className="text-xs text-green-400 flex items-center gap-1">
                    <span>✅</span>
                    <span>Jóváhagyva</span>
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  🔒 Az NNK szám jóváhagyva, nem módosítható
                </p>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={nkkNumber}
                  onChange={(e) => setNkkNumber(e.target.value)}
                  placeholder="pl. 12345-6/7890/2024"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  required
                />
                <p className="mt-2 text-xs text-gray-400">
                  ⚠️ Az NNK szám ellenőrzése után admin jóváhagyás szükséges a profil aktiválásához
                </p>
              </>
            )}
          </div>
        </div>

        {/* Szakképesítések */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Szakképesítések</h3>
          
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {szakkepesitesek.map((szk) => (
                <span
                  key={szk}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/50 text-white rounded-lg text-sm"
                >
                  {szk}
                  <button
                    onClick={() => removeItem(szakkepesitesek, setSzakkepesitesek, szk)}
                    className="hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value === '__CUSTOM__') {
                  setShowCustomSzakkepe(true);
                } else {
                  addItem(szakkepesitesek, setSzakkepesitesek, e.target.value);
                }
                e.target.value = '';
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Válassz szakképesítést --</option>
              {szakkepeOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__CUSTOM__">✏️ Egyéb (saját megadása)</option>
            </select>
            
            {showCustomSzakkepe && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customSzakkepe}
                  onChange={(e) => setCustomSzakkepe(e.target.value)}
                  placeholder="Add meg a saját szakképesítést..."
                  className="flex-1 p-3 bg-gray-700 border border-rose-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (customSzakkepe.trim()) {
                      addItem(szakkepesitesek, setSzakkepesitesek, customSzakkepe.trim());
                      setCustomSzakkepe('');
                      setShowCustomSzakkepe(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCustomSzakkepe('');
                    setShowCustomSzakkepe(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Speciális ellátás */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Speciális ellátási formák</h3>
          
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {specialisEllatas.map((ell) => (
                <span
                  key={ell}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/50 text-white rounded-lg text-sm"
                >
                  {ell}
                  <button
                    onClick={() => removeItem(specialisEllatas, setSpecialisEllatas, ell)}
                    className="hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value === '__CUSTOM__') {
                  setShowCustomEllatas(true);
                } else {
                  addItem(specialisEllatas, setSpecialisEllatas, e.target.value);
                }
                e.target.value = '';
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Válassz ellátási formát --</option>
              {specialisEllatOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__CUSTOM__">✏️ Egyéb (saját megadása)</option>
            </select>
            
            {showCustomEllatas && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customEllatas}
                  onChange={(e) => setCustomEllatas(e.target.value)}
                  placeholder="Add meg a saját ellátási formát..."
                  className="flex-1 p-3 bg-gray-700 border border-rose-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (customEllatas.trim()) {
                      addItem(specialisEllatas, setSpecialisEllatas, customEllatas.trim());
                      setCustomEllatas('');
                      setShowCustomEllatas(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCustomEllatas('');
                    setShowCustomEllatas(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Elvárt munkarend */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Vállalható munkarend</h3>
          
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {elvarrtMunkarend.map((mr) => (
                <span
                  key={mr}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/50 text-white rounded-lg text-sm"
                >
                  {mr}
                  <button
                    onClick={() => removeItem(elvarrtMunkarend, setElvarrtMunkarend, mr)}
                    className="hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value === '__CUSTOM__') {
                  setShowCustomMunkarend(true);
                } else {
                  addItem(elvarrtMunkarend, setElvarrtMunkarend, e.target.value);
                }
                e.target.value = '';
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Válassz munkarendet --</option>
              {munkarendOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__CUSTOM__">✏️ Egyéb (saját megadása)</option>
            </select>
            
            {showCustomMunkarend && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customMunkarend}
                  onChange={(e) => setCustomMunkarend(e.target.value)}
                  placeholder="Add meg a saját munkarendet..."
                  className="flex-1 p-3 bg-gray-700 border border-rose-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (customMunkarend.trim()) {
                      addItem(elvarrtMunkarend, setElvarrtMunkarend, customMunkarend.trim());
                      setCustomMunkarend('');
                      setShowCustomMunkarend(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCustomMunkarend('');
                    setShowCustomMunkarend(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Kiegészítő készségek */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Kiegészítő készségek</h3>
          
          <div>
            <div className="flex gap-2 mb-3 flex-wrap">
              {kiegesitoKeszsegek.map((kk) => (
                <span
                  key={kk}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-rose-900/50 text-white rounded-lg text-sm"
                >
                  {kk}
                  <button
                    onClick={() => removeItem(kiegesitoKeszsegek, setKiegesitoKeszsegek, kk)}
                    className="hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              ))}
            </div>
            <select
              onChange={(e) => {
                if (e.target.value === '__CUSTOM__') {
                  setShowCustomKeszseg(true);
                } else {
                  addItem(kiegesitoKeszsegek, setKiegesitoKeszsegek, e.target.value);
                }
                e.target.value = '';
              }}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">-- Válassz készséget --</option>
              {kiegeszKeOpts.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="__CUSTOM__">✏️ Egyéb (saját megadása)</option>
            </select>
            
            {showCustomKeszseg && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={customKeszseg}
                  onChange={(e) => setCustomKeszseg(e.target.value)}
                  placeholder="Add meg a saját készséget..."
                  className="flex-1 p-3 bg-gray-700 border border-rose-500 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (customKeszseg.trim()) {
                      addItem(kiegesitoKeszsegek, setKiegesitoKeszsegek, customKeszseg.trim());
                      setCustomKeszseg('');
                      setShowCustomKeszseg(false);
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={() => {
                    setCustomKeszseg('');
                    setShowCustomKeszseg(false);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 space-y-4">
          <h3 className="text-xl font-bold text-rose-300 mb-4">Bemutatkozás</h3>
          
          <div>
            <label className="block text-rose-300 font-semibold mb-2">Rövid bemutatkozás</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Mutatkozz be! Írd le a tapasztalataidat, motivációdat, munkamódszeredet..."
              rows={5}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        {/* Mentés gomb */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-4 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
        >
          <Save className="w-5 h-5" />
          {loading ? 'Mentés...' : 'Profil mentése'}
        </button>
      </div>
    );
  }

  return null;
}
