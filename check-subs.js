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
  console.log('=== ÖSSZES PUSH SUBSCRIPTION ===\n');
  const snap = await db.collection('pushSubscriptions').get();
  
  for (const d of snap.docs) {
    const data = d.data();
    console.log('Doc ID:', d.id);
    console.log('userId:', data.userId);
    console.log('createdAt:', data.createdAt?.toDate());
    
    // Find user email
    const userDoc = await db.collection('users').doc(data.userId).get();
    if (userDoc.exists) {
      console.log('email:', userDoc.data().email);
    }
    console.log('---');
  }
}

check().then(() => process.exit(0));
