"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ChevronLeft, ChevronRight, Plus, X, Clock, MapPin, Heart } from 'lucide-react';

export default function TutoCalendar() {
  const { user, userData } = useAuth();
  const tutoRole = userData?.tutomagisterRole;
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [demands, setDemands] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Új igény mezők (Megbízóknak)
  const [demandTitle, setDemandTitle] = useState('');
  const [demandDescription, setDemandDescription] = useState('');
  const [requiredQualifications, setRequiredQualifications] = useState([]);
  const [requiredCareTypes, setRequiredCareTypes] = useState([]);
  const [workSchedule, setWorkSchedule] = useState('');
  const [offeredRate, setOfferedRate] = useState('');

  // Igények lekérése
  useEffect(() => {
    fetchDemands();
  }, [currentDate]);

  const fetchDemands = async () => {
    try {
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      const q = query(
        collection(db, 'tutoDemands'),
        where('date', '>=', startOfMonth.toISOString()),
        where('date', '<=', endOfMonth.toISOString())
      );

      const querySnapshot = await getDocs(q);
      const demandsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setDemands(demandsData);
    } catch (error) {
      console.error('Error fetching demands:', error);
    }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDemandsForDate = (day) => {
    if (!day) return [];
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
    return demands.filter(d => d.date.startsWith(dateStr));
  };

  const handleDateClick = (day) => {
    if (!day) return;
    const clickedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(clickedDate);
    
    // Megbízók új igényt adhatnak fel
    if (tutoRole === 'client') {
      setShowModal(true);
    }
  };

  const handleCreateDemand = async () => {
    if (!demandTitle || !selectedDate) {
      alert('Kérlek add meg a cím és dátum mezőket!');
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, 'tutoDemands'), {
        title: demandTitle,
        description: demandDescription,
        date: selectedDate.toISOString(),
        requiredQualifications,
        requiredCareTypes,
        workSchedule,
        offeredRate,
        clientId: user.uid,
        clientName: userData.tutoFamilyName || userData.displayName || 'Megbízó',
        clientCity: userData.tutoCity || '',
        status: 'open',
        applicants: [],
        createdAt: new Date().toISOString()
      });

      // Reset form
      setDemandTitle('');
      setDemandDescription('');
      setRequiredQualifications([]);
      setRequiredCareTypes([]);
      setWorkSchedule('');
      setOfferedRate('');
      setShowModal(false);
      
      // Refresh demands
      fetchDemands();
    } catch (error) {
      console.error('Error creating demand:', error);
      alert('Hiba történt az igény létrehozása során.');
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  const dayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

  const days = getDaysInMonth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={handleNextMonth}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Info for Caregivers */}
      {tutoRole === 'caregiver' && (
        <div className="bg-rose-900/30 border-l-4 border-rose-500 p-4 rounded-r-xl">
          <p className="text-white font-semibold">🧑‍⚕️ Ápolóként böngészd a megbízók által feladott igényeket és jelentkezz!</p>
        </div>
      )}

      {/* Info for Clients */}
      {tutoRole === 'client' && (
        <div className="bg-rose-900/30 border-l-4 border-rose-500 p-4 rounded-r-xl">
          <p className="text-white font-semibold">👨‍👩‍👧 Kattints egy napra új igény feladásához!</p>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden shadow-lg">
        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-700">
          {dayNames.map(day => (
            <div key={day} className="p-3 text-center">
              <span className="text-sm font-bold text-white">{day}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const demandsForDay = getDemandsForDate(day);
            const isToday = day && 
              new Date().getDate() === day && 
              new Date().getMonth() === currentDate.getMonth() &&
              new Date().getFullYear() === currentDate.getFullYear();

            return (
              <div
                key={index}
                onClick={() => handleDateClick(day)}
                className={`min-h-[100px] p-2 border border-gray-700 transition-colors ${
                  day 
                    ? 'hover:bg-gray-700 cursor-pointer' 
                    : 'bg-gray-900'
                } ${isToday ? 'bg-rose-900/30' : ''}`}
              >
                {day && (
                  <>
                    <div className={`text-right mb-2 ${isToday ? 'font-bold text-white text-lg' : 'text-white font-bold'}`}>
                      {day}
                    </div>
                    
                    {/* Demand badges */}
                    <div className="space-y-1">
                      {demandsForDay.slice(0, 3).map((demand) => (
                        <div
                          key={demand.id}
                          className="text-xs px-2 py-1 rounded bg-rose-600 text-white truncate border border-rose-400"
                        >
                          {demand.title}
                        </div>
                      ))}
                      {demandsForDay.length > 3 && (
                        <div className="text-xs text-rose-300 text-center">
                          +{demandsForDay.length - 3} további
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal for creating demand (Clients only) */}
      {showModal && tutoRole === 'client' && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Heart className="w-6 h-6 text-rose-500" />
                Új Gondozási Igény
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-rose-300 font-semibold mb-2">
                  Igény címe *
                </label>
                <input
                  type="text"
                  value={demandTitle}
                  onChange={(e) => setDemandTitle(e.target.value)}
                  placeholder="pl. 24 órás idősellátás"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-rose-300 font-semibold mb-2">
                  Részletes leírás
                </label>
                <textarea
                  value={demandDescription}
                  onChange={(e) => setDemandDescription(e.target.value)}
                  placeholder="Írd le az igény részleteit..."
                  rows={4}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-rose-300 font-semibold mb-2">
                  Munkarend
                </label>
                <select
                  value={workSchedule}
                  onChange={(e) => setWorkSchedule(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white"
                >
                  <option value="">Válassz...</option>
                  <option value="24h">24 órás bentlakás</option>
                  <option value="heti5">Heti 5 nap bentlakás</option>
                  <option value="12h">12 órás váltott műszak</option>
                  <option value="nappali">Nappali műszak (8-20h)</option>
                  <option value="ejszakai">Éjszakai műszak (20-8h)</option>
                  <option value="hetvegi">Hétvégi műszak</option>
                  <option value="eseti">Eseti kisegítés</option>
                </select>
              </div>

              <div>
                <label className="block text-rose-300 font-semibold mb-2">
                  Óradíj ajánlat (Ft/óra)
                </label>
                <input
                  type="number"
                  value={offeredRate}
                  onChange={(e) => setOfferedRate(e.target.value)}
                  placeholder="pl. 2500"
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400"
                />
              </div>

              <div className="bg-rose-900/30 border-l-4 border-rose-500 p-4 rounded-r-xl">
                <p className="text-sm text-gray-300">
                  Az igény nyilvános lesz, és az ápolók böngészhetik, jelentkezhetnek rá.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleCreateDemand}
                  disabled={loading}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? 'Létrehozás...' : 'Igény feladása'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
                >
                  Mégse
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
