// hooks/useChatListener.js
// KÖZPONTI chat listener - egy onSnapshot az egész app-nak!
"use client";
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const ChatListenerContext = createContext(null);

export function ChatListenerProvider({ children, userId }) {
  const [chats, setChats] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setChats([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // EGY LISTENER AZ ÖSSZES CHAT-HEZ
    const q = query(
      collection(db, 'chats'),
      where('members', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setChats(allChats);

      // Unread count számítás
      let unread = 0;
      allChats.forEach(chat => {
        const isGhost = chat.lastMessageSenderId === null;
        const isArchived = chat.archivedBy?.includes(userId);
        const isDeleted = chat.deletedBy?.includes(userId);
        
        if (isGhost || isArchived || isDeleted) return;
        
        const readBy = chat.readBy || [];
        if (!readBy.includes(userId) && chat.lastMessageSenderId !== userId) {
          unread++;
        }
      });
      
      setUnreadCount(unread);
      setLoading(false);
    }, (error) => {
      console.error('Chat listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  // Szűrt listák származtatása (nem új listener!)
  const activeChats = chats.filter(chat => {
    const isArchived = chat.archivedBy?.includes(userId);
    const isDeleted = chat.deletedBy?.includes(userId);
    return !isArchived && !isDeleted;
  });

  const archivedChats = chats.filter(chat => {
    const isArchived = chat.archivedBy?.includes(userId);
    const isDeleted = chat.deletedBy?.includes(userId);
    return isArchived && !isDeleted;
  });

  return (
    <ChatListenerContext.Provider value={{ 
      chats, 
      activeChats, 
      archivedChats, 
      unreadCount, 
      loading 
    }}>
      {children}
    </ChatListenerContext.Provider>
  );
}

export function useChatListener() {
  const context = useContext(ChatListenerContext);
  if (!context) {
    throw new Error('useChatListener must be used within ChatListenerProvider');
  }
  return context;
}
