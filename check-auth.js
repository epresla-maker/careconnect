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

async function check() {
  console.log('=== Firebase Auth Users with epresla@icloud.com ===\n');
  
  try {
    const user = await admin.auth().getUserByEmail('epresla@icloud.com');
    console.log('Auth UID:', user.uid);
    console.log('Email:', user.email);
    console.log('Display Name:', user.displayName);
    console.log('Created:', user.metadata.creationTime);
    console.log('Last Sign In:', user.metadata.lastSignInTime);
  } catch (err) {
    console.log('Error:', err.message);
  }
  
  // Also check the other userId
  console.log('\n=== Check userId from push subscription ===');
  try {
    const user2 = await admin.auth().getUser('eegiIb8G5ZfAtTyLc6EF0aKAgHo2');
    console.log('Auth UID:', user2.uid);
    console.log('Email:', user2.email);
    console.log('Display Name:', user2.displayName);
  } catch (err) {
    console.log('User eegiIb8G5ZfAtTyLc6EF0aKAgHo2 error:', err.message);
  }
}

check().then(() => process.exit(0));
