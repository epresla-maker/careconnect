"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { BarChart3, Database, Clock, Users, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

export default function FirestoreStatsPage() {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    if (user && userData?.role === 'admin') {
      loadStats();
    }
  }, [user, userData]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const statsRef = collection(db, 'firestoreStats');
      const q = query(statsRef, orderBy('date', 'desc'), limit(7));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setStats(data);
      if (data.length > 0) {
        setSelectedDay(data[0]);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user || userData?.role !== 'admin') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
        <p>Csak admin felhasználók számára.</p>
      </div>
    );
  }

  const getHourlyData = (day) => {
    if (!day?.hours) return [];
    
    const hourlyData = [];
    for (let h = 0; h < 24; h++) {
      const hourData = day.hours?.[h] || {};
      hourlyData.push({
        hour: h,
        reads: hourData.reads || 0,
        writes: hourData.writes || 0,
        deletes: hourData.deletes || 0
      });
    }
    return hourlyData;
  };

  const getTopUsers = (day) => {
    if (!day?.users) return [];
    
    return Object.entries(day.users)
      .map(([id, data]) => ({ id, reads: data.reads || 0, writes: data.writes || 0 }))
      .sort((a, b) => (b.reads + b.writes) - (a.reads + a.writes))
      .slice(0, 10);
  };

  const FREE_TIER_READS = 50000;
  const FREE_TIER_WRITES = 20000;

  return (
    <div className={`min-h-screen p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100'}`}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Database className="w-6 h-6" />
          Firestore Statisztikák
        </h1>

        {loading ? (
          <div className="text-center py-8">Betöltés...</div>
        ) : stats.length === 0 ? (
          <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg text-center`}>
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">Még nincs statisztikai adat</p>
            <p className="text-sm text-gray-500 mt-2">
              A tracker automatikusan gyűjti az adatokat, nézz vissza később.
            </p>
          </div>
        ) : (
          <>
            {/* Napi összesítők */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {stats.slice(0, 4).map((day, index) => (
                <div
                  key={day.id}
                  onClick={() => setSelectedDay(day)}
                  className={`p-4 rounded-xl cursor-pointer transition-all ${
                    selectedDay?.id === day.id
                      ? darkMode ? 'bg-emerald-600' : 'bg-emerald-500 text-white'
                      : darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
                  } shadow-lg`}
                >
                  <p className="text-sm opacity-75">{day.date}</p>
                  <p className="text-2xl font-bold">{(day.totalReads || 0).toLocaleString()}</p>
                  <p className="text-xs">olvasás</p>
                  <p className="text-lg font-semibold mt-1">{(day.totalWrites || 0).toLocaleString()}</p>
                  <p className="text-xs">írás</p>
                </div>
              ))}
            </div>

            {selectedDay && (
              <>
                {/* Kvóta figyelmeztetés */}
                {(selectedDay.totalWrites > FREE_TIER_WRITES * 0.8 || selectedDay.totalReads > FREE_TIER_READS * 0.8) && (
                  <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500 rounded-xl flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-yellow-500" />
                    <div>
                      <p className="font-semibold">Kvóta figyelmeztetés!</p>
                      <p className="text-sm">
                        Reads: {selectedDay.totalReads?.toLocaleString()}/{FREE_TIER_READS.toLocaleString()} ({Math.round((selectedDay.totalReads/FREE_TIER_READS)*100)}%) | 
                        Writes: {selectedDay.totalWrites?.toLocaleString()}/{FREE_TIER_WRITES.toLocaleString()} ({Math.round((selectedDay.totalWrites/FREE_TIER_WRITES)*100)}%)
                      </p>
                    </div>
                  </div>
                )}

                {/* Óránkénti bontás */}
                <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg mb-6`}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Óránkénti bontás - {selectedDay.date}
                  </h2>
                  
                  <div className="overflow-x-auto">
                    <div className="flex gap-1 min-w-[600px]">
                      {getHourlyData(selectedDay).map((hour) => {
                        const maxValue = Math.max(
                          ...getHourlyData(selectedDay).map(h => h.reads + h.writes)
                        ) || 1;
                        const height = ((hour.reads + hour.writes) / maxValue) * 100;
                        
                        return (
                          <div key={hour.hour} className="flex-1 flex flex-col items-center">
                            <div 
                              className="w-full bg-emerald-500 rounded-t"
                              style={{ height: `${Math.max(height, 2)}px`, minHeight: '2px' }}
                              title={`${hour.hour}:00 - R:${hour.reads} W:${hour.writes}`}
                            />
                            <span className="text-xs mt-1 text-gray-500">{hour.hour}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-4 text-sm">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-emerald-500 rounded" /> Reads + Writes
                    </span>
                  </div>
                </div>

                {/* Top felhasználók */}
                <div className={`p-6 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-lg`}>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Top felhasználók (művelet szám)
                  </h2>
                  
                  {getTopUsers(selectedDay).length === 0 ? (
                    <p className="text-gray-500">Nincs felhasználói adat</p>
                  ) : (
                    <div className="space-y-2">
                      {getTopUsers(selectedDay).map((u, i) => (
                        <div 
                          key={u.id}
                          className={`flex items-center gap-3 p-2 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                        >
                          <span className="w-6 text-center font-bold text-gray-500">#{i+1}</span>
                          <span className="flex-1 font-mono text-sm truncate">{u.id}</span>
                          <span className="text-emerald-500">R: {u.reads}</span>
                          <span className="text-blue-500">W: {u.writes}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
