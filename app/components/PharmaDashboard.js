"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy, updateDoc, doc, addDoc, deleteDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, Search, ChevronDown, ChevronUp, MapPin, Clock, CheckCircle, XCircle, MessageCircle, User, Calendar, Edit2, Trash2 } from 'lucide-react';

export default function PharmaDashboard({ pharmaRole }) {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [myApplications, setMyApplications] = useState([]);
  const [myDemands, setMyDemands] = useState([]);
  const [availableDemands, setAvailableDemands] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDemand, setExpandedDemand] = useState(null);

  useEffect(() => {
    loadData();
  }, [user, pharmaRole]);

  const loadData = async () => {
    if (!user || !pharmaRole) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      if (pharmaRole === 'pharmacy') {
        await loadPharmacyData();
      } else {
        await loadSubstituteData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setMyApplications([]);
      setMyDemands([]);
      setAvailableDemands([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacyData = async () => {
    // Saját igények betöltése
    const demandsRef = collection(db, 'pharmaDemands');
    const demandsQuery = query(
      demandsRef,
      where('pharmacyId', '==', user.uid),
      orderBy('date', 'desc')
    );
    const demandsSnapshot = await getDocs(demandsQuery);
    const demandsData = demandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Jelentkezések betöltése minden igényhez
    const demandsWithApplications = await Promise.all(
      demandsData.map(async (demand) => {
        const applicationsRef = collection(db, 'pharmaApplications');
        const applicationsQuery = query(
          applicationsRef,
          where('demandId', '==', demand.id),
          orderBy('createdAt', 'desc')
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        const applications = applicationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        return { ...demand, applications };
      })
    );

    setMyDemands(demandsWithApplications);
  };

  const loadSubstituteData = async () => {
    // Saját jelentkezések
    const applicationsRef = collection(db, 'pharmaApplications');
    const applicationsQuery = query(
      applicationsRef,
      where('applicantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);
    const applicationsData = applicationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Igények adatainak betöltése
    const applicationsWithDemands = await Promise.all(
      applicationsData.map(async (application) => {
        const demandDoc = await getDocs(query(
          collection(db, 'pharmaDemands'),
          where('__name__', '==', application.demandId)
        ));
        const demand = demandDoc.docs[0]?.data();
        return { ...application, demand };
      })
    );

    setMyApplications(applicationsWithDemands);

    // Elérhető igények
    const demandsRef = collection(db, 'pharmaDemands');
    const demandsQuery = query(
      demandsRef,
      where('status', '==', 'open'),
      where('position', '==', pharmaRole),
      orderBy('date', 'asc')
    );
    const demandsSnapshot = await getDocs(demandsQuery);
    const demandsData = demandsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Szűrés: amelyekre még nem jelentkezett
    const appliedDemandIds = applicationsData.map(app => app.demandId);
    const available = demandsData.filter(d => !appliedDemandIds.includes(d.id));

    setAvailableDemands(available);
  };

  const handleAcceptApplication = async (applicationId, demandId) => {
    if (!confirm('Biztosan elfogadod ezt a jelentkezést?')) return;

    try {
      // Get application details to send notification
      const appDoc = await getDoc(doc(db, 'pharmaApplications', applicationId));
      const appData = appDoc.data();
      
      // Jelentkezés elfogadása
      await updateDoc(doc(db, 'pharmaApplications', applicationId), {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Igény státuszának frissítése
      await updateDoc(doc(db, 'pharmaDemands', demandId), {
        status: 'filled',
        updatedAt: new Date().toISOString(),
      });

      // Send notification to applicant
      await addDoc(collection(db, 'notifications'), {
        userId: appData.applicantId,
        type: 'approval',
        title: 'Pharmagister - Jelentkezés elfogadva! ✅',
        message: `${userData.pharmacyName || userData.displayName} elfogadta a jelentkezésedet.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      alert('Jelentkezés elfogadva!');
      await loadData();
    } catch (error) {
      console.error('Error accepting application:', error);
      alert('Hiba történt az elfogadás során.');
    }
  };

  const handleRejectApplication = async (applicationId) => {
    const reason = prompt('Add meg az elutasítás okát (opcionális):') || 'Betelt pozíció';

    try {
      // Get application details to send notification
      const appDoc = await getDoc(doc(db, 'pharmaApplications', applicationId));
      const appData = appDoc.data();
      
      await updateDoc(doc(db, 'pharmaApplications', applicationId), {
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date().toISOString(),
      });

      // Send notification to applicant
      await addDoc(collection(db, 'notifications'), {
        userId: appData.applicantId,
        type: 'rejection',
        title: 'Pharmagister - Jelentkezés elutasítva',
        message: `${userData.pharmacyName || userData.displayName} elutasította a jelentkezésedet. Indok: ${reason}`,
        read: false,
        createdAt: serverTimestamp(),
      });

      alert('Jelentkezés elutasítva.');
      await loadData();
    } catch (error) {
      console.error('Error rejecting application:', error);
      alert('Hiba történt az elutasítás során.');
    }
  };

  const handleDeleteDemand = async (demandId) => {
    if (!confirm('Biztosan törlöd ezt az igényt? Ez a művelet nem vonható vissza!')) return;

    try {
      // Töröljük az igényhez tartozó jelentkezéseket is
      const applicationsRef = collection(db, 'pharmaApplications');
      const applicationsQuery = query(applicationsRef, where('demandId', '==', demandId));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      // Összes jelentkezés törlése
      await Promise.all(applicationsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
      
      // Igény törlése
      await deleteDoc(doc(db, 'pharmaDemands', demandId));
      
      alert('Igény sikeresen törölve!');
      await loadData();
    } catch (error) {
      console.error('Error deleting demand:', error);
      alert('Hiba történt az igény törlése során.');
    }
  };

  const handleEditDemand = async (demand) => {
    const newDate = prompt('Új dátum (ÉÉÉÉ-HH-NN):', demand.date);
    if (!newDate) return;
    
    const newWorkHours = prompt('Munkaidő:', demand.workHours || '');
    const newHourlyRate = prompt('Órabér (Ft):', demand.hourlyRate || '');
    const newDescription = prompt('Megjegyzés:', demand.description || '');

    try {
      await updateDoc(doc(db, 'pharmaDemands', demand.id), {
        date: newDate,
        workHours: newWorkHours,
        hourlyRate: newHourlyRate,
        description: newDescription,
        updatedAt: new Date().toISOString(),
      });

      alert('Igény sikeresen módosítva!');
      await loadData();
    } catch (error) {
      console.error('Error editing demand:', error);
      alert('Hiba történt az igény módosítása során.');
    }
  };

  const handleApplyToDemand = async (demandId) => {
    if (!userData?.pharmaProfileComplete) {
      alert('Kérlek előbb töltsd ki a profilodat a Profilom fülön!');
      return;
    }

    const message = prompt('Üzenet a gyógyszertárnak (opcionális):');

    try {
      // Get demand details to send notification to pharmacy
      const demandDoc = await getDoc(doc(db, 'pharmaDemands', demandId));
      const demandData = demandDoc.data();
      
      await addDoc(collection(db, 'pharmaApplications'), {
        demandId,
        applicantId: user.uid,
        applicantName: user.displayName || 'Ismeretlen',
        applicantRole: pharmaRole,
        status: 'pending',
        message: message || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Send notification to pharmacy owner
      await addDoc(collection(db, 'notifications'), {
        userId: demandData.pharmacyId,
        type: 'message',
        title: 'Pharmagister - Új jelentkezés',
        message: `${user.displayName || 'Egy gyógyszerész/asszisztens'} jelentkezett az igényedre.`,
        read: false,
        createdAt: serverTimestamp(),
      });

      alert('Jelentkezés sikeresen elküldve!');
      await loadData();
    } catch (error) {
      console.error('Error applying to demand:', error);
      alert('Hiba történt a jelentkezés során.');
    }
  };

  const handleCancelApplication = async (applicationId) => {
    if (!confirm('Biztosan visszavonod a jelentkezésed?')) return;

    try {
      await deleteDoc(doc(db, 'pharmaApplications', applicationId));
      alert('Jelentkezés visszavonva.');
      await loadData();
    } catch (error) {
      console.error('Error canceling application:', error);
      alert('Hiba történt a visszavonás során.');
    }
  };

  const filteredDemands = availableDemands.filter(demand => {
    const searchLower = searchQuery.toLowerCase();
    return (
      demand.pharmacyName?.toLowerCase().includes(searchLower) ||
      demand.pharmacyCity?.toLowerCase().includes(searchLower) ||
      demand.pharmacyZipCode?.includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B46C1]" />
      </div>
    );
  }

  return (
    <div>
      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>Vezérlőpult</h2>

      {pharmaRole === 'pharmacy' ? (
        // Gyógyszertár Dashboard
        <div className="space-y-4">
          <div className={`${darkMode ? 'bg-purple-900/30 border-purple-600' : 'bg-purple-50 border-[#6B46C1]'} border-l-4 p-3 rounded`}>
            <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} text-sm mb-1`}>Meghirdetett Igényeim Kezelése</h3>
            <p className={`text-xs ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
              Itt kezelheted az általad feladott igényeket és a jelentkezőket.
            </p>
          </div>

          {myDemands.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className={`w-10 h-10 mx-auto ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} mb-2`} />
              <p className={`${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} text-sm`}>Még nincs feladott igényed.</p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-[#6B7280]'} mt-1`}>Menj a Naptár fülre és adj fel egy igényt!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myDemands.map(demand => (
                <div key={demand.id} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-[#E5E7EB]'} border-b pb-3 pt-2`}>
                  <div
                    onClick={() => setExpandedDemand(expandedDemand === demand.id ? null : demand.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} text-sm`}>
                            {demand.position === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens'}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            demand.status === 'open' ? (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-700') :
                            demand.status === 'filled' ? (darkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700') :
                            (darkMode ? 'bg-gray-600 text-gray-300' : 'bg-[#F3F4F6] text-[#111827]')
                          }`}>
                            {demand.status === 'open' ? 'Nyitott' :
                             demand.status === 'filled' ? 'Betöltve' : 'Törölve'}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                          {new Date(demand.date).toLocaleDateString('hu-HU', { 
                            year: 'numeric', month: 'long', day: 'numeric' 
                          })}
                          {demand.workHours && ` • ${demand.workHours}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {demand.applications?.length || 0}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDemand(demand);
                          }}
                          className={`p-1 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-[#F3F4F6]'} rounded`}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDemand(demand.id);
                          }}
                          className={`p-1 ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-[#F3F4F6]'} rounded`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600" />
                        </button>
                        {expandedDemand === demand.id ? (
                          <ChevronUp className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`} />
                        ) : (
                          <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`} />
                        )}
                      </div>
                    </div>
                  </div>

                  {expandedDemand === demand.id && (
                    <div className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-[#F9FAFB] border-[#E5E7EB]'} p-3 border-t mt-2 rounded-b-xl`}>
                      {demand.applications?.length > 0 ? (
                        <div className="space-y-2">
                          <h5 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-2 text-sm`}>Jelentkezők:</h5>
                          {demand.applications.filter(app => app.status === 'pending').map(application => (
                            <div key={application.id} className={`${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-[#E5E7EB]'} rounded-lg p-3 border`}>
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1 min-w-0">
                                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} text-sm block truncate`}>{application.applicantName}</span>
                                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                                    {new Date(application.createdAt).toLocaleDateString('hu-HU')}
                                  </p>
                                </div>
                                <span className={`px-2 py-0.5 ${darkMode ? 'bg-yellow-900/50 text-yellow-300' : 'bg-yellow-100 text-yellow-700'} rounded text-xs font-medium whitespace-nowrap ml-2`}>
                                  Függőben
                                </span>
                              </div>
                              {application.message && (
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} mb-2 italic`}>"{application.message}"</p>
                              )}
                              <div className="grid grid-cols-2 gap-1.5">
                                <button 
                                  onClick={() => router.push(`/profil/${application.applicantId}`)}
                                  className={`px-2 py-1.5 text-xs ${darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB]'} rounded transition-colors text-center`}
                                >
                                  Adatlap
                                </button>
                                <button className={`px-2 py-1.5 text-xs ${darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB]'} rounded transition-colors flex items-center justify-center gap-1`}>
                                  <MessageCircle className="w-3 h-3" />
                                  Üzenet
                                </button>
                                <button
                                  onClick={() => handleAcceptApplication(application.id, demand.id)}
                                  className="px-2 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Elfogad
                                </button>
                                <button
                                  onClick={() => handleRejectApplication(application.id)}
                                  className="px-2 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Elutasít
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {demand.applications.filter(app => app.status === 'accepted').map(application => (
                            <div key={application.id} className="bg-green-50/30 border-b border-green-200 pb-3 pt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="font-semibold text-green-900 text-sm truncate">{application.applicantName}</span>
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                      Elfogadva
                                    </span>
                                  </div>
                                  <p className="text-xs text-green-700">
                                    A helyettesítő elérhetőségei láthatók az adatlapján
                                  </p>
                                </div>
                                <button 
                                  onClick={() => router.push(`/profil/${application.applicantId}`)}
                                  className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                >
                                  Adatlap
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#6B7280] text-center py-4">Még nincs jelentkező erre az igényre.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Helyettesítő Dashboard
        <div className="space-y-6">
          {/* Saját jelentkezések */}
          {myApplications.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-semibold text-[#111827] mb-3">Jelentkezéseim</h3>
              <div className="space-y-2">
                {myApplications.map(application => (
                  <div key={application.id} className={`border-b pb-3 pt-2 ${
                    application.status === 'accepted' ? 'bg-green-50/30' :
                    application.status === 'rejected' ? 'bg-red-50/30' :
                    ''
                  }`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-[#111827] text-sm truncate">{application.demand?.pharmacyName}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                            application.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            application.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {application.status === 'accepted' ? 'Elfogadva' :
                             application.status === 'rejected' ? 'Elutasítva' : 'Függőben'}
                          </span>
                        </div>
                        <p className="text-xs text-[#6B7280]">
                          {application.demand?.date && new Date(application.demand.date).toLocaleDateString('hu-HU')}
                          {application.demand?.pharmacyCity && ` • ${application.demand.pharmacyCity}`}
                        </p>
                      </div>
                    </div>
                    
                    {application.status === 'rejected' && application.rejectionReason && (
                      <p className="text-xs text-red-700 mb-2">
                        <strong>Indok:</strong> {application.rejectionReason}
                      </p>
                    )}

                    <div className="flex gap-1.5">
                      <button className="px-2 py-1 text-xs border border-[#E5E7EB] rounded hover:bg-[#F9FAFB]">
                        Részletek
                      </button>
                      <button className="px-2 py-1 text-xs border border-[#E5E7EB] rounded hover:bg-[#F9FAFB] flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" />
                        Üzenet
                      </button>
                      {application.status === 'pending' && (
                        <button
                          onClick={() => handleCancelApplication(application.id)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >
                          Visszavonás
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Elérhető igények keresése */}
          <div>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>Elérhető Igények Keresése</h3>
            
            <div className="mb-4">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Keresés gyógyszertár neve vagy irányítószám alapján..."
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#6B46C1] focus:border-[#6B46C1] ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-[#E5E7EB] text-[#111827]'}`}
                />
              </div>
            </div>

            {filteredDemands.length === 0 ? (
              <div className={`${darkMode ? 'bg-gray-800' : 'bg-[#F9FAFB]'} rounded-lg p-8 text-center`}>
                <Calendar className={`w-12 h-12 mx-auto ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} mb-3`} />
                <p className={`${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                  {searchQuery ? 'Nincs találat a keresési feltételeknek megfelelően.' : 'Jelenleg nincs elérhető igény.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredDemands.map(demand => (
                  <div key={demand.id} className={`border-b pb-3 pt-2 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-[#E5E7EB]'}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold ${darkMode ? 'text-white' : 'text-[#111827]'} mb-1 text-sm`}>{demand.pharmacyName}</h4>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
                          {new Date(demand.date).toLocaleDateString('hu-HU')}
                          {demand.workHours && ` • ${demand.workHours}`}
                          {demand.pharmacyCity && ` • ${demand.pharmacyZipCode && `${demand.pharmacyZipCode} `}${demand.pharmacyCity}`}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleApplyToDemand(demand.id)}
                        className="px-3 py-1.5 bg-[#6B46C1] text-white rounded hover:bg-[#5a3aa3] text-xs font-medium"
                      >
                        Jelentkezem
                      </button>
                      <button className={`px-3 py-1.5 border rounded text-xs font-medium ${darkMode ? 'border-gray-600 text-gray-200 hover:bg-gray-600' : 'border-[#E5E7EB] text-[#111827] hover:bg-[#F9FAFB]'}`}>
                        Részletek
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
