// app/chat/page.js
"use client";

import { useState, useEffect, useRef } from "react"; 
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import ChatBottomNavigation from "@/app/components/ChatBottomNavigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  getDocs,
  serverTimestamp,
  updateDoc, 
  arrayUnion, 
} from "firebase/firestore";

// --- Segédfüggvény az idő formázásához ---
function formatChatTimestamp(date) {
  if (!date) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  if (diff < 24 * 60 * 60 * 1000) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// --- Segédfüggvény a (már aktív) chat partnerek adatainak lekéréséhez ---
async function getChatPartnerDetails(chats, currentUserId) {
  const partnerIds = chats.map(chat => chat.members.find(id => id !== currentUserId));
  const uniquePartnerIds = [...new Set(partnerIds.filter(id => id))];
  const partnerDataMap = new Map();

  for (const id of uniquePartnerIds) {
    try {
      const userDoc = await getDoc(doc(db, "users", id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const name = data.displayName || "Ismeretlen";
        const photoURL = data.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${name.replace(/\s/g, '%20')}`;
        partnerDataMap.set(id, { name, photoURL });
      }
    } catch (error) {
      console.error("Hiba a partner adatainak lekérésekor:", error);
      partnerDataMap.set(id, { name: "Ismeretlen", photoURL: `https://api.dicebear.com/8.x/initials/svg?seed=Ismeretlen` });
    }
  }
  return partnerDataMap;
}

// --- Segédfüggvény: Az összes ISMERŐS adatának lekérése a keresőhöz ---
async function fetchFriendData(friendIds) {
  if (!friendIds || friendIds.length === 0) return [];
  const friendData = [];
  for (const id of friendIds) {
    try {
      const docSnap = await getDoc(doc(db, "users", id));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const name = data.displayName || "Ismeretlen";
        const photoURL = data.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${name.replace(/\s/g, '%20')}`;
        friendData.push({ id, name, photoURL });
      }
    } catch (error) { 
      console.error("Hiba az ismerős adatainak lekérésekor:", error);
    } 
  }
  return friendData.sort((a, b) => a.name.localeCompare(b.name));
}

// =================================================================
// --- "Húzható" Chat Elem Komponens ---
// =================================================================
function SwipeableChatItem({ chat, onArchive, onDelete, onNavigate, isUnread, darkMode, demandInfo }) {
  const x = useMotionValue(0); 
  const itemRef = useRef(null);
  const archiveThreshold = 100;
  const deleteThreshold = -100;
  const swipeVelocity = 500;

  const resetPosition = () => {
    animate(x, 0, { type: "spring", stiffness: 300, damping: 30 });
  };

  const onDragEnd = (event, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > archiveThreshold || velocity > swipeVelocity) {
      // --- JOBBRA HÚZÁS (ARCHIVÁLÁS) ---
      animate(x, itemRef.current.clientWidth * 1.2, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => onArchive(chat.id),
      });
    } else if (offset < deleteThreshold || velocity < -swipeVelocity) {
      // --- BALRA HÚZÁS (TÖRLÉS) ---
      animate(x, -itemRef.current.clientWidth * 1.2, {
        type: "spring",
        stiffness: 300,
        damping: 30,
        onComplete: () => onDelete(chat.id),
      });
    } else {
      resetPosition();
    }
  };

  const bgOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1]);
  const bgColor = useTransform(x, [-100, 0, 100], ["#ef4444", darkMode ? "#111827" : "#ffffff", "#06b6d4"]); // Piros, Fekete/Fehér, Cián
  const iconOpacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.2, 0, 0.2, 1]);
  
  return (
    <div ref={itemRef} className="relative w-full overflow-hidden">
      {/* 1. Háttér (A gombok) */}
      <motion.div
        className="absolute inset-0 flex justify-between items-center px-6"
        style={{ opacity: bgOpacity, backgroundColor: bgColor }}
      >
        {/* Bal oldali (Törlés) ikon */}
        <motion.div style={{ opacity: iconOpacity }} className="text-[#111827]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12.576 0H3.398c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125Z" />
          </svg>
        </motion.div>
        {/* Jobb oldali (Archiválás) ikon */}
        <motion.div style={{ opacity: iconOpacity }} className="text-[#111827]">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </motion.div>
      </motion.div>

      {/* 2. Előtér (A "húzható" elem) */}
      <motion.div
        drag="x" 
        dragConstraints={{ left: 0, right: 0 }} 
        style={{ x }}
        onDragEnd={onDragEnd}
        onClick={(e) => {
          if (x.get() === 0) {
            onNavigate(chat.id);
          } else {
            resetPosition();
          }
        }}
        className={`relative flex items-center p-4 ${darkMode ? 'bg-black hover:bg-gray-900' : 'bg-white hover:bg-gray-50'} cursor-pointer transition duration-200`}
      >
        <div className="relative">
          <Image
            src={chat.otherUserPhotoURL}
            alt={chat.otherUserName}
            width={50}
            height={50}
            className={`rounded-full object-cover mr-4 border-2 ${darkMode ? 'border-gray-700' : 'border-[#E5E7EB]'}`}
            unoptimized
          />
          {isUnread && (
            <div className="absolute top-0 right-3 w-3 h-3 bg-blue-500 rounded-full border-2 border-gray-800"></div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg truncate ${isUnread ? (darkMode ? 'font-bold text-white' : 'font-bold text-[#111827]') : (darkMode ? 'font-semibold text-gray-300' : 'font-semibold text-gray-700')}`}>
            {chat.otherUserName}
          </h2>
          {demandInfo ? (
            <p className={`text-xs truncate ${isUnread ? (darkMode ? 'font-semibold text-gray-400' : 'font-semibold text-[#374151]') : (darkMode ? 'text-gray-500' : 'text-[#6B7280]')}`}>
              {demandInfo}
            </p>
          ) : (
            <p className={`text-sm truncate ${isUnread ? (darkMode ? 'font-semibold text-gray-400' : 'font-semibold text-[#374151]') : (darkMode ? 'text-gray-500' : 'text-[#6B7280]')}`}>
              {chat.lastMessage}
            </p>
          )}
        </div>
        <div className="text-right ml-2 whitespace-nowrap flex flex-col items-end">
          <p className={`text-xs ${isUnread ? 'text-blue-400 font-semibold' : (darkMode ? 'text-gray-500' : 'text-gray-500')}`}>
            {formatChatTimestamp(chat.lastMessageAt)}
          </p>
          {isUnread && (
            <div className="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
          )}
        </div>
      </motion.div>
    </div>
  );
}


// =================================================================
// --- FŐ KOMPONENS: Chat Lista Oldal ---
// =================================================================
export default function ChatListPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  
  const [chats, setChats] = useState([]);
  const [isFetchingChats, setIsFetchingChats] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [friendList, setFriendList] = useState([]); 
  const [isFetchingFriends, setIsFetchingFriends] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [autoStartingChat, setAutoStartingChat] = useState(false);
  const [autoStartUserName, setAutoStartUserName] = useState("");
  const autoStartProcessedRef = useRef(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // Olvasatlan üzenetek számolása
  const unreadMessagesCount = chats.filter(chat => chat.isUnread).length;

  // Load dark mode setting
  useEffect(() => {
    if (!user) return;
    const loadDarkMode = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const isDark = userDoc.data().chatSettings?.darkMode ?? false;
          setDarkMode(isDark);
        }
      } catch (error) {
        console.error("Error loading dark mode:", error);
      }
    };
    loadDarkMode();
  }, [user]); 

  // Apply dark mode to body
  useEffect(() => {
    if (darkMode) {
      document.body.style.backgroundColor = '#000000';
    } else {
      document.body.style.backgroundColor = '';
    }
    
    // Cleanup when leaving page
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [darkMode]); 

  // --- 1. useEffect: Aktív beszélgetések figyelése (JAVÍTOTT LEKÉRDEZÉS) ---
  useEffect(() => {
    if (loading || !user) return;

    // ----- EZ A JAVÍTOTT LEKÉRDEZÉS -----
    // Csak a legalapvetőbb szűrést végezzük itt el (tagja vagyok + rendezés)
    // Az összes többi szűrést (szellem, archivált, törölt) a kliens oldalon végezzük
    const q = query(
      collection(db, "chats"),
      where("members", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );
    // -------------------------------------

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      setIsFetchingChats(true);
      const rawChats = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      // --- JAVÍTOTT: Az újonnan létrehozott (üres) chatek is látszódjanak ---
      const filteredRawChats = rawChats.filter(chat => {
        const isArchived = chat.archivedBy?.includes(user.uid);
        const isDeleted = chat.deletedBy?.includes(user.uid);
        // Szellem chatet (lastMessageSenderId === null) is megtartjuk, ha nincs archiválva/törölve
        return !isArchived && !isDeleted;
      });
      // --- VÉGE: JAVÍTOTT SZŰRÉS ---

      // A partner adatokat már csak a szűrt lista alapján kérjük le
      const partnerDetailsMap = await getChatPartnerDetails(filteredRawChats, user.uid);

      const chatList = filteredRawChats.map(chat => {
        const otherUserId = chat.members.find(id => id !== user.uid);
        const partner = partnerDetailsMap.get(otherUserId) || 
                        { name: "Ismeretlen", photoURL: `https://api.dicebear.com/8.x/initials/svg?seed=Ismeretlen` };
        
        let lastMessagePreview = chat.lastMessage;
        if (chat.lastMessageSenderId === user.uid) {
          lastMessagePreview = `Te: ${chat.lastMessage}`;
        }

        // Ellenőrizzük hogy olvasatlan-e
        const isUnread = chat.lastMessageSenderId && 
                        chat.lastMessageSenderId !== user.uid && 
                        (!chat.readBy || !chat.readBy.includes(user.uid));

        // Pozíció és dátum külön mezőben
        let demandInfo = null;
        if (chat.relatedDemandPosition && chat.relatedDemandDate) {
          const positionLabel = chat.relatedDemandPositionLabel || 
            (chat.relatedDemandPosition === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens');
          const demandDate = new Date(chat.relatedDemandDate);
          const formattedDate = demandDate.toLocaleDateString('hu-HU', { 
            month: '2-digit', 
            day: '2-digit' 
          }).replace('. ', '.');
          demandInfo = `${positionLabel} • ${formattedDate}`;
        }

        return {
          id: chat.id,
          otherUserName: partner.name,
          otherUserPhotoURL: partner.photoURL,
          lastMessage: lastMessagePreview,
          lastMessageAt: chat.lastMessageAt?.toDate(),
          isUnread: isUnread,
          demandInfo: demandInfo,
        };
      });
      
      setChats(chatList);
      setIsFetchingChats(false);
    }, (error) => {
      // Itt már csak akkor lehet hiba, ha a 'members' és 'lastMessageAt' index hiányzik
      console.error("Hiba a chatek figyelésekor (alap index hiba):", error);
      setIsFetchingChats(false);
    });

    return () => unsubscribe();
  }, [user, loading]);

  // --- 2. useEffect: Ismerősök betöltése a keresőhöz ---
  useEffect(() => {
    if (userData && userData.friends && userData.friends.length > 0) {
      setIsFetchingFriends(true);
      fetchFriendData(userData.friends)
        .then(data => {
          setFriendList(data);
        })
        .catch(err => {
          console.error("Hiba az ismerősök betöltésekor:", err);
        })
        .finally(() => {
          setIsFetchingFriends(false);
        });
    } else if (userData) {
      setIsFetchingFriends(false);
    }
  }, [userData]);

  // --- 3. useEffect: Auto-start chat from URL parameter ---
  useEffect(() => {
    if (loading || !user || autoStartProcessedRef.current) return;
    
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('userId');
    
    if (targetUserId && targetUserId !== user.uid) {
      console.log('🚀 Auto-starting chat with userId:', targetUserId);
      autoStartProcessedRef.current = true;
      setAutoStartingChat(true);
      
      const startChat = async () => {
        try {
          // Fetch target user name first for display
          const targetUserDoc = await getDoc(doc(db, 'users', targetUserId));
          if (targetUserDoc.exists()) {
            setAutoStartUserName(targetUserDoc.data().displayName || 'Felhasználó');
          }

          // Először keresünk olyan chat-et ahol mindkét user tag
          const q = query(
            collection(db, "chats"),
            where("members", "array-contains", user.uid)
          );
          const querySnapshot = await getDocs(q);
          
          // Manuálisan szűrjük hogy megtaláljuk azt ahol a target is benne van
          // DE CSAK akkor használjuk, ha egyik fél sem törölte
          let existingChatId = null;
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            const members = data.members;
            if (members.includes(targetUserId)) {
              // Csak akkor használjuk a meglévő chatet, ha egyik fél sem törölte
              const isDeletedByMe = data.deletedBy?.includes(user.uid);
              const isDeletedByOther = data.deletedBy?.includes(targetUserId);
              if (!isDeletedByMe && !isDeletedByOther) {
                existingChatId = doc.id;
              }
            }
          });
          
          if (existingChatId) {
            console.log('✅ Existing chat found:', existingChatId);
            router.push(`/chat/${existingChatId}`);
          } else {
            console.log('📝 Creating new chat...');
            const newChatRef = await addDoc(collection(db, "chats"), {
              members: [user.uid, targetUserId],
              createdAt: serverTimestamp(),
              lastMessage: "Még nincs üzenet.",
              lastMessageAt: serverTimestamp(),
              lastMessageSenderId: null,
              archivedBy: [],
              deletedBy: []
            });
            console.log('✅ New chat created:', newChatRef.id);
            router.push(`/chat/${newChatRef.id}`);
          }
        } catch (error) {
          console.error("❌ Hiba a chat indításakor:", error);
          setAutoStartingChat(false);
          autoStartProcessedRef.current = false;
        }
      };
      
      startChat();
    }
  }, [user, loading, router]); 

  // --- Végleges FUNKCIÓ: Chat indítása ---
  const handleStartChat = async (targetUserId) => {
    if (!user || isCreatingChat) return;
    setIsCreatingChat(true);

    try {
      // Először keresünk olyan chat-et ahol mindkét user tag
      const q = query(
        collection(db, "chats"),
        where("members", "array-contains", user.uid)
      );
      const querySnapshot = await getDocs(q);
      
      // Manuálisan szűrjük hogy megtaláljuk azt ahol a target is benne van
      // DE CSAK akkor használjuk, ha egyik fél sem törölte
      let existingChatId = null;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const members = data.members;
        if (members.includes(targetUserId)) {
          // Csak akkor használjuk a meglévő chatet, ha egyik fél sem törölte
          const isDeletedByMe = data.deletedBy?.includes(user.uid);
          const isDeletedByOther = data.deletedBy?.includes(targetUserId);
          if (!isDeletedByMe && !isDeletedByOther) {
            existingChatId = doc.id;
          }
        }
      });
      
      if (existingChatId) {
        console.log('✅ Existing chat found:', existingChatId);
        router.push(`/chat/${existingChatId}`);
      } else {
        console.log('📝 Creating new chat with:', targetUserId);
        const newChatRef = await addDoc(collection(db, "chats"), {
          members: [user.uid, targetUserId],
          createdAt: serverTimestamp(),
          lastMessage: "Még nincs üzenet.",
          lastMessageAt: serverTimestamp(),
          lastMessageSenderId: null,
          archivedBy: [],
          deletedBy: [] 
        });
        console.log('✅ New chat created:', newChatRef.id);
        router.push(`/chat/${newChatRef.id}`);
      }
    } catch (error) {
      console.error("❌ Hiba a chat indításakor:", error);
    } finally {
      setIsCreatingChat(false);
    }
  };

  // --- KERESÉSI FUNKCIÓ ---
  const handleSearch = async (term) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setMessageSearchResults([]);
      return;
    }

    // Üzenet keresés a beszélgetésekben
    const results = [];
    for (const chat of chats) {
      try {
        const messagesRef = collection(db, "chats", chat.id, "messages");
        const q = query(messagesRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        
        snapshot.forEach((doc) => {
          const msg = doc.data();
          if (msg.text && msg.text.toLowerCase().includes(term.toLowerCase())) {
            // Szavakra bontás és kontextus kivonása
            const words = msg.text.split(/\s+/);
            const searchWords = term.toLowerCase().split(/\s+/);
            
            // Megkeressük a match pozícióját
            let matchIndex = -1;
            for (let i = 0; i < words.length; i++) {
              if (words[i].toLowerCase().includes(searchWords[0].toLowerCase())) {
                matchIndex = i;
                break;
              }
            }
            
            if (matchIndex !== -1) {
              // 2 szó előtte és 2 szó utána
              const start = Math.max(0, matchIndex - 2);
              const end = Math.min(words.length, matchIndex + 3);
              const context = words.slice(start, end).join(' ');
              
              results.push({
                chatId: chat.id,
                chatName: chat.otherUserName,
                chatPhoto: chat.otherUserPhotoURL,
                messageId: doc.id,
                messageText: msg.text,
                context: context,
                timestamp: msg.createdAt?.toDate()
              });
            }
          }
        });
      } catch (error) {
        console.error("Error searching messages:", error);
      }
    }
    
    setMessageSearchResults(results);
  };

  // --- FUNKCIÓK A SWIPE-HOZ ---
  const handleArchive = async (chatId) => {
    if (!user) return;
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    try {
      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        archivedBy: arrayUnion(user.uid) 
      });
    } catch (error) {
      console.error("Hiba az archiváláskor:", error);
    }
  };

  const handleDelete = async (chatId) => {
    if (!user) return;
    setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
    try {
      const chatDocRef = doc(db, "chats", chatId);
      // Tároljuk a törlés időpontját is
      await updateDoc(chatDocRef, {
        deletedBy: arrayUnion(user.uid),
        [`deletedAt.${user.uid}`]: serverTimestamp() // Időpont amikor törölte
      });
    } catch (error) {
      console.error("Hiba a (soft) törléskor:", error);
    }
  };

  const handleNavigate = (chatId) => {
    router.push(`/chat/${chatId}`);
  };

  // Szűrt ismerősök lista
  const filteredFriends = searchTerm
    ? friendList.filter(friend => 
        friend.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Szűrt chatok lista - beszélgetések neve alapján
  const filteredChats = searchTerm && messageSearchResults.length === 0
    ? chats.filter(chat => 
        chat.otherUserName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : chats;

  // Check if user is Basic status - Basic users cannot access PM
  if (!loading && userData && userData.status === 'Basic') {
    return (
      <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4 pb-40">
        <div className="max-w-md w-full text-center bg-white border-2 border-red-500 rounded-2xl p-8">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
          <h2 className="text-2xl font-bold text-[#111827] mb-4">Privát üzenetek letiltva</h2>
          <p className="text-[#374151] mb-6">
            Basic státuszú felhasználóknak nincs hozzáférése a privát üzenetekhez.
            Várj a jóváhagyásra Full Tag státuszhoz.
          </p>
        </div>
      </main>
    );
  }

  // Betöltés
  const pageLoading = loading || isFetchingChats || !userData || isFetchingFriends;
  if (pageLoading && !chats.length) { 
    return (
      <main className="min-h-screen bg-[#F9FAFB] flex items-center justify-center pb-40">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl text-[#374151]">Beszélgetések betöltése...</p>
        </div>
      </main>
    );
  }

  // --- KÉPERNYŐ TARTALOM ---
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-black text-white' : 'bg-[#F9FAFB] text-[#111827]'} pb-40`}>
      <main className="flex-grow w-full">
        <div className="max-w-4xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-[#111827]'}`}>
            Üzenetek
          </h1>
        </div>
        
        {/* Auto-start loading overlay */}
        {autoStartingChat && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-purple-500 rounded-2xl p-8 shadow-2xl max-w-md mx-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h3 className="text-2xl font-bold text-[#111827] mb-2 text-center">
                Beszélgetés indítása
              </h3>
              <p className="text-[#374151] text-center">
                {autoStartUserName ? `${autoStartUserName}-val/vel...` : 'Betöltés...'}
              </p>
            </div>
          </div>
        )}
        
        {/* --- Univerzális kereső --- */}
        <div className="mb-6 px-4">
          <input
            type="text"
            placeholder="Keresés..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className={`w-full p-4 ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-[#E5E7EB] text-[#111827]'} border-2 rounded-2xl placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all`}
          />
        </div>

        {/* --- Keresési eredmények --- */}
        {searchTerm && (
          <div className={`mb-6 mx-4 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-[#E5E7EB]'} border-2 rounded-2xl overflow-hidden shadow-xl`}>
            
            {/* Ismerősök találatok */}
            {filteredFriends.length > 0 && (
              <>
                <h3 className={`p-4 text-sm font-semibold ${darkMode ? 'text-gray-400 border-gray-700' : 'text-[#6B7280] border-[#E5E7EB]'} border-b`}>
                  Ismerősök
                </h3>
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`} style={{ opacity: isCreatingChat ? 0.5 : 1 }}>
                  {filteredFriends.map(friend => (
                    <div
                      key={friend.id}
                      onClick={() => !isCreatingChat && handleStartChat(friend.id)}
                      className={`flex items-center p-4 cursor-pointer ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition duration-200`}
                    >
                      <Image 
                        src={friend.photoURL} 
                        alt={friend.name} 
                        width={40} 
                        height={40} 
                        className="rounded-full object-cover mr-3" 
                        unoptimized 
                      />
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{friend.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Üzenet találatok */}
            {messageSearchResults.length > 0 && (
              <>
                <h3 className={`p-4 text-sm font-semibold ${darkMode ? 'text-gray-400 border-gray-700' : 'text-[#6B7280] border-[#E5E7EB]'} border-b ${filteredFriends.length > 0 ? 'border-t' : ''}`}>
                  Üzenetek ({messageSearchResults.length})
                </h3>
                <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                  {messageSearchResults.map((result, index) => (
                    <div
                      key={index}
                      onClick={() => router.push(`/chat/${result.chatId}?highlightMessage=${result.messageId}`)}
                      className={`p-4 cursor-pointer ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} transition duration-200`}
                    >
                      <div className="flex items-start gap-3">
                        <Image 
                          src={result.chatPhoto} 
                          alt={result.chatName} 
                          width={40} 
                          height={40} 
                          className="rounded-full object-cover" 
                          unoptimized 
                        />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-1`}>{result.chatName}</p>
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} line-clamp-2`}>
                            ...{result.context}...
                          </p>
                          {result.timestamp && (
                            <p className="text-xs text-gray-500 mt-1">
                              {result.timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' })} {result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Nincs találat */}
            {filteredFriends.length === 0 && messageSearchResults.length === 0 && (
              <p className={`p-4 text-sm ${darkMode ? 'text-gray-400' : 'text-[#6B7280]'} text-center`}>Nincs találat.</p>
            )}
          </div>
        )}

        {/* --- MÓDOSÍTOTT CHAT LISTA (SWIPE FUNKCIÓVAL) --- */}
        {!searchTerm && filteredChats.length > 0 ? (
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} overflow-hidden`}>
            {/* A "divide-y" a szülőre került, mert a SwipeableChatItem a közvetlen gyerek */}
            <div className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredChats.map((chat) => (
                <SwipeableChatItem
                  key={chat.id}
                  chat={chat}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                  isUnread={chat.isUnread}
                  darkMode={darkMode}
                  demandInfo={chat.demandInfo}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-[#111827]'} p-8 text-center`}>
            <svg className={`w-16 h-16 ${darkMode ? 'text-gray-500' : 'text-gray-600'} mx-auto mb-4`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className={`${darkMode ? 'text-white' : 'text-[#111827]'} font-semibold text-lg mb-2`}>
              Nincsenek aktív beszélgetéseid
            </p>
            <p className={`${darkMode ? 'text-gray-400' : 'text-[#6B7280]'}`}>
              Keress rá egy ismerősödre fentebb a chat indításához!
            </p> 
          </div>
        )}
        </div>
      </main>

      {/* Hamburger menü overlay és panel */}
      {isMenuOpen && (
        <>
          {/* Teljes képernyős menü panel */}
          <div className={`fixed inset-0 ${darkMode ? 'bg-gray-900' : 'bg-white'} z-50`}>
            {/* Menü fejléc */}
            <div className={`p-6 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between mb-2">
                <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Menü</h2>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Profil - egyszerű megjelenítés kártya nélkül */}
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                {userData?.photoURL && (
                  <Image
                    src={userData.photoURL}
                    alt={userData.displayName || "Profil"}
                    width={48}
                    height={48}
                    className="rounded-full"
                    unoptimized
                  />
                )}
                <div className="flex-1">
                  <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{userData?.displayName || "Felhasználó"}</p>
                </div>
              </div>
            </div>

            {/* Menüpontok */}
            <div className="p-4 space-y-2">
              {/* Beállítások */}
              <button
                onClick={() => {
                  router.push('/chat/settings');
                }}
                className={`w-full flex items-center gap-4 p-4 text-left ${darkMode ? 'text-white bg-gray-800 hover:bg-gray-700' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                </svg>
                <span className="flex-1">Beállítások</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Csoportos chat létrehozása */}
              <button
                onClick={() => {
                  // TODO: Implementálni később
                  alert('Csoportos chat funkció hamarosan!');
                  setIsMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 p-4 text-left ${darkMode ? 'text-white bg-gray-800 hover:bg-gray-700' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                </svg>
                <span className="flex-1">Csoportos chat létrehozása</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/*Archivált üzenetek */}
              <button
                onClick={() => {
                  router.push('/chat/archive');
                }}
                className={`w-full flex items-center gap-4 p-4 text-left ${darkMode ? 'text-white bg-gray-800 hover:bg-gray-700' : 'text-gray-900 bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
                <span className="flex-1">Archivált üzenetek</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Padding a bottom navbar-hoz */}
      <div className="h-20"></div>

      {/* Chat specifikus bottom navigation */}
      <ChatBottomNavigation 
        isVisible={true} 
        onMenuOpen={() => setIsMenuOpen(true)} 
      />
    </div>
  );
}
