"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { ArrowLeft, HelpCircle, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import RouteGuard from '@/app/components/RouteGuard';

export default function HelpPage() {
  const router = useRouter();
  const { userData } = useAuth();
  const { darkMode } = useTheme();
  const [expandedSection, setExpandedSection] = useState('about');

  const pharmaRole = userData?.pharmaRole;

  const sections = [
    {
      id: 'about',
      title: 'A Pharmagisterről',
      content: (
        <div className="space-y-4">
          <div className={`${darkMode ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-[#6B46C1]'} border-l-4 p-4 rounded-r-xl`}>
            <h4 className={`font-bold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>Üdvözlünk a Pharmagister oldalán!</h4>
            <p className={`${darkMode ? 'text-gray-300' : 'text-[#374151]'} text-sm mb-2`}>
              Ez a platform azért jött létre, hogy egyszerűen és hatékonyan kösse össze a helyettesítőt kereső 
              gyógyszertárakat a munkát vállaló gyógyszerészekkel és szakasszisztensekkel.
            </p>
            <p className={`${darkMode ? 'text-gray-300' : 'text-[#374151]'} text-sm`}>
              Célunk, hogy megkönnyítsük a megfelelő munkaerő vagy munkaalkalom megtalálását a gyógyszerészeti szektorban.
            </p>
          </div>
          
          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'}`}>Hogyan működik?</h4>
          <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'}`}>
            Az oldal két fő felhasználói csoportot szolgál ki: a <strong>Gyógyszertárakat</strong>, akik igényt adnak fel, 
            és a <strong>Helyettesítőket</strong> (Gyógyszerészek, Szakasszisztensek), akik ezekre jelentkezhetnek.
          </p>
        </div>
      )
    },
    {
      id: 'pharmacist',
      title: 'Helyettesítőknek (Gyógyszerész, Szakasszisztens)',
      showFor: ['pharmacist', 'assistant', null],
      content: (
        <div className="space-y-4">
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>1. Regisztráció és Profil Kitöltése</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li><strong>Regisztráció:</strong> Hozz létre egy fiókot a megfelelő szerepkör kiválasztásával.</li>
              <li><strong>Profil:</strong> Töltsd ki a kötelező szakmai adatokat (tapasztalat, szoftverismeret, órabér).</li>
              <li>Tölts fel profilképet és adj meg egy rövid bemutatkozást.</li>
            </ul>
          </div>
          
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>2. Igények Keresése</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li><strong>Naptár Nézet:</strong> Vizuálisan láthatod a meghirdetett igényeket.</li>
              <li><strong>Vezérlőpult:</strong> Szűrhetsz gyógyszertár nevére vagy irányítószámra.</li>
            </ul>
          </div>
          
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>3. Jelentkezés Igényekre</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li>Kattints a „Jelentkezem" gombra az igény mellett.</li>
              <li>A gyógyszertár értesítést kap a jelentkezésedről.</li>
            </ul>
          </div>
          
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>4. Jelentkezéseid Kezelése</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li><strong>Függőben:</strong> A gyógyszertár még nem döntött.</li>
              <li><strong>Elfogadva:</strong> Láthatod a gyógyszertár elérhetőségeit.</li>
              <li><strong>Elutasítva:</strong> Sajnos nem téged választottak.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'pharmacy',
      title: 'Gyógyszertáraknak',
      showFor: ['pharmacy', null],
      content: (
        <div className="space-y-4">
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>1. Regisztráció és Profil</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li>Hozz létre egy fiókot „Gyógyszertár" szerepkörrel.</li>
              <li>Add meg a gyógyszertár nevét és címét.</li>
            </ul>
          </div>
          
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>2. Igények Feladása</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li>Menj a „Naptár" menüpontra.</li>
              <li>Kattints a napra, amelyikre helyettesítőt keresel.</li>
              <li>Válaszd ki a pozíciót és a követelményeket.</li>
            </ul>
          </div>
          
          <div>
            <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>3. Jelentkezők Kezelése</h4>
            <ul className={`list-disc list-inside space-y-1 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
              <li>Megtekintheted a jelentkezők adatlapját.</li>
              <li>Üzenetet küldhetsz nekik.</li>
              <li>Elfogadhatod vagy elutasíthatod a jelentkezéseket.</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'common',
      title: 'Közös Funkciók',
      content: (
        <div className="space-y-4">
          <ul className={`list-disc list-inside space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'} ml-2`}>
            <li><strong>Üzenetek:</strong> Az „Üzeneteim" menüpontban láthatod a beszélgetéseidet.</li>
            <li><strong>Profilok:</strong> Más felhasználók adatlapját megtekintheted.</li>
            <li><strong>Értesítések:</strong> Push és e-mail értesítéseket kaphatsz.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tippek a hatékony használathoz',
      content: (
        <div className={`${darkMode ? 'bg-yellow-900/30 border-yellow-600' : 'bg-yellow-50 border-yellow-500'} border-l-4 p-4 rounded-r-xl`}>
          <ul className={`list-disc list-inside space-y-2 text-sm ${darkMode ? 'text-gray-300' : 'text-[#374151]'}`}>
            <li><strong>Helyettesítőknek:</strong> Tartsd naprakészen a profilodat! Válaszolj gyorsan az üzenetekre.</li>
            <li><strong>Gyógyszertáraknak:</strong> Adj meg egyértelmű követelményeket. Kommunikálj időben.</li>
          </ul>
        </div>
      )
    }
  ];

  const filteredSections = sections.filter(section => {
    if (!section.showFor) return true;
    return section.showFor.includes(pharmaRole);
  });

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
            <h1 className={`text-lg font-semibold ml-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Súgó</h1>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Header Info */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 shadow-sm`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'}`}>
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Pharmagister Útmutató</h2>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Minden, amit tudnod kell</p>
              </div>
            </div>
          </div>

          {/* Accordion Sections */}
          {filteredSections.map((section) => (
            <div 
              key={section.id}
              className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm overflow-hidden`}
            >
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className={`w-full flex items-center justify-between px-4 py-3 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
              >
                <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{section.title}</span>
                {expandedSection === section.id ? (
                  <ChevronUp className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <ChevronDown className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
              
              {expandedSection === section.id && (
                <div className={`px-4 pb-4 ${darkMode ? 'border-gray-700' : 'border-gray-100'} border-t pt-3`}>
                  {section.content}
                </div>
              )}
            </div>
          ))}

          {/* Contact */}
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-4 shadow-sm mt-6`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Kapcsolat</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Ha további kérdésed van, vedd fel velünk a kapcsolatot az{' '}
              <a href="mailto:support@careconnect.hu" className="text-[#6B46C1] underline">
                support@careconnect.hu
              </a>{' '}
              címen.
            </p>
          </div>
        </div>
      </div>
    </RouteGuard>
  );
}
