require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

const EPRESL_USER_ID = 'HBnESxUbVXhdQlpnX1pz3PVQM1P2';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    })
  });
}

const db = admin.firestore();

async function checkDetails() {
  console.log('🔍 RÉSZLETES ÉRTESÍTÉS ELLENŐRZÉS\n');
  
  // Get all notifications for user
  const snapshot = await db.collection('notifications')
    .where('userId', '==', EPRESL_USER_ID)
    .get();
  
  console.log(`Találatok (filter nélkül): ${snapshot.size}`);
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log('\n📧 Értesítés:', doc.id);
    console.log('   userId:', data.userId);
    console.log('   title:', data.title);
    console.log('   message:', data.message);
    console.log('   type:', data.type);
    console.log('   read:', data.read);
    console.log('   createdAt:', data.createdAt);
    console.log('   createdAt type:', typeof data.createdAt);
    if (data.createdAt && data.createdAt.toDate) {
      console.log('   createdAt date:', data.createdAt.toDate());
    }
  });
  
  // Test the exact query used in the app
  console.log('\n📊 Query with orderBy...');
  try {
    const orderedSnapshot = await db.collection('notifications')
      .where('userId', '==', EPRESL_USER_ID)
      .orderBy('createdAt', 'desc')
      .get();
    console.log(`Találatok (orderBy-val): ${orderedSnapshot.size}`);
  } catch (err) {
    console.log('❌ Query hiba:', err.message);
  }
}

checkDetails().then(() => process.exit(0));
