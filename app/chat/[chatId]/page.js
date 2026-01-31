// app/chat/[chatId]/page.js
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  onSnapshot,
  orderBy,   
  addDoc,    
  serverTimestamp, 
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteDoc,
  where
} from "firebase/firestore";

// --- Segédfüggvény az üzenetek időbélyegének formázásához ---
function formatMessageTimestamp(date) {
  if (!date) return "";
  const now = new Date();
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (msgDateOnly.getTime() === today.getTime()) {
    return time;
  }
  if (msgDateOnly.getTime() === yesterday.getTime()) {
    return `Tegnap, ${time}`;
  }
  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

// --- Segédfüggvény utoljára elérhető időpont formázásához ---
function formatLastSeen(date) {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // másodpercekben
  
  if (diff < 60) return "most";
  if (diff < 3600) return `${Math.floor(diff / 60)} perce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} órája`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} napja`;
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}


export default function ChatRoomPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams(); 
  const { chatId } = params;
  const searchParams = useSearchParams();
  const highlightMessageId = searchParams.get('highlightMessage');

  const [messages, setMessages] = useState([]); 
  const [newMessage, setNewMessage] = useState(""); 
  const [isLoading, setIsLoading] = useState(true); 
  // Dark mode - azonnal betöltjük localStorage-ból, hogy ne villanjon
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatDarkMode') === 'true';
    }
    return true; // Alapértelmezett: sötét mód a bevillanás elkerülésére
  });
  const [darkModeLoaded, setDarkModeLoaded] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(highlightMessageId);
  
  const [partnerData, setPartnerData] = useState({ name: "Betöltés...", photoURL: "" });
  const [firstMessageAt, setFirstMessageAt] = useState(null);
  const [chatDemandInfo, setChatDemandInfo] = useState(null); // { position, date } 

  // --- ÚJ ÁLLAPOTOK A GÉPELÉSJELZŐHÖZ ---
  const [partnerId, setPartnerId] = useState(null); // Ki a partner?
  const [isPartnerTyping, setIsPartnerTyping] = useState(false); // Gépel a partner?
  const typingTimeoutRef = useRef(null); // Időzítő a gépelés abbahagyásához
  
  // --- ONLINE STÁTUSZ ÁLLAPOTOK ---
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const [isPartnerOnline, setIsPartnerOnline] = useState(false);
  
  // --- REAKCIÓ ÁLLAPOTOK ---
  const [showReactionPicker, setShowReactionPicker] = useState(null); // messageId vagy null
  const [longPressTimer, setLongPressTimer] = useState(null);
  
  // --- SCROLL TO BOTTOM GOMB ---
  const [showScrollButton, setShowScrollButton] = useState(false);
  
  // --- ÜZENET SZERKESZTÉS ÉS TÖRLÉS ---
  const [showMessageMenu, setShowMessageMenu] = useState(null); // messageId vagy null
  const [editingMessage, setEditingMessage] = useState(null); // { id, text }
  const [editText, setEditText] = useState('');
  const [highlightedMessage, setHighlightedMessage] = useState(null); // Az éppen kiválasztott üzenet ID-ja
  const [replyTo, setReplyTo] = useState(null); // { id, text, senderId, senderName } - Az üzenet amire válaszolunk
  const [selectedMessageData, setSelectedMessageData] = useState(null); // A kiválasztott üzenet teljes adatai a popup-hoz
  

  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const justSentMessageRef = useRef(false); // Követjük hogy mi küldtünk-e épp üzenetet
  const formRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const headerRef = useRef(null);
  
  // --- FEJLÉC MAGASSÁG DINAMIKUS KÖVETÉSE ---
  const [headerHeight, setHeaderHeight] = useState(110);
  
  // Automatikus görgetés
  const scrollToBottom = (options = { behavior: "smooth" }) => {
    messagesEndRef.current?.scrollIntoView(options);
  };
  
  // --- FEJLÉC MAGASSÁG FIGYELÉSE ---
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height;
        setHeaderHeight(height);
      }
    };
    
    // Kezdeti mérés
    updateHeaderHeight();
    
    // ResizeObserver a dinamikus változások követéséhez
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }
    
    // Window resize figyelése is
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);
  
  // Scroll pozíció figyelése - scroll to bottom gomb megjelenítéséhez
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      setShowScrollButton(distanceFromBottom > 150);
    };
    
    // Azonnal ellenőrizzük a kezdő pozíciót
    handleScroll();
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [messages]); // messages dependency hozzáadva

  // Load dark mode setting
  useEffect(() => {
    if (!user) return;
    const loadDarkMode = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const isDark = userDoc.data().chatSettings?.darkMode ?? true;
          setDarkMode(isDark);
          // Mentsük localStorage-ba a következő betöltéshez
          localStorage.setItem('chatDarkMode', isDark.toString());
        }
        setDarkModeLoaded(true);
      } catch (error) {
        console.error("Error loading dark mode:", error);
        setDarkModeLoaded(true);
      }
    };
    loadDarkMode();
  }, [user]);

  // Apply dark mode to body - azonnal alkalmazzuk
  useEffect(() => {
    // Azonnal állítsuk be a háttérszínt
    document.body.style.backgroundColor = darkMode ? '#f0f5f0' : '';
    
    // Cleanup when leaving page
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [darkMode]);

  // --- FŐ useEffect: Adatok betöltése és FIGYELŐK ---
  useEffect(() => {
    if (loading || !user || !chatId) {
      return; 
    }

    const chatDocRef = doc(db, "chats", chatId);
    let unsubscribePartner = null;

    // 1. Partner adatainak lekérése
    const fetchChatInfo = async () => {
      try {
        const docSnap = await getDoc(chatDocRef);
        if (docSnap.exists()) {
          const chatData = docSnap.data();
          
          // Demand info mentése ha van
          if (chatData.relatedDemandPosition && chatData.relatedDemandDate) {
            setChatDemandInfo({
              position: chatData.relatedDemandPosition,
              positionLabel: chatData.relatedDemandPositionLabel || (chatData.relatedDemandPosition === 'pharmacist' ? 'Gyógyszerész' : 'Szakasszisztens'),
              date: chatData.relatedDemandDate
            });
          }
          
          if (!chatData.members.includes(user.uid)) {
            router.push("/chat"); 
            return;
          }
          
          const otherUserId = chatData.members.find(id => id !== user.uid);
          setPartnerId(otherUserId); // <-- FONTOS: Elmentjük a partner ID-ját
          
          if (otherUserId) {
            const userDocSnap = await getDoc(doc(db, "users", otherUserId));
            if (userDocSnap.exists()) {
              const data = userDocSnap.data();
              // Gyógyszertár esetén a pharmacyName-et használjuk, egyébként displayName
              const name = data.pharmagisterRole === 'pharmacy' && data.pharmacyName 
                ? data.pharmacyName 
                : (data.displayName || "Ismeretlen");
              const photoURL = data.pharmaPhotoURL || data.photoURL || `https://api.dicebear.com/8.x/initials/svg?seed=${name.replace(/\s/g, '%20')}`;
              setPartnerData({ name, photoURL });
              
              // Beállítjuk a kezdeti lastSeen és online státuszt
              if (data.lastSeen) {
                const lastSeenDate = data.lastSeen.toDate();
                setPartnerLastSeen(lastSeenDate);
                const diff = Date.now() - lastSeenDate.getTime();
                setIsPartnerOnline(diff < 60000); // Ha kevesebb mint 1 perc, online
              }
            }
            
            // ✅ OPTIMALIZÁLVA: Polling helyett az onSnapshot-ot, 30mp-enként frissítjük a partner státuszt
            // Ez sokkal kevesebb read-et generál mint a real-time listener
            const pollPartnerStatus = async () => {
              try {
                const freshDoc = await getDoc(doc(db, "users", otherUserId));
                if (freshDoc.exists()) {
                  const data = freshDoc.data();
                  if (data.lastSeen) {
                    const lastSeenDate = data.lastSeen.toDate();
                    setPartnerLastSeen(lastSeenDate);
                    const diff = Date.now() - lastSeenDate.getTime();
                    setIsPartnerOnline(diff < 60000);
                  }
                }
              } catch (err) {
                // Silent fail
              }
            };
            
            // Partner státusz polling 30 másodpercenként
            const partnerPollInterval = setInterval(pollPartnerStatus, 30000);
            
            // Cleanup function-ba mentjük az intervalt
            unsubscribePartner = () => clearInterval(partnerPollInterval);
          }
        } else {
          router.push("/chat"); 
          return;
        }
      } catch (error) {
         console.error("Hiba a chat adatok lekérésekor:", error);
         router.push("/chat");
      }
    };
    
    fetchChatInfo();

    // 2. Üzenetek valós idejű figyelése
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc")); 
    
    // Tárol a chat törlés időpontját
    let userDeletedAtTime = null;

    const unsubscribeMessages = onSnapshot(q, async (querySnapshot) => {
      // Első futáskor lekérdezzük a chat dokumentumot a törlési időpontért
      if (userDeletedAtTime === null) {
        try {
          const chatDocSnap = await getDoc(chatDocRef);
          const chatData = chatDocSnap.data();
          const userDeletedAt = chatData?.deletedAt?.[user.uid];
          if (userDeletedAt) {
            userDeletedAtTime = userDeletedAt.toMillis();
          }
        } catch (err) {
          console.error("Error fetching chat deletedAt:", err);
        }
      }
      
      const loadedMessages = [];
      querySnapshot.forEach((doc) => {
        const messageData = { id: doc.id, ...doc.data() };
        
        // Kiszűrjük:
        // 1. Lokálisan törölt üzenetek
        if (messageData.deletedBy && messageData.deletedBy.includes(user.uid)) {
          return;
        }
        
        // 2. Chat törlés előtti üzenetek
        if (userDeletedAtTime && messageData.createdAt) {
          const messageTime = messageData.createdAt.toMillis();
          if (messageTime <= userDeletedAtTime) {
            return; // Régi üzenet, ne mutassuk
          }
        }
        
        loadedMessages.push(messageData);
      });
      
      const previousLength = messages.length;
      
      // Először frissítjük az üzeneteket
      setMessages(loadedMessages);
      
      if (loadedMessages.length > 0 && !firstMessageAt) {
        setFirstMessageAt(loadedMessages[0].createdAt?.toDate());
      }
      
      // Csak akkor állítsuk le a loading-ot, ha ez az első betöltés
      if (previousLength === 0) {
        // Kis késleltetés hogy az üzenetek renderelődjenek
        setTimeout(() => {
          setIsLoading(false);
          scrollToBottom({ behavior: "auto" });
        }, 100);
      } else {
        setIsLoading(false);
        // Csak akkor görgessen le, ha új üzenet érkezett (nem módosítás/törlés)
        if (loadedMessages.length > previousLength) {
          setTimeout(() => scrollToBottom({ behavior: "auto" }), 50);
        }
      }
    }, (error) => {
      console.error("Hiba az üzenetek figyelésekor:", error);
      setIsLoading(false);
    });

    // 3. ÚJ FIGYELŐ: A CHAT DOKUMENTUM FIGYELÉSE (GÉPELÉS MIATT)
    // Ez figyeli a 'typing' tömb változását
    const unsubscribeChatDoc = onSnapshot(chatDocRef, (doc) => {
      const data = doc.data();
      // Ellenőrizzük, hogy létezik-e a 'typing' tömb és benne van-e a partnerünk
      if (data && data.typing && partnerId && data.typing.includes(partnerId)) {
        setIsPartnerTyping(true);
        setTimeout(() => scrollToBottom(), 100); // Görgessen le, ha megjelent a buborék
      } else {
        setIsPartnerTyping(false);
      }
    });

    // 4. Jelöljük olvasottnak a chatet amikor megnyitjuk - AZONNAL
    const markChatAsRead = async () => {
      try {
        console.log(`📖 Marking chat ${chatId} as read for user ${user.uid}`);
        await updateDoc(chatDocRef, {
          readBy: arrayUnion(user.uid)
        });
        console.log('✅ Chat marked as read');
        
        // ✅ OPTIMALIZÁLVA: Badge frissítés csak clearAppBadge - 
        // a pontos számot a useDashboardBadges hook kezeli real-time
        // Nem kérdezünk le minden chatet és notificationt minden chat megnyitáskor!
        if (typeof window !== 'undefined' && 'clearAppBadge' in navigator) {
          // Nem töröljük a badge-et, mert lehet más olvasatlan is van
          // A useDashboardBadges majd frissíti automatikusan
          console.log('🔵 Chat marked as read, badge will update via listener');
        }
      } catch (err) {
        console.error('Error marking chat as read:', err);
      }
    };
    markChatAsRead();

    // Figyelők leállítása
    return () => {
      if (unsubscribeMessages) unsubscribeMessages();
      if (unsubscribeChatDoc) unsubscribeChatDoc();
      if (unsubscribePartner) unsubscribePartner();
      
      // Long press timer törlése
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };

  }, [user, loading, chatId, router, firstMessageAt, partnerId]); // partnerId hozzáadva

  // Jelöljük olvasottnak az összes üzenetet amikor valaki megnyitja a chatet
  const markedMessagesRef = useRef(new Set()); // Már megjelölt üzenetek
  
  useEffect(() => {
    if (!user || !chatId || !partnerId || messages.length === 0) return;

    const markMessagesAsRead = async () => {
      const messagesRef = collection(db, "chats", chatId, "messages");
      
      // Csak azokat az üzeneteket frissítjük, amiket a partner küldött és mi még nem olvastunk
      const unreadMessages = messages.filter(msg => 
        msg.senderId === partnerId && 
        (!msg.readBy || !msg.readBy.includes(user.uid)) &&
        !markedMessagesRef.current.has(msg.id) // Még nem próbáltuk megjelölni
      );

      if (unreadMessages.length === 0) return;

      // Batch-ként kezeljük - Promise.all a párhuzamos frissítéshez
      await Promise.all(unreadMessages.map(async (msg) => {
        markedMessagesRef.current.add(msg.id);
        const msgRef = doc(messagesRef, msg.id);
        try {
          await updateDoc(msgRef, {
            readBy: arrayUnion(user.uid)
          });
        } catch (error) {
          console.error('Error marking message as read:', error);
          markedMessagesRef.current.delete(msg.id); // Retry lehetőség
        }
      }));
    };

    markMessagesAsRead();
  }, [messages, user, chatId, partnerId]);

  // --- ÚJ useEffect: KIEMELÉS ÉS GÖRGETÉS A MEGADOTT ÜZENETHEZ ---
  useEffect(() => {
    if (!highlightedMessageId || messages.length === 0) {
      // Ha nincs kiemelendő üzenet, görgessünk le az aljára
      if (messages.length > 0 && !isLoading) {
        setTimeout(() => {
          scrollToBottom({ behavior: 'auto' });
        }, 300);
      }
      return;
    }

    // Várunk egy kicsit hogy az üzenetek renderelődjenek
    const timer = setTimeout(() => {
      const messageElement = document.getElementById(`message-${highlightedMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);

    // Touch eseményre töröljük a kiemelést
    const handleTouch = () => {
      setHighlightedMessageId(null);
    };

    document.addEventListener('touchstart', handleTouch);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, [highlightedMessageId, messages, isLoading]);


  // --- ÚJ useEffect: A SAJÁT GÉPELÉSÜNK FIGYELÉSE (OPTIMALIZÁLVA) ---
  const isTypingRef = useRef(false); // Követjük hogy épp gépelünk-e
  
  useEffect(() => {
    // Ne fusson le, amíg nincs user vagy chat
    if (loading || !user || !chatId) return;

    const chatDocRef = doc(db, "chats", chatId);
    const hasText = newMessage.trim() !== "";

    // Töröljük az előző időzítőt (ha volt)
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Csak akkor updateljük ha változott a státusz (ne minden karakternél)
    if (hasText && !isTypingRef.current) {
      isTypingRef.current = true;
      updateDoc(chatDocRef, {
        typing: arrayUnion(user.uid)
      }).catch(err => {});
    } else if (!hasText && isTypingRef.current) {
      isTypingRef.current = false;
      updateDoc(chatDocRef, {
        typing: arrayRemove(user.uid)
      }).catch(err => {});
    }

    // Beállítunk egy 3 másodperces időzítőt.
    if (hasText) {
      typingTimeoutRef.current = setTimeout(() => {
        isTypingRef.current = false;
        updateDoc(chatDocRef, {
          typing: arrayRemove(user.uid)
        }).catch(err => {});
      }, 3000);
    }

    // Komponens elhagyásakor (cleanup)
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [newMessage, chatId, user, loading]);

  // --- REAKCIÓ KEZELÉSE ---
  const handleLongPressStart = (messageId) => {
    const timer = setTimeout(() => {
      setShowReactionPicker(messageId);
      setHighlightedMessage(messageId);
    }, 500); // 500ms hosszú nyomás
    setLongPressTimer(timer);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };
  
  // --- ÜZENET SZERKESZTÉS ÉS TÖRLÉS ---
  const canEditMessage = (msg) => {
    if (!msg.createdAt || msg.senderId !== user.uid) return false;
    const messageTime = msg.createdAt.toDate();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return messageTime > oneHourAgo && msg.text; // Csak szöveges üzeneteket lehet szerkeszteni
  };

  const canDeleteMessage = (msg) => {
    return msg.senderId === user.uid;
  };

  const startEditMessage = (msg) => {
    setEditingMessage({ id: msg.id, text: msg.text });
    setEditText(msg.text);
    setShowMessageMenu(null);
    setHighlightedMessage(null);
    setShowReactionPicker(null);
  };

  const cancelEditMessage = () => {
    setEditingMessage(null);
    setEditText('');
    setHighlightedMessage(null);
    setShowReactionPicker(null);
  };

  const saveEditMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    try {
      const messageRef = doc(db, "chats", chatId, "messages", editingMessage.id);
      await updateDoc(messageRef, {
        text: editText.trim(),
        edited: true,
        editedAt: serverTimestamp()
      });

      // Chat dokumentum frissítése ha ez volt az utolsó üzenet
      const chatDocRef = doc(db, "chats", chatId);
      const chatDoc = await getDoc(chatDocRef);
      if (chatDoc.exists()) {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.id === editingMessage.id) {
          await updateDoc(chatDocRef, {
            lastMessage: editText.trim()
          });
        }
      }

      setEditingMessage(null);
      setEditText('');
      setHighlightedMessage(null);
      setShowReactionPicker(null);
      setShowMessageMenu(null);
    } catch (error) {
      console.error('Üzenet szerkesztési hiba:', error);
      alert('Hiba történt az üzenet szerkesztésekor');
    }
  };

  const deleteMessage = async (messageId) => {
    if (!confirm('Biztosan törlöd ezt az üzenetet?')) return;

    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await deleteDoc(messageRef);

      // Ha ez volt az utolsó üzenet, frissítjük a chat dokumentumot
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.id === messageId) {
        const remainingMessages = messages.filter(m => m.id !== messageId);
        if (remainingMessages.length > 0) {
          const newLastMsg = remainingMessages[remainingMessages.length - 1];
          const chatDocRef = doc(db, "chats", chatId);
          await updateDoc(chatDocRef, {
            lastMessage: newLastMsg.text || newLastMsg.imageUrl ? '📷 Kép' : newLastMsg.audioUrl ? '🎤 Hangüzenet' : '',
            lastMessageAt: newLastMsg.createdAt,
            lastMessageSenderId: newLastMsg.senderId
          });
        }
      }

      setShowMessageMenu(null);
      setHighlightedMessage(null);
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Üzenet törlési hiba:', error);
      alert('Hiba történt az üzenet törlésekor');
    }
  };

  // Lokális törlés - csak a saját nézetnél tűnik el az üzenet
  const deleteMessageLocally = async (messageId) => {
    if (!confirm('Csak nálad törlöd ezt az üzenetet. A másik félnél látható marad.')) return;

    try {
      // Firebase-ben hozzáadjuk a user ID-t a deletedBy tömbhöz
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      await updateDoc(messageRef, {
        deletedBy: arrayUnion(user.uid)
      });

      // A state automatikusan frissül a snapshot listener miatt
      setShowMessageMenu(null);
      setHighlightedMessage(null);
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Lokális törlési hiba:', error);
      alert('Hiba történt a törlés során');
    }
  };

  const handleReaction = async (messageId, emoji, e) => {
    e.stopPropagation(); // Megakadályozzuk hogy az overlay bezárja
    
    if (!user || !chatId) return;
    
    // Azonnal nullázzuk a state-eket (még a Firebase frissítés előtt)
    setShowReactionPicker(null);
    setHighlightedMessage(null);
    setShowMessageMenu(null);
    
    try {
      const messageRef = doc(db, "chats", chatId, "messages", messageId);
      const messageSnap = await getDoc(messageRef);
      
      if (messageSnap.exists()) {
        const messageData = messageSnap.data();
        const reactions = messageData.reactions || {};
        
        // Először töröljük az összes korábbi reakciónkat erről az üzenetről
        Object.keys(reactions).forEach(emojiKey => {
          if (reactions[emojiKey].includes(user.uid)) {
            reactions[emojiKey] = reactions[emojiKey].filter(uid => uid !== user.uid);
            if (reactions[emojiKey].length === 0) {
              delete reactions[emojiKey];
            }
          }
        });
        
        // Ha ugyanazzal az emojival kattintottunk újra, akkor már töröltük (toggle viselkedés)
        // Különben hozzáadjuk az új emojit
        const hadThisReaction = messageData.reactions?.[emoji]?.includes(user.uid);
        
        if (!hadThisReaction) {
          // Hozzáadjuk az új reakciót
          if (!reactions[emoji]) {
            reactions[emoji] = [];
          }
          reactions[emoji].push(user.uid);
        }
        
        await updateDoc(messageRef, { reactions });
      }
    } catch (error) {
      console.error('Hiba a reakció hozzáadásakor:', error);
    }
  };

  // --- ÜZENETKÜLDÉS ---
  const handleSendMessage = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const text = newMessage.trim();
    
    // Ha nincs szöveg, return
    if (text === "") return;
    if (!user || !chatId) return;

    // Jelöljük hogy mi küldtünk üzenetet (ne scrollozzon automatikusan)
    justSentMessageRef.current = true;

    // FONTOS: Mentsük el a fókuszt ELŐTTE
    const inputElement = inputRef.current;

    // Azonnal töröljük az input mezőket
    setNewMessage("");
    // Töröljük a contenteditable div tartalmát is
    if (inputElement && inputElement.textContent) {
      inputElement.textContent = '';
    }
    setReplyTo(null); // Töröljük a válasz referenciát
    
    // Töröljük az időzítőt, mert üzenetküldés = gépelés vége
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      const messagesRef = collection(db, "chats", chatId, "messages");
      const messageData = {
        senderId: user.uid,
        createdAt: serverTimestamp(),
        readBy: [user.uid], // Kezdetben csak a küldő olvasta
        text: text
      };

      // Hozzáadjuk a reply információt ha van
      if (replyTo) {
        messageData.replyTo = {
          messageId: replyTo.id,
          text: replyTo.text,
          senderId: replyTo.senderId,
          senderName: replyTo.senderName
        };
      }

      await addDoc(messagesRef, messageData);

      const chatDocRef = doc(db, "chats", chatId);
      await updateDoc(chatDocRef, {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        typing: arrayRemove(user.uid),
        readBy: [user.uid], // Csak a küldő olvasta, a partner még nem
        deletedBy: arrayRemove(user.uid), // Csak a küldő deleted státuszát töröljük
        archivedBy: arrayRemove(user.uid) // Csak a küldő archived státuszát töröljük
      });
      
      // Megtartjuk a fókuszt az input mezőn - többszörös próbálkozás iOS-hez
      if (inputElement) {
        // Azonnal
        inputElement.focus();
        // Késleltetve is (iOS Safari fix)
        setTimeout(() => inputElement.focus(), 0);
        setTimeout(() => inputElement.focus(), 100);
      }
      
    } catch (error) {
      console.error("Hiba az üzenet küldésekor:", error);
      setNewMessage(text);
      alert('Hiba történt az üzenet küldésekor');
    }
  };

  // Betöltő képernyő
  if (loading || isLoading) {
    return (
      <main className={`min-h-screen ${darkMode ? 'bg-[#f0f5f0] text-gray-900' : 'bg-gray-100 text-gray-900'} flex items-center justify-center`}>
        <p className="text-xl">Üzenetek betöltése...</p>
      </main>
    );
  }

  // --- KÉPERNYŐ TARTALOM ---
  return (
    <main className={`h-screen w-screen overflow-hidden ${darkMode ? 'bg-[#f0f5f0] text-gray-900' : 'bg-gray-100 text-gray-900'}`}>
      
      {/* --- FEJLÉC (FIXED a tetején) --- */}
      <header 
        ref={headerRef}
        className={`fixed top-0 left-0 right-0 ${darkMode ? 'bg-[#f0f5f0] border-gray-200' : 'bg-white border-gray-300'} border-b-2 shadow-lg`}
        style={{ 
          zIndex: 9999,
          padding: '0.5rem 1rem',
          paddingTop: 'max(0.5rem, env(safe-area-inset-top))'
        }}
      >
        <div className="max-w-4xl mx-auto flex items-center">
          <button
            onClick={() => router.push("/chat")} 
            className={`mr-3 ${darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-700 hover:text-black hover:bg-gray-100'} p-2 rounded-full transition-all duration-200`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          
          {partnerData.photoURL && (
            <Image
              src={partnerData.photoURL}
              alt={partnerData.name}
              width={58}
              height={58}
              className="rounded-full object-cover mr-3"
              unoptimized
            />
          )}
          
          <div>
            <h1 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {partnerData.name}
              {chatDemandInfo && (
                <span className={`ml-2 text-sm font-normal ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  - {chatDemandInfo.positionLabel} {new Date(chatDemandInfo.date).toLocaleDateString('hu-HU', { month: '2-digit', day: '2-digit' }).replace('. ', '.').replace('.', '.')}
                </span>
              )}
            </h1>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {isPartnerOnline ? (
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Jelenleg elérhető
                </span>
              ) : partnerLastSeen ? (
                `Utoljára elérhető: ${formatLastSeen(partnerLastSeen)}`
              ) : (
                "Offline"
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Messenger stílusú felugró üzenet modal */}
      {(showReactionPicker || showMessageMenu) && selectedMessageData && (
        <div 
          className="fixed inset-0 z-[60] bg-black/70 flex flex-col items-center justify-center p-4" 
          onClick={() => {
            setShowReactionPicker(null);
            setShowMessageMenu(null);
            setHighlightedMessage(null);
            setSelectedMessageData(null);
          }}
        >
          {/* Reakció sáv - felül */}
          <div 
            className={`${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-full px-4 py-3 shadow-2xl flex gap-3 mb-3 border-2`}
            onClick={(e) => e.stopPropagation()}
          >
            {['❤️', '😂', '😮', '😢', '😡', '👍'].map(emoji => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleReaction(selectedMessageData.id, emoji, e);
                  setSelectedMessageData(null);
                }}
                className="text-3xl hover:scale-125 transition-transform active:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Az üzenet - középen */}
          <div 
            className={`rounded-2xl shadow-2xl max-w-[85%] ${
              selectedMessageData.isSentByMe
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                : darkMode 
                  ? "bg-gray-800 text-white border-2 border-gray-600"
                  : "bg-white text-gray-900 border-2 border-gray-300"
            } ${selectedMessageData.imageUrl && !selectedMessageData.text ? 'p-1' : 'px-4 py-3'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMessageData.imageUrl && (
              <div className={selectedMessageData.text ? 'mb-2' : ''}>
                <img 
                  src={selectedMessageData.imageUrl} 
                  alt="Kép" 
                  className="rounded-lg max-w-full max-h-[40vh] h-auto object-contain"
                  style={{
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    pointerEvents: 'none'
                  }}
                />
              </div>
            )}
            {selectedMessageData.audioUrl && (
              <div className="flex items-center gap-2">
                <audio controls className="w-full max-w-[200px]">
                  <source src={selectedMessageData.audioUrl} type="audio/mpeg" />
                </audio>
              </div>
            )}
            {selectedMessageData.text && (
              <p className="text-base" style={{ wordBreak: 'break-word' }}>
                {selectedMessageData.text}
              </p>
            )}
          </div>

          {/* Menü opciók - alul */}
          <div 
            className={`mt-3 ${darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-300'} rounded-2xl shadow-2xl border-2 overflow-hidden min-w-[200px]`}
            onClick={(e) => e.stopPropagation()}
          >
            {selectedMessageData.isSentByMe ? (
              // Saját üzeneteknél: Szerkesztés és Törlés
              <>
                {selectedMessageData.text && (
                  <button
                    onClick={() => {
                      startEditMessage(selectedMessageData);
                      setSelectedMessageData(null);
                    }}
                    className={`w-full px-5 py-3 text-left ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-900'} transition-colors flex items-center justify-between border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                  >
                    <span>Szerkesztés</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                )}
                <button
                  onClick={() => {
                    deleteMessage(selectedMessageData.id);
                    setSelectedMessageData(null);
                  }}
                  className="w-full px-5 py-3 text-left hover:bg-red-600 transition-colors text-red-400 hover:text-white flex items-center justify-between"
                >
                  <span>Törlés</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </>
            ) : (
              // Kapott üzeneteknél: Válasz és lokális Törlés
              <>
                <button
                  onClick={() => {
                    setReplyTo({
                      id: selectedMessageData.id,
                      text: selectedMessageData.text || (selectedMessageData.imageUrl ? '📷 Kép' : selectedMessageData.audioUrl ? '🎤 Hangüzenet' : ''),
                      senderId: selectedMessageData.senderId,
                      senderName: selectedMessageData.senderId === user.uid ? 'Te' : partnerData.name
                    });
                    setShowMessageMenu(null);
                    setShowReactionPicker(null);
                    setHighlightedMessage(null);
                    setSelectedMessageData(null);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                  className={`w-full px-5 py-3 text-left ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-900'} transition-colors flex items-center justify-between border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
                >
                  <span>Válasz</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    deleteMessageLocally(selectedMessageData.id);
                    setSelectedMessageData(null);
                  }}
                  className="w-full px-5 py-3 text-left hover:bg-red-600 transition-colors text-red-400 hover:text-white flex items-center justify-between"
                >
                  <span>Törlés</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Szerkesztési modal */}
      {editingMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70">
          <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} rounded-2xl p-6 w-full max-w-md shadow-2xl border-2`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-blue-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                Üzenet szerkesztése
              </h3>
              <button onClick={cancelEditMessage} className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <textarea
              autoFocus
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className={`w-full ${darkMode ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-500' : 'bg-gray-100 text-gray-900 border-gray-300 focus:border-blue-500'} rounded-lg p-3 border focus:outline-none resize-none min-h-[120px] max-h-[300px]`}
              placeholder="Üzenet szövege..."
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={cancelEditMessage}
                className={`flex-1 ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-900'} py-2 px-4 rounded-lg transition-colors`}
              >
                Mégse
              </button>
              <button
                onClick={saveEditMessage}
                disabled={!editText.trim()}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mentés
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- SCROLL TO BOTTOM GOMB --- */}
      {showScrollButton && (
        <button
          onClick={() => {
            scrollToBottom({ behavior: "smooth" });
            setShowScrollButton(false);
          }}
          className={`fixed left-2/3 z-[60] ${darkMode ? 'bg-gray-700 hover:bg-gray-600 border-gray-600' : 'bg-white hover:bg-gray-100 border-gray-300'} text-cyan-400 rounded-full p-3 shadow-2xl transition-all duration-200 active:scale-95 border-2`}
          style={{ bottom: 'calc(100px + env(safe-area-inset-bottom))' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </button>
      )}

      {/* --- ÜZENETEK ABLAK (a fejléc alatt, input felett) --- */}
      <div 
        ref={messagesContainerRef} 
        className={`absolute left-0 right-0 overflow-y-auto p-4 space-y-2 ${darkMode ? 'bg-[#f0f5f0]' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'}`}
        style={{ 
          top: `${headerHeight}px`,
          bottom: '80px',
          overscrollBehavior: 'contain'
        }}
        onTouchStart={(e) => {
          // Mentjük a kezdő pozíciót a lehúzás detektálásához
          e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          // Ha lefelé húzza a felhasználó és az input fókuszban van, bezárjuk a billentyűzetet
          const startY = parseFloat(e.currentTarget.dataset.touchStartY);
          const currentY = e.touches[0].clientY;
          if (currentY > startY + 50 && inputRef.current) {
            inputRef.current.blur();
          }
        }}
      >
        {messages.map((msg) => {
          const isSentByMe = msg.senderId === user.uid;
          const timestamp = msg.createdAt ? msg.createdAt.toDate() : null;
          const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0;

          return (
            <div
              key={msg.id}
              id={`message-${msg.id}`}
              className={`flex flex-col ${isSentByMe ? "items-end" : "items-start"} relative`}
            >
              <div className="relative">
                <div
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowMessageMenu(msg.id);
                    setHighlightedMessage(msg.id);
                    setSelectedMessageData({
                      id: msg.id,
                      text: msg.text,
                      imageUrl: msg.imageUrl,
                      audioUrl: msg.audioUrl,
                      senderId: msg.senderId,
                      isSentByMe: isSentByMe
                    });
                  }}
                  onTouchStart={() => {
                    const timer = setTimeout(() => {
                      // Mindkét esetben megnyitjuk a popup-ot
                      setShowReactionPicker(msg.id);
                      setShowMessageMenu(msg.id);
                      setHighlightedMessage(msg.id);
                      setSelectedMessageData({
                        id: msg.id,
                        text: msg.text,
                        imageUrl: msg.imageUrl,
                        audioUrl: msg.audioUrl,
                        senderId: msg.senderId,
                        isSentByMe: isSentByMe
                      });
                    }, 500);
                    setLongPressTimer(timer);
                  }}
                  onTouchEnd={handleLongPressEnd}
                  onMouseDown={() => {
                    const timer = setTimeout(() => {
                      // Mindkét esetben megnyitjuk a popup-ot
                      setShowReactionPicker(msg.id);
                      setShowMessageMenu(msg.id);
                      setHighlightedMessage(msg.id);
                      setSelectedMessageData({
                        id: msg.id,
                        text: msg.text,
                        imageUrl: msg.imageUrl,
                        audioUrl: msg.audioUrl,
                        senderId: msg.senderId,
                        isSentByMe: isSentByMe
                      });
                    }, 500);
                    setLongPressTimer(timer);
                  }}
                  onMouseUp={handleLongPressEnd}
                  onMouseLeave={handleLongPressEnd}
                  className={`rounded-2xl shadow-lg ${
                    isSentByMe
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-br-none"
                      : darkMode 
                        ? "bg-gray-800 text-white border-2 border-gray-700 rounded-bl-none"
                        : "bg-white text-gray-900 border-2 border-gray-300 rounded-bl-none"
                  } ${msg.imageUrl && !msg.text ? 'p-1' : 'px-2.5 py-2'} ${(highlightedMessage === msg.id || highlightedMessageId === msg.id) ? 'ring-4 ring-yellow-400 animate-pulse' : ''}`}
                  style={{ 
                    maxWidth: isSentByMe ? '270px' : '270px',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none',
                    position: (highlightedMessage === msg.id || highlightedMessageId === msg.id) ? 'relative' : 'static',
                    zIndex: (highlightedMessage === msg.id || highlightedMessageId === msg.id) ? 50 : 'auto'
                  }}
                >
                  {/* Reply info megjelenítése */}
                  {msg.replyTo && (
                    <div 
                      className={`mb-2 p-2 rounded-lg border-l-4 ${isSentByMe ? 'bg-white/20 border-white/50' : darkMode ? 'bg-gray-700 border-gray-500' : 'bg-gray-100 border-gray-400'} cursor-pointer`}
                      onClick={() => {
                        // Scroll az eredeti üzenethez
                        const replyElement = document.getElementById(`message-${msg.replyTo.messageId}`);
                        if (replyElement) {
                          replyElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setHighlightedMessageId(msg.replyTo.messageId);
                          setTimeout(() => setHighlightedMessageId(null), 2000);
                        }
                      }}
                    >
                      <div className={`text-xs font-medium ${isSentByMe ? 'text-white/80' : darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {msg.replyTo.senderName}
                      </div>
                      <div className={`text-xs truncate ${isSentByMe ? 'text-white/70' : darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {msg.replyTo.text}
                      </div>
                    </div>
                  )}
                  
                  {msg.imageUrl && (
                    <div className="mb-2">
                      <img 
                        src={msg.imageUrl} 
                        alt="Küldött kép" 
                        className="rounded-lg max-w-full h-auto cursor-pointer select-none pointer-events-auto"
                        style={{
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                          WebkitTouchCallout: 'none',
                          pointerEvents: 'auto'
                        }}
                        draggable={false}
                        onContextMenu={(e) => e.preventDefault()}
                        onClick={() => window.open(msg.imageUrl, '_blank')}
                      />
                    </div>
                  )}
                  {msg.audioUrl && (
                    <div className="flex items-center gap-2">
                      <audio controls className="w-full max-w-[200px]">
                        <source src={msg.audioUrl} type="audio/mpeg" />
                        <source src={msg.audioUrl} type="audio/mp3" />
                        <source src={msg.audioUrl} type="audio/webm" />
                        A böngésződ nem támogatja a hanglejátszást.
                      </audio>
                      {msg.audioDuration && (
                        <span className="text-xs opacity-70">{Math.floor(msg.audioDuration / 60)}:{(msg.audioDuration % 60).toString().padStart(2, '0')}</span>
                      )}
                    </div>
                  )}
                  {msg.text && (
                    <p style={{ wordBreak: 'break-word' }}>
                      {msg.text}
                      {msg.edited && <span className="text-xs opacity-60 ml-2">(szerkesztve)</span>}
                    </p>
                  )}
                </div>

                {/* Reakciók megjelenítése */}
                {hasReactions && (
                  <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'} border rounded-full px-2 py-0.5 shadow-lg`}>
                    {Object.entries(msg.reactions).map(([emoji, users]) => (
                      <button
                        key={emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(msg.id, emoji, e);
                        }}
                        className={`text-xs flex items-center gap-0.5 ${
                          users.includes(user.uid) ? 'font-bold' : ''
                        }`}
                      >
                        <span>{emoji}</span>
                        {users.length > 1 && (
                          <span className="text-[10px] text-gray-500">{users.length}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-1 px-2 ${hasReactions ? 'mt-3' : 'mt-1'} ${isSentByMe ? "text-right" : "text-left"}`}>
                <p>{formatMessageTimestamp(timestamp)}</p>
                {isSentByMe && msg.readBy && msg.readBy.includes(partnerId) && (
                  <p className="text-blue-400 text-xs mt-0.5">Látta</p>
                )}
              </div>
            </div>
          );
        })}

        {/* --- ÚJ: GÉPELÉSJELZŐ BUBORÉK --- */}
        {isPartnerTyping && (
          <div className="flex flex-col items-start">
            <div className={`p-3 rounded-2xl max-w-xs md:max-w-lg shadow-lg ${darkMode ? 'bg-gray-800 text-white border-2 border-gray-700' : 'bg-white text-gray-900 border-2 border-gray-300'} rounded-bl-none`}>
              {/* Animált pontok (CSS kell hozzá) */}
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {/* Ez az elem biztosítja az automatikus görgetést */}
        <div ref={messagesEndRef} />
      </div>

      {/* --- INPUT (FIXED az alján) --- */}
      <div
        ref={formRef}
        className={`fixed bottom-0 left-0 right-0 p-4 border-t-2 z-50 ${
          darkMode ? 'bg-[#f0f5f0] border-gray-200' : 'bg-white border-gray-200'
        }`}
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        onTouchStart={(e) => {
          e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          const startY = parseFloat(e.currentTarget.dataset.touchStartY);
          const currentY = e.touches[0].clientY;
          // Ha lefelé húzza (50px-nél több), bezárjuk a billentyűzetet
          if (currentY > startY + 50 && inputRef.current) {
            inputRef.current.blur();
          }
        }}
      >
        <div className="max-w-4xl mx-auto">
          {/* Reply előnézet */}
          {replyTo && (
            <div className={`mb-2 p-2 rounded-lg border-l-4 border-cyan-500 flex items-center justify-between ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-medium ${darkMode ? 'text-cyan-400' : 'text-cyan-600'}`}>
                  Válasz erre: {replyTo.senderName}
                </div>
                <div className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {replyTo.text}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReplyTo(null)}
                className={`ml-2 p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          
          <div 
            className="flex space-x-2 items-end"
            onMouseDown={(e) => {
              // Csak ha pontosan erre a div-re kattintunk (nem gyerek elemre)
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
            onTouchStart={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
              }
            }}
          >
            {/* Contenteditable div az iOS accessory bar elkerülésére */}
            <div
              ref={inputRef}
              contentEditable={!editingMessage}
              suppressContentEditableWarning={true}
              onInput={(e) => setNewMessage(e.currentTarget.textContent)}
              onFocus={() => {
                // Overlay-ek bezárása fókuszáláskor
                setShowReactionPicker(null);
                setShowMessageMenu(null);
                setHighlightedMessage(null);
                setSelectedMessageData(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                  e.currentTarget.textContent = '';
                }
              }}
              className={`flex-1 border rounded-3xl py-3 px-4 focus:outline-none focus:border-cyan-500 disabled:opacity-50 transition-all overflow-y-auto min-h-[44px] max-h-32 ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              style={{ 
                WebkitUserSelect: 'text',
                userSelect: 'text',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
              data-placeholder="Írj üzenetet..."
            />

            {/* Küldés gomb */}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onTouchStart={(e) => e.preventDefault()}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSendMessage();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
              onClick={(e) => {
                e.preventDefault();
                handleSendMessage();
                setTimeout(() => inputRef.current?.focus(), 10);
              }}
              disabled={newMessage.trim() === ""}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold p-3 rounded-full transition duration-200 disabled:bg-gray-600 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
