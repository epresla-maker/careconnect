"use client";
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useRouter, useParams } from 'next/navigation';
import RouteGuard from '@/app/components/RouteGuard';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotificationWithPush } from '@/lib/notifications';
import { MessageCircle, Send, X } from 'lucide-react';

export default function DemandDetailPage() {
  const { user, userData } = useAuth();
  const { darkMode } = useTheme();
  const router = useRouter();
  const params = useParams();
  const demandId = params.id;

  const [demand, setDemand] = useState(null);
  const [pharmacyData, setPharmacyData] = useState(null);
  const [myApplication, setMyApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [error, setError] = useState(null);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchDemand = async () => {
      if (!demandId) return;
      
      try {
        setLoading(true);
        const demandRef = doc(db, 'pharmaDemands', demandId);
        const demandSnap = await getDoc(demandRef);

        if (demandSnap.exists()) {
          const demandData = { id: demandSnap.id, ...demandSnap.data() };
          setDemand(demandData);
          
          // Check if user already applied
          if (user && demandData.applicants?.some(a => a.userId === user.uid)) {
            setHasApplied(true);
          }

          // Fetch pharmacy data
          if (demandData.pharmacyId) {
            const pharmacyRef = doc(db, 'users', demandData.pharmacyId);
            const pharmacySnap = await getDoc(pharmacyRef);
            if (pharmacySnap.exists()) {
              setPharmacyData(pharmacySnap.data());
            }
          }

          // Check user's application status in pharmaApplications collection
          if (user) {
            const appQuery = query(
              collection(db, 'pharmaApplications'),
              where('demandId', '==', demandId),
              where('applicantId', '==', user.uid)
            );
            const appSnapshot = await getDocs(appQuery);
            if (!appSnapshot.empty) {
              const appData = { id: appSnapshot.docs[0].id, ...appSnapshot.docs[0].data() };
              setMyApplication(appData);
              setHasApplied(true);
            }
          }
        } else {
          setError('Az igény nem található.');
        }
      } catch (err) {
        console.error('Error fetching demand:', err);
        setError('Hiba történt az igény betöltésekor.');
      } finally {
        setLoading(false);
      }
    };

    fetchDemand();
  }, [demandId, user]);

  const handleApply = async () => {
    if (!user || !userData) {
      router.push('/login');
      return;
    }

    // Check if user has pharmagister role
    if (!userData.pharmagisterRole || userData.pharmagisterRole === 'pharmacy') {
      alert('Csak gyógyszerészek és szakasszisztensek jelentkezhetnek!');
      return;
    }

    // Check if profile is approved
    if (userData.pharmaPendingApproval && !userData.pharmaProfileComplete) {
      alert('A profilod még jóváhagyásra vár. Amíg az admin nem ellenőrzi az NNK számodat, nem tudsz jelentkezni.');
      return;
    }

    // Check if user's role matches the demand position
    const userRole = userData.pharmagisterRole; // 'pharmacist' or 'assistant'
    const demandPosition = demand.position; // 'pharmacist' or 'assistant'
    
    console.log('🔍 Szerepkör ellenőrzés:', {
      userRole,
      demandPosition,
      matches: userRole === demandPosition
    });
    
    if (userRole !== demandPosition) {
      const userRoleLabel = userRole === 'pharmacist' ? 'gyógyszerész' : 'szakasszisztens';
      const demandPositionLabel = demandPosition === 'pharmacist' ? 'gyógyszerész' : 'szakasszisztens';
      console.log('❌ Szerepkör nem egyezik! User:', userRoleLabel, '| Demand:', demandPositionLabel);
      alert(`Erre az igényre csak ${demandPositionLabel}ek jelentkezhetnek. Te ${userRoleLabel}ként vagy regisztrálva.`);
      return;
    }
    
    console.log('✅ Szerepkör egyezik, folytatás...');

    try {
      setApplying(true);

      const applicantData = {
        applicantId: user.uid,
        userId: user.uid,
        displayName: userData.displayName || 'Névtelen',
        photoURL: userData.photoURL || null,
        pharmagisterRole: userData.pharmagisterRole,
        email: userData.email,
        phone: userData.pharmaPhone || userData.phone || null,
        experience: userData.pharmaYearsOfExperience || null,
        hourlyRate: userData.pharmaHourlyRate || null,
        software: userData.pharmaSoftwareKnowledge || [],
        bio: userData.pharmaBio || '',
        appliedAt: Timestamp.now(),
        status: 'pending' // pending, accepted, rejected
      };

      // 1. Mentés az igény documentbe (gyors olvasáshoz)
      const demandRef = doc(db, 'pharmaDemands', demandId);
      await updateDoc(demandRef, {
        applicants: arrayUnion(applicantData)
      });

      // 2. Külön document létrehozása a pharmaApplications collection-ben (kezeléshez)
      await addDoc(collection(db, 'pharmaApplications'), {
        demandId: demandId,
        pharmacyId: demand.pharmacyId,
        applicantId: user.uid,
        displayName: userData.displayName || 'Névtelen',
        photoURL: userData.photoURL || null,
        pharmagisterRole: userData.pharmagisterRole,
        email: userData.email,
        phone: userData.pharmaPhone || userData.phone || null,
        experience: userData.pharmaYearsOfExperience || null,
        hourlyRate: userData.pharmaHourlyRate || null,
        software: userData.pharmaSoftwareKnowledge || [],
        bio: userData.pharmaBio || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 3. Értesítés küldése gyógyszertárnak push-sal
      console.log('📧 Értesítés küldése gyógyszertárnak:', {
        pharmacyId: demand.pharmacyId,
        demandDate: demand.date,
        applicantName: userData.displayName
      });
      
      await createNotificationWithPush({
        userId: demand.pharmacyId,
        type: 'pharma_application',
        title: 'Új jelentkező! 📝',
        message: `${userData.displayName || 'Valaki'} jelentkezett a ${new Date(demand.date).toLocaleDateString('hu-HU')}-i helyettesítésre.`,
        data: {
          demandId: demandId,
          applicantId: user.uid,
        },
        url: `/pharmagister?tab=dashboard&expand=${demandId}`
      });
      
      console.log('✅ Értesítés sikeresen létrehozva!');

      setHasApplied(true);
      alert('Sikeres jelentkezés! A gyógyszertár hamarosan értesítést kap és felveszi veled a kapcsolatot.');

    } catch (err) {
      console.error('Error applying:', err);
      alert('Hiba történt a jelentkezés során. Kérjük, próbáld újra.');
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
        if (chatData.members.includes(demand.pharmacyId) && chatData.relatedDemandId === demandId) {
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
            [demand.pharmacyId]: pharmacyData?.pharmaPhotoURL || pharmacyData?.photoURL || null
          },
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: messageText.trim(),
          relatedDemandId: demandId,
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
        relatedDemandId: demandId,
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

  if (loading) {
    return (
      <RouteGuard>
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      </RouteGuard>
    );
  }

  if (error || !demand) {
    return (
      <RouteGuard>
        <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4`}>
          <div className="max-w-lg mx-auto pt-20 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-xl font-bold mb-2">{error || 'Hiba történt'}</h1>
            <button
              onClick={() => router.back()}
              className="mt-4 text-green-600 hover:text-green-700 font-medium"
            >
              ← Vissza
            </button>
          </div>
        </div>
      </RouteGuard>
    );
  }

  const positionLabels = {
    pharmacist: 'Gyógyszerész',
    assistant: 'Szakasszisztens'
  };

  const getMonogram = (name) => {
    if (!name) return '?';
    const words = name.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isOwnDemand = user?.uid === demand.pharmacyId;
  const isPendingApproval = userData?.pharmaPendingApproval && !userData?.pharmaProfileComplete;
  const roleMatches = userData?.pharmagisterRole === demand.position;
  const canApply = userData?.pharmagisterRole && 
                   userData.pharmagisterRole !== 'pharmacy' &&
                   !isOwnDemand &&
                   demand.status === 'open' &&
                   roleMatches &&
                   !isPendingApproval;
  
  // Debug log
  console.log('🔍 Demand Detail Debug:', {
    isOwnDemand,
    userUid: user?.uid,
    pharmacyId: demand.pharmacyId,
    userRole: userData?.pharmagisterRole,
    demandPosition: demand.position,
    roleMatches,
    canApply,
    isPendingApproval,
    pharmaProfileComplete: userData?.pharmaProfileComplete,
    hasUser: !!user
  });

  // Show buttons for any logged-in user (always show if user exists)
  const showBottomButtons = !!user;

  return (
    <RouteGuard>
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} pb-24`}>
        {/* Header */}
        <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b sticky top-0 z-10`}>
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold">Helyettesítési igény</h1>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4">
          {/* Application Status Banner */}
          {myApplication && (
            <div className={`p-4 rounded-xl border ${
              myApplication.status === 'accepted' 
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
                : myApplication.status === 'rejected'
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {myApplication.status === 'accepted' ? '✅' : myApplication.status === 'rejected' ? '❌' : '⏳'}
                </span>
                <div className="flex-1">
                  <h3 className={`font-semibold ${
                    myApplication.status === 'accepted' 
                      ? 'text-green-800 dark:text-green-300' 
                      : myApplication.status === 'rejected'
                      ? 'text-red-800 dark:text-red-300'
                      : 'text-yellow-800 dark:text-yellow-300'
                  }`}>
                    {myApplication.status === 'accepted' 
                      ? 'Jelentkezésed elfogadva!' 
                      : myApplication.status === 'rejected'
                      ? 'Jelentkezésed elutasítva'
                      : 'Jelentkezésed elbírálás alatt'}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    myApplication.status === 'accepted' 
                      ? 'text-green-700 dark:text-green-400' 
                      : myApplication.status === 'rejected'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {myApplication.status === 'accepted' 
                      ? 'A gyógyszertár elfogadta a jelentkezésedet. Az elérhetőségeik lent találhatók!' 
                      : myApplication.status === 'rejected'
                      ? `Indok: ${myApplication.rejectionReason || 'Nincs megadva'}`
                      : 'A gyógyszertár hamarosan válaszol a jelentkezésedre.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Pharmacy Info Card */}
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl overflow-hidden`}>
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                {pharmacyData?.photoURL ? (
                  <img 
                    src={pharmacyData.photoURL} 
                    alt={demand.pharmacyName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-green-600"
                  />
                ) : (
                  <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center border-2 border-green-700">
                    <span className="text-white font-bold text-xl">
                      {getMonogram(demand.pharmacyName)}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="font-bold text-lg">{demand.pharmacyName}</h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {demand.pharmacyFullAddress || `${demand.pharmacyZipCode || ''} ${demand.pharmacyCity || ''}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Demand Status Badge */}
            <div className="px-4 pt-4">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                demand.status === 'open' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : demand.status === 'filled'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
              }`}>
                {demand.status === 'open' ? '🟢 Aktív' : demand.status === 'filled' ? '✅ Betöltve' : '⚪ Lezárva'}
              </span>
            </div>

            {/* Details */}
            <div className="p-4 space-y-4">
              <h3 className="font-semibold text-lg">
                {positionLabels[demand.position] || demand.position} helyettesítés
              </h3>

              <div className={`space-y-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Dátum</p>
                    <p className="font-medium">
                      {new Date(demand.date).toLocaleDateString('hu-HU', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </p>
                  </div>
                </div>

                {demand.workHours && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Munkaidő</p>
                      <p className="font-medium">{demand.workHours}</p>
                    </div>
                  </div>
                )}

                {demand.minExperience && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl">📊</span>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Elvárt tapasztalat</p>
                      <p className="font-medium">{demand.minExperience}</p>
                    </div>
                  </div>
                )}

                {demand.maxHourlyRate && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl">💰</span>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Maximum órabér</p>
                      <p className="font-medium">{demand.maxHourlyRate} Ft/óra</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Required Software */}
              {demand.requiredSoftware && demand.requiredSoftware.length > 0 && (
                <div className="pt-2">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    Elvárt szoftverismeret:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {demand.requiredSoftware.map((software, idx) => (
                      <span 
                        key={idx} 
                        className={`${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'} px-3 py-1 rounded-full text-sm`}
                      >
                        {software}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Requirements */}
              {demand.additionalRequirements && (
                <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mb-2`}>
                    További információk:
                  </p>
                  <p className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {demand.additionalRequirements}
                  </p>
                </div>
              )}

              {/* ACTION BUTTONS - Inside the card */}
              {user && (
                <div className={`mt-6 pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex gap-3`}>
                  <button
                    onClick={handleApply}
                    disabled={applying || hasApplied || !canApply}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 ${
                      hasApplied 
                        ? 'bg-green-100 text-green-700 cursor-default'
                        : canApply
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {applying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Jelentkezés...</span>
                      </>
                    ) : hasApplied ? (
                      <span>✅ Már jelentkeztél</span>
                    ) : (
                      <span>Jelentkezem</span>
                    )}
                  </button>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Üzenet
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Pharmacy Contact Details - Show only if application accepted */}
          {myApplication?.status === 'accepted' && pharmacyData && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-6`}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span>📞</span>
                Gyógyszertár elérhetőségei
              </h3>
              
              <div className="space-y-4">
                {pharmacyData.pharmacyPhone && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl">📱</span>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Telefon</p>
                      <a href={`tel:${pharmacyData.pharmacyPhone}`} className="font-semibold text-purple-600 hover:underline">
                        {pharmacyData.pharmacyPhone}
                      </a>
                    </div>
                  </div>
                )}

                {pharmacyData.email && (
                  <div className="flex items-center gap-3 py-3 border-b border-gray-200 dark:border-gray-700">
                    <span className="text-2xl">📧</span>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                      <a href={`mailto:${pharmacyData.email}`} className="font-semibold text-purple-600 hover:underline">
                        {pharmacyData.email}
                      </a>
                    </div>
                  </div>
                )}

                {pharmacyData.pharmacyNKK && (
                  <div className="flex items-center gap-3 py-3">
                    <span className="text-2xl">🏥</span>
                    <div className="flex-1">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>NKK szám</p>
                      <p className="font-semibold">{pharmacyData.pharmacyNKK}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-green-900/20' : 'bg-green-50'}`}>
                <p className={`text-sm ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                  💡 <strong>Tipp:</strong> Vedd fel a kapcsolatot a gyógyszertárral mielőbb, hogy megbeszéljétek a részleteket!
                </p>
              </div>
            </div>
          )}

          {/* Applicants count for pharmacy owners */}
          {isOwnDemand && demand.applicants && demand.applicants.length > 0 && (
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-4`}>
              <h3 className="font-semibold mb-3">
                Jelentkezők ({demand.applicants.length})
              </h3>
              <div className="space-y-3">
                {demand.applicants.map((applicant, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-3 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
                  >
                    {applicant.photoURL ? (
                      <img 
                        src={applicant.photoURL} 
                        alt={applicant.displayName}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                          {getMonogram(applicant.displayName)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{applicant.displayName}</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {applicant.pharmagisterRole === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens'}
                        {applicant.experience && ` • ${applicant.experience}`}
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${applicant.userId}`)}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Profil →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Fixed Bottom Buttons */}
        {showBottomButtons && (
          <div className={`fixed bottom-0 left-0 right-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t p-4`}>
            <div className="max-w-lg mx-auto">
              {hasApplied ? (
                <div className="flex gap-3">
                  <div className="flex-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-xl p-3 text-center text-sm">
                    ✅ Már jelentkeztél
                  </div>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Üzenet
                  </button>
                </div>
              ) : isPendingApproval ? (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-xl p-4 text-center">
                  <span className="text-xl mr-2">⏳</span>
                  A profilod még jóváhagyásra vár. Amíg az admin nem ellenőrzi az NNK számodat, nem tudsz jelentkezni.
                </div>
              ) : !roleMatches && userData?.pharmagisterRole && userData.pharmagisterRole !== 'pharmacy' ? (
                <div className="flex gap-3">
                  <div className={`flex-1 ${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded-xl p-3 text-center text-sm`}>
                    🚫 Csak {demand.position === 'pharmacist' ? 'gyógyszerészek' : 'szakasszisztensek'} jelentkezhetnek
                  </div>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Üzenet
                  </button>
                </div>
              ) : canApply ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleApply}
                    disabled={applying}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {applying ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Jelentkezés...</span>
                      </>
                    ) : (
                      <>
                        <span>📝</span>
                        <span>Jelentkezem</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Üzenet
                  </button>
                </div>
              ) : demand.status !== 'open' ? (
                <div className={`${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'} rounded-xl p-4 text-center`}>
                  Ez az igény már nem aktív
                </div>
              ) : (
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/pharmagister/setup')}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold py-3 px-4 rounded-xl"
                  >
                    Regisztrálj a Pharmagisterbe
                  </button>
                  <button
                    onClick={() => setShowMessageModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-[#6B46C1] hover:bg-[#5a3aa3] text-white font-semibold rounded-xl transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    Üzenet
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Message Modal */}
        {showMessageModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className={`w-full max-w-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-t-2xl sm:rounded-2xl p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Üzenet küldése - {demand.pharmacyName}
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
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
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
    </RouteGuard>
  );
}
