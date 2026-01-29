const admin = require('firebase-admin');
const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    })
  });
}

const db = admin.firestore();

async function sendTestNotification() {
  // Find user by email
  const usersSnapshot = await db.collection('users').where('email', '==', 'epresla@icloud.com').get();
  
  if (usersSnapshot.empty) {
    console.log('❌ User not found');
    return;
  }
  
  const userId = usersSnapshot.docs[0].id;
  console.log('✅ User ID:', userId);
  
  // Create app notification
  const notificationRef = await db.collection('notifications').add({
    userId: userId,
    type: 'test',
    title: '🎉 Push Teszt Sikeres!',
    message: 'Gratulálunk! A push értesítések működnek. Ez egy teszt üzenet a rendszer ellenőrzésére.',
    read: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('✅ App notification created:', notificationRef.id);
  
  // Check for push subscriptions
  const subsSnapshot = await db.collection('pushSubscriptions').where('userId', '==', userId).get();
  console.log('📱 Push subscriptions found:', subsSnapshot.size);
  
  if (subsSnapshot.size > 0) {
    // Configure webpush
    webpush.setVapidDetails(
      'mailto:epresla@icloud.com',
      'BBU5PoQ9XJqkav4d_LRkfYWug1BvFRMyP8AGUowaPBqZgG26MF7nca__roE3Cewj7MKnuvtDdBpJ4O1llvTK7QI',
      'KzcnOITPHbtgIVc5TGXbuOMYczLI2SBzbE-hoTSwH58'
    );
    
    const payload = JSON.stringify({
      title: '🎉 Push Teszt Sikeres!',
      body: 'Gratulálunk! A push értesítések működnek.',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      tag: 'test-notification',
      url: '/notifications'
    });
    
    for (const subDoc of subsSnapshot.docs) {
      const subscription = subDoc.data().subscription;
      try {
        await webpush.sendNotification(subscription, payload);
        console.log('✅ Push sent to subscription:', subDoc.id);
      } catch (err) {
        console.log('❌ Push failed:', err.message);
      }
    }
  } else {
    console.log('⚠️ No push subscriptions found for user');
  }
  
  console.log('\n🎯 Done! Check your phone/browser for notification.');
}

sendTestNotification().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
