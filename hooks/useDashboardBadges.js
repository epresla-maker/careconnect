// hooks/useDashboardBadges.js
// OPTIMIZED: Polling instead of real-time listeners (saves ~80% Firestore reads)
import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';

const POLL_INTERVAL = 60000; // 60 másodperc

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
  
  const isMountedRef = useRef(true);

  const fetchBadges = useCallback(async () => {
    if (!user || !userData || !isMountedRef.current) return;

    try {
      // 1. Értesítések (getCountFromServer - olcsóbb mint getDocs!)
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        where('read', '==', false)
      );
      const notifCount = await getCountFromServer(notificationsQuery);
      
      // 2. Olvasatlan üzenetek
      const chatsQuery = query(
        collection(db, 'chats'),
        where('members', 'array-contains', user.uid)
      );
      const chatsSnapshot = await getDocs(chatsQuery);
      let unreadCount = 0;
      chatsSnapshot.docs.forEach(chatDoc => {
        const data = chatDoc.data();
        const isGhost = data.lastMessageSenderId === null;
        const isArchived = data.archivedBy?.includes(user.uid);
        const isDeleted = data.deletedBy?.includes(user.uid);
        
        if (isGhost || isArchived || isDeleted) return;
        
        const readBy = data.readBy || [];
        if (!readBy.includes(user.uid) && data.lastMessageSenderId !== user.uid) {
          unreadCount++;
        }
      });

      // 3-5. userData-ból - nincs Firestore lekérés
      const requestsCount = (userData.friendRequests || []).length;
      const friendsCount = (userData.friends || []).length;
      const followingCount = (userData.following || []).length;

      // 6. Timemagister
      let timeMagisterCount = 0;
      if (userData.status === 'Full Tag') {
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('providerId', '==', user.uid),
          where('status', '==', 'accepted')
        );
        const appCount = await getCountFromServer(appointmentsQuery);
        timeMagisterCount = appCount.data().count;
      }

      // 7. Pharmagister
      let pharmaMagisterCount = 0;
      if ((userData.pharmagisterRole === 'pharmacist' || userData.pharmagisterRole === 'assistant') 
          && userData.zipCodes?.length > 0) {
        const pharmaQuery = query(
          collection(db, 'substitutionRequests'),
          where('status', '==', 'active'),
          where('zipCode', 'in', userData.zipCodes.slice(0, 10))
        );
        const pharmaCount = await getCountFromServer(pharmaQuery);
        pharmaMagisterCount = pharmaCount.data().count;
      }

      if (isMountedRef.current) {
        setBadges({
          notifications: notifCount.data().count,
          messages: unreadCount,
          requests: requestsCount,
          friends: friendsCount,
          following: followingCount,
          timemagister: timeMagisterCount,
          pharmagister: pharmaMagisterCount
        });
      }
    } catch (error) {
      // Silent fail
    }
  }, [user, userData]);

  useEffect(() => {
    isMountedRef.current = true;
    if (!user || !userData) return;

    fetchBadges();
    const interval = setInterval(fetchBadges, POLL_INTERVAL);

    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [user, userData, fetchBadges]);

  const refreshBadges = useCallback(() => fetchBadges(), [fetchBadges]);

  return { badges, refreshBadges };
}
