import { collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { trackedAddDoc } from '@/lib/firestoreTracker';

/**
 * Értesítés létrehozása és Push notification küldése
 * @param {Object} params - Az értesítés paraméterei
 * @param {string} params.userId - A címzett user ID-ja
 * @param {string} params.type - Az értesítés típusa (pharma_application, approval_accepted, stb.)
 * @param {string} params.title - Az értesítés címe
 * @param {string} params.message - Az értesítés szövege
 * @param {Object} params.data - Opcionális extra adatok (demandId, applicantId, stb.)
 * @param {string} params.url - Az URL ahova kattintáskor navigáljon
 */
export async function createNotificationWithPush({
  userId,
  type,
  title,
  message,
  data = {},
  url = '/notifications'
}) {
  try {
    // 1. Létrehozzuk az értesítést a Firestore-ban
    const notificationData = {
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
      ...data
    };

    const notificationRef = await trackedAddDoc(collection(db, 'notifications'), notificationData);
    console.log('📧 Notification created:', notificationRef.id);

    // 2. Push notification küldése
    try {
      const pushResponse = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title,
          body: message,
          url,
          tag: `${type}-${notificationRef.id}`
        })
      });

      const pushResult = await pushResponse.json();
      console.log('🔔 Push notification result:', pushResult);
    } catch (pushError) {
      // Push hiba nem akadályozza meg az értesítés létrehozását
      console.warn('Push notification failed (non-critical):', pushError);
    }

    return { success: true, notificationId: notificationRef.id };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Értesítési típusok és URL-ek
 */
export const NotificationTypes = {
  // Gyógyszertár kap értesítést
  PHARMA_APPLICATION: {
    type: 'pharma_application',
    getUrl: (demandId) => `/pharmagister?tab=dashboard&expand=${demandId}`
  },
  
  // Gyógyszerész/Asszisztens kap értesítést
  APPLICATION_ACCEPTED: {
    type: 'approval_accepted',
    getUrl: (demandId) => `/pharmagister/demand/${demandId}`
  },
  
  APPLICATION_REJECTED: {
    type: 'approval_rejected',
    getUrl: () => '/pharmagister?tab=dashboard'
  },
  
  // Felhasználó kap admin jóváhagyást
  PROFILE_APPROVED: {
    type: 'approval_approved',
    getUrl: () => '/pharmagister'
  },
  
  PROFILE_REJECTED: {
    type: 'approval_rejected',
    getUrl: () => '/pharmagister/setup?edit=true'
  },
  
  // Admin kap értesítést
  ADMIN_APPROVAL_REQUEST: {
    type: 'admin_approval_request',
    getUrl: () => '/admin/approvals'
  },
  
  // Új üzenet
  NEW_MESSAGE: {
    type: 'new_message',
    getUrl: (chatId) => `/chat/${chatId}`
  }
};
