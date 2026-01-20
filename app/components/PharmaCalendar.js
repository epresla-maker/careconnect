"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Clock, MapPin } from 'lucide-react';

export default function PharmaCalendar({ pharmaRole }) {
  const { user, userData } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Load demands
  useEffect(() => {
    loadDemands();
  }, [currentDate, user]);

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
        // Gyógyszertár: saját igényei
        q = query(
          demandsRef,
          where('pharmacyId', '==', user.uid),
          orderBy('date', 'asc')
        );
      } else {
        // Helyettesítő: nyitott igények a pozíciójának megfelelően
        q = query(
          demandsRef,
          where('status', '==', 'open'),
          where('position', '==', pharmaRole),
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
        <h2 className="text-2xl font-bold text-[#111827]">Naptár</h2>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors whitespace-nowrap font-medium"
          >
            Ma
          </button>
          <button
            onClick={goToPreviousMonth}
            className="p-2 bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-5 h-5 text-[#6B7280]" />
          </button>
          <div className="px-2 sm:px-4 py-2 font-semibold text-[#111827] min-w-[140px] sm:min-w-[200px] text-center flex-1 sm:flex-none text-lg">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>
          <button
            onClick={goToNextMonth}
            className="p-2 bg-white hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-xl transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5 text-[#6B7280]" />
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
          <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
            {/* Day names header */}
            <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-[#F9FAFB]">
              {dayNames.map((day, index) => (
                <div key={index} className="p-3 text-center text-sm font-bold text-[#6B7280]">
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

                return (
                  <div
                    key={index}
                    onClick={() => !isPast && handleDateClick(day.date)}
                    className={`min-h-[100px] p-2 border-r border-b border-[#E5E7EB] ${
                      !day.isCurrentMonth ? 'bg-[#F9FAFB]' : 'bg-white'
                    } ${
                      !isPast && day.isCurrentMonth ? 'cursor-pointer hover:bg-[#F3F4F6]' : ''
                    } ${
                      isPast ? 'opacity-40 cursor-not-allowed' : ''
                    } transition-all duration-200`}
                  >
                    <div className={`text-sm font-bold mb-1 ${
                      !day.isCurrentMonth ? 'text-[#9CA3AF]' : 'text-[#111827]'
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
                            className={`text-xs px-2 py-1 rounded-lg font-medium ${
                              demand.status === 'open' ? 'bg-green-50 text-green-700 border border-green-200' :
                              demand.status === 'filled' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                              'bg-gray-100 text-gray-600 border border-gray-200'
                            } truncate`}
                          >
                            {demand.position === 'pharmacist' ? '👨‍⚕️' : '🧑‍⚕️'} {demand.pharmacyName || 'Igény'}
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
          <div className="mt-6 flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
              <span className="text-[#111827] font-medium">Nyitott</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-200 rounded"></div>
              <span className="text-[#111827] font-medium">Betöltve</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border-2 border-gray-200 rounded"></div>
              <span className="text-[#111827] font-medium">Törölve</span>
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
function DateModal({ date, demands, pharmaRole, onClose, onDemandDeleted, onDemandCreated, showCreateForm, setShowCreateForm }) {
  const dateStr = date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-2xl shadow-xl w-full border border-[#E5E7EB] ${
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
                  <h4 className="font-semibold text-[#111827] mb-3">Meglévő igények ezen a napon:</h4>
                  <div className="space-y-3">
                    {demands.map(demand => (
                      <div key={demand.id} className="border border-[#E5E7EB] bg-[#F9FAFB] rounded-xl p-4 hover:border-[#6B46C1] transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{demand.position === 'pharmacist' ? '👨‍⚕️' : '🧑‍⚕️'}</span>
                              <span className="font-semibold text-[#111827]">
                                {demand.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens'}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                demand.status === 'open' ? 'bg-green-50 text-green-700 border border-green-200' :
                                demand.status === 'filled' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-gray-100 text-gray-600 border border-gray-200'
                              }`}>
                                {demand.status === 'open' ? 'Nyitott' :
                                 demand.status === 'filled' ? 'Betöltve' : 'Törölve'}
                              </span>
                            </div>
                            {demand.workHours && (
                              <div className="flex items-center gap-2 text-sm text-[#6B7280] font-medium">
                                <Clock className="w-4 h-4" />
                                {demand.workHours}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => onDemandDeleted(demand.id)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-red-200"
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
                    <DemandCard key={demand.id} demand={demand} pharmaRole={pharmaRole} />
                  ))}
                </div>
              ) : (
                <p className="text-[#6B7280] text-center py-8">Nincs elérhető igény ezen a napon.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Create Demand Form
function CreateDemandForm({ date, onSuccess, onCancel }) {
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

  const softwareOptions = ['Phoenix', 'Medea', 'Pharma+', 'Nexon', 'Meditech', 'Farmdata', 'Egyéb'];

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
    setLoading(true);

    try {
      const demandData = {
        pharmacyId: user.uid,
        pharmacyName: userData.pharmacyName || 'Gyógyszertár',
        pharmacyCity: userData.pharmacyCity || '',
        pharmacyZipCode: userData.pharmacyZipCode || '',
        pharmacyPhotoURL: userData.pharmaPhotoURL || '',
        date: date.toISOString().split('T')[0],
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
        pharmacyPhotoURL: userData.pharmaPhotoURL || '',
        position: formData.position,
        positionLabel: formData.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens',
        workHours: formData.workHours,
        minExperience: formData.minExperience,
        requiredSoftware: formData.requiredSoftware,
        otherSoftware: formData.otherSoftware || '',
        maxHourlyRate: formData.maxHourlyRate ? parseInt(formData.maxHourlyRate) : null,
        additionalRequirements: formData.additionalRequirements,
        date: date.toISOString().split('T')[0],
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
      <h4 className="font-semibold text-[#111827] mb-4 text-lg">Új igény létrehozása</h4>

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          Pozíció <span className="text-red-600">*</span>
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
          className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
          required
        >
          <option value="pharmacist">Gyógyszerész</option>
          <option value="assistant">Szakasszisztens</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          Munkaidő
        </label>
        <input
          type="text"
          value={formData.workHours}
          onChange={(e) => setFormData({ ...formData, workHours: e.target.value })}
          placeholder="pl. 8:00-16:00"
          className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          Minimum tapasztalat
        </label>
        <select
          value={formData.minExperience}
          onChange={(e) => setFormData({ ...formData, minExperience: e.target.value })}
          className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
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
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          Szükséges szoftverismeret
        </label>
        <div className="space-y-2">
          {softwareOptions.map(software => (
            <label key={software} className="flex items-center">
              <input
                type="checkbox"
                checked={formData.requiredSoftware.includes(software)}
                onChange={() => handleSoftwareToggle(software)}
                className="w-4 h-4 text-[#6B46C1] bg-white border-[#E5E7EB] rounded focus:ring-[#6B46C1]"
              />
              <span className="ml-2 text-[#111827] text-sm font-medium">{software}</span>
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
              className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
            />
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          Maximum órabér (Ft)
        </label>
        <input
          type="number"
          value={formData.maxHourlyRate}
          onChange={(e) => setFormData({ ...formData, maxHourlyRate: e.target.value })}
          placeholder="pl. 5000"
          className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
          min="0"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-[#111827] mb-2">
          További követelmények
        </label>
        <textarea
          value={formData.additionalRequirements}
          onChange={(e) => setFormData({ ...formData, additionalRequirements: e.target.value })}
          rows="3"
          className="w-full px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1]"
          placeholder="Egyéb elvárások..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-[#E5E7EB] rounded-xl text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
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
function DemandCard({ demand, pharmaRole }) {
  const { user, userData } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [applying, setApplying] = useState(false);
  
  const handleApply = async () => {
    if (!user || !userData) {
      alert('Kérlek jelentkezz be!');
      return;
    }

    if (!userData.pharmaProfileComplete) {
      alert('Kérlek töltsd ki a profilodat a jelentkezés előtt!');
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

      alert('Jelentkezés sikeresen elküldve!');
    } catch (error) {
      console.error('Error applying:', error);
      alert('Hiba történt a jelentkezés során.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="border border-[#E5E7EB] bg-[#F9FAFB] rounded-xl p-4 hover:border-[#6B46C1] transition-colors">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{demand.position === 'pharmacist' ? '👨‍⚕️' : '🧑‍⚕️'}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-[#111827] mb-1 text-lg">{demand.pharmacyName}</h4>
          {demand.pharmacyCity && (
            <div className="flex items-center gap-1 text-sm text-[#6B7280] font-medium mb-2">
              <MapPin className="w-4 h-4" />
              {demand.pharmacyZipCode && `${demand.pharmacyZipCode} `}{demand.pharmacyCity}
            </div>
          )}
          {demand.workHours && (
            <div className="flex items-center gap-1 text-sm text-[#6B7280] font-medium mb-2">
              <Clock className="w-4 h-4" />
              {demand.workHours}
            </div>
          )}
          
          {!showDetails ? (
            // Összefoglaló nézet
            <>
              {demand.minExperience && (
                <p className="text-sm text-[#111827]">
                  <strong>Minimum tapasztalat:</strong> {demand.minExperience}
                </p>
              )}
              {demand.maxHourlyRate && (
                <p className="text-sm text-[#111827]">
                  <strong>Maximum órabér:</strong> {demand.maxHourlyRate} Ft
                </p>
              )}
            </>
          ) : (
            // Részletes nézet
            <>
              {demand.minExperience && (
                <p className="text-sm text-[#111827] mb-1">
                  <strong>Minimum tapasztalat:</strong> {demand.minExperience}
                </p>
              )}
              {demand.requiredSoftware?.length > 0 && (
                <div className="mb-2">
                  <p className="text-sm text-[#111827] mb-1"><strong>Szoftverismeret:</strong></p>
                  <div className="flex flex-wrap gap-1">
                    {demand.requiredSoftware.map(sw => (
                      <span key={sw} className="px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium">
                        {sw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {demand.maxHourlyRate && (
                <p className="text-sm text-[#111827] mb-1">
                  <strong>Maximum órabér:</strong> {demand.maxHourlyRate} Ft
                </p>
              )}
              {demand.additionalRequirements && (
                <p className="text-sm text-[#111827] mt-2">
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
          className="flex-1 px-4 py-2 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white rounded-xl transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {applying ? 'Jelentkezés...' : 'Jelentkezem'}
        </button>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="px-4 py-2 border border-[#E5E7EB] rounded-xl text-[#111827] hover:bg-[#F3F4F6] transition-colors text-sm font-medium"
        >
          {showDetails ? 'Kevesebb' : 'Részletek'}
        </button>
      </div>
    </div>
  );
}
