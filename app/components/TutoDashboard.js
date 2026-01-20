"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Heart, Clock, MapPin, TrendingUp, Users, Briefcase, CheckCircle } from 'lucide-react';

export default function TutoDashboard() {
  const { user, userData } = useAuth();
  const tutoRole = userData?.tutomagisterRole;
  
  const [myDemands, setMyDemands] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [stats, setStats] = useState({
    totalDemands: 0,
    activeDemands: 0,
    totalApplications: 0,
    acceptedApplications: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tutoRole === 'client') {
      fetchClientData();
    } else if (tutoRole === 'caregiver') {
      fetchCaregiverData();
    }
  }, [tutoRole, user]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      // Saját igények lekérése
      const demandsQuery = query(
        collection(db, 'tutoDemands'),
        where('clientId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const demandsSnapshot = await getDocs(demandsQuery);
      const demandsData = demandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setMyDemands(demandsData);
      
      const activeDemands = demandsData.filter(d => d.status === 'open').length;
      
      setStats({
        totalDemands: demandsData.length,
        activeDemands: activeDemands,
        totalApplications: demandsData.reduce((sum, d) => sum + (d.applicants?.length || 0), 0),
        acceptedApplications: 0
      });
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaregiverData = async () => {
    setLoading(true);
    try {
      // Összes igény lekérése, amikre jelentkeztem
      const allDemandsQuery = query(
        collection(db, 'tutoDemands'),
        orderBy('createdAt', 'desc')
      );
      const allDemandsSnapshot = await getDocs(allDemandsQuery);
      const allDemands = allDemandsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Szűrés: amikre én jelentkeztem
      const myApps = allDemands.filter(d => 
        d.applicants?.some(app => app.userId === user.uid)
      );
      
      setMyApplications(myApps);
      
      const acceptedApps = myApps.filter(d => 
        d.applicants?.find(app => app.userId === user.uid && app.status === 'accepted')
      ).length;
      
      setStats({
        totalDemands: allDemands.filter(d => d.status === 'open').length,
        activeDemands: 0,
        totalApplications: myApps.length,
        acceptedApplications: acceptedApps
      });
    } catch (error) {
      console.error('Error fetching caregiver data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 text-rose-500 mx-auto mb-4 animate-pulse" />
        <p className="text-gray-400">Adatok betöltése...</p>
      </div>
    );
  }

  // Megbízói nézet
  if (tutoRole === 'client') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Vezérlőpult - Megbízó 👨‍👩‍👧</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-gray-400 text-sm">Összes Igény</p>
                <p className="text-3xl font-bold text-white">{stats.totalDemands}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-gray-400 text-sm">Aktív Igények</p>
                <p className="text-3xl font-bold text-white">{stats.activeDemands}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-gray-400 text-sm">Jelentkezések</p>
                <p className="text-3xl font-bold text-white">{stats.totalApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Demands List */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-rose-500" />
            Igényeim
          </h3>
          
          {myDemands.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              Még nincs feladott igényed. Menj a Naptár fülre új igény létrehozásához!
            </p>
          ) : (
            <div className="space-y-4">
              {myDemands.map(demand => (
                <div
                  key={demand.id}
                  className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-rose-500 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-lg font-bold text-white">{demand.title}</h4>
                    <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                      demand.status === 'open' 
                        ? 'bg-green-900/50 text-green-200' 
                        : 'bg-gray-700 text-gray-300'
                    }`}>
                      {demand.status === 'open' ? 'Aktív' : 'Lezárt'}
                    </span>
                  </div>
                  
                  <p className="text-gray-300 text-sm mb-3">{demand.description}</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {demand.workSchedule}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {demand.clientCity}
                    </span>
                    {demand.offeredRate && (
                      <span className="text-green-400 font-semibold">
                        {demand.offeredRate} Ft/óra
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-sm text-gray-400">
                      <Users className="w-4 h-4 inline mr-1" />
                      {demand.applicants?.length || 0} jelentkező
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Ápolói nézet
  if (tutoRole === 'caregiver') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white mb-4">Vezérlőpult - Ápoló 🧑‍⚕️</h2>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Briefcase className="w-8 h-8 text-rose-500" />
              <div>
                <p className="text-gray-400 text-sm">Elérhető Igények</p>
                <p className="text-3xl font-bold text-white">{stats.totalDemands}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-gray-400 text-sm">Jelentkezéseim</p>
                <p className="text-3xl font-bold text-white">{stats.totalApplications}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-gray-400 text-sm">Elfogadva</p>
                <p className="text-3xl font-bold text-white">{stats.acceptedApplications}</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Applications List */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-rose-500" />
            Jelentkezéseim
          </h3>
          
          {myApplications.length === 0 ? (
            <p className="text-gray-400 text-center py-6">
              Még nincs jelentkezésed. Menj a Naptár fülre igények böngészéséhez!
            </p>
          ) : (
            <div className="space-y-4">
              {myApplications.map(demand => {
                const myApp = demand.applicants?.find(app => app.userId === user.uid);
                
                return (
                  <div
                    key={demand.id}
                    className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-rose-500 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-bold text-white">{demand.title}</h4>
                      <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                        myApp?.status === 'accepted'
                          ? 'bg-green-900/50 text-green-200'
                          : myApp?.status === 'rejected'
                          ? 'bg-red-900/50 text-red-200'
                          : 'bg-yellow-900/50 text-yellow-200'
                      }`}>
                        {myApp?.status === 'accepted' && '✅ Elfogadva'}
                        {myApp?.status === 'rejected' && '❌ Elutasítva'}
                        {myApp?.status === 'pending' && '⏳ Folyamatban'}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 text-sm mb-3">{demand.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {demand.workSchedule}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {demand.clientCity}
                      </span>
                      {demand.offeredRate && (
                        <span className="text-green-400 font-semibold">
                          {demand.offeredRate} Ft/óra
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
