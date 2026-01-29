"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, where, getDocs, getDoc, deleteDoc, doc, orderBy, serverTimestamp, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotificationWithPush } from '@/lib/notifications';
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Clock, MapPin, MessageCircle, Send } from 'lucide-react';

export default function PharmaCalendar({ pharmaRole }) {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load demands
  useEffect(() => {
    loadDemands();
  }, [user]);

  const loadDemands = async () => {
    if (!user || !pharmaRole) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const demandsRef = collection(db, 'pharmaDemands');
      let q;

      if (pharmaRole === 'pharmacy') {
        // Gyógyszertár: saját igényei (nem törölt)
        q = query(
          demandsRef,
          where('pharmacyId', '==', user.uid),
          where('status', 'in', ['open', 'filled']),
          orderBy('date', 'asc')
        );
      } else {
        // Helyettesítő: MINDEN nyitott igényt lát (gyógyszerész és asszisztens is)
        q = query(
          demandsRef,
          where('status', '==', 'open'),
          orderBy('date', 'asc')
        );
      }

      const snapshot = await getDocs(q);
      const demandsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setDemands(demandsData);
    } catch (error) {
      console.error('Error loading demands:', error);
      setDemands([]);
    } finally {
      setLoading(false);
    }
  };

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const firstDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday = 0
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({ date, isCurrentMonth: false });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push({ date, isCurrentMonth: true });
    }
    
    // Next month days
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false });
    }
    
    return days;
  };

  // Get demands for a specific date
  const getDemandsForDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return demands.filter(d => d.date === dateStr);
  };

  // Handle date click
  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateDemands = getDemandsForDate(date);
    
    if (pharmaRole === 'pharmacy') {
      // Gyógyszertár: mindig megnyitjuk a modált
      setShowModal(true);
      setShowCreateForm(dateDemands.length === 0);
    } else {
      // Helyettesítő: csak ha van igény
      if (dateDemands.length > 0) {
        setShowModal(true);
      }
    }
  };

  // Delete demand
  const handleDeleteDemand = async (demandId) => {
    if (!confirm('Biztosan törölni szeretnéd ezt az igényt?')) return;
    
    try {
      await deleteDoc(doc(db, 'pharmaDemands', demandId));
      await loadDemands();
      alert('Igény sikeresen törölve!');
    } catch (error) {
      console.error('Error deleting demand:', error);
      alert('Hiba történt az igény törlése során.');
    }
  };

  const calendarDays = getCalendarDays();
  const today = new Date().toDateString();
  const monthNames = ['Január', 'Február', 'Március', 'Április', 'Május', 'Június',
                      'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'];
  const dayNames = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#111827]'}`}>Naptár</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors whitespace-nowrap font-medium"
          >
            Ma
          </button>
          <button
            type="button"
            onClick={goToPreviousMonth}
            className={`p-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-[#F3F4F6] border-[#E5E7EB]'} border rounded-xl transition-colors flex-shrink-0`}
          >
            <ChevronLeft className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`} />
          </button>
          <div className={`px-2 sm:px-4 py-2 font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} min-w-[140px] sm:min-w-[200px] text-center flex-1 sm:flex-none text-lg`}>
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button
            type="button"
            onClick={goToNextMonth}
            className={`p-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700 border-gray-700' : 'bg-white hover:bg-[#F3F4F6] border-[#E5E7EB]'} border rounded-xl transition-colors flex-shrink-0`}
          >
            <ChevronRight className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B46C1]" />
        </div>
      ) : (
        <>
          {/* Calendar Grid */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#E5E7EB]'} rounded-2xl border overflow-hidden shadow-sm`}>
            {/* Day names header */}
            <div className={`grid grid-cols-7 border-b ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-[#E5E7EB] bg-[#F9FAFB]'}`}>
              {dayNames.map((day, index) => (
                <div key={index} className={`p-3 text-center text-sm font-bold ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, index) => {
                const dateDemands = getDemandsForDate(day.date);
                const isToday = day.date.toDateString() === today;
                const isPast = day.date < new Date(new Date().setHours(0, 0, 0, 0));
                const hasDemands = dateDemands.length > 0;

                return (
                  <div
                    key={index}
                    onClick={() => !isPast && handleDateClick(day.date)}
                    className={`min-h-[100px] p-2 border-r border-b ${darkMode ? 'border-gray-700' : 'border-[#E5E7EB]'} ${
                      !day.isCurrentMonth 
                        ? darkMode ? 'bg-gray-900' : 'bg-[#F9FAFB]' 
                        : hasDemands && !isPast
                          ? darkMode ? 'bg-purple-900/30' : 'bg-purple-50'
                          : darkMode ? 'bg-gray-800' : 'bg-white'
                    } ${
                      !isPast && day.isCurrentMonth 
                        ? darkMode ? 'cursor-pointer hover:bg-gray-700' : 'cursor-pointer hover:bg-[#F3F4F6]' 
                        : ''
                    } ${
                      isPast ? 'opacity-40 cursor-not-allowed' : ''
                    } ${
                      hasDemands && !isPast ? 'ring-2 ring-inset ring-purple-400' : ''
                    } transition-all duration-200`}
                  >
                    <div className={`text-sm font-bold mb-1 ${
                      !day.isCurrentMonth 
                        ? darkMode ? 'text-gray-600' : 'text-[#9CA3AF]' 
                        : darkMode ? 'text-white' : 'text-[#111827]'
                    } ${
                      isToday ? 'bg-[#6B46C1] text-white w-8 h-8 rounded-full flex items-center justify-center' : ''
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    {dateDemands.length > 0 && (
                      <div className="space-y-1">
                        {dateDemands.slice(0, 2).map(demand => (
                          <div
                            key={demand.id}
                            className={`text-xs px-2 py-1 rounded-lg font-medium truncate ${
                              demand.position === 'pharmacist'
                                ? darkMode ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-300'
                                : darkMode ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300'
                            }`}
                          >
                            {demand.pharmacyName || 'Igény'}
                          </div>
                        ))}
                        {dateDemands.length > 2 && (
                          <div className="text-xs text-[#6B46C1] px-2 font-medium">
                            +{dateDemands.length - 2} további
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 ${darkMode ? 'bg-blue-900/50 border-blue-700' : 'bg-blue-100 border-blue-300'} border-2 rounded`}></div>
              <span className={`${darkMode ? 'text-white' : 'text-[#111827]'} font-medium`}>Gyógyszerész</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 ${darkMode ? 'bg-green-900/50 border-green-700' : 'bg-green-100 border-green-300'} border-2 rounded`}></div>
              <span className={`${darkMode ? 'text-white' : 'text-[#111827]'} font-medium`}>Asszisztens</span>
            </div>
          </div>
        </>
      )}

      {/* Modal for date details */}
      {showModal && selectedDate && (
        <DateModal
          date={selectedDate}
          demands={getDemandsForDate(selectedDate)}
          pharmaRole={pharmaRole}
          darkMode={darkMode}
          onClose={() => {
            setShowModal(false);
            setShowCreateForm(false);
          }}
          onDemandDeleted={handleDeleteDemand}
          onDemandCreated={loadDemands}
          showCreateForm={showCreateForm}
          setShowCreateForm={setShowCreateForm}
        />
      )}
    </div>
  );
}

// Date Modal Component
function DateModal({ date, demands, pharmaRole, darkMode, onClose, onDemandDeleted, onDemandCreated, showCreateForm, setShowCreateForm }) {
  const dateStr = date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-[#E5E7EB]'} rounded-2xl shadow-xl w-full border ${
        showCreateForm ? 'fixed inset-0 rounded-none max-h-screen overflow-y-auto pb-48' : 'max-w-2xl max-h-[80vh] overflow-y-auto'
      }`}>
        <div className="sticky top-0 bg-[#6B46C1] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <h3 className="text-xl font-bold text-white">{dateStr}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          {pharmaRole === 'pharmacy' ? (
            // Gyógyszertár nézet
            <>
              {demands.length > 0 && !showCreateForm && (
                <div className="mb-6">
                  <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-3`}>Meglévő igények ezen a napon:</h4>
                  <div className="space-y-3">
                    {demands.map(demand => (
                      <div key={demand.id} className={`border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-[#E5E7EB] bg-[#F9FAFB]'} rounded-xl p-4 hover:border-[#6B46C1] transition-colors`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{demand.position === 'pharmacist' ? '👨‍⚕️' : '🧑‍⚕️'}</span>
                              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'}`}>
                                {demand.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens'}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                demand.position === 'pharmacist'
                                  ? darkMode ? 'bg-blue-900/50 text-blue-400 border border-blue-700' : 'bg-blue-100 text-blue-700 border border-blue-300'
                                  : darkMode ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-green-100 text-green-700 border border-green-300'
                              }`}>
                                {demand.status === 'open' ? 'Nyitott' :
                                 demand.status === 'filled' ? 'Betöltve' : 'Törölve'}
                              </span>
                            </div>
                            {demand.workHours && (
                              <div className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} font-medium`}>
                                <Clock className="w-4 h-4" />
                                {demand.workHours}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onDemandDeleted(demand.id)}
                            className={`px-3 py-1 text-sm text-red-600 ${darkMode ? 'hover:bg-red-900/30 border-red-700' : 'hover:bg-red-50 border-red-200'} rounded-xl transition-colors border`}
                          >
                            Törlés
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  Új igény feladása erre a napra
                </button>
              ) : (
                <CreateDemandForm
                  date={date}
                  darkMode={darkMode}
                  onSuccess={() => {
                    onDemandCreated();
                    setShowCreateForm(false);
                  }}
                  onCancel={() => setShowCreateForm(false)}
                />
              )}
            </>
          ) : (
            // Helyettesítő nézet
            <>
              {demands.length > 0 ? (
                <div className="space-y-4">
                  {demands.map(demand => (
                    <DemandCard key={demand.id} demand={demand} pharmaRole={pharmaRole} darkMode={darkMode} />
                  ))}
                </div>
              ) : (
                <p className={`${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} text-center py-8`}>Nincs elérhető igény ezen a napon.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Demand Form
function CreateDemandForm({ date, darkMode, onSuccess, onCancel }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    position: 'pharmacist',
    workHours: '',
    minExperience: '',
    requiredSoftware: [],
    otherSoftware: '',
    maxHourlyRate: '',
    additionalRequirements: '',
  });

  const softwareOptions = ['Lx-Line', 'Novodata', 'Quadro Byte', 'Daxa', 'Primula', 'Egyéb'];

  const handleSoftwareToggle = (software) => {
    setFormData(prev => ({
      ...prev,
      requiredSoftware: prev.requiredSoftware.includes(software)
        ? prev.requiredSoftware.filter(s => s !== software)
        : [...prev.requiredSoftware, software]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Ellenőrizzük, hogy a profil ki van-e töltve
    if (userData?.pharmagisterRole === 'pharmacy' && !userData?.pharmaProfileComplete) {
      alert('Kérlek először töltsd ki a profilodat!');
      return;
    }
    
    setLoading(true);

    try {
      // Lokális dátum formázás (timezone problémák elkerülésére)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const localDateString = `${year}-${month}-${day}`;
      
      // Teljes cím összeállítása
      const fullAddress = `${userData.pharmacyZipCode || ''} ${userData.pharmacyCity || ''}, ${userData.pharmacyStreet || ''} ${userData.pharmacyHouseNumber || ''}`.trim();
      
      const demandData = {
        pharmacyId: user.uid,
        pharmacyName: userData.pharmacyName || 'Gyógyszertár',
        pharmacyCity: userData.pharmacyCity || '',
        pharmacyZipCode: userData.pharmacyZipCode || '',
        pharmacyStreet: userData.pharmacyStreet || '',
        pharmacyHouseNumber: userData.pharmacyHouseNumber || '',
        pharmacyFullAddress: fullAddress,
        pharmacyPhotoURL: userData.photoURL || userData.pharmaPhotoURL || '',
        date: localDateString,
        position: formData.position,
        workHours: formData.workHours,
        minExperience: formData.minExperience,
        requiredSoftware: formData.requiredSoftware,
        otherSoftware: formData.otherSoftware || '',
        maxHourlyRate: formData.maxHourlyRate ? parseInt(formData.maxHourlyRate) : null,
        additionalRequirements: formData.additionalRequirements,
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
      };

      const demandRef = await addDoc(collection(db, 'pharmaDemands'), demandData);
      
      // Automatikusan létrehozunk egy serviceFeedPost-ot is
      await addDoc(collection(db, 'serviceFeedPosts'), {
        postType: 'pharmaDemand',
        module: 'pharmagister',
        pharmaDemandId: demandRef.id,
        pharmacyId: user.uid,
        pharmacyName: userData.pharmacyName || 'Gyógyszertár',
        pharmacyCity: userData.pharmacyCity || '',
        pharmacyZipCode: userData.pharmacyZipCode || '',
        pharmacyStreet: userData.pharmacyStreet || '',
        pharmacyHouseNumber: userData.pharmacyHouseNumber || '',
        pharmacyFullAddress: fullAddress,
        pharmacyPhotoURL: userData.photoURL || userData.pharmaPhotoURL || '',
        position: formData.position,
        positionLabel: formData.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens',
        workHours: formData.workHours,
        minExperience: formData.minExperience,
        requiredSoftware: formData.requiredSoftware,
        otherSoftware: formData.otherSoftware || '',
        maxHourlyRate: formData.maxHourlyRate ? parseInt(formData.maxHourlyRate) : null,
        additionalRequirements: formData.additionalRequirements,
        date: localDateString,
        createdAt: new Date(),
        userId: user.uid
      });
      
      alert('Igény sikeresen feladva!');
      onSuccess();
    } catch (error) {
      console.error('Error creating demand:', error);
      alert('Hiba történt az igény feladása során.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-4 text-lg`}>Új igény létrehozása</h4>

      {/* Profil figyelmeztetés */}
      {userData?.pharmagisterRole === 'pharmacy' && !userData?.pharmaProfileComplete && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-orange-800">
            ⚠️ <strong>Figyelem!</strong> Kérlek töltsd ki a profilodat a beállításokban!
          </p>
        </div>
      )}

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          Pozíció <span className="text-red-600">*</span>
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-[#E5E7EB] text-[#111827]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
          required
        >
          <option value="pharmacist">Gyógyszerész</option>
          <option value="assistant">Szakasszisztens</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          Munkaidő
        </label>
        <input
          type="text"
          value={formData.workHours}
          onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
          placeholder="pl. 8:00-16:00"
          className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
        />
      </div>

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          Minimum tapasztalat
        </label>
        <select
          value={formData.minExperience}
          onChange={(e) => setFormData({ ...formData, minExperience: e.target.value })}
          className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-[#E5E7EB] text-[#111827]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
        >
          <option value="">Nincs követelmény</option>
          <option value="0-1">0-1 év</option>
          <option value="1-3">1-3 év</option>
          <option value="3-5">3-5 év</option>
          <option value="5-10">5-10 év</option>
          <option value="10+">10+ év</option>
        </select>
      </div>

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          Szükséges szoftverismeret
        </label>
        <div className="space-y-2">
          {softwareOptions.map(software => (
            <label key={software} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requiredSoftware.includes(software)}
                onChange={() => handleSoftwareToggle(software)}
                className={`w-4 h-4 text-[#6B46C1] ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-[#E5E7EB]'} rounded focus:ring-[#6B46C1]`}
              />
              <span className={`ml-2 ${darkMode ? 'text-white' : 'text-[#111827]'} text-sm font-medium`}>{software}</span>
            </label>
          ))}
        </div>
        
        {formData.requiredSoftware.includes('Egyéb') && (
          <div className="mt-3">
            <input
              type="text"
              value={formData.otherSoftware}
              onChange={(e) => setFormData({ ...formData, otherSoftware: e.target.value })}
              placeholder="Add meg az egyéb szoftver nevét"
              className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
            />
          </div>
        )}
      </div>

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          Maximum órabér (Ft)
        </label>
        <input
          type="number"
          value={formData.maxHourlyRate}
          onChange={(e) => setFormData({ ...formData, maxHourlyRate: e.target.value })}
          placeholder="pl. 5000"
          className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
          min="0"
        />
      </div>

      <div>
        <label className={`block text-sm font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2`}>
          További követelmények
        </label>
        <textarea
          value={formData.additionalRequirements}
          onChange={(e) => setFormData({ ...formData, additionalRequirements: e.target.value })}
          rows="3"
          className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-[#E5E7EB] text-[#111827] placeholder-[#9CA3AF]'} border rounded-xl focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]`}
          placeholder="Egyéb elvárások..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className={`flex-1 px-4 py-2 border ${darkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-[#E5E7EB] text-[#6B7280] hover:bg-[#F3F4F6]'} rounded-xl transition-colors`}
        >
          Mégse
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Létrehozás...
            </>
          ) : (
            'Igény feladása'
          )}
        </button>
      </div>
    </form>
  );
}

// Demand Card for Substitutes
function DemandCard({ demand, pharmaRole, darkMode }) {
  const { user, userData } = useAuth();
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const handleApply = async () => {
    if (!user || !userData) {
      alert('Kérlek jelentkezz be!');
      return;
    }

    if (!userData.pharmaProfileComplete) {
      alert('Kérlek töltsd ki a profilodat a jelentkezés előtt!');
      return;
    }

    // Szerepkör ellenőrzés - KRITIKUS!
    if (!userData.pharmagisterRole || userData.pharmagisterRole === 'pharmacy') {
      alert('Csak gyógyszerészek és szakasszisztensek jelentkezhetnek!');
      return;
    }

    // Ellenőrizzük hogy a szerepkör egyezik-e az igénnyel
    const userRole = userData.pharmagisterRole; // 'pharmacist' vagy 'assistant'
    const demandPosition = demand.position; // 'pharmacist' vagy 'assistant'
    
    if (userRole !== demandPosition) {
      const userRoleLabel = userRole === 'pharmacist' ? 'gyógyszerész' : 'szakasszisztens';
      const demandPositionLabel = demandPosition === 'pharmacist' ? 'gyógyszerész' : 'szakasszisztens';
      alert(`Erre az igényre csak ${demandPositionLabel}ek jelentkezhetnek! Te ${userRoleLabel}ként vagy regisztrálva.`);
      return;
    }

    if (applying) return;
    
    setApplying(true);
    try {
      const applicationsRef = collection(db, 'pharmaApplications');
      
      // Ellenőrizzük, hogy már jelentkezett-e
      const existingApplicationQuery = query(
        applicationsRef,
        where('demandId', '==', demand.id),
        where('applicantId', '==', user.uid)
      );
      const existingApplications = await getDocs(existingApplicationQuery);
      
      if (!existingApplications.empty) {
        alert('Már jelentkeztél erre az igényre!');
        setApplying(false);
        return;
      }

      // Új jelentkezés létrehozása
      await addDoc(applicationsRef, {
        demandId: demand.id,
        applicantId: user.uid,
        applicantName: userData.displayName || user.displayName || user.email,
        applicantEmail: user.email,
        applicantRole: pharmaRole,
        applicantExperience: userData.pharmaYearsOfExperience || '',
        applicantHourlyRate: userData.pharmaHourlyRate || '',
        pharmacyId: demand.pharmacyId,
        pharmacyName: demand.pharmacyName,
        position: demand.position,
        date: demand.date,
        status: 'pending',
        createdAt: new Date().toISOString(),
        message: `Jelentkezem a ${demand.date} napra.`
      });

      // Értesítés küldése a gyógyszertárnak push-sal
      await createNotificationWithPush({
        userId: demand.pharmacyId,
        type: 'pharma_application',
        title: 'Új jelentkező! 📝',
        message: `${userData.displayName || 'Valaki'} jelentkezett a ${new Date(demand.date).toLocaleDateString('hu-HU')}-i helyettesítésre.`,
        data: {
          demandId: demand.id,
          applicantId: user.uid,
        },
        url: `/pharmagister?tab=dashboard&expand=${demand.id}`
      });

      alert('Jelentkezés sikeresen elküldve!');
    } catch (error) {
      console.error('Error applying:', error);
      alert('Hiba történt a jelentkezés során.');
    } finally {
      setApplying(false);
    }
  };

  const handleSendMessage = async () => {
    if (!user || !messageText.trim()) return;
    
    setSendingMessage(true);
    try {
      // Check if chat already exists for this specific demand
      const chatsRef = collection(db, 'chats');
      const existingChatQuery = query(
        chatsRef,
        where('members', 'array-contains', user.uid)
      );
      const existingChats = await getDocs(existingChatQuery);
      
      let chatId = null;
      existingChats.forEach((chatDoc) => {
        const chatData = chatDoc.data();
        // Check both: same pharmacy AND same demand
        if (chatData.members.includes(demand.pharmacyId) && chatData.relatedDemandId === demand.id) {
          chatId = chatDoc.id;
        }
      });
      
      // If no existing chat, create new one
      if (!chatId) {
        const newChatRef = await addDoc(chatsRef, {
          members: [user.uid, demand.pharmacyId],
          memberNames: {
            [user.uid]: userData?.displayName || 'Felhasználó',
            [demand.pharmacyId]: demand.pharmacyName || 'Gyógyszertár'
          },
          memberPhotos: {
            [user.uid]: userData?.photoURL || null,
            [demand.pharmacyId]: demand.pharmacyPhotoURL || null
          },
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: messageText.trim(),
          relatedDemandId: demand.id,
          relatedDemandDate: demand.date,
          relatedDemandPosition: demand.position,
          relatedDemandPositionLabel: demand.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens',
          archivedBy: [],
          deletedBy: []
        });
        chatId = newChatRef.id;
      } else {
        // Update existing chat with last message info
        const chatDoc = await getDoc(doc(db, 'chats', chatId));
        const updateData = {
          lastMessageAt: serverTimestamp(),
          lastMessage: messageText.trim()
        };
        
        // Csak akkor használjuk az arrayRemove-ot, ha a mezők léteznek
        const chatData = chatDoc.data();
        if (chatData?.deletedBy) {
          updateData.deletedBy = arrayRemove(user.uid);
        }
        if (chatData?.archivedBy) {
          updateData.archivedBy = arrayRemove(user.uid);
        }
        
        await updateDoc(doc(db, 'chats', chatId), updateData);
      }
      
      // Add message to the chat
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        senderId: user.uid,
        senderName: userData?.displayName || 'Felhasználó',
        text: messageText.trim(),
        createdAt: serverTimestamp(),
        relatedDemandId: demand.id,
        relatedDemandDate: demand.date
      });
      
      // Send notification with push to pharmacy
      await createNotificationWithPush({
        userId: demand.pharmacyId,
        type: 'new_message',
        title: 'Új üzenet érkezett! 💬',
        message: `${userData?.displayName || 'Valaki'} üzenetet küldött a ${new Date(demand.date).toLocaleDateString('hu-HU')}-i igényeddel kapcsolatban.`,
        data: {
          chatId: chatId,
          senderId: user.uid,
        },
        url: `/chat/${chatId}`
      });
      
      setShowMessageModal(false);
      setMessageText('');
      alert('Üzenet sikeresen elküldve!');
      
      // Navigate to chat
      router.push(`/chat/${chatId}`);
      
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Hiba történt az üzenet küldése során.');
    } finally {
      setSendingMessage(false);
    }
  };

  return (
    <div className={`border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-[#E5E7EB] bg-[#F9FAFB]'} rounded-xl p-4 hover:border-[#6B46C1] transition-colors`}>
      <div className="flex items-start gap-3">
        <span className="text-3xl">{demand.position === 'pharmacist' ? '👨‍⚕️' : '🧑‍⚕️'}</span>
        <div className="flex-1">
          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-1 text-lg`}>{demand.pharmacyName}</h4>
          {demand.pharmacyCity && (
            <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} font-medium mb-2`}>
              <MapPin className="w-4 h-4" />
              {demand.pharmacyFullAddress || `${demand.pharmacyZipCode || ''} ${demand.pharmacyCity || ''}`}
            </div>
          )}
          {demand.workHours && (
            <div className={`flex items-center gap-1 text-sm ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} font-medium mb-2`}>
              <Clock className="w-4 h-4" />
              {demand.workHours}
            </div>
          )}
          
          {!showDetails ? (
            // Összefoglaló nézet
            <>
              {demand.minExperience && (
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'}`}>
                  <strong>Minimum tapasztalat:</strong> {demand.minExperience}
                </p>
              )}
              {demand.maxHourlyRate && (
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'}`}>
                  <strong>Maximum órabér:</strong> {demand.maxHourlyRate} Ft
                </p>
              )}
            </>
          ) : (
            // Részletes nézet
            <>
              {demand.minExperience && (
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'} mb-1`}>
                  <strong>Minimum tapasztalat:</strong> {demand.minExperience}
                </p>
              )}
              {demand.requiredSoftware?.length > 0 && (
                <div className="mb-2">
                  <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'} mb-1`}><strong>Szoftverismeret:</strong></p>
                  <div className="flex flex-wrap gap-1">
                    {demand.requiredSoftware.map(sw => (
                      <span key={sw} className={`px-2 py-1 ${darkMode ? 'bg-blue-900/50 text-blue-400 border-blue-700' : 'bg-blue-50 text-blue-700 border-blue-200'} border rounded-lg text-xs font-medium`}>
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {demand.maxHourlyRate && (
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'} mb-1`}>
                  <strong>Maximum órabér:</strong> {demand.maxHourlyRate} Ft
                </p>
              )}
              {demand.additionalRequirements && (
                <p className={`text-sm ${darkMode ? 'text-white' : 'text-[#111827]'} mt-2`}>
                  <strong>További követelmények:</strong> {demand.additionalRequirements}
                </p>
              )}
            </>
          )}
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button 
          onClick={handleApply}
          disabled={applying}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {applying ? 'Jelentkezés...' : 'Jelentkezem'}
        </button>
        <button 
          onClick={() => setShowMessageModal(true)}
          className="px-3 py-2 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors text-sm font-medium flex items-center gap-1"
        >
          <MessageCircle className="w-4 h-4" />
          Üzenet
        </button>
        <button 
          onClick={() => router.push(`/pharmagister/demand/${demand.id}`)}
          className={`px-3 py-2 border ${darkMode ? 'border-gray-600 text-white hover:bg-gray-700' : 'border-[#E5E7EB] text-[#111827] hover:bg-[#F3F4F6]'} rounded-xl transition-colors text-sm font-medium`}
        >
          Részletek
        </button>
      </div>

      {/* Message Modal */}
      {showMessageModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setShowMessageModal(false)}>
          <div 
            className={`w-full max-w-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-6`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Üzenet - {demand.pharmacyName}
              </h3>
              <button
                onClick={() => setShowMessageModal(false)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
              Írj üzenetet a gyógyszertárnak a {new Date(demand.date).toLocaleDateString('hu-HU')}-i igénnyel kapcsolatban.
            </p>
            
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Îrd ide az üzeneted..."
              rows={4}
              className={`w-full px-4 py-3 rounded-xl border ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'} focus:ring-2 focus:ring-[#6B46C1] focus:border-transparent resize-none`}
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowMessageModal(false)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Mégsem
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendingMessage}
                className="flex-1 py-3 px-4 rounded-xl font-medium bg-[#6B46C1] hover:bg-[#5a3aa3] text-white disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {sendingMessage ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Küldés
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
