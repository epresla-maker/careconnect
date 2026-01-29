require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');

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

async function check() {
  const userId = 'HBnESxUbVXhdQlpnX1pz3PVQM1P2';
  
  console.log('=== NOTIFICATIONS ===');
  const notifs = await db.collection('notifications').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(5).get();
  console.log('Count:', notifs.size);
  notifs.docs.forEach(d => console.log(d.id, '-', d.data().title, '- read:', d.data().read));
  
  console.log('\n=== PUSH SUBSCRIPTIONS (all) ===');
  const subs = await db.collection('pushSubscriptions').get();
  console.log('Total subscriptions:', subs.size);
  subs.docs.forEach(d => console.log(d.id, '- userId:', d.data().userId));
}

check().then(() => process.exit(0));
