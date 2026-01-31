require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

const db = admin.firestore();

(async () => {
  try {
    // Find test user
    const auth = admin.auth();
    const userRecord = await auth.getUserByEmail('teszt@teszt.com');
    console.log('✅ User found:', userRecord.uid);
    
    // Check for push subscriptions
    const subsSnapshot = await db.collection('pushSubscriptions')
      .where('userId', '==', userRecord.uid)
      .get();
    
    console.log(`\n📱 Push subscriptions: ${subsSnapshot.size}`);
    
    if (subsSnapshot.empty) {
      console.log('❌ No push subscriptions found.');
      console.log('👉 Please open the app and enable notifications first.');
    } else {
      subsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('\nSubscription ID:', doc.id);
        console.log('Created:', data.createdAt?.toDate());
        console.log('Endpoint:', data.subscription?.endpoint?.substring(0, 60) + '...');
      });
    }
    
    // Check VAPID keys
    console.log('\n🔑 VAPID Keys:');
    console.log('Public:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
    console.log('Private:', process.env.VAPID_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
})();
