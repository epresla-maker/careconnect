"use client";
import { useState, useEffect, useCallback, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';
import RouteGuard from '@/app/components/RouteGuard';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

function PharmagisterContent() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Az aktív tab a query paraméterből jön (alapértelmezett: 'calendar')
  const activeTab = searchParams.get('tab') || 'calendar';
  
  // Pharmagister szerepkör: 'pharmacy' (Gyógyszertár), 'pharmacist' (Gyógyszerész), 'assistant' (Szakasszisztens)
  const pharmaRole = userData?.pharmagisterRole || null;
  const profileComplete = userData?.pharmaProfileComplete || false;

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
        console.log('Pharmagister telepítve!');
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

  // Listen for unread notifications
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <RouteGuard>
      <div className={`min-h-screen bg-[#F9FAFB] text-[#111827] ${pharmaRole ? 'pb-[146px]' : 'pb-40'}`}>
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
              <h1 className="text-xl font-bold">Pharmagister</h1>
              <div className="flex items-center gap-2">
                {/* Notifications button */}
                <button
                  onClick={() => router.push('/notifications')}
                  className="relative p-2 text-gray-600 hover:text-purple-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {user?.email === 'epresla@icloud.com' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="text-red-600 font-bold text-sm"
                  >
                    Admin
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-[#6B7280]">(Gyógyszertári helyettesítési platform)</p>
          </div>

          {/* Validálás szükséges figyelmeztetés */}
          {userData?.status === 'pending_validation' && !pharmaRole && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-yellow-800">Validálás szükséges</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    A Pharmagister modulba való regisztrációhoz 2 ismerős validálása szükséges.
                    Jelenleg {userData?.validatedBy?.length || 0}/2 validálásod van.
                  </p>
                  <button
                    onClick={() => router.push('/find-users')}
                    className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                  >
                    Ismerősök keresése →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Szerepkör beállítás - ha még nincs és validálva van */}
          {!pharmaRole && userData?.status !== 'pending_validation' && (
            <div className="space-y-4">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-2">Válaszd ki a szerepköröd:</h2>
                <p className="text-sm text-[#6B7280]">
                  Kösd össze a gyógyszertárakat a helyettesítőkkel
                </p>
              </div>

              <button
                onClick={() => router.push('/pharmagister/setup?role=pharmacy')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Gyógyszertár</h3>
                    <p className="text-xs text-[#6B7280]">Helyettesítőt keresek</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => router.push('/pharmagister/setup?role=pharmacist')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Gyógyszerész</h3>
                    <p className="text-xs text-[#6B7280]">Helyettesítést vállalok</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>

              <button
                onClick={() => router.push('/pharmagister/setup?role=assistant')}
                className="w-full bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl p-4 transition-colors shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7">
                    <svg className="w-7 h-7 text-[#111827]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-[#111827]">Szakasszisztens</h3>
                    <p className="text-xs text-[#6B7280]">Helyettesítést vállalok</p>
                  </div>
                  <svg className="w-5 h-5 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            </div>
          )}

          {/* Fő tartalom - ha már van szerepkör */}
          {pharmaRole && (
            <div className="space-y-4">
              {activeTab === 'info' && <InfoTab pharmaRole={pharmaRole} />}
              {activeTab === 'calendar' && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                  <CalendarTab pharmaRole={pharmaRole} />
                </div>
              )}
              {activeTab === 'dashboard' && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                  <DashboardTab pharmaRole={pharmaRole} />
                </div>
              )}
              {activeTab === 'profile' && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-6">
                  <ProfileTab pharmaRole={pharmaRole} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </RouteGuard>
  );
}

// Info Tab Component
function InfoTab({ pharmaRole }) {
  return (
    <div className="prose max-w-none ">
      <h2 className="text-3xl font-bold text-[#111827] mb-6">A Pharmagisterről bővebben</h2>
      
      <div className="bg-purple-50 border-l-4 border-[#6B46C1] p-6 mb-6 rounded-r-xl">
        <h3 className="text-xl font-bold text-[#111827] mb-3">Üdvözlünk a Pharmagister oldalán!</h3>
        <p className="text-[#374151] mb-3">
          Ez a platform azért jött létre, hogy egyszerűen és hatékonyan kösse össze a helyettesítőt kereső 
          gyógyszertárakat a munkát vállaló gyógyszerészekkel és szakasszisztensekkel.
        </p>
        <p className="text-[#374151]">
          Célunk, hogy megkönnyítsük a megfelelő munkaerő vagy munkaalkalom megtalálását a gyógyszerészeti szektorban.
        </p>
      </div>

      <h3 className="text-xl font-bold text-[#111827] mb-4">Hogyan Működik?</h3>
      <p className="text-[#374151] mb-6">
        Az oldal két fő felhasználói csoportot szolgál ki: a <strong>Gyógyszertárakat</strong>, akik igényt adnak fel, 
        és a <strong>Helyettesítőket</strong> (Gyógyszerészek, Szakasszisztensek), akik ezekre jelentkezhetnek.
      </p>

      {(pharmaRole === 'pharmacist' || pharmaRole === 'assistant') && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#111827] mb-4">Helyettesítőknek (Gyógyszerész, Szakasszisztens) 🧑‍⚕️</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">1. Regisztráció és Profil Kitöltése</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Regisztráció:</strong> Hozz létre egy fiókot a megfelelő szerepkör (Gyógyszerész vagy Szakasszisztens) kiválasztásával.</li>
                <li><strong>Profil:</strong> A sikeres regisztráció után lépj a „Profilom szerkesztése" menüpontra. <strong>Fontos:</strong> Ahhoz, hogy jelentkezni tudj igényekre, ki kell töltened a kötelező szakmai adatokat (tapasztalat, szoftverismeret, órabér).</li>
                <li>Tölts fel profilképet és adj meg egy rövid bemutatkozást, hogy a gyógyszertárak jobb képet kapjanak rólad.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">2. Igények Keresése</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Naptár Nézet:</strong> A „Naptár" menüpontban vizuálisan láthatod a meghirdetett igényeket. Kattints egy naptári napra, hogy megtekintsd az aznapi elérhető pozíciókat egy felugró ablakban.</li>
                <li><strong>Vezérlőpult Kereső:</strong> A „Vezérlőpult" menüpont alatt található az „Elérhető Igények Keresése" rész. Itt szűrhetsz gyógyszertár nevére vagy irányítószámra is.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">3. Jelentkezés Igényekre</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li>Mind a Naptár nézetben (a napra kattintva felugró ablakban), mind a Vezérlőpult kereső listájában találsz „Jelentkezem" gombot az igények mellett.</li>
                <li>Kattintás előtt a „Részletek" gombbal vagy az igény nevére kattintva megtekintheted a gyógyszertár által megadott minimum követelményeket.</li>
                <li>A „Jelentkezem" gombra kattintva a gyógyszertár értesítést kap.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">4. Jelentkezéseid Kezelése (Vezérlőpult)</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li>A „Vezérlőpult" tetején, a „Jelentkezéseim" részben láthatod azokat az igényeket, amelyekre jelentkeztél.</li>
                <li><strong>Státuszok:</strong>
                  <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                    <li><strong>Függőben:</strong> A gyógyszertár még nem döntött. Itt még visszavonhatod a jelentkezésed.</li>
                    <li><strong>Elfogadva:</strong> Gratulálunk! A gyógyszertár elfogadta. Itt láthatod a gyógyszertár elérhetőségeit.</li>
                    <li><strong>Elutasítva:</strong> A gyógyszertár sajnos nem a te jelentkezésedet választotta.</li>
                  </ul>
                </li>
                <li><strong>Üzenetek:</strong> Bármelyik státuszban tudsz üzenetet váltani a gyógyszertárral.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {pharmaRole === 'pharmacy' && (
        <div className="mb-8">
          <h3 className="text-xl font-bold text-[#111827] mb-4">Gyógyszertáraknak 🏢</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">1. Regisztráció és Profil</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Regisztráció:</strong> Hozz létre egy fiókot „Gyógyszertár" szerepkörrel, megadva a gyógyszertár nevét és címét.</li>
                <li><strong>Profil:</strong> A „Profilom szerkesztése" menüpontban módosíthatod az alapadataidat és feltölthetsz egy logót vagy képet.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">2. Igények Feladása</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li>Menj a „Naptár" menüpontra.</li>
                <li>Kattints arra a naptári napra, amelyikre helyettesítőt keresel.</li>
                <li>Egy felugró ablak jelenik meg az új igény létrehozása űrlappal.</li>
                <li>Válaszd ki a keresett pozíciót (Gyógyszerész/Szakasszisztens), és add meg a minimum követelményeket.</li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">3. Jelentkezők Kezelése (Vezérlőpult)</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li>A „Vezérlőpult" menüpont alatt láthatod a „Meghirdetett Igényeim Kezelése" listát.</li>
                <li>Minden jelentkezőnél lehetőséged van:
                  <ul className="list-circle list-inside ml-6 mt-2 space-y-1">
                    <li>Megtekinteni az Adatlapját (profilját)</li>
                    <li>Üzenetet küldeni neki</li>
                    <li>Elfogadni a jelentkezését</li>
                    <li>Elutasítani a jelentkezését indoklással</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-[#111827] mb-3">4. Igények Törlése</h4>
              <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
                <li><strong>Vezérlőpult:</strong> Minden igény mellett találsz egy „Igény Törlése" gombot.</li>
                <li><strong>Naptár:</strong> A napra kattintva felugró ablakban is van „Törlés" gomb.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold text-[#111827] mb-4">Közös Funkciók 💬👤</h3>
        <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
          <li><strong>Üzenetek:</strong> A „Üzeneteim" menüpontban láthatod a beszélgetéseidet. Új üzenetet általában egy igényhez vagy felhasználói profilhoz kapcsolódóan tudsz kezdeményezni.</li>
          <li><strong>Profilok:</strong> Más felhasználók (gyógyszertárak vagy helyettesítők) adatlapját megtekintheted, hogy több információt szerezz róluk.</li>
        </ul>
      </div>

      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
        <h3 className="text-xl font-bold text-[#111827] mb-4">Tippek a Hatékony Használathoz ✨</h3>
        <ul className="list-disc list-inside space-y-2 text-[#374151] ml-4">
          <li><strong>Helyettesítőknek:</strong> Tartsd naprakészen a profilodat! Egy részletes, informatív profil növeli az esélyeidet. Válaszolj gyorsan a gyógyszertárak üzeneteire.</li>
          <li><strong>Gyógyszertáraknak:</strong> Adj meg egyértelmű követelményeket az igény feladásakor. Kommunikálj időben a jelentkezőkkel, értesítsd az elutasítottakat is.</li>
        </ul>
      </div>

      <div className="mt-8 text-center">
        <p className="text-[#6B7280] italic">
          Reméljük, ez az útmutató segít a Pharmagister hatékony használatában! 
          Ha további kérdésed van, vedd fel velünk a kapcsolatot.
        </p>
      </div>
    </div>
  );
}

// Calendar Tab Component
function CalendarTab({ pharmaRole }) {
  const PharmaCalendar = require('@/app/components/PharmaCalendar').default;
  return <PharmaCalendar pharmaRole={pharmaRole} />;
}

// Dashboard Tab Component
function DashboardTab({ pharmaRole }) {
  const PharmaDashboard = require('@/app/components/PharmaDashboard').default;
  return <PharmaDashboard pharmaRole={pharmaRole} />;
}

// Profile Tab Component
function ProfileTab({ pharmaRole }) {
  const PharmaProfileEditor = require('@/app/components/PharmaProfileEditor').default;
  return <PharmaProfileEditor pharmaRole={pharmaRole} />;
}

// Wrapper with Suspense boundary
export default function PharmagisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6B46C1] mx-auto mb-4"></div>
          <p className="text-[#6B7280]">Betöltés...</p>
        </div>
      </div>
    }>
      <PharmagisterContent />
    </Suspense>
  );
}
