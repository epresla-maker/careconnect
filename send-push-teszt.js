const admin = require('firebase-admin');
const webpush = require('web-push');
require('dotenv').config({ path: '.env.local' });

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
  try {
    // Find TESZT user
    const authUser = await admin.auth().getUserByEmail('teszt@teszt.com');
    const userId = authUser.uid;
    console.log('✅ Auth User ID:', userId);
    
    // Create app notification
    const notificationRef = await db.collection('notifications').add({
      userId: userId,
      type: 'test',
      title: '🎉 Push Teszt Sikeres!',
      message: 'Gratulálunk! A push értesítések működnek.',
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log('✅ App notification created:', notificationRef.id);
    
    // Check for push subscriptions
    const subsSnapshot = await db.collection('pushSubscriptions')
      .where('userId', '==', userId)
      .get();
    console.log('📱 Push subscriptions found:', subsSnapshot.size);
    
    if (subsSnapshot.size > 0) {
      // Configure webpush
      webpush.setVapidDetails(
        'mailto:epresla@icloud.com',
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      
      const payload = JSON.stringify({
        title: '🎉 Push Teszt!',
        body: 'A push értesítések működnek! 🚀',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        url: '/notifications'
      });
      
      let successCount = 0;
      for (const doc of subsSnapshot.docs) {
        try {
          console.log('Sending to:', doc.id);
          await webpush.sendNotification(doc.data().subscription, payload);
          console.log('✅ Push sent to subscription:', doc.id);
          successCount++;
        } catch (error) {
          console.error('❌ Failed to send push:', error.statusCode, error.body);
        }
      }
      console.log(`\n✅ Sent ${successCount}/${subsSnapshot.size} notifications`);
    } else {
      console.log('⚠️ No push subscriptions found for user');
      console.log('Please enable notifications in the app first!');
    }
    
    console.log('\n🎯 Done! Check your device for notification.');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

sendTestNotification().then(() => process.exit(0));
