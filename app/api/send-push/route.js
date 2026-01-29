import webpush from 'web-push';
import { getFirebaseAdmin } from '@/lib/firebaseAdmin';

// VAPID keys for push notifications
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  'mailto:epresla@icloud.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export async function POST(request) {
  try {
    const admin = getFirebaseAdmin();
    const db = admin.firestore();
    
    const { userId, title, body, url, tag } = await request.json();

    if (!userId) {
      return Response.json({ error: 'userId is required' }, { status: 400 });
    }

    // Get user's push subscriptions from Firestore
    const subscriptionsSnapshot = await db.collection('pushSubscriptions')
      .where('userId', '==', userId)
      .get();

    if (subscriptionsSnapshot.empty) {
      console.log(`No push subscriptions found for user: ${userId}`);
      return Response.json({ success: true, sent: 0, message: 'No subscriptions found' });
    }

    const payload = JSON.stringify({
      title: title || 'Pharmagister',
      body: body || 'Új értesítésed érkezett!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: tag || 'pharmagister-notification',
      url: url || '/notifications'
    });

    const results = [];
    const expiredSubscriptions = [];

    for (const doc of subscriptionsSnapshot.docs) {
      const subscription = doc.data().subscription;
      
      try {
        await webpush.sendNotification(subscription, payload);
        results.push({ success: true, id: doc.id });
      } catch (error) {
        console.error(`Push failed for subscription ${doc.id}:`, error.statusCode);
        
        // If subscription is expired or invalid, mark for deletion
        if (error.statusCode === 410 || error.statusCode === 404) {
          expiredSubscriptions.push(doc.id);
        }
        results.push({ success: false, id: doc.id, error: error.message });
      }
    }

    // Clean up expired subscriptions
    for (const subId of expiredSubscriptions) {
      await db.collection('pushSubscriptions').doc(subId).delete();
      console.log(`Deleted expired subscription: ${subId}`);
    }

    const successCount = results.filter(r => r.success).length;
    return Response.json({ 
      success: true, 
      sent: successCount, 
      total: results.length,
      cleaned: expiredSubscriptions.length 
    });

  } catch (error) {
    console.error('Send push error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
