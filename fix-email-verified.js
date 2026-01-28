const admin = require('firebase-admin');
const fs = require('fs');

// Load .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?([^"]+)"?$/);
  if (match) env[match[1]] = match[2];
});

if (!admin.apps.length) {
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey
    })
  });
}

const db = admin.firestore();
const email = 'epresla@icloud.com';

async function fixEmailVerification() {
  try {
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();
    
    if (snapshot.empty) {
      console.log('❌ User nem található:', email);
      return;
    }
    
    const userDoc = snapshot.docs[0];
    console.log('📄 User ID:', userDoc.id);
    console.log('📧 Jelenlegi emailVerified:', userDoc.data().emailVerified);
    
    await usersRef.doc(userDoc.id).update({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpires: null
    });
    
    console.log('✅ emailVerified = true beállítva!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Hiba:', error);
    process.exit(1);
  }
}

fixEmailVerification();
