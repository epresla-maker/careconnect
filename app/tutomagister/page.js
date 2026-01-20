"use client";
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import RouteGuard from '@/app/components/RouteGuard';
import TutoProfileEditor from '@/app/components/TutoProfileEditor';
import TutoCalendar from '@/app/components/TutoCalendar';
import TutoDashboard from '@/app/components/TutoDashboard';

function TutomagisterContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('info');
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  
  // Tutomagister szerepkör: 'client' (Megbízó/Család), 'caregiver' (Ápoló/Gondozó)
  const tutoRole = userData?.tutomagisterRole || null;
  const profileComplete = userData?.tutoProfileComplete || false;

  // Debug: userData betöltés ellenőrzése
  useEffect(() => {
    if (userData) {
      console.log('🔍 Tutomagister userData:', {
        tutomagisterRole: userData.tutomagisterRole,
        tutoProfileComplete: userData.tutoProfileComplete,
        displayName: userData.displayName
      });
    }
  }, [userData]);

  // Detect standalone mode once on mount
  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || window.navigator.standalone 
      || document.referrer.includes('android-app://');
    setIsStandalone(standalone);
  }, []);

  // Capture beforeinstallprompt event
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (!deferredPrompt) {
      // iOS vagy már telepített
      alert('📱 Telepítés:\n\niOS: Nyomd meg a Megosztás gombot → "Hozzáadás a kezdőképernyőhöz"\n\nAndroid: Nyomd meg a ⋮ menüt → "Hozzáadás a kezdőképernyőhöz"');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Tutomagister telepítve!');
        setShowInstallButton(false);
      }
      
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Install error:', err);
    }
  }, [deferredPrompt]);

  // Auto-trigger when coming from dashboard with ?install=true
  useEffect(() => {
    if (searchParams.get('install') === 'true' && !isStandalone) {
      if (deferredPrompt) {
        handleInstallClick();
      } else {
        setShowInstallButton(true);
      }
    }
  }, [searchParams, isStandalone, deferredPrompt, handleInstallClick]);

  return (
    <RouteGuard>
      <div className="min-h-screen bg-[#F9FAFB] text-[#111827] pb-40">
        <div className="max-w-[420px] mx-auto px-4 py-6">
          
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => router.push('/')}
                className="text-[#6B46C1] font-medium flex items-center gap-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                főoldal
              </button>
              <h1 className="text-xl font-bold">Idősgondozás</h1>
            </div>
            <p className="text-sm text-[#6B7280]">Idősellátási és ápolási platform</p>
          </div>

          {/* Szerepkör beállítás - ha még nincs */}
          {!tutoRole && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-2">Válaszd ki a szerepköröd:</h2>
                <p className="text-sm text-[#6B7280]">
                  Kösd össze a családokat a szakképzett ápolókkal
                </p>
              </div>

              <button
                onClick={() => router.push('/tutomagister/setup?role=client')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Megbízó / Család</h3>
                    <p className="text-xs text-[#6B7280]">Ápolót, gondozót keresek</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => router.push('/tutomagister/setup?role=caregiver')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Ápoló / Gondozó</h3>
                    <p className="text-xs text-[#6B7280]">Ápolást, gondozást vállalok</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Fő tartalom - ha már van szerepkör */}
          {tutoRole && (
            <div className="space-y-4">
              <button
                onClick={() => setActiveTab('info')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Információ</h3>
                    <p className="text-xs text-[#6B7280]">Részletes útmutató és leírás</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('calendar')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Naptár</h3>
                    <p className="text-xs text-[#6B7280]">Igények és időpontok kezelése</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('dashboard')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Vezérlőpult</h3>
                    <p className="text-xs text-[#6B7280]">Igények és jelentkezések</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('profile')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Profilom</h3>
                    <p className="text-xs text-[#6B7280]">Adataim szerkesztése</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              {activeTab !== 'info' && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6 mt-6">
                  {activeTab === 'calendar' && <CalendarTab tutoRole={tutoRole} />}
                  {activeTab === 'dashboard' && <DashboardTab tutoRole={tutoRole} />}
                  {activeTab === 'profile' && <ProfileTab tutoRole={tutoRole} />}
                </div>
              )}

              {activeTab === 'info' && <InfoTab tutoRole={tutoRole} />}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

// Info Tab Component
function InfoTab({ tutoRole }) {
  return (
    <div className="prose max-w-none ">
      <h2 className="text-3xl font-bold text-[#111827] mb-6">A Tutomagisterről bővebben</h2>
      
      <div className="bg-rose-50 border-l-4 border-rose-500 p-6 mb-6 rounded-r-xl">
        <h3 className="text-xl font-bold text-[#111827] mb-3">Üdvözlünk a Tutomagister oldalán!</h3>
        <p className="text-[#374151] mb-3">
          Ez a platform azért jött létre, hogy egyszerűen és hatékonyan kösse össze az ápolót, gondozót kereső 
          családokat a szakképzett ápolókkal, gondozókkal és szociális munkásokkal.
        </p>
        <p className="text-[#374151]">
          Célunk, hogy megkönnyítsük a megfelelő szakember vagy munkalehetőség megtalálását az idősellátás területén.
        </p>
      </div>

      <h3 className="text-xl font-bold text-[#111827] mb-4">Hogyan Működik?</h3>
      <p className="text-[#374151] mb-6">
        Az oldal két fő felhasználói csoportot szolgál ki: a <strong>Megbízókat/Családokat</strong>, akik igényt adnak fel, 
        és az <strong>Ápolókat/Gondozókat</strong>, akik ezekre jelentkezhetnek.
      </p>

      {tutoRole === 'caregiver' && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#111827] mb-4">Ápolóknak / Gondozóknak 🧑‍⚕️</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">1. Regisztráció és Profil Kitöltése</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Regisztráció:</strong> Hozz létre egy fiókot "Ápoló/Gondozó" szerepkörrel.</li>
                <li><strong>Profil:</strong> Töltsd ki a szakmai adatokat: végzettség, tapasztalat, speciális ellátási formák, óradíj.</li>
                <li>Tölts fel profilképet és adj meg referenciákat, hogy a családok jobban megismerhessenek.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">2. Igények Böngészése</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Naptár:</strong> Láthatod a meghirdetett igényeket időrendben.</li>
                <li><strong>Vezérlőpult:</strong> Szűrhetsz helyszín, munkarend és követelmények szerint.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {tutoRole === 'client' && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#111827] mb-4">Megbízóknak / Családoknak 👨‍👩‍👧</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">1. Regisztráció</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Regisztráció:</strong> Hozz létre fiókot "Megbízó/Család" szerepkörrel.</li>
                <li>Add meg az alapvető elérhetőségi adatokat.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">2. Igény Feladása</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li>Válaszd ki a naptárban a dátumot.</li>
                <li>Add meg az elvárt képesítéseket és speciális ellátási igényeket.</li>
                <li>Határozd meg a munkarendet és díjazást.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
        <h3 className="text-xl font-bold text-[#111827] mb-4">Tippek ✨</h3>
        <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
          <li><strong>Ápolóknak:</strong> Részletes profil és referenciák növelik az esélyeidet!</li>
          <li><strong>Megbízóknak:</strong> Egyértelmű elvárások segítik a megfelelő szakember megtalálását.</li>
        </ul>
      </div>
    </div>
  );
}

// Calendar Tab Component
function CalendarTab({ tutoRole }) {
  return <TutoCalendar />;
}

// Dashboard Tab Component
function DashboardTab({ tutoRole }) {
  return <TutoDashboard />;
}

// Profile Tab Component
function ProfileTab({ tutoRole }) {
  return <TutoProfileEditor />;
}

// Wrapper with Suspense boundary
export default function TutomagisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Betöltés...</p>
        </div>
      </div>
    }>
      <TutomagisterContent />
    </Suspense>
  );
}
