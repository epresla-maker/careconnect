const admin = require('firebase-admin');

if (!admin.apps.length) {
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'pharmacare-dfa3c',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: key
    })
  });
}

const db = admin.firestore();

async function checkUser() {
  try {
    const snapshot = await db.collection('users').where('email', '==', 'epresla@icloud.com').get();
    
    if (snapshot.empty) {
      console.log('❌ User nem található');
      return;
    }
    
    const user = snapshot.docs[0].data();
    console.log('✅ User megtalálva:');
    console.log('Email:', user.email);
    console.log('emailVerified:', user.emailVerified);
    console.log('verificationToken:', user.verificationToken ? 'van token' : 'nincs token');
  } catch (err) {
    console.error('❌ Hiba:', err.message);
  }
}

checkUser();
