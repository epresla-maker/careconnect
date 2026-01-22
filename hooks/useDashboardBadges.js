import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';

export function useDashboardBadges(user, userData) {
  const [badges, setBadges] = useState({
    notifications: 0,
    messages: 0,
    requests: 0,
    friends: 0,
    following: 0,
    timemagister: 0,
    pharmagister: 0
  });

  useEffect(() => {
    if (!user || !userData) return;

    const unsubscribers = [];

    // 1. Értesítések (notifications collection)
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false)
    );
    const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      setBadges(prev => ({ ...prev, notifications: snapshot.size }));
    });
    unsubscribers.push(unsubNotifications);

    // 2. Olvasatlan üzenetek
    const chatsQuery = query(
      collection(db, 'chats'),
      where('members', 'array-contains', user.uid)
    );
    const unsubChats = onSnapshot(chatsQuery, (snapshot) => {
      let unreadCount = 0;
      snapshot.docs.forEach(chatDoc => {
        const data = chatDoc.data();
        
        // Kihagyjuk a szellem, archivált és törölt chateket
        const isGhost = data.lastMessageSenderId === null;
        const isArchived = data.archivedBy?.includes(user.uid);
        const isDeleted = data.deletedBy?.includes(user.uid);
        
        if (isGhost || isArchived || isDeleted) {
          return;
        }
        
        const readBy = data.readBy || [];
        if (!readBy.includes(user.uid) && data.lastMessageSenderId !== user.uid) {
          unreadCount++;
        }
      });
      console.log(`📊 Dashboard badges - unread messages: ${unreadCount}`);
      setBadges(prev => ({ ...prev, messages: unreadCount }));
    });
    unsubscribers.push(unsubChats);

    // 3. Friend requests (jelölések)
    const requestsCount = (userData.friendRequests || []).length;
    setBadges(prev => ({ ...prev, requests: requestsCount }));

    // 4. Barátok száma
    const friendsCount = (userData.friends || []).length;
    setBadges(prev => ({ ...prev, friends: friendsCount }));

    // 5. Követett felhasználók száma
    const followingCount = (userData.following || []).length;
    setBadges(prev => ({ ...prev, following: followingCount }));

    // 6. Timemagister - elfogadott időpontok ahol várnak (ha van serviceProfile)
    if (userData.status === 'Full Tag') {
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('providerId', '==', user.uid),
        where('status', '==', 'accepted')
      );
      const unsubAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
        setBadges(prev => ({ ...prev, timemagister: snapshot.size }));
      });
      unsubscribers.push(unsubAppointments);
    }

    // 8. Pharmagister - helyettesítési igények az érdekeltsági körömben
    if (userData.profession === 'Gyógyszerész' && userData.zipCodes && userData.zipCodes.length > 0) {
      const pharmaQuery = query(
        collection(db, 'substitutionRequests'),
        where('status', '==', 'active'),
        where('zipCode', 'in', userData.zipCodes.slice(0, 10)) // Firestore max 10 item in array
      );
      const unsubPharma = onSnapshot(pharmaQuery, (snapshot) => {
        setBadges(prev => ({ ...prev, pharmagister: snapshot.size }));
      });
      unsubscribers.push(unsubPharma);
    }

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, userData]);

  return badges;
}
